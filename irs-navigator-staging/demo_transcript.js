const { useState, useEffect, useRef, useCallback, useMemo } = React;

function TranscriptDemo() {
  const [step, setStep] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);

  const scenario = {
    name: "Maria Gutierrez",
    situation: "Owes $153,908 \u2014 IRS filed a return on her behalf in 2019",
    year: "Tax Year 2014",
    balance: "$127,973 + $25,935 accrued interest"
  };

  const steps = [
    {
      title: "Step 1 \u2014 Upload Your Transcript",
      narration: "Maria downloads her IRS Account Transcript from IRS.gov and uploads it to IRS Pilot. The file is processed immediately in memory \u2014 nothing is ever stored on the server.",
      arrow: "Upload your transcript PDF",
      screen: "upload"
    },
    {
      title: "Step 2 \u2014 At a Glance Summary",
      narration: "Instantly, IRS Pilot extracts the key numbers: current balance, accrued interest, total exposure, and filing status. Maria sees the full picture in seconds \u2014 no more squinting at IRS formatting.",
      arrow: "Review your account summary",
      screen: "summary"
    },
    {
      title: "Step 3 \u2014 Plain-English Timeline",
      narration: "Every IRS transaction code is translated into plain English. Maria sees exactly what happened, when it happened, and what it means \u2014 without needing to look up a single IRS code.",
      arrow: "See what each transaction means",
      screen: "timeline"
    },
    {
      title: "Step 4 \u2014 Questions Answered",
      narration: "IRS Pilot answers the questions every taxpayer asks: Why is it so high? Can the penalties be reduced? Will the IRS take my money? Each answer is tailored to what\u2019s actually in the transcript.",
      arrow: "Get answers to your questions",
      screen: "faq"
    },
    {
      title: "Step 5 \u2014 Resolution Options",
      narration: "Based on the transcript, IRS Pilot identifies which resolution paths are available: installment agreement, Offer in Compromise, penalty abatement, or Currently Not Collectible. Each option is explained in plain language.",
      arrow: "See your resolution options",
      screen: "options"
    },
    {
      title: "Step 6 \u2014 Your Next Steps",
      narration: "IRS Pilot gives Maria a prioritized action list \u2014 exactly what needs to happen next, in order. No guesswork, no jargon. A complete roadmap from the transcript to resolution.",
      arrow: "Review your action plan",
      screen: "nextsteps"
    },
    {
      title: "Step 7 \u2014 Download as PDF",
      narration: "Maria downloads the complete plain-language report as a polished PDF to share with her tax professional. The report is branded, professional, and ready to use in any meeting or correspondence.",
      arrow: "Download your report",
      screen: "download"
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
    upload: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Upload Your Transcript"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 14 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "14%", background: "#7ec11f", borderRadius: 2, transition: "width 0.5s" } })
      ),
      /* @__PURE__ */ React.createElement("div", { style: { border: "2px dashed #7ec11f", borderRadius: 10, padding: "16px 12px", textAlign: "center", background: "#f0fdf4", marginBottom: 12 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 30, marginBottom: 6 } }, "\uD83D\uDCC4"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "IRS_Account_Transcript_2014.pdf"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7ec11f", fontWeight: "bold" } }, "\u2705 Ready to analyze")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.5, marginBottom: 4 } }, "YOUR NAME"),
        /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 6, padding: "7px 10px", fontSize: 16, color: "#1a2d5a", fontWeight: "bold" } }, "Maria Gutierrez")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 8, padding: "10px", textAlign: "center", fontSize: 16, fontWeight: "bold", color: "#7ec11f" } },
        "Generate Report \u2192"
      ),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 8 } },
        "\uD83D\uDD12 Never stored \u2014 processed in memory only"
      )
    ),

    summary: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Your Account Summary"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "28%", background: "#7ec11f", borderRadius: 2 } })
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#dc2626", borderRadius: 8, padding: "8px 10px", marginBottom: 8, textAlign: "center" } },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1, marginBottom: 2 } }, "ACTION REQUIRED \u2014 ACTIVE CASE")
      ),
      [
        ["Balance Owed", "$127,973", "#fca5a5"],
        ["Accrued Interest", "$25,935", "#fca5a5"],
        ["Total Exposure", "$153,908", "#fca5a5"],
      ].map(([label, val, color], i) =>
        /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#1a2d5a", borderRadius: 8, padding: "8px 10px", marginBottom: 6 } },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1 } }, label.toUpperCase()),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color } }, val)
        )
      ),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4 } },
        [["Tax Year", "2014"], ["Status", "MFS"]].map(([l, v], i) =>
          /* @__PURE__ */ React.createElement("div", { key: i, style: { flex: 1, background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 6, padding: "6px 8px", textAlign: "center" } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#888", letterSpacing: 0.5 } }, l.toUpperCase()),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: "bold", color: "#1a2d5a" } }, v)
          )
        )
      )
    ),

    timeline: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "What Happened \u2014 Plain English"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "42%", background: "#7ec11f", borderRadius: 2 } })
      ),
      [
        { emoji: "\uD83D\uDCCB", date: "Apr 2015", title: "Extension Filed", desc: "Extra time to file was granted through Oct. 15, 2015.", color: "#888" },
        { emoji: "\u26A0\uFE0F", date: "May 2019", title: "IRS Filed a Return for Her", desc: "No return was filed, so the IRS created one. Usually misses deductions.", color: "#d97706" },
        { emoji: "\uD83D\uDD0D", date: "Feb 2022", title: "Audit Completed \u2014 $130K Added", desc: "$69,984 tax + $33,242 penalties + $26,827 interest assessed.", color: "#dc2626" },
        { emoji: "\uD83D\uDEE1\uFE0F", date: "Sep 2024", title: "Collection Stopped \u2014 For Now", desc: "CDP hearing + bankruptcy filing both pause IRS levies.", color: "#15803d" },
      ].map((t, i) =>
        /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" } },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, flexShrink: 0 } }, t.emoji),
          /* @__PURE__ */ React.createElement("div", null,
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa" } }, t.date),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, t.title),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#666", lineHeight: 1.5 } }, t.desc)
          )
        )
      )
    ),

    faq: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Questions Answered"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "56%", background: "#7ec11f", borderRadius: 2 } })
      ),
      [
        {
          q: "Why is the balance so high?",
          a: "The original tax was $69,984. Penalties doubled it and interest has been growing since 2022."
        },
        {
          q: "Can the penalties be reduced?",
          a: "Possibly yes. $33,242 in penalties may be removed through First-Time Abatement or Reasonable Cause."
        },
        {
          q: "Is the IRS taking my money now?",
          a: "No \u2014 the CDP hearing and bankruptcy both prevent levy action right now."
        },
      ].map((item, i) =>
        /* @__PURE__ */ React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 8, padding: "8px 10px", marginBottom: 8 } },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, item.q),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#555", lineHeight: 1.6 } }, item.a)
        )
      )
    ),

    options: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "Your Resolution Options"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "70%", background: "#7ec11f", borderRadius: 2 } })
      ),
      [
        { name: "Installment Agreement", tag: "Likely Available", tagBg: "#f0fdf4", tagColor: "#15803d", desc: "Monthly payments over up to 72 months." },
        { name: "Offer in Compromise", tag: "Requires Analysis", tagBg: "#eff6ff", tagColor: "#1e40af", desc: "Settle for less based on ability to pay." },
        { name: "Penalty Abatement", tag: "Strong Candidate", tagBg: "#f0fdf4", tagColor: "#15803d", desc: "$33,242 in penalties may be removable." },
        { name: "Currently Not Collectible", tag: "Possible", tagBg: "#fef3c7", tagColor: "#92400e", desc: "Defer collection if expenses exceed income." },
      ].map((opt, i) =>
        /* @__PURE__ */ React.createElement("div", { key: i, style: { border: "1px solid #e8e4dc", borderRadius: 8, padding: "8px 10px", marginBottom: 6 } },
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, opt.name),
            /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, fontWeight: "bold", padding: "2px 6px", borderRadius: 20, background: opt.tagBg, color: opt.tagColor } }, opt.tag)
          ),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666" } }, opt.desc)
        )
      )
    ),

    nextsteps: /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 2 } }, "What Needs to Happen Next"),
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 10 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "84%", background: "#7ec11f", borderRadius: 2 } })
      ),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 10, padding: "12px 14px" } },
        [
          "Request penalty abatement for $33,242 in assessed penalties.",
          "Prepare Form 433-A to document current income and expenses for the CDP hearing.",
          "Evaluate Offer in Compromise eligibility based on Reasonable Collection Potential.",
          "Confirm all other tax years are filed and current before any resolution.",
        ].map((step, i) =>
          /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 10, marginBottom: i < 3 ? 10 : 0, alignItems: "flex-start" } },
            /* @__PURE__ */ React.createElement("div", { style: { width: 20, height: 20, borderRadius: "50%", background: "#7ec11f", color: "#1a2d5a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", flexShrink: 0 } }, i + 1),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, paddingTop: 2 } }, step)
          )
        )
      )
    ),

    download: /* @__PURE__ */ React.createElement("div", { style: { padding: 16, textAlign: "center" } },
      /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "#e8e4dc", borderRadius: 2, marginBottom: 12 } },
        /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: "100%", background: "#7ec11f", borderRadius: 2 } })
      ),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 8 } }, "\uD83D\uDCC4"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 6 } }, "Your Report is Ready"),
      /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 8, padding: 10, marginBottom: 10, textAlign: "left" } },
        [
          "Plain-English account summary",
          "Full transaction timeline explained",
          "FAQ answers tailored to your account",
          "Resolution options with analysis",
          "Prioritized next steps",
        ].map((item, i) =>
          /* @__PURE__ */ React.createElement("div", { key: i, style: { fontSize: 13, color: "#1a2d5a", padding: "4px 0", borderBottom: i < 4 ? "1px solid #e8e4dc" : "none", display: "flex", gap: 6 } },
            /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "\u2713"),
            item
          )
        )
      ),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "9px", background: "#7ec11f", borderRadius: 6, fontSize: 14, fontWeight: "bold", color: "#1a2d5a" } }, "\u2B07 Download PDF"),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: "9px", background: "transparent", border: "1px solid #1a2d5a", borderRadius: 6, fontSize: 14, color: "#1a2d5a" } }, "\uD83D\uDDA8 Print")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", marginTop: 8 } }, "\uD83D\uDD12 Your transcript data is never stored")
    )
  };

  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } },

    /* Header */
    /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "12px 20px", borderBottom: "3px solid #7ec11f", display: "flex", alignItems: "center", justifyContent: "space-between" } },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 36, height: 36, objectFit: "contain" } }),
        /* @__PURE__ */ React.createElement("div", null,
          /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 21 } }, "IRS Pilot Transcript Analyzer"),
          /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 15, letterSpacing: 1 } }, "INTERACTIVE DEMO")
        )
      ),
      /* @__PURE__ */ React.createElement("a", { href: "/demo-wizard", style: { color: "#aaa", fontSize: 18, textDecoration: "none", border: "1px solid #444", padding: "4px 10px", borderRadius: 6 } }, "\u2190 Wizard Demo")
    ),

    /* Scenario bar */
    /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderBottom: "1px solid #e8e4dc", padding: "12px 20px" } },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 4 } }, "DEMO SCENARIO"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a" } }, scenario.name, " \u2014 ", scenario.situation),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, color: "#888", marginTop: 2 } }, scenario.year, " \xB7 Balance: ", scenario.balance)
    ),

    /* Main content */
    /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 800, margin: "0 auto", padding: "20px 16px" } },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" } },

        /* Phone mockup */
        /* @__PURE__ */ React.createElement("div", { style: { flex: "0 0 280px", minWidth: 260 } },
          /* @__PURE__ */ React.createElement("div", { style: { background: "#1a1a2e", borderRadius: 28, padding: "12px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" } },
            /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 6, background: "#333", borderRadius: 3, margin: "0 auto 10px" } }),
            /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", borderRadius: 18, overflow: "hidden", minHeight: 420 } },

              /* Phone header */
              /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "8px 12px", borderBottom: "2px solid #7ec11f", display: "flex", alignItems: "center", gap: 8 } },
                /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "", style: { width: 24, height: 24, objectFit: "contain" } }),
                /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 16, fontWeight: "bold" } }, "IRS Pilot"),
                /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 14, marginLeft: "auto", letterSpacing: 0.5 } }, "TRANSCRIPT")
              ),

              /* Screen content */
              /* @__PURE__ */ React.createElement("div", { style: { opacity: animating ? 0 : 1, transition: "opacity 0.3s" } },
                screens[current.screen]
              )
            ),
            /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", background: "#333", margin: "10px auto 0", border: "2px solid #555" } })
          )
        ),

        /* Right panel */
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 240 } },

          /* Step dots */
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" } },
            steps.map((s, i) =>
              /* @__PURE__ */ React.createElement("div", {
                key: i,
                onClick: () => goTo(i),
                style: {
                  width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
                  background: i === step ? "#7ec11f" : i < step ? "#1a2d5a" : "#e8e4dc",
                  color: i === step ? "#1a2d5a" : i < step ? "#7ec11f" : "#aaa",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: "bold", transition: "all 0.3s",
                  boxShadow: i === step ? "0 0 0 3px rgba(126,193,31,0.3)" : "none"
                }
              }, i + 1)
            )
          ),

          /* Narration card */
          /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "2px solid #7ec11f", padding: 20, marginBottom: 16, opacity: animating ? 0 : 1, transition: "opacity 0.3s" } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#7ec11f", letterSpacing: 1, marginBottom: 6 } }, "STEP ", step + 1, " OF ", steps.length),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: "bold", color: "#1a2d5a", marginBottom: 10 } }, current.title),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, color: "#555", lineHeight: 1.7, marginBottom: current.arrow ? 14 : 0 } }, current.narration),
            current.arrow && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #7ec11f", borderRadius: 8, padding: "8px 12px" } },
              /* @__PURE__ */ React.createElement("div", { style: { fontSize: 27, animation: "bounceRight 1s ease-in-out infinite" } }, "\u2192"),
              /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, color: "#15803d", fontWeight: "bold" } }, current.arrow)
            )
          ),

          /* Nav buttons */
          /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } },
            /* @__PURE__ */ React.createElement("button", {
              onClick: () => goTo(Math.max(0, step - 1)),
              disabled: step === 0,
              style: { flex: 1, padding: "10px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 20, cursor: step === 0 ? "not-allowed" : "pointer", color: step === 0 ? "#ccc" : "#555" }
            }, "\u2190 Previous"),
            step < steps.length - 1
              ? /* @__PURE__ */ React.createElement("button", {
                  onClick: () => goTo(step + 1),
                  style: { flex: 2, padding: "10px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 20, cursor: "pointer" }
                }, "Next Step \u2192")
              : /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { flex: 2, padding: "10px", background: "#7ec11f", color: "#1a2d5a", border: "none", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 20, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" } }, "Get Full Access \u2192")
          ),
          step > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10 } },
            /* @__PURE__ */ React.createElement("button", { onClick: () => goTo(0), style: { background: "none", border: "none", color: "#aaa", fontSize: 16, cursor: "pointer", fontFamily: "Georgia, serif" } }, "\u21BA Restart Demo")
          )
        )
      )
    ),

    /* Bounce animation */
    /* @__PURE__ */ React.createElement("style", null, `
      @keyframes bounceRight {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(6px); }
      }
    `)
  );
}

window.TranscriptDemo = TranscriptDemo;
