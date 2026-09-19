// Bengali numerals and formatting utilities

export const enToBnDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '০';
  const str = String(num);
  const bnDigits: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
    '.': '.',
    ',': ',',
    '-': '-',
  };
  return str.replace(/[0-9.,-]/g, (w) => bnDigits[w] || w);
};

export const formatCurrencyBn = (amount: number, showSign = false): string => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN');
  const bn = enToBnDigits(formatted);
  if (showSign && isNegative) {
    return `- ৳${bn}`;
  }
  return `৳${bn}`;
};

export const formatBengaliDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর',
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${enToBnDigits(parseInt(day, 10))} ${monthName}, ${enToBnDigits(year)}`;
  } catch {
    return dateStr;
  }
};

export const getTransactionTypeDetails = (type: string) => {
  switch (type) {
    case 'cash_in':
      return {
        label: 'ক্যাশ জমা / বিক্রি',
        shortLabel: 'পেলাম (নগদ)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        badgeColor: 'bg-emerald-600 text-white',
        sign: '+',
        isCredit: true,
      };
    case 'cash_out':
      return {
        label: 'ক্যাশ খরচ / পরিশোধ',
        shortLabel: 'দিলাম (নগদ)',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        badgeColor: 'bg-rose-600 text-white',
        sign: '-',
        isCredit: false,
      };
    case 'due_given':
      return {
        label: 'বাকি দিলাম',
        shortLabel: 'বাকি (দিলাম)',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        badgeColor: 'bg-amber-600 text-white',
        sign: '+',
        isCredit: false,
      };
    case 'due_collected':
      return {
        label: 'বাকি উসুল / পেলাম',
        shortLabel: 'উসুল (পেলাম)',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        badgeColor: 'bg-blue-600 text-white',
        sign: '-',
        isCredit: true,
      };
    default:
      return {
        label: 'লেনদেন',
        shortLabel: 'লেনদেন',
        color: 'text-stone-700 bg-stone-100 border-stone-200',
        badgeColor: 'bg-stone-600 text-white',
        sign: '',
        isCredit: true,
      };
  }
};

export const generateSmsReminder = (customerName: string, amount: number, shopName: string): string => {
  const bnAmount = enToBnDigits(amount.toLocaleString('en-IN'));
  return `সম্মানিত ${customerName}, ${shopName || 'আমাদের দোকানে'} আপনার বর্তমান বাকি হিসাব ৳${bnAmount}। সুবিধাজনক সময়ে বাকি পরিশোধ করার জন্য বিনীত অনুরোধ জানাচ্ছি। ধন্যবাদ।`;
};

export const formatPhoneForWhatsApp = (phone?: string): string => {
  if (!phone) return '';
  // Remove non-numeric characters
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // If starts with 880
  if (digits.startsWith('880')) return digits;
  // If starts with 0
  if (digits.startsWith('0')) return `88${digits}`;
  // If 10 digits starting with 1
  if (digits.length === 10 && digits.startsWith('1')) return `880${digits}`;
  return digits;
};

export const generateReceiptShareText = (
  transaction: {
    id: string;
    receiptNumber?: string;
    type: string;
    amount: number;
    date: string;
    time: string;
    category: string;
    description?: string;
    customerName?: string;
    customerPhone?: string;
  },
  profile: {
    shopName?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
  }
): string => {
  const meta = getTransactionTypeDetails(transaction.type);
  const memoNo = transaction.receiptNumber || transaction.id.slice(-8).toUpperCase();
  const dateStr = `${formatBengaliDate(transaction.date)} (${enToBnDigits(transaction.time)})`;
  const amountStr = `৳ ${enToBnDigits(transaction.amount.toLocaleString('en-IN'))}`;

  const lines = [
    `🧾 *${profile.shopName || 'ডিজিটাল টালি খাতা'}*`,
    profile.ownerName ? `প্রোপাইটার: ${profile.ownerName}` : '',
    profile.phone ? `মোবাইল: ${profile.phone}` : '',
    profile.address ? `ঠিকানা: ${profile.address}` : '',
    `--------------------------------`,
    `📌 *${meta.label} রসিদ / মেমো*`,
    `ভাউচার নং: #${memoNo}`,
    `তারিখ ও সময়: ${dateStr}`,
    `গ্রাহক / পার্টি: ${transaction.customerName || 'নগদ ক্রেতা / কাউন্টার'}`,
    transaction.customerPhone ? `মোবাইল: ${transaction.customerPhone}` : '',
    `খাত / ক্যাটাগরি: ${transaction.category}`,
    transaction.description ? `বিবরণ: ${transaction.description}` : '',
    `--------------------------------`,
    `💰 *মোট পরিমাণ: ${amountStr}*`,
    `--------------------------------`,
    `আমাদের সাথে লেনদেন করার জন্য ধন্যবাদ! 🙏`,
    `_ডিজিটাল টালি খাতা সফটওয়্যারে হিসাব সংরক্ষিত_`,
  ].filter(Boolean);

  return lines.join('\n');
};

export const generateSalaryVoucherShareText = (
  voucher: {
    id: string;
    receiptNumber?: string;
    month: string;
    amount: number;
    date: string;
    time: string;
    paymentMethod?: string;
    bonus?: number;
    deduction?: number;
    note?: string;
    employeeName?: string;
    employeeDesignation?: string;
    employeePhone?: string;
  },
  profile: {
    shopName?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
  }
): string => {
  const memoNo = voucher.receiptNumber || voucher.id.slice(-8).toUpperCase();
  const dateStr = `${formatBengaliDate(voucher.date)} (${enToBnDigits(voucher.time)})`;
  const amountStr = `৳ ${enToBnDigits(voucher.amount.toLocaleString('en-IN'))}`;

  const lines = [
    `🏢 *${profile.shopName || 'মডার্ণ কম্পিউটার'}*`,
    profile.phone ? `মোবাইল: ${profile.phone}` : '',
    profile.address ? `ঠিকানা: ${profile.address}` : '',
    `--------------------------------`,
    `💼 *কর্মচারী বেতন পরিশোধ ভাউচার*`,
    `ভাউচার নং: #${memoNo}`,
    `তারিখ ও সময়: ${dateStr}`,
    `কর্মচারীর নাম: ${voucher.employeeName || 'কর্মচারী'}`,
    voucher.employeeDesignation ? `পদবী: ${voucher.employeeDesignation}` : '',
    voucher.employeePhone ? `মোবাইল: ${voucher.employeePhone}` : '',
    `বেতনের মাস: ${voucher.month}`,
    `পরিশোধ মাধ্যম: ${voucher.paymentMethod === 'cash' ? 'ক্যাশ / নগদ' : voucher.paymentMethod || 'ক্যাশ'}`,
    voucher.bonus ? `বোনাস: +৳ ${enToBnDigits(voucher.bonus.toLocaleString('en-IN'))}` : '',
    voucher.deduction ? `কর্তন: -৳ ${enToBnDigits(voucher.deduction.toLocaleString('en-IN'))}` : '',
    `--------------------------------`,
    `💰 *পরিশোধিত মোট বেতন: ${amountStr}*`,
    `--------------------------------`,
    voucher.note ? `মন্তব্য / নোট: ${voucher.note}` : '',
    `হিসাব সংরক্ষিত ও অনুমোদিত। ধন্যবাদ।`,
  ].filter(Boolean);

  return lines.join('\n');
};
