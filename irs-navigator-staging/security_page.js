// security_page.js — IRS Pilot Security & Privacy page
// Pattern: matches privacy_page.js / tos_page.js (compiled-JS root file, React.createElement, no JSX)
// Uses Raleway (headings) + DM Sans (body) to match the platform font system.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const e = React.createElement;

// ── Brand tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  navy: "#0a2540",
  navyDeep: "#061a30",
  blue: "#2b6cb0",
  blueLight: "#ebf4ff",
  accent: "#d69e2e",
  text: "#2d3748",
  textSoft: "#4a5568",
  muted: "#718096",
  line: "#e2e8f0",
  bg: "#ffffff",
  bgSoft: "#f7fafc",
  white: "#ffffff"
};

const FONT_HEAD = "'Raleway',sans-serif";
const FONT_BODY = "'DM Sans',sans-serif";

// ── Small reusable styled blocks ──────────────────────────────────────────────
function SectionLabel(props) {
  return e("div", {
    style: {
      fontFamily: FONT_HEAD,
      fontSize: "0.75rem",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      fontWeight: 600,
      color: COLORS.muted,
      borderTop: "2px solid " + COLORS.navy,
      paddingTop: "0.5rem",
      marginBottom: "0.75rem"
    }
  }, props.children);
}

function H2(props) {
  return e("h2", {
    style: {
      fontFamily: FONT_HEAD,
      fontSize: "1.6rem",
      fontWeight: 700,
      color: COLORS.navy,
      letterSpacing: "-0.01em",
      marginBottom: "1rem",
      marginTop: 0
    }
  }, props.children);
}

function P(props) {
  return e("p", {
    style: {
      fontFamily: FONT_BODY,
      fontSize: "1rem",
      lineHeight: 1.65,
      color: COLORS.textSoft,
      marginBottom: "1rem",
      marginTop: 0
    }
  }, props.children);
}

function Bullet(props) {
  return e("li", {
    style: {
      fontFamily: FONT_BODY,
      fontSize: "0.97rem",
      lineHeight: 1.6,
      color: COLORS.textSoft,
      padding: "0.75rem 0 0.75rem 1.75rem",
      position: "relative",
      borderBottom: "1px solid " + COLORS.line,
      listStyle: "none"
    }
  },
    e("span", {
      style: {
        position: "absolute",
        left: 0,
        top: "1.15rem",
        width: "8px",
        height: "8px",
        background: COLORS.accent,
        transform: "rotate(45deg)"
      }
    }),
    props.children
  );
}

function Strong(props) {
  return e("strong", {
    style: { color: COLORS.navy, fontWeight: 600 }
  }, props.children);
}

// ── Pillar card ───────────────────────────────────────────────────────────────
function Pillar(props) {
  const [hover, setHover] = useState(false);
  return e("div", {
    onMouseEnter: function () { setHover(true); },
    onMouseLeave: function () { setHover(false); },
    style: {
      background: COLORS.bgSoft,
      border: "1px solid " + (hover ? COLORS.blue : COLORS.line),
      borderRadius: "4px",
      padding: "2rem 1.75rem",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      transform: hover ? "translateY(-2px)" : "translateY(0)",
      boxShadow: hover ? "0 12px 28px rgba(10,37,64,0.08)" : "none"
    }
  },
    e("div", {
      style: {
        width: "44px", height: "44px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: COLORS.navy, color: COLORS.accent,
        borderRadius: "4px", marginBottom: "1.25rem",
        fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "1.1rem"
      }
    }, props.num),
    e("h3", {
      style: {
        fontFamily: FONT_HEAD, fontSize: "1.15rem",
        fontWeight: 700, color: COLORS.navy,
        marginBottom: "0.5rem", marginTop: 0
      }
    }, props.title),
    e("p", {
      style: {
        fontFamily: FONT_BODY, fontSize: "0.95rem",
        color: COLORS.textSoft, lineHeight: 1.55, margin: 0
      }
    }, props.desc)
  );
}

