
const { useState, useRef } = React;

const CREDENTIALS = ["EA (Enrolled Agent)", "CPA (Certified Public Accountant)", "Attorney (Tax)", "CRTP (CA Registered Tax Preparer)", "Other"];

const CATS = ["FTF","FTP","EST","OTHER"];

/* ── helpers ── */
function fmt(n) { return "$" + (n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function today() { return new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); }

/* ── Nav ── */
function Nav({ user }) {
  const initials = user ? (user.email||"?").substring(0,2).toUpperCase() : "?";
  return React.createElement("div", { style:{background:"#1a2d5a",borderBottom:"3px solid #7ec11f",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"} },
    React.createElement("div", { style:{display:"flex",alignItems:"center",gap:10} },
      React.createElement("img", { src:"/static/logo.png", style:{width:36,height:36,objectFit:"contain"}, alt:"IRS Pilot" }),
      React.createElement("div", null,
        React.createElement("div", { style:{color:"#fff",fontWeight:"bold",fontSize:15} }, "IRS Pilot"),
        React.createElement("div", { style:{color:"#7ec11f",fontSize:9,letterSpacing:1.5} }, "COVID PENALTY RELIEF — TAX PRO")
      )
    ),
    React.createElement("div", { style:{display:"flex",alignItems:"center",gap:10} },
      React.createElement("span", { style:{background:"rgba(126,193,31,0.15)",color:"#7ec11f",fontSize:11,fontWeight:"bold",padding:"4px 12px",borderRadius:12,border:"1px solid rgba(126,193,31,0.4)"} }, "TAX PRO ACCESS"),
      React.createElement("div", { style:{width:32,height:32,background:"#7ec11f",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:"bold",color:"#1a2d5a"} }, initials)
    )
  );
}

/* ── Main Component ── */
function CovidPenaltyPro() {
  const [user, setUser] = useState(null);
  const [proInfo, setProInfo] = useState({ firmName:"", proName:"", credential:"EA (Enrolled Agent)", customCred:"", caraNumber:"", address:"", phone:"", email:"" });
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [tab, setTab] = useState("setup"); // setup | batch | report
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ pct:0, text:"" });
  const fileRef = useRef(null);

  const [credits, setCredits] = React.useState(null);
  const [memberType, setMemberType] = React.useState("referral");
  const [buyModal, setBuyModal] = React.useState(false);
  const [buying, setBuying] = React.useState(false);

  // Load user on mount
  React.useEffect(function() {
    fetch("/api/me", {credentials:"include"})
      .then(function(r){return r.json();})
      .then(function(u){
        setUser(u);
        if (u.loggedIn) {
          fetch("/api/covid-pro/credits", {credentials:"include"})
            .then(function(r){return r.json();})
            .then(function(c){ setCredits(c); })
            .catch(function(){});
        }
      })
      .catch(function(){});
  }, []);

  // Check for credits=success in URL after Stripe redirect
  React.useEffect(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "success") {
      fetch("/api/covid-pro/credits", {credentials:"include"})
        .then(function(r){return r.json();})
        .then(function(c){ setCredits(c); });
      window.history.replaceState({}, "", "/covid-penalty-pro");
    }
  }, []);

  async function buyCredits(tier) {
    setBuying(true);
    try {
      const resp = await fetch("/api/covid-pro/buy-credits", {
        method:"POST", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tier, member_type: memberType })
      });
      const data = await resp.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
      else alert(data.error || "Could not create checkout session.");
    } catch(e) { alert("Error: " + e.message); }
    setBuying(false);
  }

  /* ── Access gate ── */
  if (!user) return loading("Checking access...");
  if (!user.loggedIn) return gate("You must be logged in to access this tool.", "/login?next=/covid-penalty-pro");
  if (!user.hasCovid) return gate("Tax Pro COVID Penalty Relief access required.", "/pricing");

  /* ── Styles ── */
  const s = {
    page: { fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f8f6f1" },
    wrap: { maxWidth:900, margin:"0 auto", padding:"24px 16px 60px" },
    card: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"22px 26px", marginBottom:18 },
    h2: { fontSize:16, fontWeight:"bold", color:"#1a2d5a", marginBottom:14 },
    label: { display:"block", fontSize:12, fontWeight:"bold", color:"#555", marginBottom:4, marginTop:12, textTransform:"uppercase", letterSpacing:0.4 },
    inp: { width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:7, fontFamily:"'DM Sans',sans-serif", fontSize:14, background:"#fafafa", boxSizing:"border-box" },
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"10px 22px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer" },
    btnGreen: { background:"#7ec11f", color:"#1a2d5a", border:"2px solid #7ec11f", borderRadius:8, padding:"10px 22px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer" },
    btnSm: { background:"transparent", color:"#1a2d5a", border:"1px solid #e8e4dc", borderRadius:7, padding:"7px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" },
    row2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
    row3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 },
    badge: function(c,bg){ return {display:"inline-block",background:bg,color:c,fontSize:11,fontWeight:"bold",padding:"3px 9px",borderRadius:10}; },
  };

  /* ── Tab bar ── */
  function TabBar() {
    const tabs = [["setup","⚙️ Firm Setup"],["batch","📂 Client Batch"],["report","📊 Combined Report"]];
    return React.createElement("div", { style:{display:"flex",gap:6,marginBottom:20,borderBottom:"2px solid #e8e4dc",paddingBottom:0} },
      tabs.map(function([key,label]) {
        const active = tab === key;
        return React.createElement("button", { key, onClick:function(){setTab(key);}, style:{padding:"10px 18px",border:"none",background:"none",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:active?"bold":"normal",color:active?"#1a2d5a":"#888",borderBottom:active?"3px solid #1a2d5a":"3px solid transparent",cursor:"pointer",marginBottom:-2} }, label);
      })
    );
  }

  /* ── SETUP TAB ── */
  function SetupTab() {
    const [local, setLocal] = useState(proInfo);
    function save() { setProInfo(local); setTab("batch"); }
    function field(label, key, placeholder, opts) {
      return React.createElement("div", null,
        React.createElement("label", { style: s.label }, label),
        opts
          ? React.createElement("select", { style: s.inp, value:local[key], onChange:function(e){setLocal(function(p){return {...p,[key]:e.target.value};}) } }, opts.map(function(o){return React.createElement("option",{key:o,value:o},o);}))
          : React.createElement("input", { type:"text", style: s.inp, value:local[key]||"", placeholder:placeholder||"", onChange:function(e){setLocal(function(p){return {...p,[key]:e.target.value};}) } })
      );
    }
    return React.createElement("div", null,
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Your Firm Information"),
        React.createElement("p", { style:{fontSize:13,color:"#888",marginBottom:16,lineHeight:1.65} }, "This information will appear on all letters and the combined report. Set it once — it applies to every client in this session."),
        React.createElement("div", { style: s.row2 },
          React.createElement("div", null, field("Firm Name","firmName","Taylor Tax & Financial Consulting")),
          React.createElement("div", null, field("Your Full Name","proName","Tyrone J. Taylor"))
        ),
        React.createElement("div", { style: s.row2 },
          React.createElement("div", null, field("Credential","credential","",CREDENTIALS)),
          local.credential === "Other"
            ? React.createElement("div", null, field("Custom Credential","customCred","e.g. Accountant"))
            : React.createElement("div", null, field("License / CAF Number (optional)","caraNumber","CAF No. or EA # (for POA letters)"))
        ),
        React.createElement("div", null, field("Firm Address","address","123 Main St, Nashville, TN 37201")),
        React.createElement("div", { style: s.row2 },
          React.createElement("div", null, field("Phone","phone","(615) 953-7124")),
          React.createElement("div", null, field("Email","email","info@irspilot.com"))
        )
      ),
      React.createElement("div", { style:{display:"flex",justifyContent:"flex-end"} },
        React.createElement("button", { style: s.btnGreen, onClick: save }, "Save & Continue to Batch →")
      )
    );
  }

  /* ── CLIENT CARD ── */
  function ClientCard({ client, idx }) {
    const [expanded, setExpanded] = useState(idx === clients.length - 1);
    const [letterMode, setLetterMode] = useState("taxpayer"); // taxpayer | poa
    const [showLetter, setShowLetter] = useState(false);
    const [letter, setLetter] = useState("");
    const [genning, setGenning] = useState(false);
    const [genErr, setGenErr] = useState("");

    async function generateLetter() {
      setGenning(true); setGenErr("");
      try {
        // Consume one credit first (admins are exempt)
        const creditResp = await fetch("/api/covid-pro/consume-credit", {method:"POST",credentials:"include"});
        const creditData = await creditResp.json();
        if (!creditResp.ok && creditResp.status === 402) {
          setGenErr("No letter credits remaining. Purchase more credits to continue.");
          setGenning(false);
          return;
        }
        // Update credit display
        if (creditData.remaining !== undefined) {
          setCredits(function(c){return c?{...c,remaining:creditData.remaining,used:(c.used||0)+1}:c;});
        }
        const resp = await fetch("/api/covid-penalty/generate-letter", {
          method:"POST", credentials:"include",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            findings: client.findings,
            taxInfo: client.taxInfo,
            letterMode,
            proInfo,
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Generation failed");
        setLetter(data.letter);
        setShowLetter(true);
      } catch(e) {
        setGenErr(e.message);
      } finally {
        setGenning(false);
      }
    }

    const f = client.findings;
    const waivable = f ? (f.penalties||[]).filter(function(p){return p.waivable;}) : [];
    const statusColor = client.status === "done" ? "#15803d" : client.status === "error" ? "#dc2626" : client.status === "processing" ? "#1a2d5a" : "#888";
    const statusBg = client.status === "done" ? "#f0fdf4" : client.status === "error" ? "#fef2f2" : client.status === "processing" ? "#f0f7ff" : "#f8f6f1";

    return React.createElement("div", { style:{...s.card, border: client.status==="done"?"1.5px solid #7ec11f":client.status==="error"?"1.5px solid #fca5a5":"1px solid #e8e4dc"} },
      // Header
      React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}, onClick:function(){setExpanded(function(e){return !e;}) } },
        React.createElement("div", { style:{display:"flex",alignItems:"center",gap:12} },
          React.createElement("div", { style:{width:36,height:36,background:statusBg,border:"1px solid "+statusColor,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0} },
            client.status==="done"?"✅":client.status==="error"?"❌":client.status==="processing"?"⏳":"📄"
          ),
          React.createElement("div", null,
            React.createElement("div", { style:{fontWeight:"bold",fontSize:15,color:"#1a2d5a"} }, client.taxInfo.clientName || "Client " + (idx+1)),
            React.createElement("div", { style:{fontSize:12,color:"#888"} }, client.file.name + (f?" · Tax Year "+f.tax_year:"") + (f&&f.total_at_issue>0?" · "+fmt(f.total_at_issue)+" at issue":""))
          )
        ),
        React.createElement("div", { style:{display:"flex",alignItems:"center",gap:8} },
          client.status==="done" && React.createElement("span", { style: s.badge("#15803d","#f0fdf4") }, waivable.length+" waivable"),
          client.status==="error" && React.createElement("span", { style: s.badge("#dc2626","#fef2f2") }, "Error"),
          React.createElement("span", { style:{color:"#aaa",fontSize:18} }, expanded?"▲":"▼")
        )
      ),

      // Expanded body
      expanded && React.createElement("div", { style:{marginTop:18,borderTop:"1px solid #f0ede8",paddingTop:18} },

        // Client info fields
        React.createElement("div", { style:{marginBottom:16} },
          React.createElement("div", { style:{fontSize:13,fontWeight:"bold",color:"#1a2d5a",marginBottom:10} }, "Client Information"),
          React.createElement("div", { style: s.row3 },
            React.createElement("div", null,
              React.createElement("label", { style: s.label }, "Client Full Name"),
              React.createElement("input", { type:"text", style: s.inp, value:client.taxInfo.clientName||"", placeholder:"Legal name on return",
                onChange:function(e){ setClients(function(cs){return cs.map(function(c,i){return i===idx?{...c,taxInfo:{...c.taxInfo,clientName:e.target.value}}:c;});}); } })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: s.label }, "SSN (last 4)"),
              React.createElement("input", { type:"text", style: s.inp, value:client.taxInfo.ssn||"", placeholder:"XXX-XX-####", maxLength:11,
                onChange:function(e){ setClients(function(cs){return cs.map(function(c,i){return i===idx?{...c,taxInfo:{...c.taxInfo,ssn:e.target.value}}:c;});}); } })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: s.label }, "Tax Year"),
              React.createElement("input", { type:"text", style: s.inp, value:(f&&f.tax_year)||client.taxInfo.taxYear||"", placeholder:"e.g. 2020",
                onChange:function(e){ setClients(function(cs){return cs.map(function(c,i){return i===idx?{...c,taxInfo:{...c.taxInfo,taxYear:e.target.value}}:c;});}); } })
            )
          ),
          React.createElement("div", { style:{marginTop:8} },
            React.createElement("label", { style: s.label }, "Client Address"),
            React.createElement("input", { type:"text", style: s.inp, value:client.taxInfo.address||"", placeholder:"Street, City, State ZIP",
              onChange:function(e){ setClients(function(cs){return cs.map(function(c,i){return i===idx?{...c,taxInfo:{...c.taxInfo,address:e.target.value}}:c;});}); } })
          )
        ),

        // Findings
        client.status === "done" && f && React.createElement("div", { style:{marginBottom:16} },
          React.createElement("div", { style:{fontSize:13,fontWeight:"bold",color:"#1a2d5a",marginBottom:10} }, "Findings"),
          waivable.length === 0
            ? React.createElement("div", { style:{background:"#f8f6f1",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#888"} }, "No waivable penalties identified on this transcript.")
            : React.createElement("div", null,
                React.createElement("div", { style:{background:"#f0fdf4",border:"1px solid #7ec11f",borderRadius:8,padding:"12px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"} },
                  React.createElement("span", { style:{fontSize:14,color:"#15803d",fontWeight:"bold"} }, "✅ "+waivable.length+" waivable penalt"+(waivable.length===1?"y":"ies")+" identified"),
                  React.createElement("span", { style:{fontSize:18,fontWeight:"bold",color:"#15803d"} }, fmt(f.total_at_issue))
                ),
                waivable.map(function(p,pi) {
                  return React.createElement("div", { key:pi, style:{background:"#f8f6f1",borderRadius:7,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"flex-start"} },
                    React.createElement("div", null,
                      React.createElement("div", { style:{fontWeight:"bold",fontSize:13,color:"#1a2d5a"} }, "TC "+p.code+" — "+p.label),
                      React.createElement("div", { style:{fontSize:12,color:"#888"} }, "Assessed: "+p.date),
                      React.createElement("div", { style:{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"} },
                        p.in_covid_window && React.createElement("span", { style: s.badge("#1a2d5a","#f0f7ff") }, "§6751(b)"),
                        p.notice_2022_36_eligible && React.createElement("span", { style: s.badge("#15803d","#f0fdf4") }, "Notice 2022-36")
                      )
                    ),
                    React.createElement("div", { style:{fontWeight:"bold",fontSize:15,color:"#dc2626"} }, fmt(p.amount))
                  );
                })
              )
        ),

        // Error
        client.status === "error" && React.createElement("div", { style:{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#dc2626",marginBottom:16} }, client.error),

        // Letter generation
        client.status === "done" && waivable.length > 0 && React.createElement("div", null,
          React.createElement("div", { style:{fontSize:13,fontWeight:"bold",color:"#1a2d5a",marginBottom:10} }, "Generate Letter"),
          React.createElement("div", { style:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"} },
            [["taxpayer","Taxpayer (First Person)"],["poa","Tax Pro as Representative (POA)"]].map(function([mode,label]) {
              return React.createElement("button", { key:mode, onClick:function(){setLetterMode(mode);}, style:{...s.btnSm, background:letterMode===mode?"#1a2d5a":"transparent", color:letterMode===mode?"#7ec11f":"#555", border:letterMode===mode?"2px solid #7ec11f":"1px solid #e8e4dc"} }, label);
            })
          ),
          React.createElement("button", { style:{...s.btn, opacity:genning?0.6:1}, onClick:generateLetter, disabled:genning },
            genning ? "Generating..." : "✏️ Generate Letter"
          ),
          genErr && React.createElement("div", { style:{color:"#dc2626",fontSize:13,marginTop:8} }, genErr),
          showLetter && letter && React.createElement("div", { style:{marginTop:16} },
            React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8} },
              React.createElement("div", { style:{fontSize:13,fontWeight:"bold",color:"#1a2d5a"} }, "Generated Letter"),
              React.createElement("button", { style: s.btnSm, onClick:function(){window.print();} }, "🖨️ Print")
            ),
            React.createElement("div", { style:{background:"#f8f6f1",border:"1px solid #e8e4dc",borderRadius:8,padding:"22px 28px",fontFamily:"Georgia,serif",fontSize:13,lineHeight:1.9,whiteSpace:"pre-wrap",color:"#1a2d5a",maxHeight:500,overflowY:"auto"} }, letter)
          )
        )
      )
    );
  }

  /* ── BATCH TAB ── */
  function BatchTab() {
    if (!proInfo.firmName) return React.createElement("div", { style:{...s.card,textAlign:"center",padding:"40px"} },
      React.createElement("div", { style:{fontSize:32,marginBottom:12} }, "⚙️"),
      React.createElement("p", { style:{color:"#888",marginBottom:16} }, "Please complete your firm setup first."),
      React.createElement("button", { style: s.btn, onClick:function(){setTab("setup");} }, "Go to Firm Setup →")
    );

    async function processFiles(files) {
      const newClients = Array.from(files).map(function(file) {
        return { file, status:"pending", taxInfo:{ clientName:"", ssn:"", address:"", taxYear:"" }, findings:null, error:"" };
      });
      setClients(function(prev) { return [...prev, ...newClients]; });

      for (let i = 0; i < newClients.length; i++) {
        const clientIdx = clients.length + i;
        setClients(function(cs) { return cs.map(function(c,j){return j===clientIdx?{...c,status:"processing"}:c;}); });
        setProgress({ pct: Math.round((i/newClients.length)*100), text:"Analyzing "+newClients[i].file.name+"..." });

        try {
          const b64 = await toBase64(newClients[i].file);
          const resp = await fetch("/api/covid-penalty/analyze", {
            method:"POST", credentials:"include",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ pdf_base64: b64, filename: newClients[i].file.name, pro_mode: true })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Analysis failed");
          setClients(function(cs) { return cs.map(function(c,j){return j===clientIdx?{...c,status:"done",findings:data,taxInfo:{...c.taxInfo,taxYear:data.tax_year||""}}:c;}); });
        } catch(e) {
          setClients(function(cs) { return cs.map(function(c,j){return j===clientIdx?{...c,status:"error",error:e.message}:c;}); });
        }
      }
      setProgress({ pct:100, text:"Done" });
      setProcessing(false);
    }

    function toBase64(file) {
      return new Promise(function(res,rej) {
        const r = new FileReader();
        r.onload = function() { res(r.result.split(",")[1]); };
        r.onerror = function() { rej(new Error("File read failed")); };
        r.readAsDataURL(file);
      });
    }

    function handleDrop(e) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(function(f){return f.name.toLowerCase().endsWith(".pdf");});
      if (files.length) { setProcessing(true); processFiles(files); }
    }

    function handlePick(e) {
      const files = e.target.files;
      if (files && files.length) { setProcessing(true); processFiles(files); }
    }

    const doneCount = clients.filter(function(c){return c.status==="done";}).length;
    const totalWaivable = clients.reduce(function(sum,c){return sum+(c.findings?c.findings.total_at_issue:0);},0);

    return React.createElement("div", null,
      // Stats row
      clients.length > 0 && React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18} },
        [["📂",clients.length,"Transcripts Loaded"],["✅",doneCount,"Analyzed"],["💰",fmt(totalWaivable),"Total Potentially Waivable"]].map(function([icon,val,label],i) {
          return React.createElement("div", { key:i, style:{background:"#fff",border:"1px solid #e8e4dc",borderRadius:10,padding:"14px 18px",textAlign:"center"} },
            React.createElement("div", { style:{fontSize:22} }, icon),
            React.createElement("div", { style:{fontSize:20,fontWeight:"bold",color:"#1a2d5a",margin:"4px 0"} }, val),
            React.createElement("div", { style:{fontSize:12,color:"#888"} }, label)
          );
        })
      ),

      // Upload zone
      React.createElement("div", {
        style:{border:"2px dashed #7ec11f",borderRadius:10,padding:"28px 20px",textAlign:"center",background:"#f0fdf4",cursor:"pointer",marginBottom:18},
        onDragOver:function(e){e.preventDefault();},
        onDrop: handleDrop,
        onClick:function(){fileRef.current&&fileRef.current.click();}
      },
        React.createElement("input", { type:"file", multiple:true, accept:".pdf", ref:fileRef, style:{display:"none"}, onChange:handlePick }),
        React.createElement("div", { style:{fontSize:28,marginBottom:8} }, "📊"),
        React.createElement("div", { style:{fontWeight:"bold",color:"#1a2d5a",fontSize:15,marginBottom:4} }, "Drop IRS Account Transcripts here"),
        React.createElement("div", { style:{fontSize:13,color:"#888"} }, "Multiple PDFs supported — one transcript per client")
      ),

      // Progress bar
      processing && React.createElement("div", { style:{marginBottom:18} },
        React.createElement("div", { style:{fontSize:13,color:"#1a2d5a",marginBottom:6} }, progress.text),
        React.createElement("div", { style:{background:"#e8e4dc",borderRadius:10,height:8} },
          React.createElement("div", { style:{background:"#7ec11f",borderRadius:10,height:8,width:progress.pct+"%",transition:"width 0.3s"} })
        )
      ),

      // Client cards
      clients.map(function(client, idx) {
        return React.createElement(ClientCard, { key:idx, client, idx });
      }),

      // Action buttons
      doneCount > 0 && React.createElement("div", { style:{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8} },
        React.createElement("button", { style: s.btnSm, onClick:function(){setClients([]);} }, "Clear All"),
        React.createElement("button", { style: s.btnGreen, onClick:function(){setTab("report");} }, "📊 View Combined Report →")
      )
    );
  }

  /* ── REPORT TAB ── */
  function ReportTab() {
    const done = clients.filter(function(c){return c.status==="done" && c.findings;});
    if (done.length === 0) return React.createElement("div", { style:{...s.card,textAlign:"center",padding:"40px"} },
      React.createElement("div", { style:{fontSize:32,marginBottom:12} }, "📊"),
      React.createElement("p", { style:{color:"#888",marginBottom:16} }, "No analyzed transcripts yet. Analyze clients in the Batch tab first."),
      React.createElement("button", { style: s.btn, onClick:function(){setTab("batch");} }, "Go to Client Batch →")
    );

    const totalWaivable = done.reduce(function(s,c){return s+c.findings.total_at_issue;},0);
    const withPenalties = done.filter(function(c){return c.findings.total_at_issue>0;});

    return React.createElement("div", null,
      // Summary card
      React.createElement("div", { style:{...s.card,borderTop:"4px solid #1a2d5a"} },
        React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16} },
          React.createElement("div", null,
            React.createElement("div", { style:{fontWeight:"bold",fontSize:18,color:"#1a2d5a"} }, "COVID Penalty Relief — Combined Report"),
            React.createElement("div", { style:{fontSize:13,color:"#888",marginTop:2} }, proInfo.firmName+" · "+today())
          ),
          React.createElement("button", { style: s.btnSm, onClick:function(){window.print();} }, "🖨️ Print Report")
        ),
        React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12} },
          [["Clients Analyzed",done.length],["With Waivable Penalties",withPenalties.length],["Total at Issue",fmt(totalWaivable)],["Avg per Client",fmt(withPenalties.length?totalWaivable/withPenalties.length:0)]].map(function([label,val],i) {
            return React.createElement("div", { key:i, style:{background:i===2?"#f0fdf4":"#f8f6f1",border:"1px solid "+(i===2?"#7ec11f":"#e8e4dc"),borderRadius:8,padding:"12px 14px",textAlign:"center"} },
              React.createElement("div", { style:{fontSize:i===2?20:18,fontWeight:"bold",color:i===2?"#15803d":"#1a2d5a",marginBottom:4} }, val),
              React.createElement("div", { style:{fontSize:11,color:"#888"} }, label)
            );
          })
        )
      ),

      // Client table
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Client Summary"),
        React.createElement("table", { style:{width:"100%",borderCollapse:"collapse",fontSize:13} },
          React.createElement("thead", null,
            React.createElement("tr", { style:{borderBottom:"2px solid #1a2d5a"} },
              ["Client","Tax Year","Penalties Found","§6751(b)","Notice 2022-36","Amount at Issue","Status"].map(function(h) {
                return React.createElement("th", { key:h, style:{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:"bold",color:"#1a2d5a",letterSpacing:0.3} }, h);
              })
            )
          ),
          React.createElement("tbody", null,
            done.map(function(c, i) {
              const f = c.findings;
              const waivable = (f.penalties||[]).filter(function(p){return p.waivable;});
              const has6751 = waivable.some(function(p){return p.in_covid_window;});
              const has2236 = waivable.some(function(p){return p.notice_2022_36_eligible;});
              return React.createElement("tr", { key:i, style:{borderBottom:"1px solid #f0ede8",background:i%2===0?"#fff":"#fafafa"} },
                React.createElement("td", { style:{padding:"10px 12px",fontWeight:"bold",color:"#1a2d5a"} }, c.taxInfo.clientName || "Client "+(i+1)),
                React.createElement("td", { style:{padding:"10px 12px",color:"#555"} }, f.tax_year),
                React.createElement("td", { style:{padding:"10px 12px"} }, waivable.length + " waivable"),
                React.createElement("td", { style:{padding:"10px 12px"} }, has6751 ? "✅" : "—"),
                React.createElement("td", { style:{padding:"10px 12px"} }, has2236 ? "✅" : "—"),
                React.createElement("td", { style:{padding:"10px 12px",fontWeight:"bold",color:f.total_at_issue>0?"#dc2626":"#888"} }, f.total_at_issue>0?fmt(f.total_at_issue):"None"),
                React.createElement("td", { style:{padding:"10px 12px"} },
                  React.createElement("span", { style: s.badge(f.total_at_issue>0?"#15803d":"#888",f.total_at_issue>0?"#f0fdf4":"#f8f6f1") },
                    f.total_at_issue>0?"Eligible":"No Relief"
                  )
                )
              );
            }),
            // Totals row
            React.createElement("tr", { style:{borderTop:"2px solid #1a2d5a",background:"#f0f7ff"} },
              React.createElement("td", { colSpan:5, style:{padding:"10px 12px",fontWeight:"bold",color:"#1a2d5a"} }, "TOTALS — "+done.length+" clients"),
              React.createElement("td", { style:{padding:"10px 12px",fontWeight:"bold",color:"#15803d",fontSize:15} }, fmt(totalWaivable)),
              React.createElement("td", { style:{padding:"10px 12px"} })
            )
          )
        )
      ),

      // Per-client detail
      React.createElement("div", { style: s.card },
        React.createElement("h2", { style: s.h2 }, "Client Detail"),
        done.filter(function(c){return c.findings.total_at_issue>0;}).map(function(c,i) {
          const f = c.findings;
          const waivable = (f.penalties||[]).filter(function(p){return p.waivable;});
          return React.createElement("div", { key:i, style:{borderBottom:i<withPenalties.length-1?"1px solid #f0ede8":"none",paddingBottom:16,marginBottom:16} },
            React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8} },
              React.createElement("div", null,
                React.createElement("div", { style:{fontWeight:"bold",fontSize:15,color:"#1a2d5a"} }, c.taxInfo.clientName || "Client "+(i+1)),
                React.createElement("div", { style:{fontSize:12,color:"#888"} }, "Tax Year "+f.tax_year+(c.taxInfo.ssn?" · SSN "+c.taxInfo.ssn:""))
              ),
              React.createElement("div", { style:{fontWeight:"bold",fontSize:16,color:"#15803d"} }, fmt(f.total_at_issue))
            ),
            React.createElement("div", { style:{display:"flex",gap:6,flexWrap:"wrap"} },
              waivable.map(function(p,pi) {
                return React.createElement("div", { key:pi, style:{background:"#f8f6f1",border:"1px solid #e8e4dc",borderRadius:7,padding:"6px 12px",fontSize:12} },
                  React.createElement("span", { style:{fontWeight:"bold",color:"#1a2d5a"} }, "TC "+p.code),
                  " · "+p.date+" · ",
                  React.createElement("span", { style:{color:"#dc2626",fontWeight:"bold"} }, fmt(p.amount))
                );
              })
            )
          );
        })
      ),

      // Footer
      React.createElement("div", { style:{background:"#f8f6f1",border:"1px solid #e8e4dc",borderRadius:8,padding:"14px 18px",fontSize:12,color:"#888",lineHeight:1.7} },
        "Report prepared by ",React.createElement("strong",null,proInfo.proName||"Tax Professional")," · ",proInfo.firmName," · ",today(),". ",
        "This report is for professional use only and does not constitute legal advice. Penalty relief is not guaranteed. IRS may deny abatement requests. For informational and workflow purposes only."
      )
    );
  }

  /* ── Render ── */
  return React.createElement("div", { style: s.page },
    React.createElement(Nav, { user }),
    React.createElement("div", { style: s.wrap },
      React.createElement(TabBar, null),
      /* Credits bar */
      credits && React.createElement("div", { style:{background:"#fff",border:"1px solid #e8e4dc",borderRadius:10,padding:"12px 18px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10} },
        React.createElement("div", { style:{display:"flex",alignItems:"center",gap:16} },
          React.createElement("div", null,
            React.createElement("div", { style:{fontSize:11,fontWeight:"bold",color:"#888",letterSpacing:0.5,marginBottom:2} }, "LETTER CREDITS"),
            React.createElement("div", { style:{fontSize:20,fontWeight:"bold",color:credits.remaining>0?"#15803d":"#dc2626"} },
              credits.is_admin ? "∞ Admin" : credits.remaining + " remaining"
            )
          ),
          credits.remaining > 0 && !credits.is_admin && React.createElement("div", { style:{fontSize:12,color:"#888"} }, credits.used + " used of " + credits.total + " total")
        ),
        !credits.is_admin && React.createElement("button", { style:{...s.btnGreen,padding:"8px 18px",fontSize:13}, onClick:function(){setBuyModal(true);} }, "+ Purchase Credits")
      ),

      /* Buy credits modal */
      buyModal && React.createElement("div", { style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16} },
        React.createElement("div", { style:{background:"#fff",borderRadius:14,padding:"28px 32px",maxWidth:520,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"} },
          React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20} },
            React.createElement("div", { style:{fontWeight:"bold",fontSize:18,color:"#1a2d5a"} }, "Purchase Letter Credits"),
            React.createElement("button", { onClick:function(){setBuyModal(false);}, style:{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#888"} }, "×")
          ),

          /* Member type selector */
          React.createElement("div", { style:{marginBottom:18} },
            React.createElement("div", { style:{fontSize:12,fontWeight:"bold",color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:0.4} }, "Your Member Type"),
            React.createElement("div", { style:{display:"flex",gap:8} },
              [["referral","Referral Member","$75/letter"],["pro","Pro Subscriber","$50/letter"]].map(function(item) {
                return React.createElement("button", { key:item[0], onClick:function(){setMemberType(item[0]);}, style:{flex:1,padding:"10px 14px",border:"2px solid "+(memberType===item[0]?"#1a2d5a":"#e8e4dc"),borderRadius:8,background:memberType===item[0]?"#1a2d5a":"#fff",cursor:"pointer",textAlign:"left"} },
                  React.createElement("div", { style:{fontWeight:"bold",fontSize:13,color:memberType===item[0]?"#7ec11f":"#1a2d5a"} }, item[1]),
                  React.createElement("div", { style:{fontSize:11,color:memberType===item[0]?"#cce8a0":"#888",marginTop:2} }, item[2])
                );
              })
            )
          ),

          /* Tier options */
          React.createElement("div", { style:{marginBottom:20} },
            React.createElement("div", { style:{fontSize:12,fontWeight:"bold",color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:0.4} }, "Select Bundle"),
            [
              {tier:"1", ref_price:"$75", pro_price:"$50", credits:1, label:"1 Letter", per:"per letter"},
              {tier:"5", ref_price:"$375", pro_price:"$250", credits:5, label:"5 Letters", per:"$"+Math.round((memberType==="pro"?25000:37500)/5/100)+"/letter"},
              {tier:"10", ref_price:"$750", pro_price:"$500", credits:10, label:"10 Letters", per:"$"+Math.round((memberType==="pro"?50000:75000)/10/100)+"/letter"},
            ].map(function(opt) {
              const price = memberType === "pro" ? opt.pro_price : opt.ref_price;
              return React.createElement("div", { key:opt.tier, style:{border:"1px solid #e8e4dc",borderRadius:9,padding:"14px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"} },
                React.createElement("div", null,
                  React.createElement("div", { style:{fontWeight:"bold",fontSize:15,color:"#1a2d5a"} }, opt.label),
                  React.createElement("div", { style:{fontSize:12,color:"#888"} }, opt.per)
                ),
                React.createElement("div", { style:{display:"flex",alignItems:"center",gap:12} },
                  React.createElement("div", { style:{fontWeight:"bold",fontSize:17,color:"#1a2d5a"} }, price),
                  React.createElement("button", { style:{...s.btnGreen,padding:"8px 16px",fontSize:13,opacity:buying?0.6:1}, onClick:function(){buyCredits(opt.tier);}, disabled:buying },
                    buying ? "..." : "Buy →"
                  )
                )
              );
            })
          ),

          React.createElement("div", { style:{background:"#f8f6f1",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#888",lineHeight:1.7} },
            "⚠️ Credits are non-refundable and never expire. One credit is consumed per generated letter. Admin accounts have unlimited access."
          )
        )
      ),

      tab === "setup" && React.createElement(SetupTab, null),
      tab === "batch" && React.createElement(BatchTab, null),
      tab === "report" && React.createElement(ReportTab, null)
    )
  );
}

/* ── Helpers ── */
function loading(msg) {
  return React.createElement("div", { style:{fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#888",fontSize:15} }, msg);
}
function gate(msg, href) {
  return React.createElement("div", { style:{fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:16,padding:24} },
    React.createElement("div", { style:{fontSize:40} }, "🔒"),
    React.createElement("p", { style:{color:"#555",fontSize:15,textAlign:"center"} }, msg),
    React.createElement("a", { href, style:{background:"#1a2d5a",color:"#7ec11f",border:"2px solid #7ec11f",borderRadius:8,padding:"10px 22px",textDecoration:"none",fontWeight:"bold",fontSize:14} }, "Continue")
  );
}

window.CovidPenaltyPro = CovidPenaltyPro;
