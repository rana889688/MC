import React, { useState } from 'react';
import { BusinessProfile } from '../types.ts';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  KeyRound, 
  AlertCircle,
  Database,
  Info
} from 'lucide-react';
import { api } from '../api.ts';

interface DatabaseLoginModalProps {
  profile: BusinessProfile;
  onLoginSuccess: (token: string, adminId: string) => void;
}

export const DatabaseLoginModal: React.FC<DatabaseLoginModalProps> = ({
  profile,
  onLoginSuccess,
}) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId.trim()) {
      setError('ইউজার আইডি অথবা মোবাইল নম্বর প্রদান করুন');
      return;
    }
    if (!password) {
      setError('পাসওয়ার্ড প্রদান করুন');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(adminId.trim(), password);
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem('tally_auth_token', res.token);
          localStorage.setItem('tally_admin_id', res.adminId);
        } else {
          sessionStorage.setItem('tally_auth_token', res.token);
          sessionStorage.setItem('tally_admin_id', res.adminId);
        }
        onLoginSuccess(res.token, res.adminId);
      } else {
        setError(res.message || 'ভুল আইডি অথবা পাসওয়ার্ড');
      }
    } catch (err: any) {
      setError(err.message || 'লগইন করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDefault = () => {
    setAdminId('admin');
    setPassword('123456');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="database-login-card"
        className="w-full max-w-md bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-b border-stone-800 p-6 text-center relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center mb-3 shadow-inner overflow-hidden">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt={profile.shopName}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Database className="w-8 h-8 text-emerald-400" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            {profile.shopName || 'ডিজিটাল টালি খাতা'}
          </h2>
          <p className="text-xs text-stone-400 mt-1 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>ডাটাবেজ ও খাতা অ্যাক্সেস নিয়ন্ত্রণ</span>
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-300 leading-relaxed">
              অননুমোদিত প্রবেশ রোধে ডাটাবেজ সুরক্ষিত রাখা হয়েছে। আপনার নির্দিষ্ট আইডি এবং পাসওয়ার্ড দিয়ে প্রবেশ করুন।
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID Field */}
            <div>
              <label 
                htmlFor="login-admin-id" 
                className="block text-xs font-semibold text-stone-300 mb-1.5"
              >
                ইউজার আইডি / মোবাইল নম্বর
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-admin-id"
                  type="text"
                  required
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="যেমন: admin অথবা 01744889688"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-stone-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="login-password" 
                className="block text-xs font-semibold text-stone-300 mb-1.5"
              >
                গোপন পাসওয়ার্ড
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="আপনার গোপন পাসওয়ার্ড দিন"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-950/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-stone-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>এই ডিভাইসে লগইন মনে রাখুন</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>ডাটাবেজে প্রবেশ করুন</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Info & Default Credentials Hint */}
          <div className="pt-2 border-t border-stone-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span className="flex items-center gap-1 text-stone-500">
                <Info className="w-3.5 h-3.5" />
                <span>প্রথমবার লগইনের জন্য:</span>
              </span>
              <button
                type="button"
                onClick={handleFillDefault}
                className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium"
              >
                ডিফল্ট কোড পূরণ করুন
              </button>
            </div>
            <div className="p-2.5 bg-stone-950/60 border border-stone-800 rounded-lg text-[11px] text-stone-400 flex justify-between">
              <span>আইডি: <strong className="text-stone-200">admin</strong></span>
              <span>পাসওয়ার্ড: <strong className="text-stone-200">123456</strong></span>
            </div>
            <p className="text-[10px] text-stone-500 text-center">
              * লগইন করার পর যেকোনো সময় আপনি আপনার পছন্দমতো নতুন আইডি ও পাসওয়ার্ড নির্ধারণ করতে পারবেন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
