import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileText,
  History,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  TrendingDown,
  Users,
  X,
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
import { useAuth } from '../../context/AuthContext';
import {
  AuditLog,
  CarbonOpportunity,
  Company,
  EmissionFactor,
  EnergyCategory,
  EsgReport,
  Facility,
  PublicInquiry,
  ReportReview,
  ReviewerRecord,
  SubscriptionRecord,
  SupportTicket,
  SustainabilityProject,
  UserProfile,
  UtilityRecord,
} from '../../types/models';
import {
  adminUpdateCompanyStatus,
  adminUpdateUser,
  grantReviewerAccess,
  revokeReviewerAccess,
  saveEmissionFactor,
  seedDefaultEmissionFactors,
  sortByNewest,
  subscribeOwnerCollection,
  updateReportReviewDecision,
} from '../../services/firestoreService';
import { exportToCsv, formatInr, formatNumber } from '../../utils/calculations';
import { generateEsgReportPdf } from '../../utils/pdfGenerator';
import { BrandMark } from '../../components/BrandMark';
import { Modal } from '../../components/Modal';
import { StatusText } from '../../components/StatusText';
import { FinancialModelingView } from './FinancialModelingView';
import {
  OwnerAuditLogsView,
  OwnerPlatformSettingsView,
  OwnerSupportView,
} from './OwnerSupportAndSettingsViews';

interface OwnerCommandCentreProps {
  navigate: (path: string) => void;
}

const OWNER_NAV = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'companies', label: 'Company Management', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'facilities', label: 'Facility Management', icon: Building2 },
  { id: 'utility', label: 'Utility Data', icon: Zap },
  { id: 'factors', label: 'Emission Factors', icon: Sliders },
  { id: 'reports', label: 'ESG Reports', icon: FileText },
  { id: 'report_review', label: 'Report Review', icon: ClipboardCheck },
  { id: 'projects', label: 'Sustainability Projects', icon: Leaf },
  { id: 'carbon', label: 'Carbon Monitoring', icon: TrendingDown },
  { id: 'verification', label: 'Verification Requests', icon: ShieldCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'subscriptions', label: 'Subscription Plans', icon: CreditCard },
  { id: 'support', label: 'Support Centre', icon: LifeBuoy },
  { id: 'audit', label: 'Audit Logs', icon: History },
  { id: 'settings', label: 'Platform Settings', icon: Settings },
] as const;

