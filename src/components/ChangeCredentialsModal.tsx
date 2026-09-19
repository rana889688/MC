import React, { useState } from 'react';
import { 
  KeyRound, 
  User, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api.ts';

interface ChangeCredentialsModalProps {
  currentAdminId: string;
  onClose: () => void;
  onSuccess: (newAdminId: string) => void;
}

export const ChangeCredentialsModal: React.FC<ChangeCredentialsModalProps> = ({
  currentAdminId,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAdminId, setNewAdminId] = useState(currentAdminId || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('দয়া করে আপনার বর্তমান পাসওয়ার্ড প্রদান করুন');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!');
      return;
    }

    if (!newPassword && newAdminId.trim() === currentAdminId) {
      setError('নতুন আইডি অথবা নতুন পাসওয়ার্ড লিখুন');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.changeCredentials({
        currentPassword,
        newAdminId: newAdminId.trim(),
        newPassword: newPassword || currentPassword,
      });

      if (res.success) {
        if (res.token) {
          if (localStorage.getItem('tally_auth_token')) {
            localStorage.setItem('tally_auth_token', res.token);
            localStorage.setItem('tally_admin_id', res.adminId);
          } else {
            sessionStorage.setItem('tally_auth_token', res.token);
            sessionStorage.setItem('tally_admin_id', res.adminId);
          }
        }
        setSuccessMsg(res.message || 'আইডি ও পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!');
        setTimeout(() => {
          onSuccess(res.adminId);
        }, 1200);
      } else {
        setError(res.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে। বর্তমান পাসওয়ার্ডটি সঠিক কিনা পরীক্ষা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="change-credentials-card"
        className="w-full max-w-md bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ডাটাবেজ আইডি ও পাসওয়ার্ড পরিবর্তন</h3>
              <p className="text-[11px] text-stone-400">আপনার ব্যক্তিগত গোপন কোড পরিবর্তন করুন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5 text-amber-200/90 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>নতুন পাসওয়ার্ড সেট করার পর এটি মনে রাখুন বা লিখে রাখুন, যাতে আপনি ছাড়া অন্য কেউ এক্সেস করতে না পারে।</span>
          </div>

          {error && (
            <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 flex items-start gap-2.5 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                বর্তমান পাসওয়ার্ড <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="আপনার বর্তমান পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 pr-9 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-200"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Admin ID */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                নতুন ইউজার আইডি (ঐচ্ছিক)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  placeholder="যেমন: admin অথবা আপনার মোবাইল"
                  className="w-full px-3 py-2 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-600"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-0.5">পরিবর্তন করতে না চাইলে যেমন আছে তেমনই রাখুন।</p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                নতুন গোপন পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড"
                  className="w-full px-3 py-2 pr-9 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-200"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            {newPassword && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-stone-600"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
