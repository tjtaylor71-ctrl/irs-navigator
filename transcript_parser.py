"""
IRS Account Transcript Parser
Extracts structured data from IRS Account Transcript PDFs.
Returns a dict ready for the report generator.
"""

import re
from pathlib import Path


# ── Transaction Code Lookup ───────────────────────────────────────────────────

TRANSACTION_CODES = {
    "150": {
        "title": "IRS Filed a Return on Your Behalf",
        "plain": "You did not file a tax return, so the IRS created one for you. This is called a Substitute for Return (SFR). It typically does not include deductions or credits you could have claimed, and usually results in a higher tax bill than if you had filed yourself.",
        "severity": "red",
        "emoji": "⚠️",
    },
    "160": {
        "title": "Failure-to-File Penalty Assessed",
        "plain": "The IRS charged a penalty because your return was filed after the due date. This penalty is typically 5% of the unpaid tax per month, up to 25% of the total tax owed.",
        "severity": "red",
        "emoji": "💸",
    },
    "170": {
        "title": "Failure-to-Pay Estimated Tax Penalty",
        "plain": "A penalty was charged because estimated tax payments were not made or were insufficient during the year.",
        "severity": "yellow",
        "emoji": "💸",
    },
    "276": {
        "title": "Failure-to-Pay Penalty Assessed",
        "plain": "The IRS charged a penalty because taxes were not paid by the due date. This penalty is typically 0.5% per month on the unpaid balance, up to 25% of the total tax owed.",
        "severity": "red",
        "emoji": "💸",
    },
    "300": {
        "title": "Additional Tax Assessed by Examination (Audit)",
        "plain": "After reviewing your tax return or records, the IRS determined that you owe more tax than originally reported or assessed. This is the result of an audit or examination.",
        "severity": "red",
        "emoji": "🔍",
    },
    "336": {
        "title": "Interest Charged for Late Payment",
        "plain": "The IRS charged interest on the unpaid tax balance from the original due date until the date of assessment. Interest continues to accrue daily until the balance is paid in full.",
        "severity": "red",
        "emoji": "📈",
    },
    "420": {
        "title": "IRS Audit/Examination Opened",
        "plain": "The IRS opened a formal examination of your tax return. This began the audit process.",
        "severity": "yellow",
        "emoji": "🔍",
    },
    "421": {
        "title": "Audit/Examination Closed",
        "plain": "The IRS completed its examination of your tax return.",
        "severity": "gray",
        "emoji": "✅",
    },
    "460": {
        "title": "Extension of Time to File Granted",
        "plain": "An extension was granted, giving you additional time to file your tax return. Note: an extension to file is not an extension to pay — taxes were still due on the original deadline.",
        "severity": "gray",
        "emoji": "📋",
    },
    "520": {
        "title": "Bankruptcy or Legal Action Filed — Collection Suspended",
        "plain": "A bankruptcy filing or other legal action has temporarily stopped the IRS from taking collection action on this account. This protection is called an 'automatic stay.' Interest continues to accrue even while collection is paused.",
        "severity": "green",
        "emoji": "🛡️",
    },
    "570": {
        "title": "Additional Action Pending on Account",
        "plain": "The IRS has placed a hold on this account while additional processing or review is completed. This temporarily prevents automated collection activity.",
        "severity": "yellow",
        "emoji": "⏸️",
    },
    "595": {
        "title": "Account Referred for Review",
        "plain": "This account was referred to an IRS unit for further review or action.",
        "severity": "yellow",
        "emoji": "📂",
    },
    "706": {
        "title": "Credit Transferred In from Another Tax Year",
        "plain": "An overpayment or credit from a different tax year was applied to reduce the balance on this account.",
        "severity": "green",
        "emoji": "✅",
    },
    "140": {
        "title": "IRS Inquiry for Non-Filing",
        "plain": "The IRS identified that a tax return had not been filed and began its non-filing inquiry process.",
        "severity": "yellow",
        "emoji": "📬",
    },
    "960": {
        "title": "Representative Appointed",
        "plain": "A power of attorney or tax information authorization was recorded, authorizing a representative to act on the taxpayer's behalf.",
        "severity": "gray",
        "emoji": "👤",
    },
    "971": {
        "title": "Notice Issued / Action Taken",
        "plain": "The IRS issued a notice or recorded a significant action on this account. The specific notice or action is described in the detail.",
        "severity": "yellow",
        "emoji": "📬",
    },
}

