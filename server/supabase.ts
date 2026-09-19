import pg from 'pg';
import { CustomerRecord, TransactionRecord, BusinessProfileRecord, EmployeeRecord, SalaryPaymentRecord, DatabaseSchema } from './types.ts';

const { Pool } = pg;

export interface SupabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  projectId: string;
  organization: string;
  region: string;
}

// Extract and sanitize configuration
const rawProjectId = (process.env.SUPABASE_PROJECT_ID || 'psvozwvgacovrwyogavg').trim();
const rawPassword = (process.env.SUPABASE_DB_PASSWORD || 'M@5udr@n@88').trim();
const rawRegion = (process.env.SUPABASE_REGION || 'ap-northeast-1').trim();

// Database name in Supabase is always 'postgres'
let rawDbName = (process.env.SUPABASE_DB_NAME || 'postgres').trim();
if (!rawDbName || rawDbName === 'MC Accounts' || rawDbName.toLowerCase().includes('account') || rawDbName !== 'postgres') {
  rawDbName = 'postgres';
}

// Database user in Supabase is always 'postgres' (not account email prefix like 'rana889688')
let rawDbUser = (process.env.SUPABASE_DB_USER || 'postgres').trim();
if (!rawDbUser || rawDbUser.includes('@') || rawDbUser === 'rana889688' || (!rawDbUser.startsWith('postgres') && !rawDbUser.startsWith('postgres.'))) {
  rawDbUser = 'postgres';
}

let rawHost = (process.env.SUPABASE_DB_HOST || '').trim();
if (rawHost.startsWith('http://') || rawHost.startsWith('https://')) {
  try {
    rawHost = new URL(rawHost).hostname;
  } catch (_) {}
}

