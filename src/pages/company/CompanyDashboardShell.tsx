import React, { useEffect, useState } from 'react';
import {
  Building2,
  Calculator,
  FileText,
  Flame,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  Shield,
  TrendingDown,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AuditLog,
  CarbonOpportunity,
  CompanyMember,
  EmissionFactor,
  EmissionsCalculation,
  EsgReport,
  Facility,
  ReportReview,
  SubscriptionRecord,
  SupportTicket,
  SupportingDocument,
  SustainabilityProject,
  UtilityRecord,
} from '../../types/models';
import {
  subscribeActiveEmissionFactors,
  subscribeCompanyAuditLogs,
  subscribeCompanyScopedCollection,
} from '../../services/firestoreService';
import { BrandMark } from '../../components/BrandMark';
import { StatusText } from '../../components/StatusText';
import { CompanyOnboarding } from './CompanyOnboarding';
import { OverviewModule } from './modules/OverviewModule';
import { CompanyProfileModule, FacilitiesModule } from './modules/ProfileAndFacilitiesModules';
import { UtilityAndFuelModule } from './modules/UtilityAndFuelModules';
import { EmissionsCalculatorModule } from './modules/EmissionsCalculatorModule';
import { EsgReportsModule } from './modules/EsgReportsModule';
import {
  CarbonOpportunityModule,
  SustainabilityProjectsModule,
} from './modules/ProjectsAndCarbonModules';
import {
  CompanySettingsModule,
  CompanySupportModule,
  DocumentCentreModule,
  TeamManagementModule,
} from './modules/DocsTeamSupportSettingsModules';

interface CompanyDashboardShellProps {
  navigate: (path: string) => void;
}

