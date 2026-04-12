
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
              React.createElement('a',{href:'/letter-generator',style:lnk},'\uD83D\uDCC4 Letter Generator',hW&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/transcript',style:lnk},'\uD83D\uDCC1 Transcript Analyzer'),
              React.createElement('a',{href:'/account',style:lnk},'\u2699\ufe0f My Account'),
              React.createElement('a',{href:'/logout',style:Object.assign({},lnk,{color:'#dc2626',borderBottom:'none'})},'\uD83D\uDEAA Sign Out')
            )
          )
    )
  );
}

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
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement(IRSPilotNav, { subtitle: "REFERRAL PROGRAM" }), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 760, margin: "0 auto", padding: "36px 24px" } }, !user?.loggedIn ? /* @__PURE__ */ React.createElement("div", { style: { ...card, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 16 } }, "\u{1F512}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", marginBottom: 8 } }, "Sign In Required"), /* @__PURE__ */ React.createElement("div", { style: { color: "#666", marginBottom: 20 } }, "You need an account to join the referral program."), /* @__PURE__ */ React.createElement("a", { href: "/login?next=/referral", style: { display: "inline-block", padding: "12px 24px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", textDecoration: "none" } }, "Sign In \u2192")) : !partner ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: "bold", marginBottom: 8 } }, "Earn by Referring Clients"), /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" } }, "Share your unique referral link with clients, colleagues, or your audience. Earn ", /* @__PURE__ */ React.createElement("strong", null, "20% commission"), " on every purchase made through your link.")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 } }, [
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
  )), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 13, color: "#888" } }, "Your commission rate: ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#1a2d5a" } }, partner.commission_pct, "%"), " per sale \xB7 Navigator: ", /* @__PURE__ */ React.createElement("strong", null, "$", (5900 * partner.commission_pct / 1e4).toFixed(2)), " \xB7 Wizard: ", /* @__PURE__ */ React.createElement("strong", null, "$", (9900 * partner.commission_pct / 1e4).toFixed(2)), " \xB7 Bundle: ", /* @__PURE__ */ React.createElement("strong", null, "$", (12900 * partner.commission_pct / 1e4).toFixed(2)))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, marginBottom: 14, color: "#1a2d5a" } }, "Conversion History"), !stats?.history?.length ? /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 14, textAlign: "center", padding: "20px 0" } }, "No conversions yet. Share your link to start earning.") : /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { borderBottom: "1px solid #f0ede8" } }, ["Date", "Product", "Sale", "Your Commission", "Status"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "8px 12px", textAlign: "left", color: "#888", fontSize: 12, fontWeight: "bold" } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, stats.history.map((row, i) => /* @__PURE__ */ React.createElement("tr", { key: i, style: { borderTop: "1px solid #f8f6f1" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#666" } }, row.created_at?.slice(0, 10)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", textTransform: "capitalize" } }, row.product), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, "$", (row.sale_amount / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px", color: "#7ec11f", fontWeight: "bold" } }, "$", (row.commission_amount / 100).toFixed(2)), /* @__PURE__ */ React.createElement("td", { style: { padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 20, background: row.paid_out ? "#f0fdf4" : "#fef9ec", color: row.paid_out ? "#15803d" : "#92400e", fontWeight: "bold" } }, row.paid_out ? "Paid" : "Pending"))))))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#aaa", textAlign: "center" } }, "Commissions are paid manually by Taylor Tax and Financial Consulting Inc. Questions? ", /* @__PURE__ */ React.createElement("a", { href: "https://www.calendly.com/taylor-tax-financial/tax-help", style: { color: "#1a2d5a" } }, "Schedule a call \u2192"))), /* @__PURE__ */ React.createElement("div", { id: "pro-contact", style: { background: "#1a2d5a", borderRadius: 14, padding: "36px 28px", marginTop: 28 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: "#7ec11f", color: "#1a2d5a", fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, marginBottom: 14 } }, "PRO SUBSCRIPTION"), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 10 } }, "Interested in the White-Label Pro Subscription?"), /* @__PURE__ */ React.createElement("p", { style: { color: "#aaa", fontSize: 14, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" } }, "The pro subscription requires a quick setup so we can configure your firm name, contact info, and Calendly link into the app. Setup takes less than 15 minutes and your branded link is ready within 1 business day.")), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "20px 24px", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5, marginBottom: 12 } }, "WHAT'S INCLUDED"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 } }, [
    "Your firm name throughout the app",
    "Your phone and scheduling link on every CTA",
    "10 client sessions/month included",
    "$49/mo intro \xB7 $79/mo standard",
    "Reseller pricing available",
    "Setup within 1 business day"
  ].map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 13, color: "#ccc", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", flexShrink: 0 } }, "\u2713"), item)))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 13, marginBottom: 14 } }, "Schedule a 15-minute call or reach out directly \u2014 we'll get you set up."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://www.calendly.com/taylor-tax-financial/irspilotreferral",
      target: "_blank",
      rel: "noopener noreferrer",
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
    },
    "\u{1F4C5} Schedule a Setup Call \u2192"
  ), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "mailto:info@taylortaxandfinancial.com?subject=IRS Pilot Pro Subscription Inquiry",
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "transparent", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
    },
    "\u2709\uFE0F Email Us \u2192"
  )), /* @__PURE__ */ React.createElement("div", { style: { color: "#666", fontSize: 12 } }, "(615) 953-7124 \xB7 info@taylortaxandfinancial.com")))));
}
window.ReferralPage = ReferralPage;