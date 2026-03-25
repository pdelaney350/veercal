import React, { useState, useMemo, useCallback } from "react";

/**
 * Veercal — Car Ownership Cost Calculator
 * © 2025 Veercal. All rights reserved.
 * https://www.veercal.com
 *
 * This source code is proprietary and confidential.
 * Unauthorised copying, modification, distribution, or use of this
 * software, in whole or in part, without the prior written consent
 * of Veercal is strictly prohibited.
 *
 * General information only — not financial advice.
 */
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

/* ─── Google Fonts (idempotent — won't duplicate on hot reload) ─────────── */
if (!document.getElementById("veercal-fonts")) {
  const FONT_LINK = document.createElement("link");
  FONT_LINK.id = "veercal-fonts";
  FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
  FONT_LINK.rel = "stylesheet";
  document.head.appendChild(FONT_LINK);
}

/* ─── Print + Mobile CSS (idempotent) ────────────────────────────────────── */
if (!document.getElementById("veercal-styles")) {
const STYLE_EL = document.createElement("style");
STYLE_EL.id = "veercal-styles";
STYLE_EL.textContent = `
  /* Print / PDF styles */
  @media print {
    .no-print { display: none !important; }
    .print-break { page-break-before: always; }
    body { background: white !important; }
    * { box-shadow: none !important; }
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .desktop-sidebar { display: none; }
    .desktop-sidebar.open { display: flex !important; flex-direction: column;
      position: fixed; top: 0; left: 0; width: 80vw; max-width: 300px;
      height: 100vh; z-index: 1000; overflow-y: auto;
      box-shadow: 4px 0 24px rgba(30,41,59,0.18); }
    .sidebar-overlay { display: block !important; position: fixed; inset: 0;
      background: rgba(30,41,59,0.4); z-index: 999; }
    .mobile-only { display: flex !important; }
    .header-stats { display: none !important; }
    .main-content { padding: 12px !important; }
    .tab-label-full { display: none; }
    .tab-label-short { display: inline !important; }
  }

  @media (min-width: 769px) {
    .mobile-only { display: none !important; }
    .sidebar-overlay { display: none !important; }
    .tab-label-short { display: none; }
  }
`;
document.head.appendChild(STYLE_EL);
}

/* ─── Meta tags ──────────────────────────────────────────────────────────── */
const setMeta = (name, content, prop = false) => {
  const el = document.createElement("meta");
  el.setAttribute(prop ? "property" : "name", name);
  el.setAttribute("content", content);
  document.head.appendChild(el);
};
setMeta("author",           "Veercal");
setMeta("copyright",        `© ${new Date().getFullYear()} Veercal. All rights reserved.`);
setMeta("description",      "Australian car ownership cost calculator — compare cash, personal loan, dealer finance, finance lease, and novated lease side by side. True total cost including depreciation, stamp duty, FBT, and running costs.");
setMeta("og:title",         "Veercal — Car Ownership Cost Calculator", true);
setMeta("og:description",   "Compare every car finance structure in Australia. True cost analysis including FBT, stamp duty, depreciation, and running costs.", true);
setMeta("og:type",          "website", true);
setMeta("og:image",         "https://www.veercal.com/og-image.png", true);  /* TODO: create and upload 1200x630 branded image */
setMeta("og:url",           "https://www.veercal.com", true);
setMeta("og:site_name",     "Veercal", true);
setMeta("twitter:card",     "summary_large_image");
setMeta("twitter:title",    "Veercal — Car Ownership Cost Calculator");
setMeta("twitter:description", "Compare cash, loans, dealer finance, leases, and novated leases. True cost analysis for Australian car buyers.");

/* Set page title */
document.title = "Veercal — Car Ownership Cost Calculator | Australia";

/* FAQ structured data for rich results */
if (!document.getElementById("veercal-faq-schema")) {
  const faqSchema = document.createElement("script");
  faqSchema.id = "veercal-faq-schema";
  faqSchema.type = "application/ld+json";
  faqSchema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is a novated lease?",
        "acceptedAnswer": { "@type": "Answer", "text": "A novated lease is a three-way arrangement between you, your employer, and a finance company. Lease payments are deducted from your pre-tax salary, reducing your taxable income. It is only available to PAYG employees. General information only — not financial advice." }},
      { "@type": "Question", "name": "How is stamp duty calculated on a car in Australia?",
        "acceptedAnswer": { "@type": "Answer", "text": "Stamp duty on motor vehicles is a state government charge calculated on the vehicle's market value. Rates vary significantly by state — from around 3% in QLD and TAS to 6% in VIC for vehicles over $100,000. General information only." }},
      { "@type": "Question", "name": "What is the true cost of owning a car?",
        "acceptedAnswer": { "@type": "Answer", "text": "The true cost includes purchase price, stamp duty, finance interest, depreciation, fuel, insurance, registration, servicing, and tyres — minus the exit sale value. The Veercal calculator models all of these together for accurate comparison across finance structures." }},
      { "@type": "Question", "name": "Is a novated lease better than a personal loan?",
        "acceptedAnswer": { "@type": "Answer", "text": "It depends on your salary, vehicle price, and how much you drive. For employees earning $80,000+ a novated lease typically shows a lower after-tax cost, especially for eligible EVs which are FBT-exempt. Use the Veercal calculator to compare your specific scenario. General information only — not financial advice." }}
    ]
  });
  document.head.appendChild(faqSchema);
}

/* ─── Brand fonts & colours ─────────────────────────────────────────────── */
const HEAD_FONT = "'Arial Black', 'Arial Bold', Arial, sans-serif"; /* matches logo wordmark */
const BODY_FONT = "'Inter', 'Plus Jakarta Sans', sans-serif";
const BRAND_GREEN = "#1e40af"; /* brand primary blue */

/* ─── Design tokens ────────────────────────────────────────────────────── */
const C = {
  /* ── Brand ───────────────────────────────── */
  brand900:  "#1e293b",   /* slate-900 — darkest navy, headers, heavy text */
  brand700:  "#1e40af",   /* brand blue primary */
  brand500:  "#2563eb",   /* brand blue secondary / interactive */
  brand50:   "#f1f5f9",   /* brand lightest — page bg, sidebar */

  /* ── UI surfaces ─────────────────────────── */
  bg:        "#f1f5f9",   /* brand lightest bg */
  surface:   "#ffffff",
  surface2:  "#f8fafc",   /* slightly off-white panels */
  surfaceAlt:"#e8eef8",   /* blue-tinted alt surface */
  border:    "#dbe4f0",
  borderDark:"#b8cae0",

  /* ── Text ────────────────────────────────── */
  text:      "#1e293b",   /* brand slate — primary text */
  textMid:   "#334d80",
  muted:     "#4a5a6b",   /* slate-500 */

  /* ── Brand aliases (keep old names working) */
  green900:  "#1e3a8a",
  green700:  "#1e40af",
  green600:  "#2563eb",
  green500:  "#3b82f6",
  green400:  "#60a5fa",
  green200:  "#bfdbfe",
  green100:  "#eff6ff",

  /* ── Semantic — keep existing greens/oranges for data ── */
  good:      "#166534",   /* positive values — keep green */
  goodBg:    "#dcfce7",
  warn:      "#b45309",   /* caution — keep amber */
  warnBg:    "#fef3c7",
  bad:       "#b91c1c",   /* negative — keep red */
  badBg:     "#fee2e2",
  info:      "#1e40af",

  /* ── Keep orange scale for data viz contrast ─────────── */
  orange700: "#c2410c",
  orange600: "#ea580c",
  orange500: "#f97316",
  orange400: "#fb923c",
  orange300: "#fdba74",
  orange100: "#ffedd5",
};

const METHOD_META = {
  cash:    { label: "Cash Purchase",    color: "#166534",   light: "#dcfce7",    icon: "💵" },
  loan:    { label: "Personal Loan",    color: "#1e40af",   light: "#dbeafe",    icon: "🏦" },
  dealer:  { label: "Dealer Finance",   color: "#ea580c",   light: "#ffedd5",    icon: "🚗" },
  lease:   { label: "Finance Lease",    color: "#7c3aed",   light: "#ede9fe",    icon: "📄" },
  novated: { label: "Novated Lease",    color: "#b45309",   light: "#fef3c7",    icon: "💼" },
};

const DEFAULTS = {
  vehiclePrice: 45000, holdYears: 5, annualKm: 15000,
  opportunityCostPct: 0.05,
  loanRate: 0.0899, loanTermYears: 5, loanDeposit: 5000,
  dealerRate: 0.0699, dealerTermYears: 5, dealerDeposit: 2000, balloonPct: 0.25,
  leaseRate: 0.065, leaseResidualPct: 0.46, leaseTermYears: 3,
  grossSalary: 100000, novatedRate: 0.065, novatedTermYears: 3, novatedResidualPct: 0.46, novatedProviderFeeAnnual: 0,
  fuelPerL: 2.10, fuelL100km: 9, tyresPerYear: 600,
  servicesPerYear: 800, insurancePerYear: 1800, regPerYear: 900,
  depYr1: 0.15, depYr2: 0.12, depYrN: 0.10,
  isEV: false, evType: 'bev', evHomeChargeKwh: 0.28, evEfficiencyKwh: 18, evGovtRebate: 0,
  state: "VIC", applyLCT: false,
  refinanceYear: 0, refinanceRate: 0.059,
};

/* ─── RATES CONFIG — update annually each July 1 ────────────────────────────
   These are the only government-set values in the entire codebase.
   Last verified: March 2025 (FY2024-25)
   Next review due: 1 July 2025
─────────────────────────────────────────────────────────────────────────── */
const RATES = {
  /* ATO FBT */
  fbtGrossUpType1:    2.0802,   /* FBT gross-up rate (GST creditable) */
  fbtGrossUpType2:    1.8868,   /* FBT gross-up rate (non-creditable) */
  fbtEmployerRate:    0.47,     /* FBT rate (employer) */
  fbtStatutory:       0.20,     /* Statutory formula % for car benefit */

  /* LCT — FY2024-25 */
  lctThresholdStd:    80567,    /* Standard vehicles */
  lctThresholdFE:     89332,    /* Fuel-efficient (<7L/100km), EV, PHEV */
  lctRate:            0.33,

  /* ATO statutory residuals by annual km band (novated/lease) */
  residualByKm: {
    15000: 0.5288,
    25000: 0.4669,
    35000: 0.4050,
    45000: 0.3431,
    over45: 0.2812,
  },

  /* Medicare levy threshold (FY2024-25) */
  medicareLevyThreshold: 26000,
  medicareLevy:          0.02,

  /* Tax brackets (FY2024-25) — keep in sync with mtr() function below */
  taxBrackets: [
    { min: 0,      max: 18200,  rate: 0,     base: 0 },
    { min: 18201,  max: 45000,  rate: 0.19,  base: 0 },
    { min: 45001,  max: 135000, rate: 0.325, base: 5092 },
    { min: 135001, max: 190000, rate: 0.37,  base: 31288 },
    { min: 190001, max: Infinity, rate: 0.45, base: 51638 },
  ],

  /* Review metadata */
  lastReviewed:  "March 2025",
  nextReviewDue: "1 July 2025",
  source:        "ato.gov.au / state revenue offices",
};



/* ─── Stamp duty ─────────────────────────────────────────────────────────── */
const SD = {
  VIC: (p) => p <= 57000 ? p * 0.035 : p <= 100000 ? 1995 + (p - 57000) * 0.05 : p * 0.06,
  NSW: (p) => {
    /* Revenue NSW motor vehicle duty — no step discontinuity */
    if (p <= 45000)  return p * 0.03;
    if (p <= 65000)  return 1350 + (p - 45000) * 0.035;
    if (p <= 100000) return 2050 + (p - 65000) * 0.04;
    return 3450 + (p - 100000) * 0.05;
  },
  QLD: (p) => p <= 100000 ? p * 0.031 : p * 0.035,
  WA:  (p) => p <= 25000 ? p * 0.026 : p <= 50000 ? 650 + (p - 25000) * 0.0265 : p <= 100000 ? 1312.5 + (p - 50000) * 0.030 : p * 0.034,
  SA:  (p) => p * 0.04,
  TAS: (p) => p * 0.03,
  ACT: (p) => p * 0.03,
  NT:  (p) => p * 0.03,
};
const LCT_STD = 80567, LCT_FE = 89332, LCT_RATE = 0.33;
const calcLCT = (p, ev) => { const t = ev ? LCT_FE : LCT_STD; return p > t ? ((p - t) / 1.1) * LCT_RATE : 0; };
const calcSD  = (p, st) => (SD[st] || SD.VIC)(p);

