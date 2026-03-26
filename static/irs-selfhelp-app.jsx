import { useState } from "react";

// ─── COLLECTION SEQUENCE ───────────────────────────────────────────────────
const collectionSequence = ["CP14", "CP501", "CP503", "CP504", "LT11"];

const collectionNotices = {
  CP14: {
    title: "CP14 — First Balance Due Notice",
    severity: "info",
    step: 1,
    deadline: "21 days to avoid additional penalties",
    plainEnglish:
      "You filed a tax return but didn't pay the full amount owed. This is the IRS's first and friendliest notice — they're simply letting you know you have a balance and asking you to pay.",
    commonCauses: [
      "Filed your return but couldn't pay the full amount",
      "Underpayment of estimated taxes",
      "Tax return balance due not paid by April 15",
    ],
    yourOptions: [
      { title: "Pay in Full", description: "Pay at IRS.gov to stop interest and penalties from growing.", risk: "low" },
      { title: "Set Up Payment Plan", description: "Apply online for an installment agreement. If you owe under $50,000, approval is usually automatic.", risk: "low" },
      { title: "Request Penalty Abatement", description: "If this is your first time owing or you had a reasonable cause (illness, disaster, etc.), you may qualify to have penalties removed.", risk: "low" },
    ],
    doNotIgnore: "Interest accrues daily. Ignoring this leads to escalating notices (CP501 → CP503 → CP504) and eventually levy action. It's much easier and less expensive to resolve now.",
    proTip: "If this is your first time with a balance due and you have a good compliance history, call the IRS and ask for First Time Abatement (FTA) of the failure-to-pay penalty. Many people qualify and it can save hundreds of dollars.",
  },
  CP501: {
    title: "CP501 — First Reminder, Balance Due",
    severity: "medium",
    step: 2,
    deadline: "21 days from notice date",
    plainEnglish:
      "The IRS previously sent you a CP14 and hasn't received payment. This is their first follow-up reminder. The balance has likely grown due to additional interest and penalties since the CP14.",
    commonCauses: [
      "CP14 was ignored or missed",
      "Partial payment made but balance remains",
      "Payment arrangement not yet established",
    ],
    yourOptions: [
      { title: "Pay in Full", description: "Pay the full balance at IRS.gov. Interest stops accruing on the day you pay.", risk: "low" },
      { title: "Set Up Installment Agreement", description: "If you can't pay in full, apply for a monthly payment plan online at IRS.gov. Streamlined agreements are available if you owe under $50,000.", risk: "low" },
      { title: "Request Currently Not Collectible Status", description: "If you genuinely cannot pay without causing financial hardship, the IRS can temporarily pause collection activity.", risk: "medium" },
    ],
    doNotIgnore: "Continued inaction will escalate to a CP503, then CP504 (Notice of Intent to Levy). Each step adds more penalties and interest and reduces your options.",
    proTip: "Even if you can't pay the full amount, calling the IRS or setting up a payment plan at this stage shows good faith and prevents much harsher collection action down the road.",
  },
  CP503: {
    title: "CP503 — Second Reminder, Balance Due",
    severity: "high",
    step: 3,
    deadline: "10 days from notice date",
    plainEnglish:
      "This is the IRS's second reminder that you have an unpaid balance. Both the CP14 and CP501 went unanswered. The IRS is now escalating and the urgency is increasing significantly.",
    commonCauses: [
      "Prior notices (CP14, CP501) ignored or missed",
      "Payment arrangement fell through",
      "Partial payments not sufficient to resolve the balance",
    ],
    yourOptions: [
      { title: "Pay in Full", description: "Pay the full amount online at IRS.gov to stop further collection action immediately.", risk: "low" },
      { title: "Request Installment Agreement", description: "Apply immediately for a monthly payment plan. Online agreements are available if you owe under $50,000 and are current on all filings.", risk: "low" },
      { title: "Request Currently Not Collectible Status", description: "If paying would prevent you from covering basic living expenses, the IRS can pause collection temporarily while your financial situation improves.", risk: "medium" },
    ],
    doNotIgnore: "The next notice — CP504 — is a Notice of Intent to Levy. At that point the IRS can begin seizing your state tax refund. Don't let it get there.",
    proTip: "The IRS would rather work with you than chase you. A phone call or online payment plan request at this stage can stop the escalation entirely. Don't let embarrassment or anxiety prevent you from acting.",
  },
  CP504: {
    title: "CP504 — Notice of Intent to Levy",
    severity: "urgent",
    step: 4,
    deadline: "30 days — ACT IMMEDIATELY",
    plainEnglish:
      "This is a serious notice. The IRS is formally notifying you they intend to seize (levy) your property — beginning with your state tax refund. If you still don't respond, they can proceed to garnish wages or empty your bank account.",
    commonCauses: [
      "Multiple prior notices ignored (CP14, CP501, CP503)",
      "Defaulted installment agreement",
      "Unresolved tax debt with no contact made",
    ],
    yourOptions: [
      { title: "Pay in Full Immediately", description: "Eliminates the threat entirely. Pay at IRS.gov or by phone.", risk: "low" },
      { title: "Set Up Installment Agreement", description: "Apply immediately — an approved installment agreement stops levy action.", risk: "low" },
      { title: "Offer in Compromise", description: "If you qualify based on income, expenses, and asset equity, you may be able to settle for less than the full amount owed.", risk: "medium" },
      { title: "Request Currently Not Collectible Status", description: "If financial hardship can be documented, the IRS may pause collection activity temporarily.", risk: "medium" },
    ],
    doNotIgnore: "This is one of the last notices before actual asset seizure begins. Do NOT ignore this. A CDP hearing is NOT available at this stage — that right is only triggered by an LT11, CP90, or Letter 1058.",
    proTip: "The CP504 does NOT give you CDP hearing rights — do not wait for that option. Act now by paying, setting up a payment plan, or calling the IRS. If you later receive an LT11, CP90, or Letter 1058, that is when you can formally request a CDP hearing.",
  },
  LT11: {
    title: "LT11 — Final Notice of Intent to Levy & Right to Hearing",
    severity: "urgent",
    step: 5,
    deadline: "30 days — CRITICAL DEADLINE",
    plainEnglish:
      "This is the IRS's final warning before they begin seizing your assets. Critically, this notice formally triggers your legal right to a Collection Due Process (CDP) hearing — but ONLY if you request it within 30 days of this notice.",
    commonCauses: [
      "Unresolved tax debt after the full CP14 → CP501 → CP503 → CP504 sequence",
      "Failed or defaulted payment arrangement",
      "No response to any prior IRS correspondence",
    ],
    yourOptions: [
      { title: "Request CDP Hearing — Highly Recommended", description: "File Form 12153 within 30 days. This is your legal right and immediately pauses ALL levy action while the IRS Independent Appeals Office reviews your case. You can propose any resolution option at the hearing.", risk: "low" },
      { title: "Pay in Full", description: "Resolves everything immediately and stops all collection action.", risk: "low" },
      { title: "Installment Agreement", description: "Apply immediately — an approved installment agreement stops levy action.", risk: "low" },
      { title: "Offer in Compromise", description: "Filing an OIC pauses collection while your offer is under consideration.", risk: "medium" },
    ],
    doNotIgnore: "Missing the 30-day CDP deadline permanently eliminates your right to a CDP hearing. You would only have the much weaker 'Equivalent Hearing' option remaining, which does NOT pause collection activity.",
    proTip: "Always request the CDP hearing — even if you intend to pay or set up a payment plan. It buys you time, preserves your appeal rights, and gives you access to an independent Appeals Officer who can consider options the collections division cannot.",
  },
};

// ─── AUDIT & EXAMINATION NOTICES ──────────────────────────────────────────
const auditSequence = ["CP2501", "CP2000", "Letter2205", "CP75", "Letter525", "CP3219A"];

