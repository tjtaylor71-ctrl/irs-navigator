"""
IRS Navigator — Auth & Access Control
Handles user registration, login, sessions, and access checks.
"""
import sqlite3, hashlib, secrets, os
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
from flask import request, redirect, jsonify, session

# Argon2id password hashing (SEC-02)
# argon2-cffi is a required dependency (listed in requirements.txt).
# In hosted environments (detected via RAILWAY_ENVIRONMENT), we refuse to start
# without it rather than silently degrading to SHA-256.
try:
    from argon2 import PasswordHasher as _PasswordHasher
    from argon2.exceptions import VerifyMismatchError as _VerifyMismatchError, \
        InvalidHashError as _InvalidHashError, VerificationError as _VerificationError
    _ph = _PasswordHasher()
    _ARGON2_AVAILABLE = True
except ImportError:
    _ARGON2_AVAILABLE = False
    # Item 1: Never silently fall back to SHA-256 on Railway or any hosted environment.
    # RAILWAY_ENVIRONMENT is set by the Railway platform for all running services.
    if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PROJECT_ID"):
        raise RuntimeError(
            "argon2-cffi is required but not installed. "
            "Add 'argon2-cffi==23.1.0' to requirements.txt and redeploy. "
            "Refusing to start in a hosted environment without Argon2id password hashing."
        )

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
            CREATE TABLE IF NOT EXISTS covid_pro_credits (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL,
                credits_total   INTEGER NOT NULL DEFAULT 0,
                credits_used    INTEGER NOT NULL DEFAULT 0,
                stripe_session_id TEXT,
                price_tier      TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS testimonials (
                id                          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id                     INTEGER NOT NULL,
                display_name                TEXT NOT NULL,
                role_situation              TEXT,
                testimonial_text            TEXT NOT NULL,
                consent_given               INTEGER DEFAULT 0,
                consent_given_at            TEXT,
                consent_ip                  TEXT,
                approved                    INTEGER DEFAULT 0,
                approved_at                 TEXT,
                published                   INTEGER DEFAULT 0,
                trigger_type                TEXT,
                created_at                  TEXT DEFAULT (datetime('now'))
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
        "ALTER TABLE users ADD COLUMN consent_7216_given_at TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN consent_7216_ip TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN testimonial_consent_given_at TEXT DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN testimonial_consent_ip TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN name TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN firm TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN credential TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN phone TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN website TEXT DEFAULT NULL",
        "ALTER TABLE referral_partners ADD COLUMN profile_complete INTEGER DEFAULT 0",
        "ALTER TABLE foundation_members ADD COLUMN subscription_status TEXT DEFAULT 'pending'",
        "ALTER TABLE foundation_members ADD COLUMN stripe_customer_id TEXT DEFAULT NULL",
        "ALTER TABLE foundation_members ADD COLUMN stripe_subscription_id TEXT DEFAULT NULL",
        "ALTER TABLE foundation_members ADD COLUMN payment_link_sent INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN payment_link TEXT DEFAULT NULL",
        # Phase 1 — webhook idempotency
        """CREATE TABLE IF NOT EXISTS stripe_webhook_events (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id     TEXT UNIQUE NOT NULL,
            event_type   TEXT NOT NULL,
            status       TEXT DEFAULT 'processing',
            claim_token  TEXT,
            claimed_at   TEXT DEFAULT (datetime('now')),
            processed_at TEXT,
            error        TEXT
        )""",
        # PAY-02 — add claim_token to existing installs
        "ALTER TABLE stripe_webhook_events ADD COLUMN claim_token TEXT",
        # Item 4 — add claimed_at to existing installs for stale claim detection
        "ALTER TABLE stripe_webhook_events ADD COLUMN claimed_at TEXT",
        # Item 5 — durable storage for failed price-schedule creation jobs
        """CREATE TABLE IF NOT EXISTS failed_schedule_jobs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            stripe_sub_id     TEXT UNIQUE NOT NULL,
            intro_price_id    TEXT NOT NULL,
            error             TEXT,
            retry_count       INTEGER DEFAULT 0,
            created_at        TEXT DEFAULT (datetime('now')),
            last_attempted_at TEXT DEFAULT (datetime('now')),
            resolved_at       TEXT
        )""",
        # Phase 1 — subscription period tracking
        """CREATE TABLE IF NOT EXISTS pro_session_history (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            subscriber_id   INTEGER NOT NULL REFERENCES pro_subscribers(id),
            period_start    TEXT NOT NULL,
            period_end      TEXT NOT NULL,
            sessions_used   INTEGER NOT NULL,
            sessions_limit  INTEGER NOT NULL,
            overage         INTEGER NOT NULL DEFAULT 0,
            billed          INTEGER DEFAULT 0,
            billed_at       TEXT,
            stripe_charge_id TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        )""",
        # Phase 1 — Connect onboarding columns
        "ALTER TABLE pro_subscribers ADD COLUMN connect_account_id TEXT DEFAULT NULL",
        "ALTER TABLE pro_subscribers ADD COLUMN connect_onboarding_complete INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN connect_charges_enabled INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN connect_payouts_enabled INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN operating_mode INTEGER DEFAULT 1",
        # Phase 1 — overage authorization
        "ALTER TABLE pro_subscribers ADD COLUMN overage_authorized INTEGER DEFAULT 0",
        "ALTER TABLE pro_subscribers ADD COLUMN overage_authorized_at TEXT DEFAULT NULL",
        "ALTER TABLE pro_subscribers ADD COLUMN overage_payment_failed INTEGER DEFAULT 0",
        # Phase 1 — purchases idempotency guard
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_session_id) WHERE stripe_session_id IS NOT NULL",
        # Phase 2 — store which intro price was actually purchased
        "ALTER TABLE pro_subscribers ADD COLUMN purchased_intro_price_id TEXT DEFAULT NULL",
        """CREATE TABLE IF NOT EXISTS client_access_requests (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            pro_id      INTEGER NOT NULL REFERENCES pro_subscribers(id),
            client_name TEXT NOT NULL,
            client_email TEXT NOT NULL,
            message     TEXT,
            status      TEXT DEFAULT 'pending',
            token       TEXT UNIQUE,
            created_at  TEXT DEFAULT (datetime('now')),
            approved_at TEXT
        )""",
        "ALTER TABLE taxpro_interests ADD COLUMN address TEXT DEFAULT NULL",
        "ALTER TABLE taxpro_interests ADD COLUMN calendly_requested INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN name TEXT DEFAULT NULL",
        # SEC-04 — explicit admin entitlement marker
        "ALTER TABLE purchases ADD COLUMN entitlement_type TEXT DEFAULT NULL",
        # SEC-04 — back-fill existing admin rows with marker.
        # Item 3 fix: scope strictly to known admin user IDs (via email join) to avoid
        # stamping legitimate complimentary purchases granted by admin to real customers.
        # The old broad WHERE clause (stripe_session_id IS NULL AND amount_paid = 0)
        # would have incorrectly marked complimentary purchases as admin entitlements.
        """UPDATE purchases SET entitlement_type = 'admin'
           WHERE entitlement_type IS NULL
             AND stripe_session_id IS NULL
             AND amount_paid = 0
             AND user_id = (SELECT id FROM users WHERE email = 'tjtaylor@irspilot.com' LIMIT 1)""",
        # IR-01 — store Stripe PaymentIntent ID on purchases so charge.refunded
        # (which provides pi_... not cs_...) can resolve the correct purchase rows.
        "ALTER TABLE purchases ADD COLUMN payment_intent_id TEXT DEFAULT NULL",
        # IR-01 — index for fast pi_... lookups at refund time.
        "CREATE INDEX IF NOT EXISTS idx_purchases_payment_intent ON purchases(payment_intent_id) WHERE payment_intent_id IS NOT NULL",
        # IR-02 — distinguish direct commissions from Foundation overrides.
        "ALTER TABLE referral_conversions ADD COLUMN commission_type TEXT DEFAULT 'direct'",
        # IR-02 — DB-enforced uniqueness: one direct commission per (partner, session)
        # and one override per (partner, session).  Partial index excludes rows with
        # NULL stripe_session_id (admin grants, manual entries).
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_ref_conv_partner_session_type ON referral_conversions(partner_id, stripe_session_id, commission_type) WHERE stripe_session_id IS NOT NULL",
        # IR-01 — audit trail for already-paid commissions that could not be voided.
        """CREATE TABLE IF NOT EXISTS commission_adjustments (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            referral_conversion_id INTEGER NOT NULL REFERENCES referral_conversions(id),
            stripe_session_id    TEXT,
            adjustment_amount    INTEGER NOT NULL,
            reason               TEXT NOT NULL,
            created_at           TEXT DEFAULT (datetime('now'))
        )""",
    ]
    # SEC-05: Distinguish expected duplicate-column errors from real migration failures.
    # Critical schema objects (indexes, tables, essential columns) must be verified
    # before allowing payment processing.  "duplicate column" is expected for ALTER
    # TABLE statements that have already run; everything else is a real failure.
    import logging as _logging
    _mig_log = _logging.getLogger(__name__)
    critical_failures = []
    with get_db() as conn:
        for sql in migrations:
            try:
                conn.execute(sql)
            except Exception as exc:
                msg = str(exc).lower()
                # SQLite reports duplicate column as "duplicate column name: <col>"
                # and duplicate index/table as "already exists"
                if "duplicate column" in msg or "already exists" in msg or "table" in msg and "already exists" in msg:
                    pass  # Expected on subsequent startups — not an error
                else:
                    _mig_log.error("DB migration failed: %s — SQL: %.200s", exc, sql)
                    # Only mark critical if it involves the stripe_webhook_events
                    # table or the purchases unique index — payment integrity depends on these
                    if "stripe_webhook_events" in sql.lower() or "idx_purchases_stripe" in sql.lower():
                        critical_failures.append(sql[:80])
    if critical_failures:
        raise RuntimeError(
            f"Critical DB migrations failed — payment processing may be unsafe. "
            f"Failing statements: {critical_failures}"
        )

