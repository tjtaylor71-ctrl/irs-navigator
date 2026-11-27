"""
AUDIT-013 test suite — admin entitlement function in auth.py

Tests:
  1. Fresh grant: 5 rows created, stripe_session_id=NULL, amount_paid=0
  2. Idempotent restart: second call updates expiry, no duplicates
  3. Concurrent workers: two threads calling simultaneously, no duplicates, no errors
  4. Legacy migration: 'admin_permanent' rows cleared to NULL on first call
  5. Multiple admins: each gets their own rows, no cross-contamination
  6. Complimentary-purchase isolation: NULL rows with amount_paid>0 are NOT touched
  7. Unauthorized user: grant_admin_entitlements only acts on the explicit user_id
  8. Revenue isolation: admin rows excluded when filtering stripe_session_id IS NOT NULL
  9. Revenue isolation: admin rows excluded when filtering amount_paid > 0
 10. Repeated restarts (10x): row count stays exactly 5, no duplicates
"""

import sys, os, sqlite3, threading, tempfile, traceback
from datetime import datetime, timedelta
from pathlib import Path

# ── Point auth at a temp DB ───────────────────────────────────────────────────
tmp_dir  = tempfile.mkdtemp()
tmp_db   = os.path.join(tmp_dir, "test.db")
os.environ["DB_PATH"] = tmp_db

# Import auth after setting DB_PATH
sys.path.insert(0, "/home/claude/tjtaylor71-ctrl/irs-navigator")
import auth

auth.init_db()

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results = []

def check(name, expr, detail=""):
    ok = bool(expr)
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {name}" + (f"\n         {detail}" if not ok else ""))
    results.append((name, ok))

def admin_rows(conn, user_id):
    return conn.execute(
        "SELECT * FROM purchases WHERE user_id = ? AND stripe_session_id IS NULL AND amount_paid = 0",
        (user_id,)
    ).fetchall()

def make_user(email, password="TestPass1!"):
    uid, err = auth.create_user(email, password)
    if err:
        raise RuntimeError(f"create_user failed: {err}")
    return uid


print("\n=== TEST 1: Fresh grant — 5 rows, correct schema ===")
uid1 = make_user("admin1@test.com")
auth.grant_admin_entitlements(uid1)
with auth.get_db() as conn:
    rows = admin_rows(conn, uid1)
check("5 product rows created", len(rows) == 5, f"got {len(rows)}")
check("All stripe_session_id NULL",   all(r["stripe_session_id"] is None for r in rows))
check("All amount_paid = 0",          all(r["amount_paid"] == 0 for r in rows))
products_found = {r["product"] for r in rows}
check("All 5 products present", products_found == set(auth.ADMIN_PRODUCTS), str(products_found))
# Expiry should be ~10 years out
for r in rows:
    exp = datetime.fromisoformat(r["expires_at"])
    check(f"Expiry ~10yr for {r['product']}", (exp - datetime.utcnow()).days > 3640)


print("\n=== TEST 2: Idempotent restart — no duplicates ===")
auth.grant_admin_entitlements(uid1)
auth.grant_admin_entitlements(uid1)
with auth.get_db() as conn:
    rows = admin_rows(conn, uid1)
check("Still exactly 5 rows after 3 calls", len(rows) == 5, f"got {len(rows)}")


print("\n=== TEST 3: Concurrent workers — no duplicates ===")
uid3 = make_user("admin3@test.com")
errors = []

def worker(uid):
    try:
        auth.grant_admin_entitlements(uid)
    except Exception as e:
        errors.append(str(e))

threads = [threading.Thread(target=worker, args=(uid3,)) for _ in range(5)]
for t in threads: t.start()
for t in threads: t.join()

with auth.get_db() as conn:
    rows = admin_rows(conn, uid3)
check("Concurrent: exactly 5 rows", len(rows) == 5, f"got {len(rows)}")
check("Concurrent: no errors", len(errors) == 0, str(errors))


print("\n=== TEST 4: Legacy migration — 'admin_permanent' rows cleared ===")
uid4 = make_user("admin4@test.com")
# Insert legacy-style rows manually (simulates pre-AUDIT-013 state)
# Only insert one to avoid the unique index error (mirrors the real production state)
long_expiry = (datetime.utcnow() + timedelta(days=3650)).isoformat()
with auth.get_db() as conn:
    conn.execute(
        "INSERT INTO purchases (user_id, product, stripe_session_id, amount_paid, expires_at) "
        "VALUES (?, 'navigator', 'admin_permanent', 0, ?)",
        (uid4, long_expiry)
    )
# Now call grant — it should migrate the legacy row and create the other 4
auth.grant_admin_entitlements(uid4)
with auth.get_db() as conn:
    rows = admin_rows(conn, uid4)
    legacy = conn.execute(
        "SELECT * FROM purchases WHERE user_id = ? AND stripe_session_id = 'admin_permanent'",
        (uid4,)
    ).fetchall()
