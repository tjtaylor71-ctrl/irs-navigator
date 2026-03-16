const { useState, useEffect, useRef, useCallback, useMemo } = React;

function TaxProPage() {
  const [selectedProgram, setSelectedProgram] = React.useState("");
  const [formData, setFormData] = React.useState({
    name: "",
    firm: "",
    credential: "",
    email: "",
    phone: "",
    website: "",
    message: ""
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const set = (k, v) => setFormData((p) => ({ ...p, [k]: v }));
  const handleSubmit = async () => {
    setError("");
    if (!formData.name || !formData.email || !selectedProgram) {
      setError("Please fill in your name, email, and select a program.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/taxpro/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, program: selectedProgram })
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const d = await res.json();
        setError(d.error || "Something went wrong.");
      }
    } catch {
      setError("Network error \u2014 please try again.");
    }
    setSubmitting(false);
  };
  const inp = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    fontSize: 14,
    fontFamily: "Georgia, serif",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff"
  };
  const card = (selected, id, icon, title, price, desc) => /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setSelectedProgram(id),
      style: {
        background: selected === id ? "#1a2d5a" : "#fff",
        border: `2px solid ${selected === id ? "#7ec11f" : "#e8e4dc"}`,
        borderRadius: 14,
        padding: "24px",
        cursor: "pointer",
        transition: "all 0.2s",
        flex: 1
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 10 } }, icon),
    /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 17, color: selected === id ? "#7ec11f" : "#1a2d5a", marginBottom: 4 } }, title),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: selected === id ? "#7ec11f" : "#7ec11f", fontWeight: "bold", marginBottom: 10 } }, price),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: selected === id ? "#ccc" : "#666", lineHeight: 1.6 } }, desc),
    /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected === id ? "#7ec11f" : "#ddd"}`, background: selected === id ? "#7ec11f" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" } }, selected === id && /* @__PURE__ */ React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "#1a2d5a" } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: selected === id ? "#7ec11f" : "#999" } }, selected === id ? "Selected" : "Select this program"))
  );
  const faqItems = [
    { q: "Do I need to be a licensed tax professional to join?", a: "No license is required for the referral program \u2014 anyone can refer clients and earn commissions. The pro subscription is designed for tax professionals who want to offer IRS resolution tools to their clients under their own brand." },
    { q: "How quickly are referral commissions paid?", a: "Commissions are tracked automatically and paid manually by Taylor Tax and Financial Consulting Inc. We process payouts monthly. You'll see your pending balance in your referral dashboard at any time." },
    { q: "Can I do both programs at the same time?", a: "Yes. You can refer clients for commission AND have a pro subscription. Many partners use their referral link to send clients to the IRS Pilot pricing page while also offering the white-label tool directly." },
    { q: "What credentials show on the white-label version?", a: "Your firm name, your name (with credentials), your phone number, and your Calendly scheduling link. Your clients will never see IRS Pilot or Tyrone J. Taylor's name anywhere." },
    { q: "What happens when a client's 24-hour session expires?", a: "They can return to your shareable link at any time to start a new session. Each new session counts against your monthly allowance of 10 sessions. Additional sessions are $5 each." },
    { q: "What if I need more than 10 client sessions per month?", a: "We charge $5 per additional session, billed at the end of each month. There's no cap \u2014 you can use as many sessions as your clients need." },
    { q: "How long does setup take?", a: "Once you express interest and we verify your information, setup is typically completed within 1 business day. You'll receive your shareable link or referral code by email." }
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("a", { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 44, height: 44, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP"))), /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { color: "#7ec11f", fontSize: 13, textDecoration: "none", border: "1px solid #7ec11f", padding: "6px 14px", borderRadius: 6 } }, "\u{1F4B3} Pricing"))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "56px 24px 48px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-block", background: "#7ec11f", color: "#1a2d5a", fontSize: 11, fontWeight: "bold", letterSpacing: 1.5, padding: "4px 14px", borderRadius: 20, marginBottom: 18 } }, "FOR TAX PROFESSIONALS"), /* @__PURE__ */ React.createElement("h1", { style: { fontSize: 38, fontWeight: "bold", color: "#fff", margin: "0 0 14px", lineHeight: 1.2 } }, "Turn IRS Problems Into", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "Revenue Opportunities")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 16, color: "#aaa", maxWidth: 580, margin: "0 auto 24px", lineHeight: 1.7 } }, "Two programs designed for tax professionals \u2014 refer clients and earn commissions, or offer IRS Pilot under your own brand to your clients directly."), /* @__PURE__ */ React.createElement("a", { href: "#signup", style: { display: "inline-block", padding: "13px 28px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 15, textDecoration: "none" } }, "Get Started \u2192")), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 900, margin: "0 auto", padding: "48px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 32 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 26, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Choose Your Program"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 15 } }, "Or do both \u2014 many partners use them together.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "24px 24px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F517}"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 20, marginBottom: 4 } }, "Referral Program"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 14, marginBottom: 12 } }, "Free to join \xB7 No monthly fee"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 32, fontWeight: "bold" } }, "20%", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: "normal" } }, " per sale"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "Share your unique referral link with clients who have IRS issues you're not handling. When they purchase, you earn 20% automatically \u2014 tracked and recorded in your dashboard."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 8, marginBottom: 16 } }, [
    "Navigator sale ($59) \u2192 you earn $11.80",
    "Wizard sale ($99) \u2192 you earn $19.80",
    "Bundle sale ($129) \u2192 you earn $25.80",
    "30-day referral cookie tracking",
    "Real-time dashboard to track conversions",
    "Monthly commission payouts",
    "No cap on earnings"
  ].map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 13, color: "#333" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0 } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", fontStyle: "italic", borderTop: "1px solid #f0ede8", paddingTop: 12 } }, "Best for: Professionals who want to monetize client referrals with zero overhead."))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: "#fff", borderRadius: 14, border: "2px solid #7ec11f", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "8px 24px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: "bold", color: "#1a2d5a", background: "#7ec11f", padding: "2px 12px", borderRadius: 20, letterSpacing: 1 } }, "MOST POPULAR")), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F3E2}"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 20, marginBottom: 4 } }, "Pro Subscription"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 14, marginBottom: 12 } }, "White-label \xB7 Your branding"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 32, fontWeight: "bold" } }, "$49", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: "normal" } }, "/mo")), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 13 } }, "first 3 months, then $79/mo"))), /* @__PURE__ */ React.createElement("div", { style: { padding: "20px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "Offer IRS Pilot to your clients under your firm's name and brand. Your clients click your unique link and see your name, phone, and Calendly \u2014 not ours."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 8, marginBottom: 16 } }, [
    "Your firm name in the app header",
    "Your contact info and scheduling link",
    "Full Navigator + Wizard for clients",
    "10 client sessions per month included",
    "Additional sessions at $5 each",
    "24-hour client sessions (no client login needed)",
    "Unique shareable link for your clients",
    "Intro price: $49/month for first 3 months",
    "Standard price: $79/month thereafter"
  ].map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 13, color: "#333" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0 } }, "\u2713"), f))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", fontStyle: "italic", borderTop: "1px solid #f0ede8", paddingTop: 12 } }, "Best for: Professionals who want to offer a branded IRS tool directly to their client base.")))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "32px", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 20 } }, "\u{1F517} How the Referral Program Works"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 } }, [
    { step: "1", title: "Sign up", desc: "Create a free account and join the referral program. You'll get a unique 8-character referral code instantly." },
    { step: "2", title: "Share your link", desc: "Send your referral link (irspilot.com/refer/YOURCODE) to any client with an IRS issue you're not handling." },
    { step: "3", title: "Client purchases", desc: "If they buy within 30 days of clicking your link, the sale is credited to you automatically." },
    { step: "4", title: "You earn 20%", desc: "Commissions are tracked in your dashboard and paid out monthly. No paperwork, no chasing invoices." }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.step, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 44, height: 44, borderRadius: "50%", background: "#1a2d5a", color: "#7ec11f", fontWeight: "bold", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" } }, s.step), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a", marginBottom: 6 } }, s.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6 } }, s.desc))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "32px", marginBottom: 48 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 20 } }, "\u{1F3E2} How the Pro Subscription Works"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 } }, [
    { step: "1", title: "Express interest", desc: "Fill out the form below. We'll verify your information and set up your account within 1 business day." },
    { step: "2", title: "Get your link", desc: "We configure the app with your firm name, contact info, and Calendly link \u2014 then send you a unique shareable URL." },
    { step: "3", title: "Share with clients", desc: "Send your link to any client with an IRS problem. They click, get 24-hour access, and see your branding throughout." },
    { step: "4", title: "They call you", desc: "Every call-to-action in the tool shows your name, phone, and scheduling link. Clients come back to you, not us." }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.step, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 44, height: 44, borderRadius: "50%", background: "#1a2d5a", color: "#7ec11f", fontWeight: "bold", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" } }, s.step), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a", marginBottom: 6 } }, s.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.6 } }, s.desc))))), /* @__PURE__ */ React.createElement("div", { id: "signup", style: { background: "#fff", borderRadius: 14, border: "2px solid #7ec11f", padding: "36px", marginBottom: 48 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, "Express Interest"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, marginBottom: 28, marginTop: 0, lineHeight: 1.6 } }, "Tell us which program you're interested in and we'll reach out within 1 business day to get you set up."), submitted ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "32px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", marginBottom: 8 } }, "Thanks! We'll be in touch."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#666", lineHeight: 1.7 } }, "Tyrone J. Taylor, EA will reach out to your email within 1 business day to get your program set up.")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 10, color: "#1a2d5a" } }, "Which program are you interested in? *"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, [
    ["referral", "\u{1F517} Referral Program", "Free \xB7 Earn 20% commissions"],
    ["pro", "\u{1F3E2} Pro Subscription", "$49/mo intro \xB7 White-label"],
    ["both", "\u26A1 Both Programs", "Referral + Pro subscription"]
  ].map(([id, label, sub]) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: id,
      onClick: () => setSelectedProgram(id),
      style: { flex: 1, padding: "14px 16px", borderRadius: 10, border: `2px solid ${selectedProgram === id ? "#7ec11f" : "#e8e4dc"}`, background: selectedProgram === id ? "#1a2d5a" : "#fff", cursor: "pointer", textAlign: "center" }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: selectedProgram === id ? "#7ec11f" : "#1a2d5a", marginBottom: 4 } }, label),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: selectedProgram === id ? "#aaa" : "#888" } }, sub)
  )))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Full Name *"), /* @__PURE__ */ React.createElement("input", { value: formData.name, onChange: (e) => set("name", e.target.value), placeholder: "John Smith", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Credentials / Title"), /* @__PURE__ */ React.createElement("input", { value: formData.credential, onChange: (e) => set("credential", e.target.value), placeholder: "EA, CPA, Attorney, etc.", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Firm Name"), /* @__PURE__ */ React.createElement("input", { value: formData.firm, onChange: (e) => set("firm", e.target.value), placeholder: "Smith Tax Services", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Email Address *"), /* @__PURE__ */ React.createElement("input", { type: "email", value: formData.email, onChange: (e) => set("email", e.target.value), placeholder: "you@yourfirm.com", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Phone Number"), /* @__PURE__ */ React.createElement("input", { value: formData.phone, onChange: (e) => set("phone", e.target.value), placeholder: "(555) 123-4567", style: inp })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Website (optional)"), /* @__PURE__ */ React.createElement("input", { value: formData.website, onChange: (e) => set("website", e.target.value), placeholder: "www.yourfirm.com", style: inp }))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Anything else you'd like us to know?"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: formData.message,
      onChange: (e) => set("message", e.target.value),
      rows: 3,
      placeholder: "E.g. approximate number of IRS clients per month, questions about the programs...",
      style: { ...inp, resize: "vertical" }
    }
  )), error && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 } }, "\u26A0 ", error), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSubmit,
      disabled: submitting,
      style: { width: "100%", padding: "14px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 15, fontWeight: "bold", fontFamily: "Georgia, serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }
    },
    submitting ? "Submitting..." : "Submit Interest \u2192"
  ), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 12, fontSize: 12, color: "#aaa" } }, "We'll respond within 1 business day. No spam, ever."))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 48 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 20 } }, "Frequently Asked Questions"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 12 } }, faqItems.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fff", border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a", marginBottom: 6 } }, "Q: ", item.q), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#555", lineHeight: 1.6 } }, item.a))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 12, padding: "32px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 } }, "HAVE QUESTIONS FIRST?"), /* @__PURE__ */ React.createElement("div", { style: { color: "#e8e4dc", fontSize: 15, marginBottom: 20, lineHeight: 1.6 } }, "Schedule a 15-minute call with Tyrone J. Taylor, EA to discuss which program is right for your practice."), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://www.calendly.com/taylor-tax-financial/irspilotreferral",
      target: "_blank",
      rel: "noopener noreferrer",
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 15, textDecoration: "none" }
    },
    "\u{1F4C5} Schedule a Call \u2192"
  ))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "20px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc" } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124 \xB7 taylortaxandfinancial.com"));
}
window.TaxProPage = TaxProPage;