const auditNotices = {
  CP2501: {
    title: "CP2501 — Initial Contact: Income Discrepancy",
    severity: "info",
    deadline: "60 days from notice date",
    plainEnglish:
      "The IRS has identified a potential discrepancy between income reported on your tax return and income reported to them by third parties (employers, banks, brokerages, etc.). This is an early inquiry — no changes have been made to your return yet. Note: The IRS often skips this notice and goes straight to the CP2000.",
    commonCauses: [
      "Income reported on a 1099 or W-2 doesn't match your return",
      "Unreported dividend, interest, or investment income",
      "Self-employment income reported by a client but not on your return",
    ],
    yourOptions: [
      { title: "Respond with Documentation", description: "Gather records showing the income was already reported or isn't taxable, and send a written response.", risk: "low" },
      { title: "Agree and Amend", description: "If the discrepancy is correct, you can file an amended return (Form 1040-X) to correct the error.", risk: "low" },
      { title: "Request More Time", description: "If you need time to gather records, contact the IRS to request an extension of the response deadline.", risk: "low" },
    ],
    doNotIgnore: "Ignoring a CP2501 typically leads to the IRS issuing a CP2000 — a formal proposed change to your return with proposed additional tax, interest, and penalties.",
    proTip: "The CP2501 is your earliest and best opportunity to resolve an income discrepancy. Responding here with documentation is far easier than dealing with a CP2000 or a formal audit later.",
  },
  CP2000: {
    title: "CP2000 — Proposed Changes to Your Tax Return",
    severity: "medium",
    deadline: "60 days from notice date",
    plainEnglish:
      "The IRS received information from a third party (like your employer or bank) that doesn't match what you reported on your return. They are now formally proposing to change your return and charge additional tax, interest, and possibly penalties. IMPORTANT: This is NOT a bill. The proposed amount has NOT been assessed yet — you have the right to agree, partially agree, or dispute it.",
    commonCauses: [
      "Unreported income from a 1099 (freelance, interest, dividends, retirement)",
      "Stock or investment sales not reported or reported incorrectly",
      "Forgetting income from a second job or side work",
      "A CP2501 was sent previously but skipped by the IRS",
    ],
    yourOptions: [
      { title: "Agree with the IRS", description: "If the proposed changes are correct, sign and return the response form with payment or a request for a payment plan.", risk: "low" },
      { title: "Partially Agree", description: "If some changes are correct but not all, explain what you agree with and dispute the rest with supporting documentation.", risk: "medium" },
      { title: "Disagree Completely", description: "If you have documentation proving the income was already reported or is not taxable (e.g., it was a return of basis, a gift, an exclusion), respond with your evidence.", risk: "low" },
    ],
    doNotIgnore: "If you don't respond, the IRS will automatically assess the proposed changes and send you a formal bill. At that point you'll need to pay or go through a more difficult appeals process.",
    proTip: "A CP2000 is NOT an audit and NOT a bill. It is a proposed change. Many people resolve these entirely by mail just by submitting the right documentation. Don't panic — respond thoughtfully within the deadline.",
  },
  Letter2205: {
    title: "Letter 2205 — Audit Appointment Notice",
    severity: "medium",
    deadline: "Respond by date stated in letter",
    plainEnglish:
      "The IRS is notifying you that your tax return has been selected for an audit (examination). This letter schedules an appointment either at an IRS office or requests documents by mail. The IRS will specify which tax year(s) and which items on your return are being examined.",
    commonCauses: [
      "Random selection by the IRS",
      "Unusually high deductions compared to your income level",
      "Business losses claimed for multiple years",
      "Large charitable contributions",
      "Home office or vehicle deductions",
    ],
    yourOptions: [
      { title: "Attend and Respond", description: "Gather all documentation related to the items being examined and respond by the date specified. Bring only what is requested.", risk: "low" },
      { title: "Request a Postponement", description: "If you need more time to gather records, you can request a one-time postponement of the audit appointment.", risk: "low" },
      { title: "Authorize a Representative", description: "You have the right to have an Enrolled Agent, CPA, or tax attorney represent you at the audit. They can appear in your place.", risk: "low" },
    ],
    doNotIgnore: "Ignoring an audit notice can result in the IRS making changes to your return without your input — almost always unfavorable to you.",
    proTip: "Bring only the documents specifically requested. Do not volunteer extra information or discuss years not under examination. Less is more in an audit setting.",
  },
  CP75: {
    title: "CP75 — Examination in Progress / Refund on Hold",
    severity: "medium",
    deadline: "Respond by date stated in notice",
    plainEnglish:
      "The IRS is examining your tax return and has placed your refund on hold while the exam is in progress. They are typically questioning specific credits or deductions — most commonly the Earned Income Tax Credit (EITC), Child Tax Credit, or education credits.",
    commonCauses: [
      "Claimed Earned Income Tax Credit (EITC) is being verified",
      "Child or dependent care credits under review",
      "Education credits being examined",
      "Filing status or dependency claims questioned",
    ],
    yourOptions: [
      { title: "Respond with Documentation", description: "Send the specific documents requested (birth certificates, school records, proof of residency, etc.) to verify your eligibility for the credits claimed.", risk: "low" },
      { title: "Request More Time", description: "If you need additional time to gather documents, contact the IRS to request an extension.", risk: "low" },
      { title: "Disagree and Appeal", description: "If you believe the IRS is wrong, you can respond explaining your position and request an Appeals conference.", risk: "medium" },
    ],
    doNotIgnore: "If you don't respond, the IRS will deny the credits you claimed and either reduce your refund or create a balance due.",
    proTip: "For EITC audits, the IRS needs to verify the qualifying child actually lived with you. School records, medical records, or letters from a landlord showing the child's address are strong evidence.",
  },
  Letter525: {
    title: "Letter 525 — General 30-Day Letter (Proposed Audit Changes)",
    severity: "high",
    deadline: "30 days from notice date",
    plainEnglish:
      "The IRS has completed its examination of your return and is proposing specific changes. This is the formal conclusion of an audit. You now have 30 days to either agree with the findings, request an Appeals conference, or do nothing (which means the IRS proceeds with the changes).",
    commonCauses: [
      "Audit examination concluded with proposed adjustments",
      "Deductions disallowed due to insufficient documentation",
      "Income adjustments proposed based on examination findings",
    ],
    yourOptions: [
      { title: "Agree with the Findings", description: "Sign the agreement form enclosed with the letter. You'll owe the proposed additional tax, interest, and any penalties.", risk: "low" },
      { title: "Request an IRS Appeals Conference", description: "You have the right to appeal the findings to the IRS Independent Office of Appeals — a separate, impartial division. This is free and often results in a better outcome.", risk: "low" },
      { title: "Do Nothing", description: "If you don't respond, the IRS will issue a Statutory Notice of Deficiency (CP3219A / 90-day letter).", risk: "high" },
    ],
    doNotIgnore: "Missing the 30-day deadline does not mean the issue goes away — it means you lose the opportunity for an easy Appeals conference and the IRS will escalate to a formal Statutory Notice of Deficiency.",
    proTip: "Always request the Appeals conference if you disagree with any part of the audit findings. IRS Appeals Officers are independent and often resolve cases more favorably than the examining agent. It costs nothing to appeal.",
  },
  CP3219A: {
    title: "CP3219A — Statutory Notice of Deficiency (90-Day Letter)",
    severity: "urgent",
    deadline: "90 days — HARD LEGAL DEADLINE",
    plainEnglish:
      "This is one of the most important notices the IRS can send. It is a formal legal notice that the IRS intends to assess additional tax against you. You have 90 days (150 days if you're outside the U.S.) to either pay the amount, reach an agreement, or petition the U.S. Tax Court to challenge it. After 90 days, the IRS will assess the tax and you lose your Tax Court rights.",
    commonCauses: [
      "Audit concluded with no agreement reached",
      "CP2000 proposed changes ignored or unresolved",
      "30-day letter (Letter 525) ignored",
      "Audit Appeals conference did not result in resolution",
    ],
    yourOptions: [
      { title: "Petition the U.S. Tax Court", description: "File a petition with the U.S. Tax Court within 90 days to formally contest the IRS's findings. You do NOT have to pay the disputed amount first. Tax Court has a simplified Small Tax Case procedure for amounts under $50,000.", risk: "low" },
      { title: "Agree and Pay", description: "If the IRS is correct, you can sign the agreement form and pay the balance (or set up a payment plan).", risk: "low" },
      { title: "Request IRS Appeals", description: "If you haven't already been through Appeals, you may still be able to request a conference — but do not let the 90-day deadline pass while waiting.", risk: "medium" },
    ],
    doNotIgnore: "The 90-day deadline is an absolute legal deadline. Missing it permanently eliminates your right to contest the tax in Tax Court without paying it first. After 90 days, the IRS will assess the tax and begin collection.",
    proTip: "Filing a Tax Court petition does not mean you have to go to trial. The vast majority of Tax Court cases are settled through negotiation before trial. Petitioning simply preserves your rights and keeps the door open for negotiation.",
  },
};

