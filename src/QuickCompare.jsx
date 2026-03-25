import React, { useState, useMemo } from "react";

/* ─── RATES — update annually each 1 July ────────────────────────────────────
   FY2025-26 values. Sources: ato.gov.au / state revenue offices.
   Next review due: 1 July 2026
   NOTE: EU-AU FTA proposes raising lctThresholdFE to $120,000 once legislated.
────────────────────────────────────────────────────────────────────────────── */
const QC_RATES = {
  lastReviewed:   "March 2026",
  financialYear:  "FY2025-26",
  /* FBT */
  fbtRate:            0.47,
  fbtGrossUpType1:    2.0802,
  fbtStatutoryRate:   0.20,
  evFbtExemptActive:  true,
  phevFbtExemptActive: false,
  /* LCT */
  lctThresholdStd:    80567,
  lctThresholdFE:     91387,   /* Update to 120000 once EU-AU FTA legislation passes */
  lctRate:            0.33,
  /* Income tax — FY2024-25 Stage-3 brackets */
  medicareLevy:       0.02,
  medicareLevyThreshold: 26000,
  /* ATO statutory residuals */
  residuals: { 15000: 0.5288, 25000: 0.4669, 35000: 0.4050, 45000: 0.3431, over45: 0.2812 },
  /* Stamp duty calculators by state */
  stampDuty: {
    VIC: (p) => p <= 57000 ? p * 0.035 : p <= 100000 ? 1995 + (p - 57000) * 0.05 : p * 0.06,
    NSW: (p) => p <= 45000 ? p * 0.03 : p <= 65000 ? 1350 + (p - 45000) * 0.035 : p <= 100000 ? 2050 + (p - 65000) * 0.04 : 3450 + (p - 100000) * 0.05,
    QLD: (p) => p <= 100000 ? p * 0.031 : p * 0.035,
    WA:  (p) => p <= 25000 ? p * 0.026 : p <= 50000 ? 650 + (p - 25000) * 0.0265 : p <= 100000 ? 1312.5 + (p - 50000) * 0.030 : p * 0.034,
    SA:  (p) => p * 0.04,
    TAS: (p) => p * 0.03,
    ACT: (p) => p * 0.03,
    NT:  (p) => p * 0.03,
  },
  /* Default running cost assumptions */
  defaults: {
    fuelPerL: 2.10, fuelL100km: 9, evEffKwh: 18, evChargeRate: 0.28,
    tyres: 600, service: 800, insurance: 1800, rego: 900,
    dep1: 0.15, dep2: 0.12, depN: 0.10, opportunityCost: 0.05,
  },
  /* Benchmark finance rates */
  rates: { personalLoan: 0.0899, dealerFinance: 0.0699, novatedLease: 0.0650 },
};

/* ─── Rate helpers ────────────────────────────────────────────────────────── */
function calcStampDuty(price, state) {
  const fn = QC_RATES.stampDuty[state] || QC_RATES.stampDuty.VIC;
  return fn(price);
}
function calcLCT(price, isEV) {
  const t = isEV ? QC_RATES.lctThresholdFE : QC_RATES.lctThresholdStd;
  return price > t ? ((price - t) / 1.1) * QC_RATES.lctRate : 0;
}
function getMarginalRate(salary) {
  if (salary <= 18200)  return 0;
  if (salary <= 45000)  return 0.19;
  if (salary <= 135000) return 0.325;
  if (salary <= 190000) return 0.37;
  return 0.45;
}
function getResidual(annualKm) {
  const r = QC_RATES.residuals;
  if (annualKm <= 15000) return r[15000];
  if (annualKm <= 25000) return r[25000];
  if (annualKm <= 35000) return r[35000];
  if (annualKm <= 45000) return r[45000];
  return r.over45;
}
function isEvFbtExempt(price, evType) {
  if (evType === 'phev') return QC_RATES.phevFbtExemptActive;
  if (!QC_RATES.evFbtExemptActive) return false;
  return price <= QC_RATES.lctThresholdFE;
}

/**
 * QuickCompare — Veercal Guided Flow Calculator
 * ─────────────────────────────────────────────────────────────────────────────
 * A card-based step-through experience that collects inputs across 5 steps
 * and presents a simplified comparison result with a link to the full calculator.
 *
 * Steps:
 *   1. Your vehicle       — price, state, EV toggle
 *   2. How you'll use it  — annual km, hold period
 *   3. Finance type       — which structures to compare
 *   4. Your details       — salary (if novated), deposit, loan rate
 *   5. Results            — side-by-side comparison cards
 *
 * © 2025 Veercal Pty. Ltd. All rights reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ─── Design tokens ────────────────────────────────────────────────────── */
const C = {
  brand:   "#1e40af",
  brand2:  "#2563eb",
  navy:    "#1e293b",
  bg:      "#f1f5f9",
  surface: "#ffffff",
  border:  "#dbe4f0",
  text:    "#1e293b",
  muted:   "#4a5a6b",
  good:    "#166534",
  warn:    "#b45309",
  green:   "#dcfce7",
  greenBorder: "#166534",
};

