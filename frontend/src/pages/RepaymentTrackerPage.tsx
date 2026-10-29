import React, { useEffect, useState } from 'react';
import { financialService } from '../services/financialService';
import { RepaymentSchedule } from '../types';
import { Card, PageHeader, Button, StatusBadge } from '../components/common';

export const RepaymentTrackerPage: React.FC = () => {
  const [repayments, setRepayments] = useState<RepaymentSchedule[]>([]);

  useEffect(() => {
    financialService.getRepayments().then(setRepayments);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Repayments & Credit Facilities"
        description="Track active micro-loan schedules and observe how on-time payments reinforce your score."
        badge={`${repayments.length} Schedules`}
      />

      {/* Table Card */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm">Active Credit Facilities Ledger</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-medium">
              <tr>
                <th className="py-2.5 px-4">Ref ID</th>
                <th className="py-2.5 px-4">Facility Name & Provider</th>
                <th className="py-2.5 px-4">Due Installment</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4">Principal Remaining</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {repayments.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 font-medium">
                    {rep.id}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-semibold text-slate-900 block">{rep.loanName}</span>
                    <span className="text-[10px] text-slate-400">{rep.provider}</span>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">
                    ₹{rep.installmentAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                    {rep.dueDate}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    ₹{rep.principalRemaining.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <StatusBadge status={rep.status} />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {rep.status === 'UPCOMING' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => alert('Installment payment recorded successfully.')}
                      >
                        Pay Due
                      </Button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
