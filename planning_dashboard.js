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
    { id: "debt", label: "\uD83D\uDCC5 IRS Debt" },
    { id: "life", label: "\uD83D\uDC8D Life Events" },
    { id: "recovery", label: "\uD83D\uDDFA\uFE0F Recovery Plan" },
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
      activeTab === "debt" && React.createElement(DebtPlanning, null),
      activeTab === "life" && React.createElement(LifePlanning, null),
      activeTab === "recovery" && React.createElement(RecoveryPlanning, null)
    )
  );
}

window.PlanningDashboard = PlanningDashboard;
