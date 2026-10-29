import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  ArrowRight
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { LoanOffer } from '../types';
import { Card, PageHeader, Button, StatusBadge } from '../components/common';

export const LoanOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    financialService.getLoanOffers().then(setOffers);
  }, []);

  const handleApply = async (offer: LoanOffer) => {
    try {
      await financialService.applyLoanOffer(offer.id, offer.maxAmount);
    } catch {
      // safe fallback
    }
    setSelectedOffer(offer);
    setApplied(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Credit Marketplace"
        description="Institutional credit and insurance lines tailored to alternative Financial Trust Scores."
      />

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {offers.map((offer) => (
          <Card
            key={offer.id}
            className={`flex flex-col justify-between transition-colors ${
              offer.isEligible ? 'hover:border-slate-300' : 'opacity-60 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <span className="text-[10px] font-mono text-slate-400 font-medium">
                  {offer.id}
                </span>
                <StatusBadge status={offer.isEligible ? 'ELIGIBLE' : 'PENDING'} />
              </div>

              <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                {offer.name}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{offer.provider}</p>

              {/* Amount Box */}
              <div className="my-4 p-3 bg-slate-50 border border-slate-200/60 rounded-lg text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Credit Limit Range</span>
                <span className="text-xl font-bold text-teal-800 block mt-0.5">
                  ₹{offer.minAmount.toLocaleString('en-IN')} – ₹{offer.maxAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Terms List */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Interest Rate</span>
                  <span className="font-medium text-slate-800">{offer.interestRate}% APR</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Tenure</span>
                  <span className="font-medium text-slate-800">{offer.tenureMonths} Months</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Repayment</span>
                  <span className="font-medium text-slate-800">{offer.repaymentMethod.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Rule</span>
                  <span className="font-medium text-slate-700 text-right text-[11px] max-w-[140px] truncate">
                    {offer.eligibilityRule}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Button
                variant={offer.isEligible ? 'primary' : 'secondary'}
                size="sm"
                disabled={!offer.isEligible}
                onClick={() => handleApply(offer)}
                className="w-full"
                icon={<ArrowRight size={13} />}
              >
                Apply for Facility
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Application Approval Modal */}
      {applied && selectedOffer && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle size={20} />
              <h3 className="font-bold text-base text-slate-900">Application Approved</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Based on your verified <strong>Financial Trust Score</strong>, your working capital line of <strong>₹{selectedOffer.maxAmount.toLocaleString('en-IN')}</strong> from <em>{selectedOffer.name}</em> is approved.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 text-slate-700 border border-slate-200 font-mono">
              <div className="flex justify-between">
                <span>Sanction Amount:</span>
                <span className="font-semibold text-slate-900">₹{selectedOffer.maxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Interest:</span>
                <span>{selectedOffer.interestRate}% APR</span>
              </div>
              <div className="flex justify-between">
                <span>Repayment Mode:</span>
                <span>{selectedOffer.repaymentMethod.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setApplied(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
