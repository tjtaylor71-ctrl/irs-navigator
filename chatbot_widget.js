const { useState, useEffect, useRef, useCallback, useMemo } = React;

function IRSPilotChat() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([
    { role: "assistant", content: "Hi! I'm the IRS Pilot assistant. I can answer questions about how the platform works, pricing, the referral program, and the pro subscription. What would you like to know?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef(null);
  const SYSTEM_PROMPT = `You are the IRS Pilot support assistant \u2014 a helpful, professional chatbot for irspilot.com, a taxpayer self-help platform built by Tyrone J. Taylor, EA (Enrolled Agent) and author of "Stop IRS Collections."

You answer questions about:

ABOUT IRS PILOT:
- IRS Pilot is a web-based self-help tool that helps taxpayers understand and respond to IRS collection and audit notices
- It includes: plain-language IRS notice explanations (CP14, CP501, CP503, CP504, LT11, CP90, CP2000, and more), step-by-step guidance for 10+ IRS situations (levies, audits, revenue officers, TFRP, unfiled returns, OICs, installment agreements), a Financial Intake Wizard that auto-fills IRS Forms 433-F, 433-A, 433-A OIC, 433-B, and Form 656, estimated installment agreement calculations, and an AI-powered IRS response letter generator
- Built by Tyrone J. Taylor, EA \u2014 federally licensed tax professional with the highest credential the IRS grants to private practitioners
- It is a self-help tool, not legal or tax advice. It does not create a professional relationship.

PRICING:
- IRS Pilot Navigator: $59 \u2014 7-day access \u2014 notice lookup, situation guidance, letter generator
- Financial Intake Wizard: $99 \u2014 7-day access \u2014 433 form auto-fill, RCP calculator, OIC analysis
- Complete Bundle: $129 \u2014 7-day access \u2014 Navigator + Wizard (saves $29)
- All access is for 7 days from date of purchase
- Satisfaction guarantee: full refund within 24 hours if not satisfied AND before downloading any documents

REFERRAL PROGRAM:
- Free to join \u2014 no monthly fee, no license required
- Anyone can join by creating a free account at irspilot.com/referral
- Earn 20% commission on every sale through your unique referral link
- Navigator sale ($59) \u2192 you earn $11.80
- Wizard sale ($99) \u2192 you earn $19.80
- Bundle sale ($129) \u2192 you earn $25.80
- 30-day tracking cookie \u2014 if someone buys within 30 days of clicking your link, you get credit
- Commissions are tracked in your dashboard and paid monthly
- No cap on earnings

PRO SUBSCRIPTION (for tax professionals):
- White-label version of IRS Pilot \u2014 your firm name, your contact info, your Calendly link throughout the app
- Clients never see IRS Pilot's name \u2014 they see yours
- $49/month for first 3 months (introductory), then $79/month
- Includes 10 client sessions/month \u2014 additional sessions $5 each
- 24-hour client sessions \u2014 no client login needed, just share your unique link
- Requires approval and setup call \u2014 schedule at calendly.com/taylor-tax-financial/irspilotreferral
- Reseller pricing available: set your own prices (minimum $79/$139/$179 for Navigator/Wizard/Bundle)
- Setup within 1 business day after scheduling a call

CONTACT:
- Email: info@taylortaxandfinancial.com
- Phone: (615) 953-7124
- Website: www.irspilot.com
- Schedule a call: calendly.com/taylor-tax-financial/irspilotreferral

IMPORTANT RULES:
- Only answer questions about IRS Pilot, its features, pricing, and programs
- For specific IRS tax questions about a user's personal situation, politely say the Navigator tool is designed to help with that, and suggest they use the tool or contact Tyrone directly
- Never provide specific legal or tax advice
- Keep answers concise \u2014 2-4 sentences for simple questions, brief bullets for complex ones
- Be warm, professional, and helpful
- If you don't know something, say so and direct them to info@taylortaxandfinancial.com`;
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1e3,
          system: SYSTEM_PROMPT,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "I'm sorry, I couldn't process that. Please try again or email info@taylortaxandfinancial.com.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please email info@taylortaxandfinancial.com or call (615) 953-7124." }]);
    }
    setLoading(false);
  };
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const quickQuestions = [
    "How does IRS Pilot work?",
    "What's included in the $59 Navigator?",
    "How do I join the referral program?",
    "Tell me about the pro subscription"
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "Georgia, serif", display: "inline-block" } }, open && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    bottom: 72,
    right: 0,
    width: 340,
    maxWidth: "calc(100vw - 48px)",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    border: "1px solid #e8e4dc",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 32, height: 32, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 14 } }, "IRS Pilot Assistant"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 0.5 } }, "Ask me anything about the platform")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setOpen(false),
      style: { background: "transparent", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }
    },
    "\xD7"
  )), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "14px 14px 8px", maxHeight: 320, minHeight: 200 } }, messages.map((msg, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 12, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: {
    maxWidth: "85%",
    padding: "9px 13px",
    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    background: msg.role === "user" ? "#1a2d5a" : "#f8f6f1",
    color: msg.role === "user" ? "#fff" : "#333",
    fontSize: 13,
    lineHeight: 1.6
  } }, msg.content))), loading && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-start", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: "14px 14px 14px 4px", padding: "9px 14px", fontSize: 13, color: "#888" } }, "Typing\u2026")), /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })), messages.length === 1 && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: 6 } }, quickQuestions.map((q, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => {
        setInput(q);
      },
      style: {
        fontSize: 11,
        padding: "4px 10px",
        background: "#f0f9e0",
        color: "#1a2d5a",
        border: "1px solid #7ec11f",
        borderRadius: 20,
        cursor: "pointer",
        fontFamily: "Georgia, serif"
      }
    },
    q
  ))), /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 14px 14px", borderTop: "1px solid #f0ede8", display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: input,
      onChange: (e) => setInput(e.target.value),
      onKeyDown: handleKey,
      placeholder: "Ask a question\u2026",
      disabled: loading,
      style: {
        flex: 1,
        padding: "8px 12px",
        border: "1px solid #ddd",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "Georgia, serif",
        outline: "none"
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: sendMessage,
      disabled: loading || !input.trim(),
      style: {
        padding: "8px 14px",
        background: "#1a2d5a",
        color: "#7ec11f",
        border: "2px solid #7ec11f",
        borderRadius: 8,
        cursor: loading ? "default" : "pointer",
        fontFamily: "Georgia, serif",
        fontWeight: "bold",
        fontSize: 13,
        opacity: !input.trim() || loading ? 0.5 : 1
      }
    },
    "\u2192"
  )), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 12px", fontSize: 10, color: "#aaa", textAlign: "center" } }, "For complex IRS issues, consult a licensed professional.")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setOpen((o) => !o),
      style: {
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#1a2d5a",
        border: "2px solid #7ec11f",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)"
      }
    },
    open ? /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontSize: 22, lineHeight: 1 } }, "\xD7") : /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "Chat", style: { width: 32, height: 32, objectFit: "contain" } })
  ), !open && /* @__PURE__ */ React.createElement("div", { style: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    background: "#7ec11f",
    borderRadius: "50%",
    border: "2.5px solid #fff",
    zIndex: 1e4,
    pointerEvents: "none"
  } })));
}
window.IRSPilotChat = IRSPilotChat;