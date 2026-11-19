import React, { useEffect, useState } from 'react';
import { Download, Lock, Save, Search, Send } from 'lucide-react';
import {
  AuditLog,
  PublicInquiry,
  SupportInternalNote,
  SupportMessage,
  SupportTicket,
} from '../../types/models';
import {
  addAdminInternalNote,
  adminUpdatePublicInquiryStatus,
  adminUpdateSupportTicket,
  fetchPlatformSetting,
  postSupportMessage,
  savePlatformSetting,
  sortByNewest,
  subscribeOwnerCollection,
} from '../../services/firestoreService';
import { PERMANENT_ESG_DISCLAIMER } from '../../constants/defaults';
import { exportToCsv } from '../../utils/calculations';
import { StatusText } from '../../components/StatusText';

// ============================================================================
// OWNER MODULE 14: SUPPORT CENTRE (With Admin-Only Internal Notes & Public Inquiries)
// ============================================================================
export const OwnerSupportView: React.FC<{
  tickets: SupportTicket[];
  inquiries: PublicInquiry[];
}> = ({ tickets, inquiries }) => {
  const [subTab, setSubTab] = useState<'tickets' | 'inquiries'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [allMessages, setAllMessages] = useState<SupportMessage[]>([]);
  const [allInternalNotes, setAllInternalNotes] = useState<SupportInternalNote[]>([]);
  const [publicReply, setPublicReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [ticketStatus, setTicketStatus] = useState<SupportTicket['status']>('In Progress');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('Medium');
  const [resolutionSummary, setResolutionSummary] = useState('');

  useEffect(() => {
    const u1 = subscribeOwnerCollection<SupportMessage>('support_messages', setAllMessages);
    const u2 = subscribeOwnerCollection<SupportInternalNote>('support_internal_notes', setAllInternalNotes);
    return () => {
      u1();
      u2();
    };
  }, []);

  const selectTicket = (t: SupportTicket) => {
    setSelectedTicket(t);
    setTicketStatus(t.status);
    setTicketPriority(t.priority);
    setResolutionSummary(t.resolutionSummary || '');
  };

  const threadMessages = selectedTicket
    ? allMessages
        .filter((m) => m.ticketId === selectedTicket.id)
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
    : [];

  const threadInternalNotes = selectedTicket
    ? sortByNewest(allInternalNotes.filter((n) => n.ticketId === selectedTicket.id))
    : [];

  const handleSendPublicReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !publicReply.trim()) return;
    await postSupportMessage(selectedTicket, publicReply, 'platform_owner');
    setPublicReply('');
  };

  const handleSaveInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !internalNote.trim()) return;
    await addAdminInternalNote(selectedTicket.id, internalNote);
    setInternalNote('');
  };

  const handleUpdateTicketMeta = async () => {
    if (!selectedTicket) return;
    await adminUpdateSupportTicket(selectedTicket, {
      status: ticketStatus,
      priority: ticketPriority,
      resolutionSummary,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">Support Centre & Public Inquiries</h2>
          <p className="text-xs text-slate-500">
            Manage SME tickets with public responses and strictly admin-only internal notes.
          </p>
        </div>
        <div className="inline-flex bg-slate-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('tickets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              subTab === 'tickets' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            Company Tickets ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('inquiries')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
              subTab === 'inquiries' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            Public Demo Inquiries ({inquiries.length})
          </button>
        </div>
      </div>

      {subTab === 'inquiries' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {inquiries.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No public website demo inquiries submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Contact & Company</th>
                    <th className="py-3 px-4 font-semibold">Type & City</th>
                    <th className="py-3 px-4 font-semibold">Message</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortByNewest(inquiries).map((inq) => (
                    <tr key={inq.id}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{inq.fullName}</p>
                        <p className="text-slate-600">{inq.companyName}</p>
                        <p className="text-slate-500">{inq.email} {inq.phone ? `· ${inq.phone}` : ''}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{inq.inquiryType}</p>
                        <p className="text-slate-500">{inq.city || 'India'}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-sm">{inq.message}</td>
                      <td className="py-3 px-4">
                        <StatusText status={inq.status} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => adminUpdatePublicInquiryStatus(inq.id, 'contacted')}
                          className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Mark Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => adminUpdatePublicInquiryStatus(inq.id, 'closed')}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {tickets.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No support tickets raised yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {sortByNewest(tickets).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTicket(t)}
                    className={`w-full text-left p-4 hover:bg-slate-50 cursor-pointer ${
                      selectedTicket?.id === t.id ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-slate-500">{t.companyName} · {t.priority}</span>
                      <StatusText status={t.status} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.category}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-5">
            {!selectedTicket ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
                Select a ticket on the left to reply publicly or record private admin-only notes.
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        {selectedTicket.companyName} · Opened by {selectedTicket.createdByName}
                      </p>
                      <h3 className="font-display text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
                    </div>
                    <StatusText status={selectedTicket.status} />
                  </div>
                  <p className="text-sm text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    {selectedTicket.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value as SupportTicket['status'])}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as SupportTicket['priority'])}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleUpdateTicketMeta}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Save Ticket Status
                    </button>
                  </div>
                  <input
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="Resolution summary (visible to company once saved)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Public Reply Thread */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    Public Reply Thread (Visible to Company)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {threadMessages.length === 0 ? (
                      <p className="text-xs text-slate-500">No public replies yet.</p>
                    ) : (
                      threadMessages.map((m) => (
                        <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <span className="font-semibold text-slate-900">{m.senderName}</span>{' '}
                          <span className="text-slate-500">({m.senderRole})</span>
                          <p className="text-slate-700 mt-1">{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendPublicReply} className="flex gap-2">
                    <input
                      value={publicReply}
                      onChange={(e) => setPublicReply(e.target.value)}
                      placeholder="Post public response to SME..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Reply
                    </button>
                  </form>
                </div>

                {/* STRICTLY ADMIN-ONLY INTERNAL NOTES */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-950">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <h4 className="font-display text-sm font-bold">
                      Admin-Only Internal Notes (Hidden from Company Users via Firestore Rules)
                    </h4>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {threadInternalNotes.length === 0 ? (
                      <p className="text-xs text-amber-800">No internal notes recorded for this ticket.</p>
                    ) : (
                      threadInternalNotes.map((n) => (
                        <div key={n.id} className="p-3 bg-white border border-amber-200 rounded-lg text-xs">
                          <span className="font-semibold text-slate-900">{n.authorName}</span>
                          <p className="text-slate-700 mt-1">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSaveInternalNote} className="flex gap-2">
                    <input
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add confidential internal admin note..."
                      className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Save Private Note
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// OWNER MODULE 15: IMMUTABLE AUDIT LOGS
// ============================================================================
export const OwnerAuditLogsView: React.FC<{ auditLogs: AuditLog[] }> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');

  const filtered = sortByNewest(auditLogs).filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorEmail.toLowerCase().includes(q) ||
      l.summary.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Immutable Platform Audit Logs ({auditLogs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Append-only Firestore security ledger. Update and delete operations are globally blocked in firestore.rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              'greenyield-audit-logs',
              ['Timestamp', 'Actor Email', 'Role', 'Company ID', 'Action', 'Entity', 'Summary'],
              filtered.map((l) => [
                l.createdAt?.toDate ? l.createdAt.toDate().toISOString() : '',
                l.actorEmail,
                l.actorRole,
                l.companyId,
                l.action,
                l.entityType,
                l.summary,
              ])
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Audit CSV
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by action, email, summary..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('en-IN') : 'Pending'}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-medium text-slate-900">{log.actorEmail}</span>
                    <span className="block text-[11px] text-slate-500">{log.actorRole}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{log.action}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{log.entityType}</td>
                  <td className="py-2.5 px-4 text-slate-700 max-w-md">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OWNER MODULE 16: PLATFORM SETTINGS & REPORTING TEMPLATES
// ============================================================================
export const OwnerPlatformSettingsView: React.FC = () => {
  const [templateName, setTemplateName] = useState('Indian SME Operational ESG Disclosure (Standard 14-Section)');
  const [defaultPeriod, setDefaultPeriod] = useState('FY 2025-26');
  const [disclaimerText, setDisclaimerText] = useState(PERMANENT_ESG_DISCLAIMER);
  const [allowSelfOnboarding, setAllowSelfOnboarding] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformSetting('esg_templates').then((p) => {
      if (p) {
        if (typeof p.templateName === 'string') setTemplateName(p.templateName);
        if (typeof p.defaultPeriod === 'string') setDefaultPeriod(p.defaultPeriod);
        if (typeof p.disclaimerText === 'string') setDisclaimerText(p.disclaimerText);
        if (typeof p.allowSelfOnboarding === 'boolean') setAllowSelfOnboarding(p.allowSelfOnboarding);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    try {
      await savePlatformSetting('esg_templates', 'platform', {
        templateName,
        defaultPeriod,
        disclaimerText,
        allowSelfOnboarding,
      });
      setSavedNotice('Platform reporting templates and governance settings saved to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="font-display text-lg font-bold text-slate-900">
          Platform Settings & ESG Reporting Templates
        </h2>
        <p className="text-xs text-slate-500">
          Configure global reporting templates, active financial year defaults, and mandatory academic disclaimers.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
          {savedNotice}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Active ESG Report Template Title</span>
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Default Reporting Period</span>
        <input
          value={defaultPeriod}
          onChange={(e) => setDefaultPeriod(e.target.value)}
          className="mt-1 w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Permanent Report Disclaimer Text</span>
        <textarea
          rows={3}
          value={disclaimerText}
          onChange={(e) => setDisclaimerText(e.target.value)}
          className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
        />
      </label>

      <label className="flex items-center gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={allowSelfOnboarding}
          onChange={(e) => setAllowSelfOnboarding(e.target.checked)}
          className="rounded border-slate-300 text-emerald-600"
        />
        <span>Allow SME companies to register pending applications for Owner review</span>
      </label>

      <div className="pt-3 border-t border-slate-200 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Platform Settings'}
        </button>
      </div>
    </form>
  );
};
