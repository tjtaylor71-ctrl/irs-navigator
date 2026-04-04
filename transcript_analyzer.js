const { useState, useEffect, useRef, useCallback, useMemo } = React;

const fmt$ = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const SEVERITY_COLORS = {
  red:    { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", text: "#7f1d1d" },
  yellow: { bg: "#fef3c7", border: "#fde68a", dot: "#d97706", text: "#78350f" },
  green:  { bg: "#f0fdf4", border: "#bbf7d0", dot: "#15803d", text: "#14532d" },
  gray:   { bg: "#f8f6f1", border: "#e8e4dc", dot: "#888",    text: "#555"    },
};

function NavBar({ onBack }) {
  return React.createElement("div", { style: { background: "#1a2d5a", borderBottom: "3px solid #7ec11f", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" } },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 40, height: 40, objectFit: "contain" } }),
      React.createElement("div", null,
        React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"),
        React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "TRANSCRIPT ANALYZER")
      )
    ),
    React.createElement("div", { style: { display: "flex", gap: 8 } },
      onBack && React.createElement("button", { onClick: onBack, style: { color: "#cce8a0", fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "Georgia, serif" } }, "\u2190 Back"),
      React.createElement("a", { href: "/navigator", style: { color: "#cce8a0", fontSize: 12, textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 } }, "Navigator")
    )
  );
}

function LandingPage({ onChoose }) {
  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, null),
    React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", padding: "48px 24px" } },
      React.createElement("div", { style: { textAlign: "center", marginBottom: 48 } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCCB"),
        React.createElement("h1", { style: { fontSize: 28, fontWeight: "bold", color: "#1a2d5a", margin: "0 0 12px" } }, "IRS Transcript Analyzer"),
        React.createElement("p", { style: { fontSize: 15, color: "#666", lineHeight: 1.8, maxWidth: 580, margin: "0 auto" } }, "Upload your IRS Account Transcripts and get a plain-English report that explains exactly what happened, what you owe, and what your options are. Upload multiple years at once for a combined report.")
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 } },
        React.createElement("div", { onClick: () => onChoose("taxpayer"), style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "32px 28px", cursor: "pointer", textAlign: "center" }, onMouseEnter: e => e.currentTarget.style.borderColor = "#7ec11f", onMouseLeave: e => e.currentTarget.style.borderColor = "#e8e4dc" },
          React.createElement("div", { style: { fontSize: 44, marginBottom: 16 } }, "\uD83D\uDC64"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "I'm a Taxpayer"),
          React.createElement("div", { style: { fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20 } }, "Download your transcript from IRS.gov and upload it here for a plain-language explanation of what the IRS is saying."),
          React.createElement("div", { style: { padding: "10px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 14, fontWeight: "bold", display: "inline-block" } }, "Analyze My Transcript \u2192")
        ),
        React.createElement("div", { onClick: () => onChoose("taxpro"), style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "32px 28px", cursor: "pointer", textAlign: "center" }, onMouseEnter: e => e.currentTarget.style.borderColor = "#7ec11f", onMouseLeave: e => e.currentTarget.style.borderColor = "#e8e4dc" },
          React.createElement("div", { style: { fontSize: 44, marginBottom: 16 } }, "\uD83C\uDFE2"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "I'm a Tax Professional"),
          React.createElement("div", { style: { fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20 } }, "Pull your client's transcripts from TDS and upload them here to generate a professional plain-language report to share with your client."),
          React.createElement("div", { style: { padding: "10px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 14, fontWeight: "bold", display: "inline-block" } }, "Analyze Client Transcripts \u2192")
        )
      ),
      React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "24px 28px" } },
        React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#1a2d5a", marginBottom: 16 } }, "How to Download Your Transcript"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 } }, "For Taxpayers \u2014 IRS.gov"),
            React.createElement("ol", { style: { paddingLeft: 18, fontSize: 13, color: "#555", lineHeight: 2 } },
              React.createElement("li", null, "Go to ", React.createElement("strong", null, "irs.gov/individuals/get-transcript")),
              React.createElement("li", null, "Click \u201cGet Transcript Online\u201d and log in"),
              React.createElement("li", null, "Select \u201cAccount Transcript\u201d"),
              React.createElement("li", null, "Choose the tax year(s)"),
              React.createElement("li", null, "Download each PDF and upload them here")
            )
          ),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 } }, "For Tax Professionals \u2014 TDS"),
            React.createElement("ol", { style: { paddingLeft: 18, fontSize: 13, color: "#555", lineHeight: 2 } },
              React.createElement("li", null, "Log into ", React.createElement("strong", null, "IRS e-Services")),
              React.createElement("li", null, "Open the Transcript Delivery System (TDS)"),
              React.createElement("li", null, "Enter taxpayer SSN/EIN and tax period"),
              React.createElement("li", null, "Download all needed years"),
              React.createElement("li", null, "Upload all PDFs here for a combined report")
            )
          )
        )
      ),
      React.createElement("div", { style: { textAlign: "center", marginTop: 24, fontSize: 12, color: "#aaa", lineHeight: 1.7 } },
        "\uD83D\uDD12 Your transcripts are processed in-memory and never stored. ", React.createElement("strong", null, "No data is saved."), " Download your report before closing this page."
      )
    )
  );
}

