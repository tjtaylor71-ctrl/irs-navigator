const { useState, useEffect, useRef, useCallback, useMemo } = React;

function LoginPage() {
  const [mode, setMode] = React.useState(window.__LOGIN_MODE__ || "login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const product = window.__LOGIN_PRODUCT__ || null;
  const [previewCode, setPreviewCode] = React.useState("");
  const [previewMsg, setPreviewMsg] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const handleAccessCode = async () => {
    const token = previewCode.trim();
    if (!token) {
      setPreviewMsg("Please enter an access code.");
      return;
    }
    setPreviewLoading(true);
    setPreviewMsg("");
    try {
      const checkRes = await fetch("/api/check-access-code/" + encodeURIComponent(token));
      const checkData = await checkRes.json();
      if (checkData.type === "preview") {
        window.location.href = "/preview/" + token;
      } else if (checkData.type === "referral") {
        window.location.href = "/refer/" + token.toUpperCase();
      } else {
        setPreviewMsg("\u274C Invalid or expired code. Please check and try again.");
      }
    } catch {
      setPreviewMsg("\u274C Something went wrong. Please try again.");
    }
    setPreviewLoading(false);
  };
  const productLabels = {
    navigator: "IRS Pilot \u2014 $59 / 7 days",
    wizard: "Financial Intake Wizard \u2014 $99 / 7 days",
    bundle: "Complete Bundle \u2014 $129 / 7 days"
  };
  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, product })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      window.location.href = data.redirect || "/";
    } catch {
      setError("Network error \u2014 please try again.");
      setLoading(false);
    }
  };
  const inp = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    fontSize: 15,
    fontFamily: "Georgia, serif",
    outline: "none",
    boxSizing: "border-box"
  };
  const btn = {
    width: "100%",
    padding: "13px",
    background: "#1a2d5a",
    color: "#7ec11f",
    border: "2px solid #7ec11f",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "Georgia, serif",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1
  };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 16px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("a", { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", width: "fit-content" } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 44, height: 44, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP")))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", padding: "40px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: "36px 32px", width: "100%", maxWidth: 420 } }, product && /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #7ec11f", borderRadius: 8, padding: "10px 14px", marginBottom: 24, fontSize: 13, color: "#1a2d5a" } }, "\u{1F513} Purchasing: ", /* @__PURE__ */ React.createElement("strong", null, productLabels[product] || product)), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", marginBottom: 6, marginTop: 0 } }, mode === "login" ? "Sign In to Your Account" : "Create Your Account"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, marginBottom: 24, marginTop: 0 } }, mode === "login" ? "Enter your credentials to access your IRS Pilot tools." : "Create an account to complete your purchase and access your tools."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Email Address"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      value: email,
      onChange: (e) => setEmail(e.target.value),
      placeholder: "your@email.com",
      style: inp,
      onKeyDown: (e) => e.key === "Enter" && handleSubmit()
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Password"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: password,
      onChange: (e) => setPassword(e.target.value),
      placeholder: mode === "register" ? "At least 8 characters" : "Your password",
      style: inp,
      onKeyDown: (e) => e.key === "Enter" && handleSubmit()
    }
  )), mode === "register" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Confirm Password"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: confirm,
      onChange: (e) => setConfirm(e.target.value),
      placeholder: "Repeat your password",
      style: inp,
      onKeyDown: (e) => e.key === "Enter" && handleSubmit()
    }
  )), error && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" } }, "\u26A0 ", error), /* @__PURE__ */ React.createElement("button", { onClick: handleSubmit, disabled: loading, style: btn }, loading ? "Please wait..." : mode === "login" ? "Sign In \u2192" : "Create Account \u2192")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#666" } }, mode === "login" ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Don't have an account?", " ", /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick: () => {
        setMode("register");
        setError("");
      },
      style: { color: "#1a2d5a", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }
    },
    "Create one"
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, "Already have an account?", " ", /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick: () => {
        setMode("login");
        setError("");
      },
      style: { color: "#1a2d5a", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }
    },
    "Sign in"
  ))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 12 } }, mode === "login" && /* @__PURE__ */ React.createElement("a", { href: "/forgot-password", style: { fontSize: 13, color: "#888", display: "block", marginBottom: 8 } }, "Forgot your password?"), /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { fontSize: 12, color: "#aaa" } }, "\u2190 Back to pricing")))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 420, margin: "0 auto 0", padding: "0 16px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 20px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Have an Access Code?"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.5 } }, "Enter a referral code to track your purchase, or a preview/demo code for direct platform access."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: previewCode,
      onChange: (e) => setPreviewCode(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleAccessCode(),
      placeholder: "Enter your access code",
      style: { flex: 1, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleAccessCode,
      disabled: previewLoading,
      style: { padding: "9px 16px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13, cursor: previewLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: previewLoading ? 0.7 : 1 }
    },
    previewLoading ? "..." : "Access \u2192"
  )), previewMsg && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 12, color: "#dc2626" } }, previewMsg))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc" } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124 \xB7 ", /* @__PURE__ */ React.createElement("a", { href: "/terms", style: { color: "#aaa", textDecoration: "none" } }, "Terms"), " \xB7 ", /* @__PURE__ */ React.createElement("a", { href: "/privacy", style: { color: "#aaa", textDecoration: "none" } }, "Privacy")));
}
window.LoginPage = LoginPage;