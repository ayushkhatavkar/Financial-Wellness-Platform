import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { UploadStatementPage } from './pages/UploadStatementPage';
import { TrustScorePage } from './pages/TrustScorePage';
import { FinancialWellnessPage } from './pages/FinancialWellnessPage';
import { LoanOffersPage } from './pages/LoanOffersPage';
import { SavingsGoalsPage } from './pages/SavingsGoalsPage';
import { RepaymentTrackerPage } from './pages/RepaymentTrackerPage';
import { ProfilePrivacyPage } from './pages/ProfilePrivacyPage';
import { DashboardLayout } from './layouts/DashboardLayout';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Dashboard Shell Routes */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/transactions"
          element={
            <DashboardLayout>
              <TransactionsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/upload"
          element={
            <DashboardLayout>
              <UploadStatementPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/trust-score"
          element={
            <DashboardLayout>
              <TrustScorePage />
            </DashboardLayout>
          }
        />
        <Route
          path="/wellness"
          element={
            <DashboardLayout>
              <FinancialWellnessPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/loans"
          element={
            <DashboardLayout>
              <LoanOffersPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/savings"
          element={
            <DashboardLayout>
              <SavingsGoalsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/repayments"
          element={
            <DashboardLayout>
              <RepaymentTrackerPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <DashboardLayout>
              <ProfilePrivacyPage />
            </DashboardLayout>
          }
        />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
