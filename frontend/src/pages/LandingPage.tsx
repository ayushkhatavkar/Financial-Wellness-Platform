import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Sparkles,
  Award,
  Wallet
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { Card, Button } from '../components/common';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickDemoLogin = async (userCode: string) => {
    try {
      await financialService.loginDemoUser(userCode);
      navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#171B26] font-sans flex flex-col antialiased">
      {/* ------------------------------------------------------------- */}
      {/* Premium Light Navbar */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-30 shadow-[0_1px_2px_0_rgba(23,27,38,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F28C28] text-white flex items-center justify-center font-bold text-base shadow-[0_2px_4px_0_rgba(242,140,40,0.25)]">
              SF
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg tracking-tight text-[#171B26]">SahayakFin</span>
              <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87]">
                Fintech Prototype
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Hero Section */}
      {/* ------------------------------------------------------------- */}
      <section className="py-12 sm:py-20 lg:py-24 border-b border-[#E5E7EB] bg-gradient-to-b from-white to-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF5EB] border border-[#F28C28]/25 text-[#F28C28] text-xs font-semibold tracking-wide">
                <Sparkles size={13} className="text-[#F28C28]" />
                <span>Alternative Credit Scoring for Indian Gig Workers</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-[#171B26] tracking-tight leading-[1.08]">
                No salary slip required. <br />
                <span className="text-[#F28C28]">
                  Your platform earnings become your credit history.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#687080] leading-relaxed max-w-xl">
                SahayakFin converts your daily deliveries and UPI cash flows into an 
                <strong className="text-[#171B26] font-semibold"> explainable, 4-pillar Financial Trust Score</strong>. 
                Unlock credit lines, emergency savings buffers, and personalized cash-flow coaching without CIBIL or ITR requirements.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/register">
                  <Button variant="primary" size="lg" icon={<ArrowRight size={17} />}>
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In with Demo Sandbox
                  </Button>
                </Link>
              </div>

              {/* Trust Metric Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E5E7EB] max-w-lg">
                <div>
                  <div className="text-2xl font-bold font-mono-num text-[#171B26]">100%</div>
                  <div className="text-xs text-[#687080] mt-0.5">Cash Flow Driven</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono-num text-[#F28C28]">4 Pillars</div>
                  <div className="text-xs text-[#687080] mt-0.5">Transparent Scoring</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono-num text-[#16865C]">0 Bureau</div>
                  <div className="text-xs text-[#687080] mt-0.5">CIBIL Free Access</div>
                </div>
              </div>
            </div>

            {/* Right Product Demo Panel with Layered Outline Frames */}
            <div className="mt-12 lg:mt-0 lg:col-span-5 relative">
              {/* Layered Thin Outline decorative borders behind panel */}
              <div className="absolute -inset-2 rounded-xl border border-[#E5E7EB] pointer-events-none transform rotate-1 hidden sm:block bg-white/40" />
              <div className="absolute -inset-4 rounded-2xl border border-[#E5E7EB]/60 pointer-events-none transform -rotate-1 hidden sm:block" />

              <div className="relative bg-white rounded-xl border border-[#E5E7EB] shadow-[0_4px_20px_0_rgba(23,27,38,0.06)] overflow-hidden">
                {/* Product Card Top Bar */}
                <div className="bg-[#17243A] text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#16865C]" />
                    <span className="text-xs font-semibold tracking-wide">Live Demo Sandbox</span>
                  </div>
                  <span className="text-[11px] font-mono-num bg-white/10 px-2 py-0.5 rounded text-[#EBCB87]">
                    100 Personas
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F28C28]">
                        Interactive Demonstration
                      </span>
                      <p className="text-xs text-[#687080] mt-0.5">
                        Select an actual persona to inspect real cash flows & scores:
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Persona Cards */}
                  <div className="space-y-2.5">
                    {/* Persona 1: Nitin */}
                    <button
                      onClick={() => handleQuickDemoLogin('USER0001')}
                      className="w-full text-left p-3.5 rounded-lg border border-[#EBCB87] bg-[#FEF9EC]/50 hover:bg-[#FEF9EC] hover:border-[#D18A22] text-[#171B26] transition-all duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#171B26]">Nitin Kulkarni</span>
                          <span className="text-[10px] font-mono-num bg-[#17243A] text-white px-1.5 py-0.2 rounded font-medium">
                            USER0001
                          </span>
                          <span className="text-[10px] bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/30 px-1.5 py-0.2 rounded font-semibold">
                            Micro-Entrepreneur
                          </span>
                        </div>
                        <p className="text-[11px] text-[#687080] mt-1.5 flex items-center gap-2">
                          <span>Indore</span>
                          <span>•</span>
                          <span className="font-semibold text-[#16865C] font-mono-num">Trust Score: 70/100</span>
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-[#F28C28] group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Persona 2: Meena */}
                    <button
                      onClick={() => handleQuickDemoLogin('USER0003')}
                      className="w-full text-left p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#F28C28]/60 hover:bg-[#F7F8FA] text-[#171B26] transition-all duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#171B26]">Meena Sharma</span>
                          <span className="text-[10px] font-mono-num bg-[#F0F2F5] text-[#687080] px-1.5 py-0.2 rounded font-medium">
                            USER0003
                          </span>
                          <span className="text-[10px] bg-[#EDF8F3] text-[#16865C] border border-[#16865C]/30 px-1.5 py-0.2 rounded font-semibold">
                            Delivery Partner
                          </span>
                        </div>
                        <p className="text-[11px] text-[#687080] mt-1.5 flex items-center gap-2">
                          <span>Nagpur</span>
                          <span>•</span>
                          <span className="font-semibold text-[#16865C] font-mono-num">Trust Score: 98/100</span>
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-[#9299A5] group-hover:text-[#F28C28] group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Persona 3: Priya */}
                    <button
                      onClick={() => handleQuickDemoLogin('USER0002')}
                      className="w-full text-left p-3.5 rounded-lg border border-[#E5E7EB] hover:border-[#D18A22]/60 hover:bg-[#F7F8FA] text-[#171B26] transition-all duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#171B26]">Priya Sharma</span>
                          <span className="text-[10px] font-mono-num bg-[#F0F2F5] text-[#687080] px-1.5 py-0.2 rounded font-medium">
                            USER0002
                          </span>
                          <span className="text-[10px] bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] px-1.5 py-0.2 rounded font-semibold">
                            New Account
                          </span>
                        </div>
                        <p className="text-[11px] text-[#687080] mt-1.5 flex items-center gap-2">
                          <span>Patna</span>
                          <span>•</span>
                          <span className="font-medium text-[#D18A22]">Safe Insufficient-Data Flow</span>
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-[#9299A5] group-hover:text-[#F28C28] group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Micro Footer on Card */}
                  <div className="pt-2 text-center">
                    <span className="text-[11px] text-[#9299A5]">
                      Click any persona above to load their complete live financial state.
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4 Transparent Pillars Section */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold text-[#F28C28] uppercase tracking-widest">
              Mathematical Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171B26]">
              The 4 Pillars of the Financial Trust Score
            </h2>
            <p className="text-xs sm:text-sm text-[#687080]">
              Every single score point is derived deterministically from verified transaction cash flows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1 */}
            <Card hoverEffect className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/30 font-mono-num">
                  Weight: 30%
                </span>
                <TrendingUp size={18} className="text-[#F28C28]" />
              </div>
              <h3 className="font-bold text-[#171B26] text-base">Income Stability</h3>
              <p className="text-xs text-[#687080] leading-relaxed">
                Frequency and consistency of gig platform payouts (Swiggy, Zomato, Uber, Zepto) over 60+ days.
              </p>
            </Card>

            {/* Pillar 2 */}
            <Card hoverEffect className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] font-mono-num">
                  Weight: 25%
                </span>
                <Wallet size={18} className="text-[#D18A22]" />
              </div>
              <h3 className="font-bold text-[#171B26] text-base">Savings Consistency</h3>
              <p className="text-xs text-[#687080] leading-relaxed">
                Positive net monthly cash flow and regular transfers into emergency reserve buffers.
              </p>
            </Card>

            {/* Pillar 3 */}
            <Card hoverEffect className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EDF8F3] text-[#16865C] border border-[#16865C]/30 font-mono-num">
                  Weight: 30%
                </span>
                <ShieldCheck size={18} className="text-[#16865C]" />
              </div>
              <h3 className="font-bold text-[#171B26] text-base">Expense Health</h3>
              <p className="text-xs text-[#687080] leading-relaxed">
                Balanced operational fuel and repair ratios vs personal expenses; disciplined debt service coverage.
              </p>
            </Card>

            {/* Pillar 4 */}
            <Card hoverEffect className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F0F2F5] text-[#17243A] border border-[#E5E7EB] font-mono-num">
                  Weight: 15%
                </span>
                <FileCheck2 size={18} className="text-[#17243A]" />
              </div>
              <h3 className="font-bold text-[#171B26] text-base">Bill Consistency</h3>
              <p className="text-xs text-[#687080] leading-relaxed">
                Timely recharge of mobile data and utility bills essential to uninterrupted gig platform work.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* Footer */}
      {/* ------------------------------------------------------------- */}
      <footer className="mt-auto py-8 bg-[#F0F2F5] border-t border-[#E5E7EB] text-xs text-[#687080]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-[#F28C28] text-white flex items-center justify-center font-bold text-[10px]">
              SF
            </div>
            <span className="font-bold text-[#171B26]">SahayakFin</span>
            <span>— Alternative Financial Wellness for Gig Workers</span>
          </div>
          <div>Hackathon Demonstration Build • React, TypeScript, Tailwind CSS</div>
        </div>
      </footer>
    </div>
  );
};
