const { useState, useEffect, useRef, useCallback, useMemo } = React;

const IRS_STANDARDS = {
  food_clothing_misc: {
    1: 785,
    2: 1145,
    3: 1302,
    4: 1474,
    5: 1659
  },
  out_of_pocket_health: {
    under65: 79,
    over65: 153
  },
  housing_utilities: {
    // National maximums by household size (simplified — actual vary by county)
    1: 2025,
    2: 2396,
    3: 2659,
    4: 2793,
    5: 2793
  },
  transportation_ownership: 594,
  // per vehicle, up to 2
  transportation_operating: 335
  // national standard
};
const fmt = (n) => n == null || n === "" ? "" : `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
const STEPS = [
  { id: "personal", label: "Personal Info", icon: "\u{1F464}" },
  { id: "business", label: "Business Ownership", icon: "\u{1F3E2}" },
  { id: "employment", label: "Employment", icon: "\u{1F4BC}" },
  { id: "otherinfo", label: "Other Info", icon: "\u{1F4CB}" },
  { id: "assets", label: "Assets", icon: "\u{1F3E6}" },
  { id: "income", label: "Income", icon: "\u{1F4B0}" },
  { id: "expenses", label: "Expenses", icon: "\u{1F4CA}" },
  { id: "oic", label: "OIC Details", icon: "\u{1F91D}" },
  { id: "results", label: "Results", icon: "\u2705" }
];
const COMMUNITY_PROPERTY_STATES = ["AZ", "CA", "ID", "LA", "NM", "NV", "TX", "WA", "WI"];
const Field = ({ label, hint, children, required }) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 18 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: 13, color: "#2c3e50", marginBottom: 5 } }, label, required && /* @__PURE__ */ React.createElement("span", { style: { color: "#e74c3c" } }, " *")), hint && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 4 } }, hint), children);
const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => /* @__PURE__ */ React.createElement(
  "input",
  {
    type,
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    placeholder,
    style: {
      width: "100%",
      padding: "9px 12px",
      border: "1.5px solid #dce0e5",
      borderRadius: 6,
      fontSize: 14,
      color: "#2c3e50",
      background: "#fff",
      boxSizing: "border-box",
      outline: "none",
      ...style
    }
  }
);
const MoneyInput = ({ value, onChange, placeholder }) => /* @__PURE__ */ React.createElement(
  "input",
  {
    type: "text",
    value: value || "",
    onChange: (e) => onChange(e.target.value.replace(/[^0-9.]/g, "")),
    placeholder: placeholder || "0",
    style: {
      width: "100%",
      padding: "9px 12px",
      border: "1.5px solid #dce0e5",
      borderRadius: 6,
      fontSize: 14,
      color: "#2c3e50",
      background: "#fff",
      boxSizing: "border-box"
    }
  }
);
const Select = ({ value, onChange, options }) => /* @__PURE__ */ React.createElement(
  "select",
  {
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    style: {
      width: "100%",
      padding: "9px 12px",
      border: "1.5px solid #dce0e5",
      borderRadius: 6,
      fontSize: 14,
      color: "#2c3e50",
      background: "#fff",
      boxSizing: "border-box"
    }
  },
  /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014 Select \u2014"),
  options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.value, value: o.value }, o.label))
);
const YesNo = ({ value, onChange, label }) => /* @__PURE__ */ React.createElement(Field, { label }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, ["Yes", "No"].map((opt) => /* @__PURE__ */ React.createElement("label", { key: opt, style: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 } }, /* @__PURE__ */ React.createElement(
  "input",
  {
    type: "radio",
    checked: value === opt,
    onChange: () => onChange(opt),
    style: { accentColor: "#7ec11f" }
  }
), opt))));
const SectionTitle = ({ children, sub }) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20, paddingBottom: 10, borderBottom: "2px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: "#1a2d5a" } }, children), sub && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7f8c8d", marginTop: 3 } }, sub));
const Row2 = ({ children }) => /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, children);
const Row3 = ({ children }) => /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } }, children);
const InfoBox = ({ children, type = "info" }) => {
  const colors = {
    info: { bg: "#ebf5fb", border: "#3498db", text: "#1a5276" },
    warn: { bg: "#fef9e7", border: "#7ec11f", text: "#7d6608" },
    tip: { bg: "#eafaf1", border: "#27ae60", text: "#1e8449" }
  };
  const c = colors[type];
  return /* @__PURE__ */ React.createElement("div", { style: {
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: c.text,
    lineHeight: 1.5
  } }, children);
};
const AddButton = ({ onClick, label }) => /* @__PURE__ */ React.createElement("button", { onClick, style: {
  background: "none",
  border: "1.5px dashed #7ec11f",
  color: "#7ec11f",
  borderRadius: 6,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
  marginTop: 6,
  fontWeight: 600
} }, "+ ", label);
const RemoveButton = ({ onClick }) => /* @__PURE__ */ React.createElement("button", { onClick, style: {
  background: "#fdf2f2",
  border: "1px solid #f5c6cb",
  color: "#c0392b",
  borderRadius: 4,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer"
} }, "Remove");
const Card = ({ children, style = {} }) => /* @__PURE__ */ React.createElement("div", { style: {
  background: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  ...style
} }, children);
function StepPersonal({ data, set }) {
  const isCommunity = COMMUNITY_PROPERTY_STATES.includes(data.state);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "This information will appear on all IRS forms" }, "Personal & Household Information"), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Last Name", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.lastName, onChange: (v) => set("lastName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "First Name", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.firstName, onChange: (v) => set("firstName", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Date of Birth", required: true }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.dob, onChange: (v) => set("dob", v) })), /* @__PURE__ */ React.createElement(Field, { label: "SSN or ITIN", required: true, hint: "Format: XXX-XX-XXXX" }, /* @__PURE__ */ React.createElement(Input, { value: data.ssn, onChange: (v) => set("ssn", v), placeholder: "XXX-XX-XXXX" })), /* @__PURE__ */ React.createElement(Field, { label: "Marital Status", required: true }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.maritalStatus,
      onChange: (v) => set("maritalStatus", v),
      options: [{ value: "Married", label: "Married" }, { value: "Single", label: "Single" }, { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" }]
    }
  ))), data.maritalStatus === "Married" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.spouseOnDebt,
      onChange: (v) => set("spouseOnDebt", v),
      label: "Is your spouse also liable for the tax debt you are resolving?"
    }
  ), data.spouseOnDebt === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 4, color: "#1a2d5a" } }, "Spouse Information \u2014 Co-Applicant"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 12 } }, "Your spouse's name, SSN, income, and assets will appear on the forms as a co-filer."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Spouse Last Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseLastName, onChange: (v) => set("spouseLastName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Spouse First Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseFirstName, onChange: (v) => set("spouseFirstName", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Spouse Date of Birth" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.spouseDob, onChange: (v) => set("spouseDob", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Spouse SSN or ITIN" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseSsn, onChange: (v) => set("spouseSsn", v), placeholder: "XXX-XX-XXXX" })))), data.spouseOnDebt === "No" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "Non-Liable Spouse."), " Because your spouse does not owe this tax debt, their personal information will not appear on the forms as a co-filer. However, their income ", /* @__PURE__ */ React.createElement("em", null, "does"), " affect your case \u2014 the IRS will use it to calculate what percentage of shared household expenses you can claim. Your spouse's income will be captured in the Household Income section below and reported as a contributing household member on the forms."), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 4, color: "#1a2d5a" } }, "Spouse \u2014 Household Member"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 12 } }, "Enter your spouse's basic information. They will be listed as a household member, not a co-applicant."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Spouse Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseLastName, onChange: (v) => set("spouseLastName", v), placeholder: "First and last name" })), /* @__PURE__ */ React.createElement(Field, { label: "Age" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.spouseAge, onChange: (v) => set("spouseAge", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "Spouse Monthly Income (if any)", hint: "This is used to calculate your proportionate share of household expenses \u2014 it is not added to your income for IRS collection purposes" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.spouseHouseholdIncome, onChange: (v) => set("spouseHouseholdIncome", v) })))), /* @__PURE__ */ React.createElement(Field, { label: "Home Address", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.address, onChange: (v) => set("address", v), placeholder: "Street address" })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "City", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.city, onChange: (v) => set("city", v) })), /* @__PURE__ */ React.createElement(Field, { label: "State", required: true }, /* @__PURE__ */ React.createElement(Select, { value: data.state, onChange: (v) => set("state", v), options: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"].map((s) => ({ value: s, label: s })) })), /* @__PURE__ */ React.createElement(Field, { label: "ZIP Code", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.zip, onChange: (v) => set("zip", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "County of Residence", required: true }, /* @__PURE__ */ React.createElement(Input, { value: data.county, onChange: (v) => set("county", v) })), isCommunity && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, data.state, " is a community property state."), " If you are married or were recently married, your spouse's income and assets may be relevant even if they are not on the tax debt. This affects how the IRS evaluates your financial situation."), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Home Phone" }, /* @__PURE__ */ React.createElement(Input, { value: data.homePhone, onChange: (v) => set("homePhone", v), placeholder: "(xxx) xxx-xxxx" })), /* @__PURE__ */ React.createElement(Field, { label: "Cell Phone" }, /* @__PURE__ */ React.createElement(Input, { value: data.cellPhone, onChange: (v) => set("cellPhone", v), placeholder: "(xxx) xxx-xxxx" })), /* @__PURE__ */ React.createElement(Field, { label: "Work Phone" }, /* @__PURE__ */ React.createElement(Input, { value: data.workPhone, onChange: (v) => set("workPhone", v), placeholder: "(xxx) xxx-xxxx" }))), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Include everyone who lives in your home \u2014 children, dependents, and any non-liable spouse" }, "Household Members"), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "Household size affects the IRS allowable expense standards the IRS will apply to your case. Include all people living in your home, whether or not they are claimed as dependents on your tax return."), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "People in household under 65" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.householdUnder65, onChange: (v) => set("householdUnder65", v) })), /* @__PURE__ */ React.createElement(Field, { label: "People in household 65 or over" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.householdOver65, onChange: (v) => set("householdOver65", v) }))), data.maritalStatus === "Married" && data.spouseOnDebt === "No" && /* @__PURE__ */ React.createElement(InfoBox, { type: "tip" }, "Your non-liable spouse has been noted. Add them below as a household member and include their monthly income so the IRS can calculate your proportionate share of household expenses."), (data.dependents || []).map((dep, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Household Member ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => {
    const d = [...data.dependents];
    d.splice(i, 1);
    set("dependents", d);
  } })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Name" }, /* @__PURE__ */ React.createElement(Input, { value: dep.name, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], name: v };
    set("dependents", d);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "Age" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: dep.age, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], age: v };
    set("dependents", d);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "Relationship" }, /* @__PURE__ */ React.createElement(Input, { value: dep.relationship, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], relationship: v };
    set("dependents", d);
  } }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(YesNo, { value: dep.claimedOnReturn, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], claimedOnReturn: v };
    set("dependents", d);
  }, label: "Claimed as dependent on your Form 1040?" }), /* @__PURE__ */ React.createElement(YesNo, { value: dep.contributesIncome, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], contributesIncome: v };
    set("dependents", d);
  }, label: "Contributes to household income?" })), dep.contributesIncome === "Yes" && /* @__PURE__ */ React.createElement(Field, { label: "Monthly contribution to household income", hint: "Used to calculate your proportionate share of allowable expenses" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: dep.monthlyIncome, onChange: (v) => {
    const d = [...data.dependents];
    d[i] = { ...d[i], monthlyIncome: v };
    set("dependents", d);
  } })))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => set("dependents", [...data.dependents || [], {}]), label: "Add household member" }));
}
function StepBusiness({ data, set }) {
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "This determines which forms are required" }, "Business Ownership"), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "If you are a ", /* @__PURE__ */ React.createElement("strong", null, "sole proprietor"), " (file Schedule C), your business information is captured on your personal 433-A or 433-F \u2014 no separate form needed.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("br", null), "If you have an ownership interest in a ", /* @__PURE__ */ React.createElement("strong", null, "Partnership, S-Corporation, Corporation, or LLC"), ", a separate ", /* @__PURE__ */ React.createElement("strong", null, "Form 433-B"), " will be required for that business entity."), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.hasBusiness,
      onChange: (v) => set("hasBusiness", v),
      label: "Do you or your spouse have any ownership interest in a Partnership, S-Corporation, Corporation, or LLC?"
    }
  ), data.hasBusiness === "Yes" && /* @__PURE__ */ React.createElement("div", null, (data.businesses || [{}]).map((biz, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("strong", null, "Business Entity ", i + 1), i > 0 && /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => {
    const b = [...data.businesses];
    b.splice(i, 1);
    set("businesses", b);
  } })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Business Name", required: true }, /* @__PURE__ */ React.createElement(Input, { value: biz.name, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], name: v };
    set("businesses", b);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "EIN (Employer Identification Number)" }, /* @__PURE__ */ React.createElement(Input, { value: biz.ein, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], ein: v };
    set("businesses", b);
  }, placeholder: "XX-XXXXXXX" }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Type of Entity", required: true }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: biz.type,
      onChange: (v) => {
        const b = [...data.businesses];
        b[i] = { ...b[i], type: v };
        set("businesses", b);
      },
      options: [
        { value: "Partnership", label: "Partnership" },
        { value: "S-Corporation", label: "S-Corporation" },
        { value: "Corporation", label: "Corporation (C-Corp)" },
        { value: "LLC-Corp", label: "LLC classified as Corporation" },
        { value: "LLC-Other", label: "LLC (other)" }
      ]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Your Ownership Percentage", required: true }, /* @__PURE__ */ React.createElement(Input, { value: biz.ownership, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], ownership: v };
    set("businesses", b);
  }, placeholder: "e.g., 50" }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Your Title" }, /* @__PURE__ */ React.createElement(Input, { value: biz.title, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], title: v };
    set("businesses", b);
  }, placeholder: "e.g., President, Managing Member" })), /* @__PURE__ */ React.createElement(Field, { label: "Business Phone" }, /* @__PURE__ */ React.createElement(Input, { value: biz.phone, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], phone: v };
    set("businesses", b);
  }, placeholder: "(xxx) xxx-xxxx" }))), /* @__PURE__ */ React.createElement(Field, { label: "Business Address" }, /* @__PURE__ */ React.createElement(Input, { value: biz.address, onChange: (v) => {
    const b = [...data.businesses];
    b[i] = { ...b[i], address: v };
    set("businesses", b);
  } })), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: biz.responsiblePayroll,
      onChange: (v) => {
        const b = [...data.businesses];
        b[i] = { ...b[i], responsiblePayroll: v };
        set("businesses", b);
      },
      label: "Are you responsible for depositing payroll taxes for this business?"
    }
  ), biz.responsiblePayroll === "Yes" && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "Trust Fund Recovery Penalty (TFRP) Risk."), ' If the business has unpaid payroll taxes, the IRS may hold you personally liable for the employee portion (the "trust fund" portion). This is assessed separately from the business debt and survives bankruptcy. A Revenue Officer will investigate this.'))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => set("businesses", [...data.businesses || [{}], {}]), label: "Add another business entity" }), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.isSoleProprietor,
      onChange: (v) => set("isSoleProprietor", v),
      label: "Do you also have self-employment income as a sole proprietor (Schedule C)?"
    }
  ), data.isSoleProprietor === "Yes" && /* @__PURE__ */ React.createElement(InfoBox, { type: "tip" }, "Your sole proprietorship information will be captured in Section 6 & 7 of your 433-A \u2014 no separate 433-B needed for that business.")), data.hasBusiness === "No" && /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.isSoleProprietor,
      onChange: (v) => set("isSoleProprietor", v),
      label: "Are you self-employed or do you have sole proprietor income (file Schedule C)?"
    }
  ));
}
function StepEmployment({ data, set, bizData, personalData }) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Complete for you and your spouse if employed" }, "Employment Information"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, color: "#1a2d5a", fontSize: 15 } }, "Your Employment"), /* @__PURE__ */ React.createElement(Field, { label: "Current Employer Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.employerName, onChange: (v) => set("employerName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Employer Address" }, /* @__PURE__ */ React.createElement(Input, { value: data.employerAddress, onChange: (v) => set("employerAddress", v) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Work Phone" }, /* @__PURE__ */ React.createElement(Input, { value: data.workPhone, onChange: (v) => set("workPhone", v), placeholder: "(xxx) xxx-xxxx" })), /* @__PURE__ */ React.createElement(Field, { label: "How long with this employer?" }, /* @__PURE__ */ React.createElement(Input, { value: data.employerDuration, onChange: (v) => set("employerDuration", v), placeholder: "e.g., 3 years 2 months" }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Occupation / Job Title" }, /* @__PURE__ */ React.createElement(Input, { value: data.occupation, onChange: (v) => set("occupation", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Pay Period" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.payPeriod,
      onChange: (v) => set("payPeriod", v),
      options: [{ value: "Weekly", label: "Weekly" }, { value: "Biweekly", label: "Bi-weekly (every 2 weeks)" }, { value: "Semimonthly", label: "Semi-monthly (twice/month)" }, { value: "Monthly", label: "Monthly" }]
    }
  ))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Gross Pay Per Period", hint: "Before taxes \u2014 do not deduct withholding" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.grossPay, onChange: (v) => set("grossPay", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Federal Tax Withheld Per Period" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.fedTax, onChange: (v) => set("fedTax", v) })), /* @__PURE__ */ React.createElement(Field, { label: "State Tax Withheld Per Period" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.stateTax, onChange: (v) => set("stateTax", v) }))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.canContactWork,
      onChange: (v) => set("canContactWork", v),
      label: "Can the IRS contact you at work if needed?"
    }
  ), /* @__PURE__ */ React.createElement(Field, { label: "Number of dependents claimed on your W-4" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.dependentsClaimed, onChange: (v) => set("dependentsClaimed", v) }))), personalData?.spouseOnDebt === "Yes" ? /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, color: "#1a2d5a", fontSize: 15 } }, "Spouse Employment \u2014 Co-Applicant"), /* @__PURE__ */ React.createElement(YesNo, { value: data.spouseEmployed, onChange: (v) => set("spouseEmployed", v), label: "Is your spouse currently employed?" }), data.spouseEmployed === "Yes" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Field, { label: "Spouse Employer Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseEmployerName, onChange: (v) => set("spouseEmployerName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Spouse Employer Address" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseEmployerAddress, onChange: (v) => set("spouseEmployerAddress", v) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Occupation" }, /* @__PURE__ */ React.createElement(Input, { value: data.spouseOccupation, onChange: (v) => set("spouseOccupation", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Pay Period" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.spousePayPeriod,
      onChange: (v) => set("spousePayPeriod", v),
      options: [{ value: "Weekly", label: "Weekly" }, { value: "Biweekly", label: "Bi-weekly" }, { value: "Semimonthly", label: "Semi-monthly" }, { value: "Monthly", label: "Monthly" }]
    }
  ))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Gross Pay Per Period" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.spouseGrossPay, onChange: (v) => set("spouseGrossPay", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Federal Tax Withheld" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.spouseFedTax, onChange: (v) => set("spouseFedTax", v) })), /* @__PURE__ */ React.createElement(Field, { label: "State Tax Withheld" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.spouseStateTax, onChange: (v) => set("spouseStateTax", v) }))))) : personalData?.maritalStatus === "Married" ? /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "Your spouse is a non-liable household member. Their income was captured in the Personal Info step and will be used to calculate your proportionate share of household expenses \u2014 it does not appear in the employment section of your forms.") : null, isSelfEmp && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, color: "#1a2d5a", fontSize: 15 } }, "Sole Proprietorship Information"), /* @__PURE__ */ React.createElement(InfoBox, { type: "tip" }, "This section covers your Schedule C business. Income and expenses will be captured in the Income step."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Business Name (or your name if DBA)" }, /* @__PURE__ */ React.createElement(Input, { value: data.bizName, onChange: (v) => set("bizName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Business EIN (if applicable)" }, /* @__PURE__ */ React.createElement(Input, { value: data.bizEin, onChange: (v) => set("bizEin", v), placeholder: "XX-XXXXXXX or N/A" }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Type of Business" }, /* @__PURE__ */ React.createElement(Input, { value: data.bizType, onChange: (v) => set("bizType", v), placeholder: "e.g., Plumbing, Consulting" })), /* @__PURE__ */ React.createElement(Field, { label: "Business Website" }, /* @__PURE__ */ React.createElement(Input, { value: data.bizWebsite, onChange: (v) => set("bizWebsite", v), placeholder: "www.example.com or N/A" }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Number of Employees" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.bizEmployees, onChange: (v) => set("bizEmployees", v), placeholder: "0 if owner only" })), /* @__PURE__ */ React.createElement(Field, { label: "Average Gross Monthly Payroll" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizPayroll, onChange: (v) => set("bizPayroll", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Frequency of Tax Deposits" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.bizTaxDepFreq,
      onChange: (v) => set("bizTaxDepFreq", v),
      options: [{ value: "Monthly", label: "Monthly" }, { value: "Semiweekly", label: "Semi-weekly" }, { value: "Quarterly", label: "Quarterly" }, { value: "Annual", label: "Annual" }, { value: "NA", label: "N/A" }]
    }
  ))), /* @__PURE__ */ React.createElement(YesNo, { value: data.bizEcommerce, onChange: (v) => set("bizEcommerce", v), label: "Does the business engage in e-commerce or internet sales?" })));
}
function StepOtherInfo({ data, set }) {
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "The IRS requires answers to these questions on the 433-A" }, "Other Financial Information"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Used to calculate your estimated installment agreement payment" }, "Total Balance Owed to IRS"), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "Not sure what you owe? Your exact balance \u2014 including penalties and interest \u2014 is available in your IRS Online Account at", " ", /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://www.irs.gov/payments/your-online-account",
      target: "_blank",
      rel: "noopener noreferrer",
      style: { color: "#7ec11f", fontWeight: "bold" }
    },
    "irs.gov/payments/your-online-account"
  ), ". Log in with ID.me or IRS.gov credentials to view your current balance for each tax year."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Total Balance Owed (all years combined)", hint: "Include tax, penalties, and interest. Find this in your IRS Online Account." }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.totalIRSBalance, onChange: (v) => set("totalIRSBalance", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Do you know your CSED (Collection Statute Expiration Date)?", hint: "The CSED is the date the IRS's legal right to collect expires \u2014 generally 10 years from assessment." }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.knowsCSED,
      onChange: (v) => set("knowsCSED", v),
      options: [{ value: "", label: "Select..." }, { value: "Yes", label: "Yes \u2014 I know my CSED" }, { value: "No", label: "No \u2014 I don't know it" }, { value: "Multiple", label: "Different dates for different years" }]
    }
  ))), data.knowsCSED === "Yes" && /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "CSED Date", hint: "Date the IRS collection clock expires for your primary balance." }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.csedDate, onChange: (v) => set("csedDate", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Months Until CSED Expires", hint: "Auto-calculated from your CSED date above." }, /* @__PURE__ */ React.createElement(
    Input,
    {
      value: data.csedDate ? Math.max(0, Math.round((new Date(data.csedDate) - /* @__PURE__ */ new Date()) / (1e3 * 60 * 60 * 24 * 30.44))) + " months" : "\u2014",
      readOnly: true,
      style: { background: "#f8f6f1", color: "#555" }
    }
  ))), data.knowsCSED === "Multiple" && /* @__PURE__ */ React.createElement(Field, { label: "CSED Notes", hint: "Enter the CSED dates for each tax year if known." }, /* @__PURE__ */ React.createElement(Input, { value: data.csedNotes, onChange: (v) => set("csedNotes", v), placeholder: "e.g. 2018 \u2192 03/15/2029, 2019 \u2192 04/15/2030" })), !data.knowsCSED || data.knowsCSED === "No" && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "To find your CSED, call ACS at 1-800-829-7650 and ask for the Collection Statute Expiration Date for each tax year. You can also request a Tax Account Transcript at IRS.gov which shows assessment dates \u2014 add 10 years to find your CSED.")), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, 'Answer all questions below. Select "No" if not applicable \u2014 do not leave blank.'), /* @__PURE__ */ React.createElement(YesNo, { value: data.lawsuit, onChange: (v) => set("lawsuit", v), label: "Are you currently a party to a lawsuit?" }), data.lawsuit === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Plaintiff or Defendant?" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.lawsuitRole,
      onChange: (v) => set("lawsuitRole", v),
      options: [{ value: "Plaintiff", label: "Plaintiff" }, { value: "Defendant", label: "Defendant" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Location of Filing" }, /* @__PURE__ */ React.createElement(Input, { value: data.lawsuitLocation, onChange: (v) => set("lawsuitLocation", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Represented by" }, /* @__PURE__ */ React.createElement(Input, { value: data.lawsuitAttorney, onChange: (v) => set("lawsuitAttorney", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Docket / Case Number" }, /* @__PURE__ */ React.createElement(Input, { value: data.lawsuitDocket, onChange: (v) => set("lawsuitDocket", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Amount of Suit" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.lawsuitAmount, onChange: (v) => set("lawsuitAmount", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Possible Completion Date" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.lawsuitDate, onChange: (v) => set("lawsuitDate", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "Subject of Suit" }, /* @__PURE__ */ React.createElement(Input, { value: data.lawsuitSubject, onChange: (v) => set("lawsuitSubject", v) }))), /* @__PURE__ */ React.createElement(YesNo, { value: data.bankruptcy, onChange: (v) => set("bankruptcy", v), label: "Have you ever filed for bankruptcy?" }), data.bankruptcy === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F If you are ", /* @__PURE__ */ React.createElement("strong", null, "currently in an active bankruptcy"), ", you are not eligible to apply for an Offer in Compromise."), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Date Filed" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.bankruptcyFiled, onChange: (v) => set("bankruptcyFiled", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Date Dismissed" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.bankruptcyDismissed, onChange: (v) => set("bankruptcyDismissed", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Date Discharged" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.bankruptcyDischarged, onChange: (v) => set("bankruptcyDischarged", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Petition Number" }, /* @__PURE__ */ React.createElement(Input, { value: data.bankruptcyPetition, onChange: (v) => set("bankruptcyPetition", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Location Filed" }, /* @__PURE__ */ React.createElement(Input, { value: data.bankruptcyLocation, onChange: (v) => set("bankruptcyLocation", v) })))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.livedAbroad,
      onChange: (v) => set("livedAbroad", v),
      label: "In the past 10 years, have you lived outside the U.S. for 6 months or longer?"
    }
  ), data.livedAbroad === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F Time spent abroad can ", /* @__PURE__ */ React.createElement("strong", null, "toll (pause) the CSED"), " \u2014 the 10-year collection clock. The IRS may have more time to collect than you think."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Date Departed" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.abroadFrom, onChange: (v) => set("abroadFrom", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Date Returned" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.abroadTo, onChange: (v) => set("abroadTo", v) })))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.beneficiaryTrust,
      onChange: (v) => set("beneficiaryTrust", v),
      label: "Are you a beneficiary of a trust, estate, or life insurance policy?"
    }
  ), data.beneficiaryTrust === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Name of Trust/Estate/Policy" }, /* @__PURE__ */ React.createElement(Input, { value: data.trustName, onChange: (v) => set("trustName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "EIN" }, /* @__PURE__ */ React.createElement(Input, { value: data.trustEin, onChange: (v) => set("trustEin", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Anticipated Amount to Receive" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.trustAmount, onChange: (v) => set("trustAmount", v) })), /* @__PURE__ */ React.createElement(Field, { label: "When will it be received?" }, /* @__PURE__ */ React.createElement(Input, { value: data.trustWhen, onChange: (v) => set("trustWhen", v) })))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.isTrustee,
      onChange: (v) => set("isTrustee", v),
      label: "Are you a trustee, fiduciary, or contributor of a trust?"
    }
  ), data.isTrustee === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Name of Trust" }, /* @__PURE__ */ React.createElement(Input, { value: data.trusteeTrustName, onChange: (v) => set("trusteeTrustName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "EIN" }, /* @__PURE__ */ React.createElement(Input, { value: data.trusteeEin, onChange: (v) => set("trusteeEin", v) })))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.safeDeposit,
      onChange: (v) => set("safeDeposit", v),
      label: "Do you have a safe deposit box (personal or business)?"
    }
  ), data.safeDeposit === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Location / Bank Name" }, /* @__PURE__ */ React.createElement(Input, { value: data.safeDepositLocation, onChange: (v) => set("safeDepositLocation", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Box Number" }, /* @__PURE__ */ React.createElement(Input, { value: data.safeDepositBox, onChange: (v) => set("safeDepositBox", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Approximate Value of Contents" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.safeDepositValue, onChange: (v) => set("safeDepositValue", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "Contents (describe)" }, /* @__PURE__ */ React.createElement(Input, { value: data.safeDepositContents, onChange: (v) => set("safeDepositContents", v) }))), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.assetTransfer,
      onChange: (v) => set("assetTransfer", v),
      label: "In the past 10 years, have you transferred any asset worth more than $10,000 for less than full value?"
    }
  ), data.assetTransfer === "Yes" && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F The IRS may treat transferred assets as still available for collection if they were transferred to avoid paying taxes."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Description of Asset" }, /* @__PURE__ */ React.createElement(Input, { value: data.transferAsset, onChange: (v) => set("transferAsset", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Value at Time of Transfer" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.transferValue, onChange: (v) => set("transferValue", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Date Transferred" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: data.transferDate, onChange: (v) => set("transferDate", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Transferred To Whom" }, /* @__PURE__ */ React.createElement(Input, { value: data.transferTo, onChange: (v) => set("transferTo", v) })))));
}
function StepAssets({ data, set }) {
  const addItem = (key, item = {}) => set(key, [...data[key] || [], item]);
  const updateItem = (key, i, field, val) => {
    const arr = [...data[key] || []];
    arr[i] = { ...arr[i], [field]: val };
    set(key, arr);
  };
  const removeItem = (key, i) => {
    const arr = [...data[key] || []];
    arr.splice(i, 1);
    set(key, arr);
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Include all assets \u2014 domestic and foreign" }, "Personal Asset Information"), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "List all accounts and assets, even if the balance is zero. The IRS will verify this information against financial records."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F4B3} Bank Accounts"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Include checking, savings, online accounts, money market, PayPal, stored value cards, etc."), (data.bankAccounts || []).map((acct, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Account ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("bankAccounts", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Bank Name & Address" }, /* @__PURE__ */ React.createElement(Input, { value: acct.bankName, onChange: (v) => updateItem("bankAccounts", i, "bankName", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Account Number" }, /* @__PURE__ */ React.createElement(Input, { value: acct.accountNumber, onChange: (v) => updateItem("bankAccounts", i, "accountNumber", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Account Type" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: acct.type,
      onChange: (v) => updateItem("bankAccounts", i, "type", v),
      options: [{ value: "Checking", label: "Checking" }, { value: "Savings", label: "Savings" }, { value: "Money Market", label: "Money Market / CD" }, { value: "Online", label: "Online Account" }, { value: "Stored Value", label: "Stored Value Card" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Current Balance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: acct.balance, onChange: (v) => updateItem("bankAccounts", i, "balance", v) }))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("bankAccounts"), label: "Add bank account" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F4C8} Investments"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Stocks, bonds, mutual funds, CDs, IRAs, 401(k), Keogh, commodities, etc."), (data.investments || []).map((inv, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Investment ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("investments", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Institution Name & Address" }, /* @__PURE__ */ React.createElement(Input, { value: inv.institution, onChange: (v) => updateItem("investments", i, "institution", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Account Number" }, /* @__PURE__ */ React.createElement(Input, { value: inv.accountNumber, onChange: (v) => updateItem("investments", i, "accountNumber", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Type" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: inv.type,
      onChange: (v) => updateItem("investments", i, "type", v),
      options: [{ value: "IRA", label: "IRA" }, { value: "401k", label: "401(k)" }, { value: "Stocks", label: "Stocks" }, { value: "Bonds", label: "Bonds" }, { value: "Mutual Fund", label: "Mutual Fund" }, { value: "CD", label: "Certificate of Deposit" }, { value: "Other", label: "Other" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Current Market Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: inv.value, onChange: (v) => updateItem("investments", i, "value", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Loan Balance (if any)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: inv.loan, onChange: (v) => updateItem("investments", i, "loan", v) }))), inv.value && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginTop: 4 } }, "Equity: ", fmt(Math.max(0, num(inv.value) - num(inv.loan)))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("investments"), label: "Add investment account" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F6E1}\uFE0F Life Insurance (Cash Value Only)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Only whole life or universal life policies with cash surrender value. Term life has no cash value \u2014 list term life payments in expenses only."), /* @__PURE__ */ React.createElement(YesNo, { value: data.hasLifeInsurance, onChange: (v) => set("hasLifeInsurance", v), label: "Do you own any life insurance policies with cash value?" }), data.hasLifeInsurance === "Yes" && (data.lifeInsurance || []).map((li, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Policy ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("lifeInsurance", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Insurance Company Name & Address" }, /* @__PURE__ */ React.createElement(Input, { value: li.company, onChange: (v) => updateItem("lifeInsurance", i, "company", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Policy Number" }, /* @__PURE__ */ React.createElement(Input, { value: li.policyNum, onChange: (v) => updateItem("lifeInsurance", i, "policyNum", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Current Cash Surrender Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: li.cashValue, onChange: (v) => updateItem("lifeInsurance", i, "cashValue", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Outstanding Loan Balance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: li.loan, onChange: (v) => updateItem("lifeInsurance", i, "loan", v) }))))), data.hasLifeInsurance === "Yes" && /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("lifeInsurance"), label: "Add life insurance policy" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F3E0} Real Property"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Include all real estate you own or are purchasing \u2014 home, rental property, vacant land, timeshares, etc."), (data.realEstate || []).map((re, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Property ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("realEstate", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Property Description" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: re.type,
      onChange: (v) => updateItem("realEstate", i, "type", v),
      options: [{ value: "Primary Residence", label: "Primary Residence" }, { value: "Rental", label: "Rental Property" }, { value: "Vacant Land", label: "Vacant Land" }, { value: "Timeshare", label: "Timeshare" }, { value: "Other", label: "Other" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Purchase Date" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: re.purchaseDate, onChange: (v) => updateItem("realEstate", i, "purchaseDate", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "Property Address (Street, City, State, ZIP, County)" }, /* @__PURE__ */ React.createElement(Input, { value: re.address, onChange: (v) => updateItem("realEstate", i, "address", v) })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Current Fair Market Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: re.fmv, onChange: (v) => updateItem("realEstate", i, "fmv", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Current Loan Balance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: re.loan, onChange: (v) => updateItem("realEstate", i, "loan", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Monthly Payment" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: re.payment, onChange: (v) => updateItem("realEstate", i, "payment", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Lender Name & Address" }, /* @__PURE__ */ React.createElement(Input, { value: re.lender, onChange: (v) => updateItem("realEstate", i, "lender", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Date of Final Payment" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: re.finalPayment, onChange: (v) => updateItem("realEstate", i, "finalPayment", v) }))), re.fmv && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d" } }, "Equity (FMV \u2212 Loan): ", fmt(Math.max(0, num(re.fmv) - num(re.loan)))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("realEstate"), label: "Add property" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F697} Vehicles"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Cars, trucks, boats, motorcycles, RVs, trailers \u2014 owned or leased."), (data.vehicles || []).map((v2, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Vehicle ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("vehicles", i) })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Year" }, /* @__PURE__ */ React.createElement(Input, { value: v2.year, onChange: (v) => updateItem("vehicles", i, "year", v), placeholder: "e.g., 2019" })), /* @__PURE__ */ React.createElement(Field, { label: "Make" }, /* @__PURE__ */ React.createElement(Input, { value: v2.make, onChange: (v) => updateItem("vehicles", i, "make", v), placeholder: "e.g., Honda" })), /* @__PURE__ */ React.createElement(Field, { label: "Model" }, /* @__PURE__ */ React.createElement(Input, { value: v2.model, onChange: (v) => updateItem("vehicles", i, "model", v), placeholder: "e.g., Accord" }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Mileage" }, /* @__PURE__ */ React.createElement(Input, { value: v2.mileage, onChange: (v) => updateItem("vehicles", i, "mileage", v), placeholder: "e.g., 87000" })), /* @__PURE__ */ React.createElement(Field, { label: "License / Tag Number" }, /* @__PURE__ */ React.createElement(Input, { value: v2.tag, onChange: (v) => updateItem("vehicles", i, "tag", v) })), /* @__PURE__ */ React.createElement(Field, { label: "VIN" }, /* @__PURE__ */ React.createElement(Input, { value: v2.vin, onChange: (v) => updateItem("vehicles", i, "vin", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Owned or Leased?" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: v2.owned,
      onChange: (v) => updateItem("vehicles", i, "owned", v),
      options: [{ value: "Own", label: "Owned" }, { value: "Lease", label: "Leased" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Purchase / Lease Date" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: v2.purchaseDate, onChange: (v) => updateItem("vehicles", i, "purchaseDate", v) }))), v2.owned === "Own" && /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Current Market Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: v2.fmv, onChange: (v) => updateItem("vehicles", i, "fmv", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Loan Balance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: v2.loan, onChange: (v) => updateItem("vehicles", i, "loan", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Monthly Payment" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: v2.payment, onChange: (v) => updateItem("vehicles", i, "payment", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Lender / Lessor Name" }, /* @__PURE__ */ React.createElement(Input, { value: v2.lender, onChange: (v) => updateItem("vehicles", i, "lender", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Date of Final Payment" }, /* @__PURE__ */ React.createElement(Input, { type: "date", value: v2.finalPayment, onChange: (v) => updateItem("vehicles", i, "finalPayment", v) }))), v2.fmv && v2.owned === "Own" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d" } }, "Equity: ", fmt(Math.max(0, num(v2.fmv) - num(v2.loan)))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("vehicles"), label: "Add vehicle" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F4B3} Credit Cards & Lines of Credit"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "List all credit cards and lines of credit, even with zero balance."), (data.creditCards || []).map((cc, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Card / Line ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("creditCards", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Card Type / Issuer" }, /* @__PURE__ */ React.createElement(Input, { value: cc.type, onChange: (v) => updateItem("creditCards", i, "type", v), placeholder: "e.g., Visa, Mastercard, HELOC" })), /* @__PURE__ */ React.createElement(Field, { label: "Credit Limit" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: cc.limit, onChange: (v) => updateItem("creditCards", i, "limit", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Balance Owed" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: cc.balance, onChange: (v) => updateItem("creditCards", i, "balance", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Minimum Monthly Payment" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: cc.minPayment, onChange: (v) => updateItem("creditCards", i, "minPayment", v) }))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("creditCards"), label: "Add credit card / line of credit" })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F48E} Other Valuable Assets"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 10 } }, "Jewelry, artwork, collections, antiques, business interests, domain names, patents, digital assets (cryptocurrency), etc."), (data.otherAssets || []).map((oa, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Asset ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => removeItem("otherAssets", i) })), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Description" }, /* @__PURE__ */ React.createElement(Input, { value: oa.description, onChange: (v) => updateItem("otherAssets", i, "description", v), placeholder: "e.g., Gold jewelry collection, Bitcoin holdings" })), /* @__PURE__ */ React.createElement(Field, { label: "Current Market Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: oa.value, onChange: (v) => updateItem("otherAssets", i, "value", v) }))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => addItem("otherAssets"), label: "Add other asset" })));
}
function StepIncome({ data, set, bizData, empData }) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";
  const calcMonthly = (gross, period) => {
    const g = num(gross);
    if (!g) return 0;
    switch (period) {
      case "Weekly":
        return g * 4.3;
      case "Biweekly":
        return g * 2.17;
      case "Semimonthly":
        return g * 2;
      case "Monthly":
        return g;
      default:
        return g;
    }
  };
  const monthlyWages = calcMonthly(empData.grossPay, empData.payPeriod);
  const spouseMonthlyWages = calcMonthly(empData.spouseGrossPay, empData.spousePayPeriod);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Enter average monthly amounts for all income sources" }, "Monthly Income"), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "Enter ", /* @__PURE__ */ React.createElement("strong", null, "gross"), " amounts before taxes for wages. For self-employment, enter ", /* @__PURE__ */ React.createElement("strong", null, "net"), " income after ordinary business expenses. Do not enter negative numbers \u2014 if a source is a loss, enter 0."), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a2d5a" } }, "Wages & Salary"), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Your Gross Monthly Wages", hint: monthlyWages ? `Calculated from pay stub: ${fmt(monthlyWages)}` : "Enter gross monthly amount" }, /* @__PURE__ */ React.createElement(
    MoneyInput,
    {
      value: data.wages || (monthlyWages ? Math.round(monthlyWages).toString() : ""),
      onChange: (v) => set("wages", v)
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Spouse Gross Monthly Wages", hint: spouseMonthlyWages ? `Calculated: ${fmt(spouseMonthlyWages)}` : "" }, /* @__PURE__ */ React.createElement(
    MoneyInput,
    {
      value: data.spouseWages || (spouseMonthlyWages ? Math.round(spouseMonthlyWages).toString() : ""),
      onChange: (v) => set("spouseWages", v)
    }
  )))), isSelfEmp && /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a2d5a" } }, "Business Income (Sole Proprietorship \u2014 Schedule C)"), /* @__PURE__ */ React.createElement(InfoBox, { type: "tip" }, "Enter average monthly figures. You may use 3, 6, 9, or 12 month averages. Do not include depreciation as an expense \u2014 it is a non-cash deduction not allowed by the IRS for collection purposes."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Accounting Period Used" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.bizPeriod,
      onChange: (v) => set("bizPeriod", v),
      options: [{ value: "3", label: "3-month average" }, { value: "6", label: "6-month average" }, { value: "9", label: "9-month average" }, { value: "12", label: "12-month average" }]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Gross Monthly Receipts / Revenue" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizGrossReceipts, onChange: (v) => set("bizGrossReceipts", v) }))), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 10, marginTop: 10, color: "#555" } }, "Monthly Business Expenses"), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Materials Purchased" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizMaterials, onChange: (v) => set("bizMaterials", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Inventory Purchased" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizInventory, onChange: (v) => set("bizInventory", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Gross Wages & Salaries Paid" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizWages, onChange: (v) => set("bizWages", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Rent" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizRent, onChange: (v) => set("bizRent", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Supplies" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizSupplies, onChange: (v) => set("bizSupplies", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Utilities / Telephone" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizUtilities, onChange: (v) => set("bizUtilities", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Vehicle (Gas, Oil, Repairs)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizVehicle, onChange: (v) => set("bizVehicle", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Repairs & Maintenance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizRepairs, onChange: (v) => set("bizRepairs", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Business Insurance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizInsurance, onChange: (v) => set("bizInsurance", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Current Business Taxes" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizTaxes, onChange: (v) => set("bizTaxes", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Other Business Expenses" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.bizOther, onChange: (v) => set("bizOther", v) }))), (() => {
    const totalExp = ["bizMaterials", "bizInventory", "bizWages", "bizRent", "bizSupplies", "bizUtilities", "bizVehicle", "bizRepairs", "bizInsurance", "bizTaxes", "bizOther"].reduce((s, k) => s + num(data[k]), 0);
    const netInc = Math.max(0, num(data.bizGrossReceipts) - totalExp);
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#1e8449" } }, /* @__PURE__ */ React.createElement("strong", null, "Net Monthly Business Income:"), " ", fmt(netInc), totalExp > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#7f8c8d", fontSize: 12, marginLeft: 8 } }, "(Revenue ", fmt(num(data.bizGrossReceipts)), " \u2212 Expenses ", fmt(totalExp), ")"));
  })()), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a2d5a" } }, "Other Monthly Income"), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Your Social Security" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.ssTaxpayer, onChange: (v) => set("ssTaxpayer", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Spouse Social Security" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.ssSpouse, onChange: (v) => set("ssSpouse", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Pension (Taxpayer)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.pensionTaxpayer, onChange: (v) => set("pensionTaxpayer", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Pension (Spouse)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.pensionSpouse, onChange: (v) => set("pensionSpouse", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Net Rental Income", hint: "After ordinary expenses \u2014 do not deduct depreciation" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.rentalIncome, onChange: (v) => set("rentalIncome", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Distributions (K-1, partnerships, S-Corp)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.distributions, onChange: (v) => set("distributions", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Child Support Received" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.childSupportReceived, onChange: (v) => set("childSupportReceived", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Alimony Received" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.alimonyReceived, onChange: (v) => set("alimonyReceived", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Unemployment Income" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.unemployment, onChange: (v) => set("unemployment", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Interest / Dividends" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.interestDividends, onChange: (v) => set("interestDividends", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Other Income (describe below)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.otherIncome, onChange: (v) => set("otherIncome", v) }))), data.otherIncome > 0 && /* @__PURE__ */ React.createElement(Field, { label: "Describe other income source" }, /* @__PURE__ */ React.createElement(Input, { value: data.otherIncomeDesc, onChange: (v) => set("otherIncomeDesc", v), placeholder: "e.g., sharing economy, gambling, rent subsidy" }))));
}
function StepExpenses({ data, set, personalData }) {
  const householdSize = Math.max(1, num(personalData.householdUnder65) + num(personalData.householdOver65));
  const hasOver65 = num(personalData.householdOver65) > 0;
  const hhKey = Math.min(5, householdSize);
  const foodStd = IRS_STANDARDS.food_clothing_misc[hhKey] || 1659;
  const healthStd = hasOver65 ? IRS_STANDARDS.out_of_pocket_health.over65 : IRS_STANDARDS.out_of_pocket_health.under65;
  const housingStd = IRS_STANDARDS.housing_utilities[hhKey] || 2793;
  const vehicleCount = Math.min(2, (personalData.vehicles || []).length || 0);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Enter your actual monthly expenses \u2014 IRS standards shown alongside" }, "Monthly Living Expenses"), /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, /* @__PURE__ */ React.createElement("strong", null, "IRS Collection Financial Standards"), " apply to expenses. For food/clothing/misc and out-of-pocket health care, you are entitled to the full standard amount even if you spend less. For all other categories, enter your actual expense \u2014 the IRS will compare it to the standard."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginBottom: 20 } }, "Household size detected: ", /* @__PURE__ */ React.createElement("strong", null, householdSize, " ", householdSize === 1 ? "person" : "people")), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a" } }, "\u{1F6D2} Food, Clothing & Miscellaneous"), /* @__PURE__ */ React.createElement("div", { style: { background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1e8449" } }, "IRS Standard: ", fmt(foodStd), "/mo")), /* @__PURE__ */ React.createElement(InfoBox, { type: "tip" }, "You are entitled to claim the full standard amount of ", fmt(foodStd), " for your household size, even if you spend less. Enter the standard amount unless your actual expenses are higher."), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Food (Actual)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.food, onChange: (v) => set("food", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Housekeeping Supplies" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.housekeeping, onChange: (v) => set("housekeeping", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Clothing & Services" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.clothing, onChange: (v) => set("clothing", v) }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Personal Care" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.personalCare, onChange: (v) => set("personalCare", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Miscellaneous (credit card min payments, bank fees, etc.)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.miscellaneous, onChange: (v) => set("miscellaneous", v) })))), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a" } }, "\u{1F3E0} Housing & Utilities"), /* @__PURE__ */ React.createElement("div", { style: { background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" } }, "IRS Standard: ", fmt(housingStd), "/mo")), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "Enter your actual expenses. Include your primary residence only. If mortgage is listed in assets, enter only taxes and insurance not already included in the mortgage payment."), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Rent (if renting)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.rent, onChange: (v) => set("rent", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Electricity, Gas, Water, Trash" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.utilities, onChange: (v) => set("utilities", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Phone / Cell / Internet / Cable" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.phone, onChange: (v) => set("phone", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Real Estate Taxes & Insurance (if not in mortgage)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.propTaxInsurance, onChange: (v) => set("propTaxInsurance", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Maintenance & Repairs" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.maintenance, onChange: (v) => set("maintenance", v) })))), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a2d5a" } }, "\u{1F697} Transportation"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" } }, "Ownership std: ", fmt(IRS_STANDARDS.transportation_ownership * vehicleCount), "/mo (", vehicleCount, " vehicle", vehicleCount !== 1 ? "s" : "", ")"), /* @__PURE__ */ React.createElement("div", { style: { background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" } }, "Operating std: ", fmt(IRS_STANDARDS.transportation_operating), "/mo")), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Vehicle Loan / Lease Payment(s)", hint: "Monthly payment(s) \u2014 up to 2 vehicles" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.vehiclePayment, onChange: (v) => set("vehiclePayment", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Vehicle Operating Costs", hint: "Gas, insurance, maintenance, registration, parking, tolls" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.vehicleOperating, onChange: (v) => set("vehicleOperating", v) }))), /* @__PURE__ */ React.createElement(Field, { label: "Public Transportation (if applicable)", hint: "Bus, train, taxi, ferry \u2014 if no vehicle or in addition to vehicle" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.publicTransit, onChange: (v) => set("publicTransit", v) }))), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a" } }, "\u{1F3E5} Health Care"), /* @__PURE__ */ React.createElement("div", { style: { background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1e8449" } }, "Out-of-pocket standard: ", fmt(healthStd * householdSize), "/mo")), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Health Insurance Premiums (actual)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.healthInsurance, onChange: (v) => set("healthInsurance", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Out-of-Pocket Health Care Costs", hint: "Prescriptions, dental, vision, medical services not covered by insurance" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.outOfPocketHealth, onChange: (v) => set("outOfPocketHealth", v) })))), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#1a2d5a" } }, "\u{1F4CB} Other Expenses"), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Child / Dependent Care" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.childCare, onChange: (v) => set("childCare", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Term Life Insurance Premiums" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.termLife, onChange: (v) => set("termLife", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Court-Ordered Child Support Paid" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.childSupportPaid, onChange: (v) => set("childSupportPaid", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Court-Ordered Alimony Paid" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.alimonyPaid, onChange: (v) => set("alimonyPaid", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Other Court-Ordered Payments" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.otherCourtOrdered, onChange: (v) => set("otherCourtOrdered", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Current Year Fed/State Income Taxes" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.currentTaxes, onChange: (v) => set("currentTaxes", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Employer-Required Retirement" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.requiredRetirement, onChange: (v) => set("requiredRetirement", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Voluntary Retirement Contributions", hint: "Generally not allowed by IRS unless required by employer" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.voluntaryRetirement, onChange: (v) => set("voluntaryRetirement", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Union Dues" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.unionDues, onChange: (v) => set("unionDues", v) }))), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Delinquent State / Local Taxes (min. payment)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.delinquentStateTax, onChange: (v) => set("delinquentStateTax", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Federal Student Loans (min. payment)", hint: "Government-guaranteed loans only" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.studentLoans, onChange: (v) => set("studentLoans", v) })), /* @__PURE__ */ React.createElement(Field, { label: "Secured Debts (attach list)" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.securedDebts, onChange: (v) => set("securedDebts", v) })))));
}
function calcResults(personalData, empData, incomeData, expenseData, bizData, assetsData) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";
  const householdSize = Math.max(1, num(personalData.householdUnder65) + num(personalData.householdOver65));
  const hasOver65 = num(personalData.householdOver65) > 0;
  const hhKey = Math.min(5, householdSize);
  const assets = assetsData || {};
  const calcMonthly = (gross, period) => {
    const g = num(gross);
    if (!g) return 0;
    switch (period) {
      case "Weekly":
        return g * 4.3;
      case "Biweekly":
        return g * 2.17;
      case "Semimonthly":
        return g * 2;
      default:
        return g;
    }
  };
  const wages = num(incomeData.wages) || calcMonthly(empData.grossPay, empData.payPeriod);
  const spouseWages = personalData.spouseOnDebt === "Yes" ? num(incomeData.spouseWages) || calcMonthly(empData.spouseGrossPay, empData.spousePayPeriod) : 0;
  const FICA_RATE = 0.0765;
  const ficaTaxpayer = wages * FICA_RATE;
  const ficaSpouse = spouseWages * FICA_RATE;
  const ficaTotal = ficaTaxpayer + ficaSpouse;
  const netBizIncome = isSelfEmp ? Math.max(0, num(incomeData.bizGrossReceipts) - [
    "bizMaterials",
    "bizInventory",
    "bizWages",
    "bizRent",
    "bizSupplies",
    "bizUtilities",
    "bizVehicle",
    "bizRepairs",
    "bizInsurance",
    "bizTaxes",
    "bizOther"
  ].reduce((s, k) => s + num(incomeData[k]), 0)) : 0;
  const totalIncome = wages + spouseWages + netBizIncome + num(incomeData.ssTaxpayer) + num(incomeData.ssSpouse) + num(incomeData.pensionTaxpayer) + num(incomeData.pensionSpouse) + num(incomeData.rentalIncome) + num(incomeData.distributions) + num(incomeData.childSupportReceived) + num(incomeData.alimonyReceived) + num(incomeData.unemployment) + num(incomeData.interestDividends) + num(incomeData.otherIncome);
  const foodStd = IRS_STANDARDS.food_clothing_misc[hhKey];
  const healthStd = (hasOver65 ? IRS_STANDARDS.out_of_pocket_health.over65 : IRS_STANDARDS.out_of_pocket_health.under65) * householdSize;
  const housingStd = IRS_STANDARDS.housing_utilities[hhKey];
  const vehicleCount = Math.min(2, (assets.vehicles || []).length);
  const vehicleOwnershipStd = IRS_STANDARDS.transportation_ownership * vehicleCount;
  const vehicleOperatingStd = IRS_STANDARDS.transportation_operating;
  const foodActual = num(expenseData.food) + num(expenseData.housekeeping) + num(expenseData.clothing) + num(expenseData.personalCare) + num(expenseData.miscellaneous);
  const foodAllowed = Math.max(foodActual, foodStd);
  const housingActual = num(expenseData.rent) + num(expenseData.utilities) + num(expenseData.phone) + num(expenseData.propTaxInsurance) + num(expenseData.maintenance);
  const housingAllowed = Math.min(housingActual || housingStd, housingStd);
  const vehiclePaymentActual = num(expenseData.vehiclePayment);
  const vehicleOwnershipAllowed = Math.min(vehiclePaymentActual || vehicleOwnershipStd, vehicleOwnershipStd);
  const vehicleOperatingActual = num(expenseData.vehicleOperating);
  const vehicleOperatingAllowed = Math.min(vehicleOperatingActual || vehicleOperatingStd, vehicleOperatingStd);
  const publicTransit = num(expenseData.publicTransit);
  const healthInsurance = num(expenseData.healthInsurance);
  const oopActual = num(expenseData.outOfPocketHealth);
  const oopAllowed = Math.max(oopActual, healthStd);
  const otherExpenses = num(expenseData.childCare) + num(expenseData.termLife) + num(expenseData.childSupportPaid) + num(expenseData.alimonyPaid) + num(expenseData.otherCourtOrdered) + num(expenseData.currentTaxes) + num(expenseData.requiredRetirement) + num(expenseData.delinquentStateTax) + num(expenseData.studentLoans) + num(expenseData.securedDebts);
  const totalAllowedExpenses = ficaTotal + foodAllowed + housingAllowed + vehicleOwnershipAllowed + vehicleOperatingAllowed + publicTransit + healthInsurance + oopAllowed + otherExpenses;
  const netDisposable = Math.max(0, totalIncome - totalAllowedExpenses);
  const bankTotal = (assets.bankAccounts || []).reduce((s, a) => s + num(a.balance), 0);
  const investmentTotal = (assets.investments || []).reduce((s, inv) => {
    const equity = Math.max(0, num(inv.value) - num(inv.loan));
    return s + equity * 0.8;
  }, 0);
  const lifeInsTotal = (assets.lifeInsurance || []).reduce((s, li) => {
    const equity = Math.max(0, num(li.cashValue) - num(li.loan));
    return s + equity * 0.8;
  }, 0);
  const realEstateTotal = (assets.realEstate || []).reduce((s, re) => {
    const equity = Math.max(0, num(re.fmv) - num(re.loan));
    return s + equity * 0.8;
  }, 0);
  const vehicleEquityRaw = (assets.vehicles || []).reduce((s, v) => {
    if (v.owned !== "Own") return s;
    const equity = Math.max(0, num(v.fmv) - num(v.loan));
    return s + equity * 0.8;
  }, 0);
  const vehicleAllowance = Math.min(vehicleCount, (assets.vehicles || []).filter((v) => v.owned === "Own").length) * 3450;
  const vehicleTotal = Math.max(0, vehicleEquityRaw - vehicleAllowance);
  const otherAssetTotal = (assets.otherAssets || []).reduce((s, oa) => s + num(oa.value) * 0.8, 0);
  const boxA = bankTotal + investmentTotal + lifeInsTotal + realEstateTotal + vehicleTotal + otherAssetTotal;
  const boxB = 0;
  const boxAB = boxA + boxB;
  const boxC = netBizIncome;
  const boxD = totalIncome;
  const oicOtherExpenses = num(expenseData.childCare) + num(expenseData.termLife) + num(expenseData.childSupportPaid) + num(expenseData.alimonyPaid) + num(expenseData.otherCourtOrdered) + num(expenseData.currentTaxes) + num(expenseData.requiredRetirement);
  const boxE = ficaTotal + foodAllowed + housingAllowed + vehicleOwnershipAllowed + vehicleOperatingAllowed + publicTransit + healthInsurance + oopAllowed + oicOtherExpenses;
  const boxF = Math.max(0, boxD - boxE);
  const boxG = boxF * 12;
  const boxH = boxF * 24;
  const minOfferCash = boxAB + boxG;
  const minOfferDeferred = boxAB + boxH;
  const inActiveBankruptcy = bizData.bankruptcy === "Yes" && !personalData.bankruptcyDischarged && !personalData.bankruptcyDismissed;
  const oicIneligible = false;
  let recommendation = "";
  let recColor = "#2c3e50";
  let recBg = "#f8f9fa";
  if (netDisposable <= 0) {
    recommendation = "Currently Not Collectible (CNC)";
    recColor = "#1e8449";
    recBg = "#eafaf1";
  } else if (netDisposable < 200) {
    recommendation = "Possibly Currently Not Collectible (CNC) or Partial Pay IA (PPIA)";
    recColor = "#7d6608";
    recBg = "#fef9e7";
  } else if (netDisposable < 500) {
    recommendation = "Partial Pay Installment Agreement (PPIA) or Simple Installment Agreement";
    recColor = "#1a5276";
    recBg = "#ebf5fb";
  } else {
    recommendation = "Installment Agreement \u2014 Simple IA or Non-Streamlined IA";
    recColor = "#5d2f86";
    recBg = "#f5eef8";
  }
  return {
    // Income/expense basics
    totalIncome,
    netBizIncome,
    totalAllowedExpenses,
    netDisposable,
    ficaTaxpayer,
    ficaSpouse,
    ficaTotal,
    foodAllowed,
    foodStd,
    housingAllowed,
    housingStd,
    vehicleOwnershipAllowed,
    vehicleOperatingAllowed,
    healthInsurance,
    oopAllowed,
    healthStd,
    otherExpenses,
    wages,
    spouseWages,
    // OIC Boxes
    boxA,
    boxB,
    boxAB,
    boxC,
    boxD,
    boxE,
    boxF,
    boxG,
    boxH,
    minOfferCash,
    minOfferDeferred,
    // Asset breakdown for OIC
    bankTotal,
    investmentTotal,
    lifeInsTotal,
    realEstateTotal,
    vehicleEquityRaw,
    vehicleAllowance,
    vehicleTotal,
    otherAssetTotal,
    vehicleCount,
    // Recommendation
    recommendation,
    recColor,
    recBg
  };
}
function StepOIC({ data, set, allData }) {
  const { personal, otherinfo, business } = allData;
  const inActiveBankruptcy = otherinfo?.bankruptcy === "Yes" && !otherinfo?.bankruptcyDischarged && !otherinfo?.bankruptcyDismissed;
  const r = calcResults(personal, allData.employment, allData.income, allData.expenses, business, allData.assets);
  const householdSize = Math.max(1, num(personal.householdUnder65) + num(personal.householdOver65));
  const fpl = 15060 + (householdSize - 1) * 5380;
  const lowIncomeThreshold = fpl * 2.5 / 12;
  const qualifiesLowIncome = r.totalIncome <= lowIncomeThreshold;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Complete this section if you are considering an Offer in Compromise" }, "Offer in Compromise Details"), inActiveBankruptcy && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26D4 ", /* @__PURE__ */ React.createElement("strong", null, "OIC Not Available."), " You indicated an active bankruptcy. The IRS cannot consider an OIC while bankruptcy is pending. Complete this section only if you expect the bankruptcy to be discharged or dismissed before you submit."), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "An Offer in Compromise lets you settle your tax debt for less than the full amount if the IRS cannot reasonably collect it all. The amount you offer must equal your ", /* @__PURE__ */ React.createElement("strong", null, "Reasonable Collection Potential (RCP)"), " \u2014 your reachable assets plus a multiple of your future disposable income. This step collects information specific to the OIC application."), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Why are you submitting an Offer?" }, "Basis of Offer"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Field, { label: "Basis of Offer", required: true, hint: "Most taxpayers use Doubt as to Collectability. Select all that apply." }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, [
    { key: "basisDAC", label: "Doubt as to Collectability (DAC) \u2014 Cannot pay the full amount before the CSED" },
    { key: "basisDAL", label: "Doubt as to Liability (DAL) \u2014 Disagree that you owe the amount assessed" },
    { key: "basisETA", label: "Effective Tax Administration (ETA) \u2014 Full payment would create economic hardship or be inequitable" }
  ].map((opt) => /* @__PURE__ */ React.createElement("label", { key: opt.key, style: { display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: !!data[opt.key],
      onChange: (e) => set(opt.key, e.target.checked),
      style: { marginTop: 2, accentColor: "#7ec11f" }
    }
  ), /* @__PURE__ */ React.createElement("span", null, opt.label))))), data.basisDAL && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, /* @__PURE__ */ React.createElement("strong", null, "Doubt as to Liability:"), " If you are filing on this basis, you do not need to complete the financial disclosure sections of Form 433-A OIC. You will need to explain the basis for your disagreement in the OIC narrative."), data.basisETA && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, /* @__PURE__ */ React.createElement("strong", null, "Effective Tax Administration:"), " ETA offers require special justification. You must show that full collection would either create an economic hardship or would be unfair and inequitable given exceptional circumstances.")), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "List the specific tax years and form types you want included in the offer" }, "Tax Periods to Be Compromised"), /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F Only the tax years you list here will be included in the offer. Any year not listed remains fully collectible. Make sure every year with an outstanding balance is included."), (data.taxPeriods || []).map((tp, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Tax Period ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => {
    const d = [...data.taxPeriods];
    d.splice(i, 1);
    set("taxPeriods", d);
  } })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Form Type" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: tp.formType,
      onChange: (v) => {
        const d = [...data.taxPeriods];
        d[i] = { ...d[i], formType: v };
        set("taxPeriods", d);
      },
      options: [
        { value: "1040", label: "Form 1040 \u2014 Individual Income Tax" },
        { value: "1040A", label: "Form 1040-A" },
        { value: "1040EZ", label: "Form 1040-EZ" },
        { value: "941", label: "Form 941 \u2014 Employer's Quarterly Federal Tax" },
        { value: "940", label: "Form 940 \u2014 Federal Unemployment (FUTA)" },
        { value: "944", label: "Form 944 \u2014 Employer's Annual Federal Tax" },
        { value: "1120", label: "Form 1120 \u2014 Corporate Income Tax" },
        { value: "other", label: "Other" }
      ]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Tax Period (Year or Quarter)" }, /* @__PURE__ */ React.createElement(
    Input,
    {
      value: tp.period,
      onChange: (v) => {
        const d = [...data.taxPeriods];
        d[i] = { ...d[i], period: v };
        set("taxPeriods", d);
      },
      placeholder: "e.g. 2021, or Q2 2020"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Balance Owed" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: tp.balance, onChange: (v) => {
    const d = [...data.taxPeriods];
    d[i] = { ...d[i], balance: v };
    set("taxPeriods", d);
  } }))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => set("taxPeriods", [...data.taxPeriods || [], {}]), label: "Add tax period" }), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "How do you intend to pay the offer amount?" }, "Payment Terms"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(Field, { label: "Payment Option", required: true }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.paymentOption,
      onChange: (v) => set("paymentOption", v),
      options: [
        { value: "lump", label: "Lump Sum Cash \u2014 Pay 20% down with application, balance within 5 months of acceptance" },
        { value: "short", label: "Short-Term Periodic Payment \u2014 Monthly payments while IRS reviews + 24 months after acceptance" },
        { value: "deferred", label: "Deferred Periodic Payment \u2014 Monthly payments while IRS reviews + paid in 24 monthly installments after acceptance" }
      ]
    }
  )), data.paymentOption === "lump" && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, /* @__PURE__ */ React.createElement("strong", null, "Lump Sum:"), " You must submit ", /* @__PURE__ */ React.createElement("strong", null, "20% of your offer amount"), " with the application. The IRS applies this payment to your liability even if the offer is rejected. The remainder is due within 5 months of acceptance."), (data.paymentOption === "short" || data.paymentOption === "deferred") && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, /* @__PURE__ */ React.createElement("strong", null, "Periodic Payment:"), " You must begin making the proposed monthly payments with your application and continue them while the IRS considers the offer. These payments are also applied to your liability and are non-refundable."), data.paymentOption && /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Proposed Monthly Payment (periodic payment plans only)",
      hint: "Leave blank if selecting lump sum. This is your proposed installment \u2014 it must at minimum reflect your RCP over the payment period."
    },
    /* @__PURE__ */ React.createElement(MoneyInput, { value: data.proposedMonthlyPayment, onChange: (v) => set("proposedMonthlyPayment", v) })
  )), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "The OIC application fee is $205. Low-income taxpayers may qualify for a waiver." }, "Application Fee"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement("div", { style: { background: qualifiesLowIncome ? "#eafaf1" : "#f8f9fa", border: `1px solid ${qualifiesLowIncome ? "#27ae60" : "#ddd"}`, borderRadius: 8, padding: 14, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: qualifiesLowIncome ? "#1e8449" : "#2c3e50", marginBottom: 4 } }, qualifiesLowIncome ? "\u2705 You may qualify for the low-income fee waiver" : "Application fee: $205"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#555" } }, qualifiesLowIncome ? `Your monthly income (${fmt(r.totalIncome)}) is at or below 250% of the federal poverty guideline for a household of ${householdSize} (${fmt(lowIncomeThreshold)}/mo). You may check the low-income waiver box on Form 656 to waive the $205 fee and the initial payment requirement.` : `Your monthly income (${fmt(r.totalIncome)}) exceeds the 250% federal poverty guideline threshold (${fmt(lowIncomeThreshold)}/mo) for a household of ${householdSize}. The $205 application fee applies.`)), /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.claimFeeWaiver,
      onChange: (v) => set("claimFeeWaiver", v),
      label: "Do you want to claim the low-income fee and payment waiver on Form 656?"
    }
  ), data.claimFeeWaiver === "Yes" && !qualifiesLowIncome && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F Based on the income you entered, you may not meet the threshold for the low-income waiver. The IRS will verify eligibility. If the waiver is denied, the IRS will notify you and request the fee \u2014 the offer will not be rejected solely because the waiver was claimed.")), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Disclosure required on Form 656" }, "Prior OIC History"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.priorOIC,
      onChange: (v) => set("priorOIC", v),
      label: "Have you previously submitted an Offer in Compromise with the IRS?"
    }
  ), data.priorOIC === "Yes" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Year of Prior OIC" }, /* @__PURE__ */ React.createElement(Input, { type: "number", value: data.priorOICYear, onChange: (v) => set("priorOICYear", v), placeholder: "YYYY" })), /* @__PURE__ */ React.createElement(Field, { label: "Outcome" }, /* @__PURE__ */ React.createElement(
    Select,
    {
      value: data.priorOICOutcome,
      onChange: (v) => set("priorOICOutcome", v),
      options: [
        { value: "accepted", label: "Accepted" },
        { value: "rejected", label: "Rejected" },
        { value: "withdrawn", label: "Withdrawn" },
        { value: "returned", label: "Returned (processability)" },
        { value: "defaulted", label: "Accepted then defaulted" }
      ]
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Approximate Amount" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: data.priorOICAmount, onChange: (v) => set("priorOICAmount", v) }))), data.priorOICOutcome === "defaulted" && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "Prior OIC Default:"), " If a previously accepted OIC was defaulted, the full original liability is reinstated. The IRS will evaluate whether the current offer reflects changed financial circumstances. You should be prepared to explain what has changed."))), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Required disclosure on Form 433-A OIC" }, "Digital Assets (Cryptocurrency)"), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(
    YesNo,
    {
      value: data.hasDigitalAssets,
      onChange: (v) => set("hasDigitalAssets", v),
      label: "Do you currently hold any cryptocurrency or other digital assets?"
    }
  ), data.hasDigitalAssets === "Yes" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "The IRS considers digital assets to be property. They are subject to the same 80% quick-sale valuation as other investments and must be disclosed on Form 433-A OIC. Report the current USD equivalent value of all digital assets you hold."), (data.digitalAssets || []).map((da, i) => /* @__PURE__ */ React.createElement(Card, { key: i }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 13 } }, "Digital Asset ", i + 1), /* @__PURE__ */ React.createElement(RemoveButton, { onClick: () => {
    const d = [...data.digitalAssets];
    d.splice(i, 1);
    set("digitalAssets", d);
  } })), /* @__PURE__ */ React.createElement(Row3, null, /* @__PURE__ */ React.createElement(Field, { label: "Asset Type / Coin" }, /* @__PURE__ */ React.createElement(
    Input,
    {
      value: da.description,
      onChange: (v) => {
        const d = [...data.digitalAssets];
        d[i] = { ...d[i], description: v };
        set("digitalAssets", d);
      },
      placeholder: "e.g. Bitcoin, Ethereum, USDC"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Number of Units / Tokens" }, /* @__PURE__ */ React.createElement(Input, { value: da.units, onChange: (v) => {
    const d = [...data.digitalAssets];
    d[i] = { ...d[i], units: v };
    set("digitalAssets", d);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "Current USD Value" }, /* @__PURE__ */ React.createElement(MoneyInput, { value: da.usdValue, onChange: (v) => {
    const d = [...data.digitalAssets];
    d[i] = { ...d[i], usdValue: v };
    set("digitalAssets", d);
  } }))), /* @__PURE__ */ React.createElement(Row2, null, /* @__PURE__ */ React.createElement(Field, { label: "Where Held (exchange, wallet, custodian)" }, /* @__PURE__ */ React.createElement(Input, { value: da.location, onChange: (v) => {
    const d = [...data.digitalAssets];
    d[i] = { ...d[i], location: v };
    set("digitalAssets", d);
  } })), /* @__PURE__ */ React.createElement(Field, { label: "Account / Wallet Address" }, /* @__PURE__ */ React.createElement(Input, { value: da.accountNumber, onChange: (v) => {
    const d = [...data.digitalAssets];
    d[i] = { ...d[i], accountNumber: v };
    set("digitalAssets", d);
  } }))))), /* @__PURE__ */ React.createElement(AddButton, { onClick: () => set("digitalAssets", [...data.digitalAssets || [], {}]), label: "Add digital asset" }))), /* @__PURE__ */ React.createElement(SectionTitle, { sub: "Based on the financial information you entered" }, "Your Estimated RCP"), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 10, padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7ec11f", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 } }, "REASONABLE COLLECTION POTENTIAL SUMMARY"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 } }, [
    { label: "Box A \u2014 Asset Equity", val: r.boxA },
    { label: "Box F \u2014 Monthly RMI", val: r.boxF },
    { label: "Box G (\xD712) Cash", val: r.boxG }
  ].map((box) => /* @__PURE__ */ React.createElement("div", { key: box.label, style: { background: "rgba(200,169,110,0.1)", borderRadius: 8, padding: 12, border: "1px solid rgba(200,169,110,0.2)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", marginBottom: 4 } }, box.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: "#7ec11f" } }, fmt(box.val))))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(39,174,96,0.15)", borderRadius: 8, padding: 14, border: "1px solid rgba(39,174,96,0.3)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", marginBottom: 4 } }, "\u{1F4B5} Minimum Offer \u2014 Cash (5 months)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 800, color: "#27ae60" } }, fmt(r.minOfferCash))), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(200,169,110,0.1)", borderRadius: 8, padding: 14, border: "1px solid rgba(200,169,110,0.2)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", marginBottom: 4 } }, "\u{1F4C5} Minimum Offer \u2014 Deferred (24 months)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 800, color: "#7ec11f" } }, fmt(r.minOfferDeferred)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginTop: 12 } }, "These figures are estimates. The IRS may calculate a different RCP based on their independent review of your assets and allowable expenses.")));
}
function ACSCallPrep({ allData, results: r }) {
  const { personal, employment, income, expenses, assets, business, otherinfo } = allData;
  const [open, setOpen] = useState(false);
  const isAssignedRO = otherinfo?.revenueOfficer === "Yes";
  const hasBusiness = business?.hasBusiness === "Yes";
  const avgNote = "Have 3\u201312 months of bank statements, pay stubs, and receipts ready. The IRS rep will ask you to average these figures.";
  const Checklist = ({ items }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, items.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 10, fontSize: 13, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontWeight: 700, flexShrink: 0 } }, "\u2610"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2c3e50", lineHeight: 1.5 } }, item))));
  const Section = ({ title, color = "#1a2d5a", children }) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color, marginBottom: 10, borderBottom: `2px solid ${color}`, paddingBottom: 6 } }, title), children);
  return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 32, borderTop: "3px solid #7ec11f", paddingTop: 24 } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, cursor: "pointer" },
      onClick: () => setOpen((o) => !o)
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 800, color: "#1a2d5a" } }, "\u{1F4DE} Next Steps & ACS Call Preparation Guide"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7f8c8d", marginTop: 3 } }, "What to do now \u2014 how to contact the IRS, what to say, and what to have ready")),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, color: "#7ec11f", fontWeight: 700 } }, open ? "\u25B2" : "\u25BC")
  ), open && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { background: isAssignedRO ? "#eafaf1" : "#f8f9fa", border: `2px solid ${isAssignedRO ? "#27ae60" : "#ddd"}`, borderRadius: 8, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: isAssignedRO ? "#1e8449" : "#7f8c8d", marginBottom: 6 } }, isAssignedRO ? "\u2705 YOUR PATH: Revenue Officer" : "Revenue Officer Path"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#555", lineHeight: 1.6 } }, "A Revenue Officer has been assigned to your case. Do not call ACS. Contact your RO directly using the number on their business card or most recent letter. Submit Form 433-A (not 433-F) plus supporting documents to the RO by fax, mail, or in person. The RO has broader authority to negotiate than ACS.")), /* @__PURE__ */ React.createElement("div", { style: { background: !isAssignedRO ? "#ebf5fb" : "#f8f9fa", border: `2px solid ${!isAssignedRO ? "#3498db" : "#ddd"}`, borderRadius: 8, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: !isAssignedRO ? "#1a5276" : "#7f8c8d", marginBottom: 6 } }, !isAssignedRO ? "\u2705 YOUR PATH: ACS (Automated Collection System)" : "ACS Path"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#555", lineHeight: 1.6 } }, "Your case is with ACS. Call ", /* @__PURE__ */ React.createElement("strong", null, "1-800-829-7650"), " (individuals) or ", /* @__PURE__ */ React.createElement("strong", null, "1-800-829-3903"), " (businesses). ACS handles cases by phone. You can provide your 433-F information verbally, then fax a signed copy with documents to the ACS rep while on the phone."))), /* @__PURE__ */ React.createElement(Section, { title: "\u{1F4CB} Before You Call ACS \u2014 Documents to Have Ready", color: "#1a5276" }, /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, avgNote, " The IRS will ask you to average income and expenses. You can average over 3, 6, 9, or 12 months \u2014 use the period that most accurately reflects your current situation."), /* @__PURE__ */ React.createElement(Checklist, { items: [
    `Most recent 3 months of pay stubs \u2014 to verify wages of ${fmt(r.wages)}/month`,
    `Most recent 3 months of bank statements for all accounts`,
    `Most recent tax return (Form 1040)`,
    `Monthly bills and receipts for housing, utilities, car payments, insurance`,
    `Any IRS notices or letters related to this debt (have the notice number ready)`,
    `Your Social Security number and date of birth`,
    ...hasBusiness ? [`Business bank statements and profit/loss records for past 3\u20136 months`] : [],
    `Loan statements for any real estate, vehicles, or other secured debts`,
    `Your completed 433-F (downloaded above) \u2014 have it in front of you`
  ] })), /* @__PURE__ */ React.createElement(Section, { title: "\u{1F4DE} On the Call \u2014 What to Expect", color: "#2c3e50" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.8, marginBottom: 12 } }, "The ACS representative will take your financial information verbally from the 433-F. Here are the figures they will ask for, drawn from your intake:"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#2c3e50" } }, /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 12px", color: "#fff", textAlign: "left", fontSize: 12 } }, "What They'll Ask"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 12px", color: "#fff", textAlign: "right", fontSize: 12 } }, "Your Figure"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 12px", color: "#fff", textAlign: "left", fontSize: 12 } }, "Source"))), /* @__PURE__ */ React.createElement("tbody", null, [
    ["Monthly gross wages", fmt(r.wages), "Pay stubs"],
    ...r.spouseWages > 0 ? [["Spouse monthly wages", fmt(r.spouseWages), "Spouse pay stubs"]] : [],
    ...r.netBizIncome > 0 ? [["Net monthly business income", fmt(r.netBizIncome), "Business records"]] : [],
    ["FICA / payroll taxes", fmt(r.ficaTotal), "Calculated (7.65% of wages)"],
    ["Monthly housing + utilities", fmt(expenses.rent ? parseFloat(expenses.rent || 0) + parseFloat(expenses.utilities || 0) + parseFloat(expenses.phone || 0) : 0), "Bills / lease"],
    ["Monthly vehicle payment", fmt(expenses.vehiclePayment || 0), "Loan statement"],
    ["Monthly vehicle operating", fmt(expenses.vehicleOperating || 0), "Gas / insurance receipts"],
    ["Health insurance premium", fmt(expenses.healthInsurance || 0), "Insurance bill"],
    ["Total bank balances", fmt((assets.bankAccounts || []).reduce((s, a) => s + parseFloat(a.balance || 0), 0)), "Bank statements"],
    ["Total income", fmt(r.totalIncome), "All sources combined"],
    ["Total allowable expenses", fmt(r.totalAllowedExpenses), "IRS standards applied"],
    ["Net disposable income", fmt(r.netDisposable), "Determines resolution option"]
  ].map(([label, val, src], i) => /* @__PURE__ */ React.createElement("tr", { key: i, style: { background: i % 2 === 0 ? "#fff" : "#f8f9fa" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 12px", fontSize: 12, color: "#2c3e50" } }, label), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#1a2d5a" } }, val), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 12px", fontSize: 11, color: "#7f8c8d" } }, src))))), /* @__PURE__ */ React.createElement(Checklist, { items: [
    "Ask for the representative's name and ID number at the start of the call \u2014 write it down",
    "Ask for a fax number so you can send your signed 433-F and documents while on the phone",
    "If you have many documents, ask for the ACS Support Group fax number or mailing address to follow up",
    "If placed on hold, you can request a callback \u2014 do not hang up without confirming next steps",
    "Ask for a 30-day hold on any collection action while your case is being reviewed",
    "Write down the confirmation number, date, and time of every call"
  ] })), /* @__PURE__ */ React.createElement(Section, { title: "\u2709\uFE0F After the Call \u2014 What to Send", color: "#27ae60" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.6, marginBottom: 12 } }, "Fax or mail a complete package to the ACS rep or ACS Support Group. Include:"), /* @__PURE__ */ React.createElement(Checklist, { items: [
    "Signed Form 433-F (downloaded above) \u2014 signed in ink, date matches the call date",
    "3 months of pay stubs for yourself (and spouse if co-liable)",
    "3 months of bank statements for all accounts listed on the 433-F",
    "Mortgage or lease agreement / most recent statement showing payment amount",
    "Vehicle loan statements",
    "Health insurance premium documentation",
    ...hasBusiness ? ["3\u20136 months of business bank statements and profit/loss summary"] : [],
    "Cover sheet noting your name, SSN, the ACS representative's name/ID, and the date of your call"
  ] }), /* @__PURE__ */ React.createElement("div", { style: { background: "#fef9e7", border: "1px solid #f39c12", borderRadius: 8, padding: 14, marginTop: 14, fontSize: 13 } }, /* @__PURE__ */ React.createElement("strong", null, "\u26A0\uFE0F Fax confirmation:"), " Always print a fax confirmation page. If mailing, use certified mail with return receipt and keep your tracking number. The IRS loses documents \u2014 your proof of submission protects you.")), /* @__PURE__ */ React.createElement(Section, { title: `\u{1F5FA}\uFE0F Your Resolution Path \u2014 ${r.recommendation}`, color: r.recColor }, r.netDisposable <= 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Currently Not Collectible (CNC):"), " Tell the ACS rep your expenses exceed your income and you are requesting Currently Not Collectible status. They will review your 433-F. If approved, the IRS will shelve collection for 1\u20132 years and send you a periodic review notice. The CSED continues to run during CNC status \u2014 this is favorable to the taxpayer."), r.netDisposable > 0 && r.netDisposable < 200 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Borderline CNC / PPIA:"), " With ", fmt(r.netDisposable), "/month disposable income, you may qualify for CNC or a very low Partial Pay Installment Agreement. Tell the rep you are requesting the lowest possible installment agreement based on your financial disclosure. If your disposable income is ", fmt(r.netDisposable), " and the total balance exceeds what that would pay before the CSED, a PPIA is appropriate."), r.netDisposable >= 200 && r.netDisposable < 500 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Partial Pay Installment Agreement (PPIA):"), " Your disposable income of ", fmt(r.netDisposable), "/month is the starting point for an installment agreement. Request a PPIA if the balance owed exceeds what ", fmt(r.netDisposable), "/month would pay before the CSED. The ACS rep will propose an installment amount \u2014 you can negotiate based on your 433-F."), r.netDisposable >= 500 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#2c3e50", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Installment Agreement:"), " Your disposable income of ", fmt(r.netDisposable), "/month indicates a standard IA is likely. The ACS rep will propose a monthly payment \u2014 this should not exceed your net disposable income. If the balance is under $50,000 and you can pay within 72 months, you may qualify for a Streamlined IA which requires no financial disclosure."), (() => {
    const bal = parseFloat((allData.otherinfo?.totalIRSBalance || "").replace(/[^0-9.]/g, "")) || 0;
    if (!bal) return null;
    const base72 = Math.ceil(bal / 72);
    const estLow = base72 + 50;
    const estHigh = base72 + 100;
    const csedDate = allData.otherinfo?.csedDate;
    const csedMonths = csedDate ? Math.max(0, Math.round((new Date(csedDate) - /* @__PURE__ */ new Date()) / (1e3 * 60 * 60 * 24 * 30.44))) : null;
    const csedBase = csedMonths ? Math.ceil(bal / csedMonths) : null;
    const csedLow = csedBase ? csedBase + 50 : null;
    const csedHigh = csedBase ? csedBase + 100 : null;
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 10, padding: 16, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#7ec11f", fontWeight: "bold", fontSize: 13, marginBottom: 10 } }, "\u{1F4CA} Estimated Installment Agreement Payment"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: csedMonths ? "1fr 1fr" : "1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 11, marginBottom: 4 } }, "STREAMLINED (72 MONTHS)"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 22, fontWeight: "bold" } }, "$", estLow.toLocaleString(), " \u2013 $", estHigh.toLocaleString(), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: "normal" } }, "/mo")), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 11, marginTop: 4 } }, "Balance $", bal.toLocaleString(), " \xF7 72 + $50\u2013$100 penalties & interest")), csedMonths && csedBase && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 11, marginBottom: 4 } }, "CSED-BASED (", csedMonths, " MONTHS REMAINING)"), /* @__PURE__ */ React.createElement("div", { style: { color: "#fff", fontSize: 22, fontWeight: "bold" } }, "$", csedLow.toLocaleString(), " \u2013 $", csedHigh.toLocaleString(), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: "normal" } }, "/mo")), /* @__PURE__ */ React.createElement("div", { style: { color: "#aaa", fontSize: 11, marginTop: 4 } }, "Balance $", bal.toLocaleString(), " \xF7 ", csedMonths, " months + $50\u2013$100 penalties & interest"))), /* @__PURE__ */ React.createElement("div", { style: { color: "#888", fontSize: 11, marginTop: 10, fontStyle: "italic" } }, "\u26A0 These are estimated payment amounts only and are not guaranteed. Actual payments depend on your financial disclosure, IRS review, and negotiation. Penalties and interest continue to accrue on your remaining balance \u2014 like credit card interest \u2014 reducing your balance more slowly than the payment amount alone."), r.netDisposable > 0 && estLow > r.netDisposable && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 14px", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 12, color: "#92400e", marginBottom: 4 } }, "\u26A0 Your Estimated Payment Exceeds Your Disposable Income"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#92400e", lineHeight: 1.6 } }, "Your net monthly disposable income is ", /* @__PURE__ */ React.createElement("strong", null, fmt(r.netDisposable)), ", but your estimated 72-month payment starts at ", /* @__PURE__ */ React.createElement("strong", null, "$", estLow.toLocaleString(), "/month"), ". Since you cannot afford the standard installment amount, you may qualify for a", " ", /* @__PURE__ */ React.createElement("strong", null, "Partial Pay Installment Agreement (PPIA)"), " \u2014 a payment plan based on what you can actually afford, not what it would take to pay the full balance. Under a PPIA, you pay ", fmt(r.netDisposable), "/month (your disposable income), and any balance remaining when the CSED expires is legally forgiven. The IRS reviews PPIAs every two years to check if your financial situation has improved.")), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://www.irs.gov/online-payment-agreement-application",
        target: "_blank",
        rel: "noopener noreferrer",
        style: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "7px 14px", background: "#7ec11f", color: "#1a2d5a", borderRadius: 6, fontSize: 12, fontWeight: "bold", textDecoration: "none" }
      },
      "\u{1F517} Apply Online at IRS.gov \u2192"
    ));
  })()), /* @__PURE__ */ React.createElement("div", { style: { background: "#f8f6f1", border: "1px solid #ddd", borderRadius: 8, padding: 14, fontSize: 12, color: "#7f8c8d", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Remember:"), " You have the right to represent yourself before the IRS. You are not required to have an attorney or CPA. Be straightforward with the ACS representative \u2014 provide your documentation, state your position clearly, and ask for written confirmation of any agreement. If you feel a resolution is unfair or the rep is unresponsive, you may request a supervisor or contact the Taxpayer Advocate Service (TAS) at 1-877-777-4778.")));
}
function StepResults({ allData, onDownload, downloading, wizardLocked, showLockWarning, setShowLockWarning, lockConfirmed, setLockConfirmed, setWizardLocked }) {
  const { personal, employment, income, expenses, business, assets, otherinfo } = allData;
  const r = calcResults(personal, employment, income, expenses, business, assets);
  const hasBusiness = business.hasBusiness === "Yes";
  const inActiveBankruptcy = otherinfo?.bankruptcy === "Yes" && !otherinfo?.bankruptcyDischarged && !otherinfo?.bankruptcyDismissed;
  const TRow = ({ label, actual, allowed, isStd }) => /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13, color: "#2c3e50" } }, label), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13, textAlign: "right" } }, fmt(actual)), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13, textAlign: "right", color: isStd ? "#27ae60" : "#2c3e50", fontWeight: isStd ? 700 : 400 } }, fmt(allowed)));
  const BoxCard = ({ label, sublabel, value, color = "#1a2d5a", note }) => /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: `2px solid ${color}`, borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 140 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color } }, label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#555", marginTop: 2, marginBottom: 8, lineHeight: 1.4 } }, sublabel), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 800, color } }, fmt(value)), note && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#7f8c8d", marginTop: 4 } }, note));
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionTitle, null, "Financial Analysis & Resolution Results"), /* @__PURE__ */ React.createElement("div", { style: { background: r.recBg, border: `2px solid ${r.recColor}`, borderRadius: 10, padding: 20, marginBottom: 28, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: r.recColor, fontWeight: 700, letterSpacing: 1, marginBottom: 6 } }, "PRELIMINARY RESOLUTION RECOMMENDATION"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, color: r.recColor, fontWeight: 800 } }, r.recommendation), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginTop: 8 } }, "Based on net monthly disposable income of ", fmt(r.netDisposable), " after IRS allowable expenses"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7f8c8d", marginTop: 6, fontStyle: "italic" } }, "This is a preliminary analysis based on the information you provided. You have the right to represent yourself before the IRS \u2014 consulting a tax professional is an option, not a requirement, but may be helpful in complex situations.")), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a", marginBottom: 10 } }, "Monthly Income Summary"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#1a2d5a" } }, /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 } }, "Source"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 } }, "Amount"))), /* @__PURE__ */ React.createElement("tbody", null, r.wages > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Your Wages"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.wages))), r.spouseWages > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Spouse Wages (co-liable)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.spouseWages))), r.netBizIncome > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Net Business Income"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.netBizIncome))), num(income.ssTaxpayer) > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Social Security"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(income.ssTaxpayer))), num(income.pensionTaxpayer) > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Pension"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(income.pensionTaxpayer))), num(income.rentalIncome) > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Net Rental Income"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(income.rentalIncome))), num(income.distributions) > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Distributions"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(income.distributions))), num(income.interestDividends) > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Interest / Dividends"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(income.interestDividends)))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f0f3f4", fontWeight: 700 } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontSize: 14 } }, "Total Monthly Income"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", textAlign: "right", fontSize: 14 } }, fmt(r.totalIncome)))))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a", marginBottom: 10 } }, "Monthly Expenses \u2014 Actual vs. IRS Allowed"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#1a2d5a" } }, /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 } }, "Expense"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 } }, "Actual"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 } }, "IRS Allowed"))), /* @__PURE__ */ React.createElement("tbody", null, r.ficaTotal > 0 && /* @__PURE__ */ React.createElement(TRow, { label: "FICA \u2014 Social Security & Medicare (7.65%)", actual: r.ficaTotal, allowed: r.ficaTotal }), /* @__PURE__ */ React.createElement(TRow, { label: "Food, Clothing & Misc", actual: num(expenses.food) + num(expenses.housekeeping) + num(expenses.clothing) + num(expenses.personalCare) + num(expenses.miscellaneous), allowed: r.foodAllowed, isStd: r.foodAllowed === r.foodStd }), /* @__PURE__ */ React.createElement(TRow, { label: "Housing & Utilities", actual: num(expenses.rent) + num(expenses.utilities) + num(expenses.phone) + num(expenses.propTaxInsurance) + num(expenses.maintenance), allowed: r.housingAllowed }), /* @__PURE__ */ React.createElement(TRow, { label: "Vehicle Ownership", actual: num(expenses.vehiclePayment), allowed: r.vehicleOwnershipAllowed }), /* @__PURE__ */ React.createElement(TRow, { label: "Vehicle Operating", actual: num(expenses.vehicleOperating), allowed: r.vehicleOperatingAllowed }), num(expenses.publicTransit) > 0 && /* @__PURE__ */ React.createElement(TRow, { label: "Public Transportation", actual: num(expenses.publicTransit), allowed: num(expenses.publicTransit) }), /* @__PURE__ */ React.createElement(TRow, { label: "Health Insurance", actual: num(expenses.healthInsurance), allowed: num(expenses.healthInsurance) }), /* @__PURE__ */ React.createElement(TRow, { label: "Out-of-Pocket Health Care", actual: num(expenses.outOfPocketHealth), allowed: r.oopAllowed, isStd: r.oopAllowed === r.healthStd }), r.otherExpenses > 0 && /* @__PURE__ */ React.createElement(TRow, { label: "Other Allowable Expenses", actual: r.otherExpenses, allowed: r.otherExpenses })), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#f0f3f4", fontWeight: 700 } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontSize: 14 } }, "Total Allowable Expenses"), /* @__PURE__ */ React.createElement("td", { colSpan: 2, style: { padding: "8px 10px", textAlign: "right", fontSize: 14 } }, fmt(r.totalAllowedExpenses)))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", color: "#f8f6f1", borderRadius: 10, padding: 20, marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7ec11f", fontWeight: 600 } }, "NET MONTHLY DISPOSABLE INCOME"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", marginTop: 4 } }, "Total Income \u2212 IRS Allowable Expenses")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 800, color: r.netDisposable <= 0 ? "#27ae60" : "#7ec11f" } }, fmt(r.netDisposable)))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "3px solid #7ec11f", paddingTop: 28, marginBottom: 28 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: "#1a2d5a" } }, "Offer in Compromise (OIC) Analysis"), /* @__PURE__ */ React.createElement("div", { style: { background: "#5d2f86", color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700 } }, "DOUBT AS TO COLLECTABILITY")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 1.6 } }, "An Offer in Compromise allows you to settle your tax debt for less than the full amount owed if the IRS cannot reasonably collect the full balance before the Collection Statute Expiration Date (CSED). The minimum offer is your ", /* @__PURE__ */ React.createElement("strong", null, "Reasonable Collection Potential (RCP)"), " \u2014 the sum of your net reachable assets plus a multiple of your future disposable income."), inActiveBankruptcy && /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26D4 ", /* @__PURE__ */ React.createElement("strong", null, "OIC Not Currently Available."), " You indicated an active bankruptcy. The IRS will not consider an Offer in Compromise while a bankruptcy case is pending. You must wait until the bankruptcy is discharged or dismissed before submitting an OIC."), !inActiveBankruptcy && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: "#1a2d5a", marginBottom: 10 } }, "Box A \u2014 Personal Asset Equity", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: "#7f8c8d", marginLeft: 8 } }, "Assets valued at 80% quick-sale value, minus any loans")), /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, "The IRS applies an ", /* @__PURE__ */ React.createElement("strong", null, "80% quick-sale factor"), " to most assets \u2014 reflecting what they could realistically recover in a forced sale. Cash and bank balances are taken at full value. Your primary vehicle has a $3,450 allowance subtracted before equity is counted."), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#2c3e50" } }, /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 } }, "Asset Category"), /* @__PURE__ */ React.createElement("th", { style: { padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 } }, "Quick-Sale Value"))), /* @__PURE__ */ React.createElement("tbody", null, r.bankTotal > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Cash & Bank Accounts (100%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.bankTotal))), r.investmentTotal > 0 && /* @__PURE__ */ React.createElement("tr", { style: { background: "#f9f9f9" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Investments & Retirement (80%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.investmentTotal))), r.lifeInsTotal > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Life Insurance Cash Value (80%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.lifeInsTotal))), r.realEstateTotal > 0 && /* @__PURE__ */ React.createElement("tr", { style: { background: "#f9f9f9" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Real Estate Equity (80%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.realEstateTotal))), r.vehicleEquityRaw > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Vehicle Equity (80%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.vehicleEquityRaw))), r.vehicleAllowance > 0 && /* @__PURE__ */ React.createElement("tr", { style: { background: "#f9f9f9" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13, color: "#27ae60" } }, "Less: Vehicle Allowance (", r.vehicleCount, " vehicle", r.vehicleCount !== 1 ? "s" : "", ")"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13, color: "#27ae60" } }, "\u2212", fmt(r.vehicleAllowance)))), r.otherAssetTotal > 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", fontSize: 13 } }, "Other Assets (80%)"), /* @__PURE__ */ React.createElement("td", { style: { padding: "6px 10px", textAlign: "right", fontSize: 13 } }, fmt(r.otherAssetTotal))), r.boxA === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 2, style: { padding: "10px", fontSize: 13, color: "#7f8c8d", textAlign: "center" } }, "No assets entered \u2014 enter asset values in Step 5"))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { style: { background: "#2c3e50" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", fontSize: 14, color: "#7ec11f", fontWeight: 700 } }, "Box A \u2014 Total Personal Asset Equity"), /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 10px", textAlign: "right", fontSize: 14, color: "#7ec11f", fontWeight: 700 } }, fmt(r.boxA)))))), hasBusiness && /* @__PURE__ */ React.createElement(InfoBox, { type: "info" }, /* @__PURE__ */ React.createElement("strong", null, "Box B \u2014 Business Asset Equity:"), " Your business entity has a 433-B on file. Business asset equity calculation requires the completed 433-B financials and will be added when that form is processed. For now, Box B = $0 in this estimate."), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: "#1a2d5a", marginBottom: 10 } }, "Future Income Component \u2014 Boxes D, E, F", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 400, color: "#7f8c8d", marginLeft: 8 } }, "OIC uses stricter expense standards than IA/CNC")), /* @__PURE__ */ React.createElement(InfoBox, { type: "warn" }, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "OIC expense standards are stricter"), " than regular installment agreement standards. Voluntary retirement contributions and student loan payments are generally ", /* @__PURE__ */ React.createElement("em", null, "not"), " allowed as deductions. The IRS also excludes unsecured debt minimum payments from the OIC expense calculation."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 } }, /* @__PURE__ */ React.createElement(BoxCard, { label: "Box D", sublabel: "Total Monthly Household Income", value: r.boxD, color: "#1a5276" }), /* @__PURE__ */ React.createElement(BoxCard, { label: "Box E", sublabel: "OIC Allowable Monthly Expenses", value: r.boxE, color: "#2c3e50" }), /* @__PURE__ */ React.createElement(BoxCard, { label: "Box F", sublabel: "Remaining Monthly Income (D \u2212 E)", value: r.boxF, color: r.boxF <= 0 ? "#1e8449" : "#7ec11f", note: r.boxF <= 0 ? "No future income component" : void 0 })), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", borderRadius: 10, padding: 20, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7ec11f", fontWeight: 700, marginBottom: 14, letterSpacing: 0.5 } }, "REASONABLE COLLECTION POTENTIAL (RCP)"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(200,169,110,0.12)", borderRadius: 8, padding: 16, border: "1px solid rgba(200,169,110,0.3)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7ec11f", fontWeight: 600, marginBottom: 4 } }, "\u{1F4B5} CASH OFFER (Lump Sum)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", marginBottom: 10 } }, "Pay within 5 months of acceptance", /* @__PURE__ */ React.createElement("br", null), "Box A+B + (Box F \xD7 12)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#f8f6f1", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box A (assets):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxA))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box B (business):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxB))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box G (F \xD7 12):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxG))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "Minimum Offer:"), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontSize: 16 } }, fmt(r.minOfferCash)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa" } }, "+ $205 application fee + 20% of offer amount down with submission")), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(200,169,110,0.08)", borderRadius: 8, padding: 16, border: "1px solid rgba(200,169,110,0.2)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7ec11f", fontWeight: 600, marginBottom: 4 } }, "\u{1F4C5} DEFERRED PAYMENT"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", marginBottom: 10 } }, "Pay in monthly installments over 6\u201324 months", /* @__PURE__ */ React.createElement("br", null), "Box A+B + (Box F \xD7 24)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#f8f6f1", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box A (assets):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxA))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box B (business):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxB))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", null, "Box H (F \xD7 24):"), /* @__PURE__ */ React.createElement("span", null, fmt(r.boxH))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f" } }, "Minimum Offer:"), /* @__PURE__ */ React.createElement("span", { style: { color: "#7ec11f", fontSize: 16 } }, fmt(r.minOfferDeferred)))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa" } }, "+ $205 application fee + 1st monthly payment with submission")))), /* @__PURE__ */ React.createElement("div", { style: { background: "#f5eef8", border: "1px solid #8e44ad", borderRadius: 8, padding: 16, fontSize: 13, color: "#4a235a", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, marginBottom: 8 } }, "\u{1F4CC} Before submitting an OIC, consider:"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, "\u2713 Must be in filing compliance \u2014 all required returns filed"), /* @__PURE__ */ React.createElement("div", null, "\u2713 Must be in payment compliance \u2014 current year estimated taxes paid"), /* @__PURE__ */ React.createElement("div", null, "\u2713 Cannot be in an active bankruptcy"), /* @__PURE__ */ React.createElement("div", null, "\u2713 CSED is tolled (paused) while an OIC is pending"), /* @__PURE__ */ React.createElement("div", null, "\u2713 5-year compliance period after acceptance \u2014 any default revives the full liability"), /* @__PURE__ */ React.createElement("div", null, "\u2713 IRS has 2 years to accept or reject; if no decision, offer is deemed accepted"), /* @__PURE__ */ React.createElement("div", null, "\u2713 Low-income taxpayers may qualify for fee waiver"), /* @__PURE__ */ React.createElement("div", null, "\u2713 Doubt as to Liability OIC is a separate track \u2014 no financial disclosure required")))))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: "#1a2d5a", marginBottom: 12 } }, "Forms That Will Be Generated"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, [
    { label: "Form 433-F (ACS)", key: "433f" },
    { label: "Form 433-A (Revenue Officer)", key: "433a" },
    ...hasBusiness ? [{ label: "Form 433-B (Business)", key: "433b" }] : [],
    { label: "Form 433-A OIC", key: "433aoic" },
    { label: "Form 656 (Offer Contract)", key: "656" }
  ].map((f) => /* @__PURE__ */ React.createElement("div", { key: f.key, style: { background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#1a5276", fontWeight: 600 } }, "\u2713 ", f.label)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" } }, [
    { key: "433f", label: "433-F (ACS)" },
    { key: "433a", label: "433-A (RO)" },
    ...hasBusiness ? [{ key: "433b", label: "433-B (Business)" }] : [],
    { key: "433aoic", label: "433-A OIC" },
    { key: "656", label: "Form 656" }
  ].map((f) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: f.key,
      onClick: () => {
        if (!lockConfirmed) {
          setShowLockWarning(true);
          return;
        }
        onDownload(f.key);
      },
      disabled: !!downloading || wizardLocked,
      style: { background: wizardLocked ? "#888" : "#1a2d5a", color: "#7ec11f", border: "none", borderRadius: 8, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: downloading || wizardLocked ? "default" : "pointer", opacity: downloading === f.key ? 0.7 : 1 }
    },
    downloading === f.key ? "Generating..." : wizardLocked ? "\u{1F512} Access Restricted" : `\u2B07 Download ${f.label}`
  ))), showLockWarning && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 16, padding: 36, maxWidth: 540, margin: 24, border: "3px solid #dc2626" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, textAlign: "center", marginBottom: 12 } }, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("h3", { style: { color: "#dc2626", textAlign: "center", marginBottom: 16, fontSize: 18 } }, "Important \u2014 Read Before Downloading"), /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 14, color: "#7f1d1d", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("strong", null, "Once you download your forms, your access to the Wizard will be restricted."), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("br", null), "This is intentional. The IRS will verify everything on your 433 forms against your actual financial records. Before downloading, make sure your entries match:", /* @__PURE__ */ React.createElement("ul", { style: { marginTop: 8, marginBottom: 0, paddingLeft: 20 } }, /* @__PURE__ */ React.createElement("li", null, "Pay stubs and W-2s (income must match exactly)"), /* @__PURE__ */ React.createElement("li", null, "Bank statements (balances and account numbers)"), /* @__PURE__ */ React.createElement("li", null, "Mortgage or rent statements (monthly payment amounts)"), /* @__PURE__ */ React.createElement("li", null, "Car loan and lease statements (payments and balances)"), /* @__PURE__ */ React.createElement("li", null, "Credit card statements (minimum payments and balances)"), /* @__PURE__ */ React.createElement("li", null, "Utility, insurance, and other monthly bills")), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("strong", null, "The IRS will adjust your 433 based on the documents you submit."), " Submitting incorrect figures \u2014 even unintentionally \u2014 can result in a higher payment amount or rejection of your resolution request. Accuracy protects you."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.6 } }, "If you realize you made a mistake after downloading, contact us at ", /* @__PURE__ */ React.createElement("strong", null, "info@taylortaxandfinancial.com"), " or call ", /* @__PURE__ */ React.createElement("strong", null, "(615) 953-7124"), " to request short-term access to correct a specific field."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setLockConfirmed(true);
        setShowLockWarning(false);
      },
      style: { flex: 1, padding: "12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14, cursor: "pointer" }
    },
    "I Understand \u2014 Download My Forms"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowLockWarning(false),
      style: { padding: "12px 20px", background: "transparent", border: "1px solid #ddd", borderRadius: 8, fontFamily: "Georgia, serif", cursor: "pointer" }
    },
    "Go Back & Review"
  )))), wizardLocked && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "2px solid #dc2626", borderRadius: 12, padding: 20, marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", color: "#dc2626", marginBottom: 8, fontSize: 15 } }, "\u{1F512} Wizard Access Restricted"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7f1d1d", lineHeight: 1.7, marginBottom: 12 } }, "Your documents have been downloaded. Wizard access has been restricted to protect the integrity of your IRS submission. The IRS will compare your 433 forms against your actual financial documents \u2014 make sure everything matches before submitting."), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#555" } }, "Made a mistake? Contact us to request short-term correction access:", " ", /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "mailto:info@taylortaxandfinancial.com?subject=Wizard Correction Request",
      style: { color: "#1a2d5a", fontWeight: "bold" }
    },
    "info@taylortaxandfinancial.com"
  ), " ", "or call ", /* @__PURE__ */ React.createElement("strong", null, "(615) 953-7124"))), downloading && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontSize: 13, color: "#7f8c8d" } }, "Generating filled PDF\u2026 this may take a moment."), /* @__PURE__ */ React.createElement(ACSCallPrep, { allData, results: r }));
}
function IRSIntakeWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [downloading, setDownloading] = useState(null);
  const [wizardLocked, setWizardLocked] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [lockConfirmed, setLockConfirmed] = useState(false);
  const [hasAccess, setHasAccess] = useState(window.__WIZARD_ACCESS__ || false);
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((data) => {
      const access = data.access || [];
      setHasAccess(access.some((p) => ["wizard", "bundle"].includes(p)));
    }).catch(() => {
    });
  }, []);
  const STORAGE_KEY = "irs_pilot_intake";
  const defaultFormData = {
    personal: { dependents: [], vehicles: [] },
    business: { businesses: [{}] },
    employment: {},
    otherinfo: { totalIRSBalance: "", knowsCSED: "", csedDate: "", csedNotes: "" },
    assets: { bankAccounts: [], investments: [], lifeInsurance: [], realEstate: [], vehicles: [], creditCards: [], otherAssets: [] },
    income: {},
    expenses: {},
    oic: { taxPeriods: [], digitalAssets: [] }
  };
  const loadSaved = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultFormData;
    } catch {
      return defaultFormData;
    }
  };
  const [formData, setFormData] = useState(loadSaved);
  const [saveStatus, setSaveStatus] = useState(null);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch {
    }
  }, [formData]);
  const setSection = useCallback((section) => (key, value) => {
    setFormData((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);
  const handleExport = () => {
    const name = formData.personal?.lastName || "taxpayer";
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IRS-Intake-${name}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setFormData(data);
        setSaveStatus("loaded");
        setTimeout(() => setSaveStatus(null), 3e3);
      } catch {
        alert("Could not read that file. Make sure it is an IRS Pilot save file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const handleClear = () => {
    if (window.confirm("Clear all your saved information and start over?")) {
      setFormData(defaultFormData);
      setCurrentStep(0);
      localStorage.removeItem(STORAGE_KEY);
      setSaveStatus("cleared");
      setTimeout(() => setSaveStatus(null), 3e3);
    }
  };
  const handleDownload = async (formType) => {
    setDownloading(formType);
    const r = calcResults(
      formData.personal,
      formData.employment,
      formData.income,
      formData.expenses,
      formData.business,
      formData.assets
    );
    const enrichedData = {
      ...formData,
      oic: {
        ...formData.oic,
        minOfferCash: r.minOfferCash,
        minOfferDeferred: r.minOfferDeferred,
        boxA: r.boxA,
        boxF: r.boxF,
        boxG: r.boxG,
        boxH: r.boxH
      }
    };
    try {
      const response = await fetch("/api/generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, data: enrichedData })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IRS-${formType.toUpperCase()}-${formData.personal.lastName || "taxpayer"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setWizardLocked(true);
        try {
          await fetch("/api/wizard/lock", { method: "POST" });
        } catch {
        }
      } else {
        alert("PDF generation is handled server-side. Please use the print summary as an interim measure.");
      }
    } catch {
      alert("PDF generation requires server integration. Your data has been collected \u2014 use the summary to manually complete the forms.");
    }
    setDownloading(null);
  };
  const step = STEPS[currentStep];
  const progress = Math.round(currentStep / (STEPS.length - 1) * 100);
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", color: "#f8f6f1", padding: "16px 24px", borderBottom: "3px solid #7ec11f" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: "#7ec11f" } }, "IRS Financial Intake"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa" } }, "Form 433-A / 433-F / 433-B Auto-Fill System")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#7ec11f", textAlign: "right" } }, "Step ", currentStep + 1, " of ", STEPS.length, " \xA0\xB7\xA0", /* @__PURE__ */ React.createElement("span", { style: { color: "#aaa" } }, step.label)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, saveStatus && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: saveStatus === "cleared" ? "#f87171" : "#86efac", fontStyle: "italic" } }, saveStatus === "loaded" ? "\u2713 Progress restored" : saveStatus === "cleared" ? "\u2713 Cleared" : "\u2713 Saved"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExport,
      style: { fontSize: 11, padding: "4px 10px", background: "transparent", color: "#7ec11f", border: "1px solid #7ec11f", borderRadius: 4, cursor: "pointer" }
    },
    "\u2B07 Save File"
  ), /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, padding: "4px 10px", background: "transparent", color: "#7ec11f", border: "1px solid #7ec11f", borderRadius: 4, cursor: "pointer" } }, "\u2B06 Load File", /* @__PURE__ */ React.createElement("input", { type: "file", accept: ".json", onChange: handleImport, style: { display: "none" } })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClear,
      style: { fontSize: 11, padding: "4px 10px", background: "transparent", color: "#888", border: "1px solid #555", borderRadius: 4, cursor: "pointer" }
    },
    "\u2715 Clear"
  ))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#1a2d5a", padding: "0 24px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 820, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 10 } }, STEPS.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: i <= currentStep ? "#7ec11f" : "#374151",
    cursor: "pointer",
    transition: "background 0.3s"
  }, onClick: () => setCurrentStep(i) }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, STEPS.map((s, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: s.id,
      style: {
        fontSize: 12,
        color: i === currentStep ? "#7ec11f" : i < currentStep ? "#5a8f16" : "#6b7280",
        textAlign: "center",
        flex: 1,
        cursor: "pointer",
        padding: "4px 2px",
        borderRadius: 4,
        transition: "color 0.2s"
      },
      onClick: () => setCurrentStep(i),
      onMouseEnter: (e) => e.currentTarget.style.color = "#7ec11f",
      onMouseLeave: (e) => e.currentTarget.style.color = i === currentStep ? "#7ec11f" : i < currentStep ? "#5a8f16" : "#6b7280"
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, marginBottom: 3 } }, s.icon),
    /* @__PURE__ */ React.createElement("div", null, s.label)
  ))))), /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 820, margin: "0 auto", padding: "24px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e9ecef", padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" } }, !hasAccess && currentStep > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { filter: "blur(4px)", pointerEvents: "none", opacity: 0.4, minHeight: 300, background: "#f8f6f1", borderRadius: 12 } }, /* @__PURE__ */ React.createElement(StepBusiness, { data: formData.business, set: () => {
  } })), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "2px solid #7ec11f", borderRadius: 16, padding: "36px 32px", maxWidth: 420, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u{1F512}"), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "bold", fontSize: 18, color: "#1a2d5a", marginBottom: 8 } }, "Full Access Required"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#666", lineHeight: 1.7, marginBottom: 24 } }, "You've completed the free preview (Step 1 \u2014 Personal Info).", /* @__PURE__ */ React.createElement("br", null), "Purchase access to continue with all 9 steps and auto-fill your IRS forms."), /* @__PURE__ */ React.createElement("a", { href: "/pricing", style: { display: "inline-block", padding: "12px 24px", background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 15, textDecoration: "none", marginBottom: 12 } }, "View Pricing \u2192"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa" } }, "Already purchased? ", /* @__PURE__ */ React.createElement("a", { href: "/login", style: { color: "#1a2d5a" } }, "Sign in \u2192"))))), (hasAccess || currentStep === 0) && step.id === "personal" && /* @__PURE__ */ React.createElement(StepPersonal, { data: formData.personal, set: setSection("personal") }), hasAccess && step.id === "business" && /* @__PURE__ */ React.createElement(StepBusiness, { data: formData.business, set: setSection("business") }), hasAccess && step.id === "employment" && /* @__PURE__ */ React.createElement(StepEmployment, { data: formData.employment, set: setSection("employment"), bizData: formData.business, personalData: formData.personal }), hasAccess && step.id === "otherinfo" && /* @__PURE__ */ React.createElement(StepOtherInfo, { data: formData.otherinfo, set: setSection("otherinfo") }), hasAccess && step.id === "assets" && /* @__PURE__ */ React.createElement(StepAssets, { data: formData.assets, set: setSection("assets") }), hasAccess && step.id === "income" && /* @__PURE__ */ React.createElement(StepIncome, { data: formData.income, set: setSection("income"), bizData: formData.business, empData: formData.employment }), hasAccess && step.id === "expenses" && /* @__PURE__ */ React.createElement(StepExpenses, { data: formData.expenses, set: setSection("expenses"), personalData: formData.personal }), hasAccess && step.id === "oic" && /* @__PURE__ */ React.createElement(StepOIC, { data: formData.oic, set: setSection("oic"), allData: formData }), hasAccess && step.id === "results" && /* @__PURE__ */ React.createElement(
    StepResults,
    {
      allData: formData,
      onDownload: handleDownload,
      downloading,
      wizardLocked,
      showLockWarning,
      setShowLockWarning,
      lockConfirmed,
      setLockConfirmed,
      setWizardLocked
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid #e9ecef" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCurrentStep((s) => Math.max(0, s - 1)),
      disabled: currentStep === 0,
      style: {
        background: currentStep === 0 ? "#e9ecef" : "#fff",
        color: currentStep === 0 ? "#aaa" : "#1a2d5a",
        border: "1.5px solid",
        borderColor: currentStep === 0 ? "#e9ecef" : "#1a2d5a",
        borderRadius: 8,
        padding: "10px 24px",
        fontSize: 14,
        fontWeight: 600,
        cursor: currentStep === 0 ? "default" : "pointer"
      }
    },
    "\u2190 Back"
  ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#aaa", alignSelf: "center" } }, Math.round(currentStep / (STEPS.length - 1) * 100), "% complete"), currentStep < STEPS.length - 1 ? /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1)),
      style: {
        background: "#1a2d5a",
        color: "#7ec11f",
        border: "none",
        borderRadius: 8,
        padding: "10px 24px",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer"
      }
    },
    "Continue \u2192"
  ) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#7f8c8d", alignSelf: "center" } }, "\u2713 Review complete"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 16, lineHeight: 1.5 } }, "This tool is designed for self-help and informational purposes. You have the right to represent yourself before the IRS \u2014 many taxpayers do so successfully. That said, IRS collection cases can be complex, and consulting a qualified tax professional such as an Enrolled Agent, CPA, or tax attorney may help you get the best possible outcome. It is never required, but it is always an option. Taylor Tax and Financial Consulting Inc. | (615) 953-7124")));
}

window.IRSIntakeWizard = IRSIntakeWizard;
