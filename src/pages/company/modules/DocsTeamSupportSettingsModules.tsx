import React, { useEffect, useState } from 'react';
import {
  FileText,
  FolderOpen,
  History,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import {
  AuditLog,
  Company,
  CompanyMember,
  Facility,
  SupportMessage,
  SupportTicket,
  SupportingDocument,
} from '../../../types/models';
import {
  createSupportTicket,
  deleteSupportingDocument,
  inviteCompanyMember,
  postSupportMessage,
  saveSupportingDocument,
  sortByNewest,
  updateCompanyMemberRecord,
  updateUserProfile,
} from '../../../services/firestoreService';
import { useAuth } from '../../../context/AuthContext';
import { Modal } from '../../../components/Modal';
import { StatusText } from '../../../components/StatusText';

// ============================================================================
// MODULE 10: DOCUMENT CENTRE
// ============================================================================
export const DocumentCentreModule: React.FC<{
  company: Company;
  facilities: Facility[];
  documents: SupportingDocument[];
  isCompanyAdmin: boolean;
  actorRole: string;
}> = ({ company, facilities, documents, isCompanyAdmin, actorRole }) => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'Electricity Bill' as SupportingDocument['category'],
    facilityId: facilities[0]?.id || '',
    fileName: '',
    fileType: 'application/pdf',
    fileSizeKb: 180,
    reportingMonth: new Date().toISOString().slice(0, 7),
    referenceNote: '',
  });
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fileName.trim()) return;
    setSaving(true);
    try {
      await saveSupportingDocument(company, form, actorRole);
      setModalOpen(false);
      setForm((prev) => ({ ...prev, fileName: '', referenceNote: '' }));
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    categoryFilter === 'all' ? documents : documents.filter((d) => d.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Supporting Document Centre ({documents.length})
          </h2>
          <p className="text-xs text-slate-500">
            Evidence metadata vault for electricity bills, fuel invoices, and project documentation
            (strictly isolated per company).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Evidence File
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'Electricity Bill', 'Fuel Invoice', 'Project Evidence', 'ESG Attachment', 'Other'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'All Categories' : cat}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="font-display text-base font-bold text-slate-900">No supporting documents logged</p>
            <p className="text-xs text-slate-500 mt-1">
              Log utility bill files and project invoices to strengthen your ESG audit readiness.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">Document Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Period</th>
                  <th className="py-3 px-4 font-semibold text-right">Size</th>
                  <th className="py-3 px-4 font-semibold">Reference Note</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((docItem) => (
                  <tr key={docItem.id}>
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      {docItem.fileName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{docItem.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{docItem.reportingMonth || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {docItem.fileSizeKb} KB
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{docItem.referenceNote || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {isCompanyAdmin && (
                        <button
                          type="button"
                          onClick={() => deleteSupportingDocument(company, docItem, actorRole)}
                          className="p-1.5 text-red-700 hover:bg-red-50 rounded cursor-pointer"
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Supporting Evidence Document"
        subtitle="Zero-cost Spark plan stores auditable document metadata in Cloud Firestore."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Select Local File (Extracts Metadata)</span>
            <input
              type="file"
              onChange={handleFileSelect}
              className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Document Filename *</span>
            <input
              required
              value={form.fileName}
              onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              placeholder="e.g. msedcl-industrial-bill-feb-2026.pdf"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as SupportingDocument['category'] })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Electricity Bill">Electricity Bill</option>
                <option value="Fuel Invoice">Fuel Invoice</option>
                <option value="Project Evidence">Project Evidence</option>
                <option value="ESG Attachment">ESG Attachment</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Reporting Month</span>
              <input
                type="month"
                value={form.reportingMonth}
                onChange={(e) => setForm({ ...form, reportingMonth: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Reference Note / Invoice ID</span>
            <input
              value={form.referenceNote}
              onChange={(e) => setForm({ ...form, referenceNote: e.target.value })}
              placeholder="Invoice # or meter serial reference"
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
              {saving ? 'Logging...' : 'Save Document Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 11: TEAM MANAGEMENT (Company Admin / CFO Managed)
// ============================================================================
export const TeamManagementModule: React.FC<{
  company: Company;
  members: CompanyMember[];
  isCompanyAdmin: boolean;
}> = ({ company, members, isCompanyAdmin }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    jobTitle: 'Plant Operations Manager',
    role: 'company_user' as 'company_admin' | 'company_user',
  });
  const [saving, setSaving] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCompanyAdmin) return;
    setSaving(true);
    try {
      await inviteCompanyMember(company, form);
      setModalOpen(false);
      setForm({ displayName: '', email: '', jobTitle: 'Plant Operations Manager', role: 'company_user' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Company Team & Access Control ({members.length})
          </h2>
          <p className="text-xs text-slate-500">
            Only Company Admin / CFO members can invite colleagues, change roles, or revoke access.
          </p>
        </div>
        {isCompanyAdmin && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite Team Member
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Job Title</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                {isCompanyAdmin && <th className="py-3 px-4 font-semibold text-right">Governance</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {members.map((m) => (
                <tr key={m.id || m.uid}>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{m.displayName}</p>
                    <p className="text-slate-500">{m.email}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{m.jobTitle || 'Team Member'}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {m.role === 'company_admin' ? 'Company Admin / CFO' : 'Company User'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={m.status} />
                  </td>
                  {isCompanyAdmin && (
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {m.uid !== company.ownerUid && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateCompanyMemberRecord(company, m, {
                                role: m.role === 'company_admin' ? 'company_user' : 'company_admin',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                          >
                            Switch Role
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCompanyMemberRecord(company, m, {
                                status: m.status === 'revoked' ? 'active' : 'revoked',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            {m.status === 'revoked' ? 'Restore' : 'Revoke'}
                          </button>
                        </>
                      )}
                      {m.uid === company.ownerUid && (
                        <span className="text-[11px] text-slate-400">Primary Owner</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Invite Company Team Member"
        subtitle="Company Users can log utility data and drafts; Company Admins / CFOs can approve internal ESG reports."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Full Name *</span>
            <input
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Work Email *</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Job Title</span>
              <input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Permission Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'company_admin' | 'company_user' })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="company_user">Company User (Standard)</option>
                <option value="company_admin">Company Admin / CFO</option>
              </select>
            </label>
          </div>
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
              {saving ? 'Adding...' : 'Add Team Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 12: COMPANY SUPPORT DESK (Zero access to admin internal notes)
// ============================================================================
export const CompanySupportModule: React.FC<{
  company: Company;
  tickets: SupportTicket[];
  actorRole: string;
}> = ({ company, tickets, actorRole }) => {
  const { firebaseUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [form, setForm] = useState({
    subject: '',
    category: 'Report Issue' as SupportTicket['category'],
    priority: 'Medium' as SupportTicket['priority'],
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeTicket || !firebaseUser) return;
    const q = query(
      collection(db, 'support_messages'),
      where('memberUids', 'array-contains', firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SupportMessage, 'id'>) }))
          .filter((m) => m.ticketId === activeTicket.id)
          .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'support_messages')
    );
    return () => unsub();
  }, [activeTicket, firebaseUser]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSupportTicket(company, form, actorRole);
      setModalOpen(false);
      setForm({ subject: '', category: 'Report Issue', priority: 'Medium', description: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;
    await postSupportMessage(activeTicket, replyText, actorRole);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Support Centre ({tickets.length})
          </h2>
          <p className="text-xs text-slate-500">
            Raise report questions, data correction requests, or general sustainability enquiries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Support Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">No support tickets open</p>
              <p className="text-xs text-slate-500 mt-1">Need help with an ESG report or data correction?</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortByNewest(tickets).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTicket(t)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    activeTicket?.id === t.id ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-500">
                      {t.category} · {t.priority}
                    </span>
                    <StatusText status={t.status} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col min-h-[340px]">
          {!activeTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm">Select a support ticket to view conversation history.</p>
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">{activeTicket.subject}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeTicket.category} · Priority: {activeTicket.priority}
                    </p>
                  </div>
                  <StatusText status={activeTicket.status} />
                </div>
                <p className="text-sm text-slate-700 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {activeTicket.description}
                </p>
                {activeTicket.resolutionSummary && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg mt-2">
                    <strong>Resolution:</strong> {activeTicket.resolutionSummary}
                  </p>
                )}
              </div>

              <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-64">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No replies posted yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <strong className="text-slate-800">{m.senderName}</strong>
                        <span>{m.senderRole.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-slate-700">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a public reply to support..."
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Reply
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Support Ticket">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Subject *</span>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Request data correction for January diesel entry"
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as SupportTicket['category'] })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="General Enquiry">General Enquiry</option>
                <option value="Report Issue">Report Issue</option>
                <option value="Data Correction">Data Correction</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Subscription">Subscription</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as SupportTicket['priority'] })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Description *</span>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              {saving ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ============================================================================
// MODULE 13: COMPANY SETTINGS & IMMUTABLE AUDIT LOGS
// ============================================================================
export const CompanySettingsModule: React.FC<{
  company: Company;
  auditLogs: AuditLog[];
  onRegisterAnotherCompany: () => void;
}> = ({ company, auditLogs, onRegisterAnotherCompany }) => {
  const { userProfile, firebaseUser, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [jobTitle, setJobTitle] = useState(userProfile?.jobTitle || '');
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    await updateUserProfile(firebaseUser.uid, { displayName, phone, jobTitle });
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">Your Account Settings</h2>
            <p className="text-xs text-slate-500">
              Update personal contact metadata (roles are governed server-side via Firestore rules).
            </p>
          </div>
          <button
            type="button"
            onClick={onRegisterAnotherCompany}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            + Register Another Company
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Display Name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Job Title</span>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="md:col-span-3 flex items-center justify-between pt-2">
            <span className="text-xs text-emerald-700 font-medium">
              {saved ? 'Personal preferences saved.' : `Active Company: ${company.businessName}`}
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Update Account Details
            </button>
          </div>
        </form>
      </div>

      {/* Company Immutable Audit History */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Company Immutable Audit Trail ({auditLogs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Append-only compliance ledger. Records cannot be modified or deleted by users.
            </p>
          </div>
          <History className="w-4 h-4 text-slate-400" />
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No audit events recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs max-h-80 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-slate-800">{log.action}</span>
                  <p className="text-slate-600 mt-0.5">{log.summary}</p>
                </div>
                <div className="text-right text-slate-500 font-mono">
                  <span>{log.actorEmail}</span>
                  <span className="block text-[11px]">
                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('en-IN') : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
