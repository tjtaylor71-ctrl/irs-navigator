import { useState, useCallback } from "react";

// ─── IRS Collection Financial Standards (2024) ───────────────────────────────
const IRS_STANDARDS = {
  food_clothing_misc: {
    1: 785, 2: 1145, 3: 1302, 4: 1474, 5: 1659,
  },
  out_of_pocket_health: {
    under65: 79, over65: 153
  },
  housing_utilities: {
    // National maximums by household size (simplified — actual vary by county)
    1: 2025, 2: 2396, 3: 2659, 4: 2793, 5: 2793
  },
  transportation_ownership: 594,   // per vehicle, up to 2
  transportation_operating: 335,   // national standard
};

const fmt = (n) => n == null || n === "" ? "" : `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────
const STEPS = [
  { id: "personal",    label: "Personal Info",      icon: "👤" },
  { id: "business",    label: "Business Ownership", icon: "🏢" },
  { id: "employment",  label: "Employment",         icon: "💼" },
  { id: "otherinfo",   label: "Other Info",         icon: "📋" },
  { id: "assets",      label: "Assets",             icon: "🏦" },
  { id: "income",      label: "Income",             icon: "💰" },
  { id: "expenses",    label: "Expenses",           icon: "📊" },
  { id: "oic",         label: "OIC Details",        icon: "🤝" },
  { id: "results",     label: "Results",            icon: "✅" },
];

const COMMUNITY_PROPERTY_STATES = ["AZ","CA","ID","LA","NM","NV","TX","WA","WI"];

// ─── INPUT COMPONENTS ────────────────────────────────────────────────────────
const Field = ({ label, hint, children, required }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#2c3e50", marginBottom: 5 }}>
      {label}{required && <span style={{ color: "#e74c3c" }}> *</span>}
    </label>
    {hint && <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 4 }}>{hint}</div>}
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type}
    value={value || ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", padding: "9px 12px", border: "1.5px solid #dce0e5",
      borderRadius: 6, fontSize: 14, color: "#2c3e50", background: "#fff",
      boxSizing: "border-box", outline: "none", ...style
    }}
  />
);

const MoneyInput = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value || ""}
    onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
    placeholder={placeholder || "0"}
    style={{
      width: "100%", padding: "9px 12px", border: "1.5px solid #dce0e5",
      borderRadius: 6, fontSize: 14, color: "#2c3e50", background: "#fff",
      boxSizing: "border-box"
    }}
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value || ""}
    onChange={e => onChange(e.target.value)}
    style={{
      width: "100%", padding: "9px 12px", border: "1.5px solid #dce0e5",
      borderRadius: 6, fontSize: 14, color: "#2c3e50", background: "#fff",
      boxSizing: "border-box"
    }}
  >
    <option value="">— Select —</option>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const YesNo = ({ value, onChange, label }) => (
  <Field label={label}>
    <div style={{ display: "flex", gap: 12 }}>
      {["Yes", "No"].map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)}
            style={{ accentColor: "#c8a96e" }} />
          {opt}
        </label>
      ))}
    </div>
  </Field>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "2px solid #c8a96e" }}>
    <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>{children}</div>
    {sub && <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 3 }}>{sub}</div>}
  </div>
);

const Row2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>
);
const Row3 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{children}</div>
);

const InfoBox = ({ children, type = "info" }) => {
  const colors = {
    info: { bg: "#ebf5fb", border: "#3498db", text: "#1a5276" },
    warn: { bg: "#fef9e7", border: "#c8a96e", text: "#7d6608" },
    tip:  { bg: "#eafaf1", border: "#27ae60", text: "#1e8449" },
  };
  const c = colors[type];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: "12px 16px", marginBottom: 16, fontSize: 13, color: c.text, lineHeight: 1.5 }}>
      {children}
    </div>
  );
};

const AddButton = ({ onClick, label }) => (
  <button onClick={onClick} style={{
    background: "none", border: "1.5px dashed #c8a96e", color: "#c8a96e",
    borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer",
    marginTop: 6, fontWeight: 600
  }}>+ {label}</button>
);

const RemoveButton = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "#fdf2f2", border: "1px solid #f5c6cb", color: "#c0392b",
    borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer"
  }}>Remove</button>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#f8f9fa", border: "1px solid #e9ecef",
    borderRadius: 8, padding: 16, marginBottom: 12, ...style
  }}>{children}</div>
);

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepPersonal({ data, set }) {
  const isCommunity = COMMUNITY_PROPERTY_STATES.includes(data.state);
  return (
    <div>
      <SectionTitle sub="This information will appear on all IRS forms">Personal & Household Information</SectionTitle>

      <Row2>
        <Field label="Last Name" required><Input value={data.lastName} onChange={v => set("lastName", v)} /></Field>
        <Field label="First Name" required><Input value={data.firstName} onChange={v => set("firstName", v)} /></Field>
      </Row2>
      <Row3>
        <Field label="Date of Birth" required><Input type="date" value={data.dob} onChange={v => set("dob", v)} /></Field>
        <Field label="SSN or ITIN" required hint="Format: XXX-XX-XXXX"><Input value={data.ssn} onChange={v => set("ssn", v)} placeholder="XXX-XX-XXXX" /></Field>
        <Field label="Marital Status" required>
          <Select value={data.maritalStatus} onChange={v => set("maritalStatus", v)}
            options={[{value:"Married",label:"Married"},{value:"Single",label:"Single"},{value:"Divorced",label:"Divorced"},{value:"Widowed",label:"Widowed"}]} />
        </Field>
      </Row3>

      {data.maritalStatus === "Married" && (
        <div>
          <YesNo value={data.spouseOnDebt} onChange={v => set("spouseOnDebt", v)}
            label="Is your spouse also liable for the tax debt you are resolving?" />

          {data.spouseOnDebt === "Yes" && (
            <Card>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#1a1a2e" }}>Spouse Information — Co-Applicant</div>
              <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 12 }}>Your spouse's name, SSN, income, and assets will appear on the forms as a co-filer.</div>
              <Row2>
                <Field label="Spouse Last Name"><Input value={data.spouseLastName} onChange={v => set("spouseLastName", v)} /></Field>
                <Field label="Spouse First Name"><Input value={data.spouseFirstName} onChange={v => set("spouseFirstName", v)} /></Field>
              </Row2>
              <Row2>
                <Field label="Spouse Date of Birth"><Input type="date" value={data.spouseDob} onChange={v => set("spouseDob", v)} /></Field>
                <Field label="Spouse SSN or ITIN"><Input value={data.spouseSsn} onChange={v => set("spouseSsn", v)} placeholder="XXX-XX-XXXX" /></Field>
              </Row2>
            </Card>
          )}

          {data.spouseOnDebt === "No" && (
            <Card>
              <InfoBox type="warn">
                ⚠️ <strong>Non-Liable Spouse.</strong> Because your spouse does not owe this tax debt, their personal information will not appear on the forms as a co-filer. However, their income <em>does</em> affect your case — the IRS will use it to calculate what percentage of shared household expenses you can claim. Your spouse's income will be captured in the Household Income section below and reported as a contributing household member on the forms.
              </InfoBox>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#1a1a2e" }}>Spouse — Household Member</div>
              <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 12 }}>Enter your spouse's basic information. They will be listed as a household member, not a co-applicant.</div>
              <Row2>
                <Field label="Spouse Name"><Input value={data.spouseLastName} onChange={v => set("spouseLastName", v)} placeholder="First and last name" /></Field>
                <Field label="Age"><Input type="number" value={data.spouseAge} onChange={v => set("spouseAge", v)} /></Field>
              </Row2>
              <Field label="Spouse Monthly Income (if any)" hint="This is used to calculate your proportionate share of household expenses — it is not added to your income for IRS collection purposes">
                <MoneyInput value={data.spouseHouseholdIncome} onChange={v => set("spouseHouseholdIncome", v)} />
              </Field>
            </Card>
          )}
        </div>
      )}

      <Field label="Home Address" required>
        <Input value={data.address} onChange={v => set("address", v)} placeholder="Street address" />
      </Field>
      <Row3>
        <Field label="City" required><Input value={data.city} onChange={v => set("city", v)} /></Field>
        <Field label="State" required>
          <Select value={data.state} onChange={v => set("state", v)} options={
            ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
            .map(s => ({value:s,label:s}))
          }/>
        </Field>
        <Field label="ZIP Code" required><Input value={data.zip} onChange={v => set("zip", v)} /></Field>
      </Row3>
      <Field label="County of Residence" required><Input value={data.county} onChange={v => set("county", v)} /></Field>

      {isCommunity && (
        <InfoBox type="warn">
          ⚠️ <strong>{data.state} is a community property state.</strong> If you are married or were recently married, your spouse's income and assets may be relevant even if they are not on the tax debt. This affects how the IRS evaluates your financial situation.
        </InfoBox>
      )}

      <Row3>
        <Field label="Home Phone"><Input value={data.homePhone} onChange={v => set("homePhone", v)} placeholder="(xxx) xxx-xxxx" /></Field>
        <Field label="Cell Phone"><Input value={data.cellPhone} onChange={v => set("cellPhone", v)} placeholder="(xxx) xxx-xxxx" /></Field>
        <Field label="Work Phone"><Input value={data.workPhone} onChange={v => set("workPhone", v)} placeholder="(xxx) xxx-xxxx" /></Field>
      </Row3>

      <SectionTitle sub="Include everyone who lives in your home — children, dependents, and any non-liable spouse">Household Members</SectionTitle>
      <InfoBox type="info">
        Household size affects the IRS allowable expense standards the IRS will apply to your case. Include all people living in your home, whether or not they are claimed as dependents on your tax return.
      </InfoBox>
      <Row3>
        <Field label="People in household under 65"><Input type="number" value={data.householdUnder65} onChange={v => set("householdUnder65", v)} /></Field>
        <Field label="People in household 65 or over"><Input type="number" value={data.householdOver65} onChange={v => set("householdOver65", v)} /></Field>
      </Row3>

      {data.maritalStatus === "Married" && data.spouseOnDebt === "No" && (
        <InfoBox type="tip">
          Your non-liable spouse has been noted. Add them below as a household member and include their monthly income so the IRS can calculate your proportionate share of household expenses.
        </InfoBox>
      )}

      {(data.dependents || []).map((dep, i) => (
        <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Household Member {i + 1}</strong>
            <RemoveButton onClick={() => { const d = [...data.dependents]; d.splice(i,1); set("dependents", d); }} />
          </div>
          <Row3>
            <Field label="Name"><Input value={dep.name} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],name:v}; set("dependents",d); }} /></Field>
            <Field label="Age"><Input type="number" value={dep.age} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],age:v}; set("dependents",d); }} /></Field>
            <Field label="Relationship"><Input value={dep.relationship} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],relationship:v}; set("dependents",d); }} /></Field>
          </Row3>
          <Row2>
            <YesNo value={dep.claimedOnReturn} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],claimedOnReturn:v}; set("dependents",d); }} label="Claimed as dependent on your Form 1040?" />
            <YesNo value={dep.contributesIncome} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],contributesIncome:v}; set("dependents",d); }} label="Contributes to household income?" />
          </Row2>
          {dep.contributesIncome === "Yes" && (
            <Field label="Monthly contribution to household income" hint="Used to calculate your proportionate share of allowable expenses">
              <MoneyInput value={dep.monthlyIncome} onChange={v => { const d=[...data.dependents]; d[i]={...d[i],monthlyIncome:v}; set("dependents",d); }} />
            </Field>
          )}
        </Card>
      ))}
      <AddButton onClick={() => set("dependents", [...(data.dependents||[]), {}])} label="Add household member" />
    </div>
  );
}

function StepBusiness({ data, set }) {
  return (
    <div>
      <SectionTitle sub="This determines which forms are required">Business Ownership</SectionTitle>
      <InfoBox type="info">
        If you are a <strong>sole proprietor</strong> (file Schedule C), your business information is captured on your personal 433-A or 433-F — no separate form needed.<br /><br />
        If you have an ownership interest in a <strong>Partnership, S-Corporation, Corporation, or LLC</strong>, a separate <strong>Form 433-B</strong> will be required for that business entity.
      </InfoBox>

      <YesNo value={data.hasBusiness} onChange={v => set("hasBusiness", v)}
        label="Do you or your spouse have any ownership interest in a Partnership, S-Corporation, Corporation, or LLC?" />

      {data.hasBusiness === "Yes" && (
        <div>
          {(data.businesses || [{}]).map((biz, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <strong>Business Entity {i + 1}</strong>
                {i > 0 && <RemoveButton onClick={() => { const b=[...data.businesses]; b.splice(i,1); set("businesses",b); }} />}
              </div>
              <Row2>
                <Field label="Business Name" required>
                  <Input value={biz.name} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],name:v}; set("businesses",b); }} />
                </Field>
                <Field label="EIN (Employer Identification Number)">
                  <Input value={biz.ein} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],ein:v}; set("businesses",b); }} placeholder="XX-XXXXXXX" />
                </Field>
              </Row2>
              <Row2>
                <Field label="Type of Entity" required>
                  <Select value={biz.type} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],type:v}; set("businesses",b); }}
                    options={[
                      {value:"Partnership",label:"Partnership"},
                      {value:"S-Corporation",label:"S-Corporation"},
                      {value:"Corporation",label:"Corporation (C-Corp)"},
                      {value:"LLC-Corp",label:"LLC classified as Corporation"},
                      {value:"LLC-Other",label:"LLC (other)"},
                    ]} />
                </Field>
                <Field label="Your Ownership Percentage" required>
                  <Input value={biz.ownership} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],ownership:v}; set("businesses",b); }} placeholder="e.g., 50" />
                </Field>
              </Row2>
              <Row2>
                <Field label="Your Title">
                  <Input value={biz.title} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],title:v}; set("businesses",b); }} placeholder="e.g., President, Managing Member" />
                </Field>
                <Field label="Business Phone">
                  <Input value={biz.phone} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],phone:v}; set("businesses",b); }} placeholder="(xxx) xxx-xxxx" />
                </Field>
              </Row2>
              <Field label="Business Address">
                <Input value={biz.address} onChange={v => { const b=[...data.businesses]; b[i]={...b[i],address:v}; set("businesses",b); }} />
              </Field>
              <YesNo value={biz.responsiblePayroll}
                onChange={v => { const b=[...data.businesses]; b[i]={...b[i],responsiblePayroll:v}; set("businesses",b); }}
                label="Are you responsible for depositing payroll taxes for this business?" />
              {biz.responsiblePayroll === "Yes" && (
                <InfoBox type="warn">
                  ⚠️ <strong>Trust Fund Recovery Penalty (TFRP) Risk.</strong> If the business has unpaid payroll taxes, the IRS may hold you personally liable for the employee portion (the "trust fund" portion). This is assessed separately from the business debt and survives bankruptcy. A Revenue Officer will investigate this.
                </InfoBox>
              )}
            </Card>
          ))}
          <AddButton onClick={() => set("businesses", [...(data.businesses||[{}]), {}])} label="Add another business entity" />

          <YesNo value={data.isSoleProprietor} onChange={v => set("isSoleProprietor", v)}
            label="Do you also have self-employment income as a sole proprietor (Schedule C)?" />
          {data.isSoleProprietor === "Yes" && (
            <InfoBox type="tip">Your sole proprietorship information will be captured in Section 6 & 7 of your 433-A — no separate 433-B needed for that business.</InfoBox>
          )}
        </div>
      )}

      {data.hasBusiness === "No" && (
        <YesNo value={data.isSoleProprietor} onChange={v => set("isSoleProprietor", v)}
          label="Are you self-employed or do you have sole proprietor income (file Schedule C)?" />
      )}
    </div>
  );
}

function StepEmployment({ data, set, bizData, personalData }) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";
  return (
    <div>
      <SectionTitle sub="Complete for you and your spouse if employed">Employment Information</SectionTitle>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 14, color: "#1a1a2e", fontSize: 15 }}>Your Employment</div>
        <Field label="Current Employer Name">
          <Input value={data.employerName} onChange={v => set("employerName", v)} />
        </Field>
        <Field label="Employer Address">
          <Input value={data.employerAddress} onChange={v => set("employerAddress", v)} />
        </Field>
        <Row2>
          <Field label="Work Phone">
            <Input value={data.workPhone} onChange={v => set("workPhone", v)} placeholder="(xxx) xxx-xxxx" />
          </Field>
          <Field label="How long with this employer?">
            <Input value={data.employerDuration} onChange={v => set("employerDuration", v)} placeholder="e.g., 3 years 2 months" />
          </Field>
        </Row2>
        <Row2>
          <Field label="Occupation / Job Title">
            <Input value={data.occupation} onChange={v => set("occupation", v)} />
          </Field>
          <Field label="Pay Period">
            <Select value={data.payPeriod} onChange={v => set("payPeriod", v)}
              options={[{value:"Weekly",label:"Weekly"},{value:"Biweekly",label:"Bi-weekly (every 2 weeks)"},{value:"Semimonthly",label:"Semi-monthly (twice/month)"},{value:"Monthly",label:"Monthly"}]} />
          </Field>
        </Row2>
        <Row3>
          <Field label="Gross Pay Per Period" hint="Before taxes — do not deduct withholding">
            <MoneyInput value={data.grossPay} onChange={v => set("grossPay", v)} />
          </Field>
          <Field label="Federal Tax Withheld Per Period">
            <MoneyInput value={data.fedTax} onChange={v => set("fedTax", v)} />
          </Field>
          <Field label="State Tax Withheld Per Period">
            <MoneyInput value={data.stateTax} onChange={v => set("stateTax", v)} />
          </Field>
        </Row3>
        <YesNo value={data.canContactWork} onChange={v => set("canContactWork", v)}
          label="Can the IRS contact you at work if needed?" />
        <Field label="Number of dependents claimed on your W-4">
          <Input type="number" value={data.dependentsClaimed} onChange={v => set("dependentsClaimed", v)} />
        </Field>
      </Card>

      {personalData?.spouseOnDebt === "Yes" ? (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, color: "#1a1a2e", fontSize: 15 }}>Spouse Employment — Co-Applicant</div>
          <YesNo value={data.spouseEmployed} onChange={v => set("spouseEmployed", v)} label="Is your spouse currently employed?" />
          {data.spouseEmployed === "Yes" && (
            <>
              <Field label="Spouse Employer Name">
                <Input value={data.spouseEmployerName} onChange={v => set("spouseEmployerName", v)} />
              </Field>
              <Field label="Spouse Employer Address">
                <Input value={data.spouseEmployerAddress} onChange={v => set("spouseEmployerAddress", v)} />
              </Field>
              <Row2>
                <Field label="Occupation"><Input value={data.spouseOccupation} onChange={v => set("spouseOccupation", v)} /></Field>
                <Field label="Pay Period">
                  <Select value={data.spousePayPeriod} onChange={v => set("spousePayPeriod", v)}
                    options={[{value:"Weekly",label:"Weekly"},{value:"Biweekly",label:"Bi-weekly"},{value:"Semimonthly",label:"Semi-monthly"},{value:"Monthly",label:"Monthly"}]} />
                </Field>
              </Row2>
              <Row3>
                <Field label="Gross Pay Per Period">
                  <MoneyInput value={data.spouseGrossPay} onChange={v => set("spouseGrossPay", v)} />
                </Field>
                <Field label="Federal Tax Withheld">
                  <MoneyInput value={data.spouseFedTax} onChange={v => set("spouseFedTax", v)} />
                </Field>
                <Field label="State Tax Withheld">
                  <MoneyInput value={data.spouseStateTax} onChange={v => set("spouseStateTax", v)} />
                </Field>
              </Row3>
            </>
          )}
        </Card>
      ) : personalData?.maritalStatus === "Married" ? (
        <InfoBox type="info">
          Your spouse is a non-liable household member. Their income was captured in the Personal Info step and will be used to calculate your proportionate share of household expenses — it does not appear in the employment section of your forms.
        </InfoBox>
      ) : null}

      {isSelfEmp && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, color: "#1a1a2e", fontSize: 15 }}>Sole Proprietorship Information</div>
          <InfoBox type="tip">This section covers your Schedule C business. Income and expenses will be captured in the Income step.</InfoBox>
          <Row2>
            <Field label="Business Name (or your name if DBA)">
              <Input value={data.bizName} onChange={v => set("bizName", v)} />
            </Field>
            <Field label="Business EIN (if applicable)">
              <Input value={data.bizEin} onChange={v => set("bizEin", v)} placeholder="XX-XXXXXXX or N/A" />
            </Field>
          </Row2>
          <Row2>
            <Field label="Type of Business">
              <Input value={data.bizType} onChange={v => set("bizType", v)} placeholder="e.g., Plumbing, Consulting" />
            </Field>
            <Field label="Business Website">
              <Input value={data.bizWebsite} onChange={v => set("bizWebsite", v)} placeholder="www.example.com or N/A" />
            </Field>
          </Row2>
          <Row3>
            <Field label="Number of Employees">
              <Input type="number" value={data.bizEmployees} onChange={v => set("bizEmployees", v)} placeholder="0 if owner only" />
            </Field>
            <Field label="Average Gross Monthly Payroll">
              <MoneyInput value={data.bizPayroll} onChange={v => set("bizPayroll", v)} />
            </Field>
            <Field label="Frequency of Tax Deposits">
              <Select value={data.bizTaxDepFreq} onChange={v => set("bizTaxDepFreq", v)}
                options={[{value:"Monthly",label:"Monthly"},{value:"Semiweekly",label:"Semi-weekly"},{value:"Quarterly",label:"Quarterly"},{value:"Annual",label:"Annual"},{value:"NA",label:"N/A"}]} />
            </Field>
          </Row3>
          <YesNo value={data.bizEcommerce} onChange={v => set("bizEcommerce", v)} label="Does the business engage in e-commerce or internet sales?" />
        </Card>
      )}
    </div>
  );
}

function StepOtherInfo({ data, set }) {
  return (
    <div>
      <SectionTitle sub="The IRS requires answers to these questions on the 433-A">Other Financial Information</SectionTitle>
      <InfoBox type="info">Answer all questions. Select "No" if not applicable — do not leave blank.</InfoBox>

      <YesNo value={data.lawsuit} onChange={v => set("lawsuit", v)} label="Are you currently a party to a lawsuit?" />
      {data.lawsuit === "Yes" && (
        <Card>
          <Row2>
            <Field label="Plaintiff or Defendant?">
              <Select value={data.lawsuitRole} onChange={v => set("lawsuitRole", v)}
                options={[{value:"Plaintiff",label:"Plaintiff"},{value:"Defendant",label:"Defendant"}]} />
            </Field>
            <Field label="Location of Filing"><Input value={data.lawsuitLocation} onChange={v => set("lawsuitLocation", v)} /></Field>
          </Row2>
          <Row2>
            <Field label="Represented by"><Input value={data.lawsuitAttorney} onChange={v => set("lawsuitAttorney", v)} /></Field>
            <Field label="Docket / Case Number"><Input value={data.lawsuitDocket} onChange={v => set("lawsuitDocket", v)} /></Field>
          </Row2>
          <Row2>
            <Field label="Amount of Suit"><MoneyInput value={data.lawsuitAmount} onChange={v => set("lawsuitAmount", v)} /></Field>
            <Field label="Possible Completion Date"><Input type="date" value={data.lawsuitDate} onChange={v => set("lawsuitDate", v)} /></Field>
          </Row2>
          <Field label="Subject of Suit"><Input value={data.lawsuitSubject} onChange={v => set("lawsuitSubject", v)} /></Field>
        </Card>
      )}

      <YesNo value={data.bankruptcy} onChange={v => set("bankruptcy", v)} label="Have you ever filed for bankruptcy?" />
      {data.bankruptcy === "Yes" && (
        <Card>
          <InfoBox type="warn">⚠️ If you are <strong>currently in an active bankruptcy</strong>, you are not eligible to apply for an Offer in Compromise.</InfoBox>
          <Row3>
            <Field label="Date Filed"><Input type="date" value={data.bankruptcyFiled} onChange={v => set("bankruptcyFiled", v)} /></Field>
            <Field label="Date Dismissed"><Input type="date" value={data.bankruptcyDismissed} onChange={v => set("bankruptcyDismissed", v)} /></Field>
            <Field label="Date Discharged"><Input type="date" value={data.bankruptcyDischarged} onChange={v => set("bankruptcyDischarged", v)} /></Field>
          </Row3>
          <Row2>
            <Field label="Petition Number"><Input value={data.bankruptcyPetition} onChange={v => set("bankruptcyPetition", v)} /></Field>
            <Field label="Location Filed"><Input value={data.bankruptcyLocation} onChange={v => set("bankruptcyLocation", v)} /></Field>
          </Row2>
        </Card>
      )}

      <YesNo value={data.livedAbroad} onChange={v => set("livedAbroad", v)}
        label="In the past 10 years, have you lived outside the U.S. for 6 months or longer?" />
      {data.livedAbroad === "Yes" && (
        <Card>
          <InfoBox type="warn">⚠️ Time spent abroad can <strong>toll (pause) the CSED</strong> — the 10-year collection clock. The IRS may have more time to collect than you think.</InfoBox>
          <Row2>
            <Field label="Date Departed"><Input type="date" value={data.abroadFrom} onChange={v => set("abroadFrom", v)} /></Field>
            <Field label="Date Returned"><Input type="date" value={data.abroadTo} onChange={v => set("abroadTo", v)} /></Field>
          </Row2>
        </Card>
      )}

      <YesNo value={data.beneficiaryTrust} onChange={v => set("beneficiaryTrust", v)}
        label="Are you a beneficiary of a trust, estate, or life insurance policy?" />
      {data.beneficiaryTrust === "Yes" && (
        <Card>
          <Row2>
            <Field label="Name of Trust/Estate/Policy"><Input value={data.trustName} onChange={v => set("trustName", v)} /></Field>
            <Field label="EIN"><Input value={data.trustEin} onChange={v => set("trustEin", v)} /></Field>
          </Row2>
          <Row2>
            <Field label="Anticipated Amount to Receive"><MoneyInput value={data.trustAmount} onChange={v => set("trustAmount", v)} /></Field>
            <Field label="When will it be received?"><Input value={data.trustWhen} onChange={v => set("trustWhen", v)} /></Field>
          </Row2>
        </Card>
      )}

      <YesNo value={data.isTrustee} onChange={v => set("isTrustee", v)}
        label="Are you a trustee, fiduciary, or contributor of a trust?" />
      {data.isTrustee === "Yes" && (
        <Card>
          <Row2>
            <Field label="Name of Trust"><Input value={data.trusteeTrustName} onChange={v => set("trusteeTrustName", v)} /></Field>
            <Field label="EIN"><Input value={data.trusteeEin} onChange={v => set("trusteeEin", v)} /></Field>
          </Row2>
        </Card>
      )}

      <YesNo value={data.safeDeposit} onChange={v => set("safeDeposit", v)}
        label="Do you have a safe deposit box (personal or business)?" />
      {data.safeDeposit === "Yes" && (
        <Card>
          <Row3>
            <Field label="Location / Bank Name"><Input value={data.safeDepositLocation} onChange={v => set("safeDepositLocation", v)} /></Field>
            <Field label="Box Number"><Input value={data.safeDepositBox} onChange={v => set("safeDepositBox", v)} /></Field>
            <Field label="Approximate Value of Contents"><MoneyInput value={data.safeDepositValue} onChange={v => set("safeDepositValue", v)} /></Field>
          </Row3>
          <Field label="Contents (describe)"><Input value={data.safeDepositContents} onChange={v => set("safeDepositContents", v)} /></Field>
        </Card>
      )}

      <YesNo value={data.assetTransfer} onChange={v => set("assetTransfer", v)}
        label="In the past 10 years, have you transferred any asset worth more than $10,000 for less than full value?" />
      {data.assetTransfer === "Yes" && (
        <Card>
          <InfoBox type="warn">⚠️ The IRS may treat transferred assets as still available for collection if they were transferred to avoid paying taxes.</InfoBox>
          <Row2>
            <Field label="Description of Asset"><Input value={data.transferAsset} onChange={v => set("transferAsset", v)} /></Field>
            <Field label="Value at Time of Transfer"><MoneyInput value={data.transferValue} onChange={v => set("transferValue", v)} /></Field>
          </Row2>
          <Row2>
            <Field label="Date Transferred"><Input type="date" value={data.transferDate} onChange={v => set("transferDate", v)} /></Field>
            <Field label="Transferred To Whom"><Input value={data.transferTo} onChange={v => set("transferTo", v)} /></Field>
          </Row2>
        </Card>
      )}
    </div>
  );
}

function StepAssets({ data, set }) {
  const addItem = (key, item = {}) => set(key, [...(data[key] || []), item]);
  const updateItem = (key, i, field, val) => {
    const arr = [...(data[key] || [])];
    arr[i] = { ...arr[i], [field]: val };
    set(key, arr);
  };
  const removeItem = (key, i) => {
    const arr = [...(data[key] || [])];
    arr.splice(i, 1);
    set(key, arr);
  };

  return (
    <div>
      <SectionTitle sub="Include all assets — domestic and foreign">Personal Asset Information</SectionTitle>
      <InfoBox type="info">List all accounts and assets, even if the balance is zero. The IRS will verify this information against financial records.</InfoBox>

      {/* BANK ACCOUNTS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>💳 Bank Accounts</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Include checking, savings, online accounts, money market, PayPal, stored value cards, etc.</div>
        {(data.bankAccounts || []).map((acct, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Account {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("bankAccounts", i)} />
            </div>
            <Row2>
              <Field label="Bank Name & Address">
                <Input value={acct.bankName} onChange={v => updateItem("bankAccounts", i, "bankName", v)} />
              </Field>
              <Field label="Account Number">
                <Input value={acct.accountNumber} onChange={v => updateItem("bankAccounts", i, "accountNumber", v)} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Account Type">
                <Select value={acct.type} onChange={v => updateItem("bankAccounts", i, "type", v)}
                  options={[{value:"Checking",label:"Checking"},{value:"Savings",label:"Savings"},{value:"Money Market",label:"Money Market / CD"},{value:"Online",label:"Online Account"},{value:"Stored Value",label:"Stored Value Card"}]} />
              </Field>
              <Field label="Current Balance">
                <MoneyInput value={acct.balance} onChange={v => updateItem("bankAccounts", i, "balance", v)} />
              </Field>
            </Row2>
          </Card>
        ))}
        <AddButton onClick={() => addItem("bankAccounts")} label="Add bank account" />
      </div>

      {/* INVESTMENTS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>📈 Investments</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Stocks, bonds, mutual funds, CDs, IRAs, 401(k), Keogh, commodities, etc.</div>
        {(data.investments || []).map((inv, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Investment {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("investments", i)} />
            </div>
            <Row2>
              <Field label="Institution Name & Address">
                <Input value={inv.institution} onChange={v => updateItem("investments", i, "institution", v)} />
              </Field>
              <Field label="Account Number">
                <Input value={inv.accountNumber} onChange={v => updateItem("investments", i, "accountNumber", v)} />
              </Field>
            </Row2>
            <Row3>
              <Field label="Type">
                <Select value={inv.type} onChange={v => updateItem("investments", i, "type", v)}
                  options={[{value:"IRA",label:"IRA"},{value:"401k",label:"401(k)"},{value:"Stocks",label:"Stocks"},{value:"Bonds",label:"Bonds"},{value:"Mutual Fund",label:"Mutual Fund"},{value:"CD",label:"Certificate of Deposit"},{value:"Other",label:"Other"}]} />
              </Field>
              <Field label="Current Market Value">
                <MoneyInput value={inv.value} onChange={v => updateItem("investments", i, "value", v)} />
              </Field>
              <Field label="Loan Balance (if any)">
                <MoneyInput value={inv.loan} onChange={v => updateItem("investments", i, "loan", v)} />
              </Field>
            </Row3>
            {inv.value && (
              <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 4 }}>
                Equity: {fmt(Math.max(0, num(inv.value) - num(inv.loan)))}
              </div>
            )}
          </Card>
        ))}
        <AddButton onClick={() => addItem("investments")} label="Add investment account" />
      </div>

      {/* LIFE INSURANCE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>🛡️ Life Insurance (Cash Value Only)</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Only whole life or universal life policies with cash surrender value. Term life has no cash value — list term life payments in expenses only.</div>
        <YesNo value={data.hasLifeInsurance} onChange={v => set("hasLifeInsurance", v)} label="Do you own any life insurance policies with cash value?" />
        {data.hasLifeInsurance === "Yes" && (data.lifeInsurance || []).map((li, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Policy {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("lifeInsurance", i)} />
            </div>
            <Row2>
              <Field label="Insurance Company Name & Address">
                <Input value={li.company} onChange={v => updateItem("lifeInsurance", i, "company", v)} />
              </Field>
              <Field label="Policy Number">
                <Input value={li.policyNum} onChange={v => updateItem("lifeInsurance", i, "policyNum", v)} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Current Cash Surrender Value">
                <MoneyInput value={li.cashValue} onChange={v => updateItem("lifeInsurance", i, "cashValue", v)} />
              </Field>
              <Field label="Outstanding Loan Balance">
                <MoneyInput value={li.loan} onChange={v => updateItem("lifeInsurance", i, "loan", v)} />
              </Field>
            </Row2>
          </Card>
        ))}
        {data.hasLifeInsurance === "Yes" && (
          <AddButton onClick={() => addItem("lifeInsurance")} label="Add life insurance policy" />
        )}
      </div>

      {/* REAL ESTATE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>🏠 Real Property</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Include all real estate you own or are purchasing — home, rental property, vacant land, timeshares, etc.</div>
        {(data.realEstate || []).map((re, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Property {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("realEstate", i)} />
            </div>
            <Row2>
              <Field label="Property Description">
                <Select value={re.type} onChange={v => updateItem("realEstate", i, "type", v)}
                  options={[{value:"Primary Residence",label:"Primary Residence"},{value:"Rental",label:"Rental Property"},{value:"Vacant Land",label:"Vacant Land"},{value:"Timeshare",label:"Timeshare"},{value:"Other",label:"Other"}]} />
              </Field>
              <Field label="Purchase Date"><Input type="date" value={re.purchaseDate} onChange={v => updateItem("realEstate", i, "purchaseDate", v)} /></Field>
            </Row2>
            <Field label="Property Address (Street, City, State, ZIP, County)">
              <Input value={re.address} onChange={v => updateItem("realEstate", i, "address", v)} />
            </Field>
            <Row3>
              <Field label="Current Fair Market Value"><MoneyInput value={re.fmv} onChange={v => updateItem("realEstate", i, "fmv", v)} /></Field>
              <Field label="Current Loan Balance"><MoneyInput value={re.loan} onChange={v => updateItem("realEstate", i, "loan", v)} /></Field>
              <Field label="Monthly Payment"><MoneyInput value={re.payment} onChange={v => updateItem("realEstate", i, "payment", v)} /></Field>
            </Row3>
            <Row2>
              <Field label="Lender Name & Address"><Input value={re.lender} onChange={v => updateItem("realEstate", i, "lender", v)} /></Field>
              <Field label="Date of Final Payment"><Input type="date" value={re.finalPayment} onChange={v => updateItem("realEstate", i, "finalPayment", v)} /></Field>
            </Row2>
            {re.fmv && (
              <div style={{ fontSize: 12, color: "#7f8c8d" }}>
                Equity (FMV − Loan): {fmt(Math.max(0, num(re.fmv) - num(re.loan)))}
              </div>
            )}
          </Card>
        ))}
        <AddButton onClick={() => addItem("realEstate")} label="Add property" />
      </div>

      {/* VEHICLES */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>🚗 Vehicles</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Cars, trucks, boats, motorcycles, RVs, trailers — owned or leased.</div>
        {(data.vehicles || []).map((v2, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Vehicle {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("vehicles", i)} />
            </div>
            <Row3>
              <Field label="Year"><Input value={v2.year} onChange={v => updateItem("vehicles", i, "year", v)} placeholder="e.g., 2019" /></Field>
              <Field label="Make"><Input value={v2.make} onChange={v => updateItem("vehicles", i, "make", v)} placeholder="e.g., Honda" /></Field>
              <Field label="Model"><Input value={v2.model} onChange={v => updateItem("vehicles", i, "model", v)} placeholder="e.g., Accord" /></Field>
            </Row3>
            <Row3>
              <Field label="Mileage"><Input value={v2.mileage} onChange={v => updateItem("vehicles", i, "mileage", v)} placeholder="e.g., 87000" /></Field>
              <Field label="License / Tag Number"><Input value={v2.tag} onChange={v => updateItem("vehicles", i, "tag", v)} /></Field>
              <Field label="VIN"><Input value={v2.vin} onChange={v => updateItem("vehicles", i, "vin", v)} /></Field>
            </Row3>
            <Row2>
              <Field label="Owned or Leased?">
                <Select value={v2.owned} onChange={v => updateItem("vehicles", i, "owned", v)}
                  options={[{value:"Own",label:"Owned"},{value:"Lease",label:"Leased"}]} />
              </Field>
              <Field label="Purchase / Lease Date"><Input type="date" value={v2.purchaseDate} onChange={v => updateItem("vehicles", i, "purchaseDate", v)} /></Field>
            </Row2>
            {v2.owned === "Own" && (
              <Row3>
                <Field label="Current Market Value"><MoneyInput value={v2.fmv} onChange={v => updateItem("vehicles", i, "fmv", v)} /></Field>
                <Field label="Loan Balance"><MoneyInput value={v2.loan} onChange={v => updateItem("vehicles", i, "loan", v)} /></Field>
                <Field label="Monthly Payment"><MoneyInput value={v2.payment} onChange={v => updateItem("vehicles", i, "payment", v)} /></Field>
              </Row3>
            )}
            <Row2>
              <Field label="Lender / Lessor Name"><Input value={v2.lender} onChange={v => updateItem("vehicles", i, "lender", v)} /></Field>
              <Field label="Date of Final Payment"><Input type="date" value={v2.finalPayment} onChange={v => updateItem("vehicles", i, "finalPayment", v)} /></Field>
            </Row2>
            {v2.fmv && v2.owned === "Own" && (
              <div style={{ fontSize: 12, color: "#7f8c8d" }}>
                Equity: {fmt(Math.max(0, num(v2.fmv) - num(v2.loan)))}
              </div>
            )}
          </Card>
        ))}
        <AddButton onClick={() => addItem("vehicles")} label="Add vehicle" />
      </div>

      {/* CREDIT CARDS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>💳 Credit Cards & Lines of Credit</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>List all credit cards and lines of credit, even with zero balance.</div>
        {(data.creditCards || []).map((cc, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Card / Line {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("creditCards", i)} />
            </div>
            <Row2>
              <Field label="Card Type / Issuer"><Input value={cc.type} onChange={v => updateItem("creditCards", i, "type", v)} placeholder="e.g., Visa, Mastercard, HELOC" /></Field>
              <Field label="Credit Limit"><MoneyInput value={cc.limit} onChange={v => updateItem("creditCards", i, "limit", v)} /></Field>
            </Row2>
            <Row2>
              <Field label="Balance Owed"><MoneyInput value={cc.balance} onChange={v => updateItem("creditCards", i, "balance", v)} /></Field>
              <Field label="Minimum Monthly Payment"><MoneyInput value={cc.minPayment} onChange={v => updateItem("creditCards", i, "minPayment", v)} /></Field>
            </Row2>
          </Card>
        ))}
        <AddButton onClick={() => addItem("creditCards")} label="Add credit card / line of credit" />
      </div>

      {/* OTHER ASSETS */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>💎 Other Valuable Assets</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 10 }}>Jewelry, artwork, collections, antiques, business interests, domain names, patents, digital assets (cryptocurrency), etc.</div>
        {(data.otherAssets || []).map((oa, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Asset {i + 1}</strong>
              <RemoveButton onClick={() => removeItem("otherAssets", i)} />
            </div>
            <Row2>
              <Field label="Description"><Input value={oa.description} onChange={v => updateItem("otherAssets", i, "description", v)} placeholder="e.g., Gold jewelry collection, Bitcoin holdings" /></Field>
              <Field label="Current Market Value"><MoneyInput value={oa.value} onChange={v => updateItem("otherAssets", i, "value", v)} /></Field>
            </Row2>
          </Card>
        ))}
        <AddButton onClick={() => addItem("otherAssets")} label="Add other asset" />
      </div>
    </div>
  );
}

function StepIncome({ data, set, bizData, empData }) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";

  // Calculate gross monthly wages from pay period
  const calcMonthly = (gross, period) => {
    const g = num(gross);
    if (!g) return 0;
    switch (period) {
      case "Weekly": return g * 4.3;
      case "Biweekly": return g * 2.17;
      case "Semimonthly": return g * 2;
      case "Monthly": return g;
      default: return g;
    }
  };

  const monthlyWages = calcMonthly(empData.grossPay, empData.payPeriod);
  const spouseMonthlyWages = calcMonthly(empData.spouseGrossPay, empData.spousePayPeriod);

  return (
    <div>
      <SectionTitle sub="Enter average monthly amounts for all income sources">Monthly Income</SectionTitle>
      <InfoBox type="info">
        Enter <strong>gross</strong> amounts before taxes for wages. For self-employment, enter <strong>net</strong> income after ordinary business expenses. Do not enter negative numbers — if a source is a loss, enter 0.
      </InfoBox>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a1a2e" }}>Wages & Salary</div>
        <Row2>
          <Field label="Your Gross Monthly Wages" hint={monthlyWages ? `Calculated from pay stub: ${fmt(monthlyWages)}` : "Enter gross monthly amount"}>
            <MoneyInput value={data.wages || (monthlyWages ? Math.round(monthlyWages).toString() : "")}
              onChange={v => set("wages", v)} />
          </Field>
          <Field label="Spouse Gross Monthly Wages" hint={spouseMonthlyWages ? `Calculated: ${fmt(spouseMonthlyWages)}` : ""}>
            <MoneyInput value={data.spouseWages || (spouseMonthlyWages ? Math.round(spouseMonthlyWages).toString() : "")}
              onChange={v => set("spouseWages", v)} />
          </Field>
        </Row2>
      </Card>

      {isSelfEmp && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a1a2e" }}>Business Income (Sole Proprietorship — Schedule C)</div>
          <InfoBox type="tip">Enter average monthly figures. You may use 3, 6, 9, or 12 month averages. Do not include depreciation as an expense — it is a non-cash deduction not allowed by the IRS for collection purposes.</InfoBox>
          <Row2>
            <Field label="Accounting Period Used">
              <Select value={data.bizPeriod} onChange={v => set("bizPeriod", v)}
                options={[{value:"3",label:"3-month average"},{value:"6",label:"6-month average"},{value:"9",label:"9-month average"},{value:"12",label:"12-month average"}]} />
            </Field>
            <Field label="Gross Monthly Receipts / Revenue"><MoneyInput value={data.bizGrossReceipts} onChange={v => set("bizGrossReceipts", v)} /></Field>
          </Row2>
          <div style={{ fontWeight: 600, marginBottom: 10, marginTop: 10, color: "#555" }}>Monthly Business Expenses</div>
          <Row3>
            <Field label="Materials Purchased"><MoneyInput value={data.bizMaterials} onChange={v => set("bizMaterials", v)} /></Field>
            <Field label="Inventory Purchased"><MoneyInput value={data.bizInventory} onChange={v => set("bizInventory", v)} /></Field>
            <Field label="Gross Wages & Salaries Paid"><MoneyInput value={data.bizWages} onChange={v => set("bizWages", v)} /></Field>
          </Row3>
          <Row3>
            <Field label="Rent"><MoneyInput value={data.bizRent} onChange={v => set("bizRent", v)} /></Field>
            <Field label="Supplies"><MoneyInput value={data.bizSupplies} onChange={v => set("bizSupplies", v)} /></Field>
            <Field label="Utilities / Telephone"><MoneyInput value={data.bizUtilities} onChange={v => set("bizUtilities", v)} /></Field>
          </Row3>
          <Row3>
            <Field label="Vehicle (Gas, Oil, Repairs)"><MoneyInput value={data.bizVehicle} onChange={v => set("bizVehicle", v)} /></Field>
            <Field label="Repairs & Maintenance"><MoneyInput value={data.bizRepairs} onChange={v => set("bizRepairs", v)} /></Field>
            <Field label="Business Insurance"><MoneyInput value={data.bizInsurance} onChange={v => set("bizInsurance", v)} /></Field>
          </Row3>
          <Row2>
            <Field label="Current Business Taxes"><MoneyInput value={data.bizTaxes} onChange={v => set("bizTaxes", v)} /></Field>
            <Field label="Other Business Expenses"><MoneyInput value={data.bizOther} onChange={v => set("bizOther", v)} /></Field>
          </Row2>
          {(() => {
            const totalExp = ["bizMaterials","bizInventory","bizWages","bizRent","bizSupplies","bizUtilities","bizVehicle","bizRepairs","bizInsurance","bizTaxes","bizOther"].reduce((s,k) => s + num(data[k]), 0);
            const netInc = Math.max(0, num(data.bizGrossReceipts) - totalExp);
            return (
              <div style={{ background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 6, padding: "10px 14px", fontSize: 14, color: "#1e8449" }}>
                <strong>Net Monthly Business Income:</strong> {fmt(netInc)}
                {totalExp > 0 && <span style={{ color: "#7f8c8d", fontSize: 12, marginLeft: 8 }}>(Revenue {fmt(num(data.bizGrossReceipts))} − Expenses {fmt(totalExp)})</span>}
              </div>
            );
          })()}
        </Card>
      )}

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, color: "#1a1a2e" }}>Other Monthly Income</div>
        <Row3>
          <Field label="Your Social Security"><MoneyInput value={data.ssTaxpayer} onChange={v => set("ssTaxpayer", v)} /></Field>
          <Field label="Spouse Social Security"><MoneyInput value={data.ssSpouse} onChange={v => set("ssSpouse", v)} /></Field>
          <Field label="Pension (Taxpayer)"><MoneyInput value={data.pensionTaxpayer} onChange={v => set("pensionTaxpayer", v)} /></Field>
        </Row3>
        <Row3>
          <Field label="Pension (Spouse)"><MoneyInput value={data.pensionSpouse} onChange={v => set("pensionSpouse", v)} /></Field>
          <Field label="Net Rental Income" hint="After ordinary expenses — do not deduct depreciation"><MoneyInput value={data.rentalIncome} onChange={v => set("rentalIncome", v)} /></Field>
          <Field label="Distributions (K-1, partnerships, S-Corp)"><MoneyInput value={data.distributions} onChange={v => set("distributions", v)} /></Field>
        </Row3>
        <Row3>
          <Field label="Child Support Received"><MoneyInput value={data.childSupportReceived} onChange={v => set("childSupportReceived", v)} /></Field>
          <Field label="Alimony Received"><MoneyInput value={data.alimonyReceived} onChange={v => set("alimonyReceived", v)} /></Field>
          <Field label="Unemployment Income"><MoneyInput value={data.unemployment} onChange={v => set("unemployment", v)} /></Field>
        </Row3>
        <Row2>
          <Field label="Interest / Dividends"><MoneyInput value={data.interestDividends} onChange={v => set("interestDividends", v)} /></Field>
          <Field label="Other Income (describe below)"><MoneyInput value={data.otherIncome} onChange={v => set("otherIncome", v)} /></Field>
        </Row2>
        {data.otherIncome > 0 && (
          <Field label="Describe other income source"><Input value={data.otherIncomeDesc} onChange={v => set("otherIncomeDesc", v)} placeholder="e.g., sharing economy, gambling, rent subsidy" /></Field>
        )}
      </Card>
    </div>
  );
}

function StepExpenses({ data, set, personalData }) {
  const householdSize = Math.max(1, num(personalData.householdUnder65) + num(personalData.householdOver65));
  const hasOver65 = num(personalData.householdOver65) > 0;
  const hhKey = Math.min(5, householdSize);
  const foodStd = IRS_STANDARDS.food_clothing_misc[hhKey] || 1659;
  const healthStd = hasOver65 ? IRS_STANDARDS.out_of_pocket_health.over65 : IRS_STANDARDS.out_of_pocket_health.under65;
  const housingStd = IRS_STANDARDS.housing_utilities[hhKey] || 2793;
  const vehicleCount = Math.min(2, (personalData.vehicles || []).length || 0);

  return (
    <div>
      <SectionTitle sub="Enter your actual monthly expenses — IRS standards shown alongside">Monthly Living Expenses</SectionTitle>
      <InfoBox type="warn">
        <strong>IRS Collection Financial Standards</strong> apply to expenses. For food/clothing/misc and out-of-pocket health care, you are entitled to the full standard amount even if you spend less. For all other categories, enter your actual expense — the IRS will compare it to the standard.
      </InfoBox>
      <div style={{ fontSize: 12, color: "#7f8c8d", marginBottom: 20 }}>
        Household size detected: <strong>{householdSize} {householdSize === 1 ? "person" : "people"}</strong>
      </div>

      {/* FOOD, CLOTHING, MISC */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>🛒 Food, Clothing & Miscellaneous</div>
          <div style={{ background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1e8449" }}>
            IRS Standard: {fmt(foodStd)}/mo
          </div>
        </div>
        <InfoBox type="tip">You are entitled to claim the full standard amount of {fmt(foodStd)} for your household size, even if you spend less. Enter the standard amount unless your actual expenses are higher.</InfoBox>
        <Row3>
          <Field label="Food (Actual)"><MoneyInput value={data.food} onChange={v => set("food", v)} /></Field>
          <Field label="Housekeeping Supplies"><MoneyInput value={data.housekeeping} onChange={v => set("housekeeping", v)} /></Field>
          <Field label="Clothing & Services"><MoneyInput value={data.clothing} onChange={v => set("clothing", v)} /></Field>
        </Row3>
        <Row2>
          <Field label="Personal Care"><MoneyInput value={data.personalCare} onChange={v => set("personalCare", v)} /></Field>
          <Field label="Miscellaneous (credit card min payments, bank fees, etc.)"><MoneyInput value={data.miscellaneous} onChange={v => set("miscellaneous", v)} /></Field>
        </Row2>
      </Card>

      {/* HOUSING & UTILITIES */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>🏠 Housing & Utilities</div>
          <div style={{ background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" }}>
            IRS Standard: {fmt(housingStd)}/mo
          </div>
        </div>
        <InfoBox type="info">Enter your actual expenses. Include your primary residence only. If mortgage is listed in assets, enter only taxes and insurance not already included in the mortgage payment.</InfoBox>
        <Row2>
          <Field label="Rent (if renting)"><MoneyInput value={data.rent} onChange={v => set("rent", v)} /></Field>
          <Field label="Electricity, Gas, Water, Trash"><MoneyInput value={data.utilities} onChange={v => set("utilities", v)} /></Field>
        </Row2>
        <Row3>
          <Field label="Phone / Cell / Internet / Cable"><MoneyInput value={data.phone} onChange={v => set("phone", v)} /></Field>
          <Field label="Real Estate Taxes & Insurance (if not in mortgage)"><MoneyInput value={data.propTaxInsurance} onChange={v => set("propTaxInsurance", v)} /></Field>
          <Field label="Maintenance & Repairs"><MoneyInput value={data.maintenance} onChange={v => set("maintenance", v)} /></Field>
        </Row3>
      </Card>

      {/* TRANSPORTATION */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: "#1a1a2e" }}>🚗 Transportation</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" }}>
            Ownership std: {fmt(IRS_STANDARDS.transportation_ownership * vehicleCount)}/mo ({vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""})
          </div>
          <div style={{ background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1a5276" }}>
            Operating std: {fmt(IRS_STANDARDS.transportation_operating)}/mo
          </div>
        </div>
        <Row2>
          <Field label="Vehicle Loan / Lease Payment(s)" hint="Monthly payment(s) — up to 2 vehicles">
            <MoneyInput value={data.vehiclePayment} onChange={v => set("vehiclePayment", v)} />
          </Field>
          <Field label="Vehicle Operating Costs" hint="Gas, insurance, maintenance, registration, parking, tolls">
            <MoneyInput value={data.vehicleOperating} onChange={v => set("vehicleOperating", v)} />
          </Field>
        </Row2>
        <Field label="Public Transportation (if applicable)" hint="Bus, train, taxi, ferry — if no vehicle or in addition to vehicle">
          <MoneyInput value={data.publicTransit} onChange={v => set("publicTransit", v)} />
        </Field>
      </Card>

      {/* HEALTH CARE */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>🏥 Health Care</div>
          <div style={{ background: "#eafaf1", border: "1px solid #27ae60", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#1e8449" }}>
            Out-of-pocket standard: {fmt(healthStd * householdSize)}/mo
          </div>
        </div>
        <Row2>
          <Field label="Health Insurance Premiums (actual)"><MoneyInput value={data.healthInsurance} onChange={v => set("healthInsurance", v)} /></Field>
          <Field label="Out-of-Pocket Health Care Costs" hint="Prescriptions, dental, vision, medical services not covered by insurance">
            <MoneyInput value={data.outOfPocketHealth} onChange={v => set("outOfPocketHealth", v)} />
          </Field>
        </Row2>
      </Card>

      {/* OTHER EXPENSES */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#1a1a2e" }}>📋 Other Expenses</div>
        <Row3>
          <Field label="Child / Dependent Care"><MoneyInput value={data.childCare} onChange={v => set("childCare", v)} /></Field>
          <Field label="Term Life Insurance Premiums"><MoneyInput value={data.termLife} onChange={v => set("termLife", v)} /></Field>
          <Field label="Court-Ordered Child Support Paid"><MoneyInput value={data.childSupportPaid} onChange={v => set("childSupportPaid", v)} /></Field>
        </Row3>
        <Row3>
          <Field label="Court-Ordered Alimony Paid"><MoneyInput value={data.alimonyPaid} onChange={v => set("alimonyPaid", v)} /></Field>
          <Field label="Other Court-Ordered Payments"><MoneyInput value={data.otherCourtOrdered} onChange={v => set("otherCourtOrdered", v)} /></Field>
          <Field label="Current Year Fed/State Income Taxes"><MoneyInput value={data.currentTaxes} onChange={v => set("currentTaxes", v)} /></Field>
        </Row3>
        <Row3>
          <Field label="Employer-Required Retirement"><MoneyInput value={data.requiredRetirement} onChange={v => set("requiredRetirement", v)} /></Field>
          <Field label="Voluntary Retirement Contributions" hint="Generally not allowed by IRS unless required by employer"><MoneyInput value={data.voluntaryRetirement} onChange={v => set("voluntaryRetirement", v)} /></Field>
          <Field label="Union Dues"><MoneyInput value={data.unionDues} onChange={v => set("unionDues", v)} /></Field>
        </Row3>
        <Row3>
          <Field label="Delinquent State / Local Taxes (min. payment)"><MoneyInput value={data.delinquentStateTax} onChange={v => set("delinquentStateTax", v)} /></Field>
          <Field label="Federal Student Loans (min. payment)" hint="Government-guaranteed loans only"><MoneyInput value={data.studentLoans} onChange={v => set("studentLoans", v)} /></Field>
          <Field label="Secured Debts (attach list)"><MoneyInput value={data.securedDebts} onChange={v => set("securedDebts", v)} /></Field>
        </Row3>
      </Card>
    </div>
  );
}

// ─── RESULTS ENGINE ──────────────────────────────────────────────────────────
function calcResults(personalData, empData, incomeData, expenseData, bizData, assetsData) {
  const isSelfEmp = bizData.isSoleProprietor === "Yes";
  const householdSize = Math.max(1, num(personalData.householdUnder65) + num(personalData.householdOver65));
  const hasOver65 = num(personalData.householdOver65) > 0;
  const hhKey = Math.min(5, householdSize);
  const assets = assetsData || {};

  // ── Income ──
  const calcMonthly = (gross, period) => {
    const g = num(gross);
    if (!g) return 0;
    switch (period) {
      case "Weekly": return g * 4.3;
      case "Biweekly": return g * 2.17;
      case "Semimonthly": return g * 2;
      default: return g;
    }
  };
  const wages = num(incomeData.wages) || calcMonthly(empData.grossPay, empData.payPeriod);
  const spouseWages = (personalData.spouseOnDebt === "Yes")
    ? (num(incomeData.spouseWages) || calcMonthly(empData.spouseGrossPay, empData.spousePayPeriod))
    : 0;

  // FICA (Social Security 6.2% + Medicare 1.45% = 7.65%) applies to W-2 wages only.
  // Self-employment income already has SE tax handled separately via business expense deduction.
  // This is a mandatory payroll deduction — the taxpayer never receives this money.
  const FICA_RATE = 0.0765;
  const ficaTaxpayer = wages * FICA_RATE;
  const ficaSpouse   = spouseWages * FICA_RATE;
  const ficaTotal    = ficaTaxpayer + ficaSpouse;

  const netBizIncome = isSelfEmp ? Math.max(0, num(incomeData.bizGrossReceipts) - [
    "bizMaterials","bizInventory","bizWages","bizRent","bizSupplies","bizUtilities","bizVehicle","bizRepairs","bizInsurance","bizTaxes","bizOther"
  ].reduce((s, k) => s + num(incomeData[k]), 0)) : 0;

  const totalIncome = wages + spouseWages + netBizIncome +
    num(incomeData.ssTaxpayer) + num(incomeData.ssSpouse) +
    num(incomeData.pensionTaxpayer) + num(incomeData.pensionSpouse) +
    num(incomeData.rentalIncome) + num(incomeData.distributions) +
    num(incomeData.childSupportReceived) + num(incomeData.alimonyReceived) +
    num(incomeData.unemployment) + num(incomeData.interestDividends) + num(incomeData.otherIncome);

  // ── IRS Allowable Expenses (IA / CNC / PPIA standards) ──
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

  const otherExpenses =
    num(expenseData.childCare) + num(expenseData.termLife) +
    num(expenseData.childSupportPaid) + num(expenseData.alimonyPaid) +
    num(expenseData.otherCourtOrdered) + num(expenseData.currentTaxes) +
    num(expenseData.requiredRetirement) + num(expenseData.delinquentStateTax) +
    num(expenseData.studentLoans) + num(expenseData.securedDebts);

  const totalAllowedExpenses = ficaTotal + foodAllowed + housingAllowed + vehicleOwnershipAllowed + vehicleOperatingAllowed + publicTransit + healthInsurance + oopAllowed + otherExpenses;
  const netDisposable = Math.max(0, totalIncome - totalAllowedExpenses);

  // ── OIC — Box A: Personal Asset Equity (80% quick-sale value) ──
  // Bank accounts: full balance (cash is already liquid — IRS uses 100%)
  const bankTotal = (assets.bankAccounts || []).reduce((s, a) => s + num(a.balance), 0);

  // Investments: 80% of market value minus loan
  const investmentTotal = (assets.investments || []).reduce((s, inv) => {
    const equity = Math.max(0, num(inv.value) - num(inv.loan));
    return s + (equity * 0.80);
  }, 0);

  // Life insurance cash value: 80% of (cash value minus loan)
  const lifeInsTotal = (assets.lifeInsurance || []).reduce((s, li) => {
    const equity = Math.max(0, num(li.cashValue) - num(li.loan));
    return s + (equity * 0.80);
  }, 0);

  // Real estate: 80% of (FMV minus loan)
  const realEstateTotal = (assets.realEstate || []).reduce((s, re) => {
    const equity = Math.max(0, num(re.fmv) - num(re.loan));
    return s + (equity * 0.80);
  }, 0);

  // Vehicles: 80% of (FMV minus loan), but IRS allows one vehicle allowance
  // The allowance is subtracted from total vehicle equity (see line 6b on 433-A OIC)
  const vehicleEquityRaw = (assets.vehicles || []).reduce((s, v) => {
    if (v.owned !== "Own") return s;
    const equity = Math.max(0, num(v.fmv) - num(v.loan));
    return s + (equity * 0.80);
  }, 0);
  // IRS vehicle allowance: $3,450 per vehicle (2024), up to 2 vehicles
  const vehicleAllowance = Math.min(vehicleCount, (assets.vehicles || []).filter(v => v.owned === "Own").length) * 3450;
  const vehicleTotal = Math.max(0, vehicleEquityRaw - vehicleAllowance);

  // Other assets: 80% of value
  const otherAssetTotal = (assets.otherAssets || []).reduce((s, oa) => s + (num(oa.value) * 0.80), 0);

  const boxA = bankTotal + investmentTotal + lifeInsTotal + realEstateTotal + vehicleTotal + otherAssetTotal;

  // ── OIC — Box B: Business Asset Equity (80% quick-sale) ──
  // Populated from 433-B data if applicable — placeholder for now, set to 0 for individuals
  const boxB = 0;

  const boxAB = boxA + boxB;

  // ── OIC — Box C: Net Monthly Business Income (sole prop only) ──
  const boxC = netBizIncome;

  // ── OIC — Box D: Total Monthly Income ──
  // OIC uses total household income for the income side
  const boxD = totalIncome;

  // ── OIC — Box E: Allowable Monthly Expenses (OIC uses stricter standards) ──
  // OIC expense standards are the same collection financial standards EXCEPT:
  // - No allowance for voluntary retirement contributions
  // - No student loan deduction unless in repayment
  // - No secured debt deduction unless necessary for health/welfare or production of income
  // OIC does NOT allow: voluntary retirement, student loans (generally), unsecured debt minimums
  // FICA is included in both IA and OIC — it is mandatory and the taxpayer never receives it
  const oicOtherExpenses =
    num(expenseData.childCare) + num(expenseData.termLife) +
    num(expenseData.childSupportPaid) + num(expenseData.alimonyPaid) +
    num(expenseData.otherCourtOrdered) + num(expenseData.currentTaxes) +
    num(expenseData.requiredRetirement);
  // Note: voluntary retirement and student loans intentionally excluded for OIC

  const boxE = ficaTotal + foodAllowed + housingAllowed + vehicleOwnershipAllowed + vehicleOperatingAllowed +
    publicTransit + healthInsurance + oopAllowed + oicOtherExpenses;

  // ── OIC — Box F: Remaining Monthly Income ──
  const boxF = Math.max(0, boxD - boxE);

  // ── OIC — Box G (cash offer, 5-month): Box F × 12 ──
  const boxG = boxF * 12;

  // ── OIC — Box H (deferred payment, 24-month): Box F × 24 ──
  const boxH = boxF * 24;

  // ── Minimum Offer Amount ──
  // Cash offer (lump sum within 5 months): Box A+B + Box G
  const minOfferCash = boxAB + boxG;
  // Deferred payment (6-24 monthly installments): Box A+B + Box H
  const minOfferDeferred = boxAB + boxH;

  // ── OIC Eligibility Screening ──
  const inActiveBankruptcy = bizData.bankruptcy === "Yes" &&
    !personalData.bankruptcyDischarged && !personalData.bankruptcyDismissed;
  // Use otherinfo bankruptcy flag  
  const oicIneligible = false; // evaluated from otherinfo in component

  // ── Resolution Recommendation ──
  let recommendation = "";
  let recColor = "#2c3e50";
  let recBg = "#f8f9fa";

  if (netDisposable <= 0) {
    recommendation = "Currently Not Collectible (CNC)";
    recColor = "#1e8449"; recBg = "#eafaf1";
  } else if (netDisposable < 200) {
    recommendation = "Possibly Currently Not Collectible (CNC) or Partial Pay IA (PPIA)";
    recColor = "#7d6608"; recBg = "#fef9e7";
  } else if (netDisposable < 500) {
    recommendation = "Partial Pay Installment Agreement (PPIA) or Simple Installment Agreement";
    recColor = "#1a5276"; recBg = "#ebf5fb";
  } else {
    recommendation = "Installment Agreement — Simple IA or Non-Streamlined IA";
    recColor = "#5d2f86"; recBg = "#f5eef8";
  }

  return {
    // Income/expense basics
    totalIncome, netBizIncome, totalAllowedExpenses, netDisposable,
    ficaTaxpayer, ficaSpouse, ficaTotal,
    foodAllowed, foodStd, housingAllowed, housingStd,
    vehicleOwnershipAllowed, vehicleOperatingAllowed,
    healthInsurance, oopAllowed, healthStd,
    otherExpenses, wages, spouseWages,
    // OIC Boxes
    boxA, boxB, boxAB, boxC, boxD, boxE, boxF, boxG, boxH,
    minOfferCash, minOfferDeferred,
    // Asset breakdown for OIC
    bankTotal, investmentTotal, lifeInsTotal, realEstateTotal,
    vehicleEquityRaw, vehicleAllowance, vehicleTotal, otherAssetTotal,
    vehicleCount,
    // Recommendation
    recommendation, recColor, recBg,
  };
}

// ─── STEP 8: OIC ──────────────────────────────────────────────────────────────
function StepOIC({ data, set, allData }) {
  const { personal, otherinfo, business } = allData;
  const inActiveBankruptcy = otherinfo?.bankruptcy === "Yes" &&
    !otherinfo?.bankruptcyDischarged && !otherinfo?.bankruptcyDismissed;
  const r = calcResults(personal, allData.employment, allData.income, allData.expenses, business, allData.assets);

  // Low-income threshold: income at or below 250% of federal poverty guideline
  // 2024 FPL: $15,060 for 1 person + $5,380 per additional
  const householdSize = Math.max(1, num(personal.householdUnder65) + num(personal.householdOver65));
  const fpl = 15060 + (householdSize - 1) * 5380;
  const lowIncomeThreshold = fpl * 2.5 / 12; // monthly
  const qualifiesLowIncome = r.totalIncome <= lowIncomeThreshold;

  return (
    <div>
      <SectionTitle sub="Complete this section if you are considering an Offer in Compromise">
        Offer in Compromise Details
      </SectionTitle>

      {inActiveBankruptcy && (
        <InfoBox type="warn">
          ⛔ <strong>OIC Not Available.</strong> You indicated an active bankruptcy. The IRS cannot consider an OIC while bankruptcy is pending. Complete this section only if you expect the bankruptcy to be discharged or dismissed before you submit.
        </InfoBox>
      )}

      <InfoBox type="info">
        An Offer in Compromise lets you settle your tax debt for less than the full amount if the IRS cannot reasonably collect it all. The amount you offer must equal your <strong>Reasonable Collection Potential (RCP)</strong> — your reachable assets plus a multiple of your future disposable income. This step collects information specific to the OIC application.
      </InfoBox>

      {/* ── Basis of Offer ── */}
      <SectionTitle sub="Why are you submitting an Offer?">Basis of Offer</SectionTitle>
      <Card>
        <Field label="Basis of Offer" required hint="Most taxpayers use Doubt as to Collectability. Select all that apply.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "basisDAC",  label: "Doubt as to Collectability (DAC) — Cannot pay the full amount before the CSED" },
              { key: "basisDAL",  label: "Doubt as to Liability (DAL) — Disagree that you owe the amount assessed" },
              { key: "basisETA",  label: "Effective Tax Administration (ETA) — Full payment would create economic hardship or be inequitable" },
            ].map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!data[opt.key]} onChange={e => set(opt.key, e.target.checked)}
                  style={{ marginTop: 2, accentColor: "#c8a96e" }} />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </Field>
        {data.basisDAL && (
          <InfoBox type="info">
            <strong>Doubt as to Liability:</strong> If you are filing on this basis, you do not need to complete the financial disclosure sections of Form 433-A OIC. You will need to explain the basis for your disagreement in the OIC narrative.
          </InfoBox>
        )}
        {data.basisETA && (
          <InfoBox type="info">
            <strong>Effective Tax Administration:</strong> ETA offers require special justification. You must show that full collection would either create an economic hardship or would be unfair and inequitable given exceptional circumstances.
          </InfoBox>
        )}
      </Card>

      {/* ── Tax Periods Covered ── */}
      <SectionTitle sub="List the specific tax years and form types you want included in the offer">Tax Periods to Be Compromised</SectionTitle>
      <InfoBox type="warn">
        ⚠️ Only the tax years you list here will be included in the offer. Any year not listed remains fully collectible. Make sure every year with an outstanding balance is included.
      </InfoBox>
      {(data.taxPeriods || []).map((tp, i) => (
        <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Tax Period {i + 1}</strong>
            <RemoveButton onClick={() => { const d = [...data.taxPeriods]; d.splice(i,1); set("taxPeriods", d); }} />
          </div>
          <Row3>
            <Field label="Form Type">
              <Select value={tp.formType} onChange={v => { const d=[...data.taxPeriods]; d[i]={...d[i],formType:v}; set("taxPeriods",d); }}
                options={[
                  {value:"1040",label:"Form 1040 — Individual Income Tax"},
                  {value:"1040A",label:"Form 1040-A"},
                  {value:"1040EZ",label:"Form 1040-EZ"},
                  {value:"941",label:"Form 941 — Employer's Quarterly Federal Tax"},
                  {value:"940",label:"Form 940 — Federal Unemployment (FUTA)"},
                  {value:"944",label:"Form 944 — Employer's Annual Federal Tax"},
                  {value:"1120",label:"Form 1120 — Corporate Income Tax"},
                  {value:"other",label:"Other"},
                ]} />
            </Field>
            <Field label="Tax Period (Year or Quarter)">
              <Input value={tp.period} onChange={v => { const d=[...data.taxPeriods]; d[i]={...d[i],period:v}; set("taxPeriods",d); }}
                placeholder="e.g. 2021, or Q2 2020" />
            </Field>
            <Field label="Balance Owed">
              <MoneyInput value={tp.balance} onChange={v => { const d=[...data.taxPeriods]; d[i]={...d[i],balance:v}; set("taxPeriods",d); }} />
            </Field>
          </Row3>
        </Card>
      ))}
      <AddButton onClick={() => set("taxPeriods", [...(data.taxPeriods||[]), {}])} label="Add tax period" />

      {/* ── Payment Terms ── */}
      <SectionTitle sub="How do you intend to pay the offer amount?">Payment Terms</SectionTitle>
      <Card>
        <Field label="Payment Option" required>
          <Select value={data.paymentOption} onChange={v => set("paymentOption", v)}
            options={[
              {value:"lump",  label:"Lump Sum Cash — Pay 20% down with application, balance within 5 months of acceptance"},
              {value:"short", label:"Short-Term Periodic Payment — Monthly payments while IRS reviews + 24 months after acceptance"},
              {value:"deferred", label:"Deferred Periodic Payment — Monthly payments while IRS reviews + paid in 24 monthly installments after acceptance"},
            ]} />
        </Field>
        {data.paymentOption === "lump" && (
          <InfoBox type="info">
            <strong>Lump Sum:</strong> You must submit <strong>20% of your offer amount</strong> with the application. The IRS applies this payment to your liability even if the offer is rejected. The remainder is due within 5 months of acceptance.
          </InfoBox>
        )}
        {(data.paymentOption === "short" || data.paymentOption === "deferred") && (
          <InfoBox type="info">
            <strong>Periodic Payment:</strong> You must begin making the proposed monthly payments with your application and continue them while the IRS considers the offer. These payments are also applied to your liability and are non-refundable.
          </InfoBox>
        )}
        {data.paymentOption && (
          <Field label="Proposed Monthly Payment (periodic payment plans only)"
            hint="Leave blank if selecting lump sum. This is your proposed installment — it must at minimum reflect your RCP over the payment period.">
            <MoneyInput value={data.proposedMonthlyPayment} onChange={v => set("proposedMonthlyPayment", v)} />
          </Field>
        )}
      </Card>

      {/* ── Application Fee / Low-Income Waiver ── */}
      <SectionTitle sub="The OIC application fee is $205. Low-income taxpayers may qualify for a waiver.">Application Fee</SectionTitle>
      <Card>
        <div style={{ background: qualifiesLowIncome ? "#eafaf1" : "#f8f9fa", border: `1px solid ${qualifiesLowIncome ? "#27ae60" : "#ddd"}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: qualifiesLowIncome ? "#1e8449" : "#2c3e50", marginBottom: 4 }}>
            {qualifiesLowIncome ? "✅ You may qualify for the low-income fee waiver" : "Application fee: $205"}
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>
            {qualifiesLowIncome
              ? `Your monthly income (${fmt(r.totalIncome)}) is at or below 250% of the federal poverty guideline for a household of ${householdSize} (${fmt(lowIncomeThreshold)}/mo). You may check the low-income waiver box on Form 656 to waive the $205 fee and the initial payment requirement.`
              : `Your monthly income (${fmt(r.totalIncome)}) exceeds the 250% federal poverty guideline threshold (${fmt(lowIncomeThreshold)}/mo) for a household of ${householdSize}. The $205 application fee applies.`
            }
          </div>
        </div>
        <YesNo value={data.claimFeeWaiver} onChange={v => set("claimFeeWaiver", v)}
          label="Do you want to claim the low-income fee and payment waiver on Form 656?" />
        {data.claimFeeWaiver === "Yes" && !qualifiesLowIncome && (
          <InfoBox type="warn">
            ⚠️ Based on the income you entered, you may not meet the threshold for the low-income waiver. The IRS will verify eligibility. If the waiver is denied, the IRS will notify you and request the fee — the offer will not be rejected solely because the waiver was claimed.
          </InfoBox>
        )}
      </Card>

      {/* ── Prior OIC History ── */}
      <SectionTitle sub="Disclosure required on Form 656">Prior OIC History</SectionTitle>
      <Card>
        <YesNo value={data.priorOIC} onChange={v => set("priorOIC", v)}
          label="Have you previously submitted an Offer in Compromise with the IRS?" />
        {data.priorOIC === "Yes" && (
          <>
            <Row3>
              <Field label="Year of Prior OIC"><Input type="number" value={data.priorOICYear} onChange={v => set("priorOICYear", v)} placeholder="YYYY" /></Field>
              <Field label="Outcome">
                <Select value={data.priorOICOutcome} onChange={v => set("priorOICOutcome", v)}
                  options={[
                    {value:"accepted",label:"Accepted"},
                    {value:"rejected",label:"Rejected"},
                    {value:"withdrawn",label:"Withdrawn"},
                    {value:"returned",label:"Returned (processability)"},
                    {value:"defaulted",label:"Accepted then defaulted"},
                  ]} />
              </Field>
              <Field label="Approximate Amount"><MoneyInput value={data.priorOICAmount} onChange={v => set("priorOICAmount", v)} /></Field>
            </Row3>
            {data.priorOICOutcome === "defaulted" && (
              <InfoBox type="warn">
                ⚠️ <strong>Prior OIC Default:</strong> If a previously accepted OIC was defaulted, the full original liability is reinstated. The IRS will evaluate whether the current offer reflects changed financial circumstances. You should be prepared to explain what has changed.
              </InfoBox>
            )}
          </>
        )}
      </Card>

      {/* ── Digital Assets ── */}
      <SectionTitle sub="Required disclosure on Form 433-A OIC">Digital Assets (Cryptocurrency)</SectionTitle>
      <Card>
        <YesNo value={data.hasDigitalAssets} onChange={v => set("hasDigitalAssets", v)}
          label="Do you currently hold any cryptocurrency or other digital assets?" />
        {data.hasDigitalAssets === "Yes" && (
          <>
            <InfoBox type="info">
              The IRS considers digital assets to be property. They are subject to the same 80% quick-sale valuation as other investments and must be disclosed on Form 433-A OIC. Report the current USD equivalent value of all digital assets you hold.
            </InfoBox>
            {(data.digitalAssets || []).map((da, i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Digital Asset {i + 1}</strong>
                  <RemoveButton onClick={() => { const d=[...data.digitalAssets]; d.splice(i,1); set("digitalAssets",d); }} />
                </div>
                <Row3>
                  <Field label="Asset Type / Coin">
                    <Input value={da.description} onChange={v => { const d=[...data.digitalAssets]; d[i]={...d[i],description:v}; set("digitalAssets",d); }}
                      placeholder="e.g. Bitcoin, Ethereum, USDC" />
                  </Field>
                  <Field label="Number of Units / Tokens">
                    <Input value={da.units} onChange={v => { const d=[...data.digitalAssets]; d[i]={...d[i],units:v}; set("digitalAssets",d); }} />
                  </Field>
                  <Field label="Current USD Value">
                    <MoneyInput value={da.usdValue} onChange={v => { const d=[...data.digitalAssets]; d[i]={...d[i],usdValue:v}; set("digitalAssets",d); }} />
                  </Field>
                </Row3>
                <Row2>
                  <Field label="Where Held (exchange, wallet, custodian)">
                    <Input value={da.location} onChange={v => { const d=[...data.digitalAssets]; d[i]={...d[i],location:v}; set("digitalAssets",d); }} />
                  </Field>
                  <Field label="Account / Wallet Address">
                    <Input value={da.accountNumber} onChange={v => { const d=[...data.digitalAssets]; d[i]={...d[i],accountNumber:v}; set("digitalAssets",d); }} />
                  </Field>
                </Row2>
              </Card>
            ))}
            <AddButton onClick={() => set("digitalAssets", [...(data.digitalAssets||[]), {}])} label="Add digital asset" />
          </>
        )}
      </Card>

      {/* ── RCP Preview ── */}
      <SectionTitle sub="Based on the financial information you entered">Your Estimated RCP</SectionTitle>
      <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 12, color: "#c8a96e", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>REASONABLE COLLECTION POTENTIAL SUMMARY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Box A — Asset Equity", val: r.boxA },
            { label: "Box F — Monthly RMI", val: r.boxF },
            { label: "Box G (×12) Cash", val: r.boxG },
          ].map(box => (
            <div key={box.label} style={{ background: "rgba(200,169,110,0.1)", borderRadius: 8, padding: 12, border: "1px solid rgba(200,169,110,0.2)" }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{box.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#c8a96e" }}>{fmt(box.val)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "rgba(39,174,96,0.15)", borderRadius: 8, padding: 14, border: "1px solid rgba(39,174,96,0.3)" }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>💵 Minimum Offer — Cash (5 months)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#27ae60" }}>{fmt(r.minOfferCash)}</div>
          </div>
          <div style={{ background: "rgba(200,169,110,0.1)", borderRadius: 8, padding: 14, border: "1px solid rgba(200,169,110,0.2)" }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>📅 Minimum Offer — Deferred (24 months)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#c8a96e" }}>{fmt(r.minOfferDeferred)}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 12 }}>These figures are estimates. The IRS may calculate a different RCP based on their independent review of your assets and allowable expenses.</div>
      </div>
    </div>
  );
}

// ─── ACS CALL PREP & NEXT STEPS ───────────────────────────────────────────────
function ACSCallPrep({ allData, results: r }) {
  const { personal, employment, income, expenses, assets, business, otherinfo } = allData;
  const [open, setOpen] = useState(false);
  const isAssignedRO = otherinfo?.revenueOfficer === "Yes";
  const hasBusiness  = business?.hasBusiness === "Yes";

  // Build the averaged income/expense figures the ACS rep will ask for
  // IRS prefers 3-month average; taxpayer can provide 3, 6, 9, or 12 months
  const avgNote = "Have 3–12 months of bank statements, pay stubs, and receipts ready. The IRS rep will ask you to average these figures.";

  const Checklist = ({ items }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, alignItems: "flex-start" }}>
          <span style={{ color: "#c8a96e", fontWeight: 700, flexShrink: 0 }}>☐</span>
          <span style={{ color: "#2c3e50", lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  );

  const Section = ({ title, color = "#1a1a2e", children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 10, borderBottom: `2px solid ${color}`, paddingBottom: 6 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ marginTop: 32, borderTop: "3px solid #c8a96e", paddingTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>📞 Next Steps &amp; ACS Call Preparation Guide</div>
          <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 3 }}>
            What to do now — how to contact the IRS, what to say, and what to have ready
          </div>
        </div>
        <div style={{ fontSize: 20, color: "#c8a96e", fontWeight: 700 }}>{open ? "▲" : "▼"}</div>
      </div>

      {open && (
        <div>
          {/* ── Which path? ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{ background: isAssignedRO ? "#eafaf1" : "#f8f9fa", border: `2px solid ${isAssignedRO ? "#27ae60" : "#ddd"}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: isAssignedRO ? "#1e8449" : "#7f8c8d", marginBottom: 6 }}>
                {isAssignedRO ? "✅ YOUR PATH: Revenue Officer" : "Revenue Officer Path"}
              </div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                A Revenue Officer has been assigned to your case. Do not call ACS. Contact your RO directly using the number on their business card or most recent letter. Submit Form 433-A (not 433-F) plus supporting documents to the RO by fax, mail, or in person. The RO has broader authority to negotiate than ACS.
              </div>
            </div>
            <div style={{ background: !isAssignedRO ? "#ebf5fb" : "#f8f9fa", border: `2px solid ${!isAssignedRO ? "#3498db" : "#ddd"}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: !isAssignedRO ? "#1a5276" : "#7f8c8d", marginBottom: 6 }}>
                {!isAssignedRO ? "✅ YOUR PATH: ACS (Automated Collection System)" : "ACS Path"}
              </div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                Your case is with ACS. Call <strong>1-800-829-7650</strong> (individuals) or <strong>1-800-829-3903</strong> (businesses). ACS handles cases by phone. You can provide your 433-F information verbally, then fax a signed copy with documents to the ACS rep while on the phone.
              </div>
            </div>
          </div>

          {/* ── Before You Call ── */}
          <Section title="📋 Before You Call ACS — Documents to Have Ready" color="#1a5276">
            <InfoBox type="info">
              {avgNote} The IRS will ask you to average income and expenses. You can average over 3, 6, 9, or 12 months — use the period that most accurately reflects your current situation.
            </InfoBox>
            <Checklist items={[
              `Most recent 3 months of pay stubs — to verify wages of ${fmt(r.wages)}/month`,
              `Most recent 3 months of bank statements for all accounts`,
              `Most recent tax return (Form 1040)`,
              `Monthly bills and receipts for housing, utilities, car payments, insurance`,
              `Any IRS notices or letters related to this debt (have the notice number ready)`,
              `Your Social Security number and date of birth`,
              ...(hasBusiness ? [`Business bank statements and profit/loss records for past 3–6 months`] : []),
              `Loan statements for any real estate, vehicles, or other secured debts`,
              `Your completed 433-F (downloaded above) — have it in front of you`,
            ]} />
          </Section>

          {/* ── On the Call ── */}
          <Section title="📞 On the Call — What to Expect" color="#2c3e50">
            <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.8, marginBottom: 12 }}>
              The ACS representative will take your financial information verbally from the 433-F. Here are the figures they will ask for, drawn from your intake:
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              <thead><tr style={{ background: "#2c3e50" }}>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "left", fontSize: 12 }}>What They'll Ask</th>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "right", fontSize: 12 }}>Your Figure</th>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "left", fontSize: 12 }}>Source</th>
              </tr></thead>
              <tbody>
                {[
                  ["Monthly gross wages",          fmt(r.wages),               "Pay stubs"],
                  ...(r.spouseWages > 0 ? [["Spouse monthly wages", fmt(r.spouseWages), "Spouse pay stubs"]] : []),
                  ...(r.netBizIncome > 0 ? [["Net monthly business income", fmt(r.netBizIncome), "Business records"]] : []),
                  ["FICA / payroll taxes",          fmt(r.ficaTotal),            "Calculated (7.65% of wages)"],
                  ["Monthly housing + utilities",   fmt(expenses.rent ? (parseFloat(expenses.rent||0)+parseFloat(expenses.utilities||0)+parseFloat(expenses.phone||0)) : 0), "Bills / lease"],
                  ["Monthly vehicle payment",       fmt(expenses.vehiclePayment||0),  "Loan statement"],
                  ["Monthly vehicle operating",     fmt(expenses.vehicleOperating||0), "Gas / insurance receipts"],
                  ["Health insurance premium",      fmt(expenses.healthInsurance||0),  "Insurance bill"],
                  ["Total bank balances",           fmt((assets.bankAccounts||[]).reduce((s,a)=>s+parseFloat(a.balance||0),0)), "Bank statements"],
                  ["Total income",                  fmt(r.totalIncome),          "All sources combined"],
                  ["Total allowable expenses",      fmt(r.totalAllowedExpenses), "IRS standards applied"],
                  ["Net disposable income",         fmt(r.netDisposable),        "Determines resolution option"],
                ].map(([label, val, src], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                    <td style={{ padding: "6px 12px", fontSize: 12, color: "#2c3e50" }}>{label}</td>
                    <td style={{ padding: "6px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#1a1a2e" }}>{val}</td>
                    <td style={{ padding: "6px 12px", fontSize: 11, color: "#7f8c8d" }}>{src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Checklist items={[
              "Ask for the representative's name and ID number at the start of the call — write it down",
              "Ask for a fax number so you can send your signed 433-F and documents while on the phone",
              "If you have many documents, ask for the ACS Support Group fax number or mailing address to follow up",
              "If placed on hold, you can request a callback — do not hang up without confirming next steps",
              "Ask for a 30-day hold on any collection action while your case is being reviewed",
              "Write down the confirmation number, date, and time of every call",
            ]} />
          </Section>

          {/* ── After the Call ── */}
          <Section title="✉️ After the Call — What to Send" color="#27ae60">
            <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.6, marginBottom: 12 }}>
              Fax or mail a complete package to the ACS rep or ACS Support Group. Include:
            </div>
            <Checklist items={[
              "Signed Form 433-F (downloaded above) — signed in ink, date matches the call date",
              "3 months of pay stubs for yourself (and spouse if co-liable)",
              "3 months of bank statements for all accounts listed on the 433-F",
              "Mortgage or lease agreement / most recent statement showing payment amount",
              "Vehicle loan statements",
              "Health insurance premium documentation",
              ...(hasBusiness ? ["3–6 months of business bank statements and profit/loss summary"] : []),
              "Cover sheet noting your name, SSN, the ACS representative's name/ID, and the date of your call",
            ]} />
            <div style={{ background: "#fef9e7", border: "1px solid #f39c12", borderRadius: 8, padding: 14, marginTop: 14, fontSize: 13 }}>
              <strong>⚠️ Fax confirmation:</strong> Always print a fax confirmation page. If mailing, use certified mail with return receipt and keep your tracking number. The IRS loses documents — your proof of submission protects you.
            </div>
          </Section>

          {/* ── Resolution Path Guidance ── */}
          <Section title={`🗺️ Your Resolution Path — ${r.recommendation}`} color={r.recColor}>
            {r.netDisposable <= 0 && (
              <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.7 }}>
                <strong>Currently Not Collectible (CNC):</strong> Tell the ACS rep your expenses exceed your income and you are requesting Currently Not Collectible status. They will review your 433-F. If approved, the IRS will shelve collection for 1–2 years and send you a periodic review notice. The CSED continues to run during CNC status — this is favorable to the taxpayer.
              </div>
            )}
            {r.netDisposable > 0 && r.netDisposable < 200 && (
              <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.7 }}>
                <strong>Borderline CNC / PPIA:</strong> With {fmt(r.netDisposable)}/month disposable income, you may qualify for CNC or a very low Partial Pay Installment Agreement. Tell the rep you are requesting the lowest possible installment agreement based on your financial disclosure. If your disposable income is {fmt(r.netDisposable)} and the total balance exceeds what that would pay before the CSED, a PPIA is appropriate.
              </div>
            )}
            {r.netDisposable >= 200 && r.netDisposable < 500 && (
              <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.7 }}>
                <strong>Partial Pay Installment Agreement (PPIA):</strong> Your disposable income of {fmt(r.netDisposable)}/month is the starting point for an installment agreement. Request a PPIA if the balance owed exceeds what {fmt(r.netDisposable)}/month would pay before the CSED. The ACS rep will propose an installment amount — you can negotiate based on your 433-F.
              </div>
            )}
            {r.netDisposable >= 500 && (
              <div style={{ fontSize: 13, color: "#2c3e50", lineHeight: 1.7 }}>
                <strong>Installment Agreement:</strong> Your disposable income of {fmt(r.netDisposable)}/month indicates a standard IA is likely. The ACS rep will propose a monthly payment — this should not exceed your net disposable income. If the balance is under $50,000 and you can pay within 72 months, you may qualify for a Streamlined IA which requires no financial disclosure.
              </div>
            )}
          </Section>

          <div style={{ background: "#f8f6f1", border: "1px solid #ddd", borderRadius: 8, padding: 14, fontSize: 12, color: "#7f8c8d", lineHeight: 1.7 }}>
            <strong>Remember:</strong> You have the right to represent yourself before the IRS. You are not required to have an attorney or CPA. Be straightforward with the ACS representative — provide your documentation, state your position clearly, and ask for written confirmation of any agreement. If you feel a resolution is unfair or the rep is unresponsive, you may request a supervisor or contact the Taxpayer Advocate Service (TAS) at 1-877-777-4778.
          </div>
        </div>
      )}
    </div>
  );
}