# ── Password helpers (SEC-02: Argon2id with backward-compatible SHA-256 migration) ──

def hash_password(password: str) -> str:
    """Hash a password using Argon2id (preferred) or salted SHA-256 fallback."""
    if _ARGON2_AVAILABLE:
        return _ph.hash(password)
    # Fallback for environments without argon2-cffi (never used in production)
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"sha256:{salt}:{h}"


def verify_password(password: str, stored: str) -> bool:
    """Verify password against stored hash.

    Supports both legacy salted SHA-256 (old format: 'hexsalt:hexhash' or
    'sha256:hexsalt:hexhash') and Argon2id (new format: '$argon2id$...').
    On first successful login with a legacy hash, the caller is responsible for
    re-hashing and updating the stored value (see login_user).
    """
    if not stored:
        return False
    try:
        if stored.startswith("$argon2"):
            # Argon2id hash
            if not _ARGON2_AVAILABLE:
                return False
            try:
                return _ph.verify(stored, password)
            except (_VerifyMismatchError, _InvalidHashError, _VerificationError):
                return False
        # Legacy SHA-256 format: 'sha256:salt:hash' or legacy 'salt:hash'
        if stored.startswith("sha256:"):
            _, salt, h = stored.split(":")
        else:
            salt, h = stored.split(":")
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == h
    except Exception:
        return False