// ── Detail section (label + content) ──────────────────────────────────────────
function DetailSection(props) {
  return e("div", {
    style: {
      marginBottom: "3.5rem",
      display: "grid",
      gridTemplateColumns: props.stack ? "1fr" : "220px 1fr",
      gap: props.stack ? "1rem" : "3rem",
      alignItems: "start"
    }
  },
    e(SectionLabel, null, props.label),
    e("div", null, props.children)
  );
}

// ── Vendor card ───────────────────────────────────────────────────────────────
function Vendor(props) {
  return e("div", {
    style: {
      border: "1px solid " + COLORS.line,
      background: COLORS.white,
      padding: "1.1rem 1.25rem",
      borderRadius: "3px"
    }
  },
    e("div", {
      style: {
        fontFamily: FONT_HEAD, fontWeight: 700,
        color: COLORS.navy, fontSize: "1rem",
        marginBottom: "0.25rem"
      }
    }, props.name),
    e("div", {
      style: {
        fontFamily: FONT_BODY, fontSize: "0.85rem",
        color: COLORS.muted, lineHeight: 1.4
      }
    }, props.role)
  );
}

// ── Main page component ───────────────────────────────────────────────────────
function SecurityPage() {
  // Responsive: stack on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(function () {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return function () { window.removeEventListener("resize", check); };
  }, []);

  return e("div", {
    style: {
      fontFamily: FONT_BODY,
      color: COLORS.text,
      background: COLORS.bg,
      lineHeight: 1.6,
      minHeight: "100vh"
    }
  },
    // ── Top minimal nav ─────────────────────────────────────────────────────
    e("div", {
      style: {
        background: COLORS.white,
        borderBottom: "1px solid " + COLORS.line,
        padding: "1rem 2rem"
      }
    },
      e("div", {
        style: {
          maxWidth: "1100px", margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }
      },
        e("a", {
          href: "/",
          style: {
            fontFamily: FONT_HEAD, fontSize: "1.1rem", fontWeight: 800,
            color: COLORS.navy, textDecoration: "none", letterSpacing: "-0.01em"
          }
        }, "IRS Pilot"),
        e("a", {
          href: "/",
          style: {
            fontFamily: FONT_BODY, fontSize: "0.9rem",
            color: COLORS.textSoft, textDecoration: "none"
          }
        }, "← Back to home")
      )
    ),

    // ── HERO ──────────────────────────────────────────────────────────────────
    e("div", {
      style: {
        background: "linear-gradient(135deg," + COLORS.navyDeep + " 0%," + COLORS.navy + " 50%,#1a365d 100%)",
        color: COLORS.white,
        padding: isMobile ? "4rem 1.5rem 4.5rem" : "5rem 2rem 6rem",
        position: "relative",
        overflow: "hidden"
      }
    },
      e("div", { style: { maxWidth: "1100px", margin: "0 auto", position: "relative", zIndex: 1 } },
        e("span", {
          style: {
            display: "inline-block",
            fontFamily: FONT_BODY,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: COLORS.accent,
            marginBottom: "1.25rem",
            padding: "0.4rem 0.9rem",
            border: "1px solid rgba(214,158,46,0.4)",
            borderRadius: "2px"
          }
        }, "Trust & Transparency"),
        e("h1", {
          style: {
            fontFamily: FONT_HEAD,
            color: COLORS.white,
            fontSize: isMobile ? "2.25rem" : "3.5rem",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "1.25rem",
            marginTop: 0,
            letterSpacing: "-0.01em",
            maxWidth: "750px"
          }
        }, "Security & Privacy at IRS Pilot"),
        e("p", {
          style: {
            fontFamily: FONT_BODY,
            fontSize: "1.15rem",
            color: "rgba(255,255,255,0.85)",
            maxWidth: "700px",
            lineHeight: 1.6,
            margin: 0
          }
        }, "Tax data is among the most sensitive information you'll ever share. Here's exactly how we protect it — and what we'll never do with it."),
        e("div", {
          style: {
            marginTop: "2rem",
            fontFamily: FONT_BODY,
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.6)"
          }
        },
          "Last updated: May 2026  ·  ",
          e("a", {
            href: "/static/IRS-Pilot-Security-Privacy.pdf",
            style: { color: COLORS.accent, textDecoration: "underline" },
            target: "_blank",
            rel: "noopener"
          }, "Download PDF")
        )
      )
    ),

    // ── CONTENT ────────────────────────────────────────────────────────────────
    e("div", {
      style: {
        maxWidth: "1100px",
        margin: "0 auto",
        padding: isMobile ? "3.5rem 1.5rem" : "5rem 2rem"
      }
    },

      // Intro
      e("p", {
        style: {
          fontFamily: FONT_BODY,
          fontSize: "1.1rem",
          color: COLORS.textSoft,
          maxWidth: "780px",
          marginBottom: "4rem",
          paddingLeft: "1.5rem",
          borderLeft: "3px solid " + COLORS.accent,
          lineHeight: 1.65
        }
      }, "IRS Pilot is built and operated by IRS Pilot LLC, founded by an Enrolled Agent and NTPI Fellow with nearly two decades of IRS representation experience. We approach security the same way we approach IRS resolution work: methodically, with documentation, and without shortcuts."),

      // Pillars grid
      e("div", {
        style: {
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
          marginBottom: "5rem"
        }
      },
        e(Pillar, { num: "01", title: "Encryption Everywhere", desc: "All data is transmitted over TLS 1.2+ and stored on encrypted infrastructure." }),
        e(Pillar, { num: "02", title: "Zero Card Storage", desc: "Payment data is handled exclusively by Stripe, a PCI-DSS Level 1 provider. We never see your card number." }),
        e(Pillar, { num: "03", title: "Principle of Least Access", desc: "Account data is accessed only when necessary to deliver the service or when you specifically request support." }),
        e(Pillar, { num: "04", title: "No Data Resale", desc: "We do not sell, rent, or share your tax information with advertisers, data brokers, or any third party." })
      ),

      // 01 — Encryption
      e(DetailSection, { label: "01 — Encryption", stack: isMobile },
        e(H2, null, "How your data moves and rests"),
        e(P, null, "Every connection between your browser and IRS Pilot is encrypted with industry-standard TLS. Data at rest lives on managed cloud infrastructure with disk-level encryption enabled by our hosting provider."),
        e("ul", { style: { padding: 0, margin: "1rem 0 0" } },
          e(Bullet, null, e(Strong, null, "In transit: "), "TLS 1.2 or higher on every page, every API call, every form submission."),
          e(Bullet, null, e(Strong, null, "At rest: "), "Database storage encrypted at the infrastructure layer."),
          e(Bullet, null, e(Strong, null, "Credentials: "), "Passwords are hashed (never stored in plain text) using industry-standard one-way hashing."),
          e(Bullet, null, e(Strong, null, "API keys: "), "Third-party credentials are stored as environment variables, never in source code or client-side files.")
        )
      ),

      // 02 — Infrastructure
      e(DetailSection, { label: "02 — Infrastructure", stack: isMobile },
        e(H2, null, "Where IRS Pilot runs"),
        e(P, null, "We build on top of established cloud providers rather than running our own servers. This means our infrastructure inherits the physical security, redundancy, and compliance posture of providers that already serve major financial institutions."),
        e("div", {
          style: {
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginTop: "1.25rem"
          }
        },
          e(Vendor, { name: "Railway", role: "Application hosting (runs on Google Cloud Platform)" }),
          e(Vendor, { name: "Stripe", role: "Payments — PCI-DSS Level 1, SOC 1 & SOC 2 certified" }),
          e(Vendor, { name: "Anthropic", role: "AI processing — enterprise data handling, no training on inputs" }),
          e(Vendor, { name: "ClickBank", role: "Course & digital product fulfillment" })
        )
      ),

      // Callout
      e("div", {
        style: {
          background: COLORS.navy,
          color: COLORS.white,
          padding: isMobile ? "2rem 1.5rem" : "3rem 2.5rem",
          borderRadius: "4px",
          margin: "1rem 0 4rem",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
          gap: "2rem",
          alignItems: "center"
        }
      },
        e("div", null,
          e("h2", {
            style: {
              fontFamily: FONT_HEAD, color: COLORS.white,
              fontSize: "1.5rem", fontWeight: 700,
              marginBottom: "0.75rem", marginTop: 0
            }
          }, "Where we stand on formal certifications"),
          e("p", {
            style: {
              fontFamily: FONT_BODY,
              color: "rgba(255,255,255,0.8)",
              fontSize: "1rem",
              lineHeight: 1.6,
              maxWidth: "600px",
              margin: 0
            }
          }, "We are not currently SOC 2 attested. We're transparent about this because attestation is a specific, audited milestone — not a claim. As our platform serves more tax professionals and firms, pursuing SOC 2 Type I and Type II is on our roadmap. In the meantime, we're glad to walk through our controls with any prospective partner who asks.")
        ),
        e("div", {
          style: {
            fontFamily: FONT_HEAD,
            textAlign: "center",
            padding: "1.5rem",
            border: "2px solid " + COLORS.accent,
            borderRadius: "4px",
            minWidth: "180px"
          }
        },
          e("div", {
            style: {
              fontSize: "2.5rem", fontWeight: 800,
              color: COLORS.accent, lineHeight: 1
            }
          }, "20"),
          e("div", {
            style: {
              fontSize: "0.7rem", textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem"
            }
          }, "Years of IRS", e("br"), "Representation Experience")
        )
      ),

      // 03 — AI & Data Use
      e(DetailSection, { label: "03 — AI & Data Use", stack: isMobile },
        e(H2, null, "How AI handles your tax information"),
        e(P, null, "IRS Pilot uses Anthropic's Claude API to power its guidance features. Anthropic's commercial API terms specify that data sent through the API is not used to train their models. We pass only the information needed to answer your specific question."),
        e("ul", { style: { padding: 0, margin: "1rem 0 0" } },
          e(Bullet, null, e(Strong, null, "We do not feed "), "your transcripts, account history, or platform activity into AI training datasets."),
          e(Bullet, null, e(Strong, null, "We do not store "), "AI conversation contents beyond what is necessary to deliver the conversation back to you."),
          e(Bullet, null, e(Strong, null, "We do not allow "), "third parties to use your data to build competing products.")
        )
      ),

      // 04 — Access Controls
      e(DetailSection, { label: "04 — Access Controls", stack: isMobile },
        e(H2, null, "Who can see what"),
        e(P, null, "Internal access to user data is limited to the founder and specifically authorized contractors, and only when needed to deliver support, investigate an issue, or maintain the platform."),
        e("ul", { style: { padding: 0, margin: "1rem 0 0" } },
          e(Bullet, null, e(Strong, null, "Account access: "), "You authenticate with a private password unique to your account."),
          e(Bullet, null, e(Strong, null, "Admin access: "), "Restricted to a small set of accounts with explicit administrator privileges, checked on every privileged action."),
          e(Bullet, null, e(Strong, null, "Source code: "), "Repositories are private and access-controlled."),
          e(Bullet, null, e(Strong, null, "Production systems: "), "Deployment credentials are not shared and are rotated when contractors complete engagements.")
        )
      ),

      // 05 — Data We Collect
      e(DetailSection, { label: "05 — Data We Collect", stack: isMobile },
        e(H2, null, "What we ask for and why"),
        e(P, null, "We collect only what's needed to deliver the service you're paying for. Different features require different inputs."),
        e("ul", { style: { padding: 0, margin: "1rem 0 0" } },
          e(Bullet, null, e(Strong, null, "Account basics: "), "Name, email, password — to create and secure your account."),
          e(Bullet, null, e(Strong, null, "Tax situation details: "), "Information you enter into planning tools and questionnaires — to generate relevant guidance."),
          e(Bullet, null, e(Strong, null, "IRS notices or transcripts: "), "Documents you choose to upload — to interpret and respond to them."),
          e(Bullet, null, e(Strong, null, "Payment information: "), "Billing details handled by Stripe — we receive only a transaction confirmation."),
          e(Bullet, null, e(Strong, null, "Usage analytics: "), "Aggregate behavior data — to understand which features are working.")
        )
      ),

      // Rights box
      e("div", {
        style: {
          background: COLORS.blueLight,
          padding: isMobile ? "1.75rem" : "2.5rem",
          borderRadius: "4px",
          borderLeft: "4px solid " + COLORS.blue,
          marginBottom: "4rem"
        }
      },
        e("h3", {
          style: {
            fontFamily: FONT_HEAD,
            fontSize: "1.25rem",
            fontWeight: 700,
            color: COLORS.navy,
            marginBottom: "1rem",
            marginTop: 0
          }
        }, "Your rights, plainly stated"),
        e("ul", {
          style: {
            columns: isMobile ? 1 : 2,
            columnGap: "2.5rem",
            listStyle: "none",
            padding: 0,
            margin: 0
          }
        },
          [
            "Request a copy of the data we hold about you",
            "Request correction of inaccurate information",
            "Request deletion of your account and associated data",
            "Export your information in a portable format",
            "Opt out of marketing communications at any time",
            "Ask questions about how your data is handled — and get a real answer"
          ].map(function (item, idx) {
            return e("li", {
              key: idx,
              style: {
                fontFamily: FONT_BODY,
                padding: "0.5rem 0 0.5rem 1.5rem",
                position: "relative",
                breakInside: "avoid",
                color: COLORS.textSoft,
                fontSize: "0.95rem",
                lineHeight: 1.5
              }
            },
              e("span", {
                style: {
                  position: "absolute",
                  left: 0,
                  color: COLORS.blue,
                  fontWeight: 700
                }
              }, "\u2192"),
              item
            );
          })
        )
      ),

      // 06 — Incident Response
      e(DetailSection, { label: "06 — Incident Response", stack: isMobile },
        e(H2, null, "If something goes wrong"),
        e(P, null, "In the event of a security incident affecting your data, we will notify you directly via the email address on your account, describe what happened in plain language, explain what data was involved, and outline the steps we're taking. Notification will be made promptly and in accordance with applicable law.")
      ),

      // Contact CTA
      e("div", {
        style: {
          marginTop: "2rem",
          paddingTop: "3rem",
          borderTop: "1px solid " + COLORS.line,
          textAlign: "center"
        }
      },
        e("h3", {
          style: {
            fontFamily: FONT_HEAD,
            fontSize: "1.35rem",
            fontWeight: 700,
            color: COLORS.navy,
            marginBottom: "0.75rem",
            marginTop: 0
          }
        }, "Questions about security or privacy?"),
        e("p", {
          style: {
            fontFamily: FONT_BODY,
            color: COLORS.textSoft,
            marginBottom: "1.5rem",
            marginTop: 0
          }
        }, "Reach the team directly. We respond to security inquiries personally — not through a ticket queue."),
        e("a", {
          href: "mailto:info@irspilot.com",
          style: {
            display: "inline-block",
            padding: "0.85rem 2rem",
            background: COLORS.navy,
            color: COLORS.white,
            textDecoration: "none",
            fontFamily: FONT_HEAD,
            fontWeight: 600,
            letterSpacing: "0.03em",
            borderRadius: "3px"
          }
        }, "info@irspilot.com")
      )
    ),

    // ── Footer ─────────────────────────────────────────────────────────────────
    e("div", {
      style: {
        background: COLORS.bgSoft,
        borderTop: "1px solid " + COLORS.line,
        padding: "2rem",
        textAlign: "center",
        fontFamily: FONT_BODY,
        fontSize: "0.85rem",
        color: COLORS.muted
      }
    },
      e("div", { style: { maxWidth: "1100px", margin: "0 auto" } },
        "© ",
        new Date().getFullYear(),
        " IRS Pilot LLC  ·  ",
        e("a", { href: "/terms", style: { color: COLORS.muted, textDecoration: "underline" } }, "Terms"),
        "  ·  ",
        e("a", { href: "/privacy", style: { color: COLORS.muted, textDecoration: "underline" } }, "Privacy"),
        "  ·  ",
        e("a", { href: "/security", style: { color: COLORS.navy, textDecoration: "underline", fontWeight: 600 } }, "Security")
      )
    )
  );
}

// Expose for the IRS Pilot page shell
window.SecurityPage = SecurityPage;
