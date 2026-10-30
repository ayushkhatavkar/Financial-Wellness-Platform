import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  ExternalLink,
  RefreshCw,
  FileText,
  Copy,
  ArrowRight,
  Filter,
  Eye,
  Sliders,
  DollarSign,
  TrendingUp,
  Download,
  Sparkles,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { financialService } from '../services/financialService';
import { IntegrityReport, FraudAlert, DemoFraudSample } from '../types';
import { Card, PageHeader, Button, StatusBadge } from '../components/common';

export const FraudShieldPage: React.FC = () => {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal inspection state
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  // Demo sample dataset loading state
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeDemoSample, setActiveDemoSample] = useState<DemoFraudSample | null>(null);

  useEffect(() => {
    loadFraudData();
  }, []);

  const loadFraudData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportData, alertsData] = await Promise.all([
        financialService.getLatestFraudReport(),
        financialService.getFraudAlerts()
      ]);
      setReport(reportData);
      setAlerts(alertsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load FraudShield integrity data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    setReviewNotes(alert.review_notes || '');
    setReviewSuccessMessage(null);
  };

  const handleCloseReviewModal = () => {
    setSelectedAlert(null);
    setReviewNotes('');
    setReviewSuccessMessage(null);
  };

  const handleSubmitReview = async (newStatus: 'CLEARED' | 'CONFIRMED_INVALID' | 'PENDING_REVIEW', excludeFromScoring?: boolean) => {
    if (!selectedAlert || !selectedAlert.id) return;
    setIsSubmittingReview(true);
    setReviewSuccessMessage(null);

    try {
      const updated = await financialService.reviewFraudAlert(selectedAlert.id, {
        review_status: newStatus,
        review_notes: reviewNotes.trim() || undefined,
        exclude_from_scoring: excludeFromScoring
      });

      setReviewSuccessMessage(
        newStatus === 'CLEARED' 
          ? 'Alert verified as legitimate. Scoring eligibility updated.'
          : newStatus === 'CONFIRMED_INVALID'
          ? 'Transaction confirmed invalid and safely excluded from revenue calculations.'
          : 'Status updated to pending review.'
      );

      // Refresh list
      await loadFraudData();
      setTimeout(() => {
        handleCloseReviewModal();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to update review status.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleLoadDemoDataset = async (sampleType: 'normal' | 'suspicious' | 'corrected') => {
    setDemoLoading(true);
    try {
      const sample = await financialService.getFraudDemoSample(sampleType);
      setActiveDemoSample(sample);

      // Create a virtual File object and preview it
      const blob = new Blob([sample.csv_content], { type: 'text/csv' });
      const file = new File([blob], sample.filename, { type: 'text/csv' });
      
      const previewRes = await financialService.previewStatementCsv(file);
      if (previewRes.integrity_report) {
        setReport(previewRes.integrity_report);
        setAlerts(previewRes.integrity_report.alerts || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load demonstration dataset.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDownloadSampleCsv = (sample: DemoFraudSample) => {
    const blob = new Blob([sample.csv_content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sample.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && a.review_status !== statusFilter) return false;
    return true;
  });

  const isReviewRecommended = report?.overall_status === 'REVIEW_RECOMMENDED';
  const unresolvedAlerts = alerts.filter(a => a.review_status === 'PENDING_REVIEW');
  const confirmedInvalidAlerts = alerts.filter(a => a.review_status === 'CONFIRMED_INVALID');
  const clearedAlerts = alerts.filter(a => a.review_status === 'CLEARED');

  // Chart data: Alert category distribution
  const categoryPalette = ['#F28C28', '#17243A', '#D18A22', '#16865C', '#687080'];
  const categoryChartData = Object.entries(report?.category_counts || {})
    .filter(([_, count]) => count > 0)
    .map(([cat, count], idx) => ({
      name: cat.replace(/_/g, ' '),
      value: count,
      color: categoryPalette[idx % categoryPalette.length]
    }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="SahayakFin FraudShield"
        description="AI-assisted transaction integrity detection, synthetic anomaly flags, and explainable review."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={loadFraudData}
            >
              Refresh Audit
            </Button>
          </div>
        }
      />

      {/* Hackathon Demonstration Control Strip */}
      <Card className="p-4 bg-white border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F28C28]/10 text-[#F28C28] flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="font-bold text-sm text-[#171B26]">Live Hackathon Demo Sandbox:</span>
              <p className="text-xs text-[#687080]">Load verified synthetic datasets to test detection rules in real time</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleLoadDemoDataset('normal')}
              disabled={demoLoading}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EDF8F3] hover:bg-[#D4F0E2] text-[#16865C] border border-[#BDE8D3] transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} /> 1. Normal Statement (Clear)
            </button>
            <button
              onClick={() => handleLoadDemoDataset('suspicious')}
              disabled={demoLoading}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FEF9EC] hover:bg-[#FDF0CE] text-[#D18A22] border border-[#F8E2AC] transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle size={13} /> 2. Suspicious Inflow (Alerts)
            </button>
            <button
              onClick={() => handleLoadDemoDataset('corrected')}
              disabled={demoLoading}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F0F2F5] hover:bg-[#E2E6EB] text-[#17243A] border border-[#E5E7EB] transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={13} /> 3. Corrected Ledger (Safe)
            </button>
          </div>
        </div>

        {activeDemoSample && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#687080]">
            <span>Active Demonstration File: <strong className="text-[#171B26] font-mono-num">{activeDemoSample.filename}</strong></span>
            <button
              onClick={() => handleDownloadSampleCsv(activeDemoSample)}
              className="text-[#F28C28] hover:text-[#DD7416] font-semibold flex items-center gap-1"
            >
              <Download size={13} /> Download Sample CSV
            </button>
          </div>
        )}
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] flex items-center gap-2.5 text-xs text-[#D94B4B]">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Integrity Status */}
        <Card className="p-5 bg-white border border-[#E5E7EB]">
          <div className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Integrity Status</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
              isReviewRecommended
                ? 'bg-[#FEF9EC] text-[#D18A22] border-[#D18A22]/30'
                : 'bg-[#EDF8F3] text-[#16865C] border-[#16865C]/30'
            }`}>
              {isReviewRecommended ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              {report?.overall_status ? report.overall_status.replace(/_/g, ' ') : 'CLEAR'}
            </span>
          </div>
          <p className="text-[11px] text-[#687080] mt-2">
            {isReviewRecommended ? 'Manual review recommended' : 'Verified data ledger in good standing'}
          </p>
        </Card>

        {/* KPI 2: Total Analyzed */}
        <Card className="p-5 bg-white border border-[#E5E7EB]">
          <div className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Transactions Analyzed</div>
          <div className="text-2xl font-bold font-mono-num text-[#171B26] mt-2">
            {report?.total_analyzed ?? 0}
          </div>
          <p className="text-[11px] text-[#687080] mt-1">
            Historical & newly ingested statement rows
          </p>
        </Card>

        {/* KPI 3: Flagged for Review */}
        <Card className="p-5 bg-white border border-[#E5E7EB]">
          <div className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Flagged for Review</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono-num ${report && report.flagged_count > 0 ? 'text-[#D18A22]' : 'text-[#171B26]'}`}>
              {report?.flagged_count ?? 0}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[#687080]">
              {alerts.length} alert{alerts.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-[11px] text-[#687080] mt-1">
            {unresolvedAlerts.length} active unresolved alert{unresolvedAlerts.length === 1 ? '' : 's'}
          </p>
        </Card>

        {/* KPI 4: Anomaly Indicator */}
        <Card className="p-5 bg-white border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Anomaly Indicator</span>
            <span title="Heuristic alert index to prioritize manual review, NOT a verified probability of fraud.">
              <Info size={13} className="text-[#9299A5] cursor-help" />
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-mono-num text-[#171B26]">
              {report?.anomaly_score ? Number(report.anomaly_score).toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-[#9299A5] font-mono-num">/ 100</span>
          </div>
          <p className="text-[10px] text-[#9299A5] mt-1 leading-tight">
            Heuristic alert index, not probability of fraud
          </p>
        </Card>
      </div>

      {/* 5 Detection Breakdown Cards */}
      <div>
        <h3 className="text-sm font-bold text-[#171B26] mb-3">Detection Modules Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Module 1: Duplicates */}
          <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Duplicates</span>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full ${
                (report?.category_counts?.DUPLICATE || 0) > 0 ? 'bg-[#FDF1F1] text-[#D94B4B]' : 'bg-[#EDF8F3] text-[#16865C]'
              }`}>
                {report?.category_counts?.DUPLICATE || 0}
              </span>
            </div>
            <p className="text-xs text-[#171B26] font-semibold">UTR & ID Repeat</p>
            <p className="text-[11px] text-[#687080] leading-tight">
              Identifies repeated genuine UTRs & conflicting reference records.
            </p>
          </div>

          {/* Module 2: Circular Transfers */}
          <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Circular</span>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full ${
                (report?.category_counts?.CIRCULAR_TRANSFER || 0) > 0 ? 'bg-[#FEF9EC] text-[#D18A22]' : 'bg-[#EDF8F3] text-[#16865C]'
              }`}>
                {report?.category_counts?.CIRCULAR_TRANSFER || 0}
              </span>
            </div>
            <p className="text-xs text-[#171B26] font-semibold">Reciprocal Cycling</p>
            <p className="text-[11px] text-[#687080] leading-tight">
              Flags matching credit & debit movements between identical peers.
            </p>
          </div>

          {/* Module 3: Income Spikes */}
          <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Income Spike</span>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full ${
                (report?.category_counts?.INCOME_SPIKE || 0) > 0 ? 'bg-[#FEF9EC] text-[#D18A22]' : 'bg-[#EDF8F3] text-[#16865C]'
              }`}>
                {report?.category_counts?.INCOME_SPIKE || 0}
              </span>
            </div>
            <p className="text-xs text-[#171B26] font-semibold">MAD Statistical Outlier</p>
            <p className="text-[11px] text-[#687080] leading-tight">
              Detects abnormal credits vs median earnings without hardcoded caps.
            </p>
          </div>

          {/* Module 4: Self-Transfers */}
          <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Self-Transfer</span>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full ${
                (report?.category_counts?.SELF_TRANSFER || 0) > 0 ? 'bg-[#F0F2F5] text-[#17243A]' : 'bg-[#EDF8F3] text-[#16865C]'
              }`}>
                {report?.category_counts?.SELF_TRANSFER || 0}
              </span>
            </div>
            <p className="text-xs text-[#171B26] font-semibold">Non-Income Inflows</p>
            <p className="text-[11px] text-[#687080] leading-tight">
              Excludes loans, reversals & own accounts from inflating earned income.
            </p>
          </div>

          {/* Module 5: Suspicious Repetition */}
          <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#687080] uppercase tracking-wider">Repetition</span>
              <span className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full ${
                (report?.category_counts?.SUSPICIOUS_REPETITION || 0) > 0 ? 'bg-[#FEF9EC] text-[#D18A22]' : 'bg-[#EDF8F3] text-[#16865C]'
              }`}>
                {report?.category_counts?.SUSPICIOUS_REPETITION || 0}
              </span>
            </div>
            <p className="text-xs text-[#171B26] font-semibold">Rapid Identical Bursts</p>
            <p className="text-[11px] text-[#687080] leading-tight">
              Distinguishes normal rent/utility from rapid round-trip micro-bursts.
            </p>
          </div>
        </div>
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Chart */}
        <Card className="lg:col-span-6 bg-white p-5 border border-[#E5E7EB]">
          <div className="pb-3 border-b border-[#E5E7EB] mb-4">
            <h4 className="text-sm font-bold text-[#171B26]">Integrity Alerts by Category</h4>
            <p className="text-xs text-[#687080]">Distribution of triggered explainability rules</p>
          </div>

          <div className="h-56 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="48%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '8px', 
                      border: '1px solid #E5E7EB', 
                      fontSize: '12px' 
                    }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#9299A5]">
                No active integrity alerts recorded for this ledger.
              </div>
            )}
          </div>
        </Card>

        {/* Resolution Progress Card */}
        <Card className="lg:col-span-6 bg-white p-5 border border-[#E5E7EB] flex flex-col justify-between">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h4 className="text-sm font-bold text-[#171B26]">Audit & Manual Resolution Progress</h4>
            <p className="text-xs text-[#687080]">Track items cleared, confirmed invalid, or pending review</p>
          </div>

          <div className="space-y-4 my-auto py-2">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#171B26]">Resolution Completion</span>
                <span className="font-mono-num font-bold text-[#F28C28]">
                  {alerts.length > 0 ? Math.round(((confirmedInvalidAlerts.length + clearedAlerts.length) / alerts.length) * 100) : 100}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#F0F2F5] overflow-hidden flex">
                <div 
                  className="bg-[#16865C] h-full transition-all" 
                  style={{ width: `${alerts.length > 0 ? (clearedAlerts.length / alerts.length) * 100 : 0}%` }}
                  title="Cleared"
                />
                <div 
                  className="bg-[#D94B4B] h-full transition-all" 
                  style={{ width: `${alerts.length > 0 ? (confirmedInvalidAlerts.length / alerts.length) * 100 : 0}%` }}
                  title="Confirmed Invalid"
                />
                <div 
                  className="bg-[#D18A22] h-full transition-all" 
                  style={{ width: `${alerts.length > 0 ? (unresolvedAlerts.length / alerts.length) * 100 : 0}%` }}
                  title="Pending Review"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
              <div className="p-2.5 rounded-lg bg-[#EDF8F3] border border-[#BDE8D3]">
                <span className="text-[10px] uppercase font-semibold text-[#16865C] block">Cleared</span>
                <span className="text-lg font-bold font-mono-num text-[#16865C]">{clearedAlerts.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0]">
                <span className="text-[10px] uppercase font-semibold text-[#D94B4B] block">Confirmed</span>
                <span className="text-lg font-bold font-mono-num text-[#D94B4B]">{confirmedInvalidAlerts.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FEF9EC] border border-[#F8E2AC]">
                <span className="text-[10px] uppercase font-semibold text-[#D18A22] block">Pending</span>
                <span className="text-lg font-bold font-mono-num text-[#D18A22]">{unresolvedAlerts.length}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#F0F2F5] rounded-lg text-[11px] text-[#687080] flex items-center gap-2">
            <Info size={14} className="text-[#F28C28] shrink-0" />
            <span>Resolving an alert immediately updates the transaction scoring exclusion and refreshes the Trust Score.</span>
          </div>
        </Card>
      </div>

      {/* Suspicious Transaction Table & Filter Bar */}
      <Card padding="none" className="overflow-hidden bg-white border border-[#E5E7EB]">
        {/* Table Header & Filters */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3 bg-[#F7F8FA]/60">
          <div>
            <h4 className="font-bold text-sm text-[#171B26]">Integrity Alerts & Flagged Transactions</h4>
            <p className="text-xs text-[#687080]">Explainable risk signals with evidence breakdown and audit trail</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs bg-white text-[#171B26] focus:outline-none focus:border-[#F28C28]"
            >
              <option value="ALL">All Categories ({alerts.length})</option>
              <option value="DUPLICATE">Duplicates</option>
              <option value="CIRCULAR_TRANSFER">Circular Transfers</option>
              <option value="INCOME_SPIKE">Income Spikes</option>
              <option value="SELF_TRANSFER">Self-Transfers</option>
              <option value="SUSPICIOUS_REPETITION">Repetitions</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs bg-white text-[#171B26] focus:outline-none focus:border-[#F28C28]"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CONFIRMED_INVALID">Confirmed Invalid</option>
              <option value="CLEARED">Cleared / Legitimate</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#EDF8F3] text-[#16865C] flex items-center justify-center mx-auto">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-sm font-semibold text-[#171B26]">No matching integrity alerts</p>
            <p className="text-xs text-[#687080] max-w-sm mx-auto">
              All transactions in this view have cleared automated detection rules or no alerts match the active filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F2F5] text-[#687080] border-b border-[#E5E7EB] font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rule & Category</th>
                  <th className="py-3 px-4">Reference & Counterparty</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Detected Explanation</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#171B26]">
                {filteredAlerts.map((alert, i) => (
                  <tr key={alert.id || i} className="hover:bg-[#F7F8FA]/80 transition-colors">
                    {/* Rule & Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-xs text-[#171B26] block">
                        {alert.rule_name}
                      </span>
                      <span className="font-mono text-[10px] text-[#F28C28] font-semibold block mt-0.5">
                        {alert.rule_id}
                      </span>
                    </td>

                    {/* Reference & Counterparty */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono-num font-semibold text-xs text-[#17243A] block">
                        {alert.evidence?.masked_reference || alert.external_ref || 'Reference Verified'}
                      </span>
                      <span className="text-[11px] text-[#687080] block">
                        {alert.evidence?.counterparty_masked || alert.evidence?.description || 'Ledger Entry'}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        alert.severity === 'HIGH' ? 'bg-[#FDF1F1] text-[#D94B4B] border border-[#F9D0D0]' :
                        alert.severity === 'MEDIUM' ? 'bg-[#FEF9EC] text-[#D18A22] border border-[#F8E2AC]' :
                        'bg-[#F0F2F5] text-[#687080] border border-[#E5E7EB]'
                      }`}>
                        {alert.severity}
                      </span>
                    </td>

                    {/* Review Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        alert.review_status === 'CLEARED' ? 'bg-[#EDF8F3] text-[#16865C]' :
                        alert.review_status === 'CONFIRMED_INVALID' ? 'bg-[#FDF1F1] text-[#D94B4B]' :
                        'bg-[#FEF9EC] text-[#D18A22]'
                      }`}>
                        {alert.review_status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Explanation */}
                    <td className="py-3.5 px-4 text-xs text-[#687080] max-w-xs truncate">
                      {alert.explanation}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReviewModal(alert)}
                        icon={<Eye size={13} />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inspection & Resolution Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-[#17243A]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full space-y-4 shadow-2xl border border-[#E5E7EB] bg-white rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F28C28] block">
                  {selectedAlert.category.replace(/_/g, ' ')}
                </span>
                <h3 className="font-bold text-base text-[#171B26] mt-0.5">
                  {selectedAlert.rule_name}
                </h3>
              </div>
              <button
                onClick={handleCloseReviewModal}
                className="text-[#9299A5] hover:text-[#171B26] p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {reviewSuccessMessage && (
              <div className="p-3 bg-[#EDF8F3] text-[#16865C] text-xs rounded-lg border border-[#BDE8D3] flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{reviewSuccessMessage}</span>
              </div>
            )}

            {/* Explanation & Evidence Box */}
            <div className="p-3.5 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB] space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-[#687080] uppercase tracking-wider block">Rule Explanation</span>
                <p className="text-[#171B26] mt-0.5 leading-relaxed">{selectedAlert.explanation}</p>
              </div>

              {selectedAlert.evidence && (
                <div className="pt-2 border-t border-[#E5E7EB] space-y-1">
                  <span className="text-[10px] font-semibold text-[#687080] uppercase tracking-wider block">Evidence Metrics</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {selectedAlert.evidence.credit_amount && (
                      <div>Amount: <strong className="font-mono-num">₹{Number(selectedAlert.evidence.credit_amount).toLocaleString('en-IN')}</strong></div>
                    )}
                    {selectedAlert.evidence.established_median && (
                      <div>Baseline Median: <strong className="font-mono-num">₹{Number(selectedAlert.evidence.established_median).toLocaleString('en-IN')}</strong></div>
                    )}
                    {selectedAlert.evidence.cycle_count && (
                      <div>Reciprocal Cycles: <strong className="font-mono-num">{selectedAlert.evidence.cycle_count}</strong></div>
                    )}
                    {selectedAlert.evidence.total_volume && (
                      <div>Cycled Volume: <strong className="font-mono-num">₹{Number(selectedAlert.evidence.total_volume).toLocaleString('en-IN')}</strong></div>
                    )}
                    {selectedAlert.evidence.masked_reference && (
                      <div>Masked Reference: <strong className="font-mono-num">{selectedAlert.evidence.masked_reference}</strong></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Review Notes Input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-[#687080] uppercase tracking-wider">
                Auditor / Member Review Notes
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Verified customer tip slip, or confirmed internal account transfer"
                rows={2}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs bg-white text-[#171B26] focus:outline-none focus:border-[#F28C28] resize-none"
              />
            </div>

            {/* Resolution Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isSubmittingReview}
                  onClick={() => handleSubmitReview('CLEARED', false)}
                >
                  Verify as Legitimate
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  disabled={isSubmittingReview}
                  onClick={() => handleSubmitReview('CONFIRMED_INVALID', true)}
                >
                  Confirm Invalid / Exclude
                </Button>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  className="text-xs text-[#687080] hover:text-[#171B26]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitReview('PENDING_REVIEW')}
                  className="text-xs text-[#F28C28] hover:text-[#DD7416] font-semibold"
                >
                  Keep Pending Review
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
