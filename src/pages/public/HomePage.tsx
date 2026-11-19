import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  FileSpreadsheet,
  FileText,
  Layers,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import {
  BRAND_TAGLINE,
  DEFAULT_DEMO_EMISSION_FACTORS,
  INDIAN_CORRIDORS,
  MEDIA_ASSETS,
} from '../../constants/defaults';
import { calculateActivityEmissions, formatInr, formatNumber } from '../../utils/calculations';
import { ResilientImage } from '../../components/ResilientImage';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  // Interactive inline carbon calculator preview state
  const [monthlyKwh, setMonthlyKwh] = useState(42000);
  const [solarKwh, setSolarKwh] = useState(9500);
  const [monthlyDieselL, setMonthlyDieselL] = useState(1400);
  const [hypotheticalRate, setHypotheticalRate] = useState(650);

  const previewCalc = useMemo(() => {
    const gridFactor = DEFAULT_DEMO_EMISSION_FACTORS[0].factorValue;
    const dieselFactor = DEFAULT_DEMO_EMISSION_FACTORS[1].factorValue;
    const scope2Monthly = calculateActivityEmissions({
      energyCategory: 'electricity',
      quantity: monthlyKwh,
      unit: 'kWh',
      factorValue: gridFactor,
      renewableQuantity: solarKwh,
    });
    const scope1Monthly = calculateActivityEmissions({
      energyCategory: 'diesel',
      quantity: monthlyDieselL,
      unit: 'Litres',
      factorValue: dieselFactor,
    });
    const avoidedBySolarAnnualTonnes = Number(((Math.min(monthlyKwh, solarKwh) * 12 * gridFactor) / 1000).toFixed(2));
    const annualScope1 = Number((scope1Monthly.estimatedTonnesCo2e * 12).toFixed(2));
    const annualScope2 = Number((scope2Monthly.estimatedTonnesCo2e * 12).toFixed(2));
    const annualTotal = Number((annualScope1 + annualScope2).toFixed(2));
    const indicativeOppInr = Math.round(avoidedBySolarAnnualTonnes * hypotheticalRate);

    return {
      annualScope1,
      annualScope2,
      annualTotal,
      avoidedBySolarAnnualTonnes,
      indicativeOppInr,
      gridFactor,
      dieselFactor,
    };
  }, [monthlyKwh, solarKwh, monthlyDieselL, hypotheticalRate]);

  return (
    <div>
      {/* 1. HERO SECTION — Dark Navy & Solar Factory Backdrop */}
      <section className="relative bg-[#0B172A] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-emerald-400 tracking-wide mb-4">
              B2B Climate FinTech · Pune · Mumbai · Ahmedabad · Surat · NCR
            </p>
            <h1
              className="font-display font-bold text-white leading-[1.1] tracking-tight mb-5"
              style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
            >
              Operational emissions accounting and ESG reporting for Indian SMEs.
            </h1>
            <p className="text-base text-slate-300 leading-relaxed max-w-xl mb-8">
              {BRAND_TAGLINE} Record monthly electricity and fuel consumption across plants,
              calculate indicative Scope 1 and Scope 2 footprints, track energy-efficiency capex,
              and export structured ESG reports for CFOs and export buyers.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Free ESG Assessment
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-slate-200 border border-slate-700 hover:border-slate-500 hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Request a Demo
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <div className="relative rounded-xl overflow-hidden border border-slate-800 flex-1 min-h-[320px]">
              <ResilientImage
                src={MEDIA_ASSETS.heroSolarFactory}
                alt="Modern Indian manufacturing complex equipped with rooftop solar photovoltaic panels"
                className="w-full h-full object-cover"
                fallbackTitle="Solar-Equipped Industrial Facility"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B172A]/85 via-[#0B172A]/25 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <p className="text-xs text-emerald-300 font-medium mb-1">
                  Industrial Rooftop Solar · Chakan & Pune Auto Corridor
                </p>
                <p className="text-sm text-slate-100 leading-snug max-w-md">
                  Connect plant utility meters, DG diesel logs, and rooftop solar generation into a
                  single auditable sustainability ledger.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Key Coverage Strip Below Hero Split */}
        <div className="border-t border-slate-800 bg-[#0F1E36]">
          <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="font-mono text-xl font-semibold text-white tabular-nums">Scope 1 + 2</p>
              <p className="text-xs text-slate-400 mt-1">Electricity, diesel, petrol, PNG, LPG & fuels</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white tabular-nums">14 Sections</p>
              <p className="text-xs text-slate-400 mt-1">Structured ESG report with instant PDF export</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white tabular-nums">4 Role Views</p>
              <p className="text-xs text-slate-400 mt-1">SME User · CFO Admin · Owner · Reviewer</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-emerald-400 tabular-nums">Multi-Plant</p>
              <p className="text-xs text-slate-400 mt-1">Company-isolated records with audit history</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EXECUTIVE DASHBOARD PREVIEW (Mechanism-to-Outcome) */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold text-emerald-700 mb-2">
            01. Executive Workspace Preview
          </p>
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-3" style={{ textWrap: 'balance' }}>
            Built for CFOs, plant managers, and export sustainability teams.
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Replace fragmented electricity spreadsheets with structured monthly activity tracking,
            versioned emission factors, and internal approval workflows.
          </p>
        </div>

        {/* Clean Single-Elevation Dashboard Preview Frame */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="bg-[#0B172A] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <span className="font-medium text-white">GreenYield SME Workspace · Indicative Demo Snapshot</span>
            <span className="font-mono text-slate-400">FY 2025–26 · Multi-Plant Consolidation</span>
          </div>
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Scope 1 (Direct Fuel)', value: '112.4 tCO2e', note: 'DG Diesel + Furnace Gas' },
                  { label: 'Scope 2 (Grid Power)', value: '286.8 tCO2e', note: 'Net of 114 MWh Solar' },
                  { label: 'Total Estimated', value: '399.2 tCO2e', note: 'FY 2025–26 Indicative' },
                  { label: 'Est. Reduction YoY', value: '-14.8%', note: '2 active plant projects' },
                ].map((kpi) => (
                  <div key={kpi.label} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{kpi.note}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Sample Facility Emissions Register</h3>
                  <span className="text-xs text-slate-500">Illustrative SME structure</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Facility</th>
                        <th className="py-2 px-4 font-medium">Corridor</th>
                        <th className="py-2 px-4 font-medium text-right">Electricity (kWh)</th>
                        <th className="py-2 pl-4 font-medium text-right">Est. CO2e (t)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">Unit 1 — CNC Forging</td>
                        <td className="py-2.5 px-4">Chakan, Pune</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">318,400</td>
                        <td className="py-2.5 pl-4 text-right font-mono tabular-nums">241.60</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-medium text-slate-900">Unit 2 — Heat Treatment</td>
                        <td className="py-2.5 px-4">Pimpri-Chinchwad</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">194,200</td>
                        <td className="py-2.5 pl-4 text-right font-mono tabular-nums">157.60</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-lg p-5">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-2">Role-Separated Governance</p>
                <h3 className="font-display text-base font-bold text-slate-900 mb-3">
                  From plant floor bill upload to CFO approval.
                </h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="pb-2.5 border-b border-slate-200">
                    <strong className="text-slate-900 block">Plant & Ops Users</strong>
                    Log monthly electricity, diesel, petrol, PNG, and LPG bills with CSV import.
                  </li>
                  <li className="pb-2.5 border-b border-slate-200">
                    <strong className="text-slate-900 block">Company Admin / CFO</strong>
                    Review submissions, manage team roles, approve internal ESG drafts, and download PDF reports.
                  </li>
                  <li>
                    <strong className="text-slate-900 block">Verification Reviewer</strong>
                    Inspect evidence, log correction notes, and maintain an immutable audit trail.
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => navigate('/features')}
                className="mt-5 w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Explore All 13 Company Modules
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ASYMMETRIC BENTO CAPABILITIES WITH DISTINCT INDUSTRIAL PHOTOGRAPHY */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-emerald-700 mb-2">
              02. Platform Capabilities
            </p>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-3" style={{ textWrap: 'balance' }}>
              Purpose-built workflows for Indian industrial supply chains.
            </h2>
            <p className="text-base text-slate-600">
              Every module translates utility consumption and energy-efficiency investments into
              transparent operational disclosures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Large Primary Feature Card (7 cols) — Manufacturing Floor Photo */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="h-64 overflow-hidden">
                <ResilientImage
                  src={MEDIA_ASSETS.efficientManufacturing}
                  alt="Precision Indian auto-component manufacturing floor with LED high-bay lighting"
                  fallbackTitle="Energy-Efficient Manufacturing Floor"
                />
              </div>
              <div className="p-7 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    Utility Ledger · CSV Import · Multi-Plant Isolation
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
                    Structured Electricity & Fuel Data Management
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Capture state-grid kWh, captive solar offsets, DG-set diesel, petrol, natural
                    gas, LPG, and industrial fuels per facility. Automated validation rejects
                    negative entries and tracks missing reporting months separately from zero
                    emissions.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Supports CSV Bulk Upload & Audit History</span>
                  <button
                    type="button"
                    onClick={() => navigate('/esg-reporting')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    See ESG Reporting →
                  </button>
                </div>
              </div>
            </div>

            {/* Right Stack (5 cols) — Electric Grid Infrastructure Photo */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="h-64 overflow-hidden">
                <ResilientImage
                  src={MEDIA_ASSETS.electricGridInfra}
                  alt="Industrial electric substation and commercial EV logistics charging bays at dusk"
                  fallbackTitle="Electric Grid & EV Logistics Infrastructure"
                />
              </div>
              <div className="p-7 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    CapEx Tracking · Energy Savings · Indicative Estimates
                  </p>
                  <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
                    Sustainability Projects & Carbon Opportunity Modelling
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Log rooftop solar, LED upgrades, VFD machinery, and waste heat recovery
                    projects alongside CapEx in ₹ and actual kWh savings. Estimate indicative
                    reduction opportunities using explicit, editable price assumptions.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Explicitly labelled: Awaiting Independent Verification</span>
                  <button
                    type="button"
                    onClick={() => navigate('/sustainability')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Learn More →
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Capability Tiles Row */}
            {[
              {
                icon: Calculator,
                title: 'Configurable Emission Factors',
                desc: 'Formula-transparent Scope 1 & 2 engine with versioned demonstration factors and source attribution.',
              },
              {
                icon: FileText,
                title: 'Branded PDF ESG Reports',
                desc: 'Export 14-section disclosures complete with emissions tables, Scope split chart, and completeness metrics.',
              },
              {
                icon: ShieldCheck,
                title: 'Multi-Tenant Security & Audit Logs',
                desc: 'Company-isolated Firestore rules, CFO approval gates, and immutable append-only activity records.',
              },
            ].map((item) => (
              <div key={item.title} className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
                <item.icon className="w-5 h-5 text-emerald-700 mb-3" />
                <h3 className="font-display text-base font-bold text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE CARBON CALCULATOR PREVIEW */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold text-emerald-700 mb-2">
              03. Live Indicative Estimator
            </p>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
              Estimate your plant’s annual Scope 1 & Scope 2 baseline in seconds.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Adjust monthly electricity, captive solar generation, and DG-set diesel consumption to
              preview how GreenYield Capital computes operational CO2e using our clearly labelled
              academic demonstration factors.
            </p>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed mb-6">
              <strong>Methodology & Honesty Disclosure:</strong> Preview uses demonstration factors
              (Grid: <span className="font-mono">{previewCalc.gridFactor}</span> kg CO2e/kWh ·
              Diesel: <span className="font-mono">{previewCalc.dieselFactor}</span> kg CO2e/L).
              Outputs are indicative estimates only—not legally certified disclosures or issued
              carbon credits.
            </div>
            <button
              type="button"
              onClick={() => navigate('/calculator')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Open Full Multi-Fuel Calculator
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Monthly Electricity (kWh)</span>
                <input
                  type="number"
                  min={0}
                  value={monthlyKwh}
                  onChange={(e) => setMonthlyKwh(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Monthly Rooftop Solar / Renewable (kWh)</span>
                <input
                  type="number"
                  min={0}
                  value={solarKwh}
                  onChange={(e) => setSolarKwh(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Monthly DG / Fleet Diesel (Litres)</span>
                <input
                  type="number"
                  min={0}
                  value={monthlyDieselL}
                  onChange={(e) => setMonthlyDieselL(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Hypothetical Price Assumption (₹ / tCO2e)</span>
                <input
                  type="number"
                  min={0}
                  value={hypotheticalRate}
                  onChange={(e) => setHypotheticalRate(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Est. Scope 1 / yr</p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(previewCalc.annualScope1, 1)} t
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Est. Scope 2 / yr</p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(previewCalc.annualScope2, 1)} t
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Operational / yr</p>
                <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums mt-0.5">
                  {formatNumber(previewCalc.annualTotal, 1)} t
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Solar Avoided Est.</p>
                <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(previewCalc.avoidedBySolarAnnualTonnes, 1)} t
                </p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {formatInr(previewCalc.indicativeOppInr)} potential*
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-4">
              *Potential opportunity value is hypothetical, awaiting independent verification, not
              issued, and not tradable.
            </p>
          </div>
        </div>
      </section>

      {/* 5. INDUSTRIAL CORRIDORS & WIND ENERGY + CAMPUS SECTION */}
      <section className="bg-slate-50 border-t border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5 rounded-xl overflow-hidden border border-slate-200 min-h-[300px]">
              <ResilientImage
                src={MEDIA_ASSETS.windEnergyCorridor}
                alt="Commercial wind turbines overlooking an industrial corridor in Western India"
                fallbackTitle="Western India Industrial Wind Corridor"
              />
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold text-emerald-700 mb-2">
                04. Built for India’s Manufacturing Corridors
              </p>
              <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
                Designed around export readiness and energy-saving economics.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Export-oriented Tier-1 and Tier-2 Indian suppliers increasingly receive structured
                carbon questionnaires from European and domestic OEM buyers. GreenYield Capital
                organizes plant records so CFOs can answer inquiries with clear data boundaries.
              </p>
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {INDIAN_CORRIDORS.map((c) => (
                  <div key={c.city} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                    <span className="font-semibold text-slate-900">
                      {c.city} <span className="font-normal text-slate-500">· {c.state}</span>
                    </span>
                    <span className="text-slate-600">{c.focus}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Final Conversion Banner with Industrial Sustainability Campus Image */}
          <div className="relative rounded-xl overflow-hidden bg-[#0B172A] text-white border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center">
                <p className="text-xs font-semibold text-emerald-400 mb-2">
                  Get Started with GreenYield Capital
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ textWrap: 'balance' }}>
                  Register your company and build your first structured ESG report today.
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl mb-7">
                  Create your isolated company workspace, register your industrial facilities, upload
                  electricity and diesel consumption, and download an indicative PDF report with
                  complete audit traceability.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Start Free ESG Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="px-5 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View Academic MVP Pricing
                  </button>
                </div>
              </div>
              <div className="lg:col-span-5 min-h-[240px]">
                <ResilientImage
                  src={MEDIA_ASSETS.sustainabilityCampus}
                  alt="Sustainable modern industrial engineering campus with solar parking canopies and rainwater courtyard"
                  fallbackTitle="Sustainable Industrial Campus"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
