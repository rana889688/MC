import React, { useState } from 'react';
import { BusinessProfile, Transaction } from '../types.ts';
import { Printer, X, CheckCircle, Copy, Check } from 'lucide-react';
import { 
  enToBnDigits, 
  formatBengaliDate, 
  getTransactionTypeDetails, 
  generateReceiptShareText 
} from '../utils/bengali.ts';
import { printElement } from '../utils/printHelper.ts';

interface ReceiptModalProps {
  transaction: Transaction | null;
  profile: BusinessProfile;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  profile,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!transaction) return null;

  const meta = getTransactionTypeDetails(transaction.type);

  const getShareText = () => {
    return generateReceiptShareText(transaction, profile);
  };

  const handlePrint = () => {
    const title = `${profile.shopName || 'রসিদ'} - মেমো #${transaction.receiptNumber || transaction.id.slice(-8).toUpperCase()}`;
    printElement('printable-receipt', title);
  };

  // Copy Receipt Text to Clipboard
  const handleCopyText = async () => {
    const text = getShareText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setShareFeedback('রসিদের সকল তথ্য ক্লিপবোর্ডে কপি করা হয়েছে!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="bg-stone-900 text-white p-3.5 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> ডিজিটাল মানি রিসিট / মেমো
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
              }`}
              title="রসিদের সকল তথ্য কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" /> প্রিন্ট
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition ml-1"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if Copied */}
        {shareFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2 print:hidden animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-6 text-stone-900 bg-white space-y-4 overflow-y-auto">
          {/* Shop Header */}
          <div className="text-center border-b-2 border-dashed border-stone-300 pb-4">
            {profile.logo && (
              <div className="flex justify-center mb-2">
                <img
                  src={profile.logo}
                  alt={profile.shopName || 'প্রতিষ্ঠানের লোগো'}
                  className="h-11 max-w-[120px] object-contain rounded"
                />
              </div>
            )}
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              {profile.shopName || 'ডিজিটাল টালি খাতা'}
            </h2>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              প্রোপাইটার: {profile.ownerName || 'স্বত্বাধিকারী'}
            </p>
            {profile.address && (
              <p className="text-xs text-stone-500 mt-0.5">{profile.address}</p>
            )}
            {profile.phone && (
              <p className="text-xs text-stone-500 mt-0.5">মোবাইল: {profile.phone}</p>
            )}
            <div className="mt-2 inline-block px-3 py-0.5 bg-stone-100 border border-stone-300 rounded-full text-xs font-bold text-stone-800">
              {meta.label} মেমো
            </div>
          </div>

          {/* Receipt Info Meta */}
          <div className="grid grid-cols-2 text-xs py-1 border-b border-stone-200 gap-y-1">
            <div className="text-stone-500">ভাউচার আইডি:</div>
            <div className="text-right font-mono font-bold text-stone-800">
              {transaction.receiptNumber || transaction.id.slice(-8).toUpperCase()}
            </div>

            <div className="text-stone-500">তারিখ ও সময়:</div>
            <div className="text-right font-medium text-stone-800">
              {formatBengaliDate(transaction.date)} {enToBnDigits(transaction.time)}
            </div>

            <div className="text-stone-500">গ্রাহক / পার্টি:</div>
            <div className="text-right font-bold text-stone-900">
              {transaction.customerName || 'নগদ ক্রেতা / কাউন্টার'}
            </div>

            {transaction.customerPhone && (
              <>
                <div className="text-stone-500">মোবাইল:</div>
                <div className="text-right text-stone-700">{transaction.customerPhone}</div>
              </>
            )}
          </div>

          {/* Description & Category */}
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-500">খাত / ক্যাটাগরি:</span>
              <span className="font-semibold text-stone-800">{transaction.category}</span>
            </div>
            {transaction.description && (
              <div className="flex justify-between">
                <span className="text-stone-500">পণ্যের বিবরণ:</span>
                <span className="font-semibold text-stone-800 text-right">{transaction.description}</span>
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="p-4 bg-stone-100 rounded-xl text-center border border-stone-200">
            <span className="text-xs font-bold text-stone-600 block uppercase">
              লেনদেনের মোট পরিমাণ
            </span>
            <div className="text-3xl font-black text-stone-900 mt-1">
              ৳{enToBnDigits(transaction.amount.toLocaleString('en-IN'))}
            </div>
          </div>

          {/* Footer Signature & Greetings */}
          <div className="pt-6 border-t border-dashed border-stone-300 flex justify-between items-end text-[11px] text-stone-500">
            <div className="text-center">
              <div className="w-24 border-b border-stone-400 mb-1"></div>
              <span>গ্রহীতার স্বাক্ষর</span>
            </div>
            <div className="text-center">
              <div className="w-24 border-b border-stone-400 mb-1"></div>
              <span>কর্তৃপক্ষের স্বাক্ষর</span>
            </div>
          </div>

          <p className="text-[10px] text-stone-400 text-center pt-2 italic">
            আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ! টালি খাতা সফটওয়্যারে হিসাবটি সংরক্ষিত।
          </p>
        </div>

        {/* Modal Bottom Actions (Hidden during print) */}
        <div className="bg-stone-50 p-3.5 border-t border-stone-200 flex items-center justify-between gap-2 print:hidden">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border shadow-xs ${
              copied
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
            <span>{copied ? 'কপি হয়েছে' : 'কপি করুন (Copy)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/70 rounded-xl transition"
            >
              বন্ধ করুন
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট মেমো
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


