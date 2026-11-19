import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/public/HomePage';
import {
  AboutPage,
  ContactPage,
  EsgReportingInfoPage,
  FeaturesPage,
  PricingPage,
  PublicCalculatorPage,
  SustainabilityInfoPage,
} from './pages/public/PublicPages';
import { AuthPage } from './pages/auth/AuthPage';
import { CompanyDashboardShell } from './pages/company/CompanyDashboardShell';
import { OwnerCommandCentre } from './pages/admin/OwnerCommandCentre';
import { ReviewerWorkspace } from './pages/reviewer/ReviewerWorkspace';

function normalizePath(raw: string): string {
  const cleaned = raw.split('?')[0].split('#')[0] || '/';
  return cleaned.length > 1 && cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
}

const AppRouter: React.FC = () => {
  const { firebaseUser, loading, isPlatformOwner, isReviewer } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => normalizePath(window.location.pathname));

  const navigate = useCallback((target: string) => {
    const next = normalizePath(target);
    if (next !== window.location.pathname) {
      window.history.pushState({}, '', next);
    }
    setCurrentPath(next);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPopState = () => setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Protected Route Guards
  if (currentPath.startsWith('/admin')) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0B172A] flex items-center justify-center text-slate-300 text-sm">
          Verifying Platform Owner credentials...
        </div>
      );
    }
    if (!firebaseUser) {
      return (
        <PublicLayout currentPath="/login" navigate={navigate}>
          <AuthPage mode="login" navigate={navigate} />
        </PublicLayout>
      );
    }
    if (!isPlatformOwner) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
            <h1 className="font-display text-lg font-bold text-slate-900">Restricted Owner Command Centre</h1>
            <p className="text-sm text-slate-600">
              Your account does not hold Platform Owner permissions in Cloud Firestore.
            </p>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Go to Company Dashboard
            </button>
          </div>
        </div>
      );
    }
    return <OwnerCommandCentre navigate={navigate} />;
  }

  if (currentPath.startsWith('/reviewer')) {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
          Verifying Reviewer assignment...
        </div>
      );
    }
    if (!firebaseUser) {
      return (
        <PublicLayout currentPath="/login" navigate={navigate}>
          <AuthPage mode="login" navigate={navigate} />
        </PublicLayout>
      );
    }
    if (!isReviewer && !isPlatformOwner) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
            <h1 className="font-display text-lg font-bold text-slate-900">Verification Reviewer Access Required</h1>
            <p className="text-sm text-slate-600">
              Only authorized reviewers assigned by the Platform Owner can access the review queue.
            </p>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              Return to Company Workspace
            </button>
          </div>
        </div>
      );
    }
    return <ReviewerWorkspace navigate={navigate} />;
  }

  if (currentPath.startsWith('/app')) {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
          Loading GreenYield Capital workspace...
        </div>
      );
    }
    if (!firebaseUser) {
      return (
        <PublicLayout currentPath="/login" navigate={navigate}>
          <AuthPage mode="login" navigate={navigate} />
        </PublicLayout>
      );
    }
    return <CompanyDashboardShell navigate={navigate} />;
  }

  // Public 10-Page Website Routes
  const renderPublicPage = () => {
    switch (currentPath) {
      case '/about':
        return <AboutPage navigate={navigate} />;
      case '/features':
        return <FeaturesPage navigate={navigate} />;
      case '/esg-reporting':
        return <EsgReportingInfoPage navigate={navigate} />;
      case '/calculator':
        return <PublicCalculatorPage navigate={navigate} />;
      case '/sustainability':
        return <SustainabilityInfoPage navigate={navigate} />;
      case '/pricing':
        return <PricingPage navigate={navigate} />;
      case '/contact':
        return <ContactPage navigate={navigate} />;
      case '/login':
        return <AuthPage mode="login" navigate={navigate} />;
      case '/register':
        return <AuthPage mode="register" navigate={navigate} />;
      case '/':
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <PublicLayout currentPath={currentPath} navigate={navigate}>
      {renderPublicPage()}
    </PublicLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
