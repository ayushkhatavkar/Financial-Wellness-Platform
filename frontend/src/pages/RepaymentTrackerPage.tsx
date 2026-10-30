import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Trash2, 
  Edit3, 
  History, 
  Info,
  DollarSign
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { RepaymentSchedule } from '../types';
import { Card, PageHeader, Button, StatusBadge, Input } from '../components/common';

export const RepaymentTrackerPage: React.FC = () => {
  const [items, setItems] = useState<RepaymentSchedule[]>([]);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'LOAN' | 'BILL'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RepaymentSchedule | null>(null);
  const [editingItem, setEditingItem] = useState<RepaymentSchedule | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    facilityType: 'LOAN' as 'LOAN' | 'BILL',
    name: '',
    provider: '',
    amount: 1000,
    totalPrincipal: 10000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isRecurring: true,
    frequency: 'MONTHLY',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    notes: '',
    advanceNextDueDate: true,
    nextDueDate: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRepayments();
  }, []);

  const loadRepayments = async () => {
    try {
      setLoading(true);
      const data = await financialService.getRepayments();
      setItems(data);
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.provider.trim() || formData.amount <= 0) {
      setError('Please provide a name, provider, and valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await financialService.updateRepayment(editingItem.id, {
          facilityType: formData.facilityType,
          name: formData.name,
          provider: formData.provider,
          amount: Number(formData.amount),
          totalPrincipal: formData.facilityType === 'LOAN' ? Number(formData.totalPrincipal) : undefined,
          dueDate: formData.dueDate,
          isRecurring: formData.isRecurring,
          frequency: formData.frequency,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await financialService.createRepayment({
          facilityType: formData.facilityType,
          name: formData.name,
          provider: formData.provider,
          amount: Number(formData.amount),
          totalPrincipal: formData.facilityType === 'LOAN' ? Number(formData.totalPrincipal) : undefined,
          dueDate: formData.dueDate,
          isRecurring: formData.isRecurring,
          frequency: formData.frequency,
          notes: formData.notes.trim() || undefined,
        });
      }

      setShowCreateModal(false);
      setEditingItem(null);
      resetForm();
      await loadRepayments();
    } catch (err: any) {
      setError(err.message || 'Failed to save commitment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await financialService.deleteRepayment(id);
      await loadRepayments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete commitment.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setError(null);

    if (paymentData.amount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await financialService.recordPayment(selectedItem.id, {
        amount: Number(paymentData.amount),
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes.trim() || undefined,
        advanceNextDueDate: paymentData.advanceNextDueDate,
        nextDueDate: paymentData.nextDueDate || undefined,
      });

      setShowPaymentModal(false);
      setSelectedItem(null);
      await loadRepayments();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = (type: 'LOAN' | 'BILL' = 'LOAN') => {
    setEditingItem(null);
    setFormData({
      facilityType: type,
      name: '',
      provider: '',
      amount: type === 'LOAN' ? 1250 : 499,
      totalPrincipal: type === 'LOAN' ? 15000 : 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isRecurring: true,
      frequency: 'MONTHLY',
      notes: '',
    });
    setError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (item: RepaymentSchedule) => {
    setEditingItem(item);
    setFormData({
      facilityType: item.facilityType || 'LOAN',
      name: item.loanName,
      provider: item.provider,
      amount: item.installmentAmount,
      totalPrincipal: item.totalPrincipal || item.principalRemaining || 0,
      dueDate: item.dueDate,
      isRecurring: Boolean(item.isRecurring),
      frequency: item.frequency || 'MONTHLY',
      notes: item.notes || '',
    });
    setError(null);
    setShowCreateModal(true);
  };

  const openPaymentModal = (item: RepaymentSchedule) => {
    setSelectedItem(item);
    setPaymentData({
      amount: item.installmentAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      notes: '',
      advanceNextDueDate: Boolean(item.isRecurring),
      nextDueDate: '',
    });
    setError(null);
    setShowPaymentModal(true);
  };

  const openHistoryModal = (item: RepaymentSchedule) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
  };

  const resetForm = () => {
    setFormData({
      facilityType: 'LOAN',
      name: '',
      provider: '',
      amount: 1000,
      totalPrincipal: 10000,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isRecurring: true,
      frequency: 'MONTHLY',
      notes: '',
    });
  };

  // Filter items by tab
  const filteredItems = items.filter((item) => {
    if (selectedTab === 'LOAN') return item.facilityType === 'LOAN';
    if (selectedTab === 'BILL') return item.facilityType === 'BILL';
    return true;
  });

  // Calculate summary metrics
  const overdueItems = items.filter((i) => i.urgency === 'OVERDUE');
  const dueSoonItems = items.filter((i) => i.urgency === 'DUE_SOON');
  const totalOverdueAmount = overdueItems.reduce((acc, i) => acc + i.installmentAmount, 0);
  const totalLoanPrincipal = items
    .filter((i) => i.facilityType === 'LOAN')
    .reduce((acc, i) => acc + i.principalRemaining, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Repayments & Recurring Bills"
        description="Track active loans, monitor upcoming utility bills, and record installment payments to reinforce financial trust."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Receipt size={14} />}
              onClick={() => openCreateModal('BILL')}
            >
              Add Bill
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => openCreateModal('LOAN')}
            >
              Add Loan
            </Button>
          </div>
        }
      />

      {/* In-App Reminders and Urgent Alerts */}
      {overdueItems.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-3 text-xs text-rose-950">
          <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-900">
                Action Required: {overdueItems.length} Overdue Payment{overdueItems.length > 1 ? 's' : ''} (₹{totalOverdueAmount.toLocaleString('en-IN')})
              </span>
              <span className="text-[10px] bg-rose-200/60 px-2 py-0.5 rounded font-semibold text-rose-800">
                Overdue Reminder
              </span>
            </div>
            <p className="text-rose-800 text-[11px] mt-0.5">
              Overdue obligations negatively impact your Financial Trust Score. Clear these commitments or log payments to keep your standing in good standing.
            </p>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Overdue Dues</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-bold ${overdueItems.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              ₹{totalOverdueAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 font-medium">{overdueItems.length} items</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Due in Next 7 Days</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-bold ${dueSoonItems.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              ₹{dueSoonItems.reduce((acc, i) => acc + i.installmentAmount, 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 font-medium">{dueSoonItems.length} items</span>
          </div>
        </Card>

        <Card className="space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Active Loan Debt</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-teal-800">
              ₹{totalLoanPrincipal.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {items.filter((i) => i.facilityType === 'LOAN' && i.principalRemaining > 0).length} facilities
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Content Table */}
      <Card padding="none" className="overflow-hidden">
        {/* Tab Headers */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === 'ALL'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Commitments ({items.length})
            </button>
            <button
              onClick={() => setSelectedTab('LOAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                selectedTab === 'LOAN'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard size={13} />
              Loans & Credit ({items.filter((i) => i.facilityType === 'LOAN').length})
            </button>
            <button
              onClick={() => setSelectedTab('BILL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                selectedTab === 'BILL'
                  ? 'bg-white text-teal-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt size={13} />
              Utility & Bills ({items.filter((i) => i.facilityType === 'BILL').length})
            </button>
          </div>
        </div>

        {/* Empty state within table */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm font-semibold text-slate-800">No commitments found</p>
            <p className="text-xs text-slate-400">
              {selectedTab === 'LOAN'
                ? 'No active loan lines or credit repayments added yet.'
                : selectedTab === 'BILL'
                ? 'No utility or recurring household bills added yet.'
                : 'No loans or bills recorded. Add your first commitment to manage schedules.'}
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => openCreateModal(selectedTab === 'BILL' ? 'BILL' : 'LOAN')}
              >
                Add {selectedTab === 'BILL' ? 'Bill' : 'Loan'}
              </Button>
            </div>
          </div>
        )}

        {/* Table of Repayments */}
        {filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Item & Provider</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Due Amount</th>
                  <th className="py-2.5 px-4">Due Date & Urgency</th>
                  <th className="py-2.5 px-4">Principal Remaining</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((rep) => {
                  const isSettled = rep.status === 'PAID' || (rep.facilityType === 'LOAN' && rep.principalRemaining <= 0);

                  return (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {rep.loanName}
                        </span>
                        <span className="text-[11px] text-slate-400">{rep.provider}</span>
                        {rep.notes && (
                          <span className="text-[10px] text-slate-400 block italic mt-0.5">
                            "{rep.notes}"
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            rep.facilityType === 'LOAN'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                              : 'bg-teal-50 text-teal-800 border border-teal-200/60'
                          }`}
                        >
                          {rep.facilityType === 'LOAN' ? 'LOAN FACILITY' : 'UTILITY BILL'}
                        </span>
                        {rep.isRecurring && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Recurring ({(rep.frequency || 'MONTHLY').toLowerCase()})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        ₹{rep.installmentAmount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-slate-700 font-medium block text-xs">
                          {rep.dueDate}
                        </span>
                        <span className="mt-0.5 block">
                          {rep.urgency === 'OVERDUE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              <AlertTriangle size={10} /> OVERDUE
                            </span>
                          )}
                          {rep.urgency === 'DUE_SOON' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Clock size={10} /> DUE SOON
                            </span>
                          )}
                          {rep.urgency === 'UPCOMING' && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Upcoming
                            </span>
                          )}
                          {rep.urgency === 'SETTLED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle size={10} /> Settled
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {rep.facilityType === 'LOAN' ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              ₹{rep.principalRemaining.toLocaleString('en-IN')}
                            </span>
                            {rep.totalPrincipal && (
                              <span className="text-[10px] text-slate-400">
                                of ₹{rep.totalPrincipal.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            — (Standard Bill)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={isSettled ? 'PAID' : rep.status === 'OVERDUE' ? 'OVERDUE' : 'UPCOMING'} />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        {!isSettled ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openPaymentModal(rep)}
                            icon={<DollarSign size={13} />}
                          >
                            Record Payment
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentModal(rep)}
                          >
                            Add Payment
                          </Button>
                        )}

                        <button
                          onClick={() => openHistoryModal(rep)}
                          title="Payment Log"
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors inline-block align-middle"
                        >
                          <History size={14} />
                        </button>

                        <button
                          onClick={() => openEditModal(rep)}
                          title="Edit Details"
                          className="p-1.5 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors inline-block align-middle"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(rep.id, rep.loanName)}
                          title="Delete Commitment"
                          className="p-1.5 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-block align-middle"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Create or Edit Loan / Bill */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingItem ? 'Edit Financial Commitment' : 'Add Financial Commitment'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateOrUpdate} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  Commitment Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, facilityType: 'LOAN' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      formData.facilityType === 'LOAN'
                        ? 'border-teal-700 bg-teal-50/70 text-teal-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard size={15} className="mb-1 text-teal-700" />
                    <span className="block text-xs">Loan / Working Capital</span>
                    <span className="text-[10px] text-slate-500 block">Amortizes debt principal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, facilityType: 'BILL' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      formData.facilityType === 'BILL'
                        ? 'border-teal-700 bg-teal-50/70 text-teal-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Receipt size={15} className="mb-1 text-teal-700" />
                    <span className="block text-xs">Ordinary Utility Bill</span>
                    <span className="text-[10px] text-slate-500 block">Recharge, mobile, rent</span>
                  </button>
                </div>
              </div>

              <Input
                label="Commitment Name"
                type="text"
                required
                placeholder={formData.facilityType === 'LOAN' ? 'e.g. Motorbike EMI, Working Capital Line' : 'e.g. Airtel 5G Plan, BESCOM Electricity'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Input
                label="Provider / Vendor"
                type="text"
                required
                placeholder="e.g. Kavach MicroFin, Airtel, BESCOM, House Owner"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={formData.facilityType === 'LOAN' ? 'Installment Amount (₹)' : 'Bill Due Amount (₹)'}
                  type="number"
                  required
                  min={1}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />

                {formData.facilityType === 'LOAN' ? (
                  <Input
                    label="Total Principal (₹)"
                    type="number"
                    required
                    min={1}
                    value={formData.totalPrincipal}
                    onChange={(e) => setFormData({ ...formData, totalPrincipal: Number(e.target.value) })}
                  />
                ) : (
                  <Input
                    label="Billing Cycle"
                    type="text"
                    disabled
                    value="Standard Bill"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Due Date"
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                    Recurrence
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ONE_TIME">One-Time (Non-recurring)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Optional Notes"
                type="text"
                placeholder="e.g. Account number, payment reference"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Commitment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Record Manual Payment */}
      {showPaymentModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-xl border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Record Installment Payment</h3>
                <p className="text-xs text-slate-500">{selectedItem.loanName} ({selectedItem.provider})</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
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

            {/* Commitment Context Card */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Facility Category:</span>
                <span className="font-semibold text-slate-900">{selectedItem.facilityType === 'LOAN' ? 'Loan Facility' : 'Utility Bill'}</span>
              </div>
              <div className="flex justify-between">
                <span>Scheduled Installment:</span>
                <span className="font-bold text-slate-900">₹{selectedItem.installmentAmount.toLocaleString('en-IN')}</span>
              </div>
              {selectedItem.facilityType === 'LOAN' && (
                <div className="flex justify-between">
                  <span>Current Principal Remaining:</span>
                  <span className="font-semibold text-teal-800">₹{selectedItem.principalRemaining.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Current Due Date:</span>
                <span>{selectedItem.dueDate}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Amount Paid (₹)"
                  type="number"
                  required
                  min={1}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                />
                <Input
                  label="Payment Date"
                  type="date"
                  required
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1 text-[11px] uppercase">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                >
                  <option value="UPI">UPI (PhonePe, GPay, Paytm)</option>
                  <option value="NET_BANKING">Net Banking / IMPS</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="OTHER">Other / Counter</option>
                </select>
              </div>

              {selectedItem.isRecurring && (
                <div className="p-2.5 bg-teal-50/60 border border-teal-200/60 rounded-lg space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-950">
                    <input
                      type="checkbox"
                      checked={paymentData.advanceNextDueDate}
                      onChange={(e) => setPaymentData({ ...paymentData, advanceNextDueDate: e.target.checked })}
                      className="rounded text-teal-700"
                    />
                    <span>Advance next due date by 1 month</span>
                  </label>
                  <p className="text-[11px] text-teal-800 leading-tight pl-5">
                    Automatically shifts schedule to the next monthly cycle while keeping payment history intact.
                  </p>
                </div>
              )}

              <Input
                label="Optional Reference / Notes"
                type="text"
                placeholder="e.g. UTR / UPI reference ID or shift receipt"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              />

              {/* Legal / Sandbox Disclaimer Note */}
              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-tight flex items-start gap-1.5">
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Manual Ledger Entry:</strong> Recording this payment updates your personal debt and cash-flow schedule. SahayakFin does not execute real-money banking debits or automated NACH transfers.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Payment History Log */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full space-y-4 shadow-xl border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Payment Audit History</h3>
                <p className="text-xs text-slate-500">{selectedItem.loanName} ({selectedItem.provider})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">Commitment</span>
                <span className="font-bold text-slate-900">{selectedItem.loanName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  {selectedItem.facilityType === 'LOAN' ? 'Principal Remaining' : 'Status'}
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedItem.facilityType === 'LOAN'
                    ? `₹${selectedItem.principalRemaining.toLocaleString('en-IN')}`
                    : selectedItem.status}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 pr-1">
              {(!selectedItem.payments || selectedItem.payments.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No payment records logged yet for this commitment.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItem.payments.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-emerald-600" />
                          <span>₹{p.amountPaid.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 font-normal">via {p.paymentMethod}</span>
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            "{p.notes}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {p.paymentDate}
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
                icon={<DollarSign size={13} />}
                onClick={() => {
                  setShowHistoryModal(false);
                  openPaymentModal(selectedItem);
                }}
              >
                Record Payment
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
