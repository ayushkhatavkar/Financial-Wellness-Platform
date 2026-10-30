import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  LogOut,
  User,
  Hash,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Lock
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
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-fin-success font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-fin-success shrink-0" />
          <span>Consent preference updated and logged to audit trail successfully.</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-fin-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-fin-orange/10 flex items-center justify-center text-fin-orange">
              <User size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-fin-navy text-sm">
                Member Profile Information
              </h3>
              <p className="text-[11px] text-fin-secondary">Verified credentials and primary gig-worker persona</p>
            </div>
          </div>
          <span className="text-[11px] font-mono-num font-semibold text-fin-navy px-2.5 py-1 bg-fin-subtle rounded-md border border-fin-border">
            {currentUser.userCode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <User size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">Full Legal Name</span>
              <span className="font-semibold text-fin-navy text-sm mt-0.5 block">{currentUser.fullName}</span>
            </div>
          </div>

          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <Hash size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">SahayakFin ID</span>
              <span className="font-mono-num font-semibold text-fin-orange text-sm mt-0.5 block">{currentUser.userCode}</span>
            </div>
          </div>

          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <Mail size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">Email Address</span>
              <span className="font-medium text-fin-text mt-0.5 block">{currentUser.email}</span>
            </div>
          </div>

          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <Phone size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">Registered Mobile Number</span>
              <span className="font-medium text-fin-text font-mono-num mt-0.5 block">{currentUser.phone}</span>
            </div>
          </div>

          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <Briefcase size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">Gig Worker Category</span>
              <span className="font-medium text-fin-text mt-0.5 block">{currentUser.workerType.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="p-3.5 bg-fin-subtle/60 rounded-lg border border-fin-border flex items-start gap-3">
            <MapPin size={15} className="text-fin-muted mt-0.5" />
            <div>
              <span className="text-fin-muted block text-[11px]">Operating Hub / City</span>
              <span className="font-medium text-fin-text mt-0.5 block">{currentUser.city}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Explicit Financial Consent */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-fin-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-fin-navy/10 flex items-center justify-center text-fin-navy">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h3 className="font-semibold text-fin-navy text-sm">
                Statement Processing & Consent Ledger
              </h3>
              <p className="text-[11px] text-fin-secondary">Compliant with RBI digital lending guidelines</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            consentGranted 
              ? 'bg-emerald-50 text-fin-success border-emerald-200' 
              : 'bg-rose-50 text-fin-danger border-rose-200'
          }`}>
            {consentGranted ? 'Consent Active' : 'Consent Revoked'}
          </span>
        </div>

        <p className="text-xs text-fin-secondary leading-relaxed">
          SahayakFin inspects uploaded transaction statements solely to categorize platform earnings, calibrate seasonal volatility, and calculate your Financial Trust Score. You have continuous control over your data ledger and may revoke processing authorization at any time.
        </p>

        <div className="p-4 bg-fin-subtle rounded-lg border border-fin-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-semibold text-fin-navy text-xs block">
              Automated Bank Statement Parsing & Cash Flow Analysis
            </span>
            <span className="text-[11px] text-fin-muted block">
              Authorized during account onboarding on <span className="font-mono-num font-medium text-fin-secondary">{currentUser.registrationDate}</span>
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

        <div className="p-3 bg-fin-orange/5 border border-fin-orange/20 rounded-lg flex items-start gap-2.5 text-xs">
          <Lock size={15} className="text-fin-orange shrink-0 mt-0.5" />
          <p className="text-[11px] text-fin-secondary leading-relaxed">
            <strong className="text-fin-navy">Zero third-party monetization guarantee:</strong> Your parsed financial records are encrypted in transit and at rest. They are never sold or syndicated to unsolicited third-party brokers.
          </p>
        </div>
      </Card>

      {/* Data Management & Session Controls */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-fin-navy text-sm pb-2 border-b border-fin-border">
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
            className="flex-1"
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