import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
  Shield,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BRAND_TAGLINE,
  CARBON_OPPORTUNITY_NOTICE,
  DEFAULT_DEMO_EMISSION_FACTORS,
  INDIAN_CORRIDORS,
  MEDIA_ASSETS,
  PERMANENT_ESG_DISCLAIMER,
} from '../../constants/defaults';
import { calculateActivityEmissions, formatInr, formatNumber } from '../../utils/calculations';
import { submitPublicInquiry } from '../../services/firestoreService';
import { ResilientImage } from '../../components/ResilientImage';
import { PublicInquiry } from '../../types/models';

interface PageProps {
  navigate: (path: string) => void;
}

// ============================================================================
// 2. ABOUT US PAGE
// ============================================================================
export const AboutPage: React.FC<PageProps> = ({ navigate }) => (
  <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
      <div className="lg:col-span-6 flex flex-col justify-center">
        <p className="text-xs font-semibold text-emerald-700 mb-2">About GreenYield Capital</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
          Bridging industrial energy efficiency and structured ESG disclosure for Indian SMEs.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed mb-4">
          {BRAND_TAGLINE} GreenYield Capital was conceived as an MBA Climate FinTech venture focused
          on a practical operational gap: Indian manufacturing and export SMEs invest in solar
          rooftops, efficient compressors, and LED retrofits, yet struggle to organize utility bills
          into consistent Scope 1 and Scope 2 disclosures.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Rather than overpromising automated certification or speculative carbon trading, our
          platform focuses on disciplined activity data capture, transparent factor mathematics,
          internal CFO governance, and clear readiness for independent verification.
        </p>
      </div>
      <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 min-h-[300px]">
        <ResilientImage
          src={MEDIA_ASSETS.windEnergyCorridor}
          alt="Wind energy turbines above a Western India industrial park"
          fallbackTitle="Western India Renewable Corridor"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200 pt-12">
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h2 className="font-display text-lg font-bold text-slate-900 mb-2">Target Market</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Auto-component, textile, engineering, logistics, and export-oriented SMEs operating across
          Pune, Mumbai, Ahmedabad, Surat, NCR, and regional industrial clusters.
        </p>
      </div>
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h2 className="font-display text-lg font-bold text-slate-900 mb-2">Key Decision Makers</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Built specifically for SME Founders, Managing Directors, CFOs, Finance Managers, Plant
          Managers, and Sustainability Officers needing auditable monthly records.
        </p>
      </div>
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h2 className="font-display text-lg font-bold text-amber-950 mb-2">Academic Honesty Standard</h2>
        <p className="text-sm text-amber-900 leading-relaxed">
          All outputs are explicitly marked as indicative estimates. We never claim automatic legal
          certification, buyer acceptance, or issued/tradable carbon credits inside this MVP.
        </p>
      </div>
    </div>

    <div>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">Initial Industrial Corridors</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {INDIAN_CORRIDORS.map((c) => (
          <div key={c.city} className="p-5 bg-white border border-slate-200 rounded-xl">
            <p className="font-display font-bold text-slate-900">{c.city}</p>
            <p className="text-xs text-emerald-700 font-medium mb-2">{c.state}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{c.focus}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="pt-4">
      <button
        type="button"
        onClick={() => navigate('/register')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
      >
        Register Your Company Workspace
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ============================================================================
// 3. PLATFORM FEATURES PAGE
// ============================================================================
export const FeaturesPage: React.FC<PageProps> = ({ navigate }) => {
  const modules = [
    {
      icon: Layers,
      title: '01. Multi-Facility Registry',
      desc: 'Maintain distinct plants, warehouses, and manufacturing units under one isolated SME organization with separate reporting boundaries.',
    },
    {
      icon: FileSpreadsheet,
      title: '02. Electricity & Fuel Ledger with CSV Import',
      desc: 'Log grid kWh, renewable solar generation, diesel, petrol, PNG, LPG, and other fuels. Bulk upload via CSV and export clean registers.',
    },
    {
      icon: Sliders,
      title: '03. Transparent Scope 1 & Scope 2 Calculator',
      desc: 'Applies versioned emission factors (kg CO2e = Activity × Factor), compares MoM & YoY trends, and flags missing reporting months separately from zero.',
    },
    {
      icon: FileText,
      title: '04. 14-Section ESG Report & PDF Export',
      desc: 'Compiles operational data, initiatives, methodology, and limitations into a branded downloadable PDF with CFO internal approval controls.',
    },
    {
      icon: Zap,
      title: '05. Sustainability Projects & Carbon Opportunity Estimator',
      desc: 'Track rooftop solar, LED, and machinery efficiency capex alongside indicative reduction estimates clearly marked as awaiting independent verification.',
    },
    {
      icon: Shield,
      title: '06. Role-Based Governance & Owner Command Centre',
      desc: 'Separate workspaces for SME Users, Company Admin/CFO, Verification Reviewers, and Platform Owners backed by audited Firestore rules.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Platform Architecture</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
            Every workflow required from utility meter to board-ready ESG report.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed mb-6">
            Thirteen company dashboard modules paired with a sixteen-module Platform Owner Command
            Centre and dedicated Verification Reviewer workflow.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              Start Free ESG Assessment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 min-h-[280px]">
          <ResilientImage
            src={MEDIA_ASSETS.efficientManufacturing}
            alt="Precision Indian manufacturing floor using energy-efficient equipment"
            fallbackTitle="Precision Manufacturing Operations"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => (
          <div key={m.title} className="p-6 bg-white border border-slate-200 rounded-xl">
            <m.icon className="w-5 h-5 text-emerald-700 mb-3" />
            <h2 className="font-display text-lg font-bold text-slate-900 mb-2">{m.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. ESG REPORTING PAGE
// ============================================================================
export const EsgReportingInfoPage: React.FC<PageProps> = ({ navigate }) => {
  const sections = [
    'Company Overview',
    'Reporting Period',
    'Organizational Boundary',
    'Energy Consumption',
    'Scope 1 Direct Emissions',
    'Scope 2 Purchased Electricity',
    'Emissions Summary & Charts',
    'Sustainability Initiatives',
    'Energy Reduction Projects',
    'Data Sources & Evidence',
    'Calculation Methodology',
    'Scope Limitations',
    'Supporting Documents Index',
    'Management Notes & Disclaimer',
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Structured Disclosure Engine</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
            Standardized 14-section indicative ESG reports built directly from plant records.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed mb-6">
            Eliminate manual copy-pasting errors. GreenYield Capital pulls verified monthly kWh,
            fuel volumes, facility boundaries, and sustainability projects straight into an editable
            report workspace with instant branded PDF generation.
          </p>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Create Your First ESG Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 min-h-[280px]">
          <ResilientImage
            src={MEDIA_ASSETS.sustainabilityCampus}
            alt="Sustainable industrial engineering headquarters with solar canopies"
            fallbackTitle="Industrial Sustainability Campus"
          />
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8">
        <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Included PDF Report Sections</h2>
        <p className="text-sm text-slate-600 mb-6">
          Every exported report includes data completeness indicators, visual Scope 1 vs Scope 2
          charts, and governance lifecycle tracking (Draft → Submitted → Under Review → Approved Internally).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map((sec, idx) => (
            <div key={sec} className="p-3.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800">
              <span className="font-mono text-xs text-emerald-700 mr-2">
                {String(idx + 1).padStart(2, '0')}.
              </span>
              {sec}
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
        <strong className="block font-semibold mb-1">Permanent Indicative Disclaimer</strong>
        {PERMANENT_ESG_DISCLAIMER}
      </div>
    </div>
  );
};

// ============================================================================
// 5. PUBLIC CARBON FOOTPRINT CALCULATOR PAGE
// ============================================================================
export const PublicCalculatorPage: React.FC<PageProps> = ({ navigate }) => {
  const [electricityKwh, setElectricityKwh] = useState(50000);
  const [renewableKwh, setRenewableKwh] = useState(12000);
  const [dieselLitres, setDieselLitres] = useState(1800);
  const [petrolLitres, setPetrolLitres] = useState(400);
  const [naturalGasScm, setNaturalGasScm] = useState(1200);
  const [lpgKg, setLpgKg] = useState(350);

  const results = useMemo(() => {
    const fElec = DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === 'electricity')!.factorValue;
    const fDiesel = DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === 'diesel')!.factorValue;
    const fPetrol = DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === 'petrol')!.factorValue;
    const fGas = DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === 'natural_gas')!.factorValue;
    const fLpg = DEFAULT_DEMO_EMISSION_FACTORS.find((f) => f.energyCategory === 'lpg')!.factorValue;

    const elec = calculateActivityEmissions({
      energyCategory: 'electricity',
      quantity: electricityKwh,
      unit: 'kWh',
      factorValue: fElec,
      renewableQuantity: renewableKwh,
    });
    const diesel = calculateActivityEmissions({ energyCategory: 'diesel', quantity: dieselLitres, unit: 'Litres', factorValue: fDiesel });
    const petrol = calculateActivityEmissions({ energyCategory: 'petrol', quantity: petrolLitres, unit: 'Litres', factorValue: fPetrol });
    const gas = calculateActivityEmissions({ energyCategory: 'natural_gas', quantity: naturalGasScm, unit: 'SCM', factorValue: fGas });
    const lpg = calculateActivityEmissions({ energyCategory: 'lpg', quantity: lpgKg, unit: 'kg', factorValue: fLpg });

    const scope1 = Number((diesel.estimatedTonnesCo2e + petrol.estimatedTonnesCo2e + gas.estimatedTonnesCo2e + lpg.estimatedTonnesCo2e).toFixed(3));
    const scope2 = elec.estimatedTonnesCo2e;
    const total = Number((scope1 + scope2).toFixed(3));

    const chartData = [
      { source: 'Grid Power (S2)', tonnes: scope2 },
      { source: 'Diesel (S1)', tonnes: diesel.estimatedTonnesCo2e },
      { source: 'Natural Gas (S1)', tonnes: gas.estimatedTonnesCo2e },
      { source: 'LPG (S1)', tonnes: lpg.estimatedTonnesCo2e },
      { source: 'Petrol (S1)', tonnes: petrol.estimatedTonnesCo2e },
    ];

    return { scope1, scope2, total, chartData };
  }, [electricityKwh, renewableKwh, dieselLitres, petrolLitres, naturalGasScm, lpgKg]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Interactive Carbon Footprint Calculator</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          Scope 1 & Scope 2 Operational Emissions Estimator
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Enter monthly or period activity quantities below to compute indicative CO2e emissions
          using clearly labelled demonstration factors. Formula: <span className="font-mono">kg CO2e = Net Activity × Emission Factor</span>,
          converted to tonnes by dividing by <span className="font-mono">1,000</span>. Scope 3 is excluded in this MVP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
            Activity Data Inputs
          </h2>
          {[
            { label: 'Total Electricity Consumed (kWh)', val: electricityKwh, set: setElectricityKwh, note: 'Demo factor: 0.716 kg CO2e/kWh (Scope 2)' },
            { label: 'Renewable / Captive Solar Deducted (kWh)', val: renewableKwh, set: setRenewableKwh, note: 'Reduces net purchased grid electricity' },
            { label: 'Diesel Consumption (Litres)', val: dieselLitres, set: setDieselLitres, note: 'Demo factor: 2.68 kg CO2e/L (Scope 1)' },
            { label: 'Petrol Consumption (Litres)', val: petrolLitres, set: setPetrolLitres, note: 'Demo factor: 2.31 kg CO2e/L (Scope 1)' },
            { label: 'Natural Gas (SCM)', val: naturalGasScm, set: setNaturalGasScm, note: 'Demo factor: 2.02 kg CO2e/SCM (Scope 1)' },
            { label: 'LPG Consumption (kg)', val: lpgKg, set: setLpgKg, note: 'Demo factor: 2.98 kg CO2e/kg (Scope 1)' },
          ].map((field) => (
            <label key={field.label} className="block">
              <span className="text-xs font-semibold text-slate-700">{field.label}</span>
              <input
                type="number"
                min={0}
                value={field.val}
                onChange={(e) => field.set(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">{field.note}</span>
            </label>
          ))}
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">Estimated Scope 1 (Direct)</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {formatNumber(results.scope1, 2)} tCO2e
              </p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">Estimated Scope 2 (Grid)</p>
              <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {formatNumber(results.scope2, 2)} tCO2e
              </p>
            </div>
            <div className="p-5 bg-[#0B172A] text-white border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-300">Total Estimated Emissions</p>
              <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                {formatNumber(results.total, 2)} tCO2e
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-display text-sm font-bold text-slate-900 mb-4">
              Indicative Emissions Breakdown by Source (tonnes CO2e)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    formatter={(value: unknown) => [`${formatNumber(Number(value), 3)} tCO2e`, 'Estimated']}
                  />
                  <Bar dataKey="tonnes" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Save records & generate an ESG PDF report</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Sign in to persist monthly utility bills per facility and track year-on-year reductions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-4 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Register Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. SUSTAINABILITY TRACKING PAGE
// ============================================================================
export const SustainabilityInfoPage: React.FC<PageProps> = ({ navigate }) => (
  <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
      <div className="lg:col-span-6 flex flex-col justify-center">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Energy Efficiency & Opportunity Modelling</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4" style={{ textWrap: 'balance' }}>
          Track plant decarbonisation projects and estimate potential green value.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed mb-6">
          Document Rooftop Solar installations, LED upgrades, VFD motors, Waste Heat Recovery, and
          fuel optimization programs alongside INR capital investment and measured kWh savings.
        </p>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
        >
          Open Sustainability Workspace
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-200 min-h-[280px]">
        <ResilientImage
          src={MEDIA_ASSETS.electricGridInfra}
          alt="Electric power substation and commercial EV logistics infrastructure"
          fallbackTitle="Electric Grid & Clean Infrastructure"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        {
          title: 'Project Portfolio Governance',
          desc: 'Track status from Planned → In Progress → Completed → Under Review with linked supporting bills and facility records.',
        },
        {
          title: 'Data-Grounded Savings Only',
          desc: 'Estimated CO2e savings are computed strictly from logged kWh savings and configured emission factors—never arbitrary scores.',
        },
        {
          title: 'Honest Carbon Opportunity Estimator',
          desc: 'Model hypothetical value using an editable ₹/tCO2e assumption, explicitly tagged Awaiting Independent Verification · Not Issued · Not Tradable.',
        },
      ].map((c) => (
        <div key={c.title} className="p-6 bg-white border border-slate-200 rounded-xl">
          <BarChart3 className="w-5 h-5 text-emerald-700 mb-3" />
          <h2 className="font-display text-base font-bold text-slate-900 mb-2">{c.title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>

    <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
      <strong>Carbon Credit Non-Issuance Disclosure:</strong> {CARBON_OPPORTUNITY_NOTICE}
    </div>
  </div>
);

// ============================================================================
// 7. PRICING PAGE (Business Plan Assumptions — No Paid Gateway)
// ============================================================================
export const PricingPage: React.FC<PageProps> = ({ navigate }) => {
  const tiers = [
    {
      audience: 'For academic evaluation & pilot SMEs',
      name: 'Free Trial / Academic Demo',
      price: '₹0',
      cadence: 'No payment gateway · Admin-managed',
      limits: [
        'Up to 2 industrial facilities',
        'Full Scope 1 & Scope 2 utility ledger',
        'Indicative PDF ESG report downloads',
        'Sustainability project & opportunity estimator',
        'Manual admin onboarding & support',
      ],
      highlight: false,
    },
    {
      audience: 'For single-corridor manufacturing SMEs',
      name: 'Standard SME Annual (Base Plan)',
      price: formatInr(60000),
      cadence: 'per year · Planning assumption',
      limits: [
        'Up to 5 facilities across India',
        'Unlimited monthly electricity & fuel logs + CSV import',
        'Company Admin / CFO review & approval workflow',
        'Dedicated Verification Reviewer feedback queue',
        'Priority support desk & audit history export',
      ],
      highlight: true,
    },
    {
      audience: 'For multi-plant export suppliers',
      name: 'Growth Multi-Plant (Ambitious Plan)',
      price: formatInr(75000),
      cadence: 'per year · Planning assumption',
      limits: [
        'Up to 15 facilities & 25 team members',
        'Custom reporting boundaries & buyer summaries',
        'Multi-year YoY & MoM emissions benchmarking',
        'Dedicated CFO financial & capex savings tracking',
        'Admin-assisted onboarding & factor customization',
      ],
      highlight: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Business Plan Pricing Structure</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
          Transparent annual SaaS plans designed for Indian SME budgets.
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          For this college MVP demonstration, no online payment gateway is integrated. All companies
          start on a free academic demo allocation, and subscription billing status is tracked
          manually by the Platform Owner.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`p-7 rounded-xl border flex flex-col justify-between ${
              tier.highlight
                ? 'bg-[#0B172A] text-white border-slate-800'
                : 'bg-white text-slate-900 border-slate-200'
            }`}
          >
            <div>
              <p className={`text-xs font-medium mb-1 ${tier.highlight ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {tier.audience}
              </p>
              <h2 className="font-display text-xl font-bold mb-4">{tier.name}</h2>
              <div className="pb-5 mb-5 border-b border-slate-200/20">
                <span className="font-mono text-3xl font-bold tabular-nums">{tier.price}</span>
                <span className={`block text-xs mt-1 ${tier.highlight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tier.cadence}
                </span>
              </div>
              <ul className="space-y-3 text-sm">
                {tier.limits.map((lim) => (
                  <li key={lim} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlight ? 'text-emerald-400' : 'text-emerald-700'}`}
                    />
                    <span className={tier.highlight ? 'text-slate-200' : 'text-slate-700'}>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/register')}
              className={`mt-8 w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                tier.highlight
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              Start Free Trial
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 8. CONTACT & REQUEST DEMO PAGE (Persists to Firestore public_inquiries)
// ============================================================================
export const ContactPage: React.FC<PageProps> = () => {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Pune');
  const [inquiryType, setInquiryType] = useState<PublicInquiry['inquiryType']>('Request Demo');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !companyName.trim() || !email.includes('@') || message.trim().length < 5) {
      setError('Please complete all required fields with a valid email address and brief message.');
      return;
    }
    setSubmitting(true);
    try {
      const id = await submitPublicInquiry({
        fullName,
        companyName,
        email,
        phone,
        city,
        inquiryType,
        message,
      });
      setSubmittedId(id);
      setFullName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">Contact & Demo Desk</p>
            <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Schedule a guided walkthrough for your SME finance or plant team.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every inquiry submitted here is persisted directly to our Platform Owner Command
              Centre in Cloud Firestore for review and follow-up.
            </p>
          </div>
          <div className="border-t border-slate-200 pt-5 space-y-3 text-sm text-slate-700">
            <div>
              <span className="text-xs text-slate-500 block">Primary Coverage</span>
              <span className="font-medium">Pune · Mumbai · Ahmedabad · Surat · Delhi NCR</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Academic Project Desk</span>
              <span className="font-mono text-xs">contact@greenyield-capital.demo</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
          {submittedId ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h2 className="font-display text-xl font-bold text-slate-900">
                Inquiry Recorded Successfully
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your request has been logged in the GreenYield Capital Support Desk (Ref:{' '}
                <span className="font-mono text-xs">{submittedId}</span>). Our platform team will
                respond shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedId(null)}
                className="mt-3 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Full Name *</span>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Deshmukh"
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Company Name *</span>
                  <input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Sahyadri Auto Components Pvt Ltd"
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Work Email *</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cfo@company.in"
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Mobile / Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Industrial City / Corridor</span>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Enquiry Type *</span>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value as PublicInquiry['inquiryType'])}
                    className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Request Demo">Request Demo</option>
                    <option value="ESG Assessment">ESG Assessment</option>
                    <option value="Partnership">Partnership</option>
                    <option value="General Enquiry">General Enquiry</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">How can we help? *</span>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your number of plants, energy sources, or buyer ESG disclosure timeline."
                  className="mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
              {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? 'Submitting Inquiry...' : 'Submit Demo & Contact Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
