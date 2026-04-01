const { useState, useEffect, useRef, useCallback, useMemo } = React;

function IRSPilotChat() {
  const [open, setOpen] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [messages, setMessages] = React.useState([
    { role: "assistant", content: "Hey, I'm ThatTaxGuru — your guide inside IRS Pilot. I can answer questions about the platform, pricing, and how everything works. What would you like to know?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef(null);

  // Check login status on mount
  React.useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setLoggedIn(true);
          setMessages([{
            role: "assistant",
            content: "Welcome back! I'm ThatTaxGuru — your IRS resolution guide. I can help you understand your IRS situation, walk you through resolution options, or answer questions about the platform. What's on your mind?"
          }]);
        }
      })
      .catch(() => {});
  }, []);

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          mode: loggedIn ? "full" : "platform"
        })
      });
      const data = await response.json();
      const reply = data.reply || "I'm sorry, I couldn't process that. Please email info@taylortaxandfinancial.com for help.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please email info@taylortaxandfinancial.com for help." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const platformQuestions = [
    "How does IRS Pilot work?",
    "What's included in the Navigator?",
    "How do I join the referral program?",
    "Tell me about the Pro subscription"
  ];

  const irsQuestions = [
    "What IRS resolution options do I have?",
    "How does an Offer in Compromise work?",
    "What is Currently Not Collectible status?",
    "How do I set up an installment agreement?"
  ];

  const quickQuestions = loggedIn ? irsQuestions : platformQuestions;

  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "Georgia, serif", display: "inline-block" } },
    open && /* @__PURE__ */ React.createElement("div", {
      style: {
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
      }
    },
      /* Header */
      /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 } },
        /* @__PURE__ */ React.createElement("img", { src: "/static/thattaxguru.png", alt: "ThatTaxGuru", style: { width: 38, height: 38, objectFit: "contain", borderRadius: "50%", border: "2px solid #7ec11f" } }),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } },
          /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 14 } }, "ThatTaxGuru"),
          /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 0.5 } }, loggedIn ? "IRS Resolution Guide" : "IRS Pilot Guide")
        ),
        /* @__PURE__ */ React.createElement("button", {
          onClick: () => setOpen(false),
          style: { background: "transparent", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 0 }
        }, "\xD7")
      ),

      /* Messages */
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "14px 14px 8px", maxHeight: 320, minHeight: 200 } },
        messages.map((msg, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 12, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" } },
          /* @__PURE__ */ React.createElement("div", {
            style: {
              maxWidth: "85%",
              padding: "9px 13px",
              borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? "#1a2d5a" : "#f8f6f1",
              color: msg.role === "user" ? "#fff" : "#333",
              fontSize: 13,
              lineHeight: 1.6
            }
          },
            msg.content.split("\n\n").map((para, pi) => /* @__PURE__ */ React.createElement("div", { key: pi, style: { marginBottom: pi < msg.content.split("\n\n").length - 1 ? 10 : 0 } },
              para.split("\n").map((line, li) => {
                const isBullet = line.trim().startsWith("-") || line.trim().startsWith("\u2022");
                const text = isBullet ? line.trim().replace(/^[-•]\s*/, "") : line;
                return isBullet
                  ? /* @__PURE__ */ React.createElement("div", { key: li, style: { display: "flex", gap: 6, marginBottom: 2 } },
                      /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0 } }, "\u2022"),
                      /* @__PURE__ */ React.createElement("span", null, text)
                    )
                  : /* @__PURE__ */ React.createElement("div", { key: li }, line);
              })
            ))
          )
        )),
        loading && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-start", marginBottom: 12 } },
          /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: "14px 14px 14px 4px", padding: "9px 14px", fontSize: 13, color: "#888" } }, "Typing\u2026")
        ),
        /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })
      ),

      /* Quick Questions */
      messages.length === 1 && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: 6 } },
        quickQuestions.map((q, i) => /* @__PURE__ */ React.createElement("button", {
          key: i,
          onClick: () => setInput(q),
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
        }, q))
      ),

      /* Input */
      /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 14px 14px", borderTop: "1px solid #f0ede8", display: "flex", gap: 8 } },
        /* @__PURE__ */ React.createElement("input", {
          value: input,
          onChange: (e) => setInput(e.target.value),
          onKeyDown: handleKey,
          placeholder: "Ask ThatTaxGuru\u2026",
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
        }),
        /* @__PURE__ */ React.createElement("button", {
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
        }, "\u2192")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 12px", fontSize: 10, color: "#aaa", textAlign: "center" } }, "Questions? Email info@taylortaxandfinancial.com")
    ),

    /* Toggle Button */
    /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } },
      /* @__PURE__ */ React.createElement("button", {
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
        open
          ? /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontSize: 22, lineHeight: 1 } }, "\xD7")
          : /* @__PURE__ */ React.createElement("img", { src: "/static/thattaxguru.png", alt: "ThatTaxGuru", style: { width: 38, height: 38, objectFit: "contain", borderRadius: "50%" } })
      ),
      !open && /* @__PURE__ */ React.createElement("div", {
        style: {
          position: "absolute",
          top: -3,
          right: -3,
          width: 14,
          height: 14,
          background: "#7ec11f",
          borderRadius: "50%",
          border: "2.5px solid #fff",
          zIndex: 10000,
          pointerEvents: "none"
        }
      })
    )
  );
}
window.IRSPilotChat = IRSPilotChat;
