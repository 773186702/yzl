/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Admin from './pages/Admin';
import CreateTask from './pages/CreateTask';
import Tasks from './pages/Tasks';
import Clients from './pages/Clients';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Currencies from './pages/Currencies';
import PaymentMethods from './pages/PaymentMethods';
import Reports from './pages/Reports';
import DebtPayment from './pages/DebtPayment';
import Notifications from './pages/Notifications';
import SystemReset from './pages/SystemReset';
import ChangePassword from './pages/ChangePassword';
import Profile from './pages/Profile';
import MonthlyReconciliation from './pages/MonthlyReconciliation';

/**
 * مكون حماية الملاحة المسارات (Protected Route Component)
 * يضمن وصول المستخدمين المسجلين فقط إلى صفحات النظام الرئيسية
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B192C]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00AEEF] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((user as { is_active?: boolean } | null)?.is_active === false) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">حسابك معطل حالياً. يرجى مراجعة الإدارة.</div>;
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/tasks" element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            } />

            <Route path="/tasks/new" element={
              <ProtectedRoute>
                <CreateTask />
              </ProtectedRoute>
            } />
            
            <Route path="/clients" element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } />
            
            <Route path="/ledger" element={
              <ProtectedRoute>
                <Ledger />
              </ProtectedRoute>
            } />
            
            <Route path="/expenses" element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            <Route path="/currencies" element={
              <ProtectedRoute>
                <Currencies />
              </ProtectedRoute>
            } />

            <Route path="/payment-methods" element={
              <ProtectedRoute>
                <PaymentMethods />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />

            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />

            <Route path="/debt-payment/:clientId" element={
              <ProtectedRoute>
                <DebtPayment />
              </ProtectedRoute>
            } />

            <Route path="/system-reset" element={
              <ProtectedRoute>
                <SystemReset />
              </ProtectedRoute>
            } />

            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/monthly-reconciliation" element={
              <ProtectedRoute>
                <MonthlyReconciliation />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}

