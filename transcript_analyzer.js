// IRS Pilot — Transcript Analyzer
// Three-page app: Landing → Taxpayer or Tax Pro pathway
const { useState, useRef } = React;

// ── Shared helpers ────────────────────────────────────────────────────────────
const fmt$ = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const SEVERITY_COLORS = {
  red:    { bg: "#fef2f2", border: "#fecaca", dot: "#dc2626", text: "#7f1d1d" },
  yellow: { bg: "#fef3c7", border: "#fde68a", dot: "#d97706", text: "#78350f" },
  green:  { bg: "#f0fdf4", border: "#bbf7d0", dot: "#15803d", text: "#14532d" },
  gray:   { bg: "#f8f6f1", border: "#e8e4dc", dot: "#888",    text: "#555"    },
};

function NavBar({ onBack }) {
  return React.createElement("div", {
    style: { background: "#1a2d5a", borderBottom: "3px solid #7ec11f", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }
  },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
      React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 40, height: 40, objectFit: "contain" } }),
      React.createElement("div", null,
        React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"),
        React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "TRANSCRIPT ANALYZER")
      )
    ),
    React.createElement("div", { style: { display: "flex", gap: 8 } },
      onBack && React.createElement("button", {
        onClick: onBack,
        style: { color: "#cce8a0", fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "Georgia, serif" }
      }, "\u2190 Back"),
      React.createElement("a", { href: "/navigator", style: { color: "#cce8a0", fontSize: 12, textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 } }, "Navigator")
    )
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onChoose }) {
  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, null),
    React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", padding: "48px 24px" } },
      React.createElement("div", { style: { textAlign: "center", marginBottom: 48 } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCCB"),
        React.createElement("h1", { style: { fontSize: 28, fontWeight: "bold", color: "#1a2d5a", margin: "0 0 12px" } }, "IRS Transcript Analyzer"),
        React.createElement("p", { style: { fontSize: 15, color: "#666", lineHeight: 1.8, maxWidth: 580, margin: "0 auto" } },
          "Upload your IRS Account Transcript and get a plain-English report that explains exactly what happened, what you owe, and what your options are."
        )
      ),

      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 } },

        // Taxpayer card
        React.createElement("div", {
          onClick: () => onChoose("taxpayer"),
          style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "32px 28px", cursor: "pointer", transition: "border-color 0.2s", textAlign: "center" },
          onMouseEnter: e => e.currentTarget.style.borderColor = "#7ec11f",
          onMouseLeave: e => e.currentTarget.style.borderColor = "#e8e4dc"
        },
          React.createElement("div", { style: { fontSize: 44, marginBottom: 16 } }, "\uD83D\uDC64"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "I'm a Taxpayer"),
          React.createElement("div", { style: { fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20 } },
            "Download your transcript from IRS.gov and upload it here for a plain-language explanation of what the IRS is saying."
          ),
          React.createElement("div", { style: { padding: "10px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 14, fontWeight: "bold", display: "inline-block" } },
            "Analyze My Transcript \u2192"
          )
        ),

        // Tax Pro card
        React.createElement("div", {
          onClick: () => onChoose("taxpro"),
          style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "32px 28px", cursor: "pointer", transition: "border-color 0.2s", textAlign: "center" },
          onMouseEnter: e => e.currentTarget.style.borderColor = "#7ec11f",
          onMouseLeave: e => e.currentTarget.style.borderColor = "#e8e4dc"
        },
          React.createElement("div", { style: { fontSize: 44, marginBottom: 16 } }, "\uD83C\uDFE2"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "I'm a Tax Professional"),
          React.createElement("div", { style: { fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 20 } },
            "Pull your client's transcript from TDS and upload it here to generate a professional plain-language report to share with your client."
          ),
          React.createElement("div", { style: { padding: "10px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 14, fontWeight: "bold", display: "inline-block" } },
            "Analyze Client Transcript \u2192"
          )
        )
      ),

      // How to get your transcript
      React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "24px 28px" } },
        React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#1a2d5a", marginBottom: 16 } }, "How to Download Your Transcript"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 } }, "For Taxpayers — IRS.gov"),
            React.createElement("ol", { style: { paddingLeft: 18, fontSize: 13, color: "#555", lineHeight: 2 } },
              React.createElement("li", null, "Go to ", React.createElement("strong", null, "irs.gov/individuals/get-transcript")),
              React.createElement("li", null, 'Click "Get Transcript Online" and log in'),
              React.createElement("li", null, 'Select "Account Transcript"'),
              React.createElement("li", null, "Choose the tax year"),
              React.createElement("li", null, "Download the PDF and upload it here")
            )
          ),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 } }, "For Tax Professionals — TDS"),
            React.createElement("ol", { style: { paddingLeft: 18, fontSize: 13, color: "#555", lineHeight: 2 } },
              React.createElement("li", null, "Log into ", React.createElement("strong", null, "IRS e-Services")),
              React.createElement("li", null, "Open the Transcript Delivery System (TDS)"),
              React.createElement("li", null, "Enter taxpayer SSN/EIN and tax period"),
              React.createElement("li", null, 'Select "Account Transcript" and download'),
              React.createElement("li", null, "Upload the PDF here to generate the report")
            )
          )
        )
      ),

      React.createElement("div", { style: { textAlign: "center", marginTop: 24, fontSize: 12, color: "#aaa", lineHeight: 1.7 } },
        "\uD83D\uDD12 Your transcript is processed in-memory and is never stored on our servers. ",
        React.createElement("strong", null, "No data is saved."),
        " Download your report as a PDF before closing this page."
      )
    )
  );
}

