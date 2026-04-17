
function IRSPilotNav(props) {
  var subtitle = props.subtitle || 'TAXPAYER SELF-HELP';
  var _s = React.useState(null); var user = _s[0]; var setUser = _s[1];
  var _o = React.useState(false); var open = _o[0]; var setOpen = _o[1];
  React.useEffect(function() {
    fetch('/api/me', { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .catch(function() { return { loggedIn: false }; })
      .then(setUser);
  }, []);
  React.useEffect(function() {
    function h(e) { var m = document.getElementById('irsn-m'); if (m && !m.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return function() { document.removeEventListener('mousedown', h); };
  }, []);
  var initials = user && user.loggedIn ? (user.email||'').substring(0,2).toUpperCase() : '';
  var al = '';
  if (user && user.loggedIn) {
    var acc = user.access || [];
    if (acc.indexOf('bundle')!==-1) al='Bundle Access';
    else if (acc.indexOf('wizard')!==-1) al='Wizard Access';
    else if (acc.indexOf('navigator')!==-1) al='Navigator Access';
    else al='Free Account';
  }
  var hN = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='navigator'||a==='bundle';});
  var hB = user&&user.loggedIn&&(user.access||[]).indexOf('bundle')!==-1;
  var hW = user&&user.loggedIn&&(user.access||[]).some(function(a){return a==='wizard'||a==='bundle';});
  var lnk = { display:'flex',alignItems:'center',gap:10,padding:'10px 16px',color:'#333',textDecoration:'none',fontSize:13,borderBottom:'1px solid #f5f2ee' };
  var bdg = { marginLeft:'auto',background:'#7ec11f',color:'#1a2d5a',fontSize:9,fontWeight:'bold',padding:'2px 7px',borderRadius:10 };
  return React.createElement('div',{style:{background:'#1a2d5a',borderBottom:'3px solid #7ec11f',padding:'12px 24px',fontFamily:'DM Sans',sans-serif,position:'relative',zIndex:100}},
    React.createElement('div',{style:{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}},
      React.createElement('a',{href:'/',style:{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}},
        React.createElement('img',{src:'/static/logo.png',alt:'IRS Pilot',style:{width:36,height:36,objectFit:'contain'}}),
        React.createElement('div',null,
          React.createElement('div',{style:{color:'#fff',fontWeight:'bold',fontSize:15}},'IRS Pilot'),
          React.createElement('div',{style:{color:'#7ec11f',fontSize:9,letterSpacing:1.5}},subtitle)
        )
      ),
      user===null ? React.createElement('div',null) :
      !user.loggedIn
        ? React.createElement('a',{href:'/login',style:{color:'#cce8a0',fontSize:13,textDecoration:'none',padding:'7px 16px',border:'1.5px solid rgba(126,193,31,0.4)',borderRadius:20,fontFamily:'DM Sans',sans-serif}},'Sign In')
        : React.createElement('div',{id:'irsn-m',style:{position:'relative'}},
            React.createElement('button',{style:{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.15)',color:'#fff',padding:'6px 12px 6px 6px',borderRadius:24,fontFamily:'DM Sans',sans-serif,fontSize:13,cursor:'pointer',outline:'none'},onClick:function(){setOpen(function(o){return !o;});}},
              React.createElement('div',{style:{width:28,height:28,background:'#7ec11f',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:'bold',color:'#1a2d5a',flexShrink:0}},initials),
              React.createElement('div',null,
                React.createElement('div',{style:{fontSize:12,color:'#cce8a0',lineHeight:1.2}},(user.email||'').split('@')[0]),
                React.createElement('div',{style:{fontSize:9,color:'#888'}},al)
              ),
              React.createElement('span',{style:{fontSize:9,color:'#7ec11f',marginLeft:2}},open?'\u25b4':'\u25be')
            ),
            React.createElement('div',{style:{display:open?'block':'none',position:'absolute',top:'calc(100% + 8px)',right:0,background:'#fff',borderRadius:12,minWidth:220,boxShadow:'0 12px 40px rgba(26,45,90,0.2)',overflow:'hidden',border:'1px solid #e8e4dc',zIndex:9999}},
              React.createElement('div',{style:{padding:'12px 16px',background:'#f8f6f1',borderBottom:'1px solid #e8e4dc'}},
                React.createElement('div',{style:{fontWeight:'bold',fontSize:13,color:'#1a2d5a'}},(user.email||'').split('@')[0]),
                React.createElement('div',{style:{fontSize:11,color:'#888',marginTop:2}},user.email||'')
              ),
              React.createElement('a',{href:'/navigator',style:lnk},'\uD83E\uDDED Navigator',hN&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/planning',style:lnk},'\uD83D\uDCCA Tax Planning',hB&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/letters',style:lnk},'\uD83D\uDCC4 Letter Generator',hW&&React.createElement('span',{style:bdg},'Active')),
              React.createElement('a',{href:'/transcript',style:lnk},'\uD83D\uDCC1 Transcript Analyzer'),
              React.createElement('a',{href:'/account',style:lnk},'\u2699\ufe0f My Account'),
              React.createElement('a',{href:'/logout',style:Object.assign({},lnk,{color:'#dc2626',borderBottom:'none'})},'\uD83D\uDEAA Sign Out')
            )
          )
    )
  );
}

const { useState, useEffect, useCallback } = React;

const API_BASE = "/planning";
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const pct = (n) => `${(n || 0).toFixed(1)}%`;
const num = (v) => parseFloat(String(v).replace(/[^0-9.]/g, "")) || 0;

// ── Shared Components ────────────────────────────────────────────────────────

function MoneyField({ id, lbl, hnt, value, onChange }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase" };
  const hintStyle = { fontSize: 11, color: "#aaa", fontWeight: "normal", marginLeft: 6 };
  const prefixStyle = { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 14, pointerEvents: "none" };
  const inpStyle = { width: "100%", padding: "10px 12px", paddingLeft: 28, border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "DM Sans", sans-serif, boxSizing: "border-box", color: "#1a2d5a" };
  return React.createElement("div", { style: { marginBottom: 14 } },
    React.createElement("label", { htmlFor: id, style: labelStyle }, lbl,
      hnt && React.createElement("span", { style: hintStyle }, hnt)),
    React.createElement("div", { style: { position: "relative" } },
      React.createElement("span", { style: prefixStyle }, "$"),
      React.createElement("input", { id, name: id, type: "number", min: "0", step: "100", placeholder: "0", value, onChange, style: inpStyle })
    )
  );
}

function InfoBox({ children, type = "info" }) {
  const colors = {
    info:  { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
    warn:  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
    green: { bg: "#f0fdf4", border: "#7ec11f", text: "#15803d" },
    red:   { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
  };
  const c = colors[type] || colors.info;
  return React.createElement("div", { style: { background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: c.text, lineHeight: 1.6 } }, children);
}

function ResultRow({ label, value, bold, indent, color }) {
  return React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0ede8", fontSize: 13, color: color || "#444", fontWeight: bold ? "bold" : "normal", paddingLeft: indent ? 16 : 0 } },
    React.createElement("span", null, label),
    React.createElement("span", null, value)
  );
}

const cardStyle = { background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "20px 22px", marginBottom: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" };
const sectionTitleStyle = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #7ec11f" };
const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "DM Sans", sans-serif, boxSizing: "border-box", color: "#1a2d5a" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase" };
const fieldsetStyle = { border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 18px", marginBottom: 16, background: "#fafaf8" };
const legendStyle = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", padding: "0 8px" };
const hintStyle = { fontSize: 11, color: "#aaa", fontWeight: "normal", marginLeft: 6 };
const calcBtnStyle = { width: "100%", padding: "11px 0", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "DM Sans", sans-serif, fontWeight: "bold", fontSize: 14, cursor: "pointer", marginTop: 8 };

// ── TAB 1: Estimated Tax (existing) ─────────────────────────────────────────

function PlanningInput({ initialValues = {}, onSave, onCalculate, saving, calculating }) {
  const currentYear = new Date().getFullYear();
  const defaults = { filing_status: "single", income_w2: "", income_se: "", income_other: "", prior_year_tax: "", ytd_withholding: "", ytd_estimated_payments: "", paychecks_remaining: "" };
  const [form, setForm] = useState({ ...defaults, ...initialValues });
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && initialValues && Object.keys(initialValues).length > 0) {
      setForm({ ...defaults, ...initialValues });
      setInitialized(true);
    }
  }, [initialized, JSON.stringify(initialValues)]);
  const handleChange = (e) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); };
  const toNumbers = () => ({ ...form, income_w2: parseFloat(form.income_w2)||0, income_se: parseFloat(form.income_se)||0, income_other: parseFloat(form.income_other)||0, prior_year_tax: parseFloat(form.prior_year_tax)||0, ytd_withholding: parseFloat(form.ytd_withholding)||0, ytd_estimated_payments: parseFloat(form.ytd_estimated_payments)||0, paychecks_remaining: parseInt(form.paychecks_remaining)||0 });
  return React.createElement("div", { style: { ...cardStyle } },
    React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Your ", currentYear, " Tax Information"),
    React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Enter estimates \u2014 you can update anytime. All amounts are annual."),
    React.createElement("div", { style: { marginBottom: 16 } },
      React.createElement("label", { htmlFor: "filing_status", style: labelStyle }, "Filing Status"),
      React.createElement("select", { id: "filing_status", name: "filing_status", value: form.filing_status, onChange: handleChange, style: inpStyle },
        React.createElement("option", { value: "single" }, "Single"),
        React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly"),
        React.createElement("option", { value: "mj_separate" }, "Married Filing Separately"),
        React.createElement("option", { value: "hoh" }, "Head of Household"),
        React.createElement("option", { value: "widow" }, "Qualifying Surviving Spouse")
      )
    ),
    React.createElement("fieldset", { style: fieldsetStyle },
      React.createElement("legend", { style: legendStyle }, "Income"),
      React.createElement(MoneyField, { id: "income_w2", lbl: "W-2 Wages", value: form.income_w2, onChange: handleChange }),
      React.createElement(MoneyField, { id: "income_se", lbl: "Self-Employment / Business Income", hnt: "Gross \u2014 before expenses", value: form.income_se, onChange: handleChange }),
      React.createElement(MoneyField, { id: "income_other", lbl: "Other Income", hnt: "Interest, dividends, 1099-R, rental", value: form.income_other, onChange: handleChange })
    ),
    React.createElement("fieldset", { style: fieldsetStyle },
      React.createElement("legend", { style: legendStyle }, "Prior Year & Payments Made"),
      React.createElement(MoneyField, { id: "prior_year_tax", lbl: "Prior Year Total Tax", hnt: "Form 1040, Line 24", value: form.prior_year_tax, onChange: handleChange }),
      React.createElement(MoneyField, { id: "ytd_withholding", lbl: "YTD Federal Withholding", hnt: "From pay stubs so far this year", value: form.ytd_withholding, onChange: handleChange }),
      React.createElement(MoneyField, { id: "ytd_estimated_payments", lbl: "YTD Estimated Payments", hnt: "1040-ES payments already made", value: form.ytd_estimated_payments, onChange: handleChange })
    ),
    React.createElement("fieldset", { style: fieldsetStyle },
      React.createElement("legend", { style: legendStyle }, "W-4 Optimization (Optional)"),
      React.createElement("div", { style: { marginBottom: 14 } },
        React.createElement("label", { htmlFor: "paychecks_remaining", style: labelStyle }, "Paychecks Remaining This Year", React.createElement("span", { style: hintStyle }, "Leave blank to skip W-4 recommendation")),
        React.createElement("input", { id: "paychecks_remaining", name: "paychecks_remaining", type: "number", min: "0", max: "52", placeholder: "e.g. 18", value: form.paychecks_remaining, onChange: handleChange, style: inpStyle })
      )
    ),
    React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8 } },
      React.createElement("button", { onClick: () => onSave(toNumbers()), disabled: saving||calculating, style: { flex: 1, padding: "10px 0", background: "#fff", color: "#1a2d5a", border: "2px solid #1a2d5a", borderRadius: 8, fontFamily: "DM Sans", sans-serif, fontWeight: "bold", fontSize: 14, cursor: saving||calculating?"default":"pointer", opacity: saving||calculating?0.6:1 } }, saving ? "Saving..." : "Save"),
      React.createElement("button", { onClick: () => onCalculate(toNumbers()), disabled: saving||calculating, style: { flex: 2, padding: "10px 0", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "DM Sans", sans-serif, fontWeight: "bold", fontSize: 14, cursor: saving||calculating?"default":"pointer", opacity: saving||calculating?0.6:1 } }, calculating ? "Calculating..." : "Calculate My Tax Estimate")
    ),
    React.createElement("div", { style: { marginTop: 12, fontSize: 11, color: "#aaa", lineHeight: 1.6 } }, "Estimates for planning purposes only. Not professional tax advice.")
  );
}

function PlanningResults({ results }) {
  if (!results) return null;
  const balanceOwed = results.balance_due > 0;
  const balanceColor = balanceOwed ? "#dc2626" : "#15803d";
  const balanceLabel = balanceOwed ? "Estimated Amount Owed" : results.balance_due < 0 ? "Estimated Refund" : "On Track \u2014 No Balance Due";
  return React.createElement("div", null,
    React.createElement("div", { style: { ...cardStyle, background: "#1a2d5a", border: "none", textAlign: "center", padding: "24px" } },
      React.createElement("div", { style: { color: "#94a3b8", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 } }, balanceLabel),
      React.createElement("div", { style: { color: balanceOwed ? "#fca5a5" : "#86efac", fontSize: 36, fontWeight: "bold", marginBottom: 10 } }, fmt(Math.abs(results.balance_due))),
      React.createElement("div", { style: { display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: "bold", background: results.safe_harbor_met ? "rgba(126,193,31,0.2)" : "rgba(245,158,11,0.2)", color: results.safe_harbor_met ? "#7ec11f" : "#f59e0b" } }, results.safe_harbor_met ? "\u2713 Safe harbor met" : "\u26A0 Safe harbor not yet met")
    ),
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Income & AGI"),
      React.createElement(ResultRow, { label: "Gross Income", value: fmt(results.gross_income) }),
      results.se_deduction > 0 && React.createElement(ResultRow, { label: "SE Tax Deduction", value: "\u2212 " + fmt(results.se_deduction) }),
      React.createElement(ResultRow, { label: "Adjusted Gross Income", value: fmt(results.estimated_agi), bold: true }),
      React.createElement(ResultRow, { label: "Standard Deduction", value: "\u2212 " + fmt(results.standard_deduction) }),
      React.createElement(ResultRow, { label: "Taxable Income", value: fmt(results.estimated_taxable_income), bold: true })
    ),
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Tax Liability"),
      React.createElement(ResultRow, { label: "Income Tax", value: fmt(results.income_tax) }),
      results.se_tax > 0 && React.createElement(ResultRow, { label: "Self-Employment Tax", value: fmt(results.se_tax) }),
      React.createElement(ResultRow, { label: "Total Estimated Tax", value: fmt(results.estimated_total_tax), bold: true }),
      React.createElement(ResultRow, { label: "Effective Tax Rate", value: pct(results.effective_tax_rate_pct) })
    ),
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Payments Applied"),
      React.createElement(ResultRow, { label: "Total Paid to Date", value: fmt(results.total_paid) }),
      React.createElement(ResultRow, { label: "Safe Harbor Required", value: fmt(results.safe_harbor_amount) }),
      React.createElement(ResultRow, { label: balanceOwed ? "Remaining Balance" : "Ahead by", value: fmt(Math.abs(results.balance_due)), bold: true, color: balanceColor })
    ),
    balanceOwed && React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Quarterly Payment Schedule"),
      React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 14 } }, "Divide your remaining balance into equal payments to stay penalty-free."),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
        [{ label: "Q1", amount: results.q1_payment, due: results.q1_due }, { label: "Q2", amount: results.q2_payment, due: results.q2_due }, { label: "Q3", amount: results.q3_payment, due: results.q3_due }, { label: "Q4", amount: results.q4_payment, due: results.q4_due }].map((q) =>
          React.createElement("div", { key: q.label, style: { background: "#f8f6f1", borderRadius: 10, padding: "14px 16px", textAlign: "center", border: "1px solid #e8e4dc" } },
            React.createElement("div", { style: { fontSize: 11, color: "#888", fontWeight: "bold", letterSpacing: 1 } }, q.label),
            React.createElement("div", { style: { fontSize: 20, fontWeight: "bold", color: "#1a2d5a", margin: "6px 0" } }, fmt(q.amount)),
            React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "Due ", q.due)
          )
        )
      )
    ),
    results.w4_additional_per_paycheck > 0 && React.createElement("div", { style: { ...cardStyle, background: "#f0fdf4", border: "1.5px solid #7ec11f" } },
      React.createElement("div", { style: sectionTitleStyle }, "W-4 Recommendation"),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
        React.createElement("div", { style: { textAlign: "center" } },
          React.createElement("div", { style: { fontSize: 28, fontWeight: "bold", color: "#15803d" } }, fmt(results.w4_additional_per_paycheck)),
          React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "additional per paycheck")
        ),
        React.createElement("div", { style: { fontSize: 13, color: "#444", lineHeight: 1.6 } }, "Add this to ", React.createElement("strong", null, "Form W-4, Line 4(c)"), " to cover your balance through withholding and avoid quarterly payments.")
      )
    ),
    results.overpayment > 0 && React.createElement("div", { style: { ...cardStyle, background: "#f0fdf4", border: "1.5px solid #7ec11f" } },
      React.createElement("div", { style: { fontSize: 13, color: "#15803d", lineHeight: 1.6 } }, "\uD83C\uDF89 You are on track for a refund of approximately ", React.createElement("strong", null, fmt(results.overpayment)), ". Consider applying it to next year\'s estimated taxes.")
    ),
    React.createElement("div", { style: { fontSize: 11, color: "#aaa", lineHeight: 1.6, marginTop: 4 } }, "Estimates for planning purposes only and do not constitute professional tax advice.")
  );
}

// ── TAB 2: Self-Employment Planning ─────────────────────────────────────────

