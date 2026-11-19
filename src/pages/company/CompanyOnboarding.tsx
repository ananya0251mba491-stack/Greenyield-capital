import React, { useState } from 'react';
import { Building2, CheckCircle2, Sparkles } from 'lucide-react';
import {
  BUYER_REGIONS,
  COMPANY_SIZES,
  INDIAN_STATES,
  INDUSTRIES,
  TURNOVER_RANGES,
} from '../../constants/defaults';
import { Company } from '../../types/models';
import { createCompanyWithMembership } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';

interface CompanyOnboardingProps {
  onCompleted: (companyId: string) => void;
  onCancel?: () => void;
}

export const CompanyOnboarding: React.FC<CompanyOnboardingProps> = ({ onCompleted, onCancel }) => {
  const { firebaseUser, isPlatformOwner, selectActiveCompany } = useAuth();
  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [companyEmail, setCompanyEmail] = useState(firebaseUser?.email || '');
  const [contactPerson, setContactPerson] = useState(firebaseUser?.displayName || '');
  const [mobile, setMobile] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [companySize, setCompanySize] = useState(COMPANY_SIZES[2]);
  const [annualTurnoverRange, setAnnualTurnoverRange] = useState(TURNOVER_RANGES[2]);
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('Pune');
  const [pinCode, setPinCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [website, setWebsite] = useState('');
  const [exportStatus, setExportStatus] = useState<Company['exportStatus']>('Domestic & Export');
  const [primaryBuyerRegion, setPrimaryBuyerRegion] = useState(BUYER_REGIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefillSamplePuneSme = () => {
    setLegalName('Deccan Precision Auto Components Pvt. Ltd.');
    setBusinessName('Deccan Precision Auto');
    setCompanyEmail(firebaseUser?.email || 'cfo@deccanprecision.in');
    setContactPerson(firebaseUser?.displayName || 'Vikram Kulkarni');
    setMobile('+91 98220 45190');
    setIndustry('Auto Components & Ancillaries');
    setCompanySize('Medium (51–250 employees)');
    setAnnualTurnoverRange('₹25 Crore – ₹100 Crore');
    setRegisteredAddress('Plot C-42, MIDC Chakan Industrial Area Phase II');
    setState('Maharashtra');
    setCity('Pune');
    setPinCode('410501');
    setGstin('27AABCD4129K1Z5');
    setWebsite('https://deccanprecision.example.in');
    setExportStatus('Domestic & Export');
    setPrimaryBuyerRegion('European Union (CBAM / CSRD Buyers)');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!legalName.trim() || !businessName.trim() || !registeredAddress.trim() || !pinCode.trim()) {
      setError('Please complete all required legal, contact, and address fields.');
      return;
    }
    setSubmitting(true);
    try {
      const companyId = await createCompanyWithMembership({
        legalName,
        businessName,
        companyEmail,
        contactPerson,
        mobile,
        industry,
        companySize,
        annualTurnoverRange,
        registeredAddress,
        state,
        city,
        pinCode,
        gstin,
        website,
        exportStatus,
        primaryBuyerRegion,
        isPlatformOwner,
      });
      await selectActiveCompany(companyId);
      onCompleted(companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register company.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-[#0B172A] px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">Register Your SME Company Profile</h1>
            <p className="text-xs text-slate-300">
              Creates your company-isolated Cloud Firestore workspace and assigns you as Company Admin / CFO.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={prefillSamplePuneSme}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Prefill Pune Demo SME
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Legal Company Name *</span>
            <input
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Sahyadri Forgings Private Limited"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Business / Trade Name *</span>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Sahyadri Forgings"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Company Email *</span>
            <input
              type="email"
              required
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Primary Contact Person *</span>
            <input
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Mobile Number *</span>
            <input
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Industry Sector *</span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Company Size *</span>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {COMPANY_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Annual Turnover Range *</span>
            <select
              value={annualTurnoverRange}
              onChange={(e) => setAnnualTurnoverRange(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {TURNOVER_RANGES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block md:col-span-3">
            <span className="text-xs font-semibold text-slate-700">Registered Industrial Address *</span>
            <input
              required
              value={registeredAddress}
              onChange={(e) => setRegisteredAddress(e.target.value)}
              placeholder="Plot number, MIDC / GIDC / Industrial Park"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">State *</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">City *</span>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">PIN Code *</span>
            <input
              required
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="410501"
              className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">GSTIN (Optional)</span>
            <input
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="27XXXXX0000X1Z5"
              className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Company Website (Optional)</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.in"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Export Status *</span>
            <select
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value as Company['exportStatus'])}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="Export-Oriented">Export-Oriented</option>
              <option value="Domestic & Export">Domestic & Export</option>
              <option value="Domestic Only">Domestic Only</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Primary Buyer Region *</span>
            <select
              value={primaryBuyerRegion}
              onChange={(e) => setPrimaryBuyerRegion(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {BUYER_REGIONS.map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Creating Company Workspace...' : 'Create Company Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
};
