"""
IRS Navigator — Auth & Access Control
Handles user registration, login, sessions, and access checks.
"""
import sqlite3, hashlib, secrets, os
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
from flask import request, redirect, jsonify, session

DB_PATH = Path(os.environ.get("DB_PATH", "/app/data/irs_navigator.db"))

ACCESS_NAVIGATOR = "navigator"
ACCESS_WIZARD    = "wizard"
ACCESS_BUNDLE    = "bundle"

PRODUCT_ACCESS = {
    "navigator": [ACCESS_NAVIGATOR, ACCESS_BUNDLE],
    "wizard":    [ACCESS_WIZARD, ACCESS_BUNDLE],
    "bundle":    [ACCESS_BUNDLE],
}

PRODUCT_PRICES = {
    "navigator": 5900,
    "wizard":    9900,
    "bundle":    12900,
}

ACCESS_DAYS = 7

def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email       TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS purchases (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                product     TEXT NOT NULL,
                stripe_session_id TEXT,
                expires_at  TEXT NOT NULL,
                wizard_locked INTEGER DEFAULT 0,
                wizard_lock_reason TEXT DEFAULT 'download',
                amount_paid INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token       TEXT PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                created_at  TEXT DEFAULT (datetime('now')),
                expires_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS discount_codes (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                code        TEXT UNIQUE NOT NULL,
                discount_pct INTEGER NOT NULL,
                discount_type TEXT DEFAULT 'percent',
                discount_amount INTEGER DEFAULT 0,
                applies_to  TEXT DEFAULT 'all',
                expires_at  TEXT,
                max_uses    INTEGER,
                use_count   INTEGER DEFAULT 0,
                active      INTEGER DEFAULT 1,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS discount_uses (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                code_id     INTEGER NOT NULL REFERENCES discount_codes(id),
                user_id     INTEGER NOT NULL REFERENCES users(id),
                product     TEXT NOT NULL,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS referral_partners (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                code        TEXT UNIQUE NOT NULL,
                commission_pct INTEGER NOT NULL DEFAULT 20,
                custom_commission_pct INTEGER DEFAULT 0,
                foundation_sponsor_id INTEGER DEFAULT NULL,
                active      INTEGER DEFAULT 1,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS pro_subscribers (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL REFERENCES users(id),
                firm_name       TEXT NOT NULL,
                contact_name    TEXT NOT NULL,
                contact_phone   TEXT,
                calendly_url    TEXT,
                access_code     TEXT UNIQUE NOT NULL,
                stripe_sub_id   TEXT,
                stripe_customer_id TEXT,
                sessions_used   INTEGER DEFAULT 0,
                sessions_reset  TEXT DEFAULT (date('now', 'start of month', '+1 month')),
                sessions_limit  INTEGER DEFAULT 10,
                active          INTEGER DEFAULT 1,
                reseller_mode   INTEGER DEFAULT 0,
                reseller_navigator_price INTEGER DEFAULT 0,
                reseller_wizard_price    INTEGER DEFAULT 0,
                reseller_bundle_price    INTEGER DEFAULT 0,
                reseller_stripe_key      TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS pro_client_links (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                subscriber_id   INTEGER NOT NULL REFERENCES pro_subscribers(id),
                token           TEXT UNIQUE NOT NULL,
                product         TEXT NOT NULL,
                used            INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now')),
                expires_at      TEXT
            );
            CREATE TABLE IF NOT EXISTS pro_sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                subscriber_id   INTEGER NOT NULL REFERENCES pro_subscribers(id),
                session_token   TEXT UNIQUE NOT NULL,
                created_at      TEXT DEFAULT (datetime('now')),
                expires_at      TEXT NOT NULL,
                used_count      INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS referral_conversions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                partner_id      INTEGER NOT NULL REFERENCES referral_partners(id),
                referred_user_id INTEGER NOT NULL REFERENCES users(id),
                purchase_id     INTEGER REFERENCES purchases(id),
                product         TEXT NOT NULL,
                sale_amount     INTEGER NOT NULL,
                commission_amount INTEGER NOT NULL,
                stripe_session_id TEXT,
                paid_out        INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS password_resets (
                token       TEXT PRIMARY KEY,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                expires_at  TEXT NOT NULL,
                used        INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS taxpro_interests (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT, firm TEXT, credential TEXT,
                email      TEXT, phone TEXT, website TEXT,
                program    TEXT, message TEXT,
                status     TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS preview_codes (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                code         TEXT UNIQUE NOT NULL,
                type         TEXT NOT NULL DEFAULT 'demo',
                label        TEXT,
                expires_at   TEXT NOT NULL,
                used         INTEGER DEFAULT 0,
                used_at      TEXT,
                created_at   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS pro_signup_tokens (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                token        TEXT UNIQUE NOT NULL,
                email        TEXT NOT NULL,
                name         TEXT,
                firm         TEXT,
                interest_id  INTEGER,
                used         INTEGER DEFAULT 0,
                expires_at   TEXT NOT NULL,
                created_at   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS price_overrides (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                product     TEXT NOT NULL,
                price_cents INTEGER NOT NULL,
                note        TEXT,
                used        INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS global_settings (
                key         TEXT PRIMARY KEY,
                value       TEXT NOT NULL,
                updated_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS foundation_members (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL REFERENCES users(id),
                partner_id      INTEGER NOT NULL REFERENCES referral_partners(id),
                override_pct    INTEGER NOT NULL DEFAULT 5,
                active          INTEGER DEFAULT 1,
                created_at      TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS foundation_recruitment_tokens (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                token               TEXT UNIQUE NOT NULL,
                foundation_member_id INTEGER NOT NULL REFERENCES foundation_members(id),
                active              INTEGER DEFAULT 1,
                expires_at          TEXT NOT NULL,
                created_at          TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS wizard_data (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL REFERENCES users(id),
                data_json    TEXT NOT NULL,
                locked_at    TEXT,
                purge_after  TEXT,
                purged       INTEGER DEFAULT 0,
                created_at   TEXT DEFAULT (datetime('now')),
                updated_at   TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS demo_requests (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT, profession TEXT,
                email      TEXT, mobile TEXT,
                status     TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS planning_sessions (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                tax_year                INTEGER NOT NULL,
                filing_status           TEXT    DEFAULT 'single',
                income_w2               REAL    DEFAULT 0,
                income_se               REAL    DEFAULT 0,
                income_other            REAL    DEFAULT 0,
                prior_year_tax          REAL    DEFAULT 0,
                ytd_withholding         REAL    DEFAULT 0,
                ytd_estimated_payments  REAL    DEFAULT 0,
                paychecks_remaining     INTEGER DEFAULT 0,
                created_at              TEXT DEFAULT (datetime('now')),
                updated_at              TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, tax_year)
            );
            CREATE INDEX IF NOT EXISTS idx_planning_sessions_user
                ON planning_sessions(user_id, tax_year);

            CREATE TABLE IF NOT EXISTS planning_results (
                id                          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id                  INTEGER NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
                gross_income                REAL,
                se_tax                      REAL,
                se_deduction                REAL,
                estimated_agi               REAL,
                standard_deduction          REAL,
                estimated_taxable_income    REAL,
                income_tax                  REAL,
                estimated_total_tax         REAL,
                effective_tax_rate_pct      REAL,
                safe_harbor_amount          REAL,
                safe_harbor_met             INTEGER DEFAULT 0,
                total_paid                  REAL,
                balance_due                 REAL,
                overpayment                 REAL DEFAULT 0,
                q1_payment                  REAL,
                q2_payment                  REAL,
                q3_payment                  REAL,
                q4_payment                  REAL,
                q1_due                      TEXT,
                q2_due                      TEXT,
                q3_due                      TEXT,
                q4_due                      TEXT,
                w4_additional_per_paycheck  REAL DEFAULT 0,
                calculated_at               TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_planning_results_session
                ON planning_results(session_id, calculated_at);
        """)
    # ── Migrations — add columns to existing tables safely ────────────────────
    migrations = [
        "ALTER TABLE purchases ADD COLUMN wizard_locked INTEGER DEFAULT 0",
        "ALTER TABLE purchases ADD COLUMN wizard_lock_reason TEXT DEFAULT 'download'",
        "ALTER TABLE purchases ADD COLUMN amount_paid INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN reseller_mode INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN reseller_navigator_price INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN reseller_wizard_price INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN reseller_bundle_price INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN reseller_stripe_key TEXT",
        "ALTER TABLE pro_subscribers ADD COLUMN stripe_customer_id TEXT",
        "ALTER TABLE pro_client_links ADD COLUMN expires_at TEXT",
        "ALTER TABLE taxpro_interests ADD COLUMN status TEXT DEFAULT 'pending'",
        "ALTER TABLE discount_codes ADD COLUMN applies_to TEXT DEFAULT 'all'",
        "ALTER TABLE discount_codes ADD COLUMN discount_type TEXT DEFAULT 'percent'",
        "ALTER TABLE discount_codes ADD COLUMN discount_amount INTEGER DEFAULT 0",
        "ALTER TABLE referral_partners ADD COLUMN custom_commission_pct INTEGER DEFAULT 0",
        "ALTER TABLE referral_partners ADD COLUMN foundation_sponsor_id INTEGER DEFAULT NULL",
        "ALTER TABLE purchases ADD COLUMN expiry_warned INTEGER DEFAULT 0",
        "ALTER TABLE referral_partners ADD COLUMN stripe_connect_id TEXT",
        "ALTER TABLE pro_subscribers ADD COLUMN sessions_billed_through INTEGER DEFAULT 0",
    ]
    with get_db() as conn:
        for sql in migrations:
            try:
                conn.execute(sql)
            except Exception:
                pass  # Column already exists

# ── Password helpers ───────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{h}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":")
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == h
    except Exception:
        return False

# ── Session helpers ────────────────────────────────────────────────────────────
SESSION_COOKIE = "irs_session"
SESSION_DAYS   = 8

def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(days=SESSION_DAYS)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires)
        )
    return token

def get_session_user(token: str):
    if not token:
        return None
    with get_db() as conn:
        row = conn.execute(
            "SELECT s.user_id, u.email FROM sessions s JOIN users u ON u.id = s.user_id "
            "WHERE s.token = ? AND s.expires_at > datetime('now')",
            (token,)
        ).fetchone()
    return row

def current_token():
    return request.cookies.get(SESSION_COOKIE)

def current_user():
    return get_session_user(current_token())

# ── Access helpers ─────────────────────────────────────────────────────────────
def get_user_access(user_id: int) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT product FROM purchases WHERE user_id = ? AND expires_at > datetime('now')",
            (user_id,)
        ).fetchall()
    return [r["product"] for r in rows]

def has_access(user_id: int, product: str) -> bool:
    active = get_user_access(user_id)
    return any(p in PRODUCT_ACCESS.get(product, []) for p in active)

def get_access_expiry(user_id: int, product: str) -> str | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT expires_at FROM purchases WHERE user_id = ? AND product IN ({}) "
            "AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1".format(
                ",".join("?" * len(PRODUCT_ACCESS.get(product, [])))
            ),
            (user_id, *PRODUCT_ACCESS.get(product, []))
        ).fetchone()
    return row["expires_at"] if row else None

# ── User operations ────────────────────────────────────────────────────────────
def create_user(email: str, password: str):
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email.lower().strip(), hash_password(password))
            )
            return cur.lastrowid, None
    except sqlite3.IntegrityError:
        return None, "An account with that email already exists."

def login_user(email: str, password: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE email = ?",
            (email.lower().strip(),)
        ).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None, "Invalid email or password."
    return row["id"], None

def grant_access(user_id: int, product: str, stripe_session_id: str = None):
    expires = (datetime.utcnow() + timedelta(days=ACCESS_DAYS)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO purchases (user_id, product, stripe_session_id, expires_at) VALUES (?, ?, ?, ?)",
            (user_id, product, stripe_session_id, expires)
        )
    return expires

# ── Session expiry helpers ─────────────────────────────────────────────────────
def get_purchases_expiring_soon(days_ahead: int = 2):
    """Return purchases expiring within days_ahead that haven't been notified."""
    cutoff = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()
    now    = datetime.utcnow().isoformat()
    with get_db() as conn:
        try:
            rows = conn.execute(
                """SELECT p.id, p.user_id, p.product, p.expires_at, u.email
                   FROM purchases p JOIN users u ON p.user_id = u.id
                   WHERE p.expires_at > ? AND p.expires_at <= ?
                   AND p.expiry_warned = 0""",
                (now, cutoff)
            ).fetchall()
        except Exception:
            rows = []
    return rows

def mark_expiry_warned(purchase_id: int):
    """Mark a purchase as having had an expiry warning sent."""
    with get_db() as conn:
        try:
            conn.execute(
                "UPDATE purchases SET expiry_warned = 1 WHERE id = ?",
                (purchase_id,)
            )
        except Exception:
            pass

# ── Discount code helpers ──────────────────────────────────────────────────────
def validate_discount_code(code: str, user_id: int):
    with get_db() as conn:
        row = conn.execute(
            """SELECT id, discount_pct, expires_at, max_uses, use_count, active
               FROM discount_codes WHERE code = ? COLLATE NOCASE""",
            (code.strip().upper(),)
        ).fetchone()
    if not row:
        return None, None, "Invalid discount code."
    if not row["active"]:
        return None, None, "This discount code is no longer active."
    if row["expires_at"] and row["expires_at"] < datetime.utcnow().isoformat():
        return None, None, "This discount code has expired."
    if row["max_uses"] and row["use_count"] >= row["max_uses"]:
        return None, None, "This discount code has reached its maximum uses."
    return row["discount_pct"], row["id"], None

def record_discount_use(code_id: int, user_id: int, product: str):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO discount_uses (code_id, user_id, product) VALUES (?, ?, ?)",
            (code_id, user_id, product)
        )
        conn.execute(
            "UPDATE discount_codes SET use_count = use_count + 1 WHERE id = ?",
            (code_id,)
        )

def create_discount_code(code: str, discount_pct: int, expires_at: str = None, max_uses: int = None):
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO discount_codes (code, discount_pct, expires_at, max_uses) VALUES (?, ?, ?, ?)",
                (code.strip().upper(), discount_pct, expires_at, max_uses)
            )
            return cur.lastrowid, None
    except sqlite3.IntegrityError:
        return None, f"Code '{code.upper()}' already exists."

# ── Referral partner helpers ───────────────────────────────────────────────────
def create_referral_partner(user_id: int, commission_pct: int = 20):
    import string
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        try:
            with get_db() as conn:
                cur = conn.execute(
                    "INSERT INTO referral_partners (user_id, code, commission_pct) VALUES (?, ?, ?)",
                    (user_id, code, commission_pct)
                )
                return cur.lastrowid, code, None
        except sqlite3.IntegrityError:
            continue
    return None, None, "Could not generate unique referral code."

def get_referral_partner_by_code(code: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT rp.*, u.email FROM referral_partners rp "
            "JOIN users u ON u.id = rp.user_id "
            "WHERE rp.code = ? AND rp.active = 1",
            (code.strip().upper(),)
        ).fetchone()

def get_referral_partner_by_user(user_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM referral_partners WHERE user_id = ?",
            (user_id,)
        ).fetchone()

def record_referral_conversion(partner_id: int, referred_user_id: int,
                                purchase_id: int, product: str,
                                sale_amount: int, commission_pct: int,
                                stripe_session_id: str = None):
    commission = int(sale_amount * commission_pct / 100)
    with get_db() as conn:
        conn.execute(
            """INSERT INTO referral_conversions
               (partner_id, referred_user_id, purchase_id, product,
                sale_amount, commission_amount, stripe_session_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (partner_id, referred_user_id, purchase_id, product,
             sale_amount, commission, stripe_session_id)
        )
    return commission

def get_partner_stats(partner_id: int):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT product, sale_amount, commission_amount, paid_out, created_at "
            "FROM referral_conversions WHERE partner_id = ? ORDER BY created_at DESC",
            (partner_id,)
        ).fetchall()
    total_sales      = sum(r["sale_amount"] for r in rows)
    total_commission = sum(r["commission_amount"] for r in rows)
    unpaid           = sum(r["commission_amount"] for r in rows if not r["paid_out"])
    return {
        "conversions":       len(rows),
        "total_sales":       total_sales,
        "total_commission":  total_commission,
        "unpaid_commission": unpaid,
        "history":           [dict(r) for r in rows],
    }

# ── Pro subscriber helpers ─────────────────────────────────────────────────────
def create_pro_subscriber(user_id: int, firm_name: str, contact_name: str,
                           contact_phone: str = None, calendly_url: str = None):
    import string
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        try:
            with get_db() as conn:
                cur = conn.execute(
                    """INSERT INTO pro_subscribers
                       (user_id, firm_name, contact_name, contact_phone, calendly_url, access_code)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (user_id, firm_name, contact_name, contact_phone, calendly_url, code)
                )
                return cur.lastrowid, code, None
        except sqlite3.IntegrityError:
            continue
    return None, None, "Could not generate unique access code."

def get_pro_subscriber_by_code(code: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM pro_subscribers WHERE access_code = ? AND active = 1",
            (code.strip().upper(),)
        ).fetchone()

def get_pro_subscriber_by_user(user_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM pro_subscribers WHERE user_id = ?",
            (user_id,)
        ).fetchone()

def create_pro_session(subscriber_id: int):
    sub = None
    with get_db() as conn:
        sub = conn.execute(
            "SELECT * FROM pro_subscribers WHERE id = ?", (subscriber_id,)
        ).fetchone()
    if not sub:
        return None, "Subscriber not found."
    now = datetime.utcnow()
    reset_date = sub["sessions_reset"]
    if reset_date and now.isoformat()[:10] >= reset_date[:10]:
        new_reset = (now.replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()
        with get_db() as conn:
            conn.execute(
                "UPDATE pro_subscribers SET sessions_used = 0, sessions_reset = ? WHERE id = ?",
                (new_reset, subscriber_id)
            )
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO pro_sessions (subscriber_id, session_token, expires_at) VALUES (?, ?, ?)",
            (subscriber_id, token, expires)
        )
        conn.execute(
            "UPDATE pro_subscribers SET sessions_used = sessions_used + 1 WHERE id = ?",
            (subscriber_id,)
        )
    return token, None

def get_pro_session(token: str):
    if not token:
        return None, None
    with get_db() as conn:
        session = conn.execute(
            "SELECT * FROM pro_sessions WHERE session_token = ? AND expires_at > datetime('now')",
            (token,)
        ).fetchone()
        if not session:
            return None, None
        sub = conn.execute(
            "SELECT * FROM pro_subscribers WHERE id = ?",
            (session["subscriber_id"],)
        ).fetchone()
    return sub, session

def update_pro_subscriber(subscriber_id: int, firm_name: str, contact_name: str,
                            contact_phone: str, calendly_url: str):
    with get_db() as conn:
        conn.execute(
            """UPDATE pro_subscribers SET firm_name=?, contact_name=?, contact_phone=?, calendly_url=?
               WHERE id=?""",
            (firm_name, contact_name, contact_phone, calendly_url, subscriber_id)
        )

def list_pro_subscribers():
    with get_db() as conn:
        return conn.execute(
            """SELECT ps.*, u.email FROM pro_subscribers ps
               JOIN users u ON u.id = ps.user_id
               ORDER BY ps.created_at DESC"""
        ).fetchall()

# ── Reseller helpers ───────────────────────────────────────────────────────────
RESELLER_MIN_MARKUP  = 1.50
BASE_PRICES          = {"navigator": 5900, "wizard": 9900, "bundle": 12900}
RESELLER_MIN_PRICES  = {"navigator": 7900, "wizard": 13900, "bundle": 17900}

def get_min_reseller_price(product: str) -> int:
    return RESELLER_MIN_PRICES.get(product, 7900)

def update_reseller_settings(subscriber_id: int, reseller_mode: bool,
                              navigator_price: int, wizard_price: int,
                              bundle_price: int, stripe_key: str = None):
    with get_db() as conn:
        conn.execute(
            """UPDATE pro_subscribers SET
               reseller_mode=?, reseller_navigator_price=?,
               reseller_wizard_price=?, reseller_bundle_price=?,
               reseller_stripe_key=?
               WHERE id=?""",
            (1 if reseller_mode else 0,
             navigator_price, wizard_price, bundle_price,
             stripe_key, subscriber_id)
        )

def create_client_link(subscriber_id: int, product: str) -> tuple:
    token   = secrets.token_urlsafe(24)
    expires = (datetime.utcnow() + timedelta(days=30)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO pro_client_links (subscriber_id, token, product, expires_at) VALUES (?, ?, ?, ?)",
            (subscriber_id, token, product, expires)
        )
    return token, None

def get_client_link(token: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM pro_client_links WHERE token = ? AND used = 0 "
            "AND (expires_at IS NULL OR expires_at > datetime('now'))",
            (token,)
        ).fetchone()

def consume_client_link(token: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE pro_client_links SET used = 1 WHERE token = ?",
            (token,)
        )

# ── Wizard access lock ─────────────────────────────────────────────────────────
def lock_wizard_access(user_id: int, reason: str = "download"):
    with get_db() as conn:
        conn.execute(
            """UPDATE purchases SET wizard_locked = 1, wizard_lock_reason = ?
               WHERE user_id = ? AND product IN ('wizard','bundle')
               AND expires_at > datetime('now')""",
            (reason, user_id)
        )

def is_wizard_locked(user_id: int) -> bool:
    with get_db() as conn:
        row = conn.execute(
            """SELECT 1 FROM purchases
               WHERE user_id = ? AND product IN ('wizard','bundle')
               AND expires_at > datetime('now') AND wizard_locked = 1""",
            (user_id,)
        ).fetchone()
    return row is not None

def unlock_wizard_access(user_id: int):
    with get_db() as conn:
        conn.execute(
            """UPDATE purchases SET wizard_locked = 0
               WHERE user_id = ? AND product IN ('wizard','bundle')""",
            (user_id,)
        )

# ── Wizard data storage and purge ─────────────────────────────────────────────
def save_wizard_data(user_id: int, data_json: str):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM wizard_data WHERE user_id = ? AND purged = 0",
            (user_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE wizard_data SET data_json = ?, updated_at = datetime('now') WHERE id = ?",
                (data_json, existing["id"])
            )
        else:
            conn.execute(
                "INSERT INTO wizard_data (user_id, data_json) VALUES (?, ?)",
                (user_id, data_json)
            )

def mark_wizard_locked(user_id: int):
    with get_db() as conn:
        conn.execute(
            """UPDATE wizard_data
               SET locked_at   = datetime('now'),
                   purge_after = datetime('now', '+24 hours')
               WHERE user_id = ? AND purged = 0""",
            (user_id,)
        )

def purge_wizard_data(user_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE wizard_data SET data_json = '', purged = 1 WHERE user_id = ? AND purged = 0",
            (user_id,)
        )

def get_wizard_data(user_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT data_json, purged, purge_after FROM wizard_data "
            "WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
            (user_id,)
        ).fetchone()
    if not row or row["purged"]:
        return None
    return dict(row)

def purge_expired_wizard_data():
    try:
        with get_db() as conn:
            result = conn.execute(
                """UPDATE wizard_data SET data_json = '', purged = 1
                   WHERE purged = 0
                   AND purge_after IS NOT NULL
                   AND purge_after < datetime('now')"""
            )
            count = result.rowcount
        if count > 0:
            import logging
            logging.getLogger(__name__).info(f"Purged wizard data for {count} user(s).")
        return count
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Wizard data purge error: {e}")
        return 0

# ── Preview code helpers ───────────────────────────────────────────────────────
DEMO_DURATION_MINUTES  = 15
PARTNER_DURATION_HOURS = 24

def create_preview_code(code_type: str, label: str = None) -> tuple:
    token = secrets.token_urlsafe(12)
    if code_type == "demo":
        expires = (datetime.utcnow() + timedelta(minutes=DEMO_DURATION_MINUTES)).isoformat()
    else:
        expires = (datetime.utcnow() + timedelta(hours=PARTNER_DURATION_HOURS)).isoformat()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO preview_codes (code, type, label, expires_at) VALUES (?,?,?,?)",
                (token, code_type, label, expires)
            )
        return token, expires, None
    except Exception as e:
        return None, None, str(e)

def get_preview_code(token: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM preview_codes WHERE code = ? AND expires_at > datetime('now')",
            (token,)
        ).fetchone()

def list_preview_codes():
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM preview_codes ORDER BY created_at DESC"
        ).fetchall()

def delete_preview_code(code_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM preview_codes WHERE id = ?", (code_id,))

# ── Pro signup token helpers ───────────────────────────────────────────────────
def create_pro_signup_token(email: str, name: str, firm: str,
                             interest_id: int = None) -> tuple:
    token = secrets.token_urlsafe(24)
    expires = (datetime.utcnow() + timedelta(days=7)).isoformat()
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO pro_signup_tokens (token, email, name, firm, interest_id, expires_at) "
                "VALUES (?,?,?,?,?,?)",
                (token, email, name, firm, interest_id, expires)
            )
        return token, None
    except Exception as e:
        return None, str(e)

def get_pro_signup_token(token: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM pro_signup_tokens WHERE token = ? "
            "AND used = 0 AND expires_at > datetime('now')",
            (token,)
        ).fetchone()

def mark_pro_signup_token_used(token: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE pro_signup_tokens SET used = 1 WHERE token = ?", (token,)
        )

# ── Global settings ────────────────────────────────────────────────────────────
def get_setting(key: str, default: str = "") -> str:
    with get_db() as conn:
        row = conn.execute(
            "SELECT value FROM global_settings WHERE key = ?", (key,)
        ).fetchone()
    return row["value"] if row else default

def set_setting(key: str, value: str):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO global_settings (key, value, updated_at) VALUES (?,?,datetime('now')) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')",
            (key, value)
        )

# ── Price overrides ────────────────────────────────────────────────────────────
def create_price_override(user_id: int, product: str,
                           price_cents: int, note: str = "") -> tuple:
    try:
        with get_db() as conn:
            conn.execute(
                "DELETE FROM price_overrides WHERE user_id=? AND product=? AND used=0",
                (user_id, product)
            )
            conn.execute(
                "INSERT INTO price_overrides (user_id, product, price_cents, note) "
                "VALUES (?,?,?,?)",
                (user_id, product, price_cents, note)
            )
        return True, None
    except Exception as e:
        return False, str(e)

def get_price_override(user_id: int, product: str):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM price_overrides WHERE user_id=? AND product=? AND used=0",
            (user_id, product)
        ).fetchone()

def consume_price_override(override_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE price_overrides SET used=1 WHERE id=?", (override_id,)
        )

def list_price_overrides():
    with get_db() as conn:
        return conn.execute(
            "SELECT po.*, u.email FROM price_overrides po "
            "JOIN users u ON po.user_id = u.id "
            "WHERE po.used = 0 ORDER BY po.created_at DESC"
        ).fetchall()

# ── Referral commission helpers ────────────────────────────────────────────────
def get_default_commission() -> int:
    val = get_setting("default_referral_commission", "20")
    try:
        return int(val)
    except Exception:
        return 20

def set_default_commission(pct: int):
    set_setting("default_referral_commission", str(pct))

def set_partner_commission(partner_id: int, pct: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE referral_partners SET custom_commission_pct=? WHERE id=?",
            (pct, partner_id)
        )

# ── Date adjustment helpers ────────────────────────────────────────────────────
def extend_purchase_expiry(purchase_id: int, new_expiry: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE purchases SET expires_at=? WHERE id=?",
            (new_expiry, purchase_id)
        )

def extend_discount_expiry(code_id: int, new_expiry: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE discount_codes SET expires_at=? WHERE id=?",
            (new_expiry, code_id)
        )

# ── Foundation Member helpers ──────────────────────────────────────────────────
def create_foundation_member(user_id: int, partner_id: int,
                              override_pct: int = 5) -> tuple:
    try:
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM foundation_members WHERE user_id = ? AND active = 1",
                (user_id,)
            ).fetchone()
            if existing:
                return existing["id"], None
            cur = conn.execute(
                "INSERT INTO foundation_members (user_id, partner_id, override_pct) "
                "VALUES (?,?,?)",
                (user_id, partner_id, override_pct)
            )
        return cur.lastrowid, None
    except Exception as e:
        return None, str(e)

def get_foundation_member_by_user(user_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT fm.*, rp.code FROM foundation_members fm "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "WHERE fm.user_id = ? AND fm.active = 1",
            (user_id,)
        ).fetchone()

def list_foundation_members():
    with get_db() as conn:
        return conn.execute(
            "SELECT fm.*, rp.code, rp.commission_pct, u.email, "
            "(SELECT COUNT(*) FROM referral_partners rp2 "
            " WHERE rp2.foundation_sponsor_id = fm.id AND rp2.active = 1) as recruited_count, "
            "(SELECT COALESCE(SUM(rc.commission_amount),0) FROM referral_conversions rc "
            " JOIN referral_partners rp2 ON rc.partner_id = rp2.id "
            " WHERE rp2.foundation_sponsor_id = fm.id) as total_override_earned "
            "FROM foundation_members fm "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "JOIN users u ON fm.user_id = u.id "
            "ORDER BY fm.created_at DESC"
        ).fetchall()

def deactivate_foundation_member(fm_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE foundation_members SET active = 0 WHERE id = ?", (fm_id,)
        )

def assign_partner_sponsor(partner_id: int, foundation_member_id: int):
    with get_db() as conn:
        conn.execute(
            "UPDATE referral_partners SET foundation_sponsor_id = ? WHERE id = ?",
            (foundation_member_id, partner_id)
        )

def get_foundation_sponsor(partner_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT fm.*, u.email FROM foundation_members fm "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "JOIN users u ON fm.user_id = u.id "
            "WHERE rp.foundation_sponsor_id IS NOT NULL "
            "AND EXISTS (SELECT 1 FROM referral_partners rp2 "
            "            WHERE rp2.id = ? AND rp2.foundation_sponsor_id = fm.id)",
            (partner_id,)
        ).fetchone()

def record_foundation_override(foundation_member_id: int, sale_amount: int,
                                override_pct: int, source_partner_id: int,
                                purchase_id: int = None):
    override_amount = int(sale_amount * override_pct / 100)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO referral_conversions "
            "(partner_id, referred_user_id, purchase_id, product, "
            " sale_amount, commission_amount, paid_out) "
            "SELECT ?, rc.referred_user_id, ?, rc.product, ?, ?, 0 "
            "FROM foundation_members fm "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "JOIN referral_conversions rc ON rc.partner_id = ? "
            "WHERE fm.id = ? LIMIT 1",
            (source_partner_id, purchase_id, sale_amount,
             override_amount, source_partner_id, foundation_member_id)
        )
    return override_amount

def get_foundation_recruited_partners(foundation_member_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT rp.*, u.email, "
            "(SELECT COALESCE(SUM(rc.sale_amount),0) FROM referral_conversions rc "
            " WHERE rc.partner_id = rp.id) as total_sales, "
            "(SELECT COUNT(*) FROM referral_conversions rc "
            " WHERE rc.partner_id = rp.id) as conversion_count "
            "FROM referral_partners rp "
            "JOIN users u ON rp.user_id = u.id "
            "WHERE rp.foundation_sponsor_id = ? AND rp.active = 1",
            (foundation_member_id,)
        ).fetchall()


# ── Foundation Member recruitment link helpers ─────────────────────────────────

def create_foundation_recruitment_token(foundation_member_id: int) -> tuple:
    """Generate a unique recruitment link token for a Foundation Member."""
    token = secrets.token_urlsafe(20)
    expires = (datetime.utcnow() + timedelta(days=365)).isoformat()
    try:
        with get_db() as conn:
            # Check if a permanent token already exists
            existing = conn.execute(
                "SELECT token FROM foundation_recruitment_tokens WHERE foundation_member_id = ? AND active = 1",
                (foundation_member_id,)
            ).fetchone()
            if existing:
                return existing["token"], None
            conn.execute(
                "INSERT INTO foundation_recruitment_tokens "
                "(token, foundation_member_id, expires_at) VALUES (?,?,?)",
                (token, foundation_member_id, expires)
            )
        return token, None
    except Exception as e:
        return None, str(e)


def get_foundation_recruitment_token(token: str):
    """Look up a valid foundation recruitment token."""
    with get_db() as conn:
        return conn.execute(
            "SELECT frt.*, fm.override_pct, fm.user_id as fm_user_id, "
            "u.email as fm_email, rp.code as fm_code "
            "FROM foundation_recruitment_tokens frt "
            "JOIN foundation_members fm ON frt.foundation_member_id = fm.id "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "JOIN users u ON fm.user_id = u.id "
            "WHERE frt.token = ? AND frt.active = 1 AND fm.active = 1",
            (token,)
        ).fetchone()


def get_or_create_foundation_recruitment_token(foundation_member_id: int) -> tuple:
    """Get existing token or create a new one for a foundation member."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT token FROM foundation_recruitment_tokens "
            "WHERE foundation_member_id = ? AND active = 1",
            (foundation_member_id,)
        ).fetchone()
    if existing:
        return existing["token"], None
    return create_foundation_recruitment_token(foundation_member_id)


# ── Stripe Connect / payout helpers ───────────────────────────────────────────

def get_unpaid_commissions(partner_id: int = None):
    """Get all unpaid commissions, optionally for a specific partner."""
    with get_db() as conn:
        if partner_id:
            return conn.execute(
                "SELECT rc.*, rp.code, u.email, rp.stripe_connect_id "
                "FROM referral_conversions rc "
                "JOIN referral_partners rp ON rc.partner_id = rp.id "
                "JOIN users u ON rp.user_id = u.id "
                "WHERE rc.paid_out = 0 AND rc.partner_id = ?",
                (partner_id,)
            ).fetchall()
        return conn.execute(
            "SELECT rc.*, rp.code, u.email, rp.stripe_connect_id, "
            "COALESCE(SUM(rc2.commission_amount),0) as total_unpaid "
            "FROM referral_conversions rc "
            "JOIN referral_partners rp ON rc.partner_id = rp.id "
            "JOIN users u ON rp.user_id = u.id "
            "LEFT JOIN referral_conversions rc2 ON rc2.partner_id = rp.id AND rc2.paid_out = 0 "
            "WHERE rc.paid_out = 0 "
            "GROUP BY rp.id ORDER BY u.email",
        ).fetchall()


def set_partner_stripe_connect_id(partner_id: int, stripe_connect_id: str):
    """Store a partner's Stripe Connect account ID."""
    with get_db() as conn:
        conn.execute(
            "UPDATE referral_partners SET stripe_connect_id = ? WHERE id = ?",
            (stripe_connect_id, partner_id)
        )


def mark_commissions_paid(partner_id: int, stripe_transfer_id: str = None):
    """Mark all pending commissions for a partner as paid."""
    with get_db() as conn:
        conn.execute(
            "UPDATE referral_conversions SET paid_out = 1, "
            "stripe_transfer_id = ? "
            "WHERE partner_id = ? AND paid_out = 0",
            (stripe_transfer_id, partner_id)
        )


# ── Session overage billing helpers ───────────────────────────────────────────

def get_pro_subscribers_with_overage():
    """Return pro subscribers who have used more than their session limit."""
    with get_db() as conn:
        return conn.execute(
            "SELECT ps.*, u.email FROM pro_subscribers ps "
            "JOIN users u ON ps.user_id = u.id "
            "WHERE ps.active = 1 AND ps.sessions_used > ps.sessions_limit "
            "AND ps.stripe_customer_id IS NOT NULL",
        ).fetchall()


def get_unbilled_overage(subscriber_id: int):
    """Get the number of unbilled overage sessions for a subscriber."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT sessions_used, sessions_limit, sessions_billed_through "
            "FROM pro_subscribers WHERE id = ?",
            (subscriber_id,)
        ).fetchone()
    if not row:
        return 0
    billed_through = row["sessions_billed_through"] or row["sessions_limit"]
    return max(0, row["sessions_used"] - billed_through)


def mark_overage_billed(subscriber_id: int):
    """Record that overage has been billed through current usage."""
    with get_db() as conn:
        conn.execute(
            "UPDATE pro_subscribers SET sessions_billed_through = sessions_used "
            "WHERE id = ?",
            (subscriber_id,)
        )
