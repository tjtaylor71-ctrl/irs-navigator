const { useState, useEffect, useRef, useCallback, useMemo } = React;

function AdminPage() {
  const [tab, setTab] = React.useState("users");
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [grantEmail, setGrantEmail] = React.useState("");
  const [grantProduct, setGrantProduct] = React.useState("navigator");
  const [grantMsg, setGrantMsg] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [discounts, setDiscounts] = React.useState([]);
  const [referrals, setReferrals] = React.useState([]);
  const [newCode, setNewCode] = React.useState("");
  const [newPct, setNewPct] = React.useState(20);
  const [newExpiry, setNewExpiry] = React.useState("");
  const [newMaxUses, setNewMaxUses] = React.useState("");
  const [discountMsg, setDiscountMsg] = React.useState("");
  const [proSubs, setProSubs] = React.useState([]);
  const [proEmail, setProEmail] = React.useState("");
  const [proFirm, setProFirm] = React.useState("");
  const [proName, setProName] = React.useState("");
  const [proPhone, setProPhone] = React.useState("");
  const [proCal, setProCal] = React.useState("");
  const [proMsg, setProMsg] = React.useState("");
  const [interests, setInterests] = React.useState([]);
  const [proLink, setProLink] = React.useState("");
  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/data").then((r) => r.json()),
      fetch("/api/admin/discounts").then((r) => r.json()),
      fetch("/api/admin/referrals").then((r) => r.json()),
      fetch("/api/admin/pro/subscribers").then((r) => r.json()),
      fetch("/api/admin/taxpro/interests").then((r) => r.json())
    ]).then(([d, disc, ref, pro, tp]) => {
      setData(d);
      setDiscounts(disc.codes || []);
      setReferrals(ref.partners || []);
      setProSubs(pro.subscribers || []);
      setInterests(tp.interests || []);
      setLoading(false);
    }).catch((e) => {
      setError(`Error: ${e}`);
      setLoading(false);
    });
  };
  React.useEffect(() => {
    load();
  }, []);
  const handleGrant = async () => {
    setGrantMsg("");
    const res = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail, product: grantProduct })
    });
    const d = await res.json();
    setGrantMsg(res.ok ? `\u2705 Access granted to ${grantEmail}` : `\u274C ${d.error}`);
    if (res.ok) {
      setGrantEmail("");
      load();
    }
  };
  const handleRevoke = async (purchaseId, email) => {
    if (!confirm(`Revoke access for ${email}?`)) return;
    const res = await fetch("/api/admin/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchase_id: purchaseId })
    });
    if (res.ok) load();
    else {
      const d = await res.json();
      alert(`Error: ${d.error}`);
    }
  };
  const handleCreateDiscount = async () => {
    setDiscountMsg("");
    if (!newCode || !newPct) {
      setDiscountMsg("Code and % required.");
      return;
    }
    const res = await fetch("/api/admin/discounts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, discount_pct: parseInt(newPct), expires_at: newExpiry || null, max_uses: newMaxUses ? parseInt(newMaxUses) : null })
    });
    const d = await res.json();
    setDiscountMsg(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
    if (res.ok) {
      setNewCode("");
      load();
    }
  };
  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this code?")) return;
    await fetch("/api/admin/discounts/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  };
  const handleMarkPaid = async (partner_id, email) => {
    if (!confirm(`Mark all pending commissions for ${email} as paid?`)) return;
    await fetch("/api/admin/referrals/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id })
    });
    load();
  };
  const handleCreatePro = async () => {
    setProMsg("");
    setProLink("");
    if (!proEmail || !proFirm || !proName) {
      setProMsg("Email, firm name, and contact name required.");
      return;
    }
    const res = await fetch("/api/admin/pro/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: proEmail, firm_name: proFirm, contact_name: proName, contact_phone: proPhone, calendly_url: proCal })
    });
    const d = await res.json();
    if (res.ok) {
      setProMsg(`\u2705 ${d.message}`);
      setProLink(d.shareable_link);
      setProEmail("");
      setProFirm("");
      setProName("");
      setProPhone("");
      setProCal("");
      load();
    } else {
      setProMsg(`\u274C ${d.error}`);
    }
  };
  const handleDeactivatePro = async (id, email) => {
    if (!confirm(`Deactivate pro access for ${email}?`)) return;
    await fetch("/api/admin/pro/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  };
  const handleResetSessions = async (id, email) => {
    if (!confirm(`Reset session count for ${email}?`)) return;
    await fetch("/api/admin/pro/reset-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  };
  const handleOpenReseller = (sub) => {
    setResellerSub(sub);
    setResellerPrices({
      navigator: sub.reseller_navigator_price ? (sub.reseller_navigator_price / 100).toFixed(2) : "79.00",
      wizard: sub.reseller_wizard_price ? (sub.reseller_wizard_price / 100).toFixed(2) : "139.00",
      bundle: sub.reseller_bundle_price ? (sub.reseller_bundle_price / 100).toFixed(2) : "179.00"
    });
    setResellerMsg("");
  };
  const handleSaveReseller = async () => {
    setResellerMsg("");
    const res = await fetch("/api/admin/pro/update-reseller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: resellerSub.id,
        reseller_mode: true,
        navigator_price: parseFloat(resellerPrices.navigator),
        wizard_price: parseFloat(resellerPrices.wizard),
        bundle_price: parseFloat(resellerPrices.bundle)
      })
    });
    const d = await res.json();
    setResellerMsg(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
    if (res.ok) {
      setResellerSub(null);
      load();
    }
  };
  const handleDisableReseller = async (id) => {
    await fetch("/api/admin/pro/update-reseller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reseller_mode: false, navigator_price: 0, wizard_price: 0, bundle_price: 0 })
    });
    load();
  };
  const handleGenerateClientLink = async (id, email) => {
    setClientLinkMsg("");
    const res = await fetch("/api/admin/pro/generate-client-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, product: clientLinkProduct })
    });
    const d = await res.json();
    if (res.ok) {
      navigator.clipboard.writeText(d.link);
      setClientLinkMsg(`\u2705 ${clientLinkProduct} link copied! Send to ${email}: ${d.link}`);
    } else {
      setClientLinkMsg(`\u274C ${d.error}`);
    }
  };
  const handleSendSubLink = async (id, email) => {
    const res = await fetch("/api/admin/pro/send-subscription-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const d = await res.json();
    if (res.ok) {
      navigator.clipboard.writeText(d.checkout_url);
      alert(`\u2705 Stripe checkout link copied to clipboard!

Send this to ${email} so they can enter their payment details:

${d.checkout_url}`);
    } else {
      alert(`\u274C ${d.error}`);
    }
  };
  const handleChargeOverage = async (id, email, sessionsOver) => {
    const extra = parseInt(prompt(`How many overage sessions to charge ${email}? (Current overage: ${sessionsOver})`, sessionsOver));
    if (!extra || extra < 1) return;
    if (!confirm(`Charge ${email} $${extra * 5}.00 for ${extra} overage session(s)?`)) return;
    const res = await fetch("/api/admin/pro/charge-overage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, extra_sessions: extra })
    });
    const d = await res.json();
    alert(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
  };
  const inp = {
    padding: "9px 12px",
    borderRadius: 7,
    border: "1.5px solid #ddd",
    fontSize: 14,
    fontFamily: "Georgia, serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box"
  };
  const productColors = { navigator: "#1a2d5a", wizard: "#1a2d5a", bundle: "#1a2d5a" };
  const productLabel = { navigator: "Navigator", wizard: "Wizard", bundle: "Bundle" };
  const filtered = (data?.users || []).filter(
    (u) => !search || u.email.toLowerCase().includes(search.toLowerCase())
  );
  if (loading) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#888" } }, "Loading admin data...");
  if (error) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#dc2626" } }, error);
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "ADMIN PANEL"))), /* @__PURE__ */ React.createElement("a", { href: "/", style: { color: "#aaa", fontSize: 13, textDecoration: "none", border: "1px solid #444", padding: "6px 14px", borderRadius: 6 } }, "\u2190 Home"))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "24px 24px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e8e4dc" } }, [["users", "\u{1F465} Users"], ["discounts", "\u{1F3F7}\uFE0F Discount Codes"], ["referrals", "\u{1F517} Referral Partners"], ["pro", "\u{1F3E2} Pro Subscribers"], ["taxpro", "\u{1F4CB} Pro Interests"]].map(([id, label]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: id,
      onClick: () => setTab(id),
      style: { padding: "10px 20px", background: tab === id ? "#1a2d5a" : "transparent", color: tab === id ? "#7ec11f" : "#888", border: "none", borderRadius: "8px 8px 0 0", fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" }
    },
    label
  )))), tab === "users" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } }, [
    { label: "Total Users", value: data.stats.total_users },
    { label: "Active Purchases", value: data.stats.active_purchases },
    { label: "Navigator Access", value: data.stats.navigator_count },
    { label: "Wizard Access", value: data.stats.wizard_count }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.label, style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", color: "#1a2d5a" } }, s.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginTop: 4 } }, s.label)))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "24px", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Grant Access"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: grantEmail,
      onChange: (e) => setGrantEmail(e.target.value),
      placeholder: "user@email.com",
      style: { ...inp, flex: 1, minWidth: 200, width: "auto" }
    }
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: grantProduct,
      onChange: (e) => setGrantProduct(e.target.value),
      style: { ...inp, background: "#fff", width: "auto" }
    },
    /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator ($59)"),
    /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard ($99)"),
    /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle ($129)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGrant,
      style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" }
    },
    "Grant \u2192"
  )), grantMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: grantMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, grantMsg)), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px", borderBottom: "1px solid #f0ede8", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Users (", filtered.length, ")"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: search,
      onChange: (e) => setSearch(e.target.value),
      placeholder: "Search by email...",
      style: { ...inp, width: 220 }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Signed Up", "Active Access", "Expires", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontWeight: "bold", color: "#555", fontSize: 12, letterSpacing: 0.5 } }, h.toUpperCase())))), /* @__PURE__ */ React.createElement("tbody", null, filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { padding: "24px 16px", color: "#aaa", textAlign: "center" } }, "No users found")), filtered.map((user) => /* @__PURE__ */ React.createElement("tr", { key: user.id, style: { borderTop: "1px solid #f0ede8" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#1a2d5a" } }, user.email), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666" } }, user.created_at?.slice(0, 10)), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, user.purchases.length === 0 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#aaa", fontSize: 12 } }, "None") : user.purchases.map((p) => /* @__PURE__ */ React.createElement("span", { key: p.id, style: { background: productColors[p.product] || "#555", color: "#7ec11f", fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 20 } }, productLabel[p.product] || p.product)))), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666" } }, user.purchases.length > 0 ? user.purchases.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id }, p.expires_at?.slice(0, 10))) : "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, user.purchases.map((p) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: p.id,
      onClick: () => handleRevoke(p.id, user.email),
      style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "Revoke ",
    productLabel[p.product]
  ))))))))))), tab === "discounts" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Create Discount Code"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CODE"), /* @__PURE__ */ React.createElement("input", { value: newCode, onChange: (e) => setNewCode(e.target.value.toUpperCase()), placeholder: "SAVE20", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "DISCOUNT %"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newPct, onChange: (e) => setNewPct(e.target.value), min: "1", max: "100", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "EXPIRES (optional)"), /* @__PURE__ */ React.createElement("input", { type: "date", value: newExpiry, onChange: (e) => setNewExpiry(e.target.value), style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "MAX USES (optional)"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newMaxUses, onChange: (e) => setNewMaxUses(e.target.value), placeholder: "unlimited", style: inp })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCreateDiscount,
      style: { padding: "9px 18px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }
    },
    "Create \u2192"
  )), discountMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: discountMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, discountMsg)), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "All Codes (", discounts.length, ")"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Code", "Discount", "Uses", "Max Uses", "Expires", "Status", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))), /* @__PURE__ */ React.createElement("tbody", null, discounts.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No discount codes yet.")), discounts.map((d) => /* @__PURE__ */ React.createElement("tr", { key: d.id, style: { borderTop: "1px solid #f0ede8" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontWeight: "bold", fontFamily: "monospace", fontSize: 14 } }, d.code), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#7ec11f", fontWeight: "bold" } }, d.discount_pct, "% off"), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, d.use_count), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#888" } }, d.max_uses || "\u221E"), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#888" } }, d.expires_at?.slice(0, 10) || "Never"), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: d.active ? "#f0fdf4" : "#f8f6f1", color: d.active ? "#15803d" : "#aaa", fontWeight: "bold" } }, d.active ? "Active" : "Inactive")), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, d.active && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDeactivate(d.id),
      style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "Deactivate"
  )))))))), tab === "referrals" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Referral Partners (", referrals.length, ")"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Code", "Commission %", "Sales", "Total Earned", "Unpaid", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))), /* @__PURE__ */ React.createElement("tbody", null, referrals.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No referral partners yet.")), referrals.map((p) => /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, p.email), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontFamily: "monospace", fontWeight: "bold", fontSize: 14 } }, p.code), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#7ec11f", fontWeight: "bold" } }, p.commission_pct, "%"), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, p.conversions), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, "$", (p.total_commission / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: p.unpaid > 0 ? "#dc2626" : "#aaa", fontWeight: p.unpaid > 0 ? "bold" : "normal" } }, "$", (p.unpaid / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, p.unpaid > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleMarkPaid(p.id, p.email),
      style: { padding: "4px 10px", background: "transparent", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "Mark Paid"
  )))))))), tab === "pro" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 4, color: "#1a2d5a" } }, "Create Pro Subscriber"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16 } }, "The subscriber will receive a unique shareable link for their clients."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "ACCOUNT EMAIL"), /* @__PURE__ */ React.createElement("input", { value: proEmail, onChange: (e) => setProEmail(e.target.value), placeholder: "advisor@firm.com", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "FIRM NAME"), /* @__PURE__ */ React.createElement("input", { value: proFirm, onChange: (e) => setProFirm(e.target.value), placeholder: "Smith Tax Services", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CONTACT NAME"), /* @__PURE__ */ React.createElement("input", { value: proName, onChange: (e) => setProName(e.target.value), placeholder: "John Smith, EA", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "PHONE (optional)"), /* @__PURE__ */ React.createElement("input", { value: proPhone, onChange: (e) => setProPhone(e.target.value), placeholder: "(555) 123-4567", style: inp })), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CALENDLY URL (optional)"), /* @__PURE__ */ React.createElement("input", { value: proCal, onChange: (e) => setProCal(e.target.value), placeholder: "https://calendly.com/their-link", style: inp }))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCreatePro,
      style: { padding: "10px 22px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" }
    },
    "Create Pro Subscriber \u2192"
  ), proMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: proMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, proMsg), proLink && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#15803d", marginBottom: 4 } }, "SHAREABLE LINK \u2014 SEND THIS TO THE SUBSCRIBER"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#1a2d5a", wordBreak: "break-all", fontFamily: "monospace" } }, proLink))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Active Subscribers (", proSubs.filter((s) => s.active).length, ")"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Firm", "Contact", "Code", "Sessions", "Billing", "Status", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))), /* @__PURE__ */ React.createElement("tbody", null, proSubs.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No pro subscribers yet.")), proSubs.map((p) => /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontSize: 12 } }, p.email), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontWeight: "bold" } }, p.firm_name), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666" } }, p.contact_name), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontFamily: "monospace", fontWeight: "bold", color: "#1a2d5a" } }, p.access_code), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { color: p.sessions_used > p.sessions_limit ? "#dc2626" : "#15803d", fontWeight: "bold" } }, p.sessions_used, " / ", p.sessions_limit), p.sessions_used > p.sessions_limit && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#dc2626" } }, "+", p.sessions_used - p.sessions_limit, " overage")), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    background: p.stripe_sub_id ? "#f0fdf4" : "#fef9ec",
    color: p.stripe_sub_id ? "#15803d" : "#92400e",
    fontWeight: "bold"
  } }, p.stripe_sub_id ? "\u2713 Subscribed" : "\u26A0 No billing")), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: p.active ? "#f0fdf4" : "#f8f6f1", color: p.active ? "#15803d" : "#aaa", fontWeight: "bold" } }, p.active ? "Active" : "Inactive")), /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap" } }, !p.stripe_sub_id && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSendSubLink(p.id, p.email),
      style: { padding: "4px 8px", background: "#1a2d5a", border: "1px solid #7ec11f", color: "#7ec11f", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "\u{1F4B3} Get Billing Link"
  ), p.sessions_used > p.sessions_limit && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleChargeOverage(p.id, p.email, p.sessions_used - p.sessions_limit),
      style: { padding: "4px 8px", background: "transparent", border: "1px solid #fde68a", color: "#92400e", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "\u26A1 Charge Overage"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleOpenReseller(p),
      style: { padding: "4px 8px", background: p.reseller_mode ? "#7ec11f" : "transparent", border: "1px solid #7ec11f", color: p.reseller_mode ? "#1a2d5a" : "#7ec11f", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    p.reseller_mode ? "\u2713 Reseller" : "Set Reseller"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleResetSessions(p.id, p.email),
      style: { padding: "4px 8px", background: "transparent", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "Reset Sessions"
  ), p.active && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDeactivatePro(p.id, p.email),
      style: { padding: "4px 8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" }
    },
    "Deactivate"
  )))))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "Generate Single-Use Client Access Link"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#666", marginBottom: 14 } }, "Generate a link to send to a client after you've collected payment outside IRS Pilot. Link expires after 30 days or first use."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: clientLinkProduct,
      onChange: (e) => setClientLinkProduct(e.target.value),
      style: { ...inp, width: "auto", background: "#fff" }
    },
    /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator"),
    /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard"),
    /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle")
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      onChange: (e) => {
        if (e.target.value) handleGenerateClientLink(e.target.value.split("|")[0], e.target.value.split("|")[1]);
        e.target.value = "";
      },
      style: { ...inp, flex: 1, background: "#fff" }
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Select subscriber to generate link for..."),
    proSubs.filter((s) => s.active).map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: `${s.id}|${s.email}` }, s.firm_name, " (", s.email, ")"))
  )), clientLinkMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: clientLinkMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", wordBreak: "break-all" } }, clientLinkMsg)), resellerSub && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, padding: 32, maxWidth: 480, width: "90%", border: "2px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 18, color: "#1a2d5a", marginBottom: 4 } }, "Reseller Pricing"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 20 } }, resellerSub.firm_name, " \xB7 Minimum 50% markup required"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14, marginBottom: 20 } }, [["navigator", "Navigator", "79.00"], ["wizard", "Wizard", "139.00"], ["bundle", "Bundle", "179.00"]].map(([key, label, min]) => /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, label, " Price (min $", min, ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "#555" } }, "$"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: resellerPrices[key],
      onChange: (e) => setResellerPrices((p) => ({ ...p, [key]: e.target.value })),
      style: { ...inp, flex: 1 },
      step: "0.01",
      min
    }
  ))))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 16, background: "#f0f9e0", padding: "10px 14px", borderRadius: 8, border: "1px solid #7ec11f" } }, "Clients pay via: ", /* @__PURE__ */ React.createElement("strong", null, "irspilot.com/pro/", resellerSub.access_code, "/navigator"), " (or /wizard, /bundle)"), resellerMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: resellerMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", marginBottom: 12 } }, resellerMsg), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSaveReseller,
      style: { flex: 1, padding: "11px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", cursor: "pointer" }
    },
    "Save Reseller Pricing \u2192"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setResellerSub(null),
      style: { padding: "11px 18px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", cursor: "pointer" }
    },
    "Cancel"
  )), resellerSub.reseller_mode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        handleDisableReseller(resellerSub.id);
        setResellerSub(null);
      },
      style: { width: "100%", marginTop: 8, padding: "8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 12, cursor: "pointer" }
    },
    "Disable Reseller Mode"
  )))), tab === "taxpro" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Interest Form Submissions (", interests.length, ")"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Date", "Name", "Firm", "Email", "Phone", "Program", "Message"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))), /* @__PURE__ */ React.createElement("tbody", null, interests.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No submissions yet.")), interests.map((p) => /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#888", fontSize: 11 } }, p.created_at?.slice(0, 10)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", fontWeight: "bold" } }, p.name, p.credential ? `, ${p.credential}` : ""), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666" } }, p.firm || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#1a2d5a" } }, p.email), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666" } }, p.phone || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0fdf4", color: "#15803d", fontWeight: "bold" } }, p.program)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666", fontSize: 12, maxWidth: 200 } }, p.message || "\u2014"))))))));
}
window.AdminPage = AdminPage;