import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/constants';
import {
  User,
  Wallet,
  Flame,
  Gift,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ProfileTabProps {
  onNavigateToWithdraw: () => void;
  onNavigateToReferrals: () => void;
}

export function ProfileTab({ onNavigateToWithdraw, onNavigateToReferrals }: ProfileTabProps) {
  const { userProfile, currentUser } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!currentUser || !userProfile) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Sign In to View Profile</h3>
        <p className="text-xs text-slate-500 mt-1">
          Create an account or login to access your balance, streaks, and referral stats.
        </p>
      </div>
    );
  }

  const referralCode = userProfile.referralCode;
  const shareableUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="profile-tab" className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-md">
            {userProfile.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 font-['Outfit']">
                {userProfile.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active Earner
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{userProfile.email}</p>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined: {new Date(userProfile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToWithdraw}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
          <span>Withdraw Balance</span>
        </button>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Current Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-['Outfit']">
            {formatPKR(userProfile.balance, 4)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Stored as raw float</p>
        </div>

        {/* Daily Streak */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daily Streak
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-['Outfit']">
            {userProfile.streakCount || 0} Days
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Active: {userProfile.lastActiveDate || 'None yet'}
          </p>
        </div>

        {/* Lifetime Ads Watched */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lifetime Ads
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-['Outfit']">
            {userProfile.totalAdsWatched || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Today: {userProfile.todayAdsWatched || 0} ads
          </p>
        </div>

        {/* Referral Earnings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Referral Profits
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2 font-['Outfit']">
            {formatPKR(userProfile.referralEarnings || 0, 4)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {userProfile.referralCount || 0} referrals
          </p>
        </div>
      </div>

      {/* Referral Link Quick Card on Profile */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-slate-900 font-['Outfit']">
              Your Referral Assets
            </h3>
          </div>
          <button
            onClick={onNavigateToReferrals}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono truncate text-slate-700">
            {shareableUrl}
          </div>
          <button
            id="profile-copy-link-btn"
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