# ── Administrator entitlement helpers ─────────────────────────────────────────

ADMIN_PRODUCTS = ("navigator", "wizard", "bundle", "planning", "covid_penalty")
_ADMIN_ENTITLEMENT_TIMEOUT = 10  # seconds to wait for SQLite exclusive lock

def grant_admin_entitlements(user_id: int) -> None:
    """Ensure *user_id* holds a valid 10-year purchase row for every admin product.

    Design (AUDIT-013):
    • Admin rows use stripe_session_id = NULL.  The unique index on
      purchases(stripe_session_id) is a partial index defined
      "WHERE stripe_session_id IS NOT NULL", so NULL rows are exempt — multiple
      NULL rows for different (user_id, product) pairs are always permitted.
    • Rows are matched by (user_id, product, stripe_session_id IS NULL AND
      amount_paid = 0).  This avoids touching complimentary purchases that may
      legitimately have NULL stripe_session_id but a non-zero amount_paid, e.g.
      a manually granted free trial recorded with a real payment amount.
    • The entire check-and-upsert loop runs inside a single BEGIN EXCLUSIVE
      transaction with a 10-second busy timeout.  SQLite serialises exclusive
      transactions across all processes sharing the database file, so two
      Gunicorn workers racing at startup cannot both INSERT the same row.
    • On exception the transaction is explicitly rolled back and the connection
      is closed before re-raising, leaving the database clean.

    Raises:
        RuntimeError  — user_id does not exist in the users table.
        sqlite3.Error — database error after rollback.
    """
    long_expiry = (datetime.utcnow() + timedelta(days=3650)).isoformat()

    # Open a dedicated connection with a generous busy timeout so a second
    # Gunicorn worker waits rather than failing immediately on lock contention.
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=_ADMIN_ENTITLEMENT_TIMEOUT)
    conn.row_factory = sqlite3.Row
    # Disable Python's implicit transaction management so our explicit
    # BEGIN EXCLUSIVE is not interfered with.
    conn.isolation_level = None
    try:
        # Verify the user exists before touching purchases.
        row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise RuntimeError(f"grant_admin_entitlements: user_id {user_id} not found")

        conn.execute("BEGIN EXCLUSIVE")
        try:
            # One-time migration: clear legacy 'admin_permanent' marker from rows
            # created before AUDIT-013, and stamp them with entitlement_type='admin'
            # so the loop below recognises them and does not insert duplicates.
            # Safe to run on every call — no-op once done.
            conn.execute(
                "UPDATE purchases SET stripe_session_id = NULL, entitlement_type = 'admin' "
                "WHERE user_id = ? AND stripe_session_id = 'admin_permanent'",
                (user_id,)
            )

            for product in ADMIN_PRODUCTS:
                existing = conn.execute(
                    "SELECT id FROM purchases "
                    "WHERE user_id = ? AND product = ? "
                    "AND stripe_session_id IS NULL AND amount_paid = 0 AND entitlement_type = 'admin'",
                    (user_id, product)
                ).fetchone()
                if existing:
                    conn.execute(
                        "UPDATE purchases SET expires_at = ?, entitlement_type = 'admin' WHERE id = ?",
                        (long_expiry, existing["id"])
                    )
                else:
                    conn.execute(
                        "INSERT INTO purchases "
                        "(user_id, product, stripe_session_id, amount_paid, expires_at, entitlement_type) "
                        "VALUES (?, ?, NULL, 0, ?, 'admin')",
                        (user_id, product, long_expiry)
                    )
            conn.execute("COMMIT")
        except Exception:
            try:
                conn.execute("ROLLBACK")
            except Exception:
                pass
            raise
    finally:
        conn.close()


def migrate_admin_entitlements_legacy(user_id: int) -> None:
    """Clear 'admin_permanent' stripe_session_id for a user (standalone migration).

    Called once at startup before grant_admin_entitlements so that the exclusive
    transaction in grant_admin_entitlements never sees the legacy string.
    This is a no-op if already migrated.
    """
    with get_db() as conn:
        conn.execute(
            "UPDATE purchases SET stripe_session_id = NULL "
            "WHERE user_id = ? AND stripe_session_id = 'admin_permanent'",
            (user_id,)
        )


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
def record_consent(user_id: int, ip_address: str = None):
    """Record §7216 consent timestamp and IP for compliance documentation."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET consent_7216_given_at = ?, consent_7216_ip = ? WHERE id = ?",
            (now, ip_address or '', user_id)
        )

def has_consent(user_id: int) -> bool:
    """Check whether a user has given §7216 consent."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT consent_7216_given_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
    return bool(row and row["consent_7216_given_at"])


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

