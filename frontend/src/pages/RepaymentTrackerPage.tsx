import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  History, 
  Info,
  DollarSign,
  X
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Repayments & Recurring Bills"
        description="Track active credit lines, monitor utility bills, and record scheduled installments to boost your Financial Trust Score."
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3.5 text-xs text-rose-950">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-fin-danger">
            <AlertTriangle size={17} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-rose-900 text-sm">
                Attention Required: {overdueItems.length} Overdue Payment{overdueItems.length > 1 ? 's' : ''} (₹{totalOverdueAmount.toLocaleString('en-IN')})
              </span>
              <span className="text-[11px] bg-rose-200/80 px-2.5 py-0.5 rounded-full font-semibold text-rose-800">
                Action Pending
              </span>
            </div>
            <p className="text-rose-800/90 text-xs mt-1 leading-relaxed">
              Unsettled obligations reduce your cash-flow reliability score. Settle or record payments to preserve your platform credit standing.
            </p>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-[11px] font-semibold text-fin-muted uppercase tracking-wider">Overdue Dues</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono-num ${overdueItems.length > 0 ? 'text-fin-danger' : 'text-fin-navy'}`}>
              ₹{totalOverdueAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fin-subtle text-fin-secondary border border-fin-border">
              {overdueItems.length} {overdueItems.length === 1 ? 'due' : 'dues'}
            </span>
          </div>
          <p className="text-[11px] text-fin-secondary mt-1">Immediate settlement needed</p>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-semibold text-fin-muted uppercase tracking-wider">Due in Next 7 Days</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono-num ${dueSoonItems.length > 0 ? 'text-fin-warning' : 'text-fin-navy'}`}>
              ₹{dueSoonItems.reduce((acc, i) => acc + i.installmentAmount, 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fin-subtle text-fin-secondary border border-fin-border">
              {dueSoonItems.length} upcoming
            </span>
          </div>
          <p className="text-[11px] text-fin-secondary mt-1">Scheduled for this weekly cycle</p>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] font-semibold text-fin-muted uppercase tracking-wider">Active Loan Principal</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold font-mono-num text-fin-navy">
              ₹{totalLoanPrincipal.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fin-orange/10 text-fin-orange border border-fin-orange/20">
              {items.filter((i) => i.facilityType === 'LOAN' && i.principalRemaining > 0).length} facilities
            </span>
          </div>
          <p className="text-[11px] text-fin-secondary mt-1">Total outstanding credit principal</p>
        </Card>
      </div>

      {/* Filter Tabs & Content Table */}
      <Card padding="none" className="overflow-hidden border border-fin-border">
        {/* Tab Headers */}
        <div className="p-3.5 border-b border-fin-border flex items-center justify-between bg-fin-subtle/50 flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTab === 'ALL'
                  ? 'bg-white text-fin-navy shadow-xs border border-fin-border'
                  : 'text-fin-secondary hover:text-fin-text hover:bg-white/60'
              }`}
            >
              All Commitments ({items.length})
            </button>
            <button
              onClick={() => setSelectedTab('LOAN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedTab === 'LOAN'
                  ? 'bg-white text-fin-navy shadow-xs border border-fin-border'
                  : 'text-fin-secondary hover:text-fin-text hover:bg-white/60'
              }`}
            >
              <CreditCard size={13} className="text-fin-orange" />
              Loans & Credit ({items.filter((i) => i.facilityType === 'LOAN').length})
            </button>
            <button
              onClick={() => setSelectedTab('BILL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedTab === 'BILL'
                  ? 'bg-white text-fin-navy shadow-xs border border-fin-border'
                  : 'text-fin-secondary hover:text-fin-text hover:bg-white/60'
              }`}
            >
              <Receipt size={13} className="text-fin-orange" />
              Utility & Bills ({items.filter((i) => i.facilityType === 'BILL').length})
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12 text-xs text-fin-muted">
            Loading scheduled commitments...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-14 space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-fin-subtle border border-fin-border text-fin-muted flex items-center justify-center mx-auto">
              <Receipt size={22} />
            </div>
            <p className="text-sm font-semibold text-fin-text">No commitments found</p>
            <p className="text-xs text-fin-secondary max-w-sm mx-auto">
              {selectedTab === 'LOAN'
                ? 'No active loan lines or credit repayments added yet.'
                : selectedTab === 'BILL'
                ? 'No utility or recurring household bills recorded yet.'
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-fin-subtle/70 text-fin-secondary border-b border-fin-border font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Provider</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Due Amount</th>
                  <th className="py-3 px-4">Due Date & Urgency</th>
                  <th className="py-3 px-4">Principal Remaining</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fin-border text-fin-text">
                {filteredItems.map((rep) => {
                  const isSettled = rep.status === 'PAID' || (rep.facilityType === 'LOAN' && rep.principalRemaining <= 0);

                  return (
                    <tr key={rep.id} className="hover:bg-fin-subtle/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-fin-navy block text-sm">
                          {rep.loanName}
                        </span>
                        <span className="text-[11px] text-fin-secondary">{rep.provider}</span>
                        {rep.notes && (
                          <span className="text-[10px] text-fin-muted block italic mt-0.5">
                            "{rep.notes}"
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border ${
                            rep.facilityType === 'LOAN'
                              ? 'bg-fin-navy/10 text-fin-navy border-fin-navy/20'
                              : 'bg-fin-orange/10 text-fin-orange border-fin-orange/20'
                          }`}
                        >
                          {rep.facilityType === 'LOAN' ? 'LOAN FACILITY' : 'UTILITY BILL'}
                        </span>
                        {rep.isRecurring && (
                          <span className="text-[10px] text-fin-muted block mt-0.5">
                            Recurring ({(rep.frequency || 'MONTHLY').toLowerCase()})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold font-mono-num text-fin-navy whitespace-nowrap text-sm">
                        ₹{rep.installmentAmount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-fin-text font-medium block text-xs font-mono-num">
                          {rep.dueDate}
                        </span>
                        <span className="mt-1 block">
                          {rep.urgency === 'OVERDUE' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fin-danger bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertTriangle size={10} /> OVERDUE
                            </span>
                          )}
                          {rep.urgency === 'DUE_SOON' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fin-warning bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock size={10} /> DUE SOON
                            </span>
                          )}
                          {rep.urgency === 'UPCOMING' && (
                            <span className="text-[10px] text-fin-secondary font-medium px-2 py-0.5 rounded-full bg-fin-subtle border border-fin-border">
                              Upcoming
                            </span>
                          )}
                          {rep.urgency === 'SETTLED' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-fin-success bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 size={10} /> Settled
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono-num">
                        {rep.facilityType === 'LOAN' ? (
                          <div>
                            <span className="font-semibold text-fin-navy block text-xs">
                              ₹{rep.principalRemaining.toLocaleString('en-IN')}
                            </span>
                            {rep.totalPrincipal && (
                              <span className="text-[10px] text-fin-muted">
                                of ₹{rep.totalPrincipal.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-fin-muted italic">
                            — (Standard Bill)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={isSettled ? 'PAID' : rep.status === 'OVERDUE' ? 'OVERDUE' : 'UPCOMING'} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
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
                          className="p-1.5 rounded-lg text-fin-secondary hover:text-fin-navy hover:bg-fin-subtle transition-colors inline-block align-middle"
                        >
                          <History size={15} />
                        </button>

                        <button
                          onClick={() => openEditModal(rep)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg text-fin-secondary hover:text-fin-orange hover:bg-fin-orange/10 transition-colors inline-block align-middle"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          onClick={() => handleDelete(rep.id, rep.loanName)}
                          title="Delete Commitment"
                          className="p-1.5 rounded-lg text-fin-secondary hover:text-fin-danger hover:bg-rose-50 transition-colors inline-block align-middle"
                        >
                          <Trash2 size={15} />
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
        <div className="fixed inset-0 z-50 bg-fin-navy/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-2xl border border-fin-border bg-white rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-fin-border">
              <h3 className="font-bold text-base text-fin-navy">
                {editingItem ? 'Edit Financial Commitment' : 'Add Financial Commitment'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-fin-muted hover:text-fin-text p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-fin-danger text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrUpdate} className="space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-fin-text font-semibold mb-1.5 text-[11px] uppercase tracking-wider">
                  Commitment Category
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, facilityType: 'LOAN' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.facilityType === 'LOAN'
                        ? 'border-fin-orange bg-fin-orange/10 text-fin-navy font-semibold shadow-xs'
                        : 'border-fin-border bg-white text-fin-secondary hover:bg-fin-subtle'
                    }`}
                  >
                    <CreditCard size={16} className={`mb-1 ${formData.facilityType === 'LOAN' ? 'text-fin-orange' : 'text-fin-muted'}`} />
                    <span className="block text-xs font-semibold">Loan / Working Capital</span>
                    <span className="text-[10px] text-fin-muted block mt-0.5">Amortizes debt principal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, facilityType: 'BILL' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.facilityType === 'BILL'
                        ? 'border-fin-orange bg-fin-orange/10 text-fin-navy font-semibold shadow-xs'
                        : 'border-fin-border bg-white text-fin-secondary hover:bg-fin-subtle'
                    }`}
                  >
                    <Receipt size={16} className={`mb-1 ${formData.facilityType === 'BILL' ? 'text-fin-orange' : 'text-fin-muted'}`} />
                    <span className="block text-xs font-semibold">Ordinary Utility Bill</span>
                    <span className="text-[10px] text-fin-muted block mt-0.5">Recharge, mobile, rent</span>
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
                  <label className="block text-fin-text font-semibold mb-1 text-[11px] uppercase tracking-wider">
                    Recurrence
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-fin-border rounded-lg text-xs bg-white text-fin-text focus:outline-none focus:border-fin-orange focus:ring-1 focus:ring-fin-orange"
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

              <div className="flex justify-end gap-2 pt-3 border-t border-fin-border">
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
        <div className="fixed inset-0 z-50 bg-fin-navy/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full space-y-4 shadow-2xl border border-fin-border bg-white rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-fin-border">
              <div>
                <h3 className="font-bold text-base text-fin-navy">Record Installment Payment</h3>
                <p className="text-xs text-fin-secondary">{selectedItem.loanName} ({selectedItem.provider})</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-fin-muted hover:text-fin-text p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-fin-danger text-xs rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            {/* Commitment Context Card */}
            <div className="p-3.5 bg-fin-subtle border border-fin-border rounded-lg text-xs space-y-2 text-fin-text">
              <div className="flex justify-between">
                <span className="text-fin-secondary">Facility Category:</span>
                <span className="font-semibold text-fin-navy">{selectedItem.facilityType === 'LOAN' ? 'Loan Facility' : 'Utility Bill'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fin-secondary">Scheduled Installment:</span>
                <span className="font-bold font-mono-num text-fin-navy">₹{selectedItem.installmentAmount.toLocaleString('en-IN')}</span>
              </div>
              {selectedItem.facilityType === 'LOAN' && (
                <div className="flex justify-between">
                  <span className="text-fin-secondary">Current Principal Remaining:</span>
                  <span className="font-semibold font-mono-num text-fin-orange">₹{selectedItem.principalRemaining.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-fin-muted pt-2 border-t border-fin-border">
                <span>Current Due Date:</span>
                <span className="font-mono-num font-medium text-fin-secondary">{selectedItem.dueDate}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
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
                <label className="block text-fin-text font-semibold mb-1 text-[11px] uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-fin-border rounded-lg text-xs bg-white text-fin-text focus:outline-none focus:border-fin-orange focus:ring-1 focus:ring-fin-orange"
                >
                  <option value="UPI">UPI (PhonePe, GPay, Paytm)</option>
                  <option value="NET_BANKING">Net Banking / IMPS</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="OTHER">Other / Counter</option>
                </select>
              </div>

              {selectedItem.isRecurring && (
                <div className="p-3 bg-fin-orange/5 border border-fin-orange/20 rounded-lg space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-fin-navy">
                    <input
                      type="checkbox"
                      checked={paymentData.advanceNextDueDate}
                      onChange={(e) => setPaymentData({ ...paymentData, advanceNextDueDate: e.target.checked })}
                      className="rounded text-fin-orange focus:ring-fin-orange"
                    />
                    <span>Advance next due date by 1 month</span>
                  </label>
                  <p className="text-[11px] text-fin-secondary leading-relaxed pl-5">
                    Automatically shifts schedule to the next monthly cycle while keeping payment audit history intact.
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
              <div className="p-2.5 rounded-lg bg-fin-subtle border border-fin-border text-[11px] text-fin-muted leading-relaxed flex items-start gap-2">
                <Info size={14} className="text-fin-secondary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-fin-text">Manual Ledger Entry:</strong> Recording this payment updates your personal debt and cash-flow schedule. SahayakFin does not execute real-money banking debits or automated NACH transfers.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fin-border">
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
        <div className="fixed inset-0 z-50 bg-fin-navy/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full space-y-4 shadow-2xl border border-fin-border bg-white rounded-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-fin-border">
              <div>
                <h3 className="font-bold text-base text-fin-navy">Payment Audit History</h3>
                <p className="text-xs text-fin-secondary">{selectedItem.loanName} ({selectedItem.provider})</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-fin-muted hover:text-fin-text p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-fin-subtle rounded-lg text-xs border border-fin-border">
              <div>
                <span className="text-fin-muted text-[10px] uppercase font-semibold tracking-wider block">Commitment</span>
                <span className="font-bold text-fin-navy text-sm">{selectedItem.loanName}</span>
              </div>
              <div className="text-right">
                <span className="text-fin-muted text-[10px] uppercase font-semibold tracking-wider block">
                  {selectedItem.facilityType === 'LOAN' ? 'Principal Remaining' : 'Status'}
                </span>
                <span className="font-bold font-mono-num text-fin-navy text-sm">
                  {selectedItem.facilityType === 'LOAN'
                    ? `₹${selectedItem.principalRemaining.toLocaleString('en-IN')}`
                    : selectedItem.status}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-fin-border pr-1">
              {(!selectedItem.payments || selectedItem.payments.length === 0) ? (
                <div className="text-center py-10 text-xs text-fin-muted">
                  No payment records logged yet for this commitment.
                </div>
              ) : (
                <div className="space-y-2.5 py-1">
                  {selectedItem.payments.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border border-fin-border bg-white hover:bg-fin-subtle/50 transition-colors flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-fin-text flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-fin-success shrink-0" />
                          <span className="font-mono-num font-bold text-fin-navy">₹{p.amountPaid.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-fin-muted font-normal">via {p.paymentMethod}</span>
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-fin-secondary italic pl-5">
                            "{p.notes}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-fin-muted font-mono-num">
                        {p.paymentDate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-fin-border flex justify-between items-center">
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