function SEPlanning() {
  const [f, setF] = useState({ gross_revenue: "", business_expenses: "", home_office_sqft: "", home_sqft: "", home_expense: "", vehicle_miles_business: "", vehicle_miles_total: "", vehicle_actual_cost: "", method: "standard", retirement_type: "sep", retirement_contrib: "", health_premium: "", filing_status: "single" });
  const [results, setResults] = useState(null);
  const ch = (e) => { const { name, value } = e.target; setF(p => ({ ...p, [name]: value })); };

  const calculate = () => {
    const rev = num(f.gross_revenue);
    const expenses = num(f.business_expenses);

    // Vehicle deduction
    const bizMiles = num(f.vehicle_miles_business);
    const totalMiles = num(f.vehicle_miles_total);
    const mileageRate = 0.70; // 2025 IRS standard mileage rate (70 cents)
    const vehicleStandard = bizMiles * mileageRate;
    const vehicleActualPct = totalMiles > 0 ? bizMiles / totalMiles : 0;
    const vehicleActual = num(f.vehicle_actual_cost) * vehicleActualPct;
    const vehicleDeduction = f.method === "standard" ? vehicleStandard : vehicleActual;

    // Home office deduction
    const officePct = num(f.home_sqft) > 0 ? num(f.home_office_sqft) / num(f.home_sqft) : 0;
    const homeOfficeDeduction = num(f.home_expense) * officePct;
    const homeOfficeSimplified = num(f.home_office_sqft) * 5; // $5/sqft, max 300 sqft

    // Net profit before retirement/health
    const netBeforeDeductions = rev - expenses - vehicleDeduction - homeOfficeDeduction;

    // SE Tax
    const netEarnings = Math.max(0, netBeforeDeductions) * 0.9235;
    const ssTax = Math.min(netEarnings, 176100) * 0.124;
    const medicareTax = netEarnings * 0.029;
    const seTax = ssTax + medicareTax;
    const seDeduction = seTax / 2;

    // Retirement contribution limits
    const sep_limit = Math.min(netBeforeDeductions * 0.25, 70000); // 2025 SEP-IRA
    const solo401_employee = Math.min(netBeforeDeductions, 23500); // 2025 employee
    const solo401_employer = Math.min((netBeforeDeductions - seDeduction) * 0.25, 46500);
    const solo401_total = Math.min(solo401_employee + solo401_employer, 70000);
    const simple_limit = Math.min(netBeforeDeductions, 16500); // 2025 SIMPLE IRA

    const retirementLimits = { sep: sep_limit, solo401: solo401_total, simple: simple_limit };
    const retirementMax = retirementLimits[f.retirement_type] || sep_limit;
    const retirementActual = Math.min(num(f.retirement_contrib) || retirementMax, retirementMax);

    // Health insurance deduction (SE health insurance — 100% deductible up to net profit)
    const healthDeduction = Math.min(num(f.health_premium), Math.max(0, netBeforeDeductions - retirementActual));

    // Final net profit (AGI component)
    const netProfit = Math.max(0, netBeforeDeductions - retirementActual - healthDeduction);
    const agi = netProfit - seDeduction;

    // QBI Deduction (simplified — 20% of QBI, subject to limits)
    const qbi = Math.max(0, netProfit);
    const qbiDeduction = qbi * 0.20;

    // Standard deduction
    const stdDed = { single: 15000, mj_joint: 30000, mj_separate: 15000, hoh: 22500, widow: 30000 }[f.filing_status] || 15000;
    const taxableIncome = Math.max(0, agi - stdDed - qbiDeduction);

    // Income tax (simplified brackets for single)
    const brackets = { single: [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]], mj_joint: [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]], mj_separate: [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[375800,0.35],[Infinity,0.37]], hoh: [[17000,0.10],[64850,0.12],[103350,0.22],[197300,0.24],[250500,0.32],[626350,0.35],[Infinity,0.37]], widow: [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]] };
    const bkts = brackets[f.filing_status] || brackets.single;
    let incomeTax = 0, prev = 0;
    for (const [ceil, rate] of bkts) {
      if (taxableIncome <= prev) break;
      incomeTax += (Math.min(taxableIncome, ceil) - prev) * rate;
      prev = ceil;
    }

    const totalTax = incomeTax + seTax;
    const effectiveRate = rev > 0 ? (totalTax / rev * 100) : 0;

    setResults({ rev, expenses, vehicleDeduction, homeOfficeDeduction, homeOfficeSimplified, netBeforeDeductions, seTax, seDeduction, retirementActual, retirementMax, retirementType: f.retirement_type, healthDeduction, netProfit, agi, qbiDeduction, stdDed, taxableIncome, incomeTax, totalTax, effectiveRate, bizMiles, vehicleStandard, vehicleActual, vehicleActualPct, officePct, sep_limit, solo401_total, simple_limit });
  };

  const rtypeLabel = { sep: "SEP-IRA", solo401: "Solo 401(k)", simple: "SIMPLE IRA" }[f.retirement_type] || "Retirement";

  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" } },
    // LEFT: Inputs
    React.createElement("div", null,
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Self-Employment & Business Planning"),
        React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Optimize deductions, retirement contributions, and tax strategy."),
        React.createElement(InfoBox, { type: "info" }, "\uD83D\uDCA1 This tool uses the 2025 IRS standard mileage rate of 70\u00a2/mile and 2025 contribution limits."),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Business Income & Expenses"),
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: labelStyle }, "Filing Status"),
            React.createElement("select", { name: "filing_status", value: f.filing_status, onChange: ch, style: inpStyle },
              React.createElement("option", { value: "single" }, "Single"),
              React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly"),
              React.createElement("option", { value: "mj_separate" }, "Married Filing Separately"),
              React.createElement("option", { value: "hoh" }, "Head of Household")
            )
          ),
          React.createElement(MoneyField, { id: "gross_revenue", lbl: "Gross Business Revenue", hnt: "Total receipts before any expenses", value: f.gross_revenue, onChange: ch }),
          React.createElement(MoneyField, { id: "business_expenses", lbl: "Other Business Expenses", hnt: "Supplies, software, professional fees, etc.", value: f.business_expenses, onChange: ch })
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Vehicle Deduction"),
          React.createElement("div", { style: { marginBottom: 10 } },
            React.createElement("label", { style: labelStyle }, "Deduction Method"),
            React.createElement("div", { style: { display: "flex", gap: 16 } },
              ["standard", "actual"].map(m => React.createElement("label", { key: m, style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" } },
                React.createElement("input", { type: "radio", name: "method", value: m, checked: f.method === m, onChange: ch }),
                m === "standard" ? "Standard Mileage (70\u00a2/mile)" : "Actual Expenses"
              ))
            )
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Business Miles"),
              React.createElement("input", { name: "vehicle_miles_business", type: "number", placeholder: "0", value: f.vehicle_miles_business, onChange: ch, style: inpStyle })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Total Miles Driven"),
              React.createElement("input", { name: "vehicle_miles_total", type: "number", placeholder: "0", value: f.vehicle_miles_total, onChange: ch, style: inpStyle })
            )
          ),
          f.method === "actual" && React.createElement("div", { style: { marginTop: 10 } },
            React.createElement(MoneyField, { id: "vehicle_actual_cost", lbl: "Total Vehicle Costs (actual)", hnt: "Gas, insurance, repairs, depreciation", value: f.vehicle_actual_cost, onChange: ch })
          )
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Home Office Deduction"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Office Sq Ft"),
              React.createElement("input", { name: "home_office_sqft", type: "number", placeholder: "0", value: f.home_office_sqft, onChange: ch, style: inpStyle })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Total Home Sq Ft"),
              React.createElement("input", { name: "home_sqft", type: "number", placeholder: "0", value: f.home_sqft, onChange: ch, style: inpStyle })
            )
          ),
          React.createElement("div", { style: { marginTop: 10 } },
            React.createElement(MoneyField, { id: "home_expense", lbl: "Annual Home Expenses", hnt: "Rent/mortgage, utilities, insurance", value: f.home_expense, onChange: ch })
          ),
          React.createElement(InfoBox, { type: "info" }, "Simplified method: $5/sqft up to 300 sqft (" + fmt(Math.min(num(f.home_office_sqft),300)*5) + "). Regular method uses actual percentage shown above.")
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Retirement & Health"),
          React.createElement("div", { style: { marginBottom: 10 } },
            React.createElement("label", { style: labelStyle }, "Retirement Plan Type"),
            React.createElement("select", { name: "retirement_type", value: f.retirement_type, onChange: ch, style: inpStyle },
              React.createElement("option", { value: "sep" }, "SEP-IRA (up to 25% of net, max $70,000)"),
              React.createElement("option", { value: "solo401" }, "Solo 401(k) (employee + employer, max $70,000)"),
              React.createElement("option", { value: "simple" }, "SIMPLE IRA (max $16,500)")
            )
          ),
          React.createElement(MoneyField, { id: "retirement_contrib", lbl: "Planned Contribution", hnt: "Leave blank to use maximum allowed", value: f.retirement_contrib, onChange: ch }),
          React.createElement(MoneyField, { id: "health_premium", lbl: "Self-Employed Health Insurance Premium", hnt: "100% deductible if not eligible for employer plan", value: f.health_premium, onChange: ch })
        ),

        React.createElement("button", { onClick: calculate, style: calcBtnStyle }, "\uD83D\uDCCA Calculate SE Tax & Deductions")
      )
    ),

    // RIGHT: Results
    React.createElement("div", null,
      results ? React.createElement("div", null,
        // Summary card
        React.createElement("div", { style: { ...cardStyle, background: "#1a2d5a", border: "none", padding: "24px", textAlign: "center" } },
          React.createElement("div", { style: { color: "#94a3b8", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 } }, "Estimated Total Tax Burden"),
          React.createElement("div", { style: { color: "#fca5a5", fontSize: 36, fontWeight: "bold", marginBottom: 6 } }, fmt(results.totalTax)),
          React.createElement("div", { style: { color: "#7ec11f", fontSize: 13 } }, "Effective rate on revenue: " + results.effectiveRate.toFixed(1) + "%")
        ),
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Deductions Summary"),
          React.createElement(ResultRow, { label: "Gross Revenue", value: fmt(results.rev) }),
          React.createElement(ResultRow, { label: "Business Expenses", value: "\u2212 " + fmt(results.expenses) }),
          React.createElement(ResultRow, { label: "Vehicle Deduction (" + (results.bizMiles||0).toLocaleString() + " mi)", value: "\u2212 " + fmt(results.vehicleDeduction) }),
          React.createElement(ResultRow, { label: "Home Office (" + ((results.officePct||0)*100).toFixed(1) + "%)", value: "\u2212 " + fmt(results.homeOfficeDeduction) }),
          React.createElement(ResultRow, { label: "Net Before Other Deductions", value: fmt(results.netBeforeDeductions), bold: true }),
          React.createElement(ResultRow, { label: rtypeLabel + " Contribution", value: "\u2212 " + fmt(results.retirementActual) }),
          React.createElement(ResultRow, { label: "SE Health Insurance", value: "\u2212 " + fmt(results.healthDeduction) }),
          React.createElement(ResultRow, { label: "Net Profit (Schedule C)", value: fmt(results.netProfit), bold: true })
        ),
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Tax Calculation"),
          React.createElement(ResultRow, { label: "Net Profit", value: fmt(results.netProfit) }),
          React.createElement(ResultRow, { label: "SE Tax Deduction (half)", value: "\u2212 " + fmt(results.seDeduction) }),
          React.createElement(ResultRow, { label: "QBI Deduction (20%)", value: "\u2212 " + fmt(results.qbiDeduction) }),
          React.createElement(ResultRow, { label: "Standard Deduction", value: "\u2212 " + fmt(results.stdDed) }),
          React.createElement(ResultRow, { label: "Taxable Income", value: fmt(results.taxableIncome), bold: true }),
          React.createElement(ResultRow, { label: "Income Tax", value: fmt(results.incomeTax) }),
          React.createElement(ResultRow, { label: "Self-Employment Tax", value: fmt(results.seTax) }),
          React.createElement(ResultRow, { label: "Total Tax", value: fmt(results.totalTax), bold: true, color: "#dc2626" })
        ),
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Retirement Contribution Limits"),
          React.createElement(ResultRow, { label: "SEP-IRA Maximum", value: fmt(results.sep_limit) }),
          React.createElement(ResultRow, { label: "Solo 401(k) Maximum", value: fmt(results.solo401_total) }),
          React.createElement(ResultRow, { label: "SIMPLE IRA Maximum", value: fmt(results.simple_limit) }),
          React.createElement(ResultRow, { label: "Your Selected Contribution", value: fmt(results.retirementActual), bold: true, color: "#15803d" })
        ),
        React.createElement(InfoBox, { type: "green" }, "\uD83D\uDCA1 Contributing " + fmt(results.retirementActual) + " to a " + rtypeLabel + " reduces your taxable income and could save approximately " + fmt(results.retirementActual * 0.28) + " in combined taxes (estimated at 28% combined rate).")
      ) : React.createElement("div", { style: { ...cardStyle, textAlign: "center", padding: "48px 32px" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCBC"),
        React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "SE Planning Results"),
        React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7 } }, "Enter your business figures and click Calculate to see your deductions, SE tax, and retirement contribution analysis.")
      )
    )
  );
}

// ── TAB 3: IRS Debt & Compliance Planning ────────────────────────────────────

function DebtPlanning() {
  const [f, setF] = useState({ total_owed: "", years_owed: "", assessment_year: "", monthly_income: "", monthly_expenses: "", assets_equity: "", filing_status: "single", current_year: new Date().getFullYear().toString(), csed_years: "10" });
  const [results, setResults] = useState(null);
  const ch = (e) => { const { name, value } = e.target; setF(p => ({ ...p, [name]: value })); };

  const calculate = () => {
    const owed = num(f.total_owed);
    const income = num(f.monthly_income);
    const expenses = num(f.monthly_expenses);
    const equity = num(f.assets_equity);
    const assessYear = parseInt(f.assessment_year) || (new Date().getFullYear() - parseInt(f.years_owed||0));
    const currentYear = new Date().getFullYear();

    // CSED calculation
    const csedYear = assessYear + 10;
    const yearsRemaining = Math.max(0, csedYear - currentYear);
    const monthsRemaining = yearsRemaining * 12;

    // Disposable income
    const disposable = Math.max(0, income - expenses);

    // What can be collected before CSED
    const collectibleBeforeCsed = disposable * monthsRemaining;

    // OIC minimum (RCP)
    const rcpCash = equity * 0.8 + (disposable * 12);       // cash offer
    const rcpDeferred = equity * 0.8 + (disposable * 24);   // deferred offer
    const oicViable = rcpCash < owed * 0.85;

    // Resolution recommendation
    let recommendation, recColor, recBg, recDetail;
    if (disposable <= 0) {
      recommendation = "Currently Not Collectible (CNC)";
      recColor = "#15803d"; recBg = "#f0fdf4";
      recDetail = "Your expenses equal or exceed your income. The IRS can place your account in hardship status and pause all collection. The CSED clock continues to run.";
    } else if (disposable < 200) {
      recommendation = "CNC or Partial Pay Installment Agreement (PPIA)";
      recColor = "#1a5276"; recBg = "#eff6ff";
      recDetail = "Your disposable income is very low. You may qualify for CNC or a PPIA where payments never fully pay off the balance before the CSED expires.";
    } else if (oicViable && rcpCash < owed) {
      recommendation = "Offer in Compromise (OIC) \u2014 Potentially Viable";
      recColor = "#5d2f86"; recBg = "#f5eef8";
      recDetail = "Your Reasonable Collection Potential (" + fmt(rcpCash) + ") appears less than the full balance. An OIC may allow you to settle for less.";
    } else if (owed <= 50000) {
      recommendation = "Streamlined Installment Agreement";
      recColor = "#1a5276"; recBg = "#eff6ff";
      recDetail = "You owe under $50,000 and may qualify for a streamlined payment plan without full financial disclosure. Apply online at IRS.gov/opa.";
    } else {
      recommendation = "Non-Streamlined Installment Agreement";
      recColor = "#92400e"; recBg = "#fef3c7";
      recDetail = "Full financial disclosure (Form 433-F or 433-A) required. Payment based on your disposable income of " + fmt(disposable) + "/month.";
    }

    // Penalty & interest estimate
    const monthsSinceAssessment = Math.max(0, (currentYear - assessYear) * 12);
    const interestRate = 0.08; // approximate current IRS rate
    const estimatedInterest = owed * interestRate * (monthsSinceAssessment / 12) * 0.5; // simplified

    // Safe harbor compliance
    const qPayment = disposable > 0 ? disposable / 4 : 0;

    setResults({ owed, income, expenses, disposable, equity, csedYear, yearsRemaining, monthsRemaining, collectibleBeforeCsed, rcpCash, rcpDeferred, oicViable, recommendation, recColor, recBg, recDetail, estimatedInterest, qPayment, assessYear, monthsSinceAssessment });
  };

  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" } },
    // LEFT: Inputs
    React.createElement("div", null,
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "IRS Debt & Compliance Planning"),
        React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Analyze your collection statute, resolution options, and minimum offer amounts."),
        React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F This tool provides estimates only. CSED dates can be affected by OIC filing, bankruptcy, CDP hearings, and time abroad. Consult the IRS Pilot Navigator for detailed guidance."),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Your IRS Debt"),
          React.createElement(MoneyField, { id: "total_owed", lbl: "Total Amount Owed", hnt: "Including penalties and interest", value: f.total_owed, onChange: ch }),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Assessment Year", React.createElement("span", { style: hintStyle }, "Year IRS assessed")),
              React.createElement("input", { name: "assessment_year", type: "number", placeholder: (new Date().getFullYear()-3).toString(), value: f.assessment_year, onChange: ch, style: inpStyle })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: labelStyle }, "Filing Status"),
              React.createElement("select", { name: "filing_status", value: f.filing_status, onChange: ch, style: inpStyle },
                React.createElement("option", { value: "single" }, "Single"),
                React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly"),
                React.createElement("option", { value: "mj_separate" }, "Married Filing Separately"),
                React.createElement("option", { value: "hoh" }, "Head of Household")
              )
            )
          )
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Monthly Cash Flow"),
          React.createElement(MoneyField, { id: "monthly_income", lbl: "Total Monthly Income", hnt: "All sources, gross", value: f.monthly_income, onChange: ch }),
          React.createElement(MoneyField, { id: "monthly_expenses", lbl: "Total Monthly Expenses", hnt: "IRS allowable expenses from 433-F/A", value: f.monthly_expenses, onChange: ch }),
          React.createElement(InfoBox, { type: "info" }, "Use IRS Collection Financial Standards for housing, food, transportation, and health care when entering expenses. The IRS Pilot Wizard pre-fills these for you.")
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Asset Equity (for OIC)"),
          React.createElement(MoneyField, { id: "assets_equity", lbl: "Total Net Asset Equity", hnt: "Bank accounts + investment equity + real estate equity + vehicle equity", value: f.assets_equity, onChange: ch }),
          React.createElement(InfoBox, { type: "info" }, "The IRS applies an 80% quick-sale factor to most assets. Enter the raw equity \u2014 this tool applies the discount automatically.")
        ),

        React.createElement("button", { onClick: calculate, style: calcBtnStyle }, "\uD83D\uDCC5 Analyze My IRS Debt Situation")
      )
    ),

    // RIGHT: Results
    React.createElement("div", null,
      results ? React.createElement("div", null,
        // Recommendation header
        React.createElement("div", { style: { ...cardStyle, background: results.recBg, border: "2px solid " + results.recColor } },
          React.createElement("div", { style: { fontSize: 11, color: results.recColor, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 } }, "Preliminary Resolution Path"),
          React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: results.recColor, marginBottom: 8 } }, results.recommendation),
          React.createElement("div", { style: { fontSize: 13, color: "#444", lineHeight: 1.6 } }, results.recDetail)
        ),

        // CSED Card
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Collection Statute (CSED)"),
          React.createElement(ResultRow, { label: "Assessment Year", value: results.assessYear }),
          React.createElement(ResultRow, { label: "CSED Expires", value: results.csedYear }),
          React.createElement(ResultRow, { label: "Years Remaining", value: results.yearsRemaining + " years", bold: true, color: results.yearsRemaining < 3 ? "#15803d" : results.yearsRemaining < 5 ? "#f59e0b" : "#dc2626" }),
          React.createElement(ResultRow, { label: "Months Remaining", value: results.monthsRemaining + " months" }),
          results.yearsRemaining < 3 && React.createElement(InfoBox, { type: "green" }, "\uD83C\uDF89 Your CSED is within 3 years. Depending on your financial situation, a strategy of CNC or PPIA may allow the statute to expire, eliminating the debt entirely.")
        ),

        // Cash Flow Card
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Monthly Cash Flow Analysis"),
          React.createElement(ResultRow, { label: "Monthly Income", value: fmt(results.income) }),
          React.createElement(ResultRow, { label: "Monthly Expenses", value: "\u2212 " + fmt(results.expenses) }),
          React.createElement(ResultRow, { label: "Net Disposable Income", value: fmt(results.disposable), bold: true, color: results.disposable <= 0 ? "#15803d" : "#1a2d5a" }),
          React.createElement("div", { style: { marginTop: 10, padding: "10px 12px", background: "#f8f6f1", borderRadius: 8, fontSize: 13, color: "#555" } },
            results.disposable <= 0
              ? "\u2705 Zero or negative disposable income supports a CNC or hardship request."
              : "The IRS will typically set a payment plan at approximately " + fmt(results.disposable) + "/month based on this analysis."
          )
        ),

        // OIC Analysis
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Offer in Compromise Analysis"),
          React.createElement(ResultRow, { label: "Total Owed", value: fmt(results.owed) }),
          React.createElement(ResultRow, { label: "Asset Equity (80% QSV)", value: fmt(results.equity * 0.8) }),
          React.createElement(ResultRow, { label: "Future Income \xD7 12 (cash)", value: fmt(results.disposable * 12) }),
          React.createElement(ResultRow, { label: "Minimum Offer \u2014 Cash (5 mo)", value: fmt(results.rcpCash), bold: true, color: "#5d2f86" }),
          React.createElement(ResultRow, { label: "Minimum Offer \u2014 Deferred (24 mo)", value: fmt(results.rcpDeferred), bold: true }),
          results.oicViable
            ? React.createElement(InfoBox, { type: "green" }, "\u2705 Your estimated RCP (" + fmt(results.rcpCash) + ") is less than the full balance. An OIC may be viable. Use the IRS Pilot Wizard to complete Forms 433-A OIC and 656.")
            : React.createElement(InfoBox, { type: "info" }, "\u2139\uFE0F Your RCP is close to the full balance. An OIC may not result in significant savings. Consider an installment agreement or CNC instead.")
        ),

        // Collectible before CSED
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Collectible Before CSED Expires"),
          React.createElement(ResultRow, { label: "Months Remaining", value: results.monthsRemaining }),
          React.createElement(ResultRow, { label: "Monthly Disposable", value: fmt(results.disposable) }),
          React.createElement(ResultRow, { label: "Max IRS Can Collect", value: fmt(results.collectibleBeforeCsed), bold: true }),
          results.collectibleBeforeCsed < results.owed && React.createElement(InfoBox, { type: "green" }, "\uD83C\uDF89 The IRS can collect at most " + fmt(results.collectibleBeforeCsed) + " before the statute expires \u2014 less than the " + fmt(results.owed) + " owed. A PPIA strategy may result in the remaining balance expiring legally.")
        ),

        React.createElement("div", { style: { fontSize: 11, color: "#aaa", lineHeight: 1.6, marginTop: 4 } }, "Analysis for planning purposes only. CSED dates may be tolled by OIC filing, bankruptcy, CDP hearings, or time outside the U.S. Consult an Enrolled Agent for your specific situation.")
      ) : React.createElement("div", { style: { ...cardStyle, textAlign: "center", padding: "48px 32px" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCC5"),
        React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "IRS Debt Analysis"),
        React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7 } }, "Enter your debt details and cash flow to see your CSED expiration date, OIC minimum offer, and recommended resolution path.")
      )
    )
  );
}

// ── Main Dashboard with Tabs ─────────────────────────────────────────────────


