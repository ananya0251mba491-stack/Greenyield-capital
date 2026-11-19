# GreenYield Capital — Security Specification & Threat Model

## 1. Core Data Invariants

1. **Company Isolation (Multi-Tenant Master Gate)**:
   - Every operational document (`facilities`, `utility_records`, `emissions_calculations`, `esg_reports`, `sustainability_projects`, `carbon_opportunities`, `supporting_documents`, `subscriptions`, `support_tickets`, `support_messages`) belongs to an existing `companies/{companyId}` document.
   - A user can read or mutate a company's documents ONLY if an active `company_members/{companyId}_{uid}` document exists (or the caller is an authenticated, email-verified Platform Owner).
   - Membership revocation immediately blocks all subsequent single-document reads and writes.
2. **Role Escalation Prevention**:
   - No user can self-assign `platform_owner` or `verification_reviewer` during registration or profile updates.
   - Regular `company_user` members cannot approve ESG reports (`approved_internally`) or add/remove company members; only `company_admin` (CFO/Admin) or Platform Owner may do so.
   - Companies cannot self-approve their own registration (`status` MUST be `'pending'` upon creation by a non-owner).
3. **Emission Factor & Configuration Integrity**:
   - Only Platform Owners can create, update, or archive `emission_factors` and `platform_settings`.
4. **Support Privacy (Admin-Only Internal Notes)**:
   - `support_internal_notes` are strictly readable and writable ONLY by Platform Owners. Company users and reviewers receive `PERMISSION_DENIED`.
5. **Immutable Audit Trail**:
   - `audit_logs` are append-only (`allow create` for authenticated users recording their own `actorUid`; `allow update, delete: if false` for everyone).
6. **Reviewer Boundary**:
   - Verification reviewers can inspect reports/reviews assigned to them and update review status/notes, but cannot alter `utility_records`, `subscriptions`, or `companies`, nor mark credits as issued/tradable.
7. **Temporal Integrity & Input Bounds**:
   - All `createdAt` and `updatedAt` timestamps must match `request.time`.
   - Negative energy quantities, negative investments, and oversized strings/arrays are rejected at the rule layer.
8. **PII Isolation & Query Enforcer**:
   - `users/{userId}` and `public_inquiries/{inquiryId}` cannot be read or listed by unauthorized users.
   - All `allow list` rules explicitly validate `resource.data` against `request.auth.uid` (zero `get()`/`exists()` inside `allow list`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Self-Assigned Super Admin (`users/{uid}` create)**: Creating a user profile with `role: "platform_owner"` as a non-bootstrapped email.
2. **Role Escalation on Profile Update (`users/{uid}` update)**: Updating own profile with `affectedKeys` including `role: "platform_owner"`.
3. **Cross-Company Read (`utility_records/{id}` get)**: Member of Company A attempting to read a utility record belonging to Company B.
4. **Cross-Company List Scrape (`facilities` list)**: Unfiltered collection query by an SME user attempting to enumerate facilities belonging to other companies.
5. **Company Self-Approval (`companies/{companyId}` create/update)**: Non-owner creating a company with `status: "active"` or updating `status` from `"pending"` to `"active"`.
6. **Ghost Field / Shadow Update (`utility_records/{id}` update)**: Injecting an undeclared shadow field `isVerifiedByGov: true` alongside valid fields.
7. **Negative Quantity Poisoning (`utility_records/{id}` create)**: Submitting `quantity: -500` to artificially reduce Scope 1/2 emissions.
8. **Unauthorized Report Internal Approval (`esg_reports/{id}` update)**: A `company_user` (non-admin) attempting to transition report `status` to `"approved_internally"`.
9. **Support Internal Note Leak (`support_internal_notes/{id}` get/list)**: A company admin attempting to read admin-only internal notes attached to their own support ticket.
10. **Audit Log Tampering (`audit_logs/{id}` update/delete)**: Any user (including admin) attempting to edit or delete an existing audit log entry.
11. **Emission Factor Manipulation (`emission_factors/{id}` update)**: An SME company admin attempting to lower grid electricity emission factor from `0.716` to `0.01`.
12. **Email Spoofing & Oversized ID Poisoning**: Unverified token (`email_verified: false`) matching admin email attempting privileged read/write, OR writing to a 200-char invalid document ID containing special characters.

## 3. Red Team Audit Matrix

| Collection | Identity Spoofing Blocked | State Shortcutting Blocked | Shadow Keys Blocked | PII Isolated | List Enforced Without `get()` |
|---|---|---|---|---|---|
| `users` | Yes (`uid == auth.uid`) | Yes (role immutable) | Yes (`hasOnly`) | Yes (self/owner only) | Yes (bootstrapped owner) |
| `companies` | Yes (`ownerUid == auth.uid`) | Yes (`pending` on create) | Yes (`hasOnly`) | Yes (member/owner only) | Yes (`resource.data.memberUids`) |
| `company_members` | Yes (admin gate) | Yes (role check) | Yes (`hasOnly`) | Yes (member/owner only) | Yes (`resource.data.memberUids`) |
| `facilities` | Yes (`createdBy == auth.uid`) | Yes (enum check) | Yes (`hasOnly`) | Yes (company isolated) | Yes (`resource.data.memberUids`) |
| `utility_records` | Yes (`createdBy == auth.uid`) | Yes (non-negative math) | Yes (`hasOnly`) | Yes (company isolated) | Yes (`resource.data.memberUids`) |
| `emission_factors` | Yes (owner only) | Yes (enum check) | Yes (`hasOnly`) | N/A (public demo config) | Yes (`visibility == 'platform'`) |
| `esg_reports` | Yes (`createdBy == auth.uid`) | Yes (`archived` locked) | Yes (`hasOnly`) | Yes (company isolated) | Yes (`resource.data.memberUids`) |
| `report_reviews` | Yes (reviewer/owner gate) | Yes (terminal states) | Yes (`hasOnly`) | Yes (assigned only) | Yes (`reviewerUid` / `memberUids`) |
| `support_internal_notes` | Yes (owner only) | N/A | Yes (`hasOnly`) | Yes (owner only) | Yes (bootstrapped owner) |
| `audit_logs` | Yes (`actorUid == auth.uid`) | Yes (append-only) | Yes (`hasOnly`) | Yes (company/owner only) | Yes (`companyOwnerUid` / owner) |
