
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
    else if (acc.indexOf('planning')!==-1) al='Planning Access';
    else if (acc.indexOf('wizard')!==-1) al='Wizard Access';
    else if (acc.indexOf('navigator')!==-1) al='Navigator Access';
    else al='Free Account';
  }
  var hN = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='navigator'||a==='bundle';});
  var hP = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='planning'||a==='bundle';});
  var hW = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='wizard'||a==='bundle';});
  var lnk = { display:'flex',alignItems:'center',gap:10,padding:'10px 16px',color:'#333',textDecoration:'none',fontSize:13,borderBottom:'1px solid #f5f2ee' };
  var bdg = { marginLeft:'auto',background:'#7ec11f',color:'#1a2d5a',fontSize:9,fontWeight:'bold',padding:'2px 7px',borderRadius:10 };
  return React.createElement('div',{style:{background:'#1a2d5a',borderBottom:'3px solid #7ec11f',padding:'12px 24px',fontFamily:"'DM Sans',sans-serif",position:'relative',zIndex:100}},
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
        ? React.createElement('a',{href:'/login',style:{color:'#cce8a0',fontSize:13,textDecoration:'none',padding:'7px 16px',border:'1.5px solid rgba(126,193,31,0.4)',borderRadius:20,fontFamily:"'DM Sans',sans-serif"}},'Sign In')
        : React.createElement('div',{id:'irsn-m',style:{position:'relative'}},
            React.createElement('button',{style:{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.15)',color:'#fff',padding:'6px 12px 6px 6px',borderRadius:24,fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:'pointer',outline:'none'},onClick:function(){setOpen(function(o){return !o;});}},
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
              React.createElement('a',{href:'/planning',style:lnk},'\uD83D\uDCCA Tax Planning',hP&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/letters',style:lnk},'\uD83D\uDCC4 Letter Generator',hW&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/transcript',style:lnk},'\uD83D\uDCC1 Transcript Analyzer'),
              React.createElement('a',{href:'/account',style:lnk},'\u2699\ufe0f My Account'),
              React.createElement('a',{href:'/logout',style:Object.assign({},lnk,{color:'#dc2626',borderBottom:'none'})},'\uD83D\uDEAA Sign Out')
            )
          )
    )
  );
}

const { useState, useEffect, useRef } = React;

const PENALTY_CODES = {
  "160": { label: "Failure-to-File Penalty", type: "FTF", waivable: true, notice2022_36: true },
  "165": { label: "Failure-to-File Penalty (FTF)", type: "FTF", waivable: true, notice2022_36: true },
  "166": { label: "Failure-to-Pay Penalty", type: "FTP", waivable: true, notice2022_36: true },
  "167": { label: "Failure-to-Pay Penalty (FTP)", type: "FTP", waivable: true, notice2022_36: true },
  "170": { label: "Estimated Tax Penalty", type: "EST", waivable: false, notice2022_36: false },
  "180": { label: "Failure-to-Pay Penalty", type: "FTP", waivable: true, notice2022_36: true },
  "270": { label: "Failure-to-Pay Penalty", type: "FTP", waivable: true, notice2022_36: true },
  "276": { label: "Failure-to-Pay Penalty (FTP)", type: "FTP", waivable: true, notice2022_36: true },
  "300": { label: "Additional Tax Assessment", type: "TAX", waivable: false, notice2022_36: false },
  "320": { label: "Failure-to-File Penalty", type: "FTF", waivable: true, notice2022_36: true },
  "340": { label: "Failure-to-Pay Penalty", type: "FTP", waivable: true, notice2022_36: true },
  "681": { label: "Dishonored Payment Penalty", type: "OTHER", waivable: true, notice2022_36: false },
  "685": { label: "Return Preparer Penalty", type: "OTHER", waivable: false, notice2022_36: false },
};

const COVID_TAX_YEARS = ["2019", "2020"];
const NOTICE_2022_36_CUTOFF = "2022-09-30";
const SUPERVISORY_APPROVAL_WINDOW_START = "2020-03-01";
const SUPERVISORY_APPROVAL_WINDOW_END = "2022-12-31";

