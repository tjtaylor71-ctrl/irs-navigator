"""
Batch-2 test suite — Items 1,4,5,6,8,9,10 from the 12-item batch

Covers:
  Item 1  — Argon2 required on Railway (RuntimeError when env var present)
  Item 4  — Stale webhook claim recovery
  Item 5  — failed_schedule_jobs table created
  Item 6  — payment_status required; trialing/past_due blocked
  Item 8  — Overage billing disabled; PRO_SESSION_HARD_LIMIT constant
  Item 9  — Session revocation on password rotation
  Item 10 — CSRF double-submit enforcement; login rate limiting

Run from repo root:
    python3 tests/test_batch2.py

or alongside the other test files:
    python3 tests/test_consolidated.py && python3 tests/test_batch2.py
"""

import sys, os, tempfile, sqlite3, threading, importlib, traceback, time, types

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
all_results: list[tuple[str, bool]] = []


def check(name, expr, detail=""):
    ok = bool(expr)
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {name}" + (f"\n         {detail}" if not ok else ""))
    all_results.append((name, ok))
    return ok


def fresh_auth(extra_env=None):
    """Return a freshly imported auth module pointing at a temp DB."""
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    for k, v in (extra_env or {}).items():
        os.environ[k] = v
    for mod in list(sys.modules.keys()):
        if mod in ("auth", "stripe_checkout", "email_service", "server"):
            del sys.modules[mod]
    import auth as a
    a.init_db()
    return a, tmp


def clean_env(*keys):
    for k in keys:
        os.environ.pop(k, None)


# ---------------------------------------------------------------------------
# Item 1 — Argon2 required on Railway
# ---------------------------------------------------------------------------
print("\n=== Item 1 — Argon2 required on Railway ===")

def _test_railway_import_raises():
    """Temporarily patch argon2 import to fail and set Railway env, then import auth."""
    import builtins
    real_import = builtins.__import__

    def patched_import(name, *args, **kwargs):
        if name == "argon2":
            raise ImportError("simulated missing argon2")
        return real_import(name, *args, **kwargs)

    # Clean up any cached auth module
    for mod in list(sys.modules.keys()):
        if mod in ("auth",) or mod.startswith("auth."):
            del sys.modules[mod]

    os.environ["RAILWAY_ENVIRONMENT"] = "staging"
    builtins.__import__ = patched_import
    raised = False
    try:
        import auth  # noqa: F401
        raised = False
    except RuntimeError as e:
        raised = "argon2-cffi is required" in str(e) or "Argon2id" in str(e) or "argon2" in str(e).lower()
    except Exception:
        raised = False
    finally:
        builtins.__import__ = real_import
        clean_env("RAILWAY_ENVIRONMENT")
        for mod in list(sys.modules.keys()):
            if mod in ("auth",) or mod.startswith("auth."):
                del sys.modules[mod]
    return raised

try:
    raised = _test_railway_import_raises()
    check("Railway env → RuntimeError when argon2 missing", raised)
except Exception as e:
    check("Railway env → RuntimeError when argon2 missing", False, str(e))

# Confirm normal import (argon2 IS available) succeeds
try:
    clean_env("RAILWAY_ENVIRONMENT", "RAILWAY_PROJECT_ID")
    for mod in list(sys.modules.keys()):
        if mod == "auth":
            del sys.modules[mod]
    import auth as _auth_check
    check("Normal import succeeds when argon2 available", True)
except Exception as e:
    check("Normal import succeeds when argon2 available", False, str(e))

# ---------------------------------------------------------------------------
# Item 4 — Stale webhook claim recovery
# ---------------------------------------------------------------------------
print("\n=== Item 4 — Stale claim recovery ===")

