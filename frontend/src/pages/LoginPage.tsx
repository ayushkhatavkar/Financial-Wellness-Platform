import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ChevronRight, UserCheck } from 'lucide-react';
import { financialService } from '../services/financialService';
import { Card, Input, Button } from '../components/common';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      await financialService.login(email.trim(), password);
      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Invalid credentials or connection error.');
    }
  };

  const handleSelectDemo = async (userCode: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await financialService.loginDemoUser(userCode);
      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to authenticate demo user.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#171B26]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#F28C28] text-white flex items-center justify-center font-bold text-xl shadow-[0_2px_8px_0_rgba(242,140,40,0.3)]">
            SF
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171B26]">
          Sign in to SahayakFin
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-[#687080]">
          Access your Financial Trust Score and wellness dashboard
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-[#FDF1F1] border border-[#F9D0D0] flex items-center gap-2.5 text-xs text-[#D94B4B]">
              <AlertCircle size={16} className="text-[#D94B4B] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="e.g. user0001@demo.sahayakfin.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={16} />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={16} />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-[#9299A5] hover:text-[#171B26] transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* 1-Click Demo Sandbox Switcher */}
          <div className="pt-4 border-t border-[#E5E7EB] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#687080] uppercase tracking-wider">
                Or 1-Click Demo Personas:
              </span>
              <span className="text-[10px] text-[#9299A5] font-mono-num">
                No password needed
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelectDemo('USER0001')}
                className="w-full text-left p-3 rounded-lg border border-[#EBCB87] bg-[#FEF9EC]/60 hover:bg-[#FEF9EC] hover:border-[#D18A22] text-xs flex items-center justify-between text-[#171B26] transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#171B26]">Nitin Kulkarni (USER0001)</span>
                    <span className="text-[10px] bg-[#FFF5EB] text-[#F28C28] border border-[#F28C28]/30 px-1.5 py-0.2 rounded font-semibold">
                      Micro-Entrepreneur
                    </span>
                  </div>
                  <span className="text-[11px] text-[#687080] block mt-0.5 font-mono-num">
                    Indore • 2-3 Months History • <strong className="text-[#16865C]">Score: 70/100</strong>
                  </span>
                </div>
                <ChevronRight size={16} className="text-[#F28C28] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('USER0002')}
                className="w-full text-left p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F0F2F5] hover:border-[#D1D5DB] text-xs flex items-center justify-between text-[#171B26] transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#171B26]">Priya Sharma (USER0002)</span>
                    <span className="text-[10px] bg-[#FEF9EC] text-[#D18A22] border border-[#EBCB87] px-1.5 py-0.2 rounded font-semibold">
                      New Account
                    </span>
                  </div>
                  <span className="text-[11px] text-[#687080] block mt-0.5">
                    Patna • Clean Empty State (&lt; 2 Months)
                  </span>
                </div>
                <ChevronRight size={16} className="text-[#9299A5] group-hover:text-[#171B26] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('USER0003')}
                className="w-full text-left p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F0F2F5] hover:border-[#D1D5DB] text-xs flex items-center justify-between text-[#171B26] transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#171B26]">Meena Sharma (USER0003)</span>
                    <span className="text-[10px] bg-[#EDF8F3] text-[#16865C] border border-[#16865C]/30 px-1.5 py-0.2 rounded font-semibold">
                      Delivery Partner
                    </span>
                  </div>
                  <span className="text-[11px] text-[#687080] block mt-0.5 font-mono-num">
                    Nagpur • High Reliability • <strong className="text-[#16865C]">Score: 98/100</strong>
                  </span>
                </div>
                <ChevronRight size={16} className="text-[#9299A5] group-hover:text-[#171B26] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-[#687080] pt-1 border-t border-[#E5E7EB]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#F28C28] hover:text-[#DD7416] hover:underline">
              Create one here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