function StepResults({ allData, onDownload, downloading }) {
  const { personal, employment, income, expenses, business, assets, otherinfo } = allData;
  const r = calcResults(personal, employment, income, expenses, business, assets);
  const hasBusiness = business.hasBusiness === "Yes";
  const inActiveBankruptcy = otherinfo?.bankruptcy === "Yes" && !otherinfo?.bankruptcyDischarged && !otherinfo?.bankruptcyDismissed;

  const TRow = ({ label, actual, allowed, isStd }) => (
    <tr>
      <td style={{ padding: "6px 10px", fontSize: 13, color: "#2c3e50" }}>{label}</td>
      <td style={{ padding: "6px 10px", fontSize: 13, textAlign: "right" }}>{fmt(actual)}</td>
      <td style={{ padding: "6px 10px", fontSize: 13, textAlign: "right", color: isStd ? "#27ae60" : "#2c3e50", fontWeight: isStd ? 700 : 400 }}>{fmt(allowed)}</td>
    </tr>
  );

  const BoxCard = ({ label, sublabel, value, color = "#1a1a2e", note }) => (
    <div style={{ background: "#fff", border: `2px solid ${color}`, borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{label}</div>
      <div style={{ fontSize: 12, color: "#555", marginTop: 2, marginBottom: 8, lineHeight: 1.4 }}>{sublabel}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(value)}</div>
      {note && <div style={{ fontSize: 11, color: "#7f8c8d", marginTop: 4 }}>{note}</div>}
    </div>
  );

  return (
    <div>
      <SectionTitle>Financial Analysis &amp; Resolution Results</SectionTitle>

      {/* ── Primary Recommendation ── */}
      <div style={{ background: r.recBg, border: `2px solid ${r.recColor}`, borderRadius: 10, padding: 20, marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: r.recColor, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PRELIMINARY RESOLUTION RECOMMENDATION</div>
        <div style={{ fontSize: 20, color: r.recColor, fontWeight: 800 }}>{r.recommendation}</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 8 }}>Based on net monthly disposable income of {fmt(r.netDisposable)} after IRS allowable expenses</div>
        <div style={{ fontSize: 12, color: "#7f8c8d", marginTop: 6, fontStyle: "italic" }}>This is a preliminary analysis based on the information you provided. You have the right to represent yourself before the IRS — consulting a tax professional is an option, not a requirement, but may be helpful in complex situations.</div>
      </div>

      {/* ── Income Summary ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 10 }}>Monthly Income Summary</div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" }}>
          <thead><tr style={{ background: "#1a1a2e" }}>
            <th style={{ padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 }}>Source</th>
            <th style={{ padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 }}>Amount</th>
          </tr></thead>
          <tbody>
            {r.wages > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Your Wages</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.wages)}</td></tr>}
            {r.spouseWages > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Spouse Wages (co-liable)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.spouseWages)}</td></tr>}
            {r.netBizIncome > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Net Business Income</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.netBizIncome)}</td></tr>}
            {num(income.ssTaxpayer) > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Social Security</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(income.ssTaxpayer)}</td></tr>}
            {num(income.pensionTaxpayer) > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Pension</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(income.pensionTaxpayer)}</td></tr>}
            {num(income.rentalIncome) > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Net Rental Income</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(income.rentalIncome)}</td></tr>}
            {num(income.distributions) > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Distributions</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(income.distributions)}</td></tr>}
            {num(income.interestDividends) > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Interest / Dividends</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(income.interestDividends)}</td></tr>}
          </tbody>
          <tfoot><tr style={{ background: "#f0f3f4", fontWeight: 700 }}>
            <td style={{ padding: "8px 10px", fontSize: 14 }}>Total Monthly Income</td>
            <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 14 }}>{fmt(r.totalIncome)}</td>
          </tr></tfoot>
        </table>
      </div>

      {/* ── Expense Summary ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 10 }}>Monthly Expenses — Actual vs. IRS Allowed</div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" }}>
          <thead><tr style={{ background: "#1a1a2e" }}>
            <th style={{ padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 }}>Expense</th>
            <th style={{ padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 }}>Actual</th>
            <th style={{ padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 }}>IRS Allowed</th>
          </tr></thead>
          <tbody>
            {r.ficaTotal > 0 && <TRow label="FICA — Social Security &amp; Medicare (7.65%)" actual={r.ficaTotal} allowed={r.ficaTotal} />}
            <TRow label="Food, Clothing &amp; Misc" actual={num(expenses.food)+num(expenses.housekeeping)+num(expenses.clothing)+num(expenses.personalCare)+num(expenses.miscellaneous)} allowed={r.foodAllowed} isStd={r.foodAllowed === r.foodStd} />
            <TRow label="Housing &amp; Utilities" actual={num(expenses.rent)+num(expenses.utilities)+num(expenses.phone)+num(expenses.propTaxInsurance)+num(expenses.maintenance)} allowed={r.housingAllowed} />
            <TRow label="Vehicle Ownership" actual={num(expenses.vehiclePayment)} allowed={r.vehicleOwnershipAllowed} />
            <TRow label="Vehicle Operating" actual={num(expenses.vehicleOperating)} allowed={r.vehicleOperatingAllowed} />
            {num(expenses.publicTransit) > 0 && <TRow label="Public Transportation" actual={num(expenses.publicTransit)} allowed={num(expenses.publicTransit)} />}
            <TRow label="Health Insurance" actual={num(expenses.healthInsurance)} allowed={num(expenses.healthInsurance)} />
            <TRow label="Out-of-Pocket Health Care" actual={num(expenses.outOfPocketHealth)} allowed={r.oopAllowed} isStd={r.oopAllowed === r.healthStd} />
            {r.otherExpenses > 0 && <TRow label="Other Allowable Expenses" actual={r.otherExpenses} allowed={r.otherExpenses} />}
          </tbody>
          <tfoot><tr style={{ background: "#f0f3f4", fontWeight: 700 }}>
            <td style={{ padding: "8px 10px", fontSize: 14 }}>Total Allowable Expenses</td>
            <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right", fontSize: 14 }}>{fmt(r.totalAllowedExpenses)}</td>
          </tr></tfoot>
        </table>
      </div>

      {/* ── Net Disposable ── */}
      <div style={{ background: "#1a1a2e", color: "#f8f6f1", borderRadius: 10, padding: 20, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#c8a96e", fontWeight: 600 }}>NET MONTHLY DISPOSABLE INCOME</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Total Income − IRS Allowable Expenses</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: r.netDisposable <= 0 ? "#27ae60" : "#c8a96e" }}>{fmt(r.netDisposable)}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          OIC SECTION
      ══════════════════════════════════════════════════════ */}
      <div style={{ borderTop: "3px solid #c8a96e", paddingTop: 28, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Offer in Compromise (OIC) Analysis</div>
          <div style={{ background: "#5d2f86", color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>DOUBT AS TO COLLECTABILITY</div>
        </div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 1.6 }}>
          An Offer in Compromise allows you to settle your tax debt for less than the full amount owed if the IRS cannot reasonably collect the full balance before the Collection Statute Expiration Date (CSED). The minimum offer is your <strong>Reasonable Collection Potential (RCP)</strong> — the sum of your net reachable assets plus a multiple of your future disposable income.
        </div>

        {inActiveBankruptcy && (
          <InfoBox type="warn">
            ⛔ <strong>OIC Not Currently Available.</strong> You indicated an active bankruptcy. The IRS will not consider an Offer in Compromise while a bankruptcy case is pending. You must wait until the bankruptcy is discharged or dismissed before submitting an OIC.
          </InfoBox>
        )}

        {!inActiveBankruptcy && (
          <>
            {/* ── Box A: Personal Asset Equity ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", marginBottom: 10 }}>
                Box A — Personal Asset Equity
                <span style={{ fontSize: 12, fontWeight: 400, color: "#7f8c8d", marginLeft: 8 }}>Assets valued at 80% quick-sale value, minus any loans</span>
              </div>
              <InfoBox type="info">
                The IRS applies an <strong>80% quick-sale factor</strong> to most assets — reflecting what they could realistically recover in a forced sale. Cash and bank balances are taken at full value. Your primary vehicle has a $3,450 allowance subtracted before equity is counted.
              </InfoBox>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e9ecef", borderRadius: 8, overflow: "hidden" }}>
                <thead><tr style={{ background: "#2c3e50" }}>
                  <th style={{ padding: "8px 10px", color: "#fff", textAlign: "left", fontSize: 13 }}>Asset Category</th>
                  <th style={{ padding: "8px 10px", color: "#fff", textAlign: "right", fontSize: 13 }}>Quick-Sale Value</th>
                </tr></thead>
                <tbody>
                  {r.bankTotal > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Cash &amp; Bank Accounts (100%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.bankTotal)}</td></tr>}
                  {r.investmentTotal > 0 && <tr style={{ background: "#f9f9f9" }}><td style={{ padding: "6px 10px", fontSize: 13 }}>Investments &amp; Retirement (80%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.investmentTotal)}</td></tr>}
                  {r.lifeInsTotal > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Life Insurance Cash Value (80%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.lifeInsTotal)}</td></tr>}
                  {r.realEstateTotal > 0 && <tr style={{ background: "#f9f9f9" }}><td style={{ padding: "6px 10px", fontSize: 13 }}>Real Estate Equity (80%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.realEstateTotal)}</td></tr>}
                  {r.vehicleEquityRaw > 0 && (
                    <>
                      <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Vehicle Equity (80%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.vehicleEquityRaw)}</td></tr>
                      {r.vehicleAllowance > 0 && <tr style={{ background: "#f9f9f9" }}><td style={{ padding: "6px 10px", fontSize: 13, color: "#27ae60" }}>Less: Vehicle Allowance ({r.vehicleCount} vehicle{r.vehicleCount !== 1 ? "s" : ""})</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13, color: "#27ae60" }}>−{fmt(r.vehicleAllowance)}</td></tr>}
                    </>
                  )}
                  {r.otherAssetTotal > 0 && <tr><td style={{ padding: "6px 10px", fontSize: 13 }}>Other Assets (80%)</td><td style={{ padding: "6px 10px", textAlign: "right", fontSize: 13 }}>{fmt(r.otherAssetTotal)}</td></tr>}
                  {r.boxA === 0 && <tr><td colSpan={2} style={{ padding: "10px", fontSize: 13, color: "#7f8c8d", textAlign: "center" }}>No assets entered — enter asset values in Step 5</td></tr>}
                </tbody>
                <tfoot><tr style={{ background: "#2c3e50" }}>
                  <td style={{ padding: "8px 10px", fontSize: 14, color: "#c8a96e", fontWeight: 700 }}>Box A — Total Personal Asset Equity</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 14, color: "#c8a96e", fontWeight: 700 }}>{fmt(r.boxA)}</td>
                </tr></tfoot>
              </table>
            </div>

            {/* ── Box B ── */}
            {hasBusiness && (
              <InfoBox type="info">
                <strong>Box B — Business Asset Equity:</strong> Your business entity has a 433-B on file. Business asset equity calculation requires the completed 433-B financials and will be added when that form is processed. For now, Box B = $0 in this estimate.
              </InfoBox>
            )}

            {/* ── Box F / G / H: Future Income ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", marginBottom: 10 }}>
                Future Income Component — Boxes D, E, F
                <span style={{ fontSize: 12, fontWeight: 400, color: "#7f8c8d", marginLeft: 8 }}>OIC uses stricter expense standards than IA/CNC</span>
              </div>
              <InfoBox type="warn">
                ⚠️ <strong>OIC expense standards are stricter</strong> than regular installment agreement standards. Voluntary retirement contributions and student loan payments are generally <em>not</em> allowed as deductions. The IRS also excludes unsecured debt minimum payments from the OIC expense calculation.
              </InfoBox>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <BoxCard label="Box D" sublabel="Total Monthly Household Income" value={r.boxD} color="#1a5276" />
                <BoxCard label="Box E" sublabel="OIC Allowable Monthly Expenses" value={r.boxE} color="#2c3e50" />
                <BoxCard label="Box F" sublabel="Remaining Monthly Income (D − E)" value={r.boxF} color={r.boxF <= 0 ? "#1e8449" : "#c8a96e"} note={r.boxF <= 0 ? "No future income component" : undefined} />
              </div>

              {/* ── RCP Summary ── */}
              <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#c8a96e", fontWeight: 700, marginBottom: 14, letterSpacing: 0.5 }}>REASONABLE COLLECTION POTENTIAL (RCP)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "rgba(200,169,110,0.12)", borderRadius: 8, padding: 16, border: "1px solid rgba(200,169,110,0.3)" }}>
                    <div style={{ fontSize: 12, color: "#c8a96e", fontWeight: 600, marginBottom: 4 }}>💵 CASH OFFER (Lump Sum)</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Pay within 5 months of acceptance<br/>Box A+B + (Box F × 12)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#f8f6f1", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box A (assets):</span><span>{fmt(r.boxA)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box B (business):</span><span>{fmt(r.boxB)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box G (F × 12):</span><span>{fmt(r.boxG)}</span></div>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span style={{ color: "#c8a96e" }}>Minimum Offer:</span>
                        <span style={{ color: "#c8a96e", fontSize: 16 }}>{fmt(r.minOfferCash)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>+ $205 application fee + 20% of offer amount down with submission</div>
                  </div>
                  <div style={{ background: "rgba(200,169,110,0.08)", borderRadius: 8, padding: 16, border: "1px solid rgba(200,169,110,0.2)" }}>
                    <div style={{ fontSize: 12, color: "#c8a96e", fontWeight: 600, marginBottom: 4 }}>📅 DEFERRED PAYMENT</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>Pay in monthly installments over 6–24 months<br/>Box A+B + (Box F × 24)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#f8f6f1", marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box A (assets):</span><span>{fmt(r.boxA)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box B (business):</span><span>{fmt(r.boxB)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Box H (F × 24):</span><span>{fmt(r.boxH)}</span></div>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span style={{ color: "#c8a96e" }}>Minimum Offer:</span>
                        <span style={{ color: "#c8a96e", fontSize: 16 }}>{fmt(r.minOfferDeferred)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>+ $205 application fee + 1st monthly payment with submission</div>
                  </div>
                </div>
              </div>

              {/* ── OIC Practical Guidance ── */}
              <div style={{ background: "#f5eef8", border: "1px solid #8e44ad", borderRadius: 8, padding: 16, fontSize: 13, color: "#4a235a", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>📌 Before submitting an OIC, consider:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>✓ Must be in filing compliance — all required returns filed</div>
                  <div>✓ Must be in payment compliance — current year estimated taxes paid</div>
                  <div>✓ Cannot be in an active bankruptcy</div>
                  <div>✓ CSED is tolled (paused) while an OIC is pending</div>
                  <div>✓ 5-year compliance period after acceptance — any default revives the full liability</div>
                  <div>✓ IRS has 2 years to accept or reject; if no decision, offer is deemed accepted</div>
                  <div>✓ Low-income taxpayers may qualify for fee waiver</div>
                  <div>✓ Doubt as to Liability OIC is a separate track — no financial disclosure required</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Forms to Generate ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 12 }}>Forms That Will Be Generated</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Form 433-F (ACS)", key: "433f" },
            { label: "Form 433-A (Revenue Officer)", key: "433a" },
            ...(hasBusiness ? [{ label: "Form 433-B (Business)", key: "433b" }] : []),
            { label: "Form 433-A OIC", key: "433aoic" },
            { label: "Form 656 (Offer Contract)", key: "656" },
          ].map(f => (
            <div key={f.key} style={{ background: "#ebf5fb", border: "1px solid #3498db", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#1a5276", fontWeight: 600 }}>
              ✓ {f.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { key: "433f", label: "433-F (ACS)" },
          { key: "433a", label: "433-A (RO)" },
          ...(hasBusiness ? [{ key: "433b", label: "433-B (Business)" }] : []),
          { key: "433aoic", label: "433-A OIC" },
          { key: "656",     label: "Form 656" },
        ].map(f => (
          <button key={f.key} onClick={() => onDownload(f.key)} disabled={!!downloading}
            style={{ background: "#1a1a2e", color: "#c8a96e", border: "none", borderRadius: 8, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: downloading ? "default" : "pointer", opacity: downloading === f.key ? 0.7 : 1 }}>
            {downloading === f.key ? "Generating..." : `⬇ Download ${f.label}`}
          </button>
        ))}
      </div>
      {downloading && <div style={{ marginTop: 12, fontSize: 13, color: "#7f8c8d" }}>Generating filled PDF… this may take a moment.</div>}

      {/* ══════════════════════════════════════════════════════
          ACS CALL PREP & NEXT STEPS
      ══════════════════════════════════════════════════════ */}
      <ACSCallPrep allData={allData} results={r} />
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function IRSIntakeWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [downloading, setDownloading] = useState(null);

  const [formData, setFormData] = useState({
    personal: { dependents: [], vehicles: [] },
    business: { businesses: [{}] },
    employment: {},
    otherinfo: {},
    assets: { bankAccounts: [], investments: [], lifeInsurance: [], realEstate: [], vehicles: [], creditCards: [], otherAssets: [] },
    income: {},
    expenses: {},
    oic: { taxPeriods: [], digitalAssets: [] },
  });

  const setSection = useCallback((section) => (key, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);

  const handleDownload = async (formType) => {
    setDownloading(formType);
    // Compute RCP so Form 656 and 433-A OIC get the correct offer amounts
    const r = calcResults(
      formData.personal, formData.employment, formData.income,
      formData.expenses, formData.business, formData.assets
    );
    const enrichedData = {
      ...formData,
      oic: {
        ...formData.oic,
        minOfferCash:     r.minOfferCash,
        minOfferDeferred: r.minOfferDeferred,
        boxA: r.boxA,
        boxF: r.boxF,
        boxG: r.boxG,
        boxH: r.boxH,
      }
    };
    try {
      const response = await fetch("/api/generate-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, data: enrichedData }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IRS-${formType.toUpperCase()}-${formData.personal.lastName || "taxpayer"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("PDF generation is handled server-side. Please use the print summary as an interim measure.");
      }
    } catch {
      alert("PDF generation requires server integration. Your data has been collected — use the summary to manually complete the forms.");
    }
    setDownloading(null);
  };

  const step = STEPS[currentStep];
  const progress = Math.round((currentStep / (STEPS.length - 1)) * 100);

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#f8f6f1", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", color: "#f8f6f1", padding: "16px 24px", borderBottom: "3px solid #c8a96e" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#c8a96e" }}>IRS Financial Intake</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>Form 433-A / 433-F / 433-B Auto-Fill System</div>
          </div>
          <div style={{ fontSize: 12, color: "#c8a96e", textAlign: "right" }}>
            Step {currentStep + 1} of {STEPS.length}<br />
            <span style={{ color: "#aaa" }}>{step.label}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: "#1a1a2e", padding: "0 24px 16px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2,
                background: i <= currentStep ? "#c8a96e" : "#374151",
                cursor: i < currentStep ? "pointer" : "default",
                transition: "background 0.3s"
              }} onClick={() => i < currentStep && setCurrentStep(i)} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ fontSize: 9, color: i <= currentStep ? "#c8a96e" : "#6b7280",
                textAlign: "center", flex: 1, cursor: i < currentStep ? "pointer" : "default" }}
                onClick={() => i < currentStep && setCurrentStep(i)}>
                <div>{s.icon}</div>
                <div style={{ display: window.innerWidth > 600 ? "block" : "none" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e9ecef", padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          {step.id === "personal" && (
            <StepPersonal data={formData.personal} set={setSection("personal")} />
          )}
          {step.id === "business" && (
            <StepBusiness data={formData.business} set={setSection("business")} />
          )}
          {step.id === "employment" && (
            <StepEmployment data={formData.employment} set={setSection("employment")} bizData={formData.business} personalData={formData.personal} />
          )}
          {step.id === "otherinfo" && (
            <StepOtherInfo data={formData.otherinfo} set={setSection("otherinfo")} />
          )}
          {step.id === "assets" && (
            <StepAssets data={formData.assets} set={setSection("assets")} />
          )}
          {step.id === "income" && (
            <StepIncome data={formData.income} set={setSection("income")} bizData={formData.business} empData={formData.employment} />
          )}
          {step.id === "expenses" && (
            <StepExpenses data={formData.expenses} set={setSection("expenses")} personalData={formData.personal} />
          )}
          {step.id === "oic" && (
            <StepOIC data={formData.oic} set={setSection("oic")} allData={formData} />
          )}
          {step.id === "results" && (
            <StepResults allData={formData} onDownload={handleDownload} downloading={downloading} />
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid #e9ecef" }}>
            <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              style={{ background: currentStep === 0 ? "#e9ecef" : "#fff", color: currentStep === 0 ? "#aaa" : "#1a1a2e",
                border: "1.5px solid", borderColor: currentStep === 0 ? "#e9ecef" : "#1a1a2e",
                borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: currentStep === 0 ? "default" : "pointer" }}>
              ← Back
            </button>
            <div style={{ fontSize: 12, color: "#aaa", alignSelf: "center" }}>
              {Math.round((currentStep / (STEPS.length - 1)) * 100)}% complete
            </div>
            {currentStep < STEPS.length - 1 ? (
              <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                style={{ background: "#1a1a2e", color: "#c8a96e", border: "none",
                  borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Continue →
              </button>
            ) : (
              <div style={{ fontSize: 13, color: "#7f8c8d", alignSelf: "center" }}>✓ Review complete</div>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          This tool is designed for self-help and informational purposes. You have the right to represent yourself before the IRS — many taxpayers do so successfully. That said, IRS collection cases can be complex, and consulting a qualified tax professional such as an Enrolled Agent, CPA, or tax attorney may help you get the best possible outcome. It is never required, but it is always an option. Taylor Tax and Financial Consulting Inc. | (615) 953-7124
        </div>
      </div>
    </div>
  );
}
