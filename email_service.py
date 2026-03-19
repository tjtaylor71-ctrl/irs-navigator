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


# ── Gmail SMTP notifications ───────────────────────────────────────────────────

GMAIL_USER     = os.environ.get("GMAIL_USER", "")
GMAIL_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
NOTIFY_EMAIL   = "info@taylortaxandfinancial.com"


def send_notification(subject: str, body: str) -> tuple:
    """Send a notification email to Tyrone via Gmail SMTP."""
    if not GMAIL_USER or not GMAIL_PASSWORD:
        return False, "Gmail credentials not configured."
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"IRS Pilot Notifications <{GMAIL_USER}>"
    msg["To"]      = NOTIFY_EMAIL

    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_USER, GMAIL_PASSWORD)
            smtp.sendmail(GMAIL_USER, NOTIFY_EMAIL, msg.as_string())
        return True, None
    except Exception as e:
        return False, str(e)


def notify_new_purchase(email: str, product: str, amount: int):
    """Notify Tyrone of a new purchase."""
    subject = f"IRS Pilot — New Purchase: {product.title()} by {email}"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW PURCHASE</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Purchase Received</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Customer</td><td style="padding:6px 0;font-weight:bold">{email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Product</td><td style="padding:6px 0;font-weight:bold">{product.title()}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Amount</td><td style="padding:6px 0;font-weight:bold;color:#7ec11f">${amount/100:.2f}</td></tr>
        </table>
        <div style="margin-top:16px">
          <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold">View in Admin →</a>
        </div>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_taxpro_interest(name: str, email: str, firm: str,
                            credential: str, phone: str, program: str, message: str):
    """Notify Tyrone of a new tax pro interest form submission."""
    subject = f"IRS Pilot — Tax Pro Interest: {name} ({program})"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW TAX PRO INTEREST</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Tax Professional Interest</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888;width:120px">Name</td><td style="padding:6px 0;font-weight:bold">{name}{f", {credential}" if credential else ""}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Firm</td><td style="padding:6px 0">{firm or "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0;color:#1a2d5a"><a href="mailto:{email}">{email}</a></td></tr>
          <tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">{phone or "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Program</td><td style="padding:6px 0;font-weight:bold;color:#7ec11f">{program.upper()}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Message</td><td style="padding:6px 0;font-style:italic">{message or "—"}</td></tr>
        </table>
        <div style="margin-top:16px">
          <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold">View in Admin →</a>
        </div>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_new_registration(email: str):
    """Notify Tyrone of a new user registration."""
    subject = f"IRS Pilot — New Registration: {email}"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW REGISTRATION</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Account Created</h2>
        <p style="font-size:14px;color:#555"><b>{email}</b> just created an account on IRS Pilot.</p>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold">View in Admin →</a>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_new_pro_subscriber(email: str, firm_name: str, payment_url: str = None):
    """Notify Tyrone of a new pro subscriber created in admin."""
    subject = f"IRS Pilot — New Pro Subscriber: {firm_name}"
    payment_section = f"""
      <tr><td style="padding:6px 0;color:#888">Payment Link</td>
      <td style="padding:6px 0"><a href="{payment_url}" style="color:#7ec11f">{payment_url}</a></td></tr>
    """ if payment_url else "<tr><td colspan='2' style='padding:6px 0;color:#888'>No payment link generated — check Stripe.</td></tr>"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW PRO SUBSCRIBER</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Pro Subscriber Created</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Firm</td><td style="padding:6px 0;font-weight:bold">{firm_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0">{email}</td></tr>
          {payment_section}
        </table>
        <p style="font-size:13px;color:#666;margin-top:16px">Send the payment link to the subscriber to complete setup. Once they pay, their account activates automatically.</p>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View in Admin →</a>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_pro_payment_succeeded(email: str, firm_name: str, amount: int = 0):
    """Notify Tyrone that a pro subscriber's payment succeeded."""
    subject = f"IRS Pilot — Pro Payment Received: {firm_name}"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">PRO PAYMENT RECEIVED</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">Pro Subscription Payment Received</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Firm</td><td style="padding:6px 0;font-weight:bold">{firm_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0">{email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Amount</td><td style="padding:6px 0;font-weight:bold;color:#7ec11f">${amount/100:.2f}</td></tr>
        </table>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px">View in Admin →</a>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_pro_payment_failed(email: str, firm_name: str):
    """Notify Tyrone AND the subscriber that payment failed."""
    subject = f"IRS Pilot — Pro Payment Failed: {firm_name} — Action Required"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;padding:16px 24px;border-bottom:3px solid #fca5a5;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot — Payment Failed</div>
      </div>
      <div style="background:#fef2f2;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#dc2626;margin-top:0">Pro Subscription Payment Failed</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Firm</td><td style="padding:6px 0;font-weight:bold">{firm_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0">{email}</td></tr>
        </table>
        <p style="font-size:13px;color:#555;margin-top:16px">Stripe will automatically retry. The subscriber has 7 days to update their payment method before their account is deactivated. You may want to reach out directly.</p>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#dc2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View in Admin →</a>
      </div>
    </div>"""
    # Send to Tyrone
    send_notification(subject, body)
    # Also send to subscriber
    sub_body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;padding:16px 24px;border-bottom:3px solid #fca5a5;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot — Action Required</div>
      </div>
      <div style="background:#fef2f2;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#dc2626;margin-top:0">Your Payment Could Not Be Processed</h2>
        <p style="font-size:14px;color:#555;">Hi {firm_name},</p>
        <p style="font-size:14px;color:#555;">We were unable to process your IRS Pilot Pro subscription payment. Please update your payment method within 7 days to avoid interruption to your service.</p>
        <p style="font-size:14px;color:#555;">You can update your payment method by clicking the button below or contacting us at info@taylortaxandfinancial.com.</p>
        <a href="https://irspilot.com/pro-subscriber/manage" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Update Payment Method →</a>
      </div>
    </div>"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "IRS Pilot — Payment Failed: Action Required Within 7 Days"
        msg["From"]    = f"IRS Pilot <{GMAIL_USER}>"
        msg["To"]      = email
        msg.attach(MIMEText(sub_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_USER, GMAIL_PASSWORD)
            smtp.sendmail(GMAIL_USER, email, msg.as_string())
    except Exception:
        pass


def notify_pro_subscription_cancelled(email: str, firm_name: str):
    """Notify Tyrone that a pro subscription was cancelled."""
    subject = f"IRS Pilot — Pro Subscription Cancelled: {firm_name}"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">PRO SUBSCRIPTION CANCELLED</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">Pro Subscription Cancelled</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Firm</td><td style="padding:6px 0;font-weight:bold">{firm_name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0">{email}</td></tr>
        </table>
        <p style="font-size:13px;color:#666;margin-top:16px">Their account has been automatically deactivated.</p>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View in Admin →</a>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_referral_welcome(email: str, code: str, referral_link: str):
    """Send welcome email to new referral partner with their link."""
    subject = "Welcome to the IRS Pilot Referral Program — Your Link is Ready"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">REFERRAL PARTNER WELCOME</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">You're Now an IRS Pilot Referral Partner!</h2>
        <p style="font-size:14px;color:#555;line-height:1.7">
          Thank you for joining the IRS Pilot Referral Program. You earn <strong>20% commission</strong>
          on every sale made through your referral link — automatically tracked and recorded in your dashboard.
        </p>
        <div style="background:#1a2d5a;border-radius:8px;padding:16px 20px;margin:16px 0">
          <div style="color:#7ec11f;font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:6px">YOUR REFERRAL LINK</div>
          <div style="color:#fff;font-size:15px;font-family:monospace;word-break:break-all">{referral_link}</div>
          <div style="color:#aaa;font-size:11px;margin-top:6px">Referral code: {code}</div>
        </div>
        <h3 style="color:#1a2d5a;font-size:15px">Your Commissions</h3>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr style="background:#fff">
            <td style="padding:8px 12px;border:1px solid #e8e4dc">Navigator ($59 sale)</td>
            <td style="padding:8px 12px;border:1px solid #e8e4dc;color:#7ec11f;font-weight:bold">You earn $11.80</td>
          </tr>
          <tr style="background:#f8f6f1">
            <td style="padding:8px 12px;border:1px solid #e8e4dc">Wizard ($99 sale)</td>
            <td style="padding:8px 12px;border:1px solid #e8e4dc;color:#7ec11f;font-weight:bold">You earn $19.80</td>
          </tr>
          <tr style="background:#fff">
            <td style="padding:8px 12px;border:1px solid #e8e4dc">Bundle ($129 sale)</td>
            <td style="padding:8px 12px;border:1px solid #e8e4dc;color:#7ec11f;font-weight:bold">You earn $25.80</td>
          </tr>
        </table>
        <p style="font-size:13px;color:#555;margin-top:16px;line-height:1.7">
          Track your referrals and commissions anytime at
          <a href="https://irspilot.com/referral" style="color:#1a2d5a">irspilot.com/referral</a>.
          Commissions are paid monthly. Questions? Contact
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>.
        </p>
        <div style="margin-top:16px;font-size:12px;color:#888">
          — Tyrone J. Taylor, EA · Taylor Tax and Financial Consulting Inc. · (615) 953-7124
        </div>
      </div>
    </div>"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"IRS Pilot <{GMAIL_USER}>"
        msg["To"]      = email
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(GMAIL_USER, GMAIL_PASSWORD)
            smtp.sendmail(GMAIL_USER, email, msg.as_string())
        return True, None
    except Exception as e:
        return False, str(e)


def notify_new_referral_partner(email: str, code: str, referral_link: str):
    """Notify Tyrone of a new referral partner."""
    subject = f"IRS Pilot — New Referral Partner: {email}"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW REFERRAL PARTNER</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Referral Partner Joined</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0;font-weight:bold">{email}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Code</td><td style="padding:6px 0">{code}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Link</td><td style="padding:6px 0"><a href="{referral_link}" style="color:#1a2d5a">{referral_link}</a></td></tr>
        </table>
        <a href="https://irspilot.com/admin" style="display:inline-block;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px">View in Admin →</a>
      </div>
    </div>"""
    return send_notification(subject, body)


def notify_demo_request(name: str, profession: str, email: str, mobile: str):
    """Notify Tyrone of a new demo request from the Tax Professionals page."""
    subject = f"IRS Pilot — Demo Request: {name} ({profession})"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:18px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">NEW DEMO REQUEST</div>
      </div>
      <div style="background:#f8f6f1;padding:24px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">New Demo Request</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#888;width:120px">Name</td><td style="padding:6px 0;font-weight:bold">{name}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Profession</td><td style="padding:6px 0">{profession}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0"><a href="mailto:{email}">{email}</a></td></tr>
          <tr><td style="padding:6px 0;color:#888">Mobile</td><td style="padding:6px 0">{mobile}</td></tr>
        </table>
        <a href="https://irspilot.com/admin" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:6px;text-decoration:none;font-weight:bold">
          Send Demo Code in Admin →
        </a>
      </div>
    </div>"""
    return send_notification(subject, body)


def send_demo_code_email(name: str, email: str, demo_link: str, expires_at: str):
    """Send a 24-hour demo access link to a tax professional."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from datetime import datetime

    try:
        expires_display = datetime.fromisoformat(expires_at).strftime("%B %d, %Y at %I:%M %p UTC")
    except Exception:
        expires_display = "24 hours from now"

    subject = "Your IRS Pilot Demo Access — 24 Hours"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:20px 28px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:20px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">DEMO ACCESS GRANTED</div>
      </div>
      <div style="background:#f8f6f1;padding:28px;border-radius:0 0 8px 8px">
        <h2 style="color:#1a2d5a;margin-top:0">Your 24-Hour Demo is Ready</h2>
        <p style="font-size:14px;color:#555;line-height:1.7">Dear {name},</p>
        <p style="font-size:14px;color:#555;line-height:1.7">
          Thank you for your interest in IRS Pilot. I am pleased to grant you a 24-hour full-access demo
          so you can experience the platform firsthand — exactly as your clients would see it.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.7">
          Your demo includes full access to the IRS Pilot Navigator, the Financial Intake Wizard,
          the IRS response letter generator, and all guidance content. You are welcome to explore
          every feature during your review period.
        </p>
        <div style="background:#1a2d5a;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">
          <div style="color:#7ec11f;font-size:12px;font-weight:bold;letter-spacing:1px;margin-bottom:10px">YOUR DEMO ACCESS LINK</div>
          <a href="{demo_link}" style="display:inline-block;padding:13px 28px;background:#7ec11f;color:#1a2d5a;border-radius:8px;font-weight:bold;font-size:15px;text-decoration:none">
            Access Your Demo →
          </a>
          <div style="color:#aaa;font-size:11px;margin-top:10px">Expires: {expires_display}</div>
        </div>
        <p style="font-size:14px;color:#555;line-height:1.7">
          After your review, I would welcome the opportunity to discuss how IRS Pilot can
          benefit your practice — whether through the referral program or a white-label pro subscription.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.7">
          If you have any questions during your demo or would like to schedule a call, please email me at
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>.
        </p>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e8e4dc;font-size:13px;color:#555">
          <strong>Tyrone J. Taylor, EA</strong><br>
          Taylor Tax and Financial Consulting Inc.<br>
          Author, <em>Stop IRS Collections</em><br>
          <a href="https://www.irspilot.com" style="color:#1a2d5a">www.irspilot.com</a>
        </div>
      </div>
    </div>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Tyrone J. Taylor, EA <{GMAIL_USER}>"
    msg["To"]      = email
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_PASSWORD)
        smtp.sendmail(GMAIL_USER, email, msg.as_string())
    return True


def send_pro_interest_letter(name: str, email: str, firm: str = ""):
    """
    Letter 1: Thank them for interest, explain the program, invite them to
    sign up directly or schedule a call via Calendly.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    firm_line = f" at {firm}" if firm else ""
    subject   = "Thank You for Your Interest in IRS Pilot Pro"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:20px 28px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:20px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">PRO SUBSCRIPTION PROGRAM</div>
      </div>
      <div style="background:#f8f6f1;padding:28px;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#555;line-height:1.8">Dear {name},</p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          Thank you for your interest in the IRS Pilot Pro Subscription Program. I appreciate you taking the time
          to reach out, and I am pleased to share more information about how this program can benefit your practice{firm_line}.
        </p>

        <h3 style="color:#1a2d5a;font-size:16px;margin:20px 0 10px">About the Pro Subscription</h3>
        <p style="font-size:14px;color:#555;line-height:1.8">
          IRS Pilot Pro is a white-label version of the IRS Pilot platform — fully branded with your firm name,
          your contact information, and your scheduling link. Your clients will never see IRS Pilot's name.
          They will see yours, on every screen, every step of the way.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.8">The program includes:</p>
        <ul style="font-size:14px;color:#555;line-height:2;padding-left:20px">
          <li>Full access to the IRS Pilot Navigator and Financial Intake Wizard for your clients</li>
          <li>Your firm name, phone number, and Calendly link displayed throughout the app</li>
          <li>10 client sessions per month (additional sessions at $5 each)</li>
          <li>24-hour client access sessions — no client login required</li>
          <li>Optional reseller pricing — set your own rates for clients</li>
          <li>Setup within one business day of enrollment</li>
        </ul>

        <h3 style="color:#1a2d5a;font-size:16px;margin:20px 0 10px">Subscription Pricing</h3>
        <p style="font-size:14px;color:#555;line-height:1.8">
          The Pro Subscription is offered at an introductory rate of <strong>$49 per month for the first three months</strong>,
          after which it continues at <strong>$79 per month</strong>. There is no long-term contract —
          the subscription is month-to-month and may be cancelled at any time.
        </p>

        <h3 style="color:#1a2d5a;font-size:16px;margin:20px 0 10px">Ready to Move Forward?</h3>
        <p style="font-size:14px;color:#555;line-height:1.8">
          If you would like to proceed, you may sign up directly by visiting the link below.
          By enrolling, you agree to the month-to-month subscription terms described above,
          including the billing cycle and cancellation policy.
        </p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://irspilot.com/referral#pro-contact"
            style="display:inline-block;padding:13px 28px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:8px;font-weight:bold;font-size:15px;text-decoration:none">
            Enroll in Pro Subscription →
          </a>
        </div>

        <p style="font-size:14px;color:#555;line-height:1.8">
          If you have additional questions or would like to discuss the program before enrolling,
          I invite you to schedule a brief call with me directly using the link below.
        </p>
        <div style="text-align:center;margin:20px 0">
          <a href="https://calendly.com/taylor-tax-financial/irspilotreferral"
            style="display:inline-block;padding:11px 24px;background:transparent;color:#1a2d5a;border:2px solid #1a2d5a;border-radius:8px;font-weight:bold;font-size:14px;text-decoration:none">
            📅 Schedule a Call with Tyrone →
          </a>
        </div>

        <p style="font-size:14px;color:#555;line-height:1.8">
          I look forward to the opportunity to work with you and your practice.
          Please do not hesitate to reach out at any time.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e8e4dc;font-size:13px;color:#555;line-height:1.8">
          Sincerely,<br>
          <strong>Tyrone J. Taylor, EA</strong><br>
          Taylor Tax and Financial Consulting Inc.<br>
          Author, <em>Stop IRS Collections</em><br>
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a> |
          <a href="https://www.irspilot.com" style="color:#1a2d5a">www.irspilot.com</a>
        </div>
      </div>
    </div>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Tyrone J. Taylor, EA <{GMAIL_USER}>"
    msg["To"]      = email
    msg.attach(MIMEText(body, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_PASSWORD)
        smtp.sendmail(GMAIL_USER, email, msg.as_string())
    return True


def send_pro_approval_letter(name: str, email: str, firm: str = ""):
    """
    Letter 2: Welcome and subscription confirmation — subscription start date,
    billing cycle, and next steps.
    """
    import smtplib, datetime
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    firm_line   = f" and the entire {firm} team" if firm else ""
    start_date  = datetime.date.today().strftime("%B %d, %Y")
    next_bill   = (datetime.date.today() + datetime.timedelta(days=30)).strftime("%B %d, %Y")

    subject = "Welcome to IRS Pilot Pro — Your Subscription is Active"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:20px 28px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:20px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">WELCOME TO PRO</div>
      </div>
      <div style="background:#f8f6f1;padding:28px;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#555;line-height:1.8">Dear {name},</p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          Welcome to IRS Pilot Pro{firm_line}! I am delighted to confirm that your subscription
          is now active and your branded account is being configured. You will receive your
          unique shareable client link within one business day.
        </p>

        <div style="background:#1a2d5a;border-radius:10px;padding:20px 24px;margin:20px 0">
          <div style="color:#7ec11f;font-size:12px;font-weight:bold;letter-spacing:1px;margin-bottom:12px">SUBSCRIPTION DETAILS</div>
          <table style="width:100%;font-size:13px;color:#ccc;border-collapse:collapse">
            <tr><td style="padding:4px 0;width:160px">Subscription Start</td><td style="color:#fff;font-weight:bold">{start_date}</td></tr>
            <tr><td style="padding:4px 0">First Billing Date</td><td style="color:#fff;font-weight:bold">{next_bill}</td></tr>
            <tr><td style="padding:4px 0">Billing Cycle</td><td style="color:#fff;font-weight:bold">Every 30 days</td></tr>
            <tr><td style="padding:4px 0">Introductory Rate</td><td style="color:#7ec11f;font-weight:bold">$49/month (first 3 months)</td></tr>
            <tr><td style="padding:4px 0">Standard Rate</td><td style="color:#fff;font-weight:bold">$79/month thereafter</td></tr>
            <tr><td style="padding:4px 0">Sessions Included</td><td style="color:#fff;font-weight:bold">10 per month</td></tr>
          </table>
        </div>

        <h3 style="color:#1a2d5a;font-size:16px;margin:20px 0 10px">What Happens Next</h3>
        <p style="font-size:14px;color:#555;line-height:1.8">
          We will configure the app with your firm name, contact information, and scheduling link.
          You will receive a follow-up email with your branded client link and instructions for sharing it.
          Your clients simply click the link to access a fully branded 24-hour session — no login required on their end.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          You will be billed automatically every 30 days. You may cancel at any time by contacting us at
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>.
        </p>

        <p style="font-size:14px;color:#555;line-height:1.8">
          Thank you for joining IRS Pilot Pro. I look forward to supporting your practice.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e8e4dc;font-size:13px;color:#555;line-height:1.8">
          Sincerely,<br>
          <strong>Tyrone J. Taylor, EA</strong><br>
          Taylor Tax and Financial Consulting Inc.<br>
          Author, <em>Stop IRS Collections</em><br>
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a> |
          <a href="https://www.irspilot.com" style="color:#1a2d5a">www.irspilot.com</a>
        </div>
      </div>
    </div>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Tyrone J. Taylor, EA <{GMAIL_USER}>"
    msg["To"]      = email
    msg.attach(MIMEText(body, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_PASSWORD)
        smtp.sendmail(GMAIL_USER, email, msg.as_string())
    return True


def send_pro_denial_letter(name: str, email: str):
    """
    Letter 3: Respectful denial — unable to grant access at this time.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    subject = "IRS Pilot Pro Subscription — Application Status"
    body = f"""
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1a2d5a;padding:20px 28px;border-bottom:3px solid #7ec11f;border-radius:8px 8px 0 0">
        <div style="color:#fff;font-size:20px;font-weight:bold">IRS Pilot</div>
        <div style="color:#7ec11f;font-size:11px;letter-spacing:1px">SUBSCRIPTION STATUS</div>
      </div>
      <div style="background:#f8f6f1;padding:28px;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#555;line-height:1.8">Dear {name},</p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          Thank you for your interest in the IRS Pilot Pro Subscription Program and for taking the time
          to submit your application.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          After careful consideration, I am unable to grant access to the Pro Subscription Program
          at this time. I understand this may be disappointing, and I want to assure you that
          this decision is not a reflection on you or your practice.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          I encourage you to explore the IRS Pilot Referral Program, which is open to all professionals
          and allows you to earn a 20% commission on any client referrals — with no monthly fee or approval required.
          You can enroll immediately at
          <a href="https://irspilot.com/referral" style="color:#1a2d5a">irspilot.com/referral</a>.
        </p>
        <p style="font-size:14px;color:#555;line-height:1.8">
          If you have questions or would like to discuss this further, please feel free to reach out
          at <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>.
          I wish you and your practice continued success.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e8e4dc;font-size:13px;color:#555;line-height:1.8">
          Sincerely,<br>
          <strong>Tyrone J. Taylor, EA</strong><br>
          Taylor Tax and Financial Consulting Inc.<br>
          Author, <em>Stop IRS Collections</em><br>
          <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a> |
          <a href="https://www.irspilot.com" style="color:#1a2d5a">www.irspilot.com</a>
        </div>
      </div>
    </div>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Tyrone J. Taylor, EA <{GMAIL_USER}>"
    msg["To"]      = email
    msg.attach(MIMEText(body, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_PASSWORD)
        smtp.sendmail(GMAIL_USER, email, msg.as_string())
    return True