function LifePlanning() {
  const [event, setEvent] = useState("marriage");
  const [f, setF] = useState({});
  const [results, setResults] = useState(null);
  const ch = (e) => { const { name, value } = e.target; setF(p => ({ ...p, [name]: value })); };
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;

  const EVENTS = [
    { id: "marriage", label: "\uD83D\uDC8D Marriage" },
    { id: "divorce", label: "\u2696\uFE0F Divorce" },
    { id: "child", label: "\uD83D\uDC76 New Child" },
    { id: "home_purchase", label: "\uD83C\uDFE0 Home Purchase" },
    { id: "job_loss", label: "\uD83D\uDCBC Job Loss / Unemployment" },
    { id: "inheritance", label: "\uD83D\uDCB0 Inheritance / Estate" },
    { id: "retirement_start", label: "\uD83C\uDFC6 Starting Retirement" },
  ];

  const calculate = () => {
    const res = {};
    if (event === "marriage") {
      const inc1 = n(f.income1), inc2 = n(f.income2);
      const combinedIncome = inc1 + inc2;
      // Marriage penalty/bonus check (simplified MFJ vs two single returns)
      const singleStd = 15000, mfjStd = 30000;
      const singleBracket12 = 48475, mfjBracket12 = 96950;
      // If both have income, combined may hit higher bracket sooner
      const penaltyRisk = inc1 > 50000 && inc2 > 50000;
      const bonusLikely = Math.abs(inc1 - inc2) > 30000;
      const childTaxCreditPhaseout = 400000; // MFJ phaseout
      const saltDeduction = Math.min(n(f.salt), 10000); // SALT cap
      res.combinedIncome = combinedIncome;
      res.penaltyRisk = penaltyRisk;
      res.bonusLikely = bonusLikely;
      res.mfjStdDeduction = mfjStd;
      res.saltCap = saltDeduction;
      res.newW4Needed = true;
      res.filingOptions = ["Married Filing Jointly", "Married Filing Separately"];
      res.mfsWarning = inc1 > 0 && inc2 > 0;
      res.notes = [
        "Update both W-4s immediately \u2014 use IRS Tax Withholding Estimator at IRS.gov.",
        penaltyRisk ? "Both spouses earning similar high incomes can trigger a marriage penalty \u2014 review bracket impact." : "Your income spread suggests a potential marriage bonus \u2014 MFJ may lower your combined tax.",
        "Review beneficiary designations on retirement accounts, life insurance, and bank accounts.",
        "If either spouse has IRS debt, filing separately may protect the non-owing spouse from offset.",
      ];
    } else if (event === "divorce") {
      const alimonyPre2019 = n(f.alimony_pre2019);
      const alimonyPost2018 = n(f.alimony_post2018);
      const childSupport = n(f.child_support);
      res.alimonyPre2019 = alimonyPre2019;
      res.alimonyPost2018 = alimonyPost2018;
      res.childSupport = childSupport;
      res.qdroNeeded = f.retirement_split === "Yes";
      res.notes = [
        "Alimony from agreements BEFORE 2019: deductible by payer, taxable to recipient.",
        "Alimony from agreements AFTER 2018: NOT deductible and NOT taxable. Child support is never deductible or taxable.",
        "If splitting a 401(k) or pension, a QDRO (Qualified Domestic Relations Order) is required to avoid early withdrawal penalties.",
        "The spouse claiming the child as dependent gets the Child Tax Credit. Establish this clearly in the divorce decree.",
        "If you received the marital home: your cost basis is the original purchase price, not today's value. Track it carefully for future capital gains.",
        "File as Single or Head of Household starting the year your divorce is finalized.",
      ];
    } else if (event === "child") {
      const income = n(f.household_income);
      const ctcAmount = income <= 200000 ? 2000 : Math.max(0, 2000 - ((income - 200000) / 1000) * 50);
      const cdccMax = 3000; // one child
      const depCareMax = 5000; // dependent care FSA
      res.ctcAmount = ctcAmount;
      res.cdccMax = cdccMax;
      res.depCareMax = depCareMax;
      res.income = income;
      res.notes = [
        "Child Tax Credit: up to $2,000 per child (phases out above $200K single / $400K MFJ).",
        "Child & Dependent Care Credit: up to 35% of $3,000 in care expenses (one child) if both parents work.",
        "Dependent Care FSA: contribute up to $5,000 pre-tax through your employer \u2014 reduces both income tax and FICA.",
        "529 Plan: contributions are not federally deductible but grow tax-free. Many states offer a state deduction.",
        "Update your W-4 to claim the additional child tax credit \u2014 reduces withholding immediately.",
        "Add the child to your health insurance within 30 days of birth/adoption.",
      ];
    } else if (event === "home_purchase") {
      const price = n(f.purchase_price);
      const down = n(f.down_payment);
      const rate = n(f.interest_rate) / 100;
      const loan = price - down;
      const annualInterest = loan * rate * 0.95; // approximate first year interest
      const propertyTax = n(f.property_tax);
      const saltTotal = Math.min(annualInterest + propertyTax, 10000 + annualInterest); // mortgage interest unlimited, SALT capped at $10k
      const stdDed = { single: 15000, mj_joint: 30000 }[f.filing_status||"single"] || 15000;
      const itemizeBenefit = Math.max(0, (annualInterest + Math.min(propertyTax, 10000)) - stdDed);
      res.loan = loan;
      res.annualInterest = annualInterest;
      res.propertyTax = propertyTax;
      res.saltCap = Math.min(propertyTax, 10000);
      res.itemizeBenefit = itemizeBenefit;
      res.shouldItemize = itemizeBenefit > 0;
      res.excludeGain = f.filing_status === "mj_joint" ? 500000 : 250000;
      res.notes = [
        "Mortgage interest on loans up to $750K is deductible if you itemize.",
        "State and local taxes (SALT) are capped at $10,000 total for property tax + state income tax.",
        itemizeBenefit > 0 ? `Itemizing may save you approximately ${fmt(itemizeBenefit * 0.22)} vs. the standard deduction (estimated at 22% bracket).` : "Your standard deduction likely exceeds your itemized deductions \u2014 you may not benefit from itemizing.",
        "Keep records of all home improvements \u2014 they increase your cost basis and reduce capital gains when you sell.",
        `When you sell: exclude up to ${fmt(res.excludeGain)} in gain (${f.filing_status==="mj_joint"?"MFJ":"single"}) if you lived there 2 of last 5 years.`,
        "Points paid at closing are generally deductible in the year paid if they represent pre-paid interest.",
      ];
    } else if (event === "job_loss") {
      const unemploymentIncome = n(f.unemployment_income);
      const severance = n(f.severance);
      const cobra = n(f.cobra_monthly) * 12;
      const hsa = Math.min(n(f.hsa_contrib), 4300); // 2025 individual HSA limit
      res.unemploymentIncome = unemploymentIncome;
      res.severance = severance;
      res.cobra = cobra;
      res.hsa = hsa;
      res.withholding = unemploymentIncome * 0.10; // 10% voluntary withholding
      res.notes = [
        "Unemployment compensation is fully taxable federal income. Request 10% voluntary withholding (Form W-4V) to avoid a surprise bill.",
        severance > 0 ? "Severance is taxable as wages. Your former employer will withhold at the supplemental rate (22%). Review your total year income to estimate if more is owed." : "",
        "COBRA premiums are not deductible unless you itemize AND total medical expenses exceed 7.5% of AGI.",
        "If you start a business: your health insurance premiums become 100% deductible as self-employed health insurance.",
        "Consider converting IRA funds to Roth during a low-income year \u2014 you may be in a lower bracket than usual.",
        hsa > 0 ? `Contributing to an HSA ($${hsa.toLocaleString()} max individual for 2025) reduces AGI even if you do not itemize.` : "If you have an HDHP, maximize HSA contributions while income is lower.",
        "If you received a 401(k) distribution, 20% mandatory withholding applies and a 10% penalty may be owed unless you are 59\u00bd or qualify for an exception.",
      ].filter(Boolean);
    } else if (event === "inheritance") {
      const inheritedIRA = n(f.inherited_ira);
      const inheritedCash = n(f.inherited_cash);
      const inheritedProperty = n(f.inherited_property);
      const estimatedFMV = n(f.property_fmv);
      res.inheritedIRA = inheritedIRA;
      res.inheritedCash = inheritedCash;
      res.inheritedProperty = inheritedProperty;
      res.stepUpBasis = estimatedFMV;
      res.notes = [
        "Inherited cash and brokerage accounts: generally NOT taxable income. You receive a stepped-up cost basis to the date-of-death fair market value.",
        "Inherited traditional IRA (non-spouse): under SECURE Act 2.0, most beneficiaries must distribute all funds within 10 years. Annual RMDs may be required in years 1\u20139.",
        "Inherited Roth IRA: still must be distributed within 10 years, but distributions are tax-free if the account was held 5+ years.",
        inheritedProperty > 0 ? `Inherited real property receives a stepped-up basis to approximately ${fmt(estimatedFMV||inheritedProperty)} (date-of-death FMV). If you sell soon after inheriting, your gain may be minimal.` : "",
        "Estate tax: federal estate tax only applies to estates over $13.61M (2025). Most inherited assets from moderate estates are received tax-free.",
        "If you sell inherited property within 1 year, the gain is still treated as long-term \u2014 favorable capital gains rates apply.",
        "Work with an Enrolled Agent or CPA to complete Form 8971 if you receive a Schedule A from the estate.",
      ].filter(Boolean);
    } else if (event === "retirement_start") {
      const ss = n(f.social_security);
      const pension = n(f.pension);
      const ira_dist = n(f.ira_distribution);
      const other = n(f.other_retirement);
      const totalIncome = ss + pension + ira_dist + other;
      // SS taxability: 85% taxable if combined income > $34K single / $44K MFJ
      const combinedIncome = other/2 + ss/2 + pension/2;
      const ssTaxablePct = combinedIncome > 34000 ? 0.85 : combinedIncome > 25000 ? 0.50 : 0;
      const ssTaxable = ss * ssTaxablePct;
      const rmd_age = 73; // SECURE Act 2.0
      res.totalIncome = totalIncome;
      res.ssTaxable = ssTaxable;
      res.ssTaxablePct = ssTaxablePct;
      res.pension = pension;
      res.ira_dist = ira_dist;
      res.rmd_age = rmd_age;
      res.notes = [
        `Social Security: ${(ssTaxablePct*100).toFixed(0)}% of your SS benefit ($${ssTaxable.toLocaleString()}) is estimated to be taxable based on your combined income.`,
        "Required Minimum Distributions (RMDs) begin at age 73 (SECURE Act 2.0). Missing an RMD triggers a 25% excise tax (reduced to 10% if corrected promptly).",
        "Pension income is generally fully taxable as ordinary income. Most pensions withhold at a default rate \u2014 submit Form W-4P to adjust.",
        "Roth IRA distributions are tax-free if the account is 5+ years old and you are 59\u00bd or older.",
        "Medicare premiums (IRMAA) increase if your income exceeds $106,000 (single) or $212,000 (MFJ) based on income from 2 years prior.",
        "Consider a Qualified Charitable Distribution (QCD): donate up to $105,000/year directly from your IRA to charity. It counts as your RMD but is excluded from taxable income.",
        "If you are still working past 73, you can delay RMDs from your current employer\u2019s 401(k) but NOT from IRAs.",
      ];
    }
    setResults({ event, ...res });
  };

  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" } },
    React.createElement("div", null,
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Life Event Tax Planning"),
        React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Select a life event to see the tax implications and action steps."),
        React.createElement("div", { style: { marginBottom: 18 } },
          React.createElement("label", { style: labelStyle }, "Life Event"),
          React.createElement("select", { value: event, onChange: e => { setEvent(e.target.value); setF({}); setResults(null); }, style: inpStyle },
            EVENTS.map(ev => React.createElement("option", { key: ev.id, value: ev.id }, ev.label))
          )
        ),
        event === "marriage" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Income Details"),
            React.createElement(MoneyField, { id: "income1", lbl: "Your Annual Income", value: f.income1||"", onChange: ch }),
            React.createElement(MoneyField, { id: "income2", lbl: "Spouse Annual Income", value: f.income2||"", onChange: ch }),
            React.createElement(MoneyField, { id: "salt", lbl: "State & Local Taxes (SALT)", hnt: "Property tax + state income tax", value: f.salt||"", onChange: ch })
          )
        ),
        event === "divorce" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Divorce Details"),
            React.createElement(MoneyField, { id: "alimony_pre2019", lbl: "Alimony (Pre-2019 Agreement)", hnt: "Deductible by payer, taxable to recipient", value: f.alimony_pre2019||"", onChange: ch }),
            React.createElement(MoneyField, { id: "alimony_post2018", lbl: "Alimony (Post-2018 Agreement)", hnt: "NOT deductible or taxable", value: f.alimony_post2018||"", onChange: ch }),
            React.createElement(MoneyField, { id: "child_support", lbl: "Child Support Received/Paid", hnt: "Never taxable or deductible", value: f.child_support||"", onChange: ch }),
            React.createElement("div", { style: { marginBottom: 14 } },
              React.createElement("label", { style: labelStyle }, "Splitting a Retirement Account?"),
              React.createElement("select", { name: "retirement_split", value: f.retirement_split||"No", onChange: ch, style: inpStyle },
                React.createElement("option", { value: "No" }, "No"),
                React.createElement("option", { value: "Yes" }, "Yes \u2014 QDRO required")
              )
            )
          )
        ),
        event === "child" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Household Details"),
            React.createElement(MoneyField, { id: "household_income", lbl: "Household AGI (estimated)", value: f.household_income||"", onChange: ch })
          )
        ),
        event === "home_purchase" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Home Details"),
            React.createElement("div", { style: { marginBottom: 14 } },
              React.createElement("label", { style: labelStyle }, "Filing Status"),
              React.createElement("select", { name: "filing_status", value: f.filing_status||"single", onChange: ch, style: inpStyle },
                React.createElement("option", { value: "single" }, "Single"),
                React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly")
              )
            ),
            React.createElement(MoneyField, { id: "purchase_price", lbl: "Purchase Price", value: f.purchase_price||"", onChange: ch }),
            React.createElement(MoneyField, { id: "down_payment", lbl: "Down Payment", value: f.down_payment||"", onChange: ch }),
            React.createElement("div", { style: { marginBottom: 14 } },
              React.createElement("label", { style: labelStyle }, "Interest Rate (%)"),
              React.createElement("input", { name: "interest_rate", type: "number", step: "0.1", placeholder: "6.5", value: f.interest_rate||"", onChange: ch, style: inpStyle })
            ),
            React.createElement(MoneyField, { id: "property_tax", lbl: "Annual Property Tax", value: f.property_tax||"", onChange: ch })
          )
        ),
        event === "job_loss" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Job Loss Details"),
            React.createElement(MoneyField, { id: "unemployment_income", lbl: "Annual Unemployment Benefits", value: f.unemployment_income||"", onChange: ch }),
            React.createElement(MoneyField, { id: "severance", lbl: "Severance Pay", value: f.severance||"", onChange: ch }),
            React.createElement(MoneyField, { id: "cobra_monthly", lbl: "Monthly COBRA Premium", value: f.cobra_monthly||"", onChange: ch }),
            React.createElement(MoneyField, { id: "hsa_contrib", lbl: "HSA Contribution Planned", hnt: "Max $4,300 individual / $8,550 family (2025)", value: f.hsa_contrib||"", onChange: ch })
          )
        ),
        event === "inheritance" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "What You Inherited"),
            React.createElement(MoneyField, { id: "inherited_cash", lbl: "Cash / Brokerage Assets", value: f.inherited_cash||"", onChange: ch }),
            React.createElement(MoneyField, { id: "inherited_ira", lbl: "Inherited IRA Value", value: f.inherited_ira||"", onChange: ch }),
            React.createElement(MoneyField, { id: "inherited_property", lbl: "Real Property (cost basis)", value: f.inherited_property||"", onChange: ch }),
            React.createElement(MoneyField, { id: "property_fmv", lbl: "Property Date-of-Death FMV", hnt: "For stepped-up basis calculation", value: f.property_fmv||"", onChange: ch })
          )
        ),
        event === "retirement_start" && React.createElement("div", null,
          React.createElement("fieldset", { style: fieldsetStyle },
            React.createElement("legend", { style: legendStyle }, "Retirement Income Sources"),
            React.createElement(MoneyField, { id: "social_security", lbl: "Annual Social Security Benefit", value: f.social_security||"", onChange: ch }),
            React.createElement(MoneyField, { id: "pension", lbl: "Annual Pension Income", value: f.pension||"", onChange: ch }),
            React.createElement(MoneyField, { id: "ira_distribution", lbl: "Annual IRA / 401(k) Distributions", value: f.ira_distribution||"", onChange: ch }),
            React.createElement(MoneyField, { id: "other_retirement", lbl: "Other Retirement Income", value: f.other_retirement||"", onChange: ch })
          )
        ),
        React.createElement("button", { onClick: calculate, style: calcBtnStyle }, "\uD83D\uDCCB Show Tax Implications & Action Steps")
      )
    ),
    React.createElement("div", null,
      results ? React.createElement("div", null,
        React.createElement("div", { style: { ...cardStyle, background: "#1a2d5a", padding: "20px 22px" } },
          React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 } }, "Life Event Analysis"),
          React.createElement("div", { style: { color: "#fff", fontSize: 18, fontWeight: "bold" } }, EVENTS.find(e => e.id === results.event)?.label || results.event)
        ),
        event === "marriage" && React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Marriage Tax Analysis"),
          React.createElement(ResultRow, { label: "Combined Household Income", value: fmt(results.combinedIncome) }),
          React.createElement(ResultRow, { label: "MFJ Standard Deduction", value: fmt(results.mfjStdDeduction) }),
          React.createElement(ResultRow, { label: "SALT Cap Applied", value: fmt(results.saltCap) }),
          React.createElement("div", { style: { marginTop: 10 } },
            results.bonusLikely ? React.createElement(InfoBox, { type: "green" }, "\u2705 Income spread suggests a marriage BONUS \u2014 filing jointly may lower your combined tax versus two single returns.") : null,
            results.penaltyRisk ? React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F Both spouses earn similar high incomes. Review for marriage penalty risk by comparing MFJ vs. two single returns.") : null
          )
        ),
        event === "home_purchase" && results.loan > 0 && React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Home Purchase Tax Analysis"),
          React.createElement(ResultRow, { label: "Loan Amount", value: fmt(results.loan) }),
          React.createElement(ResultRow, { label: "Est. Year 1 Mortgage Interest", value: fmt(results.annualInterest) }),
          React.createElement(ResultRow, { label: "Property Tax (SALT cap $10K)", value: fmt(results.saltCap) }),
          React.createElement(ResultRow, { label: "Est. Itemized Deductions", value: fmt(results.annualInterest + results.saltCap) }),
          React.createElement(ResultRow, { label: "Capital Gain Exclusion (future sale)", value: fmt(results.excludeGain), bold: true }),
          results.shouldItemize ? React.createElement(InfoBox, { type: "green" }, "\u2705 Your deductions exceed the standard deduction. Itemizing may save you approximately " + fmt(results.itemizeBenefit * 0.22) + ".") : React.createElement(InfoBox, { type: "info" }, "\u2139\uFE0F Your standard deduction likely exceeds itemized deductions in year 1. This can change as the loan balance and interest change.")
        ),
        event === "child" && React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "New Child Tax Benefits"),
          React.createElement(ResultRow, { label: "Child Tax Credit (estimated)", value: fmt(results.ctcAmount), bold: true }),
          React.createElement(ResultRow, { label: "Child & Dependent Care Credit max", value: fmt(results.cdccMax) }),
          React.createElement(ResultRow, { label: "Dependent Care FSA max (pre-tax)", value: fmt(results.depCareMax) })
        ),
        event === "retirement_start" && React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Retirement Income Tax Analysis"),
          React.createElement(ResultRow, { label: "Total Retirement Income", value: fmt(results.totalIncome) }),
          React.createElement(ResultRow, { label: "SS Taxable Portion", value: (results.ssTaxablePct*100).toFixed(0) + "% = " + fmt(results.ssTaxable) }),
          React.createElement(ResultRow, { label: "Pension (fully taxable)", value: fmt(results.pension) }),
          React.createElement(ResultRow, { label: "IRA / 401(k) Distributions", value: fmt(results.ira_dist) }),
          React.createElement(ResultRow, { label: "RMD Required Age", value: "Age " + results.rmd_age + " (SECURE Act 2.0)", bold: true })
        ),
        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Action Steps"),
          results.notes && results.notes.filter(Boolean).map((note, i) =>
            React.createElement("div", { key: i, style: { display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#444", lineHeight: 1.6, alignItems: "flex-start" } },
              React.createElement("span", { style: { color: "#7ec11f", fontWeight: "bold", flexShrink: 0, marginTop: 1 } }, (i+1) + "."),
              React.createElement("span", null, note)
            )
          )
        )
      ) : React.createElement("div", { style: { ...cardStyle, textAlign: "center", padding: "48px 32px" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDC8D"),
        React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "Life Event Tax Guide"),
        React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7 } }, "Select a life event and enter your details to see the specific tax implications and action steps for your situation.")
      )
    )
  );
}


function RecoveryPlanning() {
  const [f, setF] = useState({ owed_year1: "", owed_year2: "", owed_year3: "", assess_year1: "", assess_year2: "", assess_year3: "", monthly_income: "", monthly_expenses: "", assets_equity: "", current_income: "", projected_income_yr2: "", projected_income_yr3: "", filing_status: "single", years_unfiled: "0", current_year_income: "" });
  const [results, setResults] = useState(null);
  const ch = (e) => { const { name, value } = e.target; setF(p => ({ ...p, [name]: value })); };
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const currentYear = new Date().getFullYear();

  const calculate = () => {
    const debts = [
      { year: n(f.assess_year1)||(currentYear-3), owed: n(f.owed_year1) },
      { year: n(f.assess_year2)||(currentYear-2), owed: n(f.owed_year2) },
      { year: n(f.assess_year3)||(currentYear-1), owed: n(f.owed_year3) },
    ].filter(d => d.owed > 0);

    const totalOwed = debts.reduce((s, d) => s + d.owed, 0);

    // CSED per year
    const cseds = debts.map(d => ({
      ...d,
      csed: d.year + 10,
      yearsLeft: Math.max(0, (d.year + 10) - currentYear),
      expired: (d.year + 10) <= currentYear,
    }));

    // Cash flow
    const income = n(f.monthly_income);
    const expenses = n(f.monthly_expenses);
    const disposable = Math.max(0, income - expenses);
    const equity = n(f.assets_equity);

    // Total collectible across all years before earliest CSED
    const earliestCsed = cseds.length > 0 ? Math.min(...cseds.map(c => c.csed)) : currentYear + 10;
    const monthsToEarliest = Math.max(0, (earliestCsed - currentYear) * 12);
    const collectibleTotal = disposable * monthsToEarliest + equity * 0.8;

    // OIC for all years combined
    const rcpCash = equity * 0.8 + disposable * 12;
    const rcpDeferred = equity * 0.8 + disposable * 24;
    const oicViable = rcpCash < totalOwed * 0.85 && totalOwed > 0;

    // Unfiled years analysis
    const unfiledYears = parseInt(f.years_unfiled) || 0;
    const unfiledPenalty = n(f.current_year_income) * 0.25; // approx failure-to-file penalty

    // 3-year income projection
    const yr1 = n(f.current_income);
    const yr2 = n(f.projected_income_yr2) || yr1;
    const yr3 = n(f.projected_income_yr3) || yr1;

    // Estimate tax trajectory (simplified)
    const stdDed = { single: 15000, mj_joint: 30000, mj_separate: 15000, hoh: 22500 }[f.filing_status] || 15000;
    const taxEst = (inc) => {
      const ti = Math.max(0, inc - stdDed);
      const bkts = f.filing_status === "mj_joint"
        ? [[23850,0.10],[96950,0.12],[206700,0.22],[394600,0.24],[501050,0.32],[751600,0.35],[Infinity,0.37]]
        : [[11925,0.10],[48475,0.12],[103350,0.22],[197300,0.24],[250525,0.32],[626350,0.35],[Infinity,0.37]];
      let tax = 0, prev = 0;
      for (const [ceil, rate] of bkts) { if (ti <= prev) break; tax += (Math.min(ti,ceil)-prev)*rate; prev = ceil; }
      return tax;
    };

    const taxYr1 = taxEst(yr1);
    const taxYr2 = taxEst(yr2);
    const taxYr3 = taxEst(yr3);

    // Resolution timeline
    const fullPayMonths = disposable > 0 ? Math.ceil(totalOwed / disposable) : Infinity;
    const streamlined = totalOwed <= 50000;
    const ppia = disposable > 0 && (disposable * monthsToEarliest) < totalOwed;

    // Compliance milestones
    const milestones = [];
    if (unfiledYears > 0) milestones.push({ label: "File all back returns (last 6 years)", priority: "urgent", note: "IRS policy: file last 6 years to be in full compliance. Do this first before any resolution." });
    milestones.push({ label: "Begin current-year estimated tax payments", priority: "urgent", note: "Stop adding to the problem. Pay 1040-ES quarterly starting now." });
    if (cseds.some(c => c.yearsLeft <= 3)) milestones.push({ label: "Protect expiring CSED years", priority: "high", note: "Years with less than 3 years remaining on the statute should be managed carefully \u2014 avoid actions that toll the clock." });
    if (oicViable) milestones.push({ label: "Evaluate Offer in Compromise", priority: "high", note: "Your estimated RCP (" + fmt(rcpCash) + ") is less than the full balance. An OIC may resolve all years at once." });
    if (streamlined) milestones.push({ label: "Apply for Streamlined Installment Agreement", priority: "medium", note: "Total balance under $50,000. Apply at IRS.gov/opa without full financial disclosure." });
    else milestones.push({ label: "Prepare Form 433-F / 433-A", priority: "medium", note: "Full financial disclosure required. Use the IRS Pilot Wizard to pre-fill these forms." });
    milestones.push({ label: "Request penalty abatement (First Time Abatement)", priority: "medium", note: "If this is your first time with penalties, request FTA. It can remove hundreds or thousands in penalties with a single phone call." });
    milestones.push({ label: "Build 3-year compliance track record", priority: "ongoing", note: "File on time and pay estimated taxes for 3 consecutive years. This strengthens future abatement requests and OIC compliance." });

    setResults({ debts: cseds, totalOwed, disposable, income, expenses, equity, rcpCash, rcpDeferred, oicViable, streamlined, fullPayMonths, ppia, monthsToEarliest, collectibleTotal, earliestCsed, milestones, unfiledYears, unfiledPenalty, yr1, yr2, yr3, taxYr1, taxYr2, taxYr3 });
  };

  const priorityColor = { urgent: "#dc2626", high: "#f59e0b", medium: "#1a5276", ongoing: "#15803d" };
  const priorityBg = { urgent: "#fef2f2", high: "#fef3c7", medium: "#eff6ff", ongoing: "#f0fdf4" };

  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" } },
    React.createElement("div", null,
      React.createElement("div", { style: cardStyle },
        React.createElement("div", { style: { fontSize: 16, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, "Multi-Year IRS Recovery Planning"),
        React.createElement("div", { style: { fontSize: 12, color: "#888", marginBottom: 20 } }, "Map your path from IRS debt to full compliance over 1\u20133 years."),
        React.createElement(InfoBox, { type: "info" }, "\uD83D\uDCA1 Enter up to three years of IRS debt. The plan will prioritize resolution based on CSED dates and your cash flow."),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "IRS Debt by Tax Year"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } },
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Tax Year 1"), React.createElement("input", { name: "assess_year1", type: "number", placeholder: (currentYear-3).toString(), value: f.assess_year1, onChange: ch, style: inpStyle })),
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount Owed"), React.createElement("input", { name: "owed_year1", type: "number", placeholder: "0", value: f.owed_year1, onChange: ch, style: inpStyle }))
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } },
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Tax Year 2"), React.createElement("input", { name: "assess_year2", type: "number", placeholder: (currentYear-2).toString(), value: f.assess_year2, onChange: ch, style: inpStyle })),
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount Owed"), React.createElement("input", { name: "owed_year2", type: "number", placeholder: "0", value: f.owed_year2, onChange: ch, style: inpStyle }))
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } },
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Tax Year 3"), React.createElement("input", { name: "assess_year3", type: "number", placeholder: (currentYear-1).toString(), value: f.assess_year3, onChange: ch, style: inpStyle })),
            React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount Owed"), React.createElement("input", { name: "owed_year3", type: "number", placeholder: "0", value: f.owed_year3, onChange: ch, style: inpStyle }))
          )
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Unfiled Returns"),
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: labelStyle }, "Years of Unfiled Returns"),
            React.createElement("input", { name: "years_unfiled", type: "number", min: "0", max: "20", placeholder: "0", value: f.years_unfiled, onChange: ch, style: inpStyle })
          ),
          parseInt(f.years_unfiled) > 0 && React.createElement(MoneyField, { id: "current_year_income", lbl: "Estimated Annual Income (for penalty est.)", value: f.current_year_income, onChange: ch })
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "Monthly Cash Flow"),
          React.createElement("div", { style: { marginBottom: 10 } },
            React.createElement("label", { style: labelStyle }, "Filing Status"),
            React.createElement("select", { name: "filing_status", value: f.filing_status, onChange: ch, style: inpStyle },
              React.createElement("option", { value: "single" }, "Single"),
              React.createElement("option", { value: "mj_joint" }, "Married Filing Jointly"),
              React.createElement("option", { value: "mj_separate" }, "Married Filing Separately"),
              React.createElement("option", { value: "hoh" }, "Head of Household")
            )
          ),
          React.createElement(MoneyField, { id: "monthly_income", lbl: "Monthly Income", value: f.monthly_income, onChange: ch }),
          React.createElement(MoneyField, { id: "monthly_expenses", lbl: "Monthly Allowable Expenses", hnt: "IRS Collection Financial Standards", value: f.monthly_expenses, onChange: ch }),
          React.createElement(MoneyField, { id: "assets_equity", lbl: "Total Net Asset Equity", hnt: "Bank + investments + real estate + vehicles", value: f.assets_equity, onChange: ch })
        ),

        React.createElement("fieldset", { style: fieldsetStyle },
          React.createElement("legend", { style: legendStyle }, "3-Year Income Projection"),
          React.createElement(MoneyField, { id: "current_income", lbl: "Current Year Annual Income", value: f.current_income, onChange: ch }),
          React.createElement(MoneyField, { id: "projected_income_yr2", lbl: "Year 2 Projected Income", hnt: "Leave blank to use current year", value: f.projected_income_yr2, onChange: ch }),
          React.createElement(MoneyField, { id: "projected_income_yr3", lbl: "Year 3 Projected Income", hnt: "Leave blank to use current year", value: f.projected_income_yr3, onChange: ch })
        ),

        React.createElement("button", { onClick: calculate, style: calcBtnStyle }, "\uD83D\uDDFA\uFE0F Build My Recovery Plan")
      )
    ),

    React.createElement("div", null,
      results ? React.createElement("div", null,
        React.createElement("div", { style: { ...cardStyle, background: "#1a2d5a", padding: "20px 22px" } },
          React.createElement("div", { style: { color: "#7ec11f", fontSize: 11, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 } }, "Recovery Summary"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 } },
            [
              { label: "Total IRS Debt", value: fmt(results.totalOwed), color: "#fca5a5" },
              { label: "Monthly Disposable", value: fmt(results.disposable), color: "#7ec11f" },
              { label: "Estimated Min Offer", value: fmt(results.rcpCash), color: "#c8a96e" },
              { label: "Earliest CSED", value: results.earliestCsed.toString(), color: "#94a3b8" },
            ].map(item => React.createElement("div", { key: item.label, style: { textAlign: "center" } },
              React.createElement("div", { style: { color: "#94a3b8", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" } }, item.label),
              React.createElement("div", { style: { color: item.color, fontSize: 18, fontWeight: "bold" } }, item.value)
            ))
          )
        ),

        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "CSED Status by Year"),
          results.debts.map((d, i) => React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 8, borderRadius: 8, background: d.expired ? "#f0fdf4" : d.yearsLeft <= 3 ? "#fef3c7" : "#f8f6f1", border: "1px solid " + (d.expired ? "#7ec11f" : d.yearsLeft <= 3 ? "#f59e0b" : "#e8e4dc") } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, "Tax Year " + d.year + " \u2014 " + fmt(d.owed)),
              React.createElement("div", { style: { fontSize: 11, color: "#666" } }, "CSED: " + d.csed + (d.expired ? " (EXPIRED \u2014 no longer collectible)" : " (" + d.yearsLeft + " years remaining)"))
            ),
            React.createElement("div", { style: { fontSize: 11, fontWeight: "bold", color: d.expired ? "#15803d" : d.yearsLeft <= 3 ? "#f59e0b" : "#666" } }, d.expired ? "\u2705 Expired" : d.yearsLeft <= 3 ? "\u26A0 Expiring Soon" : "\uD83D\uDDD3\uFE0F Active")
          ))
        ),

        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Resolution Analysis"),
          React.createElement(ResultRow, { label: "Total Owed (all years)", value: fmt(results.totalOwed) }),
          React.createElement(ResultRow, { label: "Monthly Disposable Income", value: fmt(results.disposable) }),
          React.createElement(ResultRow, { label: "Full Pay Timeline", value: results.fullPayMonths === Infinity ? "Not feasible" : results.fullPayMonths + " months" }),
          React.createElement(ResultRow, { label: "OIC Minimum (cash)", value: fmt(results.rcpCash) }),
          React.createElement(ResultRow, { label: "OIC Minimum (deferred)", value: fmt(results.rcpDeferred) }),
          React.createElement(ResultRow, { label: "Streamlined IA eligible", value: results.streamlined ? "\u2705 Yes (under $50K)" : "\u274C No (over $50K)", bold: true }),
          results.oicViable && React.createElement(InfoBox, { type: "green" }, "\u2705 OIC appears viable. Your estimated RCP (" + fmt(results.rcpCash) + ") is less than the full balance of " + fmt(results.totalOwed) + ". Use the IRS Pilot Wizard to complete Forms 433-A OIC and 656."),
          results.ppia && !results.oicViable && React.createElement(InfoBox, { type: "info" }, "\uD83D\uDCA1 A Partial Pay Installment Agreement (PPIA) may allow the remaining balance to expire on the CSED without being fully paid.")
        ),

        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "3-Year Tax Projection"),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 } },
            [
              { year: "Year 1 (" + currentYear + ")", income: results.yr1, tax: results.taxYr1 },
              { year: "Year 2 (" + (currentYear+1) + ")", income: results.yr2, tax: results.taxYr2 },
              { year: "Year 3 (" + (currentYear+2) + ")", income: results.yr3, tax: results.taxYr3 },
            ].map(y => React.createElement("div", { key: y.year, style: { background: "#f8f6f1", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8e4dc" } },
              React.createElement("div", { style: { fontSize: 11, color: "#888", marginBottom: 6 } }, y.year),
              React.createElement("div", { style: { fontSize: 12, color: "#555" } }, "Income: " + fmt(y.income)),
              React.createElement("div", { style: { fontSize: 15, fontWeight: "bold", color: "#1a2d5a", marginTop: 4 } }, "Tax: " + fmt(y.tax))
            ))
          ),
          React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: "#888" } }, "Projected total tax over 3 years: " + fmt(results.taxYr1 + results.taxYr2 + results.taxYr3) + ". Pay quarterly estimates to avoid adding new debt.")
        ),

        React.createElement("div", { style: cardStyle },
          React.createElement("div", { style: sectionTitleStyle }, "Recovery Milestones"),
          results.milestones.map((m, i) => React.createElement("div", { key: i, style: { marginBottom: 10, padding: "12px 14px", borderRadius: 8, background: priorityBg[m.priority], border: "1px solid " + priorityColor[m.priority] + "44" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 } },
              React.createElement("span", { style: { fontSize: 10, fontWeight: "bold", color: priorityColor[m.priority], textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 7px", border: "1px solid " + priorityColor[m.priority], borderRadius: 10 } }, m.priority),
              React.createElement("span", { style: { fontSize: 13, fontWeight: "bold", color: "#1a2d5a" } }, m.label)
            ),
            React.createElement("div", { style: { fontSize: 12, color: "#555", lineHeight: 1.5 } }, m.note)
          ))
        ),
        React.createElement("div", { style: { fontSize: 11, color: "#aaa", lineHeight: 1.6 } }, "For planning purposes only. CSED dates may be tolled. Consult an Enrolled Agent for your specific situation.")
      ) : React.createElement("div", { style: { ...cardStyle, textAlign: "center", padding: "48px 32px" } },
        React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDDFA\uFE0F"),
        React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "Multi-Year Recovery Plan"),
        React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7 } }, "Enter your debt by year and cash flow to generate a prioritized recovery timeline with CSED analysis, OIC evaluation, and 3-year tax projections.")
      )
    )
  );
}


