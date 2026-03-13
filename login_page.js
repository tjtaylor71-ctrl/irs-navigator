const { useState, useEffect, useRef, useCallback, useMemo } = React;

function LoginPage() {
  const [mode, setMode] = React.useState(window.__LOGIN_MODE__ || "login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const product = window.__LOGIN_PRODUCT__ || null;
  const productLabels = {
    navigator: "IRS Navigator \u2014 $59 / 7 days",
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
    background: "#1a1a2e",
    color: "#c8a96e",
    border: "2px solid #c8a96e",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "Georgia, serif",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1
  };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", padding: "16px 24px", borderBottom: "3px solid #c8a96e" } }, /* @__PURE__ */ React.createElement("a", { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", width: "fit-content" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#c8a96e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Navigator"), /* @__PURE__ */ React.createElement("div", { style: { color: "#c8a96e", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP")))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: "36px 32px", width: "100%", maxWidth: 420 } }, product && /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #c8a96e", borderRadius: 8, padding: "10px 14px", marginBottom: 24, fontSize: 13, color: "#1a1a2e" } }, "\u{1F513} Purchasing: ", /* @__PURE__ */ React.createElement("strong", null, productLabels[product] || product)), /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", marginBottom: 6, marginTop: 0 } }, mode === "login" ? "Sign In to Your Account" : "Create Your Account"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, marginBottom: 24, marginTop: 0 } }, mode === "login" ? "Enter your credentials to access your IRS Navigator tools." : "Create an account to complete your purchase and access your tools."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Email Address"), /* @__PURE__ */ React.createElement(
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
      style: { color: "#1a1a2e", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }
    },
    "Create one"
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, "Already have an account?", " ", /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick: () => {
        setMode("login");
        setError("");
      },
      style: { color: "#1a1a2e", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }
    },
    "Sign in"
  ))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 12 } }, /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { fontSize: 12, color: "#aaa" } }, "\u2190 Back to pricing")))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc" } }, "Taylor Tax and Financial Consulting Inc. \xB7 (615) 953-7124"));
}
window.LoginPage = LoginPage;