def get_all_users(limit: int = 200) -> list:
    """Get all users for admin management."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT u.id, u.email, u.name, u.created_at, "
            "rp.id as partner_id, rp.firm, rp.phone, rp.code, rp.active as partner_active, "
            "rp.credential, rp.website, rp.address, "
            "ps.id as pro_id, ps.firm_name as pro_firm, ps.active as pro_active "
            "FROM users u "
            "LEFT JOIN referral_partners rp ON rp.user_id = u.id "
            "LEFT JOIN pro_subscribers ps ON ps.user_id = u.id "
            "ORDER BY u.created_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def admin_update_user(user_id: int, email: str = None, name: str = None) -> bool:
    """Admin update a user's email and/or name."""
    with get_db() as conn:
        if email:
            conn.execute("UPDATE users SET email=? WHERE id=?",
                        (email.lower().strip(), user_id))
        if name is not None:
            conn.execute("UPDATE users SET name=? WHERE id=?",
                        (name.strip(), user_id))
    return True


def admin_update_partner(partner_id: int, name: str = None, firm: str = None,
                          phone: str = None, address: str = None,
                          website: str = None, credential: str = None) -> bool:
    """Admin update a referral partner's profile."""
    fields = []
    vals = []
    if name is not None:      fields.append("name=?");       vals.append(name.strip())
    if firm is not None:      fields.append("firm=?");       vals.append(firm.strip())
    if phone is not None:     fields.append("phone=?");      vals.append(phone.strip())
    if address is not None:   fields.append("address=?");    vals.append(address.strip())
    if website is not None:   fields.append("website=?");    vals.append(website.strip())
    if credential is not None:fields.append("credential=?"); vals.append(credential.strip())
    if not fields:
        return False
    vals.append(partner_id)
    with get_db() as conn:
        conn.execute(f"UPDATE referral_partners SET {','.join(fields)} WHERE id=?", vals)
    return True


def admin_update_pro_subscriber(pro_id: int, firm_name: str = None,
                                 contact_name: str = None, contact_phone: str = None,
                                 calendly_url: str = None) -> bool:
    """Admin update a pro subscriber's branding info."""
    fields = []
    vals = []
    if firm_name is not None:    fields.append("firm_name=?");    vals.append(firm_name.strip())
    if contact_name is not None: fields.append("contact_name=?"); vals.append(contact_name.strip())
    if contact_phone is not None:fields.append("contact_phone=?");vals.append(contact_phone.strip())
    if calendly_url is not None: fields.append("calendly_url=?"); vals.append(calendly_url.strip())
    if not fields:
        return False
    vals.append(pro_id)
    with get_db() as conn:
        conn.execute(f"UPDATE pro_subscribers SET {','.join(fields)} WHERE id=?", vals)
    return True


def create_client_access_request(pro_id: int, client_name: str,
                                  client_email: str, message: str = "") -> tuple:
    """Create a pending client access request and return (id, token)."""
    import string
    token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO client_access_requests "
            "(pro_id, client_name, client_email, message, token) VALUES (?,?,?,?,?)",
            (pro_id, client_name.strip(), client_email.lower().strip(),
             message.strip(), token)
        )
        return cur.lastrowid, token


def get_client_access_requests(pro_id: int, status: str = None) -> list:
    """Get all access requests for a pro subscriber."""
    with get_db() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM client_access_requests WHERE pro_id=? AND status=? "
                "ORDER BY created_at DESC",
                (pro_id, status)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM client_access_requests WHERE pro_id=? "
                "ORDER BY created_at DESC",
                (pro_id,)
            ).fetchall()
    return [dict(r) for r in rows]


def approve_client_access_request(request_id: int) -> dict:
    """Approve a client access request and return its data."""
    with get_db() as conn:
        conn.execute(
            "UPDATE client_access_requests SET status='approved', "
            "approved_at=datetime('now') WHERE id=?",
            (request_id,)
        )
        row = conn.execute(
            "SELECT * FROM client_access_requests WHERE id=?",
            (request_id,)
        ).fetchone()
    return dict(row) if row else None


def deny_client_access_request(request_id: int) -> bool:
    """Deny a client access request."""
    with get_db() as conn:
        conn.execute(
            "UPDATE client_access_requests SET status='denied' WHERE id=?",
            (request_id,)
        )
    return True