/* ─── Finance maths ─────────────────────────────────────────────────────── */
function pmt(rate, nper, pv, fv = 0) {
  const r = rate / 12;
  if (r === 0) return (pv + fv) / nper;
  return (r * (pv * Math.pow(1 + r, nper) + fv)) / (Math.pow(1 + r, nper) - 1);
}
function buildAmort(principal, rate, months, balloon = 0) {
  const r = rate / 12, pay = pmt(rate, months, principal, -balloon);
  let bal = principal, tot = 0;
  const rows = [];
  for (let m = 1; m <= months; m++) {
    const int = bal * r, pp = pay - int;
    bal = bal - pp; tot += int;
    rows.push({ month: m, payment: pay, interest: int, principalPaid: pp, balance: Math.max(0, bal), totalInterest: tot });
  }
  return { rows, totalInterest: tot, monthlyPayment: pay };
}
function vehVal(price, yr, d) {
  let v = price;
  for (let y = 1; y <= yr; y++) v *= 1 - (y === 1 ? d.depYr1 : y === 2 ? d.depYr2 : d.depYrN);
  return Math.max(v, price * 0.05);
}
function mtr(sal) {
  /* FY2024-25 Stage-3 brackets — sourced from RATES.taxBrackets above */
  if (sal <= 18200)  return 0;
  if (sal <= 45000)  return 0.19;
  if (sal <= 135000) return 0.325;  /* Stage-3 cut: was $120k, now $135k from 1 Jul 2024 */
  if (sal <= 190000) return 0.37;   /* Stage-3 cut: was $180k, now $190k from 1 Jul 2024 */
  return 0.45;
}
function med(sal) { return sal > 26000 ? 0.02 : 0; }
function running(d) {
  if (d.isEV) return (d.annualKm / 100) * d.evEfficiencyKwh * d.evHomeChargeKwh + d.tyresPerYear + d.servicesPerYear * 0.6 + d.insurancePerYear + d.regPerYear;
  return (d.annualKm / 100) * d.fuelL100km * d.fuelPerL + d.tyresPerYear + d.servicesPerYear + d.insurancePerYear + d.regPerYear;
}
function effPrice(d) {
  /* Returns full effective outlay price including government charges.
     For cash: this is the total upfront cost.
     For loans: stamp duty and LCT are upfront costs (not financed) —
     see calcLoan() which separates financed principal from on-costs. */
  const lct = d.applyLCT ? calcLCT(d.vehiclePrice, d.isEV) : 0;
  const sd = calcSD(d.vehiclePrice + lct, d.state);
  return d.vehiclePrice + lct + sd - (d.isEV ? d.evGovtRebate : 0);
}
/* ─── Calculators ────────────────────────────────────────────────────────── */
function calcCash(d) {
  const ep = effPrice(d), run = running(d), yrs = d.holdYears;
  const yd = [];
  for (let y = 1; y <= yrs; y++) {
    const av = vehVal(d.vehiclePrice, y, d);
    /* Compound opportunity cost: what ep would have grown to if invested */
    const oppCost = ep * (Math.pow(1 + d.opportunityCostPct, y) - 1);
    yd.push({ year: y, assetValue: Math.round(av), equity: Math.round(av),
      totalSpent: Math.round(ep + run * y),
      annualSpent: y === 1 ? Math.round(ep + run) : Math.round(run),  /* upfront in yr1, running only after */
      monthlyEquivalent: Math.round(ep / (yrs * 12) + run / 12),
      netPosition: Math.round(av - ep - run * y),
      opportunityCost: Math.round(oppCost) });
  }
  const ev = vehVal(d.vehiclePrice, yrs, d);
  /* True cost includes compounded opportunity cost of deploying capital */
  const oppCostTotal = ep * (Math.pow(1 + d.opportunityCostPct, yrs) - 1);
  const tc = ep + run * yrs - ev + oppCostTotal;
  return { method: "cash", yearlyData: yd, totalCost: Math.round(tc), upfrontCost: Math.round(ep),
    monthlyPayment: 0, exitValue: Math.round(ev), totalInterest: 0,
    opportunityCostTotal: Math.round(oppCostTotal),
    effectiveMonthly: Math.round(tc / (yrs * 12)),
    lct: d.applyLCT ? Math.round(calcLCT(d.vehiclePrice, d.isEV)) : 0,
    stampDuty: Math.round(calcSD(d.vehiclePrice, d.state)), onCosts: Math.round(ep - d.vehiclePrice) };
}

function calcLoan(d, type) {
  const ep = effPrice(d), isD = type === "dealer";
  const rate = isD ? d.dealerRate : d.loanRate;
  const termYrs = isD ? d.dealerTermYears : d.loanTermYears;
  const dep = isD ? d.dealerDeposit : d.loanDeposit;
  const balloon = isD ? d.vehiclePrice * d.balloonPct : 0;
  /* Finance only the vehicle price + LCT (not stamp duty — paid upfront) */
  const financedAmount = d.vehiclePrice - dep + (d.applyLCT ? calcLCT(d.vehiclePrice, d.isEV) : 0);
  const principal = Math.max(0, financedAmount), months = termYrs * 12;
  let amort = buildAmort(principal, rate, months, balloon);
  if (d.refinanceYear > 0 && d.refinanceYear < termYrs) {
    const rfM = d.refinanceYear * 12;
    const balRf = amort.rows[rfM - 1].balance;
    const a2 = buildAmort(balRf, d.refinanceRate, months - rfM, balloon);
    amort = { ...amort, totalInterest: amort.rows[rfM - 1].totalInterest + a2.totalInterest };
  }
  const { rows, totalInterest, monthlyPayment } = amort;
  const run = running(d), yrs = d.holdYears;
  const yd = [];
  for (let y = 1; y <= yrs; y++) {
    const av = vehVal(d.vehiclePrice, y, d);
    const mIdx = Math.min(y * 12, months) - 1;
    const lb = y * 12 <= months ? rows[mIdx].balance : (isD ? balloon : 0);
    const tp = dep + Math.min(y * 12, months) * monthlyPayment;
    const prevTp = dep + Math.min((y-1)*12, months) * monthlyPayment;
    yd.push({ year: y, assetValue: Math.round(av), loanBalance: Math.round(lb),
      equity: Math.round(av - lb),
      totalSpent: Math.round(tp + run * y),
      annualSpent: Math.round((tp - prevTp) + run),  /* payments this year + annual running */
      monthlyEquivalent: Math.round(monthlyPayment + run / 12),
      netPosition: Math.round(av - lb - run * y) });
  }
  const ev = vehVal(d.vehiclePrice, yrs, d);
  const lb = yrs * 12 <= months ? rows[Math.min(yrs * 12, months) - 1].balance : (isD ? balloon : 0);
  const tp = dep + Math.min(yrs * 12, months) * monthlyPayment;
  const tc = tp + run * yrs - ev + Math.max(0, lb);
  return { method: type, yearlyData: yd, totalCost: Math.round(tc), upfrontCost: dep,
    monthlyPayment: Math.round(monthlyPayment), exitValue: Math.round(ev),
    totalInterest: Math.round(totalInterest), effectiveMonthly: Math.round(tc / (yrs * 12)),
    balloon: Math.round(balloon), loanBalance: Math.round(lb),
    lct: d.applyLCT ? Math.round(calcLCT(d.vehiclePrice, d.isEV)) : 0,
    stampDuty: Math.round(calcSD(d.vehiclePrice, d.state)), onCosts: Math.round(ep - d.vehiclePrice) };
}

function calcLease(d) {
  const months = d.leaseTermYears * 12, res = d.vehiclePrice * d.leaseResidualPct;
  const { monthlyPayment, totalInterest } = buildAmort(d.vehiclePrice, d.leaseRate, months, res);
  const run = running(d), yrs = d.holdYears;
  const yd = [];
  for (let y = 1; y <= yrs; y++) {
    const lp = Math.min(y, d.leaseTermYears) * 12 * monthlyPayment;
    yd.push({ year: y, assetValue: 0, equity: 0,
      totalSpent: Math.round(lp + run * y),
      annualSpent: Math.round(Math.min(12, Math.max(0, d.leaseTermYears*12 - (y-1)*12)) * monthlyPayment + run),
      monthlyEquivalent: Math.round(monthlyPayment + run / 12),
      netPosition: Math.round(-(lp + run * y)) });
  }
  const tl = Math.min(yrs, d.leaseTermYears) * 12 * monthlyPayment;
  return { method: "lease", yearlyData: yd, totalCost: Math.round(tl + run * yrs),
    upfrontCost: 0, monthlyPayment: Math.round(monthlyPayment),
    exitValue: 0, residualBuyout: Math.round(res), totalInterest: Math.round(totalInterest),
    effectiveMonthly: Math.round((tl + run * yrs) / (yrs * 12)), onCosts: 0, lct: 0, stampDuty: 0 };
}

function calcNovated(d) {
  const rate = mtr(d.grossSalary) + med(d.grossSalary);
  /* BEV: FBT exempt if under threshold (ongoing, no end date legislated Mar 2025)
     PHEV: exemption had a scheduled end date of 1 Apr 2025 — modelled as exempt
           but flagged with a warning to verify current ATO position */
  const evExempt = d.isEV && d.vehiclePrice <= LCT_FE;
  const months = d.novatedTermYears * 12, res = d.vehiclePrice * d.novatedResidualPct;
  const { monthlyPayment: gf } = buildAmort(d.vehiclePrice, d.novatedRate, months, res);
  const runMo = running(d) / 12, preTax = gf + runMo, saving = preTax * rate, net = preTax - saving;
  const fbtMo = evExempt ? 0 : (d.vehiclePrice * 0.20 * 2.0802 * 0.47) / 12;
  /* Provider management fee (annual) — post-tax, passed through as a real cost */
  const providerFeeMo = (d.novatedProviderFeeAnnual || 0) / 12;
  const trueNet = net + fbtMo + providerFeeMo;
  const yrs = d.holdYears;
  const yd = [];
  for (let y = 1; y <= yrs; y++) {
    const av = vehVal(d.vehiclePrice, y, d);
    /* Show real market value so exit sim can display residual vs market gap */
    yd.push({ year: y, assetValue: Math.round(av), equity: 0,
      totalSpent: Math.round(trueNet * 12 * y),
      annualSpent: Math.round(trueNet * 12),
      monthlyEquivalent: Math.round(trueNet),
      taxSavingAnnual: Math.round(saving * 12),
      netPosition: Math.round(-trueNet * 12 * y),
      residualBuyout: Math.round(res) });
  }
  return { method: "novated", yearlyData: yd, totalCost: Math.round(trueNet * 12 * yrs),
    upfrontCost: 0, monthlyPayment: Math.round(trueNet),
    grossMonthly: Math.round(preTax), taxSavingMonthly: Math.round(saving),
    fbtMonthly: Math.round(fbtMo), fbtExempt: evExempt,
    exitValue: 0, residualBuyout: Math.round(res), totalInterest: 0,
    effectiveMonthly: Math.round(trueNet), taxRate: Math.round(rate * 100), onCosts: 0, lct: 0, stampDuty: 0 };
}