const severityConfig = {
  info: { color: "#3b82f6", bg: "#eff6ff", label: "Attention Needed", border: "#3b82f6" },
  medium: { color: "#f59e0b", bg: "#fef3c7", label: "Action Needed", border: "#f59e0b" },
  high: { color: "#ef4444", bg: "#fee2e2", label: "Urgent", border: "#ef4444" },
  urgent: { color: "#dc2626", bg: "#fef2f2", label: "CRITICAL — Act Now", border: "#dc2626" },
};

const situationPaths = [
  {
    id: "cant-pay",
    title: "I owe taxes but can't pay",
    icon: "💸",
    description: "You filed or the IRS says you owe, but you don't have the money right now.",
    freshStartWarning: true,
    options: [
      {
        title: "Full Payment",
        badge: null,
        desc: "If you can pay in full, do it. Interest accrues daily and penalties compound. Even paying part of the balance reduces what's growing against you.\n\nPay online at IRS.gov/payments. The IRS accepts direct bank transfers, debit cards, and credit cards.",
        form: "Pay at IRS.gov/payments or call 1-800-829-1040"
      },
      {
        title: "Installment Agreement (Payment Plan)",
        badge: null,
        desc: "A monthly payment arrangement with the IRS to pay your debt over time. This is the most common resolution for taxpayers who owe but cannot pay in full. Interest and some penalties continue to accrue, but collection enforcement stops once an agreement is approved.\n\nKey tiers:\n• Guaranteed IA (under $10,000): You owe under $10,000, have filed all returns, and haven't had an IA in the past 5 years. The IRS must approve — no financial disclosure required.\n• Simple IA (under $50,000): No financial disclosure required. Apply online at IRS.gov, up to 72 months to pay.\n• Non-Streamlined IA ($50,000–$250,000): No full financial disclosure required, but the IRS will file a Notice of Federal Tax Lien as a condition of approval. You must be current on all filings.\n• Non-Streamlined IA (over $250,000): Full financial disclosure required — Form 433-F if working with ACS, Form 433-A if working with a Revenue Officer. Both require substantiation documentation. The IRS sets your payment based on income minus IRS allowable expense standards.\n\nCritical: You must be current on ALL tax return filings before any agreement can be approved.",
        form: "Form 9465 or apply online at IRS.gov/opa"
      },
      {
        title: "Partial Pay Installment Agreement (PPIA)",
        badge: "underused",
        desc: "One of the most underused and powerful options available. A PPIA lets you make monthly payments based on what you can actually afford — even if those payments will NEVER fully pay off your balance.\n\nHere's why this matters: The IRS only has 10 years from the date of assessment to collect a tax debt (the Collection Statute Expiration Date, or CSED). If your affordable payment is small enough that you'll never pay off the full balance before the CSED expires — the remaining debt disappears legally.\n\nExample: You owe $80,000 but can only afford $200/month. The IRS accepts $200/month. After the CSED expires, whatever remains is gone.\n\nRequirements:\n• Full financial disclosure with substantiation documentation\n• Form 433-F if working through ACS; Form 433-A if working with a Revenue Officer\n• Your allowable expenses are determined by IRS Collection Financial Standards — fixed national and local amounts for housing, food, transportation, and health care\n• All tax returns filed and current-year taxes current",
        form: "Form 433-F (ACS) or Form 433-A (Revenue Officer) — both require supporting documentation"
      },
      {
        title: "Currently Not Collectible (CNC)",
        badge: null,
        desc: "If you can demonstrate that paying anything toward your tax debt would prevent you from covering basic living expenses, the IRS can place your account in temporary hardship status and pause all collection activity.\n\nKey facts:\n• The debt does not go away — interest continues to accrue.\n• Eligibility is based on IRS Collection Financial Standards — fixed national and local allowable amounts for housing, food, transportation, and health care. What you actually spend doesn't matter; what the IRS allows is what counts.\n• Form 433-F is used by ACS; Form 433-A is used by Revenue Officers. Both require substantiation documentation.\n• The IRS reviews CNC status periodically. If your income increases significantly, they can resume collection.\n• One powerful benefit: if you remain in CNC long enough, the CSED (10-year collection clock) may expire on some or all of your balances — eliminating them entirely.\n• Future tax refunds will be applied to your outstanding balance while in CNC.",
        form: "Form 433-F (ACS) or Form 433-A (Revenue Officer) with substantiation documentation"
      },
      {
        title: "Offer in Compromise (OIC)",
        badge: "most-misunderstood",
        desc: "An OIC allows a taxpayer to settle their entire tax debt for less than the full amount — but qualification is genuinely difficult and the IRS rejects the majority of applications.\n\nThe IRS evaluates OICs on two grounds:\n\n1. Doubt as to Collectability (most common): The IRS doesn't believe they could ever realistically collect the full amount based on your income, expenses, and total equity in assets. Your offer must equal or exceed your Reasonable Collection Potential (RCP) — what the IRS calculates they could collect from you over time.\n\n2. Doubt as to Liability: You legitimately dispute that you owe the tax at all — for example, the IRS assessed the wrong amount or made an error.\n\nHow RCP is calculated: Your monthly disposable income (after OIC-specific IRS allowable expenses) × 12 or 24, PLUS the net equity in all your assets (home equity, retirement accounts, vehicles, bank accounts, etc.). If that total is less than what you owe, you may qualify.\n\nNote on expense standards: The IRS uses slightly different — and generally stricter — allowable expense standards for OIC evaluations than it does for installment agreements or CNC. This is an important distinction that affects whether your offer will be accepted.\n\nImportant realities:\n• The $205 application fee is non-refundable (waived for low-income applicants).\n• Lump-sum offers require a 20% non-refundable down payment with the application.\n• Filing an OIC pauses collection while it is under review.\n• If accepted, you must stay in full compliance for 5 years — or the IRS can revoke the agreement and reinstate the full original balance.",
        form: "Form 656 (OIC application) + Form 433-A (OIC financial statement) with full substantiation"
      },
      {
        title: "Penalty Abatement",
        badge: null,
        desc: "The IRS can remove penalties — though not the underlying tax or interest — under certain circumstances. Since penalties can represent 25% or more of a total balance, this can mean significant savings.\n\nTwo main types:\n• First Time Abatement (FTA): Available if you have no penalties in the prior 3 years and are otherwise compliant. No documentation needed — just request it. This is one of the easiest wins available and many taxpayers who qualify never ask.\n• Reasonable Cause: If circumstances beyond your control caused the problem — serious illness, death of a family member, natural disaster, reliance on a tax professional who gave incorrect advice — you can request abatement with documentation.\n\nNote: Penalty abatement does not reduce the underlying tax owed or stop interest from accruing.",
        form: "Call the IRS and request verbally, or submit a written request or Form 843"
      },
    ],
  },
  {
    id: "csed",
    title: "I've owed for a long time — does the debt expire?",
    icon: "⏳",
    description: "The IRS has a legal deadline to collect. Understanding it can dramatically change your strategy.",
    options: [
      {
        title: "The Collection Statute Expiration Date (CSED)",
        desc: "The IRS has exactly 10 years from the date a tax is formally assessed to collect it. This deadline is called the Collection Statute Expiration Date, or CSED. Once this date passes, the IRS loses its legal right to collect that debt — permanently.\n\nThis is one of the most important — and most overlooked — facts in tax resolution.\n\nWhy it matters:\n• If your debt is old, some years may expire before others.\n• The right resolution strategy depends heavily on when each year's CSED falls.\n• In some cases, waiting (while staying in CNC or PPIA) is the smartest move because the debt expires on its own.\n\nThe CSED clock starts on the date of assessment — typically when you file your return or when the IRS files a Substitute for Return (SFR) on your behalf.",
        form: "Pull your IRS Account Transcript to find each year's assessment date"
      },
      {
        title: "Events That Pause (Toll) the CSED Clock",
        desc: "Certain actions stop the CSED clock from running — sometimes for months or years. This is critical to understand before making any decisions:\n\n• Filing an Offer in Compromise: The clock stops while your OIC is under review, plus 30 days after rejection.\n• Requesting a CDP Hearing: Pauses the clock during the hearing process.\n• Filing for Bankruptcy: The automatic stay stops the clock, plus 6 months after discharge.\n• Being Outside the U.S. for 6+ continuous months: Pauses the clock.\n• Signing a waiver extending the statute: Rarely advisable — never sign one without understanding the consequences.\n• Installment Agreements: Do NOT toll the CSED, but they do prevent enforcement while the agreement is active.\n\nBefore choosing any resolution option, always identify your CSED dates first.",
        form: "Pull Account Transcripts for each tax year — consult a tax professional if CSED dates are unclear"
      },
      {
        title: "Strategic Use of the CSED",
        desc: "For some taxpayers, the single best strategy is not an OIC, not an installment agreement — but a deliberate plan to survive until the CSED expires.\n\nThis works best when:\n• You're in CNC status and genuinely cannot pay\n• Your CSED is within a few years of expiring\n• Your balance is large but your income and assets are modest\n• An OIC would be rejected because your RCP is too high right now, but will drop in the future\n\nThis is not 'doing nothing.' It is a strategic, legal choice. The IRS is fully aware of the CSED and taxpayers have every right to use it.\n\nNote: The IRS may file a tax lien while your debt is active, but a federal tax lien automatically expires when the CSED expires. Once the collection statute runs out, the lien is gone as well.",
        form: "Work with an EA or tax professional to map out CSED dates and build a strategic plan"
      },
    ],
  },
  {
    id: "revenue-officer",
    title: "A Revenue Officer contacted me",
    icon: "🕴️",
    description: "A Revenue Officer (RO) is a field-level IRS employee — the highest tier of IRS collections. This is more serious than ACS notices, but it is manageable if you respond correctly.",
    options: [
      {
        title: "Understand What a Revenue Officer Is — and Isn't",
        desc: "A Revenue Officer is not a criminal investigator. They are a civil collections employee with expanded enforcement authority. Their job is to resolve your case — not to punish you.\n\nROs are assigned when:\n• Balances are very large (the IRS generally reserves ROs for cases approaching $1 million or more, though lower amounts with payroll issues or multiple unfiled years can trigger assignment)\n• Multiple years of unfiled returns exist\n• Business or payroll tax issues are involved\n• ACS has been unable to move the case forward\n• Significant assets are suspected\n• The taxpayer has repeatedly ignored notices\n\nImportant: The vast majority of taxpayers NEVER deal with a Revenue Officer. Tax relief companies often use RO scare tactics to sell expensive services. Most cases are resolved entirely through ACS.",
        form: "Note the RO's name, badge number, and contact information at first contact"
      },
      {
        title: "How to Communicate with a Revenue Officer",
        desc: "Revenue Officers operate differently from ACS phone agents. They have deadlines, discretion, and direct enforcement authority. How you communicate with them matters enormously.\n\nDo:\n• Respond immediately — delays are not tolerated\n• File any missing returns as fast as possible\n• Provide documents with tracking numbers\n• If sending returns to an RO, send COPIES only (mark them 'COPY') — original returns go to IRS processing centers\n• Fix current-year compliance (estimated payments or withholding) before your first meeting\n• Be honest about your financial situation\n\nDo NOT:\n• Ignore their calls or letters — this triggers faster enforcement\n• Provide incomplete or inconsistent financial information\n• Change your story between conversations\n• Miss agreed-upon deadlines\n• Provide extra information beyond what's requested",
        form: "All document submissions should include certified mail tracking"
      },
      {
        title: "What the Revenue Officer Will Ask For",
        desc: "An RO will typically request:\n• All unfiled tax returns (immediately)\n• Proof of current-year compliance (estimated payments or updated withholding)\n• A completed financial statement — Revenue Officers use Form 433-A for individuals or Form 433-B for businesses. Both require full substantiation documentation (bank statements, pay stubs, bills, asset documentation, etc.)\n• Bank statements (typically 3-6 months)\n• Proof of income, expenses, assets, and liabilities\n• Business records if self-employed\n\nNote: Form 433-A is the RO's form. If your case is handled by ACS instead, they use Form 433-F. The forms are similar but not identical — use the right one for who you're dealing with.\n\nThe RO uses your financial disclosure to determine which resolution option applies — installment agreement, PPIA, CNC, or referral for enforcement.\n\nIf your case involves payroll taxes, the RO may also investigate personal liability under the Trust Fund Recovery Penalty (TFRP) — a personal assessment that can be made against business owners and responsible parties regardless of what happens to the business.",
        form: "Form 433-A (individuals) or Form 433-B (businesses) — with full substantiation documentation"
      },
      {
        title: "When to Seek Professional Representation",
        desc: "If you have a Revenue Officer assigned to your case, professional representation by an Enrolled Agent, CPA, or tax attorney is strongly recommended.\n\nA representative can:\n• Communicate with the RO on your behalf\n• Prevent you from saying things that could hurt your case\n• Ensure financial disclosures are accurate and strategic\n• Negotiate the best possible resolution\n• Protect you if the RO oversteps their authority\n\nYou have the legal right to representation at any stage. You can tell the RO: 'I would like to consult with a tax professional before proceeding.' The RO must respect this.",
        form: "File Form 2848 (Power of Attorney) to authorize a representative to speak with the IRS on your behalf"
      },
    ],
  },
  {
    id: "levy",
    title: "My bank account or wages are being levied right now",
    icon: "🚨",
    description: "A levy is an active seizure of your money or income. This is an emergency — but it is not hopeless. You have rights, and several paths can stop or reduce a levy quickly.",
    levySituation: true,  // triggers the special levy detail screen
    options: [
      {
        title: "Step 1 — Understand What's Happening (Lien vs. Levy)",
        badge: "most-misunderstood",
        desc: "These two words sound similar but they are completely different things — and confusing them leads to the wrong response.\n\nA TAX LIEN is a legal claim against your property.\n• The IRS files a Notice of Federal Tax Lien (NFTL) in public records\n• It attaches to everything you own — real estate, vehicles, financial accounts, business assets\n• It notifies other creditors that the IRS has a priority claim\n• A lien does NOT take your money — it just stakes a claim to it\n• You can still use your property, sell it (though the IRS gets paid at closing), and go about your life\n• A lien can hurt your credit and make it hard to get loans\n• Liens automatically release 30 days after the debt is fully paid\n\nA TAX LEVY is an actual seizure of your money or property.\n• A bank levy freezes the funds in your account at the moment the levy hits — that money is held for 21 days before being sent to the IRS\n• A wage levy (garnishment) is continuous — a fixed percentage of every paycheck is sent to the IRS automatically until the debt is resolved\n• A levy is immediate and ongoing — it doesn't just stake a claim, it takes\n\nThe bottom line: A lien is a warning sign on your property. A levy is an active seizure. If your bank account is frozen or your paycheck is short, you have a levy.",
        form: "Notice of Federal Tax Lien — Form 668(Y) | Notice of Levy — Form 668-A (bank) or 668-W (wages)"
      },
      {
        title: "Step 2 — Check Your CDP Hearing Rights Immediately",
        badge: "deadline",
        desc: "Before the IRS can levy, they are legally required to send you a Final Notice of Intent to Levy — this is either an LT11, CP90, or Letter 1058. This notice triggers a 30-day window to request a Collection Due Process (CDP) hearing.\n\nIf you received that notice and the 30 days have NOT passed:\n• File Form 12153 (Request for a Collection Due Process Hearing) TODAY\n• Check the box for 'Withdrawal of Levy' or 'Installment Agreement' as your proposed resolution\n• Filing Form 12153 within 30 days STOPS all levy action immediately while your case is reviewed by the IRS Independent Office of Appeals\n• This is your most powerful right — don't let the deadline pass\n\nIf the 30-day CDP window has already passed:\n• You can still request an Equivalent Hearing (also on Form 12153) — but it does NOT stop collection activity\n• You still have other paths to release the levy — see Steps 3 and 4 below\n\nIf you never received the Final Notice:\n• The IRS may have sent it to an old address\n• If you can demonstrate you never received proper notice, you may be able to restore CDP rights — this is worth exploring with a tax professional",
        form: "Form 12153 — Request for a Collection Due Process or Equivalent Hearing (file immediately if within 30 days)"
      },
      {
        title: "Step 3 — Know What Property Is Exempt From Levy",
        desc: "Not everything can be taken. Federal law protects certain income and property from IRS levy:\n\nEXEMPT FROM LEVY (the IRS cannot take these):\n• Social Security and SSI benefits paid directly to you — fully exempt\n• Unemployment compensation\n• Workers' compensation\n• Certain annuity and pension payments from public funds\n• Child support and certain alimony payments\n• Certain service-connected disability payments\n• Amounts required for court-ordered child support\n\nWAGE LEVY — NOT FULLY EXEMPT, but protected in part:\n• The IRS cannot take 100% of your wages\n• You are entitled to keep a minimum exempt amount based on your standard deduction + personal exemptions divided by 52\n• For a single filer in 2025, roughly the first $1,100–$1,200 per week is protected\n• Your employer will receive a Statement of Exemptions form for you to complete\n• Fill it out and return it to your employer immediately — this maximizes your protected wages\n\nBANK LEVY — 21-DAY HOLD:\n• When the IRS levies a bank account, the bank is required to hold the funds for 21 days before sending them to the IRS\n• This 21-day window is your critical opportunity to resolve the levy before the money is actually transferred\n• The bank can only freeze what is in the account at the moment the levy hits — future deposits are not automatically taken",
        form: "Form 668-W, Part 3 — Statement of Exemptions (complete and return to employer immediately if wages are levied)"
      },
      {
        title: "Step 4 — Request a Levy Release Based on Financial Hardship",
        desc: "Even without a CDP hearing, you can request that the IRS release the levy if it is causing you an economic hardship — meaning the levy prevents you from paying your basic living expenses.\n\nThis is done by calling ACS (1-800-829-7650) with your financial information ready, or by submitting a completed Form 433-F (for ACS) or Form 433-A (for a Revenue Officer).\n\nThe IRS is required by law (IRC §6343) to release a levy if:\n• The levy is creating an economic hardship — you cannot pay for basic necessities (housing, food, utilities, transportation to work, medical care)\n• You enter into an installment agreement or other resolution that makes the levy unnecessary\n• The levy proceeds plus other payments will fully satisfy the debt\n• Releasing the levy would facilitate collection of the debt\n• The value of the property exceeds the debt and releasing part of it won't hinder collection\n\nFor the hardship argument, have ready:\n• Monthly income from all sources\n• Monthly essential expenses (rent/mortgage, utilities, food, car payment, insurance, medical)\n• Bank balances\n• A clear statement of which expenses you cannot pay because of the levy\n\nThe IRS will ask for this information verbally over the phone. A signed 433-F or 433-A faxed during the call strengthens your case significantly.",
        form: "Form 433-F (ACS) or Form 433-A (Revenue Officer) — download from the intake wizard"
      },
      {
        title: "Step 5 — Establish a Resolution to Get the Levy Released",
        desc: "A levy is a collection tool — not a punishment. The IRS uses it to force action. Once you establish a path to resolve the debt, the reason for the levy disappears.\n\nRESOLUTION OPTIONS THAT WILL RELEASE A LEVY:\n\nInstallment Agreement (IA):\n• An approved installment agreement stops levy action and requires the IRS to release an existing levy\n• Apply online at IRS.gov if you owe under $50,000 and are current on filings\n• For larger balances or complex cases, call ACS with your 433-F ready\n• Time-sensitive: if you have a bank levy with the 21-day hold active, you need an IA approved before the clock runs out\n\nCurrently Not Collectible (CNC):\n• If your monthly expenses equal or exceed your monthly income, you may qualify for CNC status\n• The IRS pauses all collection activity — including releasing the levy\n• The CSED continues to run during CNC, which is favorable to you\n• You'll need to complete a financial statement (433-F or 433-A)\n\nOffer in Compromise (OIC):\n• Filing an OIC automatically pauses all levy activity while the offer is under consideration\n• The IRS cannot levy while an OIC is pending\n• However, any existing bank levy that hit before you filed the OIC is not automatically reversed — you'd still need to separately request release of that specific levy\n\nPay in Full:\n• Releases the levy immediately\n• The IRS must release within 30 days of payment in full (usually faster)",
        form: "Call ACS at 1-800-829-7650 with your 433-F ready | For IA online: IRS.gov/opa"
      },
    ],
  },
  {
    id: "private-collection",
    title: "A private collection agency called about my taxes",
    icon: "📞",
    description: "The IRS sometimes assigns older tax debts to private collection agencies (PCAs). They sound official — but their authority is extremely limited.",
    options: [
      {
        title: "What a Private Collection Agency Can and Cannot Do",
        desc: "PCAs are contracted third-party companies hired by the IRS to contact taxpayers about older, lower-priority tax debts that the IRS is not actively working.\n\nWhat they CAN do:\n• Call you and send letters\n• Remind you that you owe money\n• Encourage voluntary payment\n• Set up simple payment arrangements in some cases\n\nWhat they CANNOT do:\n• Levy wages or bank accounts\n• Seize property\n• File or enforce liens\n• Demand financial information (Form 433-A or 433-F)\n• Approve CNC, PPIA, OIC, or penalty abatement\n• Assign a Revenue Officer\n• Make legal threats\n\nA PCA is dramatically less powerful than ACS or a Revenue Officer. They are essentially a customer service call center.",
        form: "Verify the PCA's legitimacy at IRS.gov — the IRS will send you a letter first before any PCA calls"
      },
      {
        title: "When to Send Your Case Back to the IRS",
        desc: "If you need any of the following, you cannot get it from a PCA — and you should request your case be returned to the IRS immediately:\n\n• Currently Not Collectible (CNC) status\n• Partial Pay Installment Agreement (PPIA)\n• Offer in Compromise\n• Penalty abatement or First Time Abatement\n• Financial hardship review\n• Resolution of missing returns\n• Any analysis beyond simple voluntary payment\n\nSimply tell the PCA: 'I am requesting that my case be returned to the IRS for direct handling.'\n\nThey are required to honor this request.",
        form: "Make this request verbally and follow up in writing with a letter sent via certified mail"
      },
      {
        title: "Protect Yourself From Scams",
        desc: "The existence of real PCAs makes IRS phone scams more dangerous — because now there ARE legitimate third parties calling about taxes.\n\nHow to verify a contact is legitimate:\n• The IRS always sends a letter before a PCA calls — never the other way around\n• Legitimate PCAs will never demand immediate payment by gift card, wire transfer, or cryptocurrency\n• Legitimate PCAs will never threaten arrest or deportation\n• You can call the IRS directly at 1-800-829-1040 to verify whether your account has been assigned to a PCA\n\nIf anything feels wrong — hang up. Then verify directly with the IRS.",
        form: "Report suspected scams to the Treasury Inspector General: 1-800-366-4484"
      },
    ],
  },
  {
    id: "audit",
    title: "I'm being audited",
    icon: "🔍",
    description: "The IRS is examining your tax return and requesting documentation.",
    options: [
      { title: "Correspondence Audit", desc: "The most common type — done entirely by mail. IRS requests specific documents. Respond with organized documentation.", form: "Respond to the specific notice received" },
      { title: "Office Audit", desc: "You're asked to bring documents to an IRS office. Bring only what's requested.", form: "Bring requested documents to scheduled appointment" },
      { title: "Field Audit", desc: "An IRS agent visits your home or business. This is more serious — consider professional representation.", form: "Contact an EA, CPA, or tax attorney" },
    ],
  },
  {
    id: "unfiled",
    title: "I haven't filed tax returns",
    icon: "📋",
    description: "You have one or more years of unfiled returns.",
    alert: "IRS Policy: The IRS generally requires only the last 6 years of unfiled returns to be considered in full filing compliance. You typically do not need to go back further than 6 years — but you must file those 6 years and stay current going forward.",
    alertType: "info",
    options: [
      {
        title: "File the Last 6 Years",
        desc: "IRS policy is to generally accept the filing of the last six years as sufficient to be considered in tax filing compliance. Gather your W-2s, 1099s, and other income records for each unfiled year and file those returns as soon as possible. The IRS looks far more favorably on voluntary filers than those who wait for enforcement.",
        form: "File back returns using prior year tax forms (available at IRS.gov)"
      },
      {
        title: "Start Making Estimated Tax Payments — Immediately",
        desc: "Most taxpayers who haven't filed also haven't been paying. To stop falling further behind, you must begin making quarterly estimated tax payments right away for the current year. Continuing to accumulate new unpaid tax while resolving old debt makes your situation significantly harder to resolve.",
        form: "Form 1040-ES — pay online at IRS.gov/payments (quarterly: Apr 15, Jun 15, Sep 15, Jan 15)"
      },
      {
        title: "Substitute for Return (SFR)",
        desc: "If the IRS has already filed returns on your behalf, they almost certainly did not give you all your deductions or credits. You have the right to file your own return to replace the SFR — and it almost always results in a lower balance.",
        form: "File the correct return with full documentation to replace the SFR"
      },
      {
        title: "Streamlined Filing Compliance",
        desc: "If your failure to file was non-willful (not intentional tax evasion), you may qualify for the IRS Streamlined Filing Compliance Procedures, which can significantly reduce penalties.",
        form: "Consult IRS Streamlined Domestic or Foreign Offshore procedures"
      },
    ],
  },
];

