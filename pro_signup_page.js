const { useState, useEffect, useRef, useCallback, useMemo } = React;

function ProSignupPage() {
  const token = window.__PRO_SIGNUP_TOKEN__ || "";
  const prefill = window.__PRO_SIGNUP_PREFILL__ || {};
  const [step, setStep] = React.useState("form");
  const [form, setForm] = React.useState({
    firm_name: prefill.firm || "",
    contact_name: prefill.name || "",
    contact_phone: "",
    calendly_url: "",
    email: prefill.email || ""
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSubmit = async () => {
    setError("");
    if (!form.firm_name || !form.contact_name || !form.contact_phone || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pro-signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form })
      });
      const d = await res.json();
      if (res.ok) {
        setStep("done");
      } else {
        setError(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error \u2014 please try again.");
    }
    setSubmitting(false);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 40, height: 40, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 15 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "PRO SUBSCRIPTION SIGNUP")))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 560, margin: "40px auto", padding: "0 16px" } }, step === "invalid" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #fecaca" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("h2", { style: { color: "#dc2626", marginBottom: 12 } }, "Link Expired or Invalid"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", lineHeight: 1.7 } }, "This signup link has expired or has already been used. Please contact us at ", /* @__PURE__ */ React.createElement("a", { href: "mailto:info@taylortaxandfinancial.com", style: { color: "#1a2d5a" } }, "info@taylortaxandfinancial.com"), " for a new link.")), step === "done" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, padding: 32, textAlign: "center", border: "2px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\u2705"), /* @__PURE__ */ React.createElement("h2", { style: { color: "#1a2d5a", marginBottom: 12 } }, "You're Enrolled!"), /* @__PURE__ */ React.createElement("p", { style: { color: "#555", lineHeight: 1.7, marginBottom: 16 } }, "Welcome to IRS Pilot Pro. Your account is being configured and you will receive your branded client link within one business day."), /* @__PURE__ */ React.createElement("p", { style: { color: "#555", lineHeight: 1.7, fontSize: 13 } }, "Questions? Email ", /* @__PURE__ */ React.createElement("a", { href: "mailto:info@taylortaxandfinancial.com", style: { color: "#1a2d5a" } }, "info@taylortaxandfinancial.com"))), step === "form" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e8e4dc", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "20px 28px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 } }, "PRO SUBSCRIPTION ENROLLMENT"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 4 } }, "Complete Your Signup"), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 13 } }, "$49/month for first 3 months, then $79/month \xB7 Cancel anytime")), /* @__PURE__ */ React.createElement("div", { style: { padding: "28px" } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 24 } }, "Fill in your practice details below. We'll use this to configure your branded IRS Pilot experience. All fields marked * are required."), [
    { key: "firm_name", label: "Firm / Practice Name *", placeholder: "Taylor Tax and Financial Consulting Inc." },
    { key: "contact_name", label: "Your Full Name & Credentials *", placeholder: "Jane Smith, EA" },
    { key: "email", label: "Email Address *", placeholder: "you@yourfirm.com", type: "email" },
    { key: "contact_phone", label: "Phone Number *", placeholder: "(555) 123-4567", type: "tel" },
    { key: "calendly_url", label: "Calendly / Scheduling Link", placeholder: "https://calendly.com/yourname (optional)" }
  ].map((f) => /* @__PURE__ */ React.createElement("div", { key: f.key, style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 12, color: "#555", display: "block", marginBottom: 5 } }, f.label.toUpperCase()), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: f.type || "text",
      value: form[f.key],
      onChange: (e) => set(f.key, e.target.value),
      placeholder: f.placeholder,
      style: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 8, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#555", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "#1a2d5a" } }, "Subscription Terms:"), ' By clicking "Complete Enrollment" below, you agree to a month-to-month subscription at $49/month for the first 3 months, then $79/month. You will be billed every 30 days. You may cancel at any time by contacting info@taylortaxandfinancial.com. No long-term contract.'), error && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 } }, "\u26A0 ", error), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSubmit,
      disabled: submitting,
      style: { width: "100%", padding: 14, background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }
    },
    submitting ? "Processing..." : "Complete Enrollment \u2192"
  ), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 12, fontSize: 12, color: "#aaa" } }, "Questions? Email ", /* @__PURE__ */ React.createElement("a", { href: "mailto:info@taylortaxandfinancial.com", style: { color: "#888" } }, "info@taylortaxandfinancial.com"))))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "20px", color: "#aaa", fontSize: 12 } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124 \xB7", " ", /* @__PURE__ */ React.createElement("a", { href: "/terms", style: { color: "#aaa" } }, "Terms"), " \xB7", " ", /* @__PURE__ */ React.createElement("a", { href: "/privacy", style: { color: "#aaa" } }, "Privacy")));
}
window.ProSignupPage = ProSignupPage;