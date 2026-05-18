
const { useState, useEffect } = React;

const SAMPLE_FINDINGS = {
  tax_year: "2020",
  form_number: "Form 1040",
  penalties: [
    {
      code: "166", label: "Failure-to-Pay Penalty", date: "2021-04-15", amount: 1847.50,
      type: "FTP", waivable: true, in_covid_window: true, notice_2022_36_eligible: true,
      analysis: "This failure-to-pay penalty was assessed on April 15, 2021 — squarely within the COVID emergency window (March 2020–December 2022). As a tax year 2020 FTP penalty, it qualifies for both IRC §6751(b) supervisory approval challenge and Notice 2022-36 automatic relief."
    },
    {
      code: "160", label: "Failure-to-File Penalty", date: "2021-06-01", amount: 1000.00,
      type: "FTF", waivable: true, in_covid_window: true, notice_2022_36_eligible: true,
      analysis: "Failure-to-file penalty for tax year 2020 assessed June 2021. Eligible under both grounds — supervisory approval procedures were widely compromised during COVID staffing reductions, and this penalty qualifies for Notice 2022-36 automatic relief."
    },
    {
      code: "170", label: "Estimated Tax Penalty", date: "2021-04-15", amount: 312.00,
      type: "EST", waivable: false, in_covid_window: true, notice_2022_36_eligible: false,
      analysis: "Estimated tax underpayment penalty (TC 170) is not covered by IRC §6751(b) or Notice 2022-36. These provisions apply only to failure-to-file and failure-to-pay penalties."
    }
  ],
  total_at_issue: 2847.50,
  notice_2022_36_summary: "IRS Notice 2022-36, published August 24, 2022, provided automatic penalty relief for failure-to-file and failure-to-pay penalties for tax years 2019 and 2020. Both the TC 166 and TC 160 penalties on this transcript qualify for this automatic relief. If these penalties were not automatically waived, the taxpayer is entitled to request abatement consistent with the IRS's stated policy.",
  section_6751b_summary: "IRC §6751(b)(1) requires that penalty assessments receive written supervisory approval before being communicated to the taxpayer. During COVID (March 2020–December 2022), the IRS operated under emergency staffing protocols resulting in widespread failures to comply with this requirement. Courts in Kwong v. Commissioner and Abdo v. Commissioner held that penalties assessed without proper supervisory approval are procedurally invalid. Both penalties on this transcript were assessed during this window and are challengeable on these grounds."
};

const SAMPLE_LETTER = `May 18, 2026

John A. Smith
4521 Maple Grove Drive
Nashville, TN 37201
SSN: XXX-XX-4892

Internal Revenue Service
Penalty Abatement Coordinator
P.O. Box 149338
Austin, TX 78714-9338

RE:   Request for Penalty Abatement \u2014 Tax Year 2020
      IRC \u00a76751(b) / IRS Notice 2022-36
      Total Amount at Issue: $2,847.50

Dear Penalty Abatement Coordinator,

I am writing to formally request abatement of penalties assessed against my account for tax year 2020, totaling $2,847.50, on two independent grounds: (1) the penalties were assessed without the written supervisory approval required by IRC \u00a76751(b), and (2) they qualify for automatic relief under IRS Notice 2022-36.

The penalties at issue are as follows:

  TC 166 (Failure-to-Pay Penalty), assessed April 15, 2021 \u2014 $1,847.50
  TC 160 (Failure-to-File Penalty), assessed June 1, 2021 \u2014 $1,000.00

GROUND ONE: IRC \u00a76751(b) SUPERVISORY APPROVAL

IRC \u00a76751(b)(1) requires that the initial determination of a penalty assessment be personally approved in writing by the immediate supervisor of the individual making the determination before the penalty is communicated to the taxpayer. This requirement is mandatory and non-discretionary.

Both of the above penalties were assessed during the period when the IRS was operating under COVID-19 emergency protocols \u2014 a period well-documented to have resulted in widespread failures to obtain the supervisory approval required by \u00a76751(b). The United States Tax Court, in Kwong v. Commissioner and Abdo v. Commissioner, held that penalties assessed without proper supervisory approval under \u00a76751(b) are procedurally invalid and must be abated.

I respectfully assert that the penalties assessed against my account during this period were similarly defective, and I request that they be abated on this basis.

GROUND TWO: IRS NOTICE 2022-36

IRS Notice 2022-36, published August 24, 2022, provided automatic relief from failure-to-file and failure-to-pay penalties for tax years 2019 and 2020 for taxpayers who filed or would file their returns by September 30, 2022. The TC 166 and TC 160 penalties assessed against my account for tax year 2020 are precisely the type covered by this Notice.

To the extent these penalties were not automatically waived at the time Notice 2022-36 was implemented, I request that they be abated consistent with the IRS's stated relief policy.

I respectfully request written confirmation of the abatement of the penalties listed above, totaling $2,847.50. If this request is denied in whole or in part, I intend to exercise my right to appeal the denial to the IRS Independent Office of Appeals within 30 days of receiving the denial letter.

Thank you for your consideration of this request.

Sincerely,


John A. Smith
Taxpayer ID: XXX-XX-4892
Tax Year: 2020`;

