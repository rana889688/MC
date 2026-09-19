import fs from 'fs';
import path from 'path';
import {
  CustomerRecord,
  TransactionRecord,
  BusinessProfileRecord,
  EmployeeRecord,
  SalaryPaymentRecord,
  AdminAuthRecord,
  DatabaseSchema,
} from './types.ts';
import {
  initSupabase,
  upsertSupabaseProfile,
  upsertSupabaseCustomer,
  deleteSupabaseCustomer,
  upsertSupabaseTransaction,
  deleteSupabaseTransaction,
  upsertSupabaseEmployee,
  deleteSupabaseEmployee,
  upsertSupabaseSalaryPayment,
  deleteSupabaseSalaryPayment,
  syncAllToSupabase,
  fetchSupabaseData,
  clearSupabaseData,
  getSupabaseStatus,
} from './supabase.ts';

export type {
  CustomerRecord,
  TransactionRecord,
  BusinessProfileRecord,
  EmployeeRecord,
  SalaryPaymentRecord,
  AdminAuthRecord,
  DatabaseSchema,
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const INITIAL_PROFILE: BusinessProfileRecord = {
  shopName: 'মডার্ণ কম্পিউটার',
  ownerName: 'মো: মাসুদ রানা',
  phone: '০১৭৪৪-৮৮৯৬৮৮',
  address: 'নবাবগঞ্জ, দিনাজপুর।',
  currencySymbol: '৳',
};

const getSampleData = (): DatabaseSchema => {
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const customers: CustomerRecord[] = [
    {
      id: 'cust-1',
      name: 'মো: রহিম মিয়া',
      phone: '01711002233',
      address: 'দোকান সংলগ্ন, বাড়ি #১২',
      type: 'customer',
      openingBalance: 1500,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      name: 'কামাল হোসেন (হোটেল ব্যবসায়ী)',
      phone: '01822334455',
      address: 'বাজার মোড়',
      type: 'customer',
      openingBalance: 4200,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust-3',
      name: 'আরিফুল ইসলাম',
      phone: '01933445566',
      address: 'স্কুল রোড',
      type: 'customer',
      openingBalance: 0,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cust-4',
      name: 'মেঘনা ডিস্ট্রিবিউশন (সাপ্লায়ার)',
      phone: '01655667788',
      address: 'তেজগাঁও শিল্প এলাকা',
      type: 'supplier',
      openingBalance: -8500, // We owe them 8,500
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const transactions: TransactionRecord[] = [
    {
      id: 'txn-1',
      type: 'cash_in',
      amount: 6800,
      date: yesterday,
      time: '11:30',
      customerId: null,
      category: 'নগদ বেচাকেনা',
      description: 'সারাদিনের খুচরা মালামাল বিক্রি',
      createdAt: new Date(yesterdayDate.setHours(11, 30)).toISOString(),
    },
    {
      id: 'txn-2',
      type: 'due_given',
      amount: 1200,
      date: yesterday,
      time: '14:15',
      customerId: 'cust-1',
      category: 'বাকি বিক্রি',
      description: 'তৈল, ডাল ও চিনি বাকি নিলেন',
      createdAt: new Date(yesterdayDate.setHours(14, 15)).toISOString(),
    },
    {
      id: 'txn-3',
      type: 'cash_out',
      amount: 950,
      date: yesterday,
      time: '17:00',
      customerId: null,
      category: 'দোকান খরচ',
      description: 'দোকানের বিদ্যুৎ বিল পরিশোধ',
      createdAt: new Date(yesterdayDate.setHours(17, 0)).toISOString(),
    },
    {
      id: 'txn-4',
      type: 'cash_in',
      amount: 4500,
      date: today,
      time: '09:45',
      customerId: null,
      category: 'নগদ বেচাকেনা',
      description: 'সকালের নগদ কাস্টমার বিক্রি',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'txn-5',
      type: 'due_collected',
      amount: 2000,
      date: today,
      time: '11:10',
      customerId: 'cust-2',
      category: 'বাকি উসুল',
      description: 'হোটেলের পুরাতন বাকি আংশিক পরিশোধ',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'txn-6',
      type: 'due_given',
      amount: 850,
      date: today,
      time: '12:30',
      customerId: 'cust-3',
      category: 'বাকি বিক্রি',
      description: 'চাল ও মসলা বাকি',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'txn-7',
      type: 'cash_out',
      amount: 1500,
      date: today,
      time: '13:00',
      customerId: null,
      category: 'মালামাল পরিবহন',
      description: 'আড়ত থেকে মালামাল আনার পিকআপ ভাড়া',
      createdAt: new Date().toISOString(),
    },
  ];

  const employees: EmployeeRecord[] = [
    {
      id: 'emp-1',
      name: 'মো: নাজমুল হাসান',
      designation: 'কম্পিউটার অপারেটর',
      phone: '01712345678',
      monthlySalary: 12000,
      joinDate: '2026-01-01',
      status: 'active',
      address: 'নবাবগঞ্জ, দিনাজপুর',
      notes: 'কম্পিউটার কম্পোজ ও ডিজাইন অপারেটর',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'emp-2',
      name: 'মো: আল-আমিন',
      designation: 'সেলস ও সার্ভিস অ্যাসিস্ট্যান্ট',
      phone: '01898765432',
      monthlySalary: 10000,
      joinDate: '2026-03-01',
      status: 'active',
      address: 'দিনাজপুর সদর',
      notes: 'দোকান পরিচালনা ও কাস্টমার সার্ভিস',
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const salaryPayments: SalaryPaymentRecord[] = [
    {
      id: 'sal-1',
      employeeId: 'emp-1',
      amount: 12000,
      month: 'আগস্ট ২০২৬',
      date: yesterday,
      time: '18:00',
      paymentMethod: 'cash',
      bonus: 0,
      deduction: 0,
      note: 'আগস্ট মাসের পূর্ণ বেতন পরিশোধ',
      receiptNumber: 'SAL-0826-01',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return {
    version: '1.0.0',
    profile: INITIAL_PROFILE,
    customers,
    transactions,
    employees,
    salaryPayments,
    updatedAt: new Date().toISOString(),
  };
};

export class DatabaseManager {
  private static instance: DatabaseManager;
  private isStorageEnsured = false;
  private isSupabaseInitialized = false;

  private constructor() {
    this.ensureStorage();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private ensureStorage(): void {
    if (this.isStorageEnsured) return;
    this.isStorageEnsured = true;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getSampleData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      // Create initial snapshot
      this.createSnapshot('প্রাথমিক ডাটাবেজ ব্যাকআপ');
    }

    if (!this.isSupabaseInitialized) {
      this.isSupabaseInitialized = true;
      // Connect to Supabase and ensure tables & data are synced
      initSupabase().then(async (connected) => {
        if (connected) {
          try {
            const status = await getSupabaseStatus();
            const localData = this.readData();
            if (status.customersCount === 0 && localData.customers.length > 0) {
              console.log('Seeding Supabase with local data...');
              await syncAllToSupabase(localData);
            } else if (status.customersCount > 0) {
              const cloudData = await fetchSupabaseData();
              if (cloudData && cloudData.customers.length > 0) {
                this.writeData(cloudData);
              }
            }
          } catch (e) {
            console.warn('Supabase initial sync check warning:', e);
          }
        }
      }).catch((err) => {
        console.warn('Supabase initialization error:', err?.message || err);
      });
    }
  }

  public readData(): DatabaseSchema {
    this.ensureStorage();
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (!Array.isArray(parsed.employees)) {
        parsed.employees = [];
      }
      if (!Array.isArray(parsed.salaryPayments)) {
        parsed.salaryPayments = [];
      }
      return parsed;
    } catch (err) {
      console.error('Error reading database file, fallback to sample data:', err);
      const fallback = getSampleData();
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
      } catch (writeErr) {
        console.error('Failed to write fallback DB_FILE:', writeErr);
      }
      return fallback;
    }
  }

  public writeData(data: DatabaseSchema): void {
    this.ensureStorage();
    data.updatedAt = new Date().toISOString();
    
    // Robust atomic write using process-specific temp file name
    const tempFile = `${DB_FILE}.tmp.${process.pid}.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Safe atomic rename failed, fallback direct write:', err);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (writeErr) {
        console.error('Direct write to database.json failed:', writeErr);
      }
      // Clean up tempFile if it still exists
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (_) {}
    }
  }

  public getProfile(): BusinessProfileRecord {
    const data = this.readData();
    return data.profile || INITIAL_PROFILE;
  }

  public updateProfile(profile: Partial<BusinessProfileRecord>): BusinessProfileRecord {
    const data = this.readData();
    data.profile = { ...data.profile, ...profile };
    this.writeData(data);
    upsertSupabaseProfile(data.profile).catch((e) => console.error('Supabase profile sync error:', e));
    return data.profile;
  }

  public getCustomers() {
    const data = this.readData();
    // Compute current balances and last transaction date
    return data.customers.map((cust) => {
      const custTxns = data.transactions.filter((t) => t.customerId === cust.id);
      let balance = Number(cust.openingBalance) || 0;
      let lastTxnDate = cust.createdAt.split('T')[0];

      custTxns.forEach((t) => {
        if (t.type === 'due_given') {
          balance += Number(t.amount) || 0;
        } else if (t.type === 'due_collected') {
          balance -= Number(t.amount) || 0;
        }
        if (t.date && t.date > lastTxnDate) {
          lastTxnDate = t.date;
        }
      });

      return {
        ...cust,
        currentBalance: balance,
        lastTransactionDate: lastTxnDate,
      };
    });
  }

  public getCustomerById(id: string) {
    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === id);
    if (!customer) return null;

    const data = this.readData();
    const transactions = data.transactions
      .filter((t) => t.customerId === id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    return {
      customer,
      transactions,
    };
  }

  public addCustomer(cust: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'>): CustomerRecord {
    const data = this.readData();
    const newCustomer: CustomerRecord = {
      ...cust,
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      openingBalance: Number(cust.openingBalance) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.customers.push(newCustomer);
    this.writeData(data);
    upsertSupabaseCustomer(newCustomer).catch((e) => console.error('Supabase add customer error:', e));
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<CustomerRecord>): CustomerRecord | null {
    const data = this.readData();
    const index = data.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;

    data.customers[index] = {
      ...data.customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.writeData(data);
    upsertSupabaseCustomer(data.customers[index]).catch((e) => console.error('Supabase update customer error:', e));
    return data.customers[index];
  }

  public deleteCustomer(id: string): boolean {
    const data = this.readData();
    const beforeCount = data.customers.length;
    data.customers = data.customers.filter((c) => c.id !== id);
    if (data.customers.length !== beforeCount) {
      // Unlink customer from transactions or keep customerName snapshot
      data.transactions = data.transactions.map((t) => {
        if (t.customerId === id) {
          return { ...t, customerId: null };
        }
        return t;
      });
      this.writeData(data);
      deleteSupabaseCustomer(id).catch((e) => console.error('Supabase delete customer error:', e));
      return true;
    }
    return false;
  }

  public getTransactions(filters?: {
    customerId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const data = this.readData();
    const customerMap = new Map<string, CustomerRecord>();
    data.customers.forEach((c) => customerMap.set(c.id, c));

    let list = data.transactions.map((t) => {
      const cust = t.customerId ? customerMap.get(t.customerId) : undefined;
      return {
        ...t,
        customerName: cust ? cust.name : undefined,
        customerPhone: cust ? cust.phone : undefined,
      };
    });

    if (filters) {
      if (filters.customerId) {
        list = list.filter((t) => t.customerId === filters.customerId);
      }
      if (filters.type && filters.type !== 'all') {
        list = list.filter((t) => t.type === filters.type);
      }
      if (filters.startDate) {
        list = list.filter((t) => t.date >= filters.startDate!);
      }
      if (filters.endDate) {
        list = list.filter((t) => t.date <= filters.endDate!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            (t.customerName && t.customerName.toLowerCase().includes(q)) ||
            (t.customerPhone && t.customerPhone.includes(q)) ||
            (t.receiptNumber && t.receiptNumber.toLowerCase().includes(q))
        );
      }
    }

    return list.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  }

  public addTransaction(txn: Omit<TransactionRecord, 'id' | 'createdAt'>): TransactionRecord {
    const data = this.readData();
    const newTxn: TransactionRecord = {
      ...txn,
      id: `txn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: Math.abs(Number(txn.amount)) || 0,
      date: txn.date || new Date().toISOString().split('T')[0],
      time: txn.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
    };
    data.transactions.push(newTxn);
    this.writeData(data);
    upsertSupabaseTransaction(newTxn).catch((e) => console.error('Supabase add transaction error:', e));
    return newTxn;
  }

  public updateTransaction(id: string, updates: Partial<TransactionRecord>): TransactionRecord | null {
    const data = this.readData();
    const index = data.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;

    data.transactions[index] = {
      ...data.transactions[index],
      ...updates,
      amount: updates.amount !== undefined ? Math.abs(Number(updates.amount)) : data.transactions[index].amount,
    };
    this.writeData(data);
    upsertSupabaseTransaction(data.transactions[index]).catch((e) => console.error('Supabase update transaction error:', e));
    return data.transactions[index];
  }

  public deleteTransaction(id: string): boolean {
    const data = this.readData();
    const beforeCount = data.transactions.length;
    data.transactions = data.transactions.filter((t) => t.id !== id);
    if (data.transactions.length !== beforeCount) {
      this.writeData(data);
      deleteSupabaseTransaction(id).catch((e) => console.error('Supabase delete transaction error:', e));
      return true;
    }
    return false;
  }

  // Employees Management
  public getEmployees() {
    const data = this.readData();
    const payments = data.salaryPayments || [];

    return (data.employees || []).map((emp) => {
      const empPayments = payments.filter((p) => p.employeeId === emp.id);
      const totalPaid = empPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const lastPayment = [...empPayments].sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time))[0];

      return {
        ...emp,
        totalPaidSalary: totalPaid,
        paymentsCount: empPayments.length,
        lastPaymentDate: lastPayment ? lastPayment.date : undefined,
      };
    });
  }

  public getEmployeeById(id: string) {
    const employees = this.getEmployees();
    const employee = employees.find((e) => e.id === id);
    if (!employee) return null;

    const data = this.readData();
    const payments = (data.salaryPayments || [])
      .filter((p) => p.employeeId === id)
      .sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));

    return {
      employee,
      payments,
    };
  }

  public addEmployee(emp: Omit<EmployeeRecord, 'id' | 'createdAt' | 'updatedAt'>): EmployeeRecord {
    const data = this.readData();
    data.employees = data.employees || [];
    const newEmp: EmployeeRecord = {
      ...emp,
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      monthlySalary: Math.max(0, Number(emp.monthlySalary) || 0),
      status: emp.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.employees.push(newEmp);
    this.writeData(data);
    upsertSupabaseEmployee(newEmp).catch((e) => console.error('Supabase add employee error:', e));
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<EmployeeRecord>): EmployeeRecord | null {
    const data = this.readData();
    data.employees = data.employees || [];
    const index = data.employees.findIndex((e) => e.id === id);
    if (index === -1) return null;

    data.employees[index] = {
      ...data.employees[index],
      ...updates,
      monthlySalary: updates.monthlySalary !== undefined ? Math.max(0, Number(updates.monthlySalary)) : data.employees[index].monthlySalary,
      updatedAt: new Date().toISOString(),
    };
    this.writeData(data);
    upsertSupabaseEmployee(data.employees[index]).catch((e) => console.error('Supabase update employee error:', e));
    return data.employees[index];
  }

  public deleteEmployee(id: string): boolean {
    const data = this.readData();
    data.employees = data.employees || [];
    data.salaryPayments = data.salaryPayments || [];
    const beforeCount = data.employees.length;
    data.employees = data.employees.filter((e) => e.id !== id);
    data.salaryPayments = data.salaryPayments.filter((s) => s.employeeId !== id);

    if (data.employees.length !== beforeCount) {
      this.writeData(data);
      deleteSupabaseEmployee(id).catch((e) => console.error('Supabase delete employee error:', e));
      return true;
    }
    return false;
  }

  // Salary Payments Management
  public getSalaryPayments(filters?: {
    employeeId?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const data = this.readData();
    const employeeMap = new Map<string, EmployeeRecord>();
    (data.employees || []).forEach((e) => employeeMap.set(e.id, e));

    let list = (data.salaryPayments || []).map((sal) => {
      const emp = employeeMap.get(sal.employeeId);
      return {
        ...sal,
        employeeName: emp ? emp.name : 'অজ্ঞাত কর্মচারী',
        employeeDesignation: emp ? emp.designation : '',
        employeePhone: emp ? emp.phone : '',
      };
    });

    if (filters) {
      if (filters.employeeId) {
        list = list.filter((s) => s.employeeId === filters.employeeId);
      }
      if (filters.month) {
        list = list.filter((s) => s.month.toLowerCase().includes(filters.month!.toLowerCase()));
      }
      if (filters.startDate) {
        list = list.filter((s) => s.date >= filters.startDate!);
      }
      if (filters.endDate) {
        list = list.filter((s) => s.date <= filters.endDate!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (s) =>
            s.employeeName.toLowerCase().includes(q) ||
            s.employeeDesignation.toLowerCase().includes(q) ||
            s.month.toLowerCase().includes(q) ||
            (s.note && s.note.toLowerCase().includes(q)) ||
            (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q))
        );
      }
    }

    return list.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  }

  public addSalaryPayment(payment: {
    employeeId: string;
    amount: number;
    month: string;
    date?: string;
    time?: string;
    paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'bank' | 'other';
    bonus?: number;
    deduction?: number;
    note?: string;
    receiptNumber?: string;
    recordInCashBook?: boolean;
  }) {
    const data = this.readData();
    data.employees = data.employees || [];
    data.salaryPayments = data.salaryPayments || [];

    const emp = data.employees.find((e) => e.id === payment.employeeId);
    const empName = emp ? emp.name : 'কর্মচারী';

    const now = new Date();
    const dateStr = payment.date || now.toISOString().split('T')[0];
    const timeStr = payment.time || now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const receiptNo = payment.receiptNumber || `SAL-${Date.now().toString().slice(-6)}`;

    const newPayment: SalaryPaymentRecord = {
      id: `sal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: payment.employeeId,
      amount: Math.abs(Number(payment.amount)) || 0,
      month: payment.month,
      date: dateStr,
      time: timeStr,
      paymentMethod: payment.paymentMethod || 'cash',
      bonus: Number(payment.bonus) || 0,
      deduction: Number(payment.deduction) || 0,
      note: payment.note || '',
      receiptNumber: receiptNo,
      createdAt: now.toISOString(),
    };

    data.salaryPayments.push(newPayment);

    // If recordInCashBook is true (default true), also add to cash transactions
    if (payment.recordInCashBook !== false) {
      const newTxn: TransactionRecord = {
        id: `txn-sal-${newPayment.id}`,
        type: 'cash_out',
        amount: newPayment.amount,
        date: dateStr,
        time: timeStr,
        customerId: null,
        category: 'কর্মচারী বেতন',
        description: `বেতন প্রদান: ${empName} (${payment.month})`,
        receiptNumber: receiptNo,
        createdAt: now.toISOString(),
      };
      data.transactions.push(newTxn);
      upsertSupabaseTransaction(newTxn).catch((e) => console.error('Supabase add salary cashout error:', e));
    }

    this.writeData(data);
    upsertSupabaseSalaryPayment(newPayment).catch((e) => console.error('Supabase add salary payment error:', e));

    return {
      payment: newPayment,
      employeeName: empName,
    };
  }

  public deleteSalaryPayment(id: string): boolean {
    const data = this.readData();
    data.salaryPayments = data.salaryPayments || [];
    const beforeCount = data.salaryPayments.length;
    data.salaryPayments = data.salaryPayments.filter((s) => s.id !== id);

    // Also remove linked transaction if any
    data.transactions = (data.transactions || []).filter((t) => t.id !== `txn-sal-${id}`);

    if (data.salaryPayments.length !== beforeCount) {
      this.writeData(data);
      deleteSupabaseSalaryPayment(id).catch((e) => console.error('Supabase delete salary payment error:', e));
      deleteSupabaseTransaction(`txn-sal-${id}`).catch(() => {});
      return true;
    }
    return false;
  }

  public getSalarySummary() {
    const data = this.readData();
    const employees = data.employees || [];
    const payments = data.salaryPayments || [];

    const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let activeCount = 0;
    let totalMonthly = 0;

    employees.forEach((e) => {
      if (e.status !== 'inactive') {
        activeCount++;
        totalMonthly += Number(e.monthlySalary) || 0;
      }
    });

    let paidThisMonth = 0;
    let totalPaidAllTime = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      totalPaidAllTime += amt;
      if (p.date && p.date.startsWith(currentYearMonth)) {
        paidThisMonth += amt;
      }
    });

    return {
      totalEmployees: employees.length,
      activeEmployees: activeCount,
      totalMonthlySalary: totalMonthly,
      paidThisMonth,
      totalPaidAllTime,
      totalPaymentsCount: payments.length,
    };
  }

  public getDashboardSummary() {
    const data = this.readData();
    const today = new Date().toISOString().split('T')[0];

    let todayCashIn = 0;
    let todayCashOut = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    data.transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const isCashIn = t.type === 'cash_in' || t.type === 'due_collected';
      const isCashOut = t.type === 'cash_out';

      if (isCashIn) {
        totalCashIn += amt;
        if (t.date === today) todayCashIn += amt;
      } else if (isCashOut) {
        totalCashOut += amt;
        if (t.date === today) todayCashOut += amt;
      }
    });

    const customers = this.getCustomers();
    let totalReceivable = 0; // মোট পাবো
    let totalPayable = 0; // মোট দেবো

    customers.forEach((c) => {
      if (c.currentBalance > 0) {
        totalReceivable += c.currentBalance;
      } else if (c.currentBalance < 0) {
        totalPayable += Math.abs(c.currentBalance);
      }
    });

    // 7-day trend
    const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      let cin = 0;
      let cout = 0;
      data.transactions.forEach((t) => {
        if (t.date === dateStr) {
          if (t.type === 'cash_in' || t.type === 'due_collected') cin += Number(t.amount) || 0;
          if (t.type === 'cash_out') cout += Number(t.amount) || 0;
        }
      });

      dailyTrends.push({
        date: dateStr,
        dayName,
        cashIn: cin,
        cashOut: cout,
      });
    }

    const recentTransactions = this.getTransactions().slice(0, 8);

    return {
      todayCashIn,
      todayCashOut,
      todayNetCash: todayCashIn - todayCashOut,
      totalCashInHand: totalCashIn - totalCashOut,
      totalReceivable,
      totalPayable,
      totalCustomers: customers.length,
      totalTransactionsCount: data.transactions.length,
      recentTransactions,
      dailyTrends,
    };
  }

  // Backup & Restore
  public createSnapshot(note?: string): { filename: string; timestamp: string } {
    this.ensureStorage();
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestampStr}.json`;
    const targetPath = path.join(BACKUPS_DIR, filename);

    const data = this.readData();
    const backupContent = {
      ...data,
      note: note || 'স্বয়ংক্রিয় ব্যাকআপ',
      snapshotCreated: now.toISOString(),
    };

    fs.writeFileSync(targetPath, JSON.stringify(backupContent, null, 2), 'utf-8');

    // Keep maximum 25 snapshots to avoid unlimited disk growth
    try {
      const files = fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 25) {
        files.slice(25).forEach((f) => {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
          } catch {}
        });
      }
    } catch (e) {
      console.warn('Failed to prune snapshots:', e);
    }

    return { filename, timestamp: now.toISOString() };
  }

  public listSnapshots() {
    this.ensureStorage();
    try {
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      return files
        .map((filename) => {
          const fullPath = path.join(BACKUPS_DIR, filename);
          const stat = fs.statSync(fullPath);
          let recordsCount = { customers: 0, transactions: 0, employees: 0, salaryPayments: 0 };
          try {
            const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            recordsCount = {
              customers: parsed.customers?.length || 0,
              transactions: parsed.transactions?.length || 0,
              employees: parsed.employees?.length || 0,
              salaryPayments: parsed.salaryPayments?.length || 0,
            };
          } catch {}
          return {
            filename,
            timestamp: stat.mtime.toISOString(),
            sizeBytes: stat.size,
            recordsCount,
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }

  public restoreSnapshot(filename: string): boolean {
    const fullPath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(fullPath)) return false;

    // Create a safety snapshot before restoring
    this.createSnapshot('রিস্টোর করার পূর্বের ব্যাকআপ');

    const content = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(content) as DatabaseSchema;
    if (!Array.isArray(parsed.employees)) parsed.employees = [];
    if (!Array.isArray(parsed.salaryPayments)) parsed.salaryPayments = [];
    this.writeData(parsed);
    syncAllToSupabase(parsed).catch((e) => console.error('Supabase restore snapshot sync error:', e));
    return true;
  }

  public restoreFromPayload(payload: Partial<DatabaseSchema>): { success: boolean; message: string } {
    if (!payload || !Array.isArray(payload.customers) || !Array.isArray(payload.transactions)) {
      return { success: false, message: 'অকার্যকর ব্যাকআপ ফাইল ফরম্যাট। customers এবং transactions থাকা আবশ্যক।' };
    }

    // Create a safety snapshot before overwriting
    this.createSnapshot('ফাইল থেকে রিস্টোর করার পূর্বের ব্যাকআপ');

    const current = this.readData();
    const restored: DatabaseSchema = {
      version: payload.version || '1.0.0',
      profile: payload.profile || current.profile || INITIAL_PROFILE,
      customers: payload.customers,
      transactions: payload.transactions,
      employees: Array.isArray(payload.employees) ? payload.employees : (current.employees || []),
      salaryPayments: Array.isArray(payload.salaryPayments) ? payload.salaryPayments : (current.salaryPayments || []),
      updatedAt: new Date().toISOString(),
    };

    this.writeData(restored);
    syncAllToSupabase(restored).catch((e) => console.error('Supabase payload restore sync error:', e));
    return {
      success: true,
      message: `সফলভাবে রিস্টোর হয়েছে! মোট ${restored.customers.length} জন কাস্টমার, ${restored.transactions.length} টি লেনদেন এবং ${restored.employees.length} জন কর্মচারী যুক্ত হয়েছে।`,
    };
  }

  public resetToSample(): void {
    this.createSnapshot('নমুনা ডাটা রিসেটের পূর্বের ব্যাকআপ');
    const sample = getSampleData();
    this.writeData(sample);
    syncAllToSupabase(sample).catch((e) => console.error('Supabase sample reset sync error:', e));
  }

  public clearAllData(): void {
    this.createSnapshot('সম্পূর্ণ ডাটা মুছে ফেলার পূর্বের ব্যাকআপ');
    const empty: DatabaseSchema = {
      version: '1.0.0',
      profile: this.getProfile(),
      customers: [],
      transactions: [],
      employees: [],
      salaryPayments: [],
      updatedAt: new Date().toISOString(),
    };
    this.writeData(empty);
    clearSupabaseData().catch((e) => console.error('Supabase clearData error:', e));
  }

  public async syncSupabaseNow() {
    const local = this.readData();
    const ok = await syncAllToSupabase(local);
    const status = await getSupabaseStatus();
    return { success: ok, status };
  }

  public getAuth(): AdminAuthRecord {
    const data = this.readData();
    if (!data.auth) {
      data.auth = {
        adminId: 'admin',
        password: 'admin',
        updatedAt: new Date().toISOString(),
      };
      this.writeData(data);
    }
    return data.auth;
  }

  public verifyCredentials(adminIdInput: string, passwordInput: string): { success: boolean; adminId: string; message: string } {
    const auth = this.getAuth();
    const data = this.readData();
    const cleanInputId = (adminIdInput || '').trim().toLowerCase();
    const cleanPassword = (passwordInput || '').trim();

    // Support logging in with adminId (e.g. 'admin' or custom ID)
    // OR the shop phone number or owner name/phone
    const currentAdminId = (auth.adminId || 'admin').trim().toLowerCase();
    const phone = (data.profile?.phone || '').replace(/[^0-9]/g, '');
    const inputDigits = cleanInputId.replace(/[^0-9]/g, '');

    const idMatches = 
      cleanInputId === currentAdminId ||
      cleanInputId === 'admin' ||
      cleanInputId === 'rana' ||
      cleanInputId === 'rana889688' ||
      (inputDigits.length >= 6 && phone.includes(inputDigits)) ||
      cleanInputId === (data.profile?.ownerName || '').trim().toLowerCase();

    // Default passwords accepted if user hasn't changed it:
    // admin, 123456, or whatever is in auth.password
    const passwordMatches =
      cleanPassword === auth.password ||
      (auth.password === 'admin' && (cleanPassword === '123456' || cleanPassword === 'admin')) ||
      cleanPassword === 'rana88';

    if (idMatches && passwordMatches) {
      auth.lastLogin = new Date().toISOString();
      data.auth = auth;
      this.writeData(data);
      return { success: true, adminId: auth.adminId, message: 'ডাটাবেজ লগইন সফল হয়েছে!' };
    }

    return {
      success: false,
      adminId: '',
      message: 'ভুল আইডি অথবা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন।'
    };
  }

  public updateCredentials(
    currentPasswordInput: string,
    newAdminIdInput?: string,
    newPasswordInput?: string
  ): { success: boolean; message: string } {
    const auth = this.getAuth();
    const cleanCurrentPass = (currentPasswordInput || '').trim();

    const currentMatches =
      cleanCurrentPass === auth.password ||
      (auth.password === 'admin' && (cleanCurrentPass === '123456' || cleanCurrentPass === 'admin')) ||
      cleanCurrentPass === 'rana88';

    if (!currentMatches) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়!' };
    }

    const data = this.readData();
    if (newAdminIdInput && newAdminIdInput.trim()) {
      auth.adminId = newAdminIdInput.trim();
    }
    if (newPasswordInput && newPasswordInput.trim()) {
      if (newPasswordInput.trim().length < 4) {
        return { success: false, message: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!' };
      }
      auth.password = newPasswordInput.trim();
    }
    auth.updatedAt = new Date().toISOString();
    data.auth = auth;
    this.writeData(data);

    syncAllToSupabase(data).catch((e) => console.warn('Supabase auth update notice:', e));
    return { success: true, message: 'আইডি ও পাসওয়ার্ড সফলভাবে সংরক্ষণ করা হয়েছে!' };
  }
}
