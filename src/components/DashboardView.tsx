import React from 'react';
import { DashboardSummary, Transaction } from '../types.ts';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  Users, 
  FileText, 
  PlusCircle, 
  MinusCircle, 
  Clock, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { enToBnDigits, formatBengaliDate, getTransactionTypeDetails } from '../utils/bengali.ts';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onOpenNewTxn: (type?: string, customerId?: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onNavigateTab: (tab: 'customers' | 'cashbook' | 'transactions' | 'backup') => void;
  onViewReceipt: (txn: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  loading,
  onOpenNewTxn,
  onSelectCustomer,
  onNavigateTab,
  onViewReceipt,
}) => {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-stone-500 font-medium">হিসাব লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const maxBarValue = Math.max(
    ...summary.dailyTrends.map((d) => Math.max(d.cashIn, d.cashOut)),
    1000
  );

  return (
    <div className="space-y-6">
      {/* Top 4 Quick Entry Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          id="quick-action-got-money"
          type="button"
          onClick={() => onOpenNewTxn('due_collected')}
          className="flex items-center gap-3 p-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-sm transition active:scale-[0.98] text-left group"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-600/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs text-emerald-100 font-medium block">গ্রাহকের কাছ থেকে</span>
            <span className="text-base font-bold text-white leading-tight">টাকা পেলাম</span>
          </div>
        </button>

        <button
          id="quick-action-gave-credit"
          type="button"
          onClick={() => onOpenNewTxn('due_given')}
          className="flex items-center gap-3 p-3.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow-sm transition active:scale-[0.98] text-left group"
        >
          <div className="w-11 h-11 rounded-lg bg-rose-600/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MinusCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs text-rose-100 font-medium block">পণ্য বা ধার</span>
            <span className="text-base font-bold text-white leading-tight">বাকি দিলাম</span>
          </div>
        </button>

        <button
          id="quick-action-cash-sale"
          type="button"
          onClick={() => onOpenNewTxn('cash_in')}
          className="flex items-center gap-3 p-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-sm transition active:scale-[0.98] text-left group"
        >
          <div className="w-11 h-11 rounded-lg bg-blue-600/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs text-blue-100 font-medium block">সরাসরি ক্যাশ</span>
            <span className="text-base font-bold text-white leading-tight">নগদ বিক্রি</span>
          </div>
        </button>

        <button
          id="quick-action-expense"
          type="button"
          onClick={() => onOpenNewTxn('cash_out')}
          className="flex items-center gap-3 p-3.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl shadow-sm transition active:scale-[0.98] text-left group"
        >
          <div className="w-11 h-11 rounded-lg bg-stone-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-xs text-stone-300 font-medium block">দোকান বা কেনাকাটা</span>
            <span className="text-base font-bold text-white leading-tight">ক্যাশ খরচ</span>
          </div>
        </button>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Cash in Hand */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">হাতে নগদ (ক্যাশ বাক্স)</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            ৳{enToBnDigits(summary.totalCashInHand.toLocaleString('en-IN'))}
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">মোট ক্যাশ ব্যালেন্স</span>
          </p>
        </div>

        {/* Total Receivable (মোট বাকি পাবো) */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="p-4 bg-white rounded-xl border border-rose-200/80 hover:border-rose-300 shadow-xs flex flex-col justify-between cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">মোট পাবো (বাকি)</span>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-700 tracking-tight">
            ৳{enToBnDigits(summary.totalReceivable.toLocaleString('en-IN'))}
          </div>
          <p className="text-xs text-stone-500 mt-2 flex items-center justify-between">
            <span>{enToBnDigits(summary.totalCustomers)} জন কাস্টমার</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          </p>
        </div>

        {/* Today Cash In */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">আজকের ক্যাশ জমা</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
            ৳{enToBnDigits(summary.todayCashIn.toLocaleString('en-IN'))}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            আজকের নগদ বিক্রি ও উসুল
          </p>
        </div>

        {/* Today Cash Out */}
        <div className="p-4 bg-white rounded-xl border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">আজকের ক্যাশ খরচ</span>
            <span className="p-1.5 bg-stone-100 text-stone-700 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-800 tracking-tight">
            ৳{enToBnDigits(summary.todayCashOut.toLocaleString('en-IN'))}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            নিট ক্যাশ: <span className={summary.todayNetCash >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              ৳{enToBnDigits(summary.todayNetCash.toLocaleString('en-IN'))}
            </span>
          </p>
        </div>
      </div>

      {/* Middle Section: 7-Day Cash Trend Bar & Backup Status Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Bar */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-800">গত ৭ দিনের ক্যাশ জমা ও খরচ</h3>
              <p className="text-xs text-stone-500">দৈনিক আয়ের সাথে ব্যয়ের তুলনামূলক চিত্র</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
                <span className="text-stone-600">জমা</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                <span className="text-stone-600">খরচ</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-6 items-end h-48 border-b border-stone-100 pb-2">
            {summary.dailyTrends.map((d, i) => {
              const inHeight = Math.round((d.cashIn / maxBarValue) * 100);
              const outHeight = Math.round((d.cashOut / maxBarValue) * 100);
              return (
                <div key={i} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    {/* Cash In bar */}
                    <div
                      style={{ height: `${Math.max(inHeight, 4)}%` }}
                      className="w-3.5 sm:w-5 bg-emerald-500 group-hover:bg-emerald-600 rounded-t transition-all relative"
                      title={`জমা: ৳${d.cashIn}`}
                    />
                    {/* Cash Out bar */}
                    <div
                      style={{ height: `${Math.max(outHeight, 4)}%` }}
                      className="w-3.5 sm:w-5 bg-rose-400 group-hover:bg-rose-500 rounded-t transition-all relative"
                      title={`খরচ: ৳${d.cashOut}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-600 mt-2">{d.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database & Backup Security Status Widget */}
        <div className="bg-stone-900 text-stone-100 p-5 rounded-xl border border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                ডাটাবেজ নিরাপদ
              </span>
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">স্বয়ংক্রিয় ব্যাকআপ ব্যবস্থা</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              আপনার সমস্ত কাস্টমার খাতা ও দৈনন্দিন লেনদেন সার্ভারের নিজস্ব ডাটাবেজে স্থায়ীভাবে সংরক্ষিত রয়েছে। যেকোনো সময় ব্যাকআপ ডাউনলোড বা রিস্টোর করতে পারেন।
            </p>

            <div className="mt-4 p-3 bg-stone-800/80 rounded-lg border border-stone-700/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">মোট সংরক্ষিত কাস্টমার:</span>
                <span className="font-semibold text-white">{enToBnDigits(summary.totalCustomers)} জন</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">মোট সংরক্ষিত লেনদেন:</span>
                <span className="font-semibold text-white">{enToBnDigits(summary.totalTransactionsCount)} টি</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 flex gap-2">
            <button
              id="dash-go-to-backup-btn"
              type="button"
              onClick={() => onNavigateTab('backup')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg text-center transition"
            >
              ব্যাকআপ ও রিস্টোর নিয়ন্ত্রণ
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <h3 className="text-base font-bold text-stone-800">সাম্প্রতিক লেনদেন</h3>
          </div>
          <button
            id="dash-view-all-txns-btn"
            type="button"
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            সকল লেনদেন দেখুন <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm">
            এখনো কোনো লেনদেন রেকর্ড করা হয়নি। উপরে "টাকা পেলাম" বা "বাকি দিলাম" চেপে প্রথম হিসাব লিখুন।
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {summary.recentTransactions.map((t) => {
              const meta = getTransactionTypeDetails(t.type);
              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-stone-50 px-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${meta.badgeColor}`}>
                      {meta.sign}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-900 truncate">
                          {t.customerName ? (
                            <button
                              type="button"
                              onClick={() => t.customerId && onSelectCustomer(t.customerId)}
                              className="hover:text-emerald-700 hover:underline cursor-pointer"
                            >
                              {t.customerName}
                            </button>
                          ) : (
                            t.category || 'ক্যাশ হিসাব'
                          )}
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${meta.color}`}>
                          {meta.shortLabel}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {t.description || t.category} • {formatBengaliDate(t.date)} {enToBnDigits(t.time)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2 sm:gap-3">
                    <div className="text-sm sm:text-base font-bold text-stone-900">
                      ৳{enToBnDigits(t.amount.toLocaleString('en-IN'))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(t)}
                      className="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-stone-100 rounded transition"
                      title="রসিদ মেমো দেখুন"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