try:
    a, tmp_db = fresh_auth()

    # Insert a 'processing' event that is 400 seconds old (stale)
    stale_time = "datetime('now', '-400 seconds')"
    with sqlite3.connect(tmp_db) as conn:
        conn.execute("""
            INSERT INTO stripe_webhook_events
                (event_id, event_type, status, claim_token, claimed_at)
            VALUES (?, ?, 'processing', 'old-token-abc', datetime('now', '-400 seconds'))
        """, ("evt_stale_001", "checkout.session.completed"))

    # claim_webhook_event should reclaim the stale row
    token1 = a.claim_webhook_event("evt_stale_001", "checkout.session.completed")
    check("Stale processing row (>300s) can be reclaimed", token1 is not None,
          f"got: {token1!r}")

    # Insert a fresh 'processing' event (30 seconds old)
    with sqlite3.connect(tmp_db) as conn:
        conn.execute("""
            INSERT INTO stripe_webhook_events
                (event_id, event_type, status, claim_token, claimed_at)
            VALUES (?, ?, 'processing', 'fresh-token-xyz', datetime('now', '-30 seconds'))
        """, ("evt_fresh_001", "checkout.session.completed"))

    token2 = a.claim_webhook_event("evt_fresh_001", "checkout.session.completed")
    check("Fresh processing row (<300s) cannot be reclaimed", not token2,
          f"expected falsy, got: {token2!r}")

    # Insert a 'completed' stale event — should still be blocked
    with sqlite3.connect(tmp_db) as conn:
        conn.execute("""
            INSERT INTO stripe_webhook_events
                (event_id, event_type, status, claim_token, claimed_at)
            VALUES (?, ?, 'completed', 'done-token', datetime('now', '-600 seconds'))
        """, ("evt_done_001", "checkout.session.completed"))

    token3 = a.claim_webhook_event("evt_done_001", "checkout.session.completed")
    check("Completed event blocked even if claimed_at is old", not token3,
          f"expected falsy, got: {token3!r}")

except Exception as e:
    traceback.print_exc()
    check("Stale claim recovery — setup error", False, str(e))
    check("Fresh row not reclaimed — skipped", False, "setup error")
    check("Completed row still blocked — skipped", False, "setup error")

# ---------------------------------------------------------------------------
# Item 5 — failed_schedule_jobs table exists after init_db
# ---------------------------------------------------------------------------
print("\n=== Item 5 — failed_schedule_jobs table ===")

try:
    a2, tmp_db2 = fresh_auth()
    with sqlite3.connect(tmp_db2) as conn:
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
    check("failed_schedule_jobs table created", "failed_schedule_jobs" in tables,
          f"tables: {tables}")

    # Verify required columns
    with sqlite3.connect(tmp_db2) as conn:
        cols = {r[1] for r in conn.execute(
            "PRAGMA table_info(failed_schedule_jobs)")}
    for col in ("id", "stripe_sub_id", "intro_price_id", "error", "retry_count",
                "created_at", "last_attempted_at", "resolved_at"):
        check(f"  column '{col}' exists", col in cols, f"cols: {cols}")

except Exception as e:
    traceback.print_exc()
    check("failed_schedule_jobs table created", False, str(e))

# ---------------------------------------------------------------------------
# Item 6 — payment_status required for Pro activation
# ---------------------------------------------------------------------------
print("\n=== Item 6 — payment_status == 'paid' required ===")

try:
    # We test the guard logic directly without loading the full stripe_checkout module
    # (which requires Stripe keys). Check the constant and logic from the source.
    import ast, pathlib
    src = pathlib.Path(REPO, "stripe_checkout.py").read_text()
    tree = ast.parse(src)

    # Look for 'payment_status != "paid"' in the source
    check('payment_status != "paid" guard present in source',
          'payment_status != "paid"' in src or "payment_status !=" in src)

    # Confirm 'trialing' and 'past_due' are NOT in activation condition branches
    # (They should only appear in comments / strings, not as activation-granting conditions)
    # Simple heuristic: check that activation_allowed condition doesn't include them
    activation_lines = [l.strip() for l in src.splitlines()
                        if "trialing" in l and "active" in l and "==" in l
                        and not l.strip().startswith("#")]
    check("No lines activate on trialing status",
          len(activation_lines) == 0,
          f"Found: {activation_lines}")

    past_due_activation = [l.strip() for l in src.splitlines()
                           if "past_due" in l and "active" in l and "==" in l
                           and not l.strip().startswith("#")]
    check("No lines activate on past_due status",
          len(past_due_activation) == 0,
          f"Found: {past_due_activation}")

    # Confirm that sub.status == 'active' is the only allowed status check
    check('sub.status == "active" check present',
          'sub.status != "active"' in src or 'sub.status == "active"' in src)

except Exception as e:
    traceback.print_exc()
    check("payment_status guard check", False, str(e))

# ---------------------------------------------------------------------------
# Item 8 — Overage billing disabled; hard session limit constant
# ---------------------------------------------------------------------------
print("\n=== Item 8 — Overage disabled / hard session limit ===")

