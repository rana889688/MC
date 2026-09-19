import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DatabaseManager } from './server/db.ts';

// Protect process from sudden exit due to transient socket errors
process.on('uncaughtException', (err) => {
  console.warn('[Server uncaughtException]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Server unhandledRejection]:', reason);
});

const app = express();
const PORT = 3000;

// Body parser middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const db = DatabaseManager.getInstance();

// Authentication Helpers
function generateToken(adminId: string): string {
  const payload = `${adminId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  return 'tk_sess_' + Buffer.from(payload).toString('base64');
}

function verifyToken(token: string): boolean {
  if (!token || !token.startsWith('tk_sess_')) return false;
  try {
    const raw = Buffer.from(token.replace('tk_sess_', ''), 'base64').toString('utf-8');
    const [adminId, timeStr] = raw.split(':');
    const time = Number(timeStr);
    if (!adminId || isNaN(time)) return false;
    // 30 days validity
    if (Date.now() - time > 30 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { adminId, password } = req.body;
    if (!adminId || !password) {
      return res.status(400).json({ success: false, error: 'আইডি এবং পাসওয়ার্ড উভয়ই প্রদান করুন' });
    }
    const result = db.verifyCredentials(adminId, password);
    if (!result.success) {
      return res.status(401).json({ success: false, error: result.message });
    }
    const token = generateToken(result.adminId);
    res.json({
      success: true,
      token,
      adminId: result.adminId,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'লগইন প্রক্রিয়ায় সমস্যা হয়েছে' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const token = req.body?.token || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '');
    const isValid = verifyToken(token);
    const auth = db.getAuth();
    res.json({
      authenticated: isValid,
      adminId: auth.adminId || 'admin',
      lastLogin: auth.lastLogin,
    });
  } catch (error) {
    res.status(500).json({ authenticated: false });
  }
});

app.post('/api/auth/change-credentials', (req, res) => {
  try {
    const { currentPassword, newAdminId, newPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'বর্তমান পাসওয়ার্ড প্রদান করুন' });
    }
    const result = db.updateCredentials(currentPassword, newAdminId, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    const auth = db.getAuth();
    const token = generateToken(auth.adminId);
    res.json({
      success: true,
      token,
      adminId: auth.adminId,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' });
  }
});

app.get('/api/auth/status', (req, res) => {
  try {
    const auth = db.getAuth();
    res.json({
      required: true,
      adminId: auth.adminId || 'admin',
      lastLogin: auth.lastLogin,
      hasCustomPassword: auth.password !== 'admin' && auth.password !== '123456',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auth status' });
  }
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Business Profile
app.get('/api/profile', (req, res) => {
  try {
    const profile = db.getProfile();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const updated = db.updateProfile(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Dashboard Summary
app.get('/api/dashboard', (req, res) => {
  try {
    const summary = db.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

// Customers
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.getCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const result = db.getCustomerById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// Alias for customer ledger
app.get('/api/customers/:id/ledger', (req, res) => {
  try {
    const result = db.getCustomerById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer ledger' });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, address, type, openingBalance } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'কাস্টমারের নাম প্রদান করুন' });
    }
    const customer = db.addCustomer({
      name: name.trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      type: type === 'supplier' ? 'supplier' : 'customer',
      openingBalance: Number(openingBalance) || 0,
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const updated = db.updateCustomer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const success = db.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, message: 'কাস্টমার সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Transactions
app.get('/api/transactions', (req, res) => {
  try {
    const { customerId, type, startDate, endDate, search } = req.query as Record<string, string>;
    const txns = db.getTransactions({ customerId, type, startDate, endDate, search });
    res.json(txns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const { type, amount, date, time, customerId, category, description, receiptNumber } = req.body;
    if (!type || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'সঠিক লেনদেনের ধরন ও টাকার পরিমাণ দিন' });
    }

    const newTxn = db.addTransaction({
      type,
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      customerId: customerId || null,
      category: category || (type === 'due_given' ? 'বাকি' : type === 'due_collected' ? 'উসুল' : 'সাধারণ'),
      description: description || '',
      receiptNumber: receiptNumber || '',
    });

    res.status(201).json(newTxn);
  } catch (error) {
    console.error('Failed to add transaction:', error);
    res.status(500).json({ error: 'লেনদেন সংরক্ষণ করতে ব্যর্থ হয়েছে' });
  }
});

app.put('/api/transactions/:id', (req, res) => {
  try {
    const updated = db.updateTransaction(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const success = db.deleteTransaction(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, message: 'লেনদেন মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Employee Management Routes
app.get('/api/employees', (req, res) => {
  try {
    const employees = db.getEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.get('/api/employees/:id', (req, res) => {
  try {
    const result = db.getEmployeeById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee details' });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const { name, designation, phone, monthlySalary, joinDate, status, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'কর্মচারীর নাম প্রদান করুন' });
    }
    const employee = db.addEmployee({
      name: name.trim(),
      designation: (designation || 'কর্মচারী').trim(),
      phone: (phone || '').trim(),
      monthlySalary: Number(monthlySalary) || 0,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      status: status === 'inactive' ? 'inactive' : 'active',
      address: (address || '').trim(),
      notes: (notes || '').trim(),
    });
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const updated = db.updateEmployee(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  try {
    const success = db.deleteEmployee(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ success: true, message: 'কর্মচারী ও বেতন রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Salary Payments Routes
app.get('/api/salary-payments', (req, res) => {
  try {
    const { employeeId, month, startDate, endDate, search } = req.query as Record<string, string>;
    const payments = db.getSalaryPayments({ employeeId, month, startDate, endDate, search });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch salary payments' });
  }
});

app.post('/api/salary-payments', (req, res) => {
  try {
    const { employeeId, amount, month, date, time, paymentMethod, bonus, deduction, note, receiptNumber, recordInCashBook } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'কর্মচারী নির্বাচন করুন' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'সঠিক বেতনের পরিমাণ দিন' });
    }
    if (!month || !month.trim()) {
      return res.status(400).json({ error: 'বেতনের মাস উল্লেখ করুন' });
    }

    const result = db.addSalaryPayment({
      employeeId,
      amount: Number(amount),
      month: month.trim(),
      date,
      time,
      paymentMethod,
      bonus: Number(bonus) || 0,
      deduction: Number(deduction) || 0,
      note,
      receiptNumber,
      recordInCashBook: recordInCashBook !== false,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record salary payment' });
  }
});

app.delete('/api/salary-payments/:id', (req, res) => {
  try {
    const success = db.deleteSalaryPayment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Salary payment not found' });
    }
    res.json({ success: true, message: 'বেতন রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete salary payment' });
  }
});

app.get('/api/salary-summary', (req, res) => {
  try {
    const summary = db.getSalarySummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch salary summary' });
  }
});

// Backup & Recovery System
app.get('/api/backup/download', (req, res) => {
  try {
    const fullData = db.readData();
    const today = new Date().toISOString().split('T')[0];
    const filename = `tallykhata-backup-${today}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(fullData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'ব্যাকআপ ডাউনলোড ব্যর্থ হয়েছে' });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const payload = req.body;
    const result = db.restoreFromPayload(payload);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, message: 'রিস্টোর করতে সমস্যা হয়েছে' });
  }
});