NOTICE_PLAIN = {
    "CP 0059": "IRS non-filing notice — The IRS formally requested the missing tax return.",
    "CP 0022": "IRS examination change notice — The IRS notified the taxpayer of the audit results and the additional tax, penalties, and interest assessed.",
    "CP 0014": "Balance due notice — The IRS notified the taxpayer that a balance is owed.",
    "CP 0501": "First balance due reminder notice.",
    "CP 0503": "Second balance due reminder — urgency increases.",
    "CP 0504": "Final notice before levy — The IRS intends to seize property.",
    "LT 0011": "Final Notice of Intent to Levy — taxpayer's right to a hearing is triggered.",
}


# ── Parser ────────────────────────────────────────────────────────────────────

def parse_transcript(pdf_bytes: bytes) -> dict:
    """
    Parse an IRS Account Transcript PDF.
    Returns structured dict with all extracted fields.
    """
    import pdfplumber, io

    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
    except Exception as e:
        return {"error": f"Could not read PDF: {str(e)}"}

    if not text.strip():
        return {"error": "Could not extract text from this PDF. Please ensure it is a text-based IRS transcript, not a scanned image."}

    result = {}

    # ── Header fields ─────────────────────────────────────────────────────────
    result["form_number"]  = _extract(r"FORM NUMBER:\s+(\S+)", text) or "1040"
    result["tax_period"]   = _extract(r"TAX PERIOD:\s+(.+?)(?:\n|$)", text) or ""
    result["tax_year"]     = _extract_year(result["tax_period"])
    result["taxpayer_id"]  = _extract(r"TAXPAYER IDENTIFICATION NUMBER:\s+(\S+)", text) or "XXX-XX-XXXX"
    result["spouse_id"]    = _extract(r"SPOUSE TAXPAYER IDENTIFICATION NUMBER:\s+(\S+)", text) or ""
    result["taxpayer_name"]= _extract_name(text)
    result["request_date"] = _extract(r"Request Date:\s+(.+?)(?:\n|$)", text) or ""
    result["poa_on_file"]  = "POWER OF ATTORNEY" in text.upper()

    # ── Balance fields ────────────────────────────────────────────────────────
    result["account_balance"]   = _extract_amount(r"ACCOUNT BALANCE:\s+([\d,]+\.?\d*)", text)
    result["accrued_interest"]  = _extract_amount(r"ACCRUED INTEREST:\s+([\d,]+\.?\d*)", text)
    result["accrued_penalty"]   = _extract_amount(r"ACCRUED PENALTY:\s+([\d,]+\.?\d*)", text)
    result["balance_plus_accruals"] = _extract_amount(
        r"ACCOUNT BALANCE PLUS ACCRUALS[^\n]*\n[^\n]*\(this is not a payoff amount\):\s+([\d,]+\.?\d*)", text
    ) or _extract_amount(r"this is not a payoff amount\):\s+([\d,]+\.?\d*)", text)
    result["accruals_as_of"]    = _extract(r"ACCRUED INTEREST:\s+[\d,]+\.?\d*\s+AS OF:\s+(.+?)(?:\n|$)", text) or ""

    # ── Return info ───────────────────────────────────────────────────────────
    result["filing_status"]     = _extract(r"FILING STATUS:\s+(.+?)(?:\n|$)", text) or ""
    result["agi"]               = _extract_amount(r"ADJUSTED GROSS INCOME:\s+([\d,]+\.?\d*)", text)
    result["taxable_income"]    = _extract_amount(r"TAXABLE INCOME:\s+([\d,]+\.?\d*)", text)
    result["tax_per_return"]    = _extract_amount(r"TAX PER RETURN:\s+([\d,]+\.?\d*)", text)
    result["se_income_taxpayer"]= _extract_amount(r"SE TAXABLE INCOME TAXPAYER:\s+([\d,]+\.?\d*)", text)
    result["se_tax"]            = _extract_amount(r"TOTAL SELF EMPLOYMENT TAX:\s+([\d,]+\.?\d*)", text)
    result["return_due_date"]   = _extract(r"RETURN DUE DATE OR RETURN RECEIVED DATE[^\n]*\s+(.+?)(?:\n|$)", text) or ""
    result["processing_date"]   = _extract(r"PROCESSING DATE\s+(.+?)(?:\n|$)", text) or ""

    # ── Transactions ──────────────────────────────────────────────────────────
    result["transactions"] = _parse_transactions(text)

    # ── Derived flags ─────────────────────────────────────────────────────────
    codes = [t["code"] for t in result["transactions"]]
    result["has_sfr"]           = "150" in codes
    result["has_audit"]         = "300" in codes or "420" in codes
    result["has_levy_notice"]   = any(
        t["code"] == "971" and ("LEVY" in t.get("detail", "").upper() or "INTENT TO LEVY" in t.get("detail", "").upper())
        for t in result["transactions"]
    )
    result["has_cdp_hearing"]   = any(
        t["code"] == "971" and "COLLECTION DUE PROCESS" in t.get("detail", "").upper()
        for t in result["transactions"]
    )
    result["has_bankruptcy"]    = "520" in codes
    result["has_lien"]          = any(
        t["code"] == "971" and "LIEN" in t.get("detail", "").upper()
        for t in result["transactions"]
    )
    result["has_credits"]       = "706" in codes

    # ── Total assessed penalties ──────────────────────────────────────────────
    penalty_codes = {"160", "170", "276"}
    result["total_penalties_assessed"] = sum(
        t["amount"] for t in result["transactions"]
        if t["code"] in penalty_codes and t["amount"] > 0
    )

    # ── Total assessed interest ───────────────────────────────────────────────
    result["total_interest_assessed"] = sum(
        t["amount"] for t in result["transactions"]
        if t["code"] == "336" and t["amount"] > 0
    )

    # ── Total tax assessed ────────────────────────────────────────────────────
    result["total_tax_assessed"] = sum(
        t["amount"] for t in result["transactions"]
        if t["code"] in {"150", "290", "300"} and t["amount"] > 0
    )

    # ── Credits applied ───────────────────────────────────────────────────────
    result["total_credits_applied"] = sum(
        abs(t["amount"]) for t in result["transactions"]
        if t["code"] == "706"
    )

    # ── Urgency level ─────────────────────────────────────────────────────────
    result["urgency"] = _determine_urgency(result)

    # ── Narrative ─────────────────────────────────────────────────────────────
    result["narrative"] = _build_narrative(result)

    # ── Resolution options ────────────────────────────────────────────────────
    result["resolution_options"] = _suggest_resolutions(result)

    # ── FAQ answers ───────────────────────────────────────────────────────────
    result["faq"] = _build_faq(result)

    # ── Next steps ────────────────────────────────────────────────────────────
    result["next_steps"] = _build_next_steps(result)

    return result


