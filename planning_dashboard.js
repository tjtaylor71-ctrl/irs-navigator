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
  const inpStyle = { width: "100%", padding: "10px 12px", paddingLeft: 28, border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", color: "#1a2d5a" };
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
const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", color: "#1a2d5a" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: "bold", color: "#555", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase" };
const fieldsetStyle = { border: "1px solid #e8e4dc", borderRadius: 10, padding: "16px 18px", marginBottom: 16, background: "#fafaf8" };
const legendStyle = { fontSize: 13, fontWeight: "bold", color: "#1a2d5a", padding: "0 8px" };
const hintStyle = { fontSize: 11, color: "#aaa", fontWeight: "normal", marginLeft: 6 };
const calcBtnStyle = { width: "100%", padding: "11px 0", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer", marginTop: 8 };

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
      React.createElement("button", { onClick: () => onSave(toNumbers()), disabled: saving||calculating, style: { flex: 1, padding: "10px 0", background: "#fff", color: "#1a2d5a", border: "2px solid #1a2d5a", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: saving||calculating?"default":"pointer", opacity: saving||calculating?0.6:1 } }, saving ? "Saving..." : "Save"),
      React.createElement("button", { onClick: () => onCalculate(toNumbers()), disabled: saving||calculating, style: { flex: 2, padding: "10px 0", background: "#7ec11f", color: "#1a2d5a", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: saving||calculating?"default":"pointer", opacity: saving||calculating?0.6:1 } }, calculating ? "Calculating..." : "Calculate My Tax Estimate")
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

  if (loading) return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1", display: "flex", alignItems: "center", justifyContent: "center" } },
    React.createElement("div", { style: { textAlign: "center", color: "#888" } }, React.createElement("div", { style: { fontSize: 32, marginBottom: 12 } }, "\uD83D\uDCCA"), "Loading your tax planning session...")
  );

  const tabs = [
    { id: "estimated", label: "\uD83D\uDCCA Estimated Tax" },
    { id: "se", label: "\uD83D\uDCBC SE & Business" },
    { id: "debt", label: "\uD83D\uDCC5 IRS Debt & Compliance" },
  ];

  return React.createElement("div", { style: { fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f8f6f1" } },
    // Header
    React.createElement("div", { style: { background: "#1a2d5a", borderBottom: "3px solid #7ec11f", padding: "14px 24px" } },
      React.createElement("div", { style: { maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
          React.createElement("a", { href: "/navigator", style: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" } },
            React.createElement("img", { src: "/static/logo.png", alt: "IRS Pilot", style: { width: 40, height: 40, objectFit: "contain" } }),
            React.createElement("div", null,
              React.createElement("div", { style: { color: "#fff", fontWeight: "bold", fontSize: 16 } }, "IRS Pilot"),
              React.createElement("div", { style: { color: "#7ec11f", fontSize: 10, letterSpacing: 1 } }, "TAX PLANNING")
            )
          )
        ),
        React.createElement("div", { style: { display: "flex", gap: 8 } },
          React.createElement("a", { href: "/navigator", style: { color: "#cce8a0", fontSize: 12, textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 } }, "\u2190 Navigator"),
          React.createElement("a", { href: "/account", style: { color: "#cce8a0", fontSize: 12, textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 } }, "My Account")
        )
      )
    ),

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
        tabs.map(t => React.createElement("button", { key: t.id, onClick: () => setActiveTab(t.id), style: { padding: "10px 20px", background: activeTab === t.id ? "#1a2d5a" : "transparent", color: activeTab === t.id ? "#7ec11f" : "#666", border: "none", borderRadius: "8px 8px 0 0", fontFamily: "Georgia, serif", fontWeight: activeTab === t.id ? "bold" : "normal", fontSize: 13, cursor: "pointer", borderBottom: activeTab === t.id ? "2px solid #7ec11f" : "none", marginBottom: -2 } }, t.label))
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
      activeTab === "debt" && React.createElement(DebtPlanning, null)
    )
  );
}

window.PlanningDashboard = PlanningDashboard;