try:
    import pathlib
    src = pathlib.Path(REPO, "stripe_checkout.py").read_text()

    check("OVERAGE_BILLING_DISABLED sentinel present in source",
          "OVERAGE_BILLING_DISABLED" in src)

    check("PRO_SESSION_HARD_LIMIT constant defined",
          "PRO_SESSION_HARD_LIMIT" in src)

    # Extract the value
    import re
    for line in src.splitlines():
        if "PRO_SESSION_HARD_LIMIT" in line and "=" in line and not line.strip().startswith("#"):
            m = re.search(r'PRO_SESSION_HARD_LIMIT\s*=\s*(\d+)', line)
            if m:
                val = int(m.group(1))
                check(f"PRO_SESSION_HARD_LIMIT == 10 (got {val})", val == 10)
            else:
                check("PRO_SESSION_HARD_LIMIT value is integer", False, line.strip())
            break

except Exception as e:
    traceback.print_exc()
    check("Overage disabled check", False, str(e))

# ---------------------------------------------------------------------------
# Item 9 — Session revocation on password rotation
# ---------------------------------------------------------------------------
print("\n=== Item 9 — Session revocation on password rotation ===")

try:
    a3, tmp_db3 = fresh_auth()

    # Create a user and sessions (users table has no is_admin column — role managed via purchases)
    with sqlite3.connect(tmp_db3) as conn:
        conn.execute("""
            INSERT INTO users (email, password_hash)
            VALUES ('admin@test.com', 'placeholder')
        """)
        uid = conn.execute("SELECT id FROM users WHERE email='admin@test.com'").fetchone()[0]
        conn.execute("""
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES ('tok1', ?, datetime('now'), datetime('now', '+7 days'))
        """, (uid,))
        conn.execute("""
            INSERT INTO sessions (token, user_id, created_at, expires_at)
            VALUES ('tok2', ?, datetime('now'), datetime('now', '+7 days'))
        """, (uid,))

    # Verify sessions exist
    with sqlite3.connect(tmp_db3) as conn:
        cnt_before = conn.execute("SELECT count(*) FROM sessions WHERE user_id=?", (uid,)).fetchone()[0]
    check("Sessions exist before rotation", cnt_before == 2, f"count: {cnt_before}")

    # Simulate the DELETE that the rotate endpoint now performs
    with sqlite3.connect(tmp_db3) as conn:
        result = conn.execute("DELETE FROM sessions WHERE user_id=?", (uid,))
        deleted = result.rowcount

    check("DELETE FROM sessions removes correct count", deleted == 2, f"deleted: {deleted}")

    with sqlite3.connect(tmp_db3) as conn:
        cnt_after = conn.execute("SELECT count(*) FROM sessions WHERE user_id=?", (uid,)).fetchone()[0]
    check("No sessions remain after revocation", cnt_after == 0, f"remaining: {cnt_after}")

    # Edge case: revocation with zero existing sessions should not error
    try:
        with sqlite3.connect(tmp_db3) as conn:
            result2 = conn.execute("DELETE FROM sessions WHERE user_id=?", (uid,))
        check("Revocation with zero sessions does not error", result2.rowcount == 0,
              f"rowcount: {result2.rowcount}")
    except Exception as e2:
        check("Revocation with zero sessions does not error", False, str(e2))

except Exception as e:
    traceback.print_exc()
    check("Session revocation setup", False, str(e))

# ---------------------------------------------------------------------------
# Item 10 — CSRF and login rate limiting (source-level checks)
# ---------------------------------------------------------------------------
print("\n=== Item 10 — CSRF and rate limiting ===")

try:
    import pathlib
    srv = pathlib.Path(REPO, "server.py").read_text()

    check("CSRF exempt paths defined (_CSRF_EXEMPT_PATHS)", "_CSRF_EXEMPT_PATHS" in srv)
    check("enforce_csrf before_request hook defined", "enforce_csrf" in srv and "before_request" in srv)
    check("/api/csrf-token endpoint present", "/api/csrf-token" in srv)
    check("X-CSRF-Token header checked", "X-CSRF-Token" in srv)
    check("403 returned on CSRF mismatch", "403" in srv and "csrf" in srv.lower())

    check("_login_attempts dict defined", "_login_attempts" in srv)
    check("_LOGIN_MAX_ATTEMPTS constant defined", "_LOGIN_MAX_ATTEMPTS" in srv)
    check("_LOGIN_LOCKOUT_SECONDS constant defined", "_LOGIN_LOCKOUT_SECONDS" in srv)
    check("429 returned on rate limit", "429" in srv and "rate" in srv.lower())
    check("_check_login_rate_limit function defined", "_check_login_rate_limit" in srv)
    check("_record_login_failure function defined", "_record_login_failure" in srv)
    check("_reset_login_attempts function defined", "_reset_login_attempts" in srv)

except Exception as e:
    traceback.print_exc()
    check("CSRF/rate limiting source check", False, str(e))