# ── Helper extractors ─────────────────────────────────────────────────────────

def _extract(pattern, text, flags=re.IGNORECASE):
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def _extract_amount(pattern, text):
    val = _extract(pattern, text)
    if val is None:
        return 0.0
    try:
        return float(val.replace(",", ""))
    except Exception:
        return 0.0


def _extract_year(period_str):
    if not period_str:
        return ""
    m = re.search(r"(\d{4})", period_str)
    return m.group(1) if m else ""


def _extract_name(text):
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if "TAXPAYER IDENTIFICATION NUMBER" in line.upper():
            # Name is usually 1-2 lines before or after
            for offset in [-2, -1, 1, 2]:
                idx = i + offset
                if 0 <= idx < len(lines):
                    candidate = lines[idx].strip()
                    if candidate and not any(kw in candidate.upper() for kw in [
                        "SPOUSE", "NUMBER", "FORM", "TAX PERIOD", "REQUEST",
                        "RESPONSE", "TRACKING", "PRODUCT", "POWER", "MINUS"
                    ]):
                        if re.match(r"^[A-Z][A-Z\s]+$", candidate):
                            return candidate.title()
    return ""


def _parse_transactions(text):
    """Parse the TRANSACTIONS section into a list of dicts."""
    transactions = []

    trans_match = re.search(r"TRANSACTIONS\s*\n", text, re.IGNORECASE)
    if not trans_match:
        return transactions

    trans_text = text[trans_match.end():]
    lines = [l.rstrip() for l in trans_text.split("\n")]

    i = 0
    # Skip the header line "CODE EXPLANATION OF TRANSACTION CYCLE DATE AMOUNT"
    while i < len(lines) and "CODE" in lines[i].upper() and "EXPLANATION" in lines[i].upper():
        i += 1

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue

        # Match line starting with a 3-digit transaction code
        m = re.match(r"^(\d{3})\s+(.+)", line)
        if not m:
            i += 1
            continue

        code = m.group(1)
        rest = m.group(2).strip()

        # Extract date MM-DD-YYYY at end (before amount)
        date_m = re.search(r"(\d{2}-\d{2}-\d{4})\s+", rest)
        date_str = date_m.group(1) if date_m else ""

        # Extract amount (may be negative with -)
        amt_m = re.search(r"-?\$?([\d,]+\.\d{2})$", rest)
        raw_amt = rest[amt_m.start():] if amt_m else ""
        amount = float(amt_m.group(1).replace(",", "")) if amt_m else 0.0
        if raw_amt.startswith("-"):
            amount = -amount

        # Description: everything before the cycle code (8 digits) or date
        # Remove cycle code (8 digits like 20220405) and date and amount
        desc = rest
        desc = re.sub(r"\s+\d{8}\s+", " ", desc)           # remove cycle
        desc = re.sub(r"\s+\d{2}-\d{2}-\d{4}\s+", " ", desc)  # remove date
        desc = re.sub(r"\s+-?\$[\d,]+\.\d{2}$", "", desc)    # remove amount
        desc = re.sub(r"\s+ext\. Date \S+", "", desc)         # remove ext date
        desc = desc.strip()

        # Collect continuation / detail lines (next lines that don't start with a code)
        detail_parts = []
        j = i + 1
        while j < len(lines):
            next_line = lines[j].strip()
            if not next_line:
                j += 1
                break
            # Stop if next line starts a new transaction (3-digit code + space)
            if re.match(r"^\d{3}\s+", next_line):
                break
            # Skip n/a reference numbers
            if re.match(r"^n/a\s+", next_line, re.IGNORECASE):
                j += 1
                continue
            # Skip numeric-only continuation lines (wrapped numbers like "2015")
            if re.match(r"^\d{4}$", next_line):
                j += 1
                continue
            # Skip "00-00-0000" lines
            if next_line == "00-00-0000":
                j += 1
                continue
            detail_parts.append(next_line)
            j += 1

        detail = " ".join(detail_parts).strip()
        i = j

        code_info = TRANSACTION_CODES.get(code, {})

        # Build full detail context (desc + continuation)
        full_detail = (desc + " " + detail).strip()

        transactions.append({
            "code":     code,
            "title":    code_info.get("title", desc),
            "plain":    _enrich_plain(code_info.get("plain", desc), full_detail),
            "detail":   full_detail,
            "date":     _normalize_date(date_str),
            "amount":   amount,
            "severity": code_info.get("severity", "gray"),
            "emoji":    code_info.get("emoji", "📋"),
        })

    return transactions


