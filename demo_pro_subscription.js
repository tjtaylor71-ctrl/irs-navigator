
const { useState, useEffect } = React;

const FIRM = {
  name: "Mitchell Tax Group",
  credential: "EA, NTPI Fellow",
  phone: "(312) 555-0187",
  calendly: "https://calendly.com/mitchelltaxgroup",
  code: "MTG-4829",
};

function ProSubscriptionDemo() {
  var _t = useState("client"); var tab = _t[0]; var setTab = _t[1];

  var s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1" },
    wrap: { maxWidth:820, margin:"0 auto", padding:"28px 16px 100px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"24px 28px", marginBottom:20 },
  };

  return React.createElement("div", { style: s.page },
    React.createElement(DemoNavBar, null),

    React.createElement("div", { style: s.wrap },

      // Intro card
      React.createElement("div", { style:{ background:"linear-gradient(135deg,#1a2d5a,#243d7a)", borderRadius:10, padding:"20px 24px", marginBottom:20, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" } },
        React.createElement("div", { style:{ fontSize:36, flexShrink:0 } }, "\uD83C\uDFE2"),
        React.createElement("div", null,
          React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", fontSize:16, marginBottom:4 } }, "Pro Subscription — Interactive Demo"),
          React.createElement("div", { style:{ color:"#cce8a0", fontSize:14, lineHeight:1.6 } },
            "See both sides of the Pro Subscription. Switch between what your client experiences and what you manage as the pro."
          )
        )
      ),

      // Tab switcher
      React.createElement("div", { style:{ display:"flex", gap:8, marginBottom:20 } },
        React.createElement("button", {
          onClick:function(){setTab("client");},
          style:{ flex:1, padding:"12px 16px", borderRadius:10, border:"2px solid "+(tab==="client"?"#1a2d5a":"#e8e4dc"), background:tab==="client"?"#1a2d5a":"#fff", color:tab==="client"?"#7ec11f":"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer" }
        }, "\uD83D\uDC64 Client View — What Your Client Sees"),
        React.createElement("button", {
          onClick:function(){setTab("pro");},
          style:{ flex:1, padding:"12px 16px", borderRadius:10, border:"2px solid "+(tab==="pro"?"#1a2d5a":"#e8e4dc"), background:tab==="pro"?"#1a2d5a":"#fff", color:tab==="pro"?"#7ec11f":"#888", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer" }
        }, "\uD83C\uDFE2 Pro Dashboard — What You Manage")
      ),

      tab === "client" && React.createElement(ClientView, null),
      tab === "pro"    && React.createElement(ProDashboard, null),

      // CTA
      React.createElement("div", { style:{ background:"#1a2d5a", borderRadius:12, padding:"24px 28px", textAlign:"center" } },
        React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", fontSize:16, marginBottom:8 } }, "Ready to offer IRS Pilot under your own brand?"),
        React.createElement("p", { style:{ color:"#cce8a0", fontSize:14, lineHeight:1.7, marginBottom:20 } },
          "$49/month intro rate \u00b7 10 client sessions included \u00b7 White-label branding configured within 1 business day"
        ),
        React.createElement("div", { style:{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" } },
          React.createElement("a", { href:"/taxpro", style:{ background:"#7ec11f", color:"#1a2d5a", borderRadius:8, padding:"12px 28px", textDecoration:"none", fontWeight:"bold", fontSize:15 } }, "Subscribe as a Pro \u2192"),
          React.createElement("a", { href:"/", style:{ background:"transparent", color:"#7ec11f", border:"2px solid rgba(126,193,31,0.5)", borderRadius:8, padding:"12px 28px", textDecoration:"none", fontWeight:"bold", fontSize:15 } }, "\u2190 Back to Home")
        )
      )
    ),

    // Sticky bar
    React.createElement("div", { style:{ position:"fixed", bottom:0, left:0, right:0, background:"#1a2d5a", borderTop:"2px solid #7ec11f", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", zIndex:1000, flexWrap:"wrap", gap:10 } },
      React.createElement("div", { style:{ color:"#cce8a0", fontSize:13 } }, "\uD83C\uDFE2 Pro Subscription \u2014 White-label IRS tools for your practice"),
      React.createElement("div", { style:{ display:"flex", gap:8, flexWrap:"wrap" } },
        React.createElement("a", { href:"/", style:{ color:"#cce8a0", fontSize:12, textDecoration:"none", padding:"7px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,0.2)" } }, "\u2190 Back to Home"),
        React.createElement("a", { href:"/taxpro", style:{ background:"#7ec11f", color:"#1a2d5a", borderRadius:8, padding:"7px 16px", textDecoration:"none", fontWeight:"bold", fontSize:13 } }, "Subscribe \u2014 $49/mo \u2192")
      )
    )
  );
}


// ── CLIENT VIEW ─────────────────────────────────────────────────────────────

function ClientView() {
  var _s = useState("home"); var screen = _s[0]; var setScreen = _s[1];
  var s = {
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"24px 28px", marginBottom:16 },
    h2: { fontSize:17, fontWeight:"bold", color:"#1a2d5a", marginBottom:10 },
    body: { fontSize:14, color:"#555", lineHeight:1.75 },
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"10px 22px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer", textDecoration:"none", display:"inline-block" },
    btnGhost: { background:"transparent", color:"#1a2d5a", border:"1px solid #e8e4dc", borderRadius:8, padding:"10px 18px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" },
  };

  // White-label nav — firm branding, no IRS Pilot mention
  var clientNav = React.createElement("div", { style:{ background:"#1a2d5a", borderBottom:"3px solid #7ec11f", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"10px 10px 0 0" } },
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
      React.createElement("div", { style:{ width:38, height:38, background:"#7ec11f", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", color:"#1a2d5a", fontSize:16 } }, "M"),
      React.createElement("div", null,
        React.createElement("div", { style:{ color:"#fff", fontWeight:"bold", fontSize:15 } }, FIRM.name),
        React.createElement("div", { style:{ color:"#7ec11f", fontSize:9, letterSpacing:1.5 } }, FIRM.credential + " \u00b7 IRS RESOLUTION TOOLS")
      )
    ),
    React.createElement("a", { href:FIRM.calendly, style:{ background:"#7ec11f", color:"#1a2d5a", borderRadius:20, padding:"7px 16px", textDecoration:"none", fontWeight:"bold", fontSize:12 } }, "Schedule a Consultation")
  );

  return React.createElement("div", null,

    // Demo notice
    React.createElement("div", { style:{ background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 16px", marginBottom:14, fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 } },
      "\uD83C\uDFAC ",
      React.createElement("span", null, React.createElement("strong", null, "Client View:"), " This is exactly what your client sees when they click your branded link. No mention of IRS Pilot anywhere.")
    ),

    // White-label mockup
    React.createElement("div", { style:{ border:"2px solid #1a2d5a", borderRadius:10, overflow:"hidden", marginBottom:20 } },
      clientNav,
      React.createElement("div", { style:{ padding:"20px", background:"#f8f6f1" } },

        screen === "home" && React.createElement("div", null,
          React.createElement("div", { style:{ textAlign:"center", padding:"16px 0 20px" } },
            React.createElement("div", { style:{ fontSize:24, fontWeight:"bold", color:"#1a2d5a", marginBottom:6 } }, "IRS Resolution Tools"),
            React.createElement("div", { style:{ color:"#888", fontSize:13 } }, "Provided by " + FIRM.name + " \u00b7 " + FIRM.phone)
          ),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 } },
            [
              ["\uD83D\uDCEC", "I Got an IRS Letter", "Look up your notice in plain English", "notice"],
              ["\u26A1", "I Have a Tax Problem", "Find your situation and your options", "situation"],
              ["\uD83D\uDCCB", "Financial Intake", "Auto-fill IRS forms 433-F and 433-A", "intake"],
              ["\uD83D\uDCC4", "Transcript Analysis", "Upload transcripts for a full report", "transcript"],
            ].map(function(item, i) {
              return React.createElement("div", { key:i, onClick:function(){setScreen(item[3]);}, style:{ background:"#fff", border:"1px solid #e8e4dc", borderRadius:10, padding:"14px", cursor:"pointer" } },
                React.createElement("div", { style:{ fontSize:22, marginBottom:6 } }, item[0]),
                React.createElement("div", { style:{ fontWeight:"bold", fontSize:14, color:"#1a2d5a", marginBottom:3 } }, item[1]),
                React.createElement("div", { style:{ fontSize:12, color:"#888" } }, item[2])
              );
            })
          ),
          React.createElement("div", { style:{ textAlign:"center", marginTop:16, padding:"14px", background:"#fff", borderRadius:10, border:"1px solid #e8e4dc" } },
            React.createElement("div", { style:{ fontSize:13, color:"#555", marginBottom:8 } }, "Need to speak with " + FIRM.name + " directly?"),
            React.createElement("a", { href:FIRM.calendly, style:{ background:"#1a2d5a", color:"#7ec11f", borderRadius:8, padding:"9px 20px", textDecoration:"none", fontWeight:"bold", fontSize:13 } }, "Schedule a Consultation \u2192")
          )
        ),

        screen === "notice" && React.createElement("div", null,
          React.createElement("button", { onClick:function(){setScreen("home");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:13, marginBottom:12 } }, "\u2190 Back"),
          React.createElement("div", { style:{ background:"#fff", borderRadius:10, padding:"16px" } },
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:16, color:"#1a2d5a", marginBottom:8 } }, "IRS CP504 \u2014 Notice of Intent to Levy"),
            React.createElement("div", { style:{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:7, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 } }, "\u26A0\uFE0F Critical \u00b7 30-day response window"),
            React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.75, marginBottom:12 } }, "The IRS intends to levy (seize) your state tax refund and potentially other assets. You have 30 days to respond before levy action can begin."),
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:14, color:"#1a2d5a", marginBottom:8 } }, "Your Options:"),
            ["Pay in full to stop all collection action", "Set up an installment agreement", "Request a Collection Due Process hearing (Form 12153)", "Explore Offer in Compromise eligibility"].map(function(opt, i) {
              return React.createElement("div", { key:i, style:{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 } },
                React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", flexShrink:0 } }, "\u2713"),
                React.createElement("div", { style:{ fontSize:13, color:"#555" } }, opt)
              );
            }),
            React.createElement("div", { style:{ textAlign:"center", marginTop:16 } },
              React.createElement("a", { href:FIRM.calendly, style:{ background:"#1a2d5a", color:"#7ec11f", borderRadius:8, padding:"10px 20px", textDecoration:"none", fontWeight:"bold", fontSize:13 } }, "Schedule a Consultation with " + FIRM.name + " \u2192")
            )
          )
        ),

        (screen === "situation" || screen === "intake" || screen === "transcript") && React.createElement("div", null,
          React.createElement("button", { onClick:function(){setScreen("home");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:13, marginBottom:12 } }, "\u2190 Back"),
          React.createElement("div", { style:{ background:"#fff", borderRadius:10, padding:"20px", textAlign:"center" } },
            React.createElement("div", { style:{ fontSize:36, marginBottom:12 } }, screen==="situation"?"\u26A1":screen==="intake"?"\uD83D\uDCCB":"\uD83D\uDCC4"),
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:16, color:"#1a2d5a", marginBottom:8 } },
              screen==="situation" ? "IRS Situation Guide" : screen==="intake" ? "Financial Intake Wizard" : "Transcript Analyzer"
            ),
            React.createElement("p", { style:{ fontSize:14, color:"#888", lineHeight:1.7, marginBottom:16 } },
              "This full tool is available to you through " + FIRM.name + ". Click below to get started or schedule a consultation."
            ),
            React.createElement("a", { href:FIRM.calendly, style:{ background:"#1a2d5a", color:"#7ec11f", borderRadius:8, padding:"10px 20px", textDecoration:"none", fontWeight:"bold", fontSize:14 } }, "Schedule with " + FIRM.name + " \u2192")
          )
        )
      )
    ),

    React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"14px 18px", fontSize:13, color:"#15803d" } },
      React.createElement("strong", null, "What your client never sees:"),
      " The IRS Pilot name, Tyrone J. Taylor's name, or any IRS Pilot branding. Every screen shows " + FIRM.name + "'s identity."
    )
  );
}


