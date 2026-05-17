
const { useState } = React;

const SAMPLE_FINDINGS = {
  tax_year: "2020",
  form_number: "Form 1040",
  taxpayer_name: "Sample Taxpayer",
  penalties: [
    {
      code: "166",
      label: "Failure-to-Pay Penalty",
      date: "2021-04-15",
      amount: 1847.50,
      type: "FTP",
      waivable: true,
      in_covid_window: true,
      notice_2022_36_eligible: true,
      analysis: "This failure-to-pay penalty was assessed on April 15, 2021 — squarely within the COVID emergency window (March 2020–December 2022). As a tax year 2020 FTP penalty, it qualifies for both IRC §6751(b) supervisory approval challenge and Notice 2022-36 automatic relief."
    },
    {
      code: "160",
      label: "Failure-to-File Penalty",
      date: "2021-06-01",
      amount: 1000.00,
      type: "FTF",
      waivable: true,
      in_covid_window: true,
      notice_2022_36_eligible: true,
      analysis: "Failure-to-file penalty for tax year 2020 assessed June 2021. Eligible under both grounds — supervisory approval procedures were widely compromised during COVID staffing reductions, and this penalty qualifies for Notice 2022-36 automatic relief."
    },
    {
      code: "170",
      label: "Estimated Tax Penalty",
      date: "2021-04-15",
      amount: 312.00,
      type: "EST",
      waivable: false,
      in_covid_window: true,
      notice_2022_36_eligible: false,
      analysis: "Estimated tax underpayment penalty (TC 170) is not covered by IRC §6751(b) or Notice 2022-36. These provisions apply only to failure-to-file and failure-to-pay penalties."
    }
  ],
  total_at_issue: 2847.50,
  notice_2022_36_summary: "IRS Notice 2022-36, published August 24, 2022, provided automatic penalty relief for failure-to-file and failure-to-pay penalties for tax years 2019 and 2020. For this tax year 2020 transcript, both the TC 166 and TC 160 penalties qualify for this automatic relief. If these penalties were not automatically waived at the time, the taxpayer is entitled to request abatement consistent with the IRS's stated policy.",
  section_6751b_summary: "IRC §6751(b)(1) requires that penalty assessments receive written supervisory approval before being communicated to the taxpayer. During the COVID-19 pandemic (March 2020–December 2022), the IRS operated under emergency staffing protocols that resulted in widespread failures to comply with this procedural requirement. Courts in Kwong v. Commissioner and Abdo v. Commissioner held that penalties assessed without proper supervisory approval are procedurally invalid. Both penalties on this transcript were assessed during this window and are challengeable on these grounds.",
  tax_year_is_covid: true
};

