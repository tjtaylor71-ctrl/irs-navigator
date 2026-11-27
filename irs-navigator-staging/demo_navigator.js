const { useState, useEffect, useRef, useCallback, useMemo } = React;

function NavigatorDemo() {
  const [step, setStep] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const [arrowPos, setArrowPos] = React.useState({ x: 0, y: 0, visible: false });
  const scenario = {
    name: "Patricia Monroe",
    situation: "Received IRS Notice CP504 \u2014 Final Notice of Intent to Levy",
    amount: "$12,847",
    year: "2022"
  };
  const steps = [
    {
      id: "home",
      title: "Step 1 \u2014 Start on the Home Screen",
      narration: `Patricia just received a CP504 notice in the mail. She's scared and doesn't know what it means. She logs into IRS Pilot and lands on the home screen.`,
      arrow: "Click 'I Got an IRS Letter or Notice'",
      highlight: "letter-btn",
      screen: "home"
    },
    {
      id: "lookup",
      title: "Step 2 \u2014 Enter the Notice Number",
      narration: `She types CP504 into the notice lookup. IRS Pilot immediately identifies it as a Final Notice Before Levy \u2014 one of the most urgent IRS letters.`,
      arrow: "Type CP504 and press Look Up",
      highlight: "notice-input",
      screen: "lookup"
    },
    {
      id: "result",
      title: "Step 3 \u2014 Plain-English Explanation",
      narration: `IRS Pilot explains exactly what CP504 means, the 30-day deadline, what happens if she ignores it, and what her options are \u2014 in plain language, no tax jargon.`,
      arrow: "Read the notice explanation",
      highlight: "notice-result",
      screen: "result"
    },
    {
      id: "deadline",
      title: "Step 4 \u2014 Deadline Warning",
      narration: `A prominent deadline counter shows her exactly how many days remain before the IRS can levy her bank account or wages. She knows she must act this week.`,
      arrow: "Deadline countdown visible",
      highlight: "deadline-box",
      screen: "result"
    },
    {
      id: "options",
      title: "Step 5 \u2014 Resolution Options",
      narration: `Based on CP504, IRS Pilot presents her specific resolution paths: request a Collection Due Process hearing, set up an installment agreement, or explore Currently Not Collectible status.`,
      arrow: "Review resolution options",
      highlight: "options-box",
      screen: "result"
    },
    {
      id: "letter",
      title: "Step 6 \u2014 Generate an IRS Response Letter",
      narration: `She clicks the Letter Generator. IRS Pilot drafts a professional response letter on her behalf \u2014 requesting a Collection Due Process hearing and an immediate hold on collection.`,
      arrow: "Click 'Generate Letter'",
      highlight: "letter-gen",
      screen: "letter"
    },
    {
      id: "done",
      title: "Step 7 \u2014 She's Ready to Act",
      narration: `In under 15 minutes, Patricia went from panicked to prepared. She has a plain-English explanation of her situation, her deadline, her options, and a letter ready to send. All from IRS Pilot.`,
      arrow: null,
      highlight: null,
      screen: "done"
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
    home: /* @__PURE__ */ React.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#dc2626", letterSpacing: 1, marginBottom: 8 } }, "\u26A0 TIME-SENSITIVE \u2014 IRS DEADLINES DO NOT WAIT"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 27, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, "Don't Face the IRS Alone"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: "#666", lineHeight: 1.5 } }, "Every day you wait, penalties and interest grow.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { id: "letter-btn", style: {
      flex: 1,
      padding: "14px 10px",
      background: step === 0 ? "#7ec11f" : "#1a2d5a",
      border: step === 0 ? "2px solid #5a9b14" : "2px solid #7ec11f",
      borderRadius: 10,
      cursor: "pointer",
      textAlign: "center",
      boxShadow: step === 0 ? "0 0 0 4px rgba(126,193,31,0.3)" : "none",
      transition: "all 0.3s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 30, marginBottom: 4 } }, "\u{1F4EC}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: step === 0 ? "#1a2d5a" : "#7ec11f" } }, "I Got an IRS Letter or Notice")), /* @__PURE__ */ React.createElement("div", { style: {
      flex: 1,
      padding: "14px 10px",
      background: "#1a2d5a",
      border: "2px solid #444",
      borderRadius: 10,
      cursor: "pointer",
      textAlign: "center"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 30, marginBottom: 4 } }, "\u{1F525}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#aaa" } }, "I Have a Tax Problem"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: 8, padding: 12, border: "1px solid #e8e4dc" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, "\u26A1 How This Tool Works \u2014 3 Steps"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 } }, ["\u{1F50D} Identify", "\u{1F4CB} Complete Intake", "\u{1F4DE} Take Action"].map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fff", borderRadius: 6, padding: 8, textAlign: "center", fontSize: 15, color: "#555" } }, s))))),
    lookup: /* @__PURE__ */ React.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 21, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "\u{1F50D} IRS Notice Lookup"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, color: "#888", marginBottom: 10 } }, "Enter your notice number to get an immediate plain-English explanation."), /* @__PURE__ */ React.createElement("div", { id: "notice-input", style: {
      display: "flex",
      gap: 8,
      border: step === 1 ? "2px solid #7ec11f" : "2px solid #e8e4dc",
      borderRadius: 8,
      padding: 3,
      boxShadow: step === 1 ? "0 0 0 3px rgba(126,193,31,0.2)" : "none",
      transition: "all 0.3s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px 12px", fontSize: 21, color: step >= 1 ? "#1a2d5a" : "#bbb", fontWeight: step >= 1 ? "bold" : "normal" } }, step >= 1 ? "CP504" : "CP___, LT___, Notice 1058..."), /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 14px", background: "#1a2d5a", color: "#7ec11f", borderRadius: 6, fontSize: 18, fontWeight: "bold", cursor: "pointer" } }, "Look Up \u2192"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 10, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, color: "#92400e", fontWeight: "bold" } }, "\u{1F4CB} Common Notices"), ["CP14 \u2014 Balance Due", "CP504 \u2014 Final Notice Before Levy", "LT11 \u2014 Intent to Seize"].map((n, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 16, color: "#92400e", padding: "3px 0", borderTop: i > 0 ? "1px solid #fde68a" : "none", marginTop: i > 0 ? 3 : 4 } }, n)))),
    result: /* @__PURE__ */ React.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ React.createElement("div", { id: "notice-result", style: {
      background: "#7f1d1d",
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      border: step === 2 ? "2px solid #ef4444" : "2px solid transparent",
      boxShadow: step === 2 ? "0 0 0 3px rgba(239,68,68,0.2)" : "none",
      transition: "all 0.3s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#fca5a5", fontSize: 15, fontWeight: "bold", letterSpacing: 1 } }, "CP504 \u2014 FINAL NOTICE BEFORE LEVY"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 20, fontWeight: "bold", margin: "4px 0" } }, "This is serious. The IRS is about to seize your assets."), /* @__PURE__ */ React.createElement("div", { style: { color: "#fca5a5", fontSize: 16, lineHeight: 1.5 } }, "The CP504 is the IRS's final warning before they issue a levy \u2014 seizing your bank account, wages, or other assets. You have 30 days from the date of this notice to respond.")), /* @__PURE__ */ React.createElement("div", { id: "deadline-box", style: {
      background: "#1a2d5a",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      border: step === 3 ? "2px solid #7ec11f" : "2px solid transparent",
      boxShadow: step === 3 ? "0 0 0 3px rgba(126,193,31,0.2)" : "none",
      transition: "all 0.3s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 15, fontWeight: "bold", letterSpacing: 1 } }, "\u23F0 YOUR DEADLINE"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 18, marginTop: 2 } }, "Respond or arrange payment within 30 days")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#ef4444", fontSize: 33, fontWeight: "bold" } }, "18"), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 15 } }, "days left")))), /* @__PURE__ */ React.createElement("div", { id: "options-box", style: {
      background: "#f8f6f1",
      borderRadius: 8,
      padding: 10,
      border: step === 4 ? "2px solid #7ec11f" : "1px solid #e8e4dc",
      boxShadow: step === 4 ? "0 0 0 3px rgba(126,193,31,0.2)" : "none",
      transition: "all 0.3s"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, "Your Resolution Options"), [
      "Pay the balance in full to stop further collection",
      "Set up an Installment Agreement online at IRS.gov (balance under $50,000) \u2014 no phone call required",
      "Call IRS at 1-800-829-1040 to request an Installment Agreement if balance is $50,000 or above",
      "Request Currently Not Collectible (CNC) status if genuinely unable to pay",
      "Note: CDP hearing rights attach with the Final Notice (LT11/CP90/Letter 1058) \u2014 not CP504"
    ].map((o, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, fontSize: 16, color: "#555", padding: "4px 0", borderTop: i > 0 ? "1px solid #e8e4dc" : "none" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold" } }, "\u2713"), o)))),
    letter: /* @__PURE__ */ React.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ React.createElement("div", { id: "letter-gen", style: {
      background: "#1a2d5a",
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      border: step === 5 ? "2px solid #7ec11f" : "2px solid transparent",
      boxShadow: step === 5 ? "0 0 0 3px rgba(126,193,31,0.2)" : "none"
    } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 15, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 } }, "\u2709\uFE0F IRS RESPONSE LETTER GENERATOR"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 18, marginBottom: 8 } }, "Generate a professional letter to the IRS based on your CP504."), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(126,193,31,0.15)", borderRadius: 6, padding: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 15, marginBottom: 4 } }, "Letter Type Selected:"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 18, fontWeight: "bold" } }, "Installment Agreement Request")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 6, padding: 10, fontSize: 15, color: "#333", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", marginBottom: 4 } }, "RE: Request for Installment Agreement \u2014 CP504"), "Dear IRS Collections Division,", /* @__PURE__ */ React.createElement("br", null), "I am writing in response to CP504 dated [Date] regarding tax year 2022. I am requesting an installment agreement to resolve the balance of $12,847. I am prepared to provide financial information...", /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", marginTop: 4 } }, "[Letter continues...]")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6, padding: "5px 8px", marginTop: 6, fontSize: 14, color: "#92400e" } }, "\u2139 CDP hearing rights attach only with Final Notice (LT11, CP90, Letter 1058) \u2014 not CP504")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px", background: "#7ec11f", borderRadius: 6, textAlign: "center", fontSize: 16, fontWeight: "bold", color: "#1a2d5a", cursor: "pointer" } }, "\u2B07 Download Letter"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "8px", background: "transparent", border: "1px solid #7ec11f", borderRadius: 6, textAlign: "center", fontSize: 16, color: "#7ec11f", cursor: "pointer" } }, "\u{1F5A8} Print"))),
    done: /* @__PURE__ */ React.createElement("div", { style: { padding: 20, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 72, marginBottom: 12 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Patricia is Ready to Act"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "In under 15 minutes she went from panicked to prepared \u2014 with a plain-English explanation, her exact deadline, her resolution options, and a professional IRS letter ready to send."), /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 8, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#15803d", marginBottom: 6 } }, "What she accomplished with IRS Pilot Navigator:"), ["Identified her notice (CP504) and its urgency", "Understood the 30-day window to respond", "Learned her correct options: pay, installment agreement, or CNC", "Generated an installment agreement request letter"].map((a, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 16, color: "#15803d", textAlign: "left", padding: "3px 0" } }, "\u2713 ", a))))
  };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 20px", borderBottom: "3px solid #7ec11f", display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 36, height: 36, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 21 } }, "IRS Pilot Navigator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 15, letterSpacing: 1 } }, "INTERACTIVE DEMO"))), /* @__PURE__ */ React.createElement("a", { href: "/tax-professionals", style: { color: "#aaa", fontSize: 18, textDecoration: "none", border: "1px solid #444", padding: "4px 10px", borderRadius: 6 } }, "\u2190 Back")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderBottom: "1px solid #e8e4dc", padding: "12px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 4 } }, "DEMO SCENARIO"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a" } }, scenario.name, " \u2014 ", scenario.situation), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, color: "#888", marginTop: 2 } }, "Balance owed: ", scenario.amount, " \xB7 Tax year: ", scenario.year)), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 800, margin: "0 auto", padding: "20px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 280px", minWidth: 260 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", borderRadius: 28, padding: "12px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 6, background: "#333", borderRadius: 3, margin: "0 auto 10px" } }), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: 18, overflow: "hidden", minHeight: 420, position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "8px 12px", borderBottom: "2px solid #7ec11f", display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "", style: { width: 24, height: 24, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 16, fontWeight: "bold" } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 14, marginLeft: "auto", letterSpacing: 0.5 } }, "NAVIGATOR")), /* @__PURE__ */ React.createElement("div", { style: { opacity: animating ? 0 : 1, transition: "opacity 0.3s" } }, screens[current.screen])), /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", background: "#333", margin: "10px auto 0", border: "2px solid #555" } }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 240 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" } }, steps.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, onClick: () => goTo(i), style: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    cursor: "pointer",
    background: i === step ? "#7ec11f" : i < step ? "#1a2d5a" : "#e8e4dc",
    color: i === step ? "#1a2d5a" : i < step ? "#7ec11f" : "#aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: "bold",
    transition: "all 0.3s",
    boxShadow: i === step ? "0 0 0 3px rgba(126,193,31,0.3)" : "none"
  } }, i + 1))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "2px solid #7ec11f", padding: 20, marginBottom: 16, opacity: animating ? 0 : 1, transition: "opacity 0.3s" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 6 } }, "STEP ", step + 1, " OF ", steps.length), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 10 } }, current.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, color: "#555", lineHeight: 1.7, marginBottom: current.arrow ? 14 : 0 } }, current.narration), current.arrow && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 8, padding: "8px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 27, animation: "bounceRight 1s ease-in-out infinite" } }, "\u2192"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: "#15803d", fontWeight: "bold" } }, current.arrow))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => goTo(Math.max(0, step - 1)),
      disabled: step === 0,
      style: { flex: 1, padding: "10px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 20, cursor: step === 0 ? "not-allowed" : "pointer", color: step === 0 ? "#ccc" : "#555" }
    },
    "\u2190 Previous"
  ), step < steps.length - 1 ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => goTo(step + 1),
      style: { flex: 2, padding: "10px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 20, cursor: "pointer" }
    },
    "Next Step \u2192"
  ) : /* @__PURE__ */ React.createElement("a", { href: "/demo-wizard", style: { flex: 2, padding: "10px", background: "#7ec11f", color: "#1a2d5a", border: "none", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 20, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" } }, "Try the Wizard Demo \u2192")), step > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => goTo(0), style: { background: "none", border: "none", color: "#aaa", fontSize: 16, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\u21BA Restart Demo"))))), /* @__PURE__ */ React.createElement("style", null, `
        @keyframes bounceRight {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
      `));
}
window.NavigatorDemo = NavigatorDemo;