const COMPANY_NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Company Profile', icon: Building2 },
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'utility', label: 'Utility Data', icon: Zap },
  { id: 'fuel', label: 'Fuel Consumption', icon: Flame },
  { id: 'calculator', label: 'Emissions Calculator', icon: Calculator },
  { id: 'projects', label: 'Sustainability Projects', icon: Leaf },
  { id: 'reports', label: 'ESG Reports', icon: FileText },
  { id: 'carbon', label: 'Carbon Opportunity', icon: TrendingDown },
  { id: 'documents', label: 'Document Centre', icon: FolderOpen },
  { id: 'team', label: 'Team Management', icon: Users },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export const CompanyDashboardShell: React.FC<CompanyDashboardShellProps> = ({ navigate }) => {
  const {
    firebaseUser,
    userCompanies,
    activeCompany,
    isCompanyAdmin,
    isPlatformOwner,
    isReviewer,
    selectActiveCompany,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [utilityRecords, setUtilityRecords] = useState<UtilityRecord[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [calculations, setCalculations] = useState<EmissionsCalculation[]>([]);
  const [reports, setReports] = useState<EsgReport[]>([]);
  const [reviews, setReviews] = useState<ReportReview[]>([]);
  const [projects, setProjects] = useState<SustainabilityProject[]>([]);
  const [opportunities, setOpportunities] = useState<CarbonOpportunity[]>([]);
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!firebaseUser || !activeCompany) return;
    const uid = firebaseUser.uid;
    const cid = activeCompany.companyId;

    const unsubs = [
      subscribeCompanyScopedCollection<Facility>('facilities', uid, cid, setFacilities),
      subscribeCompanyScopedCollection<UtilityRecord>('utility_records', uid, cid, setUtilityRecords),
      subscribeActiveEmissionFactors(isPlatformOwner, setFactors),
      subscribeCompanyScopedCollection<EmissionsCalculation>('emissions_calculations', uid, cid, setCalculations),
      subscribeCompanyScopedCollection<EsgReport>('esg_reports', uid, cid, setReports),
      subscribeCompanyScopedCollection<ReportReview>('report_reviews', uid, cid, setReviews),
      subscribeCompanyScopedCollection<SustainabilityProject>('sustainability_projects', uid, cid, setProjects),
      subscribeCompanyScopedCollection<CarbonOpportunity>('carbon_opportunities', uid, cid, setOpportunities),
      subscribeCompanyScopedCollection<SupportingDocument>('supporting_documents', uid, cid, setDocuments),
      subscribeCompanyScopedCollection<CompanyMember>('company_members', uid, cid, setMembers),
      subscribeCompanyScopedCollection<SupportTicket>('support_tickets', uid, cid, setTickets),
      subscribeCompanyScopedCollection<SubscriptionRecord>('subscriptions', uid, cid, setSubscriptions),
    ];

    if (activeCompany.ownerUid === uid || isPlatformOwner) {
      unsubs.push(subscribeCompanyAuditLogs(activeCompany.ownerUid, cid, setAuditLogs));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, activeCompany, isPlatformOwner]);

  const actorRole = isPlatformOwner ? 'platform_owner' : isCompanyAdmin ? 'company_admin' : 'company_user';

  if (!activeCompany || showOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <BrandMark onClick={() => navigate('/')} />
          <div className="flex items-center gap-3">
            {isPlatformOwner && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0B172A] rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Owner Command Centre
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>
        <div className="p-6 lg:p-10">
          <CompanyOnboarding
            onCompleted={() => setShowOnboarding(false)}
            onCancel={activeCompany ? () => setShowOnboarding(false) : undefined}
          />
        </div>
      </div>
    );
  }

  const activeNavMeta = COMPANY_NAV.find((n) => n.id === activeTab) || COMPANY_NAV[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar (256px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <BrandMark onClick={() => navigate('/')} />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Company Selector */}
        <div className="p-4 border-b border-slate-200">
          <p className="text-[11px] font-medium text-slate-500 mb-1">Active Organization</p>
          {userCompanies.length > 1 ? (
            <select
              value={activeCompany.companyId}
              onChange={(e) => selectActiveCompany(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg"
            >
              {userCompanies.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.businessName}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold text-slate-900 truncate">{activeCompany.businessName}</p>
          )}
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>{isCompanyAdmin ? 'Company Admin / CFO' : 'Company User'}</span>
            <StatusText status={activeCompany.status} />
          </div>
        </div>

        {/* 13 Company Navigation Items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Company dashboard navigation">
          {COMPANY_NAV.map((item) => {
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
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cross-Workspace Switchers for Authorized Roles */}
        <div className="p-3 border-t border-slate-200 space-y-1.5">
          {isPlatformOwner && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#0B172A] hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Owner Command Centre
            </button>
          )}
          {(isReviewer || isPlatformOwner) && (
            <button
              type="button"
              onClick={() => navigate('/reviewer')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Reviewer Workspace
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                {activeCompany.businessName} / {activeNavMeta.label}
              </p>
              <h1 className="font-display text-base font-bold text-slate-900 truncate">
                {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-600 truncate max-w-[180px]">
              {firebaseUser?.email}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              ESG Reports
            </button>
          </div>
        </header>

        <main key={activeCompany.companyId} className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewModule
              company={activeCompany}
              facilities={facilities}
              utilityRecords={utilityRecords}
              projects={projects}
              reports={reports}
              reviews={reviews}
              onNavigateTab={setActiveTab}
            />
          )}
          {activeTab === 'profile' && (
            <CompanyProfileModule
              company={activeCompany}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
              subscription={subscriptions[0] || null}
            />
          )}
          {activeTab === 'facilities' && (
            <FacilitiesModule
              company={activeCompany}
              facilities={facilities}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'utility' && (
            <UtilityAndFuelModule
              mode="utility"
              company={activeCompany}
              facilities={facilities}
              records={utilityRecords}
              factors={factors}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'fuel' && (
            <UtilityAndFuelModule
              mode="fuel"
              company={activeCompany}
              facilities={facilities}
              records={utilityRecords}
              factors={factors}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'calculator' && (
            <EmissionsCalculatorModule
              company={activeCompany}
              records={utilityRecords}
              factors={factors}
              calculations={calculations}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'projects' && (
            <SustainabilityProjectsModule
              company={activeCompany}
              facilities={facilities}
              projects={projects}
              factors={factors}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'reports' && (
            <EsgReportsModule
              company={activeCompany}
              facilities={facilities}
              utilityRecords={utilityRecords}
              projects={projects}
              documents={documents}
              reports={reports}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'carbon' && (
            <CarbonOpportunityModule
              company={activeCompany}
              utilityRecords={utilityRecords}
              projects={projects}
              opportunities={opportunities}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentCentreModule
              company={activeCompany}
              facilities={facilities}
              documents={documents}
              isCompanyAdmin={isCompanyAdmin}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'team' && (
            <TeamManagementModule
              company={activeCompany}
              members={members}
              isCompanyAdmin={isCompanyAdmin}
            />
          )}
          {activeTab === 'support' && (
            <CompanySupportModule
              company={activeCompany}
              tickets={tickets}
              actorRole={actorRole}
            />
          )}
          {activeTab === 'settings' && (
            <CompanySettingsModule
              company={activeCompany}
              auditLogs={auditLogs}
              onRegisterAnotherCompany={() => setShowOnboarding(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
};
