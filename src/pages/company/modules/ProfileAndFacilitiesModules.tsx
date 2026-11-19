import React, { useState } from 'react';
import { Building2, Edit2, Plus, Save, Trash2 } from 'lucide-react';
import {
  BUYER_REGIONS,
  COMPANY_SIZES,
  INDIAN_STATES,
  INDUSTRIES,
  TURNOVER_RANGES,
} from '../../../constants/defaults';
import { Company, Facility, SubscriptionRecord } from '../../../types/models';
import {
  deleteFacility,
  saveFacility,
  updateCompanyProfile,
} from '../../../services/firestoreService';
import { formatInr } from '../../../utils/calculations';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusText';

// ============================================================================
// MODULE 2: COMPANY PROFILE (Editable by Company Admin / CFO)
// ============================================================================
export const CompanyProfileModule: React.FC<{
  company: Company;
  isCompanyAdmin: boolean;
  actorRole: string;
  subscription: SubscriptionRecord | null;
}> = ({ company, isCompanyAdmin, actorRole, subscription }) => {
  const [form, setForm] = useState({
    legalName: company.legalName,
    businessName: company.businessName,
    companyEmail: company.companyEmail,
    contactPerson: company.contactPerson,
    mobile: company.mobile,
    industry: company.industry,
    companySize: company.companySize,
    annualTurnoverRange: company.annualTurnoverRange,
    registeredAddress: company.registeredAddress,
    state: company.state,
    city: company.city,
    pinCode: company.pinCode,
    gstin: company.gstin || '',
    website: company.website || '',
    exportStatus: company.exportStatus,
    primaryBuyerRegion: company.primaryBuyerRegion,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompanyAdmin) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateCompanyProfile(company, form, actorRole);
      setFeedback('Company profile updated and recorded in the audit trail.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CFO / Subscription Snapshot Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Approval Status</p>
          <div className="mt-1.5">
            <StatusText status={company.status} />
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Company ID</p>
          <p className="font-mono text-sm font-semibold text-slate-900 mt-1 truncate">{company.companyId}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Subscription Plan (Manual MVP)</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {subscription?.planName || 'Free Trial'}
          </p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500">Billing Status / Annual Fee</p>
          <p className="font-mono text-sm font-semibold text-slate-900 mt-1 tabular-nums">
            {subscription ? `${subscription.paymentStatus.toUpperCase()} · ${formatInr(subscription.annualFeeInr)}` : 'TRIAL · ₹0'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Registered Company Details</h2>
            <p className="text-xs text-slate-500">
              {isCompanyAdmin
                ? 'Company Admin / CFO permissions active — you may update organizational metadata.'
                : 'Read-only view — only Company Admin / CFO can modify company profile fields.'}
            </p>
          </div>
          {isCompanyAdmin && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          )}
        </div>

        {feedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Legal Company Name</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.legalName}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Business Name</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Company Email</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.companyEmail}
              onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Primary Contact Person</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Mobile Number</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Industry</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Company Size</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.companySize}
              onChange={(e) => setForm({ ...form, companySize: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Annual Turnover Range</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.annualTurnoverRange}
              onChange={(e) => setForm({ ...form, annualTurnoverRange: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              {TURNOVER_RANGES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-slate-700">Registered Address</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.registeredAddress}
              onChange={(e) => setForm({ ...form, registeredAddress: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">State</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">City</span>
              <input
                disabled={!isCompanyAdmin}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">PIN Code</span>
              <input
                disabled={!isCompanyAdmin}
                value={form.pinCode}
                onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">GSTIN</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Website</span>
            <input
              disabled={!isCompanyAdmin}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Export Status</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.exportStatus}
              onChange={(e) => setForm({ ...form, exportStatus: e.target.value as Company['exportStatus'] })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              <option value="Export-Oriented">Export-Oriented</option>
              <option value="Domestic & Export">Domestic & Export</option>
              <option value="Domestic Only">Domestic Only</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Primary Buyer Region</span>
            <select
              disabled={!isCompanyAdmin}
              value={form.primaryBuyerRegion}
              onChange={(e) => setForm({ ...form, primaryBuyerRegion: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-50"
            >
              {BUYER_REGIONS.map((br) => <option key={br} value={br}>{br}</option>)}
            </select>
          </label>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MODULE 3: MULTI-FACILITY MANAGEMENT
// ============================================================================
export const FacilitiesModule: React.FC<{
  company: Company;
  facilities: Facility[];
  isCompanyAdmin: boolean;
  actorRole: string;
}> = ({ company, facilities, isCompanyAdmin, actorRole }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: company.city,
    state: company.state,
    facilityType: 'Manufacturing Plant',
    manufacturingCategory: company.industry,
    operationalStatus: 'Active' as Facility['operationalStatus'],
    reportingPeriod: 'FY 2025-26',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      address: company.registeredAddress,
      city: company.city,
      state: company.state,
      facilityType: 'Manufacturing Plant',
      manufacturingCategory: company.industry,
      operationalStatus: 'Active',
      reportingPeriod: 'FY 2025-26',
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (fac: Facility) => {
    setEditing(fac);
    setForm({
      name: fac.name,
      address: fac.address,
      city: fac.city || company.city,
      state: fac.state || company.state,
      facilityType: fac.facilityType,
      manufacturingCategory: fac.manufacturingCategory,
      operationalStatus: fac.operationalStatus,
      reportingPeriod: fac.reportingPeriod,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setError('Facility name and address are required.');
      return;
    }
    setSaving(true);
    try {
      await saveFacility(company, { ...form, id: editing?.id }, actorRole);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save facility.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fac: Facility) => {
    if (!isCompanyAdmin) return;
    await deleteFacility(company, fac, actorRole);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">Facilities & Plants ({facilities.length})</h2>
          <p className="text-xs text-slate-500">
            Manage operational boundaries across manufacturing units, warehouses, and offices.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Facility
        </button>
      </div>

      {facilities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-900 mb-1">No facilities added yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Register at least one manufacturing unit or warehouse before entering monthly
            electricity and fuel bills.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Add Primary Facility
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilities.map((fac) => (
            <div key={fac.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">{fac.name}</h3>
                    <p className="text-xs text-slate-500">
                      {fac.facilityType} · {fac.manufacturingCategory}
                    </p>
                  </div>
                  <StatusText status={fac.operationalStatus} />
                </div>
                <p className="text-sm text-slate-600 mt-2">{fac.address}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {fac.city}, {fac.state} · Reporting Period: <span className="font-mono">{fac.reportingPeriod}</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(fac)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                {isCompanyAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(fac)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Facility' : 'Add Industrial Facility'}
        subtitle="Define the facility boundary for utility and emissions tracking."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Facility Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Chakan Unit 1 — Forging & CNC"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Address *</span>
            <input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">City</span>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">State</span>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Facility Type *</span>
              <select
                value={form.facilityType}
                onChange={(e) => setForm({ ...form, facilityType: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Manufacturing Plant">Manufacturing Plant</option>
                <option value="Assembly Unit">Assembly Unit</option>
                <option value="Textile / Processing Mill">Textile / Processing Mill</option>
                <option value="Warehouse / Cold Storage">Warehouse / Cold Storage</option>
                <option value="Corporate & R&D Office">Corporate & R&D Office</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Operational Status *</span>
              <select
                value={form.operationalStatus}
                onChange={(e) => setForm({ ...form, operationalStatus: e.target.value as Facility['operationalStatus'] })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Active">Active</option>
                <option value="Under Commissioning">Under Commissioning</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Manufacturing Category *</span>
              <input
                required
                value={form.manufacturingCategory}
                onChange={(e) => setForm({ ...form, manufacturingCategory: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Reporting Period *</span>
              <input
                required
                value={form.reportingPeriod}
                onChange={(e) => setForm({ ...form, reportingPeriod: e.target.value })}
                placeholder="FY 2025-26"
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
          </div>
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
              {saving ? 'Saving...' : editing ? 'Update Facility' : 'Save Facility'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
