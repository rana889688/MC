/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BusinessProfile, Customer, DashboardSummary, Transaction } from './types.ts';
import { api } from './api.ts';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { CashBookView } from './components/CashBookView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { EmployeeSalaryView } from './components/EmployeeSalaryView.tsx';
import { BackupManagerView } from './components/BackupManagerView.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { DatabaseLoginModal } from './components/DatabaseLoginModal.tsx';
import { ChangeCredentialsModal } from './components/ChangeCredentialsModal.tsx';
import { ShieldCheck, Lock } from 'lucide-react';

const DEFAULT_PROFILE: BusinessProfile = {
  shopName: 'মডার্ণ কম্পিউটার',
  ownerName: 'মো: মাসুদ রানা',
  phone: '০১৭৪৪-৮৮৯৬৮৮',
  address: 'নবাবগঞ্জ, দিনাজপুর।',
  currencySymbol: '৳',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'customers' | 'cashbook' | 'transactions' | 'employees' | 'backup'
  >('dashboard');

  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<string>('admin');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isChangeCredentialsOpen, setIsChangeCredentialsOpen] = useState<boolean>(false);

  // Selected customer for detailed ledger
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Transaction Modal state
  const [isTxnModalOpen, setIsTxnModalOpen] = useState<boolean>(false);
  const [txnDefaultType, setTxnDefaultType] = useState<string>('due_collected');
  const [txnDefaultCustomerId, setTxnDefaultCustomerId] = useState<string | undefined>(undefined);

  // Receipt Modal state
  const [receiptTxn, setReceiptTxn] = useState<Transaction | null>(null);

  // Load all data
  const loadAppData = useCallback(async () => {
    try {
      setLoading(true);
      const [profData, sumData, custList, txnList] = await Promise.all([
        api.getProfile().catch(() => DEFAULT_PROFILE),
        api.getDashboard().catch(() => null),
        api.getCustomers().catch(() => []),
        api.getTransactions().catch(() => []),
      ]);

      setProfile(profData);
      setSummary(sumData);
      setCustomers(custList);
      setTransactions(txnList);
    } catch (err) {
      console.error('Failed to load TallyKhata data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication on startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsAuthChecking(true);
        // Pre-fetch profile so login screen displays store name and logo
        const prof = await api.getProfile().catch(() => DEFAULT_PROFILE);
        setProfile(prof);

        const token =
          localStorage.getItem('tally_auth_token') ||
          sessionStorage.getItem('tally_auth_token');

        if (token) {
          const authRes = await api.verifyAuth(token);
          if (authRes.authenticated) {
            setIsAuthenticated(true);
            setAdminId(authRes.adminId || 'admin');
            await loadAppData();
            return;
          }
        }
        setIsAuthenticated(false);
      } catch (e) {
        console.warn('Auth check error:', e);
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, [loadAppData]);

  const handleLoginSuccess = (token: string, loggedInAdminId: string) => {
    setIsAuthenticated(true);
    setAdminId(loggedInAdminId);
    loadAppData();
  };

  const handleLogout = () => {
    localStorage.removeItem('tally_auth_token');
    sessionStorage.removeItem('tally_auth_token');
    localStorage.removeItem('tally_admin_id');
    sessionStorage.removeItem('tally_admin_id');
    setIsAuthenticated(false);
  };

  const handleOpenNewTxn = (defaultType?: string, customerId?: string) => {
    setTxnDefaultType(defaultType || 'due_collected');
    setTxnDefaultCustomerId(customerId);
    setIsTxnModalOpen(true);
  };

  const handleQuickBackup = () => {
    window.location.href = '/api/backup/download';
  };

  const handleSelectCustomer = (customerId: string | null) => {
    setSelectedCustomerId(customerId);
    if (customerId) {
      setActiveTab('customers');
    }
  };

  // Initial Auth Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-stone-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-xl">
            <Lock className="w-7 h-7 animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-wide">{profile.shopName || 'ডিজিটাল টালি খাতা'}</h1>
            <p className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ডাটাবেজ নিরাপত্তা ও প্রমাণীকরণ যাচাই হচ্ছে...</span>
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col antialiased">
      {/* Database Login Screen if not authenticated */}
      {!isAuthenticated && (
        <DatabaseLoginModal
          profile={profile}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Navbar with Store Info & Navigation Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onProfileUpdated={(p) => setProfile(p)}
        onOpenNewTxn={handleOpenNewTxn}
        onQuickBackup={handleQuickBackup}
        adminId={adminId}
        onLogout={handleLogout}
        onOpenChangeCredentials={() => setIsChangeCredentialsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            loading={loading}
            onOpenNewTxn={handleOpenNewTxn}
            onSelectCustomer={handleSelectCustomer}
            onNavigateTab={setActiveTab}
            onViewReceipt={(txn) => setReceiptTxn(txn)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            profile={profile}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onOpenNewTxn={handleOpenNewTxn}
            onRefreshCustomers={loadAppData}
            onViewReceipt={(txn) => setReceiptTxn(txn)}
          />
        )}

        {activeTab === 'cashbook' && (
          <CashBookView
            transactions={transactions}
            onOpenNewTxn={(type) => handleOpenNewTxn(type)}
            onViewReceipt={(txn) => setReceiptTxn(txn)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            customers={customers}
            onRefresh={loadAppData}
            onViewReceipt={(txn) => setReceiptTxn(txn)}
            onOpenNewTxn={() => handleOpenNewTxn('cash_in')}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeSalaryView
            profile={profile}
            onRefreshAll={loadAppData}
          />
        )}

        {activeTab === 'backup' && (
          <BackupManagerView
            summary={summary}
            customers={customers}
            transactions={transactions}
            onDataRestored={loadAppData}
            adminId={adminId}
            onOpenChangeCredentials={() => setIsChangeCredentialsOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 py-4 px-4 text-center text-xs text-stone-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-stone-300">
            <span>{profile.shopName}</span> • <span>ডিজিটাল হিসাব খাতা ও ডাটা সংরক্ষণ</span>
          </div>
          <div className="flex items-center gap-3 text-stone-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>আইডি ও পাসওয়ার্ড দ্বারা সুরক্ষিত</span>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              ব্যাকআপ ডাউনলোড করুন
            </button>
          </div>
        </div>
      </footer>

      {/* Transaction Entry Modal */}
      <TransactionModal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        onSuccess={loadAppData}
        customers={customers}
        initialType={txnDefaultType}
        initialCustomerId={txnDefaultCustomerId}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        transaction={receiptTxn}
        profile={profile}
        onClose={() => setReceiptTxn(null)}
      />

      {/* Change Credentials Modal */}
      {isChangeCredentialsOpen && (
        <ChangeCredentialsModal
          currentAdminId={adminId}
          onClose={() => setIsChangeCredentialsOpen(false)}
          onSuccess={(newId) => {
            setAdminId(newId);
            setIsChangeCredentialsOpen(false);
          }}
        />
      )}
    </div>
  );
}
