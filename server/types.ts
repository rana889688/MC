export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: 'customer' | 'supplier';
  openingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  type: 'cash_in' | 'cash_out' | 'due_given' | 'due_collected';
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  customerId?: string | null;
  category: string;
  description: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface BusinessProfileRecord {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  currencySymbol: string;
  logo?: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  designation: string;
  phone: string;
  monthlySalary: number;
  joinDate: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryPaymentRecord {
  id: string;
  employeeId: string;
  amount: number;
  month: string; // e.g. "সেপ্টেম্বর ২০২৬" বা "2026-09"
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank' | 'other' | 'mobile_banking';
  bonus?: number;
  deduction?: number;
  note?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface AdminAuthRecord {
  adminId: string;
  password: string;
  lastLogin?: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  version: string;
  profile: BusinessProfileRecord;
  auth?: AdminAuthRecord;
  customers: CustomerRecord[];
  transactions: TransactionRecord[];
  employees: EmployeeRecord[];
  salaryPayments: SalaryPaymentRecord[];
  updatedAt: string;
}
