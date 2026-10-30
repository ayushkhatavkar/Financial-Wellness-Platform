import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Fuel, 
  PiggyBank, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Bot
} from 'lucide-react';
import { Card, PageHeader, Button } from '../components/common';

export const FinancialWellnessPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Financial Wellness & Recommendations"
        description="Cash-flow intelligence tailored to gig worker fuel budgeting, emergency reserves, and low-cost credit."
        actions={
          <Link to="/coach">
            <Button variant="primary" size="sm" icon={<Bot size={15} />}>
              Open AI Coach
            </Button>
          </Link>
        }
      />

      {/* Wellness Summary Hero Card */}
      <Card className="border-[#E5E7EB] bg-white shadow-sm p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/25 text-xs font-semibold">
              <Sparkles size={12} />
              <span>Platform Cash-Flow Diagnosis</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#171B26]">
              Positive Operating Cash Cushion
            </h2>
            <p className="text-xs sm:text-sm text-[#687080] max-w-xl leading-relaxed">
              Your weekly net earnings exceeded operational gig expenses (fuel, maintenance, data recharge) for 11 out of the last 12 observed weeks.
            </p>
          </div>
          <div className="bg-[#F0F2F5] rounded-xl p-4 text-center border border-[#E5E7EB] shrink-0 min-w-[160px]">
            <span className="text-[10px] text-[#687080] font-bold block uppercase tracking-wider">
              Resilience Index
            </span>
            <span className="text-3xl font-extrabold text-[#171B26] font-mono-num block mt-1">
              8.2 <span className="text-sm font-normal text-[#9299A5]">/ 10</span>
            </span>
            <span className="text-xs font-semibold text-[#16865C] block mt-1">
              Low Volatility
            </span>
          </div>
        </div>
      </Card>

      {/* 3 Structured Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Recommendation 1: Fuel Optimizer */}
        <Card hoverEffect className="flex flex-col justify-between space-y-4 p-5 bg-white">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/25 flex items-center justify-center mb-3.5 shadow-sm">
              <Fuel size={18} />
            </div>
            <h3 className="font-bold text-[#171B26] text-base">Fuel Expense Management</h3>
            <p className="text-xs text-[#687080] mt-2 leading-relaxed">
              Fuel accounts for 23.4% of your monthly expenditure. Refueling during preferred partner cashback windows could save an estimated ₹850 monthly.
            </p>
          </div>

          <div className="p-3 bg-[#FEF9EC] border border-[#EBCB87] rounded-lg text-xs text-[#D18A22] font-semibold font-mono-num">
            Projected saving: ~₹850 / month
          </div>
        </Card>

        {/* Recommendation 2: Micro-Savings */}
        <Card hoverEffect className="flex flex-col justify-between space-y-4 p-5 bg-white">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EDF8F3] text-[#16865C] border border-[#16865C]/25 flex items-center justify-center mb-3.5 shadow-sm">
              <PiggyBank size={18} />
            </div>
            <h3 className="font-bold text-[#171B26] text-base">Automated Micro-Savings</h3>
            <p className="text-xs text-[#687080] mt-2 leading-relaxed">
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
        <Card hoverEffect className="flex flex-col justify-between space-y-4 p-5 bg-white">
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#F0F2F5] text-[#17243A] border border-[#E5E7EB] flex items-center justify-center mb-3.5 shadow-sm">
              <ShieldCheck size={18} />
            </div>
            <h3 className="font-bold text-[#171B26] text-base">Institutional Credit Access</h3>
            <p className="text-xs text-[#687080] mt-2 leading-relaxed">
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
      <Card className="space-y-4 bg-white p-6">
        <h3 className="font-bold text-[#171B26] text-base">Financial Best Practices for Gig Workers</h3>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
            <CheckCircle2 size={18} className="text-[#16865C] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#171B26] text-sm block">Separate Business & Household UPI Handles</span>
              <span className="text-[#687080] text-xs leading-relaxed mt-0.5 block">
                Keeps platform incentives and operational fuel debits distinct from personal spending.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
            <CheckCircle2 size={18} className="text-[#16865C] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#171B26] text-sm block">Maintain a 7-Day Fuel Reserve</span>
              <span className="text-[#687080] text-xs leading-relaxed mt-0.5 block">
                An emergency buffer of ₹1,500 prevents missing high-incentive festival delivery shifts.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB]">
            <CheckCircle2 size={18} className="text-[#16865C] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#171B26] text-sm block">Recharge Mobile Plan 48 Hours in Advance</span>
              <span className="text-[#687080] text-xs leading-relaxed mt-0.5 block">
                Ensures uninterrupted network connectivity during live deliveries and logs on-time utility history.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