// ─── WIZARD BUTTON ────────────────────────────────────────────────────────────
// Titles that trigger the "Complete Your IRS Financial Forms" button
const FINANCIAL_FORM_TRIGGERS = [
  "installment agreement", "currently not collectible", "offer in compromise",
  "partial pay", "ppia", "cnc", "oic", "financial hardship", "levy release",
  "433", "financial statement", "financial disclosure"
];

function WizardButton() {
  return (
    <a href="/wizard" target="_blank" rel="noopener noreferrer"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        marginTop: 14, padding: "10px 18px",
        background: "#7ec11f", color: "#1a2d5a",
        border: "2px solid #7ec11f", borderRadius: 8,
        fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14,
        textDecoration: "none", cursor: "pointer",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#1a2d5a"; e.currentTarget.style.color = "#7ec11f"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#7ec11f"; e.currentTarget.style.color = "#1a2d5a"; }}>
      📋 Complete Your IRS Financial Forms →
    </a>
  );
}

function needsWizard(title, desc, form) {
  const text = `${title} ${desc} ${form}`.toLowerCase();
  return FINANCIAL_FORM_TRIGGERS.some(t => text.includes(t));
}

export default function IRSApp() {
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [noticeInput, setNoticeInput] = useState("");
  const [noticeError, setNoticeError] = useState("");

  const allNotices = { ...collectionNotices, ...auditNotices };

  const handleNoticeSearch = () => {
    const key = noticeInput.trim().toUpperCase().replace(/\s/g, "").replace("LETTER", "Letter");
    if (allNotices[key]) {
      setSelectedNotice({ key, ...allNotices[key] });
      setNoticeError("");
      setScreen("notice-detail");
    } else {
      setNoticeError(`Notice "${noticeInput}" not found in our database yet. Common notices: CP14, CP2000, CP503, CP504, LT11`);
    }
  };

  const sev = selectedNotice ? severityConfig[selectedNotice.severity] : null;

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#f8f6f1", color: "#1a2d5a" }}>
      {/* Header */}
      <div style={{ background: "#1a2d5a", padding: "14px 24px", borderBottom: "3px solid #7ec11f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { setScreen("home"); setSelectedNotice(null); setSelectedSituation(null); }}>
          <img src="/static/logo.png" alt="IRS Pilot" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 0.3 }}>IRS Pilot</div>
            <div style={{ color: "#7ec11f", fontSize: 10, letterSpacing: 1 }}>TAXPAYER SELF-HELP</div>
          </div>
        </div>
        {screen !== "home" && (
          <button onClick={() => { setScreen("home"); setSelectedNotice(null); setSelectedSituation(null); }}
            style={{ background: "transparent", border: "1px solid #7ec11f", color: "#7ec11f", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}>
            ← Home
          </button>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

        {/* HOME */}
        {screen === "home" && (
          <div>
            {/* Hero */}
            <div style={{ textAlign: "center", padding: "36px 16px 28px" }}>
              <div style={{ display: "inline-block", background: "#1a2d5a", color: "#7ec11f", fontSize: 11, fontWeight: "bold", letterSpacing: 1, padding: "4px 14px", borderRadius: 20, marginBottom: 14 }}>TAXPAYER SELF-HELP TOOL</div>
              <h1 style={{ fontSize: 30, fontWeight: "bold", margin: "0 0 12px", color: "#1a2d5a", lineHeight: 1.2 }}>Don't Face the IRS Alone</h1>
              <p style={{ fontSize: 15, color: "#555", margin: "0 auto", maxWidth: 480, lineHeight: 1.7 }}>Plain-English guidance for real IRS situations — no tax jargon, no attorneys required.</p>
            </div>

            {/* Primary action cards */}
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
              <div onClick={() => setScreen("notice-lookup")}
                style={{ background: "#fff", border: "2px solid #e8e4dc", borderRadius: 14, padding: "20px 18px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7ec11f"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(126,193,31,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e4dc"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 44, height: 44, background: "#f0fdf4", border: "1.5px solid #7ec11f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>📬</div>
                <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 6, color: "#1a2d5a" }}>I Got an IRS Letter</div>
                <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>Find out what your notice means and exactly what to do next.</div>
                <div style={{ color: "#7ec11f", fontSize: 13, fontWeight: "bold" }}>Look Up My Notice →</div>
              </div>

              <div onClick={() => setScreen("situations")}
                style={{ background: "#fff", border: "2px solid #e8e4dc", borderRadius: 14, padding: "20px 18px", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7ec11f"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(126,193,31,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e4dc"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: 44, height: 44, background: "#eff6ff", border: "1.5px solid #1a2d5a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>⚡</div>
                <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 6, color: "#1a2d5a" }}>I Have a Tax Problem</div>
                <div style={{ color: "#666", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>Describe your situation and get a clear, step-by-step path forward.</div>
                <div style={{ color: "#1a2d5a", fontSize: 13, fontWeight: "bold" }}>Find My Situation →</div>
              </div>
            </div>

            {/* Situation quick-picks */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e4dc", padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#1a2d5a", letterSpacing: 0.5, marginBottom: 12 }}>COMMON SITUATIONS</div>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { icon: "💸", label: "I owe taxes but can't pay", sub: "Payment plans · OIC · Hardship status", id: "cant-pay", urgency: null },
                  { icon: "🚨", label: "My bank account or wages are being levied", sub: "21-day window · CDP hearing rights · Release options", id: "levy", urgency: "urgent" },
                  { icon: "📋", label: "I haven't filed tax returns", sub: "Back filing · IRS policy · Penalties", id: "unfiled", urgency: null },
                  { icon: "⚖️", label: "My spouse caused the tax problem", sub: "Innocent Spouse Relief · Form 8857", id: "innocent-spouse", urgency: null },
                ].map(s => (
                  <div key={s.id} onClick={() => { setSelectedSituation(situationPaths.find(p => p.id === s.id)); setScreen("situations"); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f8f6f1", borderRadius: 9, cursor: "pointer", border: "1px solid transparent", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#7ec11f"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f8f6f1"; e.currentTarget.style.borderColor = "transparent"; }}>
                    <div style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e8e4dc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: "bold", color: "#1a2d5a", marginBottom: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sub}</div>
                    </div>
                    {s.urgency && <div style={{ background: "#fee2e2", color: "#dc2626", fontSize: 9, fontWeight: "bold", padding: "2px 7px", borderRadius: 10, flexShrink: 0 }}>URGENT</div>}
                    <div style={{ color: "#aaa", fontSize: 14, flexShrink: 0 }}>›</div>
                  </div>
                ))}
                <div onClick={() => setScreen("situations")}
                  style={{ textAlign: "center", fontSize: 12, color: "#7ec11f", fontWeight: "bold", padding: "6px 0", cursor: "pointer" }}>
                  View All Situations →
                </div>
              </div>
            </div>

            {/* Wizard CTA */}
            <div style={{ background: "#1a2d5a", borderRadius: 14, padding: "18px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ color: "#7ec11f", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>FINANCIAL INTAKE WIZARD</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>Ready to complete your IRS forms?</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Auto-fills Forms 433-F, 433-A, 433-A OIC, and Form 656</div>
              </div>
              <WizardButton />
            </div>

            {/* Pro tip */}
            <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, background: "#1a2d5a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>💡</div>
              <div>
                <div style={{ color: "#1a2d5a", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5, marginBottom: 4 }}>PRO TIP FROM TYRONE J. TAYLOR, EA</div>
                <div style={{ color: "#555", fontSize: 13, lineHeight: 1.7 }}>The IRS wants to resolve issues — not chase you. Responding to any notice, even just to say "I need more time," is always better than silence.</div>
              </div>
            </div>
          </div>
        )}

        {/* NOTICE LOOKUP */}
        {screen === "notice-lookup" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 6 }}>📬 Look Up Your IRS Notice</h2>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>Your notice number is in the upper right corner of the letter — it looks like "CP2000" or "LT11".</p>

            <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #e8e4dc", marginBottom: 24 }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 8 }}>Enter Notice Number</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={noticeInput} onChange={e => setNoticeInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleNoticeSearch()}
                  placeholder="e.g. CP2000, LT11, CP504..."
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 15, outline: "none", fontFamily: "Georgia, serif", color: "#1a2d5a" }} />
                <button onClick={handleNoticeSearch}
                  style={{ background: "#1a2d5a", color: "#7ec11f", border: "2px solid #7ec11f", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: "bold", fontSize: 14, fontFamily: "Georgia, serif" }}>
                  Look Up →
                </button>
              </div>
              {noticeError && <div style={{ color: "#dc2626", marginTop: 10, fontSize: 14 }}>{noticeError}</div>}
            </div>

            {/* Collection Sequence */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontWeight: "bold", color: "#1a2d5a", fontSize: 14, letterSpacing: 0.5 }}>📋 COLLECTION NOTICES</span>
                <span style={{ fontSize: 12, color: "#888" }}>— In escalation order</span>
              </div>
              {/* Timeline bar */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16, padding: "0 4px" }}>
                {collectionSequence.map((key, i) => {
                  const n = collectionNotices[key];
                  const sev = severityConfig[n.severity];
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <div onClick={() => { setSelectedNotice({ key, ...n }); setScreen("notice-detail"); }}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: sev.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>{i + 1}</div>
                        <div style={{ fontSize: 11, fontWeight: "bold", color: sev.color, textAlign: "center" }}>{key}</div>
                      </div>
                      {i < collectionSequence.length - 1 && <div style={{ height: 2, flex: 1, background: "#e8e4dc", margin: "0 2px", marginBottom: 18 }} />}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {collectionSequence.map((key) => {
                  const n = collectionNotices[key];
                  const sev = severityConfig[n.severity];
                  return (
                    <div key={key} onClick={() => { setSelectedNotice({ key, ...n }); setScreen("notice-detail"); }}
                      style={{ background: "#fff", border: `1.5px solid ${sev.border}20`, borderLeft: `4px solid ${sev.border}`, borderRadius: 8, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderLeftWidth = "5px"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderLeftWidth = "4px"; }}>
                      <div>
                        <span style={{ fontWeight: "bold", marginRight: 8 }}>{key}</span>
                        <span style={{ color: "#555", fontSize: 14 }}>{n.title.split("—")[1]?.trim()}</span>
                      </div>
                      <span style={{ background: sev.bg, color: sev.color, fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: "bold", whiteSpace: "nowrap" }}>{sev.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Notices */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontWeight: "bold", color: "#1a2d5a", fontSize: 14, letterSpacing: 0.5 }}>🔍 AUDIT & EXAMINATION NOTICES</span>
              </div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#1e40af" }}>
                ℹ️ <strong>Note:</strong> The CP2501 is supposed to precede the CP2000, but the IRS frequently skips it and goes straight to the CP2000.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {auditSequence.map((key) => {
                  const n = auditNotices[key];
                  const sev = severityConfig[n.severity];
                  const displayKey = key.startsWith("Letter") ? key.replace("Letter", "Letter ") : key;
                  return (
                    <div key={key} onClick={() => { setSelectedNotice({ key, ...n }); setScreen("notice-detail"); }}
                      style={{ background: "#fff", border: `1.5px solid ${sev.border}20`, borderLeft: `4px solid ${sev.border}`, borderRadius: 8, padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderLeftWidth = "5px"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderLeftWidth = "4px"; }}>
                      <div>
                        <span style={{ fontWeight: "bold", marginRight: 8 }}>{displayKey}</span>
                        <span style={{ color: "#555", fontSize: 14 }}>{n.title.split("—")[1]?.trim()}</span>
                      </div>
                      <span style={{ background: sev.bg, color: sev.color, fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: "bold", whiteSpace: "nowrap" }}>{sev.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* NOTICE DETAIL */}
        {screen === "notice-detail" && selectedNotice && sev && (
          <div>
            {/* Collection sequence tracker */}
            {selectedNotice.step && (
              <div style={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 12, padding: "14px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: "bold", letterSpacing: 0.5 }}>COLLECTION SEQUENCE — YOU ARE HERE</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {collectionSequence.map((key, i) => {
                    const isCurrent = key === selectedNotice.key;
                    const isPast = i < selectedNotice.step - 1;
                    const stepSev = severityConfig[collectionNotices[key].severity];
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: isCurrent ? stepSev.color : isPast ? "#d1d5db" : "#f3f4f6", border: isCurrent ? `2px solid ${stepSev.color}` : "2px solid #e5e7eb", color: isCurrent ? "#fff" : isPast ? "#9ca3af" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 12, marginBottom: 4 }}>{i + 1}</div>
                          <div style={{ fontSize: 10, fontWeight: isCurrent ? "bold" : "normal", color: isCurrent ? stepSev.color : "#aaa", textAlign: "center" }}>{key}</div>
                        </div>
                        {i < collectionSequence.length - 1 && <div style={{ height: 2, flex: 1, background: isPast ? "#d1d5db" : "#f3f4f6", margin: "0 2px", marginBottom: 18 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ background: sev.bg, border: `2px solid ${sev.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 13, color: sev.color, letterSpacing: 1, marginBottom: 4 }}>{selectedNotice.key}</div>
                  <div style={{ fontWeight: "bold", fontSize: 20, color: "#1a2d5a" }}>{selectedNotice.title.split("—")[1]?.trim()}</div>
                </div>
                <span style={{ background: sev.color, color: "#fff", fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: "bold", whiteSpace: "nowrap" }}>{sev.label}</span>
              </div>
              <div style={{ marginTop: 12, background: "#fff8", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#333" }}>
                ⏰ <strong>Deadline:</strong> {selectedNotice.deadline}
              </div>
            </div>

            <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e8e4dc" }}>
              <h3 style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10, marginTop: 0 }}>What This Means (Plain English)</h3>
              <p style={{ color: "#444", lineHeight: 1.7, margin: 0 }}>{selectedNotice.plainEnglish}</p>
            </section>

            {selectedNotice.commonCauses && (
              <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e8e4dc" }}>
                <h3 style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12, marginTop: 0 }}>Why You Might Have Received This</h3>
                {selectedNotice.commonCauses.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#444" }}>
                    <span style={{ color: "#7ec11f", fontWeight: "bold" }}>•</span> {c}
                  </div>
                ))}
              </section>
            )}

            <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e8e4dc" }}>
              <h3 style={{ fontWeight: "bold", fontSize: 16, marginBottom: 14, marginTop: 0 }}>Your Options</h3>
              {selectedNotice.yourOptions.map((opt, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${opt.risk === "low" ? "#22c55e" : "#f59e0b"}`, paddingLeft: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 4 }}>{opt.title}</div>
                  <div style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>{opt.description}</div>
                  {needsWizard(opt.title, opt.description, "") && <WizardButton />}
                </div>
              ))}
            </section>

            <section style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", color: "#dc2626", marginBottom: 8 }}>⚠️ What Happens If You Ignore This</div>
              <p style={{ color: "#7f1d1d", margin: 0, fontSize: 14, lineHeight: 1.6 }}>{selectedNotice.doNotIgnore}</p>
            </section>

            <section style={{ background: "#1a2d5a", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#7ec11f", fontWeight: "bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>💡 PRO TIP FROM TYRONE J. TAYLOR, EA</div>
              <p style={{ color: "#e8e4dc", margin: 0, fontSize: 15, lineHeight: 1.7 }}>{selectedNotice.proTip}</p>
            </section>
          </div>
        )}

        {/* SITUATIONS */}
        {screen === "situations" && !selectedSituation && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 6 }}>🧭 What's Your Situation?</h2>
            <p style={{ color: "#666", marginBottom: 24, fontSize: 15 }}>Choose the option that best describes what you're dealing with.</p>
            <div style={{ display: "grid", gap: 14 }}>
              {situationPaths.map(s => (
                <div key={s.id} onClick={() => setSelectedSituation(s)}
                  style={{ background: "#fff", border: "2px solid #e8e4dc", borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#7ec11f"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(126,193,31,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e4dc"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, background: "#f0fdf4", border: "1.5px solid #7ec11f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 3, color: "#1a2d5a" }}>{s.title}</div>
                      <div style={{ color: "#666", fontSize: 13 }}>{s.description}</div>
                    </div>
                    <div style={{ color: "#aaa", fontSize: 16, flexShrink: 0 }}>›</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SITUATION DETAIL */}
        {screen === "situations" && selectedSituation && (
          <div>
            <button onClick={() => setSelectedSituation(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", marginBottom: 16, fontSize: 14 }}>← Back to situations</button>
            <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 6 }}>{selectedSituation.icon} {selectedSituation.title}</h2>
            <p style={{ color: "#666", marginBottom: selectedSituation.alert || selectedSituation.freshStartWarning || selectedSituation.levySituation ? 16 : 24 }}>{selectedSituation.description}</p>

            {/* LEVY — urgent triage banner + visual lien/levy comparison */}
            {selectedSituation.levySituation && (
              <div>
                {/* Emergency banner */}
                <div style={{ background: "#7f1d1d", borderRadius: 12, padding: 18, marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>🚨</span>
                  <div>
                    <div style={{ color: "#fca5a5", fontWeight: "bold", fontSize: 13, letterSpacing: 0.5, marginBottom: 6 }}>ACTIVE LEVY — TIME-SENSITIVE</div>
                    <div style={{ color: "#fef2f2", fontSize: 14, lineHeight: 1.7 }}>
                      <strong>Bank levy:</strong> You have a <strong style={{ color: "#fca5a5" }}>21-day window</strong> before frozen funds are sent to the IRS. Act today.<br />
                      <strong>Wage levy:</strong> Complete your exemption form and return it to your employer <strong style={{ color: "#fca5a5" }}>immediately</strong> to protect your minimum wages.<br />
                      <strong>CDP deadline:</strong> If you received an LT11, CP90, or Letter 1058, count your 30 days from that date — missing it permanently waives your hearing rights.
                    </div>
                  </div>
                </div>

                {/* Visual lien vs. levy comparison */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: "bold", fontSize: 15, color: "#1a2d5a", marginBottom: 12, textAlign: "center" }}>⚖️ Lien vs. Levy — Know the Difference</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* LIEN */}
                    <div style={{ background: "#fff", border: "2px solid #f59e0b", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ background: "#f59e0b", padding: "10px 16px" }}>
                        <div style={{ fontWeight: "bold", color: "#fff", fontSize: 14 }}>📌 Tax Lien</div>
                        <div style={{ color: "#fffbeb", fontSize: 12 }}>A claim on your property</div>
                      </div>
                      <div style={{ padding: 14 }}>
                        {[
                          ["What it is", "A legal claim staked against everything you own"],
                          ["Takes money?", "No — it's a public record, not a seizure"],
                          ["Triggered by", "IRS files a Notice of Federal Tax Lien (NFTL) after a balance goes unpaid"],
                          ["Impact", "Damages credit, complicates selling property or getting loans"],
                          ["How to remove", "Pay in full, or request a lien withdrawal or subordination"],
                          ["Your life", "You can still use your property and bank accounts normally"],
                        ].map(([label, val], i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", padding: "6px 0", borderBottom: i < 5 ? "1px solid #fef3c7" : "none" }}>
                            <span style={{ fontSize: 11, fontWeight: "bold", color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
                            <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* LEVY */}
                    <div style={{ background: "#fff", border: "2px solid #dc2626", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ background: "#dc2626", padding: "10px 16px" }}>
                        <div style={{ fontWeight: "bold", color: "#fff", fontSize: 14 }}>🔒 Tax Levy</div>
                        <div style={{ color: "#fee2e2", fontSize: 12 }}>An active seizure of money</div>
                      </div>
                      <div style={{ padding: 14 }}>
                        {[
                          ["What it is", "Actual seizure of your bank account, wages, or other property"],
                          ["Takes money?", "Yes — this is why you're here"],
                          ["Types", "Bank levy (freezes account) • Wage levy (garnishes paycheck) • Property seizure"],
                          ["Impact", "Direct financial hardship — funds frozen or paycheck reduced every cycle"],
                          ["How to release", "CDP hearing, financial hardship, installment agreement, CNC, OIC, or pay in full"],
                          ["Your life", "Money is being taken from you right now — requires immediate action"],
                        ].map(([label, val], i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", padding: "6px 0", borderBottom: i < 5 ? "1px solid #fee2e2" : "none" }}>
                            <span style={{ fontSize: 11, fontWeight: "bold", color: "#991b1b", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
                            <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Plain language paragraph */}
                  <div style={{ background: "#f8f6f1", border: "1px solid #e8e4dc", borderRadius: 10, padding: 14, marginTop: 12, fontSize: 14, color: "#2c3e50", lineHeight: 1.75 }}>
                    <strong>The simplest way to remember it:</strong> A lien is a sticky note on your property saying "the IRS has first dibs." A levy is the IRS actually taking the property — or the money in it. You can have a lien without a levy, and you can have a levy without a lien. Right now, if your bank account is frozen or your paycheck is short, you have a <em>levy</em>. The steps below will walk you through how to fight it.
                  </div>
                </div>
              </div>
            )}

            {/* Fresh Start myth-buster */}
            {selectedSituation.freshStartWarning && (
              <div style={{ background: "#1a2d5a", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <div style={{ color: "#7ec11f", fontWeight: "bold", fontSize: 13, letterSpacing: 0.5, marginBottom: 10 }}>⚠️ MYTH BUSTER — THE "FRESH START INITIATIVE"</div>
                <p style={{ color: "#e8e4dc", fontSize: 14, lineHeight: 1.75, margin: "0 0 10px" }}>
                  You may have heard advertisements promising a "Fresh Start" that will wipe out your tax debt. <strong style={{ color: "#7ec11f" }}>This is misleading.</strong> There is no active IRS program that simply forgives or erases tax balances.
                </p>
                <p style={{ color: "#e8e4dc", fontSize: 14, lineHeight: 1.75, margin: "0 0 10px" }}>
                  The "Fresh Start Initiative" refers to a set of IRS policy changes made in 2012 that made it somewhat easier to qualify for payment plans and Offers in Compromise — but it is not an amnesty program, and it does not eliminate your debt.
                </p>
                <p style={{ color: "#7ec11f", fontSize: 14, lineHeight: 1.75, margin: 0, fontWeight: "bold" }}>
                  The program everyone is actually looking for is the Offer in Compromise (OIC) — and qualification is genuinely difficult. See below for what it actually takes to qualify.
                </p>
              </div>
            )}

            {/* Other alert banners */}
            {selectedSituation.alert && (
              <div style={{ background: "#eff6ff", border: "1.5px solid #3b82f6", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
                <div style={{ color: "#1e3a5f", fontSize: 14, lineHeight: 1.7 }}>
                  <strong>IRS Policy You Should Know:</strong> {selectedSituation.alert}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gap: 16 }}>
              {selectedSituation.options.map((opt, i) => (
                <div key={i} style={{
                  background: "#fff",
                  border: opt.title.includes("Estimated Tax") ? "2px solid #f59e0b" : opt.badge === "most-misunderstood" ? "2px solid #8b5cf6" : opt.badge === "deadline" ? "2px solid #dc2626" : "1px solid #e8e4dc",
                  borderRadius: 12, padding: 20
                }}>
                  {/* Badges */}
                  {opt.title.includes("Estimated Tax") && (
                    <div style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>⚠️ DO THIS NOW</div>
                  )}
                  {opt.badge === "most-misunderstood" && (
                    <div style={{ background: "#ede9fe", color: "#5b21b6", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>⚖️ MOST MISUNDERSTOOD OPTION — READ CAREFULLY</div>
                  )}
                  {opt.badge === "underused" && (
                    <div style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>💡 UNDERUSED & POWERFUL — MOST PEOPLE DON'T KNOW THIS EXISTS</div>
                  )}
                  {opt.badge === "deadline" && (
                    <div style={{ background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, display: "inline-block", marginBottom: 8 }}>⏰ CHECK THIS DEADLINE FIRST — 30 DAYS FROM LT11/CP90/LETTER 1058</div>
                  )}

                  <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10, color: "#1a2d5a" }}>{opt.title}</div>

                  {/* Render desc with line breaks and bullet formatting */}
                  <div style={{ color: "#555", fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>
                    {opt.desc.split("\n").map((line, j) => {
                      if (line.startsWith("•")) {
                        return <div key={j} style={{ paddingLeft: 14, marginBottom: 4 }}>{line}</div>;
                      } else if (line.match(/^\d\./)) {
                        return <div key={j} style={{ fontWeight: "bold", marginTop: 10, marginBottom: 4, color: "#1a2d5a" }}>{line}</div>;
                      } else if (line === "") {
                        return <div key={j} style={{ height: 6 }} />;
                      } else {
                        return <div key={j}>{line}</div>;
                      }
                    })}
                  </div>

                  <div style={{ background: "#f8f6f1", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#888" }}>
                    📄 {opt.form}
                  </div>
                  {needsWizard(opt.title, opt.desc, opt.form) && <WizardButton />}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div style={{ textAlign: "center", padding: "24px 16px", color: "#aaa", fontSize: 12, borderTop: "1px solid #e8e4dc", marginTop: 24 }}>
        This tool provides general information only and does not constitute legal or tax advice. For complex situations, consult an Enrolled Agent, CPA, or tax attorney.
      </div>
    </div>
  );
}
