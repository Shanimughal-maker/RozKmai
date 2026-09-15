import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatPKR, REWARD_CONFIG } from '../lib/constants';
import {
  Gift,
  Copy,
  Check,
  Users,
  TrendingUp,
  Share2,
  Sparkles,
} from 'lucide-react';

export function ReferralTab() {
  const { userProfile } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const referralCode = userProfile?.referralCode || 'ROZKAMAI';
  const origin = window.location.origin;
  const shareableUrl = `${origin}/?ref=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join RozKamai & Earn Daily Cash!',
          text: `Use my invite code ${referralCode} on RozKamai to watch short ads and earn real PKR daily!`,
          url: shareableUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div id="referrals-tab" className="space-y-6 max-w-4xl mx-auto">
      {/* Referral Hero Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-100 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
              <span>Unlimited Referrals Program</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-['Outfit'] tracking-tight">
              Invite Friends, Earn PKR 2.00 + 5% Ongoing!
            </h2>
            <p className="text-sm text-amber-100 max-w-lg">
              Share your link. When a friend signs up and watches their first ad, you instantly get{' '}
              <strong>PKR {REWARD_CONFIG.REFERRAL_SIGNUP_BONUS_PKR.toFixed(2)}</strong>, plus a lifetime{' '}
              <strong>5% commission</strong> on all their future earnings.
            </p>
          </div>

          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider block">
              Total Referral Profits
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] block mt-0.5">
              {formatPKR(userProfile?.referralEarnings || 0, 4)}
            </span>
            <span className="text-[11px] text-amber-100 mt-0.5 block">
              From {userProfile?.referralCount || 0} active friends
            </span>
          </div>
        </div>
      </div>

      {/* Share Links Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 font-['Outfit']">
              Your Shareable Invite Assets
            </h3>
            <p className="text-xs text-slate-500">
              Share via WhatsApp, Telegram, Facebook, or direct link.
            </p>
          </div>
        </div>

        {/* Share Link Row */}
        <div>
          <label htmlFor="referral-link-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Your Unique Invite Link
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              id="referral-link-input"
              type="text"
              readOnly
              value={shareableUrl}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-sm font-mono truncate focus:outline-hidden"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="copy-link-btn"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                id="native-share-btn"
                onClick={handleNativeShare}
                className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Share via device options"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Referral Code Box */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Referral Code Only
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-wider font-mono">
              {referralCode}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Friends can type this code manually when signing up.
            </p>
          </div>

          <button
            id="copy-code-btn"
            onClick={handleCopyCode}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied Code</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Three Step How-It-Works */}
        <div className="pt-2">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            How The Referral System Works
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm mb-3">
                1
              </div>
              <h5 className="font-bold text-slate-900 text-sm">Send Your Link</h5>
              <p className="text-xs text-slate-500 mt-1">
                Share your invite link with contacts, WhatsApp groups, or social media.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm mb-3">
                2
              </div>
              <h5 className="font-bold text-slate-900 text-sm">They Watch 1st Ad</h5>
              <p className="text-xs text-slate-500 mt-1">
                As soon as they complete their first ad, you immediately receive PKR 2.00 cash.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm mb-3">
                3
              </div>
              <h5 className="font-bold text-slate-900 text-sm">Earn 5% Forever</h5>
              <p className="text-xs text-slate-500 mt-1">
                Every time your friends earn by watching ads, 5% is automatically credited to you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Friends Referred
            </span>
            <div className="text-2xl font-black text-slate-900 font-['Outfit']">
              {userProfile?.referralCount || 0}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lifetime Referral Earnings
            </span>
            <div className="text-2xl font-black text-emerald-700 font-['Outfit']">
              {formatPKR(userProfile?.referralEarnings || 0, 4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
