import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Fuel, 
  PiggyBank, 
  ShieldCheck, 
  Check, 
  ChevronRight
} from 'lucide-react';
import { Card, PageHeader, Button } from '../components/common';

export const FinancialWellnessPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Wellness & Recommendations"
        description="Cash-flow intelligence tailored to fuel budgeting, emergency reserves, and low-cost credit."
      />

      {/* Wellness Summary Card */}
      <Card className="border-teal-200/80 bg-teal-50/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
              Platform Cash-Flow Diagnosis
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Positive Operating Cash Cushion
            </h2>
            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Your weekly net earnings exceeded operational gig expenses (fuel, maintenance, data recharge) for 11 out of the last 12 observed weeks.
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-slate-200/80 shrink-0 shadow-sm">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Resilience Index</span>
            <span className="text-2xl font-extrabold text-teal-800 block mt-0.5">8.2 / 10</span>
            <span className="text-[10px] text-emerald-700 font-medium">Low Volatility</span>
          </div>
        </div>
      </Card>

      {/* 3 Structured Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Recommendation 1: Fuel Optimizer */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center mb-3">
              <Fuel size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Fuel Expense Management</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Fuel accounts for 23.4% of your monthly expenditure. Refueling during preferred partner cashback windows could save an estimated ₹850 monthly.
            </p>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-700 font-medium">
            Projected monthly saving: ~₹850
          </div>
        </Card>

        {/* Recommendation 2: Micro-Savings */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center mb-3">
              <PiggyBank size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Automated Micro-Savings</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Allocating ₹35 per working day into an emergency fund covers your annual vehicle insurance and tire buffer without straining daily grocery budgets.
            </p>
          </div>

          <Link to="/savings">
            <Button variant="outline" size="sm" className="w-full">
              Manage Savings Targets &rarr;
            </Button>
          </Link>
        </Card>

        {/* Recommendation 3: Low-Cost Credit Access */}
        <Card className="flex flex-col justify-between space-y-4">
          <div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center mb-3">
              <ShieldCheck size={16} />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Institutional Credit Access</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Your consistent platform earnings qualify you for working capital credit lines at 12–14% APR, avoiding predatory 36%+ informal moneylenders.
            </p>
          </div>

          <Link to="/loans">
            <Button variant="primary" size="sm" className="w-full">
              Review Credit Offers &rarr;
            </Button>
          </Link>
        </Card>
      </div>

      {/* Operational Best Practices */}
      <Card className="space-y-3">
        <h3 className="font-semibold text-slate-900 text-sm">Financial Best Practices for Gig Workers</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-900 block">Separate Business & Household UPI Handles</span>
              <span className="text-slate-500 text-[11px]">
                Keeps platform incentives and operational fuel debits distinct from personal spending.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-900 block">Maintain a 7-Day Fuel Reserve</span>
              <span className="text-slate-500 text-[11px]">
                An emergency buffer of ₹1,500 prevents missing high-incentive festival delivery shifts.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-900 block">Recharge Mobile Plan 48 Hours in Advance</span>
              <span className="text-slate-500 text-[11px]">
                Ensures uninterrupted network connectivity during live deliveries and logs on-time utility history.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
