import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useAuth } from '../context/AuthContext';
import { BRAND_TAGLINE } from '../constants/defaults';

interface PublicLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
}

const PRIMARY_NAV = [
  { label: 'Features', path: '/features' },
  { label: 'ESG Reporting', path: '/esg-reporting' },
  { label: 'Calculator', path: '/calculator' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Contact', path: '/contact' },
];

const FOOTER_PLATFORM_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Platform Features', path: '/features' },
  { label: 'ESG Reporting', path: '/esg-reporting' },
  { label: 'Carbon Footprint Calculator', path: '/calculator' },
  { label: 'Sustainability Tracking', path: '/sustainability' },
];

const FOOTER_COMPANY_LINKS = [
  { label: 'About Us', path: '/about' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Contact & Demo', path: '/contact' },
  { label: 'Sign In', path: '/login' },
  { label: 'Register Company', path: '/register' },
];

export const PublicLayout: React.FC<PublicLayoutProps> = ({ currentPath, navigate, children }) => {
  const { firebaseUser, isPlatformOwner, isReviewer } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePrimaryAction = () => {
    if (firebaseUser) {
      if (isPlatformOwner) navigate('/admin');
      else if (isReviewer) navigate('/reviewer');
      else navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between gap-8">
          <BrandMark onClick={() => navigate('/')} />

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Main navigation">
            {PRIMARY_NAV.map((item) => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                    active
                      ? 'text-slate-900 border-emerald-600'
                      : 'border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {firebaseUser ? 'Open Workspace' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2.5 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-2">
          {[...FOOTER_PLATFORM_LINKS, { label: 'About Us', path: '/about' }, { label: 'Pricing', path: '/pricing' }, { label: 'Contact', path: '/contact' }].map(
            (link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  navigate(link.path);
                }}
                className="block w-full text-left py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                {link.label}
              </button>
            )
          )}
          <div className="pt-2 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handlePrimaryAction();
              }}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
            >
              {firebaseUser ? 'Open Workspace' : 'Sign In / Register'}
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Quiet Institutional Footer */}
      <footer className="bg-[#0B172A] text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2 space-y-4">
            <BrandMark light onClick={() => navigate('/')} />
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              {BRAND_TAGLINE} Built for Indian manufacturing, auto-component, textile, logistics,
              and export-oriented SMEs across Pune, Mumbai, Ahmedabad, Surat, and NCR.
            </p>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed pt-2 border-t border-slate-800">
              Academic Venture Prototype Notice: All operational emissions calculations, ESG
              reports, and potential carbon opportunity estimates produced on GreenYield Capital are
              indicative outputs generated from company-submitted data. They do not represent
              independent third-party verification, regulatory certification, or issued/tradable
              carbon credits.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              {FOOTER_PLATFORM_LINKS.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Organization</h3>
            <ul className="space-y-2.5 text-sm">
              {FOOTER_COMPANY_LINKS.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} GreenYield Capital · MBA Climate FinTech Venture Prototype</span>
            <span>Pune · Mumbai · Ahmedabad · Surat · NCR</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