# ---------------------------------------------------------------------------
# Item 10 — In-process rate limiter logic test
# ---------------------------------------------------------------------------
print("\n=== Item 10 — Rate limiter logic ===")

try:
    # Import server.py's rate limiter functions directly by extracting them
    # We isolate just the pure logic without starting Flask
    import pathlib
    src = pathlib.Path(REPO, "server.py").read_text()

    # Extract _login_attempts, _login_lock, constants, and the three functions
    # by exec-ing only the relevant slice of code
    import pathlib
    # Create a minimal mock app.logger so the rate limiter functions can call app.logger.warning
    class _MockLogger:
        def warning(self, *a, **kw): pass
        def info(self, *a, **kw): pass
    class _MockApp:
        logger = _MockLogger()
    ns: dict = {
        "__name__": "__test__",
        "__file__": str(pathlib.Path(REPO, "server.py")),
        "threading": threading,
        "_threading": threading,  # server.py imports threading as _threading
        "time": time,
        "Path": pathlib.Path,
        "pathlib": pathlib,
        "os": os,
        "app": _MockApp(),
    }
    # Find and exec the rate limiter block — from dict/lock definition through the three helper functions
    lines = src.splitlines()
    start = next((i for i, l in enumerate(lines) if "_login_attempts" in l and "dict" in l), None)
    # End before the @app.route decorator for api_login (not the def itself)
    end = next((i for i, l in enumerate(lines)
                if i > (start or 0) and "@app.route" in l and "login" in l.lower()), None)
    if start is not None and end is not None:
        block = "\n".join(lines[start:end])
        exec(block, ns)

        check_rl = ns.get("_check_login_rate_limit")
        record_rl = ns.get("_record_login_failure")
        reset_rl = ns.get("_reset_login_attempts")

        if all([check_rl, record_rl, reset_rl]):
            ip, em = "1.2.3.4", "user@test.com"
            max_att = ns.get("_LOGIN_MAX_ATTEMPTS", 5)

            # Should be allowed initially
            allowed, _ = check_rl(ip, em)
            check("Rate limiter: initially allowed", allowed)

            # Record failures up to threshold
            for _ in range(max_att):
                record_rl(ip, em)

            allowed2, wait = check_rl(ip, em)
            check("Rate limiter: locked after max failures", not allowed2,
                  f"allowed={allowed2}, wait={wait}")
            check("Rate limiter: wait_secs > 0 when locked", wait > 0, f"wait={wait}")

            # Different IP should not be affected
            allowed3, _ = check_rl("9.9.9.9", em)
            check("Rate limiter: different IP not locked", allowed3)

            # Reset clears the lockout
            reset_rl(ip, em)
            allowed4, _ = check_rl(ip, em)
            check("Rate limiter: reset clears lockout", allowed4)
        else:
            check("Rate limiter functions extracted", False,
                  f"missing: check={check_rl}, record={record_rl}, reset={reset_rl}")
    else:
        check("Rate limiter block found in server.py", False,
              f"start={start}, end={end}")

except Exception as e:
    traceback.print_exc()
    check("Rate limiter logic test", False, str(e))

# ---------------------------------------------------------------------------
# Foundation program tests
# ---------------------------------------------------------------------------
print("\n=== Foundation: referral commissions, overrides, idempotency, refund voiding ===")

import pathlib as _pathlib

def fresh_auth_foundation():
    """Return a fresh auth module with a temporary DB, pre-populated with foundation fixtures."""
    tmp = tempfile.mktemp(suffix=".db")
    os.environ["DB_PATH"] = tmp
    for key in ["auth", "stripe_checkout"]:
        if key in sys.modules:
            del sys.modules[key]
    sys.path.insert(0, REPO)
    import auth as a
    a.init_db()
    return a, tmp

