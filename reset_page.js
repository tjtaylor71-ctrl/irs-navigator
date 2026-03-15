const { useState, useEffect, useRef, useCallback, useMemo } = React;

function ResetPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const mode = token ? "reset" : "forgot";
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [message, setMessage] = React.useState("");
  const handleForgot = async () => {
    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }
    setStatus("loading");
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setStatus(res.ok ? "success" : "error");
    setMessage(data.message || data.error || "");
  };
  const handleReset = async () => {
    if (!password) {
      setStatus("error");
      setMessage("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    setStatus("loading");
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage("Password updated. Redirecting...");
      setTimeout(() => window.location.href = "/login", 2e3);
    } else {
      setStatus("error");
      setMessage(data.error || "Something went wrong.");
    }
  };
  const inp = { width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 15, fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" };
  const btn = { width: "100%", padding: "13px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontSize: 15, fontWeight: "bold", fontFamily: "Georgia, serif", cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 };
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("a", { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", width: "fit-content" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP")))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 16, border: "1px solid #e8e4dc", padding: "36px 32px", width: "100%", maxWidth: 420 } }, mode === "forgot" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", marginBottom: 6, marginTop: 0 } }, "Forgot Your Password?"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, marginBottom: 24, marginTop: 0, lineHeight: 1.6 } }, "Enter your email address and we'll send you a link to reset your password."), status === "success" ? /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "16px", fontSize: 14, color: "#15803d", lineHeight: 1.6 } }, "\u2705 ", message || "If an account exists for that email, a reset link is on its way. Check your inbox.") : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Email Address"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      value: email,
      onChange: (e) => setEmail(e.target.value),
      placeholder: "your@email.com",
      style: inp,
      onKeyDown: (e) => e.key === "Enter" && handleForgot()
    }
  )), status === "error" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" } }, "\u26A0 ", message), /* @__PURE__ */ React.createElement("button", { onClick: handleForgot, disabled: status === "loading", style: btn }, status === "loading" ? "Sending..." : "Send Reset Link \u2192"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 22, fontWeight: "bold", marginBottom: 6, marginTop: 0 } }, "Set New Password"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, marginBottom: 24, marginTop: 0 } }, "Enter your new password below."), status === "success" ? /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "16px", fontSize: 14, color: "#15803d" } }, "\u2705 ", message) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "New Password"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: password,
      onChange: (e) => setPassword(e.target.value),
      placeholder: "At least 8 characters",
      style: inp
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontWeight: "bold", fontSize: 13, display: "block", marginBottom: 6 } }, "Confirm Password"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: confirm,
      onChange: (e) => setConfirm(e.target.value),
      placeholder: "Repeat your password",
      style: inp,
      onKeyDown: (e) => e.key === "Enter" && handleReset()
    }
  )), status === "error" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626" } }, "\u26A0 ", message), /* @__PURE__ */ React.createElement("button", { onClick: handleReset, disabled: status === "loading", style: btn }, status === "loading" ? "Updating..." : "Update Password \u2192"))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20 } }, /* @__PURE__ */ React.createElement("a", { href: "/login", style: { fontSize: 13, color: "#888" } }, "\u2190 Back to Sign In")))));
}
window.ResetPage = ResetPage;