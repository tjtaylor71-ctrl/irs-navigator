const { useState, useEffect, useRef, useCallback, useMemo } = React;

function DashboardPage() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((data) => {
      setUser(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };
  const hasNavigator = user && (user.access || []).some((p) => ["navigator", "bundle"].includes(p));
  const hasWizard = user && (user.access || []).some((p) => ["wizard", "bundle"].includes(p));
  const hdr = {
    background: "#1a2d5a",
    padding: "16px 24px",
    borderBottom: "3px solid #7ec11f"
  };
  const card = {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8e4dc",
    padding: "28px 28px",
    marginBottom: 18
  };
  const toolBtn = (href, icon, label, sub, active) => React.createElement(
    "a",
    {
      href: active ? href : "/pricing",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 20px",
        borderRadius: 10,
        textDecoration: "none",
        border: `2px solid ${active ? "#7ec11f" : "#e8e4dc"}`,
        background: active ? "#1a2d5a" : "#f8f6f1",
        transition: "all 0.15s",
        marginBottom: 12
      }
    },
    React.createElement("div", { style: { fontSize: 28 } }, icon),
    React.createElement(
      "div",
      { style: { flex: 1 } },
      React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: active ? "#7ec11f" : "#999" } }, label),
      React.createElement("div", { style: { fontSize: 12, color: active ? "#aaa" : "#bbb", marginTop: 2 } }, sub)
    ),
    React.createElement(
      "div",
      { style: { fontSize: 13, color: active ? "#7ec11f" : "#ccc" } },
      active ? "Open \u2192" : "Purchase \u2192"
    )
  );
  if (loading) return React.createElement("div", {
    style: {
      fontFamily: "Georgia, serif",
      background: "#f8f6f1",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#888"
    }
  }, "Loading your account...");
  if (!user || !user.loggedIn) {
    window.location.href = "/login";
    return null;
  }
  return React.createElement(
    "div",
    { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } },
    // Header
    React.createElement(
      "div",
      { style: hdr },
      React.createElement(
        "div",
        { style: { maxWidth: 700, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } },
        React.createElement(
          "a",
          { href: "/", style: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" } },
          React.createElement("div", { style: { width: 36, height: 36, background: "#7ec11f", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 } }, "\u2696\uFE0F"),
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Navigator"),
            React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, letterSpacing: 1 } }, "TAXPAYER SELF-HELP")
          )
        ),
        React.createElement("button", {
          onClick: handleLogout,
          style: { background: "transparent", border: "1px solid #555", color: "#aaa", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }
        }, "Sign Out")
      )
    ),
    // Body
    React.createElement(
      "div",
      { style: { maxWidth: 700, margin: "0 auto", padding: "40px 24px" } },
      // Welcome
      React.createElement(
        "div",
        { style: { marginBottom: 28 } },
        React.createElement("div", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "My Account"),
        React.createElement("div", { style: { fontSize: 14, color: "#888" } }, user.email)
      ),
      // Tools card
      React.createElement(
        "div",
        { style: card },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 16, marginBottom: 16, color: "#1a2d5a" } }, "Your Tools"),
        toolBtn("/navigator", "\u{1F9ED}", "IRS Navigator", hasNavigator ? "Active \u2014 7-day access" : "Not purchased", hasNavigator),
        toolBtn("/wizard", "\u{1F4CB}", "Financial Intake Wizard", hasWizard ? "Active \u2014 7-day access" : "Not purchased", hasWizard),
        (!hasNavigator || !hasWizard) && React.createElement(
          "div",
          { style: { fontSize: 13, color: "#aaa", marginTop: 8, fontStyle: "italic" } },
          "Need access? ",
          React.createElement("a", { href: "/pricing", style: { color: "#1a2d5a", fontWeight: "bold" } }, "View pricing \u2192")
        )
      ),
      // Consultation card
      React.createElement(
        "div",
        { style: { ...card, background: "#1a2d5a", border: "none" } },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 15, color: "#7ec11f", marginBottom: 8 } }, "Need Professional Help?"),
        React.createElement(
          "div",
          { style: { fontSize: 14, color: "#aaa", marginBottom: 18, lineHeight: 1.6 } },
          "Schedule a 15-minute consultation with Tyrone J. Taylor, EA \u2014 author of Stop IRS Collections."
        ),
        React.createElement("a", {
          href: "https://www.calendly.com/taylor-tax-financial/tax-help",
          target: "_blank",
          rel: "noopener noreferrer",
          style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 8, fontWeight: "bold", fontSize: 14, textDecoration: "none" }
        }, "\u{1F4C5} Schedule a Consultation \u2192")
      )
    )
  );
}
window.DashboardPage = DashboardPage;