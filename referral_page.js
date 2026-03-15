const { useState, useEffect, useRef, useCallback, useMemo } = React;

function ReferralPage() {
  const [partner, setPartner] = React.useState(null);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [joining, setJoining] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const BASE_URL = window.location.origin;
  React.useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setUser(d));
    fetch("/api/referral/me").then((r) => r.json()).then((d) => {
      setPartner(d.partner);
      setStats(d.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const handleJoin = async () => {
    setJoining(true);
    const res = await fetch("/api/referral/join", { method: "POST" });
    const data = await res.json();
    setJoining(false);
    if (res.ok) {
      setPartner({ code: data.code, commission_pct: 20 });
      setStats({ conversions: 0, total_commission: 0, unpaid_commission: 0, history: [] });
    } else {
      alert(data.error || "Something went wrong.");
    }
  };
  const copyLink = () => {
    navigator.clipboard.writeText(`${BASE_URL}/refer/${partner.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const card = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "24px 28px", marginBottom: 20 };
  if (loading) return React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#888" } }, "Loading...");
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Navigator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "REFERRAL PARTNER PROGRAM"))), /* @__PURE__ */ React.createElement("a", { href: "/account", style: { color: "#aaa", fontSize: 13, textDecoration: "none", border: "1px solid #444", padding: "6px 14px", borderRadius: 6 } }, "\u2190 My Account"))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 760, margin: "0 auto", padding: "36px 24px" } }, !user?.loggedIn ? /* @__PURE__ */ React.createElement("div", { style: { ...card, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 16 } }, "\u{1F512}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", marginBottom: 8 } }, "Sign In Required"), /* @__PURE__ */ React.createElement("div", { style: { color: "#666", marginBottom: 20 } }, "You need an account to join the referral program."), /* @__PURE__ */ React.createElement("a", { href: "/login?next=/referral", style: { display: "inline-block", padding: "12px 24px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", textDecoration: "none" } }, "Sign In \u2192")) : !partner ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: "bold", marginBottom: 8 } }, "Earn by Referring Clients"), /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" } }, "Share your unique referral link with clients, colleagues, or your audience. Earn ", /* @__PURE__ */ React.createElement("strong", null, "20% commission"), " on every purchase made through your link.")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 } }, [
    { icon: "\u{1F517}", label: "Get your link", desc: "One unique link, share anywhere" },
    { icon: "\u{1F4B3}", label: "Client purchases", desc: "They buy any plan through your link" },
    { icon: "\u{1F4B0}", label: "You earn 20%", desc: "$11.80 \xB7 $19.80 \xB7 $25.80 per sale" }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.label, style: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: "20px 16px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, marginBottom: 10 } }, s.icon), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, marginBottom: 4 } }, s.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888" } }, s.desc)))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleJoin,
      disabled: joining,
      style: { padding: "14px 32px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 16, cursor: "pointer" }
    },
    joining ? "Setting up..." : "Join the Referral Program \u2192"
  ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", marginTop: 10 } }, "Free to join. No minimums."))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 } }, [
    { label: "Total Sales", value: stats?.conversions || 0 },
    { label: "Total Earned", value: `$${((stats?.total_commission || 0) / 100).toFixed(2)}` },
    { label: "Pending Payout", value: `$${((stats?.unpaid_commission || 0) / 100).toFixed(2)}` }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.label, style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 26, fontWeight: "bold", color: "#1a2d5a" } }, s.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginTop: 4 } }, s.label)))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "Your Referral Link"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "10px 14px", background: "#f8f6f1", borderRadius: 8, border: "1px solid #e8e4dc", fontSize: 14, color: "#555", wordBreak: "break-all" } }, BASE_URL, "/refer/", partner.code), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: copyLink,
      style: { padding: "10px 18px", background: copied ? "#7ec11f" : "#1a2d5a", color: copied ? "#1a2d5a" : "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }
    },
    copied ? "\u2713 Copied!" : "Copy Link"
  )), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 13, color: "#888" } }, "Your commission rate: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#1a2d5a" } }, partner.commission_pct, "%"), " per sale \xB7 Navigator: ", /* @__PURE__ */ React.createElement("strong", null, "$", (5900 * partner.commission_pct / 1e4).toFixed(2)), " \xB7 Wizard: ", /* @__PURE__ */ React.createElement("strong", null, "$", (9900 * partner.commission_pct / 1e4).toFixed(2)), " \xB7 Bundle: ", /* @__PURE__ */ React.createElement("strong", null, "$", (12900 * partner.commission_pct / 1e4).toFixed(2)))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 14, color: "#1a2d5a" } }, "Conversion History"), !stats?.history?.length ? /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 14, textAlign: "center", padding: "20px 0" } }, "No conversions yet. Share your link to start earning.") : /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { borderBottom: "1px solid #f0ede8" } }, ["Date", "Product", "Sale", "Your Commission", "Status"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 12px", textAlign: "left", color: "#888", fontSize: 12, fontWeight: "bold" } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, stats.history.map((row, i) => /* @__PURE__ */ React.createElement("tr", { key: i, style: { borderTop: "1px solid #f8f6f1" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666" } }, row.created_at?.slice(0, 10)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", textTransform: "capitalize" } }, row.product), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, "$", (row.sale_amount / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#7ec11f", fontWeight: "bold" } }, "$", (row.commission_amount / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: row.paid_out ? "#f0fdf4" : "#fef9ec", color: row.paid_out ? "#15803d" : "#92400e", fontWeight: "bold" } }, row.paid_out ? "Paid" : "Pending"))))))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#aaa", textAlign: "center" } }, "Commissions are paid manually by Taylor Tax and Financial Consulting Inc. Questions? ", /* @__PURE__ */ React.createElement("a", { href: "https://www.calendly.com/taylor-tax-financial/tax-help", style: { color: "#1a2d5a" } }, "Schedule a call \u2192")))));
}
window.ReferralPage = ReferralPage;