def get_client_access_request_by_token(token: str) -> dict:
    """Get a request by its approval token."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM client_access_requests WHERE token=?",
            (token,)
        ).fetchone()
    return dict(row) if row else None


def update_foundation_subscription(fm_id: int, stripe_customer_id: str = None,
                                    stripe_subscription_id: str = None,
                                    status: str = None) -> bool:
    """Update foundation member subscription status."""
    fields = []
    vals = []
    if stripe_customer_id: fields.append("stripe_customer_id=?"); vals.append(stripe_customer_id)
    if stripe_subscription_id: fields.append("stripe_subscription_id=?"); vals.append(stripe_subscription_id)
    if status: fields.append("subscription_status=?"); vals.append(status)
    if not fields:
        return False
    vals.append(fm_id)
    with get_db() as conn:
        conn.execute(f"UPDATE foundation_members SET {','.join(fields)} WHERE id=?", vals)
    return True


def submit_pro_application(name: str, email: str, firm: str, address: str,
                            phone: str, website: str, calendly_requested: bool,
                            user_id: int = None) -> int:
    """Submit a new Pro Subscription application — pending admin approval."""
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO taxpro_interests (name, email, firm, address, phone, website, "
            "program, calendly_requested, status) VALUES (?,?,?,?,?,?,?,?,?)",
            (name.strip(), email.lower().strip(), firm.strip(), address.strip(),
             phone.strip(), website.strip(), "pro_subscription",
             1 if calendly_requested else 0, "pending")
        )
        return cur.lastrowid


def approve_pro_application(interest_id: int) -> bool:
    """Mark a pro application as approved."""
    with get_db() as conn:
        conn.execute(
            "UPDATE taxpro_interests SET status='approved' WHERE id=?",
            (interest_id,)
        )
    return True


def get_pro_application(interest_id: int) -> dict:
    """Get a pro application by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM taxpro_interests WHERE id=?", (interest_id,)
        ).fetchone()
    return dict(row) if row else None


def update_partner_profile(user_id: int, name: str, firm: str,
                            credential: str, phone: str, website: str) -> bool:
    """Update referral partner profile info."""
    with get_db() as conn:
        conn.execute(
            "UPDATE referral_partners SET name=?, firm=?, credential=?, phone=?, website=?, profile_complete=1 "
            "WHERE user_id=?",
            (name.strip(), firm.strip(), credential.strip(), phone.strip(), website.strip(), user_id)
        )
        # Also update the user's name
        conn.execute("UPDATE users SET name=? WHERE id=?", (name.strip(), user_id))
    return True


def get_partner_profile_complete(user_id: int) -> bool:
    """Check if a referral partner has completed their profile."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT profile_complete FROM referral_partners WHERE user_id=?",
            (user_id,)
        ).fetchone()
    return bool(row and row["profile_complete"])


def submit_testimonial(user_id: int, display_name: str, role_situation: str,
                       testimonial_text: str, consent_given: bool,
                       consent_ip: str = None, trigger_type: str = None) -> int:
    """Save a testimonial. Only consent=True ones are eligible for publishing."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO testimonials (user_id, display_name, role_situation, testimonial_text, "
            "consent_given, consent_given_at, consent_ip, trigger_type) VALUES (?,?,?,?,?,?,?,?)",
            (user_id, display_name, role_situation, testimonial_text,
             1 if consent_given else 0,
             now if consent_given else None,
             consent_ip if consent_given else None,
             trigger_type)
        )
        testimonial_id = cur.lastrowid
        if consent_given:
            conn.execute(
                "UPDATE users SET testimonial_consent_given_at=?, testimonial_consent_ip=? WHERE id=?",
                (now, consent_ip or '', user_id)
            )
    return testimonial_id


def get_pending_testimonials() -> list:
    """Return testimonials with consent, not yet approved — for admin review."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM testimonials WHERE consent_given=1 AND approved=0 ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def approve_testimonial(testimonial_id: int) -> bool:
    """Mark a testimonial approved (not yet published — admin must explicitly publish)."""
    with get_db() as conn:
        conn.execute(
            "UPDATE testimonials SET approved=1, approved_at=datetime('now') WHERE id=?",
            (testimonial_id,)
        )
    return True


def publish_testimonial(testimonial_id: int) -> bool:
    """Publish an approved testimonial — final step before it appears publicly."""
    with get_db() as conn:
        conn.execute(
            "UPDATE testimonials SET published=1 WHERE id=? AND approved=1 AND consent_given=1",
            (testimonial_id,)
        )
    return True


def get_published_testimonials() -> list:
    """Return published testimonials for public display."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT display_name, role_situation, testimonial_text, created_at "
            "FROM testimonials WHERE published=1 AND approved=1 AND consent_given=1 "
            "ORDER BY approved_at DESC LIMIT 12"
        ).fetchall()
    return [dict(r) for r in rows]