// ── Upload Form (shared between taxpayer and pro) ─────────────────────────────
function UploadForm({ mode, onResult, proInfo }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [firmName, setFirmName] = useState(proInfo?.firmName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", color: "#1a2d5a" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
    else setError("Please upload a PDF file.");
  };

  const handleSubmit = async () => {
    if (!file) { setError("Please select a transcript PDF."); return; }
    if (!name.trim()) { setError(mode === "taxpayer" ? "Please enter your name." : "Please enter the client's name."); return; }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("transcript", file);
      formData.append("name", name.trim());
      formData.append("mode", mode);
      if (mode === "taxpro") formData.append("firm_name", firmName.trim());
      const res = await fetch("/api/transcript/analyze", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Analysis failed. Please try again."); return; }
      onResult(data, name.trim(), firmName.trim());
    } catch (e) {
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return React.createElement("div", { style: { maxWidth: 620, margin: "0 auto", padding: "40px 24px", fontFamily: "Georgia, serif" } },
    React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: "32px 36px" } },
      React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } },
        mode === "taxpayer" ? "Analyze Your Transcript" : "Analyze Client Transcript"
      ),
      React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 28, lineHeight: 1.6 } },
        mode === "taxpayer"
          ? "Upload your IRS Account Transcript PDF. We'll generate a plain-language report explaining your account."
          : "Upload your client's IRS Account Transcript from TDS. One session will be deducted from your monthly allotment."
      ),

      // Name field
      React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("label", { style: labelStyle },
          mode === "taxpayer" ? "Your Name" : "Client Name"
        ),
        React.createElement("input", {
          type: "text",
          value: name,
          onChange: e => setName(e.target.value),
          placeholder: mode === "taxpayer" ? "e.g. John Smith" : "e.g. Jane Doe",
          style: inpStyle
        })
      ),

      // Firm name (pro only)
      mode === "taxpro" && React.createElement("div", { style: { marginBottom: 16 } },
        React.createElement("label", { style: labelStyle }, "Your Firm Name"),
        React.createElement("input", {
          type: "text",
          value: firmName,
          onChange: e => setFirmName(e.target.value),
          placeholder: "e.g. Smith Tax Services",
          style: inpStyle
        })
      ),

      // Drop zone
      React.createElement("div", {
        onDragOver: e => { e.preventDefault(); setDragOver(true); },
        onDragLeave: () => setDragOver(false),
        onDrop: handleDrop,
        onClick: () => fileRef.current && fileRef.current.click(),
        style: {
          border: `2px dashed ${dragOver ? "#7ec11f" : file ? "#7ec11f" : "#ddd"}`,
          borderRadius: 12,
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#f0fdf4" : file ? "#f0fdf4" : "#fafaf8",
          marginBottom: 20,
          transition: "all 0.2s"
        }
      },
        React.createElement("input", { ref: fileRef, type: "file", accept: ".pdf", style: { display: "none" }, onChange: e => { if (e.target.files[0]) setFile(e.target.files[0]); } }),
        file
          ? React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 28, marginBottom: 8 } }, "\u2705"),
              React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#15803d" } }, file.name),
              React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 4 } }, "Click to change file")
            )
          : React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 36, marginBottom: 8 } }, "\uD83D\uDCC4"),
              React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Drop your transcript PDF here"),
              React.createElement("div", { style: { fontSize: 12, color: "#888" } }, "or click to browse")
            )
      ),

      error && React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 } }, error),

      React.createElement("button", {
        onClick: handleSubmit,
        disabled: loading,
        style: { width: "100%", padding: "13px 0", background: loading ? "#ccc" : "#7ec11f", color: "#1a2d5a", border: "2px solid " + (loading ? "#ccc" : "#7ec11f"), borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, cursor: loading ? "default" : "pointer" }
      }, loading ? "Analyzing Transcript..." : "Generate Report \u2192"),

      React.createElement("div", { style: { marginTop: 14, fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.6 } },
        "\uD83D\uDD12 Your transcript PDF is processed immediately and never stored. ",
        "Download your report before closing this page."
      )
    )
  );
}

