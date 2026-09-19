export type TransactionType = 'cash_in' | 'cash_out' | 'due_given' | 'due_collected';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: 'customer' | 'supplier';
  openingBalance: number; // positive: customer owes us, negative: we owe supplier/customer
  currentBalance: number; // computed balance
  lastTransactionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  category: string; // যেমন: বিক্রি, মালামাল ক্রয়, ভাড়া, বেতন, ব্যক্তিগত, ইত্যাদি
  description: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface BusinessProfile {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  currencySymbol: string;
  logo?: string; // প্রতিষ্ঠন বা দোকানের ছোট লোগো (base64 বা ইমেজ URL)
}

export interface DashboardSummary {
  todayCashIn: number;
  todayCashOut: number;
  todayNetCash: number;
  totalCashInHand: number;
  totalReceivable: number; // মোট পাবো (বাকি)
  totalPayable: number; // মোট দেবো (দেনা)
  totalCustomers: number;
  totalTransactionsCount: number;
  recentTransactions: Transaction[];
  dailyTrends: {
    date: string;
    dayName: string;
    cashIn: number;
    cashOut: number;
  }[];
}

export interface BackupSnapshot {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  recordsCount: {
    customers: number;
    transactions: number;
  };
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  phone: string;
  monthlySalary: number;
  joinDate: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
  totalPaidSalary?: number;
  paymentsCount?: number;
  lastPaymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeDesignation?: string;
  employeePhone?: string;
  amount: number;
  month: string; // e.g. "2026-09" বা "সেপ্টেম্বর ২০২৬"
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank' | 'other';
  bonus?: number;
  deduction?: number;
  note?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface SalarySummary {
  totalEmployees: number;
  activeEmployees: number;
  totalMonthlySalary: number;
  paidThisMonth: number;
  totalPaidAllTime: number;
  totalPaymentsCount: number;
}

export interface DatabaseBackupPayload {
  version: string;
  exportedAt: string;
  businessProfile: BusinessProfile;
  customers: Customer[];
  transactions: Transaction[];
  employees?: Employee[];
  salaryPayments?: SalaryPayment[];
}

export interface SupabaseStatus {
  connected: boolean;
  projectId: string;
  organization: string;
  region: string;
  host: string;
  database?: string;
  customersCount: number;
  transactionsCount: number;
  employeesCount?: number;
  salaryPaymentsCount?: number;
  databaseTime?: string;
  version?: string;
  error?: string | null;
}

export interface AuthStatus {
  required: boolean;
  adminId: string;
  lastLogin?: string;
  hasCustomPassword?: boolean;
}

export interface AdminAuthRecord {
  adminId: string;
  password?: string;
  lastLogin?: string;
  updatedAt: string;
}
