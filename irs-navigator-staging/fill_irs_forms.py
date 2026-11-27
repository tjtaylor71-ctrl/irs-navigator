"""
IRS Form Auto-Fill Script
Fills 433-F, 433-A, 433-B, 433-A OIC, and Form 656 from intake wizard JSON.

Usage:
  python fill_irs_forms.py <intake_data.json> <form_type> <output.pdf>
  form_type: 433f | 433a | 433b | 433aoic | 656

Source PDFs default to /mnt/user-data/uploads/ or set IRS_PDF_DIR env variable.
"""

import os
import sys
import json
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, BooleanObject
from copy import deepcopy

# ── Helpers ───────────────────────────────────────────────────────────────────

def n(val, default=""):
    """Safely stringify a value."""
    if val is None:
        return default
    return str(val).strip()

def money(val):
    """Format as dollar amount without symbol for form fields."""
    try:
        return f"{float(str(val).replace(',','').replace('$','')):.0f}"
    except:
        return ""

def calc_monthly(gross, period):
    """Convert pay period gross to monthly."""
    try:
        g = float(str(gross).replace(',','').replace('$',''))
    except:
        return ""
    multipliers = {"Weekly": 4.3, "Biweekly": 2.17, "Semimonthly": 2.0, "Monthly": 1.0}
    m = multipliers.get(period, 1.0)
    return f"{g * m:.0f}"

def date_fmt(val):
    """Convert YYYY-MM-DD to MM/DD/YYYY."""
    if not val:
        return ""
    parts = str(val).split("-")
    if len(parts) == 3:
        return f"{parts[1]}/{parts[2]}/{parts[0]}"
    return val

def phone_fmt(val):
    """Strip to digits only for phone fields."""
    if not val:
        return ""
    digits = ''.join(c for c in str(val) if c.isdigit())
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return val

def yesno(val, yes_val="Yes"):
    return yes_val if val == "Yes" else ""

def safe_get(d, *keys, default=""):
    """Safely navigate nested dict."""
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k, default)
    return d if d is not None else default

def fill_form(source_pdf, field_values, output_pdf):
    """Fill a PDF form. Supports both short field names and full hierarchical paths."""
    reader = PdfReader(source_pdf)
    writer = PdfWriter()
    writer.append(reader)

    # Build a mapping from full path -> (page_index, annotation_object)
    # and short name -> same, for fallback
    full_path_map = {}
    short_name_map = {}
    for page_idx, page in enumerate(reader.pages):
        if "/Annots" not in page:
            continue
        for annot in page["/Annots"]:
            obj = annot.get_object()
            if obj.get("/Subtype") != "/Widget":
                continue
            # Build full path by walking /Parent chain
            parts = []
            cur = obj
            while cur:
                t = cur.get("/T")
                if t:
                    parts.insert(0, str(t))
                par = cur.get("/Parent")
                cur = par.get_object() if par else None
            full_path = ".".join(parts)
            short_name = parts[-1] if parts else ""
            if full_path:
                full_path_map[full_path] = page_idx
            if short_name:
                if short_name not in short_name_map:
                    short_name_map[short_name] = page_idx

    # Build field_values keyed by short name for pypdf's update method
    # For each requested field_id, determine whether to use full path or short name
    by_page = {}  # page_idx -> {short_name: value}
    for field_id, value in field_values.items():
        # Extract the last segment as short name
        short = field_id.split(".")[-1] if "." in field_id else field_id
        # Prefer matching by short name (pypdf uses /T which is the short name)
        if short in short_name_map:
            page_idx = short_name_map[short]
        elif field_id in full_path_map:
            page_idx = full_path_map[field_id]
            short = field_id  # try full path as fallback
        else:
            page_idx = 0  # best-effort on page 0
        if page_idx not in by_page:
            by_page[page_idx] = {}
        by_page[page_idx][short] = value

    # Write fields page by page
    for page_idx, fields in by_page.items():
        try:
            writer.update_page_form_field_values(
                writer.pages[page_idx], fields, auto_regenerate=False
            )
        except Exception:
            pass

    with open(output_pdf, "wb") as f:
        writer.write(f)
    print(f"✓ Wrote {output_pdf}")


# ── 433-F Field Mapping ───────────────────────────────────────────────────────

