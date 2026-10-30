import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  UploadCloud, 
  ShieldCheck, 
  Sparkles, 
  PiggyBank, 
  CalendarClock, 
  UserCheck, 
  LogOut, 
  Menu, 
  X,
  Bot,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  User as UserIcon
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

  // Derive human-readable current page name
  const currentNav = navItems.find((item) => item.path === location.pathname);
  const currentPageTitle = currentNav?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row text-[#171B26] font-sans antialiased">
      {/* ------------------------------------------------------------- */}
      {/* Mobile Top Header */}
      {/* ------------------------------------------------------------- */}
      <div className="md:hidden bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F28C28] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-[0_2px_4px_0_rgba(242,140,40,0.3)]">
            SF
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#171B26] block leading-tight">SahayakFin</span>
            <span className="text-[10px] text-[#9299A5] block">Financial Wellness</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg border border-[#E5E7EB] text-[#171B26] hover:bg-[#F0F2F5] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Clean White Desktop & Drawer Sidebar */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-[#E5E7EB] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F28C28] text-white flex items-center justify-center font-bold text-base shadow-[0_2px_4px_0_rgba(242,140,40,0.3)]">
              SF
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#171B26] block leading-none">
                SahayakFin
              </span>
              <span className="text-[11px] text-[#687080] font-medium block mt-0.5">
                Credit & Wellness
              </span>
            </div>
          </div>

          {/* Active Persona Mini Card */}
          <div className="p-3 m-3.5 rounded-lg bg-[#F0F2F5] border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-[#687080] uppercase tracking-wider">
                {currentUser.isDemo ? 'Demo Persona' : 'Active Account'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/20">
                {(currentUser.workerType || 'PARTNER').replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-bold text-[#171B26] truncate">{currentUser.fullName}</p>
            <p className="text-[11px] text-[#687080] truncate flex items-center gap-1 mt-0.5">
              <span>{currentUser.city}</span>
              <span>•</span>
              <span className="font-mono-num">{currentUser.userCode}</span>
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#FFF5EB] text-[#F28C28] font-semibold border-l-[3px] border-[#F28C28]'
                      : 'text-[#687080] hover:bg-[#F0F2F5] hover:text-[#171B26]'
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? 'text-[#F28C28]' : 'text-[#9299A5]'}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#E5E7EB] space-y-2 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#687080] hover:text-[#D94B4B] hover:bg-[#FDF1F1] transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#171B26]/30 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* Main Content Area */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA]">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-6 hidden md:flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_0_rgba(23,27,38,0.02)]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#687080]">
            <span className="font-medium text-[#9299A5]">SahayakFin</span>
            <ChevronRight size={13} className="text-[#9299A5]" />
            <span className="font-semibold text-[#171B26]">{currentPageTitle}</span>
          </div>

          {/* Account Indicator & Dropdown */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-[#9299A5] block font-medium uppercase tracking-wider">
                Logged In
              </span>
              <span className="text-xs font-semibold text-[#171B26]">
                {currentUser.fullName}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-9 h-9 rounded-full bg-[#17243A] text-white flex items-center justify-center font-bold text-xs hover:bg-[#24344D] transition-colors cursor-pointer shadow-sm"
                aria-label="User menu"
              >
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1.5 text-xs z-50">
                  <div className="px-3.5 py-2.5 border-b border-[#E5E7EB] bg-[#F7F8FA]">
                    <p className="font-semibold text-[#171B26]">{currentUser.fullName}</p>
                    <p className="text-[#687080] text-[11px] truncate font-mono-num">{currentUser.email}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[#687080] hover:bg-[#F0F2F5] hover:text-[#171B26] transition-colors"
                  >
                    <UserIcon size={14} />
                    <span>Profile & Privacy</span>
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[#687080] hover:bg-[#F0F2F5] hover:text-[#171B26] transition-colors"
                  >
                    <TrendingUp size={14} />
                    <span>Financial Dashboard</span>
                  </NavLink>
                  <div className="border-t border-[#E5E7EB] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-left px-3.5 py-2 text-[#D94B4B] hover:bg-[#FDF1F1] transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
