import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MEDIA_ASSETS } from '../../constants/defaults';
import { ResilientImage } from '../../components/ResilientImage';

interface AuthPageProps {
  mode: 'login' | 'register';
  navigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, navigate }) => {
  const { firebaseUser, loading, isPlatformOwner, isReviewer, signInWithGoogle, authError } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'company_admin' | 'company_user'>('company_admin');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && firebaseUser) {
      if (isPlatformOwner) navigate('/admin');
      else if (isReviewer) navigate('/reviewer');
      else navigate('/app');
    }
  }, [firebaseUser, loading, isPlatformOwner, isReviewer, navigate]);

  const handleGoogleAuth = async () => {
    setBusy(true);
    try {
      await signInWithGoogle(selectedRole);
    } catch {
      // Displayed via authError
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">
              {mode === 'register' ? 'SME Workspace Registration' : 'Secure Workspace Sign In'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
              {mode === 'register'
                ? 'Create your GreenYield Capital account'
                : 'Sign in to GreenYield Capital'}
            </h1>
            <p className="text-sm text-slate-600 mb-7 leading-relaxed">
              Authenticate with verified Google Sign-In powered by Firebase Authentication. Platform
              Owners, SME CFOs, Company Users, and Verification Reviewers are routed automatically
              based on verified Firestore access controls.
            </p>

            {mode === 'register' && (
              <div className="mb-6">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Select Initial Company Workspace Role
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('company_admin')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      selectedRole === 'company_admin'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-700 mb-1.5" />
                    <p className="text-sm font-semibold text-slate-900">Company Admin / CFO</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Register a new SME company, manage team, approve reports.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('company_user')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      selectedRole === 'company_user'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-700 mb-1.5" />
                    <p className="text-sm font-semibold text-slate-900">Company User / Plant Ops</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Enter monthly electricity, fuel, and project activity logs.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={busy || loading}
              className="w-full py-3 px-4 bg-[#0B172A] hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>
                {busy
                  ? 'Connecting to Firebase Auth...'
                  : mode === 'register'
                  ? 'Continue with Google to Register'
                  : 'Continue with Google'}
              </span>
            </button>

            {authError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>{mode === 'register' ? 'Already have a workspace?' : 'Registering a new Indian SME?'}</span>
              <button
                type="button"
                onClick={() => navigate(mode === 'register' ? '/login' : '/register')}
                className="font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {mode === 'register' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Trust Company Isolation:</strong> Roles are verified server-side via
              Cloud Firestore security rules. Platform Owner and Verification Reviewer privileges
              cannot be self-assigned during registration.
            </span>
          </div>
        </div>

        <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-slate-200 min-h-[360px]">
          <ResilientImage
            src={MEDIA_ASSETS.heroSolarFactory}
            alt="Solar rooftop manufacturing plant in India"
            fallbackTitle="GreenYield Industrial Workspace"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B172A]/90 via-[#0B172A]/40 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-8 text-white">
            <p className="text-xs font-semibold text-emerald-400 mb-2">Role-Based Access Control</p>
            <h2 className="font-display text-xl font-bold mb-3">
              Four distinct workspaces in one cloud-backed platform.
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-200">
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <strong className="block text-white">SME Company User</strong>
                Utility data, fuels, calculator, projects
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <strong className="block text-white">Company Admin / CFO</strong>
                Internal approvals, team & exports
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <strong className="block text-white">Platform Owner</strong>
                16-module Command Centre & billing
              </div>
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <strong className="block text-white">Verification Reviewer</strong>
                Evidence review & correction requests
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