/* ─── Finance maths (self-contained, uses RATES config) ─────────────────── */
function pmt(rate, nper, pv, fv = 0) {
  const r = rate / 12;
  if (r === 0) return (pv + fv) / nper;
  return (r * (pv * Math.pow(1 + r, nper) + fv)) / (Math.pow(1 + r, nper) - 1);
}

function vehVal(price, yrs, dep1, dep2, depN) {
  let v = price;
  for (let y = 1; y <= yrs; y++) {
    v *= 1 - (y === 1 ? dep1 : y === 2 ? dep2 : depN);
  }
  return Math.max(v, price * 0.05);
}

function runningCost(inputs) {
  const { annualKm, isEV, fuelPerL, fuelL100km, evEffKwh, evChargeRate,
          tyres, service, insurance, rego } = inputs;
  const fuel = isEV
    ? (annualKm / 100) * evEffKwh * evChargeRate
    : (annualKm / 100) * fuelL100km * fuelPerL;
  /* EVs have ~40% lower servicing costs — matches full calculator */
  const effectiveService = isEV ? service * 0.6 : service;
  return fuel + tyres + effectiveService + insurance + rego;
}

function calcResults(inputs) {
  const {
    vehiclePrice, state, isEV, evType, holdYears, annualKm,
    deposit, loanRate, loanTerm, salary, novatedRate, novatedTerm,
    fuelPerL, fuelL100km, evEffKwh, evChargeRate,
    tyres, service, insurance, rego,
    dep1, dep2, depN, opportunityCost,
    includeNovated, includeLoan, includeCash, includeDealer, dealerRate, dealerTerm, dealerDeposit = 2000,
  } = inputs;

  const stampDuty = calcStampDuty(vehiclePrice, state);
  /* LCT: only applies if vehicle exceeds threshold (matches full calculator default) */
  const lct = calcLCT(vehiclePrice, isEV);   /* returns 0 if under threshold */
  const effectivePrice = vehiclePrice + stampDuty + lct;
  const exitValue = vehVal(vehiclePrice, holdYears, dep1, dep2, depN);
  const runPerYear = runningCost({ annualKm, isEV, fuelPerL, fuelL100km, evEffKwh, evChargeRate, tyres, service, insurance, rego });
  const totalRunning = runPerYear * holdYears;
  const results = [];

  /* Cash */
  if (includeCash) {
    const oppCost = effectivePrice * (Math.pow(1 + opportunityCost, holdYears) - 1);
    const totalCost = effectivePrice + totalRunning - exitValue + oppCost;
    results.push({
      method: "cash", label: "Cash Purchase", icon: "💵", color: "#166534",
      monthlyPayment: 0,
      totalCost: Math.round(totalCost),
      effectiveMonthly: Math.round(totalCost / (holdYears * 12)),
      upfront: Math.round(effectivePrice),
      totalInterest: 0,
      note: "Includes opportunity cost on capital deployed",
    });
  }

  /* Personal loan — mirrors calcLoan() in App.js */
  if (includeLoan) {
    const financedAmount = Math.max(0, vehiclePrice - deposit);
    const months = loanTerm * 12;
    const mp = pmt(loanRate, months, financedAmount);
    const holdMonths = Math.min(holdYears * 12, months);
    const totalPaid = deposit + stampDuty + holdMonths * mp;  /* stamp duty upfront */
    const totalInt = mp * months - financedAmount;
    const totalCost = totalPaid + totalRunning - exitValue;
    results.push({
      method: "loan", label: "Personal Loan", icon: "🏦", color: "#1e40af",
      monthlyPayment: Math.round(mp),
      totalCost: Math.round(totalCost),
      effectiveMonthly: Math.round(totalCost / (holdYears * 12)),
      upfront: deposit + stampDuty,
      totalInterest: Math.round(totalInt),
      note: `${(loanRate * 100).toFixed(2)}% interest rate, ${loanTerm}-year term`,
    });
  }

  /* Dealer finance — mirrors calcLoan() in App.js exactly */
  if (includeDealer) {
    const dep = dealerDeposit;
    const balloon = vehiclePrice * 0.25;
    /* Finance vehicle price minus deposit (stamp duty paid upfront, not financed) */
    const financedAmount = Math.max(0, vehiclePrice - dep);
    const months = dealerTerm * 12;
    const mp = pmt(dealerRate, months, financedAmount, -balloon);
    const holdMonths = Math.min(holdYears * 12, months);
    const totalPaid = dep + stampDuty + holdMonths * mp;   /* stamp duty is upfront cash */
    /* Remaining balloon at end of hold: if still in loan term, balloon still owing */
    const balloonOwing = holdYears >= dealerTerm ? balloon : 0;
    const totalInt = mp * months - (financedAmount - balloon);
    const totalCost = totalPaid + totalRunning - exitValue + Math.max(0, balloonOwing);
    results.push({
      method: "dealer", label: "Dealer Finance", icon: "🚗", color: "#ea580c",
      monthlyPayment: Math.round(mp),
      totalCost: Math.round(totalCost),
      effectiveMonthly: Math.round(totalCost / (holdYears * 12)),
      upfront: dep + stampDuty,
      totalInterest: Math.round(totalInt),
      balloonOwing: Math.round(balloonOwing),
      note: `25% balloon · $${dep.toLocaleString("en-AU")} deposit · ${(dealerRate * 100).toFixed(2)}% rate · ${dealerTerm}yr`,
    });
  }

  /* Novated lease — multi-phase: lease term + residual + post-lease running */
  if (includeNovated && salary > 0) {
    const mtrRate = getMarginalRate(salary);
    const medLevy = salary > QC_RATES.medicareLevyThreshold ? QC_RATES.medicareLevy : 0;
    const effectiveTaxRate = mtrRate + medLevy;
    const residualPct = getResidual(annualKm);
    const residual = vehiclePrice * residualPct;
    const months = novatedTerm * 12;
    const gf = pmt(novatedRate, months, vehiclePrice, -residual);
    const runMo = runPerYear / 12;
    const preTax = gf + runMo;
    const taxSaving = preTax * effectiveTaxRate;
    const netMo = preTax - taxSaving;
    const evExempt = isEvFbtExempt(vehiclePrice, evType);
    const fbtMo = evExempt ? 0 : (vehiclePrice * QC_RATES.fbtStatutoryRate * QC_RATES.fbtGrossUpType1 * QC_RATES.fbtRate) / 12;
    const trueNetMo = netMo + fbtMo;
    /* Phase 1: lease payments; Phase 2: post-lease running only; + residual buyout */
    const postLeaseYears = Math.max(0, holdYears - novatedTerm);
    const totalCost = trueNetMo * months + residual + runPerYear * postLeaseYears - exitValue;
    results.push({
      method: "novated", label: "Novated Lease", icon: "💼", color: "#b45309",
      monthlyPayment: Math.round(trueNetMo),
      totalCost: Math.round(totalCost),
      effectiveMonthly: Math.round(totalCost / (holdYears * 12)),
      upfront: 0,
      totalInterest: 0,
      taxSavingMonthly: Math.round(taxSaving),
      fbtExempt: evExempt,
      residual: Math.round(residual),
      opportunityCostTotal: 0,
      note: evExempt
        ? `FBT exempt (EV) · ${(effectiveTaxRate * 100).toFixed(0)}% combined tax rate`
        : `FBT applies · ${(effectiveTaxRate * 100).toFixed(0)}% combined tax rate`,
    });
  }

  /* Sort by total cost */
  results.sort((a, b) => a.totalCost - b.totalCost);
  return { results, stampDuty, lct, exitValue, runPerYear };
}

