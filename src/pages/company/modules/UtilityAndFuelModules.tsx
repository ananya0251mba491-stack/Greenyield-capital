import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Download,
  Edit2,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Company,
  EmissionFactor,
  EnergyCategory,
  Facility,
  UtilityRecord,
} from '../../../types/models';
import { ENERGY_CATEGORY_META } from '../../../constants/defaults';
import {
  calculateActivityEmissions,
  exportToCsv,
  formatNumber,
  getActiveFactorForCategory,
  parseUtilityCsv,
} from '../../../utils/calculations';
import {
  deleteUtilityRecord,
  saveSupportingDocument,
  saveUtilityRecord,
} from '../../../services/firestoreService';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusText';

interface UtilityAndFuelModuleProps {
  mode: 'utility' | 'fuel';
  company: Company;
  facilities: Facility[];
  records: UtilityRecord[];
  factors: EmissionFactor[];
  isCompanyAdmin: boolean;
  actorRole: string;
}

export const UtilityAndFuelModule: React.FC<UtilityAndFuelModuleProps> = ({
  mode,
  company,
  facilities,
  records,
  factors,
  isCompanyAdmin,
  actorRole,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [energyFilter, setEnergyFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UtilityRecord | null>(null);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultCat: EnergyCategory = mode === 'fuel' ? 'diesel' : 'electricity';
  const [form, setForm] = useState<{
    facilityId: string;
    reportingMonth: string;
    energyCategory: EnergyCategory;
    fuelTypeLabel: string;
    quantity: string;
    unit: string;
    electricitySource: string;
    renewableQuantity: string;
    attachmentName: string;
    notes: string;
  }>({
    facilityId: facilities[0]?.id || '',
    reportingMonth: new Date().toISOString().slice(0, 7),
    energyCategory: defaultCat,
    fuelTypeLabel: '',
    quantity: '',
    unit: ENERGY_CATEGORY_META[defaultCat].defaultUnit,
    electricitySource: 'State Grid (MSEDCL / DISCOM)',
    renewableQuantity: '0',
    attachmentName: '',
    notes: '',
  });

  const scopedRecords = useMemo(() => {
    const base =
      mode === 'fuel'
        ? records.filter((r) => r.energyCategory !== 'electricity')
        : records;

    return base
      .filter((r) => {
        if (facilityFilter !== 'all' && r.facilityId !== facilityFilter) return false;
        if (energyFilter !== 'all' && r.energyCategory !== energyFilter) return false;
        if (monthFilter && r.reportingMonth !== monthFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            r.facilityName.toLowerCase().includes(q) ||
            r.energyCategory.toLowerCase().includes(q) ||
            (r.fuelTypeLabel || '').toLowerCase().includes(q) ||
            r.reportingMonth.includes(q) ||
            (r.notes || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.reportingMonth.localeCompare(a.reportingMonth));
  }, [records, mode, facilityFilter, energyFilter, monthFilter, searchTerm]);

  const uniqueMonths = useMemo(
    () => Array.from(new Set(records.map((r) => r.reportingMonth))).sort().reverse(),
    [records]
  );

  const openAddModal = () => {
    setEditing(null);
    const cat: EnergyCategory = mode === 'fuel' ? 'diesel' : 'electricity';
    setForm({
      facilityId: facilities[0]?.id || '',
      reportingMonth: new Date().toISOString().slice(0, 7),
      energyCategory: cat,
      fuelTypeLabel: '',
      quantity: '',
      unit: ENERGY_CATEGORY_META[cat].defaultUnit,
      electricitySource: 'State Grid (DISCOM)',
      renewableQuantity: '0',
      attachmentName: '',
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (rec: UtilityRecord) => {
    setEditing(rec);
    setForm({
      facilityId: rec.facilityId,
      reportingMonth: rec.reportingMonth,
      energyCategory: rec.energyCategory,
      fuelTypeLabel: rec.fuelTypeLabel || '',
      quantity: String(rec.quantity),
      unit: rec.unit,
      electricitySource: rec.electricitySource || 'State Grid',
      renewableQuantity: String(rec.renewableQuantity ?? 0),
      attachmentName: rec.attachmentName || '',
      notes: rec.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleCategoryChange = (cat: EnergyCategory) => {
    setForm((prev) => ({
      ...prev,
      energyCategory: cat,
      unit: ENERGY_CATEGORY_META[cat].defaultUnit,
    }));
  };

  const previewMetrics = useMemo(() => {
    const qty = Number(form.quantity);
    const renew = Number(form.renewableQuantity || 0);
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(renew) || renew < 0) {
      return null;
    }
    const factor = getActiveFactorForCategory(form.energyCategory, factors);
    try {
      const calc = calculateActivityEmissions({
        energyCategory: form.energyCategory,
        quantity: qty,
        unit: form.unit,
        factorValue: factor.factorValue,
        renewableQuantity: form.energyCategory === 'electricity' ? renew : 0,
      });
      return { ...calc, factor };
    } catch {
      return null;
    }
  }, [form.energyCategory, form.quantity, form.unit, form.renewableQuantity, factors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.facilityId) {
      setFormError('Please add and select a facility first.');
      return;
    }
    if (!/^[0-9]{4}-[0-9]{2}$/.test(form.reportingMonth)) {
      setFormError('Reporting month must use YYYY-MM format.');
      return;
    }

    const qty = Number(form.quantity);
    const renew = Number(form.renewableQuantity || 0);
    if (!Number.isFinite(qty) || qty < 0) {
      setFormError('Quantity must be a valid non-negative number.');
      return;
    }
    if (!Number.isFinite(renew) || renew < 0) {
      setFormError('Renewable electricity quantity cannot be negative.');
      return;
    }

    const fac = facilities.find((f) => f.id === form.facilityId);
    const factor = getActiveFactorForCategory(form.energyCategory, factors);
    const calc = calculateActivityEmissions({
      energyCategory: form.energyCategory,
      quantity: qty,
      unit: form.unit,
      factorValue: factor.factorValue,
      renewableQuantity: form.energyCategory === 'electricity' ? renew : 0,
    });

    setSaving(true);
    try {
      let attachmentDocId = editing?.attachmentDocId || '';
      if (form.attachmentName.trim() && form.attachmentName !== editing?.attachmentName) {
        attachmentDocId = await saveSupportingDocument(
          company,
          {
            facilityId: form.facilityId,
            category: form.energyCategory === 'electricity' ? 'Electricity Bill' : 'Fuel Invoice',
            fileName: form.attachmentName.trim(),
            fileType: 'application/pdf',
            fileSizeKb: 120,
            reportingMonth: form.reportingMonth,
            referenceNote: `Linked to ${form.energyCategory} record (${form.reportingMonth})`,
          },
          actorRole
        );
      }

      await saveUtilityRecord(
        company,
        {
          id: editing?.id,
          facilityId: form.facilityId,
          facilityName: fac?.name || 'Primary Facility',
          reportingMonth: form.reportingMonth,
          energyCategory: form.energyCategory,
          fuelTypeLabel:
            form.energyCategory === 'other_fuel'
              ? form.fuelTypeLabel || 'Other Industrial Fuel'
              : ENERGY_CATEGORY_META[form.energyCategory].label,
          quantity: qty,
          unit: form.unit,
          electricitySource: form.energyCategory === 'electricity' ? form.electricitySource : '',
          renewableQuantity: form.energyCategory === 'electricity' ? renew : 0,
          scope: factor.scope,
          appliedFactorId: factor.factorId,
          appliedFactorValue: factor.factorValue,
          appliedFactorVersion: factor.version,
          estimatedKgCo2e: calc.estimatedKgCo2e,
          estimatedTonnesCo2e: calc.estimatedTonnesCo2e,
          attachmentDocId,
          attachmentName: form.attachmentName.trim(),
          notes: form.notes.trim(),
          reviewStatus: editing?.reviewStatus || 'pending_review',
        },
        actorRole
      );
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleApproval = async (rec: UtilityRecord, nextStatus: UtilityRecord['reviewStatus']) => {
    if (!isCompanyAdmin) return;
    await saveUtilityRecord(company, { ...rec, reviewStatus: nextStatus }, actorRole);
  };

  const handleCsvExport = () => {
    exportToCsv(
      `greenyield-${mode}-${company.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      [
        'Reporting Month',
        'Facility',
        'Category',
        'Quantity',
        'Unit',
        'Renewable kWh',
        'Scope',
        'Factor Applied',
        'Est. kg CO2e',
        'Est. Tonnes CO2e',
        'Review Status',
      ],
      scopedRecords.map((r) => [
        r.reportingMonth,
        r.facilityName,
        r.energyCategory,
        r.quantity,
        r.unit,
        r.renewableQuantity ?? 0,
        r.scope,
        r.appliedFactorValue,
        r.estimatedKgCo2e,
        r.estimatedTonnesCo2e,
        r.reviewStatus,
      ])
    );
  };

  const handleDownloadCsvTemplate = () => {
    exportToCsv(
      'greenyield-utility-import-template',
      ['reportingMonth', 'energyCategory', 'quantity', 'unit', 'renewableQuantity', 'electricitySource', 'notes'],
      [
        ['2026-01', 'electricity', 48500, 'kWh', 8500, 'State Grid + Rooftop Solar', 'January MSEDCL bill'],
        ['2026-01', 'diesel', 1200, 'Litres', 0, '', 'DG Set backup fuel'],
        ['2026-01', 'natural_gas', 950, 'SCM', 0, '', 'Heat treatment furnace'],
      ]
    );
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFeedback(null);

    if (facilities.length === 0) {
      setCsvFeedback('Add at least one facility before importing a CSV.');
      e.target.value = '';
      return;
    }

    const text = await file.text();
    const parsed = parseUtilityCsv(text);
    if (parsed.rows.length === 0) {
      setCsvFeedback(parsed.errors.join(' ') || 'No valid rows found in CSV.');
      e.target.value = '';
      return;
    }

    const defaultFacility = facilities[0];
    let importedCount = 0;
    for (const row of parsed.rows) {
      const factor = getActiveFactorForCategory(row.energyCategory, factors);
      const calc = calculateActivityEmissions({
        energyCategory: row.energyCategory,
        quantity: row.quantity,
        unit: row.unit,
        factorValue: factor.factorValue,
        renewableQuantity: row.energyCategory === 'electricity' ? row.renewableQuantity : 0,
      });
      await saveUtilityRecord(
        company,
        {
          facilityId: defaultFacility.id,
          facilityName: defaultFacility.name,
          reportingMonth: row.reportingMonth,
          energyCategory: row.energyCategory,
          fuelTypeLabel: ENERGY_CATEGORY_META[row.energyCategory].label,
          quantity: row.quantity,
          unit: row.unit,
          electricitySource: row.electricitySource,
          renewableQuantity: row.renewableQuantity,
          scope: factor.scope,
          appliedFactorId: factor.factorId,
          appliedFactorValue: factor.factorValue,
          appliedFactorVersion: factor.version,
          estimatedKgCo2e: calc.estimatedKgCo2e,
          estimatedTonnesCo2e: calc.estimatedTonnesCo2e,
          attachmentName: file.name,
          notes: row.notes || 'Imported via CSV',
          reviewStatus: 'pending_review',
        },
        actorRole
      );
      importedCount += 1;
    }

    setCsvFeedback(
      `Imported ${importedCount} record(s) into ${defaultFacility.name}.${
        parsed.errors.length > 0 ? ` Skipped ${parsed.errors.length} invalid row(s).` : ''
      }`
    );
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            {mode === 'fuel' ? 'Direct Fuel Consumption (Scope 1)' : 'Utility & Energy Activity Data'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'fuel'
              ? 'Record diesel, petrol, natural gas, LPG, and other industrial fuels per facility.'
              : 'Record monthly electricity (kWh & renewable solar) and fuels with automatic CO2e calculation.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            CSV Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            type="button"
            onClick={handleCsvExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {mode === 'fuel' ? 'Add Fuel Record' : 'Add Energy Record'}
          </button>
        </div>
      </div>

      {csvFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
          {csvFeedback}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility, fuel, notes..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="">All Reporting Months</option>
          {uniqueMonths.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Facilities</option>
          {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          value={energyFilter}
          onChange={(e) => setEnergyFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Energy Types</option>
          {mode === 'utility' && <option value="electricity">Electricity</option>}
          <option value="diesel">Diesel</option>
          <option value="petrol">Petrol</option>
          <option value="natural_gas">Natural Gas</option>
          <option value="lpg">LPG</option>
          <option value="other_fuel">Other Fuel</option>
        </select>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {scopedRecords.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-base font-bold text-slate-900 mb-1">
              No {mode === 'fuel' ? 'fuel consumption' : 'utility activity'} records match your filter
            </p>
            <p className="text-sm text-slate-600 mb-4">
              {facilities.length === 0
                ? 'First add a facility in the Facilities tab, then record monthly electricity or fuel bills.'
                : 'Log your first monthly meter reading or import a CSV spreadsheet.'}
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 cursor-pointer"
            >
              Add First Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">Month</th>
                  <th className="py-3 px-4 font-semibold">Facility</th>
                  <th className="py-3 px-4 font-semibold">Energy / Fuel</th>
                  <th className="py-3 px-4 font-semibold text-right">Consumption</th>
                  <th className="py-3 px-4 font-semibold text-right">Est. CO2e (t)</th>
                  <th className="py-3 px-4 font-semibold">Review</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-xs text-slate-800">{rec.reportingMonth}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{rec.facilityName}</p>
                      {rec.attachmentName && (
                        <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          Bill: {rec.attachmentName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">
                        {rec.fuelTypeLabel || ENERGY_CATEGORY_META[rec.energyCategory]?.label}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {rec.scope === 'scope_1' ? 'Scope 1' : 'Scope 2'} · Factor {rec.appliedFactorValue}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      <div>
                        {formatNumber(rec.quantity, 1)} {rec.unit}
                      </div>
                      {(rec.renewableQuantity ?? 0) > 0 && (
                        <div className="text-[11px] text-emerald-700">
                          -{formatNumber(rec.renewableQuantity ?? 0, 0)} kWh solar
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatNumber(rec.estimatedTonnesCo2e, 3)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={rec.reviewStatus} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {isCompanyAdmin && rec.reviewStatus !== 'approved_internally' && (
                          <button
                            type="button"
                            title="Approve internally (CFO/Admin)"
                            onClick={() => handleToggleApproval(rec, 'approved_internally')}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit record"
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isCompanyAdmin && (
                          <button
                            type="button"
                            title="Delete record (audit logged)"
                            onClick={() => deleteUtilityRecord(company, rec, actorRole)}
                            className="p-1.5 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Record Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Energy Activity Record' : 'Record Utility / Fuel Consumption'}
        subtitle="Negative quantities are strictly rejected. Emissions are calculated using configured demonstration factors."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Facility *</span>
              <select
                required
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {facilities.length === 0 && <option value="">No facilities created yet</option>}
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Reporting Month (YYYY-MM) *</span>
              <input
                type="month"
                required
                value={form.reportingMonth}
                onChange={(e) => setForm({ ...form, reportingMonth: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Energy / Fuel Type *</span>
              <select
                value={form.energyCategory}
                onChange={(e) => handleCategoryChange(e.target.value as EnergyCategory)}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {mode === 'utility' && <option value="electricity">Electricity (Scope 2)</option>}
                <option value="diesel">Diesel (Scope 1)</option>
                <option value="petrol">Petrol (Scope 1)</option>
                <option value="natural_gas">Natural Gas (Scope 1)</option>
                <option value="lpg">LPG (Scope 1)</option>
                <option value="other_fuel">Other Fuel (Scope 1)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Measurement Unit *</span>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {ENERGY_CATEGORY_META[form.energyCategory].allowedUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>

          {form.energyCategory === 'other_fuel' && (
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Specify Fuel Type *</span>
              <input
                required
                value={form.fuelTypeLabel}
                onChange={(e) => setForm({ ...form, fuelTypeLabel: e.target.value })}
                placeholder="e.g. Furnace Oil / Biomass Briquettes / Light Diesel Oil"
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Quantity Consumed ({form.unit}) *</span>
              <input
                type="number"
                step="any"
                min={0}
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
              />
            </label>
            {form.energyCategory === 'electricity' ? (
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Renewable / Solar Electricity (kWh)</span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={form.renewableQuantity}
                  onChange={(e) => setForm({ ...form, renewableQuantity: e.target.value })}
                  className="mt-1 w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Supporting Bill / Voucher Reference</span>
                <input
                  value={form.attachmentName}
                  onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
                  placeholder="e.g. diesel-invoice-jan2026.pdf"
                  className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </label>
            )}
          </div>

          {form.energyCategory === 'electricity' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Electricity Source</span>
                <input
                  value={form.electricitySource}
                  onChange={(e) => setForm({ ...form, electricitySource: e.target.value })}
                  placeholder="State Grid / Open Access / Captive Solar"
                  className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Utility Bill Attachment Filename</span>
                <input
                  value={form.attachmentName}
                  onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
                  placeholder="e.g. msedcl-bill-2026-01.pdf"
                  className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Notes</span>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Meter number or billing remarks"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>

          {previewMetrics && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500">Applied Factor ({previewMetrics.factor.version}):</span>{' '}
                <strong className="font-mono text-slate-900">{previewMetrics.factor.factorValue} kg CO2e</strong>
              </div>
              <div>
                <span className="text-slate-500">Indicative Emissions:</span>{' '}
                <strong className="font-mono text-emerald-700 text-sm">
                  {formatNumber(previewMetrics.estimatedTonnesCo2e, 4)} tCO2e
                </strong>{' '}
                <span className="font-mono text-slate-500">
                  ({formatNumber(previewMetrics.estimatedKgCo2e, 1)} kg)
                </span>
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-700 font-medium">{formError}</p>}

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
              {saving ? 'Saving...' : editing ? 'Update Record' : 'Save & Calculate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
