const { useState, useEffect, useRef, useCallback, useMemo } = React;

function AdminPage() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [grantEmail, setGrantEmail] = React.useState("");
  const [grantProduct, setGrantProduct] = React.useState("navigator");
  const [grantMsg, setGrantMsg] = React.useState("");
  const [search, setSearch] = React.useState("");
  const load = () => {
    setLoading(true);
    fetch("/api/admin/data").then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((d) => {
      setData(d);
      setLoading(false);
    }).catch((e) => {
      setError(`Error ${e}`);
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
    const d = await res.json();
    if (res.ok) load();
    else alert(`Error: ${d.error}`);
  };
  const inp = { padding: "9px 12px", borderRadius: 7, border: "1.5px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", outline: "none" };
  const badge = (color, text) => React.createElement("span", { style: { background: color, color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5 } }, text);
  const productColors = { navigator: "#1a2d5a", wizard: "#1a2d5a", bundle: "#1a4d1a" };
  const productLabel = { navigator: "Navigator", wizard: "Wizard", bundle: "Bundle" };
  const filtered = (data?.users || []).filter(
    (u) => !search || u.email.toLowerCase().includes(search.toLowerCase())
  );
  if (loading) return React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#888" } }, "Loading admin data...");
  if (error) return React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#dc2626" } }, error);
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Navigator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "ADMIN PANEL"))), /* @__PURE__ */ React.createElement("a", { href: "/", style: { color: "#aaa", fontSize: 13, textDecoration: "none", border: "1px solid #444", padding: "6px 14px", borderRadius: 6 } }, "\u2190 Home"))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "32px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 } }, [
    { label: "Total Users", value: data.stats.total_users },
    { label: "Active Purchases", value: data.stats.active_purchases },
    { label: "Navigator Access", value: data.stats.navigator_count },
    { label: "Wizard Access", value: data.stats.wizard_count }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.label, style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "20px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", color: "#1a2d5a" } }, s.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginTop: 4 } }, s.label)))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "24px", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Grant Access"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: grantEmail,
      onChange: (e) => setGrantEmail(e.target.value),
      placeholder: "user@email.com",
      style: { ...inp, flex: 1, minWidth: 200 }
    }
  ), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: grantProduct,
      onChange: (e) => setGrantProduct(e.target.value),
      style: { ...inp, background: "#fff" }
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
  ))))))))))));
}
window.AdminPage = AdminPage;