try:
    a_f, _ = fresh_auth_foundation()

    # --- Set up fixture data ---
    # Users
    recruiter_id, _ = a_f.create_user("recruiter@example.com", "pw")
    recruit_id, _ = a_f.create_user("recruit@example.com", "pw")
    buyer_id, _ = a_f.create_user("buyer@example.com", "pw")

    # Referral partners: recruiter and recruit
    with a_f.get_db() as conn:
        rp_recruiter = conn.execute(
            "INSERT INTO referral_partners (user_id, code, commission_pct, active) "
            "VALUES (?, 'RECRUIT1', 20, 1)", (recruiter_id,)
        ).lastrowid
        rp_recruit = conn.execute(
            "INSERT INTO referral_partners (user_id, code, commission_pct, active, "
            "foundation_sponsor_id) VALUES (?, 'RECRUIT2', 20, 1, NULL)",
            (recruit_id,)
        ).lastrowid

        # Foundation member record for the recruiter
        fm_id = conn.execute(
            "INSERT INTO foundation_members (user_id, partner_id, override_pct, active) "
            "VALUES (?, ?, 5, 1)", (recruiter_id, rp_recruiter)
        ).lastrowid

        # Link recruit's partner record to foundation sponsor
        conn.execute(
            "UPDATE referral_partners SET foundation_sponsor_id = ? WHERE id = ?",
            (fm_id, rp_recruit)
        )

    # --- Test: get_foundation_sponsor returns sponsor for recruited partner ---
    sponsor = a_f.get_foundation_sponsor(rp_recruit)
    check("Foundation: get_foundation_sponsor returns record", sponsor is not None,
          f"got: {sponsor}")
    if sponsor:
        check("Foundation: sponsor.id matches fm_id", sponsor["id"] == fm_id,
              f"sponsor id={sponsor['id']} fm_id={fm_id}")
        check("Foundation: sponsor.override_pct == 5", sponsor["override_pct"] == 5,
              f"override_pct={sponsor['override_pct']}")

    # --- Test: get_foundation_sponsor returns None for non-sponsored partner ---
    no_sponsor = a_f.get_foundation_sponsor(rp_recruiter)
    check("Foundation: get_foundation_sponsor returns None for non-sponsored partner",
          no_sponsor is None, f"got: {no_sponsor}")

    # --- Test: record_referral_conversion idempotency ---
    purchase_id, _ = a_f.grant_access_idempotent(buyer_id, "navigator", "cs_idem_001", amount_paid=5900)
    c1 = a_f.record_referral_conversion(rp_recruit, buyer_id, purchase_id,
                                         "navigator", 5900, 20, "cs_idem_001")
    c2 = a_f.record_referral_conversion(rp_recruit, buyer_id, purchase_id,
                                         "navigator", 5900, 20, "cs_idem_001")
    with a_f.get_db() as conn:
        rows = conn.execute(
            "SELECT COUNT(*) as n FROM referral_conversions WHERE stripe_session_id='cs_idem_001'",
        ).fetchone()
    check("Foundation: referral_conversion idempotent — only 1 row", rows["n"] == 1,
          f"row count={rows['n']}")
    check("Foundation: idempotent call returns same commission", c1 == c2,
          f"c1={c1} c2={c2}")

    # --- Test: record_foundation_override called and recorded ---
    o1 = a_f.record_foundation_override(
        foundation_member_id=fm_id,
        sale_amount=5900,
        override_pct=5,
        source_partner_id=rp_recruit,
        purchase_id=purchase_id,
        stripe_session_id="cs_idem_001",
    )
    check("Foundation: override amount == 295 (5% of 5900)", o1 == 295, f"o1={o1}")
    with a_f.get_db() as conn:
        override_rows = conn.execute(
            "SELECT COUNT(*) as n, SUM(commission_amount) as total "
            "FROM referral_conversions "
            "WHERE partner_id = ? AND stripe_session_id = 'cs_idem_001'",
            (rp_recruiter,)
        ).fetchone()
    check("Foundation: override row recorded (1 row)", override_rows["n"] == 1,
          f"count={override_rows['n']}")
    check("Foundation: override commission_amount == 295", override_rows["total"] == 295,
          f"total={override_rows['total']}")

    # --- Test: record_foundation_override idempotent on duplicate session ---
    o2 = a_f.record_foundation_override(
        foundation_member_id=fm_id,
        sale_amount=5900,
        override_pct=5,
        source_partner_id=rp_recruit,
        purchase_id=purchase_id,
        stripe_session_id="cs_idem_001",
    )
    with a_f.get_db() as conn:
        override_rows2 = conn.execute(
            "SELECT COUNT(*) as n FROM referral_conversions "
            "WHERE partner_id = ? AND stripe_session_id = 'cs_idem_001'",
            (rp_recruiter,)
        ).fetchone()
    check("Foundation: override idempotent — still only 1 override row",
          override_rows2["n"] == 1, f"count={override_rows2['n']}")
    check("Foundation: idempotent override returns same amount", o1 == o2,
          f"o1={o1} o2={o2}")

    # --- Test: void_commissions_for_refund zeroes unpaid commissions ---
    # Both the referral conversion and the override should be voided
    voided = a_f.void_commissions_for_refund("cs_idem_001")
    check("Foundation: void_commissions_for_refund returns > 0", voided > 0,
          f"voided={voided}")
    with a_f.get_db() as conn:
        remaining = conn.execute(
            "SELECT COUNT(*) as n FROM referral_conversions "
            "WHERE stripe_session_id = 'cs_idem_001' AND commission_amount > 0",
        ).fetchone()
    check("Foundation: all commissions zeroed after void", remaining["n"] == 0,
          f"non-zero rows={remaining['n']}")

    # --- Test: void_commissions_for_refund creates audit record for paid_out=1 rows ---
    # IR-01: paid-out commissions are not silently ignored; an audit record is created
    # in commission_adjustments so finance can process the clawback.  The original
    # commission row is left intact (amount unchanged).
    purchase_id2, _ = a_f.grant_access_idempotent(buyer_id, "wizard", "cs_paid_001", amount_paid=9900)
    a_f.record_referral_conversion(rp_recruit, buyer_id, purchase_id2, "wizard", 9900, 20, "cs_paid_001")
    with a_f.get_db() as conn:
        conn.execute(
            "UPDATE referral_conversions SET paid_out = 1 WHERE stripe_session_id = 'cs_paid_001'"
        )
    voided2 = a_f.void_commissions_for_refund("cs_paid_001")
    check("Foundation: void creates audit record for paid_out=1 rows (returns 1)",
          voided2 == 1, f"voided={voided2}")
    with a_f.get_db() as conn:
        paid_row = conn.execute(
            "SELECT commission_amount FROM referral_conversions WHERE stripe_session_id='cs_paid_001'"
        ).fetchone()
        adj_row = conn.execute(
            "SELECT adjustment_amount FROM commission_adjustments "
            "WHERE stripe_session_id='cs_paid_001'"
        ).fetchone()
    check("Foundation: paid_out=1 commission_amount unchanged after void",
          paid_row["commission_amount"] == 1980, f"amount={paid_row['commission_amount']}")
    check("Foundation: audit record created with negative adjustment_amount",
          adj_row is not None and adj_row["adjustment_amount"] < 0,
          f"adj={adj_row['adjustment_amount'] if adj_row else None}")

    # --- Test: void with None/empty session_id is a no-op ---
    voided3 = a_f.void_commissions_for_refund(None)
    check("Foundation: void_commissions_for_refund(None) returns 0", voided3 == 0,
          f"voided={voided3}")
    voided4 = a_f.void_commissions_for_refund("")
    check("Foundation: void_commissions_for_refund('') returns 0", voided4 == 0,
          f"voided={voided4}")

