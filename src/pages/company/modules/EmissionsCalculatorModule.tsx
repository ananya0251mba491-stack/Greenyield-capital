import React, { useState } from 'react';
import { Calculator, Info, Save } from 'lucide-react';
import {
  Company,
  EmissionFactor,
  EmissionsCalculation,
  UtilityRecord,
} from '../../../types/models';
import { DEFAULT_DEMO_EMISSION_FACTORS } from '../../../constants/defaults';
import { aggregateEmissions, formatNumber } from '../../../utils/calculations';
import { saveEmissionsCalculation } from '../../../services/firestoreService';

interface EmissionsCalculatorModuleProps {
  company: Company;
  records: UtilityRecord[];
  factors: EmissionFactor[];
  calculations: EmissionsCalculation[];
  actorRole: string;
}

export const EmissionsCalculatorModule: React.FC<EmissionsCalculatorModuleProps> = ({
  company,
  records,
  factors,
  calculations,
  actorRole,
}) => {
  const [periodLabel, setPeriodLabel] = useState('FY 2025-26');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const agg = aggregateEmissions(records);
  const activeFactors = factors.length > 0 ? factors.filter((f) => f.isActive) : DEFAULT_DEMO_EMISSION_FACTORS;

  const handleSaveSnapshot = async () => {
    setSaving(true);
    setSavedNotice(null);
    try {
      await saveEmissionsCalculation(
        company,
        {
          reportingPeriod: periodLabel.trim() || 'FY 2025-26',
          scope1Tonnes: agg.scope1Tonnes,
          scope2Tonnes: agg.scope2Tonnes,
          totalTonnes: agg.totalTonnes,
          electricityKwh: agg.totalElectricityKwh,
          renewableKwh: agg.renewableElectricityKwh,
          recordsCount: records.length,
          missingMonths: agg.missingMonthsInYear,
          factorSnapshotNote: activeFactors.map((f) => `${f.energyCategory}:${f.factorValue}(${f.version})`).join(', '),
        },
        actorRole
      );
      setSavedNotice('Emissions calculation snapshot saved to Cloud Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Scope 1 & Scope 2 Carbon Emissions Calculator
          </h2>
          <p className="text-xs text-slate-500">
            Formula: Estimated Emissions (kg CO2e) = Net Activity Data × Emission Factor · Tonnes CO2e = kg CO2e ÷ 1,000.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            aria-label="Reporting period label"
            className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white w-36"
          />
          <button
            type="button"
            onClick={handleSaveSnapshot}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Calculation Snapshot'}
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
          {savedNotice}
        </div>
      )}

      {/* Explicit Scope Boundary & Missing Data Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Scope Boundary & Demonstration Factors:</strong> Calculations cover Scope 1
            (direct fuels) and Scope 2 (net purchased electricity) using clearly labelled
            demonstration factors configurable by the Platform Owner. Scope 3 value-chain emissions
            are intentionally excluded from this MVP.
          </p>
          <p>
            <strong>Missing Data vs. Zero Emissions:</strong>{' '}
            {records.length === 0
              ? 'No monthly records have been uploaded yet — missing data is NOT equivalent to zero emissions.'
              : `${agg.reportedMonthsCount} month(s) reported; ${agg.missingMonthsInYear} month(s) currently unsubmitted in the latest reporting year (Completeness: ${agg.dataCompletenessPct}%).`}
          </p>
        </div>
      </div>

      {/* Live Calculated Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Scope 1 Direct Fuel</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatNumber(agg.scope1Tonnes, 3)} tCO2e
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {formatNumber(agg.scope1Tonnes * 1000, 1)} kg CO2e
          </p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Scope 2 Purchased Electricity</p>
          <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {formatNumber(agg.scope2Tonnes, 3)} tCO2e
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {formatNumber(agg.renewableElectricityKwh, 0)} kWh renewable deducted
          </p>
        </div>
        <div className="p-5 bg-[#0B172A] text-white border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-300">Total Estimated Operational</p>
          <p className="font-mono text-2xl font-bold text-emerald-400 tabular-nums mt-1">
            {formatNumber(agg.totalTonnes, 3)} tCO2e
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Indicative unverified estimate
          </p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Period Changes (MoM / YoY)</p>
          <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1">
            MoM: {agg.momChangePct !== null ? `${agg.momChangePct > 0 ? '+' : ''}${agg.momChangePct}%` : 'N/A'}
          </p>
          <p className="font-mono text-xs text-slate-600 mt-1">
            YoY: {agg.yoyChangePct !== null ? `${agg.yoyChangePct > 0 ? '+' : ''}${agg.yoyChangePct}%` : 'Need 2+ years'}
          </p>
        </div>
      </div>

      {/* Period & Facility Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Emissions by Reporting Month</h3>
          {agg.byMonth.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No monthly records logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Month</th>
                    <th className="py-2 px-3 font-semibold text-right">Scope 1 (t)</th>
                    <th className="py-2 px-3 font-semibold text-right">Scope 2 (t)</th>
                    <th className="py-2 pl-3 font-semibold text-right">Total (t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {agg.byMonth.map((m) => (
                    <tr key={m.month}>
                      <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">{m.month}</td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(m.scope1, 3)}</td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(m.scope2, 3)}</td>
                      <td className="py-2.5 pl-3 text-right font-semibold text-slate-900">{formatNumber(m.total, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-slate-900 mb-3">Emissions by Facility</h3>
          {agg.byFacility.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No facility emissions data logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Facility</th>
                    <th className="py-2 px-3 font-semibold text-right">Scope 1 (t)</th>
                    <th className="py-2 px-3 font-semibold text-right">Scope 2 (t)</th>
                    <th className="py-2 pl-3 font-semibold text-right">Total (t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {agg.byFacility.map((f) => (
                    <tr key={f.facilityId}>
                      <td className="py-2.5 pr-3 font-sans font-medium text-slate-900">{f.facilityName}</td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(f.scope1, 3)}</td>
                      <td className="py-2.5 px-3 text-right">{formatNumber(f.scope2, 3)}</td>
                      <td className="py-2.5 pl-3 text-right font-semibold text-slate-900">{formatNumber(f.total, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Configured Emission Factors Register */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              Active Configured Emission Factors (Demonstration Register)
            </h3>
            <p className="text-xs text-slate-500">
              Maintained by Platform Owner — demonstration factors are explicitly labelled until official factors are configured.
            </p>
          </div>
          <Calculator className="w-4 h-4 text-emerald-700" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-semibold">Category & Label</th>
                <th className="py-2 px-3 font-semibold">Scope</th>
                <th className="py-2 px-3 font-semibold text-right">Factor</th>
                <th className="py-2 px-3 font-semibold">Version / Effective</th>
                <th className="py-2 pl-3 font-semibold">Source Attribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeFactors.map((f) => (
                <tr key={f.id}>
                  <td className="py-2.5 pr-3 font-medium text-slate-900">
                    {f.label}
                    {f.isDemoFactor && (
                      <span className="block text-[11px] text-amber-700 font-normal">
                        Demonstration Factor
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{f.scope === 'scope_1' ? 'Scope 1' : 'Scope 2'}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                    {f.factorValue} {f.factorUnit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {f.version} · {f.effectiveDate}
                  </td>
                  <td className="py-2.5 pl-3 text-slate-600 max-w-xs">{f.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Snapshots History */}
      {calculations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold text-slate-900 mb-3">
            Saved Calculation Snapshots ({calculations.length})
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {calculations.map((c) => (
              <div key={c.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{c.reportingPeriod}</span>
                  <span className="text-slate-500 ml-2">
                    · {c.recordsCount} records · {c.missingMonths} missing month(s)
                  </span>
                </div>
                <div className="font-mono tabular-nums text-slate-800">
                  S1: {formatNumber(c.scope1Tonnes, 2)} t · S2: {formatNumber(c.scope2Tonnes, 2)} t ·{' '}
                  <strong className="text-emerald-700">Total: {formatNumber(c.totalTonnes, 2)} tCO2e</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
