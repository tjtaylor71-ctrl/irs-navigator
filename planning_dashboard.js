const { useState, useEffect, useCallback } = React;


const API_BASE = "/planning";
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const pct = (n) => `${(n || 0).toFixed(1)}%`;
function MoneyField({ id, lbl, hnt, value, onChange }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase" };
  const hintStyle = { fontSize: 11, color: "#aaa", fontWeight: "normal", marginLeft: 6 };
  const prefixStyle = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 14, pointerEvents: "none" };
  const inpStyle = { width: "100%", padding: "10px 12px", paddingLeft: 28, border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", color: "#1a2d5a" };
  return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } },
    /* @__PURE__ */ React.createElement("label", { htmlFor: id, style: labelStyle }, lbl,
      hnt && /* @__PURE__ */ React.createElement("span", { style: hintStyle }, hnt)),
    /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } },
      /* @__PURE__ */ React.createElement("span", { style: prefixStyle }, "$"),
      /* @__PURE__ */ React.createElement("input", {
        id, name: id, type: "number", min: "0", step: "100", placeholder: "0",
        value, onChange,
        style: inpStyle
      })
    )
  );
}

function PlanningInput({ initialValues = {}, onSave, onCalculate, saving, calculating }) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const defaults = {
    filing_status: "single",
    income_w2: "",
    income_se: "",
    income_other: "",
    prior_year_tax: "",
    ytd_withholding: "",
    ytd_estimated_payments: "",
    paychecks_remaining: ""
  };
  const [form, setForm] = useState({ ...defaults, ...initialValues });
  // Only sync from parent on first load (when form is empty)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && initialValues && Object.keys(initialValues).length > 0) {
      setForm({ ...defaults, ...initialValues });
      setInitialized(true);
    }
  }, [initialized, JSON.stringify(initialValues)]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const toNumbers = () => ({
    ...form,
    income_w2: parseFloat(form.income_w2) || 0,
    income_se: parseFloat(form.income_se) || 0,
    income_other: parseFloat(form.income_other) || 0,
    prior_year_tax: parseFloat(form.prior_year_tax) || 0,
    ytd_withholding: parseFloat(form.ytd_withholding) || 0,
    ytd_estimated_payments: parseFloat(form.ytd_estimated_payments) || 0,
    paychecks_remaining: parseInt(form.paychecks_remaining) || 0
  });
  const inp = {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Georgia, serif",
    boxSizing: "border-box",
    color: "#1a2d5a"
  };
  const label = {
    display: "block",
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: "uppercase"
  };
  const hint = { fontSize: 11, color: "#aaa", fontWeight: "normal", marginLeft: 6 };
  const fieldset = {
    border: "1px solid #e8e4dc",
    borderRadius: 10,
    padding: "16px 18px",
    marginBottom: 16,
    background: "#fafaf8"
  };
  const legend = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", padding: "0 8px" };
  const prefix = {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#888",
    fontSize: 14,
    pointerEvents: "none"
  };

  return /* @__PURE__ */ React.createElement("div", { style: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8e4dc",
    padding: "24px 24px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
  } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Your ", currentYear, " Tax Information"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Enter estimates \u2014 you can update anytime. All amounts are annual."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { htmlFor: "filing_status", style: label }, "Filing Status"), /* @__PURE__ */ React.createElement(
    "select",
    {
      id: "filing_status",
      name: "filing_status",
      value: form.filing_status,
      onChange: handleChange,
      style: inp
    },
    /* @__PURE__ */ React.createElement("option", { value: "single" }, "Single"),
    /* @__PURE__ */ React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly"),
    /* @__PURE__ */ React.createElement("option", { value: "mj_separate" }, "Married Filing Separately"),
    /* @__PURE__ */ React.createElement("option", { value: "hoh" }, "Head of Household"),
    /* @__PURE__ */ React.createElement("option", { value: "widow" }, "Qualifying Surviving Spouse")
  )), /* @__PURE__ */ React.createElement("fieldset", { style: fieldset }, /* @__PURE__ */ React.createElement("legend", { style: legend }, "Income"), /* @__PURE__ */ React.createElement(MoneyField, { id: "income_w2", lbl: "W-2 Wages", value: form.income_w2, onChange: handleChange }), /* @__PURE__ */ React.createElement(
    MoneyField,
    {
      id: "income_se",
      lbl: "Self-Employment / Business Income",
      hnt: "Gross \u2014 before expenses",
      value: form.income_se,
      onChange: handleChange
    }
  ), /* @__PURE__ */ React.createElement(
    MoneyField,
    {
      id: "income_other",
      lbl: "Other Income",
      hnt: "Interest, dividends, 1099-R, rental",
      value: form.income_other,
      onChange: handleChange
    }
  )), /* @__PURE__ */ React.createElement("fieldset", { style: fieldset }, /* @__PURE__ */ React.createElement("legend", { style: legend }, "Prior Year & Payments Made"), /* @__PURE__ */ React.createElement(
    MoneyField,
    {
      id: "prior_year_tax",
      lbl: "Prior Year Total Tax",
      hnt: "Form 1040, Line 24",
      value: form.prior_year_tax,
      onChange: handleChange
    }
  ), /* @__PURE__ */ React.createElement(
    MoneyField,
    {
      id: "ytd_withholding",
      lbl: "YTD Federal Withholding",
      hnt: "From pay stubs so far this year",
      value: form.ytd_withholding,
      onChange: handleChange
    }
  ), /* @__PURE__ */ React.createElement(
    MoneyField,
    {
      id: "ytd_estimated_payments",
      lbl: "YTD Estimated Payments",
      hnt: "1040-ES payments already made",
      value: form.ytd_estimated_payments,
      onChange: handleChange
    }
  )), /* @__PURE__ */ React.createElement("fieldset", { style: fieldset }, /* @__PURE__ */ React.createElement("legend", { style: legend }, "W-4 Optimization (Optional)"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("label", { htmlFor: "paychecks_remaining", style: label }, "Paychecks Remaining This Year", /* @__PURE__ */ React.createElement("span", { style: hint }, "Leave blank to skip W-4 recommendation")), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "paychecks_remaining",
      name: "paychecks_remaining",
      type: "number",
      min: "0",
      max: "52",
      placeholder: "e.g. 18",
      value: form.paychecks_remaining,
      onChange: handleChange,
      style: inp
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onSave(toNumbers()),
      disabled: saving || calculating,
      style: {
        flex: 1,
        padding: "10px 0",
        background: "#fff",
        color: "#1a2d5a",
        border: "2px solid #1a2d5a",
        borderRadius: 8,
        fontFamily: "Georgia, serif",
        fontWeight: "bold",
        fontSize: 14,
        cursor: saving || calculating ? "default" : "pointer",
        opacity: saving || calculating ? 0.6 : 1
      }
    },
    saving ? "Saving..." : "Save"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onCalculate(toNumbers()),
      disabled: saving || calculating,
      style: {
        flex: 2,
        padding: "10px 0",
        background: "#7ec11f",
        color: "#1a2d5a",
        border: "2px solid #7ec11f",
        borderRadius: 8,
        fontFamily: "Georgia, serif",
        fontWeight: "bold",
        fontSize: 14,
        cursor: saving || calculating ? "default" : "pointer",
        opacity: saving || calculating ? 0.6 : 1
      }
    },
    calculating ? "Calculating..." : "Calculate My Tax Estimate"
  )), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 11, color: "#aaa", lineHeight: 1.6 } }, "Estimates for planning purposes only. Not professional tax advice."));
}
function PlanningResults({ results }) {
  if (!results) return null;
  const balanceOwed = results.balance_due > 0;
  const balanceColor = balanceOwed ? "#dc2626" : "#15803d";
  const balanceLabel = balanceOwed ? "Estimated Amount Owed" : results.balance_due < 0 ? "Estimated Refund" : "On Track \u2014 No Balance Due";
  const card = {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8e4dc",
    padding: "20px 22px",
    marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)"
  };
  const sectionTitle = {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1a2d5a",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2px solid #7ec11f"
  };
  const row = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #f0ede8",
    fontSize: 13,
    color: "#444"
  };
  const totalRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a2d5a",
    borderTop: "2px solid #e8e4dc",
    marginTop: 4
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#1a2d5a", border: "none", textAlign: "center", padding: "24px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#94a3b8", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 } }, balanceLabel), /* @__PURE__ */ React.createElement("div", { style: { color: balanceOwed ? "#fca5a5" : "#86efac", fontSize: 36, fontWeight: "bold", marginBottom: 10 } }, fmt(Math.abs(results.balance_due))), /* @__PURE__ */ React.createElement("div", { style: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "bold",
    background: results.safe_harbor_met ? "rgba(126,193,31,0.2)" : "rgba(245,158,11,0.2)",
    color: results.safe_harbor_met ? "#7ec11f" : "#f59e0b"
  } }, results.safe_harbor_met ? "\u2713 Safe harbor met" : "\u26A0 Safe harbor not yet met")), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: sectionTitle }, "Income & AGI"), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Gross Income"), /* @__PURE__ */ React.createElement("span", null, fmt(results.gross_income))), results.se_deduction > 0 && /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "SE Tax Deduction"), /* @__PURE__ */ React.createElement("span", null, "\u2212 ", fmt(results.se_deduction))), /* @__PURE__ */ React.createElement("div", { style: totalRow }, /* @__PURE__ */ React.createElement("span", null, "Adjusted Gross Income"), /* @__PURE__ */ React.createElement("span", null, fmt(results.estimated_agi))), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Standard Deduction"), /* @__PURE__ */ React.createElement("span", null, "\u2212 ", fmt(results.standard_deduction))), /* @__PURE__ */ React.createElement("div", { style: totalRow }, /* @__PURE__ */ React.createElement("span", null, "Taxable Income"), /* @__PURE__ */ React.createElement("span", null, fmt(results.estimated_taxable_income)))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: sectionTitle }, "Tax Liability"), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Income Tax"), /* @__PURE__ */ React.createElement("span", null, fmt(results.income_tax))), results.se_tax > 0 && /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Self-Employment Tax"), /* @__PURE__ */ React.createElement("span", null, fmt(results.se_tax))), /* @__PURE__ */ React.createElement("div", { style: totalRow }, /* @__PURE__ */ React.createElement("span", null, "Total Estimated Tax"), /* @__PURE__ */ React.createElement("span", null, fmt(results.estimated_total_tax))), /* @__PURE__ */ React.createElement("div", { style: { ...row, borderBottom: "none" } }, /* @__PURE__ */ React.createElement("span", null, "Effective Tax Rate"), /* @__PURE__ */ React.createElement("span", { style: { color: "#1a2d5a", fontWeight: "bold" } }, pct(results.effective_tax_rate_pct)))), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: sectionTitle }, "Payments Applied"), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Total Paid to Date"), /* @__PURE__ */ React.createElement("span", null, fmt(results.total_paid))), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", null, "Safe Harbor Required"), /* @__PURE__ */ React.createElement("span", null, fmt(results.safe_harbor_amount))), /* @__PURE__ */ React.createElement("div", { style: { ...totalRow, color: balanceColor } }, /* @__PURE__ */ React.createElement("span", null, balanceOwed ? "Remaining Balance" : "Ahead by"), /* @__PURE__ */ React.createElement("span", null, fmt(Math.abs(results.balance_due))))), balanceOwed && /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: sectionTitle }, "Quarterly Payment Schedule"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, "Divide your remaining balance into equal payments to stay penalty-free."), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, [
    { label: "Q1", amount: results.q1_payment, due: results.q1_due },
    { label: "Q2", amount: results.q2_payment, due: results.q2_due },
    { label: "Q3", amount: results.q3_payment, due: results.q3_due },
    { label: "Q4", amount: results.q4_payment, due: results.q4_due }
  ].map((q) => /* @__PURE__ */ React.createElement("div", { key: q.label, style: {
    background: "#f8f6f1",
    borderRadius: 10,
    padding: "14px 16px",
    textAlign: "center",
    border: "1px solid #e8e4dc"
  } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#888", fontWeight: "bold", letterSpacing: 1 } }, q.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", margin: "6px 0" } }, fmt(q.amount)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "Due ", q.due))))), results.w4_additional_per_paycheck > 0 && /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#f0fdf4", border: "1.5px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: sectionTitle }, "W-4 Recommendation"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", color: "#15803d" } }, fmt(results.w4_additional_per_paycheck)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "additional per paycheck")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#444", lineHeight: 1.6 } }, "Add this to ", /* @__PURE__ */ React.createElement("strong", null, "Form W-4, Line 4(c)"), " to cover your balance through withholding and avoid quarterly payments."))), results.overpayment > 0 && /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#f0fdf4", border: "1.5px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#15803d", lineHeight: 1.6 } }, "\uD83C\uDF89 You are on track for a refund of approximately ", /* @__PURE__ */ React.createElement("strong", null, fmt(results.overpayment)), ". Consider applying it to next year's estimated taxes.")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", lineHeight: 1.6, marginTop: 4 } }, "Estimates for planning purposes only and do not constitute professional tax advice. Consult a licensed tax professional for your specific situation."));
}
function PlanningDashboard() {
  const [session, setSession] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastCalc, setLastCalc] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/session`, { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login?next=/planning";
          return;
        }
        const data = await res.json();
        setSession(data.session || {});
        setResults(data.results || null);
        if (data.results?.calculated_at) setLastCalc(data.results.calculated_at);
      } catch (err) {
        setError("Failed to load your planning session. Please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const handleSave = useCallback(async (formData) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Save failed");
      // Don't setSession here — would reset input form
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, []);
  const handleCalculate = useCallback(async (formData) => {
    setCalculating(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const res = await fetch(`${API_BASE}/calculate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed");
      setResults(data);
      setLastCalc((/* @__PURE__ */ new Date()).toISOString());
      // Don't reset session — keeps input stable
    } catch (err) {
      setError(err.message || "Calculation error. Please try again.");
    } finally {
      setCalculating(false);
    }
  }, []);
  if (loading) return /* @__PURE__ */ React.createElement("div", { style: {
    fontFamily: "Georgia, serif",
    minHeight: "100vh",
    background: "#f8f6f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#888" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 12 } }, "\uD83D\uDCCA"), "Loading your tax planning session..."));
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderBottom: "3px solid #7ec11f", padding: "14px 24px" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("a", { href: "/navigator", style: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 40, height: 40, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"), /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "TAX PLANNING")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("a", { href: "/navigator", style: {
    color: "#cce8a0",
    fontSize: 12,
    textDecoration: "none",
    padding: "6px 12px",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 6
  } }, "\u2190 Navigator"), /* @__PURE__ */ React.createElement("a", { href: "/account", style: {
    color: "#cce8a0",
    fontSize: 12,
    textDecoration: "none",
    padding: "6px 12px",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 6
  } }, "My Account")))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", padding: "28px 24px 0" } }, /* @__PURE__ */ React.createElement("h1", { style: { fontSize: 26, fontWeight: "bold", color: "#1a2d5a", margin: "0 0 6px" } }, "Tax Planning Dashboard"), /* @__PURE__ */ React.createElement("p", { style: { color: "#666", fontSize: 14, margin: "0 0 4px" } }, "Estimate your ", (/* @__PURE__ */ new Date()).getFullYear(), " tax liability, track quarterly payments, and stay penalty-free."), lastCalc && /* @__PURE__ */ React.createElement("p", { style: { color: "#aaa", fontSize: 12, margin: 0 } }, "Last calculated: ", new Date(lastCalc).toLocaleString())), error && /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "16px auto 0", padding: "0 24px" } }, /* @__PURE__ */ React.createElement("div", { style: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "12px 16px",
    color: "#dc2626",
    fontSize: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  } }, error, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setError(null),
      style: { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 18 }
    },
    "\xD7"
  ))), /* @__PURE__ */ React.createElement("div", { style: {
    maxWidth: 1100,
    margin: "20px auto",
    padding: "0 24px 40px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    alignItems: "start"
  } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    PlanningInput,
    {
      initialValues: session,
      onSave: handleSave,
      onCalculate: handleCalculate,
      saving,
      calculating
    }
  )), /* @__PURE__ */ React.createElement("div", null, results ? /* @__PURE__ */ React.createElement(PlanningResults, { results }) : /* @__PURE__ */ React.createElement("div", { style: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8e4dc",
    padding: "48px 32px",
    textAlign: "center",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
  } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCCA"), /* @__PURE__ */ React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "Your results will appear here"), /* @__PURE__ */ React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7, margin: 0 } }, "Fill in your income details on the left and click", " ", /* @__PURE__ */ React.createElement("strong", { style: { color: "#1a2d5a" } }, "Calculate My Tax Estimate"), " ", "to see your estimated liability, safe harbor status, and quarterly payment schedule.")))));
}
window.PlanningDashboard = PlanningDashboard;