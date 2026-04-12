
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

function DashboardPage() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((data) => {
      setUser(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };
  const hasNavigator = user && (user.access || []).some((p) => ["navigator", "bundle"].includes(p));
  const hasWizard = user && (user.access || []).some((p) => ["wizard", "bundle"].includes(p));
  const hdr = {
    background: "#1a2d5a",
    padding: "16px 24px",
    borderBottom: "3px solid #7ec11f"
  };
  const card = {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8e4dc",
    padding: "28px 28px",
    marginBottom: 18
  };
  const toolBtn = (href, icon, label, sub, active) => React.createElement(
    "a",
    {
      href: active ? href : "/pricing",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 20px",
        borderRadius: 10,
        textDecoration: "none",
        border: `2px solid ${active ? "#7ec11f" : "#e8e4dc"}`,
        background: active ? "#1a2d5a" : "#f8f6f1",
        transition: "all 0.15s",
        marginBottom: 12
      }
    },
    React.createElement("div", { style: { fontSize: 28 } }, icon),
    React.createElement(
      "div",
      { style: { flex: 1 } },
      React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: active ? "#7ec11f" : "#999" } }, label),
      React.createElement("div", { style: { fontSize: 12, color: active ? "#aaa" : "#bbb", marginTop: 2 } }, sub)
    ),
    React.createElement(
      "div",
      { style: { fontSize: 13, color: active ? "#7ec11f" : "#ccc" } },
      active ? "Open \u2192" : "Purchase \u2192"
    )
  );
  if (loading) return React.createElement("div", {
    style: {
      fontFamily: "Georgia, serif",
      background: "#f8f6f1",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#888"
    }
  }, "Loading your account...");
  if (!user || !user.loggedIn) {
    window.location.href = "/login";
    return null;
  }
  return React.createElement(
    "div",
    { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } },
    // Header
    React.createElement(IRSPilotNav, { subtitle: "MY ACCOUNT" }),
    // Body
    React.createElement(
      "div",
      { style: { maxWidth: 700, margin: "0 auto", padding: "40px 24px" } },
      // Welcome
      React.createElement(
        "div",
        { style: { marginBottom: 28 } },
        React.createElement("div", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "My Account"),
        React.createElement("div", { style: { fontSize: 14, color: "#888" } }, user.email)
      ),
      // Tools card
      React.createElement(
        "div",
        { style: card },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Your Tools"),
        toolBtn("/navigator", "\u{1F9ED}", "IRS Pilot", hasNavigator ? "Active \u2014 7-day access" : "Not purchased", hasNavigator),
        toolBtn("/wizard", "\u{1F4CB}", "Financial Intake Wizard", hasWizard ? "Active \u2014 7-day access" : "Not purchased", hasWizard),
        (!hasNavigator || !hasWizard) && React.createElement(
          "div",
          { style: { fontSize: 13, color: "#aaa", marginTop: 8, fontStyle: "italic" } },
          "Need access? ",
          React.createElement("a", { href: "/pricing", style: { color: "#1a2d5a", fontWeight: "bold" } }, "View pricing \u2192")
        )
      ),
      // Referral card
      React.createElement(
        "div",
        { style: { ...card, background: "#f0fdf4", border: "1px solid #bbf7d0" } },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#15803d", marginBottom: 6 } }, "\u{1F517} Referral Partner Program"),
        React.createElement(
          "div",
          { style: { fontSize: 14, color: "#555", marginBottom: 16, lineHeight: 1.6 } },
          "Refer clients to IRS Pilot and earn 20% commission on every sale."
        ),
        React.createElement("a", {
          href: "/referral",
          style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#15803d", color: "#fff", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
        }, "View My Referral Dashboard \u2192")
      ),
      // Consultation card
      React.createElement(
        "div",
        { style: { ...card, background: "#1a2d5a", border: "none" } },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#7ec11f", marginBottom: 8 } }, "Need Professional Help?"),
        React.createElement(
          "div",
          { style: { fontSize: 14, color: "#aaa", marginBottom: 18, lineHeight: 1.6 } },
          "Schedule a 15-minute consultation with Tyrone J. Taylor, EA \u2014 author of Stop IRS Collections."
        ),
        React.createElement("a", {
          href: "https://www.calendly.com/taylor-tax-financial/tax-help",
          target: "_blank",
          rel: "noopener noreferrer",
          style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
        }, "\u{1F4C5} Schedule a Consultation \u2192")
      )
    )
  );
}
window.DashboardPage = DashboardPage;