/* ─── Formatters ────────────────────────────────────────────────────────── */
const NUM = BODY_FONT; /* unified with BODY_FONT — numeric text uses same font stack */
const fmt = (n) => n == null ? "–" : (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-AU");
const fmtP = (n) => `${(n * 100).toFixed(1)}%`;
const fmtK = (v) => `$${(v / 1000).toFixed(0)}k`;


/* ─── Input Validation ───────────────────────────────────────────────────────
   Guards against nonsensical inputs that would produce NaN/Infinity outputs.
   Called in upd() to sanitise values before they enter state.
─────────────────────────────────────────────────────────────────────────── */
const BOUNDS = {
  vehiclePrice:       { min: 1000,   max: 500000 },
  holdYears:          { min: 1,      max: 15 },
  annualKm:           { min: 1000,   max: 100000 },
  opportunityCostPct: { min: 0,      max: 0.25 },
  loanRate:           { min: 0,      max: 0.50 },
  loanTermYears:      { min: 1,      max: 10 },
  loanDeposit:        { min: 0,      max: 200000 },
  dealerRate:         { min: 0,      max: 0.50 },
  dealerTermYears:    { min: 1,      max: 10 },
  dealerDeposit:      { min: 0,      max: 200000 },
  balloonPct:         { min: 0,      max: 0.60 },
  leaseRate:          { min: 0,      max: 0.30 },
  leaseResidualPct:   { min: 0.10,   max: 0.70 },
  leaseTermYears:     { min: 1,      max: 7 },
  grossSalary:        { min: 0,      max: 1000000 },
  novatedRate:        { min: 0,      max: 0.30 },
  novatedTermYears:   { min: 1,      max: 7 },
  novatedResidualPct: { min: 0.10,   max: 0.70 },
  fuelPerL:           { min: 0.50,   max: 5.00 },
  fuelL100km:         { min: 1,      max: 30 },
  tyresPerYear:       { min: 0,      max: 10000 },
  servicesPerYear:    { min: 0,      max: 20000 },
  insurancePerYear:   { min: 0,      max: 20000 },
  regPerYear:         { min: 0,      max: 5000 },
  depYr1:             { min: 0.01,   max: 0.60 },
  depYr2:             { min: 0.01,   max: 0.50 },
  depYrN:             { min: 0.01,   max: 0.40 },
  evHomeChargeKwh:    { min: 0.05,   max: 1.00 },
  evEfficiencyKwh:    { min: 5,      max: 50 },
  evGovtRebate:       { min: 0,      max: 50000 },
  refinanceRate:      { min: 0,      max: 0.50 },
  refinanceYear:      { min: 0,      max: 10 },
};

function sanitise(key, val) {
  if (val === "" || val === null || val === undefined || isNaN(val)) return DEFAULTS[key] ?? 0;
  const b = BOUNDS[key];
  if (!b) return val;
  return Math.min(b.max, Math.max(b.min, val));
}

/* ─── Components ────────────────────────────────────────────────────────── */
const LBL = { fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: "0.01em", fontFamily: BODY_FONT };


/* ─── Tooltip / Explainer Content Library ───────────────────────────────────
   All educational content lives here. Each entry has:
   - title: display heading
   - body: plain-English explanation (can include <strong> tags)
   - suits: who this is good for (optional)
   - notSuited: who should avoid it (optional)
   - tip: a practical tip (optional)
   - learnMore: link slug to full article (optional)
──────────────────────────────────────────────────────────────────────────── */
const EXPLAINERS = {

  cashPurchase: {
    title: "Cash Purchase",
    body: "You pay the full vehicle price upfront from your own savings. You own the car outright from day one, with no ongoing finance obligations and no interest to pay. However, tying up a large lump sum in a depreciating asset has a hidden cost — that money could have been invested elsewhere.",
    suits: "People with savings who want simplicity, no debt, and maximum negotiating power at the dealership. Also suits those who plan to keep the car for many years.",
    notSuited: "People whose savings are earning strong returns elsewhere, or who need to preserve cash for other purposes.",
    tip: "Always get competing finance quotes before deciding to pay cash — sometimes dealer finance offers are genuinely competitive, and keeping your cash invested can come out ahead.",
  },

  personalLoan: {
    title: "Personal Loan",
    body: "You borrow money from a bank or lender at a fixed interest rate, then repay it in equal monthly instalments over an agreed term (typically 3–7 years). You own the car from the start. The interest rate is usually higher than secured finance because the loan is unsecured — but you have full freedom to sell the car any time.",
    suits: "People who want to own the vehicle outright, don't qualify for dealer finance, or want the flexibility to sell without a finance payout complication.",
    notSuited: "People who want the lowest possible monthly payment — personal loan rates are typically higher than dealer finance.",
    tip: "Always compare the comparison rate (not just the advertised rate) across at least 3 lenders. The difference between 8.9% and 12% on a $40k loan over 5 years is around $3,500 in extra interest.",
  },

  dealerFinance: {
    title: "Dealer Finance",
    body: "Finance arranged through the car dealership, typically via a captive finance company (e.g. Toyota Finance, BMW Financial Services) or a third-party lender the dealer has an arrangement with. Often comes with a balloon payment — a lump sum due at the end of the term — which keeps monthly repayments lower but means you don't fully own the car until the balloon is paid.",
    suits: "People who want lower monthly repayments, are comfortable with a balloon at the end, or are purchasing a brand where the manufacturer's finance rate is genuinely competitive.",
    notSuited: "People who don't have a plan for the balloon payment at the end of the term. If you can't pay the balloon, you'll need to refinance — often at a worse rate.",
    tip: "Dealer finance rates can be negotiated, especially at end-of-month or end-of-quarter. The advertised rate is rarely the best available rate.",
  },

  financeLease: {
    title: "Finance Lease",
    body: "A finance lease is an agreement where a financier purchases the vehicle and leases it back to you for a fixed term. You make monthly payments and have a residual value (set by ATO statutory percentages based on km travelled) payable at the end. Unlike a novated lease, there's no salary sacrifice — it's a straightforward finance product typically used by businesses and sole traders.",
    suits: "Business owners, sole traders, and self-employed people who want to claim the vehicle as a business expense. GST on the purchase price may be claimable.",
    notSuited: "PAYG employees — you don't get the tax benefits without an employer arrangement. A novated lease is usually better for employees.",
    tip: "The ATO sets minimum residual values based on annual km travelled. Driving more kilometres means a lower residual and higher monthly payments.",
  },

  novatedLease: {
    title: "Novated Lease",
    body: "A three-way agreement between you, your employer, and a finance company. Your employer deducts lease payments from your pre-tax salary — reducing your taxable income and therefore your income tax. Running costs (fuel, insurance, registration, tyres, servicing) can also be packaged pre-tax. The employer pays FBT (Fringe Benefits Tax) on the benefit, which is typically passed back to you as a post-tax contribution to reduce the FBT liability.",
    suits: "PAYG employees earning $80,000+, especially those in the 32.5% or higher tax bracket. High-km drivers. People who want to package running costs alongside finance. EV buyers — eligible EVs under $89,332 are exempt from FBT entirely.",
    notSuited: "Self-employed or sole traders (no employer to novate to). Part-time or casual employees — the tax saving is proportional to your income. People who change jobs frequently — the lease stays with you, not the employer, but it can complicate things.",
    tip: "The FBT exemption for eligible electric vehicles under $89,332 (FY2024–25) can save $4,000–$8,000+ over a 3-year lease compared to an equivalent ICE vehicle novated lease. If you're considering an EV, model this scenario carefully.",
  },

  effectiveMonthly: {
    title: "Effective Monthly Cost",
    body: "This is the true average monthly cost of owning the vehicle under this structure, calculated as: (total finance costs + total running costs − exit/sale value) ÷ number of months. It's a more honest number than the monthly repayment because it accounts for what you actually spend and what you recover when you sell.",
    tip: "The monthly repayment figure looks lower because it ignores running costs and depreciation. Always compare effective monthly costs across options — not just repayments.",
  },

  trueTotalCost: {
    title: "True Total Cost",
    body: "The net financial cost of owning the vehicle over your chosen hold period. Calculated as: upfront cost + all finance repayments + all running costs − the vehicle's estimated resale value at exit. This is the most accurate single number for comparing ownership structures — it's what the vehicle actually costs you, not just what you pay each month.",
    tip: "A lower monthly repayment doesn't mean a lower true cost. Dealer finance with a balloon can look cheap monthly but cost more overall if the balloon refinance rate is high.",
  },

  opportunityCost: {
    title: "Opportunity Cost (Cash Purchase)",
    body: "When you pay cash for a car, you give up the ability to invest that money elsewhere. The opportunity cost is what that money could have earned — for example, if you invest $45,000 at 5% per year, you'd earn roughly $2,250 in the first year. Over 5 years the compounding effect is significant. This tool models this as an additional hidden cost of paying cash, which helps make a fairer comparison against financed options.",
    tip: "If your savings are in an offset account reducing mortgage interest at 6%+, the opportunity cost of paying cash for a car is even higher than using a car loan at a similar rate.",
  },

  balloonPayment: {
    title: "Balloon / Residual Payment",
    body: "A lump sum due at the end of a finance or lease term. It keeps your monthly repayments lower during the term, but you must either pay it in full, refinance it (take a new loan to cover it), or sell the vehicle and use the proceeds. The balloon is set as a percentage of the original vehicle price at the start of the loan.",
    suits: "People who plan to sell or trade in the vehicle before or at the end of the term, using the sale proceeds to cover the balloon.",
    notSuited: "People who plan to keep the car beyond the finance term and don't have a plan for the lump sum.",
    tip: "Always check what the car will realistically be worth at the end of the term. If the vehicle value falls below the balloon amount, you're in negative equity — you owe more than the car is worth.",
  },

  fbtSalary: {
    title: "FBT & Salary Sacrifice",
    body: "Salary sacrifice means agreeing with your employer to take a portion of your pre-tax salary as a non-cash benefit — in this case, a car. This reduces your taxable income, saving you income tax. However, the government taxes the benefit through Fringe Benefits Tax (FBT), which the employer pays. The standard way to manage this is the Employee Contribution Method (ECM): you make a post-tax contribution equal to the FBT liability, which reduces it to zero. The net result is a meaningful tax saving — typically $3,000–$8,000+ per year depending on salary and vehicle cost.",
    tip: "The FBT rate (47%) sounds alarming but it's applied to the grossed-up value of the benefit, not the car price. The ECM post-tax contribution you make is usually much smaller than the pre-tax saving you generate.",
  },

  residualATO: {
    title: "ATO Statutory Residual",
    body: "For novated and finance leases, the ATO sets minimum residual values — the amount you must pay at the end of the lease — based on how many kilometres you drive per year. Higher annual km = lower residual = higher monthly payments (but less owing at the end). These percentages are set by the ATO and cannot be lower than the statutory minimums.",
    tip: "If you underestimate your annual km at the start of the lease, the residual will be set too high. You'll owe more at the end than the car is worth — a potentially costly gap.",
  },

  stampDuty: {
    title: "Stamp Duty on Vehicles",
    body: "A state government tax applied to the purchase of a motor vehicle, calculated as a percentage of the vehicle's market value. Each state and territory sets its own rates and brackets, which is why buying the same car in Victoria costs a different amount in stamp duty than buying it in Queensland. For new cars, stamp duty is typically paid at registration. It's a mandatory cost that adds directly to your upfront purchase price.",
    tip: "Some states offer stamp duty concessions for EVs and low-emission vehicles. Check your state's revenue office website for current concessions — the savings can be $1,000–$5,000+.",
  },

  lct: {
    title: "Luxury Car Tax (LCT)",
    body: "A federal government tax applied to vehicles above a set price threshold. For FY2024–25, the threshold is $80,567 for standard vehicles and $89,332 for fuel-efficient vehicles (including EVs, PHEVs, and hybrids using less than 7L/100km). LCT is charged at 33% on the portion of the price above the threshold, divided by 1.1 to account for GST already paid. It applies to the full supply chain — so if a dealer pays LCT, it will be reflected in the purchase price.",
    tip: "The fuel-efficient threshold ($89,332) applies to EVs and low-emission vehicles — this is one of the key financial incentives for EV buyers alongside the FBT exemption.",
  },

  depreciation: {
    title: "Vehicle Depreciation",
    body: "Cars lose value over time — this is depreciation. The rate of loss is fastest in the first year (typically 15–25% for new cars) as the car transitions from 'new' to 'used'. By years 3–5 the rate slows to around 10% per year. The total depreciation over your hold period is one of the largest components of your true ownership cost — often larger than the interest you pay on finance. This tool models depreciation as a declining-balance curve which you can adjust for your specific vehicle.",
    tip: "Popular models from mainstream brands (Toyota, Mazda, Hyundai) depreciate slower than luxury or European brands. If minimising depreciation matters, a 2–3 year old car has already absorbed the steepest drop and can be a significantly better value proposition.",
  },
};

/* ─── InfoModal Component ────────────────────────────────────────────────────
   Full-screen lightbox that displays an explainer entry.
   Triggered by InfoTip buttons throughout the UI.
─────────────────────────────────────────────────────────────────────────── */
function InfoModal({ id, onClose }) {
  const info = EXPLAINERS[id];
  if (!info) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(30,41,59,0.55)",
        zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="modal-title"
        style={{
          background: C.surface, borderRadius: 16, maxWidth: 520, width: "100%",
          boxShadow: "0 20px 60px rgba(30,41,59,0.25)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #2d3eb0 0%, #1e40af 100%)",
          padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div id="modal-title" style={{ fontFamily: HEAD_FONT, fontSize: 18, fontWeight: 900, color: "white", letterSpacing: "-0.01em" }}>
            {info.title}
          </div>
          <button onClick={onClose} aria-label="Close" autoFocus style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
            width: 28, height: 28, cursor: "pointer", color: "white", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: BODY_FONT, marginBottom: 14, marginTop: 0 }}>
            {info.body}
          </p>

          {info.suits && (
            <div style={{ background: C.goodBg, borderRadius: 8, padding: "10px 14px", marginBottom: 10, borderLeft: `3px solid ${C.good}` }}>
              <div style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 700, color: C.good, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>✓ Suits</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontFamily: BODY_FONT }}>{info.suits}</div>
            </div>
          )}

          {info.notSuited && (
            <div style={{ background: C.badBg, borderRadius: 8, padding: "10px 14px", marginBottom: 10, borderLeft: `3px solid ${C.bad}` }}>
              <div style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 700, color: C.bad, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>✗ May not suit</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontFamily: BODY_FONT }}>{info.notSuited}</div>
            </div>
          )}

          {info.tip && (
            <div style={{ background: C.warnBg, borderRadius: 8, padding: "10px 14px", borderLeft: `3px solid ${C.warn}` }}>
              <div style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 700, color: C.warn, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>💡 Practical tip</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontFamily: BODY_FONT }}>{info.tip}</div>
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, fontFamily: BODY_FONT, lineHeight: 1.6 }}>
            General information only — not financial advice. Consult a licensed financial adviser before making financial decisions.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── InfoTip Component ──────────────────────────────────────────────────────
   Small "?" button that opens the InfoModal for a given explainer id.
   Usage: <InfoTip id="novatedLease" openModal={openModal} />