def login_user(email: str, password: str):
    """Authenticate user. On success, transparently upgrades legacy SHA-256 hashes
    to Argon2id (SEC-02 backward-compatible migration)."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE email = ?",
            (email.lower().strip(),)
        ).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None, "Invalid email or password."
    # Upgrade legacy SHA-256 hash to Argon2id on successful login
    stored = row["password_hash"]
    if _ARGON2_AVAILABLE and not stored.startswith("$argon2"):
        try:
            new_hash = hash_password(password)
            with get_db() as conn:
                conn.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (new_hash, row["id"])
                )
        except Exception:
            pass  # Non-fatal — will retry on next login
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
def create_referral_partner(user_id: int, commission_pct: int = 20,
                             name: str = None, firm: str = None,
                             phone: str = None, address: str = None,
                             website: str = None, credential: str = None,
                             active: bool = True):
    import string
    alphabet = string.ascii_uppercase + string.digits
    active_val = 1 if active else 0
    for _ in range(10):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        try:
            with get_db() as conn:
                cur = conn.execute(
                    "INSERT INTO referral_partners "
                    "(user_id, code, commission_pct, name, firm, phone, website, credential, active) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (user_id, code, commission_pct, name, firm, phone, website, credential, active_val)
                )
                # Also update user name if provided
                if name:
                    conn.execute("UPDATE users SET name=? WHERE id=?", (name.strip(), user_id))
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
                                stripe_session_id: str = None) -> int:
    """Record a direct referral commission.

    IR-02: Idempotency is now enforced by the DB UNIQUE index on
    (partner_id, stripe_session_id, commission_type).  On duplicate the
    IntegrityError is caught and the existing commission amount returned.
    Failures other than duplicates are re-raised so callers receive a durable
    error rather than silently skipping the commission.
    """
    commission = int(sale_amount * commission_pct / 100)
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO referral_conversions
                   (partner_id, referred_user_id, purchase_id, product,
                    sale_amount, commission_amount, stripe_session_id,
                    commission_type)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'direct')""",
                (partner_id, referred_user_id, purchase_id, product,
                 sale_amount, commission, stripe_session_id)
            )
        return commission
    except sqlite3.IntegrityError:
        # UNIQUE constraint fired — row already exists; return existing amount.
        with get_db() as conn:
            row = conn.execute(
                "SELECT commission_amount FROM referral_conversions "
                "WHERE partner_id = ? AND stripe_session_id = ? "
                "AND commission_type = 'direct'",
                (partner_id, stripe_session_id)
            ).fetchone()
        return row["commission_amount"] if row else commission

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
                           contact_phone: str = None, calendly_url: str = None,
                           payment_link: str = None):
    import string
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = ''.join(secrets.choice(alphabet) for _ in range(8))
        try:
            with get_db() as conn:
                cur = conn.execute(
                    """INSERT INTO pro_subscribers
                       (user_id, firm_name, contact_name, contact_phone, calendly_url,
                        payment_link, access_code)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (user_id, firm_name, contact_name, contact_phone, calendly_url,
                     payment_link or "", code)
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

def get_pro_subscriber_by_id(pro_id: int):
    with get_db() as conn:
        return conn.execute(
            "SELECT * FROM pro_subscribers WHERE id=?", (pro_id,)
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
                                purchase_id: int = None,
                                stripe_session_id: str = None) -> int:
    """Record a Foundation override commission (5% on recruited partner's sale).

    IR-02: Idempotency is enforced by the DB UNIQUE index on
    (partner_id, stripe_session_id, commission_type='foundation_override').
    On duplicate the IntegrityError is caught and the existing amount returned.
    Failures other than duplicates are re-raised.

    The foundation member's partner_id is used as the partner_id column so that
    payout queries can join to referral_partners for the Foundation member's account.
    """
    override_amount = int(sale_amount * override_pct / 100)
    with get_db() as conn:
        # Resolve foundation member's partner_id for use as the commission owner
        fm_row = conn.execute(
            "SELECT fm.partner_id, rp.user_id "
            "FROM foundation_members fm "
            "JOIN referral_partners rp ON fm.partner_id = rp.id "
            "WHERE fm.id = ?",
            (foundation_member_id,)
        ).fetchone()
        if not fm_row:
            return 0  # Foundation member not found — skip silently

        fm_partner_id = fm_row["partner_id"]

        # Pull product and referred_user_id from the source partner's conversion row
        src_row = conn.execute(
            "SELECT referred_user_id, product FROM referral_conversions "
            "WHERE partner_id = ? AND stripe_session_id = ? LIMIT 1",
            (source_partner_id, stripe_session_id)
        ).fetchone() if stripe_session_id else None

        referred_user_id = src_row["referred_user_id"] if src_row else None
        product = src_row["product"] if src_row else "navigator"

        try:
            conn.execute(
                "INSERT INTO referral_conversions "
                "(partner_id, referred_user_id, purchase_id, product, "
                " sale_amount, commission_amount, stripe_session_id, paid_out, "
                " commission_type) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'foundation_override')",
                (fm_partner_id, referred_user_id, purchase_id, product,
                 sale_amount, override_amount, stripe_session_id)
            )
        except sqlite3.IntegrityError:
            # UNIQUE constraint fired — row already exists; return existing amount.
            row = conn.execute(
                "SELECT commission_amount FROM referral_conversions "
                "WHERE partner_id = ? AND stripe_session_id = ? "
                "AND commission_type = 'foundation_override'",
                (fm_partner_id, stripe_session_id)
            ).fetchone()
            return row["commission_amount"] if row else override_amount

    return override_amount


def get_foundation_sponsor(partner_id: int):
    """Return the Foundation member record that sponsors this referral partner,
    or None if the partner has no Foundation sponsor."""
    with get_db() as conn:
        return conn.execute(
            "SELECT fm.id, fm.partner_id, fm.override_pct, fm.active "
            "FROM referral_partners rp "
            "JOIN foundation_members fm ON fm.id = rp.foundation_sponsor_id "
            "WHERE rp.id = ? AND fm.active = 1",
            (partner_id,)
        ).fetchone()


def void_commissions_for_refund(stripe_session_id: str,
                                refund_fraction: float = 1.0) -> int:
    """Adjust commission rows tied to a Stripe session on refund.

    IR-01 — Full vs. partial refund handling:
    - For unpaid rows: commission_amount is zeroed (full refund) or reduced
      proportionally (partial refund, e.g. refund_fraction=0.5 halves it).
    - For already-paid rows: an audit record is inserted into
      commission_adjustments so finance can process the clawback manually;
      the original row is left intact because the partner was already paid.

    refund_fraction: fraction of the sale that was refunded (0 < f <= 1.0).
    Returns the number of commission rows affected (voided + audit-only).
    """
    if not stripe_session_id:
        return 0
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, commission_amount, paid_out "
            "FROM referral_conversions WHERE stripe_session_id = ?",
            (stripe_session_id,)
        ).fetchall()

        total_affected = 0
        for row in rows:
            original = row["commission_amount"]
            adjustment = int(original * refund_fraction)
            if not row["paid_out"]:
                # Unpaid: zero out or reduce proportionally.
                new_amount = original - adjustment
                conn.execute(
                    "UPDATE referral_conversions SET commission_amount = ? WHERE id = ?",
                    (new_amount, row["id"])
                )
                total_affected += 1
            else:
                # Already paid: create an audit record for clawback processing.
                if adjustment > 0:
                    conn.execute(
                        "INSERT INTO commission_adjustments "
                        "(referral_conversion_id, stripe_session_id, adjustment_amount, reason) "
                        "VALUES (?, ?, ?, ?)",
                        (row["id"], stripe_session_id, -adjustment,
                         f"refund fraction={refund_fraction:.4f}")
                    )
                    total_affected += 1

        return total_affected

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


# ── Webhook idempotency helpers ────────────────────────────────────────────────

_STALE_CLAIM_SECONDS = 300  # 5 minutes — a crashed worker's claim expires after this


def claim_webhook_event(event_id: str, event_type: str) -> bool:
    """
    Attempt to claim an event for exclusive processing.

    PAY-02 fix: Uses a worker-unique claim_token so only ONE worker wins the
    claim, even when multiple workers receive the same event simultaneously.

    Item 4 fix: Stale claim recovery — if a worker crashes after claiming but
    before completing/failing, the row stays in 'processing' with a dead token.
    We detect this by checking claimed_at: if the claim is older than
    _STALE_CLAIM_SECONDS, we UPDATE the row to take ownership with our token.
    This allows Stripe's automatic retries to eventually succeed.

    Design:
    - Each caller generates a unique claim_token and attempts INSERT.
    - On INSERT success, reads back to confirm OUR claim_token won.
    - If another worker's INSERT won first, check if their claim is stale.
      * If stale (claimed_at older than 5 min): UPDATE to take ownership.
      * If fresh: return False and let the winning worker process.
    - If status='completed', the event is done: return False (safe duplicate).
    - If status='failed' (crash recovery), re-insert to allow retry: a failed
      row was deleted by fail_webhook_event; if still present, another worker
      is retrying — return False to avoid double-processing.

    Returns True  — this caller exclusively owns the event and must process it.
    Returns False — another worker claimed it (and their claim is fresh), or
                    the event is already completed.
    Raises        — database error; caller must return 500 so Stripe retries.
    """
    import logging as _cl_log
    _wh_log = _cl_log.getLogger(__name__)
    my_token = secrets.token_hex(8)  # unique per-worker-call identifier
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO stripe_webhook_events "
            "(event_id, event_type, status, claim_token, claimed_at) "
            "VALUES (?, ?, 'processing', ?, datetime('now'))",
            (event_id, event_type, my_token)
        )
        row = conn.execute(
            "SELECT status, claim_token, claimed_at FROM stripe_webhook_events WHERE event_id = ?",
            (event_id,)
        ).fetchone()
        if not row:
            # Should not happen — INSERT OR IGNORE guarantees the row exists
            raise RuntimeError(f"claim_webhook_event: row missing after INSERT for {event_id}")

        if row["status"] == "completed":
            return False   # Already processed successfully — safe duplicate

        if row["status"] == "processing":
            if row["claim_token"] == my_token:
                return True  # We won the INSERT race — this event is ours

            # Another worker's token is in the row.
            # Item 4: Check if that claim is stale (worker may have crashed).
            claimed_at_str = row["claimed_at"]
            is_stale = False
            if claimed_at_str:
                try:
                    claimed_at_dt = datetime.strptime(claimed_at_str, "%Y-%m-%d %H:%M:%S")
                    age_seconds = (datetime.utcnow() - claimed_at_dt).total_seconds()
                    is_stale = age_seconds > _STALE_CLAIM_SECONDS
                except ValueError:
                    pass  # Unparseable timestamp — treat as fresh to be safe

            if is_stale:
                # Previous claimant appears to have crashed without completing.
                # Atomically take ownership by updating claim_token and claimed_at.
                result = conn.execute(
                    "UPDATE stripe_webhook_events "
                    "SET claim_token = ?, claimed_at = datetime('now'), status = 'processing' "
                    "WHERE event_id = ? AND claim_token = ? AND status = 'processing'",
                    (my_token, event_id, row["claim_token"])
                )
                if result.rowcount == 1:
                    _wh_log.warning(
                        "claim_webhook_event: reclaimed stale event %s (was held by %s for >%ds)",
                        event_id, row["claim_token"][:4] + "...", _STALE_CLAIM_SECONDS
                    )
                    return True  # We took over the stale claim
                # Another worker beat us to the stale reclaim — give up
                return False

            # Claim is fresh — another worker is actively processing
            return False

        # status='failed' or anything else — not our event to process
        return False


def complete_webhook_event(event_id: str):
    """Mark a claimed webhook event as successfully completed."""
    with get_db() as conn:
        conn.execute(
            "UPDATE stripe_webhook_events SET status='completed', processed_at=datetime('now') "
            "WHERE event_id=?",
            (event_id,)
        )


def fail_webhook_event(event_id: str, error: str):
    """
    Mark a claimed webhook event as failed so Stripe can retry.
    Resets status to allow re-processing on next delivery.
    """
    with get_db() as conn:
        conn.execute(
            "UPDATE stripe_webhook_events SET status='failed', error=? WHERE event_id=?",
            (error[:500], event_id)
        )
        # Delete the row entirely so the next Stripe retry can claim it fresh
        conn.execute(
            "DELETE FROM stripe_webhook_events WHERE event_id=? AND status='failed'",
            (event_id,)
        )


# ── Subscription activation helpers ───────────────────────────────────────────

def activate_pro_subscriber(subscriber_id: int, stripe_customer_id: str,
                              stripe_sub_id: str, purchased_intro_price_id: str = None) -> bool:
    """
    Activate a pro subscriber after confirmed payment. Idempotent — safe to call
    multiple times for the same subscriber. Returns True if state was changed.
    """
    with get_db() as conn:
        current = conn.execute(
            "SELECT active, stripe_sub_id FROM pro_subscribers WHERE id=?",
            (subscriber_id,)
        ).fetchone()
        if not current:
            return False
        fields = [
            "active=1",
            "stripe_customer_id=?",
            "stripe_sub_id=?",
        ]
        vals = [stripe_customer_id, stripe_sub_id]
        if purchased_intro_price_id:
            fields.append("purchased_intro_price_id=?")
            vals.append(purchased_intro_price_id)
        vals.append(subscriber_id)
        conn.execute(
            f"UPDATE pro_subscribers SET {', '.join(fields)} WHERE id=?",
            vals
        )
        return not current["active"]


def get_subscriber_activation_status(subscriber_id: int) -> dict:
    """Return activation state for polling endpoint."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT active, stripe_sub_id, stripe_customer_id, purchased_intro_price_id "
            "FROM pro_subscribers WHERE id=?",
            (subscriber_id,)
        ).fetchone()
    return dict(row) if row else {}


def grant_access_idempotent(user_id: int, product: str,
                              stripe_session_id: str = None,
                              amount_paid: int = 0,
                              payment_intent_id: str = None) -> tuple:
    """
    Grant access, skipping silently if the stripe_session_id already has a purchase.
    Returns (purchase_id, is_new: bool).

    PAY-06: amount_paid is now persisted so revenue reporting is accurate.
    amount_paid should be the actual amount collected in cents (e.g. 5900 for $59).

    IR-01: payment_intent_id (pi_...) is stored alongside the checkout session ID
    (cs_...) so that charge.refunded webhook events — which only provide the
    PaymentIntent — can resolve the correct purchase rows at refund time.
    """
    # Check for existing grant with this session ID
    if stripe_session_id:
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM purchases WHERE stripe_session_id=? AND product=?",
                (stripe_session_id, product)
            ).fetchone()
        if existing:
            return existing["id"], False

    expires = (datetime.utcnow() + timedelta(days=ACCESS_DAYS)).isoformat()
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO purchases "
                "(user_id, product, stripe_session_id, expires_at, amount_paid, payment_intent_id) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, product, stripe_session_id, expires, amount_paid, payment_intent_id)
            )
        return cur.lastrowid, True
    except Exception:
        # UNIQUE constraint fired — another concurrent request got there first
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM purchases WHERE stripe_session_id=? AND product=?",
                (stripe_session_id, product)
            ).fetchone()
        return (existing["id"] if existing else None), False