// ── Report Page ───────────────────────────────────────────────────────────────
function ReportPage({ data, name, firmName, mode, onBack }) {
  const [downloading, setDownloading] = useState(false);

  const urgencyConfig = {
    red:    { bg: "#dc2626", text: "\uD83D\uDEA8 Immediate Action Required" },
    yellow: { bg: "#d97706", text: "\u26A0\uFE0F Action Required \u2014 Active Case" },
    green:  { bg: "#15803d", text: "\u2705 No Outstanding Balance" },
  };
  const urgency = urgencyConfig[data.urgency] || urgencyConfig.yellow;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/transcript/pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, name, firmName, mode })
      });
      if (!res.ok) { alert("PDF generation failed. Please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IRS-Transcript-Report-${(name || "client").replace(/\s+/g, "-")}-${data.tax_year || "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const cardStyle = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "22px 26px", marginBottom: 18 };
  const sectionTitle = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #7ec11f" };

  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, { onBack }),

    // Download bar
    React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.7)" } },
        "\uD83D\uDD12 This report is not saved. Download it now to keep a copy."
      ),
      React.createElement("button", {
        onClick: handleDownload,
        disabled: downloading,
        style: { padding: "8px 20px", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" }
      }, downloading ? "Generating PDF..." : "\uD83D\uDCE5 Download PDF Report")
    ),

    React.createElement("div", { style: { maxWidth: 860, margin: "0 auto", padding: "28px 24px 48px" } },

      // Report header
      React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 14, padding: "28px 32px", marginBottom: 18 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 } },
          React.createElement("div", null,
            React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 } }, "IRS Account Transcript Report"),
            React.createElement("div", { style: { color: "#fff", fontSize: 22, fontWeight: "bold" } }, "Your IRS Account Summary"),
            name && React.createElement("div", { style: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 } }, "Prepared for: ", name),
            firmName && React.createElement("div", { style: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 } }, "Prepared by: ", firmName)
          ),
          React.createElement("div", { style: { background: "#7ec11f", color: "#1a2d5a", padding: "10px 18px", borderRadius: 10, textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", lineHeight: 1 } }, data.tax_year || "—"),
            React.createElement("div", { style: { fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginTop: 2 } }, "TAX YEAR")
          )
        ),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" } },
          [
            { label: "Balance Owed", value: fmt$(data.account_balance), red: true },
            { label: "Accrued Interest", value: fmt$(data.accrued_interest), red: true },
            { label: "Total Exposure", value: fmt$(data.balance_plus_accruals), red: true },
          ].map((item, i) =>
            React.createElement("div", { key: i, style: { background: "rgba(255,255,255,0.06)", padding: "16px 18px", textAlign: "center" } },
              React.createElement("div", { style: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 } }, item.label),
              React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: item.red ? "#fca5a5" : "#86efac" } }, item.value)
            )
          )
        )
      ),

      // Urgency banner
      React.createElement("div", { style: { background: urgency.bg, borderRadius: 10, padding: "12px 20px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("div", { style: { fontSize: 13, color: "#fff", fontWeight: "bold" } }, urgency.text)
      ),

      // What is this document
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCCB What Is This Document?"),
        React.createElement("div", { style: { fontSize: 14, color: "#333", lineHeight: 1.9, background: "#f8f6f1", borderLeft: "3px solid #7ec11f", borderRadius: "0 8px 8px 0", padding: "16px 20px" } },
          "This is your ",
          React.createElement("strong", null, `IRS Account Transcript for tax year ${data.tax_year}`),
          ". Think of it like a bank statement — but instead of showing deposits and withdrawals, it shows everything the IRS has done with your tax account for that year. ",
          data.narrative
        )
      ),

      // What happened timeline
      data.transactions && data.transactions.length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCC5 What Happened \u2014 In Plain English"),
        data.transactions.filter(t => t.amount !== 0 || ["150","160","170","276","300","336","520","971","706","420","460","140"].includes(t.code)).map((t, i) => {
          const colors = SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.gray;
          return React.createElement("div", { key: i, style: { display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" } },
            React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", background: colors.bg, border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 } }, t.emoji),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 } },
                React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#1a2d5a" } }, t.title),
                t.amount !== 0 && React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: t.amount > 0 ? "#dc2626" : "#15803d", flexShrink: 0, marginLeft: 12 } },
                  t.amount > 0 ? "+" : "", fmt$(Math.abs(t.amount))
                )
              ),
              t.date && React.createElement("div", { style: { fontSize: 11, color: "#888", marginBottom: 4 } }, t.date),
              React.createElement("div", { style: { fontSize: 13, color: "#555", lineHeight: 1.7 } }, t.plain)
            )
          );
        })
      ),

      // FAQ
      data.faq && data.faq.length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\u2753 Questions You Probably Have"),
        data.faq.map((item, i) =>
          React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 10, padding: "14px 18px", marginBottom: 12 } },
            React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, item.q),
            React.createElement("div", { style: { fontSize: 13, color: "#555", lineHeight: 1.7 } }, item.a)
          )
        )
      ),

      // Resolution options (pro mode shows extra detail)
      data.resolution_options && data.resolution_options.length > 0 && React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: sectionTitle }, "\uD83D\uDCBC Your Options"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          data.resolution_options.map((opt, i) => {
            const tagColors = {
              likely:   { bg: "#f0fdf4", color: "#15803d", label: "Likely Available" },
              analysis: { bg: "#eff6ff", color: "#1e40af", label: "Requires Analysis" },
              possible: { bg: "#fef3c7", color: "#92400e", label: "Possible" },
              strong:   { bg: "#f0fdf4", color: "#15803d", label: "Strong Candidate" },
              active:   { bg: "#eff6ff", color: "#1e40af", label: "Currently Active" },
              resolved: { bg: "#f0fdf4", color: "#15803d", label: "Resolved" },
            };
            const tag = tagColors[opt.tag] || tagColors.possible;
            return React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 10, padding: "14px 16px" } },
              React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, opt.name),
              React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 8 } }, opt.desc),
              React.createElement("span", { style: { fontSize: 10, fontWeight: "bold", padding: "2px 8px", borderRadius: 20, background: tag.bg, color: tag.color } }, tag.label)
            );
          })
        )
      ),

      // Next steps
      data.next_steps && data.next_steps.length > 0 && React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 14, padding: "24px 28px", marginBottom: 18 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#7ec11f", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 16 } }, "\u2705 What Needs to Happen Next"),
        data.next_steps.map((step, i) =>
          React.createElement("div", { key: i, style: { display: "flex", gap: 14, marginBottom: i < data.next_steps.length - 1 ? 14 : 0, alignItems: "flex-start" } },
            React.createElement("div", { style: { width: 26, height: 26, borderRadius: "50%", background: "#7ec11f", color: "#1a2d5a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", flexShrink: 0 } }, i + 1),
            React.createElement("div", { style: { fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, paddingTop: 3 } }, step)
          )
        )
      ),

      // Footer
      React.createElement("div", { style: { textAlign: "center", fontSize: 11, color: "#aaa", lineHeight: 1.7 } },
        "This report was generated by IRS Pilot based on the uploaded IRS Account Transcript. ",
        "It is for informational purposes only and does not constitute legal or tax advice. ",
        "Consult a qualified tax professional before taking action.",
        React.createElement("br", null),
        firmName && React.createElement("span", null, `Prepared by ${firmName} · `),
        "irspilot.com"
      )
    )
  );
}

