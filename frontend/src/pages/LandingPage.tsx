import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  Zap
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { Card, Button } from '../components/common';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickDemoLogin = async (userCode: string) => {
    try {
      await financialService.loginDemoUser(userCode);
      navigate('/dashboard');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {/* Clean Navbar */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SF
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900">SahayakFin</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Hackathon Prototype
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

      {/* Hero Section */}
      <section className="py-16 sm:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                <span>Alternative Credit Scoring for Indian Gig Workers</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                No salary slip required. <br />
                <span className="text-teal-800">
                  Your platform earnings become your credit history.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                SahayakFin converts your daily gig deliveries and UPI transactions into an 
                <strong> explainable, 4-pillar Financial Trust Score</strong>. Unlock fair credit lines, emergency buffers, and actionable cash-flow coaching without CIBIL or ITR requirements.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/register">
                  <Button variant="primary" size="lg" icon={<ArrowRight size={16} />}>
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In with Demo Sandbox
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Persona Sandbox Card */}
            <div className="mt-10 lg:mt-0 lg:col-span-5">
              <Card className="border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Interactive Demonstration Personas
                  </span>
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                    1-Click Access
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Select a fictional persona from our 100-worker benchmark dataset to evaluate the platform immediately:
                </p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handleQuickDemoLogin('USER0001')}
                    className="w-full text-left p-3 rounded-lg border border-teal-200 bg-teal-50/40 hover:bg-teal-50 text-slate-900 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">Nitin Kulkarni (USER0001)</span>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-medium">
                          Micro-Entrepreneur
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Indore • 2-3 Months History • <strong>Trust Score: 70/100</strong>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-teal-700 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleQuickDemoLogin('USER0003')}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">Meena Sharma (USER0003)</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          Delivery Partner
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Nagpur • Regular Platform Payouts • <strong>Trust Score: 98/100</strong>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </button>

                  <button
                    onClick={() => handleQuickDemoLogin('USER0002')}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">Priya Sharma (USER0002)</span>
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                          New User
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Patna • &lt; 2 Months • <strong>Safe Insufficient-Data Flow</strong>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </button>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="py-16 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-widest">
              Mathematical Transparency
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              The 4 Pillars of the Financial Trust Score
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Every score point is derived deterministically from verified transaction cash flows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="space-y-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/80 inline-block">
                Weight: 30%
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">Income Stability</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Frequency and consistency of gig platform payouts (Swiggy, Zomato, Uber, Zepto) over 60+ days.
              </p>
            </Card>

            <Card className="space-y-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/80 inline-block">
                Weight: 25%
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">Savings Consistency</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Positive net monthly cash flow and regular transfers into emergency reserve buffers.
              </p>
            </Card>

            <Card className="space-y-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/80 inline-block">
                Weight: 30%
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">Expense Health</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Balanced operational fuel and repair ratios vs personal expenses; disciplined debt service coverage.
              </p>
            </Card>

            <Card className="space-y-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200/80 inline-block">
                Weight: 15%
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">Bill Consistency</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Timely recharge of mobile data and utility bills essential to uninterrupted gig platform work.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">SahayakFin</span>
            <span>— Alternative Financial Wellness for Gig Workers</span>
          </div>
          <div>Hackathon Demonstration Build • React, TypeScript, Tailwind CSS</div>
        </div>
      </footer>
    </div>
  );
};