export const SUPABASE_CONFIG: SupabaseConfig = {
  host: rawHost && !rawHost.includes('pooler') ? rawHost : `db.${rawProjectId}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT) || 5432,
  user: rawDbUser,
  password: rawPassword,
  database: rawDbName,
  projectId: rawProjectId,
  organization: 'MC Accounts',
  region: rawRegion,
};

let activePool: pg.Pool | null = null;
let activePoolType = 'none';
let isConnected = false;
let lastError: string | null = null;

interface PoolCandidate {
  name: string;
  host: string;
  port: number;
  user: string;
}

function getPoolCandidates(): PoolCandidate[] {
  const directHost = rawHost && !rawHost.includes('pooler') ? rawHost : `db.${rawProjectId}.supabase.co`;
  const poolerHost = `aws-0-${rawRegion}.pooler.supabase.com`;

  return [
    {
      name: 'Supabase Transaction Pooler (port 6543)',
      host: poolerHost,
      port: 6543,
      user: `postgres.${rawProjectId}`,
    },
    {
      name: 'Supabase Session Pooler (port 5432)',
      host: poolerHost,
      port: 5432,
      user: `postgres.${rawProjectId}`,
    },
    {
      name: 'Direct Supabase Host (port 5432)',
      host: directHost,
      port: 5432,
      user: 'postgres',
    },
  ];
}

async function getWorkingPool(): Promise<pg.Pool> {
  if (activePool) {
    return activePool;
  }

  const candidates = getPoolCandidates();
  let firstErr: any = null;

  for (const c of candidates) {
    const candidatePool = new Pool({
      host: c.host,
      port: c.port,
      user: c.user,
      password: SUPABASE_CONFIG.password,
      database: SUPABASE_CONFIG.database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 2,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
    });

    // CRITICAL: Attach error listener immediately so unexpected client terminations (e.g. idle socket drop) don't emit unhandled 'error' events that crash node
    candidatePool.on('error', (err: any) => {
      console.warn(`[Supabase Pool Warning - ${c.name}]:`, err?.message || err);
      if (activePool === candidatePool) {
        activePool = null;
        isConnected = false;
      }
    });

    let client: pg.PoolClient | null = null;
    let hasErr = false;
    try {
      client = await candidatePool.connect();
      client.on('error', (err: any) => {
        console.warn(`[Supabase Client Init Warning - ${c.name}]:`, err?.message || err);
        hasErr = true;
      });
      await client.query('SELECT 1');
      client.release(hasErr);
      client = null;

      activePool = candidatePool;
      activePoolType = c.name;
      isConnected = true;
      lastError = null;

      console.log(`✅ Supabase pool connected via ${c.name}`);
      return activePool;
    } catch (err: any) {
      if (client) {
        try {
          client.release(true);
        } catch (_) {}
      }
      if (!firstErr) firstErr = err;
      try {
        await candidatePool.end();
      } catch (_) {}
    }
  }

  isConnected = false;
  lastError = firstErr ? firstErr.message : 'All Supabase connection attempts timed out';
  throw new Error(lastError || 'Supabase connection failed');
}

export async function withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  let pool: pg.Pool;
  try {
    pool = await getWorkingPool();
  } catch (err: any) {
    activePool = null;
    throw err;
  }

  let client: pg.PoolClient | null = null;
  let hasError = false;

  const clientErrorHandler = (err: any) => {
    console.warn('[Supabase Client Error]:', err?.message || err);
    hasError = true;
  };

  try {
    client = await pool.connect();
    // Catch socket drops while client is checked out so Node doesn't throw unhandled error
    client.on('error', clientErrorHandler);
    const result = await fn(client);
    return result;
  } catch (err: any) {
    hasError = true;
    // If connection timed out or auth error, clear pool so next request tries candidates fresh
    if (err.message.includes('timeout') || err.message.includes('closed') || err.message.includes('password') || err.message.includes('terminated')) {
      activePool = null;
      isConnected = false;
    }
    throw err;
  } finally {
    if (client) {
      try {
        client.removeListener('error', clientErrorHandler);
      } catch (_) {}
      try {
        // If an error occurred on this client socket, discard it so the pool doesn't reuse a broken connection
        client.release(hasError);
      } catch (_) {}
    }
  }
}

export async function initSupabase(): Promise<boolean> {
  try {
    await withClient(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS tally_profile (
          id TEXT PRIMARY KEY DEFAULT 'default',
          shop_name TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          currency_symbol TEXT DEFAULT '৳',
          logo TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE tally_profile ADD COLUMN IF NOT EXISTS logo TEXT;

        CREATE TABLE IF NOT EXISTS tally_customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          type TEXT DEFAULT 'customer',
          opening_balance NUMERIC DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tally_transactions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          customer_id TEXT,
          category TEXT,
          description TEXT,
          receipt_number TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tally_employees (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          designation TEXT,
          phone TEXT,
          monthly_salary NUMERIC DEFAULT 0,
          join_date TEXT,
          status TEXT DEFAULT 'active',
          address TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tally_salary_payments (
          id TEXT PRIMARY KEY,
          employee_id TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          month TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          payment_method TEXT DEFAULT 'cash',
          bonus NUMERIC DEFAULT 0,
          deduction NUMERIC DEFAULT 0,
          note TEXT,
          receipt_number TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tally_snapshots (
          id TEXT PRIMARY KEY,
          filename TEXT,
          date TIMESTAMPTZ DEFAULT NOW(),
          note TEXT,
          customers_count INT DEFAULT 0,
          transactions_count INT DEFAULT 0,
          total_due NUMERIC DEFAULT 0,
          data JSONB
        );

        CREATE TABLE IF NOT EXISTS tally_auth (
          id TEXT PRIMARY KEY DEFAULT 'default',
          admin_id TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          last_login TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    });
    isConnected = true;
    lastError = null;
    return true;
  } catch (err: any) {
    console.warn('⚠️ Supabase initialization notice:', err.message);
    isConnected = false;
    lastError = err.message;
    return false;
  }
}

export async function getSupabaseStatus() {
  try {
    const status = await withClient(async (client) => {
      const custRes = await client.query('SELECT count(*) FROM tally_customers');
      const txnRes = await client.query('SELECT count(*) FROM tally_transactions');
      let empCount = 0;
      let salCount = 0;
      try {
        const empRes = await client.query('SELECT count(*) FROM tally_employees');
        empCount = parseInt(empRes.rows[0].count, 10);
        const salRes = await client.query('SELECT count(*) FROM tally_salary_payments');
        salCount = parseInt(salRes.rows[0].count, 10);
      } catch {
        // Table might be initializing
      }
      const timeRes = await client.query('SELECT NOW() as db_time, version()');

      return {
        connected: true,
        projectId: SUPABASE_CONFIG.projectId,
        organization: SUPABASE_CONFIG.organization,
        region: SUPABASE_CONFIG.region,
        host: SUPABASE_CONFIG.host,
        database: SUPABASE_CONFIG.database,
        poolType: activePoolType,
        customersCount: parseInt(custRes.rows[0].count, 10),
        transactionsCount: parseInt(txnRes.rows[0].count, 10),
        employeesCount: empCount,
        salaryPaymentsCount: salCount,
        databaseTime: timeRes.rows[0].db_time,
        version: timeRes.rows[0].version,
        error: null,
      };
    });

    isConnected = true;
    lastError = null;
    return status;
  } catch (err: any) {
    isConnected = false;
    lastError = err.message;
    return {
      connected: false,
      projectId: SUPABASE_CONFIG.projectId,
      organization: SUPABASE_CONFIG.organization,
      region: SUPABASE_CONFIG.region,
      host: SUPABASE_CONFIG.host,
      database: SUPABASE_CONFIG.database,
      poolType: activePoolType,
      customersCount: 0,
      transactionsCount: 0,
      employeesCount: 0,
      salaryPaymentsCount: 0,
      error: err.message,
    };
  }
}

export async function fetchSupabaseData(): Promise<DatabaseSchema | null> {
  try {
    return await withClient(async (client) => {
      // 1. Profile
      const profRes = await client.query('SELECT * FROM tally_profile WHERE id = $1', ['default']);
      let profile: BusinessProfileRecord = {
        shopName: 'মডার্ন কম্পিউটার',
        ownerName: 'মো: মাসুদ রানা',
        phone: '০১৭৪৪-৮৮৯৬৮৮',
        address: 'নবাবগঞ্জ, দিনাজপুর।',
        currencySymbol: '৳',
      };
      if (profRes.rows.length > 0) {
        const p = profRes.rows[0];
        profile = {
          shopName: p.shop_name,
          ownerName: p.owner_name,
          phone: p.phone || '',
          address: p.address || '',
          currencySymbol: p.currency_symbol || '৳',
          logo: p.logo || undefined,
        };
      }

      // 2. Customers
      const custRes = await client.query('SELECT * FROM tally_customers ORDER BY created_at ASC');
      const customers: CustomerRecord[] = custRes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        address: row.address || '',
        type: row.type || 'customer',
        openingBalance: parseFloat(row.opening_balance) || 0,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      // 3. Transactions
      const txnRes = await client.query('SELECT * FROM tally_transactions ORDER BY date DESC, time DESC');
      const transactions: TransactionRecord[] = txnRes.rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: parseFloat(row.amount) || 0,
        date: row.date,
        time: row.time,
        customerId: row.customer_id || null,
        category: row.category,
        description: row.description || '',
        receiptNumber: row.receipt_number || '',
        createdAt: new Date(row.created_at).toISOString(),
      }));

      // 4. Employees
      let employees: EmployeeRecord[] = [];
      try {
        const empRes = await client.query('SELECT * FROM tally_employees ORDER BY created_at ASC');
        employees = empRes.rows.map((row) => ({
          id: row.id,
          name: row.name,
          designation: row.designation || 'কর্মচারী',
          phone: row.phone || '',
          monthlySalary: parseFloat(row.monthly_salary) || 0,
          joinDate: row.join_date || '',
          status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
          address: row.address || '',
          notes: row.notes || '',
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        }));
      } catch (e) {
        console.warn('tally_employees fetch fallback:', e);
      }

      // 5. Salary Payments
      let salaryPayments: SalaryPaymentRecord[] = [];
      try {
        const salRes = await client.query('SELECT * FROM tally_salary_payments ORDER BY date DESC, time DESC');
        salaryPayments = salRes.rows.map((row) => ({
          id: row.id,
          employeeId: row.employee_id,
          amount: parseFloat(row.amount) || 0,
          month: row.month,
          date: row.date,
          time: row.time,
          paymentMethod: row.payment_method || 'cash',
          bonus: parseFloat(row.bonus) || 0,
          deduction: parseFloat(row.deduction) || 0,
          note: row.note || '',
          receiptNumber: row.receipt_number || '',
          createdAt: new Date(row.created_at).toISOString(),
        }));
      } catch (e) {
        console.warn('tally_salary_payments fetch fallback:', e);
      }

      let authRecord = undefined;
      try {
        const authRes = await client.query('SELECT * FROM tally_auth WHERE id = $1 LIMIT 1', ['default']);
        if (authRes.rows.length > 0) {
          const a = authRes.rows[0];
          authRecord = {
            adminId: a.admin_id || 'admin',
            password: a.password_hash || '123456',
            lastLogin: a.last_login ? new Date(a.last_login).toISOString() : undefined,
            updatedAt: a.updated_at ? new Date(a.updated_at).toISOString() : new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn('tally_auth fetch fallback:', e);
      }

      return {
        version: '1.0.0',
        profile,
        auth: authRecord,
        customers,
        transactions,
        employees,
        salaryPayments,
        updatedAt: new Date().toISOString(),
      };
    });
  } catch (err: any) {
    console.warn('Supabase fetch notice (fallback to local cache):', err.message);
    return null;
  }
}

export async function syncAllToSupabase(data: DatabaseSchema): Promise<boolean> {
  try {
    return await withClient(async (client) => {
      await client.query('BEGIN');

      // Profile
      await client.query(
        `INSERT INTO tally_profile (id, shop_name, owner_name, phone, address, currency_symbol, logo, updated_at)
         VALUES ('default', $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE
         SET shop_name = EXCLUDED.shop_name,
             owner_name = EXCLUDED.owner_name,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address,
             currency_symbol = EXCLUDED.currency_symbol,
             logo = EXCLUDED.logo,
             updated_at = NOW()`,
        [
          data.profile.shopName,
          data.profile.ownerName,
          data.profile.phone,
          data.profile.address,
          data.profile.currencySymbol || '৳',
          data.profile.logo || null,
        ]
      );

      // Customers
      for (const c of data.customers || []) {
        await client.query(
          `INSERT INTO tally_customers (id, name, phone, address, type, opening_balance, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               address = EXCLUDED.address,
               type = EXCLUDED.type,
               opening_balance = EXCLUDED.opening_balance,
               updated_at = EXCLUDED.updated_at`,
          [c.id, c.name, c.phone || '', c.address || '', c.type, c.openingBalance, c.createdAt, c.updatedAt]
        );
      }

      // Transactions
      for (const t of data.transactions || []) {
        await client.query(
          `INSERT INTO tally_transactions (id, type, amount, date, time, customer_id, category, description, receipt_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE
           SET type = EXCLUDED.type,
               amount = EXCLUDED.amount,
               date = EXCLUDED.date,
               time = EXCLUDED.time,
               customer_id = EXCLUDED.customer_id,
               category = EXCLUDED.category,
               description = EXCLUDED.description,
               receipt_number = EXCLUDED.receipt_number`,
          [t.id, t.type, t.amount, t.date, t.time, t.customerId || null, t.category, t.description || '', t.receiptNumber || '', t.createdAt]
        );
      }

      // Employees
      for (const emp of data.employees || []) {
        await client.query(
          `INSERT INTO tally_employees (id, name, designation, phone, monthly_salary, join_date, status, address, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               designation = EXCLUDED.designation,
               phone = EXCLUDED.phone,
               monthly_salary = EXCLUDED.monthly_salary,
               join_date = EXCLUDED.join_date,
               status = EXCLUDED.status,
               address = EXCLUDED.address,
               notes = EXCLUDED.notes,
               updated_at = EXCLUDED.updated_at`,
          [emp.id, emp.name, emp.designation, emp.phone || '', emp.monthlySalary, emp.joinDate, emp.status, emp.address || '', emp.notes || '', emp.createdAt, emp.updatedAt]
        );
      }

      // Salary Payments
      for (const sal of data.salaryPayments || []) {
        await client.query(
          `INSERT INTO tally_salary_payments (id, employee_id, amount, month, date, time, payment_method, bonus, deduction, note, receipt_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE
           SET employee_id = EXCLUDED.employee_id,
               amount = EXCLUDED.amount,
               month = EXCLUDED.month,
               date = EXCLUDED.date,
               time = EXCLUDED.time,
               payment_method = EXCLUDED.payment_method,
               bonus = EXCLUDED.bonus,
               deduction = EXCLUDED.deduction,
               note = EXCLUDED.note,
               receipt_number = EXCLUDED.receipt_number`,
          [sal.id, sal.employeeId, sal.amount, sal.month, sal.date, sal.time, sal.paymentMethod, sal.bonus || 0, sal.deduction || 0, sal.note || '', sal.receiptNumber || '', sal.createdAt]
        );
      }

      // Admin Auth
      if (data.auth) {
        await client.query(
          `INSERT INTO tally_auth (id, admin_id, password_hash, last_login, updated_at)
           VALUES ('default', $1, $2, $3, NOW())
           ON CONFLICT (id) DO UPDATE
           SET admin_id = EXCLUDED.admin_id,
               password_hash = EXCLUDED.password_hash,
               last_login = EXCLUDED.last_login,
               updated_at = NOW()`,
          [data.auth.adminId || 'admin', data.auth.password || '123456', data.auth.lastLogin || null]
        );
      }

      await client.query('COMMIT');
      console.log('✅ Full dataset successfully synced to Supabase PostgreSQL!');
      return true;
    });
  } catch (err: any) {
    console.warn('Supabase sync notice:', err.message);
    return false;
  }
}

export async function upsertSupabaseProfile(profile: BusinessProfileRecord): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query(
        `INSERT INTO tally_profile (id, shop_name, owner_name, phone, address, currency_symbol, logo, updated_at)
         VALUES ('default', $1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE
         SET shop_name = EXCLUDED.shop_name,
             owner_name = EXCLUDED.owner_name,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address,
             currency_symbol = EXCLUDED.currency_symbol,
             logo = EXCLUDED.logo,
             updated_at = NOW()`,
        [profile.shopName, profile.ownerName, profile.phone, profile.address, profile.currencySymbol || '৳', profile.logo || null]
      );
    });
  } catch (err: any) {
    console.warn('Supabase upsertProfile notice:', err.message);
  }
}

export async function upsertSupabaseCustomer(cust: CustomerRecord): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query(
        `INSERT INTO tally_customers (id, name, phone, address, type, opening_balance, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address,
             type = EXCLUDED.type,
             opening_balance = EXCLUDED.opening_balance,
             updated_at = EXCLUDED.updated_at`,
        [cust.id, cust.name, cust.phone || '', cust.address || '', cust.type, cust.openingBalance, cust.createdAt, cust.updatedAt]
      );
    });
  } catch (err: any) {
    console.warn('Supabase upsertCustomer notice:', err.message);
  }
}

export async function deleteSupabaseCustomer(id: string): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query('DELETE FROM tally_customers WHERE id = $1', [id]);
      await client.query('UPDATE tally_transactions SET customer_id = NULL WHERE customer_id = $1', [id]);
    });
  } catch (err: any) {
    console.warn('Supabase deleteCustomer notice:', err.message);
  }
}

export async function upsertSupabaseTransaction(txn: TransactionRecord): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query(
        `INSERT INTO tally_transactions (id, type, amount, date, time, customer_id, category, description, receipt_number, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET type = EXCLUDED.type,
             amount = EXCLUDED.amount,
             date = EXCLUDED.date,
             time = EXCLUDED.time,
             customer_id = EXCLUDED.customer_id,
             category = EXCLUDED.category,
             description = EXCLUDED.description,
             receipt_number = EXCLUDED.receipt_number`,
        [txn.id, txn.type, txn.amount, txn.date, txn.time, txn.customerId || null, txn.category, txn.description || '', txn.receiptNumber || '', txn.createdAt]
      );
    });
  } catch (err: any) {
    console.warn('Supabase upsertTransaction notice:', err.message);
  }
}

export async function deleteSupabaseTransaction(id: string): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query('DELETE FROM tally_transactions WHERE id = $1', [id]);
    });
  } catch (err: any) {
    console.warn('Supabase deleteTransaction notice:', err.message);
  }
}

export async function upsertSupabaseEmployee(emp: EmployeeRecord): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query(
        `INSERT INTO tally_employees (id, name, designation, phone, monthly_salary, join_date, status, address, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             designation = EXCLUDED.designation,
             phone = EXCLUDED.phone,
             monthly_salary = EXCLUDED.monthly_salary,
             join_date = EXCLUDED.join_date,
             status = EXCLUDED.status,
             address = EXCLUDED.address,
             notes = EXCLUDED.notes,
             updated_at = EXCLUDED.updated_at`,
        [emp.id, emp.name, emp.designation, emp.phone || '', emp.monthlySalary, emp.joinDate, emp.status, emp.address || '', emp.notes || '', emp.createdAt, emp.updatedAt]
      );
    });
  } catch (err: any) {
    console.warn('Supabase upsertEmployee notice:', err.message);
  }
}

export async function deleteSupabaseEmployee(id: string): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query('DELETE FROM tally_salary_payments WHERE employee_id = $1', [id]);
      await client.query('DELETE FROM tally_employees WHERE id = $1', [id]);
    });
  } catch (err: any) {
    console.warn('Supabase deleteEmployee notice:', err.message);
  }
}

export async function upsertSupabaseSalaryPayment(sal: SalaryPaymentRecord): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query(
        `INSERT INTO tally_salary_payments (id, employee_id, amount, month, date, time, payment_method, bonus, deduction, note, receipt_number, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET employee_id = EXCLUDED.employee_id,
             amount = EXCLUDED.amount,
             month = EXCLUDED.month,
             date = EXCLUDED.date,
             time = EXCLUDED.time,
             payment_method = EXCLUDED.payment_method,
             bonus = EXCLUDED.bonus,
             deduction = EXCLUDED.deduction,
             note = EXCLUDED.note,
             receipt_number = EXCLUDED.receipt_number`,
        [sal.id, sal.employeeId, sal.amount, sal.month, sal.date, sal.time, sal.paymentMethod, sal.bonus || 0, sal.deduction || 0, sal.note || '', sal.receiptNumber || '', sal.createdAt]
      );
    });
  } catch (err: any) {
    console.warn('Supabase upsertSalaryPayment notice:', err.message);
  }
}

export async function deleteSupabaseSalaryPayment(id: string): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query('DELETE FROM tally_salary_payments WHERE id = $1', [id]);
    });
  } catch (err: any) {
    console.warn('Supabase deleteSalaryPayment notice:', err.message);
  }
}

export async function clearSupabaseData(): Promise<void> {
  try {
    await withClient(async (client) => {
      await client.query('TRUNCATE TABLE tally_salary_payments CASCADE');
      await client.query('TRUNCATE TABLE tally_employees CASCADE');
      await client.query('TRUNCATE TABLE tally_transactions CASCADE');
      await client.query('TRUNCATE TABLE tally_customers CASCADE');
    });
  } catch (err: any) {
    console.warn('Supabase clearData notice:', err.message);
  }
}
