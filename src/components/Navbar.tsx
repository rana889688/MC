import React, { useState, useRef } from 'react';
import { BusinessProfile } from '../types.ts';
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  ReceiptText, 
  Database, 
  Plus, 
  Download, 
  Store, 
  Edit3, 
  Check, 
  X,
  Phone,
  MapPin,
  UserCheck,
  Upload,
  Image as ImageIcon,
  Trash2,
  Lock,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api.ts';

interface NavbarProps {
  activeTab: 'dashboard' | 'customers' | 'cashbook' | 'transactions' | 'employees' | 'backup';
  setActiveTab: (tab: 'dashboard' | 'customers' | 'cashbook' | 'transactions' | 'employees' | 'backup') => void;
  profile: BusinessProfile;
  onProfileUpdated: (p: BusinessProfile) => void;
  onOpenNewTxn: (defaultType?: string) => void;
  onQuickBackup: () => void;
  adminId?: string;
  onLogout?: () => void;
  onOpenChangeCredentials?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onProfileUpdated,
  onOpenNewTxn,
  onQuickBackup,
  adminId,
  onLogout,
  onOpenChangeCredentials,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    shopName: profile.shopName,
    ownerName: profile.ownerName,
    phone: profile.phone,
    address: profile.address,
    logo: profile.logo || '',
  });
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('অনুগ্রহ করে শুধুমাত্র ছবি (JPG, PNG, WebP, SVG) ফাইল নির্বাচন করুন।');
      return;
    }
    setLogoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to compact dimensions (max 240x240) so it remains lightweight, small and fast
        const maxDim = 240;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setEditForm((prev) => ({ ...prev, logo: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setEditForm((prev) => ({ ...prev, logo: '' }));
    setLogoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateProfile(editForm);
      onProfileUpdated(updated);
      setIsEditingProfile(false);
    } catch (err) {
      alert('প্রোফাইল আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'customers', label: 'কাস্টমার খাতা', icon: Users },
    { id: 'cashbook', label: 'ক্যাশ বই', icon: Wallet },
    { id: 'transactions', label: 'সকল লেনদেন', icon: ReceiptText },
    { id: 'employees', label: 'Employee Salary', icon: UserCheck },
    { id: 'backup', label: 'ডাটাবেজ ও ব্যাকআপ', icon: Database },
  ] as const;

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner / Shop Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/90 border border-emerald-500/40 flex items-center justify-center text-white font-bold shadow-xs overflow-hidden shrink-0 bg-stone-800">
            {profile.logo ? (
              <img
                src={profile.logo}
                alt={profile.shopName || 'প্রতিষ্ঠানের লোগো'}
                className="w-full h-full object-contain p-0.5 bg-white/10"
              />
            ) : (
              <BookOpen className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                {profile.shopName || 'ডিজিটাল টালি খাতা'}
              </h1>
              <button
                id="edit-profile-btn"
                type="button"
                onClick={() => {
                  setEditForm({
                    shopName: profile.shopName,
                    ownerName: profile.ownerName,
                    phone: profile.phone,
                    address: profile.address,
                    logo: profile.logo || '',
                  });
                  setLogoError(null);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="text-stone-400 hover:text-emerald-400 p-1 transition-colors"
                title="দোকানের তথ্য ও লোগো পরিবর্তন করুন"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span>প্রোপাইটার: {profile.ownerName || 'স্বত্বাধিকারী'}</span>
              <span className="hidden sm:inline-block text-stone-600">•</span>
              <span className="hidden sm:inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> {profile.phone}
              </span>
              <span className="hidden md:inline-block text-stone-600">•</span>
              <span className="hidden md:inline-flex items-center gap-1 text-stone-400">
                <MapPin className="w-3 h-3" /> {profile.address}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            id="supabase-cloud-badge-btn"
            type="button"
            onClick={() => setActiveTab('backup')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 rounded-full text-xs text-emerald-300 font-medium transition cursor-pointer"
            title="Supabase ডাটাবেজ স্ট্যাটাস দেখতে ক্লিক করুন"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Supabase ক্লাউড যুক্ত</span>
          </button>

          {onOpenChangeCredentials && (
            <button
              id="navbar-change-cred-btn"
              type="button"
              onClick={onOpenChangeCredentials}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-300 text-xs font-semibold rounded-lg border border-stone-700 transition cursor-pointer"
              title="ডাটাবেজ আইডি ও পাসওয়ার্ড পরিবর্তন করুন"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">পাসওয়ার্ড</span>
            </button>
          )}

          {onLogout && (
            <button
              id="navbar-logout-btn"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800/90 hover:bg-rose-950/80 text-stone-300 hover:text-rose-200 text-xs font-semibold rounded-lg border border-stone-700 hover:border-rose-700 transition cursor-pointer"
              title="ডাটাবেজ লক করুন (লগআউট)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">লক</span>
            </button>
          )}

          <button
            id="quick-backup-header-btn"
            type="button"
            onClick={onQuickBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 transition"
            title="সম্পূর্ণ ডাটাবেজ ব্যাকআপ ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">ব্যাকআপ নিন</span>
          </button>

          <button
            id="open-new-txn-header-btn"
            type="button"
            onClick={() => onOpenNewTxn()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন লেনদেন</span>
          </button>
        </div>
      </div>

      {/* Profile Edit Inline Dropdown */}
      {isEditingProfile && (
        <div className="bg-stone-800/95 border-b border-stone-700 p-4 max-w-7xl mx-auto">
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <Store className="w-4 h-4" /> দোকানের বিস্তারিত তথ্য পরিবর্তন
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">দোকানের নাম</label>
                <input
                  type="text"
                  value={editForm.shopName}
                  onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">মালিকের নাম</label>
                <input
                  type="text"
                  value={editForm.ownerName}
                  onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">দোকানের ঠিকানা</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Logo Settings Section */}
            <div className="bg-stone-900/90 border border-stone-700 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-xl border border-dashed border-stone-600 bg-stone-950 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {editForm.logo ? (
                    <img
                      src={editForm.logo}
                      alt="প্রতিষ্ঠানের লোগো প্রিভিউ"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-stone-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                    <span>প্রতিষ্ঠানের লোগো (ছোট সাইজে)</span>
                    {editForm.logo ? (
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-medium">
                        যুক্ত আছে
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500">(ঐচ্ছিক)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    লোগোটি রসিদ মেমো, বেতন ভাউচার এবং শীর্ষ নেভিগেশন বারে ছোট আকারে সুন্দরভাবে প্রদর্শিত হবে।
                  </p>
                  {logoError && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{logoError}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  id="business-logo-upload-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{editForm.logo ? 'লোগো পরিবর্তন' : 'লোগো আপলোড'}</span>
                </button>
                {editForm.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition cursor-pointer"
                    title="লোগো মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800">
              {onOpenChangeCredentials && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    onOpenChangeCredentials();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-emerald-400 text-xs font-semibold rounded-lg border border-stone-700 transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>আইডি ও পাসওয়ার্ড পরিবর্তন</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> {saving ? 'সংরক্ষণ হচ্ছে...' : 'দোকানের তথ্য সংরক্ষণ'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-4 flex overflow-x-auto scrollbar-none py-1">
        <div className="flex gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}-tab`}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-stone-800 text-emerald-400 shadow-sm border border-stone-700 font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
