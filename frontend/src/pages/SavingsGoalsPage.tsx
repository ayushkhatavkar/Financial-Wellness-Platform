import React, { useEffect, useState } from 'react';
import { Plus, PiggyBank, History, CheckCircle, Calendar, FileText } from 'lucide-react';
import { financialService } from '../services/financialService';
import { SavingsGoal } from '../types';
import { Card, PageHeader, Button, StatusBadge, Input } from '../components/common';

export const SavingsGoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // New goal state
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 5000,
    currentAmount: 500,
    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Contribution state
  const [contribution, setContribution] = useState({
    amount: 250,
    contributionDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await financialService.createSavingsGoal(newGoal);
      setShowAddModal(false);
      setNewGoal({
        name: '',
        targetAmount: 5000,
        currentAmount: 500,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      await loadGoals();
    } catch (err: any) {
      setError(err.message || 'Failed to create goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setError(null);

    if (contribution.amount <= 0) {
      setError('Please provide a valid contribution amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await financialService.addSavingsContribution(selectedGoal.id, {
        amount: Number(contribution.amount),
        contributionDate: contribution.contributionDate,
        note: contribution.note.trim() || undefined,
      });
      setShowContributeModal(false);
      setContribution({
        amount: 250,
        contributionDate: new Date().toISOString().split('T')[0],
        note: '',
      });
      setSelectedGoal(null);
      await loadGoals();
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openContributeModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setError(null);
    setContribution({
      amount: Math.max(50, Math.round(goal.suggestedDailySaving || 200)),
      contributionDate: new Date().toISOString().split('T')[0],
      note: '',
    });
    setShowContributeModal(true);
  };

  const openHistoryModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setShowHistoryModal(true);
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

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="text-center py-12 space-y-3">
          <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center mx-auto">
            <PiggyBank size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No active savings goals yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first micro-savings goal for helmet replacement, bike insurance, or an emergency buffer.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowAddModal(true)}
            >
              Create First Goal
            </Button>
          </div>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const percent = goal.progressPercentage ?? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const remaining = goal.remainingAmount ?? Math.max(0, goal.targetAmount - goal.currentAmount);
          const isDone = goal.status === 'COMPLETED' || percent >= 100;
          const contribCount = goal.contributions?.length || 0;

          return (
            <Card
              key={goal.id}
              className="flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {goal.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={isDone ? 'COMPLETED' : 'IN_PROGRESS'} />
                </div>

                <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                  {goal.name}
                </h3>

                {/* Progress Bar & Amount Summary */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Saved</span>
                      <span className="font-bold text-slate-900 text-base">
                        ₹{goal.currentAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Target</span>
                      <span className="font-semibold text-slate-700">
                        ₹{goal.targetAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isDone ? 'bg-emerald-600' : 'bg-teal-700'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-medium text-slate-500">
                    <span>{percent}% completed</span>
                    <span>
                      {isDone ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle size={12} /> Target Reached
                        </span>
                      ) : (
                        `₹${remaining.toLocaleString('en-IN')} remaining`
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Target Nudge & Action Buttons */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
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

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    icon={<History size={13} />}
                    onClick={() => openHistoryModal(goal)}
                  >
                    History ({contribCount})
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    icon={<Plus size={13} />}
                    onClick={() => openContributeModal(goal)}
                  >
                    Add Savings
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal: Set Up Savings Goal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Set Up Savings Goal</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            
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
                placeholder="e.g. Helmet, Two-Wheeler Insurance, Rainy Day Fund"
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
                  label="Initial Deposit (₹)"
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

              <p className="text-[11px] text-slate-500 italic">
                Initial deposit will be recorded once in your savings history and counted towards your progress.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Add Savings Contribution */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Savings Contribution</h3>
                <p className="text-xs text-slate-500">Goal: {selectedGoal.name}</p>
              </div>
              <button
                onClick={() => setShowContributeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-lg text-xs space-y-1 text-teal-950">
              <div className="flex justify-between">
                <span>Current Total Saved:</span>
                <span className="font-bold">₹{selectedGoal.currentAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Amount:</span>
                <span>₹{selectedGoal.targetAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-teal-800 font-medium pt-1 border-t border-teal-200/60">
                <span>Remaining Needed:</span>
                <span>₹{Math.max(0, selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleAddSavings} className="space-y-3 text-xs">
              <Input
                label="Contribution Amount (₹)"
                type="number"
                required
                min={1}
                value={contribution.amount}
                onChange={(e) => setContribution({ ...contribution, amount: Number(e.target.value) })}
              />

              <Input
                label="Contribution Date"
                type="date"
                required
                value={contribution.contributionDate}
                onChange={(e) => setContribution({ ...contribution, contributionDate: e.target.value })}
              />

              <Input
                label="Optional Note / Tag"
                type="text"
                placeholder="e.g. Festival peak shift earnings, weekly round-up"
                value={contribution.note}
                onChange={(e) => setContribution({ ...contribution, note: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContributeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording...' : 'Record Savings'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Contribution History */}
      {showHistoryModal && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full space-y-4 shadow-xl border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Savings Contribution History</h3>
                <p className="text-xs text-slate-500">Goal: {selectedGoal.name}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Accumulated</span>
                <span className="text-base font-bold text-teal-800">
                  ₹{selectedGoal.currentAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Goal Target</span>
                <span className="text-xs font-semibold text-slate-700">
                  ₹{selectedGoal.targetAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {(!selectedGoal.contributions || selectedGoal.contributions.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No individual contributions recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedGoal.contributions.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-emerald-600" />
                          <span>₹{c.amount.toLocaleString('en-IN')}</span>
                        </div>
                        {c.note && (
                          <p className="text-[11px] text-slate-500 italic">
                            "{c.note}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {c.contributionDate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => {
                  setShowHistoryModal(false);
                  openContributeModal(selectedGoal);
                }}
              >
                Add Savings
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
