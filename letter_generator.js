const { useState, useEffect, useRef, useCallback, useMemo } = React;

function LetterGenerator() {
  const [mode, setMode] = React.useState("choose");
  const [letterType, setLetterType] = React.useState("");
  const [formData, setFormData] = React.useState({});
  const [letter, setLetter] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const set = (k, v) => setFormData((p) => ({ ...p, [k]: v }));
  const NOTICE_LETTERS = [
    { id: "cp14_response", label: "CP14 \u2014 Response to Balance Due Notice", desc: "Dispute the balance, request payment plan, or explain circumstances" },
    { id: "cp2000_response", label: "CP2000 \u2014 Response to Underreporter Notice", desc: "Agree, partially agree, or dispute the proposed changes" },
    { id: "cp503_response", label: "CP503 \u2014 Second Balance Due Reminder", desc: "Respond before enforcement action begins" },
    { id: "cp504_response", label: "CP504 \u2014 Final Notice Before Levy", desc: "Urgent response \u2014 request collection hold or propose resolution" },
    { id: "audit_response", label: "Audit Notice \u2014 Response & Document Request", desc: "Respond to examination and request documents list" }
  ];
  const RESOLUTION_LETTERS = [
    { id: "cdp_hearing", label: "CDP Hearing Request (LT11 / CP90)", desc: "Request Collection Due Process hearing to stop levy action" },
    { id: "cnc_request", label: "Currently Not Collectible (CNC) Request", desc: "Request hardship status when unable to pay any amount" },
    { id: "ia_request", label: "Installment Agreement Request", desc: "Propose a monthly payment plan to ACS or Revenue Officer" },
    { id: "ppia_request", label: "Partial Pay Installment Agreement (PPIA)", desc: "Propose payments less than full balance based on ability to pay" },
    { id: "penalty_abate", label: "Penalty Abatement \u2014 First Time Abatement", desc: "Request removal of failure-to-file or failure-to-pay penalties" },
    { id: "levy_release", label: "Levy Release Request", desc: "Request release of bank or wage levy causing economic hardship" }
  ];
  const FIELDS = {
    cp14_response: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceShown", "responseType", "explanation"],
    cp2000_response: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "proposedAmount", "agreeDisagree", "explanation", "supportingDocs"],
    cp503_response: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceShown", "proposedResolution", "explanation"],
    cp504_response: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceShown", "proposedResolution", "explanation"],
    audit_response: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "noticeDate", "auditType", "explanation"],
    cdp_hearing: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "noticeType", "noticeDate", "hearingReason"],
    cnc_request: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceOwed", "monthlyIncome", "monthlyExpenses", "hardshipExplanation"],
    ia_request: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceOwed", "proposedPayment", "firstPaymentDate", "explanation"],
    ppia_request: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "balanceOwed", "proposedPayment", "firstPaymentDate", "explanation"],
    penalty_abate: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "penaltyAmount", "penaltyType", "reasonableExplanation"],
    levy_release: ["taxpayerName", "taxpayerAddress", "ssn", "taxYear", "levyType", "bankOrEmployer", "hardshipExplanation"]
  };
  const FIELD_LABELS = {
    taxpayerName: "Your Full Legal Name",
    taxpayerAddress: "Your Address (Street, City, State, ZIP)",
    ssn: "SSN / EIN (last 4 digits only for display)",
    taxYear: "Tax Year(s) in Question",
    balanceShown: "Balance Shown on Notice ($)",
    balanceOwed: "Total Balance Owed ($)",
    proposedAmount: "IRS Proposed Amount ($)",
    responseType: "Response Type",
    agreeDisagree: "Do you agree with the IRS position?",
    noticeDate: "Notice Date",
    noticeType: "Notice Type (LT11 or CP90)",
    hearingReason: "Reason for Requesting CDP Hearing",
    auditType: "Type of Audit (correspondence / office / field)",
    monthlyIncome: "Total Monthly Household Income ($)",
    monthlyExpenses: "Total Monthly Allowable Expenses ($)",
    proposedPayment: "Your Proposed Monthly Payment ($)",
    firstPaymentDate: "Proposed First Payment Date",
    penaltyAmount: "Penalty Amount ($)",
    penaltyType: "Penalty Type (failure-to-file / failure-to-pay / both)",
    levyType: "Levy Type (bank / wage)",
    bankOrEmployer: "Bank Name or Employer Name",
    proposedResolution: "Proposed Resolution",
    explanation: "Explanation / Circumstances",
    hardshipExplanation: "Hardship Explanation",
    reasonableExplanation: "Reasonable Cause Explanation",
    supportingDocs: "Supporting Documents You Will Attach"
  };
  const TEXTAREA_FIELDS = ["explanation", "hardshipExplanation", "reasonableExplanation", "hearingReason", "supportingDocs"];
  const SELECT_FIELDS = {
    responseType: ["Dispute the balance", "Request installment agreement", "Request currently not collectible status", "Request offer in compromise consideration", "Explain circumstances / request time"],
    agreeDisagree: ["I fully agree", "I partially agree", "I disagree"],
    proposedResolution: ["Installment agreement", "Currently not collectible", "Offer in compromise", "Full payment", "Request more time"]
  };
  const generateLetter = async () => {
    setLoading(true);
    const allLetters = [...NOTICE_LETTERS, ...RESOLUTION_LETTERS];
    const typeDef = allLetters.find((l) => l.id === letterType);
    try {
      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType,
          letterLabel: typeDef?.label,
          formData,
          fieldLabels: FIELD_LABELS
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error generating letter.");
        setLoading(false);
        return;
      }
      setLetter(data.letter);
      setMode("preview");
    } catch (e) {
      alert("Error generating letter. Please try again.");
    }
    setLoading(false);
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter).then(() => alert("Letter copied to clipboard!"));
  };
  const printLetter = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>IRS Letter</title><style>body{font-family:Times New Roman,serif;font-size:12pt;line-height:1.6;margin:1in;color:#000}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${letter}</pre></body></html>`);
    w.document.close();
    w.print();
  };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 7, border: "1.5px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" };
  const card = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "24px", marginBottom: 20 };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Response Letter Generator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "PROFESSIONAL CORRESPONDENCE"))), /* @__PURE__ */ React.createElement("a", { href: "/navigator", style: { color: "#aaa", fontSize: 13, textDecoration: "none", border: "1px solid #444", padding: "6px 14px", borderRadius: 6 } }, "\u2190 Navigator"))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", padding: "32px 24px" } }, mode === "choose" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 28 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: "bold", marginBottom: 6 } }, "What kind of letter do you need?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#666" } }, "Select the letter type and we'll guide you through the information needed.")), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 14, color: "#1a2d5a" } }, "\u{1F4EC} Responding to a Notice"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 10 } }, NOTICE_LETTERS.map((l) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: l.id,
      onClick: () => {
        setLetterType(l.id);
        setFormData({});
        setMode("form");
      },
      style: { padding: "14px 16px", border: "1.5px solid #e8e4dc", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#7ec11f",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#e8e4dc"
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a" } }, l.label),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 3 } }, l.desc)
  )))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 14, color: "#1a2d5a" } }, "\u{1F6E1}\uFE0F Resolution Requests"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 10 } }, RESOLUTION_LETTERS.map((l) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: l.id,
      onClick: () => {
        setLetterType(l.id);
        setFormData({});
        setMode("form");
      },
      style: { padding: "14px 16px", border: "1.5px solid #e8e4dc", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = "#7ec11f",
      onMouseLeave: (e) => e.currentTarget.style.borderColor = "#e8e4dc"
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a" } }, l.label),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 3 } }, l.desc)
  ))))), mode === "form" && (() => {
    const allLetters = [...NOTICE_LETTERS, ...RESOLUTION_LETTERS];
    const typeDef = allLetters.find((l) => l.id === letterType);
    const fields = FIELDS[letterType] || [];
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("choose"), style: { background: "transparent", border: "none", color: "#888", fontSize: 22, cursor: "pointer", padding: 0 } }, "\u2190"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold" } }, typeDef?.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888" } }, "Fill in the fields below to generate your letter"))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 16 } }, fields.map((f) => /* @__PURE__ */ React.createElement("div", { key: f }, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6, color: "#1a2d5a" } }, FIELD_LABELS[f] || f), TEXTAREA_FIELDS.includes(f) ? /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: formData[f] || "",
        onChange: (e) => set(f, e.target.value),
        rows: 4,
        style: { ...inp, resize: "vertical" }
      }
    ) : SELECT_FIELDS[f] ? /* @__PURE__ */ React.createElement("select", { value: formData[f] || "", onChange: (e) => set(f, e.target.value), style: { ...inp, background: "#fff" } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select..."), SELECT_FIELDS[f].map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o))) : /* @__PURE__ */ React.createElement("input", { value: formData[f] || "", onChange: (e) => set(f, e.target.value), style: inp }))))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: generateLetter,
        disabled: loading,
        style: { width: "100%", padding: "14px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 15, fontWeight: "bold", fontFamily: "Georgia, serif", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }
      },
      loading ? "Generating Letter..." : "Generate Letter \u2192"
    ));
  })(), mode === "preview" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold" } }, "Your Letter"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setMode("form"),
      style: { padding: "8px 16px", background: "transparent", border: "1px solid #ddd", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "\u2190 Edit"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: copyToClipboard,
      style: { padding: "8px 16px", background: "transparent", border: "1px solid #7ec11f", color: "#1a2d5a", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "\u{1F4CB} Copy"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: printLetter,
      style: { padding: "8px 16px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" }
    },
    "\u{1F5A8}\uFE0F Print"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setMode("choose");
        setLetter("");
        setFormData({});
      },
      style: { padding: "8px 16px", background: "transparent", border: "1px solid #ddd", borderRadius: 7, fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "New Letter"
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "40px 44px", whiteSpace: "pre-wrap", fontFamily: "Times New Roman, serif", fontSize: 13, lineHeight: 1.8, color: "#1a2d5a" } }, letter), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, padding: "14px 18px", background: "#f0f9e0", border: "1px solid #d4edaa", borderRadius: 10, fontSize: 13, color: "#2d5a0e" } }, "\u26A0 Review this letter carefully before sending. Verify all dates, amounts, and IRS addresses are accurate. Consider having a tax professional review any letter before submission."))));
}
window.LetterGenerator = LetterGenerator;