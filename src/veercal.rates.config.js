/**
 * veercal.rates.config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * VEERCAL — Single source of truth for all government-set rates and thresholds.
 *
 * HOW TO UPDATE (every 1 July):
 *   1. Check ato.gov.au for updated FBT rates, LCT thresholds, and tax brackets
 *   2. Check each state revenue office for updated stamp duty rates
 *   3. Update the values below
 *   4. Update lastReviewed and nextReviewDue
 *   5. Commit with message: "Rates update FY[year]-[year]"
 *
 * DO NOT edit calculation logic here — this file is data only.
 * The calculator (App.js) and guided flow (QuickCompare.jsx) both import from here.
 *
 * © 2025 Veercal Pty. Ltd. All rights reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const RATES = {

  /* ── Review metadata ─────────────────────────────────────────────────────
     Update these every time you edit this file.
  ──────────────────────────────────────────────────────────────────────── */
  lastReviewed:    "March 2026",
  nextReviewDue:   "1 July 2026",
  financialYear:   "FY2025-26",
  source:          "ato.gov.au / state revenue offices",


  /* ── ATO Income Tax Brackets ─────────────────────────────────────────────
     Source: ato.gov.au/individuals/income-and-deductions/
     Updated: Stage 3 cuts effective 1 July 2024 (FY2024-25 onwards)
     These brackets are also used by mtr() in the calculator.
     IMPORTANT: If you update these, also update the mtr() function in App.js
  ──────────────────────────────────────────────────────────────────────── */
  taxBrackets: [
    { min: 0,      max: 18200,   rate: 0,     base: 0,     label: "Nil"   },
    { min: 18201,  max: 45000,   rate: 0.19,  base: 0,     label: "19%"   },
    { min: 45001,  max: 135000,  rate: 0.325, base: 5092,  label: "32.5%" },
    { min: 135001, max: 190000,  rate: 0.37,  base: 31288, label: "37%"   },
    { min: 190001, max: Infinity,rate: 0.45,  base: 51638, label: "45%"   },
  ],


  /* ── Medicare Levy ───────────────────────────────────────────────────────
     Source: ato.gov.au/individuals/medicare-levy/
     Phase-in range: $26,000 – $32,500 (individuals, FY2025-26)
  ──────────────────────────────────────────────────────────────────────── */
  medicareLevy:             0.02,
  medicareLevyThreshold:    26000,
  medicareLevyPhaseInTop:   32500,


  /* ── Fringe Benefits Tax (FBT) ───────────────────────────────────────────
     Source: ato.gov.au/businesses/fringe-benefits-tax/
     FBT year: 1 April to 31 March
     Gross-up rates: Type 1 = GST-creditable benefits; Type 2 = non-creditable
  ──────────────────────────────────────────────────────────────────────── */
  fbtRate:              0.47,     /* FBT rate — applied by employer                      */
  fbtGrossUpType1:      2.0802,   /* Type 1: employer can claim GST credits               */
  fbtGrossUpType2:      1.8868,   /* Type 2: employer cannot claim GST credits            */
  fbtStatutoryRate:     0.20,     /* Statutory formula % for car fringe benefit           */


  /* ── EV FBT Exemption ────────────────────────────────────────────────────
     Battery EVs: exempt from FBT if below the fuel-efficient LCT threshold
     PHEVs: exemption scheduled to end 1 April 2025 — verify current status
     Source: ato.gov.au/businesses/fringe-benefits-tax/types-of-fringe-benefits/cars/
  ──────────────────────────────────────────────────────────────────────── */
  evFbtExemptionActive:    true,   /* BEV exemption active at this review date             */
  phevFbtExemptionActive:  false,  /* PHEV — set to false post April 2025; verify annually */


  /* ── Luxury Car Tax (LCT) ────────────────────────────────────────────────
     Source: ato.gov.au/businesses/luxury-car-tax/
     Thresholds indexed annually — check ato.gov.au each July 1
     NOTE: EU-Australia trade deal (signed 24 Mar 2026) proposes raising the
     fuel-efficient threshold to $120,000 once implementing legislation passes.
     Update lctThresholdFE to 120000 once legislation is enacted.
  ──────────────────────────────────────────────────────────────────────── */
  lctThresholdStd:    80567,  /* Standard vehicles (petrol/diesel)                    */
  lctThresholdFE:     91387,  /* Fuel-efficient vehicles, EVs, PHEVs (<7L/100km)      */
  lctRate:            0.33,   /* 33% on value above threshold (GST-exclusive basis)    */

  /* EU-Australia FTA proposed threshold — update once legislated */
  lctThresholdFE_proposed: 120000,  /* Proposed under EU-AU FTA — NOT YET LAW           */


  /* ── ATO Statutory Residuals ─────────────────────────────────────────────
     Source: ato.gov.au/businesses/leasing/
     Used for novated lease and finance lease residual calculations.
     Based on total km to be travelled over the lease term.
  ──────────────────────────────────────────────────────────────────────── */
  residualByKm: {
    15000:  { pct: 0.5288, label: "up to 15,000 km/yr" },
    25000:  { pct: 0.4669, label: "15,001 – 25,000 km/yr" },
    35000:  { pct: 0.4050, label: "25,001 – 35,000 km/yr" },
    45000:  { pct: 0.3431, label: "35,001 – 45,000 km/yr" },
    over45: { pct: 0.2812, label: "over 45,000 km/yr" },
  },


  /* ── Stamp Duty — by State ───────────────────────────────────────────────
     Sources: each state revenue office (links below)
     All rates are for private passenger vehicles unless noted.
     Rates are correct as at lastReviewed date — verify before July update.

     VIC: sro.vic.gov.au/vehicle-acquisition-tax
     NSW: revenue.nsw.gov.au/duties/vehicle-duty
     QLD: qro.qld.gov.au/duties/vehicle-registration-duty
     WA:  finance.wa.gov.au/cms/state-revenue/transfer-duty/vehicles
     SA:  revenuesa.sa.gov.au/taxes-and-duties/stamp-duties/vehicle-registration-duty
     TAS: sro.tas.gov.au/duties/vehicle-duty
     ACT: revenue.act.gov.au/duties/vehicle-duty
     NT:  treasury.nt.gov.au/dtf/territory-revenue/duties/vehicle-duty
  ──────────────────────────────────────────────────────────────────────── */
  stampDuty: {
    VIC: {
      label: "Victoria",
      /* Tiered: 3.5% up to $57k; $1,995 + 5% on $57k-$100k; 6% above $100k */
      calc: (p) => p <= 57000 ? p * 0.035 : p <= 100000 ? 1995 + (p - 57000) * 0.05 : p * 0.06,
    },
    NSW: {
      label: "New South Wales",
      /* Revenue NSW tiered — no step discontinuity */
      calc: (p) => {
        if (p <= 45000)  return p * 0.03;
        if (p <= 65000)  return 1350 + (p - 45000) * 0.035;
        if (p <= 100000) return 2050 + (p - 65000) * 0.04;
        return 3450 + (p - 100000) * 0.05;
      },
    },
    QLD: {
      label: "Queensland",
      /* 3.1% up to $100k; 3.5% above */
      calc: (p) => p <= 100000 ? p * 0.031 : p * 0.035,
    },
    WA: {
      label: "Western Australia",
      /* Tiered structure */
      calc: (p) => p <= 25000 ? p * 0.026
               : p <= 50000  ? 650 + (p - 25000) * 0.0265
               : p <= 100000 ? 1312.5 + (p - 50000) * 0.030
               : p * 0.034,
    },
    SA: {
      label: "South Australia",
      calc: (p) => p * 0.04,
    },
    TAS: {
      label: "Tasmania",
      calc: (p) => p * 0.03,
    },
    ACT: {
      label: "Australian Capital Territory",
      calc: (p) => p * 0.03,
    },
    NT: {
      label: "Northern Territory",
      calc: (p) => p * 0.03,
    },
  },


  /* ── Default Running Cost Assumptions ───────────────────────────────────
     Used as prefill values in both calculator and guided flow.
     Users can override all of these.
  ──────────────────────────────────────────────────────────────────────── */
  defaults: {
    fuelPerL:          2.10,   /* $/L — petrol                                         */
    fuelL100km:        9.0,    /* L/100km — average ICE passenger vehicle              */
    evEfficiencyKwh:   18,     /* kWh/100km — average BEV                              */
    evHomeChargeKwh:   0.28,   /* $/kWh — average home charging rate                   */
    tyresPerYear:      600,    /* $/yr — amortised tyre replacement                    */
    servicesPerYear:   800,    /* $/yr — servicing and maintenance                     */
    insurancePerYear:  1800,   /* $/yr — comprehensive insurance                       */
    regPerYear:        900,    /* $/yr — registration including CTP                    */
    depYr1:            0.15,   /* Year 1 depreciation rate                             */
    depYr2:            0.12,   /* Year 2 depreciation rate                             */
    depYrN:            0.10,   /* Year 3+ depreciation rate                            */
    opportunityCost:   0.05,   /* Annual opportunity cost rate for cash purchases      */
  },


  /* ── Finance Rate Benchmarks ─────────────────────────────────────────────
     Indicative market rates as at lastReviewed date.
     These are prefill defaults only — users should enter their actual rate.
  ──────────────────────────────────────────────────────────────────────── */
  benchmarkRates: {
    personalLoan:      0.0899,  /* Indicative personal car loan rate                  */
    dealerFinance:     0.0699,  /* Indicative dealer/captive finance rate              */
    financelease:      0.0650,  /* Indicative finance lease rate                       */
    novatedLease:      0.0650,  /* Indicative novated lease finance rate               */
  },

};


