
function AboutPage() {
  var s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1", color:"#1a2d5a" },
    wrap: { maxWidth:820, margin:"0 auto", padding:"48px 24px 80px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:14, padding:"32px 36px", marginBottom:24 },
    h1: { fontSize:30, fontWeight:"bold", color:"#1a2d5a", marginBottom:6 },
    h2: { fontSize:18, fontWeight:"bold", color:"#1a2d5a", marginBottom:12 },
    body: { fontSize:15, color:"#555", lineHeight:1.8 },
    badge: { display:"inline-block", background:"#f0fdf4", color:"#15803d", border:"1px solid #7ec11f", fontSize:12, fontWeight:"bold", padding:"4px 12px", borderRadius:20, marginRight:8, marginBottom:8 },
    cred: { display:"flex", alignItems:"center", gap:10, padding:"12px 0", borderBottom:"1px solid #f0ede8" },
  };

  return React.createElement("div", { style: s.page },
    React.createElement("div", { style: s.wrap },

      // Hero
      React.createElement("div", { style: { ...s.card, display:"flex", gap:32, alignItems:"flex-start", flexWrap:"wrap" } },
        React.createElement("img", {
          src: "/static/tj_headshot.jpg",
          alt: "Tyrone J. Taylor, EA",
          style: { width:160, height:160, borderRadius:12, objectFit:"cover", border:"3px solid #7ec11f", flexShrink:0 }
        }),
        React.createElement("div", { style:{ flex:1, minWidth:240 } },
          React.createElement("div", { style:{ fontSize:11, fontWeight:"bold", color:"#7ec11f", letterSpacing:1.5, marginBottom:8 } }, "FOUNDER & ENROLLED AGENT"),
          React.createElement("h1", { style: s.h1 }, "Tyrone J. Taylor, EA"),
          React.createElement("div", { style:{ fontSize:15, color:"#888", marginBottom:16 } }, "MBA · MSA · NTPI Fellow · Taylor Tax and Financial Consulting, Inc."),
          React.createElement("div", { style:{ display:"flex", flexWrap:"wrap", marginBottom:20 } },
            ["Enrolled Agent (EA)", "NTPI Fellow", "MBA", "MSA", "20+ Years Experience"].map(function(b) {
              return React.createElement("span", { key:b, style: s.badge }, b);
            })
          ),
          React.createElement("div", { style:{ display:"flex", gap:10, flexWrap:"wrap" } },
            React.createElement("a", {
              href:"https://www.linkedin.com/company/28627662",
              target:"_blank",
              rel:"noopener noreferrer",
              style:{ background:"#0077b5", color:"#fff", borderRadius:8, padding:"9px 18px", textDecoration:"none", fontWeight:"bold", fontSize:13 }
            }, "\uD83D\uDCBC LinkedIn"),
            React.createElement("a", {
              href:"https://www.amazon.com/dp/B0GXLMQVWT",
              target:"_blank",
              rel:"noopener noreferrer",
              style:{ background:"#ff9900", color:"#1a2d5a", borderRadius:8, padding:"9px 18px", textDecoration:"none", fontWeight:"bold", fontSize:13 }
            }, "\uD83D\uDCDA Stop IRS Collections on Amazon"),
            React.createElement("a", {
              href:"/",
              style:{ background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"9px 18px", textDecoration:"none", fontWeight:"bold", fontSize:13 }
            }, "Try IRS Pilot \u2192")
          )
        )
      ),

      // Why I built this
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Why I Built IRS Pilot"),
        React.createElement("p", { style: s.body },
          "After more than 20 years representing taxpayers before the IRS, I kept seeing the same problem play out. Someone would come to me with a tax balance that was genuinely solvable \u2014 an installment agreement, a Currently Not Collectible status, sometimes an Offer in Compromise \u2014 but the numbers didn\u2019t work. Their balance was too low to justify the cost of professional representation, and the hourly fees or retainers were simply out of reach."
        ),
        React.createElement("p", { style:{ ...s.body, marginTop:14 } },
          "At the same time, the free resources available to these taxpayers were either too generic to be useful or buried in IRS language that most people simply can\u2019t understand without help. These weren\u2019t people who needed to be represented \u2014 they needed to be informed. They needed someone to explain what their notice actually meant, what their real options were, and what steps to take first."
        ),
        React.createElement("p", { style:{ ...s.body, marginTop:14 } },
          "IRS Pilot is my answer to that gap. It\u2019s built on the same framework I use with clients \u2014 the same questions I ask, the same analysis I run, the same options I walk through \u2014 packaged into a self-serve tool that anyone can use, at a price that makes sense for the situation. Not a substitute for representation when you genuinely need it. A real resource for the people who don\u2019t."
        )
      ),

      // Credentials
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Credentials & Background"),
        [
          ["\uD83C\uDF93", "Enrolled Agent (EA)", "Licensed since December 2012. Enrolled Agents are federally licensed by the U.S. Department of the Treasury and are the only tax professionals with unlimited rights to represent taxpayers before the IRS — for any tax matter, any type of taxpayer, in any IRS office."],
          ["\uD83C\uDFC5", "NTPI Fellow", "Earned through the National Tax Practice Institute — an advanced credential for tax professionals who specialize in IRS representation, collection, audit, and appeals work."],
          ["\uD83D\uDCCA", "MBA & MSA", "Graduate business and accounting credentials providing the financial foundation for complex tax analysis, financial statement review, and business tax strategy."],
          ["\uD83C\uDFE2", "Taylor Tax and Financial Consulting, Inc.", "The firm behind IRS Pilot. Based in Tennessee, serving individual and business taxpayers across the country with IRS representation, tax resolution, and financial consulting."],
        ].map(function(item, i) {
          return React.createElement("div", { key:i, style:{ ...s.cred, borderBottom: i < 3 ? "1px solid #f0ede8" : "none", paddingBottom: i < 3 ? 14 : 0, marginBottom: i < 3 ? 2 : 0 } },
            React.createElement("div", { style:{ fontSize:28, flexShrink:0, width:40 } }, item[0]),
            React.createElement("div", null,
              React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:3 } }, item[1]),
              React.createElement("div", { style:{ fontSize:13, color:"#666", lineHeight:1.65 } }, item[2])
            )
          );
        })
      ),

      // Book
      React.createElement("div", { style:{ ...s.card, display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap" } },
        React.createElement("div", { style:{ width:90, flexShrink:0, background:"#1a2d5a", borderRadius:8, padding:"12px 10px", textAlign:"center" } },
          React.createElement("div", { style:{ fontSize:36, marginBottom:8 } }, "\uD83D\uDCDA"),
          React.createElement("div", { style:{ color:"#7ec11f", fontSize:10, fontWeight:"bold", letterSpacing:0.5 } }, "AVAILABLE ON"),
          React.createElement("div", { style:{ color:"#fff", fontSize:11, fontWeight:"bold", marginTop:2 } }, "Amazon")
        ),
        React.createElement("div", { style:{ flex:1, minWidth:220 } },
          React.createElement("div", { style:{ fontSize:11, fontWeight:"bold", color:"#7ec11f", letterSpacing:1.5, marginBottom:6 } }, "PUBLISHED BOOK"),
          React.createElement("div", { style:{ fontWeight:"bold", fontSize:20, color:"#1a2d5a", marginBottom:8 } }, "Stop IRS Collections"),
          React.createElement("p", { style:{ ...s.body, marginBottom:16 } },
            "A plain-English guide to IRS collection — written for taxpayers who need to understand their rights, their options, and how to navigate the IRS system without an attorney. Covers installment agreements, Offers in Compromise, Currently Not Collectible status, levies, liens, and more."
          ),
          React.createElement("a", {
            href:"https://www.amazon.com/dp/B0GXLMQVWT",
            target:"_blank",
            rel:"noopener noreferrer",
            style:{ background:"#ff9900", color:"#1a2d5a", borderRadius:8, padding:"10px 20px", textDecoration:"none", fontWeight:"bold", fontSize:14, display:"inline-block" }
          }, "Get the Book on Amazon \u2192")
        )
      ),

      // Disclaimer / scope
      React.createElement("div", { style:{ background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:10, padding:"16px 20px", fontSize:13, color:"#888", lineHeight:1.7 } },
        React.createElement("strong", null, "Important:"),
        " IRS Pilot is a self-help tool designed for taxpayers whose situations are manageable without full representation. When a situation genuinely requires an EA or attorney — complex audits, Tax Court, criminal investigations, or high-stakes collection matters — Tyrone recommends retaining qualified representation. Taylor Tax and Financial Consulting, Inc. offers full representation services for those cases."
      )
    )
  );
}

window.AboutPage = AboutPage;