const STEPS = [
  { icon: "\uD83D\uDCE5", title: "Download Your Transcript", subtitle: "From IRS.gov \u2014 takes about 2 minutes", desc: "Log in to IRS.gov \u2192 Get Your Tax Record \u2192 Get Transcript Online. Select Account Transcript for the tax year with penalties. Download as PDF.", detail: "Your transcript is a complete record of every IRS transaction on your account \u2014 every penalty, payment, and notice. It\u2019s the source of truth for this analysis.", color: "#1a2d5a", bg: "#f0f7ff", border: "#bcd4f0" },
  { icon: "\uD83D\uDCCA", title: "Upload & Analyze", subtitle: "AI reads every transaction code", desc: "Upload your transcript PDF. The tool extracts every TC code, assessment date, and dollar amount \u2014 then cross-references against COVID window dates and Notice 2022-36 criteria.", detail: "The analysis looks for penalty TCs 160, 165, 166, 167, 180, 270, 276, 320, and 340 \u2014 the failure-to-file and failure-to-pay codes covered by these relief provisions.", color: "#15803d", bg: "#f0fdf4", border: "#7ec11f" },
  { icon: "\uD83D\uDD0D", title: "Review Your Findings", subtitle: "Per-penalty breakdown with legal analysis", desc: "See exactly which penalties are challengeable, under which grounds, and why \u2014 with the total dollar amount at issue calculated automatically.", detail: "Each penalty gets a plain-English explanation so you understand the legal basis before you mail the letter.", color: "#92400e", bg: "#fef3c7", border: "#f59e0b" },
  { icon: "\u270F\uFE0F", title: "Generate & Mail Your Letter", subtitle: "Ready to print and mail in minutes", desc: "Enter your name, address, and SSN last 4. The tool generates a complete formal letter citing the specific penalties, amounts, and legal grounds.", detail: "Mail via USPS Certified Mail with Return Receipt to the IRS Penalty Abatement Coordinator in Austin, TX. The IRS typically responds within 30\u201360 days.", color: "#5b21b6", bg: "#ede9fe", border: "#8b5cf6" }
];

function NavBar() {
  return React.createElement("div", { style: { background:"#1a2d5a", borderBottom:"3px solid #7ec11f", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" } },
    React.createElement("div", { style: { display:"flex", alignItems:"center", gap:10 } },
      React.createElement("img", { src:"/static/logo.png", alt:"IRS Pilot", style:{ width:36, height:36, objectFit:"contain" } }),
      React.createElement("div", null,
        React.createElement("div", { style:{ color:"#fff", fontWeight:"bold", fontSize:15 } }, "IRS Pilot"),
        React.createElement("div", { style:{ color:"#7ec11f", fontSize:9, letterSpacing:1.5 } }, "COVID PENALTY RELIEF \u2014 DEMO")
      )
    ),
    React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12 } },
      React.createElement("span", { style:{ background:"#7ec11f", color:"#1a2d5a", fontSize:10, fontWeight:"bold", padding:"3px 10px", borderRadius:12 } }, "DEMO"),
      React.createElement("a", { href:"/pricing", style:{ background:"rgba(126,193,31,0.15)", color:"#7ec11f", fontSize:13, fontWeight:"bold", padding:"7px 16px", borderRadius:20, textDecoration:"none", border:"1px solid rgba(126,193,31,0.4)" } }, "Get Access \u2192")
    )
  );
}

