import React, { useState, useEffect, useRef } from 'react';
import { BackupSnapshot, Customer, DashboardSummary, Transaction, SupabaseStatus } from '../types.ts';
import { 
  Database, 
  Download, 
  Upload, 
  History, 
  ShieldCheck, 
  FileSpreadsheet, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  FolderArchive,
  HardDrive,
  FileJson,
  RotateCcw,
  Cloud,
  Server,
  Radio,
  Check,
  Lock,
  KeyRound,
  UserCheck,
  Key
} from 'lucide-react';
import { enToBnDigits, formatBengaliDate } from '../utils/bengali.ts';
import { api } from '../api.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface BackupManagerViewProps {
  summary: DashboardSummary | null;
  customers: Customer[];
  transactions: Transaction[];
  onDataRestored: () => void;
  adminId?: string;
  onOpenChangeCredentials?: () => void;
  onLogout?: () => void;
}

export const BackupManagerView: React.FC<BackupManagerViewProps> = ({
  summary,
  customers,
  transactions,
  onDataRestored,
  adminId,
  onOpenChangeCredentials,
  onLogout,
}) => {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    itemName?: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const list = await api.getSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSupabaseStatus = async () => {
    try {
      const status = await api.getSupabaseStatus();
      setSupabaseStatus(status);
    } catch (err) {
      console.error('Failed to load Supabase status:', err);
    }
  };

  const handleSyncSupabase = async () => {
    try {
      setSyncingSupabase(true);
      const res = await api.syncSupabase();
      setSupabaseStatus(res.status);
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      onDataRestored();
      loadSnapshots();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Supabase ক্লাউড ডাটাবেজে সিঙ্ক করতে সমস্যা হয়েছে',
      });
    } finally {
      setSyncingSupabase(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
    loadSupabaseStatus();
  }, []);

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/download';
    setStatusMessage({
      type: 'success',
      text: 'ব্যাকআপ ফাইলটি ডাউনলোড শুরু হয়েছে। এটি আপনার কম্পিউটার বা ফোনে নিরাপদে রাখুন।',
    });
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingSnapshot(true);
      const res = await api.createSnapshot(snapshotNote || 'ম্যানুয়াল ব্যাকআপ পয়েন্ট');
      setSnapshotNote('');
      setStatusMessage({ type: 'success', text: res.message });
      loadSnapshots();
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'ব্যাকআপ তৈরি করতে সমস্যা হয়েছে' });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = (filename: string) => {
    setConfirmModalConfig({
      title: 'ব্যাকআপ থেকে রিস্টোর',
      itemName: filename,
      message: `আপনি কি নিশ্চিত যে "${filename}" ব্যাকআপ ফাইল থেকে ডাটাবেজ রিস্টোর করতে চান? বর্তমান ডাটার একটি স্বয়ংক্রিয় সেফটি স্ন্যাপশট নিয়ে রাখা হবে।`,
      confirmLabel: 'হ্যাঁ, রিস্টোর করুন',
      isDestructive: false,
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await api.restoreSnapshot(filename);
          setStatusMessage({ type: 'success', text: res.message });
          onDataRestored();
          loadSnapshots();
        } catch (e: any) {
          setStatusMessage({ type: 'error', text: e.message || 'রিস্টোর করতে সমস্যা হয়েছে' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const payload = JSON.parse(content);

        if (!payload.customers || !payload.transactions) {
          throw new Error('অকার্যকর ব্যাকআপ ফাইল। ফাইলটিতে কাস্টমার বা লেনদেনের ডাটা পাওয়া যায়নি।');
        }

        setConfirmModalConfig({
          title: 'ফাইল থেকে রিস্টোর',
          itemName: file.name,
          message: `ফাইলটিতে ${payload.customers.length} জন কাস্টমার ও ${payload.transactions.length} টি লেনদেন পাওয়া গেছে। আপনি কি বর্তমান ডাটা প্রতিস্থাপন করে এটি রিস্টোর করতে চান?`,
          confirmLabel: 'হ্যাঁ, রিস্টোর করুন',
          isDestructive: false,
          onConfirm: async () => {
            try {
              setLoading(true);
              const res = await api.restorePayload(payload);
              setStatusMessage({ type: 'success', text: res.message });
              onDataRestored();
              loadSnapshots();
            } catch (err: any) {
              setStatusMessage({
                type: 'error',
                text: err.message || 'ফাইলটি রিস্টোর করতে সমস্যা হয়েছে',
              });
            } finally {
              setLoading(false);
            }
          },
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'ফাইলটি পড়তে বা রিস্টোর করতে সমস্যা হয়েছে। দয়া করে সঠিক .json ফাইল দিন।',
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetSample = () => {
    setConfirmModalConfig({
      title: 'নমুনা ডেমো ডাটাবেজ লোড',
      itemName: 'ডেমো টালি খাতা',
      message: 'আপনি কি পূর্বের ডেমো/নমুনা ডাটাবেজ পুনরায় লোড করতে চান? বর্তমান ডাটার একটি সেফটি ব্যাকআপ সংরক্ষিত থাকবে।',
      confirmLabel: 'হ্যাঁ, ডেমো লোড করুন',
      isDestructive: false,
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await api.resetSample();
          setStatusMessage({ type: 'success', text: res.message });
          onDataRestored();
          loadSnapshots();
        } catch (e: any) {
          setStatusMessage({ type: 'error', text: e.message });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleClearAll = () => {
    setConfirmModalConfig({
      title: 'সম্পূর্ণ খাতা খালি করুন',
      itemName: 'সমস্ত কাস্টমার ও হিসাবের ডাটা',
      message: 'সতর্কতা: আপনি কি সব হিসাব মুছে ফেলে সম্পূর্ণ শূন্য/নতুন টালি খাতা শুরু করতে চান? (পূর্বের ডাটার একটি সেফটি ব্যাকআপ সার্ভারে সংরক্ষিত থাকবে)',
      confirmLabel: 'হ্যাঁ, সব হিসাব মুছুন',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await api.clearAllData();
          setStatusMessage({ type: 'success', text: res.message });
          onDataRestored();
          loadSnapshots();
        } catch (e: any) {
          setStatusMessage({ type: 'error', text: e.message });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleExportCustomersCSV = () => {
    if (customers.length === 0) {
      alert('কোনো কাস্টমার নেই');
      return;
    }
    const headers = ['কাস্টমার আইডি', 'নাম', 'মোবাইল', 'ঠিকানা', 'ধরন', 'বর্তমান ব্যালেন্স (৳)', 'স্ট্যাটাস'];
    const rows = customers.map((c) => {
      const status = c.currentBalance > 0 ? 'পাবো (বাকি)' : c.currentBalance < 0 ? 'দেবো (দেনা)' : 'পরিশোধিত';
      return [
        c.id,
        `"${c.name}"`,
        `"${c.phone || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        c.type === 'supplier' ? 'সাপ্লায়ার' : 'কাস্টমার',
        c.currentBalance,
        `"${status}"`,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tallykhata-customers-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-stone-100 p-5 sm:p-6 rounded-2xl border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
                <Database className="w-6 h-6" />
              </span>
              <h2 className="text-xl font-bold text-white">ডাটাবেজ ও ব্যাকআপ নিয়ন্ত্রণ কেন্দ্র</h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mt-1">
              আপনার ব্যবসার প্রতিটি লেনদেন এবং কাস্টমারের বাকি-উসুল হিসাব সুরক্ষিত রাখার জন্য অটোমেটিক ও ম্যানুয়াল ব্যাকআপ ব্যবস্থা। যেকোনো সময় ব্যাকআপ ডাউনলোড বা পূর্বের ফাইলে রিস্টোর করা যায়।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-backup-main-btn"
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>ব্যাকআপ ডাউনলোড করুন</span>
            </button>
          </div>
        </div>

        {/* Database Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-stone-800/80 text-xs">
          <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-700/60">
            <span className="text-stone-400 block">ক্লাউড ডাটাবেজ</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4" /> Supabase লাইভ
            </span>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-700/60">
            <span className="text-stone-400 block">সংরক্ষিত কাস্টমার</span>
            <span className="text-white font-bold text-sm mt-0.5">
              {enToBnDigits(customers.length)} জন
            </span>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-700/60">
            <span className="text-stone-400 block">সংরক্ষিত লেনদেন</span>
            <span className="text-white font-bold text-sm mt-0.5">
              {enToBnDigits(transactions.length)} টি
            </span>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-700/60">
            <span className="text-stone-400 block">কর্মচারী ও বেতন</span>
            <span className="text-emerald-300 font-bold text-sm mt-0.5">
              {enToBnDigits(supabaseStatus?.employeesCount ?? 0)} জন • {enToBnDigits(supabaseStatus?.salaryPaymentsCount ?? 0)} ভাউচার
            </span>
          </div>
          <div className="bg-stone-800/60 p-3 rounded-lg border border-stone-700/60">
            <span className="text-stone-400 block">সার্ভার স্ন্যাপশট</span>
            <span className="text-white font-bold text-sm mt-0.5">
              {enToBnDigits(snapshots.length)} টি সংরক্ষিত
            </span>
          </div>
        </div>
      </div>

      {/* Database Security & Access Control Card */}
      <div className="bg-stone-900 text-stone-100 p-5 sm:p-6 rounded-2xl border border-stone-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
                <Lock className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-white text-base">
                ডাটাবেজ প্রবেশাধিকার ও নিরাপত্তা (Access Control)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                পাসওয়ার্ড সুরক্ষিত
              </span>
            </div>
            <p className="text-xs text-stone-300 max-w-2xl">
              অননুমোদিত ব্যক্তি যাতে খাতার হিসাব বা কাস্টমারের তথ্য দেখতে না পারে, সেজন্য সম্পূর্ণ ডাটাবেজ আইডি ও পাসওয়ার্ড দিয়ে সংরক্ষিত। আপনি ছাড়া কেউ এই ডাটাবেজে প্রবেশ করতে পারবে না।
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-400">
              <span className="inline-flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/60">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>বর্তমান ইউজার আইডি: <strong className="text-stone-100 font-mono">{adminId || 'admin'}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/60">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>পাসওয়ার্ড স্ট্যাটাস: <strong className="text-emerald-400">সক্রিয় ও এনক্রিপ্টেড</strong></span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenChangeCredentials && (
              <button
                id="backup-change-password-btn"
                type="button"
                onClick={onOpenChangeCredentials}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-emerald-300 text-xs font-semibold rounded-xl border border-stone-700 transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>আইডি ও পাসওয়ার্ড পরিবর্তন করুন</span>
              </button>
            )}

            {onLogout && (
              <button
                id="backup-logout-btn"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>ডাটাবেজ লক করুন (Logout)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Live Cloud Integration Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950/40 text-stone-100 p-5 sm:p-6 rounded-2xl border border-emerald-800/40 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
                <Cloud className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-white text-base">
                Supabase ক্লাউড ডাটাবেজ (PostgreSQL)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                সরাসরি সংযুক্ত
              </span>
            </div>
            <p className="text-xs text-stone-300 max-w-2xl">
              আপনার দেওয়া Supabase ক্রেডেনশিয়াল সফলভাবে সংযুক্ত করা হয়েছে। যেকোনো নতুন কাস্টমার এন্ট্রি বা লেনদেন স্বয়ংক্রিয়ভাবে ক্লাউড ডাটাবেজে পার্মানেন্টলি সেভ হচ্ছে।
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="sync-supabase-btn"
              type="button"
              onClick={handleSyncSupabase}
              disabled={syncingSupabase}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition"
            >
              <RefreshCw className={`w-4 h-4 ${syncingSupabase ? 'animate-spin' : ''}`} />
              <span>{syncingSupabase ? 'ক্লাউডে সিঙ্ক হচ্ছে...' : 'এখনই ক্লাউডে সিঙ্ক করুন'}</span>
            </button>
          </div>
        </div>

        {/* Supabase Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-800/80 text-xs">
          <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block text-[11px]">অর্গানাইজেশন</span>
            <span className="text-white font-semibold mt-0.5 block truncate">
              {supabaseStatus?.organization || 'MC Accounts'}
            </span>
          </div>

          <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block text-[11px]">প্রজেক্ট আইডি</span>
            <span className="text-emerald-400 font-mono font-bold mt-0.5 block truncate">
              {supabaseStatus?.projectId || 'psvozwvgacovrwyogavg'}
            </span>
          </div>

          <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block text-[11px]">ক্লাউড রিজিয়ন</span>
            <span className="text-stone-200 font-medium mt-0.5 block truncate">
              {supabaseStatus?.region || 'ap-northeast-1 (টোকিও)'}
            </span>
          </div>

          <div className="bg-stone-800/40 p-3 rounded-xl border border-stone-700/50">
            <span className="text-stone-400 block text-[11px]">Supabase টেবিলে ডাটা</span>
            <span className="text-emerald-300 font-bold mt-0.5 block">
              {enToBnDigits(supabaseStatus?.customersCount ?? customers.length)} কাস্টমার • {enToBnDigits(supabaseStatus?.transactionsCount ?? transactions.length)} লেনদেন • {enToBnDigits(supabaseStatus?.employeesCount ?? 0)} কর্মচারী • {enToBnDigits(supabaseStatus?.salaryPaymentsCount ?? 0)} বেতন
            </span>
          </div>
        </div>
      </div>

      {/* Status feedback message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            বন্ধ
          </button>
        </div>
      )}

      {/* Main Grid: Backup Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Instant Download & CSV Export */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">১. অফলাইন ব্যাকআপ ফাইল ডাউনলোড</h3>
              <p className="text-xs text-stone-500">আপনার পুরো হিসাব নিরাপদ ফাইলে সেভ করুন</p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200/70">
            এই ব্যাকআপ ফাইলটিতে সমস্ত কাস্টমারের নাম, ফোন নম্বর, বাকি-উসুলের খাতা এবং দৈনন্দিন ক্যাশ জমা-খরচের সকল হিসাব সংরক্ষিত থাকবে। মোবাইল বা কম্পিউটার হারিয়ে গেলেও এই ফাইল দিয়ে যেকোনো সময় হিসাব ফেরত পাওয়া যাবে।
          </p>

          <div className="space-y-2 pt-1">
            <button
              id="download-json-backup-card-btn"
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              <span>সম্পূর্ণ ডাটাবেজ ব্যাকআপ (.json) ডাউনলোড</span>
            </button>

            <button
              id="export-customers-csv-card-btn"
              type="button"
              onClick={handleExportCustomersCSV}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-200 transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>কাস্টমার লেজার সারাংশ (Excel / CSV) ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Card 2: Restore from Backup File */}
        <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">২. ব্যাকআপ ফাইল থেকে রিস্টোর</h3>
              <p className="text-xs text-stone-500">পূর্বে ডাউনলোড করা ফাইল আপলোড করে হিসাব ফিরিয়ে আনুন</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-xl p-5 text-center transition bg-stone-50/50">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="restore-file-input"
            />
            <label
              htmlFor="restore-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <FolderArchive className="w-8 h-8 text-stone-400" />
              <div className="text-xs font-semibold text-stone-700">
                <span className="text-emerald-700 underline">ফাইল বেছে নিতে এখানে ক্লিক করুন</span> অথবা ফাইল টেনে আনুন
              </div>
              <p className="text-[11px] text-stone-400">
                শুধুমাত্র টালি খাতার ব্যাকআপ ফাইল (.json) সমর্থিত
              </p>
            </label>
          </div>

          <p className="text-[11px] text-stone-500 italic">
            * দ্রষ্টব্য: রিস্টোর করার সাথে সাথে বর্তমান ডাটার একটি স্বয়ংক্রিয় ব্যাকআপ স্ন্যাপশট নিয়ে রাখা হবে, যাতে কোনো ঝুঁকি না থাকে।
          </p>
        </div>
      </div>

      {/* Server Automated Snapshots List */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              সার্ভার ডাটাবেজ ব্যাকআপ হিস্ট্রি
            </h3>
            <p className="text-xs text-stone-500">যেকোনো পূর্ববর্তী সময়ের ব্যাকআপে ক্লিক করে ফিরে যেতে পারেন</p>
          </div>

          {/* Form to create manual snapshot */}
          <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="ব্যাকআপের বিবরণ (যেমন: আজকের রাতের হিসাব)"
              value={snapshotNote}
              onChange={(e) => setSnapshotNote(e.target.value)}
              className="text-xs px-3 py-1.5 border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-600 w-48 sm:w-60"
            />
            <button
              type="submit"
              disabled={creatingSnapshot}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap"
            >
              {creatingSnapshot ? 'তৈরি হচ্ছে...' : '+ স্ন্যাপশট তৈরি'}
            </button>
          </form>
        </div>

        {snapshots.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            এখনো কোনো সার্ভার ব্যাকআপ স্ন্যাপশট তৈরি হয়নি। উপরে "+ স্ন্যাপশট তৈরি" ক্লিক করুন।
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {snapshots.map((snap) => (
              <div
                key={snap.filename}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-stone-100 text-stone-600 rounded-lg shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-stone-900">
                      {snap.filename}
                    </div>
                    <div className="text-[11px] text-stone-500 flex flex-wrap gap-2 mt-0.5">
                      <span>তৈরির সময়: {formatBengaliDate(snap.timestamp.split('T')[0])} {enToBnDigits(snap.timestamp.split('T')[1]?.slice(0, 5))}</span>
                      <span>•</span>
                      <span>কাস্টমার: {enToBnDigits(snap.recordsCount.customers)} জন</span>
                      <span>•</span>
                      <span>লেনদেন: {enToBnDigits(snap.recordsCount.transactions)} টি</span>
                      <span>•</span>
                      <span>সাইজ: {Math.round(snap.sizeBytes / 1024)} KB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap.filename)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-300 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>এই ব্যাকআপে রিস্টোর করুন</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Reset / Danger Zone */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
          ডাটাবেজ রক্ষণাবেক্ষণ ও রিসেট বিকল্প
        </h4>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-stone-600">
            <span className="font-semibold text-stone-800 block">নমুনা ডেমো ডাটাবেজ লোড করুন</span>
            যদি আপনি পুনরায় ডেমো কাস্টমার ও হিসাব দেখতে চান।
          </div>
          <button
            type="button"
            onClick={handleResetSample}
            className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-300 transition"
          >
            নমুনা ডাটা লোড
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <div className="text-xs text-stone-600">
            <span className="font-semibold text-rose-700 block">সম্পূর্ণ খাতা খালি করুন (নতুন ব্যবসা শুরু)</span>
            সমস্ত লেনদেন মুছে শূন্য থেকে শুরু করুন (একটি ব্যাকআপ স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে)।
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-300 transition cursor-pointer"
          >
            সব হিসাব মুছুন
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmDeleteModal
          isOpen={!!confirmModalConfig}
          title={confirmModalConfig.title}
          itemName={confirmModalConfig.itemName}
          message={confirmModalConfig.message}
          confirmLabel={confirmModalConfig.confirmLabel}
          isDestructive={confirmModalConfig.isDestructive}
          onConfirm={confirmModalConfig.onConfirm}
          onClose={() => setConfirmModalConfig(null)}
        />
      )}
    </div>
  );
};
