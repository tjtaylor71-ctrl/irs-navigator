const { useState, useEffect, useRef, useCallback, useMemo } = React;

function PricingPage() {
  const [hoveredPlan, setHoveredPlan] = React.useState(null);
  const plans = [
    {
      id: "navigator",
      icon: "\u{1F9ED}",
      name: "IRS Navigator",
      price: 59,
      period: "7-day access",
      color: "#1a1a2e",
      accent: "#c8a96e",
      description: "Understand your IRS situation clearly and know exactly what to do next.",
      features: [
        "Look up any IRS notice by number",
        "Plain-English explanation of what it means",
        "Step-by-step guidance on what to do",
        "Collection sequence timeline",
        "Audit notice guidance",
        "All 10 situation paths (levies, OIC, PPIA, CNC, and more)",
        "CSED / statute of limitations calculator",
        "Pro tips from a licensed Enrolled Agent"
      ],
      cta: "Get Navigator Access",
      note: "Best for: Taxpayers who need to understand their situation before taking action."
    },
    {
      id: "wizard",
      icon: "\u{1F4CB}",
      name: "Financial Intake Wizard",
      price: 99,
      period: "7-day access",
      color: "#1e3a8a",
      accent: "#60a5fa",
      badge: "Most Popular",
      description: "Complete your IRS financial forms accurately \u2014 auto-filled and ready to submit.",
      features: [
        "9-step guided financial intake",
        "Auto-fills Form 433-F (ACS collections)",
        "Auto-fills Form 433-A (Revenue Officer)",
        "Auto-fills Form 433-A OIC (Offer in Compromise)",
        "Auto-fills Form 433-B (Business)",
        "Auto-fills Form 656 (OIC application)",
        "Live RCP (Reasonable Collection Potential) calculator",
        "Installment Agreement / PPIA / CNC recommendation",
        "ACS Call Prep guide with your actual numbers",
        "Save and resume progress across sessions"
      ],
      cta: "Get Wizard Access",
      note: "Best for: Taxpayers ready to complete financial disclosure forms and explore resolution options."
    },
    {
      id: "bundle",
      icon: "\u26A1",
      name: "Complete Bundle",
      price: 129,
      originalPrice: 158,
      period: "7-day access",
      color: "#7c2d12",
      accent: "#fb923c",
      badge: "Save $29",
      description: "Everything you need \u2014 from understanding your situation to completing every form.",
      features: [
        "Everything in IRS Navigator",
        "Everything in Financial Intake Wizard",
        "Full access to all 5 IRS forms",
        "Unified experience across both tools",
        "Priority support via consultation link"
      ],
      cta: "Get Complete Access",
      note: "Best for: Taxpayers who want the full picture \u2014 guidance and forms in one package."
    }
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh", color: "#1a1a2e" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", padding: "16px 24px", borderBottom: "3px solid #c8a96e" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("a", { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#c8a96e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Navigator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#c8a96e", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP"))), /* @__PURE__ */ React.createElement("a", { href: "/", style: { color: "#c8a96e", fontSize: 13, textDecoration: "none", border: "1px solid #c8a96e", padding: "6px 14px", borderRadius: 6 } }, "\u2190 Back to Home"))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 960, margin: "0 auto", padding: "48px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 48 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, marginBottom: 16 } }, "\u26A0 IRS DEADLINES DON'T WAIT \u2014 7-DAY ACCESS, ACT NOW"), /* @__PURE__ */ React.createElement("h1", { style: { fontSize: 36, fontWeight: "bold", margin: "0 0 12px", lineHeight: 1.2 } }, "Professional IRS Guidance.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#c8a96e" } }, "Without the Professional Price Tag.")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 17, color: "#555", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 } }, "Built by ", /* @__PURE__ */ React.createElement("strong", null, "Tyrone J. Taylor, EA"), " \u2014 a federally licensed Enrolled Agent and author of ", /* @__PURE__ */ React.createElement("em", null, "Stop IRS Collections"), ". Get the same guidance his clients pay for, at a fraction of the cost.")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 48, alignItems: "start" } }, plans.map((plan) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: plan.id,
      onMouseEnter: () => setHoveredPlan(plan.id),
      onMouseLeave: () => setHoveredPlan(null),
      style: {
        background: "#fff",
        borderRadius: 16,
        border: `2px solid ${hoveredPlan === plan.id ? plan.accent : "#e8e4dc"}`,
        overflow: "hidden",
        transition: "all 0.2s",
        transform: hoveredPlan === plan.id ? "translateY(-4px)" : "none",
        boxShadow: hoveredPlan === plan.id ? "0 12px 32px rgba(0,0,0,0.12)" : "none"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { background: plan.color, padding: "24px 24px 20px" } }, plan.badge && /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: plan.accent, color: plan.color, fontSize: 10, fontWeight: "bold", letterSpacing: 1, padding: "3px 10px", borderRadius: 20, marginBottom: 12 } }, plan.badge), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, plan.icon), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 18, marginBottom: 4 } }, plan.name), /* @__PURE__ */ React.createElement("div", { style: { color: plan.accent, fontSize: 13, marginBottom: 16, lineHeight: 1.5 } }, plan.description), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } }, plan.originalPrice && /* @__PURE__ */ React.createElement("span", { style: { color: "#888", fontSize: 18, textDecoration: "line-through" } }, "$", plan.originalPrice), /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontSize: 40, fontWeight: "bold" } }, "$", plan.price), /* @__PURE__ */ React.createElement("span", { style: { color: plan.accent, fontSize: 13 } }, plan.period))),
    /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 10, marginBottom: 20 } }, plan.features.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 10, fontSize: 13, color: "#333", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { color: plan.color, fontWeight: "bold", flexShrink: 0, fontSize: 15 } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 16, lineHeight: 1.5, borderTop: "1px solid #f0ede8", paddingTop: 12 } }, plan.note), /* @__PURE__ */ React.createElement(
      "button",
      {
        style: {
          width: "100%",
          padding: "14px",
          background: plan.color,
          color: plan.accent,
          border: `2px solid ${plan.accent}`,
          borderRadius: 8,
          fontSize: 15,
          fontWeight: "bold",
          fontFamily: "Georgia, serif",
          cursor: "pointer",
          transition: "all 0.2s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.background = plan.accent;
          e.currentTarget.style.color = plan.color;
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = plan.color;
          e.currentTarget.style.color = plan.accent;
        },
        onClick: () => alert("Stripe checkout coming soon! In the meantime, schedule a free consultation to get access.")
      },
      plan.cta,
      " \u2192"
    ))
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: 28, marginBottom: 32, display: "flex", gap: 20, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, flexShrink: 0 } }, "\u{1F6E1}\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 17, marginBottom: 6 } }, "Satisfaction Guarantee"), /* @__PURE__ */ React.createElement("div", { style: { color: "#555", fontSize: 14, lineHeight: 1.7 } }, "If you complete the intake wizard and find the tool didn't help you identify a clear path forward, contact us within 24 hours of purchase for a full refund. No questions asked. We're confident in the guidance \u2014 and we stand behind it."))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 40 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 20, marginBottom: 20, textAlign: "center" } }, "Common Questions"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, [
    { q: "Why 7 days?", a: "Most taxpayers who use this tool need it for a defined window \u2014 to respond to a notice, prepare for an ACS call, or complete a financial disclosure. Seven days is more than enough time to work through everything, and it keeps the cost low." },
    { q: "What happens after 7 days?", a: "Your access expires. Your saved data stays in your browser if you used the wizard. You can purchase again at any time if your situation changes." },
    { q: "Is this a substitute for hiring a tax professional?", a: "For straightforward cases \u2014 yes, this tool may be all you need. For complex situations (Revenue Officers, TFRP, large balances, criminal matters), we recommend a consultation. The home page lists specific warning signs." },
    { q: "Who built this?", a: "Tyrone J. Taylor, EA \u2014 an IRS Enrolled Agent, federally licensed to represent taxpayers before the IRS, and author of Stop IRS Collections. Every piece of guidance in this tool reflects real IRS resolution practice." },
    { q: "Can I get a free consultation instead?", a: "Yes. If you're not sure which option is right for you, schedule a free 15-minute consultation first." }
  ].map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, marginBottom: 6, color: "#1a1a2e" } }, "Q: ", item.q), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.6 } }, item.a))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", borderRadius: 12, padding: 28, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#c8a96e", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 } }, "NOT SURE WHERE TO START?"), /* @__PURE__ */ React.createElement("div", { style: { color: "#e8e4dc", fontSize: 16, marginBottom: 20, lineHeight: 1.6 } }, "Schedule a free 15-minute consultation with Tyrone J. Taylor, EA.", /* @__PURE__ */ React.createElement("br", null), "We'll identify your situation and recommend the right path forward."), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://www.calendly.com/taylor-tax-financial/tax-help",
      target: "_blank",
      rel: "noopener noreferrer",
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#c8a96e", color: "#1a1a2e", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, textDecoration: "none" }
    },
    "\u{1F4C5} Schedule Free Consultation \u2192"
  ))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "24px 16px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc", marginTop: 24 } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124 \xB7 This tool provides general information and does not constitute legal or tax advice."));
}
window.PricingPage = PricingPage;