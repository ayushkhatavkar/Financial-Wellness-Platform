import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { financialService } from '../services/financialService';
import { SavingsGoal } from '../types';
import { Card, PageHeader, Button, StatusBadge, Input } from '../components/common';

export const SavingsGoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 5000,
    currentAmount: 500,
    targetDate: '2026-12-31',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await financialService.getSavingsGoals();
      setGoals(data);
    } catch {
      // safe fallback
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newGoal.name.trim() || newGoal.targetAmount <= 0) {
      setError('Please provide a goal name and a valid target amount.');
      return;
    }

    await financialService.createSavingsGoal(newGoal);
    setShowAddModal(false);
    setNewGoal({ name: '', targetAmount: 5000, currentAmount: 500, targetDate: '2026-12-31' });
    loadGoals();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Micro-Savings Goals"
        description="Build rainy day buffers and plan for insurance renewals with manageable daily targets."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowAddModal(true)}
          >
            Create Goal
          </Button>
        }
      />

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const isDone = goal.status === 'COMPLETED' || percent >= 100;

          return (
            <Card
              key={goal.id}
              className="flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {goal.id}
                  </span>
                  <StatusBadge status={isDone ? 'COMPLETED' : 'IN_PROGRESS'} />
                </div>

                <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                  {goal.name}
                </h3>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      ₹{goal.currentAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Target: ₹{goal.targetAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDone ? 'bg-emerald-600' : 'bg-teal-700'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-semibold text-slate-500">
                    {percent}% saved
                  </div>
                </div>
              </div>

              {/* Bottom Target Nudge */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Target Date:</span>
                  <span className="font-medium text-slate-800">{goal.targetDate.split('T')[0]}</span>
                </div>
                {!isDone && (
                  <div className="flex items-center justify-between text-teal-800 font-semibold pt-1 border-t border-slate-200/60 text-[11px]">
                    <span>Suggested Daily:</span>
                    <span>₹{goal.suggestedDailySaving}/day</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Set Up Savings Goal</h3>
            
            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <Input
                label="Goal Description"
                type="text"
                required
                placeholder="e.g. Helmet, Two-Wheeler Insurance"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Target Amount (₹)"
                  type="number"
                  required
                  min={100}
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                />
                <Input
                  label="Initial Amount (₹)"
                  type="number"
                  min={0}
                  value={newGoal.currentAmount}
                  onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) })}
                />
              </div>

              <Input
                label="Target Date"
                type="date"
                required
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Create Goal
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
