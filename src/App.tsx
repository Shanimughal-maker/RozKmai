import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Ticker } from './components/Ticker';
import { AdWatchSection } from './components/AdWatchSection';
import { StreakCard } from './components/StreakCard';
import { ProgressCard } from './components/ProgressCard';
import { WithdrawTab } from './components/WithdrawTab';
import { ReferralTab } from './components/ReferralTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { JackpotModal } from './components/JackpotModal';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, isAdmin, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdraw' | 'referrals' | 'profile' | 'admin'>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [jackpotModalOpen, setJackpotModalOpen] = useState(false);
  const [jackpotType, setJackpotType] = useState<'jackpot' | 'streak'>('jackpot');
  const [jackpotAmount, setJackpotAmount] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(7);

  // Route guarding: if a non-admin user somehow navigates to admin tab or URL, redirect immediately to dashboard
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  // URL / hash listener: protect direct URL navigation (e.g. /#admin, ?tab=admin, /admin)
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash.toLowerCase().replace('#', '').trim();
      const params = new URLSearchParams(window.location.search);
      const tabParam = (params.get('tab') || '').toLowerCase().trim();
      const pathname = window.location.pathname.toLowerCase().trim();

      const isTargetingAdmin = hash === 'admin' || tabParam === 'admin' || pathname === '/admin';

      if (isTargetingAdmin) {
        if (isAdmin) {
          setActiveTab('admin');
        } else {
          // Immediately redirect non-admin away to dashboard and clean the URL
          setActiveTab('dashboard');
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    window.addEventListener('popstate', handleUrlRoute);

    return () => {
      window.removeEventListener('hashchange', handleUrlRoute);
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, [isAdmin]);

  const handleTriggerJackpot = (amount: number) => {
    setJackpotType('jackpot');
    setJackpotAmount(amount);
    setJackpotModalOpen(true);
  };

  const handleTriggerStreakComplete = (days: number, bonus: number) => {
    setJackpotType('streak');
    setStreakDays(days);
    setJackpotAmount(bonus);
    setJackpotModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl mx-auto animate-pulse">
            RK
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Loading RozKamai...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Live Payout Ticker */}
      <Ticker />

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Non-logged in callout */}
            {!currentUser && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Welcome Bonus Available</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-['Outfit']">
                    Sign in to Start Earning PKR Cash Rewards Today!
                  </h3>
                  <p className="text-xs text-emerald-100 max-w-xl">
                    Create a free account with your email. Watch short 20-30s direct sponsor ads and cash out to Easypaisa or JazzCash.
                  </p>
                </div>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-white text-emerald-800 font-extrabold text-sm shadow-md hover:bg-emerald-50 transition-all shrink-0 active:scale-95 cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>
            )}

            {/* Core Ad Watch & Earn Section */}
            <AdWatchSection
              onJackpot={handleTriggerJackpot}
              onStreakComplete={handleTriggerStreakComplete}
              onRequireAuth={() => setAuthModalOpen(true)}
            />

            {/* Streak & Multipliers Bar */}
            <StreakCard streakCount={userProfile?.streakCount || 0} />

            {/* Today's Earning & Next Bonus Progress */}
            <ProgressCard
              todayAdsWatched={userProfile?.todayAdsWatched || 0}
              todayEarned={userProfile?.todayEarned || 0}
              totalAdsWatched={userProfile?.totalAdsWatched || 0}
            />

            {/* Feature Highlights Bento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-['Outfit']">
                    Low PKR 10 Threshold
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Fast cashouts directly to your Easypaisa, JazzCash, or bank account. No months-long waiting.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-['Outfit']">
                    Dynamic Ad Rotations
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Powered by high-CPM networks with varied wait timers and random jackpot payouts.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-['Outfit']">
                    Lifetime 5% Referrals
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Get PKR 2.00 on your friend's first ad view, plus 5% of their ad earnings forever.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick FAQ note */}
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-xs text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Need help with your payout or account? Have questions about direct ads?</span>
              </div>
              <button
                onClick={() => setActiveTab('withdraw')}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Cashout FAQs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* WITHDRAW TAB */}
        {activeTab === 'withdraw' && <WithdrawTab />}

        {/* REFERRALS TAB */}
        {activeTab === 'referrals' && <ReferralTab />}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <ProfileTab
            onNavigateToWithdraw={() => setActiveTab('withdraw')}
            onNavigateToReferrals={() => setActiveTab('referrals')}
          />
        )}

        {/* ADMIN TAB - Only rendered if user is verified admin */}
        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Jackpot & Streak Celebration Modal */}
      <JackpotModal
        isOpen={jackpotModalOpen}
        onClose={() => setJackpotModalOpen(false)}
        type={jackpotType}
        amount={jackpotAmount}
        streakDays={streakDays}
      />

      {/* Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 font-['Outfit']">
              RozKamai 🇵🇰
            </span>
            <span>•</span>
            <span>Pakistan's Daily Watch & Earn Portal</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by Adsterra High CPM</span>
            <span>•</span>
            <span>Easypaisa / JazzCash Payouts</span>
            {isAdmin && (
              <>
                <span>•</span>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Admin Area
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
