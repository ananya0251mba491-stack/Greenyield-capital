import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  Edit2,
  FileText,
  Plus,
  Send,
} from 'lucide-react';
import {
  Company,
  EsgReport,
  Facility,
  SupportingDocument,
  SustainabilityProject,
  UtilityRecord,
} from '../../../types/models';
import { PERMANENT_ESG_DISCLAIMER } from '../../../constants/defaults';
import { aggregateEmissions, formatNumber } from '../../../utils/calculations';
import { generateEsgReportPdf } from '../../../utils/pdfGenerator';
import {
  saveEsgReport,
  submitVerificationReviewRequest,
} from '../../../services/firestoreService';
import { useAuth } from '../../../context/AuthContext';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusText';

interface EsgReportsModuleProps {
  company: Company;
  facilities: Facility[];
  utilityRecords: UtilityRecord[];
  projects: SustainabilityProject[];
  documents: SupportingDocument[];
  reports: EsgReport[];
  isCompanyAdmin: boolean;
  actorRole: string;
}

export const EsgReportsModule: React.FC<EsgReportsModuleProps> = ({
  company,
  facilities,
  utilityRecords,
  projects,
  documents,
  reports,
  isCompanyAdmin,
  actorRole,
}) => {
  const { firebaseUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EsgReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const agg = aggregateEmissions(utilityRecords);

  const [form, setForm] = useState({
    title: '',
    reportingPeriod: 'FY 2025-26',
    organizationalBoundary: '',
    sustainabilityInitiatives: '',
    energyReductionSummary: '',
    dataSources: '',
    methodology: '',
    limitations: '',
    managementNotes: '',
    status: 'draft' as EsgReport['status'],
  });

  const openCreate = () => {
    setEditing(null);
    const facNames = facilities.map((f) => `${f.name} (${f.city || company.city})`).join('; ');
    const projSummary =
      projects.length > 0
        ? projects
            .map(
              (p) =>
                `${p.name} [${p.category}] — ${p.status}, actual savings ${formatNumber(p.actualEnergySavingsKwh, 0)} kWh (${formatNumber(p.estimatedCo2eReductionTonnes, 2)} tCO2e est.)`
            )
            .join('\n')
        : 'No sustainability projects currently logged.';

    setForm({
      title: `${company.businessName} Operational ESG & Emissions Disclosure`,
      reportingPeriod: 'FY 2025-26',
      organizationalBoundary: facNames
        ? `Operational control boundary covering ${facilities.length} site(s): ${facNames}.`
        : `Operational control boundary for ${company.legalName} (${company.city}, ${company.state}).`,
      sustainabilityInitiatives: projSummary,
      energyReductionSummary: `Total electricity logged: ${formatNumber(agg.totalElectricityKwh, 1)} kWh (including ${formatNumber(agg.renewableElectricityKwh, 1)} kWh documented renewable/solar offset). Estimated period reduction vs prior period: ${formatNumber(agg.estimatedReductionTonnes, 3)} tCO2e.`,
      dataSources: `Monthly electricity utility bills, DG-set diesel & direct fuel invoices, and ${documents.length} uploaded supporting evidence file(s) logged in GreenYield Capital.`,
      methodology:
        'Scope 1 (direct fuel combustion) and Scope 2 (net purchased grid electricity) computed via Activity Data × Configured Demonstration Emission Factor (kg CO2e ÷ 1,000 = tonnes CO2e). Renewable solar generation is deducted from gross electricity where documented.',
      limitations:
        'Scope 3 upstream/downstream value-chain emissions are excluded in this MVP. Demonstration emission factors are used unless explicitly replaced by official factors. Missing monthly records are tracked separately via the data completeness indicator and are not treated as zero emissions.',
      managementNotes:
        'Prepared for internal CFO review and structured buyer questionnaire readiness. Subject to independent third-party audit before external certification.',
      status: 'draft',
    });
    setModalOpen(true);
  };

  const openEdit = (rep: EsgReport) => {
    setEditing(rep);
    setForm({
      title: rep.title,
      reportingPeriod: rep.reportingPeriod,
      organizationalBoundary: rep.organizationalBoundary,
      sustainabilityInitiatives: rep.sustainabilityInitiatives || '',
      energyReductionSummary: rep.energyReductionSummary || '',
      dataSources: rep.dataSources || '',
      methodology: rep.methodology,
      limitations: rep.limitations,
      managementNotes: rep.managementNotes || '',
      status: rep.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveEsgReport(
        company,
        {
          id: editing?.id,
          title: form.title,
          reportingPeriod: form.reportingPeriod,
          organizationalBoundary: form.organizationalBoundary,
          totalElectricityKwh: editing ? editing.totalElectricityKwh : agg.totalElectricityKwh,
          renewableElectricityKwh: editing ? editing.renewableElectricityKwh : agg.renewableElectricityKwh,
          scope1Tonnes: editing ? editing.scope1Tonnes : agg.scope1Tonnes,
          scope2Tonnes: editing ? editing.scope2Tonnes : agg.scope2Tonnes,
          totalTonnes: editing ? editing.totalTonnes : agg.totalTonnes,
          previousPeriodTonnes: editing ? editing.previousPeriodTonnes : agg.previousPeriodTonnes,
          dataCompletenessPct: editing ? editing.dataCompletenessPct : agg.dataCompletenessPct,
          sustainabilityInitiatives: form.sustainabilityInitiatives,
          energyReductionSummary: form.energyReductionSummary,
          dataSources: form.dataSources,
          methodology: form.methodology,
          limitations: form.limitations,
          managementNotes: form.managementNotes,
          supportingDocCount: documents.length,
          status: editing ? editing.status : 'draft',
          verificationLabel: editing?.verificationLabel || 'Indicative Estimate (Not Externally Certified)',
          approvedBy: editing?.approvedBy,
        },
        actorRole
      );
      setModalOpen(false);
      setFeedback('ESG report saved to Cloud Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (rep: EsgReport, nextStatus: EsgReport['status']) => {
    if ((nextStatus === 'approved_internally' || nextStatus === 'archived') && !isCompanyAdmin) return;
    await saveEsgReport(
      company,
      {
        ...rep,
        status: nextStatus,
        verificationLabel:
          nextStatus === 'approved_internally'
            ? 'Approved Internally (Not Externally Certified)'
            : rep.verificationLabel,
        approvedBy: nextStatus === 'approved_internally' ? firebaseUser?.uid : rep.approvedBy,
      },
      actorRole
    );
    setFeedback(`Report "${rep.title}" marked as ${nextStatus.replace(/_/g, ' ')}.`);
  };

  const handleRequestVerification = async (rep: EsgReport) => {
    await submitVerificationReviewRequest(company, rep, actorRole);
    setFeedback(`Verification review request submitted for "${rep.title}".`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            ESG Report Generator & PDF Workspace ({reports.length})
          </h2>
          <p className="text-xs text-slate-500">
            Auto-populated 14-section operational ESG disclosures with downloadable branded PDFs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Generate New ESG Report
        </button>
      </div>

      {/* Permanent Honesty Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 leading-relaxed">
        <strong>Permanent Indicative Reporting Disclaimer:</strong> {PERMANENT_ESG_DISCLAIMER}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
          {feedback}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-base font-bold text-slate-900 mb-1">
            No ESG reports generated yet
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Create your first structured ESG report directly from your logged electricity, fuel,
            and sustainability project records, then download a formatted PDF.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Create First ESG Report
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div key={rep.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-1">
                    <span className="font-mono font-semibold text-slate-700">{rep.reportingPeriod}</span>
                    <span>·</span>
                    <span>{rep.verificationLabel}</span>
                    <span>·</span>
                    <span className="font-mono">Completeness: {rep.dataCompletenessPct}%</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{rep.title}</h3>
                </div>
                <StatusText status={rep.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Scope 1 (Direct)</span>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatNumber(rep.scope1Tonnes, 3)} tCO2e
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scope 2 (Grid)</span>
                  <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                    {formatNumber(rep.scope2Tonnes, 3)} tCO2e
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Estimated</span>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatNumber(rep.totalTonnes, 3)} tCO2e
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Electricity Logged</span>
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatNumber(rep.totalElectricityKwh, 0)} kWh
                  </span>
                </div>
              </div>

              {rep.reviewerFeedback && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <strong>Reviewer Feedback / Requested Changes:</strong> {rep.reviewerFeedback}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      generateEsgReportPdf({
                        report: rep,
                        company,
                        facilities,
                        projects,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Report
                  </button>
                  {rep.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => openEdit(rep)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Sections
                    </button>
                  )}
                  {(rep.status === 'draft' || rep.status === 'changes_requested') && (
                    <button
                      type="button"
                      onClick={() => handleRequestVerification(rep)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit for Review
                    </button>
                  )}
                </div>

                {isCompanyAdmin && rep.status !== 'archived' && (
                  <div className="flex items-center gap-2">
                    {rep.status !== 'approved_internally' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(rep, 'approved_internally')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Internally (CFO)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(rep, 'archived')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:bg-slate-100 text-xs font-medium rounded-lg cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Authoring Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit ESG Report Sections' : 'Generate 14-Section Indicative ESG Report'}
        subtitle="Quantities are computed directly from your Firestore utility records and facilities."
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Report Title *</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Reporting Period *</span>
              <input
                required
                value={form.reportingPeriod}
                onChange={(e) => setForm({ ...form, reportingPeriod: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Organizational Boundary *</span>
            <textarea
              required
              rows={2}
              value={form.organizationalBoundary}
              onChange={(e) => setForm({ ...form, organizationalBoundary: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Sustainability Initiatives</span>
              <textarea
                rows={3}
                value={form.sustainabilityInitiatives}
                onChange={(e) => setForm({ ...form, sustainabilityInitiatives: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Energy Reduction Projects Summary</span>
              <textarea
                rows={3}
                value={form.energyReductionSummary}
                onChange={(e) => setForm({ ...form, energyReductionSummary: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Data Sources & Supporting Evidence</span>
            <textarea
              rows={2}
              value={form.dataSources}
              onChange={(e) => setForm({ ...form, dataSources: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Calculation Methodology *</span>
              <textarea
                required
                rows={3}
                value={form.methodology}
                onChange={(e) => setForm({ ...form, methodology: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Limitations & Exclusions *</span>
              <textarea
                required
                rows={3}
                value={form.limitations}
                onChange={(e) => setForm({ ...form, limitations: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Management / CFO Notes</span>
            <textarea
              rows={2}
              value={form.managementNotes}
              onChange={(e) => setForm({ ...form, managementNotes: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>

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
              {saving ? 'Saving Report...' : editing ? 'Update Report' : 'Save Draft Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
