import React, { useState, useEffect, useMemo } from 'react';
import { Employee, SalaryPayment, SalarySummary, BusinessProfile } from '../types.ts';
import { 
  UserCheck, 
  UserPlus, 
  Search, 
  Phone, 
  Calendar, 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Printer, 
  X, 
  Check, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Wallet,
  Clock,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Filter,
  Copy,
  Share2
} from 'lucide-react';
import { 
  enToBnDigits, 
  formatCurrencyBn, 
  formatBengaliDate,
  generateSalaryVoucherShareText
} from '../utils/bengali.ts';
import { printElement } from '../utils/printHelper.ts';
import { api } from '../api.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface EmployeeSalaryViewProps {
  profile: BusinessProfile;
  onRefreshAll?: () => void;
}

const BENGALI_MONTHS = [
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

export const EmployeeSalaryView: React.FC<EmployeeSalaryViewProps> = ({ profile, onRefreshAll }) => {
  const [subTab, setSubTab] = useState<'employees' | 'payments'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [summary, setSummary] = useState<SalarySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetEmployeeIdForPayment, setTargetEmployeeIdForPayment] = useState<string>('');

  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [activeVoucherPayment, setActiveVoucherPayment] = useState<SalaryPayment | null>(null);
  const [voucherCopied, setVoucherCopied] = useState(false);
  const [voucherFeedback, setVoucherFeedback] = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SalaryPayment | null>(null);

  // Copy Voucher Text to Clipboard
  const handleCopyVoucherText = async (payment: SalaryPayment) => {
    const text = generateSalaryVoucherShareText(payment, profile);
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
      setVoucherCopied(true);
      setVoucherFeedback('বেতন ভাউচারের তথ্য কপি করা হয়েছে!');
      setTimeout(() => {
        setVoucherCopied(false);
        setVoucherFeedback(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy voucher:', err);
    }
  };

  // Print Voucher Handler
  const handlePrintVoucher = (payment: SalaryPayment) => {
    const title = `${profile.shopName || 'টালি খাতা'} - বেতন ভাউচার #${payment.receiptNumber || payment.id.slice(-6).toUpperCase()}`;
    printElement('salary-voucher-print', title);
  };

  // Employee Form
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    designation: '',
    phone: '',
    monthlySalary: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    address: '',
    notes: '',
  });

  // Current Month suggestion for salary
  const currentMonthName = useMemo(() => {
    const now = new Date();
    const m = BENGALI_MONTHS[now.getMonth()];
    const y = enToBnDigits(now.getFullYear());
    return `${m} ${y}`;
  }, []);

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    employeeId: '',
    amount: '',
    month: currentMonthName,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    paymentMethod: 'cash' as 'cash' | 'bkash' | 'nagad' | 'bank' | 'other',
    bonus: '0',
    deduction: '0',
    note: '',
    recordInCashBook: true,
  });

  const [submitting, setSubmitting] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, payList, sumData] = await Promise.all([
        api.getEmployees(),
        api.getSalaryPayments(),
        api.getSalarySummary(),
      ]);
      setEmployees(empList);
      setPayments(payList);
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load employee salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  // Available months from payments
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.month) set.add(p.month);
    });
    return Array.from(set);
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      const matchesEmployee = selectedEmployeeFilter === 'all' || pay.employeeId === selectedEmployeeFilter;
      const matchesMonth = monthFilter === 'all' || pay.month === monthFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (pay.employeeName && pay.employeeName.toLowerCase().includes(q)) ||
        (pay.receiptNumber && pay.receiptNumber.toLowerCase().includes(q)) ||
        (pay.note && pay.note.toLowerCase().includes(q)) ||
        (pay.month && pay.month.toLowerCase().includes(q));

      return matchesEmployee && matchesMonth && matchesSearch;
    });
  }, [payments, selectedEmployeeFilter, monthFilter, searchTerm]);

  // Open Add Employee Modal
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      designation: 'কর্মচারী',
      phone: '',
      monthlySalary: '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      address: '',
      notes: '',
    });
    setIsEmployeeModalOpen(true);
  };

  // Open Edit Employee Modal
  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      designation: emp.designation,
      phone: emp.phone,
      monthlySalary: emp.monthlySalary.toString(),
      joinDate: emp.joinDate || new Date().toISOString().split('T')[0],
      status: emp.status,
      address: emp.address || '',
      notes: emp.notes || '',
    });
    setIsEmployeeModalOpen(true);
  };

  // Save Employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) {
      alert('কর্মচারীর নাম প্রদান করুন');
      return;
    }
    const salary = parseFloat(employeeForm.monthlySalary) || 0;
    if (salary < 0) {
      alert('মাসিক বেতন সঠিক অঙ্কে দিন');
      return;
    }

    try {
      setSubmitting(true);
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, {
          name: employeeForm.name.trim(),
          designation: employeeForm.designation.trim() || 'কর্মচারী',
          phone: employeeForm.phone.trim(),
          monthlySalary: salary,
          joinDate: employeeForm.joinDate,
          status: employeeForm.status,
          address: employeeForm.address.trim(),
          notes: employeeForm.notes.trim(),
        });
      } else {
        await api.createEmployee({
          name: employeeForm.name.trim(),
          designation: employeeForm.designation.trim() || 'কর্মচারী',
          phone: employeeForm.phone.trim(),
          monthlySalary: salary,
          joinDate: employeeForm.joinDate,
          status: employeeForm.status,
          address: employeeForm.address.trim(),
          notes: employeeForm.notes.trim(),
        });
      }
      setIsEmployeeModalOpen(false);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'কর্মচারী সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Employee
  const handleConfirmDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    await api.deleteEmployee(deletingEmployee.id);
    if (selectedEmployeeForDetails?.id === deletingEmployee.id) {
      setSelectedEmployeeForDetails(null);
    }
    await loadData();
    if (onRefreshAll) onRefreshAll();
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (defaultEmployeeId?: string) => {
    const empId = defaultEmployeeId || (employees.length > 0 ? employees[0].id : '');
    const emp = employees.find((e) => e.id === empId);

    setPaymentForm({
      employeeId: empId,
      amount: emp ? emp.monthlySalary.toString() : '',
      month: currentMonthName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      paymentMethod: 'cash',
      bonus: '0',
      deduction: '0',
      note: '',
      recordInCashBook: true,
    });
    setIsPaymentModalOpen(true);
  };

  // On selecting employee in Payment Modal
  const handlePaymentEmployeeChange = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setPaymentForm((prev) => ({
      ...prev,
      employeeId: empId,
      amount: emp ? emp.monthlySalary.toString() : prev.amount,
    }));
  };

  // Save Salary Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.employeeId) {
      alert('কর্মচারী নির্বাচন করুন');
      return;
    }
    const baseAmount = parseFloat(paymentForm.amount) || 0;
    const bonus = parseFloat(paymentForm.bonus) || 0;
    const deduction = parseFloat(paymentForm.deduction) || 0;
    const netAmount = baseAmount + bonus - deduction;

    if (netAmount <= 0) {
      alert('পরিশোধের চূড়ান্ত পরিমাণ ০ টাকার বেশি হতে হবে');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createSalaryPayment({
        employeeId: paymentForm.employeeId,
        amount: netAmount,
        month: paymentForm.month.trim(),
        date: paymentForm.date,
        time: paymentForm.time,
        paymentMethod: paymentForm.paymentMethod,
        bonus,
        deduction,
        note: paymentForm.note.trim(),
        recordInCashBook: paymentForm.recordInCashBook,
      });

      setIsPaymentModalOpen(false);
      await loadData();
      if (onRefreshAll) onRefreshAll();

      // Offer to show voucher
      setActiveVoucherPayment(res.payment);
    } catch (err: any) {
      alert(err.message || 'বেতন পরিশোধ এন্ট্রি করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Payment
  const handleConfirmDeletePayment = async () => {
    if (!deletingPayment) return;
    await api.deleteSalaryPayment(deletingPayment.id);
    await loadData();
    if (onRefreshAll) onRefreshAll();
  };

  // Calculate Net payment in modal
  const modalNetAmount = useMemo(() => {
    const base = parseFloat(paymentForm.amount) || 0;
    const bonus = parseFloat(paymentForm.bonus) || 0;
    const ded = parseFloat(paymentForm.deduction) || 0;
    return Math.max(0, base + bonus - ded);
  }, [paymentForm.amount, paymentForm.bonus, paymentForm.deduction]);

  // Selected Employee Details & history
  const employeePaymentsList = useMemo(() => {
    if (!selectedEmployeeForDetails) return [];
    return payments
      .filter((p) => p.employeeId === selectedEmployeeForDetails.id)
      .sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));
  }, [selectedEmployeeForDetails, payments]);

  const selectedEmployeeTotalPaid = useMemo(() => {
    return employeePaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [employeePaymentsList]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1">মোট কর্মচারী</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-stone-900">
                {enToBnDigits(summary?.totalEmployees || employees.length)} জন
              </h3>
              <span className="text-xs text-emerald-600 font-medium">
                ({enToBnDigits(summary?.activeEmployees || employees.filter((e) => e.status !== 'inactive').length)} সক্রিয়)
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1">মাসিক বেতন বাজেট</p>
            <h3 className="text-2xl font-bold text-stone-900">
              {formatCurrencyBn(summary?.totalMonthlySalary || 0)}
            </h3>
            <p className="text-xs text-stone-400 mt-1">সকল সক্রিয় কর্মচারীর মূল বেতন</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1">চলতি মাসে পরিশোধিত</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {formatCurrencyBn(summary?.paidThisMonth || 0)}
            </h3>
            <p className="text-xs text-stone-400 mt-1">{currentMonthName}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1">সর্বমোট পরিশোধিত বেতন</p>
            <h3 className="text-2xl font-bold text-amber-700">
              {formatCurrencyBn(summary?.totalPaidAllTime || 0)}
            </h3>
            <p className="text-xs text-stone-400 mt-1">মোট {enToBnDigits(payments.length)} টি কিস্তি</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main View Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Navigation & Action Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-50/50">
          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-2 bg-stone-200/70 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setSubTab('employees')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                subTab === 'employees'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              কর্মচারী তালিকা ({enToBnDigits(employees.length)})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('payments')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                subTab === 'payments'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              বেতন প্রদান ও বিস্তারিত ({enToBnDigits(payments.length)})
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenPaymentModal()}
              disabled={employees.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              + বেতন প্রদান করুন
            </button>
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              + নতুন কর্মচারী যোগ
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 border-b border-stone-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={subTab === 'employees' ? 'নাম, পদবী বা ফোন দিয়ে খুঁজুন...' : 'রিসিপ্ট নং, নাম বা বিবরণ দিয়ে খুঁজুন...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {subTab === 'employees' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500 font-medium">স্ট্যাটাস:</span>
              <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                  }`}
                >
                  সকল
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-stone-600'
                  }`}
                >
                  সক্রিয়
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === 'inactive' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                  }`}
                >
                  নিষ্ক্রিয়
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Employee Filter */}
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">সকল কর্মচারী</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.designation})
                  </option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">সকল মাস</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Employees List */}
        {subTab === 'employees' && (
          <div className="divide-y divide-stone-100">
            {loading ? (
              <div className="p-12 text-center text-stone-400">ডাটা লোড হচ্ছে...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <h4 className="text-base font-semibold text-stone-800">কোন কর্মচারী পাওয়া যায়নি</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  আপনার প্রতিষ্ঠানের কম্পিউটার অপারেটর, সেলস বা অন্যান্য স্টাফদের যুক্ত করুন ও নিয়মিত বেতন হিসাব রাখুন।
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddEmployee}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  প্রথম কর্মচারী যোগ করুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6 bg-stone-50/40">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-stone-900 text-base leading-tight">
                              {emp.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-stone-500 font-medium">{emp.designation}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  emp.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-stone-100 text-stone-500 border border-stone-200'
                                }`}
                              >
                                {emp.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Top Action Icons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmployee(emp)}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="এডিট করুন"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEmployee(emp)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Contact & Join Info */}
                      <div className="space-y-1.5 text-xs text-stone-600 my-3 py-3 border-y border-stone-100">
                        {emp.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <a href={`tel:${emp.phone}`} className="hover:text-emerald-600 font-mono">
                              {emp.phone}
                            </a>
                          </div>
                        )}
                        {emp.joinDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>যোগদান: {formatBengaliDate(emp.joinDate)}</span>
                          </div>
                        )}
                        {emp.address && (
                          <div className="flex items-center gap-2 text-stone-500">
                            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{emp.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial Figures */}
                      <div className="bg-stone-50 rounded-xl p-3 mb-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">মাসিক নির্ধারিত বেতন:</span>
                          <span className="font-bold text-stone-900 text-sm">
                            {formatCurrencyBn(emp.monthlySalary)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">পরিশোধিত মোট বেতন:</span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrencyBn(emp.totalPaidSalary || 0)}
                          </span>
                        </div>
                        {emp.lastPaymentDate && (
                          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-200/60">
                            <span>সর্বশেষ বেতন:</span>
                            <span>{formatBengaliDate(emp.lastPaymentDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(emp.id)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        বেতন দিন
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeForDetails(emp)}
                        className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-stone-500" />
                        হিসাব খাতা
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Salary Payments History */}
        {subTab === 'payments' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-stone-400">ডাটা লোড হচ্ছে...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                <h4 className="text-base font-semibold text-stone-800">কোন বেতন প্রদানের রেকর্ড নেই</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  কর্মচারীদের বেতন পরিশোধের বিস্তারিত রসিদ ও তালিকা এখানে সংরক্ষিত থাকবে।
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenPaymentModal()}
                  disabled={employees.length === 0}
                  className="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  নতুন বেতন এন্ট্রি দিন
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs font-semibold text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-4">রিসিট নং</th>
                    <th className="py-3.5 px-4">তারিখ ও সময়</th>
                    <th className="py-3.5 px-4">কর্মচারী</th>
                    <th className="py-3.5 px-4">বেতনের মাস</th>
                    <th className="py-3.5 px-4">পরিশোধ মাধ্যম</th>
                    <th className="py-3.5 px-4 text-right">পরিশোধিত টাকা</th>
                    <th className="py-3.5 px-4">বিবরণ / নোট</th>
                    <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-stone-600 font-semibold">
                        {pay.receiptNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-700 whitespace-nowrap">
                        <div>{formatBengaliDate(pay.date)}</div>
                        <div className="text-[10px] text-stone-400">{enToBnDigits(pay.time)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{pay.employeeName || 'অজ্ঞাত'}</div>
                        <div className="text-xs text-stone-400">{pay.employeeDesignation}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-stone-800">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                          {pay.month}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600">
                        <span className="capitalize px-2 py-0.5 rounded bg-stone-100 font-medium">
                          {pay.paymentMethod === 'cash' ? 'ক্যাশ / নগদ' : pay.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-base font-bold text-emerald-700">
                          {formatCurrencyBn(pay.amount)}
                        </span>
                        {(pay.bonus || pay.deduction) ? (
                          <div className="text-[10px] text-stone-400">
                            {pay.bonus ? `+বোনাস ${formatCurrencyBn(pay.bonus)} ` : ''}
                            {pay.deduction ? `-কর্তন ${formatCurrencyBn(pay.deduction)}` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-500 max-w-xs truncate">
                        {pay.note || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveVoucherPayment(pay)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="ভাউচার রশিদ দেখুন"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPayment(pay)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Add / Edit Employee */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingEmployee ? 'কর্মচারীর তথ্য সংশোধন' : 'নতুন কর্মচারী যোগ করুন'}
                  </h3>
                  <p className="text-xs text-stone-500">মডার্ণ কম্পিউটার স্টাফ প্রোফাইল</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  কর্মচারীর নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: নাজমুল হাসান"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    পদবী / দায়িত্ব
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: কম্পিউটার অপারেটর"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="tel"
                    placeholder="017xxxxxxxx"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    মাসিক বেতন (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    placeholder="যেমন: 12000"
                    value={employeeForm.monthlySalary}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, monthlySalary: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    যোগদানের তারিখ
                  </label>
                  <input
                    type="date"
                    value={employeeForm.joinDate}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, joinDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  কাজের স্ট্যাটাস
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmployeeForm({ ...employeeForm, status: 'active' })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      employeeForm.status === 'active'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    ✓ সক্রিয় (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeForm({ ...employeeForm, status: 'inactive' })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      employeeForm.status === 'inactive'
                        ? 'bg-stone-200 border-stone-400 text-stone-800'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    নিষ্ক্রিয় (Inactive)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ঠিকানা
                </label>
                <input
                  type="text"
                  placeholder="নবাবগঞ্জ, দিনাজপুর"
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  মন্তব্য / বিশেষ তথ্য
                </label>
                <textarea
                  rows={2}
                  placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন..."
                  value={employeeForm.notes}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : editingEmployee ? 'আপডেট করুন' : 'যোগ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Salary Payment */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">বেতন প্রদান ভাউচার এন্ট্রি</h3>
                  <p className="text-xs text-stone-500">কর্মচারীকে বেতন প্রদানের বিস্তারিত তথ্য দিন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  কর্মচারী নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={paymentForm.employeeId}
                  onChange={(e) => handlePaymentEmployeeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                >
                  <option value="" disabled>-- কর্মচারী বাছাই করুন --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.designation}) — মাসিক: {formatCurrencyBn(e.monthlySalary)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    বেতনের মাস <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: সেপ্টেম্বর ২০২৬"
                    value={paymentForm.month}
                    onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    মূল বেতনের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bonus and Deductions */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <div>
                  <label className="block text-xs font-medium text-emerald-700 mb-1">
                    + অতিরিক্ত বোনাস (ঐচ্ছিক ৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={paymentForm.bonus}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bonus: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-rose-700 mb-1">
                    - কর্তন / অনুপস্থিতি (ঐচ্ছিক ৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={paymentForm.deduction}
                    onChange={(e) => setPaymentForm({ ...paymentForm, deduction: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="col-span-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-semibold">সর্বমোট চূড়ান্ত প্রদেয় বেতন:</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {formatCurrencyBn(modalNetAmount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    প্রদানের তারিখ
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    পরিশোধ মাধ্যম
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="cash">নগদ টাকা (Cash)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="bank">ব্যাংক একাউন্ট</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  মন্তব্য / নোট
                </label>
                <input
                  type="text"
                  placeholder="যেমন: আগস্ট মাসের পূর্ণ বেতন পরিশোধ"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Automatic CashBook Entry Checkbox */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="recordCashBook"
                  checked={paymentForm.recordInCashBook}
                  onChange={(e) => setPaymentForm({ ...paymentForm, recordInCashBook: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="recordCashBook" className="text-xs text-blue-900 cursor-pointer">
                  <span className="font-semibold">প্রধান ক্যাশ বইয়ে খরচ হিসেবে রেকর্ড করুন</span>
                  <p className="text-[11px] text-blue-700/80 mt-0.5">
                    টিক দেওয়া থাকলে এই বেতনটি স্বয়ংক্রিয়ভাবে ক্যাশ বইয়ের খরচ (Cash Out) হিসেবে যুক্ত হবে এবং দোকান ব্যালেন্স সমন্বিত হবে।
                  </p>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting ? 'এন্ট্রি হচ্ছে...' : 'বেতন পরিশোধ নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Employee Details / Ledger Modal */}
      {selectedEmployeeForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                  {selectedEmployeeForDetails.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {selectedEmployeeForDetails.name} এর বেতন খাতা
                  </h3>
                  <p className="text-xs text-stone-500">
                    {selectedEmployeeForDetails.designation} • মাসিক বেতন: {formatCurrencyBn(selectedEmployeeForDetails.monthlySalary)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeletingEmployee(selectedEmployeeForDetails)}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="কর্মচারী মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForDetails(null)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Summary Card */}
            <div className="p-4 bg-stone-50 border-b border-stone-200/60 grid grid-cols-3 gap-3 text-center shrink-0">
              <div className="bg-white p-3 rounded-xl border border-stone-200/60">
                <p className="text-[11px] text-stone-400">নির্ধারিত বেতন</p>
                <p className="text-sm font-bold text-stone-900 mt-0.5">
                  {formatCurrencyBn(selectedEmployeeForDetails.monthlySalary)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200/60">
                <p className="text-[11px] text-stone-400">মোট কিস্তি প্রদান</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">
                  {enToBnDigits(employeePaymentsList.length)} বার
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200/60">
                <p className="text-[11px] text-stone-400">সর্বমোট পরিশোধ</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  {formatCurrencyBn(selectedEmployeeTotalPaid)}
                </p>
              </div>
            </div>

            {/* Payments History List */}
            <div className="p-4 overflow-y-auto grow space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  সকল বেতন প্রদানের হিসাব ({enToBnDigits(employeePaymentsList.length)})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const empId = selectedEmployeeForDetails.id;
                    setSelectedEmployeeForDetails(null);
                    handleOpenPaymentModal(empId);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন বেতন দিন
                </button>
              </div>

              {employeePaymentsList.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  এই কর্মচারীকে এখনো কোনো বেতন প্রদান করা হয়নি।
                </div>
              ) : (
                employeePaymentsList.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-white rounded-xl border border-stone-200/80 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{p.month}</span>
                        <span className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded font-mono">
                          {p.receiptNumber}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatBengaliDate(p.date)} • {enToBnDigits(p.time)} • {p.paymentMethod === 'cash' ? 'ক্যাশ' : p.paymentMethod}
                      </div>
                      {p.note && <div className="text-xs text-stone-400 italic">{p.note}</div>}
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-base font-bold text-emerald-700">
                          {formatCurrencyBn(p.amount)}
                        </div>
                        {(p.bonus || p.deduction) ? (
                          <div className="text-[10px] text-stone-400">
                            {p.bonus ? `+${p.bonus} ` : ''}{p.deduction ? `-${p.deduction}` : ''}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveVoucherPayment(p)}
                        className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="রশিদ দেখুন"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPayment(p)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="বেতন রেকর্ড মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Salary Voucher Receipt (Printable) */}
      {activeVoucherPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-900 text-white print:hidden">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> বেতন প্রদানের রসিদ / ভাউচার
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyVoucherText(activeVoucherPayment)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    voucherCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                  title="ভাউচারের সকল তথ্য কপি করুন"
                >
                  {voucherCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{voucherCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintVoucher(activeVoucherPayment)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                  title="প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5" /> প্রিন্ট
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVoucherPayment(null)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition ml-1"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Feedback Alert if Copied */}
            {voucherFeedback && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2 print:hidden animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{voucherFeedback}</span>
              </div>
            )}

            {/* Receipt Body */}
            <div id="salary-voucher-print" className="p-6 bg-white space-y-4 overflow-y-auto">
              <div className="text-center pb-3 border-b border-dashed border-stone-200">
                {profile.logo && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={profile.logo}
                      alt={profile.shopName || 'প্রতিষ্ঠানের লোগো'}
                      className="h-10 max-w-[110px] object-contain rounded"
                    />
                  </div>
                )}
                <h2 className="text-lg font-bold text-stone-900">{profile.shopName}</h2>
                <p className="text-xs text-stone-500">{profile.address} • ফোন: {profile.phone}</p>
                <div className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                  বেতন পরিশোধ ভাউচার
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>ভাউচার নং:</span>
                  <span className="font-mono font-semibold text-stone-900">{activeVoucherPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>তারিখ ও সময়:</span>
                  <span>{formatBengaliDate(activeVoucherPayment.date)} ({enToBnDigits(activeVoucherPayment.time)})</span>
                </div>
                <div className="flex justify-between">
                  <span>কর্মচারীর নাম:</span>
                  <span className="font-bold text-stone-900">{activeVoucherPayment.employeeName || 'কর্মচারী'}</span>
                </div>
                <div className="flex justify-between">
                  <span>পদবী:</span>
                  <span>{activeVoucherPayment.employeeDesignation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>বেতনের মাস:</span>
                  <span className="font-semibold text-blue-700">{activeVoucherPayment.month}</span>
                </div>
                <div className="flex justify-between">
                  <span>পরিশোধ মাধ্যম:</span>
                  <span className="capitalize">{activeVoucherPayment.paymentMethod === 'cash' ? 'ক্যাশ' : activeVoucherPayment.paymentMethod}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-stone-200 space-y-1">
                {activeVoucherPayment.bonus ? (
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>বোনাস:</span>
                    <span>+{formatCurrencyBn(activeVoucherPayment.bonus)}</span>
                  </div>
                ) : null}
                {activeVoucherPayment.deduction ? (
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>কর্তন:</span>
                    <span>-{formatCurrencyBn(activeVoucherPayment.deduction)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1 border-t border-stone-100">
                  <span>পরিশোধিত মোট টাকা:</span>
                  <span className="text-emerald-700">{formatCurrencyBn(activeVoucherPayment.amount)}</span>
                </div>
              </div>

              {activeVoucherPayment.note && (
                <div className="text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  <span className="font-medium">নোট: </span>{activeVoucherPayment.note}
                </div>
              )}

              <div className="pt-8 flex justify-between text-[11px] text-stone-400">
                <div className="text-center">
                  <div className="w-24 border-t border-stone-300 mb-1"></div>
                  <span>কর্মচারীর স্বাক্ষর</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-t border-stone-300 mb-1"></div>
                  <span>মালিক / ক্যাশিয়ার</span>
                </div>
              </div>
            </div>

            {/* Footer / Copy & Print Buttons */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <button
                type="button"
                onClick={() => handleCopyVoucherText(activeVoucherPayment)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition border shadow-xs ${
                  voucherCopied
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                }`}
              >
                {voucherCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
                <span>{voucherCopied ? 'কপি হয়েছে' : 'কপি করুন (Copy)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveVoucherPayment(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/70 rounded-xl transition"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintVoucher(activeVoucherPayment)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  প্রিন্ট ভাউচার
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Employee Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingEmployee}
        title="কর্মচারীর তথ্য মুছে ফেলা"
        itemName={deletingEmployee ? `${deletingEmployee.name} (${deletingEmployee.designation})` : ''}
        message="আপনি কি নিশ্চিত যে এই কর্মচারীর তথ্য এবং তার সাথে সম্পর্কিত সকল অতীত বেতন প্রদানের রেকর্ড মুছে ফেলতে চান?"
        confirmLabel="হ্যাঁ, কর্মচারী মুছুন"
        onConfirm={handleConfirmDeleteEmployee}
        onClose={() => setDeletingEmployee(null)}
      />

      {/* Confirm Delete Salary Payment Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingPayment}
        title="বেতন প্রদানের রেকর্ড মুছে ফেলা"
        itemName={
          deletingPayment
            ? `${deletingPayment.employeeName || 'কর্মচারী'} - ${deletingPayment.month} মাসের বেতন (${formatCurrencyBn(
                deletingPayment.amount
              )})`
            : ''
        }
        message="আপনি কি নিশ্চিত যে এই বেতন ভাউচারের রেকর্ডটি মুছে ফেলতে চান? এতে হিসাবের মোট খরচ ও ক্যাশ খাতা স্বয়ংক্রিয়ভাবে সমন্বয় হয়ে যাবে।"
        confirmLabel="হ্যাঁ, রেকর্ডটি মুছুন"
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setDeletingPayment(null)}
      />
    </div>
  );
};