function DemoCovidPenaltyTool() {
  const [screen, setScreen] = useState("intro");

  const s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1" },
    nav: { background:"#1a2d5a", borderBottom:"3px solid #7ec11f", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
    navLogo: { display:"flex", alignItems:"center", gap:10, textDecoration:"none" },
    demoBadge: { background:"#7ec11f", color:"#1a2d5a", fontSize:10, fontWeight:"bold", padding:"3px 10px", borderRadius:12, letterSpacing:0.5 },
    wrap: { maxWidth:760, margin:"0 auto", padding:"28px 16px 60px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"24px 28px", marginBottom:20 },
    h1: { fontSize:24, fontWeight:"bold", color:"#1a2d5a", marginBottom:8 },
    h2: { fontSize:16, fontWeight:"bold", color:"#1a2d5a", marginBottom:12 },
    body: { fontSize:15, color:"#555", lineHeight:1.75 },
    badge: (color, bg) => ({ display:"inline-block", background:bg, color:color, fontSize:11, fontWeight:"bold", padding:"3px 10px", borderRadius:12, letterSpacing:0.3 }),
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, cursor:"pointer" },
    btnGreen: { background:"#7ec11f", color:"#1a2d5a", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, cursor:"pointer" },
    warn: { background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"14px 18px", fontSize:14, color:"#92400e", lineHeight:1.7, marginBottom:16 },
    disc: { background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"14px 18px", fontSize:12, color:"#888", lineHeight:1.7 },
    infoBox: (color, bg, border) => ({ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:"14px 18px", marginBottom:16, fontSize:14, color:color, lineHeight:1.7 }),
  };

  const fmt = (n) => "$" + (n||0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});

  return React.createElement("div", { style: s.page },

    // Nav
    React.createElement("div", { style: s.nav },
      React.createElement("div", { style: s.navLogo },
        React.createElement("img", { src:"/static/logo.png", alt:"IRS Pilot", style:{ width:36, height:36, objectFit:"contain" } }),
        React.createElement("div", null,
          React.createElement("div", { style:{ color:"#fff", fontWeight:"bold", fontSize:15 } }, "IRS Pilot"),
          React.createElement("div", { style:{ color:"#7ec11f", fontSize:9, letterSpacing:1.5 } }, "COVID PENALTY RELIEF — DEMO")
        )
      ),
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12 } },
        React.createElement("span", { style: s.demoBadge }, "DEMO MODE"),
        React.createElement("a", {
          href:"/pricing",
          style:{ background:"#7ec11f", color:"#1a2d5a", fontSize:13, fontWeight:"bold", padding:"7px 16px", borderRadius:20, textDecoration:"none", fontFamily:"'DM Sans',sans-serif" }
        }, "Get Full Access \u2192")
      )
    ),

    React.createElement("div", { style: s.wrap },

      // Demo notice banner
      React.createElement("div", { style:{ background:"linear-gradient(135deg,#1a2d5a,#243d7a)", borderRadius:10, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", gap:14 } },
        React.createElement("div", { style:{ fontSize:24, flexShrink:0 } }, "\uD83C\uDFAC"),
        React.createElement("div", null,
          React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", fontSize:14, marginBottom:3 } }, "Interactive Demo"),
          React.createElement("div", { style:{ color:"#cce8a0", fontSize:13, lineHeight:1.6 } },
            "This demo uses a realistic sample IRS Account Transcript. In the full tool, you upload your own transcript and receive a personalized analysis and letter."
          )
        )
      ),

      // ── INTRO SCREEN ──
      screen === "intro" && React.createElement("div", null,
        React.createElement("div", { style:{ ...s.card, borderTop:"4px solid #1a2d5a" } },
          React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:12, marginBottom:16 } },
            React.createElement("div", { style:{ width:48, height:48, background:"#1a2d5a", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 } }, "\uD83D\uDEE1\uFE0F"),
            React.createElement("div", null,
              React.createElement("h1", { style: s.h1 }, "COVID Penalty Relief Tool"),
              React.createElement("div", { style:{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" } },
                React.createElement("span", { style: s.badge("#1a2d5a","#f0f7e8") }, "IRC \u00a76751(b)"),
                React.createElement("span", { style: s.badge("#15803d","#f0fdf4") }, "IRS Notice 2022-36")
              )
            )
          ),
          React.createElement("p", { style: s.body },
            "During the COVID-19 pandemic (2020\u20132022), the IRS assessed millions of failure-to-file and failure-to-pay penalties while operating under severely reduced staffing. Many of these penalties were assessed without the supervisory approval legally required under IRC \u00a76751(b) \u2014 making them procedurally defective and potentially invalid."
          ),
          React.createElement("p", { style:{ ...s.body, marginTop:12 } },
            "Additionally, IRS Notice 2022-36 provided automatic penalty relief for certain 2019 and 2020 tax returns \u2014 but many taxpayers who qualified never received it."
          ),
          React.createElement("p", { style:{ ...s.body, marginTop:12, fontWeight:"bold", color:"#1a2d5a" } },
            "This tool analyzes your IRS Account Transcript, identifies penalties challengeable under either ground, and generates a ready-to-mail letter to the IRS Penalty Abatement Coordinator."
          )
        ),

        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "Two Legal Grounds for Relief"),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } },
            React.createElement("div", { style:{ background:"#f0f7ff", border:"1px solid #bcd4f0", borderRadius:8, padding:"16px 18px" } },
              React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 1: \u00a76751(b) \u2014 No Supervisory Approval"),
              React.createElement("p", { style:{ fontSize:13, color:"#555", lineHeight:1.7 } },
                "IRC \u00a76751(b) requires written supervisory approval before any penalty is assessed. During COVID, this was routinely bypassed. Courts in Kwong and Abdo held such assessments invalid."
              )
            ),
            React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"16px 18px" } },
              React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 2: Notice 2022-36 \u2014 Automatic Waiver"),
              React.createElement("p", { style:{ fontSize:13, color:"#555", lineHeight:1.7 } },
                "IRS Notice 2022-36 automatically waived FTF and FTP penalties for 2019 and 2020 returns filed by September 30, 2022. Many taxpayers who qualified never received this relief."
              )
            )
          )
        ),

        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "What You Get"),
          [
            ["\uD83D\uDCC4", "Transcript Analysis", "Upload your IRS Account Transcript — the tool identifies every penalty TC code, assessment date, and amount in the COVID window."],
            ["\uD83D\uDD0D", "Legal Findings", "Per-penalty breakdown showing which relief grounds apply and why, with a total amount at issue."],
            ["\u270F\uFE0F", "Abatement Letter", "A ready-to-mail letter to the IRS Penalty Abatement Coordinator citing the specific legal grounds for your case."],
          ].map(function([icon, title, desc], i) {
            return React.createElement("div", { key:i, style:{ display:"flex", gap:14, marginBottom: i < 2 ? 16 : 0, alignItems:"flex-start" } },
              React.createElement("div", { style:{ width:36, height:36, background:"#1a2d5a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#7ec11f", fontSize:16, flexShrink:0 } }, icon),
              React.createElement("div", null,
                React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:3 } }, title),
                React.createElement("div", { style:{ fontSize:14, color:"#666", lineHeight:1.65 } }, desc)
              )
            );
          })
        ),

        React.createElement("div", { style:{ ...s.disc, marginBottom:20 } },
          React.createElement("strong", null, "Important Disclosures:"),
          " This tool provides a legal analysis framework and draft letter. Results are not guaranteed. The \u00a76751(b) argument is well-established but circuit court treatment varies. The IRS may deny the request. IRS Pilot LLC is not a law firm and this does not constitute legal advice."
        ),

        React.createElement("div", { style:{ textAlign:"center" } },
          React.createElement("button", {
            style:{ ...s.btn, fontSize:16, padding:"14px 40px" },
            onClick: function() { setScreen("findings"); }
          }, "See a Sample Analysis \u2192")
        )
      ),

      // ── FINDINGS SCREEN ──
      screen === "findings" && React.createElement("div", null,
        React.createElement("button", { onClick:function(){setScreen("intro");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", marginBottom:16, fontSize:14 } }, "\u2190 Back to Overview"),

        // Sample label
        React.createElement("div", { style:{ background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#92400e", display:"flex", alignItems:"center", gap:8 } },
          React.createElement("span", null, "\u26A0\uFE0F"),
          React.createElement("span", null, React.createElement("strong", null, "Demo Mode:"), " The findings below are based on a realistic sample transcript for tax year 2020. Your actual results will vary based on your specific penalties and assessment dates.")
        ),

        // Header card
        React.createElement("div", { style:{ ...s.card, borderTop:"4px solid #7ec11f" } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:16 } },
            React.createElement("div", null,
              React.createElement("div", { style:{ fontWeight:"bold", fontSize:18, color:"#1a2d5a" } }, "Tax Year " + SAMPLE_FINDINGS.tax_year),
              React.createElement("div", { style:{ fontSize:13, color:"#888", marginTop:2 } }, SAMPLE_FINDINGS.form_number + " \u00b7 Account Transcript Analysis \u00b7 Sample")
            ),
            React.createElement("div", { style:{ background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:10, padding:"12px 20px", textAlign:"center" } },
              React.createElement("div", { style:{ fontSize:11, fontWeight:"bold", color:"#888", letterSpacing:1, marginBottom:4 } }, "POTENTIALLY WAIVABLE"),
              React.createElement("div", { style:{ fontSize:24, fontWeight:"bold", color:"#15803d" } }, fmt(SAMPLE_FINDINGS.total_at_issue))
            )
          ),
          React.createElement("div", { style: s.infoBox("#15803d","#f0fdf4","#7ec11f") },
            "\u2705 This transcript contains penalties that appear challengeable under IRC \u00a76751(b) and IRS Notice 2022-36. In the full tool, you would proceed to generate your abatement letter."
          )
        ),

        // Penalties
        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "Penalties Identified"),
          SAMPLE_FINDINGS.penalties.map(function(p, i) {
            return React.createElement("div", { key:i, style:{ borderBottom: i < SAMPLE_FINDINGS.penalties.length-1 ? "1px solid #f0ede8":"none", paddingBottom:16, marginBottom:16 } },
              React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 } },
                React.createElement("div", null,
                  React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:4 } }, "TC " + p.code + " \u2014 " + p.label),
                  React.createElement("div", { style:{ fontSize:13, color:"#888", marginBottom:6 } }, "Assessment Date: " + p.date),
                  React.createElement("div", { style:{ display:"flex", gap:6, flexWrap:"wrap" } },
                    p.in_covid_window && React.createElement("span", { style: s.badge("#1a2d5a","#f0f7ff") }, "\u00a76751(b) Window"),
                    p.notice_2022_36_eligible && React.createElement("span", { style: s.badge("#15803d","#f0fdf4") }, "Notice 2022-36 Eligible"),
                    p.waivable
                      ? React.createElement("span", { style: s.badge("#92400e","#fef3c7") }, "Potentially Waivable")
                      : React.createElement("span", { style: s.badge("#888","#f8f6f1") }, "Not Waivable Under These Grounds")
                  )
                ),
                React.createElement("div", { style:{ textAlign:"right" } },
                  React.createElement("div", { style:{ fontSize:18, fontWeight:"bold", color: p.waivable ? "#dc2626" : "#888" } }, fmt(p.amount)),
                  React.createElement("div", { style:{ fontSize:11, color:"#aaa" } }, "Penalty amount")
                )
              ),
              React.createElement("div", { style:{ background:"#f8f6f1", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#555", lineHeight:1.65, marginTop:10 } }, p.analysis)
            );
          })
        ),

        // Notice 2022-36
        React.createElement("div", { style:{ ...s.card, border:"1.5px solid #7ec11f" } },
          React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\uD83D\uDCCB Notice 2022-36 Analysis"),
          React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, SAMPLE_FINDINGS.notice_2022_36_summary)
        ),

        // 6751b
        React.createElement("div", { style:{ ...s.card, border:"1.5px solid #1a2d5a" } },
          React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\u2696\uFE0F IRC \u00a76751(b) Analysis"),
          React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, SAMPLE_FINDINGS.section_6751b_summary)
        ),

        // CTA
        React.createElement("div", { style:{ background:"#1a2d5a", borderRadius:12, padding:"24px 28px", textAlign:"center" } },
          React.createElement("div", { style:{ color:"#7ec11f", fontWeight:"bold", fontSize:16, marginBottom:8 } }, "Ready to analyze your own transcript?"),
          React.createElement("p", { style:{ color:"#cce8a0", fontSize:14, lineHeight:1.7, marginBottom:20 } },
            "The full COVID Penalty Relief Tool lets you upload your IRS Account Transcript, get a personalized analysis, and generate a ready-to-mail abatement letter \u2014 all for $99 with 7-day access."
          ),
          React.createElement("div", { style:{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" } },
            React.createElement("a", { href:"/pricing", style:{ ...s.btnGreen, textDecoration:"none", display:"inline-block" } }, "Get Access \u2014 $99 \u2192"),
            React.createElement("a", { href:"/covid-penalty-relief", style:{ background:"transparent", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, textDecoration:"none", display:"inline-block" } }, "I Already Have Access \u2192")
          )
        )
      )
    )
  );
}

window.CovidPenaltyDemo = DemoCovidPenaltyTool;
