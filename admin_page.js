
function IRSPilotNav(props) {
  var subtitle = props.subtitle || 'TAXPAYER SELF-HELP';
  var _s = React.useState(null); var user = _s[0]; var setUser = _s[1];
  var _o = React.useState(false); var open = _o[0]; var setOpen = _o[1];
  React.useEffect(function() {
    fetch('/api/me', { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .catch(function() { return { loggedIn: false }; })
      .then(setUser);
  }, []);
  React.useEffect(function() {
    function h(e) { var m = document.getElementById('irsn-m'); if (m && !m.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return function() { document.removeEventListener('mousedown', h); };
  }, []);
  var initials = user && user.loggedIn ? (user.email||'').substring(0,2).toUpperCase() : '';
  var al = '';
  if (user && user.loggedIn) {
    var acc = user.access || [];
    if (acc.indexOf('bundle')!==-1) al='Bundle Access';
    else if (acc.indexOf('wizard')!==-1) al='Wizard Access';
    else if (acc.indexOf('navigator')!==-1) al='Navigator Access';
    else al='Free Account';
  }
  var hN = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='navigator'||a==='bundle';});
  var hB = user&&user.loggedIn&&(user.access||[]).indexOf('bundle')!==-1;
  var hW = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='wizard'||a==='bundle';});
  var lnk = { display:'flex',alignItems:'center',gap:10,padding:'10px 16px',color:'#333',textDecoration:'none',fontSize:13,borderBottom:'1px solid #f5f2ee' };
  var bdg = { marginLeft:'auto',background:'#7ec11f',color:'#1a2d5a',fontSize:9,fontWeight:'bold',padding:'2px 7px',borderRadius:10 };
  return React.createElement('div',{style:{background:'#1a2d5a',borderBottom:'3px solid #7ec11f',padding:'12px 24px',fontFamily:'Georgia,serif',position:'relative',zIndex:100}},
    React.createElement('div',{style:{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}},
      React.createElement('a',{href:'/',style:{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}},
        React.createElement('img',{src:'/static/logo.png',alt:'IRS Pilot',style:{width:36,height:36,objectFit:'contain'}}),
        React.createElement('div',null,
          React.createElement('div',{style:{color:'#fff',fontWeight:'bold',fontSize:15}},'IRS Pilot'),
          React.createElement('div',{style:{color:'#7ec11f',fontSize:9,letterSpacing:1.5}},subtitle)
        )
      ),
      user===null ? React.createElement('div',null) :
      !user.loggedIn
        ? React.createElement('a',{href:'/login',style:{color:'#cce8a0',fontSize:13,textDecoration:'none',padding:'7px 16px',border:'1.5px solid rgba(126,193,31,0.4)',borderRadius:20,fontFamily:'Georgia,serif'}},'Sign In')
        : React.createElement('div',{id:'irsn-m',style:{position:'relative'}},
            React.createElement('button',{style:{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.15)',color:'#fff',padding:'6px 12px 6px 6px',borderRadius:24,fontFamily:'Georgia,serif',fontSize:13,cursor:'pointer',outline:'none'},onClick:function(){setOpen(function(o){return !o;});}},
              React.createElement('div',{style:{width:28,height:28,background:'#7ec11f',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:'bold',color:'#1a2d5a',flexShrink:0}},initials),
              React.createElement('div',null,
                React.createElement('div',{style:{fontSize:12,color:'#cce8a0',lineHeight:1.2}},(user.email||'').split('@')[0]),
                React.createElement('div',{style:{fontSize:9,color:'#888'}},al)
              ),
              React.createElement('span',{style:{fontSize:9,color:'#7ec11f',marginLeft:2}},open?'\u25b4':'\u25be')
            ),
            React.createElement('div',{style:{display:open?'block':'none',position:'absolute',top:'calc(100% + 8px)',right:0,background:'#fff',borderRadius:12,minWidth:220,boxShadow:'0 12px 40px rgba(26,45,90,0.2)',overflow:'hidden',border:'1px solid #e8e4dc',zIndex:9999}},
              React.createElement('div',{style:{padding:'12px 16px',background:'#f8f6f1',borderBottom:'1px solid #e8e4dc'}},
                React.createElement('div',{style:{fontWeight:'bold',fontSize:13,color:'#1a2d5a'}},(user.email||'').split('@')[0]),
                React.createElement('div',{style:{fontSize:11,color:'#888',marginTop:2}},user.email||'')
              ),
              React.createElement('a',{href:'/navigator',style:lnk},'\uD83E\uDDED Navigator',hN&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/planning',style:lnk},'\uD83D\uDCCA Tax Planning',hB&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/letters',style:lnk},'\uD83D\uDCC4 Letter Generator',hW&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/transcript',style:lnk},'\uD83D\uDCC1 Transcript Analyzer'),
              React.createElement('a',{href:'/account',style:lnk},'\u2699\ufe0f My Account'),
              React.createElement('a',{href:'/logout',style:Object.assign({},lnk,{color:'#dc2626',borderBottom:'none'})},'\uD83D\uDEAA Sign Out')
            )
          )
    )
  );
}

// IRS Pilot Admin v2026-03-30-FIXED
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
  const [previewCodes, setPreviewCodes] = React.useState([]);
  const [demoRequests, setDemoRequests] = React.useState([]);
  const [demoSendMsg, setDemoSendMsg] = React.useState({});
  const [interestMsg, setInterestMsg] = React.useState({});
  const [foundation, setFoundation] = React.useState([]);
  const [fmEmail, setFmEmail] = React.useState("");
  const [fmPct, setFmPct] = React.useState(5);
  const [fmMsg, setFmMsg] = React.useState("");
  const [fmPartners, setFmPartners] = React.useState({});
  const [fmAssignMsg, setFmAssignMsg] = React.useState({});
  const [settings, setSettings] = React.useState({});
  const [settingsMsg, setSettingsMsg] = React.useState("");
  const [overrides, setOverrides] = React.useState([]);
  const [ovEmail, setOvEmail] = React.useState("");
  const [ovProduct, setOvProduct] = React.useState("navigator");
  const [ovPrice, setOvPrice] = React.useState("");
  const [ovNote, setOvNote] = React.useState("");
  const [ovMsg, setOvMsg] = React.useState("");
  const [discMsg, setDiscMsg] = React.useState("");
  const [newDisc, setNewDisc] = React.useState({ code: "", discount_type: "percent", discount_amount: "", applies_to: "all", expires_at: "", max_uses: "" });
  const setND = (k, v) => setNewDisc((p) => ({ ...p, [k]: v }));
  const [previewLabel, setPreviewLabel] = React.useState("");
  const [previewMsg, setPreviewMsg] = React.useState("");
  const [proLink, setProLink] = React.useState("");
  const [resellerSub, setResellerSub] = React.useState(null);
  const [resellerPrices, setResellerPrices] = React.useState({ navigator: "79.00", wizard: "139.00", bundle: "179.00" });
  const [resellerMsg, setResellerMsg] = React.useState("");
  const [clientLinkProduct, setClientLinkProduct] = React.useState("navigator");
  const [clientLinkMsg, setClientLinkMsg] = React.useState("");
  const [newRefEmail, setNewRefEmail] = React.useState("");
  const [refCreateMsg, setRefCreateMsg] = React.useState("");

  const load = () => {
    setLoading(true);
    const safe = (url, fallback) => fetch(url, { credentials: "include" })
      .then((r) => r.ok ? r.json().catch(() => fallback) : fallback)
      .catch(() => fallback);
    Promise.all([
      safe("/api/admin/data", { users: [], stats: { total_users: 0, active_purchases: 0, navigator_count: 0, wizard_count: 0 } }),
      safe("/api/admin/discounts", { codes: [] }),
      safe("/api/admin/referrals", { partners: [] }),
      safe("/api/admin/pro/subscribers", { subscribers: [] }),
      safe("/api/admin/taxpro/interests", { interests: [] }),
      safe("/api/admin/preview/list", { codes: [] }),
      safe("/api/admin/demo/requests", { requests: [] }),
      safe("/api/admin/foundation/list", { members: [] }),
      safe("/api/admin/settings/get", {}),
      safe("/api/admin/price-override/list", { overrides: [] })
    ]).then(([d, disc, ref, pro, tp, pv, dr, fmData, sett, ov]) => {
      setData(d);
      setDiscounts(disc.codes || []);
      setReferrals(ref.partners || []);
      setProSubs(pro.subscribers || []);
      setInterests(tp.interests || []);
      setPreviewCodes(pv.codes || []);
      setDemoRequests(dr.requests || []);
      setFoundation(fmData.members || []);
      setSettings(sett || {});
      setOverrides(ov.overrides || []);
      setLoading(false);
    }).catch((e) => {
      setError("Failed to load admin data: " + (e?.message || String(e)));
      setLoading(false);
    });
  };

  React.useEffect(() => { load(); }, []);

  const handleGrant = async () => {
    setGrantMsg("");
    const res = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail, product: grantProduct })
    });
    const d = await res.json();
    setGrantMsg(res.ok ? `\u2705 Access granted to ${grantEmail}` : `\u274C ${d.error}`);
    if (res.ok) { setGrantEmail(""); load(); }
  };

  const handleUnlockWizard = async (email) => {
    if (!confirm(`Restore wizard access for ${email}?`)) return;
    const res = await fetch("/api/admin/wizard/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const d = await res.json();
    alert(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
    load();
  };

  const handleRevoke = async (purchaseId, email) => {
    if (!confirm(`Revoke access for ${email}?`)) return;
    const res = await fetch("/api/admin/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchase_id: purchaseId })
    });
    if (res.ok) load();
    else { const d = await res.json(); alert(`Error: ${d.error}`); }
  };

  const handleCreateDiscount = async () => {
    setDiscountMsg("");
    if (!newCode || !newPct) { setDiscountMsg("Code and % required."); return; }
    const res = await fetch("/api/admin/discounts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, discount_pct: parseInt(newPct), expires_at: newExpiry || null, max_uses: newMaxUses ? parseInt(newMaxUses) : null })
    });
    const d = await res.json();
    setDiscountMsg(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
    if (res.ok) { setNewCode(""); load(); }
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
    setProMsg(""); setProLink("");
    if (!proEmail || !proFirm || !proName) { setProMsg("Email, firm name, and contact name required."); return; }
    const res = await fetch("/api/admin/pro/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: proEmail, firm_name: proFirm, contact_name: proName, contact_phone: proPhone, calendly_url: proCal })
    });
    const d = await res.json();
    if (res.ok) {
      let msg = `\u2705 ${d.message}`;
      if (d.payment_link) msg += ` \xB7 Payment link copied to clipboard!`;
      setProMsg(msg);
      setProLink(d.shareable_link);
      if (d.payment_link) { try { navigator.clipboard.writeText(d.payment_link); } catch {} }
      setProEmail(""); setProFirm(""); setProName(""); setProPhone(""); setProCal("");
      load();
    } else { setProMsg(`\u274C ${d.error}`); }
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

  const handleCreateReferral = async () => {
    setRefCreateMsg("");
    if (!newRefEmail) { setRefCreateMsg("Please enter an email address."); return; }
    const res = await fetch("/api/admin/referral/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newRefEmail })
    });
    const d = await res.json();
    if (res.ok) { setRefCreateMsg(`\u2705 ${d.message} Link: ${d.link}`); setNewRefEmail(""); load(); }
    else { setRefCreateMsg(`\u274C ${d.error}`); }
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
        id: resellerSub.id, reseller_mode: true,
        navigator_price: parseFloat(resellerPrices.navigator),
        wizard_price: parseFloat(resellerPrices.wizard),
        bundle_price: parseFloat(resellerPrices.bundle)
      })
    });
    const d = await res.json();
    setResellerMsg(res.ok ? `\u2705 ${d.message}` : `\u274C ${d.error}`);
    if (res.ok) { setResellerSub(null); load(); }
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
    if (res.ok) { navigator.clipboard.writeText(d.link); setClientLinkMsg(`\u2705 ${clientLinkProduct} link copied! Send to ${email}: ${d.link}`); }
    else { setClientLinkMsg(`\u274C ${d.error}`); }
  };

  const handleSendSubLink = async (id, email) => {
    const res = await fetch("/api/admin/pro/send-subscription-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const d = await res.json();
    if (res.ok) { navigator.clipboard.writeText(d.checkout_url); alert(`\u2705 Stripe checkout link copied to clipboard!\n\nSend this to ${email}:\n\n${d.checkout_url}`); }
    else { alert(`\u274C ${d.error}`); }
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
    padding: "9px 12px", borderRadius: 7, border: "1.5px solid #ddd",
    fontSize: 14, fontFamily: "Georgia, serif", outline: "none",
    width: "100%", boxSizing: "border-box"
  };
  const productLabel = { navigator: "Navigator", wizard: "Wizard", bundle: "Bundle" };
  const filtered = (data?.users || []).filter(
    (u) => !search || u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#888" } }, "Loading admin data...");
  if (error) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#dc2626" } }, error);
  if (!data) return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", padding: 40, color: "#888" } }, "No data available. Please refresh.");

  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } },

    /* HEADER */
    /* @__PURE__ */ React.createElement(IRSPilotNav, { subtitle: "ADMIN PANEL" }),

    /* TABS */
    /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "24px 24px 0" } },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e8e4dc", flexWrap: "wrap" } },
        [["users", "\uD83D\uDC65 Users"], ["discounts", "\uD83C\uDFF7\uFE0F Discount Codes"], ["referrals", "\uD83D\uDD17 Referral Partners"], ["pro", "\uD83C\uDFE2 Pro Subscribers"], ["taxpro", "\uD83D\uDCCB Pro Interests"], ["preview", "\uD83D\uDD11 Preview Codes"], ["demos", "\uD83D\uDCCB Demo Requests"], ["foundation", "\uD83C\uDFDB\uFE0F Foundation"], ["settings", "\u2699\uFE0F Settings"]].map(([id, label]) =>
          /* @__PURE__ */ React.createElement("button", {
            key: id, onClick: () => setTab(id),
            style: { padding: "10px 20px", background: tab === id ? "#1a2d5a" : "transparent", color: tab === id ? "#7ec11f" : "#888", border: "none", borderRadius: "8px 8px 0 0", fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" }
          }, label)
        )
      )
    ),

    /* ===== USERS TAB ===== */
    tab === "users" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* Stats */
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 } },
        [{ label: "Total Users", value: data?.stats?.total_users || 0 }, { label: "Active Purchases", value: data?.stats?.active_purchases || 0 }, { label: "Navigator Access", value: data?.stats?.navigator_count || 0 }, { label: "Wizard Access", value: data?.stats?.wizard_count || 0 }].map((s) =>
          /* @__PURE__ */ React.createElement("div", { key: s.label, style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "20px" } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", color: "#1a2d5a" } }, s.value),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginTop: 4 } }, s.label)
          )
        )
      ),
      /* Grant Access */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: "24px", marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Grant Access"),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
          /* @__PURE__ */ React.createElement("input", { value: grantEmail, onChange: (e) => setGrantEmail(e.target.value), placeholder: "user@email.com", style: { ...inp, flex: 1, minWidth: 200, width: "auto" } }),
          /* @__PURE__ */ React.createElement("select", { value: grantProduct, onChange: (e) => setGrantProduct(e.target.value), style: { ...inp, background: "#fff", width: "auto" } },
            /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator ($59)"),
            /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard ($99)"),
            /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle ($129)")
          ),
          /* @__PURE__ */ React.createElement("button", { onClick: handleGrant, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" } }, "Grant \u2192")
        ),
        grantMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: grantMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, grantMsg)
      ),
      /* Users Table */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px", borderBottom: "1px solid #f0ede8", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Users (", filtered.length, ")"),
          /* @__PURE__ */ React.createElement("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by email...", style: { ...inp, width: 220 } })
        ),
        /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } },
          /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
            /* @__PURE__ */ React.createElement("thead", null,
              /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } },
                ["Email", "Signed Up", "Active Access", "Spent", "Type", "Expires", "Actions"].map((h) =>
                  /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontWeight: "bold", color: "#555", fontSize: 12, letterSpacing: 0.5 } }, h.toUpperCase())
                )
              )
            ),
            /* @__PURE__ */ React.createElement("tbody", null,
              filtered.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px 16px", color: "#aaa", textAlign: "center" } }, "No users found")),
              filtered.map((user) =>
                /* @__PURE__ */ React.createElement("tr", { key: user.id, style: { borderTop: "1px solid #f0ede8" } },
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#1a2d5a" } }, user.email),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666", fontSize: 12 } }, user.created_at?.slice(0, 10)),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
                      (user.purchases || []).length === 0
                        ? /* @__PURE__ */ React.createElement("span", { style: { color: "#aaa", fontSize: 12 } }, "None")
                        : (user.purchases || []).map((p) =>
                            /* @__PURE__ */ React.createElement("div", { key: p.id, style: { fontSize: 11, borderRadius: 6, overflow: "hidden", border: `1px solid ${p.active ? "#7ec11f" : "#ddd"}` } },
                              /* @__PURE__ */ React.createElement("div", { style: { background: p.wizard_locked ? "#7f1d1d" : p.active ? "#1a2d5a" : "#f0ede8", color: p.wizard_locked ? "#fca5a5" : p.active ? "#7ec11f" : "#888", fontWeight: "bold", padding: "2px 8px" } },
                                productLabel[p.product] || p.product, " \xB7 $", p.amount,
                                p.wizard_locked ? ` \uD83D\uDD12 ${p.wizard_lock_reason || "locked"}` : "",
                                !p.active ? " (expired)" : ""
                              ),
                              /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", color: "#888", padding: "1px 8px", fontSize: 10 } }, p.created_at?.slice(0, 10))
                            )
                          )
                    )
                  ),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontWeight: "bold", color: "#1a2d5a", fontSize: 13 } }, user.total_spent > 0 ? `$${user.total_spent}` : "\u2014"),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
                      (user.customer_type || []).map((t, i) =>
                        /* @__PURE__ */ React.createElement("span", { key: i, style: { fontSize: 10, padding: "2px 7px", borderRadius: 20, display: "inline-block", width: "fit-content", background: t.includes("Pro") ? "#1a2d5a" : t.includes("Referral Partner") ? "#f0fdf4" : t.includes("Referred") ? "#eff6ff" : t.includes("Direct") ? "#fef9ec" : "#f8f6f1", color: t.includes("Pro") ? "#7ec11f" : t.includes("Referral Partner") ? "#14532d" : t.includes("Referred") ? "#1e40af" : t.includes("Direct") ? "#92400e" : "#888", fontWeight: "bold" } }, t)
                      )
                    )
                  ),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666", fontSize: 11 } },
                    (user.purchases || []).filter((p) => p.active).length > 0
                      ? (user.purchases || []).filter((p) => p.active).map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id }, p.expires_at?.slice(0, 10)))
                      : "\u2014"
                  ),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                      (user.purchases || []).map((p) =>
                        /* @__PURE__ */ React.createElement(React.Fragment, { key: p.id },
                          /* @__PURE__ */ React.createElement("button", { onClick: () => handleRevoke(p.id, user.email), style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Revoke ", productLabel[p.product]),
                          ["wizard", "bundle"].includes(p.product) && /* @__PURE__ */ React.createElement("button", { onClick: () => handleUnlockWizard(user.email), style: { padding: "4px 10px", background: "transparent", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\uD83D\uDD13 Unlock Wizard")
                        )
                      ),
                      /* @__PURE__ */ React.createElement("button", {
                        onClick: async () => {
                          if (!confirm(`\u26A0 Permanently delete ${user.email} and ALL their data?\nThis cannot be undone.`)) return;
                          const res = await fetch("/api/admin/user/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.id }) });
                          if (res.ok) load();
                          else { const d = await res.json(); alert(`Error: ${d.error}`); }
                        },
                        style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", marginTop: 4, display: "block" }
                      }, "\uD83D\uDDD1 Delete User")
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),

    /* ===== DISCOUNTS TAB ===== */
    tab === "discounts" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Create Discount Code"),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" } },
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CODE"), /* @__PURE__ */ React.createElement("input", { value: newCode, onChange: (e) => setNewCode(e.target.value.toUpperCase()), placeholder: "SAVE20", style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "DISCOUNT %"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newPct, onChange: (e) => setNewPct(e.target.value), min: "1", max: "100", style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "EXPIRES (optional)"), /* @__PURE__ */ React.createElement("input", { type: "date", value: newExpiry, onChange: (e) => setNewExpiry(e.target.value), style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "MAX USES (optional)"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newMaxUses, onChange: (e) => setNewMaxUses(e.target.value), placeholder: "unlimited", style: inp })),
          /* @__PURE__ */ React.createElement("button", { onClick: handleCreateDiscount, style: { padding: "9px 18px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 7, fontFamily: "Georgia, serif", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" } }, "Create \u2192")
        ),
        discountMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: discountMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, discountMsg)
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "All Codes (", discounts.length, ")"),
        /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Code", "Discount", "Uses", "Max Uses", "Expires", "Status", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            discounts.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No discount codes yet.")),
            discounts.map((d) =>
              /* @__PURE__ */ React.createElement("tr", { key: d.id, style: { borderTop: "1px solid #f0ede8" } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontWeight: "bold", fontFamily: "monospace", fontSize: 14 } }, d.code),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#7ec11f", fontWeight: "bold" } }, d.discount_pct, "% off"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, d.use_count),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#888" } }, d.max_uses || "\u221E"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#888" } }, d.expires_at?.slice(0, 10) || "Never"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: d.active ? "#f0fdf4" : "#f8f6f1", color: d.active ? "#15803d" : "#aaa", fontWeight: "bold" } }, d.active ? "Active" : "Inactive")),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                  d.active && /* @__PURE__ */ React.createElement("button", { onClick: () => handleDeactivate(d.id), style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Deactivate"),
                  /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm("Delete this discount code?")) return; await fetch("/api/admin/discount/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id }) }); load(); }, style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\uD83D\uDDD1 Delete")
                )
              )
            )
          )
        )
      )
    ),

    /* ===== REFERRALS TAB ===== */
    tab === "referrals" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Add Referral Partner Manually"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Partner must already have an account at irspilot.com. A welcome email with their link will be sent automatically."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          /* @__PURE__ */ React.createElement("input", { value: newRefEmail, onChange: (e) => setNewRefEmail(e.target.value), placeholder: "partner@email.com", style: { flex: 1, minWidth: 220, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif" } }),
          /* @__PURE__ */ React.createElement("button", { onClick: handleCreateReferral, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Create Partner \u2192")
        ),
        refCreateMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: refCreateMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", wordBreak: "break-all" } }, refCreateMsg)
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Referral Partners (", referrals.length, ")"),
        /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Code", "Commission %", "Sales", "Total Earned", "Unpaid", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            referrals.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No referral partners yet.")),
            referrals.map((p) =>
              /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, p.email),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontFamily: "monospace", fontWeight: "bold", fontSize: 14 } }, p.code),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#7ec11f", fontWeight: "bold" } }, p.commission_pct, "%"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, p.conversions),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, "$", ((p.total_commission || 0) / 100).toFixed(2)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: p.unpaid > 0 ? "#dc2626" : "#aaa", fontWeight: p.unpaid > 0 ? "bold" : "normal" } }, "$", ((p.unpaid || 0) / 100).toFixed(2)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                  p.unpaid > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => handleMarkPaid(p.id, p.email), style: { padding: "4px 10px", background: "transparent", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Mark Paid"),
                  p.stripe_connect_id
                    ? /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm("Pay $" + ((p.unpaid || 0) / 100).toFixed(2) + " to " + p.email + " via Stripe?")) return; const res = await fetch("/api/admin/referral/payout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_id: p.id }) }); const d = await res.json(); alert(res.ok ? "\u2705 Paid $" + (d.amount || 0).toFixed(2) + " to " + p.email : "\u274C " + d.error); load(); }, style: { padding: "4px 10px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "\uD83D\uDCB8 Pay Now")
                    : /* @__PURE__ */ React.createElement("button", { onClick: async () => { const res = await fetch("/api/admin/referral/create-connect-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_id: p.id, email: p.email }) }); const d = await res.json(); if (res.ok) alert("\u2705 Onboarding link sent to " + p.email); else alert("\u274C " + d.error); }, style: { padding: "4px 10px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\uD83D\uDCB3 Setup Pay"),
                  /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Remove referral partner ${p.email}?\nTheir user account will remain intact.`)) return; const res = await fetch("/api/admin/referral/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_id: p.id }) }); if (res.ok) load(); else { const d = await res.json(); alert(`Error: ${d.error}`); } }, style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", marginTop: 4, display: "block" } }, "\uD83D\uDDD1 Remove Partner")
                )
              )
            )
          )
        )
      )
    ),

    /* ===== PRO TAB ===== */
    tab === "pro" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* Create Pro */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 4, color: "#1a2d5a" } }, "Create Pro Subscriber"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16 } }, "The subscriber will receive a unique shareable link for their clients."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 } },
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "ACCOUNT EMAIL"), /* @__PURE__ */ React.createElement("input", { value: proEmail, onChange: (e) => setProEmail(e.target.value), placeholder: "advisor@firm.com", style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "FIRM NAME"), /* @__PURE__ */ React.createElement("input", { value: proFirm, onChange: (e) => setProFirm(e.target.value), placeholder: "Smith Tax Services", style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CONTACT NAME"), /* @__PURE__ */ React.createElement("input", { value: proName, onChange: (e) => setProName(e.target.value), placeholder: "John Smith, EA", style: inp })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "PHONE (optional)"), /* @__PURE__ */ React.createElement("input", { value: proPhone, onChange: (e) => setProPhone(e.target.value), placeholder: "(555) 123-4567", style: inp })),
          /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CALENDLY URL (optional)"), /* @__PURE__ */ React.createElement("input", { value: proCal, onChange: (e) => setProCal(e.target.value), placeholder: "https://calendly.com/their-link", style: inp }))
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: handleCreatePro, style: { padding: "10px 22px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" } }, "Create Pro Subscriber \u2192"),
        proMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: proMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, proMsg),
        proLink && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 } },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#15803d", marginBottom: 4 } }, "SHAREABLE LINK \u2014 SEND THIS TO THE SUBSCRIBER"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#1a2d5a", wordBreak: "break-all", fontFamily: "monospace" } }, proLink)
        )
      ),
      /* Pro Subscribers Table */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Active Subscribers (", proSubs.filter((s) => s.active).length, ")"),
        /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Firm", "Contact", "Code", "Sessions", "Billing", "Status", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            proSubs.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 8, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No pro subscribers yet.")),
            proSubs.map((p) =>
              /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontSize: 12 } }, p.email),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontWeight: "bold" } }, p.firm_name),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", color: "#666" } }, p.contact_name),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px", fontFamily: "monospace", fontWeight: "bold", color: "#1a2d5a" } }, p.access_code),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                  /* @__PURE__ */ React.createElement("span", { style: { color: p.sessions_used > p.sessions_limit ? "#dc2626" : "#15803d", fontWeight: "bold" } }, p.sessions_used, " / ", p.sessions_limit),
                  p.sessions_used > p.sessions_limit && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#dc2626" } }, "+", p.sessions_used - p.sessions_limit, " overage")
                ),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: p.stripe_sub_id ? "#f0fdf4" : "#fef9ec", color: p.stripe_sub_id ? "#15803d" : "#92400e", fontWeight: "bold" } }, p.stripe_sub_id ? "\u2713 Subscribed" : "\u26A0 No billing")),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: p.active ? "#f0fdf4" : "#f8f6f1", color: p.active ? "#15803d" : "#aaa", fontWeight: "bold" } }, p.active ? "Active" : "Inactive")),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "12px 16px" } },
                  /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap" } },
                    p.stripe_customer_id
                      ? /* @__PURE__ */ React.createElement("button", { onClick: async () => { const r2 = await fetch("/api/admin/pro/billing-portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); const d2 = await r2.json(); if (r2.ok) window.open(d2.url, "_blank"); else alert(d2.error || "Error opening billing portal"); }, style: { padding: "4px 8px", background: "#1a2d5a", border: "1px solid #7ec11f", color: "#7ec11f", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\uD83D\uDCB3 Billing Portal")
                      : /* @__PURE__ */ React.createElement("button", { onClick: () => handleSendSubLink(p.id, p.email), style: { padding: "4px 8px", background: "transparent", border: "1px solid #7ec11f", color: "#7ec11f", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\uD83D\uDCB3 Get Billing Link"),
                    p.sessions_used > p.sessions_limit && /* @__PURE__ */ React.createElement("button", { onClick: () => handleChargeOverage(p.id, p.email, p.sessions_used - p.sessions_limit), style: { padding: "4px 8px", background: "transparent", border: "1px solid #fde68a", color: "#92400e", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\u26A1 Charge Overage"),
                    /* @__PURE__ */ React.createElement("button", { onClick: () => handleOpenReseller(p), style: { padding: "4px 8px", background: p.reseller_mode ? "#7ec11f" : "transparent", border: "1px solid #7ec11f", color: p.reseller_mode ? "#1a2d5a" : "#7ec11f", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, p.reseller_mode ? "\u2713 Reseller" : "Set Reseller"),
                    /* @__PURE__ */ React.createElement("button", { onClick: () => handleResetSessions(p.id, p.email), style: { padding: "4px 8px", background: "transparent", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Reset Sessions"),
                    p.active && /* @__PURE__ */ React.createElement("button", { onClick: () => handleDeactivatePro(p.id, p.email), style: { padding: "4px 8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Deactivate"),
                    /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Delete pro subscriber record for ${p.email}?\nTheir user account will remain intact.`)) return; const res = await fetch("/api/admin/pro/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); if (res.ok) load(); else { const d = await res.json(); alert(`Error: ${d.error}`); } }, style: { padding: "4px 8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", marginTop: 4 } }, "\uD83D\uDDD1 Delete")
                  )
                )
              )
            )
          )
        )
      ),
      /* Client Link Generator */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginTop: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "Generate Single-Use Client Access Link"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#666", marginBottom: 14 } }, "Generate a link to send to a client after you've collected payment outside IRS Pilot. Link expires after 30 days or first use."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
          /* @__PURE__ */ React.createElement("select", { value: clientLinkProduct, onChange: (e) => setClientLinkProduct(e.target.value), style: { ...inp, width: "auto", background: "#fff" } },
            /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator"),
            /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard"),
            /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle")
          ),
          /* @__PURE__ */ React.createElement("select", { onChange: (e) => { if (e.target.value) handleGenerateClientLink(e.target.value.split("|")[0], e.target.value.split("|")[1]); e.target.value = ""; }, style: { ...inp, flex: 1, background: "#fff" } },
            /* @__PURE__ */ React.createElement("option", { value: "" }, "Select subscriber to generate link for..."),
            proSubs.filter((s) => s.active).map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: `${s.id}|${s.email}` }, s.firm_name, " (", s.email, ")"))
          )
        ),
        clientLinkMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: clientLinkMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", wordBreak: "break-all" } }, clientLinkMsg)
      ),
      /* Reseller Panel */
      resellerSub && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, padding: 32, border: "2px solid #7ec11f", marginTop: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 18, color: "#1a2d5a", marginBottom: 4 } }, "Reseller Pricing"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 20 } }, resellerSub.firm_name, " \xB7 Minimum 50% markup required"),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14, marginBottom: 20 } },
          [["navigator", "Navigator", "79.00"], ["wizard", "Wizard", "139.00"], ["bundle", "Bundle", "179.00"]].map(([key, label, min]) =>
            /* @__PURE__ */ React.createElement("div", { key },
              /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, label, " Price (min $", min, ")"),
              /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: "#555" } }, "$"),
                /* @__PURE__ */ React.createElement("input", { type: "number", value: resellerPrices[key], onChange: (e) => setResellerPrices((p) => ({ ...p, [key]: e.target.value })), style: { ...inp, flex: 1 }, step: "0.01", min })
              )
            )
          )
        ),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 16, background: "#f0f9e0", padding: "10px 14px", borderRadius: 8, border: "1px solid #7ec11f" } }, "Clients pay via: ", /* @__PURE__ */ React.createElement("strong", null, "irspilot.com/pro/", resellerSub.access_code, "/navigator"), " (or /wizard, /bundle)"),
        resellerMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: resellerMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", marginBottom: 12 } }, resellerMsg),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } },
          /* @__PURE__ */ React.createElement("button", { onClick: handleSaveReseller, style: { flex: 1, padding: "11px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", cursor: "pointer" } }, "Save Reseller Pricing \u2192"),
          /* @__PURE__ */ React.createElement("button", { onClick: () => setResellerSub(null), style: { padding: "11px 18px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", cursor: "pointer" } }, "Cancel")
        ),
        resellerSub.reseller_mode && /* @__PURE__ */ React.createElement("button", { onClick: () => { handleDisableReseller(resellerSub.id); setResellerSub(null); }, style: { width: "100%", marginTop: 8, padding: "8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 12, cursor: "pointer" } }, "Disable Reseller Mode")
      )
    ),

    /* ===== TAXPRO TAB ===== */
    tab === "taxpro" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Pro Subscription Interest Submissions (", interests.length, ")"),
        /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } },
          /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Date", "Name", "Firm", "Email", "Phone", "Program", "Message", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555", whiteSpace: "nowrap" } }, h.toUpperCase())))),
            /* @__PURE__ */ React.createElement("tbody", null,
              interests.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 8, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No submissions yet.")),
              interests.map((p) =>
                /* @__PURE__ */ React.createElement(React.Fragment, { key: p.id },
                  /* @__PURE__ */ React.createElement("tr", { style: { borderTop: "1px solid #f0ede8", background: p.status === "denied" ? "#fff5f5" : p.status === "approved" ? "#f0fdf4" : "#fff" } },
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#888", fontSize: 11, whiteSpace: "nowrap" } }, p.created_at?.slice(0, 10)),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", fontWeight: "bold", whiteSpace: "nowrap" } }, p.name, p.credential ? `, ${p.credential}` : ""),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666" } }, p.firm || "\u2014"),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#1a2d5a", whiteSpace: "nowrap" } }, p.email),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666", whiteSpace: "nowrap" } }, p.phone || "\u2014"),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0fdf4", color: "#15803d", fontWeight: "bold", whiteSpace: "nowrap" } }, p.program)),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666", fontSize: 12, maxWidth: 160 } }, p.message || "\u2014"),
                    /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } },
                      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 140 } },
                        /* @__PURE__ */ React.createElement("button", { onClick: async () => { setInterestMsg((m) => ({ ...m, [p.id]: "Sending..." })); const res = await fetch("/api/admin/taxpro/send-interest-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, email: p.email, firm: p.firm, program: p.program }) }); const d = await res.json(); setInterestMsg((m) => ({ ...m, [p.id]: res.ok ? "\u2705 Interest letter sent" : `\u274C ${d.error}` })); }, style: { padding: "4px 8px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "left" } }, "\uD83D\uDCE8 Send Interest Letter"),
                        /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Approve ${p.name} for the pro subscription?`)) return; setInterestMsg((m) => ({ ...m, [p.id]: "Sending..." })); const res = await fetch("/api/admin/taxpro/send-approval-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, email: p.email, firm: p.firm }) }); const d = await res.json(); setInterestMsg((m) => ({ ...m, [p.id]: res.ok ? "\u2705 Approval letter sent" : `\u274C ${d.error}` })); if (res.ok) load(); }, style: { padding: "4px 8px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "left" } }, "\u2705 Send Approval Letter"),
                        /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Send denial email to ${p.name}?`)) return; setInterestMsg((m) => ({ ...m, [p.id]: "Sending..." })); const res = await fetch("/api/admin/taxpro/send-denial-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, email: p.email }) }); const d = await res.json(); setInterestMsg((m) => ({ ...m, [p.id]: res.ok ? "\u2705 Denial letter sent" : `\u274C ${d.error}` })); if (res.ok) load(); }, style: { padding: "4px 8px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", textAlign: "left" } }, "\u2717 Send Denial Letter"),
                        /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Delete ${p.name} from the list?`)) return; await fetch("/api/admin/taxpro/delete-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }); load(); }, style: { padding: "4px 8px", background: "transparent", color: "#aaa", border: "1px solid #e8e4dc", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", textAlign: "left" } }, "\uD83D\uDDD1 Delete"),
                        interestMsg[p.id] && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: interestMsg[p.id].startsWith("\u2705") ? "#15803d" : interestMsg[p.id] === "Sending..." ? "#888" : "#dc2626", marginTop: 2 } }, interestMsg[p.id])
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),

    /* ===== PREVIEW TAB ===== */
    tab === "preview" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Generate Preview Code"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("strong", null, "Demo"), " \u2014 15 min, read-only, Navigator only. \xA0", /* @__PURE__ */ React.createElement("strong", null, "Partner"), " \u2014 24 hr, full access including Wizard."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" } },
          /* @__PURE__ */ React.createElement("div", null,
            /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "LABEL (optional)"),
            /* @__PURE__ */ React.createElement("input", { value: previewLabel, onChange: (e) => setPreviewLabel(e.target.value), placeholder: "e.g. John Smith EA", style: { padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif", width: 220 } })
          ),
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { setPreviewMsg(""); const res = await fetch("/api/admin/preview/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "demo", label: previewLabel }) }); const d = await res.json(); if (res.ok) { navigator.clipboard.writeText(d.link); setPreviewMsg(`\u2705 Demo link copied! Expires in 15 min: ${d.link}`); setPreviewLabel(""); load(); } else setPreviewMsg(`\u274C ${d.error}`); }, style: { padding: "9px 18px", background: "#fef3c7", color: "#92400e", border: "1px solid #f59e0b", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "\uD83D\uDC40 Create Demo Code"),
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { setPreviewMsg(""); const res = await fetch("/api/admin/preview/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "partner", label: previewLabel }) }); const d = await res.json(); if (res.ok) { navigator.clipboard.writeText(d.link); setPreviewMsg(`\u2705 Partner link copied! Valid 24 hrs: ${d.link}`); setPreviewLabel(""); load(); } else setPreviewMsg(`\u274C ${d.error}`); }, style: { padding: "9px 18px", background: "#f0fdf4", color: "#14532d", border: "1px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "\uD83D\uDD11 Create Partner Code")
        ),
        previewMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: previewMsg.startsWith("\u2705") ? "#15803d" : "#dc2626", wordBreak: "break-all" } }, previewMsg)
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 15, color: "#1a2d5a" } }, "Active & Recent Codes (", previewCodes.length, ")"),
        /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Type", "Label", "Created", "Expires", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            previewCodes.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No preview codes yet.")),
            previewCodes.map((c) => {
              const expired = new Date(c.expires_at) < new Date();
              return /* @__PURE__ */ React.createElement("tr", { key: c.id, style: { borderTop: "1px solid #f0ede8", opacity: expired ? 0.5 : 1 } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: c.type === "demo" ? "#fef3c7" : "#f0fdf4", color: c.type === "demo" ? "#92400e" : "#14532d", fontWeight: "bold" } }, c.type === "demo" ? "\uD83D\uDC40 Demo" : "\uD83D\uDD11 Partner")),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#555" } }, c.label || "\u2014"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#888", fontSize: 11 } }, c.created_at?.slice(0, 16)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: expired ? "#dc2626" : "#555", fontSize: 11 } }, expired ? "Expired" : c.expires_at?.slice(0, 16)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => { await fetch("/api/admin/preview/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) }); load(); }, style: { padding: "4px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Delete"))
              );
            })
          )
        )
      )
    ),

    /* ===== DEMOS TAB ===== */
    tab === "demos" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 16, color: "#1a2d5a" } }, "Demo Requests (", demoRequests.length, ")"),
        /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Date", "Name", "Profession", "Email", "Mobile", "Status", "Action"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            demoRequests.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, style: { padding: "24px", color: "#aaa", textAlign: "center" } }, "No demo requests yet.")),
            demoRequests.map((r) =>
              /* @__PURE__ */ React.createElement("tr", { key: r.id, style: { borderTop: "1px solid #f0ede8" } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#888", fontSize: 11 } }, r.created_at?.slice(0, 10)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", fontWeight: "bold" } }, r.name),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#666" } }, r.profession),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#1a2d5a" } }, r.email),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px", color: "#666" } }, r.mobile),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: r.status === "sent" ? "#f0fdf4" : "#fef9ec", color: r.status === "sent" ? "#15803d" : "#92400e", fontWeight: "bold" } }, r.status === "sent" ? "\u2713 Sent" : "Pending")),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 14px" } },
                  r.status !== "sent" && /* @__PURE__ */ React.createElement("button", { onClick: async () => { setDemoSendMsg((p) => ({ ...p, [r.id]: "Sending..." })); const res = await fetch("/api/admin/demo/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: r.email, name: r.name }) }); const d = await res.json(); setDemoSendMsg((p) => ({ ...p, [r.id]: res.ok ? `\u2705 Sent! Link: ${d.link}` : `\u274C ${d.error}` })); if (res.ok) load(); }, style: { padding: "5px 12px", background: "#1a2d5a", color: "#7ec11f", border: "1px solid #7ec11f", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "\uD83D\uDCE7 Send Demo"),
                  /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Delete demo request from ${r.name}?`)) return; await fetch("/api/admin/demo/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) }); load(); }, style: { padding: "5px 10px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", marginLeft: 4 } }, "\uD83D\uDDD1"),
                  demoSendMsg[r.id] && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: demoSendMsg[r.id].startsWith("\u2705") ? "#15803d" : "#dc2626", marginTop: 4, maxWidth: 200, wordBreak: "break-all" } }, demoSendMsg[r.id])
                )
              )
            )
          )
        )
      )
    ),

    /* ===== SETTINGS TAB ===== */
    tab === "settings" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* Global Pricing */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Global Pricing & Referral Commission"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16 } }, "Changes apply to new purchases. Existing purchases are not affected."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 } },
          [{ key: "navigator_price", label: "Navigator Price ($)" }, { key: "wizard_price", label: "Wizard Price ($)" }, { key: "bundle_price", label: "Bundle Price ($)" }, { key: "pro_intro_price", label: "Pro Intro Price ($/mo)" }, { key: "pro_standard_price", label: "Pro Standard ($/mo)" }, { key: "default_referral_commission", label: "Default Referral %" }].map((f) =>
            /* @__PURE__ */ React.createElement("div", { key: f.key },
              /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, f.label.toUpperCase()),
              /* @__PURE__ */ React.createElement("input", { type: "number", value: settings[f.key] || "", onChange: (e) => setSettings((p) => ({ ...p, [f.key]: e.target.value })), style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif" } })
            )
          )
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: async () => { setSettingsMsg(""); const res = await fetch("/api/admin/settings/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); const d = await res.json(); setSettingsMsg(res.ok ? "\u2705 Settings saved." : `\u274C ${d.error}`); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Save Settings"),
        settingsMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 13, color: settingsMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, settingsMsg)
      ),
      /* Per-Partner Commission Override */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Per-Partner Referral Commission Override"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Override the commission rate for a specific referral partner."),
        /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } },
          /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
            /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Code", "Current %", "New %", "Action"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
            /* @__PURE__ */ React.createElement("tbody", null,
              referrals.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { padding: 16, color: "#aaa", textAlign: "center" } }, "No referral partners yet.")),
              referrals.map((r) =>
                /* @__PURE__ */ React.createElement("tr", { key: r.id, style: { borderTop: "1px solid #f0ede8" } },
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px" } }, r.email),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px", fontFamily: "monospace", color: "#7ec11f" } }, r.code),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px", fontWeight: "bold" } }, r.custom_commission_pct > 0 ? r.custom_commission_pct : r.commission_pct, "%"),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px" } }, /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "50", placeholder: "e.g. 25", defaultValue: r._newPct || r.custom_commission_pct || r.commission_pct, onChange: (e) => setReferrals((prev) => prev.map((x) => x.id === r.id ? { ...x, _newPct: e.target.value } : x)), style: { width: 70, padding: "5px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, fontFamily: "Georgia, serif" } })),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => { const pct = r._newPct || r.custom_commission_pct || r.commission_pct; const res = await fetch("/api/admin/referral/set-commission", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_id: r.id, commission_pct: parseInt(pct) }) }); if (res.ok) load(); }, style: { padding: "4px 10px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "Update"))
                )
              )
            )
          )
        )
      ),
      /* Discount Codes in Settings */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Discount Codes"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Create % or flat $ discount codes for any product."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 } },
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "CODE *"), /* @__PURE__ */ React.createElement("input", { value: newDisc.code, onChange: (e) => setND("code", e.target.value.toUpperCase()), placeholder: "SAVE20", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "TYPE"), /* @__PURE__ */ React.createElement("select", { value: newDisc.discount_type, onChange: (e) => setND("discount_type", e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } }, /* @__PURE__ */ React.createElement("option", { value: "percent" }, "Percent (%)"), /* @__PURE__ */ React.createElement("option", { value: "flat" }, "Flat ($)"))),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "AMOUNT *"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newDisc.discount_amount, onChange: (e) => setND("discount_amount", e.target.value), placeholder: newDisc.discount_type === "percent" ? "20" : "15", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "APPLIES TO"), /* @__PURE__ */ React.createElement("select", { value: newDisc.applies_to, onChange: (e) => setND("applies_to", e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Products"), /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator"), /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard"), /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle"), /* @__PURE__ */ React.createElement("option", { value: "pro" }, "Pro Subscription"))),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "EXPIRES"), /* @__PURE__ */ React.createElement("input", { type: "date", value: newDisc.expires_at, onChange: (e) => setND("expires_at", e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "MAX USES"), /* @__PURE__ */ React.createElement("input", { type: "number", value: newDisc.max_uses, onChange: (e) => setND("max_uses", e.target.value), placeholder: "Unlimited", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } }))
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: async () => { setDiscMsg(""); const res = await fetch("/api/admin/discount/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newDisc) }); const d = await res.json(); if (res.ok) { setDiscMsg(`\u2705 Code "${d.code}" created.`); setNewDisc({ code: "", discount_type: "percent", discount_amount: "", applies_to: "all", expires_at: "", max_uses: "" }); load(); } else setDiscMsg(`\u274C ${d.error}`); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Create Code"),
        discMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 13, color: discMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, discMsg),
        discounts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 20, overflowX: "auto" } },
          /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Code", "Type", "Amount", "Applies To", "Uses", "Expires", "Status", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555", whiteSpace: "nowrap" } }, h.toUpperCase())))),
            /* @__PURE__ */ React.createElement("tbody", null,
              discounts.map((d) =>
                /* @__PURE__ */ React.createElement("tr", { key: d.id, style: { borderTop: "1px solid #f0ede8", opacity: d.active ? 1 : 0.5 } },
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontFamily: "monospace", fontWeight: "bold", color: "#1a2d5a" } }, d.code),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#666" } }, d.discount_type === "flat" ? "Flat $" : "Percent"),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontWeight: "bold" } }, d.discount_type === "flat" ? `$${d.discount_amount || d.discount_pct}` : `${d.discount_pct}%`),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#666" } }, d.applies_to || "all"),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#666" } }, d.use_count, "/", d.max_uses || "\u221E"),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("input", { type: "date", defaultValue: d.expires_at?.slice(0, 10) || "", onBlur: async (e) => { await fetch("/api/admin/discount/update-expiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, expires_at: e.target.value }) }); load(); }, style: { padding: "3px 6px", border: "1px solid #ddd", borderRadius: 5, fontSize: 11, fontFamily: "Georgia, serif" } })),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 7px", borderRadius: 20, background: d.active ? "#f0fdf4" : "#fef2f2", color: d.active ? "#15803d" : "#dc2626", fontWeight: "bold" } }, d.active ? "Active" : "Inactive")),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => { await fetch("/api/admin/discount/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: d.id, active: !d.active }) }); load(); }, style: { padding: "3px 8px", background: "transparent", border: `1px solid ${d.active ? "#fecaca" : "#bbf7d0"}`, color: d.active ? "#dc2626" : "#15803d", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, d.active ? "Deactivate" : "Activate"))
                )
              )
            )
          )
        )
      ),
      /* Direct Price Override */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Direct Price Override"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Set a custom price for a specific user's next purchase of a product."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 } },
          /* @__PURE__ */ React.createElement("div", { style: { flex: "2 1 200px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "USER EMAIL *"), /* @__PURE__ */ React.createElement("input", { value: ovEmail, onChange: (e) => setOvEmail(e.target.value), placeholder: "user@example.com", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 140px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "PRODUCT *"), /* @__PURE__ */ React.createElement("select", { value: ovProduct, onChange: (e) => setOvProduct(e.target.value), style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } }, /* @__PURE__ */ React.createElement("option", { value: "navigator" }, "Navigator"), /* @__PURE__ */ React.createElement("option", { value: "wizard" }, "Wizard"), /* @__PURE__ */ React.createElement("option", { value: "bundle" }, "Bundle"))),
          /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 120px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "PRICE ($) *"), /* @__PURE__ */ React.createElement("input", { type: "number", value: ovPrice, onChange: (e) => setOvPrice(e.target.value), placeholder: "45", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", { style: { flex: "2 1 180px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "NOTE"), /* @__PURE__ */ React.createElement("input", { value: ovNote, onChange: (e) => setOvNote(e.target.value), placeholder: "Loyalty discount", style: { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } }))
        ),
        /* @__PURE__ */ React.createElement("button", { onClick: async () => { setOvMsg(""); const res = await fetch("/api/admin/price-override/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: ovEmail, product: ovProduct, price_dollars: ovPrice, note: ovNote }) }); const d = await res.json(); if (res.ok) { setOvMsg(`\u2705 Price override set: ${ovEmail} pays $${ovPrice} for ${ovProduct}.`); setOvEmail(""); setOvPrice(""); setOvNote(""); load(); } else setOvMsg(`\u274C ${d.error}`); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Set Override"),
        ovMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 13, color: ovMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, ovMsg),
        overrides.length > 0 && /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 16 } },
          /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Product", "Override Price", "Note", "Action"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555" } }, h.toUpperCase())))),
          /* @__PURE__ */ React.createElement("tbody", null,
            overrides.map((o) =>
              /* @__PURE__ */ React.createElement("tr", { key: o.id, style: { borderTop: "1px solid #f0ede8" } },
                /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, o.email),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", textTransform: "capitalize" } }, o.product),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontWeight: "bold", color: "#1a2d5a" } }, "$", ((o.price_cents || 0) / 100).toFixed(2)),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", color: "#888" } }, o.note || "\u2014"),
                /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => { await fetch("/api/admin/price-override/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id }) }); load(); }, style: { padding: "3px 8px", background: "transparent", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Remove"))
              )
            )
          )
        )
      ),
      /* Session Expiry Warnings */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Session Expiry Warnings"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Send reminder emails to users whose access expires within 2 days. Each user is only warned once."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } },
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { const preview = await fetch("/api/admin/check-expiring?days=2"); const d = await preview.json(); if (d.count === 0) { alert("No purchases expiring in the next 2 days."); return; } if (!confirm(`Send expiry warnings to ${d.count} user(s)?\n\n${(d.expiring_soon || []).map(p => p.email + " (" + p.product + ")").join("\n")}`)) return; const res = await fetch("/api/send-expiry-warnings?days=2", { method: "POST" }); const r = await res.json(); alert(`\u2705 Sent ${r.sent} warning email(s).${(r.errors || []).length ? "\n\nErrors:\n" + r.errors.join("\n") : ""}`); load(); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "\u23F0 Send Expiry Warnings"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa" } }, "Checks for access expiring within 2 days \u2014 users already warned are skipped")
        )
      ),
      /* Referral Payouts */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "\uD83D\uDCB8 Referral Commission Payouts"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Pay all referral partners with Stripe Connect accounts and outstanding balances."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { const res = await fetch("/api/admin/referral/payout-all", { method: "POST" }); const d = await res.json(); if (res.ok) { alert("\u2705 Paid " + (d.results || []).filter((r) => r.status === "ok").length + " partner(s)."); load(); } else alert("\u274C " + d.error); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Pay All Partners via Stripe"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa" } }, "Only pays partners with Stripe Connect set up and unpaid balances > $0")
        )
      ),
      /* Pro Overage Billing */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "\u26A1 Pro Subscriber Overage Billing"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Charge pro subscribers for sessions beyond their monthly limit ($5.00/session)."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { const preview = await fetch("/api/admin/pro/overage-preview"); const d = await preview.json(); if (!(d.preview || []).length) { alert("No unbilled overage sessions found."); return; } if (!confirm("Charge " + d.preview.length + " subscriber(s) totaling $" + ((d.total_to_charge || 0)).toFixed(2) + "?")) return; const res = await fetch("/api/admin/pro/auto-charge-overages", { method: "POST" }); const r2 = await res.json(); alert("\u2705 Charged " + (r2.results || []).filter((r) => r.status === "ok").length + " subscriber(s)."); load(); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Charge All Overage"),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa" } }, "Shows preview with totals before charging")
        )
      ),
      /* Extend User Access */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Extend User Access"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 14 } }, "Extend the expiry date on a user's product purchase."),
        /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } },
          /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } },
            /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f8f6f1" } }, ["Email", "Product", "Current Expiry", "New Expiry", "Action"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: "bold", color: "#555", whiteSpace: "nowrap" } }, h.toUpperCase())))),
            /* @__PURE__ */ React.createElement("tbody", null,
              (data?.users || []).filter((u) => (u.purchases || []).length > 0).flatMap((u) => (u.purchases || []).map((p) => ({ ...p, email: u.email }))).map((p) =>
                /* @__PURE__ */ React.createElement("tr", { key: p.id, style: { borderTop: "1px solid #f0ede8" } },
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, p.email),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", textTransform: "capitalize" } }, p.product),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontSize: 11, color: new Date(p.expires_at) < new Date() ? "#dc2626" : "#555" } }, p.expires_at?.slice(0, 10)),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("input", { type: "date", defaultValue: p.expires_at?.slice(0, 10), onChange: (e) => p._newExpiry = e.target.value, style: { padding: "3px 6px", border: "1px solid #ddd", borderRadius: 5, fontSize: 11, fontFamily: "Georgia, serif" } })),
                  /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!p._newExpiry) return; await fetch("/api/admin/purchase/extend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchase_id: p.id, expires_at: p._newExpiry }) }); load(); }, style: { padding: "3px 8px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "Extend"))
                )
              ),
              (data?.users || []).filter((u) => (u.purchases || []).length > 0).length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { padding: 16, color: "#aaa", textAlign: "center" } }, "No purchases yet."))
            )
          )
        )
      )
    ),

    /* ===== FOUNDATION TAB ===== */
    tab === "foundation" && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "0 24px 32px" } },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", padding: 24, marginBottom: 20 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 4 } }, "Approve Foundation Member"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#888", marginBottom: 16 } }, "Foundation Members earn their standard 20% commission on direct sales, PLUS an override commission on every sale made by partners they recruit."),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" } },
          /* @__PURE__ */ React.createElement("div", { style: { flex: "2 1 220px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "EMAIL ADDRESS *"), /* @__PURE__ */ React.createElement("input", { value: fmEmail, onChange: (e) => setFmEmail(e.target.value), placeholder: "partner@email.com", style: { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 140px" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: "bold", color: "#555", display: "block", marginBottom: 4 } }, "OVERRIDE % *"), /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "20", value: fmPct, onChange: (e) => setFmPct(e.target.value), style: { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif" } })),
          /* @__PURE__ */ React.createElement("button", { onClick: async () => { setFmMsg(""); const res = await fetch("/api/admin/foundation/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fmEmail, override_pct: parseInt(fmPct) }) }); const d = await res.json(); if (res.ok) { setFmMsg(`\u2705 ${fmEmail} is now a Foundation Member (${fmPct}% override). Welcome email sent.`); setFmEmail(""); load(); } else setFmMsg(`\u274C ${d.error}`); }, style: { padding: "9px 20px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" } }, "Approve \u2192")
        ),
        fmMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, color: fmMsg.startsWith("\u2705") ? "#15803d" : "#dc2626" } }, fmMsg)
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } },
        /* @__PURE__ */ React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid #f0ede8", fontWeight: "bold", fontSize: 15, color: "#1a2d5a" } }, "Foundation Members (", foundation.length, ")"),
        foundation.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: 24, color: "#aaa", textAlign: "center", fontSize: 13 } }, "No foundation members yet."),
        foundation.map((fm) =>
          /* @__PURE__ */ React.createElement("div", { key: fm.id, style: { borderTop: "1px solid #f0ede8", padding: "16px 24px" } },
            /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 } },
              /* @__PURE__ */ React.createElement("div", null,
                /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a" } }, fm.email),
                /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginTop: 2 } }, "Code: ", /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "monospace", color: "#7ec11f" } }, fm.code), " \xB7 Override: ", /* @__PURE__ */ React.createElement("strong", null, fm.override_pct, "%"), " \xB7 Partners recruited: ", /* @__PURE__ */ React.createElement("strong", null, fm.recruited_count), " \xB7 Total override earned: ", /* @__PURE__ */ React.createElement("strong", null, "$", ((fm.total_override_earned || 0) / 100).toFixed(2)))
              ),
              /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } },
                /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (fmPartners[fm.id]) { setFmPartners((p) => ({ ...p, [fm.id]: null })); return; } const res = await fetch(`/api/admin/foundation/partners/${fm.id}`); const d = await res.json(); setFmPartners((p) => ({ ...p, [fm.id]: d.partners || [] })); }, style: { padding: "5px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, fmPartners[fm.id] ? "Hide Partners" : "View Partners"),
                /* @__PURE__ */ React.createElement("button", { onClick: async () => { if (!confirm(`Remove Foundation Member status from ${fm.email}?`)) return; await fetch("/api/admin/foundation/deactivate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: fm.id }) }); load(); }, style: { padding: "5px 12px", background: "transparent", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif" } }, "Remove"),
                /* @__PURE__ */ React.createElement("button", { onClick: async () => { const res = await fetch(`/api/admin/foundation/recruitment-link/${fm.id}`); const d = await res.json(); if (res.ok) { navigator.clipboard.writeText(d.link); alert(`\u2705 Recruitment link copied!\n\n${d.link}`); } else alert(`\u274C ${d.error}`); }, style: { padding: "5px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "\uD83D\uDD17 Copy Recruit Link")
              )
            ),
            /* Assign Partner */
            /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
              /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#888" } }, "Assign a partner to this foundation member:"),
              /* @__PURE__ */ React.createElement("select", { style: { padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, fontFamily: "Georgia, serif" }, id: `partner-select-${fm.id}` },
                /* @__PURE__ */ React.createElement("option", { value: "" }, "Select partner..."),
                referrals.filter((r) => !r.foundation_sponsor_id).map((r) => /* @__PURE__ */ React.createElement("option", { key: r.id, value: r.id }, r.email, " (", r.code, ")"))
              ),
              /* @__PURE__ */ React.createElement("button", { onClick: async () => { const sel = document.getElementById(`partner-select-${fm.id}`); if (!sel?.value) return; const res = await fetch("/api/admin/foundation/assign-partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partner_id: parseInt(sel.value), foundation_member_id: fm.id }) }); const d = await res.json(); setFmAssignMsg((p) => ({ ...p, [fm.id]: res.ok ? "\u2705 Partner assigned." : `\u274C ${d.error}` })); if (res.ok) { sel.value = ""; load(); } }, style: { padding: "4px 10px", background: "#1a2d5a", color: "#7ec11f", border: "1px solid #7ec11f", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: "bold" } }, "Assign"),
              fmAssignMsg[fm.id] && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: fmAssignMsg[fm.id].startsWith("\u2705") ? "#15803d" : "#dc2626" } }, fmAssignMsg[fm.id])
            ),
            /* Partners List */
            fmPartners[fm.id] && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, background: "#f8f6f1", borderRadius: 8, overflow: "hidden" } },
              /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 14px", fontSize: 11, fontWeight: "bold", color: "#555", background: "#f0ede8" } }, "RECRUITED PARTNERS (", fmPartners[fm.id].length, ")"),
              fmPartners[fm.id].length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 14px", color: "#aaa", fontSize: 12 } }, "No partners assigned yet."),
              fmPartners[fm.id].map((p) =>
                /* @__PURE__ */ React.createElement("div", { key: p.id, style: { padding: "10px 14px", borderTop: "1px solid #e8e4dc", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 } },
                  /* @__PURE__ */ React.createElement("div", null,
                    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: "#1a2d5a", fontWeight: "bold" } }, p.email),
                    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontFamily: "monospace", color: "#7ec11f", marginLeft: 8 } }, p.code)
                  ),
                  /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666" } },
                    p.conversion_count, " sales \xB7 $", ((p.total_sales || 0) / 100).toFixed(2), " sold \xB7",
                    /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", marginLeft: 4 } }, "$", ((p.total_sales || 0) * fm.override_pct / 10000).toFixed(2), " override earned")
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

window.AdminPage = AdminPage;