// ── PRO DASHBOARD ────────────────────────────────────────────────────────────

function ProDashboard() {
  var _m = useState("overview"); var menu = _m[0]; var setMenu = _m[1];

  var sessions = [
    { client:"Sarah M.", date:"Aug 24, 2026", tool:"Financial Intake Wizard", duration:"34 min", status:"Completed" },
    { client:"Robert K.", date:"Aug 22, 2026", tool:"Navigator \u2014 CP504", duration:"18 min", status:"Completed" },
    { client:"Diana L.", date:"Aug 21, 2026", tool:"Transcript Analyzer", duration:"41 min", status:"Completed" },
    { client:"James T.", date:"Aug 19, 2026", tool:"Navigator \u2014 LT11", duration:"22 min", status:"Completed" },
  ];

  var s = {
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:10, padding:"18px 20px", marginBottom:14 },
    h2: { fontSize:15, fontWeight:"bold", color:"#1a2d5a", marginBottom:10 },
    label: { fontSize:11, fontWeight:"bold", color:"#888", letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 },
    val: { fontSize:20, fontWeight:"bold", color:"#1a2d5a" },
    menuBtn: function(id) {
      return { background:menu===id?"#1a2d5a":"transparent", color:menu===id?"#7ec11f":"#888", border:"none", borderRadius:7, padding:"8px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer", fontWeight:menu===id?"bold":"normal" };
    }
  };

  return React.createElement("div", null,

    React.createElement("div", { style:{ background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 16px", marginBottom:14, fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 } },
      "\uD83C\uDFAC ",
      React.createElement("span", null, React.createElement("strong", null, "Pro Dashboard View:"), " This is what you see when you log in as a Pro Subscriber.")
    ),

    // Dashboard nav
    React.createElement("div", { style:{ background:"#fff", border:"1px solid #e8e4dc", borderRadius:10, padding:"8px", display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" } },
      [["overview","Overview"], ["branding","Branding"], ["sessions","Sessions"], ["link","Your Link"]].map(function(item) {
        return React.createElement("button", { key:item[0], onClick:function(){setMenu(item[0]);}, style: s.menuBtn(item[0]) }, item[1]);
      })
    ),

    // OVERVIEW
    menu === "overview" && React.createElement("div", null,
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 } },
        [["Sessions Used", "4 / 10", "This month"], ["Sessions Left", "6", "Renews Sep 1"], ["Active Since", "Jun 2026", "Intro rate active"]].map(function(item, i) {
          return React.createElement("div", { key:i, style: s.card },
            React.createElement("div", { style: s.label }, item[0]),
            React.createElement("div", { style: s.val }, item[1]),
            React.createElement("div", { style:{ fontSize:11, color:"#aaa", marginTop:2 } }, item[2])
          );
        })
      ),
      React.createElement("div", { style: s.card },
        React.createElement("div", { style: s.h2 }, "Subscription"),
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 } },
          React.createElement("div", null,
            React.createElement("div", { style:{ fontSize:14, color:"#555" } }, "Pro Subscription \u00b7 Introductory Rate"),
            React.createElement("div", { style:{ fontSize:13, color:"#888", marginTop:2 } }, "Next billing: Sep 1, 2026 \u00b7 $49.00")
          ),
          React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:20, padding:"4px 14px", fontSize:12, color:"#15803d", fontWeight:"bold" } }, "Active")
        )
      )
    ),

    // BRANDING
    menu === "branding" && React.createElement("div", null,
      React.createElement("div", { style: s.card },
        React.createElement("div", { style: s.h2 }, "Your White-Label Settings"),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
          [["Firm Name", FIRM.name], ["Credential", FIRM.credential], ["Phone", FIRM.phone], ["Calendly URL", FIRM.calendly]].map(function(item, i) {
            return React.createElement("div", { key:i },
              React.createElement("div", { style: s.label }, item[0]),
              React.createElement("div", { style:{ background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:7, padding:"8px 12px", fontSize:13, color:"#333" } }, item[1])
            );
          })
        ),
        React.createElement("div", { style:{ marginTop:14, fontSize:13, color:"#888", fontStyle:"italic" } }, "To update your branding, email info@irspilot.com with your subscriber code and the updated information.")
      ),
      React.createElement("div", { style:{ ...s.card, background:"#f0fdf4", border:"1px solid #7ec11f" } },
        React.createElement("div", { style: s.h2 }, "\u2705 What Clients See"),
        ["Your firm name on every screen", "Your phone number with tap-to-call", "Your Calendly link on every CTA button", "No IRS Pilot or Tyrone Taylor branding anywhere"].map(function(item, i) {
          return React.createElement("div", { key:i, style:{ display:"flex", gap:8, marginBottom:6 } },
            React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold" } }, "\u2713"),
            React.createElement("div", { style:{ fontSize:13, color:"#555" } }, item)
          );
        })
      )
    ),

    // SESSIONS
    menu === "sessions" && React.createElement("div", null,
      React.createElement("div", { style: s.card },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 } },
          React.createElement("div", { style: s.h2 }, "Recent Client Sessions"),
          React.createElement("div", { style:{ background:"#f0f7ff", border:"1px solid #1a2d5a", borderRadius:20, padding:"4px 14px", fontSize:12, color:"#1a2d5a", fontWeight:"bold" } }, "4 of 10 used this month")
        ),
        React.createElement("table", { style:{ width:"100%", borderCollapse:"collapse", fontSize:13 } },
          React.createElement("thead", null,
            React.createElement("tr", { style:{ background:"#f8f6f1" } },
              ["Client", "Date", "Tool Used", "Duration", "Status"].map(function(h) {
                return React.createElement("th", { key:h, style:{ padding:"8px 12px", textAlign:"left", color:"#888", fontWeight:"bold", fontSize:11, textTransform:"uppercase" } }, h);
              })
            )
          ),
          React.createElement("tbody", null,
            sessions.map(function(r, i) {
              return React.createElement("tr", { key:i, style:{ borderBottom:"1px solid #f0ede8" } },
                React.createElement("td", { style:{ padding:"10px 12px", color:"#1a2d5a", fontWeight:"bold" } }, r.client),
                React.createElement("td", { style:{ padding:"10px 12px", color:"#888" } }, r.date),
                React.createElement("td", { style:{ padding:"10px 12px", color:"#555" } }, r.tool),
                React.createElement("td", { style:{ padding:"10px 12px", color:"#888" } }, r.duration),
                React.createElement("td", { style:{ padding:"10px 12px" } }, React.createElement("span", { style:{ background:"#f0fdf4", color:"#15803d", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:"bold" } }, r.status))
              );
            })
          )
        )
      )
    ),

    // LINK
    menu === "link" && React.createElement("div", null,
      React.createElement("div", { style: s.card },
        React.createElement("div", { style: s.h2 }, "Your Branded Client Link"),
        React.createElement("div", { style:{ background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"14px 16px", fontSize:14, color:"#1a2d5a", fontFamily:"monospace", marginBottom:12 } },
          "irspilot.com/pro/" + FIRM.code
        ),
        React.createElement("p", { style:{ fontSize:13, color:"#888", lineHeight:1.7, marginBottom:12 } },
          "Share this link with any client who has an IRS issue. When they click it, they see your firm\u2019s name and branding \u2014 not IRS Pilot. Sessions are tracked automatically."
        ),
        React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"12px 16px", fontSize:13, color:"#15803d" } },
          React.createElement("strong", null, "Suggested email text:"),
          " \u201cFor your IRS situation, I\u2019ve set up a dedicated tool to help you understand your options. Click here to get started: irspilot.com/pro/" + FIRM.code + "\u201d"
        )
      ),
      React.createElement("div", { style: s.card },
        React.createElement("div", { style: s.h2 }, "Reseller Pricing (Optional)"),
        React.createElement("p", { style:{ fontSize:13, color:"#888", lineHeight:1.7, marginBottom:12 } },
          "You can charge clients your own price for access above IRS Pilot\u2019s minimums."
        ),
        React.createElement("table", { style:{ width:"100%", borderCollapse:"collapse", fontSize:13 } },
          React.createElement("thead", null,
            React.createElement("tr", { style:{ background:"#f8f6f1" } },
              ["Tool", "IRS Pilot Base", "Your Minimum", "You Set"].map(function(h) {
                return React.createElement("th", { key:h, style:{ padding:"8px 12px", textAlign:"left", fontSize:11, color:"#888", fontWeight:"bold" } }, h);
              })
            )
          ),
          React.createElement("tbody", null,
            [["Navigator", "$59", "$79", "Any amount \u2191$79"],
             ["Wizard", "$99", "$139", "Any amount \u2191$139"],
             ["Bundle", "$129", "$179", "Any amount \u2191$179"]].map(function(r, i) {
              return React.createElement("tr", { key:i, style:{ borderBottom:"1px solid #f0ede8" } },
                r.map(function(cell, j) {
                  return React.createElement("td", { key:j, style:{ padding:"10px 12px", color:j===0?"#1a2d5a":"#555", fontWeight:j===0?"bold":"normal" } }, cell);
                })
              );
            })
          )
        )
      )
    )
  );
}