export const OwnerCommandCentre: React.FC<OwnerCommandCentreProps> = ({ navigate }) => {
  const { firebaseUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Firestore collections
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerRecord[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [utilityRecords, setUtilityRecords] = useState<UtilityRecord[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [reports, setReports] = useState<EsgReport[]>([]);
  const [reviews, setReviews] = useState<ReportReview[]>([]);
  const [projects, setProjects] = useState<SustainabilityProject[]>([]);
  const [opportunities, setOpportunities] = useState<CarbonOpportunity[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [inquiries, setInquiries] = useState<PublicInquiry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filters & Modals
  const [companySearch, setCompanySearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [inspectCompany, setInspectCompany] = useState<Company | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');

  // Emission Factor Modal
  const [factorModalOpen, setFactorModalOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EmissionFactor | null>(null);
  const [factorForm, setFactorForm] = useState({
    energyCategory: 'electricity' as EnergyCategory,
    label: '',
    scope: 'scope_2' as 'scope_1' | 'scope_2',
    factorValue: '0.716',
    factorUnit: 'kg CO2e / kWh',
    activityUnit: 'kWh',
    source: '',
    version: 'DEMO-2026.2',
    effectiveDate: new Date().toISOString().slice(0, 10),
    isDemoFactor: true,
    isActive: true,
    visibility: 'platform' as 'platform' | 'archived',
  });

  // Report Review Modal
  const [activeReview, setActiveReview] = useState<ReportReview | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ReportReview['status']>('in_review');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [assignReviewerUid, setAssignReviewerUid] = useState('');

  useEffect(() => {
    const unsubs = [
      subscribeOwnerCollection<Company>('companies', setCompanies),
      subscribeOwnerCollection<UserProfile>('users', setUsers),
      subscribeOwnerCollection<ReviewerRecord>('reviewers', setReviewers),
      subscribeOwnerCollection<Facility>('facilities', setFacilities),
      subscribeOwnerCollection<UtilityRecord>('utility_records', setUtilityRecords),
      subscribeOwnerCollection<EmissionFactor>('emission_factors', setFactors),
      subscribeOwnerCollection<EsgReport>('esg_reports', setReports),
      subscribeOwnerCollection<ReportReview>('report_reviews', setReviews),
      subscribeOwnerCollection<SustainabilityProject>('sustainability_projects', setProjects),
      subscribeOwnerCollection<CarbonOpportunity>('carbon_opportunities', setOpportunities),
      subscribeOwnerCollection<SubscriptionRecord>('subscriptions', setSubscriptions),
      subscribeOwnerCollection<SupportTicket>('support_tickets', setTickets),
      subscribeOwnerCollection<PublicInquiry>('public_inquiries', setInquiries),
      subscribeOwnerCollection<AuditLog>('audit_logs', setAuditLogs),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Platform-Wide Computed Real-Time Metrics (Zero hardcoded numbers!)
  const metrics = useMemo(() => {
    const scope1 = utilityRecords
      .filter((r) => r.scope === 'scope_1')
      .reduce((s, r) => s + (Number(r.estimatedTonnesCo2e) || 0), 0);
    const scope2 = utilityRecords
      .filter((r) => r.scope === 'scope_2')
      .reduce((s, r) => s + (Number(r.estimatedTonnesCo2e) || 0), 0);
    const estReductionOpp = opportunities.reduce((s, o) => s + (Number(o.estimatedReductionTonnes) || 0), 0);

    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c) => c.status === 'active').length,
      pendingCompanies: companies.filter((c) => c.status === 'pending').length,
      totalFacilities: facilities.length,
      utilityCount: utilityRecords.length,
      reportsCount: reports.length,
      reportsUnderReview: reports.filter((r) => r.status === 'under_review' || r.status === 'submitted').length,
      totalEmissions: Number((scope1 + scope2).toFixed(2)),
      scope1: Number(scope1.toFixed(2)),
      scope2: Number(scope2.toFixed(2)),
      estReductionOpp: Number(estReductionOpp.toFixed(2)),
      pendingVerifications: reviews.filter((r) => r.status === 'pending' || r.status === 'in_review').length,
      activeUsers: users.filter((u) => u.status === 'active').length,
      openTickets: tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length,
    };
  }, [companies, facilities, utilityRecords, reports, opportunities, reviews, users, tickets]);

  const industryChartData = useMemo(() => {
    const map = new Map<string, { industry: string; companies: number; emissions: number }>();
    for (const c of companies) {
      const entry = map.get(c.industry) || { industry: c.industry.split('&')[0].trim(), companies: 0, emissions: 0 };
      entry.companies += 1;
      map.set(c.industry, entry);
    }
    for (const u of utilityRecords) {
      const comp = companies.find((c) => c.companyId === u.companyId);
      if (comp) {
        const entry = map.get(comp.industry);
        if (entry) entry.emissions = Number((entry.emissions + u.estimatedTonnesCo2e).toFixed(2));
      }
    }
    return Array.from(map.values());
  }, [companies, utilityRecords]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (industryFilter !== 'all' && c.industry !== industryFilter) return false;
      if (companySearch.trim()) {
        const q = companySearch.toLowerCase();
        return (
          c.businessName.toLowerCase().includes(q) ||
          c.legalName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [companies, companySearch, industryFilter]);

  const openFactorModal = (factor?: EmissionFactor) => {
    if (factor) {
      setEditingFactor(factor);
      setFactorForm({
        energyCategory: factor.energyCategory,
        label: factor.label,
        scope: factor.scope,
        factorValue: String(factor.factorValue),
        factorUnit: factor.factorUnit,
        activityUnit: factor.activityUnit,
        source: factor.source,
        version: factor.version,
        effectiveDate: factor.effectiveDate,
        isDemoFactor: factor.isDemoFactor,
        isActive: factor.isActive,
        visibility: factor.visibility,
      });
    } else {
      setEditingFactor(null);
      setFactorForm({
        energyCategory: 'electricity',
        label: '',
        scope: 'scope_2',
        factorValue: '0.716',
        factorUnit: 'kg CO2e / kWh',
        activityUnit: 'kWh',
        source: 'Configured Platform Emission Factor',
        version: 'DEMO-2026.2',
        effectiveDate: new Date().toISOString().slice(0, 10),
        isDemoFactor: true,
        isActive: true,
        visibility: 'platform',
      });
    }
    setFactorModalOpen(true);
  };

  const handleSaveFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(factorForm.factorValue);
    if (!Number.isFinite(val) || val < 0) return;
    await saveEmissionFactor({
      id: editingFactor?.id,
      ...factorForm,
      factorValue: val,
    });
    setFactorModalOpen(false);
  };

  const openReviewModal = (rev: ReportReview) => {
    setActiveReview(rev);
    setDecisionStatus(rev.status);
    setDecisionNotes(rev.reviewerNotes || '');
    setCorrectionText(rev.correctionRequests || '');
    setAssignReviewerUid(rev.reviewerUid || '');
  };

  const handleSubmitReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;
    const assignedObj = reviewers.find((r) => r.uid === assignReviewerUid);
    await updateReportReviewDecision({
      review: activeReview,
      status: decisionStatus,
      reviewerNotes: decisionNotes,
      correctionRequests: correctionText,
      assignReviewer: assignedObj
        ? { uid: assignedObj.uid, name: assignedObj.displayName }
        : undefined,
      actorRole: 'platform_owner',
    });
    setActiveReview(null);
  };

  const activeNavMeta = OWNER_NAV.find((n) => n.id === activeTab) || OWNER_NAV[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Dark Navy Command Centre Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B172A] text-slate-200 flex flex-col transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <BrandMark light onClick={() => navigate('/')} />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-800 text-xs">
          <p className="text-emerald-400 font-semibold">Platform Owner Command Centre</p>
          <p className="text-slate-400 truncate mt-0.5">{firebaseUser?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Owner Command Centre navigation">
          {OWNER_NAV.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1.5">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="w-full px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg text-left cursor-pointer"
          >
            Switch to SME Company View
          </button>
          <button
            type="button"
            onClick={() => navigate('/reviewer')}
            className="w-full px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg text-left cursor-pointer"
          >
            Open Reviewer Workspace
          </button>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* White Dashboard Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-slate-500">Owner Command Centre / {activeNavMeta.label}</p>
              <h1 className="font-display text-base font-bold text-slate-900">{activeNavMeta.label}</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              exportToCsv(
                'greenyield-companies-directory',
                ['Company ID', 'Legal Name', 'Business Name', 'City', 'Industry', 'Status'],
                companies.map((c) => [c.companyId, c.legalName, c.businessName, c.city, c.industry, c.status])
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Directory CSV
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* 1. EXECUTIVE OVERVIEW (All 14 Real-Time Firestore KPIs) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Registered Companies', value: metrics.totalCompanies },
                  { label: 'Active Companies', value: metrics.activeCompanies, accent: true },
                  { label: 'Pending Applications', value: metrics.pendingCompanies },
                  { label: 'Total Facilities', value: metrics.totalFacilities },
                  { label: 'Utility Records', value: metrics.utilityCount },
                  { label: 'ESG Reports', value: metrics.reportsCount },
                  { label: 'Reports Under Review', value: metrics.reportsUnderReview },
                  { label: 'Total Est. Emissions', value: `${formatNumber(metrics.totalEmissions, 1)} t`, dark: true },
                  { label: 'Total Scope 1', value: `${formatNumber(metrics.scope1, 1)} t` },
                  { label: 'Total Scope 2', value: `${formatNumber(metrics.scope2, 1)} t` },
                  { label: 'Est. Reduction Opp.', value: `${formatNumber(metrics.estReductionOpp, 1)} t` },
                  { label: 'Pending Verifications', value: metrics.pendingVerifications },
                  { label: 'Active Users', value: metrics.activeUsers },
                  { label: 'Open Support Tickets', value: metrics.openTickets },
                ].map((k) => (
                  <div
                    key={k.label}
                    className={`p-4 rounded-xl border ${
                      k.dark ? 'bg-[#0B172A] text-white border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <p className={`text-[11px] font-medium ${k.dark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {k.label}
                    </p>
                    <p
                      className={`font-mono text-lg font-bold tabular-nums mt-1 ${
                        k.dark ? 'text-emerald-400' : k.accent ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-display text-sm font-bold text-slate-900 mb-4">
                    Platform Emissions by Industry Sector (Indicative tCO2e)
                  </h2>
                  {industryChartData.length === 0 ? (
                    <p className="text-xs text-slate-500 py-16 text-center">
                      No company utility records logged yet. Metrics update in real time as SMEs submit data.
                    </p>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={industryChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="industry" tick={{ fontSize: 11, fill: '#475569' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                          <Tooltip />
                          <Bar dataKey="emissions" name="Est. Emissions (tCO2e)" fill="#059669" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-sm font-bold text-slate-900">Recent Audit Activity</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('audit')}
                      className="text-xs font-semibold text-emerald-700 cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No audit logs yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {sortByNewest(auditLogs)
                        .slice(0, 6)
                        .map((log) => (
                          <div key={log.id} className="py-2.5">
                            <p className="font-mono font-semibold text-slate-800">{log.action}</p>
                            <p className="text-slate-600 truncate">{log.summary}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. COMPANY MANAGEMENT */}
          {activeTab === 'companies' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Search company, city, legal name..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  <option value="all">All Industries</option>
                  {Array.from(new Set(companies.map((c) => c.industry))).map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {filteredCompanies.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-500">No companies match your search criteria.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Company</th>
                          <th className="py-3 px-4 font-semibold">Industry & City</th>
                          <th className="py-3 px-4 font-semibold">Export Profile</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCompanies.map((comp) => (
                          <tr key={comp.companyId}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{comp.businessName}</p>
                              <p className="text-slate-500">{comp.legalName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-slate-800">{comp.industry}</p>
                              <p className="text-slate-500">{comp.city}, {comp.state}</p>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{comp.exportStatus}</td>
                            <td className="py-3 px-4"><StatusText status={comp.status} /></td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectCompany(comp);
                                  setReviewNoteInput(comp.adminReviewNotes || '');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Inspect & Decide
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">User</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Reviewer Access</th>
                      <th className="py-3 px-4 font-semibold text-right">Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isRev = reviewers.some((r) => r.uid === u.uid && r.active);
                      return (
                        <tr key={u.uid}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{u.displayName}</p>
                            <p className="text-slate-500">{u.email}</p>
                          </td>
                          <td className="py-3 px-4 font-mono">{u.role}</td>
                          <td className="py-3 px-4"><StatusText status={u.status} /></td>
                          <td className="py-3 px-4">{isRev ? 'Assigned Reviewer' : 'Standard'}</td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                isRev
                                  ? revokeReviewerAccess(u.uid)
                                  : grantReviewerAccess({ uid: u.uid, email: u.email, displayName: u.displayName })
                              }
                              className="px-2.5 py-1 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {isRev ? 'Revoke Reviewer' : 'Grant Reviewer'}
                            </button>
                            {u.role !== 'platform_owner' && (
                              <button
                                type="button"
                                onClick={() =>
                                  adminUpdateUser(u.uid, {
                                    status: u.status === 'active' ? 'suspended' : 'active',
                                  })
                                }
                                className="px-2.5 py-1 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              >
                                {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. FACILITY MANAGEMENT */}
          {activeTab === 'facilities' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Facility</th>
                      <th className="py-3 px-4 font-semibold">Company ID</th>
                      <th className="py-3 px-4 font-semibold">Location</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facilities.map((f) => (
                      <tr key={f.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900">{f.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{f.companyId}</td>
                        <td className="py-3 px-4 text-slate-700">{f.city}, {f.state}</td>
                        <td className="py-3 px-4 text-slate-700">{f.facilityType}</td>
                        <td className="py-3 px-4"><StatusText status={f.operationalStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. UTILITY DATA */}
          {activeTab === 'utility' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    exportToCsv(
                      'greenyield-platform-utility-data',
                      ['Company ID', 'Facility', 'Month', 'Category', 'Quantity', 'Unit', 'Scope', 'Est tCO2e'],
                      utilityRecords.map((r) => [
                        r.companyId,
                        r.facilityName,
                        r.reportingMonth,
                        r.energyCategory,
                        r.quantity,
                        r.unit,
                        r.scope,
                        r.estimatedTonnesCo2e,
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Utility CSV
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Month</th>
                        <th className="py-3 px-4 font-semibold">Facility</th>
                        <th className="py-3 px-4 font-semibold">Category</th>
                        <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                        <th className="py-3 px-4 font-semibold text-right">Est. tCO2e</th>
                        <th className="py-3 px-4 font-semibold">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {utilityRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-4 font-mono">{r.reportingMonth}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{r.facilityName}</td>
                          <td className="py-3 px-4">{r.energyCategory} ({r.scope})</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{formatNumber(r.quantity, 1)} {r.unit}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">{formatNumber(r.estimatedTonnesCo2e, 3)}</td>
                          <td className="py-3 px-4"><StatusText status={r.reviewStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. EMISSION FACTORS MANAGEMENT */}
          {activeTab === 'factors' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600 max-w-2xl">
                  Manage versioned Scope 1 and Scope 2 emission factors. Initial factors are clearly
                  labelled as academic demonstration values until replaced with verified official sources.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => seedDefaultEmissionFactors()}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Seed Standard Demo Factors
                  </button>
                  <button
                    type="button"
                    onClick={() => openFactorModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Emission Factor
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Factor Label</th>
                        <th className="py-3 px-4 font-semibold">Scope / Category</th>
                        <th className="py-3 px-4 font-semibold text-right">Value</th>
                        <th className="py-3 px-4 font-semibold">Version & Effective</th>
                        <th className="py-3 px-4 font-semibold">Source</th>
                        <th className="py-3 px-4 font-semibold text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {factors.map((f) => (
                        <tr key={f.id}>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {f.label}
                            {f.isDemoFactor && <span className="block text-[11px] font-normal text-amber-700">Demo Factor</span>}
                          </td>
                          <td className="py-3 px-4 font-mono">{f.scope} · {f.energyCategory}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">{f.factorValue} {f.factorUnit}</td>
                          <td className="py-3 px-4 font-mono">{f.version} · {f.effectiveDate}</td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs">{f.source}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openFactorModal(f)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. ESG REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Company & Report Title</th>
                      <th className="py-3 px-4 font-semibold">Period</th>
                      <th className="py-3 px-4 font-semibold text-right">Total tCO2e</th>
                      <th className="py-3 px-4 font-semibold">Completeness</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((rep) => (
                      <tr key={rep.id}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{rep.title}</p>
                          <p className="text-slate-500">{rep.companyName}</p>
                        </td>
                        <td className="py-3 px-4 font-mono">{rep.reportingPeriod}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">{formatNumber(rep.totalTonnes, 3)}</td>
                        <td className="py-3 px-4 font-mono">{rep.dataCompletenessPct}%</td>
                        <td className="py-3 px-4"><StatusText status={rep.status} /></td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              generateEsgReportPdf({
                                report: rep,
                                company: companies.find((c) => c.companyId === rep.companyId) || null,
                                facilities: facilities.filter((f) => f.companyId === rep.companyId),
                                projects: projects.filter((p) => p.companyId === rep.companyId),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8 & 11. REPORT REVIEW & VERIFICATION REQUESTS */}
          {(activeTab === 'report_review' || activeTab === 'verification') && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {reviews.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  No verification review requests submitted yet. Companies submit requests from their ESG Reports workspace.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Company & Report</th>
                        <th className="py-3 px-4 font-semibold">Assigned Reviewer</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Corrections / Notes</th>
                        <th className="py-3 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortByNewest(reviews).map((rev) => (
                        <tr key={rev.id}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{rev.reportTitle}</p>
                            <p className="text-slate-500">{rev.companyName}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{rev.reviewerName || 'Unassigned'}</td>
                          <td className="py-3 px-4"><StatusText status={rev.status} /></td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {rev.correctionRequests || rev.reviewerNotes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openReviewModal(rev)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer"
                            >
                              Review / Request Changes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 9. SUSTAINABILITY PROJECTS */}
          {activeTab === 'projects' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Project & Facility</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold text-right">Investment</th>
                      <th className="py-3 px-4 font-semibold text-right">Actual Savings</th>
                      <th className="py-3 px-4 font-semibold text-right">Est. Reduction</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-slate-500">{p.facilityName}</p>
                        </td>
                        <td className="py-3 px-4">{p.category}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatInr(p.investmentInr)}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatNumber(p.actualEnergySavingsKwh, 0)} kWh</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">{formatNumber(p.estimatedCo2eReductionTonnes, 2)} t</td>
                        <td className="py-3 px-4"><StatusText status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. CARBON OPPORTUNITY MONITORING */}
          {activeTab === 'carbon' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
                <strong>Monitoring Policy:</strong> All carbon opportunities below are indicative
                company-submitted estimates awaiting independent third-party verification. Credits
                are NOT issued and NOT tradable in this academic MVP.
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Company & Supporting Project</th>
                        <th className="py-3 px-4 font-semibold text-right">Est. Reduction</th>
                        <th className="py-3 px-4 font-semibold text-right">Hypothetical Price</th>
                        <th className="py-3 px-4 font-semibold text-right">Potential Value</th>
                        <th className="py-3 px-4 font-semibold">Issuance & Verification Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {opportunities.map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{o.companyName}</p>
                            <p className="text-slate-500">{o.projectName}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">{formatNumber(o.estimatedReductionTonnes, 3)} tCO2e</td>
                          <td className="py-3 px-4 text-right font-mono">{formatInr(o.hypotheticalPriceInr)}/t</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{formatInr(o.estimatedPotentialValueInr)}</td>
                          <td className="py-3 px-4 text-amber-800">{o.verificationStatus} · {o.issuanceStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 12. PLATFORM ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display text-sm font-bold text-slate-900 mb-4">
                  Scope 1 vs Scope 2 Aggregate Mix (tCO2e)
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Scope 1 (Direct Fuel)', tonnes: metrics.scope1 },
                        { name: 'Scope 2 (Grid Power)', tonnes: metrics.scope2 },
                        { name: 'Indicative Reductions', tonnes: metrics.estReductionOpp },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="tonnes" fill="#0B172A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-sm font-bold text-slate-900">Corridor & Sector Distribution</h2>
                <div className="divide-y divide-slate-100 text-xs">
                  {industryChartData.length === 0 ? (
                    <p className="text-slate-500 py-8 text-center">No registered SME data yet.</p>
                  ) : (
                    industryChartData.map((row) => (
                      <div key={row.industry} className="py-3 flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{row.industry}</span>
                        <span className="font-mono text-slate-600">
                          {row.companies} company(ies) · {formatNumber(row.emissions, 2)} tCO2e
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 13. SUBSCRIPTION PLANS & FINANCIAL MODEL */}
          {activeTab === 'subscriptions' && <FinancialModelingView subscriptions={subscriptions} />}

          {/* 14. SUPPORT CENTRE */}
          {activeTab === 'support' && <OwnerSupportView tickets={tickets} inquiries={inquiries} />}

          {/* 15. AUDIT LOGS */}
          {activeTab === 'audit' && <OwnerAuditLogsView auditLogs={auditLogs} />}

          {/* 16. PLATFORM SETTINGS */}
          {activeTab === 'settings' && <OwnerPlatformSettingsView />}
        </main>
      </div>

      {/* Inspect & Approve/Reject Company Modal */}
      <Modal
        open={Boolean(inspectCompany)}
        onClose={() => setInspectCompany(null)}
        title={inspectCompany?.legalName || 'Inspect Company'}
        subtitle={`${inspectCompany?.city || ''}, ${inspectCompany?.state || ''} · ${inspectCompany?.industry || ''}`}
      >
        {inspectCompany && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div><span className="text-slate-500 block">Contact Person</span><strong>{inspectCompany.contactPerson}</strong></div>
              <div><span className="text-slate-500 block">Email / Mobile</span><strong>{inspectCompany.companyEmail} · {inspectCompany.mobile}</strong></div>
              <div><span className="text-slate-500 block">Turnover & Size</span><strong>{inspectCompany.annualTurnoverRange} ({inspectCompany.companySize})</strong></div>
              <div><span className="text-slate-500 block">Export & Buyers</span><strong>{inspectCompany.exportStatus} · {inspectCompany.primaryBuyerRegion}</strong></div>
              <div className="col-span-2"><span className="text-slate-500 block">Registered Address</span><strong>{inspectCompany.registeredAddress}, {inspectCompany.city} - {inspectCompany.pinCode}</strong></div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Owner Review Notes</span>
              <textarea
                rows={2}
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                placeholder="Notes recorded in immutable audit trail..."
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={async () => {
                  await adminUpdateCompanyStatus(inspectCompany, 'rejected', reviewNoteInput);
                  setInspectCompany(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
              >
                Reject Application
              </button>
              <button
                type="button"
                onClick={async () => {
                  await adminUpdateCompanyStatus(inspectCompany, 'suspended', reviewNoteInput);
                  setInspectCompany(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer"
              >
                Suspend Account
              </button>
              <button
                type="button"
                onClick={async () => {
                  await adminUpdateCompanyStatus(inspectCompany, 'active', reviewNoteInput);
                  setInspectCompany(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve / Activate
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Emission Factor Create/Edit Modal */}
      <Modal
        open={factorModalOpen}
        onClose={() => setFactorModalOpen(false)}
        title={editingFactor ? 'Update Emission Factor' : 'Add Emission Factor'}
        subtitle="Record the source, version, and effective date for complete audit traceability."
      >
        <form onSubmit={handleSaveFactor} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Category</span>
              <select
                value={factorForm.energyCategory}
                onChange={(e) => setFactorForm({ ...factorForm, energyCategory: e.target.value as EnergyCategory })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="electricity">Electricity</option>
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
                <option value="natural_gas">Natural Gas</option>
                <option value="lpg">LPG</option>
                <option value="other_fuel">Other Fuel</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Scope</span>
              <select
                value={factorForm.scope}
                onChange={(e) => setFactorForm({ ...factorForm, scope: e.target.value as 'scope_1' | 'scope_2' })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="scope_1">Scope 1</option>
                <option value="scope_2">Scope 2</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Factor Label *</span>
            <input
              required
              value={factorForm.label}
              onChange={(e) => setFactorForm({ ...factorForm, label: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Factor Value *</span>
              <input
                type="number"
                step="any"
                min={0}
                required
                value={factorForm.factorValue}
                onChange={(e) => setFactorForm({ ...factorForm, factorValue: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Factor Unit</span>
              <input
                required
                value={factorForm.factorUnit}
                onChange={(e) => setFactorForm({ ...factorForm, factorUnit: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Version</span>
              <input
                required
                value={factorForm.version}
                onChange={(e) => setFactorForm({ ...factorForm, version: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Source Citation *</span>
            <input
              required
              value={factorForm.source}
              onChange={(e) => setFactorForm({ ...factorForm, source: e.target.value })}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="flex items-center gap-6 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={factorForm.isDemoFactor}
                onChange={(e) => setFactorForm({ ...factorForm, isDemoFactor: e.target.checked })}
              />
              <span>Label as Academic Demonstration Factor</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={factorForm.isActive}
                onChange={(e) => setFactorForm({ ...factorForm, isActive: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFactorModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Save Factor
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Review Decision Modal */}
      <Modal
        open={Boolean(activeReview)}
        onClose={() => setActiveReview(null)}
        title={`Review Request — ${activeReview?.reportTitle || ''}`}
        subtitle="Record indicative review status, request data corrections, or assign a Verification Reviewer."
      >
        <form onSubmit={handleSubmitReviewDecision} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Review Decision</span>
              <select
                value={decisionStatus}
                onChange={(e) => setDecisionStatus(e.target.value as ReportReview['status'])}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="reviewed_indicative">Reviewed Indicative (Not Certified)</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Assign Reviewer</span>
              <select
                value={assignReviewerUid}
                onChange={(e) => setAssignReviewerUid(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Unassigned / Owner Review</option>
                {reviewers.map((r) => (
                  <option key={r.uid} value={r.uid}>{r.displayName} ({r.email})</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Correction Requests (Sent to Company)</span>
            <textarea
              rows={3}
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="Specify missing utility bills, meter discrepancies, or boundary clarifications..."
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Reviewer Notes</span>
            <textarea
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="mt-1 w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveReview(null)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Record Review Decision
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
