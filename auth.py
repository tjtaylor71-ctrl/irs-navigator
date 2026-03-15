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

# ── Access levels ─────────────────────────────────────────────────────────────
ACCESS_NAVIGATOR = "navigator"
ACCESS_WIZARD    = "wizard"
ACCESS_BUNDLE    = "bundle"

PRODUCT_ACCESS = {
    "navigator": [ACCESS_NAVIGATOR, ACCESS_BUNDLE],
    "wizard":    [ACCESS_WIZARD, ACCESS_BUNDLE],
    "bundle":    [ACCESS_BUNDLE],
}

PRODUCT_PRICES = {
    "navigator": 5900,   # cents
    "wizard":    9900,
    "bundle":    12900,
}

ACCESS_DAYS = 7

# ── DB setup ──────────────────────────────────────────────────────────────────
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
                active      INTEGER DEFAULT 1,
                created_at  TEXT DEFAULT (datetime('now'))
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
        """)

# ── Password helpers ──────────────────────────────────────────────────────────
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

# ── Session helpers ───────────────────────────────────────────────────────────
SESSION_COOKIE = "irs_session"
SESSION_DAYS   = 8  # slightly longer than access period

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
    """Return user row if session is valid, else None."""
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

# ── Access helpers ────────────────────────────────────────────────────────────
def get_user_access(user_id: int) -> list:
    """Return list of active product keys for this user."""
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
    """Return expiry datetime string for the user's access to a product, or None."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT expires_at FROM purchases WHERE user_id = ? AND product IN ({}) "
            "AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1".format(
                ",".join("?" * len(PRODUCT_ACCESS.get(product, [])))
            ),
            (user_id, *PRODUCT_ACCESS.get(product, []))
        ).fetchone()
    return row["expires_at"] if row else None

# ── User operations ───────────────────────────────────────────────────────────
def create_user(email: str, password: str):
    """Create user. Returns (user_id, None) or (None, error_message)."""
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
    """Verify credentials. Returns (user_id, None) or (None, error_message)."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE email = ?",
            (email.lower().strip(),)
        ).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None, "Invalid email or password."
    return row["id"], None

def grant_access(user_id: int, product: str, stripe_session_id: str = None):
    """Grant product access for ACCESS_DAYS days."""
    expires = (datetime.utcnow() + timedelta(days=ACCESS_DAYS)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO purchases (user_id, product, stripe_session_id, expires_at) VALUES (?, ?, ?, ?)",
            (user_id, product, stripe_session_id, expires)
        )
    return expires


# ── Discount code helpers ──────────────────────────────────────────────────────

def validate_discount_code(code: str, user_id: int):
    """
    Validate a discount code for a user.
    Returns (discount_pct, code_id, None) or (None, None, error_message).
    """
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
    """Record a discount code use and increment counter."""
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
    """Create a discount code. Returns (id, None) or (None, error)."""
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
    """Create a referral partner record and generate a unique code."""
    import secrets, string
    # Generate a short unique code
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
    """Look up a referral partner by their code."""
    with get_db() as conn:
        return conn.execute(
            "SELECT rp.*, u.email FROM referral_partners rp "
            "JOIN users u ON u.id = rp.user_id "
            "WHERE rp.code = ? AND rp.active = 1",
            (code.strip().upper(),)
        ).fetchone()


def get_referral_partner_by_user(user_id: int):
    """Get referral partner record for a user."""
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM referral_partners WHERE user_id = ?",
            (user_id,)
        ).fetchone()


def record_referral_conversion(partner_id: int, referred_user_id: int,
                                purchase_id: int, product: str,
                                sale_amount: int, commission_pct: int,
                                stripe_session_id: str = None):
    """Record a referral conversion."""
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
    """Return stats for a referral partner."""
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
