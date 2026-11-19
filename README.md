# GreenYield Capital

**Measure Your Impact. Report Your Progress. Unlock Green Value.**

GreenYield Capital is a full-stack B2B Climate FinTech and ESG Reporting Platform built for Indian industrial SMEs across Pune, Mumbai, Ahmedabad, Surat, NCR, and national manufacturing corridors.

> **Academic & Methodological Notice:** This platform is an MBA venture academic prototype designed for operational emissions estimation, structured ESG reporting workflows, and sustainability project tracking. Automatically generated reports are indicative outputs and do not constitute independent third-party verification, regulatory certification, or buyer acceptance. Estimated carbon reduction opportunities are labelled as awaiting independent verification and do not represent issued or tradable carbon credits.

## Core Capabilities

- **Four Role-Based Workspaces**:
  - **SME Company User**: Facility management, electricity & fuel data entry, CSV import/export, emissions calculator, ESG report drafting, sustainability project logging, document centre, and support tickets.
  - **Company Admin / CFO**: All company capabilities plus team membership & role controls, internal report approval, data review sign-off, company profile administration, and subscription visibility.
  - **Platform Owner / Super Admin Command Centre**: 16-module executive dashboard covering company approvals/suspensions, cross-platform emissions analytics, emission factor versioning, report review queue, editable Base/Conservative/Ambitious business-plan financial modelling, manual subscription tracking, admin-only internal support notes, and immutable audit logs.
  - **Verification Reviewer**: Restricted reviewer portal for inspecting assigned ESG reports and supporting evidence, recording correction requests, and capturing reviewer notes without modifying financial or operational records.
- **Hardened Cloud Firestore Backend**:
  - 22 structured collections documented in `firebase-blueprint.json` with strict multi-tenant company isolation, role validation, non-negative activity bounds, admin-only internal support notes, and immutable append-only `audit_logs` in `firestore.rules`.
- **Client-Side Branded PDF ESG Reports**:
  - Multi-section downloadable PDF disclosures with emissions summary tables, Scope 1 vs Scope 2 visual chart, data completeness indicator, methodology/limitations notes, and permanent academic/legal disclaimer.

## Tech Stack (Zero-Cost / Free-Tier Compatible)

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Firebase Authentication (Google Sign-In) & Cloud Firestore (Spark / Free Tier)
- Recharts (interactive visualizations)
- jsPDF + jsPDF-AutoTable (local PDF generation)
- Lucide React (icons)

## Local Setup & Deployment

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Firebase Web credentials via `firebase-applet-config.json` or `.env` (see `.env.example` — never commit `.env` or service account keys).
3. Run development server:
   ```bash
   npm run dev
   ```
4. Type-check & build for production:
   ```bash
   npm run lint
   npm run build
   ```
5. Deploy to Vercel: Connect your GitHub repository (`GreenYield-Capital`, branch `main`), set Framework Preset to `Vite`, Output Directory to `dist`, and configure the `VITE_FIREBASE_*` environment variables in Vercel Project Settings.