check("Legacy rows cleared to NULL", len(legacy) == 0, f"legacy rows remaining: {len(legacy)}")
check("5 rows after migration", len(rows) == 5, f"got {len(rows)}")


print("\n=== TEST 5: Multiple admins — no cross-contamination ===")
uid5a = make_user("admin5a@test.com")
uid5b = make_user("admin5b@test.com")
auth.grant_admin_entitlements(uid5a)
auth.grant_admin_entitlements(uid5b)
with auth.get_db() as conn:
    rows_a = admin_rows(conn, uid5a)
    rows_b = admin_rows(conn, uid5b)
check("Admin A: 5 rows",  len(rows_a) == 5, f"got {len(rows_a)}")
check("Admin B: 5 rows",  len(rows_b) == 5, f"got {len(rows_b)}")
ids_a = {r["id"] for r in rows_a}
ids_b = {r["id"] for r in rows_b}
check("No shared purchase rows", ids_a.isdisjoint(ids_b))


print("\n=== TEST 6: Complimentary-purchase isolation ===")
uid6 = make_user("admin6@test.com")
# Insert a complimentary purchase: NULL stripe_session_id but amount_paid > 0
# (e.g. a manually granted discount where someone paid $1 and we recorded it)
with auth.get_db() as conn:
    conn.execute(
        "INSERT INTO purchases (user_id, product, stripe_session_id, amount_paid, expires_at) "
        "VALUES (?, 'navigator', NULL, 100, ?)",
        (uid6, long_expiry)
    )
auth.grant_admin_entitlements(uid6)
with auth.get_db() as conn:
    comp = conn.execute(
        "SELECT * FROM purchases WHERE user_id = ? AND amount_paid = 100",
        (uid6,)
    ).fetchall()
    admin = admin_rows(conn, uid6)
check("Complimentary row untouched", len(comp) == 1 and comp[0]["amount_paid"] == 100)
check("Admin rows still 5", len(admin) == 5, f"got {len(admin)}")


print("\n=== TEST 7: Unauthorized user guard ===")
uid7_non_admin = make_user("regular@test.com")
# grant_admin_entitlements only acts on the user_id passed — verify it doesn't
# touch other users
uid7_admin = make_user("admin7@test.com")
auth.grant_admin_entitlements(uid7_admin)
with auth.get_db() as conn:
    non_admin_rows = conn.execute(
        "SELECT * FROM purchases WHERE user_id = ?", (uid7_non_admin,)
    ).fetchall()
check("Non-admin user gets no rows", len(non_admin_rows) == 0, f"got {len(non_admin_rows)}")

# Calling with invalid user_id raises
raised = False
try:
    auth.grant_admin_entitlements(999999)
except RuntimeError:
    raised = True
check("Invalid user_id raises RuntimeError", raised)


print("\n=== TEST 8 & 9: Revenue isolation ===")
uid8 = make_user("admin8@test.com")
# Insert a real Stripe purchase
with auth.get_db() as conn:
    conn.execute(
        "INSERT INTO purchases (user_id, product, stripe_session_id, amount_paid, expires_at) "
        "VALUES (?, 'navigator', 'cs_live_abc123', 5900, ?)",
        (uid8, long_expiry)
    )
auth.grant_admin_entitlements(uid8)
with auth.get_db() as conn:
    # Revenue query: stripe_session_id IS NOT NULL
    revenue_rows = conn.execute(
        "SELECT * FROM purchases WHERE user_id = ? AND stripe_session_id IS NOT NULL",
        (uid8,)
    ).fetchall()
    # Revenue query: amount_paid > 0
    paid_rows = conn.execute(
        "SELECT * FROM purchases WHERE user_id = ? AND amount_paid > 0",
        (uid8,)
    ).fetchall()
check("Revenue filter (IS NOT NULL): 1 row (Stripe only)", len(revenue_rows) == 1,
      f"got {len(revenue_rows)}: {[r['stripe_session_id'] for r in revenue_rows]}")
check("Revenue filter (amount_paid > 0): 1 row (Stripe only)", len(paid_rows) == 1,
      f"got {len(paid_rows)}")


print("\n=== TEST 10: Repeated restarts (10×) ===")
uid10 = make_user("admin10@test.com")
for i in range(10):
    auth.grant_admin_entitlements(uid10)
with auth.get_db() as conn:
    rows = admin_rows(conn, uid10)
check("After 10 restarts: exactly 5 rows", len(rows) == 5, f"got {len(rows)}")


# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "="*55)
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
print(f"  Results: {passed} passed, {failed} failed out of {len(results)} checks")
if failed:
    print("\n  FAILED checks:")
    for name, ok in results:
        if not ok:
            print(f"    • {name}")
print("="*55 + "\n")
sys.exit(0 if failed == 0 else 1)
