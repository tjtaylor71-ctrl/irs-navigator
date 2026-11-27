# planning/calculators.py
# IRS Pilot - Tax Planning Module
# Pure calculation functions. No Flask dependencies.
# Update TAX_BRACKETS and STANDARD_DEDUCTIONS each January.

# ── 2025 Tax Brackets ─────────────────────────────────────────────────────────
TAX_BRACKETS_2025 = {
    'single': [
        (11925, 0.10), (48475, 0.12), (103350, 0.22),
        (197300, 0.24), (250525, 0.32), (626350, 0.35), (float('inf'), 0.37)
    ],
    'mj_joint': [
        (23850, 0.10), (96950, 0.12), (206700, 0.22),
        (394600, 0.24), (501050, 0.32), (751600, 0.35), (float('inf'), 0.37)
    ],
    'mj_separate': [
        (11925, 0.10), (48475, 0.12), (103350, 0.22),
        (197300, 0.24), (250525, 0.32), (375800, 0.35), (float('inf'), 0.37)
    ],
    'hoh': [
        (17000, 0.10), (64850, 0.12), (103350, 0.22),
        (197300, 0.24), (250500, 0.32), (626350, 0.35), (float('inf'), 0.37)
    ],
    'widow': [
        (23850, 0.10), (96950, 0.12), (206700, 0.22),
        (394600, 0.24), (501050, 0.32), (751600, 0.35), (float('inf'), 0.37)
    ],
}

STANDARD_DEDUCTIONS_2025 = {
    'single':      15000,
    'mj_joint':    30000,
    'mj_separate': 15000,
    'hoh':         22500,
    'widow':       30000,
}

# ── SE Tax Constants ───────────────────────────────────────────────────────────
SE_NET_EARNINGS_RATE = 0.9235   # 92.35% of gross SE income = net earnings
SS_WAGE_BASE_2025    = 176100   # Social Security wage base
SS_RATE              = 0.124    # 12.4% Social Security
MEDICARE_RATE        = 0.029    # 2.9% Medicare

# ── Safe Harbor Thresholds ────────────────────────────────────────────────────
SAFE_HARBOR_AGI_THRESHOLD = 150000  # Above this: 110% rule applies

# ── Quarterly Due Dates (display only) ────────────────────────────────────────
QUARTERLY_DUE_DATES_2025 = {
    'Q1': 'April 15, 2025',
    'Q2': 'June 16, 2025',
    'Q3': 'September 15, 2025',
    'Q4': 'January 15, 2026',
}


# ── Core Calculators ──────────────────────────────────────────────────────────

def calc_se_tax(se_income: float) -> tuple[float, float]:
    """
    Returns (se_tax, deductible_half).
    The deductible half reduces AGI on Schedule 1.
    """
    if se_income <= 0:
        return 0.0, 0.0

    net_earnings = se_income * SE_NET_EARNINGS_RATE

    # Social Security only applies up to wage base
    ss_taxable = min(net_earnings, SS_WAGE_BASE_2025)
    se_tax = (ss_taxable * SS_RATE) + (net_earnings * MEDICARE_RATE)
    deductible_half = se_tax / 2

    return round(se_tax, 2), round(deductible_half, 2)


def calc_income_tax(taxable_income: float, filing_status: str) -> float:
    """
    Applies progressive bracket tax to taxable income.
    """
    if taxable_income <= 0:
        return 0.0

    brackets = TAX_BRACKETS_2025.get(filing_status, TAX_BRACKETS_2025['single'])
    tax = 0.0
    prev_ceiling = 0.0

    for ceiling, rate in brackets:
        if taxable_income <= prev_ceiling:
            break
        income_in_bracket = min(taxable_income, ceiling) - prev_ceiling
        tax += income_in_bracket * rate
        prev_ceiling = ceiling

    return round(tax, 2)


def calc_safe_harbor(prior_year_tax: float, estimated_agi: float) -> float:
    """
    Returns the safe harbor amount needed to avoid underpayment penalty.
    - AGI <= $150,000: pay 100% of prior year tax
    - AGI >  $150,000: pay 110% of prior year tax
    """
    if prior_year_tax <= 0:
        return 0.0

    multiplier = 1.10 if estimated_agi > SAFE_HARBOR_AGI_THRESHOLD else 1.00
    return round(prior_year_tax * multiplier, 2)


def calc_quarterly_payments(balance_remaining: float, paychecks_remaining: int = 0,
                             pay_frequency: str = None) -> dict:
    """
    Returns quarterly payment schedule and optional W-4 adjustment.

    balance_remaining: amount still owed after withholding and prior payments
    paychecks_remaining: used to calculate per-paycheck W-4 adjustment
    pay_frequency: 'weekly'|'biweekly'|'semimonthly'|'monthly' (display only)
    """
    if balance_remaining <= 0:
        return {
            'q1': 0.0, 'q2': 0.0, 'q3': 0.0, 'q4': 0.0,
            'w4_additional_per_paycheck': 0.0,
            'due_dates': QUARTERLY_DUE_DATES_2025,
            'overpayment': round(abs(balance_remaining), 2)
        }

    q = round(balance_remaining / 4, 2)
    # Final quarter absorbs rounding difference
    q4 = round(balance_remaining - (q * 3), 2)

    w4_per_paycheck = 0.0
    if paychecks_remaining and paychecks_remaining > 0:
        w4_per_paycheck = round(balance_remaining / paychecks_remaining, 2)

    return {
        'q1': q,
        'q2': q,
        'q3': q,
        'q4': q4,
        'w4_additional_per_paycheck': w4_per_paycheck,
        'due_dates': QUARTERLY_DUE_DATES_2025,
        'overpayment': 0.0,
    }


