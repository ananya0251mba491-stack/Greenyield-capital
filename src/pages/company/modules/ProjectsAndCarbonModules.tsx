import React, { useMemo, useState } from 'react';
import { Edit2, Leaf, Plus, ShieldAlert, Trash2, TrendingDown } from 'lucide-react';
import {
  CarbonOpportunity,
  Company,
  EmissionFactor,
  Facility,
  ProjectCategory,
  ProjectStatus,
  SustainabilityProject,
  UtilityRecord,
} from '../../../types/models';
import { CARBON_OPPORTUNITY_NOTICE, PROJECT_CATEGORIES } from '../../../constants/defaults';
import {
  aggregateEmissions,
  formatInr,
  formatNumber,
  getActiveFactorForCategory,
} from '../../../utils/calculations';
import {
  deleteCarbonOpportunity,
  deleteSustainabilityProject,
  saveCarbonOpportunity,
  saveSustainabilityProject,
} from '../../../services/firestoreService';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusText';

// ============================================================================
// MODULE 7: SUSTAINABILITY PROJECTS
// ============================================================================
export const SustainabilityProjectsModule: React.FC<{
  company: Company;
  facilities: Facility[];
  projects: SustainabilityProject[];
  factors: EmissionFactor[];
  isCompanyAdmin: boolean;
  actorRole: string;
}> = ({ company, facilities, projects, factors, isCompanyAdmin, actorRole }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SustainabilityProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gridFactor = getActiveFactorForCategory('electricity', factors).factorValue;

  const [form, setForm] = useState({
    name: '',
    facilityId: facilities[0]?.id || '',
    category: PROJECT_CATEGORIES[0] as ProjectCategory,
    startDate: new Date().toISOString().slice(0, 10),
    investmentInr: '0',
    estimatedEnergySavingsKwh: '0',
    actualEnergySavingsKwh: '0',
    status: 'In Progress' as ProjectStatus,
    supportingDocName: '',
    notes: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      facilityId: facilities[0]?.id || '',
      category: PROJECT_CATEGORIES[0],
      startDate: new Date().toISOString().slice(0, 10),
      investmentInr: '',
      estimatedEnergySavingsKwh: '',
      actualEnergySavingsKwh: '0',
      status: 'Planned',
      supportingDocName: '',
      notes: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: SustainabilityProject) => {
    setEditing(p);
    setForm({
      name: p.name,
      facilityId: p.facilityId,
      category: p.category,
      startDate: p.startDate,
      investmentInr: String(p.investmentInr),
      estimatedEnergySavingsKwh: String(p.estimatedEnergySavingsKwh),
      actualEnergySavingsKwh: String(p.actualEnergySavingsKwh),
      status: p.status,
      supportingDocName: p.supportingDocName || '',
      notes: p.notes || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.facilityId) {
      setError('Add and select a facility before logging a sustainability project.');
      return;
    }
    const inv = Number(form.investmentInr || 0);
    const estKwh = Number(form.estimatedEnergySavingsKwh || 0);
    const actKwh = Number(form.actualEnergySavingsKwh || 0);
    if (inv < 0 || estKwh < 0 || actKwh < 0) {
      setError('Investment and energy savings cannot be negative.');
      return;
    }

    const fac = facilities.find((f) => f.id === form.facilityId);
    // Calculate CO2e savings strictly from submitted energy savings (prefer actual if > 0 else estimated)
    const basisKwh = actKwh > 0 ? actKwh : estKwh;
    const estimatedCo2eReductionTonnes = Number(((basisKwh * gridFactor) / 1000).toFixed(3));

    setSaving(true);
    try {
      await saveSustainabilityProject(
        company,
        {
          id: editing?.id,
          facilityId: form.facilityId,
          facilityName: fac?.name || 'Primary Facility',
          name: form.name,
          category: form.category,
          startDate: form.startDate,
          investmentInr: inv,
          estimatedEnergySavingsKwh: estKwh,
          actualEnergySavingsKwh: actKwh,
          estimatedCo2eReductionTonnes,
          status: form.status,
          supportingDocName: form.supportingDocName,
          notes: form.notes,
        },
        actorRole
      );
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return projects.reduce(
      (acc, p) => ({
        capex: acc.capex + p.investmentInr,
        estKwh: acc.estKwh + p.estimatedEnergySavingsKwh,
        actKwh: acc.actKwh + p.actualEnergySavingsKwh,
        co2e: acc.co2e + p.estimatedCo2eReductionTonnes,
      }),
      { capex: 0, estKwh: 0, actKwh: 0, co2e: 0 }
    );
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Sustainability & Energy-Efficiency Projects ({projects.length})
          </h2>
          <p className="text-xs text-slate-500">
            Track Rooftop Solar, LED Lighting, Machinery Upgrades, Waste Heat Recovery & Fuel Efficiency.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Sustainability Project
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Total CapEx Logged</p>
          <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1">{formatInr(totals.capex)}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Estimated Energy Savings</p>
          <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1">{formatNumber(totals.estKwh, 0)} kWh</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Actual Recorded Savings</p>
          <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums mt-1">{formatNumber(totals.actKwh, 0)} kWh</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Indicative CO2e Savings</p>
          <p className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-1">{formatNumber(totals.co2e, 2)} tCO2e</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Leaf className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-900 mb-1">No sustainability projects yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Log rooftop solar installations, LED upgrades, or machinery retrofits to track energy
            savings and link them to your ESG reports.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Log First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">{p.category}</p>
                    <h3 className="font-display text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.facilityName} · Started {p.startDate}
                    </p>
                  </div>
                  <StatusText status={p.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 py-3 my-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block">Investment</span>
                    <span className="font-mono font-semibold text-slate-900">{formatInr(p.investmentInr)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Actual / Est. kWh</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatNumber(p.actualEnergySavingsKwh, 0)} / {formatNumber(p.estimatedEnergySavingsKwh, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Est. Reduction</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatNumber(p.estimatedCo2eReductionTonnes, 2)} tCO2e
                    </span>
                  </div>
                </div>
                {p.notes && <p className="text-xs text-slate-600">{p.notes}</p>}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                  {p.supportingDocName ? `Doc: ${p.supportingDocName}` : 'No attachment linked'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {isCompanyAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteSustainabilityProject(company, p, actorRole)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Sustainability Project' : 'Log Sustainability Project'}
        subtitle={`Estimated CO2e reduction is calculated from submitted savings at active grid factor (${gridFactor} kg CO2e/kWh).`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Project Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. 250 kWp Rooftop Solar Array — Unit 1"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Facility *</span>
              <select
                required
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {facilities.length === 0 && <option value="">Add a facility first</option>}
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Project Category *</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ProjectCategory })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {PROJECT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Start Date *</span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Status *</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Under Review">Under Review</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Investment (₹ INR) *</span>
              <input
                type="number"
                min={0}
                required
                value={form.investmentInr}
                onChange={(e) => setForm({ ...form, investmentInr: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Est. Savings (kWh) *</span>
              <input
                type="number"
                min={0}
                required
                value={form.estimatedEnergySavingsKwh}
                onChange={(e) => setForm({ ...form, estimatedEnergySavingsKwh: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Actual Savings (kWh)</span>
              <input
                type="number"
                min={0}
                value={form.actualEnergySavingsKwh}
                onChange={(e) => setForm({ ...form, actualEnergySavingsKwh: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Supporting Document Filename</span>
            <input
              value={form.supportingDocName}
              onChange={(e) => setForm({ ...form, supportingDocName: e.target.value })}
              placeholder="e.g. solar-commissioning-cert.pdf"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'Saving...' : editing ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 9: CARBON OPPORTUNITY ESTIMATOR (Strictly Indicative, Non-Issuance)
// ============================================================================
export const CarbonOpportunityModule: React.FC<{
  company: Company;
  utilityRecords: UtilityRecord[];
  projects: SustainabilityProject[];
  opportunities: CarbonOpportunity[];
  isCompanyAdmin: boolean;
  actorRole: string;
}> = ({ company, utilityRecords, projects, opportunities, isCompanyAdmin, actorRole }) => {
  const agg = aggregateEmissions(utilityRecords);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [baselineTonnes, setBaselineTonnes] = useState(
    String(Math.max(agg.previousPeriodTonnes, agg.totalTonnes + 40).toFixed(2))
  );
  const [currentTonnes, setCurrentTonnes] = useState(String(agg.totalTonnes.toFixed(2)));
  const [hypotheticalPrice, setHypotheticalPrice] = useState('650');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const bNum = Math.max(0, Number(baselineTonnes) || 0);
  const cNum = Math.max(0, Number(currentTonnes) || 0);
  const priceNum = Math.max(0, Number(hypotheticalPrice) || 0);
  const estReduction = Number(Math.max(0, bNum - cNum).toFixed(3));
  const estValueInr = Math.round(estReduction * priceNum);

  const handleSaveEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const proj = projects.find((p) => p.id === selectedProjectId);
    try {
      await saveCarbonOpportunity(
        company,
        {
          projectId: proj?.id || '',
          projectName: proj?.name || 'Operational Energy Reduction Baseline',
          baselineEmissionsTonnes: bNum,
          currentEmissionsTonnes: cNum,
          estimatedReductionTonnes: estReduction,
          hypotheticalPriceInr: priceNum,
          estimatedPotentialValueInr: estValueInr,
          notes,
        },
        actorRole
      );
      setNotice('Indicative carbon opportunity estimate recorded (Not Issued · Not Tradable).');
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-900">
          Carbon Opportunity Estimator (Indicative Only)
        </h2>
        <p className="text-xs text-slate-500">
          Model hypothetical financial opportunity from operational reductions. Actual credit
          issuance, registry approval, and trading remain strictly outside this MVP.
        </p>
      </div>

      {/* Mandatory Non-Issuance Honesty Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">
            Awaiting Independent Verification · Not Issued · Not Tradable
          </p>
          <p className="leading-relaxed">{CARBON_OPPORTUNITY_NOTICE}</p>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
          {notice}
        </div>
      )}

      {/* Interactive Estimator Form */}
      <form onSubmit={handleSaveEstimate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="font-display text-sm font-bold text-slate-900">
          Model New Potential Credit Opportunity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Supporting Project</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">General Plant Reduction</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatNumber(p.estimatedCo2eReductionTonnes, 1)} t)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Baseline Emissions (tCO2e)</span>
            <input
              type="number"
              step="any"
              min={0}
              value={baselineTonnes}
              onChange={(e) => setBaselineTonnes(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Current Estimated Emissions (tCO2e)</span>
            <input
              type="number"
              step="any"
              min={0}
              value={currentTonnes}
              onChange={(e) => setCurrentTonnes(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Editable Hypothetical Price (₹ / tCO2e)</span>
            <input
              type="number"
              min={0}
              value={hypotheticalPrice}
              onChange={(e) => setHypotheticalPrice(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Basis / Assumption Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Illustrative domestic voluntary market assumption pending independent audit"
            className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </label>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <p className="text-xs text-slate-500">Estimated Reduction</p>
            <p className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatNumber(estReduction, 3)} tCO2e
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Potential Credit Opportunity (Hypothetical)</p>
            <p className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {formatInr(estValueInr)}
            </p>
            <p className="text-[11px] text-amber-800">Awaiting Independent Verification · Not Issued · Not Tradable</p>
          </div>
          <div className="sm:text-right">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Opportunity Estimate'}
            </button>
          </div>
        </div>
      </form>

      {/* Saved Estimates Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-slate-900">
            Saved Indicative Estimates ({opportunities.length})
          </h3>
          <TrendingDown className="w-4 h-4 text-emerald-700" />
        </div>
        {opportunities.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No carbon opportunity estimates logged yet. Use the modelling tool above to record an indicative estimate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">Supporting Project</th>
                  <th className="py-3 px-4 font-semibold text-right">Baseline / Current</th>
                  <th className="py-3 px-4 font-semibold text-right">Estimated Reduction</th>
                  <th className="py-3 px-4 font-semibold text-right">Hypothetical Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Potential Value</th>
                  <th className="py-3 px-4 font-semibold">Verification & Issuance Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{o.projectName || 'General Reduction'}</p>
                      {o.notes && <p className="text-[11px] text-slate-500">{o.notes}</p>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatNumber(o.baselineEmissionsTonnes, 1)} → {formatNumber(o.currentEmissionsTonnes, 1)} t
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatNumber(o.estimatedReductionTonnes, 3)} tCO2e
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{formatInr(o.hypotheticalPriceInr)}/t</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatInr(o.estimatedPotentialValueInr)}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-amber-800">
                      <span className="block font-semibold">{o.verificationStatus}</span>
                      <span>{o.issuanceStatus}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isCompanyAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteCarbonOpportunity(company, o, actorRole)}
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete estimate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
