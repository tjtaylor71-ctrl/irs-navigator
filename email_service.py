"""
IRS Navigator — Email Service (SendGrid)
Handles password reset emails.
"""
import os, secrets, sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import urllib.request, urllib.error, json

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL       = os.environ.get("FROM_EMAIL", "noreply@taylortaxandfinancial.com")
FROM_NAME        = "IRS Navigator"
BASE_URL         = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "localhost:8080")
if not BASE_URL.startswith("http"):
    BASE_URL = f"https://{BASE_URL}"

DB_PATH = Path(os.environ.get("DB_PATH", "/app/data/irs_navigator.db"))

RESET_EXPIRY_MINUTES = 30


def _ensure_reset_table():
    import sqlite3
    from pathlib import Path
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            used       INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()


def create_reset_token(user_id: int) -> str:
    _ensure_reset_table()
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(minutes=RESET_EXPIRY_MINUTES)).isoformat()
    conn = sqlite3.connect(str(DB_PATH))
    # Invalidate any existing tokens for this user
    conn.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
    conn.execute(
        "INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires)
    )
    conn.commit()
    conn.close()
    return token


def verify_reset_token(token: str):
    """Returns user_id if valid, else None."""
    _ensure_reset_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')",
        (token,)
    ).fetchone()
    conn.close()
    return row["user_id"] if row else None


def consume_reset_token(token: str):
    """Mark token as used."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("UPDATE password_resets SET used = 1 WHERE token = ?", (token,))
    conn.commit()
    conn.close()


def send_reset_email(to_email: str, token: str) -> tuple:
    """Send password reset email via SendGrid. Returns (success, error)."""
    if not SENDGRID_API_KEY:
        return False, "Email service not configured (SENDGRID_API_KEY missing)"

    reset_url = f"{BASE_URL}/reset-password?token={token}"

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": "Reset Your IRS Navigator Password",
        "content": [
            {
                "type": "text/html",
                "value": f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Georgia,serif;background:#f8f6f1;margin:0;padding:40px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e8e4dc;overflow:hidden">
    <div style="background:#1a1a2e;padding:24px 32px;border-bottom:3px solid #c8a96e">
      <div style="color:#fff;font-weight:bold;font-size:18px">⚖️ IRS Navigator</div>
      <div style="color:#c8a96e;font-size:11px;letter-spacing:1px;margin-top:2px">TAXPAYER SELF-HELP</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#1a1a2e;margin-top:0">Password Reset Request</h2>
      <p style="color:#555;line-height:1.7">
        We received a request to reset the password for your IRS Navigator account
        associated with <strong>{to_email}</strong>.
      </p>
      <p style="color:#555;line-height:1.7">
        Click the button below to set a new password. This link expires in
        <strong>{RESET_EXPIRY_MINUTES} minutes</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="{reset_url}"
          style="display:inline-block;padding:14px 28px;background:#1a1a2e;color:#c8a96e;
                 border:2px solid #c8a96e;border-radius:8px;font-family:Georgia,serif;
                 font-weight:bold;font-size:15px;text-decoration:none">
          Reset My Password →
        </a>
      </div>
      <p style="color:#aaa;font-size:12px;line-height:1.6">
        If you didn't request this, you can safely ignore this email — your password won't change.
        <br><br>
        Taylor Tax and Financial Consulting Inc. · (615) 953-7124
      </p>
    </div>
  </div>
</body>
</html>"""
            }
        ]
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 202), None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, f"SendGrid error {e.code}: {body}"
    except Exception as e:
        return False, str(e)
