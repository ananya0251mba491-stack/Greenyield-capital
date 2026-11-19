import { Timestamp } from 'firebase/firestore';

export type PlatformRole = 'company_user' | 'company_admin' | 'platform_owner' | 'verification_reviewer';
export type CompanyStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type EnergyCategory = 'electricity' | 'diesel' | 'petrol' | 'natural_gas' | 'lpg' | 'other_fuel';
export type EmissionScope = 'scope_1' | 'scope_2';
export type EsgReportStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved_internally'
  | 'archived';
export type ProjectCategory =
  | 'Rooftop Solar Installation'
  | 'LED Lighting Upgrade'
  | 'Energy Efficient Machinery'
  | 'Waste Heat Recovery'
  | 'Fuel Efficiency Improvements'
  | 'Waste Reduction'
  | 'Renewable Energy Procurement';
export type ProjectStatus = 'Planned' | 'In Progress' | 'Completed' | 'Under Review';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  jobTitle?: string;
  role: PlatformRole;
  activeCompanyId?: string;
  status: 'active' | 'suspended';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ReviewerRecord {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  grantedBy: string;
  active: boolean;
  createdAt: Timestamp | null;
}

export interface Company {
  id?: string;
  companyId: string;
  ownerUid: string;
  memberUids: string[];
  legalName: string;
  businessName: string;
  companyEmail: string;
  contactPerson: string;
  mobile: string;
  industry: string;
  companySize: string;
  annualTurnoverRange: string;
  registeredAddress: string;
  state: string;
  city: string;
  pinCode: string;
  gstin?: string;
  website?: string;
  exportStatus: 'Export-Oriented' | 'Domestic & Export' | 'Domestic Only';
  primaryBuyerRegion: string;
  status: CompanyStatus;
  adminReviewNotes?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CompanyMember {
  id?: string;
  companyId: string;
  companyOwnerUid: string;
  memberUids: string[];
  uid: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  role: 'company_admin' | 'company_user';
  status: 'active' | 'invited' | 'revoked';
  invitedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Facility {
  id: string;
  companyId: string;
  companyOwnerUid: string;
  memberUids: string[];
  name: string;
  address: string;
  city?: string;
  state?: string;
  facilityType: string;
  manufacturingCategory: string;
  operationalStatus: 'Active' | 'Under Commissioning' | 'Inactive';
  reportingPeriod: string;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UtilityRecord {
  id: string;
  companyId: string;
  facilityId: string;
  facilityName: string;
  companyOwnerUid: string;
  memberUids: string[];
  reportingMonth: string; // YYYY-MM
  energyCategory: EnergyCategory;
  fuelTypeLabel?: string;
  quantity: number;
  unit: string;
  electricitySource?: string;
  renewableQuantity?: number;
  scope: EmissionScope;
  appliedFactorId?: string;
  appliedFactorValue: number;
  appliedFactorVersion?: string;
  estimatedKgCo2e: number;
  estimatedTonnesCo2e: number;
  attachmentDocId?: string;
  attachmentName?: string;
  notes?: string;
  reviewStatus: 'pending_review' | 'approved_internally' | 'flagged';
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface EmissionFactor {
  id: string;
  energyCategory: EnergyCategory;
  label: string;
  scope: EmissionScope;
  factorValue: number;
  factorUnit: string;
  activityUnit: string;
  source: string;
  version: string;
  effectiveDate: string;
  isDemoFactor: boolean;
  isActive: boolean;
  visibility: 'platform' | 'archived';
  updatedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface EmissionsCalculation {
  id: string;
  companyId: string;
  companyOwnerUid: string;
  memberUids: string[];
  reportingPeriod: string;
  scope1Tonnes: number;
  scope2Tonnes: number;
  totalTonnes: number;
  electricityKwh: number;
  renewableKwh: number;
  recordsCount: number;
  missingMonths: number;
  factorSnapshotNote?: string;
  calculatedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface EsgReport {
  id: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  memberUids: string[];
  title: string;
  reportingPeriod: string;
  organizationalBoundary: string;
  totalElectricityKwh: number;
  renewableElectricityKwh?: number;
  scope1Tonnes: number;
  scope2Tonnes: number;
  totalTonnes: number;
  previousPeriodTonnes?: number;
  dataCompletenessPct: number;
  sustainabilityInitiatives?: string;
  energyReductionSummary?: string;
  dataSources?: string;
  methodology: string;
  limitations: string;
  managementNotes?: string;
  supportingDocCount?: number;
  status: EsgReportStatus;
  verificationLabel: string;
  reviewerFeedback?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ReportReview {
  id: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  memberUids: string[];
  reportId: string;
  reportTitle: string;
  reviewerUid?: string;
  reviewerName?: string;
  status: 'pending' | 'in_review' | 'changes_requested' | 'reviewed_indicative' | 'rejected';
  reviewerNotes?: string;
  correctionRequests?: string;
  submittedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SustainabilityProject {
  id: string;
  companyId: string;
  facilityId: string;
  facilityName: string;
  companyOwnerUid: string;
  memberUids: string[];
  name: string;
  category: ProjectCategory;
  startDate: string;
  investmentInr: number;
  estimatedEnergySavingsKwh: number;
  actualEnergySavingsKwh: number;
  estimatedCo2eReductionTonnes: number;
  status: ProjectStatus;
  supportingDocName?: string;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CarbonOpportunity {
  id: string;
  companyId: string;
  companyName: string;
  projectId?: string;
  projectName?: string;
  companyOwnerUid: string;
  memberUids: string[];
  baselineEmissionsTonnes: number;
  currentEmissionsTonnes: number;
  estimatedReductionTonnes: number;
  hypotheticalPriceInr: number;
  estimatedPotentialValueInr: number;
  verificationStatus: 'Awaiting Independent Verification';
  issuanceStatus: 'Not Issued · Not Tradable';
  notes?: string;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SupportingDocument {
  id: string;
  companyId: string;
  companyOwnerUid: string;
  memberUids: string[];
  facilityId?: string;
  category: 'Electricity Bill' | 'Fuel Invoice' | 'Project Evidence' | 'ESG Attachment' | 'Other';
  fileName: string;
  fileType: string;
  fileSizeKb: number;
  reportingMonth?: string;
  referenceNote?: string;
  uploadedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SubscriptionRecord {
  id: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  memberUids: string[];
  planName: 'Free Trial' | 'Standard SME Annual' | 'Growth Multi-Plant' | 'Academic Demo Plan';
  annualFeeInr: number;
  variableCostInr: number;
  paymentStatus: 'trial' | 'unpaid' | 'paid' | 'overdue';
  collectedAmountInr: number;
  startDate: string;
  renewalDate: string;
  notes?: string;
  updatedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SupportTicket {
  id: string;
  companyId: string;
  companyName: string;
  companyOwnerUid: string;
  memberUids: string[];
  subject: string;
  category: 'General Enquiry' | 'Report Issue' | 'Data Correction' | 'Technical Support' | 'Subscription';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  resolutionSummary?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  companyId: string;
  companyOwnerUid: string;
  memberUids: string[];
  senderUid: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: Timestamp | null;
}

export interface SupportInternalNote {
  id: string;
  ticketId: string;
  authorUid: string;
  authorName: string;
  note: string;
  createdAt: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  companyId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  companyId: string;
  companyOwnerUid?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  createdAt: Timestamp | null;
}

export interface FinancialScenario {
  id: 'base' | 'conservative' | 'ambitious' | 'custom';
  name: string;
  annualSubscriptionInr: number;
  customers: number;
  variableCostPerCustomerInr: number;
  monthlyFixedCostInr: number;
}

export interface PublicInquiry {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  city?: string;
  inquiryType: 'Request Demo' | 'ESG Assessment' | 'Partnership' | 'General Enquiry';
  message: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: Timestamp | null;
}