# ── Master Runner ─────────────────────────────────────────────────────────────

def run_all(session_data: dict) -> dict:
    """
    Runs all Phase 1 calculators from a single session_data dict.

    Expected keys:
        filing_status           str   (single | mj_joint | mj_separate | hoh | widow)
        income_w2               float
        income_se               float
        income_other            float
        prior_year_tax          float
        ytd_withholding         float
        ytd_estimated_payments  float
        paychecks_remaining     int   (optional, for W-4 recommendation)

    Returns a flat results dict ready for DB storage and API response.
    """
    filing_status = session_data.get('filing_status', 'single')
    income_w2     = float(session_data.get('income_w2', 0))
    income_se     = float(session_data.get('income_se', 0))
    income_other  = float(session_data.get('income_other', 0))

    # ── Step 1: SE Tax ─────────────────────────────────────────────────────
    se_tax, se_deduction = calc_se_tax(income_se)

    # ── Step 2: AGI ────────────────────────────────────────────────────────
    gross_income = income_w2 + income_se + income_other
    agi = round(gross_income - se_deduction, 2)

    # ── Step 3: Taxable Income ─────────────────────────────────────────────
    std_deduction   = STANDARD_DEDUCTIONS_2025.get(filing_status, 15000)
    taxable_income  = round(max(0.0, agi - std_deduction), 2)

    # ── Step 4: Income Tax ─────────────────────────────────────────────────
    income_tax  = calc_income_tax(taxable_income, filing_status)
    total_tax   = round(income_tax + se_tax, 2)

    # ── Step 5: Safe Harbor ────────────────────────────────────────────────
    prior_year_tax  = float(session_data.get('prior_year_tax', 0))
    safe_harbor     = calc_safe_harbor(prior_year_tax, agi)

    # ── Step 6: What Has Been Paid ─────────────────────────────────────────
    ytd_withholding         = float(session_data.get('ytd_withholding', 0))
    ytd_estimated_payments  = float(session_data.get('ytd_estimated_payments', 0))
    total_paid              = round(ytd_withholding + ytd_estimated_payments, 2)

    # ── Step 7: Balance Due / Overpayment ──────────────────────────────────
    balance_due = round(total_tax - total_paid, 2)

    # ── Step 8: Quarterly Schedule ─────────────────────────────────────────
    paychecks_remaining = int(session_data.get('paychecks_remaining', 0))
    quarterly = calc_quarterly_payments(
        balance_remaining=max(0.0, balance_due),
        paychecks_remaining=paychecks_remaining
    )

    # ── Step 9: Effective Tax Rate ─────────────────────────────────────────
    effective_rate = round((total_tax / agi * 100), 2) if agi > 0 else 0.0

    return {
        # Income breakdown
        'gross_income':             round(gross_income, 2),
        'se_tax':                   se_tax,
        'se_deduction':             se_deduction,
        'estimated_agi':            agi,
        'standard_deduction':       std_deduction,
        'estimated_taxable_income': taxable_income,

        # Tax liability
        'income_tax':               income_tax,
        'estimated_total_tax':      total_tax,
        'effective_tax_rate_pct':   effective_rate,

        # Safe harbor
        'safe_harbor_amount':       safe_harbor,
        'safe_harbor_met':          total_paid >= safe_harbor,

        # Payments
        'total_paid':               total_paid,
        'balance_due':              balance_due,
        'overpayment':              quarterly.get('overpayment', 0.0),

        # Quarterly schedule
        'q1_payment':               quarterly['q1'],
        'q2_payment':               quarterly['q2'],
        'q3_payment':               quarterly['q3'],
        'q4_payment':               quarterly['q4'],
        'q1_due':                   quarterly['due_dates']['Q1'],
        'q2_due':                   quarterly['due_dates']['Q2'],
        'q3_due':                   quarterly['due_dates']['Q3'],
        'q4_due':                   quarterly['due_dates']['Q4'],

        # W-4 recommendation
        'w4_additional_per_paycheck': quarterly['w4_additional_per_paycheck'],
    }


# ── Quick Test ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import json

    test = {
        'filing_status':           'single',
        'income_w2':               45000,
        'income_se':               30000,
        'income_other':            2000,
        'prior_year_tax':          9500,
        'ytd_withholding':         4200,
        'ytd_estimated_payments':  1500,
        'paychecks_remaining':     18,
    }

    result = run_all(test)
    print(json.dumps(result, indent=2))