─────────────────────────────────────────────────────────────────────────── */
function InfoTip({ id, openModal }) {
  return (
    <button
      onClick={() => openModal(id)}
      title="Learn more"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 16, height: 16, borderRadius: "50%",
        background: C.brand500 + "22", border: `1px solid ${C.brand500}55`,
        color: C.brand500, fontSize: 9, fontWeight: 800, cursor: "pointer",
        fontFamily: BODY_FONT, lineHeight: 1, marginLeft: 5, flexShrink: 0,
        transition: "all 0.15s", verticalAlign: "middle",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.brand500; e.currentTarget.style.color = "white"; }}
      onMouseLeave={e => { e.currentTarget.style.background = C.brand500 + "22"; e.currentTarget.style.color = C.brand500; }}
    >
      ?
    </button>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, fmt: f = (v) => v, sub, info, openModal, isRate = false }) {
  /* isRate=true adds a click-to-type text box for exact rate entry to 2 decimal places */
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const startEdit = () => { setDraft((value * 100).toFixed(2)); setEditing(true); };
  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
      onChange(Math.round(parsed * 10000) / 1000000 * 100); /* careful: % -> decimal */
      onChange(parsed / 100);
    }
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, alignItems: "center" }}>
        <span style={{ ...LBL, fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
          {label}
          {info && openModal && <InfoTip id={info} openModal={openModal} />}
        </span>
        {isRate && editing ? (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <input
              type="text" inputMode="decimal" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === "Enter" && commitEdit()}
              autoFocus
              style={{ width: 48, textAlign: "right", fontFamily: NUM, fontSize: 12, fontWeight: 700,
                color: C.brand500, border: `1px solid ${C.brand500}`, borderRadius: 4,
                padding: "1px 3px", outline: "none", background: C.surfaceAlt }}
            />
            <span style={{ fontSize: 10, color: C.muted }}>%</span>
          </div>
        ) : isRate ? (
          <span onClick={startEdit} title="Click to type exact rate"
            style={{ fontSize: 12, color: C.brand500, fontWeight: 700, fontFamily: NUM,
              cursor: "text", borderBottom: `1px dashed ${C.brand500}`, paddingBottom: 1 }}>
            {f(value)} ✎
          </span>
        ) : (
          <span style={{ fontSize: 12, color: C.brand500, fontWeight: 700, fontFamily: NUM }}>{f(value)}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{sub}</div>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label} aria-valuetext={f(value)}
        style={{ width: "100%", accentColor: C.brand500, cursor: "pointer" }} />
    </div>
  );
}

/* Free-typing number input — avoids browser type=number stepping issues */
function NIInput({ value, onChange, label }) {
  const [local, setLocal] = React.useState(String(value));
  React.useEffect(() => { setLocal(String(value)); }, [value]);
  const commit = () => {
    const p = parseFloat(local.replace(/[^0-9.]/g, ""));
    if (!isNaN(p)) { onChange(p); setLocal(String(p)); }
    else setLocal(String(value));
  };
  return (
    <input type="text" inputMode="numeric" value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      aria-label={label}
      style={{ background: "transparent", border: "none", color: C.text, fontSize: 13, width: "100%", outline: "none", fontFamily: NUM }} />
  );
}

