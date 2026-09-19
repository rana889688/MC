import {
  BusinessProfile,
  Customer,
  DashboardSummary,
  Transaction,
  BackupSnapshot,
  DatabaseBackupPayload,
  SupabaseStatus,
  Employee,
  SalaryPayment,
  SalarySummary,
} from './types.ts';

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as Record<string, any>;
    throw new Error(errorData.error || errorData.message || 'নেটওয়ার্ক বা সার্ভারে সমস্যা হয়েছে');
  }
  return (await res.json()) as T;
};

export const api = {
  // Profile
  getProfile: (): Promise<BusinessProfile> =>
    fetch('/api/profile').then((res) => handleResponse<BusinessProfile>(res)),
  updateProfile: (profile: Partial<BusinessProfile>): Promise<BusinessProfile> =>
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).then((res) => handleResponse<BusinessProfile>(res)),

  // Dashboard
  getDashboard: (): Promise<DashboardSummary> =>
    fetch('/api/dashboard').then((res) => handleResponse<DashboardSummary>(res)),

  // Customers
  getCustomers: (): Promise<Customer[]> =>
    fetch('/api/customers').then((res) => handleResponse<Customer[]>(res)),
  getCustomerDetails: (id: string): Promise<{ customer: Customer; transactions: Transaction[] }> =>
    fetch(`/api/customers/${id}`).then((res) =>
      handleResponse<{ customer: Customer; transactions: Transaction[] }>(res)
    ),
  createCustomer: (customer: {
    name: string;
    phone?: string;
    address?: string;
    type?: 'customer' | 'supplier';
    openingBalance?: number;
  }): Promise<Customer> =>
    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    }).then((res) => handleResponse<Customer>(res)),
  updateCustomer: (id: string, updates: Partial<Customer>): Promise<Customer> =>
    fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then((res) => handleResponse<Customer>(res)),
  deleteCustomer: (id: string): Promise<{ success: boolean; message: string }> =>
    fetch(`/api/customers/${id}`, { method: 'DELETE' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),

  // Transactions
  getTransactions: (filters?: {
    customerId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const qs = params.toString();
    return fetch(`/api/transactions${qs ? `?${qs}` : ''}`).then((res) =>
      handleResponse<Transaction[]>(res)
    );
  },
  createTransaction: (txn: {
    type: string;
    amount: number;
    date: string;
    time?: string;
    customerId?: string | null;
    category?: string;
    description?: string;
    receiptNumber?: string;
  }): Promise<Transaction> =>
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    }).then((res) => handleResponse<Transaction>(res)),
  updateTransaction: (id: string, updates: Partial<Transaction>): Promise<Transaction> =>
    fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then((res) => handleResponse<Transaction>(res)),
  deleteTransaction: (id: string): Promise<{ success: boolean; message: string }> =>
    fetch(`/api/transactions/${id}`, { method: 'DELETE' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),

  // Employees
  getEmployees: (): Promise<Employee[]> =>
    fetch('/api/employees').then((res) => handleResponse<Employee[]>(res)),
  getEmployeeDetails: (id: string): Promise<{ employee: Employee; payments: SalaryPayment[] }> =>
    fetch(`/api/employees/${id}`).then((res) =>
      handleResponse<{ employee: Employee; payments: SalaryPayment[] }>(res)
    ),
  createEmployee: (data: {
    name: string;
    designation?: string;
    phone?: string;
    monthlySalary: number;
    joinDate?: string;
    status?: 'active' | 'inactive';
    address?: string;
    notes?: string;
  }): Promise<Employee> =>
    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => handleResponse<Employee>(res)),
  updateEmployee: (id: string, updates: Partial<Employee>): Promise<Employee> =>
    fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then((res) => handleResponse<Employee>(res)),
  deleteEmployee: (id: string): Promise<{ success: boolean; message: string }> =>
    fetch(`/api/employees/${id}`, { method: 'DELETE' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),

  // Salary Payments
  getSalaryPayments: (filters?: {
    employeeId?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<SalaryPayment[]> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const qs = params.toString();
    return fetch(`/api/salary-payments${qs ? `?${qs}` : ''}`).then((res) =>
      handleResponse<SalaryPayment[]>(res)
    );
  },
  createSalaryPayment: (data: {
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
  }): Promise<{ payment: SalaryPayment; employeeName: string }> =>
    fetch('/api/salary-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => handleResponse<{ payment: SalaryPayment; employeeName: string }>(res)),
  deleteSalaryPayment: (id: string): Promise<{ success: boolean; message: string }> =>
    fetch(`/api/salary-payments/${id}`, { method: 'DELETE' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),
  getSalarySummary: (): Promise<SalarySummary> =>
    fetch('/api/salary-summary').then((res) => handleResponse<SalarySummary>(res)),

  // Backup & Recovery
  getSnapshots: (): Promise<BackupSnapshot[]> =>
    fetch('/api/backup/snapshots').then((res) => handleResponse<BackupSnapshot[]>(res)),
  createSnapshot: (note?: string): Promise<{ success: boolean; snapshot: any; message: string }> =>
    fetch('/api/backup/create-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    }).then((res) => handleResponse<{ success: boolean; snapshot: any; message: string }>(res)),
  restoreSnapshot: (filename: string): Promise<{ success: boolean; message: string }> =>
    fetch(`/api/backup/restore-snapshot/${filename}`, { method: 'POST' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),
  restorePayload: (payload: Partial<DatabaseBackupPayload>): Promise<{ success: boolean; message: string }> =>
    fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse<{ success: boolean; message: string }>(res)),
  resetSample: (): Promise<{ success: boolean; message: string }> =>
    fetch('/api/backup/reset-sample', { method: 'POST' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),
  clearAllData: (): Promise<{ success: boolean; message: string }> =>
    fetch('/api/backup/clear-all', { method: 'POST' }).then((res) =>
      handleResponse<{ success: boolean; message: string }>(res)
    ),

  // Supabase Cloud Database
  getSupabaseStatus: (): Promise<SupabaseStatus> =>
    fetch('/api/supabase/status').then((res) => handleResponse<SupabaseStatus>(res)),
  syncSupabase: (): Promise<{ success: boolean; message: string; status: SupabaseStatus }> =>
    fetch('/api/supabase/sync', { method: 'POST' }).then((res) =>
      handleResponse<{ success: boolean; message: string; status: SupabaseStatus }>(res)
    ),

  // Database Authentication & Security
  login: (adminId: string, password: string): Promise<{ success: boolean; token: string; adminId: string; message: string }> =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, password }),
    }).then((res) => handleResponse<{ success: boolean; token: string; adminId: string; message: string }>(res)),

  verifyAuth: (token?: string): Promise<{ authenticated: boolean; adminId?: string; lastLogin?: string }> =>
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ token: token || '' }),
    }).then((res) => handleResponse<{ authenticated: boolean; adminId?: string; lastLogin?: string }>(res)),

  changeCredentials: (data: {
    currentPassword: string;
    newAdminId?: string;
    newPassword: string;
  }): Promise<{ success: boolean; token: string; adminId: string; message: string }> =>
    fetch('/api/auth/change-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) =>
      handleResponse<{ success: boolean; token: string; adminId: string; message: string }>(res)
    ),

  getAuthStatus: (): Promise<{ required: boolean; adminId: string; lastLogin?: string; hasCustomPassword?: boolean }> =>
    fetch('/api/auth/status').then((res) =>
      handleResponse<{ required: boolean; adminId: string; lastLogin?: string; hasCustomPassword?: boolean }>(res)
    ),
};
