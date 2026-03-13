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
import sys
import json
import tempfile
import subprocess
from pathlib import Path
from flask import Flask, request, send_file, jsonify, Response

app = Flask(__name__, static_folder="static", static_url_path="/static")

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
  <script src="/static/compiled/COMPILED_FILE"></script>
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
    compiled_path = BASE_DIR / "static" / "compiled" / compiled_file
    if not compiled_path.exists():
        return (
            "<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2 style='color:#dc2626'>Build Error</h2>"
            f"<p>Compiled file not found: <code>{compiled_file}</code></p>"
            f"<p>Check Railway deployment logs — the build.sh script may have failed.</p>"
            "</body></html>"
        )
    page = PAGE_MID_TPL.replace("COMPILED_FILE", compiled_file)
    page = page.replace("COMPONENT_NAME", component_name)
    return PAGE_TOP + title + page


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Home page — serves the main IRS Navigator (notice lookup + situations)."""
    html = build_page(
        "irs-selfhelp-app.js",
        "IRSApp",
        "IRS Navigator — Taxpayer Self-Help"
    )
    return Response(html, mimetype="text/html")


@app.route("/wizard")
def wizard():
    """Financial intake wizard — 9-step form + PDF generation."""
    html = build_page(
        "irs-intake-wizard.js",
        "IRSIntakeWizard",
        "IRS Financial Intake Wizard"
    )
    return Response(html, mimetype="text/html")


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
