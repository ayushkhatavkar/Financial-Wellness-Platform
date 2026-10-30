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
      return <Utensils size={18} className="text-[#D18A22]" />;
    case 'FUEL_TRANSPORT':
      return <Fuel size={18} className="text-[#F28C28]" />;
    case 'UTILITIES':
      return <Smartphone size={18} className="text-[#17243A]" />;
    case 'BUSINESS_EXPENSE':
      return <Wrench size={18} className="text-[#687080]" />;
    case 'HEALTHCARE':
      return <HeartPulse size={18} className="text-[#D94B4B]" />;
    default:
      return <CreditCard size={18} className="text-[#F28C28]" />;
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
        <div className="w-8 h-8 border-3 border-[#F28C28] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#687080] font-medium">Analyzing your verified statements...</p>
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
        title="AI Financial Coach"
        description="Understand your daily spending patterns and discover actionable cash-flow optimizations."
      />

      {/* 2. Top Summary Cards */}
      {analysis && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Money Received */}
            <Card hoverEffect className="p-4 bg-white relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#687080] uppercase tracking-wider">Money Received</span>
                <div className="w-8 h-8 rounded-lg bg-[#EDF8F3] text-[#16865C] flex items-center justify-center">
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#171B26] font-mono-num tracking-tight">
                  ₹{Number(analysis.averageMonthlyIncome).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#687080] mt-1">
                  Monthly average earnings
                </div>
              </div>
            </Card>

            {/* Card 2: Money Spent */}
            <Card hoverEffect className="p-4 bg-white relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#687080] uppercase tracking-wider">Money Spent</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0F2F5] text-[#171B26] flex items-center justify-center">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#171B26] font-mono-num tracking-tight">
                  ₹{Number(analysis.averageMonthlyExpenses).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#687080] mt-1">
                  Monthly living & fuel costs
                </div>
              </div>
            </Card>

            {/* Card 3: Money Left */}
            <Card hoverEffect className="p-4 bg-white relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#687080] uppercase tracking-wider">Money Left</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  analysis.netMonthlySavings >= 0 ? 'bg-[#EDF8F3] text-[#16865C]' : 'bg-[#FEF9EC] text-[#D18A22]'
                }`}>
                  <PiggyBank size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${
                  analysis.netMonthlySavings >= 0 ? 'text-[#16865C]' : 'text-[#D18A22]'
                }`}>
                  ₹{Number(analysis.netMonthlySavings).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-[#687080] mt-1 flex items-center gap-1.5 font-mono-num">
                  <span>{analysis.netMonthlySavings >= 0 ? 'Actual monthly surplus' : 'Monthly deficit'}</span>
                  {analysis.netMonthlySavings >= 0 && (
                    <span className="text-[10px] font-bold text-[#16865C] bg-[#EDF8F3] border border-[#BDE8D3] px-1.5 py-0.2 rounded-full">
                      {analysis.savingsRatePct}%
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Card 4: Potential Extra Savings */}
            <Card hoverEffect className="p-4 bg-white border border-[#EBCB87] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#171B26] uppercase tracking-wider">Potential Savings</span>
                <div className="w-8 h-8 rounded-lg bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#F28C28] font-mono-num tracking-tight">
                  +₹{Number(analysis.potentialTotalMonthlySavings).toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-[#687080] ml-1">/mo</span>
                </div>
                <div className="text-[11px] text-[#687080] mt-1 font-mono-num">
                  ₹{Number(analysis.potentialTotalAnnualSavings).toLocaleString('en-IN')}/year with simple limits
                </div>
              </div>
            </Card>
          </div>

          {/* Unified Reporting Period Banner */}
          <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#687080]">
              <Calendar size={15} className="text-[#9299A5] shrink-0" />
              <span>
                <strong className="font-semibold text-[#171B26]">Reporting Period:</strong>{' '}
                {analysis.reportingPeriodLabel || `Monthly average across ${analysis.monthsAnalyzed} month(s) of verified statements.`}
              </span>
            </div>
            <div>
              {analysis.isSufficient ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16865C] bg-[#EDF8F3] border border-[#BDE8D3] px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 size={13} /> Verified Statement History
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D18A22] bg-[#FEF9EC] border border-[#EBCB87] px-2.5 py-0.5 rounded-full">
                  <AlertCircle size={13} /> Provisional Baseline (&lt; 60 days)
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
            <h2 className="text-base font-bold text-[#171B26]">Where Can I Spend Less?</h2>
            <p className="text-xs text-[#687080]">
              Suggested monthly spending ceilings. Set a limit to protect your hard-earned cash without disrupting delivery work.
            </p>
          </div>
          {dismissedRecs.length > 0 && (
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs text-[#687080] hover:text-[#171B26] font-medium underline cursor-pointer"
            >
              {showDismissed ? 'Hide dismissed' : `View dismissed (${dismissedRecs.length})`}
            </button>
          )}
        </div>

        {actionError && (
          <div className="p-3.5 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] text-xs text-[#D94B4B] flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-[#D94B4B] hover:text-[#B91C1C] cursor-pointer">
              <X size={15} />
            </button>
          </div>
        )}

        {pendingOrAcceptedRecs.length === 0 ? (
          <Card className="p-8 text-center space-y-2 border-dashed bg-white">
            <CheckCircle2 size={32} className="text-[#16865C] mx-auto" />
            <h3 className="text-sm font-bold text-[#171B26]">All spending is currently within healthy limits</h3>
            <p className="text-xs text-[#687080] max-w-md mx-auto">
              Your categorized outflows are well-aligned with your monthly income. Keep up the good work or ask your Money Coach below for further optimizations.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrAcceptedRecs.map((rec) => {
              const isAccepted = rec.status === 'ACCEPTED';
              const progressPct = rec.suggestedMonthlyLimit > 0 
                ? Math.min(100, Math.round((rec.actualCurrentSpend / rec.suggestedMonthlyLimit) * 100))
                : 0;

              return (
                <Card 
                  key={rec.id} 
                  hoverEffect
                  className={`p-5 transition-all relative bg-white ${
                    isAccepted ? 'border-[#F28C28]/40 bg-[#FFF5EB]/30' : 'border-[#E5E7EB]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F2F5] flex items-center justify-center shrink-0">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#171B26]">{rec.categoryLabel}</h3>
                        <div className="text-[11px] text-[#687080] font-mono-num mt-0.5">
                          Actual spend: <strong className="text-[#171B26]">₹{rec.currentMonthlySpend.toLocaleString('en-IN')}/mo</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F28C28] bg-[#FFF5EB] border border-[#F28C28]/30 px-2.5 py-0.5 rounded-full">
                          <Check size={12} /> Active Limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16865C] bg-[#EDF8F3] border border-[#BDE8D3] px-2.5 py-0.5 rounded-full font-mono-num">
                          Save ₹{rec.expectedMonthlySavings.toLocaleString('en-IN')}/mo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 mt-3.5 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB] text-center font-mono-num">
                    <div>
                      <span className="text-[10px] text-[#687080] block font-semibold uppercase">Spent</span>
                      <span className="text-xs font-bold text-[#171B26]">
                        ₹{rec.currentMonthlySpend.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#687080] block font-semibold uppercase">Suggested</span>
                      <span className="text-xs font-bold text-[#F28C28]">
                        ₹{rec.suggestedMonthlyLimit.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#687080] block font-semibold uppercase">Potential Saving</span>
                      <span className="text-xs font-bold text-[#16865C]">
                        ₹{rec.expectedMonthlySavings.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                  </div>

                  {/* Simple Explanation */}
                  <p className="text-xs text-[#687080] mt-3 leading-relaxed">
                    {rec.reason}
                  </p>

                  {/* Active Month-to-Date Tracking Bar (if accepted) */}
                  {isAccepted && (
                    <div className="mt-3.5 pt-3.5 border-t border-[#E5E7EB] space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-mono-num">
                        <span className="text-[#687080]">Current Month Spending:</span>
                        <span className={`font-bold ${rec.isOverBudget ? 'text-[#D94B4B]' : 'text-[#171B26]'}`}>
                          ₹{rec.actualCurrentSpend.toLocaleString('en-IN')} / ₹{rec.suggestedMonthlyLimit.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full ${rec.isOverBudget ? 'bg-[#D94B4B]' : 'bg-[#F28C28]'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#687080]">
                        <span>{rec.isOverBudget ? '⚠️ Exceeding suggested limit' : '✅ Within target limit'}</span>
                        {rec.linkedGoalName && (
                          <span className="text-[#F28C28] font-semibold">
                            Directs to: {rec.linkedGoalName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                    {isAccepted ? (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(rec)}
                          className="text-xs h-7 px-3"
                        >
                          <Edit3 size={12} className="mr-1" /> Edit Limit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecommendationAction(rec.id, 'DISMISS')}
                          className="text-xs h-7 px-2 text-[#9299A5] hover:text-[#D94B4B]"
                        >
                          Remove Limit
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => handleRecommendationAction(rec.id, 'DISMISS')}
                          className="text-[11px] text-[#9299A5] hover:text-[#687080] cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(rec)}
                            className="text-xs h-7 px-2.5"
                          >
                            Customize
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRecommendationAction(rec.id, 'ACCEPT')}
                            className="text-xs h-7 px-3.5 font-mono-num"
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
          <div className="p-4 bg-[#F0F2F5] rounded-lg border border-[#E5E7EB] space-y-2">
            <h4 className="text-xs font-bold text-[#171B26]">Dismissed Limits</h4>
            <div className="space-y-1.5">
              {dismissedRecs.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-2 px-3 bg-white rounded-md border border-[#E5E7EB]">
                  <span className="text-[#171B26] font-medium">{d.categoryLabel} (₹{d.currentMonthlySpend}/mo)</span>
                  <button
                    onClick={() => handleRecommendationAction(d.id, 'ACCEPT')}
                    className="text-[#F28C28] hover:text-[#DD7416] font-semibold text-[11px] cursor-pointer"
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
        <Card className="p-5 bg-white border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#16865C]" />
              <h3 className="text-sm font-bold text-[#171B26]">
                Essential Work Operations &amp; Categories Within Budget
              </h3>
            </div>
            <span className="text-[11px] text-[#687080] font-medium">
              No arbitrary cuts applied
            </span>
          </div>
          <p className="text-xs text-[#687080] leading-relaxed">
            Business servicing, vehicle repairs, and essential buffers power your daily delivery earnings and are intentionally preserved without aggressive spending reductions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {onTrackCategories.map((c) => (
              <div key={c.category} className="p-3 bg-[#F7F8FA] rounded-md border border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-white border border-[#E5E7EB] flex items-center justify-center shrink-0">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#171B26] block leading-tight">{c.categoryLabel}</span>
                    <span className="text-[11px] text-[#687080] font-mono-num">₹{c.currentMonthlySpend.toLocaleString('en-IN')}/mo</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#16865C] bg-[#EDF8F3] border border-[#BDE8D3] px-2 py-0.5 rounded-full">
                  {c.category === 'BUSINESS_EXPENSE' ? 'Work Essential' : 'Within Budget'}
                </span>
              </div>
            ))}
          </div>

          {/* Expandable full category breakdown */}
          <div className="pt-2 text-right">
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#F28C28] hover:text-[#DD7416] cursor-pointer"
            >
              <span>{showAllCategories ? 'Hide details' : `View all category spending details (${analysis?.categoryBreakdown.length || 0})`}</span>
              {showAllCategories ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showAllCategories && analysis && (
            <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-2">
              <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-[#9299A5] px-2">
                <span className="col-span-5">Category</span>
                <span className="col-span-3 text-right">Monthly Spend</span>
                <span className="col-span-2 text-right">% of Expenses</span>
                <span className="col-span-2 text-right">Status</span>
              </div>
              <div className="space-y-1.5">
                {analysis.categoryBreakdown.map((item) => (
                  <div 
                    key={item.category} 
                    className="grid grid-cols-12 items-center text-xs py-2 px-3 bg-[#F7F8FA] rounded-md border border-[#E5E7EB]"
                  >
                    <div className="col-span-5 flex items-center gap-2 font-semibold text-[#171B26]">
                      {getCategoryIcon(item.category)}
                      <span>{item.categoryLabel}</span>
                    </div>
                    <div className="col-span-3 text-right font-bold text-[#171B26] font-mono-num">
                      ₹{item.currentMonthlySpend.toLocaleString('en-IN')}
                    </div>
                    <div className="col-span-2 text-right text-[#687080] font-mono-num">
                      {item.percentageOfExpenses}%
                    </div>
                    <div className="col-span-2 text-right">
                      {item.needsReview ? (
                        <span className="text-[10px] font-semibold text-[#D18A22] bg-[#FEF9EC] border border-[#EBCB87] px-2 py-0.5 rounded-full">
                          Needs review
                        </span>
                      ) : item.isOpportunity ? (
                        <span className="text-[10px] font-semibold text-[#F28C28] bg-[#FFF5EB] border border-[#F28C28]/30 px-2 py-0.5 rounded-full">
                          Opportunity
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#16865C] bg-[#EDF8F3] border border-[#BDE8D3] px-2 py-0.5 rounded-full">
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
      <div className="space-y-3.5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#171B26] flex items-center gap-2">
              <Bot size={20} className="text-[#F28C28]" />
              Ask your Money Coach
            </h2>
            <p className="text-xs text-[#687080]">
              Instant guidance grounded in your verified statement earnings, fuel expenses, and trust score.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E5E7EB] self-start sm:self-auto shadow-xs">
            <span className="text-[11px] text-[#687080] px-2 flex items-center gap-1">
              <Languages size={13} /> Language:
            </span>
            <button
              onClick={() => setSelectedLanguage('en')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedLanguage === 'en' ? 'bg-[#F28C28] text-white shadow-xs font-semibold' : 'text-[#687080] hover:text-[#171B26]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLanguage('hi')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedLanguage === 'hi' ? 'bg-[#F28C28] text-white shadow-xs font-semibold' : 'text-[#687080] hover:text-[#171B26]'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setSelectedLanguage('mr')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                selectedLanguage === 'mr' ? 'bg-[#F28C28] text-white shadow-xs font-semibold' : 'text-[#687080] hover:text-[#171B26]'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* Quick Prompts Chips */}
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              className="text-xs bg-white hover:bg-[#FFF5EB] text-[#171B26] hover:text-[#F28C28] px-3.5 py-1.5 rounded-full border border-[#E5E7EB] hover:border-[#F28C28]/40 transition-colors shadow-xs font-medium cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Feed Card */}
        <Card padding="none" className="border-[#E5E7EB] overflow-hidden flex flex-col h-[440px] bg-white">
          {/* Messages scroll box */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F7F8FA]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/25 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <h4 className="text-base font-bold text-[#171B26]">How can I assist your cash flow today?</h4>
                <p className="text-xs text-[#687080] max-w-sm">
                  Click any quick question above or ask about your fuel spending, how to save for vehicle repairs, or how to boost your financial score.
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
                    <div className="flex items-center gap-1.5 text-[10px] text-[#9299A5] mb-1 px-1">
                      <span className="font-semibold">{isUser ? 'You' : 'SahayakFin Money Coach'}</span>
                      <span>•</span>
                      <span className="font-mono-num">{m.createdAt}</span>
                      {!isUser && m.isAiPowered && (
                        <span className="text-[#F28C28] font-bold bg-[#FFF5EB] px-1.5 py-0.2 rounded border border-[#F28C28]/20">
                          AI
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#17243A] text-white rounded-br-none shadow-sm'
                          : 'bg-white text-[#171B26] border border-[#E5E7EB] rounded-bl-none shadow-xs whitespace-pre-line'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Follow-up suggestion pills */}
                    {!isUser && m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.suggestedFollowups.map((f) => (
                          <button
                            key={f}
                            onClick={() => handleSendMessage(f)}
                            className="text-[11px] bg-white hover:bg-[#FFF5EB] text-[#687080] hover:text-[#F28C28] px-2.5 py-1 rounded-full border border-[#E5E7EB] hover:border-[#F28C28]/40 transition-colors cursor-pointer"
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
          <div className="p-3.5 bg-white border-t border-[#E5E7EB] space-y-2">
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask anything about your money, bills, or savings..."
                disabled={isSending}
                className="flex-1 text-xs sm:text-sm px-4 py-2.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28] focus:bg-white text-[#171B26] placeholder:text-[#9299A5]"
              />
              <Button
                variant="primary"
                onClick={() => handleSendMessage()}
                disabled={!chatInput.trim() || isSending}
                className="h-10 px-5 shrink-0 flex items-center gap-2 text-xs sm:text-sm"
              >
                <Send size={14} />
                <span>Send</span>
              </Button>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-2.5 text-[#9299A5] hover:text-[#D94B4B] rounded-lg transition-colors cursor-pointer"
                  aria-label="Clear chat"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="text-[11px] text-[#9299A5] text-center">
              SahayakFin Money Coach provides guidance based on verified statement data. We never debit your accounts or share your data.
            </div>
          </div>
        </Card>
      </div>

      {/* 6. Edit Recommendation / Link to Goal Modal */}
      {editingRec && (
        <div className="fixed inset-0 z-50 bg-[#171B26]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#171B26]">
                  Customize Limit: {editingRec.categoryLabel}
                </h3>
                <p className="text-xs text-[#687080]">
                  Adjust your monthly budget ceiling and link saved surplus to a goal.
                </p>
              </div>
              <button 
                onClick={() => setEditingRec(null)} 
                className="text-[#9299A5] hover:text-[#171B26] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#171B26] block mb-1">
                  Monthly Spending Limit (₹)
                </label>
                <Input
                  type="number"
                  value={customLimit}
                  onChange={(e) => setCustomLimit(Number(e.target.value))}
                  min={0}
                  step={100}
                />
                <span className="text-[11px] text-[#687080] mt-1 block font-mono-num">
                  Current monthly spend: ₹{editingRec.currentMonthlySpend.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Real-time estimated savings preview */}
              <div className="p-3.5 bg-[#FFF5EB] border border-[#F28C28]/25 rounded-lg text-[#171B26] space-y-1 font-mono-num">
                <span className="font-bold text-xs text-[#F28C28] block uppercase tracking-wider">Expected Monthly Savings:</span>
                <span className="text-lg font-bold text-[#171B26] block">
                  ₹{Math.max(0, editingRec.currentMonthlySpend - customLimit).toLocaleString('en-IN')} / month
                </span>
                <span className="text-[11px] text-[#687080] block">
                  ≈ ₹{(Math.max(0, editingRec.currentMonthlySpend - customLimit) * 12).toLocaleString('en-IN')} annual savings
                </span>
              </div>

              {/* Link to Savings Goal */}
              <div>
                <label className="font-semibold text-[#171B26] block mb-1">
                  Direct Saved Surplus to Savings Goal (Optional)
                </label>
                {savingsGoals.length === 0 ? (
                  <p className="text-[11px] text-[#9299A5] italic">
                    No active savings goals found. Create one in 'Savings Goals' to channel saved money automatically.
                  </p>
                ) : (
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C28]/20 focus:border-[#F28C28] text-[#171B26]"
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

            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRec(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRecommendationAction(editingRec.id, 'EDIT', customLimit, selectedGoalId)}
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
