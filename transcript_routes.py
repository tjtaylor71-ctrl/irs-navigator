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
