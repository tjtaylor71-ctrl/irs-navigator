"""
IRS Pilot — Flask Server
Serves the React intake wizard and generates filled IRS PDFs on demand.

Usage:
    python server.py

Then open http://localhost:5000 in your browser.

Requirements:
    pip install flask pypdf

File layout expected:
    server.py                   ← this file
    fill_irs_forms.py           ← PDF fill logic
    static/
        irs-intake-wizard.jsx   ← React wizard (served as static asset)
    pdfs/
        f433f.pdf
        f433a__1_.pdf
        f433b.pdf
        f433aoi__1_.pdf
        f656.pdf
"""

import os
from functools import wraps
import sys
import json
import tempfile
import subprocess
from pathlib import Path
from flask import Flask, request, send_file, jsonify, Response, make_response, redirect
import auth
import stripe_checkout
import email_service
from planning.routes import planning_bp
from transcript_parser import parse_transcript
import io
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
app.register_blueprint(planning_bp, url_prefix='/planning')

# ── Path Configuration ─────────────────────────────────────────────────────────
BASE_DIR  = Path(__file__).parent
PDF_DIR   = BASE_DIR / "pdfs"
FILL_SCRIPT = BASE_DIR / "fill_irs_forms.py"

FORM_PDFS = {
    "433f":    PDF_DIR / "f433f.pdf",
    "433a":    PDF_DIR / "f433a__1_.pdf",
    "433b":    PDF_DIR / "f433b.pdf",
    "433aoic": PDF_DIR / "f433aoi__1_.pdf",
    "656":     PDF_DIR / "f656.pdf",
}

FORM_FILENAMES = {
    "433f":    "Form-433-F.pdf",
    "433a":    "Form-433-A.pdf",
    "433b":    "Form-433-B.pdf",
    "433aoic": "Form-433-A-OIC.pdf",
    "656":     "Form-656.pdf",
}


# ── HTML Page Builder ──────────────────────────────────────────────────────────
# Inlines the JSX directly into the HTML so the browser never has to fetch
# a separate file — eliminates the stall caused by Babel's external src loading.

PAGE_TOP = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>"""

PAGE_CHAT_PAGES = {"IRSApp", "TaxProPage", "DashboardPage"}

PAGE_MID_TPL = """</title>
  <script src="/static/vendor/react.production.min.js"></script>
  <script src="/static/vendor/react-dom.production.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; background: #f8f6f1; }
    img { max-width: 100%; height: auto; }

    /* ── Mobile baseline ── */
    @media (max-width: 640px) {
      body, #root, #root > div { overflow-x: hidden; max-width: 100vw; }
      .hdr-nav { gap: 6px !important; flex-wrap: wrap !important; }
      .hdr-nav a, .hdr-nav button {
        font-size: 11px !important;
        padding: 5px 8px !important;
        white-space: nowrap;
      }
      .mobile-stack {
        flex-direction: column !important;
        grid-template-columns: 1fr !important;
      }
      [style*="repeat(auto-fit"] {
        grid-template-columns: 1fr !important;
      }
      .mobile-full { width: 100% !important; max-width: 100% !important; }
      .mobile-pad  { padding: 14px !important; }
      table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      h1 { font-size: 22px !important; }
      h2 { font-size: 18px !important; }
    }
  </style>
</head>
<body>
  <div id="root"><p style="padding:20px;font-family:sans-serif;color:#999;font-size:12px">Starting...</p></div>
  <script src="/js/COMPILED_FILE"></script>
  <script>
    try {
      const domContainer = document.getElementById('root');
      const root = ReactDOM.createRoot(domContainer);
      root.render(React.createElement(window.COMPONENT_NAME));
    } catch(e) {
      document.getElementById('root').innerHTML = '<div style="padding:40px;color:red;font-family:monospace"><b>Error:</b> ' + e.message + '<br><pre>' + e.stack + '</pre></div>';
    }
  </script>
</body>
</html>"""


def build_page(compiled_file, component_name, title):
    """Serve a pre-compiled JS file in a React HTML shell."""
    compiled_path = BASE_DIR / compiled_file
    if not compiled_path.exists():
        return (
            "<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2 style='color:#dc2626'>File Not Found</h2>"
            f"<p>Could not find: <code>{compiled_file}</code></p>"
            f"<p>Upload <code>{compiled_file}</code> to the root of your GitHub repo.</p>"
            "</body></html>"
        )
    page = PAGE_MID_TPL.replace("COMPILED_FILE", compiled_file)
    page = page.replace("COMPONENT_NAME", component_name)
    html = PAGE_TOP + title + page

    # Inject chat widget on designated pages
    if component_name in PAGE_CHAT_PAGES:
        chat_path = BASE_DIR / "chatbot_widget.js"
        chat_js   = chat_path.read_text() if chat_path.exists() else ""
        if chat_js:
            # Strip the React destructure header — already declared by main app
            chat_js_clean = chat_js.replace(
                "const { useState, useEffect, useRef, useCallback, useMemo } = React;\n\n", ""
            )
            chat_mount = (
                "\n  <div id=\"chat-root\"></div>"
                "\n  <script>" + chat_js_clean + "</script>"
                "\n  <script>"
                "\n    try {"
                "\n      var _cr = document.getElementById('chat-root');"
                "\n      var _crRoot = ReactDOM.createRoot(_cr);"
                "\n      _crRoot.render(React.createElement(window.IRSPilotChat));"
                "\n    } catch(e) { console.error('Chat widget error:', e); }"
                "\n  </script>"
            )
            html = html.replace("</body>", chat_mount + "\n</body>", 1)

    return html


# ── Routes ─────────────────────────────────────────────────────────────────────

# ── Auth helpers ───────────────────────────────────────────────────────────────

def get_current_user():
    token = request.cookies.get(auth.SESSION_COOKIE)
    return auth.get_session_user(token)

def require_access(product):
    """Decorator: redirect to login if user doesn't have access."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user or not auth.has_access(user["user_id"], product):
                return redirect(f"/login?product={product}&next={request.path}")
            return f(*args, **kwargs)
        return wrapped
    return decorator


# ── Admin helpers ─────────────────────────────────────────────────────────────

ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]

def is_admin(user):
    if not user: return False
    return user["email"].lower() in ADMIN_EMAILS

