"""
IRS Navigator — Flask Server
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

app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")

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

PAGE_MID_TPL = """</title>
  <script src="/static/vendor/react.production.min.js"></script>
  <script src="/static/vendor/react-dom.production.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; background: #f8f6f1; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="/js/COMPILED_FILE"></script>
  <script>
    try {
      const domContainer = document.getElementById('root');
      const root = ReactDOM.createRoot(domContainer);
      root.render(React.createElement(window.COMPONENT_NAME));
    } catch(e) {
      document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#dc2626"><h2>App Error</h2><pre>' + e.stack + '</pre></div>';
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
    return PAGE_TOP + title + page


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
    html = build_page("login_page.js", "LoginPage", "IRS Navigator — Sign In")
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
    access = auth.get_user_access(user["user_id"])
    return jsonify({"loggedIn": True, "email": user["email"], "access": access})


# ── Checkout placeholder (Stripe session will go here) ─────────────────────────

@app.route("/checkout")
def checkout():
    """Redirect to Stripe Checkout for the selected product."""
    user = get_current_user()
    if not user:
        product = request.args.get("product", "")
        return redirect(f"/login?product={product}&mode=register")

    product = request.args.get("product", "bundle")
    url, err = stripe_checkout.create_checkout_session(
        user["user_id"], user["email"], product
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
  h2{color:#1a1a2e;margin-bottom:8px}
  p{color:#666;margin-bottom:20px;line-height:1.6}
  .btn{display:inline-block;padding:13px 26px;background:#1a1a2e;color:#c8a96e;border:2px solid #c8a96e;border-radius:8px;font-family:Georgia,serif;font-weight:bold;font-size:15px;text-decoration:none;margin:6px}
  .btn-sec{background:transparent;color:#1a1a2e;border-color:#e8e4dc}
</style></head><body><div class="box">
  <div style="font-size:56px;margin-bottom:16px">✅</div>
  <h2>Payment Successful!</h2>
  <p>Your 7-day access is now active. You can close this tab and return anytime — your account will remember you.</p>
  <div>"""

    if has_navigator:
        html += '<a href="/navigator" class="btn">Open IRS Navigator →</a>'
    if has_wizard:
        html += '<a href="/wizard" class="btn">Open Financial Wizard →</a>'

    html += """
  </div>
  <p style="margin-top:24px;font-size:13px">Need help? <a href="https://www.calendly.com/taylor-tax-financial/tax-help" style="color:#1a1a2e">Schedule a consultation</a></p>
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
    html = build_page("irs-selfhelp-app.js", "IRSApp", "IRS Navigator — Taxpayer Self-Help")
    return Response(html, mimetype="text/html")


@app.route("/navigator")
@require_access("navigator")
def navigator():
    """Full IRS Navigator — requires navigator or bundle access."""
    html = build_page("irs-selfhelp-app.js", "IRSApp", "IRS Navigator — Taxpayer Self-Help")
    return Response(html, mimetype="text/html")


@app.route("/wizard")
@require_access("wizard")
def wizard():
    """Financial intake wizard — 9-step form + PDF generation."""
    html = build_page(
        "irs-intake-wizard.js",
        "IRSIntakeWizard",
        "IRS Financial Intake Wizard"
    )
    return Response(html, mimetype="text/html")


@app.route("/pricing")
def pricing():
    """Pricing page."""
    html = build_page(
        "pricing_page.js",
        "PricingPage",
        "IRS Navigator — Pricing"
    )
    return Response(html, mimetype="text/html")


@app.route("/account")
def account_dashboard():
    """Account dashboard — redirects to login if not authenticated."""
    html = build_page("dashboard_page.js", "DashboardPage", "My Account — IRS Navigator")
    return Response(html, mimetype="text/html")


@app.route("/forgot-password")
def forgot_password_page():
    html = build_page("reset_page.js", "ResetPage", "Forgot Password — IRS Navigator")
    return Response(html, mimetype="text/html")


@app.route("/reset-password")
def reset_password_page():
    html = build_page("reset_page.js", "ResetPage", "Reset Password — IRS Navigator")
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
    html = build_page("admin_page.js", "AdminPage", "Admin — IRS Navigator")
    return Response(html, mimetype="text/html")


@app.route("/api/admin/data")
@require_admin
def api_admin_data():
    with auth.get_db() as conn:
        users = conn.execute(
            "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        purchases = conn.execute(
            "SELECT id, user_id, product, expires_at, created_at FROM purchases "
            "WHERE expires_at > datetime('now') ORDER BY created_at DESC"
        ).fetchall()

    purchase_map = {}
    for p in purchases:
        uid = p["user_id"]
        if uid not in purchase_map:
            purchase_map[uid] = []
        purchase_map[uid].append({"id": p["id"], "product": p["product"], "expires_at": p["expires_at"]})

    user_list = []
    for u in users:
        user_list.append({
            "id":         u["id"],
            "email":      u["email"],
            "created_at": u["created_at"],
            "purchases":  purchase_map.get(u["id"], []),
        })

    all_purchases = conn.execute(
        "SELECT product FROM purchases WHERE expires_at > datetime('now')"
    ).fetchall() if False else purchases  # reuse above

    nav_count = sum(1 for p in purchases if p["product"] in ("navigator", "bundle"))
    wiz_count = sum(1 for p in purchases if p["product"] in ("wizard", "bundle"))

    return jsonify({
        "users": user_list,
        "stats": {
            "total_users":       len(users),
            "active_purchases":  len(purchases),
            "navigator_count":   nav_count,
            "wizard_count":      wiz_count,
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
    html = build_page("letter_generator.js", "LetterGenerator", "Letter Generator — IRS Navigator")
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

Instructions:
- Use standard formal letter format: date, taxpayer address block, IRS address block, RE: line, salutation, body paragraphs, closing, signature line
- Be concise, factual, and professional
- Cite relevant IRC sections or IRM procedures where appropriate
- Include a clear specific request or proposed action
- Today's date: {today}
- IRS address block: Internal Revenue Service / [Appropriate IRS Campus]
- Sign off as the taxpayer (use name from form data)
- Do not add disclaimers or notes outside the letter itself"""

    payload = json_lib.dumps({
        "model": "claude-sonnet-4-20250514",
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
        return jsonify({"error": f"API error {e.code}"}), 500
    except Exception as e:
        app.logger.error(f"Letter generation error: {e}")
        return jsonify({"error": "Letter generation failed. Please try again."}), 500


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

if __name__ == "__main__":
    # Friendly startup checklist
    print("\n" + "="*55)
    print("  IRS Navigator — Local Server")
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