/* ─── Helper: get stamp duty for a vehicle price and state ───────────────── */
export function calcStampDuty(price, state) {
  const sd = RATES.stampDuty[state] || RATES.stampDuty.VIC;
  return sd.calc(price);
}


/* ─── Helper: get LCT for a vehicle price ────────────────────────────────── */
export function calcLCT(price, isEV, useProposed = false) {
  const threshold = isEV
    ? (useProposed ? RATES.lctThresholdFE_proposed : RATES.lctThresholdFE)
    : RATES.lctThresholdStd;
  if (price <= threshold) return 0;
  return ((price - threshold) / 1.1) * RATES.lctRate;
}


/* ─── Helper: get marginal tax rate for a salary ─────────────────────────── */
export function getMarginalRate(salary) {
  if (salary <= 18200)  return 0;
  if (salary <= 45000)  return 0.19;
  if (salary <= 135000) return 0.325;
  if (salary <= 190000) return 0.37;
  return 0.45;
}


/* ─── Helper: get ATO statutory residual for km band ────────────────────── */
export function getResidual(annualKm) {
  if (annualKm <= 15000) return RATES.residualByKm[15000].pct;
  if (annualKm <= 25000) return RATES.residualByKm[25000].pct;
  if (annualKm <= 35000) return RATES.residualByKm[35000].pct;
  if (annualKm <= 45000) return RATES.residualByKm[45000].pct;
  return RATES.residualByKm.over45.pct;
}


