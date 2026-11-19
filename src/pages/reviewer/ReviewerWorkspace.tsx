import React, { useEffect, useState } from 'react';
import { ClipboardCheck, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EsgReport, ReportReview } from '../../types/models';
import {
  fetchSingleReportForReviewer,
  subscribeReviewerAssignedReviews,
  updateReportReviewDecision,
} from '../../services/firestoreService';
import { formatNumber } from '../../utils/calculations';
import { BrandMark } from '../../components/BrandMark';
import { StatusText } from '../../components/StatusText';

interface ReviewerWorkspaceProps {
  navigate: (path: string) => void;
}

export const ReviewerWorkspace: React.FC<ReviewerWorkspaceProps> = ({ navigate }) => {
  const { firebaseUser, isPlatformOwner, signOut } = useAuth();
  const [reviews, setReviews] = useState<ReportReview[]>([]);
  const [selected, setSelected] = useState<ReportReview | null>(null);
  const [linkedReport, setLinkedReport] = useState<EsgReport | null>(null);
  const [status, setStatus] = useState<ReportReview['status']>('in_review');
  const [notes, setNotes] = useState('');
  const [corrections, setCorrections] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeReviewerAssignedReviews(firebaseUser.uid, isPlatformOwner, setReviews);
  }, [firebaseUser, isPlatformOwner]);

  const handleSelectReview = async (rev: ReportReview) => {
    setSelected(rev);
    setStatus(rev.status);
    setNotes(rev.reviewerNotes || '');
    setCorrections(rev.correctionRequests || '');
    setFeedback(null);
    const report = await fetchSingleReportForReviewer(rev.reportId);
    setLinkedReport(report);
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateReportReviewDecision({
        review: selected,
        status,
        reviewerNotes: notes,
        correctionRequests: corrections,
        actorRole: isPlatformOwner ? 'platform_owner' : 'verification_reviewer',
      });
      setFeedback('Review decision and notes recorded in Cloud Firestore and audit log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-[#0B172A] text-white px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-6">
          <BrandMark light onClick={() => navigate('/')} />
          <span className="hidden sm:inline text-xs text-slate-300">
            Verification Reviewer Portal (Restricted Scope)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isPlatformOwner && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
            >
              Back to Owner Command Centre
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Verification Reviewer Role Boundaries:</strong> Reviewers inspect submitted
            indicative ESG disclosures and supporting evidence, record review decisions, and request
            corrections. Reviewers cannot modify company financial records, alter utility activity
            numbers, or independently issue official carbon credits.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Assigned Review Queue ({reviews.length})
              </span>
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
            </div>
            {reviews.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">
                No review requests currently assigned to your account.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <button
                    key={rev.id}
                    type="button"
                    onClick={() => handleSelectReview(rev)}
                    className={`w-full text-left p-4 hover:bg-slate-50 cursor-pointer ${
                      selected?.id === rev.id ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-slate-500">{rev.companyName}</span>
                      <StatusText status={rev.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{rev.reportTitle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
            {!selected ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Select an assigned review item to inspect the submitted ESG report and record notes.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">{selected.companyName}</p>
                    <h2 className="font-display text-lg font-bold text-slate-900">{selected.reportTitle}</h2>
                  </div>
                  <StatusText status={selected.status} />
                </div>

                {linkedReport && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-500 block">Period</span>
                      <strong className="font-mono text-slate-900">{linkedReport.reportingPeriod}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Scope 1 / Scope 2</span>
                      <strong className="font-mono text-slate-900">
                        {formatNumber(linkedReport.scope1Tonnes, 2)} / {formatNumber(linkedReport.scope2Tonnes, 2)} t
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Est. CO2e</span>
                      <strong className="font-mono text-emerald-700">{formatNumber(linkedReport.totalTonnes, 2)} t</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Completeness</span>
                      <strong className="font-mono text-slate-900">{linkedReport.dataCompletenessPct}%</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block">Boundary & Methodology</span>
                      <p className="text-slate-700 mt-0.5">{linkedReport.organizationalBoundary}</p>
                      <p className="text-slate-600 mt-1">{linkedReport.methodology}</p>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
                    {feedback}
                  </div>
                )}

                <form onSubmit={handleSaveDecision} className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Review Decision</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ReportReview['status'])}
                      className="mt-1 w-full sm:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="in_review">In Review</option>
                      <option value="changes_requested">Request Corrections</option>
                      <option value="reviewed_indicative">Reviewed Indicative (Not Official Certification)</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Correction Requests for Company</span>
                    <textarea
                      rows={3}
                      value={corrections}
                      onChange={(e) => setCorrections(e.target.value)}
                      placeholder="List specific utility bills, fuel logs, or boundary issues requiring correction..."
                      className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">Reviewer Notes</span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg cursor-pointer"
                  >
                    {saving ? 'Recording Decision...' : 'Save Review Decision'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
