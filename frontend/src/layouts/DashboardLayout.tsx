import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  UploadCloud, 
  ShieldCheck, 
  Sparkles, 
  Banknote, 
  PiggyBank, 
  CalendarClock, 
  UserCheck, 
  LogOut, 
  Menu, 
  X,
  Bell,
  ChevronDown,
  Bot,
  ShieldAlert
} from 'lucide-react';
import { financialService } from '../services/financialService';

interface LayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = financialService.getCurrentUser();

  const handleLogout = () => {
    financialService.logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { label: 'Upload Statement', path: '/upload', icon: UploadCloud },
    { label: 'Trust Score', path: '/trust-score', icon: ShieldCheck },
    { label: 'Financial Wellness', path: '/wellness', icon: Sparkles },
    { label: 'AI Financial Coach', path: '/coach', icon: Bot },
    { label: 'Debt-Trap Prevention', path: '/loans', icon: ShieldAlert },
    { label: 'Savings Goals', path: '/savings', icon: PiggyBank },
    { label: 'Repayments', path: '/repayments', icon: CalendarClock },
    { label: 'Profile & Privacy', path: '/profile', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            SF
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">SahayakFin</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Clean White Sidebar for Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Platform Name */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SF
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">SahayakFin</span>
              <span className="text-[10px] text-slate-400 font-medium block">Credit & Wellness Platform</span>
            </div>
          </div>

          {/* Active Persona Mini Card */}
          <div className="p-3 m-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {currentUser.isDemo ? 'Demo Mode' : 'Live User'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-teal-50 text-teal-800 border border-teal-200/60">
                {currentUser.workerType.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-900 mt-1 truncate">{currentUser.fullName}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentUser.city}</p>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 font-semibold border-l-2 border-teal-700 rounded-l-none'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-teal-700' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/20 z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 hidden md:flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Platform</span>
            <span>/</span>
            <span className="font-medium text-teal-800 capitalize">
              {location.pathname.replace('/', '').replace('-', ' ') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Active Account</span>
              <span className="text-xs font-semibold text-slate-800">{currentUser.fullName}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs hover:bg-teal-100 transition-colors"
              >
                {currentUser.fullName.charAt(0)}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-xs z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900">{currentUser.fullName}</p>
                    <p className="text-slate-400 text-[11px] truncate">{currentUser.email}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Profile & Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};
