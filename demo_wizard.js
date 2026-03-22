const { useState, useEffect, useRef, useCallback, useMemo } = React;

function WizardDemo() {
  const [step, setStep] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const scenario = {
    name: "Robert Chen",
    situation: "Owes $34,200 in back taxes \u2014 exploring Offer in Compromise",
    income: "$4,800/mo",
    assets: "$12,000 equity"
  };
  const steps = [
    {
      title: "Step 1 \u2014 Enter Basic Information",
      narration: "Robert starts the 9-step Financial Intake Wizard. He enters his name, filing status, and the tax years he owes for. IRS Pilot saves his progress automatically in his browser.",
      arrow: "Fill in name and filing status",
      screen: "personal"
    },
    {
      title: "Step 2 \u2014 Monthly Income",
      narration: "He enters all sources of income \u2014 wages, self-employment, rental income. The wizard validates entries and flags anything that might affect his IRS resolution options.",
      arrow: "Enter all monthly income sources",
      screen: "income"
    },
    {
      title: "Step 3 \u2014 Monthly Expenses",
      narration: "Robert enters his monthly expenses. IRS Pilot automatically applies IRS National Standards and Local Standards \u2014 showing him exactly what the IRS will and won't allow.",
      arrow: "Enter expenses \u2014 IRS limits applied automatically",
      screen: "expenses"
    },
    {
      title: "Step 4 \u2014 Assets & Equity",
      narration: "He enters his assets: home equity, vehicles, bank accounts, retirement funds. IRS Pilot calculates net realizable value \u2014 the amount the IRS considers collectible from assets.",
      arrow: "Enter asset values",
      screen: "assets"
    },
    {
      title: "Step 5 \u2014 RCP Calculation",
      narration: "IRS Pilot calculates Robert's Reasonable Collection Potential \u2014 the minimum the IRS will accept for an Offer in Compromise. This single number determines whether he qualifies.",
      arrow: "Review your RCP calculation",
      screen: "rcp"
    },
    {
      title: "Step 6 \u2014 Form 433-F Auto-Filled",
      narration: "Every answer Robert provided is transferred directly into IRS Form 433-F \u2014 the Collection Information Statement. The form is complete, accurate, and ready to submit.",
      arrow: "Review auto-filled Form 433-F",
      screen: "form433f"
    },
    {
      title: "Step 7 \u2014 Form 433-A Auto-Filled",
      narration: "For his Offer in Compromise, IRS Pilot also auto-fills Form 433-A OIC \u2014 the more detailed financial statement required for OIC applications. No duplicate data entry.",
      arrow: "Review auto-filled Form 433-A OIC",
      screen: "form433a"
    },
    {
      title: "Step 8 \u2014 Form 656 Prepared",
      narration: "The Offer in Compromise application (Form 656) is pre-populated with Robert's calculated offer amount and reason for compromise. He reviews and confirms the figures.",
      arrow: "Review Form 656 \u2014 OIC Application",
      screen: "form656"
    },
    {
      title: "Step 9 \u2014 Download All Forms",
      narration: "Robert downloads his complete package \u2014 Forms 433-F, 433-A OIC, and 656 \u2014 all filled out, ready to submit to the IRS. The data is scheduled for secure deletion within 24 hours.",
      arrow: "Download your complete form package",
      screen: "download"
    }
  ];
  const goTo = (n) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStep(n);
      setAnimating(false);
    }, 300);
  };
  const current = steps[step];
  const screens = {
    personal: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 1 of 9 \u2014 Personal Information"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "11%", background: "#7ec11f", borderRadius: 2, transition: "width 0.5s" } })), [["Full Legal Name", "Robert Chen"], ["Filing Status", "Married Filing Jointly"], ["Tax Years Owed", "2020, 2021, 2022"], ["Total Balance", "$34,200"]].map(([label, val], i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: "bold", color: "#888", marginBottom: 3 } }, label.toUpperCase()), /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 6, padding: "7px 10px", fontSize: 12, color: "#1a2d5a", fontWeight: "bold" } }, val)))),
    income: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 2 of 9 \u2014 Monthly Income"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "22%", background: "#7ec11f", borderRadius: 2 } })), [["Wages (after tax)", "$3,800"], ["Self-employment", "$1,000"], ["Spouse income", "$0"], ["Other income", "$0"]].map(([label, val], i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e8e4dc", fontSize: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#555" } }, label), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "bold", color: "#1a2d5a" } }, val))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, fontWeight: "bold" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1a2d5a" } }, "Total Monthly Income"), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "$4,800"))),
    expenses: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 3 of 9 \u2014 Monthly Expenses"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "33%", background: "#7ec11f", borderRadius: 2 } })), [
      ["Housing (IRS allows)", "$1,800", "#15803d"],
      ["Food (IRS standard)", "$724", "#15803d"],
      ["Transportation", "$588", "#15803d"],
      ["Health insurance", "$320", "#15803d"],
      ["Clothing (entered: $400)", "$245 \u26A0", "#92400e"]
    ].map(([label, val, color], i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e8e4dc", fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#555" } }, label), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "bold", color } }, val))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6, padding: "6px 8px", marginTop: 8, fontSize: 10, color: "#92400e" } }, "\u26A0 IRS clothing standard applied \u2014 your actual amount exceeds the allowable limit.")),
    assets: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 4 of 9 \u2014 Assets & Equity"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "44%", background: "#7ec11f", borderRadius: 2 } })), [
      ["Home equity", "$12,000", "Quick sale value \xD7 80%"],
      ["Vehicle (2019 Honda)", "$4,800", "Quick sale value \xD7 80%"],
      ["Bank accounts", "$1,200", "Current balance"],
      ["401(k) (IRS portion)", "$0", "Penalty + tax offset applied"]
    ].map(([label, val, note], i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#555" } }, label), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "bold", color: "#1a2d5a" } }, val)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#aaa" } }, note))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #1a2d5a", fontSize: 12, fontWeight: "bold" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1a2d5a" } }, "Net Realizable Value"), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "$18,000"))),
    rcp: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 5 of 9 \u2014 RCP Calculation"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "55%", background: "#7ec11f", borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 8, padding: 12, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginBottom: 8 } }, "REASONABLE COLLECTION POTENTIAL"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", null, "Monthly disposable income \xD7 12"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fff" } }, "$3,024")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", null, "Net realizable asset value"), /* @__PURE__ */ React.createElement("span", { style: { color: "#fff" } }, "$18,000")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid #2a4d8a", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "bold" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "Minimum OIC Amount"), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "$21,024"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 6, padding: 8, fontSize: 10, color: "#15803d" } }, "\u2713 Robert owes $34,200 but his RCP is $21,024 \u2014 he may qualify to settle for $21,024 or slightly above.")),
    form433f: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 6 of 9 \u2014 Form 433-F"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "66%", background: "#7ec11f", borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1px solid #1a2d5a", borderRadius: 6, padding: 10, fontSize: 9, color: "#333", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 10, marginBottom: 4, color: "#1a2d5a" } }, "Form 433-F \u2014 Collection Information Statement"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 } }, [["1a. Name", "Robert Chen"], ["1b. SSN", "XXX-XX-XXXX"], ["3. Filing Status", "MFJ"], ["4. Total Income", "$4,800/mo"], ["5. Total Expenses", "$3,677/mo"], ["6. Net Difference", "$1,123/mo"]].map(([k, v], i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#f8f6f1", padding: "4px 6px", borderRadius: 3 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#888", fontSize: 8 } }, k), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 9 } }, v)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, padding: "4px 6px", background: "#f0fdf4", borderRadius: 3, border: "1px solid #7ec11f", fontSize: 9, color: "#15803d", fontWeight: "bold" } }, "\u2713 Auto-filled from your wizard responses \u2014 no re-entry required"))),
    form433a: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 7 of 9 \u2014 Form 433-A OIC"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "77%", background: "#7ec11f", borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1px solid #1a2d5a", borderRadius: 6, padding: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 10, marginBottom: 6, color: "#1a2d5a" } }, "Form 433-A OIC \u2014 Individual OIC Financial Statement"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#555", lineHeight: 1.6 } }, ["Section 1: Personal Information \u2713", "Section 2: Employment Information \u2713", "Section 3: Other Financial Information \u2713", "Section 4: Personal Asset Information \u2713", "Section 5: Monthly Income \u2713", "Section 6: Monthly Expenses \u2713"].map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { padding: "3px 0", borderBottom: "1px solid #f0ede8", color: "#15803d" } }, s))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 9, color: "#15803d", fontWeight: "bold", background: "#f0fdf4", padding: "4px 8px", borderRadius: 4 } }, "\u2713 All 6 sections auto-filled from your wizard data"))),
    form656: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Step 8 of 9 \u2014 Form 656"), /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "88%", background: "#7ec11f", borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1px solid #1a2d5a", borderRadius: 6, padding: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 10, marginBottom: 6, color: "#1a2d5a" } }, "Form 656 \u2014 Offer in Compromise"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#555", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", padding: "4px 6px", borderRadius: 3, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Tax periods:"), " ", /* @__PURE__ */ React.createElement("strong", null, "2020, 2021, 2022")), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", padding: "4px 6px", borderRadius: 3, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Basis for Offer:"), " ", /* @__PURE__ */ React.createElement("strong", null, "Doubt as to Collectibility")), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "6px 8px", borderRadius: 3, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#aaa", fontSize: 8 } }, "Offer Amount:"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontWeight: "bold", fontSize: 13 } }, "$21,024")), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", padding: "4px 6px", borderRadius: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#888" } }, "Payment terms:"), " ", /* @__PURE__ */ React.createElement("strong", null, "Lump sum (20% with application)"))))),
    download: /* @__PURE__ */ React.createElement("div", { style: { padding: 16, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "100%", background: "#7ec11f", borderRadius: 2 } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F4E6}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Your Form Package is Ready"), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 8, padding: 10, marginBottom: 12, textAlign: "left" } }, ["Form 433-F (Collection Information)", "Form 433-A OIC (OIC Financial Statement)", "Form 656 (Offer in Compromise Application)"].map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 11, color: "#1a2d5a", padding: "4px 0", borderBottom: i < 2 ? "1px solid #e8e4dc" : "none", display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px", background: "#7ec11f", borderRadius: 6, fontSize: 10, fontWeight: "bold", color: "#1a2d5a" } }, "\u2B07 Download All"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px", background: "transparent", border: "1px solid #1a2d5a", borderRadius: 6, fontSize: 10, color: "#1a2d5a" } }, "\u{1F5A8} Print")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#aaa", marginTop: 8 } }, "\u{1F512} Your data will be automatically deleted within 24 hours"))
  };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 20px", borderBottom: "3px solid #7ec11f", display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 36, height: 36, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 14 } }, "IRS Pilot Wizard"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "INTERACTIVE DEMO"))), /* @__PURE__ */ React.createElement("a", { href: "/demo-navigator", style: { color: "#aaa", fontSize: 12, textDecoration: "none", border: "1px solid #444", padding: "4px 10px", borderRadius: 6 } }, "\u2190 Navigator Demo")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderBottom: "1px solid #e8e4dc", padding: "12px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 4 } }, "DEMO SCENARIO"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, scenario.name, " \u2014 ", scenario.situation), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#888", marginTop: 2 } }, "Monthly income: ", scenario.income, " \xB7 Asset equity: ", scenario.assets)), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 800, margin: "0 auto", padding: "20px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 280px", minWidth: 260 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", borderRadius: 28, padding: "12px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 6, background: "#333", borderRadius: 3, margin: "0 auto 10px" } }), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: 18, overflow: "hidden", minHeight: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "8px 12px", borderBottom: "2px solid #7ec11f", display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "", style: { width: 24, height: 24, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 11, fontWeight: "bold" } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 9, marginLeft: "auto", letterSpacing: 0.5 } }, "WIZARD")), /* @__PURE__ */ React.createElement("div", { style: { opacity: animating ? 0 : 1, transition: "opacity 0.3s" } }, screens[current.screen])), /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", background: "#333", margin: "10px auto 0", border: "2px solid #555" } }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 240 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" } }, steps.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, onClick: () => goTo(i), style: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    cursor: "pointer",
    background: i === step ? "#7ec11f" : i < step ? "#1a2d5a" : "#e8e4dc",
    color: i === step ? "#1a2d5a" : i < step ? "#7ec11f" : "#aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: "bold",
    transition: "all 0.3s",
    boxShadow: i === step ? "0 0 0 3px rgba(126,193,31,0.3)" : "none"
  } }, i + 1))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "2px solid #7ec11f", padding: 20, marginBottom: 16, opacity: animating ? 0 : 1, transition: "opacity 0.3s" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 6 } }, "STEP ", step + 1, " OF ", steps.length), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#1a2d5a", marginBottom: 10 } }, current.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: current.arrow ? 14 : 0 } }, current.narration), current.arrow && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 8, padding: "8px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, animation: "bounceRight 1s ease-in-out infinite" } }, "\u2192"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#15803d", fontWeight: "bold" } }, current.arrow))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => goTo(Math.max(0, step - 1)),
      disabled: step === 0,
      style: { flex: 1, padding: "10px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer", color: step === 0 ? "#ccc" : "#555" }
    },
    "\u2190 Previous"
  ), step < steps.length - 1 ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => goTo(step + 1),
      style: { flex: 2, padding: "10px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer" }
    },
    "Next Step \u2192"
  ) : /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { flex: 2, padding: "10px", background: "#7ec11f", color: "#1a2d5a", border: "none", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" } }, "Get Full Access \u2192")), step > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => goTo(0), style: { background: "none", border: "none", color: "#aaa", fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\u21BA Restart Demo"))))), /* @__PURE__ */ React.createElement("style", null, `
        @keyframes bounceRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
      `));
}
window.WizardDemo = WizardDemo;