function CovidPenaltyTool() {
  const [screen, setScreen] = useState("intro");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [findings, setFindings] = useState(null);
  const [taxInfo, setTaxInfo] = useState({ name: "", address: "", city: "", state: "", zip: "", ssn: "", taxYear: "", irsAddress: "Internal Revenue Service\nPenalty Abatement Coordinator\nP.O. Box 149338\nAustin, TX 78714-9338" });
  const [letter, setLetter] = useState("");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const fileRef = useRef(null);

  const uploadTranscript = async (file) => {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("transcript", file);
    try {
      const res = await fetch("/api/covid-penalty/analyze", { method: "POST", body: form, credentials: "include" });
      const data = await res.json();
      if (data.error) { setError(data.error); setUploading(false); return; }
      setFindings(data);
      setTaxInfo(t => ({ ...t, taxYear: data.tax_year || "" }));
      setScreen("findings");
    } catch (e) {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const generateLetter = async () => {
    setGeneratingLetter(true);
    setError("");
    try {
      const res = await fetch("/api/covid-penalty/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ findings, taxInfo })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setGeneratingLetter(false); return; }
      setLetter(data.letter);
      setScreen("letter");
    } catch (e) {
      setError("Letter generation failed. Please try again.");
    }
    setGeneratingLetter(false);
  };

  const s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1" },
    wrap: { maxWidth:760, margin:"0 auto", padding:"28px 16px 60px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"24px 28px", marginBottom:20 },
    h1: { fontSize:24, fontWeight:"bold", color:"#1a2d5a", marginBottom:8 },
    h2: { fontSize:16, fontWeight:"bold", color:"#1a2d5a", marginBottom:12 },
    body: { fontSize:15, color:"#555", lineHeight:1.75 },
    badge: (color, bg) => ({ display:"inline-block", background:bg, color:color, fontSize:11, fontWeight:"bold", padding:"3px 10px", borderRadius:12, letterSpacing:0.3 }),
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:15, cursor:"pointer" },
    btnSec: { background:"transparent", color:"#1a2d5a", border:"2px solid #e8e4dc", borderRadius:8, padding:"10px 20px", fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer" },
    warn: { background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"14px 18px", fontSize:14, color:"#92400e", lineHeight:1.7, marginBottom:16 },
    err: { background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"12px 16px", fontSize:14, color:"#dc2626", marginTop:12 },
    disc: { background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"14px 18px", fontSize:12, color:"#888", lineHeight:1.7 },
    label: { display:"block", fontSize:13, fontWeight:"bold", color:"#1a2d5a", marginBottom:4, marginTop:12 },
    inp: { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:"1.5px solid #ddd", borderRadius:7, fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2d5a" },
    infoBox: (color, bg, border) => ({ background:bg, border:`1px solid ${border}`, borderRadius:8, padding:"14px 18px", marginBottom:16, fontSize:14, color:color, lineHeight:1.7 }),
  };

  return React.createElement("div", { style: s.page },
    React.createElement(IRSPilotNav, { subtitle: "COVID PENALTY RELIEF" }),
    React.createElement("div", { style: s.wrap },

      // ── INTRO SCREEN ──
      screen === "intro" && React.createElement("div", null,
        React.createElement("div", { style: { ...s.card, borderTop: "4px solid #1a2d5a" } },
          React.createElement("div", { style: { display:"flex", alignItems:"center", gap:12, marginBottom:16 } },
            React.createElement("div", { style: { width:48, height:48, background:"#1a2d5a", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 } }, "\uD83D\uDEE1\uFE0F"),
            React.createElement("div", null,
              React.createElement("h1", { style: s.h1 }, "COVID Penalty Relief Tool"),
              React.createElement("div", { style: { ...s.badge("#1a2d5a","#f0f7e8"), marginTop:4 } }, "IRC \u00a76751(b) \u00b7 IRS Notice 2022-36")
            )
          ),
          React.createElement("p", { style: s.body },
            "During the COVID-19 pandemic (2020\u20132022), the IRS assessed millions of failure-to-file and failure-to-pay penalties while operating under severely reduced staffing and emergency protocols. Many of these penalties were assessed without the supervisory approval legally required under IRC \u00a76751(b) \u2014 making them procedurally defective and potentially invalid."
          ),
          React.createElement("p", { style: { ...s.body, marginTop:12 } },
            "Additionally, IRS Notice 2022-36 provided automatic penalty relief for certain 2019 and 2020 tax returns \u2014 but many taxpayers who qualified never received it, or had penalties reimposed after the relief period ended."
          ),
          React.createElement("p", { style: { ...s.body, marginTop:12, fontWeight:"bold", color:"#1a2d5a" } },
            "This tool analyzes your IRS Account Transcript, identifies penalties that may be challengeable under either ground, and generates a letter directly to the IRS Penalty Abatement Coordinator."
          )
        ),

        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "Two Legal Grounds for Relief"),
          React.createElement("div", { style: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 } },
            React.createElement("div", { style: { background:"#f0f7ff", border:"1px solid #bcd4f0", borderRadius:8, padding:"16px 18px" } },
              React.createElement("div", { style: { fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 1: \u00a76751(b) \u2014 No Supervisory Approval"),
              React.createElement("p", { style: { fontSize:13, color:"#555", lineHeight:1.7 } },
                "IRC \u00a76751(b) requires that penalty assessments receive written supervisory approval before being communicated to the taxpayer. During COVID, this procedural requirement was routinely bypassed. Courts in Kwong, Abdo, and related cases held such assessments invalid."
              )
            ),
            React.createElement("div", { style: { background:"#f0fdf4", border:"1px solid #7ec11f", borderRadius:8, padding:"16px 18px" } },
              React.createElement("div", { style: { fontWeight:"bold", color:"#1a2d5a", fontSize:14, marginBottom:8 } }, "Ground 2: Notice 2022-36 \u2014 Automatic Waiver"),
              React.createElement("p", { style: { fontSize:13, color:"#555", lineHeight:1.7 } },
                "IRS Notice 2022-36 automatically waived failure-to-file and failure-to-pay penalties for tax years 2019 and 2020 for returns filed by September 30, 2022. Taxpayers who qualified but did not receive relief may request it."
              )
            )
          )
        ),

        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "How It Works"),
          [
            ["1", "\uD83D\uDCC4", "Upload Your Transcript", "Upload your IRS Account Transcript (PDF) from IRS.gov. The tool analyzes every transaction code and identifies penalties assessed during the COVID window."],
            ["2", "\uD83D\uDD0D", "Review Findings", "The tool identifies which penalties are potentially challengeable under \u00a76751(b), which qualify for Notice 2022-36 relief, and calculates the total amount at issue."],
            ["3", "\u270F\uFE0F", "Enter Your Information", "Provide your name, address, and SSN (last 4 only for your records). The tool pre-fills the letter with the specific penalties and legal arguments."],
            ["4", "\uD83D\uDCE8", "Send to the IRS", "Mail the generated letter to the IRS Penalty Abatement Coordinator at the address shown. Keep a copy and send via certified mail."],
          ].map(function([num, icon, title, desc]) {
            return React.createElement("div", { key:num, style:{ display:"flex", gap:14, marginBottom:16, alignItems:"flex-start" } },
              React.createElement("div", { style:{ width:36, height:36, background:"#1a2d5a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#7ec11f", fontWeight:"bold", fontSize:14, flexShrink:0 } }, num),
              React.createElement("div", null,
                React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:3 } }, icon + " " + title),
                React.createElement("div", { style:{ fontSize:14, color:"#666", lineHeight:1.65 } }, desc)
              )
            );
          })
        ),

        React.createElement("div", { style: { ...s.disc, marginBottom:20 } },
          React.createElement("strong", null, "Important Disclosures:"),
          " This tool provides a legal analysis framework and a draft letter based on publicly available law and IRS rulings. It does not constitute legal or tax advice, and results are not guaranteed. The \u00a76751(b) supervisory approval argument is well-established but circuit court treatment varies. The IRS may deny the request, and you retain the right to appeal any denial to the IRS Independent Office of Appeals or U.S. Tax Court. For penalties exceeding $10,000 or complex situations, consultation with a licensed Enrolled Agent or tax attorney is strongly recommended. IRS Pilot LLC is not a law firm."
        ),

        React.createElement("div", { style: { textAlign:"center" } },
          React.createElement("button", {
            style: { ...s.btn, fontSize:16, padding:"14px 40px" },
            onClick: function() { setScreen("upload"); }
          }, "Get Started \u2192")
        )
      ),

      // ── UPLOAD SCREEN ──
      screen === "upload" && React.createElement("div", null,
        React.createElement("button", { onClick:function(){setScreen("intro");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", marginBottom:16, fontSize:14 } }, "\u2190 Back"),
        React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "\uD83D\uDCC4 Upload Your IRS Account Transcript"),
          React.createElement("div", { style: s.warn },
            React.createElement("strong", null, "How to get your transcript:"),
            " Log in to IRS.gov \u2192 Get Your Tax Record \u2192 Get Transcript Online \u2192 Select \u201cAccount Transcript\u201d for the tax year in question. Download as PDF. Upload that PDF here."
          ),
          React.createElement("p", { style: { ...s.body, marginBottom:16 } },
            "Upload one transcript at a time. If you have multiple years with penalties, run the tool separately for each year and send separate letters."
          ),
          React.createElement("div", {
            style: { border:"2px dashed #7ec11f", borderRadius:10, padding:"40px 24px", textAlign:"center", background:"#f0fdf4", cursor:"pointer" },
            onClick: function() { fileRef.current && fileRef.current.click(); }
          },
            React.createElement("div", { style: { fontSize:40, marginBottom:12 } }, "\uD83D\uDCCA"),
            React.createElement("div", { style: { fontWeight:"bold", fontSize:16, color:"#1a2d5a", marginBottom:6 } }, "Click to upload your transcript"),
            React.createElement("div", { style: { fontSize:13, color:"#888" } }, "IRS Account Transcript — PDF format only"),
            React.createElement("input", {
              ref: fileRef,
              type: "file",
              accept: ".pdf",
              style: { display:"none" },
              onChange: function(e) { if(e.target.files[0]) uploadTranscript(e.target.files[0]); }
            })
          ),
          uploading && React.createElement("div", { style: { textAlign:"center", padding:"20px", color:"#1a2d5a", fontWeight:"bold" } }, "\u23F3 Analyzing transcript\u2026"),
          error && React.createElement("div", { style: s.err }, error)
        )
      ),

      // ── FINDINGS SCREEN ──
      screen === "findings" && findings && React.createElement("div", null,
        React.createElement("button", { onClick:function(){setScreen("upload");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", marginBottom:16, fontSize:14 } }, "\u2190 Upload Different Transcript"),

        React.createElement("div", { style: { ...s.card, borderTop:"4px solid " + (findings.total_at_issue > 0 ? "#7ec11f" : "#e8e4dc") } },
          React.createElement("div", { style: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:16 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontWeight:"bold", fontSize:18, color:"#1a2d5a" } }, "Tax Year " + findings.tax_year),
              React.createElement("div", { style: { fontSize:13, color:"#888", marginTop:2 } }, (findings.form_number||"Form 1040") + " \u00b7 Account Transcript Analysis")
            ),
            React.createElement("div", { style: { background: findings.total_at_issue > 0 ? "#f0fdf4" : "#f8f6f1", border:"1px solid " + (findings.total_at_issue > 0 ? "#7ec11f" : "#e8e4dc"), borderRadius:10, padding:"12px 20px", textAlign:"center" } },
              React.createElement("div", { style: { fontSize:11, fontWeight:"bold", color:"#888", letterSpacing:1, marginBottom:4 } }, "POTENTIALLY WAIVABLE"),
              React.createElement("div", { style: { fontSize:24, fontWeight:"bold", color: findings.total_at_issue > 0 ? "#15803d" : "#888" } },
                "$" + (findings.total_at_issue||0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})
              )
            )
          ),

          findings.total_at_issue > 0
            ? React.createElement("div", { style: { ...s.infoBox("#15803d","#f0fdf4","#7ec11f") } },
                "\u2705 This transcript contains penalties that appear challengeable. Review the findings below, then proceed to generate your letter."
              )
            : React.createElement("div", { style: { ...s.infoBox("#92400e","#fef3c7","#f59e0b") } },
                "\u26A0\uFE0F No penalties meeting the COVID relief criteria were identified in this transcript. This may mean penalties were not assessed, penalties were assessed outside the COVID window, or the penalties assessed are not the type covered by these provisions. You may still have other abatement options (First Time Abatement, Reasonable Cause) \u2014 consult the IRS Pilot Navigator for those."
              )
        ),

        findings.penalties && findings.penalties.length > 0 && React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "Penalties Identified"),
          findings.penalties.map(function(p, i) {
            return React.createElement("div", { key:i, style:{ borderBottom: i < findings.penalties.length-1 ? "1px solid #f0ede8":"none", paddingBottom:14, marginBottom:14 } },
              React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 } },
                React.createElement("div", null,
                  React.createElement("div", { style:{ fontWeight:"bold", fontSize:15, color:"#1a2d5a", marginBottom:4 } }, "TC " + p.code + " \u2014 " + p.label),
                  React.createElement("div", { style:{ fontSize:13, color:"#888", marginBottom:6 } }, "Assessment Date: " + p.date),
                  React.createElement("div", { style:{ display:"flex", gap:6, flexWrap:"wrap" } },
                    p.in_covid_window && React.createElement("span", { style:s.badge("#1a2d5a","#f0f7ff") }, "\u00a76751(b) Window"),
                    p.notice_2022_36_eligible && React.createElement("span", { style:s.badge("#15803d","#f0fdf4") }, "Notice 2022-36 Eligible"),
                    p.waivable && React.createElement("span", { style:s.badge("#92400e","#fef3c7") }, "Potentially Waivable"),
                    !p.waivable && React.createElement("span", { style:s.badge("#888","#f8f6f1") }, "Not Waivable Under These Grounds")
                  )
                ),
                React.createElement("div", { style:{ textAlign:"right" } },
                  React.createElement("div", { style:{ fontSize:18, fontWeight:"bold", color: p.waivable ? "#dc2626" : "#888" } }, "$" + (p.amount||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})),
                  React.createElement("div", { style:{ fontSize:11, color:"#aaa" } }, "Penalty amount")
                )
              ),
              p.analysis && React.createElement("div", { style:{ background:"#f8f6f1", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#555", lineHeight:1.65, marginTop:10 } }, p.analysis)
            );
          })
        ),

        findings.notice_2022_36_summary && React.createElement("div", { style: { ...s.card, border:"1.5px solid #7ec11f" } },
          React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\uD83D\uDCCB Notice 2022-36 Analysis"),
          React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, findings.notice_2022_36_summary)
        ),

        findings.section_6751b_summary && React.createElement("div", { style: { ...s.card, border:"1.5px solid #1a2d5a" } },
          React.createElement("div", { style:{ fontWeight:"bold", color:"#1a2d5a", fontSize:15, marginBottom:8 } }, "\u2696\uFE0F IRC \u00a76751(b) Analysis"),
          React.createElement("p", { style:{ fontSize:14, color:"#555", lineHeight:1.7 } }, findings.section_6751b_summary)
        ),

        findings.total_at_issue > 0 && React.createElement("div", { style: s.card },
          React.createElement("h2", { style: s.h2 }, "Your Information for the Letter"),
          React.createElement("p", { style:{ fontSize:14, color:"#888", marginBottom:8 } }, "This information will appear in the letter. Double-check that it matches your IRS records."),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 } },
            React.createElement("div", null,
              React.createElement("label", { style:s.label }, "Full Legal Name"),
              React.createElement("input", { style:s.inp, type:"text", placeholder:"As shown on your tax return", value:taxInfo.name, onChange:function(e){setTaxInfo(t=>({...t,name:e.target.value}));} })
            ),
            React.createElement("div", null,
              React.createElement("label", { style:s.label }, "Tax Year"),
              React.createElement("input", { style:s.inp, type:"text", value:taxInfo.taxYear, readOnly:true })
            )
          ),
          React.createElement("label", { style:s.label }, "Street Address"),
          React.createElement("input", { style:s.inp, type:"text", placeholder:"Current mailing address", value:taxInfo.address, onChange:function(e){setTaxInfo(t=>({...t,address:e.target.value}));} }),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12 } },
            React.createElement("div", null,
              React.createElement("label", { style:s.label }, "City"),
              React.createElement("input", { style:s.inp, type:"text", value:taxInfo.city, onChange:function(e){setTaxInfo(t=>({...t,city:e.target.value}));} })
            ),
            React.createElement("div", null,
              React.createElement("label", { style:s.label }, "State"),
              React.createElement("input", { style:s.inp, type:"text", placeholder:"TN", value:taxInfo.state, onChange:function(e){setTaxInfo(t=>({...t,state:e.target.value}));} })
            ),
            React.createElement("div", null,
              React.createElement("label", { style:s.label }, "ZIP"),
              React.createElement("input", { style:s.inp, type:"text", value:taxInfo.zip, onChange:function(e){setTaxInfo(t=>({...t,zip:e.target.value}));} })
            )
          ),
          React.createElement("label", { style:s.label }, "SSN (last 4 digits only \u2014 for your records, not sent electronically)"),
          React.createElement("input", { style:{ ...s.inp, maxWidth:160 }, type:"text", placeholder:"XXX-XX-####", value:taxInfo.ssn, onChange:function(e){setTaxInfo(t=>({...t,ssn:e.target.value}));} }),
          React.createElement("div", { style:{ ...s.disc, marginTop:16 } },
            "Your information is used only to generate the letter. It is not stored on IRS Pilot\u2019s servers after this session ends."
          ),
          error && React.createElement("div", { style:s.err }, error),
          React.createElement("div", { style:{ marginTop:20, display:"flex", gap:12 } },
            React.createElement("button", {
              style: { ...s.btn, opacity: generatingLetter ? 0.6 : 1 },
              disabled: generatingLetter,
              onClick: generateLetter
            }, generatingLetter ? "\u23F3 Generating Letter\u2026" : "\u270F\uFE0F Generate Abatement Letter \u2192")
          )
        )
      ),

      // ── LETTER SCREEN ──
      screen === "letter" && letter && React.createElement("div", null,
        React.createElement("button", { onClick:function(){setScreen("findings");}, style:{ background:"none", border:"none", color:"#888", cursor:"pointer", marginBottom:16, fontSize:14 } }, "\u2190 Back to Findings"),
        React.createElement("div", { style:{ ...s.card, border:"2px solid #7ec11f" } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 } },
            React.createElement("div", null,
              React.createElement("div", { style:{ fontWeight:"bold", fontSize:18, color:"#1a2d5a" } }, "\uD83D\uDCE8 Your Abatement Request Letter"),
              React.createElement("div", { style:{ fontSize:13, color:"#888", marginTop:2 } }, "Ready to print and mail to the IRS Penalty Abatement Coordinator")
            ),
            React.createElement("button", { style:{ ...s.btn, fontSize:13, padding:"8px 18px" }, onClick:function(){window.print();} }, "\uD83D\uDDA8\uFE0F Print / Save PDF")
          ),
          React.createElement("div", { style:{ background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"24px 28px", fontFamily:"Georgia, serif", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap", color:"#1a2d5a" } }, letter)
        ),

        React.createElement("div", { style: s.card },
          React.createElement("h2", { style:s.h2 }, "\uD83D\uDCCB Mailing Instructions"),
          [
            ["Print the letter", "Print the letter on plain paper. Sign it by hand in blue or black ink."],
            ["Make a copy", "Keep a complete copy of the signed letter and all supporting documents for your records."],
            ["Send via certified mail", "Mail to the IRS Penalty Abatement Coordinator via USPS Certified Mail with Return Receipt. Keep the tracking number and green card when it comes back."],
            ["Wait for response", "The IRS typically responds within 30\u201360 days. If denied, you have the right to appeal to the IRS Independent Office of Appeals."],
          ].map(function([title, desc], i) {
            return React.createElement("div", { key:i, style:{ display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" } },
              React.createElement("div", { style:{ width:28, height:28, background:"#1a2d5a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#7ec11f", fontWeight:"bold", fontSize:13, flexShrink:0 } }, i+1),
              React.createElement("div", null,
                React.createElement("div", { style:{ fontWeight:"bold", fontSize:14, color:"#1a2d5a", marginBottom:2 } }, title),
                React.createElement("div", { style:{ fontSize:13, color:"#666", lineHeight:1.65 } }, desc)
              )
            );
          })
        ),

        React.createElement("div", { style: s.disc },
          "IMPORTANT: Submitting this letter is a request, not a guarantee of abatement. The IRS may deny the request. If denied, you may appeal to the IRS Independent Office of Appeals within 30 days of the denial letter. The \u00a76751(b) supervisory approval argument is an unsettled legal theory in some circuits. IRS Pilot LLC is not a law firm and this letter does not constitute legal representation. For denied claims involving significant amounts, consult a licensed Enrolled Agent or tax attorney. IRS Pilot LLC \u00b7 irspilot.com \u00b7 (615) 953-7124 \u00b7 info@irspilot.com"
        )
      )
    )
  );
}

window.CovidPenaltyTool = CovidPenaltyTool;