def _enrich_plain(plain, detail):
    """Add notice-specific language to generic plain text."""
    if not detail:
        return plain
    detail_upper = detail.upper()
    for notice_key, notice_plain in NOTICE_PLAIN.items():
        if notice_key.replace(" ", "") in detail_upper.replace(" ", ""):
            return notice_plain
    if "INTENT TO LEVY" in detail_upper:
        return "The IRS issued a formal warning that it intends to seize assets — bank accounts, wages, or other property — to collect the unpaid balance. You had 30 days from receipt to request a Collection Due Process (CDP) hearing to stop the levy."
    if "COLLECTION DUE PROCESS" in detail_upper and "REQUEST" in detail_upper:
        return "A Collection Due Process (CDP) hearing was requested. This temporarily stops all IRS levy action while the hearing is pending. This is one of the most powerful taxpayer protections available — use it to propose a resolution."
    if "COLLECTION DUE PROCESS" in detail_upper and "TIMELY" in detail_upper:
        return "The CDP hearing request was confirmed as timely filed. The IRS cannot levy while this hearing is pending."
    if "BANKRUPTCY" in detail_upper:
        return "A bankruptcy filing was recorded. Under federal bankruptcy law (11 U.S.C. §362), the automatic stay prevents the IRS from taking any collection action while the bankruptcy is active. Interest continues to accrue."
    if "LEVY PROGRAM" in detail_upper and "BLOCKED" in detail_upper:
        return "This account was temporarily blocked from the IRS automated levy program, preventing automated levies on wages and bank accounts."
    return plain


