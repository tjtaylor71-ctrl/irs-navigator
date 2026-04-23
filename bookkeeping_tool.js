


const BK_CATS = [
  "Income / Revenue","Consulting / Services","Refunds / Credits","Payroll / Wages",
  "Rent / Lease","Utilities","Insurance","Subscriptions / Software","Office Supplies",
  "Meals & Entertainment","Travel","Vehicle / Auto","Advertising / Marketing",
  "Professional Fees","Bank Fees","Loan Payments","Owner Draws / Distributions",
  "Taxes & Licenses","Uncategorized","Other Expense"
];

/* ── tiny helpers ── */
function fmt$(n) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? "+$" : "-$") + abs;
}
function csvRow(arr) { return arr.map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(","); }
function dl(name, content) {
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
  a.download = name; a.click();
}

/* ── Toast ── */
function Toast({ msg }) {
  if (!msg) return null;
  return React.createElement("div", {
    style: {
      position: "fixed", bottom: 24, right: 24, background: "#1a2d5a", color: "#fff",
      padding: "10px 18px", borderRadius: 10, fontSize: 13, zIndex: 9999,
      fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 20px rgba(26,45,90,0.3)"
    }
  }, msg);
}

/* ── Main component ── */
function BookkeepingTool() {
  const [tab, setTab] = useState("upload");
  const [files, setFiles] = useState([]);          // { file, status, error }
  const [txns, setTxns] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, text: "" });
  const [flagFilter, setFlagFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [rClient, setRClient] = useState("");
  const [rPeriod, setRPeriod] = useState("");
  const [rFirm, setRFirm] = useState("Taylor Tax & Financial Consulting");
  const [rEmail, setREmail] = useState("tj@irspilot.com");
  const [rNote, setRNote] = useState("");
  const [toast, setToast] = useState("");
  const dragRef = useRef(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2600); }

  /* drag-drop */
  function onDragOver(e) { e.preventDefault(); dragRef.current = true; }
  function onDrop(e) { e.preventDefault(); dragRef.current = false; addFiles(e.dataTransfer.files); }
  function addFiles(raw) {
    const pdfs = Array.from(raw).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) { showToast("PDF files only"); return; }
    setFiles(prev => {
      const existing = new Set(prev.map(x => x.file.name + x.file.size));
      const fresh = pdfs.filter(f => !existing.has(f.name + f.size)).map(f => ({ file: f, status: "pending", error: "" }));
      return [...prev, ...fresh];
    });
  }

  async function processFiles() {
    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) { showToast("No pending files"); return; }
    setProcessing(true);
    let collected = [...txns];
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setFiles(prev => prev.map(x => x.file === item.file ? { ...x, status: "processing" } : x));
      setProgress({ pct: Math.round((i / pending.length) * 90), text: `Processing ${item.file.name}…` });
      try {
        const b64 = await toBase64(item.file);
        const resp = await fetch("/api/admin/bookkeeping/extract", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_base64: b64, filename: item.file.name })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || `Server error ${resp.status}`);
        const mapped = (data.transactions || []).map((t, idx) => ({
          id: `${Date.now()}_${i}_${idx}`,
          date: t.date || "",
          description: String(t.description || ""),
          amount: parseFloat(t.amount) || 0,
          category: BK_CATS.includes(t.category) ? t.category : "Uncategorized",
          flag: ["ok","unclear","review"].includes(t.flag) ? t.flag : "unclear",
          note: t.note || "",
          src: item.file.name
        }));
        collected = [...collected, ...mapped];
        setFiles(prev => prev.map(x => x.file === item.file ? { ...x, status: "done" } : x));
      } catch (err) {
        setFiles(prev => prev.map(x => x.file === item.file ? { ...x, status: "error", error: err.message } : x));
      }
    }
    setTxns(collected);
    setProgress({ pct: 100, text: "Done!" });
    setProcessing(false);
    if (collected.length) {
      showToast(`${collected.length} transactions extracted`);
      setTab("transactions");
    }
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("File read failed"));
      r.readAsDataURL(file);
    });
  }

  /* transaction ops */
  function cycleFlag(id) {
    const order = ["ok","unclear","review"];
    setTxns(prev => prev.map(t => t.id === id ? { ...t, flag: order[(order.indexOf(t.flag) + 1) % 3] } : t));
  }
  function updateCat(id, val) { setTxns(prev => prev.map(t => t.id === id ? { ...t, category: val } : t)); }
  function updateNote(id, val) { setTxns(prev => prev.map(t => t.id === id ? { ...t, note: val } : t)); }
  function openEdit(t) { setEditIdx(t.id); setEditDraft({ ...t }); }
  function saveEdit() {
    setTxns(prev => prev.map(t => t.id === editIdx ? { ...editDraft } : t));
    setEditIdx(null);
  }

  /* filtered view */
  const filtered = txns.filter(t => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.note.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && t.category !== catFilter) return false;
    if (flagFilter === "unclear" && t.flag === "ok") return false;
    if (flagFilter === "ok" && t.flag !== "ok") return false;
    return true;
  });
  const cats = [...new Set(txns.map(t => t.category))].sort();
  const income = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const unclear = txns.filter(t => t.flag !== "ok").length;

  /* report */
  const reportItems = txns.filter(t => t.flag !== "ok");
  const reportText = `${rFirm}\n${rEmail}\n\n${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\nDear ${rClient || "[Client Name]"},\n\nThank you for allowing us to assist with your bookkeeping for the period of ${rPeriod || "[Period]"}.\n\nDuring our review of your bank statements, we identified the following transactions that require additional clarification:\n\n${reportItems.length ? reportItems.map((t, i) => `  ${i + 1}. ${t.date}  |  ${t.description}  |  ${fmt$(t.amount)}${t.note ? "\n     Note: " + t.note : ""}`).join("\n") : "  (None — all transactions are categorized.)"}\n\n${rNote ? rNote + "\n\n" : ""}Please reply with any details that will help us accurately classify these transactions (e.g., the purpose of the payment, the vendor, or whether it relates to a specific project).\n\nOnce we receive your responses, we will finalize your books and have an updated report ready.\n\nWarm regards,\n\n${rFirm}\n${rEmail}`;

  /* exports */
  function dlQBO() {
    if (!txns.length) { showToast("No transactions"); return; }
    const rows = [csvRow(["Date","Description","Amount","Account/Category","Memo"])];
    txns.forEach(t => rows.push(csvRow([t.date, t.description, t.amount.toFixed(2), t.category, t.note])));
    dl("qbo_import.csv", rows.join("\n")); showToast("QBO CSV downloaded");
  }
  function dlWorkpaper() {
    if (!txns.length) { showToast("No transactions"); return; }
    const rows = [csvRow(["Date","Description","Amount","Category","Status","Note","Source"])];
    txns.forEach(t => rows.push(csvRow([t.date, t.description, t.amount.toFixed(2), t.category, t.flag, t.note, t.src])));
    dl("bookkeeping_workpaper.csv", rows.join("\n")); showToast("Workpaper downloaded");
  }
  function dlIIF() {
    if (!txns.length) { showToast("No transactions"); return; }
    let s = "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!ENDTRNS\n";
    txns.forEach(t => {
      const tp = t.amount >= 0 ? "DEP" : "CHECK";
      s += `TRNS\t${tp}\t${t.date}\tChecking\t${t.description}\t${t.amount.toFixed(2)}\t${t.note}\nSPL\t${tp}\t${t.date}\t${t.category}\t${t.description}\t${(-t.amount).toFixed(2)}\t\nENDTRNS\n`;
    });
    dl("export.iif", s); showToast("IIF downloaded");
  }

  /* ── styles ── */
  const S = {
    wrap: { fontFamily: "'DM Sans',sans-serif", maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" },
    tabBar: { display: "flex", gap: 4, borderBottom: "2px solid #e8e4dc", marginBottom: 24, flexWrap: "wrap" },
    tabBtn: (id) => ({ padding: "10px 20px", background: tab === id ? "#1a2d5a" : "transparent", color: tab === id ? "#7ec11f" : "#888", border: "none", borderRadius: "8px 8px 0 0", fontFamily: "'DM Sans',sans-serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" }),
    card: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
    stat: { background: "#f8f6f1", borderRadius: 10, padding: "14px 16px" },
    statLabel: { fontSize: 11, color: "#888", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    statVal: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a" },
    input: { padding: "8px 12px", border: "1px solid #e0ddd6", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: "#fff", color: "#1a2d5a", width: "100%" },
    btn: (primary) => ({ padding: primary ? "10px 22px" : "8px 18px", background: primary ? "#1a2d5a" : "#fff", color: primary ? "#7ec11f" : "#555", border: primary ? "none" : "1px solid #d0cdc6", borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" }),
    badge: (flag) => {
      const m = { ok: ["#e8f5e9","#2e7d32"], unclear: ["#fff8e1","#f57f17"], review: ["#fce4ec","#c62828"] };
      const [bg, c] = m[flag] || m.unclear;
      return { display: "inline-block", background: bg, color: c, fontSize: 11, fontWeight: "bold", padding: "3px 8px", borderRadius: 20, cursor: "pointer", userSelect: "none" };
    },
    th: { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#888", borderBottom: "1px solid #e8e4dc", background: "#f8f6f1", textTransform: "uppercase", letterSpacing: 0.4 },
    td: { padding: "9px 12px", borderBottom: "1px solid #f0ede8", fontSize: 13, verticalAlign: "middle" },
    uploadZone: { border: "2px dashed #d0cdc6", borderRadius: 14, padding: "48px 32px", textAlign: "center", cursor: "pointer", background: "#fafaf8" },
    fileRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid #e8e4dc", borderRadius: 8, background: "#fff", marginBottom: 6 },
    statusBadge: (s) => {
      const m = { pending: ["#e3f2fd","#1565c0"], processing: ["#fff8e1","#f57f17"], done: ["#e8f5e9","#2e7d32"], error: ["#fce4ec","#c62828"] };
      const [bg, c] = m[s] || m.pending;
      return { background: bg, color: c, fontSize: 11, fontWeight: "bold", padding: "3px 9px", borderRadius: 20 };
    },
    exportGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    exportCard: { border: "1px solid #e8e4dc", borderRadius: 12, padding: "20px 22px", background: "#fff" },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: "bold", color: "#888", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 },
    previewBox: { background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 10, padding: "18px 20px", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "Georgia,serif", maxHeight: 380, overflowY: "auto" }
  };

  /* ────────────────────────────────────────────────── RENDER ── */

  return React.createElement("div", { style: S.wrap },

    /* Tab bar */
    React.createElement("div", { style: S.tabBar },
      [["upload","📤 Upload"],["transactions","📋 Transactions" + (txns.length ? ` (${txns.length})` : "")],["report","📨 Client Report"],["export","💾 Export"]].map(([id, label]) =>
        React.createElement("button", { key: id, style: S.tabBtn(id), onClick: () => setTab(id) }, label)
      )
    ),

    /* ── UPLOAD TAB ── */
    tab === "upload" && React.createElement("div", null,
      React.createElement("div", {
        style: S.uploadZone,
        onClick: () => document.getElementById("bk-file-input").click(),
        onDragOver, onDrop
      },
        React.createElement("div", { style: { fontSize: 36, marginBottom: 10 } }, "📄"),
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, color: "#1a2d5a", marginBottom: 6 } }, "Drop bank statement PDFs here"),
        React.createElement("div", { style: { color: "#888", fontSize: 13 } }, "or click to browse — multiple files supported")
      ),
      React.createElement("input", { type: "file", id: "bk-file-input", accept: ".pdf", multiple: true, style: { display: "none" }, onChange: e => addFiles(e.target.files) }),

      /* file list */
      files.length > 0 && React.createElement("div", { style: { marginTop: 12 } },
        files.map((item, i) =>
          React.createElement("div", { key: i, style: S.fileRow },
            React.createElement("span", { style: { fontSize: 18 } }, "📄"),
            React.createElement("span", { style: { flex: 1, fontSize: 13, fontWeight: "bold", color: "#1a2d5a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, item.file.name),
            React.createElement("span", { style: { fontSize: 12, color: "#aaa" } }, `${(item.file.size / 1024).toFixed(0)} KB`),
            React.createElement("span", { style: S.statusBadge(item.status) }, item.status === "processing" ? "Processing…" : item.status.charAt(0).toUpperCase() + item.status.slice(1)),
            item.status === "error" && React.createElement("span", { style: { fontSize: 11, color: "#c62828", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: item.error }, item.error)
          )
        )
      ),

      /* progress bar */
      processing && React.createElement("div", { style: { marginTop: 12 } },
        React.createElement("div", { style: { height: 4, background: "#e8e4dc", borderRadius: 2, overflow: "hidden" } },
          React.createElement("div", { style: { height: "100%", width: progress.pct + "%", background: "#7ec11f", borderRadius: 2, transition: "width 0.3s" } })
        ),
        React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 5 } }, progress.text)
      ),

      /* action buttons */
      files.length > 0 && React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 } },
        React.createElement("button", { style: S.btn(false), onClick: () => { setFiles([]); setTxns([]); } }, "Clear all"),
        React.createElement("button", {
          style: { ...S.btn(true), opacity: processing ? 0.5 : 1 },
          disabled: processing,
          onClick: processFiles
        }, processing ? "Extracting…" : "Extract transactions")
      )
    ),

    /* ── TRANSACTIONS TAB ── */
    tab === "transactions" && React.createElement("div", null,
      /* stats */
      React.createElement("div", { style: S.statGrid },
        [
          ["Total", txns.length.toString(), "#1a2d5a"],
          ["Income", "$" + income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "#2e7d32"],
          ["Expenses", "$" + Math.abs(expense).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "#c62828"],
          ["Needs Clarification", unclear.toString(), "#f57f17"]
        ].map(([label, val, color]) =>
          React.createElement("div", { key: label, style: S.stat },
            React.createElement("div", { style: S.statLabel }, label),
            React.createElement("div", { style: { ...S.statVal, color } }, val)
          )
        )
      ),

      /* filters */
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("input", { style: { ...S.input, flex: 1, minWidth: 160 }, placeholder: "Search descriptions…", value: search, onChange: e => setSearch(e.target.value) }),
        React.createElement("select", { style: { ...S.input, width: "auto" }, value: catFilter, onChange: e => setCatFilter(e.target.value) },
          React.createElement("option", { value: "" }, "All categories"),
          cats.map(c => React.createElement("option", { key: c, value: c }, c))
        ),
        ["all","unclear","ok"].map(f =>
          React.createElement("button", {
            key: f,
            style: { ...S.btn(flagFilter === f), padding: "8px 14px", fontSize: 12 },
            onClick: () => setFlagFilter(f)
          }, f === "all" ? "All" : f === "unclear" ? "Unclear" : "OK")
        ),
        React.createElement("button", { style: { ...S.btn(false), marginLeft: "auto" }, onClick: dlQBO }, "Export CSV")
      ),

      /* table */
      txns.length === 0
        ? React.createElement("div", { style: { textAlign: "center", padding: "48px", color: "#aaa", fontSize: 14 } }, "Upload and extract bank statements to see transactions here")
        : React.createElement("div", { style: { overflowX: "auto", border: "1px solid #e8e4dc", borderRadius: 12 } },
          React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" } },
            React.createElement("colgroup", null,
              React.createElement("col", { style: { width: 90 } }),
              React.createElement("col", null),
              React.createElement("col", { style: { width: 110 } }),
              React.createElement("col", { style: { width: 155 } }),
              React.createElement("col", { style: { width: 90 } }),
              React.createElement("col", { style: { width: 140 } })
            ),
            React.createElement("thead", null,
              React.createElement("tr", null,
                ["Date","Description","Amount","Category","Status","Note"].map(h =>
                  React.createElement("th", { key: h, style: { ...S.th, textAlign: h === "Amount" ? "right" : "left" } }, h)
                )
              )
            ),
            React.createElement("tbody", null,
              filtered.map(t =>
                React.createElement("tr", { key: t.id },
                  React.createElement("td", { style: { ...S.td, fontSize: 12, color: "#aaa" } }, t.date),
                  React.createElement("td", { style: { ...S.td, cursor: "pointer", color: "#1a2d5a" }, onClick: () => openEdit(t), title: "Click to edit" }, t.description),
                  React.createElement("td", { style: { ...S.td, textAlign: "right", fontWeight: "bold", color: t.amount >= 0 ? "#2e7d32" : "#c62828" } }, fmt$(t.amount)),
                  React.createElement("td", { style: S.td },
                    React.createElement("select", {
                      style: { width: "100%", padding: "4px 6px", border: "1px solid #e0ddd6", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "#fff", color: "#1a2d5a" },
                      value: t.category,
                      onChange: e => updateCat(t.id, e.target.value)
                    }, BK_CATS.map(c => React.createElement("option", { key: c, value: c }, c)))
                  ),
                  React.createElement("td", { style: { ...S.td, textAlign: "center" } },
                    React.createElement("span", { style: S.badge(t.flag), onClick: () => cycleFlag(t.id) },
                      t.flag === "ok" ? "OK" : t.flag === "unclear" ? "Unclear" : "Review"
                    )
                  ),
                  React.createElement("td", { style: S.td },
                    React.createElement("input", {
                      style: { width: "100%", padding: "4px 8px", border: "1px solid #e0ddd6", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", background: "#fff", color: "#333" },
                      value: t.note,
                      placeholder: "Add note…",
                      onChange: e => updateNote(t.id, e.target.value)
                    })
                  )
                )
              )
            )
          )
        )
    ),

    /* ── REPORT TAB ── */
    tab === "report" && React.createElement("div", null,
      React.createElement("div", { style: S.formGrid },
        [
          ["Client name", rClient, setRClient, "John Smith"],
          ["Period covered", rPeriod, setRPeriod, "Jan 1 – Mar 31, 2024"],
          ["Your name / firm", rFirm, setRFirm, "Taylor Tax & Financial Consulting"],
          ["Your email", rEmail, setREmail, "tj@irspilot.com"]
        ].map(([lbl, val, set, ph]) =>
          React.createElement("div", { key: lbl },
            React.createElement("label", { style: S.label }, lbl),
            React.createElement("input", { style: S.input, value: val, placeholder: ph, onChange: e => set(e.target.value) })
          )
        ),
        React.createElement("div", { style: { gridColumn: "1/-1" } },
          React.createElement("label", { style: S.label }, "Additional message"),
          React.createElement("textarea", {
            style: { ...S.input, minHeight: 70, resize: "vertical" },
            value: rNote, placeholder: "Please review the items below and reply with any details…",
            onChange: e => setRNote(e.target.value)
          })
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 12 } },
        React.createElement("span", { style: { fontSize: 13, color: "#888" } }, `${reportItems.length} item${reportItems.length !== 1 ? "s" : ""} need clarification`),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement("button", { style: S.btn(false), onClick: () => { navigator.clipboard.writeText(reportText); showToast("Copied!"); } }, "Copy text"),
        React.createElement("button", {
          style: S.btn(true),
          onClick: () => {
            const w = window.open("","_blank");
            w.document.write(`<pre style="font-family:Georgia,serif;font-size:14px;line-height:1.8;max-width:640px;margin:60px auto;white-space:pre-wrap">${reportText.replace(/</g,"&lt;")}</pre>`);
            w.document.close(); w.print();
          }
        }, "Print / Save PDF")
      ),
      React.createElement("div", { style: S.previewBox }, reportText)
    ),

    /* ── EXPORT TAB ── */
    tab === "export" && React.createElement("div", { style: S.exportGrid },
      [
        { badge: "QBO CSV", badgeColor: ["#e8f5e9","#2e7d32"], title: "QBO-mapped CSV", desc: "Formatted for QuickBooks Online Bank Transactions import. Upload under Banking > Upload transactions.", action: dlQBO, btnLabel: "Download QBO CSV", primary: true },
        { badge: "QBO API", badgeColor: ["#e3f2fd","#1565c0"], title: "QuickBooks Online API", desc: "Connect QBO via OAuth to push transactions directly. Requires a free Intuit Developer account and registered OAuth app.", action: () => { const id = prompt("Enter your QBO Company ID:"); if (id) window.open(`https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(location.origin)}&response_type=code&scope=com.intuit.quickbooks.accounting&state=${encodeURIComponent(id)}`, "_blank"); }, btnLabel: "Connect to QuickBooks", primary: false },
        { badge: "IIF legacy", badgeColor: ["#fff8e1","#f57f17"], title: "IIF file", desc: "Intuit Interchange Format for QuickBooks Desktop or legacy import workflows.", action: dlIIF, btnLabel: "Download IIF", primary: false },
        { badge: "Workpaper", badgeColor: ["#f3e5f5","#6a1b9a"], title: "Full workpaper CSV", desc: "All transactions with categories, flags, notes, and source file — for your records.", action: dlWorkpaper, btnLabel: "Download workpaper", primary: false }
      ].map(({ badge, badgeColor, title, desc, action, btnLabel, primary }) =>
        React.createElement("div", { key: title, style: S.exportCard },
          React.createElement("span", { style: { background: badgeColor[0], color: badgeColor[1], fontSize: 11, fontWeight: "bold", padding: "3px 9px", borderRadius: 20, display: "inline-block", marginBottom: 10 } }, badge),
          React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 6 } }, title),
          React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 } }, desc),
          React.createElement("button", { style: S.btn(primary), onClick: action }, btnLabel)
        )
      )
    ),

    /* ── EDIT MODAL ── */
    editIdx !== null && React.createElement("div", {
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
      onClick: e => { if (e.target === e.currentTarget) setEditIdx(null); }
    },
      React.createElement("div", { style: { background: "#fff", borderRadius: 14, padding: "24px", width: 460, maxWidth: "90vw", border: "1px solid #e8e4dc" } },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, color: "#1a2d5a", marginBottom: 16 } }, "Edit transaction"),
        [
          ["Description", "description", "text"],
          ["Note / memo", "note", "text"]
        ].map(([lbl, key, type]) =>
          React.createElement("div", { key: key, style: { marginBottom: 12 } },
            React.createElement("label", { style: S.label }, lbl),
            React.createElement("input", { style: S.input, type, value: editDraft[key] || "", onChange: e => setEditDraft(d => ({ ...d, [key]: e.target.value })) })
          )
        ),
        React.createElement("div", { style: { marginBottom: 12 } },
          React.createElement("label", { style: S.label }, "Category"),
          React.createElement("select", { style: S.input, value: editDraft.category || "", onChange: e => setEditDraft(d => ({ ...d, category: e.target.value })) },
            BK_CATS.map(c => React.createElement("option", { key: c, value: c }, c))
          )
        ),
        React.createElement("div", { style: { marginBottom: 16 } },
          React.createElement("label", { style: S.label }, "Status"),
          React.createElement("select", { style: S.input, value: editDraft.flag || "ok", onChange: e => setEditDraft(d => ({ ...d, flag: e.target.value })) },
            React.createElement("option", { value: "ok" }, "Confirmed OK"),
            React.createElement("option", { value: "unclear" }, "Needs clarification"),
            React.createElement("option", { value: "review" }, "Flagged for review")
          )
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
          React.createElement("button", { style: S.btn(false), onClick: () => setEditIdx(null) }, "Cancel"),
          React.createElement("button", { style: S.btn(true), onClick: saveEdit }, "Save")
        )
      )
    ),

    React.createElement(Toast, { msg: toast })
  );
}

window.BookkeepingTool = BookkeepingTool;