// ── TAB 6: Deductions & Credits ──────────────────────────────────────────────

const DEDUCTIONS_CATEGORIES = [
  { id: "deductions", label: "\uD83C\uDFE0 Little-Known Deductions" },
  { id: "credits", label: "\uD83D\uDCB0 Advanced Credits" },
  { id: "deferral", label: "\u23F3 Income Timing & Deferral" },
];

const DEDUCTIONS_STRATEGIES = {
  deductions: [
    { id: "augusta", label: "Augusta Rule (IRC \u00a7280A)" },
    { id: "accountable", label: "Accountable Plans" },
    { id: "home_office_adv", label: "Home Office (Advanced)" },
    { id: "bonus_dep", label: "Bonus Depreciation / Section 179" },
    { id: "cost_seg", label: "Cost Segregation" },
  ],
  credits: [
    { id: "rd_credit", label: "R&D Tax Credit (\u00a741)" },
    { id: "wotc", label: "Work Opportunity Credit (WOTC)" },
    { id: "energy", label: "Energy Credits (179D / 25C / 30D)" },
    { id: "se_health_hsa", label: "SE Health Insurance + HSA" },
  ],
  deferral: [
    { id: "deferred_income", label: "Deferred Income Strategies" },
    { id: "installment", label: "Installment Sales (IRC \u00a7453)" },
    { id: "qoz", label: "Qualified Opportunity Zones" },
    { id: "charitable", label: "Charitable Giving (DAF / QCD)" },
    { id: "plan529", label: "529 Plans (Advanced)" },
  ],
};

function ResetBtn({ onReset }) {
  return React.createElement("button", {
    onClick: onReset,
    style: { padding: "6px 14px", background: "#fff", border: "1.5px solid #ddd", borderRadius: 6, fontSize: 12, color: "#666", cursor: "pointer", fontFamily: "DM Sans", sans-serif }
  }, "\u21BA Reset");
}

function StrategyShell({ title, irc, who, savings, steps, mistakes, children, onReset }) {
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 } },
      React.createElement("div", null,
        React.createElement("div", { style: { fontSize: 18, fontWeight: "bold", color: "#1a2d5a", marginBottom: 4 } }, title),
        React.createElement("div", { style: { fontSize: 12, color: "#7ec11f", fontWeight: "bold" } }, irc)
      ),
      React.createElement(ResetBtn, { onReset })
    ),
    React.createElement(InfoBox, { type: "info" }, React.createElement("strong", null, "Who qualifies: "), who),
    children,
    savings && React.createElement("div", { style: { ...cardStyle, background: "#f0fdf4", border: "1.5px solid #7ec11f" } },
      React.createElement("div", { style: sectionTitleStyle }, "\uD83D\uDCCA Estimated Savings"),
      savings
    ),
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "\u2705 How to Implement — Step by Step"),
      steps.map((s, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 12, marginBottom: 12, fontSize: 13, color: "#444", lineHeight: 1.6 } },
        React.createElement("div", { style: { minWidth: 24, height: 24, borderRadius: "50%", background: "#1a2d5a", color: "#7ec11f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", flexShrink: 0, marginTop: 1 } }, i + 1),
        React.createElement("div", null, s)
      ))
    ),
    mistakes && React.createElement("div", { style: { ...cardStyle, background: "#fef2f2", border: "1px solid #fecaca" } },
      React.createElement("div", { style: { ...sectionTitleStyle, borderBottomColor: "#fecaca", color: "#dc2626" } }, "\u26A0\uFE0F Common Mistakes"),
      mistakes.map((m, i) => React.createElement("div", { key: i, style: { display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 } },
        React.createElement("span", { style: { flexShrink: 0 } }, "\u2022"),
        React.createElement("span", null, m)
      ))
    )
  );
}