def _normalize_date(date_str):
    """Convert MM-DD-YYYY to Month YYYY for display."""
    if not date_str:
        return ""
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str, "%m-%d-%Y")
        return dt.strftime("%B %d, %Y")
    except Exception:
        return date_str


def _determine_urgency(data):
    """Red / Yellow / Green based on account status."""
    if data.get("has_levy_notice") and not (data.get("has_cdp_hearing") or data.get("has_bankruptcy")):
        return "red"
    if data.get("has_cdp_hearing") or data.get("has_bankruptcy"):
        return "yellow"
    if data.get("account_balance", 0) > 0:
        return "yellow"
    return "green"


def _build_narrative(data):
    """Build a plain-English narrative of what happened."""
    parts = []
    year = data.get("tax_year", "this year")
    name = data.get("taxpayer_name", "The taxpayer")

    if data.get("has_sfr"):
        parts.append(
            f"No tax return was filed for {year}. The IRS eventually prepared a "
            f"Substitute for Return (SFR) — its own version of the return — which "
            f"typically does not include all deductions and credits the taxpayer could have claimed."
        )
    else:
        parts.append(f"A tax return was filed for {year}.")

    if data.get("has_audit"):
        tax = data.get("total_tax_assessed", 0)
        if tax > 0:
            parts.append(
                f"Following an examination (audit), the IRS assessed ${tax:,.2f} in additional tax."
            )

    penalties = data.get("total_penalties_assessed", 0)
    interest = data.get("total_interest_assessed", 0)
    if penalties > 0:
        parts.append(
            f"Penalties of ${penalties:,.2f} were added — these include charges for "
            f"filing late and/or paying late."
        )
    if interest > 0:
        parts.append(
            f"Interest of ${interest:,.2f} was charged on the unpaid balance from the "
            f"original due date through the date of assessment. Interest continues to "
            f"accrue daily until the full balance is paid."
        )

    credits = data.get("total_credits_applied", 0)
    if credits > 0:
        parts.append(
            f"Credits of ${credits:,.2f} were applied from other tax years, reducing the balance."
        )

    balance = data.get("account_balance", 0)
    if balance > 0:
        parts.append(
            f"The current account balance is ${balance:,.2f}, with additional "
            f"interest accruing daily."
        )

    if data.get("has_bankruptcy"):
        parts.append(
            "A bankruptcy filing is currently in effect, which temporarily suspends "
            "all IRS collection activity under the automatic stay."
        )
    elif data.get("has_cdp_hearing"):
        parts.append(
            "A Collection Due Process (CDP) hearing request has been filed, which "
            "temporarily prevents the IRS from levying assets while the hearing is pending."
        )
    elif data.get("has_levy_notice"):
        parts.append(
            "The IRS has issued a Notice of Intent to Levy. Immediate action is required "
            "to prevent seizure of wages, bank accounts, or other assets."
        )

    return " ".join(parts)


def _suggest_resolutions(data):
    """Suggest resolution options based on transcript data."""
    options = []
    balance = data.get("account_balance", 0)

    if balance <= 0:
        return [{"name": "No Balance Due", "desc": "This account shows no outstanding balance.", "tag": "resolved"}]

    options.append({
        "name": "Installment Agreement",
        "desc": "Structured monthly payments over up to 72 months. Stops levy action while the agreement is active.",
        "tag": "likely",
    })

    options.append({
        "name": "Offer in Compromise",
        "desc": "Settle for less than the full balance based on your ability to pay. Requires Form 433-A and detailed financial disclosure.",
        "tag": "analysis",
    })

    options.append({
        "name": "Currently Not Collectible (CNC)",
        "desc": "If monthly expenses exceed income, the IRS may defer collection. Interest continues to accrue but no active collection occurs.",
        "tag": "possible",
    })

    penalties = data.get("total_penalties_assessed", 0)
    if penalties > 0:
        options.append({
            "name": "Penalty Abatement",
            "desc": f"${penalties:,.2f} in assessed penalties may be reducible through First-Time Abatement or Reasonable Cause. Abating penalties also removes the interest charged on those penalties.",
            "tag": "strong",
        })

    if data.get("has_cdp_hearing"):
        options.append({
            "name": "CDP Hearing Resolution",
            "desc": "The active CDP hearing provides the formal opportunity to propose any resolution option and appeal to Tax Court if the IRS disagrees.",
            "tag": "active",
        })

    return options