/* ─── Formatters ─────────────────────────────────────────────────────────── */
const fmt = (n) => n == null ? "—"
  : (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-AU");

/* ─── Step definitions ───────────────────────────────────────────────────── */
const STEPS = [
  { id: "vehicle",  title: "Your vehicle",        icon: "🚗", desc: "Tell us what you are buying" },
  { id: "usage",    title: "How you will use it",  icon: "📍", desc: "Distance and how long you will keep it" },
  { id: "finance",  title: "Finance options",      icon: "⚖️", desc: "Which structures do you want to compare?" },
  { id: "details",  title: "Your details",         icon: "👤", desc: "A few more details for an accurate comparison" },
  { id: "results",  title: "Your comparison",      icon: "📊", desc: "See the true cost of each option" },
];

/* ─── Initial state ──────────────────────────────────────────────────────── */
const INITIAL = {
  vehiclePrice: 55000,
  state: "VIC",
  isEV: false,
  evType: "bev",
  annualKm: 15000,
  holdYears: 5,
  includeCash: true,
  includeLoan: true,
  includeDealer: true,
  includeNovated: false,
  deposit: 5000,
  dealerDeposit: 2000,
  loanRate: QC_RATES.rates.personalLoan,
  loanTerm: 5,
  dealerRate: QC_RATES.rates.dealerFinance,
  dealerTerm: 5,
  salary: 100000,
  novatedRate: QC_RATES.rates.novatedLease,
  novatedTerm: 3,
  fuelPerL: QC_RATES.defaults.fuelPerL,
  fuelL100km: QC_RATES.defaults.fuelL100km,
  evEffKwh: QC_RATES.defaults.evEffKwh,
  evChargeRate: QC_RATES.defaults.evChargeRate,
  tyres: QC_RATES.defaults.tyres,
  service: QC_RATES.defaults.service,
  insurance: QC_RATES.defaults.insurance,
  rego: QC_RATES.defaults.rego,
  dep1: QC_RATES.defaults.dep1,
  dep2: QC_RATES.defaults.dep2,
  depN: QC_RATES.defaults.depN,
  opportunityCost: QC_RATES.defaults.opportunityCost,
};

/* ─── Reusable input components ──────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4, letterSpacing: "0.01em" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function NumberInput({ value, onChange, prefix = "$", min, max }) {
  /* Use a text input so users can freely type — converts to number on blur.
     Avoids the browser stepping/validation behaviour of type="number"
     which prevents typing mid-number on some browsers. */
  const [local, setLocal] = React.useState(String(value));

  React.useEffect(() => {
    /* Sync if parent value changes externally (e.g. reset) */
    setLocal(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(local.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed)) {
      const clamped = min != null && parsed < min ? min
                    : max != null && parsed > max ? max
                    : parsed;
      onChange(clamped);
      setLocal(String(clamped));
    } else {
      setLocal(String(value)); /* revert if invalid */
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 12px", height: 42 }}>
      {prefix && <span style={{ fontSize: 14, color: C.muted, marginRight: 6 }}>{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontWeight: 600, color: C.text, outline: "none", fontFamily: "inherit" }}
        aria-label={prefix}
      />
    </div>
  );
}

function OptionPill({ label, selected, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: `2px solid ${selected ? C.brand : C.border}`,
        background: selected ? "#eff6ff" : C.surface,
        color: selected ? C.brand : C.muted,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.12s",
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none",
          background: value ? "#16a34a" : "#cbd5e1",
          cursor: "pointer", position: "relative", transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: 2,
          left: value ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%", background: "white",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

/* ─── Step components ────────────────────────────────────────────────────── */
function StepVehicle({ inputs, upd }) {
  const states = ["VIC","NSW","QLD","WA","SA","TAS","ACT","NT"];
  return (
    <div>
      <Field label="Vehicle price (drive-away)" hint="Include dealer delivery charges in this figure">
        <NumberInput value={inputs.vehiclePrice} onChange={(v) => upd("vehiclePrice", Math.max(1000, v))} />
      </Field>

      <Field label="State or territory">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {states.map(s => (
            <OptionPill key={s} label={s} selected={inputs.state === s} onClick={() => upd("state", s)} />
          ))}
        </div>
      </Field>

      <Field label="Vehicle type">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <OptionPill label="Petrol / Diesel" icon="⛽" selected={!inputs.isEV} onClick={() => upd("isEV", false)} />
          <OptionPill label="Electric / EV" icon="⚡" selected={inputs.isEV && inputs.evType === "bev"} onClick={() => { upd("isEV", true); upd("evType", "bev"); }} />
          <OptionPill label="Plug-in Hybrid" icon="🔌" selected={inputs.isEV && inputs.evType === "phev"} onClick={() => { upd("isEV", true); upd("evType", "phev"); }} />
        </div>
        {inputs.isEV && inputs.evType === "phev" && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e" }}>
            PHEV FBT exemption under novated leases ended April 2025 — verify current ATO position before proceeding.
          </div>
        )}
      </Field>

      {/* Live stamp duty preview */}
      <div style={{ background: "#eff6ff", border: `1px solid #bfdbfe`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.brand }}>
        <strong>Stamp duty estimate ({inputs.state}):</strong>{" "}
        {fmt(calcStampDuty(inputs.vehiclePrice, inputs.state))}
        {calcLCT(inputs.vehiclePrice, inputs.isEV) > 0 && (
          <span style={{ marginLeft: 12, color: C.warn }}>
            + LCT: {fmt(calcLCT(inputs.vehiclePrice, inputs.isEV))}
          </span>
        )}
      </div>
    </div>
  );
}

function StepUsage({ inputs, upd }) {
  const kmOptions = [5000, 10000, 15000, 20000, 25000, 30000];
  const holdOptions = [2, 3, 4, 5, 7, 10];
  return (
    <div>
      <Field label="Annual kilometres" hint="How far do you drive per year?">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {kmOptions.map(k => (
            <OptionPill key={k} label={`${(k/1000).toFixed(0)}k km`} selected={inputs.annualKm === k} onClick={() => upd("annualKm", k)} />
          ))}
        </div>
      </Field>

      <Field label="How long will you keep the car?" hint="This sets the comparison period for all finance options">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {holdOptions.map(y => (
            <OptionPill key={y} label={`${y} years`} selected={inputs.holdYears === y} onClick={() => upd("holdYears", y)} />
          ))}
        </div>
      </Field>

      {/* Running costs summary */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimated annual running costs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Fuel / charging", value: inputs.isEV ? fmt((inputs.annualKm / 100) * inputs.evEffKwh * inputs.evChargeRate) : fmt((inputs.annualKm / 100) * inputs.fuelL100km * inputs.fuelPerL) },
            { label: "Insurance",       value: fmt(inputs.insurance) },
            { label: "Registration",    value: fmt(inputs.rego) },
            { label: "Servicing",       value: fmt(inputs.isEV ? inputs.service * 0.6 : inputs.service) },
            { label: "Tyres",           value: fmt(inputs.tyres) },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: C.muted }}>{r.label}</span>
              <span style={{ fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepFinance({ inputs, upd }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Select which finance structures you want to compare. You can compare as many as you like.</div>

      <Toggle label="💵  Cash purchase" value={inputs.includeCash} onChange={(v) => upd("includeCash", v)} />
      <Toggle label="🏦  Personal loan" value={inputs.includeLoan} onChange={(v) => upd("includeLoan", v)} />
      <Toggle label="🚗  Dealer finance" value={inputs.includeDealer} onChange={(v) => upd("includeDealer", v)} />
      <Toggle label="💼  Novated lease (PAYG employees only)" value={inputs.includeNovated} onChange={(v) => upd("includeNovated", v)} />

      {inputs.includeNovated && (
        <div style={{ marginTop: 4, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
          Novated leasing is available to permanent and long-term PAYG employees only. Your employer must offer salary packaging.
        </div>
      )}

      {!inputs.includeCash && !inputs.includeLoan && !inputs.includeDealer && !inputs.includeNovated && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fee2e2", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
          Select at least one option to compare.
        </div>
      )}
    </div>
  );
}

function StepDetails({ inputs, upd }) {
  return (
    <div>
      {inputs.includeLoan && (
        <>
          <Field label="Deposit (personal loan)" hint="Amount you will pay upfront">
            <NumberInput value={inputs.deposit} onChange={(v) => upd("deposit", v)} min={0} />
          </Field>
          <Field label="Loan interest rate" hint="Use the comparison rate from your lender">
            <NumberInput value={Math.round(inputs.loanRate * 10000) / 100} onChange={(v) => upd("loanRate", v / 100)} prefix="%" min={0} max={50} step={0.01} />
          </Field>
          <Field label="Loan term">
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 4, 5, 6, 7].map(y => (
                <OptionPill key={y} label={`${y}yr`} selected={inputs.loanTerm === y} onClick={() => upd("loanTerm", y)} />
              ))}
            </div>
          </Field>
        </>
      )}

      {inputs.includeDealer && (
        <>
          <Field label="Dealer deposit" hint="Amount you will pay upfront to the dealer">
            <NumberInput value={inputs.dealerDeposit} onChange={(v) => upd("dealerDeposit", v)} min={0} />
          </Field>
          <Field label="Dealer finance rate" hint="Ask the dealer for their comparison rate">
            <NumberInput value={Math.round(inputs.dealerRate * 10000) / 100} onChange={(v) => upd("dealerRate", v / 100)} prefix="%" min={0} max={50} step={0.01} />
          </Field>
          <Field label="Dealer finance term">
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 4, 5].map(y => (
                <OptionPill key={y} label={`${y}yr`} selected={inputs.dealerTerm === y} onClick={() => upd("dealerTerm", y)} />
              ))}
            </div>
          </Field>
        </>
      )}

      {inputs.includeNovated && (
        <>
          <Field label="Gross annual salary" hint="Your total pre-tax salary including super">
            <NumberInput value={inputs.salary} onChange={(v) => upd("salary", v)} min={0} />
          </Field>
          <Field label="Novated lease term">
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4, 5].map(y => (
                <OptionPill key={y} label={`${y}yr`} selected={inputs.novatedTerm === y} onClick={() => upd("novatedTerm", y)} />
              ))}
            </div>
          </Field>
          {inputs.isEV && isEvFbtExempt(inputs.vehiclePrice, inputs.evType) && (
            <div style={{ padding: "10px 14px", background: "#dcfce7", border: `1px solid #166534`, borderRadius: 8, fontSize: 13, color: "#166534", fontWeight: 600 }}>
              This EV is FBT-exempt under a novated lease — no post-tax FBT contribution required.
            </div>
          )}
        </>
      )}

      {inputs.includeCash && (
        <Field label="Opportunity cost rate" hint="Expected annual return if you invested the money instead (e.g. 5% for a balanced portfolio, 6% if you have a mortgage at that rate)">
          <NumberInput value={Math.round(inputs.opportunityCost * 1000) / 10} onChange={(v) => upd("opportunityCost", v / 100)} prefix="%" min={0} max={25} step={0.5} />
        </Field>
      )}
    </div>
  );
}

