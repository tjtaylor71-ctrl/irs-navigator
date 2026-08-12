
/*
  testimonial_form.js
  Mounted as a modal after wizard completion or N days post-purchase.
  Trigger via: window.dispatchEvent(new CustomEvent('irs:request-testimonial', { detail: { trigger: 'wizard_complete' } }));
  Also exports TestimonialStrip for use on home/pricing pages.
*/

const { useState, useEffect } = React;

function TestimonialForm({ trigger, onClose }) {
  var _s = useState("form"); var step = _s[0]; var setStep = _s[1];
  var _dn = useState(""); var displayName = _dn[0]; var setDisplayName = _dn[1];
  var _rs = useState(""); var roleSituation = _rs[0]; var setRoleSituation = _rs[1];
  var _tt = useState(""); var testimonialText = _tt[0]; var setTestimonialText = _tt[1];
  var _cg = useState(false); var consentGiven = _cg[0]; var setConsentGiven = _cg[1];
  var _sub = useState(false); var submitting = _sub[0]; var setSubmitting = _sub[1];
  var _err = useState(""); var error = _err[0]; var setError = _err[1];

  var s = {
    overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
    modal: { background:"#fff", borderRadius:14, padding:"28px 28px 24px", maxWidth:520, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
    label: { display:"block", fontSize:12, fontWeight:"bold", color:"#1a2d5a", marginBottom:5, textTransform:"uppercase", letterSpacing:0.4 },
    input: { width:"100%", border:"1px solid #e8e4dc", borderRadius:8, padding:"10px 12px", fontSize:14, fontFamily:"'DM Sans',sans-serif", marginBottom:14, boxSizing:"border-box" },
    textarea: { width:"100%", border:"1px solid #e8e4dc", borderRadius:8, padding:"10px 12px", fontSize:14, fontFamily:"'DM Sans',sans-serif", marginBottom:14, boxSizing:"border-box", minHeight:110, resize:"vertical" },
    btn: { background:"#1a2d5a", color:"#7ec11f", border:"2px solid #7ec11f", borderRadius:8, padding:"11px 24px", fontFamily:"'DM Sans',sans-serif", fontWeight:"bold", fontSize:14, cursor:"pointer", width:"100%" },
    btnGhost: { background:"transparent", color:"#888", border:"none", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer", marginTop:10, display:"block", textAlign:"center", width:"100%" },
    consentBox: { background:"#f8f6f1", border:"1px solid #e8e4dc", borderRadius:8, padding:"14px 16px", marginBottom:14 },
  };

  function handleSubmit() {
    if (!displayName.trim()) { setError("Please enter your name."); return; }
    if (!testimonialText.trim() || testimonialText.trim().length < 20) { setError("Please write at least a sentence or two."); return; }
    setError("");
    setSubmitting(true);
    fetch("/api/testimonials/submit", {
      method:"POST", credentials:"include",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ display_name: displayName.trim(), role_situation: roleSituation.trim(), testimonial_text: testimonialText.trim(), consent_given: consentGiven, trigger_type: trigger || "manual" })
    })
    .then(function(r){ return r.json(); })
    .then(function(d) {
      setSubmitting(false);
      if (d.ok) { setStep("thanks"); }
      else { setError(d.error || "Something went wrong. Please try again."); }
    })
    .catch(function() { setSubmitting(false); setError("Network error. Please try again."); });
  }

  if (step === "thanks") return React.createElement("div", { style: s.overlay },
    React.createElement("div", { style: { ...s.modal, textAlign:"center" } },
      React.createElement("div", { style: { fontSize:48, marginBottom:12 } }, "\uD83D\uDC4F"),
      React.createElement("div", { style: { fontWeight:"bold", fontSize:20, color:"#1a2d5a", marginBottom:8 } }, "Thank you!"),
      React.createElement("p", { style: { color:"#555", fontSize:14, lineHeight:1.7, marginBottom:20 } },
        consentGiven
          ? "Your review has been submitted. Once our team reviews it, it may appear on our site (first name + last initial only)."
          : "Your feedback has been recorded. Thank you for helping us improve the tool."
      ),
      React.createElement("button", { onClick: onClose, style: s.btn }, "Close")
    )
  );

  return React.createElement("div", { style: s.overlay },
    React.createElement("div", { style: s.modal },
      React.createElement("div", { style: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 } },
        React.createElement("div", null,
          React.createElement("div", { style: { fontWeight:"bold", fontSize:18, color:"#1a2d5a", marginBottom:4 } }, "Share Your Experience"),
          React.createElement("div", { style: { fontSize:13, color:"#888" } }, "Help others in similar situations find their path forward.")
        ),
        React.createElement("button", { onClick: onClose, style: { background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#aaa", marginLeft:12 } }, "\u00D7")
      ),

      React.createElement("label", { style: s.label }, "Your Name (first name + last initial)"),
      React.createElement("input", { style: s.input, placeholder:"e.g. Marcus T.", value: displayName, onChange: function(e){ setDisplayName(e.target.value); } }),

      React.createElement("label", { style: s.label }, "Your Role or Situation (optional)"),
      React.createElement("input", { style: s.input, placeholder:"e.g. Freelance contractor, back taxes", value: roleSituation, onChange: function(e){ setRoleSituation(e.target.value); } }),

      React.createElement("label", { style: s.label }, "Your Review"),
      React.createElement("textarea", { style: s.textarea, placeholder:"What was your situation? What did the tool help you understand or do?", value: testimonialText, onChange: function(e){ setTestimonialText(e.target.value); } }),

      React.createElement("div", { style: s.consentBox },
        React.createElement("div", { style: { display:"flex", gap:10, alignItems:"flex-start" } },
          React.createElement("input", { type:"checkbox", id:"testimonial-consent", checked: consentGiven, onChange: function(e){ setConsentGiven(e.target.checked); }, style: { marginTop:3, flexShrink:0, cursor:"pointer" } }),
          React.createElement("label", { htmlFor:"testimonial-consent", style: { fontSize:13, color:"#555", lineHeight:1.65, cursor:"pointer" } },
            "Yes, you may publish my review as described above \u2014 displayed as first name + last initial only on the IRS Pilot website and marketing materials to help others in similar situations."
          )
        ),
        React.createElement("div", { style: { fontSize:11, color:"#aaa", marginTop:8, lineHeight:1.5 } },
          "Unchecking this box means your feedback is collected privately for internal use only and will not be published. This consent is governed by IRC \u00a77216."
        )
      ),

      error && React.createElement("div", { style: { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:7, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:12 } }, error),

      React.createElement("button", { onClick: handleSubmit, disabled: submitting, style: s.btn }, submitting ? "Submitting\u2026" : "Submit Review"),
      React.createElement("button", { onClick: onClose, style: s.btnGhost }, "No thanks \u2014 skip this step")
    )
  );
}


function TestimonialStrip() {
  var _t = useState([]); var testimonials = _t[0]; var setTestimonials = _t[1];

  useEffect(function() {
    fetch("/api/testimonials/public")
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d.ok && d.testimonials.length) setTestimonials(d.testimonials); })
      .catch(function(){});
  }, []);

  if (!testimonials.length) return null;

  return React.createElement("div", { style: { background:"#f0f7ff", borderTop:"1px solid #e8e4dc", borderBottom:"1px solid #e8e4dc", padding:"36px 24px", marginBottom:32 } },
    React.createElement("div", { style: { maxWidth:900, margin:"0 auto" } },
      React.createElement("div", { style: { textAlign:"center", marginBottom:24 } },
        React.createElement("div", { style: { fontSize:11, fontWeight:"bold", color:"#7ec11f", letterSpacing:1.5, marginBottom:6 } }, "WHAT PEOPLE ARE SAYING"),
        React.createElement("div", { style: { fontSize:20, fontWeight:"bold", color:"#1a2d5a" } }, "Real outcomes from real situations")
      ),
      React.createElement("div", { style: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 } },
        testimonials.map(function(t, i) {
          return React.createElement("div", { key: i, style: { background:"#fff", border:"1px solid #e8e4dc", borderRadius:12, padding:"18px 20px" } },
            React.createElement("div", { style: { fontSize:24, color:"#7ec11f", marginBottom:10 } }, "\u201C"),
            React.createElement("p", { style: { fontSize:14, color:"#444", lineHeight:1.75, marginBottom:14 } }, t.testimonial_text),
            React.createElement("div", { style: { display:"flex", alignItems:"center", gap:10 } },
              React.createElement("div", { style: { width:34, height:34, background:"#1a2d5a", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#7ec11f", fontWeight:"bold", fontSize:14, flexShrink:0 } },
                (t.display_name||"?").charAt(0).toUpperCase()
              ),
              React.createElement("div", null,
                React.createElement("div", { style: { fontWeight:"bold", fontSize:13, color:"#1a2d5a" } }, t.display_name),
                t.role_situation && React.createElement("div", { style: { fontSize:12, color:"#888" } }, t.role_situation)
              )
            )
          );
        })
      )
    )
  );
}


// Listen for the custom event to show the form
(function() {
  var _show = false;
  var _trigger = "manual";
  var _container = null;

  function showForm(trigger) {
    if (_show) return;
    _show = true;
    _trigger = trigger || "manual";
    _container = document.createElement("div");
    document.body.appendChild(_container);
    render();
  }

  function render() {
    ReactDOM.render(
      React.createElement(TestimonialForm, {
        trigger: _trigger,
        onClose: function() {
          ReactDOM.unmountComponentAtNode(_container);
          document.body.removeChild(_container);
          _show = false;
        }
      }),
      _container
    );
  }

  window.addEventListener("irs:request-testimonial", function(e) {
    showForm(e.detail && e.detail.trigger);
  });
})();

window.TestimonialStrip = TestimonialStrip;
window.TestimonialForm = TestimonialForm;