app.get('/api/backup/snapshots', (req, res) => {
  try {
    const list = db.listSnapshots();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

app.post('/api/backup/create-snapshot', (req, res) => {
  try {
    const note = req.body?.note || 'ম্যানুয়াল ব্যাকআপ পয়েন্ট';
    const snapshot = db.createSnapshot(note);
    res.json({ success: true, snapshot, message: 'ডাটাবেজ ব্যাকআপ সফলভাবে তৈরি হয়েছে!' });
  } catch (error) {
    res.status(500).json({ error: 'ব্যাকআপ তৈরিতে সমস্যা হয়েছে' });
  }
});

app.post('/api/backup/restore-snapshot/:filename', (req, res) => {
  try {
    const success = db.restoreSnapshot(req.params.filename);
    if (!success) {
      return res.status(404).json({ error: 'ব্যাকআপ ফাইলটি পাওয়া যায়নি' });
    }
    res.json({ success: true, message: 'নির্বাচিত ব্যাকআপ থেকে ডাটাবেজ সফলভাবে রিস্টোর হয়েছে!' });
  } catch (error) {
    res.status(500).json({ error: 'রিস্টোর করতে সমস্যা হয়েছে' });
  }
});

app.post('/api/backup/reset-sample', (req, res) => {
  try {
    db.resetToSample();
    res.json({ success: true, message: 'নমুনা ডাটাবেজ সফলভাবে লোড হয়েছে!' });
  } catch (error) {
    res.status(500).json({ error: 'রিসেট করতে ব্যর্থ হয়েছে' });
  }
});

app.post('/api/backup/clear-all', (req, res) => {
  try {
    db.clearAllData();
    res.json({ success: true, message: 'সব হিসাব মুছে সম্পূর্ণ নতুন খাতা প্রস্তুত করা হয়েছে!' });
  } catch (error) {
    res.status(500).json({ error: 'ডাটা মুছতে ব্যর্থ হয়েছে' });
  }
});

// Supabase Cloud Database Status & Sync Routes
app.get('/api/supabase/status', async (req, res) => {
  try {
    const { getSupabaseStatus } = await import('./server/supabase.ts');
    const status = await getSupabaseStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.post('/api/supabase/sync', async (req, res) => {
  try {
    const result = await db.syncSupabaseNow();
    res.json({
      success: result.success,
      message: result.success
        ? 'Supabase ক্লাউড ডাটাবেজে সফলভাবে ডাটা সিঙ্ক সম্পন্ন হয়েছে!'
        : 'Supabase সিঙ্কে সমস্যা হয়েছে',
      status: result.status,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TallyKhata Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
