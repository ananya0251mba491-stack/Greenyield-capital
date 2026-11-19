/**
 * GreenYield Capital — Firestore Rules Security Test Suite (Phase 0 TDD)
 * Verifies the "Dirty Dozen" adversarial payloads and company-isolation invariants.
 * Designed to execute against @firebase/rules-unit-testing or static rule verification.
 */

export interface SecurityTestCase {
  id: string;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  actor: {
    uid: string;
    email: string;
    email_verified: boolean;
    role: string;
    companyId?: string;
  };
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Self-Assigned Platform Owner on Registration',
    collection: 'users/attacker_uid',
    operation: 'create',
    actor: { uid: 'attacker_uid', email: 'attacker@sme.in', email_verified: true, role: 'company_user' },
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@sme.in',
      displayName: 'Mallory',
      role: 'platform_owner',
      status: 'active',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'users.create restricts non-bootstrapped email to company_user|company_admin',
  },
  {
    id: 'DD-02',
    name: 'Privilege Escalation via Profile Update',
    collection: 'users/sme_user_1',
    operation: 'update',
    actor: { uid: 'sme_user_1', email: 'ops@acme.in', email_verified: true, role: 'company_user' },
    payload: { role: 'platform_owner' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'users.update enforces incoming().role == existing().role and affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-03',
    name: 'Cross-Company Utility Record Read',
    collection: 'utility_records/rec_company_b',
    operation: 'get',
    actor: { uid: 'sme_user_a', email: 'cfo@companya.in', email_verified: true, role: 'company_admin', companyId: 'comp_a' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'utility_records.get requires isCompanyMember(existing().companyId)',
  },
  {
    id: 'DD-04',
    name: 'Unfiltered Cross-Company Facilities List Scrape',
    collection: 'facilities',
    operation: 'list',
    actor: { uid: 'sme_user_a', email: 'cfo@companya.in', email_verified: true, role: 'company_admin', companyId: 'comp_a' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'facilities.list requires isResourceMember(existing()) matching request.auth.uid',
  },
  {
    id: 'DD-05',
    name: 'SME Company Self-Approval',
    collection: 'companies/comp_new',
    operation: 'create',
    actor: { uid: 'founder_1', email: 'md@foundry.in', email_verified: true, role: 'company_admin' },
    payload: { companyId: 'comp_new', ownerUid: 'founder_1', status: 'active' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'companies.create requires incoming().status == "pending" for non-owners',
  },
  {
    id: 'DD-06',
    name: 'Shadow Update Injecting Ghost Field',
    collection: 'utility_records/rec_1',
    operation: 'update',
    actor: { uid: 'sme_user_a', email: 'ops@companya.in', email_verified: true, role: 'company_user' },
    payload: { quantity: 1000, isVerifiedByGovernment: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUtilityRecord enforces data.keys().hasOnly(...) and update affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-07',
    name: 'Negative Fuel Quantity Poisoning',
    collection: 'utility_records/rec_neg',
    operation: 'create',
    actor: { uid: 'sme_user_a', email: 'ops@companya.in', email_verified: true, role: 'company_user' },
    payload: { quantity: -2500, energyCategory: 'diesel' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUtilityRecord mandates data.quantity >= 0',
  },
  {
    id: 'DD-08',
    name: 'Regular Company User Approving ESG Report Internally',
    collection: 'esg_reports/rep_1',
    operation: 'update',
    actor: { uid: 'regular_staff', email: 'staff@companya.in', email_verified: true, role: 'company_user' },
    payload: { status: 'approved_internally' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'esg_reports.update restricts company_user to status in [draft, submitted]',
  },
  {
    id: 'DD-09',
    name: 'Company Admin Reading Admin-Only Support Internal Notes',
    collection: 'support_internal_notes/note_1',
    operation: 'get',
    actor: { uid: 'cfo_a', email: 'cfo@companya.in', email_verified: true, role: 'company_admin' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'support_internal_notes.get requires isPlatformOwner()',
  },
  {
    id: 'DD-10',
    name: 'Audit Log Mutation / Deletion Attempt',
    collection: 'audit_logs/log_1',
    operation: 'delete',
    actor: { uid: 'owner_uid', email: 'ananyanegi1111@gmail.com', email_verified: true, role: 'platform_owner' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'audit_logs allows create only; update and delete are unconditionally false',
  },
  {
    id: 'DD-11',
    name: 'SME Tampering with Emission Factors',
    collection: 'emission_factors/ef_grid_india',
    operation: 'update',
    actor: { uid: 'cfo_a', email: 'cfo@companya.in', email_verified: true, role: 'company_admin' },
    payload: { factorValue: 0.001 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'emission_factors.update requires isPlatformOwner()',
  },
  {
    id: 'DD-12',
    name: 'Unverified Email Spoofing & Invalid Document ID',
    collection: 'companies/bad id!!$$with spaces',
    operation: 'get',
    actor: { uid: 'spoof_uid', email: 'ananyanegi1111@gmail.com', email_verified: false, role: 'platform_owner' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerifiedUser enforces email_verified == true and isValidId rejects non-alphanumeric IDs',
  },
];