function DemoCovidPenaltyTool() {
  var _s = useState("intro"); var screen = _s[0]; var setScreen = _s[1];
  var _a = useState(0); var activeStep = _a[0]; var setActiveStep = _a[1];

  useEffect(function() {
    if (screen !== "howto") return;
    var interval = setInterval(function() {
      setActiveStep(function(s) { return (s + 1) % STEPS.length; });
    }, 3500);
    return function() { clearInterval(interval); };
  }, [screen]);

  var fmt = function(n) { return "$" + (n||0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}); };

  var s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1" },
    wrap: { maxWidth:760, margin:"0 auto", padding:"28px 16px 60px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"24px 28px", marginBottom:20 },
    h1: { fontSize:24, fontWeight:"bold", color:"#1a2d5a", marginBottom:8 },
    h2: { fontSize:16, fontWeight:"bold", color:"#1a2d5a", marginBottom:12 },
    body: { fontSize:15, color:"#555", lineHeight:1.75 },
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, cursor:"pointer" },
    btnGreen: { background:"#7ec11f", color:"#1a2d5a", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, cursor:"pointer" },
    btnSm: { background:"transparent", color:"#1a2d5a", border:"1px solid #e8e4dc", borderRadius:7, padding:"8px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" },
    disc: { background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"14px 18px", fontSize:12, color:"#888", lineHeight:1.7, marginBottom:16 },
  };

  function badge(color, bg, text) {
    return React.createElement("span", { style:{ display:"inline-block", background:bg, color:color, fontSize:11, fontWeight:"bold", padding:"3px 10px", borderRadius:12 } }, text);
  }

  function screenNav(backScreen, backLabel) {
    return React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 } },
      React.createElement("button", { onClick:function(){setScreen(backScreen);}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", fontSize:14 } }, "\u2190 " + backLabel),
      React.createElement("div", { style:{ display:"flex", gap:6 } },
        [["intro","Intro"],["howto","How It Works"],["findings","Findings"],["letter","Letter"]].map(function(item) {
          return React.createElement("button", { key:item[0], onClick:function(){setScreen(item[0]);}, style:{ padding:"4px 10px", borderRadius:16, border:"1.5px solid "+(screen===item[0]?"#1a2d5a":"#e8e4dc"), background:screen===item[0]?"#1a2d5a":"transparent", color:screen===item[0]?"#7ec11f":"#888", fontSize:10, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" } }, item[1]);
        })
      )
    );
  }

  var demoBanner = React.createElement("div", { style:{ background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 } },
    "\uD83C\uDFAC ",
    React.createElement("span", null, React.createElement("strong", null, "Demo Mode:"), " Sample data shown. In the full tool, you upload your own IRS Account Transcript.")
  );

  var ctaBlock = React.createElement("div", { style:{ background:"#1a2d5a", borderRadius:12, padding:"24px 28px", textAlign:"center" } },
    React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", fontSize:16, marginBottom:8 } }, "Ready to analyze your own transcript?"),
    React.createElement("p", { style:{ color:"#cce8a0", fontSize:14, lineHeight:1.7, marginBottom:20 } }, "Get full access for $99 \u2014 upload your transcript, receive personalized findings, and generate your abatement letter."),
    React.createElement("div", { style:{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" } },
      React.createElement("a", { href:"/pricing", style:{ ...s.btnGreen, textDecoration:"none", display:"inline-block" } }, "Get Access \u2014 $99 \u2192"),
      React.createElement("a", { href:"/covid-penalty-relief", style:{ background:"transparent", color:"#7ec11f", border:"2px solid rgba(126,193,31,0.5)", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, textDecoration:"none", display:"inline-block" } }, "I Already Have Access \u2192")
    )
  );

  // INTRO
  if (screen === "intro") return React.createElement("div", { style: s.page },
    React.createElement(NavBar, null),
    React.createElement("div", { style: s.wrap },
      React.createElement("div", { style:{ ...s.card, borderTop:"4px solid #1a2d5a" } },
        React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12, marginBottom:16 } },
          React.createElement("div", { style:{ width:48, height:48, background:"#1a2d5a", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 } }, "\uD83D\uDEE1\uFE0F"),
          React.createElement("div", null,
            React.createElement("h1", { style: s.h1 }, "COVID Penalty Relief Tool"),
            React.createElement("div", { style:{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" } },
              badge("#1a2d5a","#f0f7e8","IRC \u00a76751(b)"),
              badge("#15803d","#f0fdf4","IRS Notice 2022-36"),
              badge("#5b21b6","#ede9fe","Interactive Demo")
            )
          )
        ),
        React.createElement("p", { style: s.body }, "During COVID (2020\u20132022), the IRS assessed millions of failure-to-file and failure-to-pay penalties without the supervisory approval legally required under IRC \u00a76751(b). Many of these assessments are procedurally invalid. Additionally, IRS Notice 2022-36 provided automatic relief for 2019 and 2020 returns that many taxpayers never received."),
        React.createElement("p", { style:{ ...s.body, marginTop:12, fontWeight:"bold", color:"#1a2d5a" } }, "This tool analyzes your IRS Account Transcript, identifies challengeable penalties, and generates a ready-to-mail abatement letter.")
      ),
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Two Legal Grounds for Relief"),
        React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } },
          React.createElement("div", { style:{ background:"#f0f7ff", border:"1px solid #bcd4f0", borderRadius:8, padding:"16px 18px" } },
            React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 1: \u00a76751(b)"),
            React.createElement("p", { style:{ fontSize:13, color:"#555", lineHeight:1.7 } }, "IRS failed to get required written supervisory approval before assessing your penalty. Courts in Kwong and Abdo held such assessments procedurally invalid.")
          ),
          React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"16px 18px" } },
            React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 2: Notice 2022-36"),
            React.createElement("p", { style:{ fontSize:13, color:"#555", lineHeight:1.7 } }, "IRS automatically waived FTF/FTP penalties for 2019 and 2020 returns. If you didn\u2019t receive this relief, you\u2019re entitled to request it.")
          )
        )
      ),
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 } },
        React.createElement("button", { onClick:function(){setScreen("howto");}, style:{ ...s.btn, padding:"14px", fontSize:14 } }, "\uD83C\uDF9E\uFE0F How It Works \u2192"),
        React.createElement("button", { onClick:function(){setScreen("findings");}, style:{ ...s.btnGreen, padding:"14px", fontSize:14 } }, "\uD83D\uDD0D See Sample Analysis \u2192")
      ),
      React.createElement("div", { style: s.disc },
        React.createElement("strong", null, "Disclosures:"), " Demo uses sample data. Results are not guaranteed. \u00a76751(b) is well-established but circuit treatment varies. IRS may deny the request. IRS Pilot LLC is not a law firm."
      )
    )
  );

  // HOW IT WORKS
  if (screen === "howto") return React.createElement("div", { style: s.page },
    React.createElement(NavBar, null),
    React.createElement("div", { style: s.wrap },
      screenNav("intro", "Back to Overview"),
      React.createElement("div", { style:{ textAlign:"center", marginBottom:24 } },
        React.createElement("h1", { style:{ ...s.h1, marginBottom:4 } }, "How It Works"),
        React.createElement("p", { style:{ color:"#888", fontSize:14 } }, "From transcript to mailed letter in 4 steps")
      ),
      React.createElement("div", { style:{ ...s.card, border:"2px solid "+STEPS[activeStep].border, background:STEPS[activeStep].bg, transition:"border-color 0.4s" } },
        React.createElement("div", { style:{ display:"flex", alignItems:"flex-start", gap:20 } },
          React.createElement("div", { style:{ width:64, height:64, background:STEPS[activeStep].color, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0 } }, STEPS[activeStep].icon),
          React.createElement("div", { style:{ flex:1 } },
            React.createElement("div", { style:{ fontSize:11, fontWeight:"bold", color:STEPS[activeStep].color, letterSpacing:1, marginBottom:4 } }, "STEP "+(activeStep+1)+" OF 4"),
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:19, color:"#1a2d5a", marginBottom:4 } }, STEPS[activeStep].title),
            React.createElement("div", { style:{ fontSize:13, color:STEPS[activeStep].color, fontWeight:"bold", marginBottom:10 } }, STEPS[activeStep].subtitle),
            React.createElement("p", { style:{ fontSize:15, color:"#444", lineHeight:1.75, marginBottom:10 } }, STEPS[activeStep].desc),
            React.createElement("p", { style:{ fontSize:13, color:"#666", lineHeight:1.65, background:"rgba(255,255,255,0.6)", borderRadius:6, padding:"10px 14px" } }, STEPS[activeStep].detail)
          )
        )
      ),
      React.createElement("div", { style:{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 } },
        STEPS.map(function(step, i) {
          return React.createElement("button", { key:i, onClick:function(){setActiveStep(i);}, style:{ width:activeStep===i?32:10, height:10, borderRadius:10, border:"none", background:activeStep===i?"#1a2d5a":"#e8e4dc", cursor:"pointer", transition:"all 0.3s", padding:0 } });
        })
      ),
      React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 } },
        STEPS.map(function(step, i) {
          return React.createElement("div", { key:i, onClick:function(){setActiveStep(i);}, style:{ background:"#fff", border:"1.5px solid "+(activeStep===i?step.color:"#e8e4dc"), borderRadius:10, padding:"14px 16px", cursor:"pointer" } },
            React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
              React.createElement("div", { style:{ width:32, height:32, background:activeStep===i?step.color:"#f8f6f1", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 } }, step.icon),
              React.createElement("div", null,
                React.createElement("div", { style:{ fontSize:10, color:"#aaa", fontWeight:"bold" } }, "STEP "+(i+1)),
                React.createElement("div", { style:{ fontSize:13, fontWeight:"bold", color:activeStep===i?step.color:"#333" } }, step.title)
              )
            )
          );
        })
      ),
      React.createElement("div", { style:{ display:"flex", gap:12, justifyContent:"center" } },
        React.createElement("button", { onClick:function(){setScreen("findings");}, style: s.btn }, "See Sample Findings \u2192"),
        React.createElement("button", { onClick:function(){setScreen("letter");}, style: s.btnSm }, "See Sample Letter")
      )
    )
  );

  // FINDINGS
  if (screen === "findings") return React.createElement("div", { style: s.page },
    React.createElement(NavBar, null),
    React.createElement("div", { style: s.wrap },
      screenNav("howto", "How It Works"),
      demoBanner,
      React.createElement("div", { style:{ ...s.card, borderTop:"4px solid #7ec11f" } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:16 } },
          React.createElement("div", null,
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:18, color:"#1a2d5a" } }, "Tax Year 2020 \u2014 Sample Analysis"),
            React.createElement("div", { style:{ fontSize:13, color:"#888", marginTop:2 } }, "Form 1040 \u00b7 Account Transcript \u00b7 Demo Data")
          ),
          React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:10, padding:"12px 20px", textAlign:"center" } },
            React.createElement("div", { style:{ fontSize:11, fontWeight:"bold", color:"#888", letterSpacing:1, marginBottom:4 } }, "POTENTIALLY WAIVABLE"),
            React.createElement("div", { style:{ fontSize:24, fontWeight:"bold", color:"#15803d" } }, fmt(SAMPLE_FINDINGS.total_at_issue))
          )
        ),
        React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"12px 16px", fontSize:14, color:"#15803d" } },
          "\u2705 Penalties identified on this transcript are challengeable under IRC \u00a76751(b) and IRS Notice 2022-36."
        )
      ),
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Penalties Identified"),
        SAMPLE_FINDINGS.penalties.map(function(p, i) {
          return React.createElement("div", { key:i, style:{ borderBottom:i<SAMPLE_FINDINGS.penalties.length-1?"1px solid #f0ede8":"none", paddingBottom:16, marginBottom:16 } },
            React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 } },
              React.createElement("div", null,
                React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:4 } }, "TC "+p.code+" \u2014 "+p.label),
                React.createElement("div", { style:{ fontSize:13, color:"#888", marginBottom:6 } }, "Assessment Date: "+p.date),
                React.createElement("div", { style:{ display:"flex", gap:6, flexWrap:"wrap" } },
                  p.in_covid_window && badge("#1a2d5a","#f0f7ff","\u00a76751(b) Window"),
                  p.notice_2022_36_eligible && badge("#15803d","#f0fdf4","Notice 2022-36"),
                  p.waivable ? badge("#92400e","#fef3c7","Potentially Waivable") : badge("#888","#f8f6f1","Not Waivable")
                )
              ),
              React.createElement("div", { style:{ textAlign:"right" } },
                React.createElement("div", { style:{ fontSize:18, fontWeight:"bold", color:p.waivable?"#dc2626":"#888" } }, fmt(p.amount)),
                React.createElement("div", { style:{ fontSize:11, color:"#aaa" } }, "Penalty amount")
              )
            ),
            React.createElement("div", { style:{ background:"#f8f6f1", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#555", lineHeight:1.65, marginTop:10 } }, p.analysis)
          );
        })
      ),
      React.createElement("div", { style:{ ...s.card, border:"1.5px solid #7ec11f" } },
        React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\uD83D\uDCCB Notice 2022-36 Analysis"),
        React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, SAMPLE_FINDINGS.notice_2022_36_summary)
      ),
      React.createElement("div", { style:{ ...s.card, border:"1.5px solid #1a2d5a" } },
        React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\u2696\uFE0F IRC \u00a76751(b) Analysis"),
        React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, SAMPLE_FINDINGS.section_6751b_summary)
      ),
      React.createElement("div", { style:{ display:"flex", gap:12, marginBottom:20 } },
        React.createElement("button", { onClick:function(){setScreen("letter");}, style: s.btn }, "\u270F\uFE0F See Sample Letter \u2192"),
        React.createElement("button", { onClick:function(){setScreen("howto");}, style: s.btnSm }, "\u2190 How It Works")
      ),
      ctaBlock
    )
  );

  // LETTER
  if (screen === "letter") return React.createElement("div", { style: s.page },
    React.createElement(NavBar, null),
    React.createElement("div", { style: s.wrap },
      screenNav("findings", "Sample Findings"),
      demoBanner,
      React.createElement("div", { style:{ ...s.card, border:"2px solid #7ec11f" } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 } },
          React.createElement("div", null,
            React.createElement("div", { style:{ fontWeight:"bold", fontSize:18, color:"#1a2d5a" } }, "\uD83D\uDCE8 Sample Abatement Letter"),
            React.createElement("div", { style:{ fontSize:13, color:"#888", marginTop:2 } }, "IRS Penalty Abatement Coordinator \u00b7 P.O. Box 149338 \u00b7 Austin, TX 78714")
          ),
          React.createElement("button", { style: s.btnSm, onClick:function(){window.print();} }, "\uD83D\uDDA8\uFE0F Print")
        ),
        React.createElement("div", { style:{ background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"28px 32px", fontFamily:"Georgia, serif", fontSize:14, lineHeight:2.0, whiteSpace:"pre-wrap", color:"#1a2d5a" } }, SAMPLE_LETTER)
      ),
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "\uD83D\uDCCB Mailing Instructions"),
        [["Print and sign","Print on plain paper. Sign by hand in blue or black ink."],["Make a copy","Keep a complete copy of the signed letter for your records."],["Send certified mail","Mail via USPS Certified Mail with Return Receipt. Keep the tracking number."],["Wait for response","IRS typically responds in 30\u201360 days. If denied, appeal to IRS Independent Office of Appeals within 30 days."]].map(function(item, i) {
          return React.createElement("div", { key:i, style:{ display:"flex", gap:14, marginBottom:i<3?14:0, alignItems:"flex-start" } },
            React.createElement("div", { style:{ width:28, height:28, background:"#1a2d5a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#7ec11f", fontWeight:"bold", fontSize:13, flexShrink:0 } }, i+1),
            React.createElement("div", null,
              React.createElement("div", { style:{ fontWeight:"bold", fontSize:14, color:"#1a2d5a", marginBottom:2 } }, item[0]),
              React.createElement("div", { style:{ fontSize:13, color:"#666", lineHeight:1.65 } }, item[1])
            )
          );
        })
      ),
      React.createElement("div", { style: s.disc },
        "IMPORTANT: Submitting this letter is a request, not a guarantee. The IRS may deny it. You may appeal within 30 days. The \u00a76751(b) argument is unsettled in some circuits. IRS Pilot LLC is not a law firm and this does not constitute legal representation."
      ),
      ctaBlock
    )
  );

  return null;
}

window.CovidPenaltyDemo = DemoCovidPenaltyTool;
