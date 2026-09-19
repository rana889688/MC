import React, { useState } from 'react';
import { Customer, Transaction, BusinessProfile } from '../types.ts';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  ArrowDownLeft, 
  ArrowUpRight, 
  MessageSquare, 
  FileText, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  Send, 
  Share2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { enToBnDigits, formatBengaliDate, generateSmsReminder, getTransactionTypeDetails } from '../utils/bengali.ts';
import { api } from '../api.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface CustomersViewProps {
  customers: Customer[];
  profile: BusinessProfile;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  onOpenNewTxn: (defaultType?: string, customerId?: string) => void;
  onRefreshCustomers: () => void;
  onViewReceipt: (txn: Transaction) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  profile,
  selectedCustomerId,
  onSelectCustomer,
  onOpenNewTxn,
  onRefreshCustomers,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'payable' | 'zero'>('all');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<{ customer: Customer; transactions: Transaction[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<{ id: string; name: string } | null>(null);

  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'customer' as 'customer' | 'supplier',
    openingBalance: 0,
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Load customer details when selectedCustomerId changes
  React.useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDetails(selectedCustomerId);
    } else {
      setCustomerDetails(null);
    }
  }, [selectedCustomerId]);

  const loadCustomerDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      const res = await api.getCustomerDetails(id);
      setCustomerDetails(res);
    } catch (e) {
      console.error('Error fetching customer ledger:', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      setSavingCustomer(true);
      const created = await api.createCustomer(newCustomerForm);
      onRefreshCustomers();
      setIsAddingCustomer(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        address: '',
        type: 'customer',
        openingBalance: 0,
      });
      onSelectCustomer(created.id);
    } catch (err: any) {
      alert(err.message || 'কাস্টমার যোগ করতে সমস্যা হয়েছে');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await api.updateCustomer(editingCustomer.id, {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
        type: editingCustomer.type,
      });
      onRefreshCustomers();
      if (selectedCustomerId === editingCustomer.id) {
        loadCustomerDetails(editingCustomer.id);
      }
      setEditingCustomer(null);
    } catch (e: any) {
      alert(e.message || 'আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    await api.deleteCustomer(deletingCustomer.id);
    onRefreshCustomers();
    if (selectedCustomerId === deletingCustomer.id) {
      onSelectCustomer(null);
    }
  };

  // Filter logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'due') return c.currentBalance > 0;
    if (filterType === 'payable') return c.currentBalance < 0;
    if (filterType === 'zero') return c.currentBalance === 0;
    return true;
  });

  const totalReceivableInList = filteredCustomers
    .filter((c) => c.currentBalance > 0)
    .reduce((acc, c) => acc + c.currentBalance, 0);

  const totalPayableInList = filteredCustomers
    .filter((c) => c.currentBalance < 0)
    .reduce((acc, c) => acc + Math.abs(c.currentBalance), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Search Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              কাস্টমার ও সাপ্লায়ার খাতা
            </h2>
            <p className="text-xs text-stone-500">গ্রাহকদের বাকি ও লেনদেনের হিসাব খাতা</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="add-new-customer-btn"
              type="button"
              onClick={() => setIsAddingCustomer(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>নতুন কাস্টমার যোগ</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Pills */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="নাম, মোবাইল নম্বর বা ঠিকানা দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              সকল ({enToBnDigits(customers.length)})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('due')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'due'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              পাবো / বাকি ({enToBnDigits(customers.filter((c) => c.currentBalance > 0).length)})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('payable')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'payable'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              দেবো ({enToBnDigits(customers.filter((c) => c.currentBalance < 0).length)})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('zero')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === 'zero'
                  ? 'bg-stone-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              শূন্য জের
            </button>
          </div>
        </div>

        {/* Quick summary totals */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="text-stone-600">
            ফিল্টার করা কাস্টমার: <span className="font-bold text-stone-900">{enToBnDigits(filteredCustomers.length)} জন</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-rose-700 font-semibold">
              মোট পাবো: ৳{enToBnDigits(totalReceivableInList.toLocaleString('en-IN'))}
            </span>
            {totalPayableInList > 0 && (
              <span className="text-amber-700 font-semibold">
                মোট দেবো: ৳{enToBnDigits(totalPayableInList.toLocaleString('en-IN'))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-stone-200 text-center space-y-3">
            <Users className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-stone-500 text-sm">কোনো কাস্টমার বা হিসাবের রেকর্ড পাওয়া যায়নি।</p>
            <button
              type="button"
              onClick={() => setIsAddingCustomer(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            >
              <UserPlus className="w-4 h-4" /> প্রথম কাস্টমার যোগ করুন
            </button>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const isDue = c.currentBalance > 0;
            const isPayable = c.currentBalance < 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-stone-200/90 shadow-xs hover:border-emerald-500/60 transition p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-base">{c.name}</h3>
                        {c.type === 'supplier' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                            সাপ্লায়ার
                          </span>
                        )}
                      </div>
                      {c.phone && (
                        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" /> {c.phone}
                        </p>
                      )}
                      {c.address && (
                        <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-stone-300" /> {c.address}
                        </p>
                      )}
                    </div>

                    {/* Balance Pill */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold ${
                          isDue
                            ? 'text-rose-700'
                            : isPayable
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        ৳{enToBnDigits(Math.abs(c.currentBalance).toLocaleString('en-IN'))}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold inline-block mt-0.5 ${
                          isDue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isPayable
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isDue ? 'পাবো (বাকি)' : isPayable ? 'দেবো (দেনা)' : 'পরিশোধিত'}
                      </span>
                    </div>
                  </div>

                  {c.lastTransactionDate && (
                    <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> শেষ লেনদেন: {formatBengaliDate(c.lastTransactionDate)}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(c.id)}
                    className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    খাতা / লেজার
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenNewTxn('due_collected', c.id)}
                    className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    title="টাকা পেলাম"
                  >
                    পেলাম
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenNewTxn('due_given', c.id)}
                    className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    title="বাকি দিলাম"
                  >
                    দিলাম
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCustomer({ id: c.id, name: c.name })}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="কাস্টমার মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Full Statement Ledger Modal/Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {detailsLoading || !customerDetails ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-stone-500 mt-2 font-medium">কাস্টমার খাতা লোড হচ্ছে...</p>
              </div>
            ) : (
              <>
                {/* Ledger Header */}
                <div className="bg-stone-900 text-white p-4 sm:p-5 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold">{customerDetails.customer.name}</h3>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(customerDetails.customer)}
                        className="p-1 text-stone-400 hover:text-white"
                        title="তথ্য পরিবর্তন"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mt-1">
                      {customerDetails.customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customerDetails.customer.phone}
                        </span>
                      )}
                      {customerDetails.customer.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {customerDetails.customer.address}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(null)}
                      className="p-1 text-stone-400 hover:text-white mb-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      ৳{enToBnDigits(Math.abs(customerDetails.customer.currentBalance).toLocaleString('en-IN'))}
                    </div>
                    <span className="text-[11px] text-stone-300 font-medium">
                      {customerDetails.customer.currentBalance > 0
                        ? 'মোট বাকি (পাবো)'
                        : customerDetails.customer.currentBalance < 0
                        ? 'মোট দেনা (দেবো)'
                        : 'সম্পূর্ণ পরিশোধিত'}
                    </span>
                  </div>
                </div>

                {/* Ledger Action Toolbar */}
                <div className="bg-stone-100 px-4 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenNewTxn('due_collected', customerDetails.customer.id)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition"
                    >
                      + টাকা পেলাম
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenNewTxn('due_given', customerDetails.customer.id)}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg transition"
                    >
                      - বাকি দিলাম
                    </button>
                  </div>

                  {/* SMS / WhatsApp Reminder */}
                  <div className="flex items-center gap-2">
                    {customerDetails.customer.currentBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const msg = generateSmsReminder(
                            customerDetails.customer.name,
                            customerDetails.customer.currentBalance,
                            profile.shopName
                          );
                          navigator.clipboard.writeText(msg);
                          setCopyFeedback(true);
                          setTimeout(() => setCopyFeedback(false), 2500);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition"
                        title="তাগাদার মেসেজ কপি করুন"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>{copyFeedback ? 'মেসেজ কপি হয়েছে!' : 'তাগাদা SMS কপি'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeletingCustomer({ id: customerDetails.customer.id, name: customerDetails.customer.name })}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="কাস্টমার খাতা মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-y-auto flex-1 p-4">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                    লেনদেনের বিস্তারিত স্টেটমেন্ট ({enToBnDigits(customerDetails.transactions.length)} টি রেকর্ড)
                  </h4>

                  {customerDetails.transactions.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-sm">
                      এই কাস্টমারের সাথে এখনো কোনো লেনদেন হয়নি।
                    </div>
                  ) : (
                    <div className="border border-stone-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-3">তারিখ ও সময়</th>
                            <th className="py-2.5 px-3">বিবরণ / ক্যাটাগরি</th>
                            <th className="py-2.5 px-3 text-right text-rose-700">বাকি দিলাম</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">টাকা পেলাম</th>
                            <th className="py-2.5 px-3 text-center">মেমো</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {customerDetails.transactions.map((t) => {
                            const isGiven = t.type === 'due_given';
                            const isCollected = t.type === 'due_collected';

                            return (
                              <tr key={t.id} className="hover:bg-stone-50 transition">
                                <td className="py-2.5 px-3 whitespace-nowrap text-stone-600">
                                  {formatBengaliDate(t.date)}
                                  <span className="block text-[11px] text-stone-400">
                                    {enToBnDigits(t.time)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-stone-900">{t.description || t.category}</div>
                                  <span className="text-[11px] text-stone-400">{t.category}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                                  {isGiven ? `৳${enToBnDigits(t.amount.toLocaleString('en-IN'))}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                  {isCollected ? `৳${enToBnDigits(t.amount.toLocaleString('en-IN'))}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => onViewReceipt(t)}
                                    className="p-1 text-stone-400 hover:text-emerald-700 rounded"
                                    title="রসিদ প্রিন্ট করুন"
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

                {/* Footer */}
                <div className="bg-stone-50 p-3 border-t border-stone-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    className="px-4 py-1.5 bg-stone-800 text-white text-xs font-semibold rounded-lg hover:bg-stone-700"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                নতুন কাস্টমার বা পাওনাদার যোগ করুন
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  কাস্টমারের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মো: আবুল বাশার"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 01711223344"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ঠিকানা বা পরিচিতি
                </label>
                <input
                  type="text"
                  placeholder="যেমন: বাজার রোড, দোকান সংলগ্ন"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    হিসাবের ধরন
                  </label>
                  <select
                    value={newCustomerForm.type}
                    onChange={(e) =>
                      setNewCustomerForm({
                        ...newCustomerForm,
                        type: e.target.value as 'customer' | 'supplier',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="customer">কাস্টমার (খরিদ্দার)</option>
                    <option value="supplier">সাপ্লায়ার (মহাজন)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    পূর্বের জের / প্রারম্ভিক বাকি (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newCustomerForm.openingBalance || ''}
                    onChange={(e) =>
                      setNewCustomerForm({
                        ...newCustomerForm,
                        openingBalance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition"
                >
                  {savingCustomer ? 'সংরক্ষণ হচ্ছে...' : 'কাস্টমার সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-bold text-stone-900 text-base">কাস্টমার তথ্য সম্পাদনা</h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">নাম</label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
                >
                  আপডেট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Customer Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingCustomer}
        title="কাস্টমার খাতা মুছে ফেলা"
        itemName={deletingCustomer?.name || ''}
        message="আপনি কি নিশ্চিত যে এই কাস্টমারের হিসাব ও খাতা সম্পূর্ণ মুছে ফেলতে চান? মুছে ফেললে তার সাথে সম্পর্কিত সকল লেনদেনের রেকর্ডও মুছে যাবে।"
        confirmLabel="হ্যাঁ, কাস্টমার মুছুন"
        onConfirm={handleConfirmDeleteCustomer}
        onClose={() => setDeletingCustomer(null)}
      />
    </div>
  );
};