function UploadForm({ mode, onResult, proInfo }) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState(proInfo?.firmName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", color: "#1a2d5a" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" };

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) { setError("Please upload PDF files only."); return; }
    setError("");
    setFiles(prev => { const existing = new Set(prev.map(f => f.name)); return [...prev, ...pdfs.filter(f => !existing.has(f.name))]; });
  };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

  const handleSubmit = async () => {
    if (files.length === 0) { setError("Please select at least one transcript PDF."); return; }
    if (!name.trim()) { setError(mode === "taxpayer" ? "Please enter your name." : "Please enter the client's name."); return; }
    setLoading(true); setError("");
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("transcripts", f));
      formData.append("name", name.trim());
      formData.append("mode", mode);
      if (mode === "taxpro") formData.append("firm_name", firmName.trim());
      const res = await fetch("/api/transcript/analyze", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Analysis failed. Please try again."); return; }
      onResult(data, name.trim(), firmName.trim());
    } catch (e) { setError("Upload failed. Please check your connection and try again."); }
    finally { setLoading(false); }
  };

  return React.createElement("div", { style: { maxWidth: 620, margin: "0 auto", padding: "40px 24px", fontFamily: "Georgia, serif" } },
    React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: "32px 36px" } },
      React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, mode === "taxpayer" ? "Analyze Your Transcripts" : "Analyze Client Transcripts"),
      React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 28, lineHeight: 1.6 } }, mode === "taxpayer" ? "Upload one or more IRS Account Transcript PDFs. You can upload multiple years at once \u2014 we\u2019ll combine them into a single report." : "Upload one or more client transcripts from TDS. Each transcript uses one session from your monthly allotment."),
      React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("label", { style: labelStyle }, mode === "taxpayer" ? "Your Name" : "Client Name"),
        React.createElement("input", { type: "text", value: name, onChange: e => setName(e.target.value), placeholder: mode === "taxpayer" ? "e.g. John Smith" : "e.g. Jane Doe", style: inpStyle })
      ),
      mode === "taxpro" && React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("label", { style: labelStyle }, "Your Firm Name"),
        React.createElement("input", { type: "text", value: firmName, onChange: e => setFirmName(e.target.value), placeholder: "e.g. Smith Tax Services", style: inpStyle })
      ),
      React.createElement("div", { onDragOver: e => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), onDrop: handleDrop, onClick: () => fileRef.current && fileRef.current.click(), style: { border: "2px dashed " + (dragOver ? "#7ec11f" : files.length > 0 ? "#7ec11f" : "#ddd"), borderRadius: 12, padding: "24px", textAlign: "center", cursor: "pointer", background: dragOver ? "#f0fdf4" : files.length > 0 ? "#f0fdf4" : "#fafaf8", marginBottom: 12, transition: "all 0.2s" } },
        React.createElement("input", { ref: fileRef, type: "file", accept: ".pdf", multiple: true, style: { display: "none" }, onChange: e => addFiles(e.target.files) }),
        React.createElement("div", { style: { fontSize: 32, marginBottom: 6 } }, "\uD83D\uDCC2"),
        React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, files.length > 0 ? "Drop more transcripts or click to add" : "Drop transcript PDFs here"),
        React.createElement("div", { style: { fontSize: 12, color: "#888" } }, "Multiple years supported \u2014 upload all at once")
      ),
      files.length > 0 && React.createElement("div", { style: { marginBottom: 16 } },
        files.map((f, i) => React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 6 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("span", { style: { color: "#7ec11f", fontSize: 16 } }, "\u2705"),
            React.createElement("span", { style: { fontSize: 13, color: "#1a2d5a", fontWeight: "bold" } }, f.name)
          ),
          React.createElement("button", { onClick: e => { e.stopPropagation(); removeFile(i); }, style: { background: "none", border: "none", color: "#dc2626", fontSize: 16, cursor: "pointer", padding: "0 4px" } }, "\u00D7")
        ))
      ),
      error && React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 } }, error),
      React.createElement("button", { onClick: handleSubmit, disabled: loading, style: { width: "100%", padding: "13px 0", background: loading ? "#ccc" : "#7ec11f", color: "#1a2d5a", border: "2px solid " + (loading ? "#ccc" : "#7ec11f"), borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, cursor: loading ? "default" : "pointer" } },
        loading ? "Analyzing " + files.length + " transcript" + (files.length > 1 ? "s" : "") + "..." : "Generate Report" + (files.length > 1 ? " (" + files.length + " years)" : "") + " \u2192"
      ),
      React.createElement("div", { style: { marginTop: 14, fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.6 } }, "\uD83D\uDD12 Your transcripts are processed immediately and never stored. Download your report before closing this page.")
    )
  );
}