function NI({ label, value, onChange, pre = "$", suf, sub, info, openModal }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...LBL, fontSize: 10, marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}>
        {label}
        {info && openModal && <InfoTip id={info} openModal={openModal} />}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px" }}>
        {pre && <span style={{ color: C.muted, fontSize: 12, marginRight: 3 }}>{pre}</span>}
        <NIInput value={value} onChange={onChange} label={label} />
        {suf && <span style={{ color: C.muted, fontSize: 12 }}>{suf}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div>
        <div style={{ ...LBL, fontSize: 10 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        role="switch" aria-checked={value} aria-label={label}
        style={{ width: 38, height: 21, borderRadius: 11, border: "none", cursor: "pointer", background: value ? C.green600 : C.border, position: "relative", transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 15, height: 15, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
      </button>
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...LBL, fontSize: 10, marginBottom: 2 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 12, color: C.text, fontFamily: BODY_FONT, outline: "none" }}>
        {options.map((o) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function SHead({ children, color, info, openModal }) {
  return (
    <div style={{
      fontFamily: BODY_FONT, fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
      color: color || C.brand700,
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 5, marginBottom: 10, marginTop: 16,
      display: "flex", alignItems: "center", gap: 5,
    }}>
      {children}
      {info && openModal && <InfoTip id={info} openModal={openModal} />}
    </div>
  );
}

function Panel({ children, sx = {}, ac }) {
  return <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${ac || C.border}`, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 4px rgba(30,41,59,0.06)", ...sx }}>{children}</div>;
}

function DRow({ label, value, good, warn, bold, info, openModal }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
      <span style={{ color: "#4a5a6b", fontFamily: BODY_FONT, fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
        {label}
        {info && openModal && <InfoTip id={info} openModal={openModal} />}
      </span>
      <span style={{ fontFamily: NUM, fontWeight: bold ? 700 : 500, color: warn ? C.warn : good ? C.good : C.text }}>{value}</span>
    </div>
  );
}

function KPI({ label, value, sub, ac, lg }) {
  return (
    <div style={{ flex: "1 1 130px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(30,41,59,0.05)", padding: "11px 13px" }}>
      <div style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: NUM, fontSize: lg ? 20 : 16, fontWeight: 700, color: ac || C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const METHOD_EXPLAINER = {
  cash: "cashPurchase", loan: "personalLoan", dealer: "dealerFinance",
  lease: "financeLease", novated: "novatedLease",
};

function MBadge({ method, active, onClick, openModal }) {
  const m = METHOD_META[method];
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <button onClick={onClick} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
        flex: 1, borderRadius: 7,
        border: `1.5px solid ${active ? m.color : C.border}`,
        background: active ? m.light : C.surface2,
        color: active ? m.color : C.muted,
        cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: BODY_FONT,
        transition: "all 0.15s", textAlign: "left",
      }}>
        <span style={{ fontSize: 14 }}>{m.icon}</span>
        <span>{m.label}</span>
        {active && <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: m.color, flexShrink: 0 }} />}
      </button>
      <button onClick={() => openModal(METHOD_EXPLAINER[method])} title="What is this?" style={{
        marginLeft: 6, width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: "transparent", border: `1px solid ${C.border}`,
        color: C.muted, fontSize: 10, cursor: "pointer", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand500; e.currentTarget.style.color = C.brand500; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
      >?</button>
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20, alignItems: "flex-end", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding: "8px 14px 9px", whiteSpace: "nowrap", flexShrink: 0,
            background: isActive ? C.surface : C.surface2,
            border: `1.5px solid ${C.border}`,
            borderBottom: isActive ? `1.5px solid ${C.surface}` : `1.5px solid ${C.border}`,
            borderRadius: "7px 7px 0 0",
            color: isActive ? C.brand500 : C.muted,
            cursor: "pointer", fontSize: 11, fontWeight: isActive ? 700 : 500,
            fontFamily: BODY_FONT, transition: "all 0.12s",
            marginBottom: -1,
            boxShadow: isActive ? "0 -2px 6px rgba(30,64,175,0.08)" : "none",
          }}>
            <span className="tab-label-full">{t.label}</span>
            <span className="tab-label-short">{t.short || t.label.split(" ")[0]}</span>
          </button>
        );
      })}
      <div style={{ flex: 1, borderBottom: `1.5px solid ${C.border}`, marginBottom: -1, minWidth: 8 }} />
    </div>
  );
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(30,41,59,0.12)" }}>
      <div style={{ fontWeight: 700, color: C.green700, marginBottom: 4, fontFamily: BODY_FONT }}>Year {label}</div>
      {payload.map((p) => <div key={p.dataKey} style={{ color: p.color, fontFamily: NUM, marginBottom: 1 }}>{p.name}: {fmt(p.value)}</div>)}
    </div>
  );
};

function SCard({ result, rank, openModal }) {
  const m = METHOD_META[result.method];
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ flex: "1 1 155px", minWidth: 145, background: C.surface, borderRadius: 12,
      border: `2px solid ${rank === 0 ? m.color : C.border}`, padding: "13px 15px",
      boxShadow: rank === 0 ? `0 4px 20px ${m.color}30` : "0 1px 4px rgba(30,41,59,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" }}>
        <div style={{ fontFamily: HEAD_FONT, fontSize: 11, fontWeight: 900, color: m.color, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{m.icon} {m.label}</div>
        <span style={{ fontSize: 16 }}>{medals[rank] || ""}</span>
      </div>
      <div style={{ fontFamily: NUM, fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 7 }}>{fmt(result.totalCost)}</div>
      <DRow label="Eff. monthly" value={fmt(result.effectiveMonthly)} info="effectiveMonthly" openModal={openModal} />
      <DRow label="Upfront" value={fmt(result.upfrontCost)} />
      {result.monthlyPayment > 0 && <DRow label="Payment/mo" value={fmt(result.monthlyPayment)} />}
      {result.totalInterest > 0 && <DRow label="Total interest" value={fmt(result.totalInterest)} warn />}
      {result.exitValue > 0 && <DRow label="Exit value" value={fmt(result.exitValue)} good />}
      {result.residualBuyout > 0 && <DRow label="Residual" value={fmt(result.residualBuyout)} />}
      {result.taxSavingMonthly > 0 && <DRow label="Tax saving/mo" value={fmt(result.taxSavingMonthly)} good />}
      {result.onCosts > 0 && <DRow label="Stamp+LCT" value={fmt(result.onCosts)} warn />}
    </div>
  );
}

function ExitSim({ results, d }) {
  const [yr, setYr] = useState(Math.min(3, d.holdYears));
  return (
    <div>
      <Slider label="Simulate exit at year" value={yr} onChange={setYr} min={1} max={d.holdYears} fmt={(v) => `Year ${v}`} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {results.map((r) => {
          const m = METHOD_META[r.method], yd = r.yearlyData[yr - 1];
          if (!yd) return null;
          const netCost = yd.totalSpent - yd.assetValue;
          return (
            <div key={r.method} style={{ flex: "1 1 185px", background: C.surface2, border: `1.5px solid ${m.color}55`, borderRadius: 10, padding: 13 }}>
              <div style={{ color: m.color, fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 11, marginBottom: 8, letterSpacing: "-0.01em" }}>{m.icon} {m.label}</div>
              <DRow label="Market / sale value" value={fmt(yd.assetValue)} good={yd.assetValue > 0} />
              {yd.residualBuyout && <DRow label="Residual buyout required" value={fmt(yd.residualBuyout)} warn />}
              {yd.residualBuyout && <DRow label="Market vs residual gap" value={fmt(yd.assetValue - yd.residualBuyout)} good={yd.assetValue >= yd.residualBuyout} warn={yd.assetValue < yd.residualBuyout} />}
              <DRow label="Total spent to date" value={fmt(yd.totalSpent)} />
              <DRow label="Net cost of ownership" value={fmt(netCost)} warn={netCost > 0} bold />
              <DRow label="Cost per month" value={fmt(Math.round(yd.totalSpent / (yr * 12)))} />
              <DRow label="Cost per km" value={`$${(netCost / (yr * d.annualKm)).toFixed(2)}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Veercal Logo — from brand SVG file ────────────────────────────────── */
function VeercalLogo({ size = 38, light = false }) {
  const col = light ? "#ffffff" : BRAND_GREEN;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke={col} strokeWidth="2" fill="none" />
      <rect x="28" y="48" width="8" height="18" fill={col} rx="0.5" />
      <rect x="39" y="40" width="8" height="26" fill={col} rx="0.5" />
      <rect x="50" y="30" width="8" height="36" fill={col} rx="0.5" />
      <rect x="61" y="38" width="8" height="28" fill={col} rx="0.5" />
      <path d="M 26 66 A 6 6 0 0 0 38 66 Z" fill={col} />
      <path d="M 59 66 A 6 6 0 0 0 71 66 Z" fill={col} />
    </svg>
  );
}

/* ─── Disclaimer Banner ──────────────────────────────────────────────────── */
function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return (
    <div className="no-print" style={{ background: "#fffbe6", borderBottom: `1px solid #e8cc50`, padding: "4px 24px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#7a6a10", fontFamily: BODY_FONT, fontWeight: 600 }}>
        ⚠️ General information only — not financial advice.{" "}
        <button onClick={() => setDismissed(false)} style={{ background: "none", border: "none", color: "#7a6a10", cursor: "pointer", textDecoration: "underline", fontSize: 10, fontFamily: "inherit", fontWeight: 700, padding: 0 }}>Read full disclaimer</button>
      </span>
    </div>
  );
  return (
    <div className="no-print" style={{ background: "#fffbe6", borderBottom: `2px solid #e8c830`, padding: "14px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, fontWeight: 700, color: "#7a5c00", marginBottom: 6 }}>
            ⚠️ GENERAL INFORMATION ONLY — NOT FINANCIAL ADVICE
          </div>
          <div style={{ fontSize: 11, color: "#5a4a10", lineHeight: 1.7, fontFamily: BODY_FONT }}>
            Veercal is a calculation and comparison tool designed to help you understand and model different car ownership structures.{" "}
            <strong>It does not constitute financial, tax, or legal advice</strong> and must not be relied upon as such.
            All figures are <strong>indicative estimates only</strong>, based on simplified assumptions and publicly available rates.
            Actual costs will vary based on your personal circumstances, specific lender/lessor products, current ATO rates, state government charges, and other factors not modelled here.
          </div>
          <div style={{ fontSize: 11, color: "#5a4a10", lineHeight: 1.7, fontFamily: BODY_FONT, marginTop: 4 }}>
            <strong>Stamp duty</strong> uses simplified brackets — concessions (EV exemptions, pensioner discounts) are not modelled.{" "}
            <strong>Novated lease</strong> uses the ATO statutory FBT method — employer arrangements, fleet discounts, and provider fees vary.{" "}
            <strong>LCT thresholds</strong> reflect FY2024–25 ATO rates, updated annually each July.{" "}
            <strong>Depreciation</strong> is a simplified declining-balance model — actual resale values depend on make, model, condition, and market.
          </div>
          <div style={{ fontSize: 11, color: "#7a5c00", fontFamily: BODY_FONT, marginTop: 6, fontWeight: 700 }}>
            Always consult a licensed financial adviser, accountant, or tax professional before making any financial decision. Veercal accepts no liability for decisions made based on outputs of this tool.
          </div>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: "#1e40af", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "white", fontFamily: BODY_FONT, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.02em" }}>
          GOT IT
        </button>
      </div>
    </div>
  );
}


/* ─── URL Share Encoding ─────────────────────────────────────────────────────
   Encodes all scenario inputs into a compact base64 URL hash so any scenario
   can be shared as a link. Decodes on load if hash present.
─────────────────────────────────────────────────────────────────────────── */
function encodeScenario(d) {
  try {
    const str = JSON.stringify(d);
    return btoa(unescape(encodeURIComponent(str)));
  } catch { return null; }
}

function decodeScenario(hash) {
  try {
    const str = decodeURIComponent(escape(atob(hash)));
    const parsed = JSON.parse(str);
    // Merge with DEFAULTS so any new keys added later still have values
    return { ...DEFAULTS, ...parsed };
  } catch { return null; }
}

function getInitialState() {
  try {
    const hash = window.location.hash?.slice(1);
    if (hash && hash.startsWith("s:")) {
      const decoded = decodeScenario(hash.slice(2));
      if (decoded) return decoded;
    }
  } catch {}
  return DEFAULTS;
}


/* ─── Error Boundary ─────────────────────────────────────────────────────────
   Catches any runtime errors in the calculator and shows a clean fallback
   rather than crashing the entire page.
─────────────────────────────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Veercal error:", error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "'Inter', sans-serif", color: "#1e293b" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 14, color: "#4a5a6b", marginBottom: 24 }}>
          An unexpected error occurred in the calculator. Please refresh the page.
        </div>
        <button onClick={() => this.setState({ hasError: false, error: null })}
          style={{ padding: "10px 24px", background: "#1e40af", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          Try again
        </button>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>
          {this.state.error?.message || "Unknown error"}
        </div>
      </div>
    );
    return this.props.children;
  }
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [d, setD] = useState(() => getInitialState());
  const [active, setActive] = useState(["cash", "loan", "novated"]);
  const [tab, setTab] = useState("overview");
  const [st, setSt] = useState("vehicle");
  const [sidebarOpen, setSidebarOpen] = useState(false);        /* mobile sidebar */
  const [activeModal, setActiveModal] = useState(null);         /* info lightbox */
  const [cookieConsent, setCookieConsent] = useState(() => {    /* privacy notice */
    try { return localStorage.getItem("veercal_cookie_consent") === "accepted"; }
    catch { return false; }
  });
  const acceptCookies = () => {
    setCookieConsent(true);
    try { localStorage.setItem("veercal_cookie_consent", "accepted"); } catch {}
  };
  const openModal = (id) => setActiveModal(id);
  const closeModal = () => setActiveModal(null);
  const [scenarios, setScenarios] = useState(() => {             /* saved scenarios */
    try { return JSON.parse(localStorage.getItem("veercal_scenarios") || "[]"); }
    catch { return []; }
  });
  const [shareToast, setShareToast] = useState(false);           /* share feedback */
  const [showScenarios, setShowScenarios] = useState(false);     /* scenario panel */
  const [saveNameInput, setSaveNameInput] = useState("");         /* inline save name */
  const [showSaveInput, setShowSaveInput] = useState(false);      /* save name visible */

  const upd = useCallback((k, v) => setD((p) => ({ ...p, [k]: sanitise(k, v) })), []);

  /* Share URL — encodes current scenario into clipboard + URL hash */
  const shareUrl = () => {
    const encoded = encodeScenario({ ...d, _active: active });
    if (encoded) {
      const url = `${window.location.origin}${window.location.pathname}#s:${encoded}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      window.history.replaceState(null, "", `#s:${encoded}`);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    }
  };

  /* Save current scenario */
  const saveScenario = (name) => {
    const newScenarios = [...scenarios, {
      id: Date.now(), name: name || `Scenario ${scenarios.length + 1}`,
      data: d, active, savedAt: new Date().toLocaleDateString("en-AU"),
    }];
    setScenarios(newScenarios);
    try { localStorage.setItem("veercal_scenarios", JSON.stringify(newScenarios)); } catch {}
  };

  const deleteScenario = (id) => {
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    try { localStorage.setItem("veercal_scenarios", JSON.stringify(updated)); } catch {}
  };

  const loadScenario = (scenario) => {
    setD(scenario.data);
    setActive(scenario.active || ["cash", "loan", "novated"]);
    setShowScenarios(false);
  };
  const allR = useMemo(() => ({
    cash: calcCash(d), loan: calcLoan(d, "loan"), dealer: calcLoan(d, "dealer"),
    lease: calcLease(d), novated: calcNovated(d),
  }), [d]);

  const results = active.map((m) => allR[m]);
  const sorted = [...results].sort((a, b) => a.totalCost - b.totalCost);

  const cd = useMemo(() => Array.from({ length: d.holdYears }, (_, i) => {
    const y = i + 1, row = { year: y };
    results.forEach((r) => {
      const yd = r.yearlyData[i];
      row[`${r.method}_t`] = yd?.totalSpent;
      row[`${r.method}_as`] = yd?.annualSpent;   /* annual (non-cumulative) spend */
      row[`${r.method}_a`] = yd?.assetValue;
      row[`${r.method}_n`] = yd?.netPosition;
      row[`${r.method}_m`] = yd?.monthlyEquivalent;
    });
    return row;
  }), [results, d.holdYears]);

  const toggle = (m) => setActive((p) => p.includes(m) ? p.length > 1 ? p.filter((x) => x !== m) : p : [...p, m]);
  const cp = { stroke: C.border, strokeDasharray: "3 3" };
  const at = { fill: "#94a3b8", fontSize: 11, fontFamily: NUM };

  const sideTabs = ["vehicle", "finance", "running", "novated", "extras"];

  return (
    <ErrorBoundary>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: BODY_FONT, fontSize: 13 }}>
      {/* Skip to main content — keyboard/screen reader navigation */}
      <a href="#main-content" style={{
        position: "absolute", top: -40, left: 8, background: C.brand700, color: "white",
        padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 600, zIndex: 9999,
        textDecoration: "none", transition: "top 0.2s",
      }} onFocus={e => e.target.style.top = "8px"} onBlur={e => e.target.style.top = "-40px"}>
        Skip to main content
      </a>

      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #2d3eb0 0%, #1e40af 50%, #1a35a0 100%)",
        padding: "22px 32px 20px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
        boxShadow: "0 4px 24px rgba(30,41,59,0.30)",
        minHeight: 120,
      }}>
        {/* Dot-grid texture */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.055,
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "26px 26px", pointerEvents: "none" }} />
        {/* Right-side radial glow */}
        <div style={{ position: "absolute", right: -80, top: -80, width: 380, height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)",
          pointerEvents: "none" }} />

        {/* Top row: logo lockup + stats */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Mobile hamburger */}
            <button onClick={() => setSidebarOpen(o => !o)} className="mobile-only"
              aria-label="Open menu"
              style={{ display: "none", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 7, cursor: "pointer", color: "white", fontSize: 18, padding: "6px 10px", lineHeight: 1 }}>
              ☰
            </button>
            {/* Logo — larger */}
            <VeercalLogo size={52} light={true} />
            {/* Wordmark — tall, tight, condensed to match reference */}
            <div style={{
              fontFamily: HEAD_FONT,
              fontSize: 46,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.09em",
              lineHeight: 0.92,
              textTransform: "uppercase",
              /* Stretch vertically to match the reference's tall letterforms */
              transform: "scaleY(1.12)",
              transformOrigin: "bottom left",
              display: "block",
            }}>
              VEERCAL
            </div>
          </div>

          {/* Scenario stats — right */}
          <div className="header-stats" style={{ display: "flex", gap: 28, alignItems: "flex-start", paddingTop: 4 }}>
            {[
              { l: "Vehicle", v: fmt(d.vehiclePrice) },
              { l: "Hold period", v: `${d.holdYears} years` },
              { l: "Running / yr", v: fmt(running(d)) },
              { l: "Stamp duty", v: fmt(calcSD(d.vehiclePrice, d.state)) },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3 }}>{s.l}</div>
                <div style={{ fontFamily: NUM, fontSize: 16, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: tagline + URL */}
        <div style={{ position: "relative", marginTop: 14 }}>
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.01em", marginBottom: 2 }}>
            Car Finance Calculator
          </div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
            www.veercal.com
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <DisclaimerBanner />

      {/* ── Cookie / Privacy Notice ─────────────────────────────────────────── */}
      {!cookieConsent && (
        <div style={{ background: C.brand900, color: "white", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 11, fontFamily: BODY_FONT }}>
          <span style={{ color: "rgba(255,255,255,0.8)" }}>
            🍪 We use cookies and analytics to improve Veercal. By continuing to use this tool you accept our{" "}
            <a href="/privacy" style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Privacy Policy</a>.
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={acceptCookies} style={{ padding: "5px 14px", background: C.brand500, color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT }}>Accept</button>
            <a href="/privacy" style={{ padding: "5px 14px", color: "rgba(255,255,255,0.7)", fontSize: 11, textDecoration: "none" }}>Learn more</a>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="no-print" style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "8px 24px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Save scenario */}
        {!showSaveInput ? (
          <button onClick={() => { setSaveNameInput(`${fmt(d.vehiclePrice)} · ${d.holdYears}yr`); setShowSaveInput(true); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: C.brand500, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT }}>
            💾 Save scenario
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <input
              autoFocus
              value={saveNameInput}
              onChange={e => setSaveNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { saveScenario(saveNameInput); setShowSaveInput(false); } if (e.key === "Escape") setShowSaveInput(false); }}
              placeholder="Scenario name…"
              style={{ padding: "4px 9px", border: `1px solid ${C.brand500}`, borderRadius: 6, fontSize: 11, fontFamily: BODY_FONT, outline: "none", width: 180 }}
            />
            <button onClick={() => { saveScenario(saveNameInput); setShowSaveInput(false); }}
              style={{ padding: "4px 10px", background: C.brand500, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT }}>
              Save
            </button>
            <button onClick={() => setShowSaveInput(false)}
              style={{ padding: "4px 8px", background: "none", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
              ✕
            </button>
          </div>
        )}

        {/* Load scenarios */}
        {scenarios.length > 0 && (
          <button onClick={() => setShowScenarios(s => !s)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: showScenarios ? C.surfaceAlt : C.surface, color: C.brand500, border: `1px solid ${C.brand500}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT }}>
            📂 Saved ({scenarios.length})
          </button>
        )}

        {/* Share link */}
        <button onClick={shareUrl} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT, position: "relative" }}>
          🔗 {shareToast ? "Link copied!" : "Share"}
        </button>

        {/* Print / PDF */}
        <button onClick={() => { try { setTimeout(() => window.print(), 150); } catch(e) {} }}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: BODY_FONT }}>
          🖨️ Print / PDF
        </button>

        {/* Rates version badge */}
        <div style={{ marginLeft: "auto", fontSize: 10, color: C.muted, fontFamily: BODY_FONT }}>
          Rates: FY2024–25 · Updated {RATES.lastReviewed}
        </div>
      </div>

      {/* ── Saved Scenarios Panel ────────────────────────────────────────── */}
      {showScenarios && scenarios.length > 0 && (
        <div style={{ background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.text, marginBottom: 8, fontFamily: BODY_FONT }}>Saved Scenarios</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scenarios.map(s => (
              <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: C.text, fontFamily: BODY_FONT }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{s.savedAt} · {fmt(s.data.vehiclePrice)} · {s.data.holdYears}yr</div>
                </div>
                <button onClick={() => loadScenario(s)} style={{ padding: "3px 8px", background: C.brand500, color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 10, fontFamily: BODY_FONT }}>Load</button>
                <button onClick={() => deleteScenario(s.id)} style={{ padding: "3px 6px", background: "none", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer", fontSize: 10 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", minHeight: "calc(100vh - 100px)", flex: 1 }}>

        {/* Sidebar */}
        {/* Mobile overlay backdrop */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <div className={`desktop-sidebar no-print${sidebarOpen ? " open" : ""}`} style={{ width: 268, minWidth: 255, background: C.brand50, borderRight: `1px solid ${C.border}`, padding: "14px 14px", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {/* Mobile close button */}
          <button className="mobile-only" onClick={() => setSidebarOpen(false)} style={{ alignSelf: "flex-end", background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted, marginBottom: 8, display: "none" }}>✕</button>

          <div style={{ marginBottom: 14 }}>
            <SHead>Compare Methods</SHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.keys(METHOD_META).map((m) => <MBadge key={m} method={m} active={active.includes(m)} onClick={() => toggle(m)} openModal={openModal} />)}
            </div>
          </div>

          <div style={{ display: "flex", marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {sideTabs.map((s, i) => (
              <button key={s} onClick={() => setSt(s)} style={{
                flex: 1, padding: "7px 4px",
                background: st === s ? C.brand500 : "transparent",
                color: st === s ? "white" : C.muted,
                border: "none",
                borderRight: i < sideTabs.length - 1 ? `1px solid ${C.border}` : "none",
                fontSize: 9, cursor: "pointer", fontFamily: BODY_FONT, fontWeight: 700,
                transition: "all 0.15s", letterSpacing: "0.01em",
              }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>

          {st === "vehicle" && <>
            <SHead>Vehicle</SHead>
            <NI label="Vehicle Price" value={d.vehiclePrice} onChange={(v) => upd("vehiclePrice", v)} info="depreciation" openModal={openModal} />
            <Slider label="Hold Period" value={d.holdYears} onChange={(v) => upd("holdYears", v)} min={1} max={10} fmt={(v) => `${v} years`} />
            <Slider label="Annual KM" value={d.annualKm} onChange={(v) => upd("annualKm", v)} min={5000} max={50000} step={1000} fmt={(v) => `${v.toLocaleString()} km`} />
            <SHead info="depreciation" openModal={openModal}>Depreciation</SHead>
            <Slider label="Year 1 drop" info="depreciation" openModal={openModal} value={d.depYr1} onChange={(v) => upd("depYr1", v)} min={0.05} max={0.35} step={0.01} fmt={fmtP} />
            <Slider label="Year 2 drop" value={d.depYr2} onChange={(v) => upd("depYr2", v)} min={0.05} max={0.25} step={0.01} fmt={fmtP} />
            <Slider label="Year 3+ drop" value={d.depYrN} onChange={(v) => upd("depYrN", v)} min={0.03} max={0.20} step={0.01} fmt={fmtP} />
          </>}

          {st === "finance" && <>
            <SHead>Cash / Opportunity Cost</SHead>
            <Slider label="Investment return rate" value={d.opportunityCostPct} info="opportunityCost" openModal={openModal} onChange={(v) => upd("opportunityCostPct", v)} min={0.01} max={0.12} step={0.005} fmt={fmtP} sub="What lump sum cash could earn" />
            <SHead color={C.info} info="personalLoan" openModal={openModal}>Personal Loan</SHead>
            <NI label="Deposit" value={d.loanDeposit} onChange={(v) => upd("loanDeposit", v)} />
            <Slider isRate={true} label="Interest rate" value={d.loanRate} onChange={(v) => upd("loanRate", v)} min={0.04} max={0.20} step={0.005} fmt={fmtP} />
            <Slider label="Term" value={d.loanTermYears} onChange={(v) => upd("loanTermYears", v)} min={1} max={7} fmt={(v) => `${v} yrs`} />
            <SHead color={C.orange500} info="dealerFinance" openModal={openModal}>Dealer Finance</SHead>
            <NI label="Deposit" value={d.dealerDeposit} onChange={(v) => upd("dealerDeposit", v)} />
            <Slider isRate={true} label="Interest rate" value={d.dealerRate} onChange={(v) => upd("dealerRate", v)} min={0.02} max={0.15} step={0.005} fmt={fmtP} />
            <Slider label="Term" value={d.dealerTermYears} onChange={(v) => upd("dealerTermYears", v)} min={1} max={7} fmt={(v) => `${v} yrs`} />
            <Slider label="Balloon %" value={d.balloonPct} info="balloonPayment" openModal={openModal} onChange={(v) => upd("balloonPct", v)} min={0} max={0.40} step={0.01} fmt={fmtP} />
            <SHead color="#6d28d9" info="financeLease" openModal={openModal}>Finance Lease</SHead>
            <Slider isRate={true} label="Rate" value={d.leaseRate} onChange={(v) => upd("leaseRate", v)} min={0.03} max={0.12} step={0.005} fmt={fmtP} />
            <Slider label="Term" value={d.leaseTermYears} onChange={(v) => upd("leaseTermYears", v)} min={1} max={5} fmt={(v) => `${v} yrs`} />
            <Slider label="Residual %" value={d.leaseResidualPct} info="residualATO" openModal={openModal} onChange={(v) => upd("leaseResidualPct", v)} min={0.28} max={0.65} step={0.01} fmt={fmtP} sub="ATO statutory by km band" />
            <SHead>Refinance Modelling</SHead>
            <Slider label="Refinance at year" value={d.refinanceYear} onChange={(v) => upd("refinanceYear", v)} min={0} max={6} fmt={(v) => v === 0 ? "Off" : `Year ${v}`} />
            {d.refinanceYear > 0 && <Slider label="New rate after refi" value={d.refinanceRate} onChange={(v) => upd("refinanceRate", v)} min={0.03} max={0.15} step={0.005} fmt={fmtP} />}
          </>}

          {st === "running" && <>
            <SHead>Running Costs</SHead>
            <Toggle label="Electric Vehicle (EV)" value={d.isEV} onChange={(v) => upd("isEV", v)} sub="Switches fuel → charging" />
            {d.isEV ? <>
              <Slider label="Home charge ($/kWh)" value={d.evHomeChargeKwh} onChange={(v) => upd("evHomeChargeKwh", v)} min={0.15} max={0.45} step={0.01} fmt={(v) => `$${v.toFixed(2)}`} />
              <Slider label="Efficiency (kWh/100km)" value={d.evEfficiencyKwh} onChange={(v) => upd("evEfficiencyKwh", v)} min={12} max={28} step={0.5} fmt={(v) => `${v} kWh`} />
            </> : <>
              <Slider label="Fuel price" value={d.fuelPerL} onChange={(v) => upd("fuelPerL", v)} min={1.50} max={2.80} step={0.05} fmt={(v) => `$${v.toFixed(2)}/L`} />
              <Slider label="Fuel efficiency" value={d.fuelL100km} onChange={(v) => upd("fuelL100km", v)} min={4} max={18} step={0.5} fmt={(v) => `${v}L/100km`} />
            </>}
            <NI label="Tyres / year" value={d.tyresPerYear} onChange={(v) => upd("tyresPerYear", v)} />
            <NI label="Servicing / year" value={d.servicesPerYear} onChange={(v) => upd("servicesPerYear", v)} />
            <NI label="Insurance / year" value={d.insurancePerYear} onChange={(v) => upd("insurancePerYear", v)} />
            <NI label="Registration / year" value={d.regPerYear} onChange={(v) => upd("regPerYear", v)} />
            <div style={{ background: C.green100, borderRadius: 8, padding: "9px 11px", border: `1px solid ${C.border}`, marginTop: 6 }}>
              <div style={{ ...LBL, fontSize: 9 }}>Total Running / yr</div>
              <div style={{ fontFamily: NUM, fontSize: 19, fontWeight: 700, color: C.green700 }}>{fmt(running(d))}</div>
              <div style={{ fontFamily: NUM, fontSize: 11, color: C.muted }}>{fmt(Math.round(running(d) / 12))} / month</div>
            </div>
          </>}

          {st === "novated" && <>
            <SHead color={C.orange700} info="novatedLease" openModal={openModal}>Novated Lease</SHead>
            <NI label="Gross Annual Salary" value={d.grossSalary} info="fbtSalary" openModal={openModal} onChange={(v) => upd("grossSalary", v)} />
            <div style={{ background: C.surfaceAlt, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
              <DRow label="Marginal tax" value={fmtP(mtr(d.grossSalary))} />
              <DRow label="Medicare levy" value={fmtP(med(d.grossSalary))} />
              <DRow label="Combined rate" value={fmtP(mtr(d.grossSalary) + med(d.grossSalary))} good bold />
            </div>
            <Slider isRate={true} label="Rate" value={d.novatedRate} onChange={(v) => upd("novatedRate", v)} min={0.03} max={0.12} step={0.005} fmt={fmtP} />
            <Slider label="Term" value={d.novatedTermYears} onChange={(v) => upd("novatedTermYears", v)} min={1} max={5} fmt={(v) => `${v} yrs`} />
            <NI label="Provider management fee / yr" value={d.novatedProviderFeeAnnual} onChange={(v) => upd("novatedProviderFeeAnnual", v)} sub="Annual fee charged by novated lease provider ($0 if employer pays)" />
            <Slider label="Residual %" value={d.novatedResidualPct} info="residualATO" openModal={openModal} onChange={(v) => upd("novatedResidualPct", v)} min={0.28} max={0.65} step={0.01} fmt={fmtP} />
            {d.isEV && d.vehiclePrice <= LCT_FE && (
              <div style={{ background: C.orange100, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.orange300}`, fontSize: 11, color: C.orange700, fontWeight: 700 }}>
                ⚡ EV FBT Exemption applies — FBT waived
              </div>
            )}
          </>}

          {st === "extras" && <>
            <SHead info="stampDuty" openModal={openModal}>State / Stamp Duty</SHead>
            <Sel label="State" value={d.state} onChange={(v) => upd("state", v)} options={["VIC","NSW","QLD","WA","SA","TAS","ACT","NT"]} />
            <div style={{ background: C.orange100, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.orange300}`, marginBottom: 8 }}>
              <div style={{ ...LBL, fontSize: 9 }}>Stamp Duty ({d.state})</div>
              <div style={{ fontFamily: NUM, fontSize: 16, fontWeight: 700, color: C.orange700 }}>{fmt(calcSD(d.vehiclePrice, d.state))}</div>
            </div>
            <SHead info="lct" openModal={openModal}>Luxury Car Tax</SHead>
            <Toggle label="Apply LCT" value={d.applyLCT} onChange={(v) => upd("applyLCT", v)} sub={`Threshold: $${d.isEV ? "89,332 (FE)" : "80,567"}`} />
            {d.applyLCT && (
              <div style={{ background: calcLCT(d.vehiclePrice, d.isEV) > 0 ? C.orange100 : C.green100, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}`, marginBottom: 8 }}>
                <div style={{ ...LBL, fontSize: 9 }}>LCT Payable</div>
                <div style={{ fontFamily: NUM, fontSize: 15, fontWeight: 700, color: calcLCT(d.vehiclePrice, d.isEV) > 0 ? C.orange700 : C.good }}>
                  {calcLCT(d.vehiclePrice, d.isEV) > 0 ? fmt(calcLCT(d.vehiclePrice, d.isEV)) : "Nil — under threshold"}
                </div>
              </div>
            )}
            <SHead>EV Benefits</SHead>
            <Toggle label="Electric Vehicle" value={d.isEV} onChange={(v) => upd("isEV", v)} />
            {d.isEV && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...LBL, fontSize: 10, marginBottom: 4 }}>EV Type</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ v: "bev", l: "Battery EV (BEV)" }, { v: "phev", l: "Plug-in Hybrid (PHEV)" }].map(opt => (
                    <button key={opt.v} onClick={() => upd("evType", opt.v)} style={{
                      flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${d.evType === opt.v ? C.brand500 : C.border}`,
                      background: d.evType === opt.v ? C.surfaceAlt : C.surface,
                      color: d.evType === opt.v ? C.brand500 : C.muted,
                      fontSize: 10, cursor: "pointer", fontFamily: BODY_FONT, fontWeight: 600,
                    }}>{opt.l}</button>
                  ))}
                </div>
                {d.evType === "phev" && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: C.warnBg, borderRadius: 6, border: `1px solid #fde68a`, fontSize: 10, color: C.warn, fontFamily: BODY_FONT }}>
                    ⚠️ PHEV FBT exemption had a scheduled end date of 1 April 2025. Verify current ATO status before relying on this figure.
                  </div>
                )}
              </div>
            )}
            {d.isEV && <NI label="Govt Rebate / Subsidy" value={d.evGovtRebate} onChange={(v) => upd("evGovtRebate", v)} sub="VIC $3k · NSW $3k · ACT $15k" />}
          </>}
        </div>

        {/* Main */}
        <div id="main-content" role="main" style={{ flex: 1, padding: "20px 24px", overflowY: "auto", background: C.bg, minWidth: 0 }}>
          <Tabs tabs={[
            { id: "overview",  label: "📊 Overview",   short: "📊" },
            { id: "cashflow",  label: "💸 Cash Flow",  short: "💸" },
            { id: "equity",    label: "🏠 Equity",     short: "🏠" },
            { id: "exit",      label: "🚪 Exit Sim",   short: "🚪" },
            { id: "breakdown", label: "🔍 Deep Dive",  short: "🔍" },
            { id: "oncosts",   label: "🏷️ On-Costs",   short: "🏷️" },
          ]} active={tab} onChange={setTab} />

          {/* OVERVIEW */}
          {tab === "overview" && <>
            <Panel ac={METHOD_META[sorted[0].method].color} sx={{ background: C.green100 }}>
              <div style={{ fontFamily: BODY_FONT, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: "0.02em", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>Lowest modelled cost · {d.holdYears}-year hold · not a recommendation <InfoTip id="trueTotalCost" openModal={openModal} /></div>
              <div style={{ fontFamily: HEAD_FONT, fontSize: 18, fontWeight: 900, color: METHOD_META[sorted[0].method].color, letterSpacing: "-0.01em" }}>{METHOD_META[sorted[0].method].icon} {METHOD_META[sorted[0].method].label}</div>
              <div style={{ fontFamily: NUM, fontSize: 26, fontWeight: 700, color: C.text, margin: "3px 0 5px" }}>{fmt(sorted[0].totalCost)}</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Modelled saving of {fmt(sorted[sorted.length - 1].totalCost - sorted[0].totalCost)} vs highest-cost option · {fmt(sorted[0].effectiveMonthly)}/mo effective · figures are estimates only
              </div>
            </Panel>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {sorted.map((r, i) => <SCard key={r.method} result={r} rank={i} openModal={openModal} />)}
            </div>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Total Cost Comparison</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Finance + running − exit value over {d.holdYears} years</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[{ n: "", ...Object.fromEntries(results.map((r) => [r.method, r.totalCost])) }]} layout="vertical">
                  <CartesianGrid {...cp} />
                  <XAxis type="number" tickFormatter={fmtK} tick={at} />
                  <YAxis type="category" dataKey="n" hide />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontFamily: NUM }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: BODY_FONT }} />
                  {results.map((r) => <Bar key={r.method} dataKey={r.method} name={METHOD_META[r.method].label} fill={METHOD_META[r.method].color} radius={[0, 4, 4, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Cumulative Spend Over Time</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Total cash out (finance + running) by year</div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={cd} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="year" tick={at} />
                  <YAxis tickFormatter={fmtK} tick={at} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: BODY_FONT }} />
                  {results.map((r) => (
                    <Area key={r.method} type="monotone" dataKey={`${r.method}_t`} name={METHOD_META[r.method].label}
                      stroke={METHOD_META[r.method].color} fill={`${METHOD_META[r.method].color}22`} strokeWidth={2} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </>}

          {/* CASHFLOW */}
          {tab === "cashflow" && <>
            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Annual Cash Outflow</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Actual spend each year — finance payments + running costs (not cumulative)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cd} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="year" tick={at} />
                  <YAxis tickFormatter={fmtK} tick={at} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {results.map((r) => <Bar key={r.method} dataKey={`${r.method}_as`} name={METHOD_META[r.method].label} fill={METHOD_META[r.method].color} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Effective Monthly Cost</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Payment + running ÷ 12 · cash amortises purchase price</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cd} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="year" tick={at} />
                  <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={at} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {results.map((r) => (
                    <Line key={r.method} type="monotone" dataKey={`${r.method}_m`} name={METHOD_META[r.method].label}
                      stroke={METHOD_META[r.method].color} strokeWidth={2.5} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {active.includes("novated") && (
              <Panel ac={C.orange500}>
                <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>💼 Novated Salary Sacrifice Breakdown</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { l: "Gross salary sacrifice/mo", v: fmt(allR.novated.grossMonthly) },
                    { l: "Tax saving/mo", v: fmt(allR.novated.taxSavingMonthly), ac: C.good },
                    { l: "FBT contribution/mo", v: allR.novated.fbtExempt ? "Exempt (EV ⚡)" : fmt(allR.novated.fbtMonthly), ac: allR.novated.fbtExempt ? C.good : C.warn },
                    { l: "Net out-of-pocket/mo", v: fmt(allR.novated.monthlyPayment), ac: C.orange700 },
                    { l: "Annual tax saving", v: fmt(allR.novated.taxSavingMonthly * 12), ac: C.good },
                    { l: "Residual buyout", v: fmt(allR.novated.residualBuyout) },
                  ].map((x) => <KPI key={x.l} label={x.l} value={x.v} ac={x.ac} />)}
                </div>
              </Panel>
            )}

            {d.refinanceYear > 0 && (
              <Panel>
                <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>🔄 Refinance at Year {d.refinanceYear} → {fmtP(d.refinanceRate)}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["loan", "dealer"].filter((m) => active.includes(m)).map((m) => (
                    <div key={m} style={{ flex: "1 1 180px" }}>
                      <div style={{ fontWeight: 700, fontSize: 11, color: METHOD_META[m].color, marginBottom: 5, fontFamily: BODY_FONT }}>{METHOD_META[m].label}</div>
                      <DRow label="Total interest (with refi)" value={fmt(allR[m].totalInterest)} />
                      <DRow label="Monthly payment" value={fmt(allR[m].monthlyPayment)} />
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>}

          {/* EQUITY */}
          {tab === "equity" && <>
            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Asset Value vs Total Spent</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Solid = vehicle value · Dashed = cumulative spend · Gap = true net cost</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={cd} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="year" tick={at} />
                  <YAxis tickFormatter={fmtK} tick={at} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {results.map((r) => [
                    <Line key={`${r.method}_av`} type="monotone" dataKey={`${r.method}_a`} name={`${METHOD_META[r.method].label} (asset)`} stroke={METHOD_META[r.method].color} strokeWidth={2} dot={false} />,
                    <Line key={`${r.method}_tv`} type="monotone" dataKey={`${r.method}_t`} name={`${METHOD_META[r.method].label} (spent)`} stroke={METHOD_META[r.method].color} strokeWidth={2} strokeDasharray="6 4" dot={false} />,
                  ])}
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Net Wealth Position</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Asset value minus all costs. Below zero = net financial loss on vehicle.</div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={cd} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="year" tick={at} />
                  <YAxis tickFormatter={fmtK} tick={at} />
                  <ReferenceLine y={0} stroke={C.borderDark} strokeWidth={2} />
                  <Tooltip content={<TT />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {results.map((r) => (
                    <Area key={r.method} type="monotone" dataKey={`${r.method}_n`} name={METHOD_META[r.method].label}
                      stroke={METHOD_META[r.method].color} fill={`${METHOD_META[r.method].color}20`} strokeWidth={2} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </>}

          {/* EXIT */}
          {tab === "exit" && (
            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Exit Simulator</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>True cost position — including cost per km — if you sell or return at any year.</div>
              <ExitSim results={results} d={d} />
            </Panel>
          )}

          {/* BREAKDOWN */}
          {tab === "breakdown" && results.map((r) => {
            const m = METHOD_META[r.method];
            return (
              <Panel key={r.method} ac={m.color}>
                <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 13, color: m.color, marginBottom: 12, letterSpacing: "-0.01em" }}>{m.icon} {m.label} — Year-by-Year</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { l: "Upfront Cost", v: fmt(r.upfrontCost) },
                    { l: "Monthly Payment", v: r.monthlyPayment ? fmt(r.monthlyPayment) : "None" },
                    { l: "Total Interest", v: r.totalInterest ? fmt(r.totalInterest) : "$0" },
                    { l: "Running Total", v: fmt(running(d) * d.holdYears) },
                    { l: "Exit Value", v: r.exitValue ? fmt(r.exitValue) : "N/A" },
                    { l: "True Net Cost", v: fmt(r.totalCost), bold: true, ac: m.color },
                  ].map((x) => (
                    <div key={x.l} style={{ background: x.bold ? m.light : C.surface2, borderRadius: 8, padding: "9px 11px", border: `1px solid ${x.bold ? m.color : C.border}` }}>
                      <div style={{ ...LBL, fontSize: 9 }}>{x.l}</div>
                      <div style={{ fontFamily: NUM, fontSize: 14, fontWeight: x.bold ? 800 : 600, color: x.ac || C.text, marginTop: 2 }}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.surfaceAlt }}>
                        {["Year", "Asset Value", "Total Spent", "Monthly Equiv", "Equity / Net", "Cost/km"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontFamily: BODY_FONT, fontSize: 11, fontWeight: 600, color: C.muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.yearlyData.map((yd, i) => {
                        const cpk = ((yd.totalSpent - yd.assetValue) / ((i + 1) * d.annualKm)).toFixed(2);
                        const eq = yd.equity !== undefined ? yd.equity : yd.netPosition;
                        return (
                          <tr key={yd.year} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                            <td style={{ padding: "6px 9px", color: m.color, fontWeight: 800, fontFamily: NUM }}>{yd.year}</td>
                            <td style={{ padding: "6px 9px", fontFamily: NUM }}>{fmt(yd.assetValue)}</td>
                            <td style={{ padding: "6px 9px", fontFamily: NUM }}>{fmt(yd.totalSpent)}</td>
                            <td style={{ padding: "6px 9px", fontFamily: NUM }}>{fmt(yd.monthlyEquivalent)}</td>
                            <td style={{ padding: "6px 9px", fontFamily: NUM, color: eq > 0 ? C.good : C.bad, fontWeight: 600 }}>{fmt(eq)}</td>
                            <td style={{ padding: "6px 9px", fontFamily: NUM, color: C.muted }}>${cpk}/km</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            );
          })}

          {/* ON-COSTS */}
          {tab === "oncosts" && <>
            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Government Charges & On-Costs</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>Stamp duty · Luxury Car Tax · EV rebates · FY2024–25 rates</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <KPI label={`Stamp Duty (${d.state})`} value={fmt(calcSD(d.vehiclePrice, d.state))} ac={C.orange600} lg />
                <KPI label="LCT Payable" value={d.applyLCT && calcLCT(d.vehiclePrice, d.isEV) > 0 ? fmt(calcLCT(d.vehiclePrice, d.isEV)) : "None"} ac={d.applyLCT && calcLCT(d.vehiclePrice, d.isEV) > 0 ? C.warn : C.good} lg />
                <KPI label="EV Rebate" value={d.isEV && d.evGovtRebate > 0 ? `-${fmt(d.evGovtRebate)}` : "None"} ac={d.isEV && d.evGovtRebate > 0 ? C.good : C.muted} lg />
                <KPI label="Total On-Costs" value={fmt(calcSD(d.vehiclePrice, d.state) + (d.applyLCT ? calcLCT(d.vehiclePrice, d.isEV) : 0) - (d.isEV ? d.evGovtRebate : 0))} ac={C.text} lg />
              </div>
            </Panel>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>Stamp Duty by State — {fmt(d.vehiclePrice)} vehicle</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={["VIC","NSW","QLD","WA","SA","TAS","ACT","NT"].map((s) => ({ s, v: Math.round(calcSD(d.vehiclePrice, s)) }))}
                  margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid {...cp} />
                  <XAxis dataKey="s" tick={at} />
                  <YAxis tickFormatter={fmtK} tick={at} />
                  <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `${l}`} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, fontFamily: NUM }} />
                  <Bar dataKey="v" name="Stamp Duty" radius={[4, 4, 0, 0]}>
                    {["VIC","NSW","QLD","WA","SA","TAS","ACT","NT"].map((s, i) => (
                      <rect key={i} fill={s === d.state ? C.orange600 : C.orange300} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel>
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 700, color: C.text }}>LCT Guide — FY2024–25</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <KPI label="Standard threshold" value={fmt(LCT_STD)} sub="Petrol / diesel" />
                <KPI label="Fuel-efficient threshold" value={fmt(LCT_FE)} sub="EV, PHEV, hybrid ≤7L/100km" ac={C.good} />
                <KPI label="LCT rate" value="33%" sub="On excess ÷ 1.1" />
                <KPI label="Your LCT" value={d.applyLCT ? (calcLCT(d.vehiclePrice, d.isEV) > 0 ? fmt(calcLCT(d.vehiclePrice, d.isEV)) : "Nil") : "Toggle in Extras"} ac={calcLCT(d.vehiclePrice, d.isEV) > 0 ? C.warn : C.good} />
              </div>
            </Panel>

            {d.isEV && (
              <Panel ac={C.green500}>
                <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 13, marginBottom: 10, color: C.green700, letterSpacing: "-0.01em" }}>⚡ EV Benefits Summary</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <KPI label="Fuel saving vs ICE/yr" sub="Based on your fuel settings"
                    value={fmt(Math.round(((d.annualKm / 100) * d.fuelL100km * d.fuelPerL) - ((d.annualKm / 100) * d.evEfficiencyKwh * d.evHomeChargeKwh)))}
                    ac={C.good} />
                  <KPI label="Service saving/yr" value={fmt(Math.round(d.servicesPerYear * 0.4))} sub="~40% lower for EVs" ac={C.good} />
                  <KPI label="FBT exemption" value={d.vehiclePrice <= LCT_FE ? "Eligible ✓" : "Over threshold ✗"} ac={d.vehiclePrice <= LCT_FE ? C.good : C.warn} />
                  <KPI label="Govt rebate" value={d.evGovtRebate > 0 ? fmt(d.evGovtRebate) : "Set in Extras"} ac={C.green600} />
                </div>
              </Panel>
            )}
          </>}
          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontFamily: BODY_FONT }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: C.muted, flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <span>Rates: FY2024–25 · Verified {RATES.lastReviewed} · Next review {RATES.nextReviewDue}</span>
              <div style={{ display: "flex", gap: 14 }}>
                <a href="/learn" style={{ color: C.muted, textDecoration: "none" }} onMouseEnter={e => e.target.style.color = C.brand500} onMouseLeave={e => e.target.style.color = C.muted}>Learn</a>
                <a href="/terms" style={{ color: C.muted, textDecoration: "none" }} onMouseEnter={e => e.target.style.color = C.brand500} onMouseLeave={e => e.target.style.color = C.muted}>Terms of Use</a>
                <a href="/privacy" style={{ color: C.muted, textDecoration: "none" }} onMouseEnter={e => e.target.style.color = C.brand500} onMouseLeave={e => e.target.style.color = C.muted}>Privacy Policy</a>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <span>© {new Date().getFullYear()} Veercal. All rights reserved. · <a href="/learn" style={{ color: C.muted }}>Learn</a></span>
              <span>General information only — not financial advice. <a href="/learn/how-novated-leases-work" style={{ color: C.muted }}>Learn more →</a></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info Modal ───────────────────────────────────────────────────── */}
      {activeModal && <InfoModal id={activeModal} onClose={closeModal} />}

      {/* ── Print Summary — only visible when printing ──────────────────── */}
      <div style={{ display: "none" }} className="print-only">
        <style>{`
          @media print {
            .print-only { display: block !important; padding: 24px; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div style={{ fontFamily: BODY_FONT, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, borderBottom: `3px solid #2d3eb0`, paddingBottom: 12 }}>
            <VeercalLogo size={32} />
            <div>
              <div style={{ fontFamily: HEAD_FONT, fontSize: 24, fontWeight: 900, color: "#1e40af", letterSpacing: "-0.01em" }}>VEERCAL</div>
              <div style={{ fontSize: 10, color: "#4a5a6b" }}>Car Ownership Cost Calculator · veercal.com</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "#4a5a6b" }}>
              Generated {new Date().toLocaleDateString("en-AU", {day:"2-digit",month:"short",year:"numeric"})} · Rates FY2024–25
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#4a5a6b", marginBottom: 16, padding: "8px 12px", background: "#fef3c7", borderRadius: 6 }}>
            ⚠️ General information only — not financial advice. All figures are indicative estimates. Consult a licensed financial adviser before making financial decisions.
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>Vehicle:</strong> {fmt(d.vehiclePrice)} · <strong>Hold:</strong> {d.holdYears} years · <strong>Annual KM:</strong> {d.annualKm.toLocaleString()} · <strong>State:</strong> {d.state} · <strong>Running/yr:</strong> {fmt(running(d))}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: "#1e40af", color: "white" }}>
                {["Method", "True Total Cost", "Eff. Monthly", "Upfront", "Monthly Payment", "Total Interest", "Exit Value"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.method} style={{ background: i % 2 === 0 ? "#f8fafc" : "white", borderBottom: "1px solid #dbe4f0" }}>
                  <td style={{ padding: "7px 10px", fontWeight: 600, color: METHOD_META[r.method].color }}>{METHOD_META[r.method].icon} {METHOD_META[r.method].label}</td>
                  <td style={{ padding: "7px 10px", fontWeight: 700 }}>{fmt(r.totalCost)}</td>
                  <td style={{ padding: "7px 10px" }}>{fmt(r.effectiveMonthly)}</td>
                  <td style={{ padding: "7px 10px" }}>{fmt(r.upfrontCost)}</td>
                  <td style={{ padding: "7px 10px" }}>{r.monthlyPayment ? fmt(r.monthlyPayment) : "—"}</td>
                  <td style={{ padding: "7px 10px", color: r.totalInterest > 0 ? "#b45309" : "#166534" }}>{r.totalInterest ? fmt(r.totalInterest) : "$0"}</td>
                  <td style={{ padding: "7px 10px", color: r.exitValue > 0 ? "#166534" : "#4a5a6b" }}>{r.exitValue ? fmt(r.exitValue) : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 24, borderTop: "1px solid #dbe4f0", paddingTop: 8 }}>
            Veercal · veercal.com · Rates verified {RATES.lastReviewed} · Next review {RATES.nextReviewDue} · {RATES.source}
          </div>
        </div>
      </div>

    </div>
    </ErrorBoundary>
  );
}
