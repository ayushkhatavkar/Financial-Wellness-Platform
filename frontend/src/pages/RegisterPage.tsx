import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { financialService } from '../services/financialService';
import { WorkerType } from '../types';
import { Card, Input, Button } from '../components/common';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    workerType: 'DELIVERY_PARTNER' as WorkerType,
    city: 'Bengaluru',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await financialService.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        workerType: formData.workerType,
        city: formData.city.trim(),
        password: formData.password,
      });
      setIsSubmitting(false);
      navigate('/dashboard');
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Registration failed. Please check your inputs.');
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
          Create your account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Start generating an alternative financial trust score
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Full Name"
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              icon={<User size={15} />}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={<Mail size={15} />}
              />
              <Input
                label="Phone (WhatsApp/UPI)"
                type="tel"
                required
                placeholder="+91 98765 00000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                icon={<Phone size={15} />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Primary Gig Work</label>
                <select
                  value={formData.workerType}
                  onChange={(e) => setFormData({ ...formData, workerType: e.target.value as WorkerType })}
                  className="block w-full rounded-lg border border-slate-300/80 bg-white text-xs sm:text-sm py-2 px-3 text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                >
                  <option value="DELIVERY_PARTNER">Delivery Partner</option>
                  <option value="CAB_DRIVER">Cab / Auto Driver</option>
                  <option value="STREET_VENDOR">Street Vendor</option>
                  <option value="FREELANCER">Freelancer</option>
                  <option value="HOME_SERVICES">Home Services</option>
                  <option value="MICRO_RETAILER">Micro Retailer</option>
                </select>
              </div>

              <Input
                label="City"
                type="text"
                required
                placeholder="e.g. Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={<Lock size={15} />}
              />
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                icon={<Lock size={15} />}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-800 hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