function ReportPage({ results, name, firmName, mode, onBack }) {
  const [downloading, setDownloading] = useState(false);
  const transcripts = Array.isArray(results) ? results : [results];
  const sorted = [...transcripts].sort((a, b) => (a.tax_year || "").localeCompare(b.tax_year || ""));
  const totalBalance = sorted.reduce((sum, d) => sum + (d.account_balance || 0), 0);
  const totalExposure = sorted.reduce((sum, d) => sum + (d.balance_plus_accruals || 0), 0);
  const worstUrgency = sorted.some(d => d.urgency === "red") ? "red" : sorted.some(d => d.urgency === "yellow") ? "yellow" : "green";
  const urgencyConfig = {
    red:    { bg: "#dc2626", text: "\uD83D\uDEA8 Immediate Action Required" },
    yellow: { bg: "#d97706", text: "\u26A0\uFE0F Action Required \u2014 Active Case" },
    green:  { bg: "#15803d", text: "\u2705 No Outstanding Balance" },
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/transcript/pdf", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results: sorted, name, firmName, mode }) });
      if (!res.ok) { alert("PDF generation failed. Please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "IRS-Transcript-Report-" + (name || "client").replace(/\s+/g, "-") + "-" + sorted.map(d => d.tax_year).join("-") + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert("Download failed. Please try again."); }
    finally { setDownloading(false); }
  };

  const cardStyle = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "22px 26px", marginBottom: 14 };
  const sectionTitle = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #7ec11f" };
  const tagColors = { likely: { bg: "#f0fdf4", color: "#15803d", label: "Likely Available" }, analysis: { bg: "#eff6ff", color: "#1e40af", label: "Requires Analysis" }, possible: { bg: "#fef3c7", color: "#92400e", label: "Possible" }, strong: { bg: "#f0fdf4", color: "#15803d", label: "Strong Candidate" }, active: { bg: "#eff6ff", color: "#1e40af", label: "Currently Active" }, resolved: { bg: "#f0fdf4", color: "#15803d", label: "Resolved" } };

  const renderTranscript = (data, idx) => {
    const urgency = urgencyConfig[data.urgency] || urgencyConfig.yellow;
    const txns = (data.transactions || []).filter(t => t.amount !== 0 || ["150","160","170","276","300","336","520","971","706","420","460","140"].includes(t.code));
    return React.createElement("div", { key: idx },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginTop: idx > 0 ? 32 : 0 } },
        React.createElement("div", { style: { background: "#1a2d5a", color: "#7ec11f", fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 18, padding: "6px 18px", borderRadius: 8 } }, data.tax_year || "Unknown Year"),
        React.createElement("div", { style: { flex: 1, height: 2, background: "#e8e4dc" } }),
        React.createElement("div", { style: { fontSize: 13, color: "#888" } }, data.form_number || "Form 1040")
      ),
      React.createElement("div", { style: { background: urgency.bg, borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#fff", fontWeight: "bold" } }, urgency.text),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 } },
        [{ label: "Balance Owed", value: fmt$(data.account_balance) }, { label: "Accrued Interest", value: fmt$(data.accrued_interest) }, { label: "Total Exposure", value: fmt$(data.balance_plus_accruals) }].map((item, i) =>
          React.createElement("div", { key: i, style: { background: "#1a2d5a", borderRadius: 10, padding: "14px 16px", textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 } }, item.label),
            React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#fca5a5" } }, item.value)
          )
        )
      ),
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCCB What This Year Shows"),
        React.createElement("div", { style: { fontSize: 14, color: "#333", lineHeight: 1.9, background: "#f8f6f1", borderLeft: "3px solid #7ec11f", borderRadius: "0 8px 8px 0", padding: "14px 18px" } }, data.narrative)
      ),
      txns.length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCC5 Timeline of Events"),
        txns.map((t, i) => {
          const colors = SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.gray;
          return React.createElement("div", { key: i, style: { display: "flex", gap: 14, marginBottom: 12, alignItems: "flex-start" } },
            React.createElement("div", { style: { width: 32, height: 32, borderRadius: "50%", background: colors.bg, border: "1px solid " + colors.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 } }, t.emoji),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 } },
                React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, t.title),
                t.amount !== 0 && React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: t.amount > 0 ? "#dc2626" : "#15803d", flexShrink: 0, marginLeft: 12 } }, (t.amount > 0 ? "+" : "") + fmt$(Math.abs(t.amount)))
              ),
              t.date && React.createElement("div", { style: { fontSize: 11, color: "#888", marginBottom: 3 } }, t.date),
              React.createElement("div", { style: { fontSize: 13, color: "#555", lineHeight: 1.7 } }, t.plain)
            )
          );
        })
      ),
      (data.faq || []).length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\u2753 Questions About This Year"),
        (data.faq || []).map((item, i) => React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 10, padding: "12px 16px", marginBottom: 10 } },
          React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 5 } }, item.q),
          React.createElement("div", { style: { fontSize: 13, color: "#555", lineHeight: 1.7 } }, item.a)
        ))
      ),
      (data.resolution_options || []).length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCBC Resolution Options for This Year"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
          (data.resolution_options || []).map((opt, i) => {
            const tag = tagColors[opt.tag] || tagColors.possible;
            return React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 10, padding: "12px 14px" } },
              React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 5 } }, opt.name),
              React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 6 } }, opt.desc),
              React.createElement("span", { style: { fontSize: 10, fontWeight: "bold", padding: "2px 8px", borderRadius: 20, background: tag.bg, color: tag.color } }, tag.label)
            );
          })
        )
      )
    );
  };

  const allNextSteps = sorted.flatMap(d => d.next_steps || []).filter((s, i, arr) => arr.findIndex(x => x.slice(0, 40) === s.slice(0, 40)) === i);

  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, { onBack }),
    React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.7)" } }, "\uD83D\uDD12 This report is not saved. Download it now to keep a copy."),
      React.createElement("button", { onClick: handleDownload, disabled: downloading, style: { padding: "8px 20px", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, downloading ? "Generating PDF..." : "\uD83D\uDCE5 Download PDF Report")
    ),
    React.createElement("div", { style: { maxWidth: 860, margin: "0 auto", padding: "28px 24px 48px" } },
      React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 14, padding: "28px 32px", marginBottom: 18 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: sorted.length > 1 ? 20 : 0 } },
          React.createElement("div", null,
            React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 } }, "IRS Account Transcript Report"),
            React.createElement("div", { style: { color: "#fff", fontSize: 22, fontWeight: "bold" } }, "Your IRS Account Summary"),
            name && React.createElement("div", { style: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 } }, "Prepared for: ", name),
            firmName && React.createElement("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 } }, "Prepared by: ", firmName)
          ),
          React.createElement("div", { style: { background: "#7ec11f", color: "#1a2d5a", padding: "10px 18px", borderRadius: 10, textAlign: "center", minWidth: 110 } },
            React.createElement("div", { style: { fontSize: sorted.length > 1 ? 13 : 28, fontWeight: "bold", lineHeight: 1 } }, sorted.map(d => d.tax_year || "?").join(", ")),
            React.createElement("div", { style: { fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginTop: 4 } }, sorted.length > 1 ? "TAX YEARS" : "TAX YEAR")
          )
        ),
        sorted.length > 1 && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" } },
          [{ label: "Combined Balance", value: fmt$(totalBalance) }, { label: sorted.length + " Tax Years", value: sorted.map(d => d.tax_year).join(", ") }, { label: "Total Exposure", value: fmt$(totalExposure) }].map((item, i) =>
            React.createElement("div", { key: i, style: { background: "rgba(255,255,255,0.06)", padding: "14px 16px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 } }, item.label),
              React.createElement("div", { style: { fontSize: i === 1 ? 13 : 18, fontWeight: "bold", color: "#fca5a5" } }, item.value)
            )
          )
        )
      ),
      React.createElement("div", { style: { background: (urgencyConfig[worstUrgency] || urgencyConfig.yellow).bg, borderRadius: 10, padding: "12px 20px", marginBottom: 24, fontSize: 13, color: "#fff", fontWeight: "bold" } }, (urgencyConfig[worstUrgency] || urgencyConfig.yellow).text),
      sorted.map((data, idx) => renderTranscript(data, idx)),
      allNextSteps.length > 0 && React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 14, padding: "24px 28px", marginBottom: 18, marginTop: 8 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#7ec11f", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 } },
          "\u2705 What Needs to Happen Next",
          sorted.length > 1 && React.createElement("span", { style: { fontWeight: "normal", fontSize: 11, marginLeft: 8, color: "rgba(126,193,31,0.7)" } }, "(across all years)")
        ),
        allNextSteps.map((step, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 14, marginBottom: i < allNextSteps.length - 1 ? 14 : 0, alignItems: "flex-start" } },
          React.createElement("div", { style: { width: 26, height: 26, borderRadius: "50%", background: "#7ec11f", color: "#1a2d5a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", flexShrink: 0 } }, i + 1),
          React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, paddingTop: 3 } }, step)
        ))
      ),
      React.createElement("div", { style: { textAlign: "center", fontSize: 11, color: "#aaa", lineHeight: 1.7 } },
        "This report was generated by IRS Pilot based on the uploaded IRS Account Transcript(s). It is for informational purposes only and does not constitute legal or tax advice. ",
        firmName && React.createElement("span", null, "Prepared by " + firmName + ". "),
        "irspilot.com"
      )
    )
  );
}