function DemoNavBar() {
  return React.createElement("div", { style:{ background:"#1a2d5a", borderBottom:"3px solid #7ec11f", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" } },
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
      React.createElement("img", { src:"/static/logo.png", alt:"IRS Pilot", style:{ width:36, height:36, objectFit:"contain" } }),
      React.createElement("div", null,
        React.createElement("div", { style:{ color:"#fff", fontWeight:"bold", fontSize:15 } }, "IRS Pilot"),
        React.createElement("div", { style:{ color:"#7ec11f", fontSize:9, letterSpacing:1.5 } }, "PRO SUBSCRIPTION \u2014 DEMO")
      )
    ),
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8 } },
      React.createElement("span", { style:{ background:"#7ec11f", color:"#1a2d5a", fontSize:10, fontWeight:"bold", padding:"3px 10px", borderRadius:12 } }, "DEMO"),
      React.createElement("a", { href:"/", style:{ color:"#cce8a0", fontSize:12, textDecoration:"none", padding:"6px 12px", borderRadius:20, border:"1px solid rgba(255,255,255,0.15)" } }, "\u2190 Home"),
      React.createElement("a", { href:"/taxpro", style:{ background:"#7ec11f", color:"#1a2d5a", fontSize:13, fontWeight:"bold", padding:"7px 16px", borderRadius:20, textDecoration:"none" } }, "Subscribe \u2192")
    )
  );
}

window.ProSubscriptionDemo = ProSubscriptionDemo;