/* ─── Helper: check if EV is FBT exempt under novated lease ─────────────── */
export function isEvFbtExempt(price, evType = 'bev', useProposed = false) {
  if (evType === 'phev') return RATES.phevFbtExemptionActive;
  if (!RATES.evFbtExemptionActive) return false;
  const threshold = useProposed ? RATES.lctThresholdFE_proposed : RATES.lctThresholdFE;
  return price <= threshold;
}


/* ─── UPDATE CHECKLIST (run each 1 July) ─────────────────────────────────
   [ ] Update financialYear
   [ ] Update taxBrackets if changed
   [ ] Update medicareLevyThreshold and medicareLevyPhaseInTop
   [ ] Update fbtRate, fbtGrossUpType1, fbtGrossUpType2 if changed
   [ ] Update lctThresholdStd and lctThresholdFE (check ato.gov.au)
   [ ] Update lctThresholdFE_proposed if EU-AU FTA has been legislated
   [ ] Update evFbtExemptionActive and phevFbtExemptionActive
   [ ] Review stampDuty rates for each state (check individual state SROs)
   [ ] Update benchmarkRates to current market
   [ ] Update lastReviewed and nextReviewDue
   [ ] Commit: "Rates update FY[xx]-[xx] — verified [date]"
──────────────────────────────────────────────────────────────────────── */