function ProGate({ onAccessGranted }) {
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState(null);
  React.useEffect(() => {
    fetch("/api/transcript/pro-check", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setStatus(d); setChecking(false); })
      .catch(() => { setStatus({ error: true }); setChecking(false); });
  }, []);
  if (checking) return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1", display: "flex", alignItems: "center", justifyContent: "center" } },
    React.createElement("div", { style: { color: "#888", fontSize: 14 } }, "Checking access...")
  );
  if (status?.allowed) return React.createElement(UploadForm, { mode: "taxpro", onResult: onAccessGranted, proInfo: { firmName: status.firm_name } });
  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, null),
    React.createElement("div", { style: { maxWidth: 580, margin: "80px auto", padding: "0 24px" } },
      React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "40px 36px", textAlign: "center" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83C\uDFE2"),
        React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 10 } }, "Pro Subscription Required"),
        React.createElement("div", { style: { fontSize: 14, color: "#666", lineHeight: 1.8, marginBottom: 24 } },
          "The Tax Professional transcript analyzer is available to ", React.createElement("strong", null, "IRS Pilot Pro Subscribers"), " only. Each analysis uses one of your monthly client sessions.",
          React.createElement("br", null), React.createElement("br", null),
          status?.sessions_remaining !== undefined && "You have " + status.sessions_remaining + " sessions remaining this month."
        ),
        status?.no_sessions && React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#92400e", marginBottom: 20 } },
          "You have used all ", status.sessions_limit, " sessions for this month. Additional sessions are available at $5 each."
        ),
        React.createElement("a", { href: "/tax-professionals", style: { display: "inline-block", padding: "12px 28px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, textDecoration: "none" } }, "Learn About Pro Subscription \u2192")
      )
    )
  );
}

function TranscriptAnalyzer() {
  const [page, setPage] = useState("landing");
  const [reportData, setReportData] = useState(null);
  const [reportName, setReportName] = useState("");
  const [reportFirm, setReportFirm] = useState("");
  const [reportMode, setReportMode] = useState("taxpayer");

  const handleChoose = (mode) => setPage(mode);
  const handleResult = (data, name, firmName) => {
    setReportData(data);
    setReportName(name);
    setReportFirm(firmName);
    setReportMode(page);
    setPage("report");
  };

  if (page === "landing") return React.createElement(LandingPage, { onChoose: handleChoose });
  if (page === "taxpayer") return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, { onBack: () => setPage("landing") }),
    React.createElement(UploadForm, { mode: "taxpayer", onResult: handleResult })
  );
  if (page === "taxpro") return React.createElement(ProGate, { onAccessGranted: handleResult });
  if (page === "report" && reportData) return React.createElement(ReportPage, { results: reportData, name: reportName, firmName: reportFirm, mode: reportMode, onBack: () => setPage("landing") });
  return null;
}

window.TranscriptAnalyzer = TranscriptAnalyzer;
