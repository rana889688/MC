import React, { useState, useEffect } from 'react';
import { Customer, TransactionType } from '../types.ts';
import { 
  X, 
  Check, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Clock, 
  User, 
  Tag
} from 'lucide-react';
import { enToBnDigits } from '../utils/bengali.ts';
import { api } from '../api.ts';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
  initialType?: string;
  initialCustomerId?: string;
}

const COMMON_CATEGORIES = [
  'নগদ বিক্রি',
  'বাকি বিক্রি',
  'বাকি উসুল',
  'মালামাল ক্রয়',
  'দোকান খরচ',
  'দোকান ভাড়া',
  'বিদ্যুৎ বিল',
  'কর্মচারীর বেতন',
  'পরিবহন খরচ',
  'ব্যক্তিগত খরচ',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  initialType = 'due_collected',
  initialCustomerId,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [type, setType] = useState<string>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || '');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(currentTimeStr);
  const [category, setCategory] = useState<string>('নগদ বিক্রি');
  const [description, setDescription] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (initialType) setType(initialType);
    if (initialCustomerId) setCustomerId(initialCustomerId);

    // Auto set appropriate category based on type
    if (initialType === 'due_collected') setCategory('বাকি উসুল');
    else if (initialType === 'due_given') setCategory('বাকি বিক্রি');
    else if (initialType === 'cash_in') setCategory('নগদ বিক্রি');
    else if (initialType === 'cash_out') setCategory('দোকান খরচ');
  }, [initialType, initialCustomerId, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === 'due_collected') setCategory('বাকি উসুল');
    else if (newType === 'due_given') setCategory('বাকি বিক্রি');
    else if (newType === 'cash_in') setCategory('নগদ বিক্রি');
    else if (newType === 'cash_out') setCategory('দোকান খরচ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('সঠিক টাকার পরিমাণ দিন');
      return;
    }

    if ((type === 'due_given' || type === 'due_collected') && !customerId) {
      alert('বাকি বা উসুলের ক্ষেত্রে অবশ্যই কাস্টমার নির্বাচন করতে হবে');
      return;
    }

    try {
      setSaving(true);
      await api.createTransaction({
        type,
        amount: numAmount,
        customerId: customerId || null,
        date,
        time,
        category,
        description,
        receiptNumber,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'লেনদেন সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h3 className="font-bold text-base text-white">নতুন লেনদেন এন্ট্রি</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* 4 Transaction Types Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              লেনদেনের ধরন নির্বাচন করুন <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('due_collected')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  type === 'due_collected'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-bold">টাকা পেলাম</span>
                  <span className="text-[10px] text-stone-500 font-normal">বাকি উসুল</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('due_given')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  type === 'due_given'
                    ? 'bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-500/20 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-bold">বাকি দিলাম</span>
                  <span className="text-[10px] text-stone-500 font-normal">গ্রাহকের কাছে পাবো</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('cash_in')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  type === 'cash_in'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-bold">নগদ বিক্রি</span>
                  <span className="text-[10px] text-stone-500 font-normal">ক্যাশ জমা</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('cash_out')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                  type === 'cash_out'
                    ? 'bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-500/20 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <MinusCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-bold">দোকান খরচ</span>
                  <span className="text-[10px] text-stone-500 font-normal">ক্যাশ খরচ / উত্তোলন</span>
                </div>
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              টাকার পরিমাণ (৳) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-stone-500">৳</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2 text-2xl font-bold text-stone-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600 text-left"
                required
              />
            </div>
          </div>

          {/* Customer Selection (Mandatory for due, optional for direct cash) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
              <span>
                কাস্টমার / পার্টি{' '}
                {(type === 'due_given' || type === 'due_collected') && (
                  <span className="text-rose-500">* (আবশ্যক)</span>
                )}
              </span>
              {selectedCustomer && (
                <span className="text-[11px] text-stone-500 font-normal">
                  বর্তমান বাকি: ৳{enToBnDigits(selectedCustomer.currentBalance.toLocaleString('en-IN'))}
                </span>
              )}
            </label>

            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
              required={type === 'due_given' || type === 'due_collected'}
            >
              <option value="">
                {type === 'due_given' || type === 'due_collected'
                  ? '-- কাস্টমার নির্বাচন করুন --'
                  : '-- সরাসরি ক্যাশ (কাস্টমার ছাড়া) --'}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — বাকি: ৳{c.currentBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">তারিখ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">সময়</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              ক্যাটাগরি
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    category === cat
                      ? 'bg-stone-900 text-white font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ক্যাটাগরি লিখুন..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Description & Receipt Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                পণ্যের বিবরণ / মন্তব্য
              </label>
              <input
                type="text"
                placeholder="যেমন: চাল ও তেল বাকি"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                রসিদ বা ভাউচার নম্বর (ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="যেমন: INV-102"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'হিসাব নিশ্চিত করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
