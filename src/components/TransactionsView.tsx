import React, { useState } from 'react';
import { Customer, Transaction } from '../types.ts';
import { 
  ReceiptText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  FileText, 
  Calendar, 
  ChevronDown,
  Edit2,
  X
} from 'lucide-react';
import { enToBnDigits, formatBengaliDate, getTransactionTypeDetails } from '../utils/bengali.ts';
import { api } from '../api.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface TransactionsViewProps {
  transactions: Transaction[];
  customers: Customer[];
  onRefresh: () => void;
  onViewReceipt: (txn: Transaction) => void;
  onOpenNewTxn: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  customers,
  onRefresh,
  onViewReceipt,
  onOpenNewTxn,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);

  const handleDelete = async () => {
    if (!deletingTxn) return;
    await api.deleteTransaction(deletingTxn.id);
    onRefresh();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn) return;
    try {
      await api.updateTransaction(editingTxn.id, {
        amount: editingTxn.amount,
        description: editingTxn.description,
        category: editingTxn.category,
        date: editingTxn.date,
      });
      setEditingTxn(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'আপডেট করতে ব্যর্থ হয়েছে');
    }
  };

  // Filter transactions
  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCustomer !== 'all' && t.customerId !== filterCustomer) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      const matchCust = t.customerName?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.includes(q);
      if (!matchDesc && !matchCat && !matchCust && !matchPhone) return false;
    }

    return true;
  });

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('এক্সপোর্ট করার মত কোনো লেনদেন নেই');
      return;
    }

    const headers = ['আইডি', 'তারিখ', 'সময়', 'ধরন', 'কাস্টমার', 'বিবরণ', 'ক্যাটাগরি', 'পরিমাণ (৳)'];
    const rows = filtered.map((t) => {
      const typeLabel = getTransactionTypeDetails(t.type).label;
      return [
        t.id,
        t.date,
        t.time,
        `"${typeLabel}"`,
        `"${t.customerName || 'সরাসরি ক্যাশ'}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tallykhata-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-emerald-700" />
              সকল লেনদেনের তালিকা
            </h2>
            <p className="text-xs text-stone-500">বাকি, জমা, উসুল ও খরচের সম্পূর্ণ ইতিহাস</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg border border-stone-300 transition"
              title="এক্সেল বা সিএসভি ফাইল ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>CSV এক্সপোর্ট</span>
            </button>
            <button
              type="button"
              onClick={onOpenNewTxn}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition"
            >
              + নতুন লেনদেন
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="কাস্টমার, বিবরণ বা ক্যাটাগরি..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="all">সব ধরনের লেনদেন</option>
              <option value="cash_in">নগদ জমা / বিক্রি</option>
              <option value="cash_out">নগদ খরচ / উত্তোলন</option>
              <option value="due_given">বাকি দিলাম</option>
              <option value="due_collected">বাকি উসুল / পেলাম</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600"
            >
              <option value="all">সকল কাস্টমার</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filter Button */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 py-1 px-1.5 text-[11px] bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
              title="শুরুর তারিখ"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 py-1 px-1.5 text-[11px] bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
              title="শেষ তারিখ"
            />
          </div>
        </div>

        {/* Status Count */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span>মোট প্রদর্শিত: {enToBnDigits(filtered.length)} টি লেনদেন</span>
          {(filterType !== 'all' || filterCustomer !== 'all' || startDate || endDate || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setFilterCustomer('all');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              className="text-rose-600 hover:underline font-medium"
            >
              ফিল্টার রিসেট করুন
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-stone-400 text-sm">
            কোনো লেনদেন পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">তারিখ ও সময়</th>
                  <th className="py-3 px-4">ধরন</th>
                  <th className="py-3 px-4">কাস্টমার / পার্টি</th>
                  <th className="py-3 px-4">বিবরণ ও ক্যাটাগরি</th>
                  <th className="py-3 px-4 text-right">টাকার পরিমাণ</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((t) => {
                  const meta = getTransactionTypeDetails(t.type);
                  return (
                    <tr key={t.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-700">
                        <span className="font-medium text-stone-900 block">{formatBengaliDate(t.date)}</span>
                        <span className="text-[11px] text-stone-400">{enToBnDigits(t.time)}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-stone-900">
                        {t.customerName ? (
                          <div>
                            <span className="font-semibold block">{t.customerName}</span>
                            {t.customerPhone && (
                              <span className="text-[11px] text-stone-400">{t.customerPhone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">সরাসরি ক্যাশ</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-800">{t.description || '-'}</div>
                        <span className="text-[11px] text-stone-400">{t.category}</span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-sm sm:text-base font-bold text-stone-900">
                          ৳{enToBnDigits(t.amount.toLocaleString('en-IN'))}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(t)}
                            className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded transition"
                            title="রসিদ প্রিন্ট করুন"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTxn(t)}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-stone-100 rounded transition"
                            title="এডিট করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTxn(t)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-bold text-stone-900 text-base">লেনদেন সম্পাদনা</h3>
              <button
                type="button"
                onClick={() => setEditingTxn(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={editingTxn.amount}
                  onChange={(e) => setEditingTxn({ ...editingTxn, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={editingTxn.date}
                  onChange={(e) => setEditingTxn({ ...editingTxn, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">বিবরণ</label>
                <input
                  type="text"
                  value={editingTxn.description || ''}
                  onChange={(e) => setEditingTxn({ ...editingTxn, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">ক্যাটাগরি</label>
                <input
                  type="text"
                  value={editingTxn.category}
                  onChange={(e) => setEditingTxn({ ...editingTxn, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Transaction Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTxn}
        title="লেনদেন মুছে ফেলা"
        itemName={
          deletingTxn
            ? `${getTransactionTypeDetails(deletingTxn.type).label} - ৳${enToBnDigits(
                deletingTxn.amount.toLocaleString('en-IN')
              )} (${deletingTxn.customerName || 'নগদ'})`
            : ''
        }
        message="আপনি কি নিশ্চিত যে এই লেনদেনটি খাতা থেকে সম্পূর্ণ মুছে ফেলতে চান? এতে কাস্টমারের জের ও ক্যাশ ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হয়ে যাবে।"
        confirmLabel="হ্যাঁ, লেনদেনটি মুছুন"
        onConfirm={handleDelete}
        onClose={() => setDeletingTxn(null)}
      />
    </div>
  );
};
