import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { financialService } from '../services/financialService';
import { Card, Input, Button, PageHeader } from '../components/common';

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
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            SF
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Sign in to SahayakFin
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Access your Financial Trust Score and wellness dashboard
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="ramesh.delivery@demo.sahayakfin.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={15} />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={15} />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
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

          {/* Quick Demo Switcher */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Or 1-Click Demo Showcase:
            </span>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleSelectDemo('USER0001')}
                className="w-full text-left p-2.5 rounded-lg border border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-xs flex items-center justify-between text-slate-900 transition-colors"
              >
                <div>
                  <span className="font-semibold block">Nitin Kulkarni (USER0001)</span>
                  <span className="text-[10px] text-slate-500">2-3 Months History • Score 70</span>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                  Select
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('USER0002')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs flex items-center justify-between text-slate-900 transition-colors"
              >
                <div>
                  <span className="font-semibold block">Priya Sharma (USER0002)</span>
                  <span className="text-[10px] text-slate-500">Insufficient Data (&lt; 2 Months)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Select
                </span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-1">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-teal-800 hover:underline">
              Create one here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
