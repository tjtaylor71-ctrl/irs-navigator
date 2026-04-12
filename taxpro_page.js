
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

function TaxProPage() {
  const [demoForm, setDemoForm] = React.useState({ name: "", profession: "", email: "", mobile: "" });
  const [demoSubmitting, setDemoSubmitting] = React.useState(false);
  const [demoMsg, setDemoMsg] = React.useState("");
  const [demoSubmitted, setDemoSubmitted] = React.useState(false);
  const setDemo = (k, v) => setDemoForm((p) => ({ ...p, [k]: v }));
  const handleDemoRequest = async () => {
    setDemoMsg("");
    if (!demoForm.name || !demoForm.profession || !demoForm.email || !demoForm.mobile) {
      setDemoMsg("Please fill in all fields.");
      return;
    }
    setDemoSubmitting(true);
    try {
      const res = await fetch("/api/taxpro/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm)
      });
      const d = await res.json();
      if (res.ok) {
        setDemoSubmitted(true);
      } else {
        setDemoMsg(d.error || "Something went wrong.");
      }
    } catch {
      setDemoMsg("Network error \u2014 please try again.");
    }
    setDemoSubmitting(false);
  };
  const faqItems = [
    {
      q: "Do I need to be a licensed tax professional to join the referral program?",
      a: "No license is required for the referral program \u2014 anyone can refer clients and earn commissions. Simply create a free account at irspilot.com and enroll immediately. The pro subscription is designed for tax professionals who want to offer IRS resolution tools to their clients under their own brand."
    },
    {
      q: "How quickly are referral commissions paid?",
      a: "Commissions are tracked automatically and paid manually by Taylor Tax and Financial Consulting Inc. We process payouts monthly. You can see your pending balance in your referral dashboard at any time."
    },
    {
      q: "Can I do both programs at the same time?",
      a: "Yes. You can refer clients for commission AND have a pro subscription. Many partners use their referral link to send clients to the IRS Pilot pricing page while also offering the white-label tool directly to their own client base."
    },
    {
      q: "What credentials show on the white-label version?",
      a: "Your firm name, your name with credentials, your phone number, and your Calendly scheduling link. Your clients will never see IRS Pilot or Tyrone J. Taylor's name anywhere in the interface."
    },
    {
      q: "How long does pro subscription setup take?",
      a: "Once you submit your information and we verify it, setup is typically completed within 1 business day. You'll receive your shareable link and billing information by email."
    },
    {
      q: "What happens when a client's 24-hour session expires?",
      a: "They can return to your shareable link at any time to start a new session. Each new session counts against your monthly allowance of 10 sessions. Additional sessions are $5 each."
    },
    {
      q: "How can either program lead to more tax representation revenue?",
      a: "This is one of the most important benefits of the program. IRS Pilot walks clients through their situation in plain language \u2014 and many of them discover for the first time exactly how serious their problem is. The tool is designed to be helpful, but it also makes clear when a situation requires professional representation. Every call-to-action in the app shows your contact information. Clients who start with a $59 self-help tool often end up calling you for representation on cases worth hundreds or thousands of dollars in fees. The referral commission is just the beginning \u2014 the real value is the warm lead who already understands their problem and trusts your recommendation."
    },
    {
      q: "What if I need more than 10 client sessions per month?",
      a: "We charge $5 per additional session, billed at the end of each month. There is no cap \u2014 you can use as many sessions as your clients need."
    },
    {
      q: "Can I set my own price for clients under the pro subscription?",
      a: "Yes. Pro subscribers can charge their clients their own price \u2014 minimum $79 for Navigator, $139 for Wizard, and $179 for Bundle (50% above IRS Pilot's base price). You keep the margin. Stripe handles payment collection, and your client gets immediate 24-hour access after paying."
    },
    {
      q: "Is there a contract or commitment for the pro subscription?",
      a: "No long-term contract. The pro subscription is month-to-month. You may cancel at any time by contacting info@taylortaxandfinancial.com."
    }
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement(IRSPilotNav, { subtitle: "TAX PROFESSIONALS" }), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "36px 16px 32px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: "#7ec11f", color: "#1a2d5a", fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, marginBottom: 18 } }, "FOR TAX PROFESSIONALS"), /* @__PURE__ */ React.createElement("h1", { style: { fontSize: "clamp(24px, 5vw, 38px)", fontWeight: "bold", color: "#fff", margin: "0 0 14px", lineHeight: 1.2 } }, "Turn IRS Problems Into", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "Revenue Opportunities")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 15, color: "#aaa", maxWidth: 580, margin: "0 auto 24px", lineHeight: 1.7 } }, "Two programs designed for tax professionals \u2014 refer clients and earn commissions instantly, or offer IRS Pilot under your own brand with an approved pro subscription.")), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 900, margin: "0 auto", padding: "32px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Choose Your Program"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14 } }, "Or do both \u2014 many partners use them together.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 300px", minWidth: 0, background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "24px 24px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F517}"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 20, marginBottom: 4 } }, "Referral Program"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 13, marginBottom: 12 } }, "Free to join \xB7 No monthly fee \xB7 Enroll instantly"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 32, fontWeight: "bold" } }, "20%", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: "normal" } }, " per sale"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "Share your unique referral link with clients who have IRS issues you're not handling directly. When they purchase, you earn 20% automatically \u2014 tracked in your dashboard. No approval needed. Enroll and get your link immediately."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 8, marginBottom: 20 } }, [
    "Navigator sale ($59) \u2192 you earn $11.80",
    "Wizard sale ($99) \u2192 you earn $19.80",
    "Bundle sale ($129) \u2192 you earn $25.80",
    "30-day referral cookie tracking",
    "Real-time dashboard to track conversions",
    "Monthly commission payouts",
    "No cap on earnings"
  ].map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 13, color: "#333" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0 } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { background: "#f0f9e0", border: "1px solid #7ec11f", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#1a2d5a", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("strong", null, "\u2705 No approval required."), " Create a free account and enroll immediately at irspilot.com/referral."), /* @__PURE__ */ React.createElement("a", { href: "/login", style: { display: "block", textAlign: "center", padding: "12px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" } }, "Join Referral Program \u2192"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 8 } }, "Create a free account, then go to irspilot.com/referral"))), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 300px", minWidth: 0, background: "#fff", borderRadius: 14, border: "2px solid #7ec11f", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "8px 24px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", background: "#7ec11f", padding: "2px 12px", borderRadius: 20, letterSpacing: 1 } }, "MOST POPULAR")), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F3E2}"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 20, marginBottom: 4 } }, "Pro Subscription"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 13, marginBottom: 12 } }, "White-label \xB7 Your branding \xB7 Requires approval"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 32, fontWeight: "bold" } }, "$49", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: "normal" } }, "/mo")), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 13 } }, "first 3 months, then $79/mo"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "Offer IRS Pilot to your clients under your firm's name and brand. Your clients click your unique link and see your name, phone, and Calendly \u2014 not ours. Every call-to-action drives clients back to you."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 8, marginBottom: 20 } }, [
    "Your firm name and contact info throughout the app",
    "Full Navigator + Wizard for clients",
    "10 client sessions per month included",
    "Additional sessions at $5 each",
    "24-hour client sessions \u2014 no client login needed",
    "Set your own reseller prices (min 50% markup)",
    "Intro: $49/mo for first 3 months \u2192 $79/mo"
  ].map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 13, color: "#333" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0 } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff8e8", border: "1px solid #f59e0b", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("strong", null, "\u23F3 Requires approval."), " Submit your information and we'll set you up within 1 business day."), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "/referral#pro-contact",
      style: { display: "block", textAlign: "center", padding: "12px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
    },
    "\u{1F4EC} Get Started with Pro \u2192"
  ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 8 } }, "Learn more and contact us on the referral page")))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "28px", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 16 } }, "\u{1F517} How the Referral Program Works"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 } }, [
    { step: "1", title: "Create account", desc: "Sign up free at irspilot.com. No credit card required." },
    { step: "2", title: "Enroll instantly", desc: "Go to irspilot.com/referral and join. Your unique link is ready immediately." },
    { step: "3", title: "Share your link", desc: "Send irspilot.com/refer/YOURCODE to any client with an IRS issue." },
    { step: "4", title: "Earn 20%", desc: "They buy within 30 days \u2014 you earn automatically. Paid monthly." }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.step, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "#1a2d5a", color: "#7ec11f", fontWeight: "bold", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" } }, s.step), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 13, color: "#1a2d5a", marginBottom: 4 } }, s.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6 } }, s.desc))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "28px", marginBottom: 40 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 16 } }, "\u{1F3E2} How the Pro Subscription Works"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 } }, [
    { step: "1", title: "Schedule a call", desc: "Book a 15-minute call with Tyrone J. Taylor, EA to get set up." },
    { step: "2", title: "We configure it", desc: "Your firm name, contact, and Calendly are added. You receive your unique branded link." },
    { step: "3", title: "Share with clients", desc: "Send your link to any client with an IRS problem. They get 24-hour branded access." },
    { step: "4", title: "They call you", desc: "Every CTA shows your name, phone, and scheduling link. Clients come back to you." }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.step, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "#1a2d5a", color: "#7ec11f", fontWeight: "bold", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" } }, s.step), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 13, color: "#1a2d5a", marginBottom: 4 } }, s.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6 } }, s.desc))))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 40 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 16 } }, "Frequently Asked Questions"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 10 } }, faqItems.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a", marginBottom: 6 } }, "Q: ", item.q), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.7 } }, item.a))))), /* @__PURE__ */ React.createElement("div", { id: "demo-request", style: { background: "#fff", borderRadius: 14, border: "2px solid #1a2d5a", padding: "32px", marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: "#1a2d5a", color: "#7ec11f", fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, marginBottom: 12 } }, "REQUEST A DEMO"), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "See IRS Pilot in Action"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, maxWidth: 480, margin: "0 auto" } }, "Request a 24-hour demo and experience the full platform \u2014 exactly what your clients will see. We'll send you access within one business day.")), demoSubmitted ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "24px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 44, marginBottom: 12 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Request Received!"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#666", lineHeight: 1.7 } }, "We'll review your request and send your demo access within one business day. Check your email at ", /* @__PURE__ */ React.createElement("strong", null, demoForm.email), ".")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 12, color: "#555", display: "block", marginBottom: 5 } }, "FULL NAME *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: demoForm.name,
      onChange: (e) => setDemo("name", e.target.value),
      placeholder: "Jane Smith",
      style: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 12, color: "#555", display: "block", marginBottom: 5 } }, "PROFESSION *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: demoForm.profession,
      onChange: (e) => setDemo("profession", e.target.value),
      placeholder: "EA, CPA, Tax Attorney, etc.",
      style: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 12, color: "#555", display: "block", marginBottom: 5 } }, "EMAIL ADDRESS *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      value: demoForm.email,
      onChange: (e) => setDemo("email", e.target.value),
      placeholder: "you@yourfirm.com",
      style: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 12, color: "#555", display: "block", marginBottom: 5 } }, "MOBILE NUMBER *"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "tel",
      value: demoForm.mobile,
      onChange: (e) => setDemo("mobile", e.target.value),
      placeholder: "(555) 123-4567",
      style: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }
    }
  ))), demoMsg && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 } }, "\u26A0 ", demoMsg), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleDemoRequest,
      disabled: demoSubmitting,
      style: { width: "100%", padding: "13px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, cursor: demoSubmitting ? "not-allowed" : "pointer", opacity: demoSubmitting ? 0.7 : 1 }
    },
    demoSubmitting ? "Submitting..." : "Request Demo Access \u2192"
  ), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10, fontSize: 12, color: "#aaa" } }, "We'll send your 24-hour demo link within one business day. No commitment required."))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 12, padding: "28px 24px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontWeight: "bold", fontSize: 12, letterSpacing: 1, marginBottom: 8 } }, "READY TO GET STARTED?"), /* @__PURE__ */ React.createElement("div", { style: { color: "#e8e4dc", fontSize: 14, marginBottom: 20, lineHeight: 1.6 } }, "Join the referral program instantly \u2014 or schedule a call to set up your white-label pro subscription."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("a", { href: "/login", style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" } }, "\u{1F517} Join Referral Program \u2192"), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "/referral#pro-contact",
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: "transparent", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
    },
    "\u{1F4EC} Get Started with Pro \u2192"
  )))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "20px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc" } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124 \xB7", " ", /* @__PURE__ */ React.createElement("a", { href: "/terms", style: { color: "#aaa" } }, "Terms"), " \xB7", " ", /* @__PURE__ */ React.createElement("a", { href: "/privacy", style: { color: "#aaa" } }, "Privacy")));
}
window.TaxProPage = TaxProPage;