def _build_faq(data):
    """Build FAQ answers tailored to this transcript."""
    faq = []
    balance = data.get("account_balance", 0)
    penalties = data.get("total_penalties_assessed", 0)
    interest = data.get("total_interest_assessed", 0)

    if balance > 0:
        faq.append({
            "q": "Why is the balance so high?",
            "a": (
                f"The assessed tax was ${data.get('total_tax_assessed', 0):,.2f}. "
                + (f"Penalties of ${penalties:,.2f} were added for filing and/or paying late. " if penalties > 0 else "")
                + (f"Interest of ${interest:,.2f} was charged from the original due date. " if interest > 0 else "")
                + "Together, these additions significantly increased the total amount owed."
            )
        })

    if penalties > 0:
        faq.append({
            "q": "Can the penalties be reduced?",
            "a": f"Possibly yes. The ${penalties:,.2f} in assessed penalties may be eligible for removal through a process called penalty abatement. The IRS offers First-Time Abatement for taxpayers with a clean compliance history, or Reasonable Cause abatement if there was a legitimate reason for the late filing or payment. If penalties are abated, the interest charged on those penalties is also removed."
        })

    if data.get("has_levy_notice") and not data.get("has_cdp_hearing") and not data.get("has_bankruptcy"):
        faq.append({
            "q": "Can the IRS take my money right now?",
            "a": "The IRS has issued a levy notice and may be able to seize wages or bank accounts. Immediate action is required — contact a tax professional right away to discuss your options before collection begins."
        })
    elif data.get("has_cdp_hearing") or data.get("has_bankruptcy"):
        faq.append({
            "q": "Is the IRS going to take my money right now?",
            "a": "No — not right now. The CDP hearing request and/or bankruptcy filing currently prevent the IRS from levying. However, this protection is temporary, and interest continues to accrue daily. A resolution should be actively pursued."
        })

    if data.get("has_sfr"):
        faq.append({
            "q": "Can I file my own return to replace the one the IRS filed?",
            "a": "Yes. Even though the IRS filed a Substitute for Return, you generally have the right to file your own original return, which may include deductions and credits the IRS did not include. A tax professional can advise whether this would reduce the balance owed."
        })

    faq.append({
        "q": "Does the IRS have to accept less than the full amount?",
        "a": "The IRS has a program called the Offer in Compromise that allows taxpayers to settle for less than the full amount owed, based on their ability to pay. Whether you qualify depends on your current income, expenses, and assets. Your tax professional can analyze this."
    })

    return faq


def _build_next_steps(data):
    """Build prioritized next steps."""
    steps = []
    balance = data.get("account_balance", 0)

    if data.get("has_levy_notice") and not data.get("has_cdp_hearing") and not data.get("has_bankruptcy"):
        steps.append("Contact a tax professional immediately — the IRS has issued a levy notice and collection action may be imminent.")

    if data.get("has_cdp_hearing"):
        steps.append("Prepare a resolution proposal for your CDP hearing. This is the formal opportunity to present an installment agreement, Offer in Compromise, or other resolution to the IRS.")

    if data.get("total_penalties_assessed", 0) > 0:
        steps.append(f"Request penalty abatement for the ${data['total_penalties_assessed']:,.2f} in assessed penalties. First-Time Abatement or Reasonable Cause may eliminate some or all of these charges.")

    steps.append("Gather your current financial information — income, expenses, assets, and liabilities. This is required to evaluate any resolution option and to complete Form 433-A or 433-F.")

    steps.append("Confirm that all other tax years are filed and current. The IRS will not enter into any resolution agreement until all required returns have been filed.")

    if balance > 0:
        steps.append(f"Evaluate whether an Offer in Compromise or installment agreement is the best path given your current financial situation. Your tax professional can calculate your Reasonable Collection Potential (RCP).")

    return steps
