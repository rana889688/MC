import React, { useState } from 'react';
import { Transaction } from '../types.ts';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Plus, 
  FileText, 
  Filter, 
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { enToBnDigits, formatBengaliDate, getTransactionTypeDetails } from '../utils/bengali.ts';

interface CashBookViewProps {
  transactions: Transaction[];
  onOpenNewTxn: (type: 'cash_in' | 'cash_out') => void;
  onViewReceipt: (txn: Transaction) => void;
}

export const CashBookView: React.FC<CashBookViewProps> = ({
  transactions,
  onOpenNewTxn,
  onViewReceipt,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'all' | 'in' | 'out'>('all');

  // Filter transactions for cash book (only cash_in, due_collected, cash_out)
  const cashTxns = transactions.filter(
    (t) => t.type === 'cash_in' || t.type === 'due_collected' || t.type === 'cash_out'
  );

  const dayTxns = cashTxns.filter((t) => t.date === selectedDate);

  const dayCashIn = dayTxns
    .filter((t) => t.type === 'cash_in' || t.type === 'due_collected')
    .reduce((sum, t) => sum + t.amount, 0);

  const dayCashOut = dayTxns
    .filter((t) => t.type === 'cash_out')
    .reduce((sum, t) => sum + t.amount, 0);

  const dayNet = dayCashIn - dayCashOut;

  // Cumulative all-time cash in hand
  const allTimeCashIn = cashTxns
    .filter((t) => t.type === 'cash_in' || t.type === 'due_collected')
    .reduce((sum, t) => sum + t.amount, 0);

  const allTimeCashOut = cashTxns
    .filter((t) => t.type === 'cash_out')
    .reduce((sum, t) => sum + t.amount, 0);

  const allTimeBalance = allTimeCashIn - allTimeCashOut;

  const displayTxns = dayTxns.filter((t) => {
    if (viewMode === 'in') return t.type === 'cash_in' || t.type === 'due_collected';
    if (viewMode === 'out') return t.type === 'cash_out';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Date Chooser */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-700" />
            দৈনন্দিন ক্যাশ বই (Cash Register)
          </h2>
          <p className="text-xs text-stone-500">প্রতিদিনের নগদ কেনাবেচা ও খরচের খাতা</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Buttons */}
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              selectedDate === todayStr
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
            }`}
          >
            আজকে
          </button>
          <button
            type="button"
            onClick={() => {
              const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
              setSelectedDate(y);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100 transition"
          >
            গতকাল
          </button>

          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-stone-800 text-xs font-medium focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cash Highlights Cards for the Selected Day */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Day Cash In */}
        <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 block">নগদ জমা (Cash In)</span>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              ৳{enToBnDigits(dayCashIn.toLocaleString('en-IN'))}
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">নগদ বিক্রি ও বাকি উসুল</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenNewTxn('cash_in')}
            className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition shrink-0"
            title="ক্যাশ জমা এন্ট্রি"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Day Cash Out */}
        <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-800 block">নগদ খরচ (Cash Out)</span>
            <div className="text-2xl font-bold text-rose-800 mt-1">
              ৳{enToBnDigits(dayCashOut.toLocaleString('en-IN'))}
            </div>
            <span className="text-[11px] text-rose-700 mt-0.5 block">দোকান খরচ ও মালামাল কেনা</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenNewTxn('cash_out')}
            className="p-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition shrink-0"
            title="ক্যাশ খরচ এন্ট্রি"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Day Net Cash & Cash in Hand */}
        <div className="p-4 bg-stone-900 text-white rounded-xl border border-stone-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-300 font-medium">দিনের নিট ক্যাশ</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${dayNet >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
              {dayNet >= 0 ? '+ জমা বেশি' : '- খরচ বেশি'}
            </span>
          </div>
          <div className="text-2xl font-black text-white my-1">
            ৳{enToBnDigits(dayNet.toLocaleString('en-IN'))}
          </div>
          <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800 flex justify-between">
            <span>সর্বমোট ক্যাশ বাক্সে আছে:</span>
            <span className="font-bold text-emerald-400">৳{enToBnDigits(allTimeBalance.toLocaleString('en-IN'))}</span>
          </div>
        </div>
      </div>

      {/* Daily Transactions Section */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {formatBengaliDate(selectedDate)}-এর ক্যাশ খাতা
            </h3>
            <p className="text-xs text-stone-500">
              মোট {enToBnDigits(dayTxns.length)} টি ক্যাশ এন্ট্রি
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              সব ({enToBnDigits(dayTxns.length)})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('in')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'in'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              শুধুমাত্র জমা ({enToBnDigits(dayTxns.filter((t) => t.type !== 'cash_out').length)})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('out')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'out'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              শুধুমাত্র খরচ ({enToBnDigits(dayTxns.filter((t) => t.type === 'cash_out').length)})
            </button>
          </div>
        </div>

        {displayTxns.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-stone-300" />
            <p>এই তারিখে কোনো ক্যাশ লেনদেন নেই।</p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenNewTxn('cash_in')}
                className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg"
              >
                + ক্যাশ জমা লিখুন
              </button>
              <button
                type="button"
                onClick={() => onOpenNewTxn('cash_out')}
                className="px-3 py-1.5 bg-rose-700 text-white text-xs font-semibold rounded-lg"
              >
                - ক্যাশ খরচ লিখুন
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">সময়</th>
                  <th className="py-2.5 px-3">খাত / বিবরণ</th>
                  <th className="py-2.5 px-3">কাস্টমার / উৎস</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">নগদ জমা (+)</th>
                  <th className="py-2.5 px-3 text-right text-rose-700">নগদ খরচ (-)</th>
                  <th className="py-2.5 px-3 text-center">মেমো</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {displayTxns.map((t) => {
                  const isCashIn = t.type === 'cash_in' || t.type === 'due_collected';
                  return (
                    <tr key={t.id} className="hover:bg-stone-50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 font-medium">
                        {enToBnDigits(t.time)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-900">{t.description || t.category}</div>
                        <span className="text-[11px] text-stone-400">{t.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">
                        {t.customerName || (
                          <span className="text-stone-400 italic">সরাসরি ক্যাশ</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {isCashIn ? `+ ৳${enToBnDigits(t.amount.toLocaleString('en-IN'))}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                        {!isCashIn ? `- ৳${enToBnDigits(t.amount.toLocaleString('en-IN'))}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(t)}
                          className="p-1 text-stone-400 hover:text-emerald-700 rounded transition"
                          title="রসিদ মেমো"
                        >
                          <FileText className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
