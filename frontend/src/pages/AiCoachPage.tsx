import React, { useEffect, useState, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  PiggyBank, 
  CheckCircle2, 
  X, 
  Edit3, 
  AlertCircle, 
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck, 
  Languages, 
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Utensils,
  Fuel,
  Smartphone,
  Wrench,
  HeartPulse,
  CreditCard,
  HelpCircle,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { 
  SpendingAnalysis, 
  BudgetRecommendation, 
  ChatMessage, 
  SavingsGoal 
} from '../types';
import { Card, PageHeader, Button, StatusBadge, Input } from '../components/common';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'FOOD_GROCERIES':
      return <Utensils size={18} className="text-amber-600" />;
    case 'FUEL_TRANSPORT':
      return <Fuel size={18} className="text-blue-600" />;
    case 'UTILITIES':
      return <Smartphone size={18} className="text-indigo-600" />;
    case 'BUSINESS_EXPENSE':
      return <Wrench size={18} className="text-slate-600" />;
    case 'HEALTHCARE':
      return <HeartPulse size={18} className="text-rose-600" />;
    default:
      return <CreditCard size={18} className="text-teal-600" />;
  }
};

export const AiCoachPage: React.FC = () => {
  // Data states
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<BudgetRecommendation[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Loading and form states
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Edit recommendation modal
  const [editingRec, setEditingRec] = useState<BudgetRecommendation | null>(null);
  const [customLimit, setCustomLimit] = useState<number>(0);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [analysisData, recsData, goalsData, historyData] = await Promise.all([
        financialService.getSpendingAnalysis(),
        financialService.getBudgetRecommendations(),
        financialService.getSavingsGoals(),
        financialService.getChatHistory(),
      ]);

      setAnalysis(analysisData);
      setRecommendations(recsData);
      setSavingsGoals(goalsData);
      setMessages(historyData);
    } catch (err) {
      console.error('Failed to load coach data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: textToSend,
      language: selectedLanguage,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    try {
      const response = await financialService.sendChatMessage(textToSend, selectedLanguage);
      const assistantMessage: ChatMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        language: response.language,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiPowered: response.isAiPowered,
        providerUsed: response.providerUsed,
        suggestedFollowups: response.suggestedFollowups,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Unable to connect to financial coaching service right now. Please verify your connection or try again shortly.',
        language: selectedLanguage,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRecommendationAction = async (
    recId: string, 
    action: 'ACCEPT' | 'DISMISS' | 'EDIT', 
    limitVal?: number, 
    goalId?: string
  ) => {
    setActionError(null);
    try {
      await financialService.actOnRecommendation(recId, action, limitVal, goalId);
      const updated = await financialService.getBudgetRecommendations();
      setRecommendations(updated);
      setEditingRec(null);
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
    }
  };

  const openEditModal = (rec: BudgetRecommendation) => {
    setEditingRec(rec);
    setCustomLimit(rec.suggestedMonthlyLimit);
    setSelectedGoalId(rec.linkedGoalId || '');
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear your conversation history with SahayakFin Money Coach?')) return;
    try {
      await financialService.clearChatHistory();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const quickPrompts = [
    'Where am I spending the most?',
    'How can I save ₹2,000 next month?',
    'Why is my money running low?',
    'Explain my financial score.'
  ];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Analyzing your verified statements...</p>
      </div>
    );
  }

  // Active / pending recommendations
  const pendingOrAcceptedRecs = recommendations.filter(r => r.status !== 'DISMISSED');
  const dismissedRecs = recommendations.filter(r => r.status === 'DISMISSED');

  // Categories already on track / essential without savings opportunity
  const onTrackCategories = (analysis?.categoryBreakdown || []).filter(c => !c.isOpportunity);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Header */}
      <PageHeader
        title="Your Money Coach"
        description="Understand your spending and find ways to save."
      />

      {/* 2. Top Summary Cards (Understand within 5 seconds) */}
      {analysis && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Money Received */}
            <Card className="p-4 border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Money Received</span>
                <div className="w-7 h-7 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
                  <ArrowDownLeft size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{analysis.averageMonthlyIncome.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Monthly average earnings
                </div>
              </div>
            </Card>

            {/* Card 2: Money Spent */}
            <Card className="p-4 border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Money Spent</span>
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  ₹{analysis.averageMonthlyExpenses.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Monthly living & fuel costs
                </div>
              </div>
            </Card>

            {/* Card 3: Money Left (Actual current savings) */}
            <Card className="p-4 border-slate-200/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Money Left</span>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  analysis.netMonthlySavings >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  <PiggyBank size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className={`text-2xl font-bold tracking-tight ${
                  analysis.netMonthlySavings >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  ₹{analysis.netMonthlySavings.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span>{analysis.netMonthlySavings >= 0 ? 'Actual monthly surplus' : 'Monthly deficit'}</span>
                  {analysis.netMonthlySavings >= 0 && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {analysis.savingsRatePct}% saved
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Card 4: Potential Extra Savings (Future opportunity) */}
            <Card className="p-4 border-teal-200/80 bg-gradient-to-br from-white to-teal-50/30 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-950">Potential Extra Savings</span>
                <div className="w-7 h-7 rounded-md bg-teal-100/70 text-teal-800 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-teal-800 tracking-tight">
                  +₹{analysis.potentialTotalMonthlySavings.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-teal-700 ml-1">/mo</span>
                </div>
                <div className="text-[11px] text-teal-900 mt-0.5 font-medium">
                  ₹{analysis.potentialTotalAnnualSavings.toLocaleString('en-IN')}/year with simple limits
                </div>
              </div>
            </Card>
          </div>

          {/* Unified Reporting Period Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <span>
                <strong className="font-semibold text-slate-900">Reporting Period:</strong>{' '}
                {analysis.reportingPeriodLabel || `Monthly average across ${analysis.monthsAnalyzed} month(s) of verified statements.`}
              </span>
            </div>
            <div>
              {analysis.isSufficient ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> Verified Statement History
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  <AlertCircle size={12} /> Provisional Baseline (&lt; 60 days)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Prioritized Section: "Where Can I Spend Less?" */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Where Can I Spend Less?</h2>
            <p className="text-xs text-slate-500">
              Clear monthly spending limits. Set a limit to protect your hard-earned cash without disrupting work.
            </p>
          </div>
          {dismissedRecs.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
            >
              {showDismissed ? 'Hide dismissed' : `View dismissed (${dismissedRecs.length})`}
            </button>
          )}
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
              <X size={14} />
            </button>
          </div>
        )}

        {pendingOrAcceptedRecs.length === 0 ? (
          <Card className="p-8 text-center space-y-2 border-dashed">
            <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">All spending is currently within healthy limits</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your categorized outflows are well-aligned with your monthly income. Keep up the good work or ask your Money Coach below for further optimizations.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingOrAcceptedRecs.map((rec) => {
              const isAccepted = rec.status === 'ACCEPTED';
              const progressPct = rec.suggestedMonthlyLimit > 0 
                ? Math.min(100, Math.round((rec.actualCurrentSpend / rec.suggestedMonthlyLimit) * 100))
                : 0;

              return (
                <Card 
                  key={rec.id} 
                  className={`p-4 transition-all relative ${
                    isAccepted ? 'border-teal-300 bg-teal-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{rec.categoryLabel}</h3>
                        <div className="text-[11px] text-slate-500">
                          Actual spend: <strong className="text-slate-700">₹{rec.currentMonthlySpend.toLocaleString('en-IN')}/mo</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                          <Check size={11} /> Active Limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          Potential saving: ₹{rec.expectedMonthlySavings.toLocaleString('en-IN')}/mo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 mt-3 bg-white rounded-lg border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Spent</span>
                      <span className="text-xs font-bold text-slate-800">
                        ₹{rec.currentMonthlySpend.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Suggested Limit</span>
                      <span className="text-xs font-bold text-teal-800">
                        ₹{rec.suggestedMonthlyLimit.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Potential Saving</span>
                      <span className="text-xs font-bold text-emerald-700">
                        ₹{rec.expectedMonthlySavings.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                  </div>

                  {/* Simple Explanation */}
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {rec.reason}
                  </p>

                  {/* Active Month-to-Date Tracking Bar (if accepted) */}
                  {isAccepted && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Current Month Spending:</span>
                        <span className={`font-semibold ${rec.isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                          ₹{rec.actualCurrentSpend.toLocaleString('en-IN')} / ₹{rec.suggestedMonthlyLimit.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${rec.isOverBudget ? 'bg-rose-500' : 'bg-teal-600'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>{rec.isOverBudget ? '⚠️ Exceeding suggested limit' : '✅ Within target limit'}</span>
                        {rec.linkedGoalName && (
                          <span className="text-teal-700 font-medium">
                            Directs to: {rec.linkedGoalName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isAccepted ? (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(rec)}
                          className="text-xs h-7 px-2.5"
                        >
                          <Edit3 size={11} className="mr-1" /> Edit Limit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecommendationAction(rec.id, 'DISMISS')}
                          className="text-xs h-7 px-2 text-slate-400 hover:text-slate-600"
                        >
                          Remove Limit
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => handleRecommendationAction(rec.id, 'DISMISS')}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          Dismiss
                        </button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(rec)}
                            className="text-xs h-7 px-2 text-slate-600"
                          >
                            Customize
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRecommendationAction(rec.id, 'ACCEPT')}
                            className="text-xs h-7 px-3 bg-teal-700 hover:bg-teal-800 text-white"
                          >
                            Set Limit (₹{rec.suggestedMonthlyLimit.toLocaleString('en-IN')})
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dismissed items list (collapsible) */}
        {showDismissed && dismissedRecs.length > 0 && (
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Dismissed Limits</h4>
            <div className="space-y-1.5">
              {dismissedRecs.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-700">{d.categoryLabel} (₹{d.currentMonthlySpend}/mo)</span>
                  <button
                    onClick={() => handleRecommendationAction(d.id, 'ACCEPT')}
                    className="text-teal-700 hover:text-teal-900 font-medium text-[11px]"
                  >
                    Re-activate Limit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. On-Track & Essential Operations Reassurance */}
      {onTrackCategories.length > 0 && (
        <Card className="p-4 bg-slate-50/70 border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-700" />
              <h3 className="text-xs font-bold text-slate-800">
                Essential Work Operations &amp; Categories Within Budget
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              No arbitrary cuts applied
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Business servicing, work repairs, and essential buffers power your daily delivery earnings and are intentionally preserved without aggressive spending reductions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {onTrackCategories.map((c) => (
              <div key={c.category} className="p-2.5 bg-white rounded-md border border-slate-200/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block leading-tight">{c.categoryLabel}</span>
                    <span className="text-[10px] text-slate-500">₹{c.currentMonthlySpend.toLocaleString('en-IN')}/mo</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {c.category === 'BUSINESS_EXPENSE' ? 'Work Essential' : 'Within Budget'}
                </span>
              </div>
            ))}
          </div>

          {/* Expandable full category breakdown */}
          <div className="pt-2 text-right">
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950"
            >
              <span>{showAllCategories ? 'Hide details' : `View all category spending details (${analysis?.categoryBreakdown.length || 0})`}</span>
              {showAllCategories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showAllCategories && analysis && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 px-2">
                <span className="col-span-5">Category</span>
                <span className="col-span-3 text-right">Monthly Spend</span>
                <span className="col-span-2 text-right">% of Expenses</span>
                <span className="col-span-2 text-right">Status</span>
              </div>
              <div className="space-y-1">
                {analysis.categoryBreakdown.map((item) => (
                  <div 
                    key={item.category} 
                    className="grid grid-cols-12 items-center text-xs py-1.5 px-2 bg-white rounded border border-slate-100"
                  >
                    <div className="col-span-5 flex items-center gap-1.5 font-medium text-slate-800">
                      {getCategoryIcon(item.category)}
                      <span>{item.categoryLabel}</span>
                    </div>
                    <div className="col-span-3 text-right font-semibold text-slate-900">
                      ₹{item.currentMonthlySpend.toLocaleString('en-IN')}
                    </div>
                    <div className="col-span-2 text-right text-slate-500">
                      {item.percentageOfExpenses}%
                    </div>
                    <div className="col-span-2 text-right">
                      {item.needsReview ? (
                        <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                          Needs review
                        </span>
                      ) : item.isOpportunity ? (
                        <span className="text-[10px] font-medium text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                          Opportunity
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          On track
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 5. Chatbot Section: "Ask your Money Coach" */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bot size={18} className="text-teal-700" />
              Ask your Money Coach
            </h2>
            <p className="text-xs text-slate-500">
              Instant answers grounded in your verified statement earnings, fuel expenses, and trust score.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
              <Languages size={12} /> Language:
            </span>
            <button
              onClick={() => setSelectedLanguage('en')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                selectedLanguage === 'en' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLanguage('hi')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                selectedLanguage === 'hi' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setSelectedLanguage('mr')}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                selectedLanguage === 'mr' ? 'bg-white text-teal-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* Quick Prompts Chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              className="text-xs bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 px-3 py-1.5 rounded-full border border-slate-200 hover:border-teal-300 transition-colors shadow-2xs font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Feed Card */}
        <Card className="p-0 border-slate-200 overflow-hidden flex flex-col h-[420px]">
          {/* Messages scroll box */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-10 h-10 rounded-full bg-teal-100/60 text-teal-800 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">How can I help you today?</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Click any quick question above or ask about your fuel spending, how to save for bike repairs, or how to boost your financial score.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      <span>{isUser ? 'You' : 'SahayakFin Money Coach'}</span>
                      <span>•</span>
                      <span>{m.createdAt}</span>
                      {!isUser && m.isAiPowered && (
                        <span className="text-teal-700 font-semibold bg-teal-50 px-1 rounded">
                          AI
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-teal-700 text-white rounded-br-none shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-xs whitespace-pre-line'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Follow-up suggestion pills */}
                    {!isUser && m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.suggestedFollowups.map((f) => (
                          <button
                            key={f}
                            onClick={() => handleSendMessage(f)}
                            className="text-[11px] bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-900 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                          >
                            ↳ {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input & Send Bar */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask anything about your money, bills, or savings..."
                disabled={isSending}
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
              />
              <Button
                variant="primary"
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || isSending}
                className="h-9 px-4 bg-teal-700 hover:bg-teal-800 text-white shrink-0 flex items-center gap-1.5 text-xs"
              >
                <Send size={13} />
                <span>Send</span>
              </Button>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 text-center">
              SahayakFin Money Coach provides guidance based on verified statement data. We never debit your accounts or share your data.
            </div>
          </div>
        </Card>
      </div>

      {/* 6. Edit Recommendation / Link to Goal Modal */}
      {editingRec && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Customize Limit: {editingRec.categoryLabel}
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust your monthly budget ceiling and link saved surplus to a goal.
                </p>
              </div>
              <button 
                onClick={() => setEditingRec(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Monthly Spending Limit (₹)
                </label>
                <Input
                  type="number"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(Number(e.target.value))}
                  min={0}
                  step={100}
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Current monthly spend: ₹{editingRec.currentMonthlySpend.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Real-time estimated savings preview */}
              <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg text-teal-950 space-y-1">
                <span className="font-semibold block">Expected Monthly Savings:</span>
                <span className="text-base font-bold text-teal-900">
                  ₹{Math.max(0, editingRec.currentMonthlySpend - customLimit).toLocaleString('en-IN')}/month
                </span>
                <span className="text-[11px] text-teal-800 block">
                  ≈ ₹{(Math.max(0, editingRec.currentMonthlySpend - customLimit) * 12).toLocaleString('en-IN')} annual savings
                </span>
              </div>

              {/* Link to Savings Goal */}
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Direct Saved Surplus to Savings Goal (Optional)
                </label>
                {savingsGoals.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No active savings goals found. Create one in 'Savings Goals' to channel saved money automatically.
                  </p>
                ) : (
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
                  >
                    <option value="">Do not link to any specific goal</option>
                    {savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Target: ₹{g.targetAmount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRec(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRecommendationAction(editingRec.id, 'EDIT', customLimit, selectedGoalId)}
                className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
              >
                Save &amp; Activate Limit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