def require_admin(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return redirect("/login?next=" + request.path)
        if not is_admin(user):
            return Response("<html><body style='font-family:sans-serif;padding:40px'><h2>Access Denied</h2><p>Admin only.</p></body></html>", status=403, mimetype="text/html")
        return f(*args, **kwargs)
    return wrapped

def require_login(f):
    """Decorator: redirect to login if not authenticated at all."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return redirect(f"/login?next={request.path}")
        return f(*args, **kwargs)
    return wrapped


# ── Login / Register page ──────────────────────────────────────────────────────

@app.route("/login")
def login_page():
    product = request.args.get("product", "")
    mode    = request.args.get("mode", "login")
    html = build_page("login_page.js", "LoginPage", "IRS Pilot — Sign In")
    # Inject product + mode into window before the component renders
    inject = f"<script>window.__LOGIN_PRODUCT__ = {repr(product)}; window.__LOGIN_MODE__ = {repr(mode)};</script>\n"
    html = html.replace("</body>", inject + "</body>", 1)
    return Response(html, mimetype="text/html")


@app.route("/api/register", methods=["POST"])
def api_register():
    data     = request.get_json(force=True, silent=True) or {}
    email    = data.get("email", "").strip()
    password = data.get("password", "")
    product  = data.get("product")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user_id, err = auth.create_user(email, password)
    if err:
        return jsonify({"error": err}), 400

    token = auth.create_session(user_id)
    # Send registration notification
    try:
        email_service.notify_new_registration(email)
    except Exception:
        pass
    resp  = make_response(jsonify({"redirect": f"/checkout?product={product}" if product else "/account"}))
    resp.set_cookie(auth.SESSION_COOKIE, token, max_age=60*60*24*8, httponly=True, samesite="Lax")
    return resp


@app.route("/api/login", methods=["POST"])
def api_login():
    data     = request.get_json(force=True, silent=True) or {}
    email    = data.get("email", "").strip()
    password = data.get("password", "")
    product  = data.get("product")

    user_id, err = auth.login_user(email, password)
    if err:
        return jsonify({"error": err}), 401

    token = auth.create_session(user_id)
    # Determine where to send them
    if product and not auth.has_access(user_id, product):
        redirect_to = f"/checkout?product={product}"
    elif product and auth.has_access(user_id, product):
        redirect_to = "/navigator" if product == "navigator" else "/wizard"
    else:
        redirect_to = "/account"

    resp = make_response(jsonify({"redirect": redirect_to}))
    resp.set_cookie(auth.SESSION_COOKIE, token, max_age=60*60*24*8, httponly=True, samesite="Lax")
    return resp


@app.route("/api/logout", methods=["POST"])
def api_logout():
    resp = make_response(jsonify({"redirect": "/"}))
    resp.delete_cookie(auth.SESSION_COOKIE)
    return resp


@app.route("/api/me")
def api_me():
    user = get_current_user()
    if not user:
        return jsonify({"loggedIn": False})
    access        = auth.get_user_access(user["user_id"])
    wizard_locked = auth.is_wizard_locked(user["user_id"])
    has_planning  = auth.has_access(user["user_id"], "bundle")
    return jsonify({
        "loggedIn":     True,
        "email":        user["email"],
        "access":       access,
        "wizardLocked": wizard_locked,
        "hasPlanning":  has_planning,
    })


# ── Checkout placeholder (Stripe session will go here) ─────────────────────────

@app.route("/checkout")
def checkout():
    """Redirect to Stripe Checkout for the selected product."""
    user = get_current_user()
    if not user:
        product = request.args.get("product", "")
        ref     = request.args.get("ref", "")
        return redirect(f"/login?product={product}&ref={ref}&mode=register")

    product       = request.args.get("product", "bundle")
    discount_code = request.args.get("discount", "").strip()
    referral_code = (request.args.get("ref") or request.cookies.get("ref_code", "")).strip()

    discount_pct     = 0
    discount_code_id = None

    if discount_code:
        pct, code_id, err = auth.validate_discount_code(discount_code, user["user_id"])
        if err:
            # Invalid code — proceed without discount, show error in success page
            pass
        else:
            discount_pct     = pct
            discount_code_id = code_id

    url, err = stripe_checkout.create_checkout_session(
        user["user_id"], user["email"], product,
        discount_pct=discount_pct,
        discount_code_id=discount_code_id,
        referral_code=referral_code or None,
    )
    if err:
        return Response(
            f"<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2>Checkout Error</h2><p>{err}</p>"
            f"<p><a href='/pricing'>← Back to Pricing</a></p></body></html>",
            mimetype="text/html"
        )
    return redirect(url)


@app.route("/checkout/success")
def checkout_success():
    """Landing page after successful Stripe payment."""
    user = get_current_user()
    access = auth.get_user_access(user["user_id"]) if user else []
    has_navigator = any(p in ["navigator", "bundle"] for p in access)
    has_wizard    = any(p in ["wizard", "bundle"] for p in access)

    html = """<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Payment Successful</title>
<style>
  body{font-family:Georgia,serif;background:#f8f6f1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#fff;border-radius:16px;border:1px solid #e8e4dc;padding:48px 40px;max-width:520px;text-align:center}
  h2{color:#1a2d5a;margin-bottom:8px}
  p{color:#666;margin-bottom:20px;line-height:1.6}
  .btn{display:inline-block;padding:13px 26px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:8px;font-family:Georgia,serif;font-weight:bold;font-size:15px;text-decoration:none;margin:6px}
  .btn-sec{background:transparent;color:#1a2d5a;border-color:#e8e4dc}
</style></head><body><div class="box">
  <div style="font-size:56px;margin-bottom:16px">✅</div>
  <h2>Payment Successful!</h2>
  <p>Your 7-day access is now active. You can close this tab and return anytime — your account will remember you.</p>
  <div>"""

    if has_navigator:
        html += '<a href="/navigator" class="btn">Open IRS Pilot →</a>'
    if has_wizard:
        html += '<a href="/wizard" class="btn">Open Financial Wizard →</a>'

    html += """
  </div>
  <p style="margin-top:24px;font-size:13px">Need help? <a href="https://www.calendly.com/taylor-tax-financial/tax-help" style="color:#1a2d5a">Schedule a consultation</a></p>
</div></body></html>"""
    return Response(html, mimetype="text/html")


@app.route("/stripe/webhook", methods=["POST"])
def stripe_webhook():
    """Receive and process Stripe webhook events."""
    payload    = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")
    success, msg = stripe_checkout.handle_webhook(payload, sig_header)
    if not success:
        app.logger.error(f"Webhook error: {msg}")
        return jsonify({"error": msg}), 400

    # Also handle subscription lifecycle events
    try:
        import stripe as _stripe
        _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        event = _stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)

        if event["type"] == "customer.subscription.deleted":
            sub           = event["data"]["object"]
            stripe_sub_id = sub["id"]
            try:
                with auth.get_db() as conn:
                    row = conn.execute(
                        "SELECT ps.id, u.email, ps.firm_name FROM pro_subscribers ps "
                        "JOIN users u ON ps.user_id = u.id "
                        "WHERE ps.stripe_sub_id = ?", (stripe_sub_id,)
                    ).fetchone()
                    conn.execute(
                        "UPDATE pro_subscribers SET active = 0 WHERE stripe_sub_id = ?",
                        (stripe_sub_id,)
                    )
                if row:
                    try:
                        email_service.notify_pro_subscription_cancelled(
                            row["email"], row["firm_name"]
                        )
                    except Exception:
                        pass
            except Exception as e:
                app.logger.error(f"Subscription deletion error: {e}")
            app.logger.info(f"Pro subscription deactivated: {stripe_sub_id}")

        elif event["type"] == "invoice.payment_failed":
            invoice    = event["data"]["object"]
            stripe_sub = invoice.get("subscription", "")
            try:
                with auth.get_db() as conn:
                    row = conn.execute(
                        "SELECT ps.id, u.email, ps.firm_name FROM pro_subscribers ps "
                        "JOIN users u ON ps.user_id = u.id "
                        "WHERE ps.stripe_sub_id = ?", (stripe_sub,)
                    ).fetchone()
                if row:
                    email_service.notify_pro_payment_failed(row["email"], row["firm_name"])
                    app.logger.warning(f"Pro payment failed: {row['email']}")
            except Exception as e:
                app.logger.error(f"Payment failed handler error: {e}")

        elif event["type"] == "invoice.payment_succeeded":
            invoice    = event["data"]["object"]
            stripe_sub = invoice.get("subscription", "")
            amount     = invoice.get("amount_paid", 0)
            try:
                with auth.get_db() as conn:
                    row = conn.execute(
                        "SELECT ps.id, u.email, ps.firm_name FROM pro_subscribers ps "
                        "JOIN users u ON ps.user_id = u.id "
                        "WHERE ps.stripe_sub_id = ?", (stripe_sub,)
                    ).fetchone()
                    if row:
                        conn.execute(
                            "UPDATE pro_subscribers SET active = 1 WHERE id = ?",
                            (row["id"],)
                        )
                        email_service.notify_pro_payment_succeeded(
                            row["email"], row["firm_name"], amount
                        )
            except Exception as e:
                app.logger.error(f"Payment succeeded handler error: {e}")

    except Exception as e:
        app.logger.error(f"Subscription webhook error: {e}")

    return jsonify({"status": "ok"})



@app.route("/js/<filename>")
def serve_js(filename):
    """Serve pre-compiled JS files from the root directory."""
    js_path = BASE_DIR / filename
    if not js_path.exists() or not filename.endswith('.js'):
        return "Not found", 404
    return Response(js_path.read_text(encoding="utf-8"), mimetype="application/javascript")



@app.route("/")
def home_page():
    """Home page — always free, no login required."""
    html = build_page("irs-selfhelp-app.js", "IRSApp", "IRS Pilot — Taxpayer Self-Help")
    return Response(html, mimetype="text/html")


@app.route("/navigator")
def navigator():
    """Full IRS Pilot — requires navigator/bundle access, pro session, or valid preview."""
    # Check preview session first
    preview_cookie = request.cookies.get("preview_session", "")
    if preview_cookie and ":" in preview_cookie:
        token, _ = preview_cookie.split(":", 1)
        if auth.get_preview_code(token):
            html = build_page("irs-selfhelp-app.js", "IRSApp", "IRS Pilot — Preview")
            return Response(html, mimetype="text/html")
        else:
            resp = make_response(redirect("/pricing"))
            resp.delete_cookie("preview_session")
            return resp

    sub, _ = get_pro_context()
    if not sub:
        user = get_current_user()
        if not user or not auth.has_access(user["user_id"], "navigator"):
            return redirect("/login?product=navigator")
    html = build_page("irs-selfhelp-app.js", "IRSApp", "IRS Pilot — Taxpayer Self-Help")
    return Response(html, mimetype="text/html")


@app.route("/wizard")
def wizard():
    """Financial Wizard — requires wizard/bundle access, pro session, or valid partner preview."""
    # Demo codes are read-only — no wizard access
    preview_cookie = request.cookies.get("preview_session", "")
    if preview_cookie and ":" in preview_cookie:
        token, code_type = preview_cookie.split(":", 1)
        if auth.get_preview_code(token):
            if code_type == "partner":
                # Partner preview gets full wizard access
                pass
            else:
                # Demo preview — no wizard, redirect to navigator
                return redirect("/navigator")
        else:
            resp = make_response(redirect("/pricing"))
            resp.delete_cookie("preview_session")
            return resp

    sub, _ = get_pro_context()
    if not sub:
        user = get_current_user()
        if not user or not auth.has_access(user["user_id"], "wizard"):
            return redirect("/login?product=wizard")
        if auth.is_wizard_locked(user["user_id"]):
            return redirect("/wizard-locked")
    """Financial intake wizard — 9-step form + PDF generation."""
    html = build_page(
        "irs-intake-wizard.js",
        "IRSIntakeWizard",
        "IRS Financial Intake Wizard"
    )
    return Response(html, mimetype="text/html")


@app.route("/planning")
def planning():
    """Tax Planning Dashboard — requires bundle access only."""
    user = get_current_user()
    if not user:
        return redirect("/login?next=/planning")
    if not auth.has_access(user["user_id"], "bundle"):
        return redirect("/pricing?feature=planning")
    html = build_page("planning_dashboard.js", "PlanningDashboard", "Tax Planning — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/pricing")
def pricing():
    """Pricing page."""
    html = build_page(
        "pricing_page.js",
        "PricingPage",
        "IRS Pilot — Pricing"
    )
    return Response(html, mimetype="text/html")


@app.route("/account")
def account_dashboard():
    """Account dashboard — redirects to login if not authenticated."""
    html = build_page("dashboard_page.js", "DashboardPage", "My Account — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/forgot-password")
def forgot_password_page():
    html = build_page("reset_page.js", "ResetPage", "Forgot Password — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/reset-password")
def reset_password_page():
    html = build_page("reset_page.js", "ResetPage", "Reset Password — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/api/forgot-password", methods=["POST"])
def api_forgot_password():
    data  = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400
    # Always return success to avoid email enumeration
    with auth.get_db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if row:
        token = email_service.create_reset_token(row["id"])
        email_service.send_reset_email(email, token)
    return jsonify({"message": "If an account exists for that email, a reset link is on its way."})


@app.route("/api/reset-password", methods=["POST"])
def api_reset_password():
    data     = request.get_json(force=True, silent=True) or {}
    token    = data.get("token", "")
    password = data.get("password", "")
    if not token or not password:
        return jsonify({"error": "Invalid request."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    user_id = email_service.verify_reset_token(token)
    if not user_id:
        return jsonify({"error": "This reset link has expired or already been used."}), 400
    new_hash = auth.hash_password(password)
    with auth.get_db() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
    email_service.consume_reset_token(token)
    return jsonify({"message": "Password updated successfully."})



# ── Admin routes ───────────────────────────────────────────────────────────────

@app.route("/admin")
@require_admin
def admin_panel():
    html = build_page("admin_page.js", "AdminPage", "Admin — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/api/admin/data")
@require_admin
def api_admin_data():
    PRODUCT_PRICES = {"navigator": 59, "wizard": 99, "bundle": 129}

    with auth.get_db() as conn:
        users = conn.execute(
            "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()

        # All purchases — include wizard_locked and lock reason
        purchases = conn.execute(
            "SELECT id, user_id, product, expires_at, created_at, "
            "wizard_locked, wizard_lock_reason, stripe_session_id "
            "FROM purchases ORDER BY created_at DESC"
        ).fetchall()

        # Referral partners
        partners = conn.execute(
            "SELECT user_id FROM referral_partners WHERE active = 1"
        ).fetchall()
        partner_user_ids = {r["user_id"] for r in partners}

        # Pro subscribers
        pro_subs = conn.execute(
            "SELECT user_id, firm_name FROM pro_subscribers WHERE active = 1"
        ).fetchall()
        pro_user_ids = {r["user_id"]: r["firm_name"] for r in pro_subs}

        # Referral conversions — to track which users came via referral
        conversions = conn.execute(
            "SELECT referred_user_id FROM referral_conversions"
        ).fetchall()
        referred_user_ids = {r["referred_user_id"] for r in conversions}

    # Build purchase map with amounts
    purchase_map = {}
    for p in purchases:
        uid = p["user_id"]
        if uid not in purchase_map:
            purchase_map[uid] = []
        purchase_map[uid].append({
            "id":                p["id"],
            "product":           p["product"],
            "expires_at":        p["expires_at"],
            "created_at":        p["created_at"],
            "wizard_locked":     p["wizard_locked"],
            "wizard_lock_reason": p["wizard_lock_reason"],
            "amount":            PRODUCT_PRICES.get(p["product"], 0),
            "active":            p["expires_at"] > __import__("datetime").datetime.utcnow().isoformat(),
        })

    user_list = []
    for u in users:
        uid = u["id"]
        user_purchases = purchase_map.get(uid, [])
        total_spent    = sum(p["amount"] for p in user_purchases)

        # Determine customer type
        types = []
        if uid in pro_user_ids:
            types.append(f"Pro Subscriber ({pro_user_ids[uid]})")
        if uid in partner_user_ids:
            types.append("Referral Partner")
        if uid in referred_user_ids:
            types.append("Referred Customer")
        if user_purchases and not types:
            types.append("Direct Customer")
        if not user_purchases and not types:
            types.append("Free Account")

        user_list.append({
            "id":           uid,
            "email":        u["email"],
            "created_at":   u["created_at"],
            "purchases":    user_purchases,
            "total_spent":  total_spent,
            "customer_type": types,
        })

    active_purchases = [p for ps in purchase_map.values() for p in ps if p["active"]]
    nav_count = sum(1 for p in active_purchases if p["product"] in ("navigator", "bundle"))
    wiz_count = sum(1 for p in active_purchases if p["product"] in ("wizard", "bundle"))
    # Exclude admin account from revenue totals
    admin_emails = [e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
    admin_emails.append("tjtaylor@taylortaxandfinancial.com")
    total_revenue = sum(
        u["total_spent"] for u in user_list
        if u["email"].lower() not in admin_emails
    )

    # Filter admin accounts out of the user list display
    admin_emails_set = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
    admin_emails_set.add("tjtaylor@taylortaxandfinancial.com")
    display_users = [u for u in user_list if u["email"].lower() not in admin_emails_set]

    return jsonify({
        "users": display_users,
        "stats": {
            "total_users":      len(users) - len(admin_emails_set),
            "active_purchases": len(active_purchases),
            "navigator_count":  nav_count,
            "wizard_count":     wiz_count,
            "total_revenue":    total_revenue,
        }
    })


@app.route("/api/admin/grant", methods=["POST"])
@require_admin
def api_admin_grant():
    data    = request.get_json(force=True, silent=True) or {}
    email   = data.get("email", "").strip().lower()
    product = data.get("product", "")
    if not email or product not in ("navigator", "wizard", "bundle"):
        return jsonify({"error": "Email and valid product required."}), 400
    with auth.get_db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        return jsonify({"error": f"No account found for {email}."}), 404
    expires = auth.grant_access(row["id"], product, "admin_grant")
    if product == "bundle":
        auth.grant_access(row["id"], "navigator", "admin_grant")
        auth.grant_access(row["id"], "wizard",    "admin_grant")
    return jsonify({"message": f"Access granted.", "expires": expires})


@app.route("/api/admin/revoke", methods=["POST"])
@require_admin
def api_admin_revoke():
    data        = request.get_json(force=True, silent=True) or {}
    purchase_id = data.get("purchase_id")
    if not purchase_id:
        return jsonify({"error": "purchase_id required."}), 400
    with auth.get_db() as conn:
        conn.execute(
            "UPDATE purchases SET expires_at = datetime('now') WHERE id = ?",
            (purchase_id,)
        )
    return jsonify({"message": "Access revoked."})


# ── Letter generator ───────────────────────────────────────────────────────────

@app.route("/letters")
@require_access("navigator")
def letter_generator():
    html = build_page("letter_generator.js", "LetterGenerator", "Letter Generator — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/api/generate-letter", methods=["POST"])
@require_access("navigator")
def api_generate_letter():
    """Generate an IRS letter using Claude API server-side."""
    import urllib.request, urllib.error, json as json_lib

    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "Letter generation not configured."}), 500

    data        = request.get_json(force=True, silent=True) or {}
    letter_type  = data.get("letterType", "")
    letter_label = data.get("letterLabel", letter_type)
    form_data    = data.get("formData", {})
    field_labels = data.get("fieldLabels", {})

    today = __import__("datetime").date.today().strftime("%B %d, %Y")
    fields_text = "\n".join(f"{field_labels.get(k, k)}: {v}" for k, v in form_data.items() if v)

    prompt = f"""You are a professional IRS Enrolled Agent writing a formal letter on behalf of a taxpayer.
Write a complete, professional letter to the IRS based on the following information.

Letter Type: {letter_label}
Taxpayer Information:
{fields_text}

SOURCE RESTRICTIONS — STRICTLY ENFORCED:
- Base ALL legal citations, procedures, deadlines, and rights EXCLUSIVELY on verified IRS sources:
  * Internal Revenue Code (IRC) as published
  * Internal Revenue Manual (IRM) — irs.gov/irm
  * Official IRS publications, forms, and instructions — irs.gov
  * IRS notices, revenue rulings, and revenue procedures as published on irs.gov
  * Treasury Regulations (26 CFR)
- Do NOT cite court cases, tax treatises, legal blogs, or any non-IRS source
- Do NOT invent, estimate, or generalize any IRC section, IRM citation, deadline, or procedure
- If you are uncertain of an exact citation, write the legal concept in plain language WITHOUT a citation rather than guessing
- All stated taxpayer rights, deadlines, and appeal procedures must be grounded exclusively in the IRS sources listed above

LETTER INSTRUCTIONS:
- Use standard formal letter format: date, taxpayer address block, IRS address block, RE: line, salutation, body paragraphs, closing, signature line
- Be concise, factual, and professional
- Cite IRC sections or IRM procedures only when you are certain of the citation from IRS sources
- Include a clear specific request or proposed action
- Today's date: {today}
- IRS address block: Internal Revenue Service / [Appropriate IRS Campus]
- Sign off as the taxpayer (use name from form data)
- Do not add disclaimers or notes outside the letter itself"""

    payload = json_lib.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key":         ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type":      "application/json",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json_lib.loads(resp.read().decode())
            letter = "".join(b.get("text", "") for b in result.get("content", []))
            return jsonify({"letter": letter})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        app.logger.error(f"Anthropic API error: {e.code} {body}")
        return jsonify({"error": f"API error {e.code}: {body}"}), 500
    except Exception as e:
        app.logger.error(f"Letter generation error: {e}")
        return jsonify({"error": "Letter generation failed. Please try again."}), 500


@app.route("/debug/env")
@require_admin
def debug_env():
    """Admin only — check environment variables are loaded."""
    import os
    return jsonify({
        "ANTHROPIC_API_KEY": "SET" if os.environ.get("ANTHROPIC_API_KEY") else "MISSING",
        "STRIPE_SECRET_KEY": "SET" if os.environ.get("STRIPE_SECRET_KEY") else "MISSING",
        "SENDGRID_API_KEY":  "SET" if os.environ.get("SENDGRID_API_KEY") else "MISSING",
        "SECRET_KEY":        "SET" if os.environ.get("SECRET_KEY") else "MISSING",
        "DB_PATH":           os.environ.get("DB_PATH", "not set"),
    })


# ── Discount code routes ───────────────────────────────────────────────────────

@app.route("/api/validate-discount", methods=["POST"])
def api_validate_discount():
    """Validate a discount code and return the discount percentage."""
    data    = request.get_json(force=True, silent=True) or {}
    code    = data.get("code", "").strip()
    product = data.get("product", "")
    user    = get_current_user()
    user_id = user["user_id"] if user else 0

    if not code:
        return jsonify({"error": "Please enter a discount code."}), 400

    pct, code_id, err = auth.validate_discount_code(code, user_id)
    if err:
        return jsonify({"error": err}), 400

    PRODUCT_AMOUNTS = {"navigator": 5900, "wizard": 9900, "bundle": 12900}
    base  = PRODUCT_AMOUNTS.get(product, 5900)
    final = int(base * (100 - pct) / 100)

    return jsonify({
        "valid":        True,
        "discount_pct": pct,
        "code_id":      code_id,
        "original":     base / 100,
        "discounted":   final / 100,
        "savings":      (base - final) / 100,
    })


@app.route("/api/admin/discounts", methods=["GET"])
@require_admin
def api_admin_discounts():
    """List all discount codes."""
    with auth.get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM discount_codes ORDER BY created_at DESC"
        ).fetchall()
    return jsonify({"codes": [dict(r) for r in rows]})


@app.route("/api/admin/discounts/create", methods=["POST"])
@require_admin
def api_admin_create_discount():
    """Create a new discount code."""
    data         = request.get_json(force=True, silent=True) or {}
    code         = data.get("code", "").strip()
    discount_pct = int(data.get("discount_pct", 0))
    expires_at   = data.get("expires_at") or None
    max_uses     = data.get("max_uses") or None

    if not code or not (1 <= discount_pct <= 100):
        return jsonify({"error": "Code and discount % (1-100) are required."}), 400

    code_id, err = auth.create_discount_code(code, discount_pct, expires_at, max_uses)
    if err:
        return jsonify({"error": err}), 400
    return jsonify({"message": f"Code {code.upper()} created.", "id": code_id})


@app.route("/api/admin/discounts/deactivate", methods=["POST"])
@require_admin
def api_admin_deactivate_discount():
    """Deactivate a discount code."""
    data = request.get_json(force=True, silent=True) or {}
    cid  = data.get("id")
    with auth.get_db() as conn:
        conn.execute("UPDATE discount_codes SET active = 0 WHERE id = ?", (cid,))
    return jsonify({"message": "Code deactivated."})


# ── Referral partner routes ────────────────────────────────────────────────────

@app.route("/api/referral/join", methods=["POST"])
def api_referral_join():
    """Sign up as a referral partner."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "You must be logged in to join."}), 401

    # Check if already a partner
    existing = auth.get_referral_partner_by_user(user["user_id"])
    if existing:
        return jsonify({"code": existing["code"], "already": True})

    partner_id, code, err = auth.create_referral_partner(user["user_id"])
    if err:
        return jsonify({"error": err}), 500

    # Send welcome email with referral link
    BASE = request.host_url.rstrip("/")
    referral_link = f"{BASE}/refer/{code}"
    try:
        email_service.notify_referral_welcome(user["email"], code, referral_link)
    except Exception:
        pass

    # Notify Tyrone
    try:
        email_service.notify_new_referral_partner(user["email"], code, referral_link)
    except Exception:
        pass

    return jsonify({"code": code, "message": "You're now a referral partner!"})


@app.route("/api/referral/me")
def api_referral_me():
    """Get current user's referral partner info and stats."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    partner = auth.get_referral_partner_by_user(user["user_id"])
    if not partner:
        return jsonify({"partner": None})
    stats = auth.get_partner_stats(partner["id"])
    return jsonify({"partner": dict(partner), "stats": stats})


@app.route("/api/admin/referrals")
@require_admin
def api_admin_referrals():
    """List all referral partners and their stats."""
    with auth.get_db() as conn:
        partners = conn.execute(
            "SELECT rp.*, u.email, "
            "(SELECT COUNT(*) FROM referral_conversions rc WHERE rc.partner_id = rp.id) as conversions, "
            "(SELECT COALESCE(SUM(commission_amount),0) FROM referral_conversions rc WHERE rc.partner_id = rp.id) as total_commission, "
            "(SELECT COALESCE(SUM(commission_amount),0) FROM referral_conversions rc WHERE rc.partner_id = rp.id AND rc.paid_out = 0) as unpaid "
            "FROM referral_partners rp JOIN users u ON u.id = rp.user_id "
            "ORDER BY rp.created_at DESC"
        ).fetchall()
    return jsonify({"partners": [dict(p) for p in partners]})


@app.route("/api/admin/referrals/mark-paid", methods=["POST"])
@require_admin
def api_admin_mark_paid():
    """Mark referral commissions as paid out."""
    data       = request.get_json(force=True, silent=True) or {}
    partner_id = data.get("partner_id")
    with auth.get_db() as conn:
        conn.execute(
            "UPDATE referral_conversions SET paid_out = 1 WHERE partner_id = ? AND paid_out = 0",
            (partner_id,)
        )
    return jsonify({"message": "Marked as paid."})


@app.route("/refer/<code>")
def referral_landing(code):
    """Landing page for referral links — sets cookie then redirects to pricing."""
    resp = make_response(redirect("/pricing"))
    resp.set_cookie("ref_code", code.upper(), max_age=60*60*24*30, samesite="Lax")
    return resp


@app.route("/referral")
def referral_page():
    html = build_page("referral_page.js", "ReferralPage", "Referral Program — IRS Pilot")
    return Response(html, mimetype="text/html")


# ── Pro subscriber routes ──────────────────────────────────────────────────────

PRO_SESSION_COOKIE = "pro_session"

def get_pro_context():
    """Return (subscriber, session) from pro session cookie, or (None, None)."""
    token = request.cookies.get(PRO_SESSION_COOKIE)
    return auth.get_pro_session(token)


@app.route("/pro/<code>")
def pro_landing(code):
    """
    Pro subscriber shareable link landing page.
    Creates a 24-hour client session and redirects to the navigator.
    """
    sub = auth.get_pro_subscriber_by_code(code)
    if not sub:
        return redirect("/")

    token, err = auth.create_pro_session(sub["id"])
    if err:
        return Response(
            f"<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2>Access Unavailable</h2><p>{err}</p>"
            f"<p>Please contact the tax professional who sent you this link.</p>"
            f"</body></html>",
            mimetype="text/html"
        )

    resp = make_response(redirect("/navigator"))
    resp.set_cookie(PRO_SESSION_COOKIE, token, max_age=60*60*24, httponly=True, samesite="Lax")
    return resp


@app.route("/api/pro/context")
def api_pro_context():
    """Return the current pro subscriber branding context."""
    sub, session = get_pro_context()
    if not sub:
        return jsonify({"isPro": False})
    return jsonify({
        "isPro":        True,
        "firmName":     sub["firm_name"],
        "contactName":  sub["contact_name"],
        "contactPhone": sub["contact_phone"] or "",
        "calendlyUrl":  sub["calendly_url"] or "https://www.calendly.com/taylor-tax-financial/tax-help",
    })


@app.route("/api/admin/pro/subscribers")
@require_admin
def api_admin_pro_list():
    """List all pro subscribers."""
    subs = auth.list_pro_subscribers()
    return jsonify({"subscribers": [dict(s) for s in subs]})


@app.route("/api/admin/pro/create", methods=["POST"])
@require_admin
def api_admin_pro_create():
    """Create a new pro subscriber."""
    data         = request.get_json(force=True, silent=True) or {}
    email        = data.get("email", "").strip().lower()
    firm_name    = data.get("firm_name", "").strip()
    contact_name = data.get("contact_name", "").strip()
    contact_phone = data.get("contact_phone", "").strip()
    calendly_url  = data.get("calendly_url", "").strip()

    if not email or not firm_name or not contact_name:
        return jsonify({"error": "Email, firm name, and contact name are required."}), 400

    # Get or create user
    with auth.get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        # Create account with random password — they can reset via email
        import secrets
        temp_pw = secrets.token_urlsafe(16)
        user_id, err = auth.create_user(email, temp_pw)
        if err:
            return jsonify({"error": err}), 400
    else:
        user_id = user["id"]

    # Check not already a subscriber
    existing = auth.get_pro_subscriber_by_user(user_id)
    if existing:
        return jsonify({"error": f"{email} is already a pro subscriber."}), 400

    sub_id, access_code, err = auth.create_pro_subscriber(
        user_id, firm_name, contact_name, contact_phone, calendly_url
    )
    if err:
        return jsonify({"error": err}), 500

    BASE = request.host_url.rstrip("/")

    # Auto-create Stripe subscription and payment link
    payment_url  = None
    customer_id  = None
    stripe_sub_id = None
    try:
        stripe_sub_id, payment_url, customer_id, stripe_err =             stripe_checkout.create_pro_subscription_direct(
                user_id, email, sub_id, firm_name
            )
        if stripe_err:
            app.logger.warning(f"Stripe subscription error: {stripe_err}")
        elif customer_id:
            with auth.get_db() as conn:
                conn.execute(
                    "UPDATE pro_subscribers SET stripe_sub_id = ?, stripe_customer_id = ? WHERE id = ?",
                    (stripe_sub_id, customer_id, sub_id)
                )
    except Exception as e:
        app.logger.error(f"Stripe setup error: {e}")

    # Notify Tyrone of new pro subscriber
    try:
        email_service.notify_new_pro_subscriber(email, firm_name, payment_url)
    except Exception:
        pass

    return jsonify({
        "message":        f"Pro subscriber created for {email}.",
        "access_code":    access_code,
        "shareable_link": f"{BASE}/pro/{access_code}",
        "payment_link":   payment_url,
    })


@app.route("/api/admin/pro/update", methods=["POST"])
@require_admin
def api_admin_pro_update():
    """Update pro subscriber branding."""
    data = request.get_json(force=True, silent=True) or {}
    sid  = data.get("id")
    if not sid:
        return jsonify({"error": "id required."}), 400
    auth.update_pro_subscriber(
        sid,
        data.get("firm_name", ""),
        data.get("contact_name", ""),
        data.get("contact_phone", ""),
        data.get("calendly_url", ""),
    )
    return jsonify({"message": "Updated."})


@app.route("/api/admin/pro/deactivate", methods=["POST"])
@require_admin
def api_admin_pro_deactivate():
    """Deactivate a pro subscriber."""
    data = request.get_json(force=True, silent=True) or {}
    sid  = data.get("id")
    with auth.get_db() as conn:
        conn.execute("UPDATE pro_subscribers SET active = 0 WHERE id = ?", (sid,))
    return jsonify({"message": "Deactivated."})


@app.route("/api/admin/pro/reset-sessions", methods=["POST"])
@require_admin
def api_admin_pro_reset_sessions():
    """Manually reset session count for a subscriber."""
    data = request.get_json(force=True, silent=True) or {}
    sid  = data.get("id")
    with auth.get_db() as conn:
        conn.execute("UPDATE pro_subscribers SET sessions_used = 0 WHERE id = ?", (sid,))
    return jsonify({"message": "Sessions reset."})


# ── Pro subscription billing routes ───────────────────────────────────────────

@app.route("/pro-subscribe/<int:subscriber_id>")
@require_admin
def pro_subscribe_checkout(subscriber_id):
    """Admin initiates Stripe subscription for a pro subscriber."""
    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT ps.*, u.email FROM pro_subscribers ps "
            "JOIN users u ON u.id = ps.user_id WHERE ps.id = ?",
            (subscriber_id,)
        ).fetchone()
    if not sub:
        return jsonify({"error": "Subscriber not found."}), 404

    url, err = stripe_checkout.create_pro_subscription_checkout(
        sub["user_id"], sub["email"], subscriber_id
    )
    if err:
        return Response(
            f"<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2>Checkout Error</h2><p>{err}</p></body></html>",
            mimetype="text/html"
        )
    return redirect(url)


@app.route("/pro-subscribe/success")
def pro_subscribe_success():
    """Landing page after successful pro subscription checkout."""
    session_id = request.args.get("session_id", "")
    html = """<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Subscription Active</title>
<style>body{font-family:Georgia,serif;background:#f8f6f1;display:flex;align-items:center;
justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;border-radius:16px;border:1px solid #e8e4dc;padding:48px 40px;
max-width:520px;text-align:center}
h2{color:#1a2d5a;margin-bottom:8px}p{color:#666;line-height:1.6;margin-bottom:20px}
.btn{display:inline-block;padding:12px 24px;background:#1a2d5a;color:#7ec11f;
border:2px solid #7ec11f;border-radius:8px;font-family:Georgia,serif;font-weight:bold;
font-size:14px;text-decoration:none}</style>
</head><body><div class="box">
<div style="font-size:48px;margin-bottom:16px">✅</div>
<h2>Pro Subscription Active!</h2>
<p>The subscription has been activated. The first 3 months will be billed at $49/month,
then $79/month automatically.<br><br>
Return to the admin panel to view and manage this subscriber.</p>
<a href="/admin" class="btn">← Back to Admin</a>
</div></body></html>"""
    # Activate the subscriber if session_id provided
    if session_id:
        try:
            import stripe as _stripe
            _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
            session = _stripe.checkout.Session.retrieve(session_id)
            sub_id = int(session.metadata.get("subscriber_id", 0))
            stripe_sub_id = session.subscription
            if sub_id and stripe_sub_id:
                with auth.get_db() as conn:
                    conn.execute(
                        "UPDATE pro_subscribers SET stripe_sub_id = ?, active = 1 WHERE id = ?",
                        (stripe_sub_id, sub_id)
                    )
                # Schedule price upgrade after 3 months
                stripe_checkout.schedule_price_upgrade(stripe_sub_id)
        except Exception as e:
            app.logger.error(f"Pro subscription activation error: {e}")
    return Response(html, mimetype="text/html")


@app.route("/api/admin/pro/charge-overage", methods=["POST"])
@require_admin
def api_admin_pro_charge_overage():
    """Charge a pro subscriber for overage sessions."""
    data           = request.get_json(force=True, silent=True) or {}
    subscriber_id  = data.get("id")
    extra_sessions = int(data.get("extra_sessions", 1))

    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT ps.*, u.email FROM pro_subscribers ps "
            "JOIN users u ON u.id = ps.user_id WHERE ps.id = ?",
            (subscriber_id,)
        ).fetchone()
    if not sub:
        return jsonify({"error": "Subscriber not found."}), 404

    charge_id, err = stripe_checkout.charge_pro_overage(
        subscriber_id, sub["email"], extra_sessions
    )
    if err:
        return jsonify({"error": err}), 500
    return jsonify({
        "message": f"Charged ${extra_sessions * 5:.2f} for {extra_sessions} overage session(s).",
        "charge_id": charge_id,
    })


@app.route("/api/admin/pro/send-subscription-link", methods=["POST"])
@require_admin
def api_admin_pro_send_subscription_link():
    """Return the Stripe checkout URL for a pro subscriber to set up billing."""
    data          = request.get_json(force=True, silent=True) or {}
    subscriber_id = data.get("id")

    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT ps.*, u.email FROM pro_subscribers ps "
            "JOIN users u ON u.id = ps.user_id WHERE ps.id = ?",
            (subscriber_id,)
        ).fetchone()
    if not sub:
        return jsonify({"error": "Subscriber not found."}), 404

    url, err = stripe_checkout.create_pro_subscription_checkout(
        sub["user_id"], sub["email"], subscriber_id
    )
    if err:
        return jsonify({"error": err}), 500
    return jsonify({"checkout_url": url})


# ── Tax Pro page & interest form ──────────────────────────────────────────────

@app.route("/tax-professionals")
def tax_professionals():
    html = build_page("taxpro_page.js", "TaxProPage", "Tax Professionals — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/api/taxpro/interest", methods=["POST"])
def api_taxpro_interest():
    """Record a tax pro interest form submission."""
    data = request.get_json(force=True, silent=True) or {}
    name       = data.get("name", "").strip()
    email      = data.get("email", "").strip()
    firm       = data.get("firm", "").strip()
    credential = data.get("credential", "").strip()
    phone      = data.get("phone", "").strip()
    website    = data.get("website", "").strip()
    message    = data.get("message", "").strip()
    program    = data.get("program", "").strip()

    if not name or not email or not program:
        return jsonify({"error": "Name, email, and program selection are required."}), 400

    # Store in database
    with auth.get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS taxpro_interests (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT, firm TEXT, credential TEXT,
                email      TEXT, phone TEXT, website TEXT,
                program    TEXT, message TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute(
            "INSERT INTO taxpro_interests (name, firm, credential, email, phone, website, program, message) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (name, firm, credential, email, phone, website, program, message)
        )

    app.logger.info(f"Tax pro interest: {name} <{email}> — {program}")
    # Send notification email
    try:
        email_service.notify_taxpro_interest(name, email, firm, credential, phone, program, message)
    except Exception:
        pass
    return jsonify({"message": "Interest recorded."})


@app.route("/api/admin/taxpro/interests")
@require_admin
def api_admin_taxpro_interests():
    """List all tax pro interest form submissions."""
    with auth.get_db() as conn:
        try:
            rows = conn.execute(
                "SELECT * FROM taxpro_interests ORDER BY created_at DESC"
            ).fetchall()
        except Exception:
            rows = []
    return jsonify({"interests": [dict(r) for r in rows]})


# ── Reseller routes ────────────────────────────────────────────────────────────

RESELLER_MIN_MARKUP = 1.50
BASE_PRICES = {"navigator": 5900, "wizard": 9900, "bundle": 12900}

@app.route("/pro/checkout/<code>/<product>")
def pro_reseller_checkout(code, product):
    """
    Reseller checkout page — client pays the tax pro's price via Stripe.
    Uses IRS Pilot's Stripe account, splits revenue with pro subscriber.
    """
    sub = auth.get_pro_subscriber_by_code(code)
    if not sub or not sub["reseller_mode"] or product not in BASE_PRICES:
        return redirect("/pricing")

    price_map = {
        "navigator": sub["reseller_navigator_price"],
        "wizard":    sub["reseller_wizard_price"],
        "bundle":    sub["reseller_bundle_price"],
    }
    price_cents = price_map.get(product, 0)
    if price_cents == 0:
        return redirect("/pricing")

    import stripe as _stripe
    _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")

    product_names = {
        "navigator": "IRS Pilot Navigator — 7-Day Access",
        "wizard":    "IRS Pilot Financial Intake Wizard — 7-Day Access",
        "bundle":    "IRS Pilot Complete Bundle — 7-Day Access",
    }

    try:
        session = _stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": price_cents,
                    "product_data": {
                        "name": f"{product_names[product]} — via {sub['firm_name']}",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{request.host_url}pro/client-access/{code}/{product}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{request.host_url}",
            metadata={
                "type":          "pro_reseller",
                "subscriber_id": str(sub["id"]),
                "product":       product,
                "access_code":   code,
            },
        )
        return redirect(session.url)
    except Exception as e:
        app.logger.error(f"Reseller checkout error: {e}")
        return redirect("/pricing")


@app.route("/pro/client-access/<code>/<product>")
def pro_client_access(code, product):
    """
    After reseller payment — create pro session and redirect to tool.
    """
    sub = auth.get_pro_subscriber_by_code(code)
    if not sub:
        return redirect("/")

    # Verify payment
    session_id = request.args.get("session_id", "")
    if session_id:
        try:
            import stripe as _stripe
            _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
            stripe_session = _stripe.checkout.Session.retrieve(session_id)
            if stripe_session.payment_status != "paid":
                return redirect("/")
        except Exception:
            return redirect("/")

    token, err = auth.create_pro_session(sub["id"])
    if err:
        return Response(
            f"<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2>Access Unavailable</h2><p>{err}</p></body></html>",
            mimetype="text/html"
        )

    resp = make_response(redirect("/navigator" if product != "wizard" else "/wizard"))
    resp.set_cookie(PRO_SESSION_COOKIE, token, max_age=60*60*24, httponly=True, samesite="Lax")
    return resp


@app.route("/pro/link/<token>")
def pro_client_link_access(token):
    """
    Single-use client access link — grants pro session without payment.
    Used when tax pro collects payment outside IRS Pilot.
    """
    link = auth.get_client_link(token)
    if not link:
        return Response(
            "<html><body style='font-family:sans-serif;padding:40px'>"
            "<h2>Link Expired or Already Used</h2>"
            "<p>This access link has already been used or has expired. "
            "Please contact the tax professional who sent you this link.</p>"
            "</body></html>",
            mimetype="text/html"
        )

    sub = auth.get_pro_subscriber_by_code(None)
    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT * FROM pro_subscribers WHERE id = ? AND active = 1",
            (link["subscriber_id"],)
        ).fetchone()

    if not sub:
        return redirect("/")

    auth.consume_client_link(token)
    session_token, err = auth.create_pro_session(sub["id"])
    if err:
        return redirect("/")

    product = link["product"]
    resp = make_response(redirect("/navigator" if product != "wizard" else "/wizard"))
    resp.set_cookie(PRO_SESSION_COOKIE, session_token, max_age=60*60*24, httponly=True, samesite="Lax")
    return resp


@app.route("/api/admin/pro/update-reseller", methods=["POST"])
@require_admin
def api_admin_pro_update_reseller():
    """Update reseller pricing settings for a pro subscriber."""
    data          = request.get_json(force=True, silent=True) or {}
    sid           = data.get("id")
    reseller_mode = data.get("reseller_mode", False)
    nav_price     = int(data.get("navigator_price", 0) * 100)
    wiz_price     = int(data.get("wizard_price", 0) * 100)
    bun_price     = int(data.get("bundle_price", 0) * 100)

    # Validate minimums
    mins = {
        "navigator": auth.get_min_reseller_price("navigator"),
        "wizard":    auth.get_min_reseller_price("wizard"),
        "bundle":    auth.get_min_reseller_price("bundle"),
    }
    errors = []
    if reseller_mode:
        if nav_price < mins["navigator"]:
            errors.append(f"Navigator minimum is ${mins['navigator']/100:.2f}")
        if wiz_price < mins["wizard"]:
            errors.append(f"Wizard minimum is ${mins['wizard']/100:.2f}")
        if bun_price < mins["bundle"]:
            errors.append(f"Bundle minimum is ${mins['bundle']/100:.2f}")
    if errors:
        return jsonify({"error": " · ".join(errors)}), 400

    auth.update_reseller_settings(sid, reseller_mode, nav_price, wiz_price, bun_price)
    return jsonify({"message": "Reseller settings updated."})


@app.route("/api/admin/pro/generate-client-link", methods=["POST"])
@require_admin
def api_admin_pro_generate_client_link():
    """Generate a single-use client access link for a pro subscriber."""
    data          = request.get_json(force=True, silent=True) or {}
    subscriber_id = data.get("id")
    product       = data.get("product", "navigator")

    if product not in ("navigator", "wizard", "bundle"):
        return jsonify({"error": "Invalid product."}), 400

    token, err = auth.create_client_link(subscriber_id, product)
    if err:
        return jsonify({"error": err}), 500

    base = request.host_url.rstrip("/")
    return jsonify({
        "token": token,
        "link":  f"{base}/pro/link/{token}",
        "product": product,
    })


# ── Wizard lock routes ─────────────────────────────────────────────────────────

@app.route("/wizard-locked")
def wizard_locked_page():
    """Shown when a user tries to access wizard after locking documents."""
    user = get_current_user()
    email = user["email"] if user else ""
    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Wizard Access Restricted — IRS Pilot</title>
<style>
body{{font-family:Georgia,serif;background:#f8f6f1;display:flex;flex-direction:column;min-height:100vh;margin:0}}
.hdr{{background:#1a2d5a;padding:16px 24px;border-bottom:3px solid #7ec11f}}
.logo{{color:#fff;font-weight:bold;font-size:16px;text-decoration:none;display:flex;align-items:center;gap:10px}}
.icon{{width:36px;height:36px;background:#7ec11f;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}}
.sub{{color:#7ec11f;font-size:11px;letter-spacing:1px}}
.box{{max-width:580px;margin:60px auto;background:#fff;border-radius:16px;border:2px solid #e8e4dc;padding:40px;text-align:center}}
h2{{color:#1a2d5a;margin-bottom:8px}}
p{{color:#555;line-height:1.7;margin-bottom:16px}}
.warn{{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:24px;color:#dc2626;font-size:14px;line-height:1.6}}
.btn{{display:inline-block;padding:12px 24px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:8px;font-family:Georgia,serif;font-weight:bold;font-size:14px;text-decoration:none;margin:6px}}
.btn-sec{{background:transparent;color:#1a2d5a;border-color:#e8e4dc}}
</style></head>
<body>
<div class="hdr"><a href="/" class="logo"><div class="icon">⚖️</div><div><div>IRS Pilot</div><div class="sub">TAXPAYER SELF-HELP</div></div></a></div>
<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px">
<div class="box">
  <div style="font-size:48px;margin-bottom:16px">🔒</div>
  <h2>Wizard Access Restricted</h2>
  <div class="warn">
    Your documents have been printed or downloaded. To protect the integrity of your IRS submission,
    access to the Financial Intake Wizard has been restricted.<br><br>
    <strong>This is by design.</strong> The IRS compares your 433 forms against your actual financial records —
    paychecks, bank statements, mortgage statements, car loan statements, and more.
    Your forms must match those documents exactly.
  </div>
  <p>
    <strong>Did you make a mistake on one of your forms?</strong><br>
    Contact us and we'll restore short-term access so you can correct the specific issue.
    Please describe which form and which field needs to be corrected.
  </p>
  <a href="mailto:info@taylortaxandfinancial.com?subject=Wizard Access Request — {email}&body=I need short-term access to correct an error on my IRS forms.%0A%0AForm: %0AField: %0AIssue: "
    class="btn">📧 Request Access Correction</a>
  <a href="https://www.calendly.com/taylor-tax-financial/tax-help" target="_blank" class="btn btn-sec">📅 Schedule a Call</a>
  <div style="margin-top:24px;font-size:12px;color:#aaa">
    Taylor Tax and Financial Consulting Inc. · (615) 953-7124
  </div>
</div>
</div>
</body></html>"""
    return Response(html, mimetype="text/html")


@app.route("/api/wizard/lock", methods=["POST"])
def api_wizard_lock():
    """Lock wizard access after user prints/downloads documents."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    data   = request.get_json(force=True, silent=True) or {}
    reason = data.get("reason", "download")  # "download" or "print"
    auth.lock_wizard_access(user["user_id"], reason)
    return jsonify({"locked": True, "reason": reason})


@app.route("/api/admin/wizard/unlock", methods=["POST"])
@require_admin
def api_admin_wizard_unlock():
    """Admin unlocks wizard access for a user."""
    data  = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    with auth.get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return jsonify({"error": f"No account found for {email}."}), 404
    auth.unlock_wizard_access(user["id"])
    return jsonify({"message": f"Wizard access unlocked for {email}."})


@app.route("/terms")
def terms_page():
    html = build_page("tos_page.js", "TOSPage", "Terms of Service — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/privacy")
def privacy_page():
    html = build_page("privacy_page.js", "PrivacyPage", "Privacy Policy — IRS Pilot")
    return Response(html, mimetype="text/html")



@app.route("/api/admin/pro/billing-portal", methods=["POST"])
@require_admin
def api_admin_pro_billing_portal():
    """Generate a Stripe billing portal URL for a pro subscriber."""
    data = request.get_json(force=True, silent=True) or {}
    sid  = data.get("id")
    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT stripe_customer_id, email FROM pro_subscribers ps "
            "JOIN users u ON ps.user_id = u.id WHERE ps.id = ?", (sid,)
        ).fetchone()
    if not sub or not sub["stripe_customer_id"]:
        return jsonify({"error": "No Stripe customer found. Subscriber may need to complete initial payment first."}), 404
    return_url = f"{request.host_url}admin"
    url, err = stripe_checkout.create_billing_portal_session(
        sub["stripe_customer_id"], return_url
    )
    if err:
        return jsonify({"error": err}), 500
    return jsonify({"url": url})


@app.route("/pro-subscriber/manage")
def pro_subscriber_manage():
    """Redirect pro subscriber to Stripe billing portal."""
    user = get_current_user()
    if not user:
        return redirect("/login")
    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT stripe_customer_id FROM pro_subscribers WHERE user_id = ? AND active = 1",
            (user["user_id"],)
        ).fetchone()
    if not sub or not sub["stripe_customer_id"]:
        return redirect("/account")
    url, err = stripe_checkout.create_billing_portal_session(
        sub["stripe_customer_id"],
        request.host_url.rstrip("/") + "/account"
    )
    if err:
        return redirect("/account")
    return redirect(url)



@app.route("/api/admin/referral/create", methods=["POST"])
@require_admin
def api_admin_referral_create():
    """Manually create a referral partner for a user by email."""
    data  = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required."}), 400

    # Find or create user account
    with auth.get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        return jsonify({"error": f"No account found for {email}. They must create an account at irspilot.com first."}), 404

    user_id = user["id"]
    existing = auth.get_referral_partner_by_user(user_id)
    if existing:
        BASE = request.host_url.rstrip("/")
        return jsonify({
            "message": f"{email} is already a referral partner.",
            "code": existing["code"],
            "link": f"{BASE}/refer/{existing['code']}",
        })

    partner_id, code, err = auth.create_referral_partner(user_id)
    if err:
        return jsonify({"error": err}), 500

    BASE = request.host_url.rstrip("/")
    referral_link = f"{BASE}/refer/{code}"

    # Send welcome email to partner
    try:
        email_service.notify_referral_welcome(email, code, referral_link)
    except Exception:
        pass

    return jsonify({
        "message":      f"Referral partner created for {email}.",
        "code":         code,
        "link":         referral_link,
    })



# ── Wizard data storage and purge routes ──────────────────────────────────────

@app.route("/api/wizard/save-data", methods=["POST"])
def api_wizard_save_data():
    """Store wizard form data server-side when user downloads forms."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json(force=True, silent=True) or {}
    data_json = data.get("data", "")
    if not data_json:
        return jsonify({"error": "No data provided."}), 400
    auth.save_wizard_data(user["user_id"], data_json)
    auth.mark_wizard_locked(user["user_id"])
    return jsonify({"saved": True, "purge_in": "24 hours"})


@app.route("/api/wizard/purge-data", methods=["POST"])
def api_wizard_purge_data():
    """Immediately purge wizard form data for the current user."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    auth.purge_wizard_data(user["user_id"])
    return jsonify({"purged": True})


@app.route("/api/wizard/data-status")
def api_wizard_data_status():
    """Check if wizard data exists and when it will be purged."""
    user = get_current_user()
    if not user:
        return jsonify({"has_data": False})
    row = auth.get_wizard_data(user["user_id"])
    if not row:
        return jsonify({"has_data": False})
    return jsonify({
        "has_data":    True,
        "purge_after": row.get("purge_after"),
    })



# ── Preview code routes ────────────────────────────────────────────────────────

@app.route("/preview/<token>")
def preview_access(token):
    """Grant demo or partner preview access via a code."""
    row = auth.get_preview_code(token)
    if not row:
        html = """<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Preview Expired — IRS Pilot</title>
        <style>body{font-family:Georgia,serif;background:#f8f6f1;display:flex;align-items:center;
        justify-content:center;min-height:100vh;margin:0}
        .box{background:#fff;border-radius:14px;padding:40px;max-width:480px;text-align:center;
        border:1px solid #e8e4dc}h2{color:#1a2d5a}p{color:#666;line-height:1.7}
        a{display:inline-block;margin-top:16px;padding:10px 22px;background:#1a2d5a;
        color:#7ec11f;border:2px solid #7ec11f;border-radius:8px;text-decoration:none;
        font-weight:bold}</style></head>
        <body><div class="box"><div style="font-size:48px">⏰</div>
        <h2>Preview Link Expired</h2>
        <p>This preview link has expired or is invalid. Contact us to request a new one.</p>
        <a href="/">Back to IRS Pilot</a></div></body></html>"""
        return Response(html, mimetype="text/html")

    code_type = row["type"]  # 'demo' or 'partner'

    # Set preview session cookie
    resp = make_response(redirect("/navigator"))
    resp.set_cookie(
        "preview_session",
        f"{token}:{code_type}",
        max_age=60 * 60 * 24 if code_type == "partner" else 60 * 15,
        httponly=True,
        samesite="Lax"
    )
    return resp


@app.route("/api/admin/preview/create", methods=["POST"])
@require_admin
def api_admin_preview_create():
    """Create a demo or partner preview code."""
    data      = request.get_json(force=True, silent=True) or {}
    code_type = data.get("type", "demo")
    label     = data.get("label", "").strip()

    if code_type not in ("demo", "partner"):
        return jsonify({"error": "type must be 'demo' or 'partner'"}), 400

    token, expires_at, err = auth.create_preview_code(code_type, label)
    if err:
        return jsonify({"error": err}), 500

    BASE = request.host_url.rstrip("/")
    return jsonify({
        "code":       token,
        "type":       code_type,
        "expires_at": expires_at,
        "link":       f"{BASE}/preview/{token}",
    })


@app.route("/api/admin/preview/list")
@require_admin
def api_admin_preview_list():
    """List all preview codes."""
    codes = auth.list_preview_codes()
    return jsonify({"codes": [dict(c) for c in codes]})


@app.route("/api/admin/preview/delete", methods=["POST"])
@require_admin
def api_admin_preview_delete():
    """Delete a preview code."""
    data = request.get_json(force=True, silent=True) or {}
    auth.delete_preview_code(data.get("id"))
    return jsonify({"deleted": True})


@app.route("/api/preview/session")
def api_preview_session():
    """Check current preview session status."""
    cookie = request.cookies.get("preview_session", "")
    if not cookie or ":" not in cookie:
        return jsonify({"active": False})
    token, code_type = cookie.split(":", 1)
    row = auth.get_preview_code(token)
    if not row:
        return jsonify({"active": False, "expired": True})
    from datetime import datetime
    expires_dt = datetime.fromisoformat(row["expires_at"])
    remaining  = max(0, int((expires_dt - datetime.utcnow()).total_seconds()))
    return jsonify({
        "active":    True,
        "type":      code_type,
        "remaining": remaining,
        "expires_at": row["expires_at"],
    })



@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Proxy chat messages to Anthropic API for the support chatbot."""
    data     = request.get_json(force=True, silent=True) or {}
    messages = data.get("messages", [])
    if not messages:
        return jsonify({"error": "No messages provided."}), 400

    # Anthropic requires messages to start with 'user' role
    # Strip any leading assistant messages (the greeting is in the system prompt)
    while messages and messages[0].get("role") != "user":
        messages = messages[1:]
    if not messages:
        return jsonify({"error": "No user messages provided."}), 400

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return jsonify({"reply": "I'm not available right now. Please email info@taylortaxandfinancial.com for help."})

    SYSTEM_PROMPT = """You are the IRS Pilot support assistant - a helpful, professional chatbot for irspilot.com, a taxpayer self-help platform built by Tyrone J. Taylor, EA (Enrolled Agent).

ABOUT IRS PILOT:
- Web-based self-help tool for IRS collection and audit notices
- Plain-language notice explanations (CP14, CP501, CP503, CP504, LT11, CP90, CP2000, and more)
- Step-by-step guidance for 10+ IRS situations (levies, audits, revenue officers, TFRP, unfiled returns, OICs, installment agreements)
- Financial Intake Wizard auto-fills Forms 433-F, 433-A, 433-A OIC, 433-B, and Form 656
- Estimated installment agreement calculations and AI-powered IRS response letter generator
- Built by Tyrone J. Taylor, EA - federally licensed, highest IRS credential for private practitioners
- Self-help tool only, not legal or tax advice

PRICING:
- Navigator: $59 - 7-day access - notice lookup, situation guidance, letter generator
- Financial Intake Wizard: $99 - 7-day access - 433 form auto-fill, RCP calculator, OIC analysis
- Complete Bundle: $129 - 7-day access - Navigator + Wizard (saves $29)
- Satisfaction guarantee: full refund within 24 hours if not satisfied AND before downloading documents

REFERRAL PROGRAM:
- Free to join, no monthly fee, no license required
- Create a free account at irspilot.com/referral to join instantly
- Earn 20% commission: Navigator $11.80, Wizard $19.80, Bundle $25.80
- 30-day tracking cookie, commissions paid monthly, no cap on earnings

PRO SUBSCRIPTION (for tax professionals):
- White-label version with your firm name, contact info, and Calendly link throughout the app
- Clients never see IRS Pilot branding - they see yours
- $49/month intro (3 months) then $79/month
- 10 client sessions/month included, additional at $5 each
- 24-hour client sessions, no client login needed
- Requires approval - schedule at calendly.com/taylor-tax-financial/irspilotreferral
- Reseller pricing available: minimum $79/$139/$179 for Navigator/Wizard/Bundle

CONTACT: info@taylortaxandfinancial.com | www.irspilot.com

RULES:
- Only answer questions about IRS Pilot features, pricing, and programs
- For personal IRS tax situations, direct users to use the Navigator tool or email info@taylortaxandfinancial.com
- Never give a phone number - always direct to email: info@taylortaxandfinancial.com
- Never provide specific legal or tax advice
- Write in proper conversational English with standard grammar and punctuation
- Never use markdown formatting - no ## headers, no **bold**, no horizontal rules (---)
- Break responses into short paragraphs of 2-3 sentences, each covering one idea
- Use bullet points where they genuinely help readability, such as listing features or pricing tiers - just write them as plain lines starting with a simple dash or dot, no markdown symbols
- Keep responses concise - a short paragraph plus a bullet list if needed, not a wall of text
- Be warm and professional, like a knowledgeable staff member
- If you don't know something, direct them to info@taylortaxandfinancial.com

CRITICAL SOURCE RESTRICTIONS — ALL IRS TAX CONTENT:
- Any IRS tax information must be based EXCLUSIVELY on verified IRS sources:
  * IRS.gov official publications, instructions, notices, and forms
  * Internal Revenue Code (IRC)
  * Internal Revenue Manual (IRM) as published on irs.gov
  * Treasury Regulations (26 CFR)
  * Official IRS revenue rulings and revenue procedures
- Do NOT draw on third-party tax blogs, legal commentary, or non-IRS sources
- Do NOT invent or estimate IRC sections, deadlines, or IRS procedures
- If a specific tax question cannot be answered from verified IRS sources, direct the user to irs.gov or info@taylortaxandfinancial.com"""

    try:
        import urllib.request, urllib.error, json as json_lib
        payload = json_lib.dumps({
            "model":      "claude-sonnet-4-6",
            "max_tokens": 500,
            "system":     SYSTEM_PROMPT,
            "messages":   messages,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key":         api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type":      "application/json",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json_lib.loads(resp.read().decode())
        reply = result.get("content", [{}])[0].get("text",
            "I had trouble processing that. Please email info@taylortaxandfinancial.com.")
        return jsonify({"reply": reply})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        app.logger.error(f"Chat API HTTP error: {e.code} {body}")
        return jsonify({"reply": f"I'm having trouble right now. Please email info@taylortaxandfinancial.com. (Error: {e.code}: {body[:200]})"})
    except Exception as e:
        app.logger.error(f"Chat API error: {e}")
        return jsonify({"reply": f"I'm having trouble right now. Please email info@taylortaxandfinancial.com. (Error: {str(e)[:100]})"})



@app.route("/api/chat-test")
@require_admin
def api_chat_test():
    """Debug endpoint to test Anthropic API connection."""
    import urllib.request, urllib.error, json as json_lib
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return jsonify({"error": "No API key"})
    try:
        payload = json_lib.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 50,
            "messages": [{"role": "user", "content": "Say hello"}],
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json_lib.loads(resp.read().decode())
        return jsonify({"success": True, "reply": result.get("content", [{}])[0].get("text", "")})
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return jsonify({"error": f"HTTP {e.code}", "body": body})
    except Exception as e:
        return jsonify({"error": str(e)})



@app.route("/api/taxpro/demo-request", methods=["POST"])
def api_taxpro_demo_request():
    """Store a demo request from the Tax Professionals page."""
    data       = request.get_json(force=True, silent=True) or {}
    name       = data.get("name", "").strip()
    profession = data.get("profession", "").strip()
    email      = data.get("email", "").strip().lower()
    mobile     = data.get("mobile", "").strip()

    if not name or not profession or not email or not mobile:
        return jsonify({"error": "All fields are required."}), 400

    # Store in database
    with auth.get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS demo_requests (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT, profession TEXT,
                email      TEXT, mobile TEXT,
                status     TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute(
            "INSERT INTO demo_requests (name, profession, email, mobile) VALUES (?,?,?,?)",
            (name, profession, email, mobile)
        )

    # Notify Tyrone
    try:
        email_service.notify_demo_request(name, profession, email, mobile)
    except Exception:
        pass

    app.logger.info(f"Demo request: {name} ({profession}) <{email}>")
    return jsonify({"message": "Demo request received."})


@app.route("/api/admin/demo/requests")
@require_admin
def api_admin_demo_requests():
    """List all demo requests."""
    with auth.get_db() as conn:
        try:
            rows = conn.execute(
                "SELECT * FROM demo_requests ORDER BY created_at DESC"
            ).fetchall()
        except Exception:
            rows = []
    return jsonify({"requests": [dict(r) for r in rows]})


@app.route("/api/admin/demo/send-code", methods=["POST"])
@require_admin
def api_admin_demo_send_code():
    """Generate a partner preview code and email it to a demo requester."""
    data  = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip()
    name  = data.get("name", "").strip()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    # Generate a 24-hour partner preview code
    token, expires_at, err = auth.create_preview_code("partner", label=f"Demo - {name}")
    if err:
        return jsonify({"error": err}), 500

    BASE = request.host_url.rstrip("/")
    demo_link = f"{BASE}/preview/{token}"

    # Send the demo email
    try:
        email_service.send_demo_code_email(name, email, demo_link, expires_at)
        sent = True
    except Exception as e:
        app.logger.error(f"Demo email error: {e}")
        sent = False

    # Update request status
    with auth.get_db() as conn:
        try:
            conn.execute(
                "UPDATE demo_requests SET status = 'sent' WHERE email = ?", (email,)
            )
        except Exception:
            pass

    return jsonify({
        "sent":      sent,
        "link":      demo_link,
        "expires_at": expires_at,
        "message":   f"Demo code {'emailed' if sent else 'created (email failed)'}.",
    })



@app.route("/api/admin/taxpro/send-interest-letter", methods=["POST"])
@require_admin
def api_admin_send_interest_letter():
    """Send the interest/explanation letter to a pro interest submission."""
    data  = request.get_json(force=True, silent=True) or {}
    name  = data.get("name", "")
    email = data.get("email", "")
    firm  = data.get("firm", "")
    try:
        email_service.send_pro_interest_letter(name, email, firm)
        with auth.get_db() as conn:
            try:
                conn.execute("UPDATE taxpro_interests SET status = 'contacted' WHERE id = ?", (data.get("id"),))
            except Exception:
                pass
        return jsonify({"sent": True})
    except Exception as e:
        app.logger.error(f"Interest letter error: {e}")
        return jsonify({"error": f"Email failed: {str(e)}"}), 500


@app.route("/api/admin/taxpro/send-approval-letter", methods=["POST"])
@require_admin
def api_admin_send_approval_letter():
    """Send approval letter with unique signup link to a pro interest submission."""
    data        = request.get_json(force=True, silent=True) or {}
    name        = data.get("name", "")
    email       = data.get("email", "")
    firm        = data.get("firm", "")
    interest_id = data.get("id")

    # Generate a unique 7-day signup token
    token, err = auth.create_pro_signup_token(email, name, firm, interest_id)
    if err:
        return jsonify({"error": f"Could not generate signup link: {err}"}), 500

    BASE        = request.host_url.rstrip("/")
    signup_link = f"{BASE}/pro-signup/{token}"

    try:
        email_service.send_pro_approval_letter(name, email, firm, signup_link)
        with auth.get_db() as conn:
            try:
                conn.execute("UPDATE taxpro_interests SET status = 'approved' WHERE id = ?", (interest_id,))
            except Exception:
                pass
        return jsonify({"sent": True, "signup_link": signup_link})
    except Exception as e:
        app.logger.error(f"Approval letter error: {e}")
        return jsonify({"error": f"Email failed: {str(e)}"}), 500


@app.route("/api/admin/taxpro/send-denial-letter", methods=["POST"])
@require_admin
def api_admin_send_denial_letter():
    """Send denial letter to a pro interest submission."""
    data  = request.get_json(force=True, silent=True) or {}
    name  = data.get("name", "")
    email = data.get("email", "")
    try:
        email_service.send_pro_denial_letter(name, email)
        with auth.get_db() as conn:
            try:
                conn.execute("UPDATE taxpro_interests SET status = 'denied' WHERE id = ?", (data.get("id"),))
            except Exception:
                pass
        return jsonify({"sent": True})
    except Exception as e:
        app.logger.error(f"Denial letter error: {e}")
        return jsonify({"error": f"Email failed: {str(e)}"}), 500


@app.route("/api/admin/taxpro/delete-interest", methods=["POST"])
@require_admin
def api_admin_delete_interest():
    """Delete a pro interest submission."""
    data = request.get_json(force=True, silent=True) or {}
    with auth.get_db() as conn:
        conn.execute("DELETE FROM taxpro_interests WHERE id = ?", (data.get("id"),))
    return jsonify({"deleted": True})



@app.route("/pro-signup/<token>")
def pro_signup_page(token):
    """Pro subscription self-service signup page."""
    row = auth.get_pro_signup_token(token)
    html = build_page("pro_signup_page.js", "ProSignupPage", "IRS Pilot — Pro Subscription Signup")
    if not row:
        inject = "<script>window.__PRO_SIGNUP_TOKEN__ = ''; window.__PRO_SIGNUP_PREFILL__ = {};</script>\n"
        # Show invalid state
        inject += "<script>window.__PRO_SIGNUP_INVALID__ = true;</script>\n"
    else:
        import json as _json
        prefill = _json.dumps({
            "email": row["email"] or "",
            "name":  row["name"]  or "",
            "firm":  row["firm"]  or "",
        })
        inject = f"<script>window.__PRO_SIGNUP_TOKEN__ = {_json.dumps(token)}; window.__PRO_SIGNUP_PREFILL__ = {prefill};</script>\n"
    html = html.replace("</body>", inject + "</body>", 1)
    return Response(html, mimetype="text/html")


@app.route("/api/pro-signup/complete", methods=["POST"])
def api_pro_signup_complete():
    """Complete pro subscription signup from the self-service form."""
    data  = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "")

    row = auth.get_pro_signup_token(token)
    if not row:
        return jsonify({"error": "This signup link has expired or is invalid."}), 400

    email        = data.get("email", row["email"]).strip().lower()
    firm_name    = data.get("firm_name", "").strip()
    contact_name = data.get("contact_name", "").strip()
    contact_phone= data.get("contact_phone", "").strip()
    calendly_url = data.get("calendly_url", "").strip()

    if not firm_name or not contact_name or not contact_phone or not email:
        return jsonify({"error": "All required fields must be filled in."}), 400

    # Find or create user account
    with auth.get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        user_id, err = auth.create_user(email, auth.secrets.token_urlsafe(12))
        if err:
            return jsonify({"error": f"Could not create account: {err}"}), 500
    else:
        user_id = user["id"]

    # Check not already a subscriber
    existing = auth.get_pro_subscriber_by_user(user_id)
    if existing:
        return jsonify({"error": "An account already exists for this email."}), 400

    # Create pro subscriber record
    sub_id, access_code, err = auth.create_pro_subscriber(
        user_id, firm_name, contact_name, contact_phone, calendly_url
    )
    if err:
        return jsonify({"error": err}), 500

    # Create Stripe Checkout session — subscriber pays immediately
    checkout_url = None
    try:
        checkout_url, stripe_err = stripe_checkout.create_pro_signup_checkout(
            user_id, email, sub_id, firm_name, token
        )
        if stripe_err:
            app.logger.error(f"Stripe checkout error: {stripe_err}")
    except Exception as e:
        app.logger.error(f"Stripe setup error on pro signup: {e}")

    # If Stripe checkout creation failed, still enroll them and notify Tyrone manually
    if not checkout_url:
        auth.mark_pro_signup_token_used(token)
        if row["interest_id"]:
            with auth.get_db() as conn:
                try:
                    conn.execute(
                        "UPDATE taxpro_interests SET status = 'approved' WHERE id = ?",
                        (row["interest_id"],)
                    )
                except Exception:
                    pass
        try:
            email_service.notify_new_pro_subscriber(email, firm_name, None)
        except Exception:
            pass
        return jsonify({"enrolled": True, "checkout_url": None, "access_code": access_code})

    # Return checkout URL — client will redirect there
    return jsonify({
        "enrolled":     True,
        "checkout_url": checkout_url,
        "access_code":  access_code,
    })



@app.route("/pro-signup/success")
def pro_signup_success():
    """Stripe Checkout success landing page for pro signup."""
    session_id = request.args.get("session_id", "")
    token      = request.args.get("token", "")

    # Retrieve Stripe session to get subscription ID
    sub_id_stripe = None
    customer_id   = None
    subscriber_id = None
    try:
        import stripe as _stripe
        _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        session = _stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
        sub_id_stripe = session.subscription.id if session.subscription else None
        customer_id   = session.customer
        subscriber_id = session.metadata.get("subscriber_id")
    except Exception as e:
        app.logger.error(f"Pro signup success Stripe error: {e}")

    # Update subscriber with Stripe IDs and mark active
    if subscriber_id:
        with auth.get_db() as conn:
            conn.execute(
                "UPDATE pro_subscribers SET stripe_sub_id = ?, stripe_customer_id = ?, active = 1 WHERE id = ?",
                (sub_id_stripe, customer_id, int(subscriber_id))
            )
        # Mark token used
        if token:
            auth.mark_pro_signup_token_used(token)
        # Mark interest approved
        row = auth.get_pro_signup_token(token) if token else None
        if row and row["interest_id"]:
            with auth.get_db() as conn:
                try:
                    conn.execute(
                        "UPDATE taxpro_interests SET status = 'approved' WHERE id = ?",
                        (row["interest_id"],)
                    )
                except Exception:
                    pass

    # Get subscriber details for confirmation email
    try:
        if subscriber_id:
            with auth.get_db() as conn:
                sub = conn.execute(
                    "SELECT ps.firm_name, ps.contact_name, u.email "
                    "FROM pro_subscribers ps JOIN users u ON ps.user_id = u.id "
                    "WHERE ps.id = ?", (int(subscriber_id),)
                ).fetchone()
            if sub:
                # Send welcome confirmation email
                try:
                    email_service.send_pro_welcome_confirmation(
                        sub["contact_name"], sub["email"], sub["firm_name"]
                    )
                except Exception:
                    pass
                # Notify Tyrone
                try:
                    email_service.notify_new_pro_subscriber(
                        sub["email"], sub["firm_name"], None
                    )
                except Exception:
                    pass
    except Exception as e:
        app.logger.error(f"Pro signup success post-processing error: {e}")

    # Render success page
    html = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Enrolled — IRS Pilot Pro</title>
<script src="/static/vendor/react.production.min.js"></script>
<script src="/static/vendor/react-dom.production.min.js"></script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#f8f6f1;min-height:100vh;display:flex;flex-direction:column}</style>
</head><body>
<div style="background:#1a2d5a;padding:12px 24px;border-bottom:3px solid #7ec11f;display:flex;align-items:center;gap:12px">
  <img src="/static/logo.png" style="width:40px;height:40px;object-fit:contain">
  <div><div style="color:#fff;font-weight:bold;font-size:15px">IRS Pilot</div>
  <div style="color:#7ec11f;font-size:10px;letter-spacing:1px">PRO SUBSCRIPTION</div></div>
</div>
<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px 16px">
  <div style="background:#fff;border-radius:14px;border:2px solid #7ec11f;padding:40px 32px;max-width:480px;width:100%;text-align:center">
    <div style="width:60px;height:60px;border-radius:50%;background:#f0fdf4;border:2px solid #7ec11f;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px">✅</div>
    <h2 style="color:#1a2d5a;margin-bottom:12px;font-size:24px">You're Enrolled!</h2>
    <p style="color:#555;line-height:1.7;margin-bottom:16px;font-size:14px">
      Welcome to IRS Pilot Pro. Your subscription is now active and your branded account
      is being configured. You will receive your unique client link within one business day.
    </p>
    <p style="color:#888;font-size:13px">
      Questions? Email <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>
    </p>
  </div>
</div>
<div style="text-align:center;padding:16px;color:#aaa;font-size:12px">
  Taylor Tax and Financial Consulting Inc. · <a href="/terms" style="color:#aaa">Terms</a> · <a href="/privacy" style="color:#aaa">Privacy</a>
</div>
</body></html>"""
    return Response(html, mimetype="text/html")


@app.route("/pro-signup/cancelled")
def pro_signup_cancelled():
    """Stripe Checkout cancelled — redirect back to signup."""
    html = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payment Cancelled — IRS Pilot Pro</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#f8f6f1;min-height:100vh;display:flex;flex-direction:column}</style>
</head><body>
<div style="background:#1a2d5a;padding:12px 24px;border-bottom:3px solid #7ec11f;display:flex;align-items:center;gap:12px">
  <img src="/static/logo.png" style="width:40px;height:40px;object-fit:contain">
  <div><div style="color:#fff;font-weight:bold;font-size:15px">IRS Pilot</div>
  <div style="color:#7ec11f;font-size:10px;letter-spacing:1px">PRO SUBSCRIPTION</div></div>
</div>
<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px 16px">
  <div style="background:#fff;border-radius:14px;border:1px solid #e8e4dc;padding:40px 32px;max-width:480px;width:100%;text-align:center">
    <div style="font-size:48px;margin-bottom:16px">↩️</div>
    <h2 style="color:#1a2d5a;margin-bottom:12px">Payment Cancelled</h2>
    <p style="color:#555;line-height:1.7;margin-bottom:24px;font-size:14px">
      No charge was made. Your enrollment form has been saved —
      click below to return and complete your payment.
    </p>
    <a href="javascript:history.back()" style="display:inline-block;padding:12px 28px;background:#1a2d5a;color:#7ec11f;border:2px solid #7ec11f;border-radius:8px;font-weight:bold;font-size:14px;text-decoration:none">
      ← Return to Enrollment
    </a>
    <p style="margin-top:16px;color:#888;font-size:12px">
      Need help? Email <a href="mailto:info@taylortaxandfinancial.com" style="color:#1a2d5a">info@taylortaxandfinancial.com</a>
    </p>
  </div>
</div>
</body></html>"""
    return Response(html, mimetype="text/html")



# ── Admin Settings Routes ──────────────────────────────────────────────────────

@app.route("/api/admin/settings/get")
@require_admin
def api_admin_settings_get():
    """Get all admin-configurable settings."""
    return jsonify({
        "default_referral_commission": auth.get_default_commission(),
        "navigator_price":  int(auth.get_setting("navigator_price",  "59")),
        "wizard_price":     int(auth.get_setting("wizard_price",     "99")),
        "bundle_price":     int(auth.get_setting("bundle_price",     "129")),
        "pro_intro_price":  int(auth.get_setting("pro_intro_price",  "49")),
        "pro_standard_price": int(auth.get_setting("pro_standard_price", "79")),
    })


@app.route("/api/admin/settings/save", methods=["POST"])
@require_admin
def api_admin_settings_save():
    """Save global settings."""
    data = request.get_json(force=True, silent=True) or {}
    fields = ["default_referral_commission", "navigator_price", "wizard_price",
              "bundle_price", "pro_intro_price", "pro_standard_price"]
    for f in fields:
        if f in data:
            auth.set_setting(f, str(data[f]))
    return jsonify({"saved": True})


@app.route("/api/admin/discount/create", methods=["POST"])
@require_admin
def api_admin_discount_create():
    """Create a discount code with full options."""
    data         = request.get_json(force=True, silent=True) or {}
    code_str     = data.get("code", "").strip().upper()
    disc_type    = data.get("discount_type", "percent")   # percent | flat
    disc_amount  = int(data.get("discount_amount", 0))
    disc_pct     = disc_amount if disc_type == "percent" else 0
    applies_to   = data.get("applies_to", "all")          # all | navigator | wizard | bundle | pro
    expires_at   = data.get("expires_at", "")
    max_uses     = data.get("max_uses")

    if not code_str or not disc_amount:
        return jsonify({"error": "Code and discount amount are required."}), 400

    try:
        with auth.get_db() as conn:
            conn.execute(
                """INSERT INTO discount_codes
                   (code, discount_pct, discount_type, discount_amount,
                    applies_to, expires_at, max_uses, active)
                   VALUES (?,?,?,?,?,?,?,1)""",
                (code_str, disc_pct, disc_type, disc_amount,
                 applies_to, expires_at or None, max_uses)
            )
        return jsonify({"created": True, "code": code_str})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/discount/update-expiry", methods=["POST"])
@require_admin
def api_admin_discount_update_expiry():
    """Update a discount code's expiry date."""
    data = request.get_json(force=True, silent=True) or {}
    auth.extend_discount_expiry(data.get("id"), data.get("expires_at", ""))
    return jsonify({"updated": True})


@app.route("/api/admin/discount/toggle", methods=["POST"])
@require_admin
def api_admin_discount_toggle():
    """Activate or deactivate a discount code."""
    data = request.get_json(force=True, silent=True) or {}
    with auth.get_db() as conn:
        conn.execute(
            "UPDATE discount_codes SET active = ? WHERE id = ?",
            (1 if data.get("active") else 0, data.get("id"))
        )
    return jsonify({"updated": True})


@app.route("/api/admin/price-override/create", methods=["POST"])
@require_admin
def api_admin_price_override_create():
    """Create a price override for a specific user."""
    data    = request.get_json(force=True, silent=True) or {}
    email   = data.get("email", "").strip().lower()
    product = data.get("product", "")
    price   = data.get("price_dollars", 0)

    if not email or not product or not price:
        return jsonify({"error": "Email, product, and price are required."}), 400

    with auth.get_db() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
    if not user:
        return jsonify({"error": f"No account found for {email}."}), 404

    ok, err = auth.create_price_override(
        user["id"], product, int(float(price) * 100), data.get("note", "")
    )
    if not ok:
        return jsonify({"error": err}), 500
    return jsonify({"created": True})


@app.route("/api/admin/price-override/list")
@require_admin
def api_admin_price_override_list():
    """List all active price overrides."""
    rows = auth.list_price_overrides()
    return jsonify({"overrides": [dict(r) for r in rows]})


@app.route("/api/admin/price-override/delete", methods=["POST"])
@require_admin
def api_admin_price_override_delete():
    """Delete a price override."""
    data = request.get_json(force=True, silent=True) or {}
    with auth.get_db() as conn:
        conn.execute("DELETE FROM price_overrides WHERE id = ?", (data.get("id"),))
    return jsonify({"deleted": True})


@app.route("/api/admin/referral/set-commission", methods=["POST"])
@require_admin
def api_admin_referral_set_commission():
    """Set commission for a specific partner or the global default."""
    data       = request.get_json(force=True, silent=True) or {}
    partner_id = data.get("partner_id")
    pct        = int(data.get("commission_pct", 20))
    if partner_id:
        auth.set_partner_commission(partner_id, pct)
    else:
        auth.set_default_commission(pct)
    return jsonify({"updated": True})


@app.route("/api/admin/purchase/extend", methods=["POST"])
@require_admin
def api_admin_purchase_extend():
    """Extend a purchase expiry date."""
    data = request.get_json(force=True, silent=True) or {}
    purchase_id = data.get("purchase_id")
    new_expiry  = data.get("expires_at", "")
    if not purchase_id or not new_expiry:
        return jsonify({"error": "purchase_id and expires_at required."}), 400
    auth.extend_purchase_expiry(purchase_id, new_expiry)
    return jsonify({"updated": True})



# ── Foundation Member Routes ───────────────────────────────────────────────────

@app.route("/api/admin/foundation/list")
@require_admin
def api_admin_foundation_list():
    """List all foundation members."""
    try:
        members = auth.list_foundation_members()
        return jsonify({"members": [dict(m) for m in members]})
    except Exception as e:
        app.logger.error(f"Foundation list error: {e}")
        return jsonify({"members": []})


@app.route("/api/admin/foundation/create", methods=["POST"])
@require_admin
def api_admin_foundation_create():
    """Elevate a referral partner to Foundation Member."""
    data         = request.get_json(force=True, silent=True) or {}
    email        = data.get("email", "").strip().lower()
    override_pct = int(data.get("override_pct", 5))

    if not email:
        return jsonify({"error": "Email is required."}), 400

    # Find user
    with auth.get_db() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone()
    if not user:
        return jsonify({"error": f"No account found for {email}."}), 404

    # Must be a referral partner first
    partner = auth.get_referral_partner_by_user(user["id"])
    if not partner:
        # Auto-create referral partner
        partner_id, code_str, err = auth.create_referral_partner(user["id"])
        if err:
            return jsonify({"error": f"Could not create referral partner: {err}"}), 500
        partner = auth.get_referral_partner_by_user(user["id"])

    fm_id, err = auth.create_foundation_member(
        user["id"], partner["id"], override_pct
    )
    if err:
        return jsonify({"error": err}), 500

    # Notify
    try:
        email_service.notify_foundation_member_created(email, override_pct)
    except Exception:
        pass

    return jsonify({
        "created": True,
        "foundation_member_id": fm_id,
        "email": email,
        "override_pct": override_pct,
    })


@app.route("/api/admin/foundation/deactivate", methods=["POST"])
@require_admin
def api_admin_foundation_deactivate():
    """Remove Foundation Member status."""
    data = request.get_json(force=True, silent=True) or {}
    auth.deactivate_foundation_member(data.get("id"))
    return jsonify({"deactivated": True})


@app.route("/api/admin/foundation/assign-partner", methods=["POST"])
@require_admin
def api_admin_foundation_assign_partner():
    """Link a referral partner to a foundation member sponsor."""
    data             = request.get_json(force=True, silent=True) or {}
    partner_id       = data.get("partner_id")
    foundation_id    = data.get("foundation_member_id")
    if not partner_id or not foundation_id:
        return jsonify({"error": "partner_id and foundation_member_id required."}), 400
    auth.assign_partner_sponsor(partner_id, foundation_id)
    return jsonify({"assigned": True})


@app.route("/api/admin/foundation/partners/<int:fm_id>")
@require_admin
def api_admin_foundation_partners(fm_id):
    """List partners recruited under a foundation member."""
    partners = auth.get_foundation_recruited_partners(fm_id)
    return jsonify({"partners": [dict(p) for p in partners]})


@app.route("/api/foundation/me")
def api_foundation_me():
    """Get current user's foundation member status and recruited partners."""
    user = get_current_user()
    if not user:
        return jsonify({"is_foundation": False})
    fm = auth.get_foundation_member_by_user(user["user_id"])
    if not fm:
        return jsonify({"is_foundation": False})
    partners = auth.get_foundation_recruited_partners(fm["id"])
    return jsonify({
        "is_foundation":  True,
        "override_pct":   fm["override_pct"],
        "recruited":      [dict(p) for p in partners],
        "recruited_count": len(partners),
    })



@app.route("/demo-navigator")
def demo_navigator():
    """Interactive Navigator demo for tax professionals."""
    html = build_page("demo_navigator.js", "NavigatorDemo", "IRS Pilot Navigator — Interactive Demo")
    return Response(html, mimetype="text/html")


@app.route("/demo-wizard")
def demo_wizard():
    """Interactive Wizard demo for tax professionals."""
    html = build_page("demo_wizard.js", "WizardDemo", "IRS Pilot Wizard — Interactive Demo")
    return Response(html, mimetype="text/html")


@app.route("/demo-transcript")
def demo_transcript():
    html = build_page("demo_transcript.js", "TranscriptDemo", "IRS Pilot Transcript Analyzer — Interactive Demo")
    return Response(html, mimetype="text/html")
# ── Admin Delete Routes ────────────────────────────────────────────────────────

@app.route("/api/admin/user/delete", methods=["POST"])
@require_admin
def api_admin_user_delete():
    """Permanently delete a user and all associated data."""
    data    = request.get_json(force=True, silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required."}), 400
    try:
        with auth.get_db() as conn:
            # Delete in dependency order
            conn.execute("DELETE FROM referral_conversions WHERE referred_user_id = ?", (user_id,))
            conn.execute("DELETE FROM discount_uses WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM wizard_data WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM password_resets WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM price_overrides WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM pro_signup_tokens WHERE user_id = ?", (user_id,) if 'user_id' in str(conn.execute("PRAGMA table_info(pro_signup_tokens)").fetchall()) else (user_id,))
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM purchases WHERE user_id = ?", (user_id,))
            # Delete referral partner and their conversions
            partner = conn.execute("SELECT id FROM referral_partners WHERE user_id = ?", (user_id,)).fetchone()
            if partner:
                conn.execute("DELETE FROM referral_conversions WHERE partner_id = ?", (partner["id"],))
                conn.execute("DELETE FROM foundation_members WHERE partner_id = ?", (partner["id"],))
                conn.execute("DELETE FROM referral_partners WHERE user_id = ?", (user_id,))
            # Delete pro subscriber
            conn.execute("DELETE FROM pro_subscribers WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM foundation_members WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        app.logger.info(f"Admin deleted user ID {user_id}")
        return jsonify({"deleted": True})
    except Exception as e:
        app.logger.error(f"User delete error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/referral/delete", methods=["POST"])
@require_admin
def api_admin_referral_delete():
    """Remove a referral partner (keeps user account intact)."""
    data       = request.get_json(force=True, silent=True) or {}
    partner_id = data.get("partner_id")
    if not partner_id:
        return jsonify({"error": "partner_id required."}), 400
    try:
        with auth.get_db() as conn:
            conn.execute("DELETE FROM referral_conversions WHERE partner_id = ?", (partner_id,))
            conn.execute("DELETE FROM foundation_members WHERE partner_id = ?", (partner_id,))
            conn.execute("UPDATE referral_partners SET active = 0 WHERE id = ?", (partner_id,))
        return jsonify({"deleted": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/pro/delete", methods=["POST"])
@require_admin
def api_admin_pro_delete():
    """Remove a pro subscriber record (keeps user account intact)."""
    data = request.get_json(force=True, silent=True) or {}
    sid  = data.get("id")
    if not sid:
        return jsonify({"error": "id required."}), 400
    try:
        with auth.get_db() as conn:
            conn.execute("DELETE FROM pro_subscribers WHERE id = ?", (sid,))
        return jsonify({"deleted": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/check-access-code/<token>")
def api_check_access_code(token):
    """Check whether a code is a preview code or referral code."""
    token = token.strip().upper()

    # Check preview codes first (case-sensitive tokens)
    preview = auth.get_preview_code(token)
    if not preview:
        # Preview codes are case-sensitive urlsafe tokens — try lowercase too
        preview = auth.get_preview_code(token.lower())
    if preview:
        return jsonify({"type": "preview", "code_type": preview["type"]})

    # Check referral codes (stored uppercase)
    with auth.get_db() as conn:
        partner = conn.execute(
            "SELECT id FROM referral_partners WHERE UPPER(code) = ? AND active = 1",
            (token,)
        ).fetchone()
    if partner:
        return jsonify({"type": "referral"})

    return jsonify({"type": "invalid"})



# ── Session Expiry Warning Routes ─────────────────────────────────────────────

@app.route("/api/send-expiry-warnings", methods=["POST"])
@require_admin
def api_send_expiry_warnings():
    """Send expiry warning emails for purchases expiring within N days."""
    days_ahead = int(request.args.get("days", 2))
    purchases  = auth.get_purchases_expiring_soon(days_ahead)
    sent = 0
    errors = []
    for p in purchases:
        try:
            email_service.send_expiry_warning(
                p["email"], p["product"], p["expires_at"]
            )
            auth.mark_expiry_warned(p["id"])
            sent += 1
        except Exception as e:
            errors.append(f"{p['email']}: {str(e)[:80]}")
    return jsonify({"sent": sent, "errors": errors, "total": len(purchases)})


@app.route("/api/admin/check-expiring")
@require_admin
def api_admin_check_expiring():
    """Preview purchases expiring soon without sending emails."""
    days_ahead = int(request.args.get("days", 2))
    purchases  = auth.get_purchases_expiring_soon(days_ahead)
    return jsonify({
        "expiring_soon": [
            {"email": p["email"], "product": p["product"], "expires_at": p["expires_at"]}
            for p in purchases
        ],
        "count": len(purchases)
    })



@app.route("/api/admin/discount/delete", methods=["POST"])
@require_admin
def api_admin_discount_delete():
    """Permanently delete a discount code."""
    data = request.get_json(force=True, silent=True) or {}
    with auth.get_db() as conn:
        conn.execute("DELETE FROM discount_uses WHERE code_id = ?", (data.get("id"),))
        conn.execute("DELETE FROM discount_codes WHERE id = ?", (data.get("id"),))
    return jsonify({"deleted": True})


@app.route("/api/admin/demo/delete", methods=["POST"])
@require_admin
def api_admin_demo_delete():
    """Delete a demo request."""
    data = request.get_json(force=True, silent=True) or {}
    with auth.get_db() as conn:
        conn.execute("DELETE FROM demo_requests WHERE id = ?", (data.get("id"),))
    return jsonify({"deleted": True})



# ── Foundation Member Self-Recruitment Routes ──────────────────────────────────

@app.route("/join/<token>")
def foundation_recruitment_landing(token):
    """Foundation Member recruitment landing page."""
    row = auth.get_foundation_recruitment_token(token)
    if not row:
        return redirect("/referral")
    # Set a cookie so after they register they get auto-enrolled as a partner
    # sponsored by this foundation member
    resp = make_response(redirect(f"/login?mode=register&next=/referral&fm_token={token}"))
    resp.set_cookie("fm_recruit_token", token, max_age=60*60*24, samesite="Lax")
    return resp


@app.route("/api/foundation/recruit-link")
def api_foundation_recruit_link():
    """Get or create the current user's foundation member recruitment link."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    fm = auth.get_foundation_member_by_user(user["user_id"])
    if not fm:
        return jsonify({"error": "Not a Foundation Member."}), 403
    token, err = auth.get_or_create_foundation_recruitment_token(fm["id"])
    if err:
        return jsonify({"error": err}), 500
    BASE = request.host_url.rstrip("/")
    return jsonify({
        "link":  f"{BASE}/join/{token}",
        "token": token,
    })


@app.route("/api/referral/join-via-foundation", methods=["POST"])
def api_referral_join_via_foundation():
    """Complete referral partner signup when recruited by a Foundation Member."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401
    # Check for FM recruit cookie
    fm_token = request.cookies.get("fm_recruit_token") or                (request.get_json(force=True, silent=True) or {}).get("fm_token")
    if not fm_token:
        return jsonify({"error": "No recruitment token."}), 400
    row = auth.get_foundation_recruitment_token(fm_token)
    if not row:
        return jsonify({"error": "Invalid or expired recruitment link."}), 400
    # Check if already a partner
    existing = auth.get_referral_partner_by_user(user["user_id"])
    if existing:
        # Just assign sponsor if not already set
        if not existing.get("foundation_sponsor_id"):
            auth.assign_partner_sponsor(existing["id"], row["foundation_member_id"])
        return jsonify({"code": existing["code"], "already": True})
    # Create partner
    partner_id, code, err = auth.create_referral_partner(user["user_id"])
    if err:
        return jsonify({"error": err}), 500
    # Link to foundation member
    auth.assign_partner_sponsor(partner_id, row["foundation_member_id"])
    BASE = request.host_url.rstrip("/")
    referral_link = f"{BASE}/refer/{code}"
    try:
        email_service.notify_referral_welcome(user["email"], code, referral_link)
    except Exception:
        pass
    resp = make_response(jsonify({"code": code, "message": "You're now a referral partner!"}))
    resp.delete_cookie("fm_recruit_token")
    return resp


@app.route("/api/admin/foundation/recruitment-link/<int:fm_id>")
@require_admin
def api_admin_foundation_recruitment_link(fm_id):
    """Get or create recruitment link for a specific Foundation Member."""
    token, err = auth.get_or_create_foundation_recruitment_token(fm_id)
    if err:
        return jsonify({"error": err}), 500
    BASE = request.host_url.rstrip("/")
    return jsonify({"link": f"{BASE}/join/{token}", "token": token})


# ── Stripe Connect Routes ──────────────────────────────────────────────────────

@app.route("/api/admin/referral/create-connect-account", methods=["POST"])
@require_admin
def api_admin_create_connect_account():
    """Create a Stripe Connect account for a referral partner and return onboarding URL."""
    data       = request.get_json(force=True, silent=True) or {}
    partner_id = data.get("partner_id")
    email      = data.get("email", "")
    if not partner_id:
        return jsonify({"error": "partner_id required."}), 400
    try:
        import stripe as _stripe
        _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        # Create Express account
        account = _stripe.Account.create(
            type="express",
            email=email,
            capabilities={"transfers": {"requested": True}},
            settings={"payouts": {"schedule": {"interval": "manual"}}},
        )
        # Store the connect account ID
        auth.set_partner_stripe_connect_id(partner_id, account.id)
        # Create onboarding link
        BASE = request.host_url.rstrip("/")
        link = _stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{BASE}/admin",
            return_url=f"{BASE}/admin",
            type="account_onboarding",
        )
        # Send email with onboarding link
        try:
            email_service.send_stripe_connect_invite(email, email, link.url)
        except Exception:
            pass
        return jsonify({"onboarding_url": link.url, "account_id": account.id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/referral/payout", methods=["POST"])
@require_admin
def api_admin_referral_payout():
    """Transfer unpaid commissions to a partner via Stripe Connect."""
    data       = request.get_json(force=True, silent=True) or {}
    partner_id = data.get("partner_id")
    if not partner_id:
        return jsonify({"error": "partner_id required."}), 400
    try:
        import stripe as _stripe
        _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        with auth.get_db() as conn:
            partner = conn.execute(
                "SELECT rp.*, u.email FROM referral_partners rp "
                "JOIN users u ON rp.user_id = u.id WHERE rp.id = ?",
                (partner_id,)
            ).fetchone()
            unpaid = conn.execute(
                "SELECT COALESCE(SUM(commission_amount),0) as total "
                "FROM referral_conversions WHERE partner_id = ? AND paid_out = 0",
                (partner_id,)
            ).fetchone()
        if not partner:
            return jsonify({"error": "Partner not found."}), 404
        if not partner["stripe_connect_id"]:
            return jsonify({"error": "Partner has no Stripe Connect account. Send them an onboarding link first."}), 400
        total_cents = unpaid["total"]
        if total_cents <= 0:
            return jsonify({"error": "No unpaid commissions for this partner."}), 400
        # Create transfer to partner's Connect account
        transfer = _stripe.Transfer.create(
            amount=total_cents,
            currency="usd",
            destination=partner["stripe_connect_id"],
            description=f"IRS Pilot referral commissions — {partner['email']}",
        )
        # Mark as paid
        auth.mark_commissions_paid(partner_id, transfer.id)
        return jsonify({
            "success":     True,
            "transfer_id": transfer.id,
            "amount":      total_cents / 100,
            "email":       partner["email"],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/referral/payout-all", methods=["POST"])
@require_admin
def api_admin_referral_payout_all():
    """Pay all partners with Stripe Connect accounts and unpaid balances."""
    try:
        import stripe as _stripe
        _stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
        with auth.get_db() as conn:
            partners = conn.execute(
                "SELECT rp.id, rp.stripe_connect_id, u.email, "
                "COALESCE(SUM(rc.commission_amount),0) as unpaid "
                "FROM referral_partners rp "
                "JOIN users u ON rp.user_id = u.id "
                "LEFT JOIN referral_conversions rc ON rc.partner_id = rp.id AND rc.paid_out = 0 "
                "WHERE rp.active = 1 AND rp.stripe_connect_id IS NOT NULL "
                "GROUP BY rp.id HAVING unpaid > 0"
            ).fetchall()
        results = []
        for p in partners:
            try:
                transfer = _stripe.Transfer.create(
                    amount=p["unpaid"],
                    currency="usd",
                    destination=p["stripe_connect_id"],
                    description=f"IRS Pilot commissions — {p['email']}",
                )
                auth.mark_commissions_paid(p["id"], transfer.id)
                results.append({"email": p["email"], "paid": p["unpaid"]/100, "status": "ok"})
            except Exception as e:
                results.append({"email": p["email"], "status": "error", "error": str(e)})
        return jsonify({"results": results, "total_partners": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Session Overage Auto-Billing Routes ────────────────────────────────────────

@app.route("/api/admin/pro/auto-charge-overages", methods=["POST"])
@require_admin
def api_admin_auto_charge_overages():
    """Automatically charge all pro subscribers with unbilled overage sessions."""
    try:
        subs = auth.get_pro_subscribers_with_overage()
        results = []
        for sub in subs:
            unbilled = auth.get_unbilled_overage(sub["id"])
            if unbilled <= 0:
                continue
            charge_amount = unbilled * 500  # $5.00 per session in cents
            try:
                charge_id, err = stripe_checkout.charge_pro_overage(
                    sub["id"], sub["email"], unbilled
                )
                if err:
                    results.append({"email": sub["email"], "status": "error", "error": err})
                    continue
                auth.mark_overage_billed(sub["id"])
                try:
                    email_service.notify_overage_charged(
                        sub["email"], sub["firm_name"],
                        unbilled, charge_amount / 100
                    )
                except Exception:
                    pass
                results.append({
                    "email":    sub["email"],
                    "sessions": unbilled,
                    "charged":  charge_amount / 100,
                    "status":   "ok",
                })
            except Exception as e:
                results.append({"email": sub["email"], "status": "error", "error": str(e)})
        return jsonify({"results": results, "total": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/pro/overage-preview")
@require_admin
def api_admin_pro_overage_preview():
    """Preview all subscribers with unbilled overage before charging."""
    subs = auth.get_pro_subscribers_with_overage()
    preview = []
    for sub in subs:
        unbilled = auth.get_unbilled_overage(sub["id"])
        if unbilled > 0:
            preview.append({
                "id":           sub["id"],
                "email":        sub["email"],
                "firm_name":    sub["firm_name"],
                "sessions_over": unbilled,
                "charge":       unbilled * 5.0,
            })
    return jsonify({"preview": preview, "total_to_charge": sum(p["charge"] for p in preview)})

# ── Transcript Analyzer Routes ────────────────────────────────────────────────
# Add this import at the top of server.py with the other imports:
# from transcript_parser import parse_transcript
# import io

@app.route("/transcript")
def transcript_landing():
    """Transcript Analyzer landing page."""
    user = get_current_user()
    if not user:
        return redirect("/login?next=/transcript")
    html = build_page("transcript_analyzer.js", "TranscriptAnalyzer", "Transcript Analyzer — IRS Pilot")
    return Response(html, mimetype="text/html")


@app.route("/transcript/taxpayer")
def transcript_taxpayer():
    """Redirect to main transcript page — taxpayer path handled in React."""
    user = get_current_user()
    if not user:
        return redirect("/login?next=/transcript")
    return redirect("/transcript")


@app.route("/transcript/taxpro")
def transcript_taxpro():
    """Redirect to main transcript page — pro path handled in React."""
    user = get_current_user()
    if not user:
        return redirect("/login?next=/transcript")
    return redirect("/transcript")


@app.route("/api/transcript/pro-check")
def api_transcript_pro_check():
    def api_transcript_pro_check():
    user = get_current_user()
    if not user:
        return jsonify({"allowed": False, "reason": "not_logged_in"}), 401

    # Admins always get pro access
    if is_admin(user):
        return jsonify({
            "allowed": True,
            "sessions_remaining": 999,
            "sessions_used": 0,
            "sessions_limit": 999,
            "firm_name": "Taylor Tax & Financial Consulting",
            "contact_name": "Tyrone J. Taylor, EA",
        })
    """Check if current user is an active Pro Subscriber with sessions remaining."""
    user = get_current_user()
    if not user:
        return jsonify({"allowed": False, "reason": "not_logged_in"}), 401

    with auth.get_db() as conn:
        sub = conn.execute(
            "SELECT * FROM pro_subscribers WHERE user_id = ? AND active = 1",
            (user["user_id"],)
        ).fetchone()

    if not sub:
        return jsonify({"allowed": False, "reason": "not_pro_subscriber"})

    sessions_used  = sub["sessions_used"] or 0
    sessions_limit = sub["sessions_limit"] or 10
    remaining      = sessions_limit - sessions_used

    if remaining <= 0:
        return jsonify({
            "allowed":           False,
            "reason":            "no_sessions",
            "no_sessions":       True,
            "sessions_limit":    sessions_limit,
            "sessions_used":     sessions_used,
            "sessions_remaining": 0,
            "firm_name":         sub["firm_name"],
        })

    return jsonify({
        "allowed":           True,
        "sessions_remaining": remaining,
        "sessions_used":     sessions_used,
        "sessions_limit":    sessions_limit,
        "firm_name":         sub["firm_name"],
        "contact_name":      sub["contact_name"],
    })


@app.route("/api/transcript/analyze", methods=["POST"])
def api_transcript_analyze():
    """
    Parse an uploaded IRS Account Transcript PDF.
    - Taxpayer mode: requires Navigator or Wizard access
    - Pro mode: requires active Pro Subscriber with sessions remaining; deducts one session
    """
    from transcript_parser import parse_transcript
    import io as _io

    user = get_current_user()
    if not user:
        return jsonify({"error": "You must be logged in to use this feature."}), 401

    mode = request.form.get("mode", "taxpayer")

    if mode == "taxpro":
        # Pro subscriber check
        with auth.get_db() as conn:
            sub = conn.execute(
                "SELECT * FROM pro_subscribers WHERE user_id = ? AND active = 1",
                (user["user_id"],)
            ).fetchone()
        if not sub:
            return jsonify({"error": "Pro Subscriber access required."}), 403
        sessions_used  = sub["sessions_used"] or 0
        sessions_limit = sub["sessions_limit"] or 10
        if sessions_used >= sessions_limit:
            return jsonify({"error": "You have used all your sessions for this month."}), 403
    else:
        # Taxpayer — requires Navigator or Wizard access
        if not auth.has_access(user["user_id"], "navigator") and \
           not auth.has_access(user["user_id"], "wizard"):
            return jsonify({"error": "Navigator or Wizard access required."}), 403

    # Get uploaded file
    if "transcript" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["transcript"]
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    pdf_bytes = file.read()
    if len(pdf_bytes) < 1000:
        return jsonify({"error": "This file appears to be empty or corrupted."}), 400

    # Parse the transcript — never saved to disk or database
    try:
        data = parse_transcript(pdf_bytes)
    except Exception as e:
        app.logger.error(f"Transcript parse error: {e}")
        return jsonify({"error": "Could not parse this PDF. Please ensure it is an IRS Account Transcript."}), 400

    if "error" in data:
        return jsonify({"error": data["error"]}), 400

    # Deduct session for pro mode (only on successful parse)
    if mode == "taxpro":
        with auth.get_db() as conn:
            conn.execute(
                "UPDATE pro_subscribers SET sessions_used = sessions_used + 1 WHERE user_id = ? AND active = 1",
                (user["user_id"],)
            )
        app.logger.info(f"Pro transcript analysis: user {user['user_id']} — {data.get('tax_year', '?')} — session deducted")
    else:
        app.logger.info(f"Taxpayer transcript analysis: user {user['user_id']} — {data.get('tax_year', '?')}")

    return jsonify(data)


@app.route("/api/transcript/pdf", methods=["POST"])
def api_transcript_pdf():
    """
    Generate a PDF report from parsed transcript data.
    Uses ReportLab to render the Template C style report.
    Never stores any data.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    import io as _io

    user = get_current_user()
    if not user:
        return jsonify({"error": "Not logged in."}), 401

    body = request.get_json(force=True, silent=True) or {}
    data     = body.get("data", {})
    name     = body.get("name", "")
    firmName = body.get("firmName", "")
    mode     = body.get("mode", "taxpayer")

    if not data:
        return jsonify({"error": "No report data provided."}), 400

    # ── Colors ────────────────────────────────────────────────────────────────
    NAVY   = colors.HexColor("#1a2d5a")
    GREEN  = colors.HexColor("#7ec11f")
    RED    = colors.HexColor("#dc2626")
    CREAM  = colors.HexColor("#f8f6f1")
    BORDER = colors.HexColor("#e8e4dc")
    GRAY   = colors.HexColor("#666666")
    LGRAY  = colors.HexColor("#888888")

    def fmt_c(n):
        return "${:,.2f}".format(n or 0)

    buf = _io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=0.7*inch, rightMargin=0.7*inch,
        topMargin=0.6*inch, bottomMargin=0.6*inch,
        title=f"IRS Transcript Report — {name or 'Taxpayer'} — {data.get('tax_year', '')}",
    )

    # ── Styles ────────────────────────────────────────────────────────────────
    def sty(name_s, **kwargs):
        base = dict(fontName="Helvetica", fontSize=10, leading=14,
                    textColor=colors.HexColor("#333333"), spaceAfter=4)
        base.update(kwargs)
        return ParagraphStyle(name_s, **base)

    S = {
        "title":    sty("title",   fontName="Helvetica-Bold", fontSize=20, textColor=NAVY, spaceAfter=4),
        "subtitle": sty("sub",     fontSize=11, textColor=LGRAY, spaceAfter=2),
        "section":  sty("section", fontName="Helvetica-Bold", fontSize=9,  textColor=GREEN,
                        spaceBefore=14, spaceAfter=6, letterSpacing=1),
        "body":     sty("body",    fontSize=10, leading=16, textColor=colors.HexColor("#333333"), spaceAfter=6),
        "bold":     sty("bold",    fontName="Helvetica-Bold", fontSize=10, textColor=NAVY),
        "small":    sty("small",   fontSize=8,  textColor=LGRAY, spaceAfter=4),
        "event":    sty("event",   fontName="Helvetica-Bold", fontSize=10, textColor=NAVY, spaceAfter=2),
        "plain":    sty("plain",   fontSize=9,  leading=14, textColor=GRAY, spaceAfter=8),
        "amount_r": sty("amtr",    fontName="Helvetica-Bold", fontSize=10, textColor=RED,  alignment=TA_RIGHT),
        "amount_g": sty("amtg",    fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#15803d"), alignment=TA_RIGHT),
        "faq_q":    sty("faqq",    fontName="Helvetica-Bold", fontSize=10, textColor=NAVY, spaceAfter=3),
        "faq_a":    sty("faqa",    fontSize=9,  leading=14, textColor=GRAY, spaceAfter=10),
        "step":     sty("step",    fontSize=10, leading=15, textColor=colors.HexColor("#e0e0e0"), spaceAfter=6),
        "disclaimer": sty("disc",  fontSize=7.5, textColor=LGRAY, alignment=TA_CENTER, spaceAfter=0),
        "center":   sty("center",  alignment=TA_CENTER, textColor=NAVY),
    }

    story = []

    def hr(color=BORDER, thickness=1, space_before=8, space_after=8):
        story.append(Spacer(1, space_before))
        story.append(HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=space_after))

    def section_header(text):
        hr(GREEN, 1.5, 10, 4)
        story.append(Paragraph(text.upper(), S["section"]))

    # ── Header block ──────────────────────────────────────────────────────────
    header_data = [
        [Paragraph("IRS Pilot", sty("brand", fontName="Helvetica-Bold", fontSize=18, textColor=NAVY)),
         Paragraph(f"Tax Year {data.get('tax_year', '—')}", sty("year", fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, alignment=TA_RIGHT))],
        [Paragraph("Account Transcript Report", sty("doctype", fontSize=9, textColor=LGRAY, letterSpacing=1)),
         Paragraph("IRS Account Transcript Analysis", sty("doctype2", fontSize=9, textColor=LGRAY, alignment=TA_RIGHT))],
    ]
    header_tbl = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("TOPPADDING", (0,0), (-1,-1), 0),
    ]))
    story.append(header_tbl)
    hr(NAVY, 2, 4, 8)

    if name:
        story.append(Paragraph(f"Prepared for: <b>{name}</b>", S["subtitle"]))
    if firmName:
        story.append(Paragraph(f"Prepared by: {firmName}", S["small"]))
    story.append(Spacer(1, 8))

    # ── At a glance ───────────────────────────────────────────────────────────
    glance_data = [
        ["BALANCE OWED", "ACCRUED INTEREST", "TOTAL EXPOSURE"],
        [fmt_c(data.get("account_balance")),
         fmt_c(data.get("accrued_interest")),
         fmt_c(data.get("balance_plus_accruals"))],
        ["Assessed balance", f"As of {data.get('accruals_as_of', 'transcript date')}", "Not a payoff amount"],
    ]
    glance_tbl = Table(glance_data, colWidths=[2.35*inch]*3)
    glance_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0), 8),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("FONTNAME",      (0,1), (-1,1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,1), (-1,1), 13),
        ("TEXTCOLOR",     (0,1), (-1,1), RED),
        ("FONTSIZE",      (0,2), (-1,2), 7),
        ("TEXTCOLOR",     (0,2), (-1,2), LGRAY),
        ("BACKGROUND",    (0,1), (-1,2), CREAM),
        ("GRID",          (0,0), (-1,-1), 0.5, BORDER),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [NAVY, CREAM, CREAM]),
    ]))
    story.append(glance_tbl)
    story.append(Spacer(1, 10))

    # ── Urgency banner ────────────────────────────────────────────────────────
    urgency_msgs = {
        "red":    "IMMEDIATE ACTION REQUIRED",
        "yellow": "ACTION REQUIRED - ACTIVE CASE",
        "green":  "NO OUTSTANDING BALANCE",
    }
    urgency_colors = {"red": RED, "yellow": colors.HexColor("#d97706"), "green": colors.HexColor("#15803d")}
    urg = data.get("urgency", "yellow")
    urg_tbl = Table([[Paragraph(urgency_msgs.get(urg, ""), sty("urg", fontName="Helvetica-Bold", fontSize=10, textColor=colors.white, alignment=TA_CENTER))]],
                    colWidths=[7.05*inch])
    urg_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), urgency_colors.get(urg, RED)),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(urg_tbl)
    story.append(Spacer(1, 10))

    # ── What is this document ─────────────────────────────────────────────────
    section_header("What Is This Document?")
    narrative = (
        f"This is your IRS Account Transcript for tax year {data.get('tax_year', '')}. "
        "Think of it like a bank statement — but instead of showing deposits and withdrawals, "
        "it shows everything the IRS has done with your tax account for that year. "
        + (data.get("narrative") or "")
    )
    story.append(Paragraph(narrative, S["body"]))

    # ── What happened timeline ────────────────────────────────────────────────
    transactions = [t for t in (data.get("transactions") or [])
                    if t.get("amount") != 0 or t.get("code") in
                    {"150","160","170","276","300","336","520","971","706","420","460","140"}]

    if transactions:
        section_header("What Happened — In Plain English")
        for t in transactions:
            amt = t.get("amount", 0)
            amt_str = ""
            if amt > 0:
                amt_str = f"+{fmt_c(amt)}"
            elif amt < 0:
                amt_str = fmt_c(abs(amt))

            row_data = [[
                Paragraph(f"{t.get('emoji','')}", sty("em", fontSize=12, leading=14)),
                [Paragraph(t.get("title", ""), S["event"]),
                 Paragraph(t.get("date", ""), S["small"]),
                 Paragraph(t.get("plain", ""), S["plain"])],
                Paragraph(amt_str, S["amount_r"] if amt > 0 else S["amount_g"]) if amt_str else Paragraph("", S["small"]),
            ]]
            row_tbl = Table(row_data, colWidths=[0.35*inch, 5.5*inch, 1.2*inch])
            row_tbl.setStyle(TableStyle([
                ("VALIGN",        (0,0), (-1,-1), "TOP"),
                ("TOPPADDING",    (0,0), (-1,-1), 4),
                ("BOTTOMPADDING", (0,0), (-1,-1), 2),
            ]))
            story.append(row_tbl)
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=4))

    # ── FAQ ───────────────────────────────────────────────────────────────────
    faq = data.get("faq") or []
    if faq:
        section_header("Questions You Probably Have")
        for item in faq:
            story.append(Paragraph(item.get("q", ""), S["faq_q"]))
            story.append(Paragraph(item.get("a", ""), S["faq_a"]))

    # ── Resolution options ────────────────────────────────────────────────────
    opts = data.get("resolution_options") or []
    if opts:
        section_header("Your Options")
        tag_labels = {
            "likely":   "Likely Available",
            "analysis": "Requires Analysis",
            "possible": "Possible",
            "strong":   "Strong Candidate",
            "active":   "Currently Active",
            "resolved": "Resolved",
        }
        opt_data = [[
            Paragraph(f"<b>{o.get('name','')}</b><br/><font size='8' color='#666666'>{tag_labels.get(o.get('tag',''), '')}</font>", S["body"]),
            Paragraph(o.get("desc", ""), S["plain"])
        ] for o in opts]
        opt_tbl = Table(opt_data, colWidths=[1.8*inch, 5.25*inch])
        opt_tbl.setStyle(TableStyle([
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LINEBELOW",     (0,0), (-1,-2), 0.5, BORDER),
        ]))
        story.append(opt_tbl)

    # ── Next steps ────────────────────────────────────────────────────────────
    steps = data.get("next_steps") or []
    if steps:
        section_header("What Needs to Happen Next")
        for i, step in enumerate(steps):
            step_data = [[
                Paragraph(str(i+1), sty(f"sn{i}", fontName="Helvetica-Bold", fontSize=9,
                          textColor=NAVY, alignment=TA_CENTER)),
                Paragraph(step, S["body"])
            ]]
            step_tbl = Table(step_data, colWidths=[0.3*inch, 6.75*inch])
            step_tbl.setStyle(TableStyle([
                ("VALIGN",        (0,0), (-1,-1), "TOP"),
                ("TOPPADDING",    (0,0), (-1,-1), 3),
                ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ]))
            story.append(step_tbl)

    # ── Footer ────────────────────────────────────────────────────────────────
    hr(BORDER, 1, 16, 6)
    disclaimer = (
        "This report was generated by IRS Pilot based on the uploaded IRS Account Transcript. "
        "It is for informational purposes only and does not constitute legal or tax advice. "
        "Consult a qualified tax professional before taking action. "
        + (f"Prepared by {firmName}. " if firmName else "")
        + "irspilot.com"
    )
    story.append(Paragraph(disclaimer, S["disclaimer"]))

    # ── Build ─────────────────────────────────────────────────────────────────
    doc.build(story)
    buf.seek(0)

    safe_name = (name or "taxpayer").replace(" ", "-").replace("/", "-")
    year = data.get("tax_year", "report")
    filename = f"IRS-Transcript-Report-{safe_name}-{year}.pdf"

    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )
@app.route("/health")
def health():
    """Quick health check — also reports which PDF source files are present."""
    status = {
        "status": "ok",
        "fill_script": FILL_SCRIPT.exists(),
        "pdfs": {k: v.exists() for k, v in FORM_PDFS.items()},
    }
    missing = [k for k, v in status["pdfs"].items() if not v]
    if missing or not status["fill_script"]:
        status["status"] = "degraded"
        status["missing"] = missing
    return jsonify(status)


@app.route("/api/generate-form", methods=["POST"])
def generate_form():
    """
    Receive intake JSON from the React wizard, run fill_irs_forms.py,
    and stream the filled PDF back to the browser as a download.

    Expected request body:
        {
            "formType": "433f" | "433a" | "433b" | "433aoic" | "656",
            "data": { ...wizard intake data... }
        }
    """
    body = request.get_json(force=True, silent=True)
    if not body:
        return jsonify({"error": "Invalid JSON body"}), 400

    form_type = body.get("formType", "").lower().strip()
    intake_data = body.get("data", {})

    # Validate form type
    if form_type not in FORM_PDFS:
        return jsonify({"error": f"Unknown form type: {form_type}"}), 400

    # Check source PDF exists
    source_pdf = FORM_PDFS[form_type]
    if not source_pdf.exists():
        return jsonify({"error": f"Source PDF not found: {source_pdf.name}. Place IRS PDFs in the /pdfs folder."}), 500

    # Check fill script exists
    if not FILL_SCRIPT.exists():
        return jsonify({"error": "fill_irs_forms.py not found next to server.py"}), 500

    # Write intake data to a temp file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tf:
        json.dump(intake_data, tf)
        intake_path = tf.name

    # Write output to a temp file
    output_fd, output_path = tempfile.mkstemp(suffix=".pdf")
    os.close(output_fd)

    try:
        # Override the hardcoded PDF paths in fill_irs_forms.py by injecting
        # the actual PDF directory via environment variable
        env = os.environ.copy()
        env["IRS_PDF_DIR"] = str(PDF_DIR)

        result = subprocess.run(
            [sys.executable, str(FILL_SCRIPT), intake_path, form_type, output_path],
            capture_output=True, text=True, timeout=30, env=env
        )

        if result.returncode != 0:
            app.logger.error("fill_irs_forms.py error:\n%s", result.stderr)
            return jsonify({
                "error": "PDF generation failed",
                "detail": result.stderr[-500:] if result.stderr else "Unknown error"
            }), 500

        # Stream the PDF back
        taxpayer_last = (intake_data.get("personal") or {}).get("lastName", "taxpayer")
        download_name = f"IRS-{form_type.upper()}-{taxpayer_last}.pdf"

        return send_file(
            output_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=download_name
        )

    except subprocess.TimeoutExpired:
        return jsonify({"error": "PDF generation timed out after 30 seconds"}), 500

    finally:
        # Clean up temp files (output file cleanup happens after send_file streams it)
        try:
            os.unlink(intake_path)
        except OSError:
            pass
        # Note: output_path is cleaned up by OS after response; for extra safety:
        try:
            os.unlink(output_path)
        except OSError:
            pass


# ── Error Handlers ─────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "detail": str(e)}), 500


# ── Startup ────────────────────────────────────────────────────────────────────

auth.init_db()  # ensure tables exist on startup

# ── Seed admin account ─────────────────────────────────────────────────────────
def seed_admin():
    """Create admin account if it doesn't exist and ensure permanent full access."""
    admin_email    = "tjtaylor@taylortaxandfinancial.com"
    admin_password = os.environ.get("ADMIN_SEED_PASSWORD", "IRSPilot2026!")
    try:
        with auth.get_db() as conn:
            row = conn.execute(
                "SELECT id FROM users WHERE email = ?", (admin_email,)
            ).fetchone()
        if not row:
            user_id, err = auth.create_user(admin_email, admin_password)
            if err:
                app.logger.warning(f"Admin seed failed: {err}")
                return
            app.logger.info(f"Admin account created: {admin_email}")
        else:
            user_id = row["id"]

        # Grant or renew access for all products — 3650 days (10 years)
        from datetime import timedelta
        long_expiry = (__import__("datetime").datetime.utcnow() + timedelta(days=3650)).isoformat()
        with auth.get_db() as conn:
            for product in ("navigator", "wizard", "bundle"):
                existing = conn.execute(
                    "SELECT id FROM purchases WHERE user_id = ? AND product = ? "
                    "AND stripe_session_id = 'admin_permanent'",
                    (user_id, product)
                ).fetchone()
                if existing:
                    # Renew expiry
                    conn.execute(
                        "UPDATE purchases SET expires_at = ? WHERE id = ?",
                        (long_expiry, existing["id"])
                    )
                else:
                    conn.execute(
                        "INSERT INTO purchases (user_id, product, stripe_session_id, expires_at) "
                        "VALUES (?, ?, 'admin_permanent', ?)",
                        (user_id, product, long_expiry)
                    )
        app.logger.info(f"Admin access ensured for {admin_email} (10 years)")
    except Exception as e:
        app.logger.error(f"Admin seed error: {e}")

seed_admin()

# Purge any expired wizard data on startup
try:
    purged = auth.purge_expired_wizard_data()
    if purged:
        app.logger.info(f"Startup purge: cleared wizard data for {purged} user(s).")
except Exception as e:
    app.logger.error(f"Startup purge error: {e}")

if __name__ == "__main__":
    # Friendly startup checklist
    print("\n" + "="*55)
    print("  IRS Pilot — Local Server")
    print("="*55)

    issues = []

    if not FILL_SCRIPT.exists():
        issues.append(f"  ✗ fill_irs_forms.py not found at {FILL_SCRIPT}")
    else:
        print(f"  ✓ fill_irs_forms.py found")

    print(f"\n  PDF source files ({PDF_DIR}):")
    for form, path in FORM_PDFS.items():
        if path.exists():
            print(f"    ✓ {path.name}")
        else:
            issues.append(f"    ✗ {path.name} — MISSING")
            print(f"    ✗ {path.name}  ← MISSING")

    static_jsx = BASE_DIR / "static" / "irs-intake-wizard.jsx"
    if static_jsx.exists():
        print(f"\n  ✓ irs-intake-wizard.jsx found in static/")
    else:
        issues.append(f"  ✗ static/irs-intake-wizard.jsx not found")
        print(f"\n  ✗ static/irs-intake-wizard.jsx  ← MISSING")
        print(f"     Copy irs-intake-wizard.jsx into the static/ folder")

    if issues:
        print(f"\n  ⚠️  {len(issues)} issue(s) found — see above")
        print("  Server will start but some features may not work.\n")
    else:
        print(f"\n  ✓ All files present — ready to go")

    print(f"\n  ➜ Open http://localhost:5000 in your browser")
    print("="*55 + "\n")

    app.run(debug=True, host="0.0.0.0", port=5000)
