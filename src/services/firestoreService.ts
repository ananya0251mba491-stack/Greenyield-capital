import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AuditLog,
  CarbonOpportunity,
  Company,
  CompanyMember,
  EmissionFactor,
  EmissionsCalculation,
  EsgReport,
  Facility,
  FinancialScenario,
  NotificationItem,
  PublicInquiry,
  ReportReview,
  ReviewerRecord,
  SubscriptionRecord,
  SupportInternalNote,
  SupportMessage,
  SupportTicket,
  SupportingDocument,
  SustainabilityProject,
  UserProfile,
  UtilityRecord,
} from '../types/models';
import {
  BOOTSTRAPPED_OWNER_EMAIL,
  DEFAULT_DEMO_EMISSION_FACTORS,
} from '../constants/defaults';
import { sanitizeText } from '../utils/calculations';

export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

function tsMillis(ts: { toMillis?: () => number } | null | undefined): number {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
}

export function sortByNewest<T extends { createdAt?: { toMillis?: () => number } | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
}

// ============================================================================
// AUDIT LOGGING (Immutable Append-Only)
// ============================================================================

export async function recordAuditLog(params: {
  companyId: string;
  companyOwnerUid?: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const logId = makeId('log');
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(
      doc(db, 'audit_logs', logId),
      omitUndefined({
        actorUid: user.uid,
        actorEmail: sanitizeText(user.email || 'unknown@user', 254),
        actorRole: sanitizeText(params.actorRole, 40),
        companyId: sanitizeText(params.companyId || 'platform', 128),
        companyOwnerUid: params.companyOwnerUid ? sanitizeText(params.companyOwnerUid, 128) : undefined,
        action: sanitizeText(params.action, 120),
        entityType: sanitizeText(params.entityType, 80),
        entityId: params.entityId ? sanitizeText(params.entityId, 128) : undefined,
        summary: sanitizeText(params.summary, 600),
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ============================================================================
// USER PROFILE & ROLE REGISTRY
// ============================================================================

export async function ensureUserProfile(preferredRole: 'company_admin' | 'company_user' = 'company_admin'): Promise<UserProfile> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const ref = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as UserProfile) };
    }

    const isOwner = user.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() && user.emailVerified;
    const role = isOwner ? 'platform_owner' : preferredRole;

    const payload = {
      uid: user.uid,
      email: sanitizeText(user.email || '', 254),
      displayName: sanitizeText(user.displayName || user.email?.split('@')[0] || 'GreenYield User', 120),
      phone: '',
      jobTitle: isOwner ? 'Platform Owner' : 'Sustainability Lead',
      role,
      activeCompanyId: '',
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    const created = await getDoc(ref);
    return { id: created.id, ...(created.data() as UserProfile) };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'jobTitle' | 'activeCompanyId'>>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const cleaned = omitUndefined({
      displayName: updates.displayName !== undefined ? sanitizeText(updates.displayName, 120) : undefined,
      phone: updates.phone !== undefined ? sanitizeText(updates.phone, 24) : undefined,
      jobTitle: updates.jobTitle !== undefined ? sanitizeText(updates.jobTitle, 100) : undefined,
      activeCompanyId: updates.activeCompanyId !== undefined ? sanitizeText(updates.activeCompanyId, 128) : undefined,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateUser(
  uid: string,
  updates: { role?: UserProfile['role']; status?: UserProfile['status'] }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(
      doc(db, 'users', uid),
      omitUndefined({
        role: updates.role,
        status: updates.status,
        updatedAt: serverTimestamp(),
      })
    );
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: 'USER_ROLE_OR_STATUS_UPDATED',
      entityType: 'users',
      entityId: uid,
      summary: `Updated user ${uid} (${updates.role || ''} ${updates.status || ''})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function checkIsReviewer(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'reviewers', uid));
    return snap.exists() && snap.data()?.active === true;
  } catch {
    return false;
  }
}

export async function grantReviewerAccess(target: { uid: string; email: string; displayName: string }): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `reviewers/${target.uid}`;
  try {
    await setDoc(doc(db, 'reviewers', target.uid), {
      uid: target.uid,
      email: sanitizeText(target.email, 254),
      displayName: sanitizeText(target.displayName, 120),
      grantedBy: user.uid,
      active: true,
      createdAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: 'REVIEWER_ACCESS_GRANTED',
      entityType: 'reviewers',
      entityId: target.uid,
      summary: `Granted Verification Reviewer access to ${target.email}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function revokeReviewerAccess(uid: string): Promise<void> {
  const path = `reviewers/${uid}`;
  try {
    await deleteDoc(doc(db, 'reviewers', uid));
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: 'REVIEWER_ACCESS_REVOKED',
      entityType: 'reviewers',
      entityId: uid,
      summary: `Revoked Verification Reviewer access for ${uid}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// COMPANIES & TEAM MEMBERSHIP
// ============================================================================

export async function createCompanyWithMembership(params: {
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
  exportStatus: Company['exportStatus'];
  primaryBuyerRegion: string;
  isPlatformOwner: boolean;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in to register a company.');

  const companyId = makeId('comp');
  const memberDocId = `${companyId}_${user.uid}`;
  const path = `companies/${companyId}`;

  try {
    // Batch 1: Atomic Company + CompanyMember + User activeCompanyId
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'companies', companyId),
      omitUndefined({
        companyId,
        ownerUid: user.uid,
        memberUids: [user.uid],
        legalName: sanitizeText(params.legalName, 180),
        businessName: sanitizeText(params.businessName, 180),
        companyEmail: sanitizeText(params.companyEmail, 254),
        contactPerson: sanitizeText(params.contactPerson, 120),
        mobile: sanitizeText(params.mobile, 24),
        industry: sanitizeText(params.industry, 80),
        companySize: sanitizeText(params.companySize, 60),
        annualTurnoverRange: sanitizeText(params.annualTurnoverRange, 80),
        registeredAddress: sanitizeText(params.registeredAddress, 300),
        state: sanitizeText(params.state, 80),
        city: sanitizeText(params.city, 80),
        pinCode: sanitizeText(params.pinCode, 12),
        gstin: params.gstin ? sanitizeText(params.gstin, 20) : '',
        website: params.website ? sanitizeText(params.website, 200) : '',
        exportStatus: params.exportStatus,
        primaryBuyerRegion: sanitizeText(params.primaryBuyerRegion, 80),
        status: params.isPlatformOwner ? 'active' : 'pending',
        adminReviewNotes: params.isPlatformOwner ? 'Auto-activated by Platform Owner' : '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    batch.set(doc(db, 'company_members', memberDocId), {
      companyId,
      companyOwnerUid: user.uid,
      memberUids: [user.uid],
      uid: user.uid,
      email: sanitizeText(user.email || params.companyEmail, 254),
      displayName: sanitizeText(user.displayName || params.contactPerson, 120),
      jobTitle: 'Company Admin / CFO',
      role: 'company_admin',
      status: 'active',
      invitedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'users', user.uid), {
      activeCompanyId: companyId,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    // Batch 2: Trial Subscription + Initial Audit Event
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    const subId = `sub_${companyId}`;

    await setDoc(doc(db, 'subscriptions', subId), {
      companyId,
      companyName: sanitizeText(params.businessName, 180),
      companyOwnerUid: user.uid,
      memberUids: [user.uid],
      planName: 'Free Trial',
      annualFeeInr: 60000,
      variableCostInr: 10000,
      paymentStatus: 'trial',
      collectedAmountInr: 0,
      startDate: today.toISOString().slice(0, 10),
      renewalDate: nextYear.toISOString().slice(0, 10),
      notes: 'Academic MVP initial free trial allocation (no online payment gateway).',
      updatedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await recordAuditLog({
      companyId,
      companyOwnerUid: user.uid,
      actorRole: params.isPlatformOwner ? 'platform_owner' : 'company_admin',
      action: 'COMPANY_REGISTERED',
      entityType: 'companies',
      entityId: companyId,
      summary: `Registered company ${params.legalName} (${params.city}, ${params.state})`,
    });

    return companyId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCompanyProfile(
  company: Company,
  updates: Partial<Company>,
  actorRole: string
): Promise<void> {
  const path = `companies/${company.companyId}`;
  try {
    const allowed: Record<string, unknown> = {
      legalName: updates.legalName !== undefined ? sanitizeText(updates.legalName, 180) : undefined,
      businessName: updates.businessName !== undefined ? sanitizeText(updates.businessName, 180) : undefined,
      companyEmail: updates.companyEmail !== undefined ? sanitizeText(updates.companyEmail, 254) : undefined,
      contactPerson: updates.contactPerson !== undefined ? sanitizeText(updates.contactPerson, 120) : undefined,
      mobile: updates.mobile !== undefined ? sanitizeText(updates.mobile, 24) : undefined,
      industry: updates.industry !== undefined ? sanitizeText(updates.industry, 80) : undefined,
      companySize: updates.companySize !== undefined ? sanitizeText(updates.companySize, 60) : undefined,
      annualTurnoverRange: updates.annualTurnoverRange !== undefined ? sanitizeText(updates.annualTurnoverRange, 80) : undefined,
      registeredAddress: updates.registeredAddress !== undefined ? sanitizeText(updates.registeredAddress, 300) : undefined,
      state: updates.state !== undefined ? sanitizeText(updates.state, 80) : undefined,
      city: updates.city !== undefined ? sanitizeText(updates.city, 80) : undefined,
      pinCode: updates.pinCode !== undefined ? sanitizeText(updates.pinCode, 12) : undefined,
      gstin: updates.gstin !== undefined ? sanitizeText(updates.gstin, 20) : undefined,
      website: updates.website !== undefined ? sanitizeText(updates.website, 200) : undefined,
      exportStatus: updates.exportStatus,
      primaryBuyerRegion: updates.primaryBuyerRegion !== undefined ? sanitizeText(updates.primaryBuyerRegion, 80) : undefined,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'companies', company.companyId), omitUndefined(allowed));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'COMPANY_PROFILE_UPDATED',
      entityType: 'companies',
      entityId: company.companyId,
      summary: `Updated company profile for ${company.businessName}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateCompanyStatus(
  company: Company,
  status: Company['status'],
  adminReviewNotes: string
): Promise<void> {
  const path = `companies/${company.companyId}`;
  try {
    await updateDoc(doc(db, 'companies', company.companyId), {
      status,
      adminReviewNotes: sanitizeText(adminReviewNotes, 1000),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole: 'platform_owner',
      action: `COMPANY_STATUS_${status.toUpperCase()}`,
      entityType: 'companies',
      entityId: company.companyId,
      summary: `Set ${company.businessName} status to ${status}. Notes: ${adminReviewNotes || 'None'}`,
    });
    const notifId = makeId('notif');
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: company.ownerUid,
      companyId: company.companyId,
      title: `Company Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `${company.businessName} status was updated to ${status}. ${adminReviewNotes || ''}`.slice(0, 500),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function inviteCompanyMember(
  company: Company,
  member: { email: string; displayName: string; jobTitle: string; role: 'company_admin' | 'company_user'; uid?: string }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const targetUid = member.uid && /^[a-zA-Z0-9_-]+$/.test(member.uid) ? member.uid : makeId('inv');
  const docId = `${company.companyId}_${targetUid}`;
  const path = `company_members/${docId}`;
  try {
    const updatedMemberUids = Array.from(new Set([...company.memberUids, targetUid])).slice(0, 25);
    await setDoc(doc(db, 'company_members', docId), {
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      memberUids: updatedMemberUids,
      uid: targetUid,
      email: sanitizeText(member.email, 254),
      displayName: sanitizeText(member.displayName, 120),
      jobTitle: sanitizeText(member.jobTitle, 100),
      role: member.role,
      status: member.uid ? 'active' : 'invited',
      invitedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'companies', company.companyId), {
      memberUids: updatedMemberUids,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole: 'company_admin',
      action: 'TEAM_MEMBER_INVITED',
      entityType: 'company_members',
      entityId: docId,
      summary: `Invited ${member.displayName} (${member.email}) as ${member.role}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCompanyMemberRecord(
  company: Company,
  member: CompanyMember,
  updates: { role?: 'company_admin' | 'company_user'; status?: 'active' | 'invited' | 'revoked'; jobTitle?: string }
): Promise<void> {
  const docId = `${member.companyId}_${member.uid}`;
  const path = `company_members/${docId}`;
  try {
    await updateDoc(
      doc(db, 'company_members', docId),
      omitUndefined({
        role: updates.role,
        status: updates.status,
        jobTitle: updates.jobTitle !== undefined ? sanitizeText(updates.jobTitle, 100) : undefined,
        updatedAt: serverTimestamp(),
      })
    );
    if (updates.status === 'revoked' && member.uid !== company.ownerUid) {
      const filtered = company.memberUids.filter((id) => id !== member.uid);
      if (filtered.length >= 1) {
        await updateDoc(doc(db, 'companies', company.companyId), {
          memberUids: filtered,
          updatedAt: serverTimestamp(),
        });
      }
    }
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole: 'company_admin',
      action: 'TEAM_MEMBER_UPDATED',
      entityType: 'company_members',
      entityId: docId,
      summary: `Updated member ${member.email} (${updates.role || member.role}, ${updates.status || member.status})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// FACILITIES
// ============================================================================

export async function saveFacility(
  company: Company,
  data: {
    id?: string;
    name: string;
    address: string;
    city: string;
    state: string;
    facilityType: string;
    manufacturingCategory: string;
    operationalStatus: Facility['operationalStatus'];
    reportingPeriod: string;
  },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = data.id || makeId('fac');
  const path = `facilities/${id}`;
  try {
    if (data.id) {
      await updateDoc(doc(db, 'facilities', id), {
        name: sanitizeText(data.name, 150),
        address: sanitizeText(data.address, 300),
        city: sanitizeText(data.city, 80),
        state: sanitizeText(data.state, 80),
        facilityType: sanitizeText(data.facilityType, 80),
        manufacturingCategory: sanitizeText(data.manufacturingCategory, 100),
        operationalStatus: data.operationalStatus,
        reportingPeriod: sanitizeText(data.reportingPeriod, 40),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'facilities', id), {
        companyId: company.companyId,
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        name: sanitizeText(data.name, 150),
        address: sanitizeText(data.address, 300),
        city: sanitizeText(data.city, 80),
        state: sanitizeText(data.state, 80),
        facilityType: sanitizeText(data.facilityType, 80),
        manufacturingCategory: sanitizeText(data.manufacturingCategory, 100),
        operationalStatus: data.operationalStatus,
        reportingPeriod: sanitizeText(data.reportingPeriod, 40),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: data.id ? 'FACILITY_UPDATED' : 'FACILITY_CREATED',
      entityType: 'facilities',
      entityId: id,
      summary: `${data.id ? 'Updated' : 'Added'} facility ${data.name} (${data.city})`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteFacility(company: Company, facility: Facility, actorRole: string): Promise<void> {
  const path = `facilities/${facility.id}`;
  try {
    await deleteDoc(doc(db, 'facilities', facility.id));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'FACILITY_DELETED',
      entityType: 'facilities',
      entityId: facility.id,
      summary: `Deleted facility ${facility.name}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// UTILITY & FUEL RECORDS
// ============================================================================

export async function saveUtilityRecord(
  company: Company,
  data: Omit<UtilityRecord, 'id' | 'companyId' | 'companyOwnerUid' | 'memberUids' | 'createdBy' | 'createdAt' | 'updatedAt'> & { id?: string },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = data.id || makeId('util');
  const path = `utility_records/${id}`;
  try {
    const fields = omitUndefined({
      facilityId: sanitizeText(data.facilityId, 128),
      facilityName: sanitizeText(data.facilityName, 150),
      reportingMonth: sanitizeText(data.reportingMonth, 7),
      energyCategory: data.energyCategory,
      fuelTypeLabel: data.fuelTypeLabel ? sanitizeText(data.fuelTypeLabel, 100) : '',
      quantity: data.quantity,
      unit: sanitizeText(data.unit, 40),
      electricitySource: data.electricitySource ? sanitizeText(data.electricitySource, 80) : '',
      renewableQuantity: data.renewableQuantity ?? 0,
      scope: data.scope,
      appliedFactorId: data.appliedFactorId ? sanitizeText(data.appliedFactorId, 128) : '',
      appliedFactorValue: data.appliedFactorValue,
      appliedFactorVersion: data.appliedFactorVersion ? sanitizeText(data.appliedFactorVersion, 60) : '',
      estimatedKgCo2e: data.estimatedKgCo2e,
      estimatedTonnesCo2e: data.estimatedTonnesCo2e,
      attachmentDocId: data.attachmentDocId ? sanitizeText(data.attachmentDocId, 128) : '',
      attachmentName: data.attachmentName ? sanitizeText(data.attachmentName, 200) : '',
      notes: data.notes ? sanitizeText(data.notes, 500) : '',
      reviewStatus: data.reviewStatus,
      updatedAt: serverTimestamp(),
    });

    if (data.id) {
      await updateDoc(doc(db, 'utility_records', id), fields);
    } else {
      await setDoc(doc(db, 'utility_records', id), {
        ...fields,
        companyId: company.companyId,
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: data.id ? 'UTILITY_RECORD_UPDATED' : 'UTILITY_RECORD_CREATED',
      entityType: 'utility_records',
      entityId: id,
      summary: `${data.id ? 'Updated' : 'Recorded'} ${data.energyCategory} (${data.quantity} ${data.unit}) for ${data.reportingMonth} — ${data.estimatedTonnesCo2e} tCO2e`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteUtilityRecord(company: Company, record: UtilityRecord, actorRole: string): Promise<void> {
  const path = `utility_records/${record.id}`;
  try {
    await deleteDoc(doc(db, 'utility_records', record.id));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'UTILITY_RECORD_DELETED',
      entityType: 'utility_records',
      entityId: record.id,
      summary: `Deleted ${record.energyCategory} record (${record.reportingMonth}, ${record.quantity} ${record.unit})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// EMISSION FACTORS (Platform Owner Managed)
// ============================================================================

export async function seedDefaultEmissionFactors(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const batch = writeBatch(db);
    for (const f of DEFAULT_DEMO_EMISSION_FACTORS) {
      batch.set(doc(db, 'emission_factors', f.id), {
        energyCategory: f.energyCategory,
        label: f.label,
        scope: f.scope,
        factorValue: f.factorValue,
        factorUnit: f.factorUnit,
        activityUnit: f.activityUnit,
        source: f.source,
        version: f.version,
        effectiveDate: f.effectiveDate,
        isDemoFactor: true,
        isActive: true,
        visibility: 'platform',
        updatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: 'DEMO_EMISSION_FACTORS_SEEDED',
      entityType: 'emission_factors',
      summary: `Seeded ${DEFAULT_DEMO_EMISSION_FACTORS.length} standard academic demonstration emission factors`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'emission_factors');
  }
}

export async function saveEmissionFactor(
  factor: Omit<EmissionFactor, 'id' | 'updatedBy' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = factor.id || makeId('ef');
  const path = `emission_factors/${id}`;
  try {
    const payload = {
      energyCategory: factor.energyCategory,
      label: sanitizeText(factor.label, 140),
      scope: factor.scope,
      factorValue: factor.factorValue,
      factorUnit: sanitizeText(factor.factorUnit, 60),
      activityUnit: sanitizeText(factor.activityUnit, 40),
      source: sanitizeText(factor.source, 240),
      version: sanitizeText(factor.version, 40),
      effectiveDate: sanitizeText(factor.effectiveDate, 20),
      isDemoFactor: factor.isDemoFactor,
      isActive: factor.isActive,
      visibility: factor.visibility,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    };
    if (factor.id) {
      await updateDoc(doc(db, 'emission_factors', id), payload);
    } else {
      await setDoc(doc(db, 'emission_factors', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: factor.id ? 'EMISSION_FACTOR_UPDATED' : 'EMISSION_FACTOR_CREATED',
      entityType: 'emission_factors',
      entityId: id,
      summary: `${factor.label}: ${factor.factorValue} ${factor.factorUnit} (v${factor.version})`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, factor.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

// ============================================================================
// EMISSIONS CALCULATION SNAPSHOTS
// ============================================================================

export async function saveEmissionsCalculation(
  company: Company,
  data: Omit<EmissionsCalculation, 'id' | 'companyId' | 'companyOwnerUid' | 'memberUids' | 'calculatedBy' | 'createdAt' | 'updatedAt'>,
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = makeId('calc');
  const path = `emissions_calculations/${id}`;
  try {
    await setDoc(
      doc(db, 'emissions_calculations', id),
      omitUndefined({
        companyId: company.companyId,
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        reportingPeriod: sanitizeText(data.reportingPeriod, 60),
        scope1Tonnes: data.scope1Tonnes,
        scope2Tonnes: data.scope2Tonnes,
        totalTonnes: data.totalTonnes,
        electricityKwh: data.electricityKwh,
        renewableKwh: data.renewableKwh,
        recordsCount: data.recordsCount,
        missingMonths: data.missingMonths,
        factorSnapshotNote: data.factorSnapshotNote ? sanitizeText(data.factorSnapshotNote, 400) : '',
        calculatedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'EMISSIONS_SNAPSHOT_SAVED',
      entityType: 'emissions_calculations',
      entityId: id,
      summary: `Saved ${data.reportingPeriod} snapshot: ${data.totalTonnes} tCO2e (S1: ${data.scope1Tonnes}, S2: ${data.scope2Tonnes})`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ============================================================================
// ESG REPORTS & VERIFICATION REVIEWS
// ============================================================================

export async function saveEsgReport(
  company: Company,
  data: Omit<EsgReport, 'id' | 'companyId' | 'companyName' | 'companyOwnerUid' | 'memberUids' | 'createdBy' | 'createdAt' | 'updatedAt'> & { id?: string },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = data.id || makeId('esg');
  const path = `esg_reports/${id}`;
  try {
    const core = omitUndefined({
      title: sanitizeText(data.title, 180),
      reportingPeriod: sanitizeText(data.reportingPeriod, 60),
      organizationalBoundary: sanitizeText(data.organizationalBoundary, 500),
      totalElectricityKwh: data.totalElectricityKwh,
      renewableElectricityKwh: data.renewableElectricityKwh ?? 0,
      scope1Tonnes: data.scope1Tonnes,
      scope2Tonnes: data.scope2Tonnes,
      totalTonnes: data.totalTonnes,
      previousPeriodTonnes: data.previousPeriodTonnes ?? 0,
      dataCompletenessPct: data.dataCompletenessPct,
      sustainabilityInitiatives: sanitizeText(data.sustainabilityInitiatives || '', 2000),
      energyReductionSummary: sanitizeText(data.energyReductionSummary || '', 2000),
      dataSources: sanitizeText(data.dataSources || '', 1200),
      methodology: sanitizeText(data.methodology, 1600),
      limitations: sanitizeText(data.limitations, 1600),
      managementNotes: sanitizeText(data.managementNotes || '', 2000),
      supportingDocCount: data.supportingDocCount ?? 0,
      status: data.status,
      verificationLabel: sanitizeText(data.verificationLabel, 120),
      approvedBy: data.approvedBy ? sanitizeText(data.approvedBy, 128) : undefined,
      updatedAt: serverTimestamp(),
    });

    if (data.id) {
      await updateDoc(doc(db, 'esg_reports', id), core);
    } else {
      await setDoc(doc(db, 'esg_reports', id), {
        ...core,
        companyId: company.companyId,
        companyName: sanitizeText(company.businessName, 180),
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        reviewerFeedback: '',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: data.id ? `ESG_REPORT_${data.status.toUpperCase()}` : 'ESG_REPORT_CREATED',
      entityType: 'esg_reports',
      entityId: id,
      summary: `${data.title} (${data.reportingPeriod}) — status: ${data.status}`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function submitVerificationReviewRequest(
  company: Company,
  report: EsgReport,
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const reviewId = makeId('rev');
  const path = `report_reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'report_reviews', reviewId), {
      companyId: company.companyId,
      companyName: sanitizeText(company.businessName, 180),
      companyOwnerUid: company.ownerUid,
      memberUids: company.memberUids,
      reportId: report.id,
      reportTitle: sanitizeText(report.title, 180),
      reviewerUid: '',
      reviewerName: 'Unassigned',
      status: 'pending',
      reviewerNotes: '',
      correctionRequests: '',
      submittedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (report.status === 'draft') {
      await updateDoc(doc(db, 'esg_reports', report.id), {
        status: 'submitted',
        updatedAt: serverTimestamp(),
      });
    }
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'VERIFICATION_REVIEW_REQUESTED',
      entityType: 'report_reviews',
      entityId: reviewId,
      summary: `Submitted ${report.title} for verification review (indicative review only)`,
    });
    return reviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateReportReviewDecision(params: {
  review: ReportReview;
  status: ReportReview['status'];
  reviewerNotes: string;
  correctionRequests: string;
  assignReviewer?: { uid: string; name: string };
  actorRole: 'platform_owner' | 'verification_reviewer';
}): Promise<void> {
  const path = `report_reviews/${params.review.id}`;
  try {
    const updatePayload: Record<string, unknown> = {
      status: params.status,
      reviewerNotes: sanitizeText(params.reviewerNotes, 2000),
      correctionRequests: sanitizeText(params.correctionRequests, 2000),
      updatedAt: serverTimestamp(),
    };
    if (params.actorRole === 'platform_owner' && params.assignReviewer) {
      updatePayload.reviewerUid = params.assignReviewer.uid;
      updatePayload.reviewerName = sanitizeText(params.assignReviewer.name, 120);
    }
    await updateDoc(doc(db, 'report_reviews', params.review.id), updatePayload);

    // Sync report feedback & status
    const mappedReportStatus =
      params.status === 'changes_requested' || params.status === 'rejected'
        ? 'changes_requested'
        : 'under_review';
    const verificationLabel =
      params.status === 'reviewed_indicative'
        ? 'Reviewed Indicative (Not Externally Certified)'
        : params.status === 'changes_requested'
        ? 'Changes Requested by Reviewer'
        : 'Under Indicative Review';

    await updateDoc(doc(db, 'esg_reports', params.review.reportId), {
      status: mappedReportStatus,
      verificationLabel,
      reviewerFeedback: sanitizeText(params.correctionRequests || params.reviewerNotes, 1500),
      updatedAt: serverTimestamp(),
    });

    await recordAuditLog({
      companyId: params.review.companyId,
      companyOwnerUid: params.review.companyOwnerUid,
      actorRole: params.actorRole,
      action: `REPORT_REVIEW_${params.status.toUpperCase()}`,
      entityType: 'report_reviews',
      entityId: params.review.id,
      summary: `Review updated to ${params.status} for ${params.review.reportTitle}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// SUSTAINABILITY PROJECTS & CARBON OPPORTUNITIES
// ============================================================================

export async function saveSustainabilityProject(
  company: Company,
  data: Omit<SustainabilityProject, 'id' | 'companyId' | 'companyOwnerUid' | 'memberUids' | 'createdBy' | 'createdAt' | 'updatedAt'> & { id?: string },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = data.id || makeId('proj');
  const path = `sustainability_projects/${id}`;
  try {
    const core = omitUndefined({
      facilityId: sanitizeText(data.facilityId, 128),
      facilityName: sanitizeText(data.facilityName, 150),
      name: sanitizeText(data.name, 160),
      category: data.category,
      startDate: sanitizeText(data.startDate, 20),
      investmentInr: data.investmentInr,
      estimatedEnergySavingsKwh: data.estimatedEnergySavingsKwh,
      actualEnergySavingsKwh: data.actualEnergySavingsKwh,
      estimatedCo2eReductionTonnes: data.estimatedCo2eReductionTonnes,
      status: data.status,
      supportingDocName: data.supportingDocName ? sanitizeText(data.supportingDocName, 200) : '',
      notes: data.notes ? sanitizeText(data.notes, 1000) : '',
      updatedAt: serverTimestamp(),
    });

    if (data.id) {
      await updateDoc(doc(db, 'sustainability_projects', id), core);
    } else {
      await setDoc(doc(db, 'sustainability_projects', id), {
        ...core,
        companyId: company.companyId,
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: data.id ? 'PROJECT_UPDATED' : 'PROJECT_CREATED',
      entityType: 'sustainability_projects',
      entityId: id,
      summary: `${data.name} (${data.category}) — ${data.status}`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSustainabilityProject(company: Company, project: SustainabilityProject, actorRole: string): Promise<void> {
  const path = `sustainability_projects/${project.id}`;
  try {
    await deleteDoc(doc(db, 'sustainability_projects', project.id));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'PROJECT_DELETED',
      entityType: 'sustainability_projects',
      entityId: project.id,
      summary: `Deleted project ${project.name}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCarbonOpportunity(
  company: Company,
  data: {
    id?: string;
    projectId?: string;
    projectName?: string;
    baselineEmissionsTonnes: number;
    currentEmissionsTonnes: number;
    estimatedReductionTonnes: number;
    hypotheticalPriceInr: number;
    estimatedPotentialValueInr: number;
    notes?: string;
  },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = data.id || makeId('carb');
  const path = `carbon_opportunities/${id}`;
  try {
    const fields = {
      projectId: sanitizeText(data.projectId || '', 128),
      projectName: sanitizeText(data.projectName || 'General Operational Reduction', 160),
      baselineEmissionsTonnes: data.baselineEmissionsTonnes,
      currentEmissionsTonnes: data.currentEmissionsTonnes,
      estimatedReductionTonnes: data.estimatedReductionTonnes,
      hypotheticalPriceInr: data.hypotheticalPriceInr,
      estimatedPotentialValueInr: data.estimatedPotentialValueInr,
      notes: sanitizeText(data.notes || '', 1000),
      updatedAt: serverTimestamp(),
    };

    if (data.id) {
      await updateDoc(doc(db, 'carbon_opportunities', id), fields);
    } else {
      await setDoc(doc(db, 'carbon_opportunities', id), {
        ...fields,
        companyId: company.companyId,
        companyName: sanitizeText(company.businessName, 180),
        companyOwnerUid: company.ownerUid,
        memberUids: company.memberUids,
        verificationStatus: 'Awaiting Independent Verification',
        issuanceStatus: 'Not Issued · Not Tradable',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: data.id ? 'CARBON_ESTIMATE_UPDATED' : 'CARBON_ESTIMATE_CREATED',
      entityType: 'carbon_opportunities',
      entityId: id,
      summary: `Estimated reduction ${data.estimatedReductionTonnes} tCO2e at ₹${data.hypotheticalPriceInr}/t (Awaiting Independent Verification, Not Issued)`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, data.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCarbonOpportunity(company: Company, opp: CarbonOpportunity, actorRole: string): Promise<void> {
  const path = `carbon_opportunities/${opp.id}`;
  try {
    await deleteDoc(doc(db, 'carbon_opportunities', opp.id));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'CARBON_ESTIMATE_DELETED',
      entityType: 'carbon_opportunities',
      entityId: opp.id,
      summary: `Deleted indicative opportunity estimate (${opp.projectName})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// SUPPORTING DOCUMENTS
// ============================================================================

export async function saveSupportingDocument(
  company: Company,
  data: {
    facilityId?: string;
    category: SupportingDocument['category'];
    fileName: string;
    fileType: string;
    fileSizeKb: number;
    reportingMonth?: string;
    referenceNote?: string;
  },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = makeId('doc');
  const path = `supporting_documents/${id}`;
  try {
    await setDoc(doc(db, 'supporting_documents', id), {
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      memberUids: company.memberUids,
      facilityId: sanitizeText(data.facilityId || '', 128),
      category: data.category,
      fileName: sanitizeText(data.fileName, 200),
      fileType: sanitizeText(data.fileType || 'application/pdf', 80),
      fileSizeKb: Math.max(0, Math.min(51200, Math.round(data.fileSizeKb))),
      reportingMonth: sanitizeText(data.reportingMonth || '', 20),
      referenceNote: sanitizeText(data.referenceNote || '', 500),
      uploadedBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'DOCUMENT_LOGGED',
      entityType: 'supporting_documents',
      entityId: id,
      summary: `Logged evidence file ${data.fileName} (${data.category})`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSupportingDocument(company: Company, docItem: SupportingDocument, actorRole: string): Promise<void> {
  const path = `supporting_documents/${docItem.id}`;
  try {
    await deleteDoc(doc(db, 'supporting_documents', docItem.id));
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'DOCUMENT_DELETED',
      entityType: 'supporting_documents',
      entityId: docItem.id,
      summary: `Removed evidence document ${docItem.fileName}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// SUBSCRIPTIONS & FINANCIAL SCENARIOS
// ============================================================================

export async function adminUpdateSubscription(
  sub: SubscriptionRecord,
  updates: {
    planName: SubscriptionRecord['planName'];
    annualFeeInr: number;
    variableCostInr: number;
    paymentStatus: SubscriptionRecord['paymentStatus'];
    collectedAmountInr: number;
    renewalDate: string;
    notes: string;
  }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `subscriptions/${sub.id}`;
  try {
    // Enforce honesty: never mark unpaid/trial/overdue as having collectedAmount > 0 if paymentStatus !== 'paid' unless partial explicitly entered, and never mark unpaid as paid automatically
    await updateDoc(doc(db, 'subscriptions', sub.id), {
      planName: updates.planName,
      annualFeeInr: updates.annualFeeInr,
      variableCostInr: updates.variableCostInr,
      paymentStatus: updates.paymentStatus,
      collectedAmountInr: updates.paymentStatus === 'trial' ? 0 : updates.collectedAmountInr,
      renewalDate: sanitizeText(updates.renewalDate, 20),
      notes: sanitizeText(updates.notes, 500),
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: sub.companyId,
      companyOwnerUid: sub.companyOwnerUid,
      actorRole: 'platform_owner',
      action: 'SUBSCRIPTION_UPDATED',
      entityType: 'subscriptions',
      entityId: sub.id,
      summary: `Updated ${sub.companyName} plan to ${updates.planName} (${updates.paymentStatus}, collected ₹${updates.collectedAmountInr})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function savePlatformSetting(
  settingKey: string,
  visibility: 'platform' | 'admin_only',
  payload: Record<string, unknown>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `platform_settings/${settingKey}`;
  try {
    await setDoc(doc(db, 'platform_settings', settingKey), {
      settingKey: sanitizeText(settingKey, 80),
      visibility,
      payload,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: 'platform',
      actorRole: 'platform_owner',
      action: 'PLATFORM_SETTING_UPDATED',
      entityType: 'platform_settings',
      entityId: settingKey,
      summary: `Updated platform configuration: ${settingKey}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveFinancialScenariosSetting(scenarios: FinancialScenario[]): Promise<void> {
  await savePlatformSetting('financial_scenarios', 'admin_only', { scenarios });
}

// ============================================================================
// SUPPORT CENTRE (Tickets, Public Messages, Admin-Only Internal Notes, Inquiries)
// ============================================================================

export async function createSupportTicket(
  company: Company,
  data: {
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    description: string;
  },
  actorRole: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const id = makeId('tkt');
  const path = `support_tickets/${id}`;
  try {
    await setDoc(doc(db, 'support_tickets', id), {
      companyId: company.companyId,
      companyName: sanitizeText(company.businessName, 180),
      companyOwnerUid: company.ownerUid,
      memberUids: company.memberUids,
      subject: sanitizeText(data.subject, 180),
      category: data.category,
      priority: data.priority,
      status: 'Open',
      description: sanitizeText(data.description, 2000),
      resolutionSummary: '',
      createdBy: user.uid,
      createdByName: sanitizeText(user.displayName || user.email || 'Company User', 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: company.companyId,
      companyOwnerUid: company.ownerUid,
      actorRole,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'support_tickets',
      entityId: id,
      summary: `Opened support ticket: ${data.subject} (${data.priority})`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminUpdateSupportTicket(
  ticket: SupportTicket,
  updates: { status: SupportTicket['status']; priority: SupportTicket['priority']; resolutionSummary: string }
): Promise<void> {
  const path = `support_tickets/${ticket.id}`;
  try {
    await updateDoc(doc(db, 'support_tickets', ticket.id), {
      status: updates.status,
      priority: updates.priority,
      resolutionSummary: sanitizeText(updates.resolutionSummary, 1000),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog({
      companyId: ticket.companyId,
      companyOwnerUid: ticket.companyOwnerUid,
      actorRole: 'platform_owner',
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'support_tickets',
      entityId: ticket.id,
      summary: `Updated ticket "${ticket.subject}" to ${updates.status}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function postSupportMessage(
  ticket: SupportTicket,
  body: string,
  senderRole: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const id = makeId('msg');
  const path = `support_messages/${id}`;
  try {
    await setDoc(doc(db, 'support_messages', id), {
      ticketId: ticket.id,
      companyId: ticket.companyId,
      companyOwnerUid: ticket.companyOwnerUid,
      memberUids: ticket.memberUids,
      senderUid: user.uid,
      senderName: sanitizeText(user.displayName || user.email || 'User', 120),
      senderRole: sanitizeText(senderRole, 40),
      body: sanitizeText(body, 2000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addAdminInternalNote(ticketId: string, note: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const id = makeId('inote');
  const path = `support_internal_notes/${id}`;
  try {
    await setDoc(doc(db, 'support_internal_notes', id), {
      ticketId,
      authorUid: user.uid,
      authorName: sanitizeText(user.displayName || user.email || 'Platform Owner', 120),
      note: sanitizeText(note, 2000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitPublicInquiry(data: {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  city?: string;
  inquiryType: PublicInquiry['inquiryType'];
  message: string;
}): Promise<string> {
  const id = makeId('inq');
  const path = `public_inquiries/${id}`;
  try {
    await setDoc(doc(db, 'public_inquiries', id), {
      fullName: sanitizeText(data.fullName, 120),
      companyName: sanitizeText(data.companyName, 160),
      email: sanitizeText(data.email, 254),
      phone: sanitizeText(data.phone || '', 24),
      city: sanitizeText(data.city || '', 80),
      inquiryType: data.inquiryType,
      message: sanitizeText(data.message, 1500),
      status: 'new',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminUpdatePublicInquiryStatus(id: string, status: PublicInquiry['status']): Promise<void> {
  const path = `public_inquiries/${id}`;
  try {
    await updateDoc(doc(db, 'public_inquiries', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// LIVE SUBSCRIPTIONS (Respecting Query Enforcer Rules with Zero Composite Index Traps)
// ============================================================================

export function subscribeCompanyScopedCollection<T>(
  collectionName: string,
  userUid: string,
  companyId: string,
  onData: (items: T[]) => void
): Unsubscribe {
  const q = query(collection(db, collectionName), where('memberUids', 'array-contains', userUid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as unknown as T & { companyId?: string }))
        .filter((item) => item.companyId === companyId);
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export function subscribeOwnerCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, collectionName),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}

export function subscribeActiveEmissionFactors(
  isOwner: boolean,
  onData: (items: EmissionFactor[]) => void
): Unsubscribe {
  const ref = isOwner
    ? collection(db, 'emission_factors')
    : query(collection(db, 'emission_factors'), where('visibility', '==', 'platform'));
  return onSnapshot(
    ref,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmissionFactor, 'id'>) }));
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'emission_factors');
    }
  );
}

export function subscribeCompanyAuditLogs(
  companyOwnerUid: string,
  companyId: string,
  onData: (items: AuditLog[]) => void
): Unsubscribe {
  const q = query(collection(db, 'audit_logs'), where('companyOwnerUid', '==', companyOwnerUid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }))
        .filter((l) => l.companyId === companyId);
      onData(sortByNewest(rows));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    }
  );
}

export function subscribeReviewerAssignedReviews(
  reviewerUid: string,
  isOwner: boolean,
  onData: (items: ReportReview[]) => void
): Unsubscribe {
  const ref = isOwner
    ? collection(db, 'report_reviews')
    : query(collection(db, 'report_reviews'), where('reviewerUid', '==', reviewerUid));
  return onSnapshot(
    ref,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReportReview, 'id'>) }));
      onData(sortByNewest(rows));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'report_reviews');
    }
  );
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('recipientUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }));
      onData(sortByNewest(rows));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );
}

export async function fetchSingleReportForReviewer(reportId: string): Promise<EsgReport | null> {
  const path = `esg_reports/${reportId}`;
  try {
    const snap = await getDoc(doc(db, 'esg_reports', reportId));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<EsgReport, 'id'>) }) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchPlatformSetting(settingKey: string): Promise<Record<string, unknown> | null> {
  const path = `platform_settings/${settingKey}`;
  try {
    const snap = await getDoc(doc(db, 'platform_settings', settingKey));
    return snap.exists() ? (snap.data()?.payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function fetchAllReviewers(): Promise<ReviewerRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'reviewers'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReviewerRecord, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reviewers');
  }
}

export type { SupportInternalNote, SupportMessage };