/* ─── Insight flip cards ─────────────────────────────────────────────────── */
function InsightCards({ results, inputs }) {
  const [flipped, setFlipped] = React.useState({});
  const flip = (id) => setFlipped(p => ({ ...p, [id]: !p[id] }));

  const lowestMonthly = [...results].sort((a, b) => a.monthlyPayment - b.monthlyPayment)[0];
  const lowestTotal   = results[0]; /* already sorted by totalCost */
  const novated       = results.find(r => r.method === "novated");
  const loan          = results.find(r => r.method === "loan");
  const cash          = results.find(r => r.method === "cash");
// eslint-disable-next-line
  const dealer        = results.find(r => r.method === "dealer");

  const cards = [];

  /* Card 1: lowest monthly payment */
  if (lowestMonthly) {
    cards.push({
      id: "monthly",
      icon: "💳",
      front_title: "Lowest monthly payment",
      front_value: fmt(lowestMonthly.monthlyPayment || 0) + "/mo",
      front_label: lowestMonthly.label,
      front_color: lowestMonthly.color,
      back_title: "Why this is lowest",
      back_body: lowestMonthly.method === "cash"
        ? `Paying cash means no monthly finance repayment at all — your only ongoing costs are running expenses of ${fmt(Math.round(inputs.annualKm / 100 * inputs.fuelL100km * inputs.fuelPerL / 12 + (inputs.tyres + inputs.service + inputs.insurance + inputs.rego) / 12))}/mo. However the true total cost includes the full purchase price upfront.`
        : lowestMonthly.method === "dealer"
        ? `Dealer finance with a 25% balloon keeps monthly payments low because you are not paying down the full loan balance — ${fmt(lowestMonthly.balloonOwing || Math.round(inputs.vehiclePrice * 0.25))} remains owing at the end of the term.`
        : lowestMonthly.method === "novated"
        ? `Salary sacrifice reduces your effective monthly out-of-pocket to ${fmt(lowestMonthly.monthlyPayment)}/mo. You are saving ${fmt(lowestMonthly.taxSavingMonthly)}/mo in income tax${lowestMonthly.fbtExempt ? " and paying no FBT (EV exemption applies)" : ""}.`
        : `A ${inputs.loanTerm}-year loan at ${(inputs.loanRate * 100).toFixed(2)}% spreads the cost over ${inputs.loanTerm * 12} monthly payments of ${fmt(lowestMonthly.monthlyPayment)}.`,
    });
  }

  /* Card 2: lowest true total cost */
  if (lowestTotal) {
    const secondCheapest = results[1];
    cards.push({
      id: "total",
      icon: "🏆",
      front_title: "Lowest true total cost",
      front_value: fmt(lowestTotal.totalCost),
      front_label: `over ${inputs.holdYears} years — ${lowestTotal.label}`,
      front_color: lowestTotal.color,
      back_title: "What makes it cheapest",
      back_body: secondCheapest
        ? `${lowestTotal.label} costs ${fmt(lowestTotal.totalCost)} over ${inputs.holdYears} years — that is ${fmt(secondCheapest.totalCost - lowestTotal.totalCost)} less than ${secondCheapest.label} (${fmt(secondCheapest.totalCost)}). True total cost includes all finance, running costs, stamp duty, and exit value.`
        : `${lowestTotal.label} is the only option selected. Add more options in Step 3 to compare.`,
    });
  }

  /* Card 3: novated tax saving (if applicable) */
  if (novated) {
    cards.push({
      id: "novated",
      icon: "💼",
      front_title: "Novated tax saving",
      front_value: fmt(novated.taxSavingMonthly * 12) + "/yr",
      front_label: `${fmt(novated.taxSavingMonthly)}/mo income tax saved`,
      front_color: "#b45309",
      back_title: "How your novated saving works",
      back_body: `On a ${fmt(inputs.salary)} salary, your marginal rate is approximately ${Math.round((novated.taxSavingMonthly / ((novated.monthlyPayment + novated.taxSavingMonthly))) * 100)}%. Packaging ${fmt(novated.monthlyPayment + novated.taxSavingMonthly)}/mo pre-tax saves you ${fmt(novated.taxSavingMonthly)}/mo or ${fmt(novated.taxSavingMonthly * 12)}/yr in income tax.${novated.fbtExempt ? " Your EV is FBT-exempt so no post-tax contribution is required." : ""} Over ${inputs.holdYears} years that is ${fmt(novated.taxSavingMonthly * 12 * inputs.holdYears)} in total tax savings.`,
    });
  }

  /* Card 4: cash vs loan — interest cost insight */
  if (cash && loan) {
    const interestSaving = loan.totalInterest;
    cards.push({
      id: "cashvloan",
      icon: "💵",
      front_title: "Interest cost — loan",
      front_value: fmt(interestSaving),
      front_label: "total interest on personal loan",
      front_color: "#1e40af",
      back_title: "Cash vs loan trade-off",
      back_body: `Financing at ${(inputs.loanRate * 100).toFixed(2)}% costs ${fmt(interestSaving)} in interest over ${inputs.loanTerm} years. Cash avoids this — but the opportunity cost of not investing ${fmt(inputs.vehiclePrice)} adds approximately ${fmt(cash.opportunityCostTotal || Math.round(inputs.vehiclePrice * (Math.pow(1 + inputs.opportunityCost, inputs.holdYears) - 1)))} over ${inputs.holdYears} years at ${(inputs.opportunityCost * 100).toFixed(0)}% assumed return. ${interestSaving < (cash.opportunityCostTotal || 0) ? "In this scenario investing the cash and financing the car is mathematically cheaper." : "In this scenario cash is mathematically cheaper — the loan interest exceeds the opportunity cost."}`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        Tap any card for insight
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {cards.map(card => (
          <div key={card.id}
            onClick={() => flip(card.id)}
            style={{
              borderRadius: 12, cursor: "pointer", minHeight: 110,
              perspective: 600,
              WebkitPerspective: 600,
            }}
          >
            <div style={{
              position: "relative", width: "100%", height: "100%", minHeight: 110,
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d",
              transition: "transform 0.4s ease",
              transform: flipped[card.id] ? "rotateY(180deg)" : "rotateY(0deg)",
            }}>
              {/* Front */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                background: "white", border: `2px solid ${card.front_color}20`,
                borderRadius: 12, padding: "14px 16px",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  {card.icon} {card.front_title}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: card.front_color, letterSpacing: "-0.01em" }}>{card.front_value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{card.front_label}</div>
                </div>
                <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8, textAlign: "right" }}>tap for insight →</div>
              </div>
              {/* Back */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: `linear-gradient(135deg, ${card.front_color}15, ${card.front_color}08)`,
                border: `2px solid ${card.front_color}40`,
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: card.front_color, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {card.back_title}
                </div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{card.back_body}</div>
                <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8, textAlign: "right" }}>tap to flip back ↩</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepResults({ inputs }) {
  const { results, stampDuty, lct, exitValue, runPerYear } = useMemo(
    () => calcResults(inputs),
    [inputs]
  );

  const hasResults = results.length > 0;
  const winner = hasResults ? results[0] : null;
  const savings = hasResults && results.length > 1
    ? results[results.length - 1].totalCost - results[0].totalCost
    : 0;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Vehicle", value: fmt(inputs.vehiclePrice) },
          { label: "Stamp duty", value: fmt(stampDuty) },
          { label: "LCT", value: lct > 0 ? fmt(lct) : "Nil" },
          { label: "Est. exit value", value: fmt(exitValue) },
          { label: "Running / yr", value: fmt(runPerYear) },
        ].map(s => (
          <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", flex: "1 1 80px", minWidth: 80 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Winner banner */}
      {winner && savings > 0 && (
        <div style={{ background: `linear-gradient(135deg, #166534, #15803d)`, borderRadius: 10, padding: "14px 18px", marginBottom: 16, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8, marginBottom: 3 }}>Lowest modelled cost</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{winner.icon} {winner.label}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Modelled saving vs highest</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(savings)}</div>
          </div>
        </div>
      )}

      {/* Result cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {results.map((r, i) => (
          <div key={r.method} style={{
            background: C.surface,
            border: `2px solid ${i === 0 ? r.color : C.border}`,
            borderRadius: 12,
            padding: "16px 18px",
            position: "relative",
          }}>
            {i === 0 && (
              <div style={{ position: "absolute", top: -10, right: 12, background: r.color, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Best option
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: r.color, marginBottom: 4 }}>{r.icon} {r.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.note}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>True total cost</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{fmt(r.totalCost)}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{fmt(r.effectiveMonthly)}/mo effective</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              {r.monthlyPayment > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly payment</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(r.monthlyPayment)}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Upfront</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(r.upfront)}</div>
              </div>
              {r.totalInterest > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total interest</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.warn }}>{fmt(r.totalInterest)}</div>
                </div>
              )}
              {r.fbtExempt && (
                <div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>FBT</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.good }}>Exempt</div>
                </div>
              )}
              {r.taxSavingMonthly > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tax saving/mo</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.good }}>{fmt(r.taxSavingMonthly)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!hasResults && (
        <div style={{ textAlign: "center", padding: 32, color: C.muted }}>
          Please go back and select at least one finance option to compare.
        </div>
      )}

      {/* ── Insight flip cards ─────────────────────────────────────────── */}
      {hasResults && <InsightCards results={results} inputs={inputs} />}

      {/* CTA to full calculator */}
      <div style={{ background: C.navy, borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>Want the full picture?</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>The full Veercal calculator adds 6 analysis tabs — cash flow, equity, exit simulator, deep dive, on-costs, and year-by-year data.</div>
        </div>
        <a href={buildCalcUrl(inputs)} style={{ background: "white", color: C.brand, fontWeight: 700, fontSize: 13, padding: "10px 20px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          Open Full Calculator →
        </a>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
        General information only — not financial advice. All figures are indicative estimates based on the inputs provided and simplified assumptions. Rates verified {QC_RATES.lastReviewed}. Always consult a licensed financial adviser before making financial decisions.
      </div>
    </div>
  );
}

/* ─── URL state bridge: encode QC inputs for full calculator ────────────── */
function buildCalcUrl(inputs) {
  /* Maps QuickCompare input keys to the full calculator's DEFAULTS keys,
     encodes as base64 JSON in the URL hash — same format the full calculator uses */
  try {
    const mapped = {
      vehiclePrice: inputs.vehiclePrice,
      state: inputs.state,
      isEV: inputs.isEV,
      evType: inputs.evType,
      holdYears: inputs.holdYears,
      annualKm: inputs.annualKm,
      loanDeposit: inputs.deposit,
      loanRate: inputs.loanRate,
      loanTermYears: inputs.loanTerm,
      dealerRate: inputs.dealerRate,
      dealerTermYears: inputs.dealerTerm,
      dealerDeposit: inputs.dealerDeposit,
      balloonPct: 0.25,
      grossSalary: inputs.salary,
      novatedRate: inputs.novatedRate,
      novatedTermYears: inputs.novatedTerm,
      fuelPerL: inputs.fuelPerL,
      fuelL100km: inputs.fuelL100km,
      evEfficiencyKwh: inputs.evEffKwh,
      evHomeChargeKwh: inputs.evChargeRate,
      tyresPerYear: inputs.tyres,
      servicesPerYear: inputs.service,
      insurancePerYear: inputs.insurance,
      regPerYear: inputs.rego,
      depYr1: inputs.dep1,
      depYr2: inputs.dep2,
      depYrN: inputs.depN,
      opportunityCostPct: inputs.opportunityCost,
    };
    const encoded = btoa(JSON.stringify(mapped));
    return `/calculator#s:${encoded}`;
  } catch {
    return "/calculator";
  }
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function QuickCompare() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState(INITIAL);

  const upd = (key, val) => setInputs(p => ({ ...p, [key]: val }));

  const canAdvance = () => {
    if (step === 2 && !inputs.includeCash && !inputs.includeLoan && !inputs.includeDealer && !inputs.includeNovated) return false;
    if (step === 3 && inputs.includeNovated && inputs.salary <= 0) return false;
    return true;
  };

  const stepComponents = [
    <StepVehicle inputs={inputs} upd={upd} />,
    <StepUsage inputs={inputs} upd={upd} />,
    <StepFinance inputs={inputs} upd={upd} />,
    <StepDetails inputs={inputs} upd={upd} />,
    <StepResults inputs={inputs} />,
  ];

  const isLastStep = step === STEPS.length - 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: "100vh" }}>

      {/* Header — matches full calculator banner */}
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

        {/* Top row: logo + wordmark + nav link */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" stroke="white" strokeWidth="2" fill="none"/>
              <rect x="28" y="48" width="8" height="18" fill="white" rx="0.5"/>
              <rect x="39" y="40" width="8" height="26" fill="white" rx="0.5"/>
              <rect x="50" y="30" width="8" height="36" fill="white" rx="0.5"/>
              <rect x="61" y="38" width="8" height="28" fill="white" rx="0.5"/>
              <path d="M 26 66 A 6 6 0 0 0 38 66 Z" fill="white"/>
              <path d="M 59 66 A 6 6 0 0 0 71 66 Z" fill="white"/>
            </svg>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 46,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.09em",
              lineHeight: 0.92,
              transform: "scaleY(1.12)",
              transformOrigin: "bottom left",
              display: "block",
            }}>VEERCAL</div>
          </div>
          <a href="/calculator" style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 500, textDecoration: "none", paddingTop: 4 }}>
            Full calculator →
          </a>
        </div>

        {/* Bottom row: tagline */}
        <div style={{ position: "relative", marginTop: 14 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.01em", marginBottom: 2 }}>
            Quick Compare
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>
            www.veercal.com
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#dbe4f0", height: 3 }}>
        <div style={{ height: 3, background: C.brand2, width: `${((step + 1) / STEPS.length) * 100}%`, transition: "width 0.3s ease" }} />
      </div>

      {/* Step indicator */}
      <div style={{ padding: "14px 24px 0", display: "flex", gap: 6, overflowX: "auto" }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step && setStep(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 20,
              border: "none",
              background: i === step ? C.brand : i < step ? "#dbeafe" : C.bg,
              color: i === step ? "white" : i < step ? C.brand : C.muted,
              fontSize: 11,
              fontWeight: 600,
              cursor: i < step ? "pointer" : "default",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            <span>{s.icon}</span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Card */}
      <div style={{ maxWidth: 600, margin: "16px auto", padding: "0 16px 80px" }}>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(30,41,59,0.07)" }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>
              {STEPS[step].icon} {STEPS[step].title}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{STEPS[step].desc}</div>
          </div>

          <div style={{ padding: "22px 24px" }}>
            {stepComponents[step]}
          </div>

          {/* Navigation */}
          <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: step === 0 ? C.bg : C.surface,
                color: step === 0 ? "#cbd5e1" : C.muted,
                fontSize: 13,
                fontWeight: 600,
                cursor: step === 0 ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Back
            </button>

            {!isLastStep ? (
              <button
                onClick={() => canAdvance() && setStep(s => s + 1)}
                disabled={!canAdvance()}
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: canAdvance() ? C.brand : "#cbd5e1",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: canAdvance() ? "pointer" : "default",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                {step === STEPS.length - 2 ? "See my comparison →" : "Next →"}
              </button>
            ) : (
              <button
                onClick={() => { setStep(0); setInputs(INITIAL); }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                  color: C.muted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