# ── COVID Pro Credit Functions ─────────────────────────────────────────────────

def get_covid_pro_credits(user_id: int) -> dict:
    """Get total and remaining COVID pro letter credits for a user."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(credits_total),0) as total, COALESCE(SUM(credits_used),0) as used "
            "FROM covid_pro_credits WHERE user_id = ?",
            (user_id,)
        ).fetchone()
        # Check referral partner status
        is_referral = conn.execute(
            "SELECT id FROM referral_partners WHERE user_id = ? AND active = 1", (user_id,)
        ).fetchone() is not None
        # Check pro subscriber status
        is_pro = conn.execute(
            "SELECT id FROM pro_subscribers WHERE user_id = ? AND active = 1", (user_id,)
        ).fetchone() is not None
    total = row["total"] if row else 0
    used  = row["used"]  if row else 0
    return {"total": total, "used": used, "remaining": total - used, "is_referral": is_referral, "is_pro": is_pro}

def add_covid_pro_credits(user_id: int, credits: int, stripe_session_id: str, price_tier: str) -> bool:
    """Add letter credits after successful Stripe payment."""
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO covid_pro_credits (user_id, credits_total, credits_used, stripe_session_id, price_tier) "
                "VALUES (?, ?, 0, ?, ?)",
                (user_id, credits, stripe_session_id, price_tier)
            )
        return True
    except Exception:
        return False

def consume_covid_pro_credit(user_id: int) -> tuple:
    """Consume one letter credit. Returns (success, remaining)."""
    credits = get_covid_pro_credits(user_id)
    if credits["remaining"] <= 0:
        return False, 0
    with get_db() as conn:
        conn.execute(
            "UPDATE covid_pro_credits SET credits_used = credits_used + 1 "
            "WHERE user_id = ? AND credits_used < credits_total "
            "ORDER BY created_at ASC LIMIT 1",
            (user_id,)
        )
    updated = get_covid_pro_credits(user_id)
    return True, updated["remaining"]