// ── Pro Access Gate ───────────────────────────────────────────────────────────
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

  if (status?.allowed) {
    return React.createElement(UploadForm, { mode: "taxpro", onResult: onAccessGranted, proInfo: { firmName: status.firm_name } });
  }

  // Not a pro subscriber
  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    React.createElement(NavBar, null),
    React.createElement("div", { style: { maxWidth: 580, margin: "80px auto", padding: "0 24px" } },
      React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "2px solid #e8e4dc", padding: "40px 36px", textAlign: "center" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83C\uDFE2"),
        React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 10 } }, "Pro Subscription Required"),
        React.createElement("div", { style: { fontSize: 14, color: "#666", lineHeight: 1.8, marginBottom: 24 } },
          "The Tax Professional transcript analyzer is available to ",
          React.createElement("strong", null, "IRS Pilot Pro Subscribers"),
          " only. Each analysis uses one of your monthly client sessions.",
          React.createElement("br", null),
          React.createElement("br", null),
          status?.sessions_remaining !== undefined && `You have ${status.sessions_remaining} sessions remaining this month.`
        ),
        status?.no_sessions && React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#92400e", marginBottom: 20 } },
          "You have used all ", status.sessions_limit, " sessions for this month. Additional sessions are available at $5 each."
        ),
        React.createElement("a", { href: "/tax-professionals", style: { display: "inline-block", padding: "12px 28px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, textDecoration: "none" } },
          "Learn About Pro Subscription \u2192"
        )
      )
    )
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function TranscriptAnalyzer() {
  const [page, setPage] = useState("landing");  // landing | taxpayer | taxpro | report
  const [reportData, setReportData] = useState(null);
  const [reportName, setReportName] = useState("");
  const [reportFirm, setReportFirm] = useState("");
  const [reportMode, setReportMode] = useState("taxpayer");

  const handleChoose = (mode) => {
    setPage(mode);
  };

  const handleResult = (data, name, firmName) => {
    setReportData(data);
    setReportName(name);
    setReportFirm(firmName);
    setReportMode(page);
    setPage("report");
  };

  if (page === "landing") {
    return React.createElement(LandingPage, { onChoose: handleChoose });
  }

  if (page === "taxpayer") {
    return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
      React.createElement(NavBar, { onBack: () => setPage("landing") }),
      React.createElement(UploadForm, { mode: "taxpayer", onResult: handleResult })
    );
  }

  if (page === "taxpro") {
    return React.createElement(ProGate, { onAccessGranted: handleResult });
  }

  if (page === "report" && reportData) {
    return React.createElement(ReportPage, {
      data: reportData,
      name: reportName,
      firmName: reportFirm,
      mode: reportMode,
      onBack: () => setPage("landing")
    });
  }

  return null;
}

window.TranscriptAnalyzer = TranscriptAnalyzer;