def build_433f_fields(data):
    p = data.get("personal", {})
    emp = data.get("employment", {})
    inc = data.get("income", {})
    exp = data.get("expenses", {})
    biz = data.get("business", {})
    assets = data.get("assets", {})

    bank_accounts = assets.get("bankAccounts", [])
    investments = assets.get("investments", [])
    real_estate = assets.get("realEstate", [])
    vehicles = assets.get("vehicles", [])
    credit_cards = assets.get("creditCards", [])

    hh_total = int(n(p.get("householdUnder65") or 0)) + int(n(p.get("householdOver65") or 0))
    hh_under65 = n(p.get("householdUnder65", "0"))
    hh_over65 = n(p.get("householdOver65", "0"))

    isSelfEmp = biz.get("isSoleProprietor") == "Yes"

    fields = {
        # Identity
        "topmostSubform[0].Page1[0].address[0].NamesAddress[0]":
            f"{n(p.get('firstName'))} {n(p.get('lastName'))}\n{n(p.get('address'))}\n{n(p.get('city'))}, {n(p.get('state'))} {n(p.get('zip'))}",
        "topmostSubform[0].Page1[0].ssn[0].YourSocialSecurityNu[0]": n(p.get("ssn")),
        "topmostSubform[0].Page1[0].ssn[0].YourSpousesSocialSec[0]": n(p.get("spouseSsn")),
        "topmostSubform[0].Page1[0].address[0].CountyResidence[0]": n(p.get("county")),
        "topmostSubform[0].Page1[0].your_telephone[0].Home11[0]": phone_fmt(p.get("homePhone")),
        "topmostSubform[0].Page1[0].your_telephone[0].Cell11[0]": phone_fmt(p.get("cellPhone")),
        "topmostSubform[0].Page1[0].your_telephone[0].Work11[0]": phone_fmt(p.get("workPhone")),
        "topmostSubform[0].Page1[0].age[0].Under65[0]": hh_under65,
        "topmostSubform[0].Page1[0].age[0]._65Over[0]": hh_over65,
    }

    # Self-employment info
    if isSelfEmp:
        fields.update({
            "topmostSubform[0].Page1[0].age[0].NameBusiness[0]": n(emp.get("bizName")),
            "topmostSubform[0].Page1[0].age[0].BusinessEIN[0]": n(emp.get("bizEin")),
            "topmostSubform[0].Page1[0].age[0].TypeBusiness[0]": n(emp.get("bizType")),
            "topmostSubform[0].Page1[0].age[0].NumberEmployeesnotCo[0]": n(emp.get("bizEmployees")),
        })

    # Bank accounts (Section A - first 2 personal, first 2 investment)
    for i, acct in enumerate(bank_accounts[:2]):
        suffix = "" if i == 0 else str(i)
        idx = i + 1
        fields[f"topmostSubform[0].Page1[0].AccountsTable[0].#subform[{idx}].Name_and_Address_of_Institution[{i}]"] = \
            n(acct.get("bankName"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[0].#subform[{idx}].Account_Number[{i}]"] = \
            n(acct.get("accountNumber"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[0].#subform[{idx}].Type_of_Accour_I[{i}]"] = \
            n(acct.get("type"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[0].#subform[{idx}].Cuirenl_Balance_I_Value[{i}]"] = \
            money(acct.get("balance"))

    # Investments (Section A)
    for i, inv in enumerate(investments[:2]):
        idx = i + 1
        fields[f"topmostSubform[0].Page1[0].AccountsTable[1].#subform[{idx}].Name_and_Address_of_Institution[{i}]"] = \
            n(inv.get("institution"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[1].#subform[{idx}].Account_Number[{i}]"] = \
            n(inv.get("accountNumber"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[1].#subform[{idx}].Type_of_Accour_I[{i}]"] = \
            n(inv.get("type"))
        fields[f"topmostSubform[0].Page1[0].AccountsTable[1].#subform[{idx}].Cuirenl_Balance_I_Value[{i}]"] = \
            money(inv.get("value"))

    # Real Estate (Section B)
    for i, re in enumerate(real_estate[:2]):
        row = "row1" if i == 0 else "row2"
        fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].description[0].description[0]"] = \
            n(re.get("address"))
        fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].CurrentValue[0]"] = money(re.get("fmv"))
        fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].BalanceOwed[0]"] = money(re.get("loan"))
        equity = max(0, float(money(re.get("fmv")) or 0) - float(money(re.get("loan")) or 0))
        fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].Equity[0]"] = f"{equity:.0f}"
        fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].MonthlyPayments[0]"] = money(re.get("payment"))
        if re.get("type") == "Primary Residence":
            fields[f"topmostSubform[0].Page1[0].real_estate[0].{row}[0].description[0].PR{i+1}[0]"] = "/Yes"

    # Vehicles / Other Assets (Section C)
    for i, v in enumerate(vehicles[:2]):
        desc = f"{n(v.get('year'))} {n(v.get('make'))} {n(v.get('model'))}"
        fields[f"topmostSubform[0].Page1[0].OtherAssetsTableSubform[0].RowSubform{i+1}[0].Description{i+1}[0]"] = desc
        fields[f"topmostSubform[0].Page1[0].OtherAssetsTableSubform[0].RowSubform{i+1}[0].Monthly_Payment{i+1}[0]"] = money(v.get("payment"))
        fields[f"topmostSubform[0].Page1[0].OtherAssetsTableSubform[0].RowSubform{i+1}[0].Current_Value{i+1}[0]"] = money(v.get("fmv"))
        fields[f"topmostSubform[0].Page1[0].OtherAssetsTableSubform[0].RowSubform{i+1}[0].Balance_Owed{i+1}[0]"] = money(v.get("loan"))
        equity = max(0, float(money(v.get("fmv")) or 0) - float(money(v.get("loan")) or 0))
        fields[f"topmostSubform[0].Page1[0].OtherAssetsTableSubform[0].RowSubform{i+1}[0].Equity{i+1}[0]"] = f"{equity:.0f}"

    # Credit Cards (Section D)
    for i, cc in enumerate(credit_cards[:2]):
        suffix = "" if i == 0 else "1"
        fields[f"topmostSubform[0].Page1[0].credit_cards[0].row{i+1}[0].I_ype{suffix}[0]"] = n(cc.get("type"))
        fields[f"topmostSubform[0].Page1[0].credit_cards[0].row{i+1}[0].Crad_i_L_m_t{suffix}[0]"] = money(cc.get("limit"))
        fields[f"topmostSubform[0].Page1[0].credit_cards[0].row{i+1}[0].BalanLe_Owea{suffix}[0]"] = money(cc.get("balance"))
        fields[f"topmostSubform[0].Page1[0].credit_cards[0].row{i+1}[0].M_n_mim_Mon_hly_Payment{suffix}[0]"] = money(cc.get("minPayment"))

    # Section F - Employment
    fields.update({
        "topmostSubform[0].Page2[0].sectionF[0].column_1[0].fieldXmlnshttpwwwxfa[0]":
            f"{n(emp.get('employerName'))}\n{n(emp.get('employerAddress'))}",
        "topmostSubform[0].Page2[0].sectionF[0].column_1[0].GrossPerPayPeriod[0]": money(emp.get("grossPay")),
        "topmostSubform[0].Page2[0].sectionF[0].column_1[0].TaxesPerPayPeriodFed[0]": money(emp.get("fedTax")),
        "topmostSubform[0].Page2[0].sectionF[0].column_1[0].State[0]": money(emp.get("stateTax")),
        "topmostSubform[0].Page2[0].sectionF[0].column_1[0].HowLongAtCurrentEmpl[0]": n(emp.get("employerDuration")),
    })

    # Pay period checkboxes
    pay_period_map = {"Weekly": 0, "Biweekly": 1, "Semimonthly": 2, "Monthly": 3}
    pp_idx = pay_period_map.get(emp.get("payPeriod"), -1)
    if pp_idx >= 0:
        fields[f"topmostSubform[0].Page2[0].sectionF[0].column_1[0].YourEmployer[{pp_idx}]"] = "/1"

    if emp.get("spouseEmployed") == "Yes":
        fields.update({
            "topmostSubform[0].Page2[0].sectionF[0].column_2[0].FillText65[0]":
                f"{n(emp.get('spouseEmployerName'))}\n{n(emp.get('spouseEmployerAddress'))}",
            "topmostSubform[0].Page2[0].sectionF[0].column_2[0].Gross1[0]": money(emp.get("spouseGrossPay")),
            "topmostSubform[0].Page2[0].sectionF[0].column_2[0].Fed1[0]": money(emp.get("spouseFedTax")),
            "topmostSubform[0].Page2[0].sectionF[0].column_2[0].State1[0]": money(emp.get("spouseStateTax")),
        })
        spp_idx = pay_period_map.get(emp.get("spousePayPeriod"), -1)
        if spp_idx >= 0:
            fields[f"topmostSubform[0].Page2[0].sectionF[0].column_2[0].SpouseEmployer[{spp_idx}]"] = "/1"

    # Section G - Non-wage income
    fields.update({
        "topmostSubform[0].Page2[0].sectionG[0].column_1[0].AlimonyIncome[0]": money(inc.get("alimonyReceived")),
        "topmostSubform[0].Page2[0].sectionG[0].column_1[0].ChildSupportIncome[0]": money(inc.get("childSupportReceived")),
        "topmostSubform[0].Page2[0].sectionG[0].column_1[0].NetSelfEmploymentInc[0]": money(inc.get("bizGrossReceipts")) if isSelfEmp else "",
        "topmostSubform[0].Page2[0].sectionG[0].column_2[0].NetRentalIncome[0]": money(inc.get("rentalIncome")),
        "topmostSubform[0].Page2[0].sectionG[0].column_2[0].UnemploymentIncome[0]": money(inc.get("unemployment")),
        "topmostSubform[0].Page2[0].sectionG[0].column_2[0].PensionIncome[0]": money(inc.get("pensionTaxpayer")),
        "topmostSubform[0].Page2[0].sectionG[0].column_3[0].InterestDividendsInc[0]": money(inc.get("interestDividends")),
        "topmostSubform[0].Page2[0].sectionG[0].column_3[0].SocialSecurityIncome[0]": money(inc.get("ssTaxpayer")),
        "topmostSubform[0].Page2[0].sectionG[0].column_3[0].Other[0]": money(inc.get("otherIncome")),
        "topmostSubform[0].Page2[0].sectionG[0].column_3[0].if_other[0]": n(inc.get("otherIncomeDesc")),
    })

    # Section H - Expenses
    hh_size = max(1, int(hh_under65 or 0) + int(hh_over65 or 0))

    fields.update({
        # Food/clothing/misc
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].food_personal_care[0].food_personal_care[0].Row1[0].food_monthly[0]": money(exp.get("food")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].food_personal_care[0].food_personal_care[0].Row2[0].housekeeping_monthly[0]": money(exp.get("housekeeping")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].food_personal_care[0].food_personal_care[0].Row3[0].clothing_monthly[0]": money(exp.get("clothing")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].food_personal_care[0].food_personal_care[0].Row4[0].personal_care_monthly[0]": money(exp.get("personalCare")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].food_personal_care[0].food_personal_care[0].Row5[0].miscellaneous_monthly[0]": money(exp.get("miscellaneous")),
        # Transportation
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].transportation[0].Row1[0].gas_monthly[0]": money(exp.get("vehicleOperating")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].transportation[0].Row2[0].transportation_monthly[0]": money(exp.get("publicTransit")),
        # Housing
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].housing_utilities[0].Row1[0].rent_monthly[0]": money(exp.get("rent")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].housing_utilities[0].Row2[0].electric_monthly[0]": money(exp.get("utilities")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].housing_utilities[0].Row3[0].telephone_monthly[0]": money(exp.get("phone")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].housing_utilities[0].Row4[0].real_estate_monthly[0]": money(exp.get("propTaxInsurance")),
        "topmostSubform[0].Page2[0].sectionH[0].column_1[0].housing_utilities[0].Row5[0].maintenance_monthly[0]": money(exp.get("maintenance")),
        # Medical
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].medical[0].Row1[0].health_monthly[0]": money(exp.get("healthInsurance")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].medical[0].Row2[0].out_of_monthly[0]": money(exp.get("outOfPocketHealth")),
        # Other
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row1[0].child_monthly[0]": money(exp.get("childCare")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row2[0].tax_payments_monthly[0]": money(exp.get("currentTaxes")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row3[0].term_life_monthly[0]": money(exp.get("termLife")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row4[0].required_retirement_monthly[0]": money(exp.get("requiredRetirement")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row5[0].voluntary_retirement_monthly[0]": money(exp.get("voluntaryRetirement")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row6[0].union_monthly[0]": money(exp.get("unionDues")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row7[0].delinquent_monthly[0]": money(exp.get("delinquentStateTax")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row8[0].student_loans_monthly[0]": money(exp.get("studentLoans")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row9[0].support_monthly[0]": money(exp.get("childSupportPaid")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row10[0].alimony_monthly[0]": money(exp.get("alimonyPaid")),
        "topmostSubform[0].Page2[0].sectionH[0].column_2[0].other[0].Row11[0].court_ordered_monthly[0]": money(exp.get("otherCourtOrdered")),
    })

    return fields


# ── 433-A Field Mapping ───────────────────────────────────────────────────────

def build_433a_fields(data):
    p = data.get("personal", {})
    emp = data.get("employment", {})
    inc = data.get("income", {})
    exp = data.get("expenses", {})
    biz = data.get("business", {})
    other = data.get("otherinfo", {})
    assets = data.get("assets", {})

    bank_accounts = assets.get("bankAccounts", [])
    investments = assets.get("investments", [])
    real_estate = assets.get("realEstate", [])
    vehicles = assets.get("vehicles", [])
    life_ins = assets.get("lifeInsurance", [])
    isSelfEmp = biz.get("isSoleProprietor") == "Yes"

    fields = {
        # Section 1 - Personal Info
        "topmostSubform[0].Page1[0].c1[0].Lines1a-b[0].p1-t4[0]":
            f"{n(p.get('firstName'))} {n(p.get('lastName'))}",
        "topmostSubform[0].Page1[0].c1[0].Lines1a-b[1].p1-t4[0]":
            f"{n(p.get('spouseFirstName'))} {n(p.get('spouseLastName'))}",
        "topmostSubform[0].Page1[0].c1[0].Line1c[0].p1-t6c[0]":
            f"{n(p.get('address'))}, {n(p.get('city'))}, {n(p.get('state'))} {n(p.get('zip'))}",
        "topmostSubform[0].Page1[0].c1[0].Line1c[0].p1-t7c[0]": n(p.get("county")),
        "topmostSubform[0].Page1[0].c1[0].Line1d[0].p1-t8d[0]": phone_fmt(p.get("homePhone")),
        "topmostSubform[0].Page1[0].c1[0].Line1d[0].p1-t9d[0]": phone_fmt(p.get("cellPhone")),
        "topmostSubform[0].Page1[0].c1[0].Line1e[0].p1-t10e[0]": phone_fmt(p.get("workPhone")),
    }

    # Marital status checkboxes
    if p.get("maritalStatus") == "Married":
        fields["topmostSubform[0].Page1[0].c1[0].C1_01_2a[0]"] = "/Yes"
    else:
        fields["topmostSubform[0].Page1[0].c1[0].C1_01_2a[1]"] = "/Yes"

    # SSN / DOB
    fields["topmostSubform[0].Page1[0].c1[0].Table_Part4-Line5[0].Row1[0].F02_030_0_[0]"] = n(p.get("ssn"))
    fields["topmostSubform[0].Page1[0].c1[0].Table_Part4-Line5[0].Row1[0].F02_031_0_[0]"] = date_fmt(p.get("dob"))
    fields["topmostSubform[0].Page1[0].c1[0].Table_Part4-Line5[0].Row2[0].F02_034_0_[0]"] = n(p.get("spouseSsn"))
    fields["topmostSubform[0].Page1[0].c1[0].Table_Part4-Line5[0].Row2[0].F02_035_0_[0]"] = date_fmt(p.get("spouseDob"))

    # Dependents
    deps = p.get("dependents", [])
    dep_keys = [
        ("topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row1[0].Name[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row1[0].Age[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row1[0].Relationship[0]"),
        ("topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row2[0].Name[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row2[0].Age[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row2[0].Relationship[0]"),
        ("topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row3[0].Name[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row3[0].Age[0]",
         "topmostSubform[0].Page1[0].c2[0].ClaimedAsDependents[0].Row3[0].Relationship[0]"),
    ]
    for i, dep in enumerate(deps[:3]):
        fields[dep_keys[i][0]] = n(dep.get("name"))
        fields[dep_keys[i][1]] = n(dep.get("age"))
        fields[dep_keys[i][2]] = n(dep.get("relationship"))

    # Business interest (Section 1, line 3)
    if biz.get("hasBusiness") == "Yes":
        fields["topmostSubform[0].Page1[0].c2[0].Line3a[0].tab_order[0].Yes[0]"] = "/Yes"
        bizzes = biz.get("businesses", [{}])
        b = bizzes[0] if bizzes else {}
        fields["topmostSubform[0].Page1[0].c2[0].Lines3b[0].BusinessName[0]"] = n(b.get("name"))
        fields["topmostSubform[0].Page1[0].c2[0].Line3a[0].tab_order[0].PercentageOfOwnership[0]"] = n(b.get("ownership"))
        fields["topmostSubform[0].Page1[0].c2[0].Line3a[0].tab_order[0].Title[0]"] = n(b.get("title"))
        btype = b.get("type", "")
        for bt, fid in [("Partnership", "topmostSubform[0].Page1[0].c2[0].Line3c[0].Partnership[0]"),
                        ("LLC", "topmostSubform[0].Page1[0].c2[0].Line3c[0].LLC[0]"),
                        ("Corporation", "topmostSubform[0].Page1[0].c2[0].Line3c[0].Corporation[0]")]:
            if bt.lower() in btype.lower():
                fields[fid] = "/Yes"
    else:
        fields["topmostSubform[0].Page1[0].c2[0].Line3a[0].No[0]"] = "/Yes"

    # Section 2 - Employment
    fields.update({
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].p1_t15_4a[0]": n(emp.get("employerName")),
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].p1_t16_4b[0]": n(emp.get("employerAddress")),
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].Line4cWork[0].p1-t17_4c[0]": phone_fmt(emp.get("workPhone")),
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].Line4e[0].p1_t19_4e[0]": n(emp.get("employerDuration")),
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].p1_t21_4f[0]": n(emp.get("occupation")),
        "topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].p1_t22_4g[0]": n(emp.get("dependentsClaimed")),
    })

    # Contact at work
    if emp.get("canContactWork") == "Yes":
        fields["topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].c1_4d_[0]"] = "/Yes"
    else:
        fields["topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].c1_4d_[1]"] = "/Yes"

    # Pay period checkboxes (taxpayer)
    pay_period_idx = {"Weekly": 0, "Biweekly": 1, "Semimonthly": 2, "Monthly": 3}
    pp = pay_period_idx.get(emp.get("payPeriod"), -1)
    if pp >= 0:
        fields[f"topmostSubform[0].Page1[0].Taxpayer\\.L4a-h[0].c1_4h_[{pp}]"] = "/Yes"

    # Spouse employment
    if emp.get("spouseEmployed") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].Spouse\\.L5a-h[0].p1_t23_5a[0]": n(emp.get("spouseEmployerName")),
            "topmostSubform[0].Page1[0].Spouse\\.L5a-h[0].p1_t24_5b[0]": n(emp.get("spouseEmployerAddress")),
            "topmostSubform[0].Page1[0].Spouse\\.L5a-h[0].p1_t28_5f[0]": n(emp.get("spouseOccupation")),
        })
        spp = pay_period_idx.get(emp.get("spousePayPeriod"), -1)
        if spp >= 0:
            fields[f"topmostSubform[0].Page1[0].Spouse\\.L5a-h[0].c1_5h_[{spp}]"] = "/Yes"

    # Section 3 - Other financial info
    for flag, yes_key, no_key in [
        ("lawsuit",        "topmostSubform[0].Page1[0].c1_6_[0]",    "topmostSubform[0].Page1[0].c1_6_[1]"),
        ("bankruptcy",     "topmostSubform[0].Page1[0].c1_7_[0]",    "topmostSubform[0].Page1[0].c1_7_[1]"),
        ("livedAbroad",    "topmostSubform[0].Page1[0].c1_8_[0]",    "topmostSubform[0].Page1[0].c1_8_[1]"),
        ("beneficiaryTrust","topmostSubform[0].Page1[0].c1_9a_[0]", "topmostSubform[0].Page1[0].c1_9a_[1]"),
        ("isTrustee",      "topmostSubform[0].Page1[0].c1_9b_[0]",  "topmostSubform[0].Page1[0].c1_9b_[1]"),
        ("safeDeposit",    "topmostSubform[0].Page1[0].c1_10_[0]",  "topmostSubform[0].Page1[0].c1_10_[1]"),
        ("assetTransfer",  "topmostSubform[0].Page1[0].#subform[8].c1_11_[0]", "topmostSubform[0].Page1[0].#subform[8].c1_11_[1]"),
    ]:
        if other.get(flag) == "Yes":
            fields[yes_key] = "/Yes"
        else:
            fields[no_key] = "/Yes"

    # Lawsuit details
    if other.get("lawsuit") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p1_t30_6[0]": n(other.get("lawsuitLocation")),
            "topmostSubform[0].Page1[0].p1_t31_6[0]": n(other.get("lawsuitAttorney")),
            "topmostSubform[0].Page1[0].p1_t32_6[0]": n(other.get("lawsuitDocket")),
            "topmostSubform[0].Page1[0].#subform[5].p1_t34_6[0]": money(other.get("lawsuitAmount")),
            "topmostSubform[0].Page1[0].p1_t35_6[0]": date_fmt(other.get("lawsuitDate")),
            "topmostSubform[0].Page1[0].p1_t36_6[0]": n(other.get("lawsuitSubject")),
        })
        if other.get("lawsuitRole") == "Plaintiff":
            fields["topmostSubform[0].Page1[0].c1_6a_[0]"] = "/Yes"
        else:
            fields["topmostSubform[0].Page1[0].c1_6a_[1]"] = "/Yes"

    # Bankruptcy details
    if other.get("bankruptcy") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p1_t37_7[0]": date_fmt(other.get("bankruptcyFiled")),
            "topmostSubform[0].Page1[0].p1_t38_7[0]": date_fmt(other.get("bankruptcyDismissed")),
            "topmostSubform[0].Page1[0].p1_t38_7[1]": date_fmt(other.get("bankruptcyDischarged")),
            "topmostSubform[0].Page1[0].p1_t39_7[0]": n(other.get("bankruptcyPetition")),
            "topmostSubform[0].Page1[0].p1_t40_7[0]": n(other.get("bankruptcyLocation")),
        })

    # Abroad dates
    if other.get("livedAbroad") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p2_t50_8[0]": date_fmt(other.get("abroadFrom")),
            "topmostSubform[0].Page1[0].p2_t51_8[0]": date_fmt(other.get("abroadTo")),
        })

    # Trust beneficiary
    if other.get("beneficiaryTrust") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p1_t44_9[0]": n(other.get("trustName")),
            "topmostSubform[0].Page1[0].p1-t45_9[0]": n(other.get("trustEin")),
            "topmostSubform[0].Page1[0].p1-t46_9[0]": money(other.get("trustAmount")),
            "topmostSubform[0].Page1[0].p1-t47_9[0]": n(other.get("trustWhen")),
        })

    # Trustee
    if other.get("isTrustee") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p2_t00_9b[0]": n(other.get("trusteeTrustName")),
            "topmostSubform[0].Page1[0].p1-t02_9b[0]": n(other.get("trusteeEin")),
        })

    # Safe deposit
    if other.get("safeDeposit") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].p1_t41_10[0]": n(other.get("safeDepositLocation")),
            "topmostSubform[0].Page1[0].value[0].p1-t42_10[0]": money(other.get("safeDepositValue")),
            "topmostSubform[0].Page1[0].p1-t43_10[0]": n(other.get("safeDepositContents")),
        })

    # Asset transfer
    if other.get("assetTransfer") == "Yes":
        fields.update({
            "topmostSubform[0].Page1[0].#subform[8].p3_t1_11[0]": n(other.get("transferAsset")),
            "topmostSubform[0].Page1[0].#subform[8].p3_t2_11[0]": money(other.get("transferValue")),  # corrected
            "topmostSubform[0].Page1[0].#subform[8].p3_t3_11[0]": date_fmt(other.get("transferDate")),
            "topmostSubform[0].Page1[0].#subform[8].p3_t4_11[0]": n(other.get("transferTo")),
        })

    # Section 4 - Personal Assets

    # Cash on hand
    fields["topmostSubform[0].Page2[0].Table_Line13[0].Line12[0].AcctBal12[0].F02_001_11[0]"] = "0"

    # Bank accounts
    for i, acct in enumerate(bank_accounts[:2]):
        row = "Line12a" if i == 0 else "Line12b"
        suffix = "12a" if i == 0 else "12b"
        fields.update({
            f"topmostSubform[0].Page2[0].Table_Line13[0].{row}[0].{row.replace('Line','')}[0]":
                f"{n(acct.get('bankName'))}",
            f"topmostSubform[0].Page2[0].Table_Line13[0].{row}[0].p2-t{2+i*3}_{suffix}[0]":
                n(acct.get("accountNumber")),
            f"topmostSubform[0].Page2[0].Table_Line13[0].{row}[0].p2-t{3+i*3}_{suffix}[0]":
                n(acct.get("type")),
            f"topmostSubform[0].Page2[0].Table_Line13[0].{row}[0].p2-t{4+i*3}_{suffix}[0]":
                money(acct.get("balance")),
        })

    # Investments
    for i, inv in enumerate(investments[:2]):
        row = "Row13a" if i == 0 else "Row13b"
        fields.update({
            f"topmostSubform[0].Page2[0].Table_Line14[0].{row}[0].Line13{'A' if i==0 else 'B'}[0]":
                n(inv.get("institution")),
            f"topmostSubform[0].Page2[0].Table_Line14[0].{row}[0].p2_t{'13' if i==0 else '17'}_{row[-3:].lower()}[0]":
                money(inv.get("value")),
            f"topmostSubform[0].Page2[0].Table_Line14[0].{row}[0].p2_t{'12' if i==0 else '16'}_{row[-3:].lower()}[0]":
                money(inv.get("loan")),
            f"topmostSubform[0].Page2[0].Table_Line14[0].{row}[0].p2_t{'11' if i==0 else '15'}_{row[-3:].lower()}[0]":
                str(max(0, float(money(inv.get("value")) or 0) - float(money(inv.get("loan")) or 0))),
        })

    # Life Insurance
    if life_ins:
        li = life_ins[0]
        fields.update({
            "topmostSubform[0].Page2[0].Lines16b-f[0].Lines16b-f_Column1[0].p2_t30_16[0]": n(li.get("company")),
            "topmostSubform[0].Page2[0].Lines16b-f[0].Lines16b-f_Column2[0].p2_t31_16[0]": n(li.get("policyNum")),
            "topmostSubform[0].Page2[0].Lines16b-f[0].Lines16b-f_Column3[0].p2_t32_16c[0]": money(li.get("cashValue")),
            "topmostSubform[0].Page2[0].Lines16b-f[0].Lines16b-f_Column1[0].p2_t33_16c[0]": money(li.get("loan")),
        })
        fields["topmostSubform[0].Page2[0].c1_07_0_[0]"] = "/Yes"  # Has life insurance = Yes

    # Real Estate (Section 4, lines 17a/17b)
    for i, re in enumerate(real_estate[:2]):
        row = "Line17a" if i == 0 else "Line17b"
        page = "Page3"
        sfx = "17a" if i == 0 else "17b"
        base = f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0]"
        fields.update({
            f"{base}.Line17{'a' if i==0 else 'b'}[0]": n(re.get("type", "")),  # description
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{5+i*8}_{sfx}[0]": n(re.get("address")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{6+i*8}_{sfx}[0]": date_fmt(re.get("purchaseDate")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{7+i*8}_{sfx}[0]": money(re.get("fmv")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{8+i*8}_{sfx}[0]": money(re.get("loan")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{9+i*8}_{sfx}[0]": money(re.get("payment")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{10+i*8}_{sfx}[0]": date_fmt(re.get("finalPayment")),
            f"topmostSubform[0].{page}[0].Table_{row}[0].{row}[0].p3_t{11+i*8}_{sfx}[0]":
                str(max(0, float(money(re.get("fmv")) or 0) - float(money(re.get("loan")) or 0))),
            f"topmostSubform[0].{page}[0].Lender-phone{'3' if i==1 else ''}[0].p3_t{55 if i==1 else 30}_{sfx}LLN{'A' if i==1 else ''}[0]": n(re.get("lender")),
        })

    # Vehicles (lines 18a/18b)
    for i, v in enumerate(vehicles[:2]):
        sfx = "18a" if i == 0 else "18b"
        if i == 0:
            fields.update({
                "topmostSubform[0].Page3[0].Line18a[0].p3_t21_18aYR[0]": n(v.get("year")),
                "topmostSubform[0].Page3[0].Line18a[0].p3_t22_18aMILE[0]": n(v.get("mileage")),
                "topmostSubform[0].Page3[0].Purchase[0].p3_t23_18a[0]": date_fmt(v.get("purchaseDate")),
                "topmostSubform[0].Page3[0].CurrentFMV[0].p3_t24_18a[0]": money(v.get("fmv")),
                "topmostSubform[0].Page3[0].CurrentLoan[0].p3_t25_18a[0]": money(v.get("loan")),
                "topmostSubform[0].Page3[0].AmountPayment[0].p3_t26_18a[0]": money(v.get("payment")),
                "topmostSubform[0].Page3[0].DateFinal[0].p3_t27_18a[0]": date_fmt(v.get("finalPayment")),
                "topmostSubform[0].Page3[0].Equity[0].p3_t28_18a[0]": str(max(0, float(money(v.get("fmv")) or 0) - float(money(v.get("loan")) or 0))),
                "topmostSubform[0].Page3[0].Line18a[0].Line18aMKMDL[0]": f"{n(v.get('make'))} {n(v.get('model'))}",
                "topmostSubform[0].Page3[0].Line18a[0].p3_t29_18aTGNUM[0]": n(v.get("tag")),
                "topmostSubform[0].Page3[0].Line18a[0].p3_t29_18aVIN[0]": n(v.get("vin")),
                "topmostSubform[0].Page3[0].Lender-phone[0].p3_t30_18a[0]": n(v.get("lender")),
            })
        else:
            fields.update({
                "topmostSubform[0].Page3[0].Line18b[0].p3_t00_18bYR[0]": n(v.get("year")),
                "topmostSubform[0].Page3[0].Line18b[0].p3_t31_18bMILE[0]": n(v.get("mileage")),
                "topmostSubform[0].Page3[0].p3_t32_18b[0]": date_fmt(v.get("purchaseDate")),
                "topmostSubform[0].Page3[0].p3_t33_18b[0]": money(v.get("fmv")),
                "topmostSubform[0].Page3[0].p3_t34_18b[0]": money(v.get("loan")),
                "topmostSubform[0].Page3[0].p3_t35_18b[0]": money(v.get("payment")),
                "topmostSubform[0].Page3[0].p3_t36_18b[0]": date_fmt(v.get("finalPayment")),
                "topmostSubform[0].Page3[0].p3_t37_18b[0]": str(max(0, float(money(v.get("fmv")) or 0) - float(money(v.get("loan")) or 0))),
                "topmostSubform[0].Page3[0].Line18b[0].Line18b[0]": f"{n(v.get('make'))} {n(v.get('model'))}",
                "topmostSubform[0].Page3[0].Line18b[0].p3_t38_18b[0]": n(v.get("tag")),
                "topmostSubform[0].Page3[0].Line18b[0].p3_t29_18bVIN[0]": n(v.get("vin")),
                "topmostSubform[0].Page3[0].Lender-phone18b[0].p3_t39_18bLLN[0]": n(v.get("lender")),
            })

    # Section 5 - Income (lines 20-34)
    monthly_wages = calc_monthly(emp.get("grossPay"), emp.get("payPeriod"))
    spouse_wages = calc_monthly(emp.get("spouseGrossPay"), emp.get("spousePayPeriod"))
    net_biz = ""
    if isSelfEmp:
        try:
            biz_exp_keys = ["bizMaterials","bizInventory","bizWages","bizRent","bizSupplies",
                           "bizUtilities","bizVehicle","bizRepairs","bizInsurance","bizTaxes","bizOther"]
            total_exp = sum(float(money(inc.get(k)) or 0) for k in biz_exp_keys)
            net_biz = str(max(0, float(money(inc.get("bizGrossReceipts")) or 0) - total_exp))
        except:
            net_biz = ""

    fields.update({
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t57_20[0]": money(inc.get("wages")) or monthly_wages,
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t59_21[0]": money(inc.get("spouseWages")) or spouse_wages,
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t61_22[0]": money(inc.get("interestDividends")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t63_23[0]": net_biz,
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t65_24[0]": money(inc.get("rentalIncome")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t67_25[0]": money(inc.get("distributions")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t69_26[0]": money(inc.get("pensionTaxpayer")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t71_27[0]": money(inc.get("pensionSpouse")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t73_28[0]": money(inc.get("ssTaxpayer")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t75_29[0]": money(inc.get("ssSpouse")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t79_30[0]": money(inc.get("childSupportReceived")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t81_31[0]": money(inc.get("alimonyReceived")),
        "topmostSubform[0].Page4[0].TotalIncome[0].p3_t81_32[0]": money(inc.get("otherIncome")),
    })

    # Section 5 - Expenses (lines 35-49)
    fields.update({
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t58_35[0]":
            str(sum(float(money(exp.get(k)) or 0) for k in ["food","housekeeping","clothing","personalCare","miscellaneous"])),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t60_36[0]":
            str(sum(float(money(exp.get(k)) or 0) for k in ["rent","utilities","phone","propTaxInsurance","maintenance"])),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t62_37[0]": money(exp.get("vehiclePayment")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t64_38[0]": money(exp.get("vehicleOperating")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t66_39[0]": money(exp.get("publicTransit")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t68_40[0]": money(exp.get("healthInsurance")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t70_41[0]": money(exp.get("outOfPocketHealth")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t72_42[0]": money(exp.get("childSupportPaid")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t74_43[0]": money(exp.get("childCare")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t76_44[0]": money(exp.get("termLife")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t78_45[0]": money(exp.get("currentTaxes")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t80_46[0]": money(exp.get("securedDebts")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t82_47[0]": money(exp.get("delinquentStateTax")),
        "topmostSubform[0].Page4[0].TotalLivingExpenses[0].p3_t84_49[0]": money(exp.get("studentLoans")),
    })

    # Section 6/7 - Self-employment
    if isSelfEmp:
        fields.update({
            "topmostSubform[0].Page5[0].#subform[0].p5_t1_52[0]": n(emp.get("bizName")),
            "topmostSubform[0].Page5[0].#subform[0].Line1c[0].p1-t6c[0]": n(emp.get("bizEin")),
            "topmostSubform[0].Page5[0].p5_t2_53[0]": n(emp.get("bizType")),
            "topmostSubform[0].Page5[0].p5_t4_56[0]": n(emp.get("bizWebsite")),
            "topmostSubform[0].Page5[0].p5_t5_57[0]": n(emp.get("bizEmployees")),
            "topmostSubform[0].Page5[0].p5_t6_58a[0]": money(emp.get("bizPayroll")),
            "topmostSubform[0].Page5[0].#subform[0].p5_0_51[0]": "/Yes",  # Is sole prop = Yes
            # Section 7 income lines
            "topmostSubform[0].Page6[0].TotalMonthlyIncome[0].p6_t22_S6t[0]": money(inc.get("bizGrossReceipts")),
            # Section 7 expense lines
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t23_S6t[0]": money(inc.get("bizMaterials")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t25_S6t[0]": money(inc.get("bizInventory")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t27_S6t[0]": money(inc.get("bizWages")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t29_S6t[0]": money(inc.get("bizRent")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t31_S6t[0]": money(inc.get("bizSupplies")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t32_S6t[0]": money(inc.get("bizUtilities")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t34_S6t[0]": money(inc.get("bizVehicle")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t36_S6t[0]": money(inc.get("bizRepairs")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t38_S6t[0]": money(inc.get("bizInsurance")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t40_S6t[0]": money(inc.get("bizTaxes")),
            "topmostSubform[0].Page6[0].TotalMonthlyExpenses[0].p6_t42_S6t[0]": money(inc.get("bizOther")),
        })

    return fields


# ── 433-B Field Mapping ───────────────────────────────────────────────────────

def build_433b_fields(data):
    biz_data = data.get("business", {})
    businesses = biz_data.get("businesses", [{}])
    b = businesses[0] if businesses else {}
    assets = data.get("assets", {})
    p = data.get("personal", {})

    bank_accounts = assets.get("bankAccounts", [ba for ba in assets.get("bankAccounts", []) if ba.get("isBusiness")])
    # Use all bank accounts as potential business accounts if none flagged
    all_banks = assets.get("bankAccounts", [])

    fields = {
        # Section 1 - Business Info
        "topmostSubform[0].Page1[0].Line1a-f[0].p1_1_1a[0]": n(b.get("name")),
        "topmostSubform[0].Page1[0].Line1a-f[0].p1_3_1b[0]": n(b.get("address")),
        "topmostSubform[0].Page1[0].Line1a-f[0].p1_8_1c[0]": phone_fmt(b.get("phone")),
        "topmostSubform[0].Page1[0].p1_13_2a[0]": n(b.get("ein")),
        "topmostSubform[0].Page1[0].p1_16_2c[0]": n(b.get("ein")),  # date incorporated (reuse ein field label)
    }

    # Entity type checkbox
    btype = b.get("type", "")
    type_map = {
        "Partnership": "topmostSubform[0].Page1[0].c1_0_2b[0]",
        "Corporation": "topmostSubform[0].Page1[0].c1_0_2b[1]",
        "LLC": "topmostSubform[0].Page1[0].c1_0_2b[3]",
        "LLC-Corp": "topmostSubform[0].Page1[0].c1_0_2b[1]",
        "LLC-Other": "topmostSubform[0].Page1[0].c1_0_2b[3]",
    }
    for key, fid in type_map.items():
        if key.lower() in btype.lower():
            fields[fid] = f"/{key.split('-')[0]}"
            break

    # Section 2 - Personnel (the taxpayer as primary officer/member)
    fields.update({
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_33_7aFullNm[0]":
            f"{n(p.get('firstName'))} {n(p.get('lastName'))}",
        "topmostSubform[0].Page1[0].p1_39_SSN_7a[0]": n(p.get("ssn")),
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_34_7aTitle[0]": n(b.get("title")),
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_35_7aHmAdd[0]": n(p.get("address")),
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_36_7aCity[0]": n(p.get("city")),
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_37_7aSt[0]": n(p.get("state")),
        "topmostSubform[0].Page1[0].Line7a_Col1[0].p1_38_7aZIP[0]": n(p.get("zip")),
        "topmostSubform[0].Page1[0].p1_42_7aowner[0]": n(b.get("ownership")),
    })

    # Payroll tax responsibility
    if b.get("responsiblePayroll") == "Yes":
        fields["topmostSubform[0].Page1[0].Line7a_Col1[0].c1_01_7a[0]"] = "/Yes"
    else:
        fields["topmostSubform[0].Page1[0].Line7a_Col1[0].c1_01_7a[1]"] = "/No"

    # Phone split (area code + number)
    home_phone = ''.join(c for c in str(p.get("homePhone") or "") if c.isdigit())
    if len(home_phone) == 10:
        fields["topmostSubform[0].Page1[0].p1_40_7a_3digits[0]"] = home_phone[:3]
        fields["topmostSubform[0].Page1[0].p1_41_7a_7digits[0]"] = home_phone[3:]

    work_phone = ''.join(c for c in str(b.get("phone") or "") if c.isdigit())
    if len(work_phone) == 10:
        fields["topmostSubform[0].Page1[0].p1_43_7a_3digitswrk[0]"] = work_phone[:3]
        fields["topmostSubform[0].Page1[0].p1_44_7a_7digitswrk[0]"] = work_phone[3:]

    # Bank accounts (Section 4, lines 17a-17c)
    for i, acct in enumerate(all_banks[:3]):
        suffix = chr(ord('a') + i)
        fields.update({
            f"topmostSubform[0].Page2[0].17{suffix}[0].#subform[0].Type_of_Account[0]": n(acct.get("type")),
            f"topmostSubform[0].Page2[0].17{suffix}[0].#subform[0].Full_Name_and_Address[0]": n(acct.get("bankName")),
            f"topmostSubform[0].Page2[0].17{suffix}[0].#subform[0].Account_Number[0]": n(acct.get("accountNumber")),
        })

    return fields


# ── 433-A OIC Builder ──────────────────────────────────────────────────────────

def build_433aoic_fields(data):
    """Map intake wizard data to Form 433-A OIC fillable field IDs."""
    p  = data.get("personal", {})
    em = data.get("employment", {})
    inc = data.get("income", {})
    exp = data.get("expenses", {})
    biz = data.get("business", {})
    assets = data.get("assets", {})
    oic = data.get("oic", {})

    def num(v):
        try: return float(str(v).replace(",","").replace("$","").strip() or 0)
        except: return 0.0

    def fmt(v):
        n = num(v)
        return f"{n:,.2f}" if n else ""

    def dt(v):
        if not v: return ""
        try:
            from datetime import datetime
            return datetime.strptime(v, "%Y-%m-%d").strftime("%m/%d/%Y")
        except:
            return v

    def monthly(gross, period):
        g = num(gross)
        if not g: return 0
        m = {"Weekly": 4.3, "Biweekly": 2.17, "Semimonthly": 2.0, "Monthly": 1.0}
        return g * m.get(period, 1.0)

    # ── Quick-sale helpers ──
    def qs(fmv, loan=0): return max(0, num(fmv) - num(loan)) * 0.80

    fields = {}

    # ── Section 1: Personal Information ──
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Last_Name[0]"]  = p.get("lastName", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].First_Name[0]"] = p.get("firstName", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Date_Birth[0]"] = dt(p.get("dob", ""))
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].socialSecurityNumber[0]"] = p.get("ssn", "")

    # Marital status checkboxes: CB_01=Single, CB_02=Married, CB_03=Divorced, CB_04=Separated, CB_05=Widowed
    ms = p.get("maritalStatus", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].MaritalStatus[0].CB_01[0]"] = "/1" if ms == "Single" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].MaritalStatus[0].CB_02[0]"] = "/1" if ms == "Married" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].CB_03[0]"]                  = "/1" if ms == "Divorced" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].CB_04[0]"]                  = "/1" if ms == "Separated" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].CB_05[0]"]                  = "/1" if ms == "Widowed" else "Off"

    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Home_Address[0]"] = (
        p.get("address", "") + ", " + p.get("city", "") + ", " + p.get("state", "") + " " + p.get("zip", "")
    ).strip(", ")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Col1[0].County_Residence[0]"]  = p.get("county", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Col1[0].PrimaryPhone[0]"]      = p.get("cellPhone", "") or p.get("homePhone", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Col1[0].SecondaryPhone[0]"]    = p.get("homePhone", "") or p.get("workPhone", "")

    # Spouse (co-liable only)
    if p.get("spouseOnDebt") == "Yes":
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Spouse_Last_Name[0]"]              = p.get("spouseLastName", "")
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Spouse_First_Name[0]"]             = p.get("spouseFirstName", "")
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Spouse_Date_Birth[0]"]             = dt(p.get("spouseDob", ""))
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].SpouseSocialSecurityNumber[0]"]    = p.get("spouseSsn", "")

    # Household members (up to 4 rows)
    deps = p.get("dependents", [])
    for i, dep in enumerate(deps[:4]):
        row = i + 1
        base = f"topmostSubform[0].F433-A-OIC_Page1[0].Section1[0].Table1[0].Row{row}[0]"
        fields[f"{base}.Name_{row:02d}[0]"]         = dep.get("name", "")
        fields[f"{base}.Age_{row:02d}[0]"]          = str(dep.get("age", ""))
        fields[f"{base}.Relationship_{row:02d}[0]"] = dep.get("relationship", "")
        # Dependent on return? CB_06/CB_08 = Yes; CB_07/CB_09 = No (alternating pairs per row)
        yes_dep_id = f"{base}.Dependent[0].CB_{6 + i*4:02d}[0]"
        no_dep_id  = f"{base}.Dependent[0].CB_{7 + i*4:02d}[0]"
        fields[yes_dep_id] = "/1" if dep.get("claimedOnReturn") == "Yes" else "Off"
        fields[no_dep_id]  = "/1" if dep.get("claimedOnReturn") == "No"  else "Off"
        yes_inc_id = f"{base}.Contributes[0].CB_{8 + i*4:02d}[0]"
        no_inc_id  = f"{base}.Contributes[0].CB_{9 + i*4:02d}[0]"
        fields[yes_inc_id] = "/1" if dep.get("contributesIncome") == "Yes" else "Off"
        fields[no_inc_id]  = "/1" if dep.get("contributesIncome") == "No"  else "Off"

    # ── Section 2: Employment ──
    pp = em.get("payPeriod", "Monthly")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].pay_period[0].weekly[0]"]      = "/1" if pp == "Weekly" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].pay_period[0].biweekly[0]"]    = "/1" if pp in ("Biweekly","Semimonthly") else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].pay_period[0].monthly[0]"]     = "/1" if pp == "Monthly" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].Your_Employer_Name[0]"]        = em.get("employerName", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].Your_Occupation[0]"]           = em.get("occupation", "")
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].Your_Employer_Address[0]"]     = em.get("employerAddress", "")
    # Business interest checkbox
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].BusinessInterest[0].CB_22[0]"] = "/1" if biz.get("hasBusiness") == "Yes" else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].You[0].BusinessInterest[0].CB_23[0]"] = "/1" if biz.get("hasBusiness") != "Yes" else "Off"

    if p.get("spouseOnDebt") == "Yes":
        spp = em.get("spousePayPeriod", "Monthly")
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].pay_period[0].weekly[0]"]   = "/1" if spp == "Weekly" else "Off"
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].pay_period[0].biweekly[0]"] = "/1" if spp in ("Biweekly","Semimonthly") else "Off"
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].pay_period[0].monthly[0]"]  = "/1" if spp == "Monthly" else "Off"
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].Spouse_Employer_Name[0]"]   = em.get("spouseEmployerName", "")
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].Spouse_Occupation[0]"]      = em.get("spouseOccupation", "")
        fields["topmostSubform[0].F433-A-OIC_Page1[0].Section2[0].Spouse[0].Spouse_Employer_Address[0]"]= em.get("spouseEmployerAddress", "")

    # ── Page 2: Cash / Bank Accounts ──
    bank_accts = assets.get("bankAccounts", [])
    bank_total = sum(num(a.get("balance")) for a in bank_accts)
    acct_type_map = {"Checking": "CB2_01", "Savings": "CB2_02", "Money Market": "CB2_03", "CD": "CB2_04", "Online": "CB2_05"}
    for i, acct in enumerate(bank_accts[:2]):
        n = i + 1
        base = f"topmostSubform[0].F433-A-OIC_Page2[0].Account{n}[0]"
        fields[f"{base}.Bank_Name_{n}[0]"]    = acct.get("bankName", "")
        fields[f"{base}.Account_Number_{n}[0]"] = acct.get("accountNumber", "")
        fields[f"{base}.Total_Amount_{n}[0]"]   = fmt(acct.get("balance"))
        cb_key = acct_type_map.get(acct.get("type", ""), "CB2_01")
        # Shift checkbox index by 6 for account2
        fields[f"{base}.{cb_key.replace('CB2_0', f'CB2_{int(cb_key[-1])+(i*6):02d}' if i>0 else cb_key[-2:])}[0]"] = "/1"
    fields["topmostSubform[0].F433-A-OIC_Page2[0].TotalAccounts[0].Total_Amount_3[0]"] = fmt(bank_total)

    # ── Page 2: Investments ──
    investments = assets.get("investments", [])
    inv_total = sum(max(0, num(inv.get("value")) - num(inv.get("loan"))) * 0.80 for inv in investments)
    for i, inv in enumerate(investments[:2]):
        n = i + 1
        base = f"topmostSubform[0].F433-A-OIC_Page2[0].Institution{n}[0]"
        fields[f"{base}.Name_Financial_Institution[0]"] = inv.get("institution", "")
        fields[f"{base}.Account_Number_3[0]"]           = inv.get("accountNumber", "")
        fields[f"{base}.CurrentMarketValue[0].Current_Market_Value[0]"] = fmt(inv.get("value"))
        fields[f"{base}.LessLoanBal[0].Less_Loan_Balance[0]"]           = fmt(inv.get("loan"))
        fields[f"{base}.Total_Current_Market_Value[0]"]                 = fmt(qs(inv.get("value"), inv.get("loan")))
    fields["topmostSubform[0].F433-A-OIC_Page2[0].TotalInvestmentAccts[0].Total_Investment_Accounts[0]"] = fmt(inv_total)

    # ── Page 2: Digital assets (OIC-specific) ──
    digital = oic.get("digitalAssets", [])
    if digital:
        da = digital[0]
        dbase = "topmostSubform[0].F433-A-OIC_Page2[0].RetirementAcct1[0]"
        fields[f"{dbase}.virtualCurrency[0].virtualCurrency[0]"]          = "/1"
        fields[f"{dbase}.virtualCurrency[0].descriptionDigitalAsset[0]"]  = da.get("description", "")
        fields[f"{dbase}.numberOfUnits[0]"]                               = str(da.get("units", ""))
        fields[f"{dbase}.locationDigitalAsset[0]"]                        = da.get("location", "")
        fields[f"{dbase}.assetsAccountNumber[0]"]                         = da.get("accountNumber", "")
        fields[f"{dbase}.dollarEquivalentToday[0].digitalAssetToday[0]"]  = fmt(da.get("usdValue"))
        total_digital = sum(num(d.get("usdValue")) for d in digital) * 0.80
        fields[f"{dbase}.TotalCurrentMarketValue[0]"]                     = fmt(total_digital)

    # ── Page 2: Life Insurance ──
    li_policies = assets.get("lifeInsurance", [])
    li_total = sum(max(0, num(li.get("cashValue")) - num(li.get("loan"))) * 0.80 for li in li_policies)
    if li_policies:
        li = li_policies[0]
        lbase = "topmostSubform[0].F433-A-OIC_Page2[0].CurrentCash[0]"
        fields[f"{lbase}.Name_Insurance_Company[0]"] = li.get("company", "")
        fields[f"{lbase}.Policy_Number[0]"]          = li.get("policyNum", "")
        fields[f"{lbase}.CurrentCashValue[0].Current_Cash_Value[0]"] = fmt(li.get("cashValue"))
        fields[f"{lbase}.LessLoanBal1[0].Less_Loan_Balance[0]"]      = fmt(li.get("loan"))
        fields[f"{lbase}.Total_Current_Cash_Value[0]"]               = fmt(qs(li.get("cashValue"), li.get("loan")))
    fields["topmostSubform[0].F433-A-OIC_Page2[0].TotalLife[0].Total_Life_Insurance[0]"] = fmt(li_total)

    # ── Page 3: Real Estate ──
    real_estate = assets.get("realEstate", [])
    re_total = sum(qs(re.get("fmv"), re.get("loan")) for re in real_estate)
    for i, re in enumerate(real_estate[:2]):
        n = i + 1
        rbase = f"topmostSubform[0].F433-A-OIC_Page3[0].Property{n}[0]"
        fields[f"{rbase}.property_description[0]"]  = re.get("type", "")
        fields[f"{rbase}.purchased_lease_date[0]"]  = dt(re.get("purchaseDate"))
        fields[f"{rbase}.location[0]"]              = re.get("address", "")
        fmv = num(re.get("fmv"))
        loan = num(re.get("loan"))
        fields[f"{rbase}.current_market_value[0].current_market_value[1]"] = fmt(fmv)
        fields[f"{rbase}.current_market_value[0].times_8[0]"]              = fmt(fmv * 0.80)
        fields[f"{rbase}.minus_loan_balance[0].minus_loan_balance[1]"]     = fmt(loan)
        fields[f"{rbase}.total_real_estate[0]"]                             = fmt(qs(fmv, loan))
    fields["topmostSubform[0].F433-A-OIC_Page3[0].TotalValueProperty[0].Total_Value_Property[0]"] = fmt(re_total)

    # ── Page 3: Vehicles ──
    vehicles = assets.get("vehicles", [])
    veh_allowance_per = 3450.0
    veh_total_raw = sum(qs(v.get("fmv"), v.get("loan")) for v in vehicles if v.get("owned") == "Own")
    num_owned = len([v for v in vehicles if v.get("owned") == "Own"])
    veh_allowance = min(num_owned, 2) * veh_allowance_per
    veh_total = max(0, veh_total_raw - veh_allowance)
    for i, v in enumerate(vehicles[:2]):
        n = i + 1
        vbase = f"topmostSubform[0].F433-A-OIC_Page3[0].Vehicle{n}[0]"
        make_model = f"{v.get('year','')} {v.get('make','')} {v.get('model','')}".strip()
        fields[f"{vbase}.Vehicle_Make_Model[0]"] = make_model
        fields[f"{vbase}.Year[0]"]               = str(v.get("year", ""))
        fields[f"{vbase}.Mileage[0]"]            = str(v.get("mileage", ""))
        fmv  = num(v.get("fmv"))
        loan = num(v.get("loan"))
        fields[f"{vbase}.CurrentMarket[0].Current_Market_Value[0]"] = fmt(fmv)
        fields[f"{vbase}.CurrentMarket[0].Times_8[0]"]              = fmt(fmv * 0.80)
        fields[f"{vbase}.LessLoan[0].Less_Loan_Balance[0]"]         = fmt(loan)
        fields[f"{vbase}.Total_Value_Vehicle[0]"]                   = fmt(qs(fmv, loan))
    fields["topmostSubform[0].F433-A-OIC_Page3[0].Enter_Allowance[0]"]           = fmt(veh_allowance)
    fields["topmostSubform[0].F433-A-OIC_Page3[0].Total_Value_Vehicles_Amount[0]"] = fmt(veh_total)

    # ── Page 4 Section 3: Other Assets ──
    other_assets = assets.get("otherAssets", [])
    oa_total = sum(num(oa.get("value")) * 0.80 for oa in other_assets)
    for i, oa in enumerate(other_assets[:2]):
        n = i + 1
        oabase = f"topmostSubform[0].F433-A-OIC_Page4[0].Section3[0].OtherAsset{n}[0]"
        fields[f"{oabase}.Description[0]"] = oa.get("description", "")
        v = num(oa.get("value"))
        fields[f"{oabase}.CurrentMarketValue[0].Current_Market_Value[0]"] = fmt(v)
        fields[f"{oabase}.CurrentMarketValue[0].Times_8[0]"]              = fmt(v * 0.80)
        fields[f"{oabase}.Total_Other_Asset[0]"]                          = fmt(v * 0.80)
    fields["topmostSubform[0].F433-A-OIC_Page4[0].Section3[0].TotalOther[0].Total_Value_Other_Valuable_Items[0]"] = fmt(oa_total)

    # Box A: Total personal asset equity
    box_a = bank_total + inv_total + li_total + re_total + veh_total + oa_total
    fields["topmostSubform[0].F433-A-OIC_Page4[0].Section3[0].Available_Individual_Equity_Assets[0]"] = fmt(box_a)

    # ── Page 4 Section 4: Business Info (sole prop) ──
    is_sole_prop = biz.get("isSoleProprietor") == "Yes"
    if is_sole_prop:
        fields["topmostSubform[0].F433-A-OIC_Page4[0].Section4[0].Business[0].CB4_01[0]"] = "/1"
        fields["topmostSubform[0].F433-A-OIC_Page4[0].Section4[0].Name_Business[0]"]      = biz.get("bizName", "")
        fields["topmostSubform[0].F433-A-OIC_Page4[0].Section4[0].Address_Business[0]"]   = biz.get("bizAddress", "")
        fields["topmostSubform[0].F433-A-OIC_Page4[0].Section4[0].EIN[0]"]                = biz.get("bizEin", "")
        fields["topmostSubform[0].F433-A-OIC_Page4[0].Section4[0].Description_Business[0]"] = biz.get("bizType", "")

    # ── Page 5 Section 6: Business Income/Expenses (sole prop) ──
    if is_sole_prop:
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Gross_Receipts[0]"]       = fmt(inc.get("bizGrossReceipts"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Materials_Purchased[0]"]  = fmt(inc.get("bizMaterials"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Inventory_Purchased[0]"]  = fmt(inc.get("bizInventory"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Gross_Wages_Salaries[0]"] = fmt(inc.get("bizWages"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Rent[0]"]                 = fmt(inc.get("bizRent"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Supplies[0]"]             = fmt(inc.get("bizSupplies"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Utilities_Telephones[0]"] = fmt(inc.get("bizUtilities"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Vehicle_Costs[0]"]        = fmt(inc.get("bizVehicle"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Business_Insurance[0]"]   = fmt(inc.get("bizInsurance"))
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Other_Business_Expenses[0]"] = fmt(inc.get("bizOther"))
        biz_expenses = sum(num(inc.get(k)) for k in ["bizMaterials","bizInventory","bizWages","bizRent","bizSupplies","bizUtilities","bizVehicle","bizRepairs","bizInsurance","bizTaxes","bizOther"])
        net_biz = max(0, num(inc.get("bizGrossReceipts")) - biz_expenses)
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Total_Business_Expenses[0]"] = fmt(biz_expenses)
        fields["topmostSubform[0].F433-A-OIC_Page5[0].Section6[0].Net_Business_Income[0]"]     = fmt(net_biz)
    else:
        net_biz = 0

    # ── Page 6: Income ──
    wages = num(inc.get("wages")) or monthly(em.get("grossPay"), em.get("payPeriod","Monthly"))
    spouse_wages = num(inc.get("spouseWages")) if p.get("spouseOnDebt") == "Yes" else 0
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Primary[0].Wages[0].Primary_Taxpayer_Wages[0]"]             = fmt(wages)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Primary[0].Social[0].Primary_Taxpayer_Social_Security[0]"]  = fmt(inc.get("ssTaxpayer"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Primary[0].Pensions[0].Primary_Taxpayer_Pensions[0]"]       = fmt(inc.get("pensionTaxpayer"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Primary[0].Total_Primary_Taxpayer_Income[0]"]               = fmt(wages + num(inc.get("ssTaxpayer")) + num(inc.get("pensionTaxpayer")))

    if p.get("spouseOnDebt") == "Yes":
        fields["topmostSubform[0].F433-A-OIC_Page6[0].SpouseOther[0].Wages[0].Spouse_Other_Wages[0]"]         = fmt(spouse_wages)
        fields["topmostSubform[0].F433-A-OIC_Page6[0].SpouseOther[0].Social[0].Spouse_Other_Social_Security[0]"] = fmt(inc.get("ssSpouse"))
        fields["topmostSubform[0].F433-A-OIC_Page6[0].SpouseOther[0].Pensions[0].Spouse_Other_Pensions[0]"]   = fmt(inc.get("pensionSpouse"))
        fields["topmostSubform[0].F433-A-OIC_Page6[0].SpouseOther[0].Total_Spouse_Other_Income[0]"]           = fmt(spouse_wages + num(inc.get("ssSpouse")) + num(inc.get("pensionSpouse")))

    fields["topmostSubform[0].F433-A-OIC_Page6[0].Interest_Dividends[0]"]    = fmt(inc.get("interestDividends"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Distributions[0]"]         = fmt(inc.get("distributions"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Net_Rental_Income[0]"]     = fmt(inc.get("rentalIncome"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Net_Business_Income_BoxC[0]"] = fmt(net_biz)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Child_Support_Received[0]"]= fmt(inc.get("childSupportReceived"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Alimony_Received[0]"]      = fmt(inc.get("alimonyReceived"))

    total_income = (wages + spouse_wages + net_biz
        + num(inc.get("ssTaxpayer")) + num(inc.get("ssSpouse"))
        + num(inc.get("pensionTaxpayer")) + num(inc.get("pensionSpouse"))
        + num(inc.get("rentalIncome")) + num(inc.get("distributions"))
        + num(inc.get("childSupportReceived")) + num(inc.get("alimonyReceived"))
        + num(inc.get("interestDividends")) + num(inc.get("otherIncome")))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Total_Household_Income[0]"] = fmt(total_income)

    # ── Page 6: Expenses (OIC standards — stricter) ──
    from math import floor
    irs_food = {1:785, 2:1361, 3:1551, 4:1659, 5:1659}
    irs_housing = {1:2025, 2:2519, 3:2745, 4:2793, 5:2793}
    irs_oophealth_under65 = 79
    irs_oophealth_over65  = 153
    irs_veh_ownership = 594
    irs_veh_operating = 335

    hh_size = max(1, int(p.get("householdUnder65") or 0) + int(p.get("householdOver65") or 0))
    has_over65 = int(p.get("householdOver65") or 0) > 0
    hh_key = min(5, hh_size)

    food_actual = sum(num(exp.get(k)) for k in ["food","housekeeping","clothing","personalCare","miscellaneous"])
    food_std = irs_food.get(hh_key, 1659)
    food_allowed = max(food_actual, food_std)

    housing_actual = sum(num(exp.get(k)) for k in ["rent","utilities","phone","propTaxInsurance","maintenance"])
    housing_std = irs_housing.get(hh_key, 2793)
    housing_allowed = min(housing_actual or housing_std, housing_std)

    veh_count = min(2, len(assets.get("vehicles", [])))
    veh_own_allowed = min(num(exp.get("vehiclePayment")) or irs_veh_ownership * veh_count, irs_veh_ownership * veh_count)
    veh_op_allowed  = min(num(exp.get("vehicleOperating")) or irs_veh_operating, irs_veh_operating)
    pub_transit     = num(exp.get("publicTransit"))
    health_ins      = num(exp.get("healthInsurance"))
    oop_std         = (irs_oophealth_over65 if has_over65 else irs_oophealth_under65) * hh_size
    oop_allowed     = max(num(exp.get("outOfPocketHealth")), oop_std)

    # OIC-specific: exclude voluntary retirement, student loans, unsecured debts
    oic_other = sum(num(exp.get(k)) for k in ["childCare","termLife","childSupportPaid","alimonyPaid","otherCourtOrdered","currentTaxes","requiredRetirement"])

    # FICA: 7.65% of gross W-2 wages — mandatory deduction, taxpayer never receives this money
    FICA_RATE = 0.0765
    fica_taxpayer = wages * FICA_RATE
    fica_spouse   = spouse_wages * FICA_RATE
    fica_total    = fica_taxpayer + fica_spouse

    total_exp_oic = fica_total + food_allowed + housing_allowed + veh_own_allowed + veh_op_allowed + pub_transit + health_ins + oop_allowed + oic_other

    fields["topmostSubform[0].F433-A-OIC_Page6[0].Food_Clothing_Misc[0]"]        = fmt(food_allowed)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Housing_Utilities[0]"]         = fmt(housing_allowed)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Vehicle_Loan_Lease_Payments[0]"] = fmt(veh_own_allowed)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Vehicle_Operating_Costs[0]"]   = fmt(veh_op_allowed)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Public_Transportation_Costs[0]"] = fmt(pub_transit)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Health_Insurance_Premiums[0]"] = fmt(health_ins)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Out_Of_Pocket_Health_Care_Costs[0]"] = fmt(oop_allowed)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Court_Ordered_Payments[0]"]    = fmt(num(exp.get("childSupportPaid")) + num(exp.get("alimonyPaid")) + num(exp.get("otherCourtOrdered")))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Child_Dependent_Care_Expenses[0]"] = fmt(exp.get("childCare"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Current_Taxes[0]"]             = fmt(exp.get("currentTaxes"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Delinquent_State_Local_Taxes[0]"] = fmt(exp.get("delinquentStateTax"))
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Total_Household_Expenses[0]"]  = fmt(total_exp_oic)

    box_f = max(0, total_income - total_exp_oic)
    fields["topmostSubform[0].F433-A-OIC_Page6[0].Remaing_Monthly_Income[0]"]    = fmt(box_f)

    # ── Page 7: RCP Boxes ──
    box_g = box_f * 12   # cash offer multiplier
    box_h = box_f * 24   # deferred payment multiplier
    box_a = box_a  # already computed above
    min_cash     = box_a + box_g
    min_deferred = box_a + box_h

    fields["topmostSubform[0].F433-A-OIC_Page7[0].BoxF1[0].Total_Box_F_1[0]"]       = fmt(box_f)
    fields["topmostSubform[0].F433-A-OIC_Page7[0].Box_G_Future_Remaining_Income[0]"] = fmt(box_g)
    fields["topmostSubform[0].F433-A-OIC_Page7[0].BoxF2[0].Total_Box_F_2[0]"]       = fmt(box_f)
    fields["topmostSubform[0].F433-A-OIC_Page7[0].Box_H_Future_Remaining_Income[0]"] = fmt(box_h)
    fields["topmostSubform[0].F433-A-OIC_Page7[0].BoxAB[0].Box_A_Plus_Box_B[0]"]    = fmt(box_a)

    # Payment option: lump sum = Box G, deferred = Box H
    payment_opt = oic.get("paymentOption", "lump")
    if payment_opt == "lump":
        fields["topmostSubform[0].F433-A-OIC_Page7[0].BoxGH[0].Box_G_or_Box_H[0]"] = fmt(box_g)
        fields["topmostSubform[0].F433-A-OIC_Page7[0].Offer_Amount[0]"]             = fmt(min_cash)
        fields["topmostSubform[0].F433-A-OIC_Page7[0].C5_09[0]"]                   = "/1"  # lump sum checkbox
    else:
        fields["topmostSubform[0].F433-A-OIC_Page7[0].BoxGH[0].Box_G_or_Box_H[0]"] = fmt(box_h)
        fields["topmostSubform[0].F433-A-OIC_Page7[0].Offer_Amount[0]"]             = fmt(min_deferred)
        fields["topmostSubform[0].F433-A-OIC_Page7[0].C5_10[0]"]                   = "/1"  # deferred checkbox

    # Prior OIC
    prior = oic.get("priorOIC") == "Yes"
    fields["topmostSubform[0].F433-A-OIC_Page7[0].c1_7_[0]"] = "/Yes" if prior else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page7[0].c1_7_[1]"] = "Off"  if prior else "/No"

    # ── Page 8: Digital Asset Disclosure ──
    has_digital = oic.get("hasDigitalAssets") == "Yes"
    fields["topmostSubform[0].F433-A-OIC_Page8[0].do_you[0].CB7_yes[0]"] = "/1" if has_digital else "Off"
    fields["topmostSubform[0].F433-A-OIC_Page8[0].do_you[0].CB7_no[0]"]  = "Off" if has_digital else "/1"

    return fields


# ── Main ──────────────────────────────────────────────────────────────────────

# ── Form 656 Builder ───────────────────────────────────────────────────────────

def build_656_fields(data):
    """Map intake wizard data to Form 656 (Offer in Compromise) fillable fields."""
    p    = data.get("personal", {})
    biz  = data.get("business", {})
    oic  = data.get("oic", {})

    def num(v):
        try: return float(str(v).replace(",","").replace("$","").strip() or 0)
        except: return 0.0

    def fmt_dollar(v):
        """Whole dollars only — Form 656 requires no cents."""
        return str(int(round(num(v))))

    def fmt_money(v):
        n = num(v)
        return f"{n:,.2f}" if n else ""

    today = __import__("datetime").date.today().strftime("%m/%d/%Y")
    fields = {}

    # ── Section 1: Individual Information ──
    full_name = f"{p.get('firstName','')} {p.get('lastName','')}".strip()
    fields["Your_First_Middle_Last_Name[0]"] = full_name
    fields["YourSocialSecurityNumber[0]"]    = p.get("ssn", "")

    address = f"{p.get('address','')}, {p.get('city','')}, {p.get('state','')} {p.get('zip','')}".strip(", ")
    fields["Your_Home_Address[0]"]    = address
    fields["Your_Mailing_Address[0]"] = address  # same unless taxpayer specifies otherwise

    # New address since last filed return — default No
    fields["no[0]"]  = "/1"
    fields["no2[0]"] = "/1"

    # Co-liable spouse on Section 1
    if p.get("spouseOnDebt") == "Yes":
        spouse_name = f"{p.get('spouseFirstName','')} {p.get('spouseLastName','')}".strip()
        fields["Spouse_First_Middle_Last_Name[0]"] = spouse_name
        fields["SpouseSocialSecurityNumber[0]"]    = p.get("spouseSsn", "")

    # Sole prop EIN if applicable
    if biz.get("isSoleProprietor") == "Yes" and biz.get("bizEin"):
        fields["EIN[0]"] = biz.get("bizEin", "")

    # ── Tax Periods (Section 1 — Individual) ──
    tax_periods = oic.get("taxPeriods", [])
    form_1040_years  = []
    form_941_periods = []
    form_940_years   = []
    other_periods    = []
    tfrp_periods     = []

    for tp in tax_periods:
        ft = tp.get("formType", "")
        period = tp.get("period", "")
        if ft == "1040":
            form_1040_years.append(period)
        elif ft == "941":
            form_941_periods.append(period)
        elif ft == "940":
            form_940_years.append(period)
        elif ft == "tfrp":
            tfrp_periods.append(period)
        else:
            other_periods.append(f"{ft}: {period}")

    if form_1040_years:
        fields["_1040_Income_Tax_Years[0]"]   = ", ".join(form_1040_years[:3])
        fields["_1040_Income_Tax_Years_2[0]"] = ", ".join(form_1040_years[3:]) if len(form_1040_years) > 3 else ""
        fields["cB_03[0]"] = "/Yes"  # 1040 checkbox

    if form_941_periods:
        fields["_941_Quarterly_Periods_1[0]"] = ", ".join(form_941_periods[:3])
        fields["_941_Quarterly_Periods_2[0]"] = ", ".join(form_941_periods[3:]) if len(form_941_periods) > 3 else ""
        fields["cB_05[0]"] = "/Yes"

    if form_940_years:
        fields["_940_Years_1[0]"] = ", ".join(form_940_years[:3])
        fields["_940_Years_2[0]"] = ", ".join(form_940_years[3:]) if len(form_940_years) > 3 else ""
        fields["cB_06[0]"] = "/Yes"

    if tfrp_periods:
        fields["Trust_Fund_Recovery_Penalty_Period_Ending_1[0]"] = ", ".join(tfrp_periods)
        fields["cB_07[0]"] = "/Yes"

    if other_periods:
        fields["Other_Federal_Taxes_1[0]"] = ", ".join(other_periods)
        fields["cB_08[0]"] = "/Yes"

    # ── Section 2: Business Information (Corp/Partnership/LLC) ──
    is_entity = biz.get("hasBusiness") == "Yes" and biz.get("isSoleProprietor") != "Yes"
    if is_entity:
        fields["Business_Name[0]"]        = biz.get("bizName", "")
        fields["BusinessPhysicalAddress[0]"] = biz.get("bizAddress", "")
        fields["BusinessEIN[0]"]          = biz.get("bizEin", "")
        fields["newAddressNo[0]"]         = "/1"
        fields["updateRecordsNo[0]"]      = "/1"

    # ── Low-Income Certification ──
    if oic.get("claimFeeWaiver") == "Yes":
        # Two checkbox options — use AGI-based one for individuals
        fields["cB2_07[0]"] = "/Yes"   # "qualify_for" checkbox (AGI method)

    # ── Section 3: Reason for Offer ──
    if oic.get("basisDAC"):
        fields["datc[0]"] = "/1"
    elif oic.get("basisETA"):
        # ETA has two sub-types; default to Economic Hardship
        fields["EconomicHardship[0]"] = "/1"

    # ── Section 4: Payment Terms ──
    payment_opt  = oic.get("paymentOption", "lump")
    # Pull computed offer amounts from oic data if stored, otherwise use 0
    offer_cash     = num(oic.get("minOfferCash", 0))
    offer_deferred = num(oic.get("minOfferDeferred", 0))

    if payment_opt == "lump":
        fields["cB3_01[0]"] = "/1"   # Lump Sum checkbox
        offer_amt  = offer_cash
        down_20    = round(offer_amt * 0.20)
        remaining  = round(offer_amt - down_20)
        fields["Total_Offer_Amount[0]"]  = fmt_dollar(offer_amt)
        fields["Initial_Payment[0]"]     = fmt_dollar(down_20)
        fields["Remaining_Balance[0]"]   = fmt_dollar(remaining)
        # Default: pay remaining balance in one payment 5 months after acceptance
        if remaining > 0:
            fields["Amount_Payment_1[0]"]  = fmt_dollar(remaining)
            fields["Payable_Within_1[0]"]  = "5"
    else:
        # Periodic payment
        fields["cB3_02[0]"] = "/1"   # Periodic Payment checkbox
        offer_amt = offer_deferred
        monthly_pay = round(offer_amt / 24) if offer_amt else 0
        fields["Periodic_Payment_Amount_Of_Offer[0]"] = fmt_dollar(offer_amt)
        fields["Installment_Payment_1[0]"] = fmt_dollar(monthly_pay)
        fields["Installment_Payment_2[0]"] = fmt_dollar(monthly_pay)
        fields["Installment_Payment_Day[0]"] = "1"   # 1st of each month
        fields["Month[0]"]        = "24"
        fields["FinalPayment[0]"] = fmt_dollar(monthly_pay)
        fields["ReceivedOn[0]"]   = "1"
        fields["FinalMonth[0]"]   = "24"

    # ── Section 5: Designation of Payment ──
    # If multiple periods, taxpayer can designate — leave blank for IRS best interest
    # unless a single period was specified
    if len(tax_periods) == 1:
        tp = tax_periods[0]
        fields["Tax_Year_Quarter[0]"] = tp.get("period", "")

    # ── Section 6: Source of Funds & Compliance Checkboxes ──
    fields["Explanation_Of_Circumstances[0]"] = oic.get("sourceOfFunds", "")

    # Filing compliance — check all that apply; default to "filed all returns"
    fields["cB4_01[0]"] = "/Yes"   # Filed all required returns
    fields["cB4_01[1]"] = "/Yes"   # Made all required estimated tax payments
    # If business with payroll deposits:
    if biz.get("hasEmployees") == "Yes":
        fields["cB4_01[2]"] = "/Yes"  # Made all required federal tax deposits
    else:
        fields["cB4_01[3]"] = "/Yes"  # Not required to make federal tax deposits
        fields["cB4_01[4]"] = "/Yes"  # Not required current quarter

    # ── Section 8: Signatures — phone and date (signatures left blank for taxpayer) ──
    phone = p.get("cellPhone", "") or p.get("homePhone", "")
    fields["Phone_Number_1[0]"] = phone
    fields["Date_1[0]"]         = today
    # Authorize voicemail
    fields["cB3_04[0]"] = "/Yes"

    if p.get("spouseOnDebt") == "Yes":
        fields["Phone_Number_2[0]"] = p.get("spousePhone", phone)
        fields["Date_2[0]"]         = today
        fields["cB3_04[1]"] = "/Yes"

    return fields


def main():
    if len(sys.argv) != 4:
        print("Usage: python fill_irs_forms.py <intake_data.json> <433f|433a|433b|433aoic|656> <output.pdf>")
        sys.exit(1)

    data_file, form_type, output_path = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(data_file) as f:
        data = json.load(f)

    # PDF directory: use IRS_PDF_DIR env var if set (injected by server.py),
    # otherwise fall back to the upload directory used during development.
    pdf_dir = os.environ.get("IRS_PDF_DIR", "/mnt/user-data/uploads")

    source_map = {
        "433f":    os.path.join(pdf_dir, "f433f.pdf"),
        "433a":    os.path.join(pdf_dir, "f433a__1_.pdf"),
        "433b":    os.path.join(pdf_dir, "f433b.pdf"),
        "433aoic": os.path.join(pdf_dir, "f433aoi__1_.pdf"),
        "656":     os.path.join(pdf_dir, "f656.pdf"),
    }
    builder_map = {
        "433f":    build_433f_fields,
        "433a":    build_433a_fields,
        "433b":    build_433b_fields,
        "433aoic": build_433aoic_fields,
        "656":     build_656_fields,
    }

    if form_type not in source_map:
        print(f"Unknown form type: {form_type}. Use 433f, 433a, 433b, 433aoic, or 656.")
        sys.exit(1)

    source_pdf = source_map[form_type]
    field_values = builder_map[form_type](data)
    fill_form(source_pdf, field_values, output_path)
    print(f"Fields populated: {len(field_values)}")



if __name__ == "__main__":
    main()