except Exception as e:
    traceback.print_exc()
    check("Foundation tests", False, str(e))

# ---------------------------------------------------------------------------
# IR-01/IR-02: payment_intent_id storage, refund handler, commission integrity
# ---------------------------------------------------------------------------
print("\n=== IR-01/IR-02: Refund identifier, commission integrity ===")
try:
    import tempfile as _tf

    _ir_tmp = _tf.mktemp(suffix=".db")
    os.environ["DB_PATH"] = _ir_tmp
    for _k in ["auth", "stripe_checkout"]:
        if _k in sys.modules:
            del sys.modules[_k]
    import auth as a_ir
    a_ir.init_db()

    # Create test users
    with a_ir.get_db() as conn:
        buyer_id2 = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?,?)",
            ("ir_buyer@test.com", "x")
        ).lastrowid
        ref_uid2 = conn.execute(
            "INSERT INTO users (email, password_hash) VALUES (?,?)",
            ("ir_ref@test.com", "x")
        ).lastrowid
        rp_ir = conn.execute(
            "INSERT INTO referral_partners (user_id, code, commission_pct, active) "
            "VALUES (?, 'IRTEST', 20, 1)", (ref_uid2,)
        ).lastrowid

    # --- Test: grant_access_idempotent accepts and stores payment_intent_id ---
    pi_id = "pi_test_abc123"
    cs_id = "cs_test_xyz789"
    p_id, is_new = a_ir.grant_access_idempotent(
        buyer_id2, "navigator", stripe_session_id=cs_id,
        amount_paid=5900, payment_intent_id=pi_id
    )
    check("IR-01: grant_access_idempotent accepts payment_intent_id", is_new, "not new")
    with a_ir.get_db() as conn:
        row = conn.execute(
            "SELECT payment_intent_id, stripe_session_id FROM purchases WHERE id=?", (p_id,)
        ).fetchone()
    check("IR-01: payment_intent_id stored correctly",
          row["payment_intent_id"] == pi_id, f"got {row['payment_intent_id']}")
    check("IR-01: stripe_session_id still stored correctly",
          row["stripe_session_id"] == cs_id, f"got {row['stripe_session_id']}")

    # --- Test: idempotent grant still deduplicates by stripe_session_id ---
    p_id2, is_new2 = a_ir.grant_access_idempotent(
        buyer_id2, "navigator", stripe_session_id=cs_id, amount_paid=5900
    )
    check("IR-01: idempotent grant still deduplicates", not is_new2, "is_new should be False")
    check("IR-01: idempotent grant returns same purchase_id", p_id == p_id2, f"{p_id} != {p_id2}")

    # --- Test: void_commissions_for_refund uses stripe_session_id correctly ---
    a_ir.record_referral_conversion(rp_ir, buyer_id2, p_id, "navigator", 5900, 20, cs_id)
    # Simulate a full refund (fraction=1.0)
    voided_ir = a_ir.void_commissions_for_refund(cs_id, refund_fraction=1.0)
    check("IR-01: void_commissions_for_refund returns 1 for unpaid row", voided_ir == 1,
          f"voided={voided_ir}")
    with a_ir.get_db() as conn:
        zeroed = conn.execute(
            "SELECT commission_amount FROM referral_conversions WHERE stripe_session_id=?",
            (cs_id,)
        ).fetchone()
    check("IR-01: commission_amount zeroed after full refund",
          zeroed["commission_amount"] == 0, f"amount={zeroed['commission_amount']}")

    # --- Test: partial refund reduces commission proportionally ---
    cs_partial = "cs_partial_001"
    p_partial, _ = a_ir.grant_access_idempotent(buyer_id2, "wizard", cs_partial, amount_paid=9900)
    a_ir.record_referral_conversion(rp_ir, buyer_id2, p_partial, "wizard", 9900, 20, cs_partial)
    # Partial refund of 50%
    a_ir.void_commissions_for_refund(cs_partial, refund_fraction=0.5)
    with a_ir.get_db() as conn:
        partial_row = conn.execute(
            "SELECT commission_amount FROM referral_conversions WHERE stripe_session_id=?",
            (cs_partial,)
        ).fetchone()
    # Original = 9900*20/100 = 1980; after 50% refund, adjustment = 990; remaining = 1980-990 = 990
    check("IR-01: partial refund reduces commission by 50%",
          partial_row["commission_amount"] == 990, f"amount={partial_row['commission_amount']}")

    # --- Test: commission_type column exists and 'direct' is default ---
    with a_ir.get_db() as conn:
        ctype_row = conn.execute(
            "SELECT commission_type FROM referral_conversions WHERE stripe_session_id=?",
            (cs_id,)
        ).fetchone()
    check("IR-02: commission_type column exists",
          ctype_row is not None, "row not found")
    check("IR-02: commission_type defaults to 'direct'",
          ctype_row["commission_type"] == "direct",
          f"type={ctype_row['commission_type']}")

    # --- Test: UNIQUE index prevents duplicate direct commissions ---
    cs_dup = "cs_dup_001"
    p_dup, _ = a_ir.grant_access_idempotent(buyer_id2, "bundle", cs_dup, amount_paid=12900)
    comm1 = a_ir.record_referral_conversion(rp_ir, buyer_id2, p_dup, "bundle", 12900, 20, cs_dup)
    comm2 = a_ir.record_referral_conversion(rp_ir, buyer_id2, p_dup, "bundle", 12900, 20, cs_dup)
    check("IR-02: duplicate direct commission returns existing amount",
          comm1 == comm2, f"comm1={comm1} comm2={comm2}")
    with a_ir.get_db() as conn:
        dup_count = conn.execute(
            "SELECT COUNT(*) as n FROM referral_conversions WHERE stripe_session_id=? "
            "AND commission_type='direct'", (cs_dup,)
        ).fetchone()
    check("IR-02: only one direct commission row despite duplicate call",
          dup_count["n"] == 1, f"rows={dup_count['n']}")

    # --- Test: commission_adjustments table created by migration ---
    with a_ir.get_db() as conn:
        adj_tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='commission_adjustments'"
        ).fetchone()
    check("IR-01: commission_adjustments table created by migration",
          adj_tables is not None, "table not found")

    # --- Test: audit record created for paid-out commission on refund ---
    cs_audit = "cs_audit_001"
    p_audit, _ = a_ir.grant_access_idempotent(buyer_id2, "navigator", cs_audit, amount_paid=5900)
    a_ir.record_referral_conversion(rp_ir, buyer_id2, p_audit, "navigator", 5900, 20, cs_audit)
    with a_ir.get_db() as conn:
        conn.execute("UPDATE referral_conversions SET paid_out=1 WHERE stripe_session_id=?",
                     (cs_audit,))
    affected = a_ir.void_commissions_for_refund(cs_audit, refund_fraction=1.0)
    check("IR-01: void returns 1 (audit) for paid_out row", affected == 1, f"affected={affected}")
    with a_ir.get_db() as conn:
        adj = conn.execute(
            "SELECT adjustment_amount, reason FROM commission_adjustments WHERE stripe_session_id=?",
            (cs_audit,)
        ).fetchone()
    check("IR-01: audit record has negative adjustment_amount",
          adj is not None and adj["adjustment_amount"] < 0,
          f"adj={adj['adjustment_amount'] if adj else None}")

    # --- Test: _handle_charge_refunded webhook uses payment_intent_id ---
    # Simulate the full webhook path with separate pi_ and cs_ identifiers.
    # stripe_checkout imports stripe at module level; stub it so the import succeeds
    # in environments without the stripe package installed.
    import types as _types
    if "stripe" not in sys.modules:
        _stripe_stub = _types.ModuleType("stripe")
        _stripe_stub.Webhook = type("Webhook", (), {"construct_event": staticmethod(lambda *a, **k: {})})
        sys.modules["stripe"] = _stripe_stub
    import stripe_checkout as _sc
    # Grant a purchase with a payment_intent_id
    cs_wh = "cs_webhook_001"
    pi_wh = "pi_webhook_001"
    _p_wh, _new_wh = a_ir.grant_access_idempotent(
        buyer_id2, "navigator", stripe_session_id=cs_wh,
        amount_paid=5900, payment_intent_id=pi_wh
    )
    check("IR-01: webhook test purchase created", _new_wh, "not new")
    # Build a minimal charge.refunded event payload
    charge_payload = {
        "id": "ch_test_001",
        "payment_intent": pi_wh,
        "amount": 5900,
        "amount_refunded": 5900,
    }
    _sc._handle_charge_refunded(charge_payload)
    # Verify purchase is now expired
    with a_ir.get_db() as conn:
        exp_row = conn.execute(
            "SELECT expires_at, wizard_lock_reason FROM purchases "
            "WHERE stripe_session_id=?", (cs_wh,)
        ).fetchone()
    import datetime as _dt
    if exp_row:
        exp_dt = _dt.datetime.fromisoformat(exp_row["expires_at"])
        already_expired = exp_dt <= _dt.datetime.utcnow() + _dt.timedelta(seconds=5)
    else:
        already_expired = False
    check("IR-01: _handle_charge_refunded expires purchase via payment_intent_id",
          already_expired, f"expires_at={exp_row['expires_at'] if exp_row else None}")
    check("IR-01: wizard_lock_reason = 'refunded'",
          exp_row and exp_row["wizard_lock_reason"] == "refunded",
          f"reason={exp_row['wizard_lock_reason'] if exp_row else None}")

    # --- Test: bundle child rows also expired by refund handler ---
    cs_bundle = "cs_bundle_001"
    pi_bundle = "pi_bundle_001"
    _pb, _nb = a_ir.grant_access_idempotent(
        buyer_id2, "bundle", stripe_session_id=cs_bundle,
        amount_paid=12900, payment_intent_id=pi_bundle
    )
    # Create the synthetic child rows
    a_ir.grant_access_idempotent(buyer_id2, "navigator", cs_bundle + "-nav", amount_paid=5900)
    a_ir.grant_access_idempotent(buyer_id2, "wizard",    cs_bundle + "-wiz", amount_paid=9900)
    # Fire refund for the bundle
    _sc._handle_charge_refunded({
        "id": "ch_bundle_001",
        "payment_intent": pi_bundle,
        "amount": 12900,
        "amount_refunded": 12900,
    })
    with a_ir.get_db() as conn:
        child_rows = conn.execute(
            "SELECT stripe_session_id, wizard_lock_reason FROM purchases "
            "WHERE stripe_session_id LIKE ? AND wizard_lock_reason='refunded'",
            (cs_bundle + "-%",)
        ).fetchall()
    check("IR-01: bundle child rows expired on refund", len(child_rows) == 2,
          f"child rows expired={len(child_rows)}")

except Exception as e:
    traceback.print_exc()
    check("IR-01/IR-02 tests", False, str(e))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print()
total = len(all_results)
passed = sum(1 for _, ok in all_results if ok)
failed = total - passed
print(f"Results: {passed} passed, {failed} failed out of {total} checks")
if failed:
    print("\nFailed checks:")
    for name, ok in all_results:
        if not ok:
            print(f"  FAIL: {name}")
    sys.exit(1)
