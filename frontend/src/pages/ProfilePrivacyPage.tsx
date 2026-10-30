import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Trash2, 
  CheckCircle, 
  LogOut
} from 'lucide-react';
import { financialService } from '../services/financialService';
import { Card, PageHeader, Button } from '../components/common';

export const ProfilePrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(financialService.getCurrentUser());
  const [consentGranted, setConsentGranted] = useState(currentUser.hasConsented);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggleConsent = async () => {
    const updatedStatus = !consentGranted;
    try {
      const updated = await financialService.updateConsent(updatedStatus);
      setConsentGranted(updated.hasConsented);
      setCurrentUser(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleSignOut = () => {
    financialService.logout();
    navigate('/login');
  };

  const handleClearSession = () => {
    if (confirm('Clear uploaded sample statements and reset demo cache?')) {
      localStorage.clear();
      alert('Local session cache cleared.');
      navigate('/login');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Account & Data Privacy"
        description="Registered member profile, consent ledger status, and data retention management."
      />

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>Consent preference updated successfully.</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-slate-900 text-sm pb-2 border-b border-slate-100">
          Member Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Full Name</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{currentUser.fullName}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">SahayakFin ID</span>
            <span className="font-mono font-semibold text-teal-800 text-sm mt-0.5 block">{currentUser.userCode}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Email Address</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{currentUser.email}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Phone Number</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{currentUser.phone}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Worker Category</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{currentUser.workerType.replace(/_/g, ' ')}</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[11px]">City</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{currentUser.city}</span>
          </div>
        </div>
      </Card>

      {/* Explicit Financial Consent */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Statement Processing Consent
            </h3>
          </div>
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
            consentGranted 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {consentGranted ? 'Consent Active' : 'Consent Revoked'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          SahayakFin inspects uploaded transaction records solely to categorize cash flow and calculate your Financial Trust Score. You can revoke consent at any time, which halts score updates.
        </p>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="font-medium text-slate-800 text-xs block">
              Automated Statement Parsing & Trust Scoring
            </span>
            <span className="text-[11px] text-slate-500">
              Granted on registration ({currentUser.registrationDate})
            </span>
          </div>
          <Button
            variant={consentGranted ? 'danger' : 'primary'}
            size="sm"
            onClick={handleToggleConsent}
          >
            {consentGranted ? 'Revoke Consent' : 'Grant Consent'}
          </Button>
        </div>
      </Card>

      {/* Data Management & Session Controls */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-slate-900 text-sm pb-2 border-b border-slate-100">
          Session & Data Management
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            icon={<Trash2 size={14} />}
            onClick={handleClearSession}
          >
            Reset Demo & Clear Uploads
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-slate-700"
            icon={<LogOut size={14} />}
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};
