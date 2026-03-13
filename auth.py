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