// ── Strategy: Augusta Rule ───────────────────────────────────────────────────
function AugustaRule() {
  const [f, setF] = useState({ days: "", daily_rate: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ days: "", daily_rate: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const days = Math.min(14, n(f.days));
    const rate = n(f.daily_rate);
    const taxRate = n(f.tax_rate) / 100 || 0.30;
    const rentalIncome = days * rate;
    const taxSavings = rentalIncome * taxRate;
    setRes({ days, rate, rentalIncome, taxSavings });
  };
  return React.createElement(StrategyShell, {
    title: "The Augusta Rule", irc: "IRC \u00a7280A(g)", onReset: reset,
    who: "Any business owner (S-Corp, C-Corp, Partnership, or sole proprietor) who also owns a home. Works best when the business pays the rent.",
    steps: [
      "Document the legitimate business purpose of each meeting held at your home (board meetings, strategy sessions, client entertainment planning, etc.).",
      "Obtain a fair market rental rate from a comparable venue (hotel meeting room, event space). Save a quote or receipt as documentation.",
      "Have your business (S-Corp, LLC, etc.) write a check or ACH to you personally for the rental — up to 14 days per year.",
      "You report zero rental income on your personal return (IRC \u00a7280A(g) excludes it). Your business deducts it as a legitimate business expense.",
      "Keep a written rental agreement, calendar entries, meeting agendas, and the bank record of payment. Maintain this documentation permanently."
    ],
    mistakes: [
      "Using this with a sole proprietorship — the IRS disallows it because you cannot rent to yourself. Must have a separate entity (S-Corp, C-Corp, or partnership).",
      "Exceeding 14 days — on day 15, ALL rental income becomes taxable and the entire deduction may be disallowed.",
      "Charging an unreasonable rate — the rate must be what a comparable commercial venue would charge, not inflated.",
      "No documentation — this strategy draws IRS scrutiny. Agendas, photos, and bank records are essential."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Days Rented", value: res.days + " days" }),
      React.createElement(ResultRow, { label: "Daily Rate", value: fmt(res.rate) }),
      React.createElement(ResultRow, { label: "Tax-Free Rental Income", value: fmt(res.rentalIncome) }),
      React.createElement(ResultRow, { label: "Business Deduction", value: fmt(res.rentalIncome) }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings", value: fmt(res.taxSavings), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Days per Year (max 14)"), React.createElement("input", { name: "days", type: "number", min: "1", max: "14", placeholder: "14", value: f.days, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Daily Rental Rate ($)"), React.createElement("input", { name: "daily_rate", type: "number", placeholder: "500", value: f.daily_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "30", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Savings")
    )
  );
}

// ── Strategy: Accountable Plans ──────────────────────────────────────────────
function AccountablePlans() {
  const [f, setF] = useState({ monthly_expenses: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ monthly_expenses: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const monthly = n(f.monthly_expenses);
    const annual = monthly * 12;
    const taxRate = n(f.tax_rate) / 100 || 0.30;
    const ficaRate = 0.0765;
    const savings = annual * (taxRate + ficaRate);
    setRes({ monthly, annual, savings, ficaRate });
  };
  return React.createElement(StrategyShell, {
    title: "Accountable Plans", irc: "IRC \u00a7162 / Treas. Reg. \u00a71.62-2", onReset: reset,
    who: "Any S-Corp, C-Corp, or employer with W-2 employees — including owner-employees. Sole proprietors cannot use an accountable plan for themselves (expenses go on Schedule C).",
    steps: [
      "Adopt a written Accountable Plan document for your corporation. This can be done via a board resolution or a standalone policy document. Date it before the reimbursements begin.",
      "Identify reimbursable expenses: home office, mileage (at 70\u00a2/mile for 2025), cell phone (business use %), internet (business use %), travel, meals, professional development.",
      "Employees (including owner-employees) submit an expense report with receipts within a reasonable time (generally 60 days of incurring the expense).",
      "The company reimburses the employee. The reimbursement is NOT included in W-2 wages and is NOT subject to payroll taxes.",
      "The company deducts the reimbursement as a business expense. No self-employment tax applies to either side."
    ],
    mistakes: [
      "No written plan — without documentation, the IRS treats reimbursements as taxable wages.",
      "Reimbursing personal expenses — only legitimate business expenses qualify. 100% personal phone bills don't qualify; only the business-use percentage.",
      "No substantiation — employees must provide receipts. General estimates are not sufficient.",
      "Using with a sole proprietorship for yourself — those expenses go directly on Schedule C. An accountable plan only benefits W-2 employees."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Monthly Business Expenses", value: fmt(res.monthly) }),
      React.createElement(ResultRow, { label: "Annual Reimbursable Expenses", value: fmt(res.annual) }),
      React.createElement(ResultRow, { label: "Payroll Tax Avoided (7.65%)", value: fmt(res.annual * res.ficaRate) }),
      React.createElement(ResultRow, { label: "Income Tax Saved", value: fmt(res.annual * (res.savings/res.annual - res.ficaRate)) }),
      React.createElement(ResultRow, { label: "Total Annual Tax Savings", value: fmt(res.savings), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Monthly Business Expenses ($)"), React.createElement("input", { name: "monthly_expenses", type: "number", placeholder: "500", value: f.monthly_expenses, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Combined Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "30", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Savings")
    )
  );
}

// ── Strategy: Home Office Advanced ───────────────────────────────────────────
function HomeOfficeAdv() {
  const [f, setF] = useState({ office_sqft: "", home_sqft: "", rent_or_mortgage: "", utilities: "", insurance: "", repairs: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ office_sqft: "", home_sqft: "", rent_or_mortgage: "", utilities: "", insurance: "", repairs: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const officeSqft = n(f.office_sqft);
    const homeSqft = n(f.home_sqft);
    const pct = homeSqft > 0 ? officeSqft / homeSqft : 0;
    const totalExpenses = n(f.rent_or_mortgage) * 12 + n(f.utilities) * 12 + n(f.insurance) * 12 + n(f.repairs) * 12;
    const regularDeduction = totalExpenses * pct;
    const simplifiedDeduction = Math.min(officeSqft, 300) * 5;
    const best = Math.max(regularDeduction, simplifiedDeduction);
    const taxRate = n(f.tax_rate) / 100 || 0.25;
    const taxSavings = best * taxRate;
    setRes({ pct, totalExpenses, regularDeduction, simplifiedDeduction, best, taxSavings, officeSqft });
  };
  return React.createElement(StrategyShell, {
    title: "Home Office Deduction (Advanced)", irc: "IRC \u00a7280A(c)", onReset: reset,
    who: "Self-employed individuals (Schedule C), S-Corp owner-employees (via accountable plan reimbursement), and remote workers who are self-employed. W-2 employees cannot deduct home office expenses (suspended through 2025 under TCJA).",
    steps: [
      "Determine your method: Regular Method (actual expenses \xd7 office percentage) or Simplified Method ($5/sqft, max 300 sqft = max $1,500/yr).",
      "Calculate the business-use percentage: office square footage \xf7 total home square footage.",
      "Regular method: multiply that percentage by annual rent/mortgage interest, utilities, insurance, and repairs. Mortgage principal is NOT deductible \u2014 only the interest portion.",
      "For S-Corp owner-employees: the corporation adopts an Accountable Plan and reimburses you for the home office percentage. This avoids the passive activity limitation.",
      "You can switch between methods year to year. Run both calculations and pick the higher deduction each year.",
      "The space must be used REGULARLY and EXCLUSIVELY for business. A dedicated room is ideal. A corner of a shared bedroom generally does not qualify."
    ],
    mistakes: [
      "Claiming a room that is also used personally \u2014 the 'exclusive use' requirement is strict and one of the top audit triggers.",
      "Owner-employees taking the deduction directly on their personal return \u2014 it must go through the corporation's accountable plan.",
      "Forgetting that the regular method requires depreciation on the home, which creates a recapture event when you sell.",
      "Using the home office deduction to create a net loss from an otherwise profitable business \u2014 there are limitations."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Business Use Percentage", value: (res.pct*100).toFixed(1) + "%" }),
      React.createElement(ResultRow, { label: "Total Annual Home Expenses", value: fmt(res.totalExpenses) }),
      React.createElement(ResultRow, { label: "Regular Method Deduction", value: fmt(res.regularDeduction) }),
      React.createElement(ResultRow, { label: "Simplified Method Deduction", value: fmt(res.simplifiedDeduction) + " (" + Math.min(res.officeSqft,300) + " sqft \xd7 $5)" }),
      React.createElement(ResultRow, { label: "Best Method", value: fmt(res.best), bold: true }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings", value: fmt(res.taxSavings), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Office Sq Ft"), React.createElement("input", { name: "office_sqft", type: "number", placeholder: "200", value: f.office_sqft, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Total Home Sq Ft"), React.createElement("input", { name: "home_sqft", type: "number", placeholder: "1800", value: f.home_sqft, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Monthly Rent or Mortgage"), React.createElement("input", { name: "rent_or_mortgage", type: "number", placeholder: "1500", value: f.rent_or_mortgage, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Monthly Utilities"), React.createElement("input", { name: "utilities", type: "number", placeholder: "200", value: f.utilities, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Monthly Insurance"), React.createElement("input", { name: "insurance", type: "number", placeholder: "100", value: f.insurance, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Monthly Repairs/Maintenance"), React.createElement("input", { name: "repairs", type: "number", placeholder: "50", value: f.repairs, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "25", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Both Methods")
    )
  );
}

// ── Strategy: Bonus Depreciation / Sec 179 ───────────────────────────────────
function BonusDepreciation() {
  const [f, setF] = useState({ asset_cost: "", tax_rate: "", sec179_choice: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ asset_cost: "", tax_rate: "", sec179_choice: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const cost = n(f.asset_cost);
    const taxRate = n(f.tax_rate) / 100 || 0.30;
    const sec179Limit = 1160000;
    const bonusPct = 0.40; // 2025: 40% bonus depreciation
    const sec179 = Math.min(cost, sec179Limit);
    const bonusOnly = cost * bonusPct;
    const straight5yr = cost / 5;
    const taxSavings179 = sec179 * taxRate;
    const taxSavingsBonus = bonusOnly * taxRate;
    const taxSavingsStraight = straight5yr * taxRate;
    setRes({ cost, sec179, bonusOnly, straight5yr, taxSavings179, taxSavingsBonus, taxSavingsStraight, bonusPct });
  };
  return React.createElement(StrategyShell, {
    title: "Bonus Depreciation & Section 179", irc: "IRC \u00a7179 & \u00a7168(k)", onReset: reset,
    who: "Any business that purchases qualifying property (equipment, vehicles, software, machinery, furniture). Section 179 also covers some improvements to non-residential real property.",
    steps: [
      "Identify qualifying assets placed in service during the tax year: equipment, machinery, vehicles (with limits), computers, software, office furniture, and qualified improvement property.",
      "Section 179: elect to expense up to $1,160,000 of qualifying property in year one. This is limited to your business taxable income (cannot create a loss with \u00a7179).",
      "Bonus Depreciation (\u00a7168(k)): for 2025, deduct 40% of the cost in year one with NO income limitation. Can create or increase a net operating loss.",
      "You can combine both: use \u00a7179 up to the income limit, then apply bonus depreciation to the remainder.",
      "For listed property (vehicles, etc.): luxury auto limits apply. For SUVs over 6,000 lbs GVWR, \u00a7179 is capped at $28,900 for 2025.",
      "Make the election on Form 4562, filed with your tax return. For \u00a7179, you must make the election by the return due date including extensions."
    ],
    mistakes: [
      "Using \u00a7179 to create a loss \u2014 it cannot. Any excess \u00a7179 carries forward to the next year. Bonus depreciation has no such restriction.",
      "Forgetting vehicle limitations \u2014 passenger automobiles have strict luxury auto caps regardless of actual cost.",
      "Depreciating land or inventory \u2014 these never qualify for depreciation.",
      "Not tracking basis \u2014 when you sell the asset, you will recognize depreciation recapture as ordinary income (Section 1245). Keep records permanently."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Asset Cost", value: fmt(res.cost) }),
      React.createElement(ResultRow, { label: "Section 179 Deduction (Year 1)", value: fmt(res.sec179) }),
      React.createElement(ResultRow, { label: "Bonus Depreciation Only (40%)", value: fmt(res.bonusOnly) }),
      React.createElement(ResultRow, { label: "Straight-Line Yr 1 (5-yr property)", value: fmt(res.straight5yr) }),
      React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e4dc" } }),
      React.createElement(ResultRow, { label: "Tax Savings \u2014 Section 179", value: fmt(res.taxSavings179), bold: true, color: "#15803d" }),
      React.createElement(ResultRow, { label: "Tax Savings \u2014 Bonus Dep Only", value: fmt(res.taxSavingsBonus) }),
      React.createElement(ResultRow, { label: "Tax Savings \u2014 Straight Line Yr 1", value: fmt(res.taxSavingsStraight) }),
      React.createElement(InfoBox, { type: "green" }, "Section 179 accelerates up to " + fmt(res.taxSavings179 - res.taxSavingsStraight) + " more in tax savings in Year 1 vs. straight-line depreciation.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Asset Purchase Price ($)"), React.createElement("input", { name: "asset_cost", type: "number", placeholder: "50000", value: f.asset_cost, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "30", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Compare Methods")
    )
  );
}

// ── Strategy: Cost Segregation ────────────────────────────────────────────────
function CostSegregation() {
  const reset = () => {};
  return React.createElement(StrategyShell, {
    title: "Cost Segregation", irc: "IRC \u00a7168 / Rev. Proc. 87-56", onReset: reset,
    who: "Owners of commercial real estate, rental property, or mixed-use property with a cost basis of $500,000 or more. Most beneficial in the first year of ownership or after a major renovation.",
    steps: [
      "Hire a qualified cost segregation engineer or CPA firm specializing in cost segregation studies. This is not a DIY project \u2014 the IRS expects a formal engineering study.",
      "The engineer reclassifies building components from 39-year (commercial) or 27.5-year (residential) depreciation into shorter-lived classes: 5-year, 7-year, or 15-year property.",
      "Examples of reclassified items: carpet, lighting, plumbing fixtures, landscaping, parking lots, specialty electrical, and decorative elements.",
      "The accelerated depreciation is claimed on Form 4562. The study results attach to your return.",
      "Combine with bonus depreciation (40% in 2025) on the reclassified 5- and 15-year property for maximum first-year deductions.",
      "If you did not do a study in a prior year, you can file a Change in Accounting Method (Form 3115) to catch up without amending prior returns."
    ],
    mistakes: [
      "Doing cost segregation on a property you plan to sell soon \u2014 all depreciation is recaptured at sale (at ordinary income rates for \u00a71245 property).",
      "Skipping the formal engineering study \u2014 IRS auditors expect documentation. Informal estimates will not survive examination.",
      "Applying cost segregation to land \u2014 land is never depreciable. Only the improvements qualify.",
      "Not considering passive activity rules \u2014 if you are not a Real Estate Professional, the accelerated depreciation may be suspended as a passive loss."
    ],
    savings: React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 13, color: "#444", lineHeight: 1.7 } },
        "A typical cost segregation study on a $1M commercial property reclassifies 20\u201330% of the building cost into 5\u201315 year property. At a 30% tax rate, this can generate $60,000\u2013$90,000 in accelerated first-year deductions versus straight-line depreciation.",
        React.createElement("br", null), React.createElement("br", null),
        "Cost segregation studies typically cost $5,000\u2013$15,000 and are themselves fully deductible as a professional fee."
      )
    )
  }, null);
}

// ── Strategy: R&D Tax Credit ─────────────────────────────────────────────────
function RDCredit() {
  const [f, setF] = useState({ wages: "", supplies: "", contractor_costs: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ wages: "", supplies: "", contractor_costs: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const wages = n(f.wages);
    const supplies = n(f.supplies);
    const contractors = n(f.contractor_costs) * 0.65;
    const qre = wages + supplies + contractors;
    const creditRegular = qre * 0.20;
    const creditASC = qre * 0.06;
    setRes({ qre, creditRegular, creditASC, wages, supplies, contractors: n(f.contractor_costs) });
  };
  return React.createElement(StrategyShell, {
    title: "R&D Tax Credit", irc: "IRC \u00a741 \u2014 Credit for Increasing Research Activities", onReset: reset,
    who: "Businesses in ANY industry that develop or improve products, processes, software, or formulas. This is not just for labs and tech companies \u2014 it applies to manufacturers, contractors, food producers, and professional service firms.",
    steps: [
      "Identify Qualified Research Activities (QRAs): activities that involve a process of experimentation to develop or improve a product, process, software, or technique. The research must be technological in nature.",
      "The four-part test: (1) Permitted purpose \u2014 creates or improves functionality. (2) Technological in nature \u2014 relies on engineering, science, computer science, etc. (3) Elimination of uncertainty \u2014 the outcome was not known at the start. (4) Process of experimentation \u2014 you tried alternatives.",
      "Calculate Qualified Research Expenses (QREs): W-2 wages for time spent on research, supplies consumed in research, and 65% of contractor costs for research done in the US.",
      "Choose your credit method: Regular Credit (20% of QREs exceeding a base amount) or Alternative Simplified Credit (ASC \u2014 6% of QREs exceeding 50% of the average QREs from the prior 3 years).",
      "Claim on Form 6765. Attach a contemporaneous research log documenting the activities, employees involved, and experiments conducted.",
      "Startups with under $5M in gross receipts can apply up to $500,000 of the R&D credit against payroll taxes \u2014 even if they have no income tax liability."
    ],
    mistakes: [
      "Thinking R&D credits only apply to labs or tech companies \u2014 any business improving a product or process through experimentation may qualify.",
      "No documentation \u2014 the IRS will disallow the credit without contemporaneous records of the research activities and who was involved.",
      "Including all wages instead of only the percentage of time employees spent on qualified research.",
      "Forgetting the payroll tax offset for startups \u2014 one of the most valuable and underused provisions for early-stage companies."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Research Wages", value: fmt(res.wages) }),
      React.createElement(ResultRow, { label: "Research Supplies", value: fmt(res.supplies) }),
      React.createElement(ResultRow, { label: "Contractor Costs (65%)", value: fmt(res.contractors) }),
      React.createElement(ResultRow, { label: "Total QREs", value: fmt(res.qre), bold: true }),
      React.createElement(ResultRow, { label: "Credit \u2014 Regular Method (20%)", value: fmt(res.creditRegular), bold: true, color: "#15803d" }),
      React.createElement(ResultRow, { label: "Credit \u2014 ASC Method (6%)", value: fmt(res.creditASC) }),
      React.createElement(InfoBox, { type: "info" }, "The R&D credit is a dollar-for-dollar reduction of tax owed \u2014 not a deduction. " + fmt(res.creditRegular) + " in credit = " + fmt(res.creditRegular) + " less tax paid.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Research Wages ($)"), React.createElement("input", { name: "wages", type: "number", placeholder: "80000", value: f.wages, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Research Supplies ($)"), React.createElement("input", { name: "supplies", type: "number", placeholder: "5000", value: f.supplies, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Contractor Costs ($)"), React.createElement("input", { name: "contractor_costs", type: "number", placeholder: "20000", value: f.contractor_costs, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Estimate R&D Credit")
    )
  );
}

// ── Strategy: WOTC ───────────────────────────────────────────────────────────
function WOTCCredit() {
  const [f, setF] = useState({ hires: "", avg_wages: "", target_group: "snap" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ hires: "", avg_wages: "", target_group: "snap" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const GROUPS = {
    snap: { label: "SNAP (Food Stamps) recipient", pct: 0.25, maxWages: 6000, hoursMin: 120 },
    veteran: { label: "Disabled Veteran (with unemployment)", pct: 0.40, maxWages: 24000, hoursMin: 400 },
    exfelon: { label: "Ex-Felon (hired within 1 year of release)", pct: 0.40, maxWages: 6000, hoursMin: 400 },
    ssi: { label: "SSI Recipient", pct: 0.25, maxWages: 6000, hoursMin: 120 },
    longterm: { label: "Long-Term TANF Recipient", pct: 0.40, maxWages: 10000, hoursMin: 400 },
  };
  const calc = () => {
    const group = GROUPS[f.target_group];
    const hires = n(f.hires);
    const avgWages = n(f.avg_wages);
    const qualifyingWages = Math.min(avgWages, group.maxWages);
    const creditPerHire = qualifyingWages * group.pct;
    const totalCredit = creditPerHire * hires;
    setRes({ group, hires, avgWages, qualifyingWages, creditPerHire, totalCredit });
  };
  return React.createElement(StrategyShell, {
    title: "Work Opportunity Tax Credit (WOTC)", irc: "IRC \u00a751", onReset: reset,
    who: "Any employer (for-profit) that hires workers from one of 10 targeted groups including veterans, ex-felons, SNAP recipients, SSI recipients, and long-term TANF recipients.",
    steps: [
      "Before or on the day of hire, have the new employee complete IRS Form 8850 (Pre-Screening Notice) and ETA Form 9061 (Individual Characteristics Form).",
      "Submit Form 8850 to your State Workforce Agency (SWA) within 28 days of the employee's start date. This is a hard deadline \u2014 late submissions are rejected.",
      "The SWA certifies whether the employee is a member of a target group. Keep the certification letter permanently.",
      "Calculate the credit on Form 5884 and carry it to Form 3800 (General Business Credit). The credit ranges from 25% to 40% of first-year wages depending on hours worked.",
      "The credit reduces your wage deduction dollar-for-dollar. Net benefit is still positive in almost all cases.",
      "WOTC is authorized through 2025. Check IRS.gov for extensions in subsequent years."
    ],
    mistakes: [
      "Missing the 28-day Form 8850 deadline \u2014 this is the single most common reason WOTC credits are lost.",
      "Not asking about target group status at hiring \u2014 you must complete the pre-screening before or on the first day of work.",
      "Forgetting to reduce the wage deduction by the credit amount \u2014 you cannot double-dip.",
      "Assuming the credit only applies to large employers \u2014 any for-profit employer of any size qualifies."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Target Group", value: res.group.label }),
      React.createElement(ResultRow, { label: "Number of Qualifying Hires", value: res.hires.toString() }),
      React.createElement(ResultRow, { label: "Qualifying Wages per Hire (capped)", value: fmt(res.qualifyingWages) }),
      React.createElement(ResultRow, { label: "Credit Rate", value: (res.group.pct * 100) + "% (\u22651," + res.group.hoursMin + " hrs worked)" }),
      React.createElement(ResultRow, { label: "Credit per Hire", value: fmt(res.creditPerHire) }),
      React.createElement(ResultRow, { label: "Total WOTC Credit", value: fmt(res.totalCredit), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { marginBottom: 12 } }, React.createElement("label", { style: labelStyle }, "Target Group"), React.createElement("select", { name: "target_group", value: f.target_group, onChange: ch, style: inpStyle }, Object.entries(GROUPS).map(([k, g]) => React.createElement("option", { key: k, value: k }, g.label)))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Number of Qualifying Hires"), React.createElement("input", { name: "hires", type: "number", placeholder: "3", value: f.hires, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Avg First-Year Wages per Hire ($)"), React.createElement("input", { name: "avg_wages", type: "number", placeholder: "15000", value: f.avg_wages, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Estimate WOTC Credit")
    )
  );
}

// ── Strategy: Energy Credits ─────────────────────────────────────────────────
function EnergyCredits() {
  const [f, setF] = useState({ ev_cost: "", home_improvements: "", home_energy_cost: "", building_sqft: "", building_cost: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ ev_cost: "", home_improvements: "", home_energy_cost: "", building_sqft: "", building_cost: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const evCredit = Math.min(n(f.ev_cost) > 0 ? 7500 : 0, 7500);
    const homeEnergyCredit = Math.min(n(f.home_improvements) * 0.30, 3200);
    const sec179D = Math.min(n(f.building_sqft) * 5.00, n(f.building_cost));
    setRes({ evCredit, homeEnergyCredit, sec179D, total: evCredit + homeEnergyCredit + sec179D });
  };
  return React.createElement(StrategyShell, {
    title: "Energy Tax Credits", irc: "\u00a730D (EV) / \u00a725C (Home Energy) / \u00a7179D (Commercial)", onReset: reset,
    who: "Individuals buying EVs or making home energy improvements (\u00a725C, \u00a730D). Business owners or building owners making commercial energy improvements (\u00a7179D).",
    steps: [
      "Section 30D (EV Credit): Up to $7,500 for new qualifying EVs. Income limits apply: $150K single / $300K MFJ. The vehicle must be assembled in North America and meet battery/component requirements. Starting 2024, claim at the dealership as a point-of-sale credit.",
      "Section 25C (Home Energy): 30% credit, up to $3,200/year for qualifying improvements including heat pumps, insulation, windows, and electrical panels. No lifetime cap \u2014 you can claim up to $3,200 every year you make improvements.",
      "Section 179D (Commercial Buildings): Deduction of up to $5.00/sqft for energy-efficient commercial buildings. Requires a qualified energy study and IRS-approved software. REITs, partnerships, and nonprofits can now also claim this deduction.",
      "For \u00a730D and \u00a725C: claim on Form 8936 and Form 5695 respectively with your personal return.",
      "For \u00a7179D: obtain a certification from a qualified engineer, then deduct on your business return."
    ],
    mistakes: [
      "Buying an EV that doesn\u2019t qualify under the North America assembly or battery content requirements \u2014 check the IRS\u2019s qualified vehicle list before purchasing.",
      "Exceeding income limits for \u00a730D \u2014 the credit is fully phased out above $150K (single) or $300K (MFJ) based on modified AGI.",
      "Thinking \u00a725C has a lifetime cap \u2014 it does not. The annual cap of $3,200 resets each year.",
      "Skipping the energy certification for \u00a7179D \u2014 the IRS requires a third-party study from a licensed engineer."
    ],
    savings: res && React.createElement("div", null,
      res.evCredit > 0 && React.createElement(ResultRow, { label: "EV Credit (\u00a730D)", value: fmt(res.evCredit) }),
      res.homeEnergyCredit > 0 && React.createElement(ResultRow, { label: "Home Energy Credit (\u00a725C, 30%)", value: fmt(res.homeEnergyCredit) }),
      res.sec179D > 0 && React.createElement(ResultRow, { label: "Commercial Building Deduction (\u00a7179D)", value: fmt(res.sec179D) }),
      React.createElement(ResultRow, { label: "Total Estimated Credits/Deductions", value: fmt(res.total), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "EV Purchase Price ($)"), React.createElement("input", { name: "ev_cost", type: "number", placeholder: "45000", value: f.ev_cost, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Home Energy Improvements ($)"), React.createElement("input", { name: "home_improvements", type: "number", placeholder: "15000", value: f.home_improvements, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Commercial Building Sq Ft"), React.createElement("input", { name: "building_sqft", type: "number", placeholder: "5000", value: f.building_sqft, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Commercial Improvement Cost ($)"), React.createElement("input", { name: "building_cost", type: "number", placeholder: "200000", value: f.building_cost, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Estimate Energy Credits")
    )
  );
}

// ── Strategy: SE Health + HSA ────────────────────────────────────────────────
function SEHealthHSA() {
  const [f, setF] = useState({ health_premium: "", hsa_contrib: "", filing_status: "single", agi: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ health_premium: "", hsa_contrib: "", filing_status: "single", agi: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const premium = n(f.health_premium);
    const hsaMax = f.filing_status === "mj_joint" ? 8550 : 4300;
    const hsaActual = Math.min(n(f.hsa_contrib) || hsaMax, hsaMax);
    const taxRate = n(f.tax_rate) / 100 || 0.25;
    const ficaRate = 0.1530;
    const premiumSavings = premium * taxRate; // SE health ins reduces AGI, not SE tax
    const hsaSavings = hsaActual * (taxRate + 0); // HSA reduces AGI
    const totalDeduction = premium + hsaActual;
    const totalSavings = totalDeduction * taxRate;
    setRes({ premium, hsaActual, hsaMax, totalDeduction, totalSavings, premiumSavings, hsaSavings });
  };
  return React.createElement(StrategyShell, {
    title: "SE Health Insurance + HSA Strategy", irc: "IRC \u00a7162(l) / \u00a7223", onReset: reset,
    who: "Self-employed individuals not eligible for employer-sponsored health coverage (including through a spouse\u2019s employer). Must have a High Deductible Health Plan (HDHP) to contribute to an HSA.",
    steps: [
      "SE Health Insurance Deduction (\u00a7162(l)): If you are self-employed and not eligible for an employer plan, 100% of your health insurance premiums are deductible from AGI. This includes premiums for yourself, your spouse, and your dependents.",
      "This deduction reduces your income tax but NOT your self-employment tax. It appears on Schedule 1, not Schedule C.",
      "If your net self-employment income is less than your premiums, your deduction is limited to your net profit.",
      "Pair with an HSA: If your health plan is a qualifying High Deductible Health Plan (HDHP), contribute the maximum to your HSA. For 2025: $4,300 individual / $8,550 family.",
      "HSA contributions reduce AGI dollar-for-dollar. Withdrawals for qualified medical expenses are tax-free. After age 65, withdrawals for any purpose are taxed as ordinary income (like a traditional IRA).",
      "Invest your HSA balance \u2014 most HSA providers offer mutual fund options once you reach a minimum balance. Long-term, an HSA is the most tax-advantaged account available: pre-tax in, tax-free growth, tax-free out for medical."
    ],
    mistakes: [
      "Deducting premiums you paid through a spouse\u2019s employer plan \u2014 you are not eligible if you had access to employer coverage.",
      "Confusing an FSA with an HSA \u2014 FSAs are use-it-or-lose-it and cannot be invested. HSAs roll over forever.",
      "Not investing HSA funds \u2014 leaving HSA money in a cash account wastes the triple-tax-advantage. Invest for growth.",
      "Over-contributing to an HSA \u2014 excess contributions are subject to a 6% excise tax. Know your annual limit."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Annual Health Premiums", value: fmt(res.premium) }),
      React.createElement(ResultRow, { label: "HSA Contribution", value: fmt(res.hsaActual) + " (max " + fmt(res.hsaMax) + ")" }),
      React.createElement(ResultRow, { label: "Total AGI Reduction", value: fmt(res.totalDeduction), bold: true }),
      React.createElement(ResultRow, { label: "Estimated Income Tax Savings", value: fmt(res.totalSavings), bold: true, color: "#15803d" }),
      React.createElement(InfoBox, { type: "green" }, "Unlike most deductions, SE health insurance and HSA contributions reduce your AGI whether or not you itemize.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { marginBottom: 12 } }, React.createElement("label", { style: labelStyle }, "Filing Status"), React.createElement("select", { name: "filing_status", value: f.filing_status, onChange: ch, style: inpStyle }, React.createElement("option", { value: "single" }, "Single / Self-Only"), React.createElement("option", { value: "mj_joint" }, "Family Coverage"))),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Annual Health Premiums ($)"), React.createElement("input", { name: "health_premium", type: "number", placeholder: "8400", value: f.health_premium, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "HSA Contribution ($)"), React.createElement("input", { name: "hsa_contrib", type: "number", placeholder: "4300", value: f.hsa_contrib, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "25", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Combined Savings")
    )
  );
}

// ── Strategy: Deferred Income ────────────────────────────────────────────────
function DeferredIncome() {
  const [f, setF] = useState({ income_this_year: "", income_next_year: "", rate_this: "", rate_next: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ income_this_year: "", income_next_year: "", rate_this: "", rate_next: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const amt = n(f.income_this_year);
    const rateThis = n(f.rate_this) / 100 || 0.32;
    const rateNext = n(f.rate_next) / 100 || 0.24;
    const taxIfNow = amt * rateThis;
    const taxIfDeferred = amt * rateNext;
    const savings = taxIfNow - taxIfDeferred;
    setRes({ amt, taxIfNow, taxIfDeferred, savings, rateThis, rateNext });
  };
  return React.createElement(StrategyShell, {
    title: "Deferred Income Strategies", irc: "IRC \u00a7451 / \u00a7409A", onReset: reset,
    who: "Self-employed individuals, business owners, and high-income W-2 employees expecting lower income in a future year. Also applies to anyone approaching retirement or planning a major life change.",
    steps: [
      "Timing invoices (cash-basis taxpayers): If you are on the cash basis and expect lower income next year, delay sending invoices until late December. Income is recognized when received, not billed.",
      "Prepay deductible expenses: Accelerate deductible business expenses into the current high-income year. Prepaying up to 12 months of recurring expenses (insurance, subscriptions, rent) is generally allowed.",
      "Non-Qualified Deferred Compensation (NQDC) Plans: Employers can allow employees to defer compensation to future years. The deferred amount avoids current-year tax but is subject to strict rules under IRC \u00a7409A. Failure to comply triggers a 20% penalty tax plus interest.",
      "Installment sales (\u00a7453): Spread gain from selling a business or property over multiple years to stay in lower brackets. See the Installment Sales strategy for details.",
      "Roth conversion in low-income years: Defer traditional IRA/401(k) withdrawals; convert to Roth during low-income years to pay tax at a lower rate.",
      "Year-end review: Every November, project your year-end income and compare to next year. Shift income and deductions deliberately rather than accidentally."
    ],
    mistakes: [
      "Deferring income to a year where tax rates end up higher \u2014 always project both years before deciding.",
      "Violating \u00a7409A rules in NQDC plans \u2014 the penalties are severe. All deferral elections must be made before the compensation is earned.",
      "Cash-basis taxpayers deferring income they have already received \u2014 the constructive receipt doctrine applies. You cannot un-receive a check.",
      "Forgetting that deferral delays but does not eliminate tax. The math must justify the deferral."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Income to Defer", value: fmt(res.amt) }),
      React.createElement(ResultRow, { label: "Tax If Recognized This Year (" + (res.rateThis*100).toFixed(0) + "%)", value: fmt(res.taxIfNow) }),
      React.createElement(ResultRow, { label: "Tax If Deferred to Next Year (" + (res.rateNext*100).toFixed(0) + "%)", value: fmt(res.taxIfDeferred) }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings from Deferral", value: fmt(res.savings), bold: true, color: res.savings > 0 ? "#15803d" : "#dc2626" }),
      res.savings <= 0 && React.createElement(InfoBox, { type: "warn" }, "Deferral does not save taxes in this scenario. Consider whether other factors (bracket management, retirement) still make deferral worthwhile.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Deferral Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount to Potentially Defer ($)"), React.createElement("input", { name: "income_this_year", type: "number", placeholder: "50000", value: f.income_this_year, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "This Year\u2019s Marginal Rate (%)"), React.createElement("input", { name: "rate_this", type: "number", placeholder: "32", value: f.rate_this, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Next Year\u2019s Expected Rate (%)"), React.createElement("input", { name: "rate_next", type: "number", placeholder: "24", value: f.rate_next, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Deferral Benefit")
    )
  );
}

// ── Strategy: Installment Sales ───────────────────────────────────────────────
function InstallmentSales() {
  const [f, setF] = useState({ sale_price: "", basis: "", down_pmt: "", years: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ sale_price: "", basis: "", down_pmt: "", years: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const price = n(f.sale_price);
    const basis = n(f.basis);
    const down = n(f.down_pmt);
    const years = Math.max(1, n(f.years) || 5);
    const taxRate = n(f.tax_rate) / 100 || 0.20;
    const totalGain = Math.max(0, price - basis);
    const grossProfitPct = price > 0 ? totalGain / price : 0;
    const gainOnDown = down * grossProfitPct;
    const remainingBalance = price - down;
    const annualPayment = remainingBalance / years;
    const annualGain = annualPayment * grossProfitPct;
    const taxOnDown = gainOnDown * taxRate;
    const taxPerYear = annualGain * taxRate;
    const totalTax = taxOnDown + taxPerYear * years;
    const lumpSumTax = totalGain * taxRate;
    const savings = lumpSumTax - totalTax;
    setRes({ price, basis, totalGain, grossProfitPct, gainOnDown, annualGain, taxOnDown, taxPerYear, totalTax, lumpSumTax, savings, years, down });
  };
  return React.createElement(StrategyShell, {
    title: "Installment Sales (IRC \u00a7453)", irc: "IRC \u00a7453 \u2014 Installment Method", onReset: reset,
    who: "Sellers of businesses, real estate, or other capital assets where the gain would push them into a higher bracket or trigger the Net Investment Income Tax (NIIT). NOT available for publicly traded securities or inventory.",
    steps: [
      "Negotiate seller financing: Instead of receiving the full purchase price at closing, structure the deal so you receive a down payment and annual installments over several years.",
      "Calculate the gross profit percentage: Total gain \xf7 selling price. This percentage of each payment received is taxable gain.",
      "Report on Form 6252 (Installment Sale Income) each year you receive payments.",
      "The buyer pays interest on the outstanding balance. Interest is separately taxable as ordinary income. If you charge no interest, the IRS will impute it under the Applicable Federal Rate (AFR).",
      "Consider an interest rate at or above the current AFR (published monthly by IRS). This avoids imputed interest and gives you control over the income stream.",
      "Watch for the installment sale recapture rule: depreciation recapture (ordinary income) must be reported in full in the year of sale, regardless of the installment schedule."
    ],
    mistakes: [
      "Forgetting depreciation recapture \u2014 if the property is depreciable, recapture income is fully taxable in year one regardless of payments received.",
      "No interest provision \u2014 the IRS will impute interest at the AFR if the stated rate is below market, converting some of your capital gain income into ordinary interest income.",
      "Using installment sales for inventory or publicly traded securities \u2014 these are expressly excluded from \u00a7453.",
      "Death of the seller before all payments received \u2014 the remaining installment gain is accelerated into the estate. Plan for this contingency."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Total Gain", value: fmt(res.totalGain) }),
      React.createElement(ResultRow, { label: "Gross Profit %", value: (res.grossProfitPct * 100).toFixed(1) + "%" }),
      React.createElement(ResultRow, { label: "Tax on Down Payment", value: fmt(res.taxOnDown) }),
      React.createElement(ResultRow, { label: "Annual Gain Recognized", value: fmt(res.annualGain) }),
      React.createElement(ResultRow, { label: "Annual Tax", value: fmt(res.taxPerYear) }),
      React.createElement(ResultRow, { label: "Total Tax (installment over " + res.years + " yrs)", value: fmt(res.totalTax) }),
      React.createElement(ResultRow, { label: "Tax If Lump Sum Sale", value: fmt(res.lumpSumTax) }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings", value: fmt(res.savings), bold: true, color: res.savings > 0 ? "#15803d" : "#dc2626" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Sale Price ($)"), React.createElement("input", { name: "sale_price", type: "number", placeholder: "500000", value: f.sale_price, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Adjusted Basis ($)"), React.createElement("input", { name: "basis", type: "number", placeholder: "100000", value: f.basis, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Down Payment ($)"), React.createElement("input", { name: "down_pmt", type: "number", placeholder: "100000", value: f.down_pmt, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Installment Period (Years)"), React.createElement("input", { name: "years", type: "number", placeholder: "5", value: f.years, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Capital Gains Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "20", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Compare vs. Lump Sum")
    )
  );
}

// ── Strategy: QOZ ────────────────────────────────────────────────────────────
function QOZPlanning() {
  const reset = () => {};
  return React.createElement(StrategyShell, {
    title: "Qualified Opportunity Zones (QOZ)", irc: "IRC \u00a71400Z-1 / \u00a71400Z-2", onReset: reset,
    who: "Taxpayers with capital gains from the sale of any asset (stock, real estate, business). Gains must be invested within 180 days of the sale.",
    steps: [
      "Realize a capital gain (from any source: stock sale, real estate, business sale). You have 180 days from the date of sale to invest in a Qualified Opportunity Fund (QOF).",
      "Invest the gain amount (not the full proceeds) into a QOF \u2014 a partnership or corporation that invests at least 90% of its assets in a Qualified Opportunity Zone.",
      "Original gain deferral: the invested gain is deferred until the earlier of December 31, 2026 (when deferred gains are now recognized) or the date you sell the QOF interest.",
      "10-year exclusion: if you hold your QOF investment for at least 10 years, any appreciation on the QOF investment itself is permanently excluded from taxable income. You pay zero capital gains tax on the QOF\u2019s growth.",
      "Elect deferral on Form 8949 and report QOF investments on Form 8997 (Initial and Annual Statement of QOF Investments).",
      "Due to the 2026 recognition deadline, new QOZ investments are primarily valuable for the 10-year appreciation exclusion rather than the original deferral benefit."
    ],
    mistakes: [
      "Missing the 180-day investment window \u2014 there are specific rules for partnership gains that may extend the window. Know your deadline.",
      "Investing the full sale proceeds instead of just the gain amount \u2014 only the gain portion receives QOZ treatment.",
      "Not vetting the QOF \u2014 there are no government guarantees. Conduct full due diligence on the fund sponsor, underlying assets, and projected returns.",
      "Selling before the 10-year mark \u2014 the appreciation exclusion requires a minimum 10-year hold. Early sale eliminates the primary benefit."
    ],
    savings: React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 13, color: "#444", lineHeight: 1.7 } },
        "Primary benefit as of 2025: invest capital gains in a QOF and hold for 10+ years. Any appreciation on the QOF investment itself is permanently tax-free. On a $500,000 investment that grows to $1,200,000 over 10 years, the $700,000 gain is excluded from tax entirely \u2014 saving up to $140,000 in federal capital gains tax."
      )
    )
  }, null);
}

// ── Strategy: Charitable Giving ───────────────────────────────────────────────
function CharitableGiving() {
  const [f, setF] = useState({ annual_giving: "", ira_balance: "", stock_gain: "", stock_basis: "", tax_rate: "", age: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ annual_giving: "", ira_balance: "", stock_gain: "", stock_basis: "", tax_rate: "", age: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const giving = n(f.annual_giving);
    const taxRate = n(f.tax_rate) / 100 || 0.25;
    const age = n(f.age);
    const iraBalance = n(f.ira_balance);
    const stockFMV = n(f.stock_gain);
    const stockBasis = n(f.stock_basis);
    const stockGain = Math.max(0, stockFMV - stockBasis);
    // DAF: bunch 5 years of giving
    const bunchedGiving = giving * 5;
    const bunchingSavings = giving * 4 * taxRate; // approximate additional deduction
    // QCD: avoid tax on IRA distribution
    const qcdAmount = Math.min(age >= 70.5 ? iraBalance * 0.05 : 0, 105000);
    const qcdSavings = qcdAmount * taxRate;
    // Appreciated stock: avoid capital gains
    const stockSavings = stockGain * 0.20; // long-term cap gains rate
    setRes({ giving, bunchedGiving, bunchingSavings, qcdAmount, qcdSavings, stockFMV, stockGain, stockSavings, age });
  };
  return React.createElement(StrategyShell, {
    title: "Charitable Giving Strategies", irc: "IRC \u00a7170 (DAF/Stock) / \u00a7408(d)(8) (QCD)", onReset: reset,
    who: "Anyone who gives to charity. Advanced strategies are most beneficial for taxpayers who take the standard deduction (DAF/bunching), IRA owners age 70\u00bd+ (QCD), and holders of appreciated stock.",
    steps: [
      "Donor-Advised Fund (DAF): Contribute a lump sum (cash or appreciated assets) to a DAF in a high-income year and receive the full deduction now. Then distribute grants to charities over time. Contributions are immediately deductible. Effectively decouples the tax deduction from the charitable distribution.",
      "Bunching: Instead of giving $5,000/year for 5 years (never exceeding the standard deduction), contribute $25,000 to a DAF in one year, itemize that year, then take the standard deduction in years 2-5. The math often results in more total deductions.",
      "Qualified Charitable Distribution (QCD): If you are 70\u00bd or older, direct up to $105,000/year from your IRA directly to a charity. The distribution satisfies your RMD but is excluded from your taxable income entirely \u2014 better than deducting it.",
      "Donating appreciated stock: Instead of selling appreciated stock and donating cash, donate the stock directly to a charity or DAF. You deduct the full fair market value AND avoid the capital gains tax on the appreciation. The charity sells it tax-free.",
      "For appreciated stock donations to a DAF: the charity holds the stock, sells it tax-free, and you grant from the DAF. Maximum benefit: full FMV deduction + zero capital gains tax."
    ],
    mistakes: [
      "Donating cash when you hold appreciated stock \u2014 always donate appreciated assets first. Cash last.",
      "Not using a QCD when you are 70\u00bd+ and taking RMDs \u2014 a QCD is almost always better than taking the distribution and deducting the donation separately.",
      "Contributing short-term gain property to a DAF \u2014 your deduction is limited to your basis, not FMV, for property held less than one year.",
      "Forgetting the AGI limitation: cash donations to public charities are deductible up to 60% of AGI. Appreciated property is capped at 30% of AGI."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Annual Giving", value: fmt(res.giving) }),
      React.createElement(ResultRow, { label: "Bunched 5-Year Contribution (DAF)", value: fmt(res.bunchedGiving) }),
      res.qcdAmount > 0 && React.createElement(ResultRow, { label: "QCD from IRA (age 70\u00bd+)", value: fmt(res.qcdAmount) }),
      res.qcdSavings > 0 && React.createElement(ResultRow, { label: "Tax Savings via QCD", value: fmt(res.qcdSavings), bold: true, color: "#15803d" }),
      res.stockGain > 0 && React.createElement(ResultRow, { label: "Capital Gains Avoided (stock donation)", value: fmt(res.stockSavings), bold: true, color: "#15803d" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Annual Charitable Giving ($)"), React.createElement("input", { name: "annual_giving", type: "number", placeholder: "5000", value: f.annual_giving, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Age"), React.createElement("input", { name: "age", type: "number", placeholder: "72", value: f.age, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "IRA Balance ($)"), React.createElement("input", { name: "ira_balance", type: "number", placeholder: "500000", value: f.ira_balance, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Appreciated Stock FMV ($)"), React.createElement("input", { name: "stock_gain", type: "number", placeholder: "50000", value: f.stock_gain, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Stock Cost Basis ($)"), React.createElement("input", { name: "stock_basis", type: "number", placeholder: "10000", value: f.stock_basis, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "28", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Charitable Strategies")
    )
  );
}

// ── Strategy: 529 Advanced ───────────────────────────────────────────────────
function Plan529() {
  const [f, setF] = useState({ annual_contrib: "", years: "", state_deduction: "", state_rate: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ annual_contrib: "", years: "", state_deduction: "", state_rate: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v||"").replace(/[^0-9.]/g,""))||0;
  const calc = () => {
    const annual = n(f.annual_contrib);
    const years = Math.max(1, n(f.years) || 18);
    const stateDeduction = n(f.state_deduction);
    const stateRate = n(f.state_rate) / 100 || 0.05;
    const fedRate = n(f.tax_rate) / 100 || 0.25;
    const total = annual * years;
    const superfundAmt = annual * 5;
    const superfundGiftTaxExclusion = 18000 * 5; // 2025: $18K annual exclusion x 5
    const stateSavingsPerYear = Math.min(annual, stateDeduction) * stateRate;
    const totalStateSavings = stateSavingsPerYear * years;
    const growthAssumed = total * 0.60; // assume ~60% growth over 18 years at 6%
    const taxSavedOnGrowth = growthAssumed * fedRate;
    const rothRollover = 35000; // SECURE 2.0 max lifetime Roth rollover
    setRes({ annual, years, total, superfundAmt, superfundGiftTaxExclusion, stateSavingsPerYear, totalStateSavings, growthAssumed, taxSavedOnGrowth, rothRollover });
  };
  return React.createElement(StrategyShell, {
    title: "529 Plans \u2014 Advanced Strategies", irc: "IRC \u00a7529 / SECURE Act 2.0", onReset: reset,
    who: "Parents, grandparents, and other family members saving for education expenses. Also now applicable for unused funds via Roth IRA rollover (SECURE Act 2.0).",
    steps: [
      "State tax deduction: Most states offer a state income tax deduction or credit for 529 contributions. Some states allow deductions for any state\u2019s plan; others only for the in-state plan. Maximize this first.",
      "Superfunding: Contribute up to 5 years\u2019 worth of the annual gift tax exclusion ($18,000 in 2025) at once per beneficiary = $90,000 per contributor. No gift tax, but no additional gifts to that beneficiary for 5 years. File Form 709 to elect the 5-year spread.",
      "Grandparent-owned 529s: Under updated FAFSA rules (2024+), grandparent 529 distributions no longer count as student income on FAFSA. Grandparents can now use 529 plans without hurting financial aid eligibility.",
      "K-12 expenses: Up to $10,000/year per beneficiary can be withdrawn tax-free for K-12 tuition at private schools.",
      "Roth IRA rollover (SECURE Act 2.0): Starting in 2024, unused 529 funds can be rolled over to a Roth IRA for the beneficiary, up to $35,000 lifetime, subject to annual Roth contribution limits. The account must be at least 15 years old.",
      "Change the beneficiary: If one child doesn\u2019t use the funds, roll them to another family member\u2019s 529 tax-free. This includes siblings, cousins, spouses, and even yourself."
    ],
    mistakes: [
      "Using non-qualified distributions \u2014 earnings portion is taxable as ordinary income plus a 10% penalty. Always use funds for qualified education expenses.",
      "Over-contributing beyond what the beneficiary will need without a Roth rollover plan \u2014 excess funds that can\u2019t be rolled to Roth or transferred to another beneficiary become costly to withdraw.",
      "Ignoring state deductions \u2014 some taxpayers contribute to out-of-state plans for better investment options while forfeiting a valuable state deduction. Run the numbers both ways.",
      "Forgetting to file Form 709 for superfunding elections \u2014 without it, the full $90,000 may be treated as a taxable gift in year one."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Annual Contribution", value: fmt(res.annual) }),
      React.createElement(ResultRow, { label: "Total Contributions (" + res.years + " yrs)", value: fmt(res.total) }),
      React.createElement(ResultRow, { label: "State Tax Savings per Year", value: fmt(res.stateSavingsPerYear) }),
      React.createElement(ResultRow, { label: "Total State Tax Savings", value: fmt(res.totalStateSavings), bold: true }),
      React.createElement(ResultRow, { label: "Superfunding Option (5-yr front-load)", value: fmt(res.superfundAmt) }),
      React.createElement(ResultRow, { label: "Estimated Tax-Free Growth", value: fmt(res.growthAssumed) }),
      React.createElement(ResultRow, { label: "Tax Saved on Growth", value: fmt(res.taxSavedOnGrowth), bold: true, color: "#15803d" }),
      React.createElement(ResultRow, { label: "Roth IRA Rollover Option (SECURE 2.0)", value: fmt(res.rothRollover) + " lifetime max" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Annual Contribution ($)"), React.createElement("input", { name: "annual_contrib", type: "number", placeholder: "10000", value: f.annual_contrib, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Years to Contribute"), React.createElement("input", { name: "years", type: "number", placeholder: "18", value: f.years, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "State Deduction Limit ($)"), React.createElement("input", { name: "state_deduction", type: "number", placeholder: "5000", value: f.state_deduction, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "State Tax Rate (%)"), React.createElement("input", { name: "state_rate", type: "number", placeholder: "6", value: f.state_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Federal Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "25", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate 529 Benefits")
    )
  );
}

// ── Tab 7 Nav Data ────────────────────────────────────────────────────────────
const BUSINESS_CATEGORIES = [
  { id: "structure", label: "\uD83C\uDFE2 Business Structure" },
  { id: "retirement_adv", label: "\uD83C\uDFE6 Retirement (Advanced)" },
  { id: "other_adv", label: "\u26A1 Other Advanced" },
];

const BUSINESS_STRATEGIES = {
  structure: [
    { id: "sole_vs_scorp", label: "Sole Prop vs. S-Corp" },
    { id: "scorp_vs_ccorp", label: "S-Corp vs. C-Corp" },
    { id: "salary_dist", label: "S-Corp Salary / Distribution Split" },
  ],
  retirement_adv: [
    { id: "plan_compare", label: "Plan Comparison Table" },
    { id: "backdoor_roth", label: "Backdoor Roth IRA" },
    { id: "mega_backdoor", label: "Mega Backdoor Roth" },
    { id: "defined_benefit", label: "Defined Benefit / Cash Balance" },
  ],
  other_adv: [
    { id: "rep_status", label: "Real Estate Professional Status" },
    { id: "nqdc", label: "NQDC / Deferred Compensation" },
    { id: "qoz_advanced", label: "QOZ Advanced (Fund & Basis)" },
  ],
};

// ── Tab 7 Strategy: Sole Prop vs. S-Corp ─────────────────────────────────────
function SolePropVsScorp() {
  const [f, setF] = useState({ net_profit: "", tax_rate: "", reasonable_comp: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ net_profit: "", tax_rate: "", reasonable_comp: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const profit = n(f.net_profit);
    const taxRate = n(f.tax_rate) / 100 || 0.25;
    const salary = n(f.reasonable_comp) || profit * 0.50;
    const dist = Math.max(0, profit - salary);
    // Sole prop SE tax: 92.35% of net profit x 15.3% (up to SS wage base) + 2.9% above
    const sePropBase = profit * 0.9235;
    const seTaxSoleProp = Math.min(sePropBase, 176100) * 0.153 + Math.max(0, sePropBase - 176100) * 0.029;
    const seDeductionSoleProp = seTaxSoleProp / 2;
    const solePropTaxableIncome = profit - seDeductionSoleProp;
    const solePropIncomeTax = solePropTaxableIncome * taxRate;
    const solePropTotal = seTaxSoleProp + solePropIncomeTax;
    // S-Corp payroll tax: 15.3% on salary only (employer + employee)
    const scorpPayrollTax = Math.min(salary, 176100) * 0.153 + Math.max(0, salary - 176100) * 0.029;
    const scorpDeduction = scorpPayrollTax / 2;
    const scorpTaxableIncome = profit - scorpDeduction;
    const scorpIncomeTax = scorpTaxableIncome * taxRate;
    // S-Corp overhead: ~$2,000/yr for payroll processing, bookkeeping, state fees
    const scorpOverhead = 2000;
    const scorpTotal = scorpPayrollTax + scorpIncomeTax + scorpOverhead;
    const savings = solePropTotal - scorpTotal;
    const breakeven = scorpOverhead / (0.153 * 0.9235); // approx breakeven profit
    setRes({ profit, salary, dist, seTaxSoleProp, solePropTotal, scorpPayrollTax, scorpTotal, savings, scorpOverhead, breakeven, taxRate });
  };
  return React.createElement(StrategyShell, {
    title: "Sole Proprietor vs. S-Corporation", irc: "IRC \u00a71361\u20131363 \u2014 S-Corp Election (Form 2553)", onReset: reset,
    who: "Self-employed individuals with net profit consistently above ~$40,000/year who want to reduce self-employment tax. Not worth the overhead for lower profit levels.",
    steps: [
      "Determine if your net profit clears the breakeven threshold (~$40,000\u2013$50,000 after expenses). Below that, S-Corp overhead typically exceeds the SE tax savings.",
      "Elect S-Corp status by filing Form 2553 with the IRS. Must be filed by March 15 for the election to apply to the current tax year (or within 75 days of forming the entity).",
      "Put yourself on payroll and pay a 'reasonable compensation' salary \u2014 the IRS defines this as what you would pay a third party to perform the same services. Typically 40\u201360% of net profit for service businesses.",
      "Pay payroll taxes (Social Security + Medicare) on the salary only. The remaining profit passes through as an S-Corp distribution, which is NOT subject to SE/payroll tax.",
      "File quarterly payroll tax deposits (Form 941) and an annual W-2. S-Corps must also file Form 1120-S annually.",
      "Budget for S-Corp overhead: payroll service (~$50\u2013100/mo), state registration fees, and additional accounting time for the 1120-S. Factor this into your savings calculation."
    ],
    mistakes: [
      "Setting an unreasonably low salary to maximize distributions \u2014 this is one of the IRS's top S-Corp audit issues. Salary must be reasonable for the services performed.",
      "Missing the Form 2553 deadline \u2014 late elections may be accepted with reasonable cause, but it adds complexity and cost.",
      "Ignoring state-level requirements \u2014 some states (California, New York) impose additional S-Corp taxes or fees that reduce the net savings.",
      "Converting before you have consistent profitability \u2014 S-Corp costs are largely fixed. Volatile income makes the savings unpredictable."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Net Business Profit", value: fmt(res.profit) }),
      React.createElement(ResultRow, { label: "S-Corp Salary (Reasonable Comp)", value: fmt(res.salary) }),
      React.createElement(ResultRow, { label: "S-Corp Distribution (no SE tax)", value: fmt(res.dist) }),
      React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e4dc" } }),
      React.createElement(ResultRow, { label: "Sole Prop SE Tax", value: fmt(res.seTaxSoleProp) }),
      React.createElement(ResultRow, { label: "Sole Prop Total Tax Burden", value: fmt(res.solePropTotal) }),
      React.createElement(ResultRow, { label: "S-Corp Payroll Tax (on salary only)", value: fmt(res.scorpPayrollTax) }),
      React.createElement(ResultRow, { label: "S-Corp Overhead (est.)", value: fmt(res.scorpOverhead) }),
      React.createElement(ResultRow, { label: "S-Corp Total Tax + Overhead", value: fmt(res.scorpTotal) }),
      React.createElement(ResultRow, { label: "Estimated Annual Savings", value: fmt(res.savings), bold: true, color: res.savings > 0 ? "#15803d" : "#dc2626" }),
      React.createElement(InfoBox, { type: res.savings > 0 ? "green" : "warn" },
        res.savings > 0
          ? "S-Corp election saves approximately " + fmt(res.savings) + "/year at this profit level. Approximate breakeven profit: " + fmt(res.breakeven) + "."
          : "At this profit level, S-Corp overhead exceeds SE tax savings. Re-evaluate when profit exceeds " + fmt(res.breakeven) + "."
      )
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Net Business Profit ($)"), React.createElement("input", { name: "net_profit", type: "number", placeholder: "120000", value: f.net_profit, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "25", value: f.tax_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Reasonable Salary ($, optional)"), React.createElement("input", { name: "reasonable_comp", type: "number", placeholder: "Leave blank for 50% default", value: f.reasonable_comp, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Compare Sole Prop vs. S-Corp")
    )
  );
}

// ── Tab 7 Strategy: S-Corp vs. C-Corp ────────────────────────────────────────
function ScorpVsCcorp() {
  const [f, setF] = useState({ net_profit: "", personal_rate: "", retained_earnings: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ net_profit: "", personal_rate: "", retained_earnings: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const profit = n(f.net_profit);
    const personalRate = n(f.personal_rate) / 100 || 0.32;
    const retained = n(f.retained_earnings) || profit;
    // S-Corp: pass-through, taxed at personal rate
    const scorpTax = profit * personalRate;
    // C-Corp: flat 21% corporate rate
    const ccorpTax = profit * 0.21;
    // If C-Corp distributes as dividends later: qualified dividend rate ~15-20%
    const dividendRate = personalRate > 0.32 ? 0.20 : 0.15;
    const doubleTaxOnDist = retained * dividendRate;
    const ccorpEffectiveOnDist = ccorpTax + doubleTaxOnDist;
    const retainedAdvantage = scorpTax - ccorpTax; // short-term C-Corp advantage
    setRes({ profit, scorpTax, ccorpTax, doubleTaxOnDist, ccorpEffectiveOnDist, retainedAdvantage, personalRate, retained, dividendRate });
  };
  return React.createElement(StrategyShell, {
    title: "S-Corp vs. C-Corp", irc: "IRC \u00a711 (C-Corp 21% rate) vs. IRC \u00a71361 (S-Corp pass-through)", onReset: reset,
    who: "Business owners considering incorporation structure, especially high earners above the 32% bracket, or businesses planning to retain significant profits for reinvestment rather than distribute them.",
    steps: [
      "Understand the core difference: S-Corps are pass-through entities \u2014 profits flow directly to your personal return and are taxed at your personal rate. C-Corps pay a flat 21% corporate tax, and distributions to shareholders are taxed again as dividends ('double taxation').",
      "C-Corp advantage scenario: if your personal tax rate exceeds 21% and you plan to retain most profits inside the business for reinvestment (not distribute them), the C-Corp's 21% flat rate produces lower immediate tax.",
      "C-Corp disadvantage: when you eventually distribute retained earnings as dividends, you pay qualified dividend rates (0%, 15%, or 20%) on top of the 21% already paid. For a 37% bracket taxpayer: 21% + 20% = effective 36.8% \u2014 nearly equal to pass-through.",
      "S-Corp advantage: no double taxation. Profits are taxed once at your personal rate. Better for businesses that distribute most profits annually.",
      "Special C-Corp strategies: Qualified Small Business Stock (QSBS \u2014 IRC \u00a71202) allows up to 100% exclusion of capital gains on sale of C-Corp stock held 5+ years, with up to $10M excluded. This is a major reason venture-backed startups use C-Corps.",
      "Consult a CPA before converting \u2014 switching from C-Corp to S-Corp triggers a 5-year built-in gains tax period. The decision is difficult to reverse."
    ],
    mistakes: [
      "Assuming C-Corp is always better for high earners \u2014 double taxation often erases the corporate rate advantage unless profits are retained long-term.",
      "Ignoring state taxes \u2014 some states don't recognize S-Corp elections or impose additional taxes on S-Corps (e.g., California's 1.5% S-Corp tax).",
      "Overlooking QSBS planning \u2014 high-growth businesses that could qualify for \u00a71202 exclusion should structure as C-Corps from inception.",
      "Converting from C to S without a built-in gains plan \u2014 assets that appreciated while in C-Corp status are subject to the BIG tax if sold within 5 years of the S-Corp election."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Net Business Profit", value: fmt(res.profit) }),
      React.createElement(ResultRow, { label: "S-Corp Tax (pass-through at " + (res.personalRate * 100).toFixed(0) + "%)", value: fmt(res.scorpTax) }),
      React.createElement(ResultRow, { label: "C-Corp Tax (flat 21%)", value: fmt(res.ccorpTax) }),
      React.createElement(ResultRow, { label: "Short-Term C-Corp Advantage", value: fmt(res.retainedAdvantage), bold: true, color: res.retainedAdvantage > 0 ? "#15803d" : "#dc2626" }),
      React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e4dc" } }),
      React.createElement(ResultRow, { label: "If C-Corp Distributes " + fmt(res.retained) + " as Dividends", value: "" }),
      React.createElement(ResultRow, { label: "Dividend Tax (" + (res.dividendRate * 100).toFixed(0) + "% qualified rate)", value: fmt(res.doubleTaxOnDist), indent: true }),
      React.createElement(ResultRow, { label: "C-Corp Effective Total Tax on Distribution", value: fmt(res.ccorpEffectiveOnDist), bold: true }),
      React.createElement(InfoBox, { type: "info" }, "C-Corp saves " + fmt(res.retainedAdvantage) + " short-term, but double taxation applies when distributing. Best for businesses retaining profits long-term or planning a QSBS exit.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Net Business Profit ($)"), React.createElement("input", { name: "net_profit", type: "number", placeholder: "200000", value: f.net_profit, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Personal Tax Rate (%)"), React.createElement("input", { name: "personal_rate", type: "number", placeholder: "32", value: f.personal_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount to Eventually Distribute ($)"), React.createElement("input", { name: "retained_earnings", type: "number", placeholder: "Same as profit", value: f.retained_earnings, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Compare S-Corp vs. C-Corp")
    )
  );
}

// ── Tab 7 Strategy: S-Corp Salary/Distribution Split ─────────────────────────
function SalaryDistSplit() {
  const [f, setF] = useState({ net_profit: "", salary_pct: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ net_profit: "", salary_pct: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const profit = n(f.net_profit);
    const salaryPct = Math.min(100, Math.max(0, n(f.salary_pct) || 50)) / 100;
    const taxRate = n(f.tax_rate) / 100 || 0.25;
    const salary = profit * salaryPct;
    const dist = profit - salary;
    // Payroll tax on salary
    const employerSS = Math.min(salary, 176100) * 0.062;
    const employerMed = salary * 0.0145;
    const employeeSS = Math.min(salary, 176100) * 0.062;
    const employeeMed = salary * 0.0145;
    const totalPayroll = employerSS + employerMed + employeeSS + employeeMed;
    // Income tax
    const incomeTax = profit * taxRate;
    const totalTax = totalPayroll + incomeTax;
    // Compare: 100% salary (max payroll)
    const fullSalaryPayroll = Math.min(profit, 176100) * 0.124 + profit * 0.029;
    const fullSalaryTotal = fullSalaryPayroll + incomeTax;
    const savings = fullSalaryTotal - totalTax;
    setRes({ profit, salary, dist, totalPayroll, incomeTax, totalTax, fullSalaryPayroll, fullSalaryTotal, savings, salaryPct });
  };
  return React.createElement(StrategyShell, {
    title: "S-Corp Salary / Distribution Optimizer", irc: "IRC \u00a73121 \u2014 Reasonable Compensation Requirement", onReset: reset,
    who: "S-Corp owner-employees who want to find the optimal balance between W-2 salary (subject to payroll tax) and shareholder distributions (not subject to payroll tax), while satisfying the IRS reasonable compensation requirement.",
    steps: [
      "Establish your total net S-Corp income for the year before owner compensation.",
      "Determine 'reasonable compensation' for your role \u2014 use BLS wage data, industry surveys (MGMA, RCReports), or what you'd pay a replacement employee. Document this analysis in writing.",
      "Pay yourself at least that reasonable salary as W-2 wages. This amount is subject to payroll taxes (FICA) on both the employee and employer side.",
      "Any remaining S-Corp profit distributed to you as a shareholder distribution is NOT subject to payroll tax \u2014 saving 15.3% on that portion (subject to SS wage base).",
      "For income above the Social Security wage base ($176,100 for 2025), the savings is only the 2.9% Medicare rate, since SS no longer applies.",
      "Rerun this analysis annually as your income changes. The optimal split point shifts based on your total income and whether you're above the SS wage base."
    ],
    mistakes: [
      "Zero or token salary \u2014 the IRS specifically targets S-Corp owners who pay themselves $0 or an unreasonably low salary. Penalties include reclassification of distributions as wages plus interest and penalties.",
      "Using a fixed percentage without justification \u2014 the IRS doesn't care about 60/40 ratios. They care whether the salary amount is reasonable for the services performed.",
      "Ignoring the employer payroll tax deduction \u2014 the employer half of FICA is deductible as a business expense, which offsets some of the payroll tax cost.",
      "Not adjusting for the additional 0.9% Medicare surtax \u2014 wages above $200,000 ($250,000 MFJ) trigger additional Medicare tax on the wage portion."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "S-Corp Net Profit", value: fmt(res.profit) }),
      React.createElement(ResultRow, { label: "W-2 Salary (" + (res.salaryPct * 100).toFixed(0) + "% of profit)", value: fmt(res.salary) }),
      React.createElement(ResultRow, { label: "Shareholder Distribution", value: fmt(res.dist) }),
      React.createElement(ResultRow, { label: "Total Payroll Tax (both sides)", value: fmt(res.totalPayroll) }),
      React.createElement(ResultRow, { label: "Income Tax (est.)", value: fmt(res.incomeTax) }),
      React.createElement(ResultRow, { label: "Total Tax at This Split", value: fmt(res.totalTax), bold: true }),
      React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e4dc" } }),
      React.createElement(ResultRow, { label: "Total Tax if 100% Salary (no S-Corp benefit)", value: fmt(res.fullSalaryTotal) }),
      React.createElement(ResultRow, { label: "S-Corp Payroll Tax Savings vs. All-Salary", value: fmt(res.savings), bold: true, color: res.savings > 0 ? "#15803d" : "#dc2626" })
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "S-Corp Net Profit ($)"), React.createElement("input", { name: "net_profit", type: "number", placeholder: "150000", value: f.net_profit, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Salary as % of Profit"), React.createElement("input", { name: "salary_pct", type: "number", placeholder: "50", value: f.salary_pct, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Income Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "25", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Optimize Salary/Distribution Split")
    )
  );
}

// ── Tab 7 Strategy: Retirement Plan Comparison ───────────────────────────────
function PlanCompare() {
  const reset = () => {};
  const plans = [
    { name: "SEP-IRA", limit: "$69,000 or 25% of W-2 / 20% of SE net (2025)", deadline: "Tax return due date + extensions", pros: "Simple, no annual filings, can open retroactively", cons: "No employee salary deferrals; all contributions are employer-funded", best: "Sole proprietors and small business owners who want simplicity" },
    { name: "Solo 401(k)", limit: "$69,000 total; $23,000 employee deferral + 25% employer match; $76,500 if age 50+ with catch-up", deadline: "Must establish by Dec 31 of the tax year; fund by return due date", pros: "Highest contribution potential at lower income levels; allows loans; Roth option available", cons: "Must file Form 5500-EZ when assets exceed $250,000; more admin", best: "Self-employed with no employees (other than spouse); high earners who want to maximize contributions" },
    { name: "SIMPLE IRA", limit: "$16,000 employee deferral + $3,500 catch-up if 50+ (2025); employer must match 3% or contribute 2% non-elective", deadline: "Must establish by Oct 1 of the year to apply", pros: "Easy to administer; lower cost than 401(k)", cons: "Lower limits; mandatory employer contributions; 25% early withdrawal penalty in first 2 years", best: "Small employers with up to 100 employees who want a low-cost plan" },
    { name: "Defined Benefit / Cash Balance", limit: "$275,000/yr benefit accrual limit (2025); actual contribution varies by age/income \u2014 can exceed $100,000\u2013$300,000/yr for older high earners", deadline: "Establish and fund by tax return due date + extensions", pros: "Massive deductions for high earners 50+; guaranteed benefit structure", cons: "Actuarially complex; annual 5500 filing required; minimum funding obligations; must contribute even in bad years", best: "High-income self-employed individuals age 50+ with consistent income above $250,000 who want maximum deductions" },
  ];
  return React.createElement(StrategyShell, {
    title: "Retirement Plan Comparison (2025)", irc: "IRC \u00a7401, \u00a7408, \u00a7408(k), \u00a7408(p)", onReset: reset,
    who: "Self-employed individuals and small business owners choosing between retirement plan types to maximize tax-deferred contributions.",
    steps: [
      "Start with the Solo 401(k) if you are self-employed with no full-time employees \u2014 it offers the highest contribution limits at lower income levels due to the employee deferral component.",
      "Choose SEP-IRA if simplicity is the priority and you don't need the employee deferral feature. Best for sole proprietors who open the account late in the year.",
      "Use SIMPLE IRA only if you have employees and want a low-cost, easy-to-administer plan with modest contribution limits.",
      "Add a Defined Benefit or Cash Balance Plan on top of a Solo 401(k) if you are 50+ with income above $250,000 and want to shelter $150,000\u2013$300,000+ per year.",
      "For Solo 401(k): maximize the employee deferral ($23,000 + $7,500 catch-up if 50+) before calculating the employer profit-sharing contribution (25% of W-2 or 20% of SE net).",
      "Roth Solo 401(k): if your income will be lower in future years or you expect higher tax rates, designate contributions as Roth for tax-free growth."
    ],
    mistakes: [
      "Missing the Solo 401(k) establishment deadline of December 31 \u2014 unlike a SEP-IRA, you cannot open a Solo 401(k) retroactively after year-end.",
      "Forgetting Form 5500-EZ for Solo 401(k) plans over $250,000 in assets \u2014 penalties are $250/day, up to $150,000.",
      "Choosing SEP-IRA when you could contribute more with a Solo 401(k) at the same income level \u2014 especially at lower income levels, the employee deferral makes Solo 401(k) far superior.",
      "Assuming Defined Benefit plans are too complex \u2014 a qualified actuary and third-party administrator can handle the filings, and the deduction can be transformative for high earners."
    ],
    savings: React.createElement("div", null,
      plans.map((p, i) => React.createElement("div", { key: i, style: { marginBottom: 16, padding: "14px", background: "#f8f6f1", borderRadius: 10, border: "1px solid #e8e4dc" } },
        React.createElement("div", { style: { fontWeight: "bold", fontSize: 14, color: "#1a2d5a", marginBottom: 6 } }, p.name),
        React.createElement(ResultRow, { label: "2025 Contribution Limit", value: p.limit }),
        React.createElement(ResultRow, { label: "Establish By", value: p.deadline }),
        React.createElement(ResultRow, { label: "Pros", value: p.pros }),
        React.createElement(ResultRow, { label: "Cons", value: p.cons }),
        React.createElement(ResultRow, { label: "Best For", value: p.best })
      ))
    )
  }, null);
}

// ── Tab 7 Strategy: Backdoor Roth IRA ────────────────────────────────────────
function BackdoorRoth() {
  const [f, setF] = useState({ trad_ira_balance: "", contribution: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ trad_ira_balance: "", contribution: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const tradBalance = n(f.trad_ira_balance);
    const contrib = n(f.contribution) || 7000;
    const taxRate = n(f.tax_rate) / 100 || 0.32;
    const totalIra = tradBalance + contrib;
    // Pro-rata rule: taxable % = pre-tax IRA balance / total IRA balance after contribution
    const proRataTaxable = totalIra > 0 ? tradBalance / totalIra : 0;
    const taxableOnConversion = contrib * proRataTaxable;
    const taxOnConversion = taxableOnConversion * taxRate;
    const cleanConversion = tradBalance === 0;
    setRes({ tradBalance, contrib, proRataTaxable, taxableOnConversion, taxOnConversion, cleanConversion, taxRate });
  };
  return React.createElement(StrategyShell, {
    title: "Backdoor Roth IRA", irc: "IRC \u00a7408A \u2014 Roth IRA Conversion (Form 8606)", onReset: reset,
    who: "High earners above the Roth IRA income limits: $161,000 (single) / $240,000 (MFJ) in 2025. Allows indirect Roth contributions regardless of income.",
    steps: [
      "Make a non-deductible Traditional IRA contribution (up to $7,000; $8,000 if age 50+). Since your income is too high for a deductible contribution, this goes in after-tax.",
      "Wait a brief period (days to weeks \u2014 there is no mandatory waiting period, but some advisors recommend allowing the contribution to settle).",
      "Convert the Traditional IRA to a Roth IRA. Since the contribution was non-deductible (after-tax), ideally most of the conversion is tax-free.",
      "File Form 8606 with your tax return to track the non-deductible basis. This is critical \u2014 without it, the IRS may treat the entire conversion as taxable.",
      "CRITICAL \u2014 the Pro-Rata Rule: if you have any pre-tax Traditional IRA balances (from deductible contributions or rollovers), the IRS blends all your IRA money together. The taxable portion of the conversion equals: pre-tax IRA balance \xf7 total IRA balance. This can eliminate most of the tax benefit.",
      "To avoid the pro-rata problem: roll pre-tax IRA funds into your current employer's 401(k) before doing the backdoor Roth. A 401(k) is excluded from the pro-rata calculation."
    ],
    mistakes: [
      "Having existing pre-tax IRA funds without understanding the pro-rata rule \u2014 this is the #1 mistake and can result in significant unexpected taxes.",
      "Not filing Form 8606 every year you make a non-deductible contribution \u2014 without this documentation, years-old basis can be lost.",
      "Waiting too long after contributing before converting \u2014 if the IRA gains value before conversion, the gain is taxable.",
      "Doing a backdoor Roth in a year you rolled over a 401(k) to an IRA \u2014 the rollover amount counts in the pro-rata calculation for that year."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Non-Deductible IRA Contribution", value: fmt(res.contrib) }),
      React.createElement(ResultRow, { label: "Existing Pre-Tax IRA Balance", value: fmt(res.tradBalance) }),
      React.createElement(ResultRow, { label: "Pro-Rata Taxable Percentage", value: (res.proRataTaxable * 100).toFixed(1) + "%" }),
      React.createElement(ResultRow, { label: "Taxable Amount on Conversion", value: fmt(res.taxableOnConversion) }),
      React.createElement(ResultRow, { label: "Tax Owed on Conversion", value: fmt(res.taxOnConversion), bold: true, color: res.taxOnConversion > 0 ? "#dc2626" : "#15803d" }),
      res.cleanConversion
        ? React.createElement(InfoBox, { type: "green" }, "Clean conversion \u2014 no pre-tax IRA balance means zero pro-rata tax. The full " + fmt(res.contrib) + " converts to Roth tax-free.")
        : React.createElement(InfoBox, { type: "warn" }, "Pro-rata rule applies. Consider rolling your pre-tax IRA funds into a 401(k) before doing the backdoor Roth to eliminate the tax on conversion.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Pro-Rata Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Existing Pre-Tax IRA Balance ($)"), React.createElement("input", { name: "trad_ira_balance", type: "number", placeholder: "0 for clean conversion", value: f.trad_ira_balance, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "New Non-Deductible Contribution ($)"), React.createElement("input", { name: "contribution", type: "number", placeholder: "7000", value: f.contribution, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "32", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Pro-Rata Impact")
    )
  );
}

// ── Tab 7 Strategy: Mega Backdoor Roth ───────────────────────────────────────
function MegaBackdoorRoth() {
  const [f, setF] = useState({ net_se: "", age: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ net_se: "", age: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const netSe = n(f.net_se);
    const age = n(f.age) || 40;
    const catchUp = age >= 50;
    const totalLimit = catchUp ? 76500 : 69000;
    const employeeDeferral = catchUp ? 30500 : 23000;
    // Employer profit sharing: 25% of W-2 or 20% of SE net (approx)
    const employerMatch = Math.min(netSe * 0.20, totalLimit - employeeDeferral);
    const afterTaxCapacity = Math.max(0, totalLimit - employeeDeferral - employerMatch);
    setRes({ totalLimit, employeeDeferral, employerMatch, afterTaxCapacity, catchUp, age });
  };
  return React.createElement(StrategyShell, {
    title: "Mega Backdoor Roth", irc: "IRC \u00a7402(g), \u00a7415 \u2014 After-Tax Solo 401(k) Contributions", onReset: reset,
    who: "Self-employed individuals with a Solo 401(k) plan that allows after-tax contributions and in-service distributions or Roth conversions. Allows contributions far beyond normal Roth limits.",
    steps: [
      "Confirm your Solo 401(k) plan document allows: (1) after-tax (non-Roth) contributions, and (2) in-service withdrawals or in-plan Roth conversions. Not all plan documents include this.",
      "Maximize your pre-tax or Roth employee deferral first: $23,000 (or $30,500 if age 50+) for 2025.",
      "Add your employer profit-sharing contribution: up to 25% of W-2 compensation or approximately 20% of net self-employment income.",
      "The gap between your total contributions (employee + employer) and the \u00a7415 limit ($69,000 / $76,500 catch-up) can be filled with after-tax contributions.",
      "Immediately convert the after-tax contributions to Roth (either via in-plan Roth conversion or by rolling to a Roth IRA). This is the 'mega backdoor' \u2014 the conversion is tax-free because the after-tax contributions have zero pre-tax basis.",
      "This strategy can add $20,000\u2013$46,000 of additional Roth savings per year depending on your income and employer match."
    ],
    mistakes: [
      "Using a plan document that doesn't allow after-tax contributions or in-service distributions \u2014 check your plan before attempting this strategy.",
      "Letting after-tax contributions sit without immediately converting \u2014 any earnings on the after-tax contributions ARE taxable when converted. Convert promptly.",
      "Confusing after-tax contributions with Roth contributions \u2014 they're different. After-tax goes in as traditional but converts to Roth. Designated Roth contributions go in directly as Roth.",
      "Forgetting to track basis on after-tax contributions via Form 8606 \u2014 without documentation, you may pay double tax on conversion."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "2025 \u00a7415 Total Limit" + (res.catchUp ? " (Age 50+ catch-up)" : ""), value: fmt(res.totalLimit) }),
      React.createElement(ResultRow, { label: "Employee Deferral Used", value: fmt(res.employeeDeferral) }),
      React.createElement(ResultRow, { label: "Employer Profit Sharing (est.)", value: fmt(res.employerMatch) }),
      React.createElement(ResultRow, { label: "After-Tax Contribution Capacity", value: fmt(res.afterTaxCapacity), bold: true, color: "#15803d" }),
      React.createElement(InfoBox, { type: "green" }, "You can contribute up to " + fmt(res.afterTaxCapacity) + " in after-tax Solo 401(k) contributions and immediately convert to Roth \u2014 completely tax-free Roth savings beyond normal limits.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Net SE Income ($)"), React.createElement("input", { name: "net_se", type: "number", placeholder: "200000", value: f.net_se, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Age"), React.createElement("input", { name: "age", type: "number", placeholder: "45", value: f.age, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Mega Backdoor Capacity")
    )
  );
}

// ── Tab 7 Strategy: Defined Benefit / Cash Balance ───────────────────────────
function DefinedBenefit() {
  const [f, setF] = useState({ net_income: "", age: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ net_income: "", age: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const income = n(f.net_income);
    const age = n(f.age) || 50;
    const taxRate = n(f.tax_rate) / 100 || 0.37;
    // DB contribution estimate: increases sharply with age
    // Rough actuarial approximation for cash balance plan
    let dbContrib = 0;
    if (age < 45) dbContrib = Math.min(income * 0.35, 80000);
    else if (age < 50) dbContrib = Math.min(income * 0.50, 150000);
    else if (age < 55) dbContrib = Math.min(income * 0.65, 200000);
    else if (age < 60) dbContrib = Math.min(income * 0.80, 250000);
    else dbContrib = Math.min(income * 0.90, 275000);
    const solo401k = age >= 50 ? 76500 : 69000;
    const totalContrib = dbContrib + solo401k;
    const taxSavings = totalContrib * taxRate;
    const dbTaxSavings = dbContrib * taxRate;
    setRes({ income, age, dbContrib, solo401k, totalContrib, taxSavings, dbTaxSavings, taxRate });
  };
  return React.createElement(StrategyShell, {
    title: "Defined Benefit / Cash Balance Plan", irc: "IRC \u00a7412, \u00a7415(b) \u2014 Defined Benefit Plans", onReset: reset,
    who: "High-income self-employed individuals and small business owners, especially those age 50+ with consistent income above $250,000 who want to shelter far more than a Solo 401(k) allows.",
    steps: [
      "Engage a Third-Party Administrator (TPA) who specializes in defined benefit plans. The contribution amount is determined by an actuary each year based on your age, income, and desired benefit.",
      "Choose between a Traditional Defined Benefit Plan (promises a specific monthly benefit at retirement) or a Cash Balance Plan (promises a specific account balance, expressed as a 'pay credit' plus interest credits). Cash Balance plans are more flexible and portable.",
      "Stack with a Solo 401(k): most high earners combine a Cash Balance Plan with a Solo 401(k) profit-sharing contribution to maximize total deferrals.",
      "The IRS \u00a7415(b) limit for 2025 is a $275,000/year annual benefit at normal retirement age. This translates to very large deductible contributions for older, higher-income participants.",
      "Fund the plan annually \u2014 defined benefit plans have minimum funding requirements. You must contribute even in lower-income years, which makes them less suitable for highly variable income.",
      "Upon retirement, funds can be rolled to an IRA or taken as annuity payments. Rolling to IRA preserves tax-deferred status and flexibility."
    ],
    mistakes: [
      "Opening a DB plan without stable, high income \u2014 minimum funding requirements mean you must contribute even in bad years. Underfunding triggers excise taxes.",
      "Not stacking with a Solo 401(k) \u2014 high earners can combine both plans for total annual deferrals of $150,000\u2013$350,000+.",
      "Choosing a TPA without actuarial expertise \u2014 the annual actuarial certification is required by law and errors can be costly.",
      "Terminating the plan early without a distribution strategy \u2014 plan termination triggers required distributions and potential tax events."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Net Income", value: fmt(res.income) }),
      React.createElement(ResultRow, { label: "Your Age", value: res.age }),
      React.createElement(ResultRow, { label: "Est. Cash Balance Plan Contribution", value: fmt(res.dbContrib) }),
      React.createElement(ResultRow, { label: "Solo 401(k) Contribution (stacked)", value: fmt(res.solo401k) }),
      React.createElement(ResultRow, { label: "Total Annual Deductible Contributions", value: fmt(res.totalContrib), bold: true }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings (" + (res.taxRate * 100).toFixed(0) + "% rate)", value: fmt(res.taxSavings), bold: true, color: "#15803d" }),
      React.createElement(InfoBox, { type: "green" }, "At age " + res.age + ", a Cash Balance Plan stacked with a Solo 401(k) can shelter approximately " + fmt(res.totalContrib) + "/year \u2014 saving an estimated " + fmt(res.taxSavings) + " in federal income tax annually. Consult an actuary for precise figures.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Net Annual Income ($)"), React.createElement("input", { name: "net_income", type: "number", placeholder: "300000", value: f.net_income, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Age"), React.createElement("input", { name: "age", type: "number", placeholder: "52", value: f.age, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Federal Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "37", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Estimate DB Plan Contribution")
    )
  );
}

// ── Tab 7 Strategy: Real Estate Professional Status ──────────────────────────
function REPStatus() {
  const [f, setF] = useState({ rental_losses: "", re_hours: "", other_hours: "", tax_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ rental_losses: "", re_hours: "", other_hours: "", tax_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const losses = n(f.rental_losses);
    const reHours = n(f.re_hours);
    const otherHours = n(f.other_hours);
    const taxRate = n(f.tax_rate) / 100 || 0.35;
    const qualifies750 = reHours >= 750;
    const qualifiesMoreThanHalf = reHours > otherHours;
    const qualifies = qualifies750 && qualifiesMoreThanHalf;
    const taxSavings = qualifies ? losses * taxRate : 0;
    setRes({ losses, reHours, otherHours, qualifies, qualifies750, qualifiesMoreThanHalf, taxSavings, taxRate });
  };
  return React.createElement(StrategyShell, {
    title: "Real Estate Professional Status (REPS)", irc: "IRC \u00a7469(c)(7) \u2014 Real Estate Professional Exception", onReset: reset,
    who: "Taxpayers with rental real estate losses who can qualify as Real Estate Professionals. Without REPS, rental losses are 'passive' and can only offset passive income. With REPS, losses become active and can offset W-2 income, business income, and all other income.",
    steps: [
      "Meet the two-part test: (1) More than 750 hours per year in real property trades or businesses, AND (2) more than 50% of your total personal services during the year must be in real property trades or businesses.",
      "Qualifying real property activities include: development, construction, acquisition, conversion, rental, operation, management, leasing, or brokerage.",
      "If you are a W-2 employee in a non-real-estate job, qualifying as a REPS is extremely difficult \u2014 those hours count against your 50% test.",
      "REPS status unlocks rental losses as non-passive \u2014 but you still need to meet material participation in each rental property. You can group all properties under a single election (IRC \u00a7469(c)(7)(A)) to make grouping easier.",
      "Keep a detailed contemporaneous log of your real estate hours \u2014 date, property, activity, and time spent. This log is the first thing the IRS requests in an audit.",
      "If only one spouse qualifies, only that spouse can use the REPS designation \u2014 and only their individual hours count toward the 750-hour test."
    ],
    mistakes: [
      "Counting commute time, administrative tasks, or passive involvement as qualifying hours \u2014 the IRS looks for direct, hands-on activity in real property trades or businesses.",
      "Not making the grouping election \u2014 without it, you must separately prove material participation in each property, which is much harder.",
      "Qualifying REPS in one year and not tracking hours in subsequent years \u2014 REPS must be re-qualified every tax year. It is not a permanent designation.",
      "Assuming a spouse's hours combine \u2014 they don't for the qualification test. However, both spouses can group rental activities together once one qualifies."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Real Estate Hours", value: res.reHours + " hrs" }),
      React.createElement(ResultRow, { label: "Other Personal Service Hours", value: res.otherHours + " hrs" }),
      React.createElement(ResultRow, { label: "750-Hour Test", value: res.qualifies750 ? "\u2705 Met (" + res.reHours + " \u2265 750)" : "\u274C Not Met (" + res.reHours + " < 750)" }),
      React.createElement(ResultRow, { label: "More-Than-Half Test", value: res.qualifiesMoreThanHalf ? "\u2705 Met (" + res.reHours + " > " + res.otherHours + ")" : "\u274C Not Met" }),
      React.createElement(ResultRow, { label: "REPS Qualification", value: res.qualifies ? "\u2705 Qualifies" : "\u274C Does Not Qualify", bold: true, color: res.qualifies ? "#15803d" : "#dc2626" }),
      React.createElement(ResultRow, { label: "Rental Losses Available", value: fmt(res.losses) }),
      React.createElement(ResultRow, { label: "Estimated Tax Savings if REPS Achieved", value: fmt(res.taxSavings), bold: true, color: res.taxSavings > 0 ? "#15803d" : "#888" }),
      !res.qualifies && React.createElement(InfoBox, { type: "warn" }, "You do not currently meet the REPS requirements. Without qualification, rental losses are passive and suspended until you have passive income or sell the property.")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Annual Rental Losses ($)"), React.createElement("input", { name: "rental_losses", type: "number", placeholder: "50000", value: f.rental_losses, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "RE Activity Hours This Year"), React.createElement("input", { name: "re_hours", type: "number", placeholder: "800", value: f.re_hours, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Other Work Hours This Year"), React.createElement("input", { name: "other_hours", type: "number", placeholder: "500", value: f.other_hours, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Your Tax Rate (%)"), React.createElement("input", { name: "tax_rate", type: "number", placeholder: "35", value: f.tax_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Check REPS Qualification")
    )
  );
}

// ── Tab 7 Strategy: NQDC / Deferred Compensation ─────────────────────────────
function NQDCPlanning() {
  const [f, setF] = useState({ defer_amount: "", current_rate: "", future_rate: "", defer_years: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ defer_amount: "", current_rate: "", future_rate: "", defer_years: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const amount = n(f.defer_amount);
    const currentRate = n(f.current_rate) / 100 || 0.37;
    const futureRate = n(f.future_rate) / 100 || 0.25;
    const years = n(f.defer_years) || 5;
    const growthRate = 0.06;
    const taxNow = amount * currentRate;
    const investedNow = (amount - taxNow) * Math.pow(1 + growthRate, years);
    const deferredGrows = amount * Math.pow(1 + growthRate, years);
    const taxLater = deferredGrows * futureRate;
    const netDeferred = deferredGrows - taxLater;
    const benefit = netDeferred - investedNow;
    setRes({ amount, currentRate, futureRate, years, taxNow, investedNow, deferredGrows, taxLater, netDeferred, benefit });
  };
  return React.createElement(StrategyShell, {
    title: "Non-Qualified Deferred Compensation (NQDC)", irc: "IRC \u00a7409A \u2014 NQDC Rules", onReset: reset,
    who: "Highly compensated employees, executives, and key employees offered NQDC plans by their employer. Also relevant for certain independent contractors. NOT available to self-employed individuals outside of employer plans.",
    steps: [
      "Make the deferral election BEFORE the compensation is earned. Under IRC \u00a7409A, elections for the following year must be made by December 31 of the current year. For performance-based compensation, the election deadline is 6 months before the end of the performance period.",
      "Choose your distribution trigger and timing in advance \u2014 allowable triggers include: separation from service, a fixed date, disability, death, change in control, or an unforeseeable emergency. You cannot change the timing once set without a 5-year delay.",
      "Understand the credit risk: NQDC is an unsecured promise by your employer. If the company goes bankrupt, you are an unsecured creditor. This is fundamentally different from a 401(k) which is held in a trust.",
      "Calculate the tax arbitrage: you pay taxes when you receive the deferred compensation. If your tax rate in retirement is meaningfully lower than today, deferral creates real savings. If rates are similar or you expect higher rates, the benefit shrinks.",
      "Avoid constructive receipt violations \u2014 once you have the right to receive the compensation, deferral is no longer permitted. The election must precede the right to receive.",
      "NQDC balances grow tax-deferred but remain subject to FICA taxes in the year earned (not the year received), so there is no FICA benefit to deferral."
    ],
    mistakes: [
      "Missing the election deadline \u2014 elections made after December 31 (or after the 6-month deadline for performance pay) are invalid and trigger immediate taxation plus a 20% penalty under \u00a7409A.",
      "Ignoring credit risk by deferring too heavily into a single employer's NQDC plan \u2014 unlike a 401(k), these funds are at risk if the company fails.",
      "Changing the payment schedule without following the 5-year delay rule \u2014 any acceleration or change in distribution timing triggers a \u00a7409A violation.",
      "Confusing NQDC with qualified plans like 401(k) \u2014 they have completely different rules, protections, and contribution limits."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "Amount Deferred", value: fmt(res.amount) }),
      React.createElement(ResultRow, { label: "Current Tax Rate", value: (res.currentRate * 100).toFixed(0) + "%" }),
      React.createElement(ResultRow, { label: "Expected Future Tax Rate", value: (res.futureRate * 100).toFixed(0) + "%" }),
      React.createElement(ResultRow, { label: "Deferral Period", value: res.years + " years" }),
      React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e8e4dc" } }),
      React.createElement(ResultRow, { label: "Tax if Received Now", value: fmt(res.taxNow) }),
      React.createElement(ResultRow, { label: "Net After-Tax Invested (6% growth)", value: fmt(res.investedNow) }),
      React.createElement(ResultRow, { label: "Deferred Amount Grows To", value: fmt(res.deferredGrows) }),
      React.createElement(ResultRow, { label: "Tax at Distribution (future rate)", value: fmt(res.taxLater) }),
      React.createElement(ResultRow, { label: "Net After Tax (deferred)", value: fmt(res.netDeferred) }),
      React.createElement(ResultRow, { label: "Net Benefit of Deferral", value: fmt(res.benefit), bold: true, color: res.benefit > 0 ? "#15803d" : "#dc2626" }),
      React.createElement(InfoBox, { type: res.benefit > 0 ? "green" : "warn" },
        res.benefit > 0
          ? "Deferral adds approximately " + fmt(res.benefit) + " in after-tax wealth over " + res.years + " years due to the rate differential and tax-deferred growth."
          : "At similar tax rates, deferral provides little benefit and adds credit risk. Consider whether the rate differential justifies the employer credit risk."
      )
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Amount to Defer ($)"), React.createElement("input", { name: "defer_amount", type: "number", placeholder: "100000", value: f.defer_amount, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Current Tax Rate (%)"), React.createElement("input", { name: "current_rate", type: "number", placeholder: "37", value: f.current_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Expected Future Tax Rate (%)"), React.createElement("input", { name: "future_rate", type: "number", placeholder: "25", value: f.future_rate, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Years Until Distribution"), React.createElement("input", { name: "defer_years", type: "number", placeholder: "10", value: f.defer_years, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate Deferral Benefit")
    )
  );
}

// ── Tab 7 Strategy: QOZ Advanced ─────────────────────────────────────────────
function QOZAdvanced() {
  const [f, setF] = useState({ investment: "", gain: "", hold_years: "", growth_rate: "" });
  const [res, setRes] = useState(null);
  const reset = () => { setF({ investment: "", gain: "", hold_years: "", growth_rate: "" }); setRes(null); };
  const ch = (e) => setF(p => ({ ...p, [e.target.name]: e.target.value }));
  const n = (v) => parseFloat(String(v || "").replace(/[^0-9.]/g, "")) || 0;
  const calc = () => {
    const investment = n(f.investment);
    const originalGain = n(f.gain) || investment;
    const holdYears = Math.max(1, n(f.hold_years) || 10);
    const growthRate = n(f.growth_rate) / 100 || 0.07;
    const qofValue = investment * Math.pow(1 + growthRate, holdYears);
    const appreciation = qofValue - investment;
    const capitalGainsRate = 0.20;
    const taxOnAppreciation = appreciation * capitalGainsRate;
    const taxWithoutQOZ = appreciation * capitalGainsRate;
    const tenYearSavings = holdYears >= 10 ? taxOnAppreciation : 0;
    const deferredOriginalGain = originalGain * 0.20;
    setRes({ investment, originalGain, holdYears, qofValue, appreciation, taxOnAppreciation, tenYearSavings, deferredOriginalGain, growthRate });
  };
  return React.createElement(StrategyShell, {
    title: "Qualified Opportunity Zones \u2014 Advanced (Fund Selection & Basis Rules)", irc: "IRC \u00a71400Z-1 / \u00a71400Z-2 \u2014 QOZ Fund Mechanics", onReset: reset,
    who: "Taxpayers who have already realized capital gains (or are planning to) and want to understand the QOF fund selection process, step-up in basis mechanics, and the 10-year hold exclusion in depth. Note: basic QOZ deferral overview is covered in Tab 6.",
    steps: [
      "SELECT THE RIGHT QOF: A Qualified Opportunity Fund must invest at least 90% of its assets in Qualified Opportunity Zone Property. Vet the fund sponsor's track record, the underlying asset class (real estate vs. operating businesses), projected returns, fees, and liquidity terms. There is no government guarantee or FDIC insurance.",
      "BASIS AT INVESTMENT: When you invest in a QOF, your initial basis in the QOF interest is ZERO. This is intentional \u2014 the zero basis ensures that any QOF appreciation over 10 years is fully excluded from tax.",
      "THE 2026 RECOGNITION EVENT: The original deferred gain (from the asset you sold to fund the QOF investment) is recognized on December 31, 2026 \u2014 you will owe tax on it at that time regardless of whether you sell the QOF. Plan your cash flow accordingly.",
      "THE 10-YEAR HOLD EXCLUSION: If you hold your QOF interest for at least 10 years and then sell, you can elect to step up your basis to Fair Market Value on the date of sale (IRC \u00a71400Z-2(c)). This permanently excludes all QOF appreciation from tax.",
      "EARLY EXIT PLANNING: If you need to exit before 10 years, your gain is the difference between proceeds and your zero (or near-zero) adjusted basis. You will owe capital gains tax on the full QOF appreciation. Factor in liquidity before committing.",
      "SECONDARY MARKET: Some QOF interests can be sold on secondary markets before 10 years. The gain on the secondary sale is taxable, but the buyer can then restart their own 10-year clock for the exclusion on future appreciation."
    ],
    mistakes: [
      "Investing the full sale proceeds instead of just the gain \u2014 only the gain amount receives QOZ tax treatment. The non-gain portion of proceeds is not eligible.",
      "Not planning for the 2026 recognition event \u2014 many investors overlooked that the original deferred gain becomes taxable in 2026 regardless of QOF hold period. Ensure you have liquidity to pay that tax.",
      "Choosing a QOF based on tax benefits alone without assessing the underlying investment quality \u2014 a poorly performing QOF eliminates the appreciation exclusion by having no appreciation.",
      "Holding a QOF interest that has appreciated significantly and selling before the 10-year mark \u2014 even one day early eliminates the full appreciation exclusion. Calendar the anniversary date carefully."
    ],
    savings: res && React.createElement("div", null,
      React.createElement(ResultRow, { label: "QOF Investment Amount", value: fmt(res.investment) }),
      React.createElement(ResultRow, { label: "Original Deferred Gain", value: fmt(res.originalGain) }),
      React.createElement(ResultRow, { label: "Assumed Annual Growth", value: (res.growthRate * 100).toFixed(1) + "%" }),
      React.createElement(ResultRow, { label: "QOF Value After " + res.holdYears + " Years", value: fmt(res.qofValue) }),
      React.createElement(ResultRow, { label: "QOF Appreciation", value: fmt(res.appreciation) }),
      React.createElement(ResultRow, { label: "Tax on Appreciation Without QOZ", value: fmt(res.taxOnAppreciation) }),
      React.createElement(ResultRow, { label: "Tax on Appreciation WITH 10-Year Hold", value: res.holdYears >= 10 ? "$0 (fully excluded)" : "Hold to 10 years for full exclusion", bold: true, color: "#15803d" }),
      React.createElement(ResultRow, { label: "Tax Savings on QOF Appreciation", value: fmt(res.tenYearSavings), bold: true, color: "#15803d" }),
      React.createElement(InfoBox, { type: "warn" }, "Reminder: the original deferred gain of " + fmt(res.originalGain) + " is recognized December 31, 2026. Plan to have " + fmt(res.deferredOriginalGain) + " in cash available to pay that tax (at ~20% rate).")
    )
  },
    React.createElement("div", { style: cardStyle },
      React.createElement("div", { style: sectionTitleStyle }, "10-Year Hold Calculator"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "QOF Investment Amount ($)"), React.createElement("input", { name: "investment", type: "number", placeholder: "500000", value: f.investment, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Original Capital Gain ($)"), React.createElement("input", { name: "gain", type: "number", placeholder: "500000", value: f.gain, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Hold Period (Years)"), React.createElement("input", { name: "hold_years", type: "number", placeholder: "10", value: f.hold_years, onChange: ch, style: inpStyle })),
        React.createElement("div", null, React.createElement("label", { style: labelStyle }, "Annual Growth Rate (%)"), React.createElement("input", { name: "growth_rate", type: "number", placeholder: "7", value: f.growth_rate, onChange: ch, style: inpStyle }))
      ),
      React.createElement("button", { onClick: calc, style: { ...calcBtnStyle, marginTop: 12 } }, "Calculate QOF 10-Year Exclusion")
    )
  );
}

// ── Tab 6 Shell ───────────────────────────────────────────────────────────────
function DeductionsCreditsTab() {
  const [cat, setCat] = useState("deductions");
  const [strat, setStrat] = useState("augusta");
  const COMPONENTS = {
    augusta: AugustaRule, accountable: AccountablePlans, home_office_adv: HomeOfficeAdv,
    bonus_dep: BonusDepreciation, cost_seg: CostSegregation,
    rd_credit: RDCredit, wotc: WOTCCredit, energy: EnergyCredits, se_health_hsa: SEHealthHSA,
    deferred_income: DeferredIncome, installment: InstallmentSales, qoz: QOZPlanning,
    charitable: CharitableGiving, plan529: Plan529,
  };
  const StratComponent = COMPONENTS[strat] || (() => null);
  const switchCat = (newCat) => {
    setCat(newCat);
    setStrat(DEDUCTIONS_STRATEGIES[newCat][0].id);
  };
  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" } },
    React.createElement("div", null,
      DEDUCTIONS_CATEGORIES.map(c => React.createElement("div", { key: c.id },
        React.createElement("div", { onClick: () => switchCat(c.id), style: { padding: "10px 14px", fontWeight: "bold", fontSize: 12, color: cat === c.id ? "#7ec11f" : "#888", background: cat === c.id ? "#1a2d5a" : "transparent", borderRadius: 8, cursor: "pointer", marginBottom: 4, letterSpacing: 0.3 } }, c.label),
        cat === c.id && DEDUCTIONS_STRATEGIES[c.id].map(s => React.createElement("div", { key: s.id, onClick: () => setStrat(s.id), style: { padding: "8px 14px 8px 22px", fontSize: 13, color: strat === s.id ? "#1a2d5a" : "#555", fontWeight: strat === s.id ? "bold" : "normal", background: strat === s.id ? "#e8f5cc" : "transparent", borderRadius: 6, cursor: "pointer", marginBottom: 2, borderLeft: strat === s.id ? "3px solid #7ec11f" : "3px solid transparent" } }, s.label))
      ))
    ),
    React.createElement("div", { style: cardStyle }, React.createElement(StratComponent, null))
  );
}

// ── Tab 7 Shell ───────────────────────────────────────────────────────────────
function BusinessAdvancedTab() {
  const [cat, setCat] = useState("structure");
  const [strat, setStrat] = useState("sole_vs_scorp");
  const COMPONENTS = {
    sole_vs_scorp: SolePropVsScorp,
    scorp_vs_ccorp: ScorpVsCcorp,
    salary_dist: SalaryDistSplit,
    plan_compare: PlanCompare,
    backdoor_roth: BackdoorRoth,
    mega_backdoor: MegaBackdoorRoth,
    defined_benefit: DefinedBenefit,
    rep_status: REPStatus,
    nqdc: NQDCPlanning,
    qoz_advanced: QOZAdvanced,
  };
  const StratComponent = COMPONENTS[strat] || (() => null);
  const switchCat = (newCat) => {
    setCat(newCat);
    setStrat(BUSINESS_STRATEGIES[newCat][0].id);
  };
  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" } },
    React.createElement("div", null,
      BUSINESS_CATEGORIES.map(c => React.createElement("div", { key: c.id },
        React.createElement("div", { onClick: () => switchCat(c.id), style: { padding: "10px 14px", fontWeight: "bold", fontSize: 12, color: cat === c.id ? "#7ec11f" : "#888", background: cat === c.id ? "#1a2d5a" : "transparent", borderRadius: 8, cursor: "pointer", marginBottom: 4, letterSpacing: 0.3 } }, c.label),
        cat === c.id && BUSINESS_STRATEGIES[c.id].map(s => React.createElement("div", { key: s.id, onClick: () => setStrat(s.id), style: { padding: "8px 14px 8px 22px", fontSize: 13, color: strat === s.id ? "#1a2d5a" : "#555", fontWeight: strat === s.id ? "bold" : "normal", background: strat === s.id ? "#e8f5cc" : "transparent", borderRadius: 6, cursor: "pointer", marginBottom: 2, borderLeft: strat === s.id ? "3px solid #7ec11f" : "3px solid transparent" } }, s.label))
      ))
    ),
    React.createElement("div", { style: cardStyle }, React.createElement(StratComponent, null))
  );
}

function PlanningDashboard() {
  const [activeTab, setActiveTab] = useState("estimated");
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
        if (res.status === 401) { window.location.href = "/login?next=/planning"; return; }
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
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/session`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error("Save failed");
    } catch { setError("Could not save. Please try again."); } finally { setSaving(false); }
  }, []);

  const handleCalculate = useCallback(async (formData) => {
    setCalculating(true); setError(null);
    try {
      await fetch(`${API_BASE}/session`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const res = await fetch(`${API_BASE}/calculate`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed");
      setResults(data);
      setLastCalc(new Date().toISOString());
    } catch (err) { setError(err.message || "Calculation error. Please try again."); } finally { setCalculating(false); }
  }, []);

  if (loading) return React.createElement("div", { style: { fontFamily: "DM Sans", sans-serif, minHeight: "100vh", background: "#f8f6f1", display: "flex", alignItems: "center", justifyContent: "center" } },
    React.createElement("div", { style: { textAlign: "center", color: "#888" } }, React.createElement("div", { style: { fontSize: 32, marginBottom: 12 } }, "\uD83D\uDCCA"), "Loading your tax planning session...")
  );

  const tabs = [
    { id: "estimated", label: "\uD83D\uDCCA Estimated Tax" },
    { id: "se", label: "\uD83D\uDCBC SE & Business" },
    { id: "debt", label: "\uD83D\uDCC5 IRS Debt" },
    { id: "life", label: "\uD83D\uDC8D Life Events" },
    { id: "recovery", label: "\uD83D\uDDFA\uFE0F Recovery" },
    { id: "deductions", label: "\uD83D\uDCA1 Deductions & Credits" },
    { id: "business_adv", label: "\uD83C\uDFE2 Business & Advanced" },
  ];

  return React.createElement("div", { style: { fontFamily: "DM Sans", sans-serif, minHeight: "100vh", background: "#f8f6f1" } },
    // Header
    React.createElement(IRSPilotNav, { subtitle: "TAX PLANNING" }),

    // Page title
    React.createElement("div", { style: { maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" } },
      React.createElement("h1", { style: { fontSize: 26, fontWeight: "bold", color: "#1a2d5a", margin: "0 0 6px" } }, "Tax Planning Dashboard"),
      React.createElement("p", { style: { color: "#666", fontSize: 14, margin: "0 0 4px" } }, "Plan, optimize, and resolve your tax situation."),
      lastCalc && activeTab === "estimated" && React.createElement("p", { style: { color: "#aaa", fontSize: 12, margin: 0 } }, "Last calculated: ", new Date(lastCalc).toLocaleString())
    ),

    // Error banner
    error && React.createElement("div", { style: { maxWidth: 1200, margin: "12px auto 0", padding: "0 24px" } },
      React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" } },
        error,
        React.createElement("button", { onClick: () => setError(null), style: { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 18 } }, "\xD7")
      )
    ),

    // Tab bar
    React.createElement("div", { style: { maxWidth: 1200, margin: "16px auto 0", padding: "0 24px" } },
      React.createElement("div", { style: { display: "flex", gap: 4, borderBottom: "2px solid #e8e4dc" } },
        tabs.map(t => React.createElement("button", { key: t.id, onClick: () => setActiveTab(t.id), style: { padding: "10px 20px", background: activeTab === t.id ? "#1a2d5a" : "transparent", color: activeTab === t.id ? "#7ec11f" : "#666", border: "none", borderRadius: "8px 8px 0 0", fontFamily: "DM Sans", sans-serif, fontWeight: activeTab === t.id ? "bold" : "normal", fontSize: 13, cursor: "pointer", borderBottom: activeTab === t.id ? "2px solid #7ec11f" : "none", marginBottom: -2 } }, t.label))
      )
    ),

    // Tab content
    React.createElement("div", { style: { maxWidth: 1200, margin: "0 auto", padding: "24px 24px 40px" } },
      activeTab === "estimated" && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" } },
        React.createElement("div", null, React.createElement(PlanningInput, { initialValues: session, onSave: handleSave, onCalculate: handleCalculate, saving, calculating })),
        React.createElement("div", null, results ? React.createElement(PlanningResults, { results }) : React.createElement("div", { style: { ...cardStyle, textAlign: "center", padding: "48px 32px" } },
          React.createElement("div", { style: { fontSize: 48, marginBottom: 16 } }, "\uD83D\uDCCA"),
          React.createElement("h3", { style: { color: "#1a2d5a", fontSize: 18, margin: "0 0 10px" } }, "Your results will appear here"),
          React.createElement("p", { style: { color: "#888", fontSize: 14, lineHeight: 1.7 } }, "Fill in your income details on the left and click ", React.createElement("strong", { style: { color: "#1a2d5a" } }, "Calculate My Tax Estimate"), " to see your estimated liability, safe harbor status, and quarterly payment schedule.")
        ))
      ),
      activeTab === "se" && React.createElement(SEPlanning, null),
      activeTab === "debt" && React.createElement(DebtPlanning, null),
      activeTab === "life" && React.createElement(LifePlanning, null),
      activeTab === "recovery" && React.createElement(RecoveryPlanning, null),
      activeTab === "deductions" && React.createElement(DeductionsCreditsTab, null),
      activeTab === "business_adv" && React.createElement(BusinessAdvancedTab, null)
    )
  );
}

window.PlanningDashboard = PlanningDashboard;
