import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/constants';
import {
  Flame,
  Wallet,
  Gift,
  ShieldAlert,
  LogOut,
  LogIn,
  User as UserIcon,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'withdraw' | 'referrals' | 'profile' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'withdraw' | 'referrals' | 'profile' | 'admin') => void;
  onOpenAuth: () => void;
}

export function Header({ activeTab, setActiveTab, onOpenAuth }: HeaderProps) {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              id="brand-logo-btn"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 focus:outline-hidden group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-xl tracking-tight">RK</span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900 font-['Outfit']">
                    Roz<span className="text-emerald-600">Kamai</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                    PKR
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                  Watch Ads & Earn Daily Cash
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Watch & Earn
            </button>

            <button
              id="nav-withdraw-btn"
              onClick={() => setActiveTab('withdraw')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'withdraw'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4 text-teal-600" />
              Withdraw
            </button>

            <button
              id="nav-referrals-btn"
              onClick={() => setActiveTab('referrals')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'referrals'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-500" />
              Refer & Earn
            </button>

            <button
              id="nav-profile-btn"
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="w-4 h-4 text-slate-500" />
              Profile
            </button>

            {isAdmin && (
              <button
                id="nav-admin-btn"
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 border cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'text-rose-600 hover:bg-rose-50/50 border-rose-200/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Admin Panel
              </button>
            )}
          </nav>

          {/* User Status / Balance / Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser && userProfile ? (
              <>
                {/* Streak Pill */}
                <div
                  id="user-streak-pill"
                  title={`${userProfile.streakCount || 0} Day Active Streak`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold shadow-xs"
                >
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>{userProfile.streakCount || 0} Days</span>
                </div>

                {/* Balance Pill */}
                <div
                  id="user-balance-pill"
                  onClick={() => setActiveTab('withdraw')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300/80 text-slate-900 cursor-pointer hover:border-emerald-400 transition-all shadow-xs"
                  title="Click to withdraw"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    Rs
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-emerald-800 tracking-tight">
                    {formatPKR(userProfile.balance, 4)}
                  </span>
                </div>

                {/* Sign Out Button */}
                <button
                  id="logout-btn"
                  onClick={() => logout()}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors hidden sm:inline-flex cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                id="header-login-btn"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Login / Sign Up</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-lg">
          {currentUser && userProfile && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Logged in as {userProfile.name}</span>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {userProfile.streakCount || 0} Day Streak
              </div>
            </div>
          )}

          <button
            id="mobile-nav-dashboard"
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Watch & Earn
          </button>

          <button
            id="mobile-nav-withdraw"
            onClick={() => { setActiveTab('withdraw'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left cursor-pointer ${
              activeTab === 'withdraw' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Wallet className="w-4 h-4 text-teal-600" />
            Withdraw Money
          </button>

          <button
            id="mobile-nav-referrals"
            onClick={() => { setActiveTab('referrals'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left cursor-pointer ${
              activeTab === 'referrals' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-500" />
            Refer & Earn
          </button>

          <button
            id="mobile-nav-profile"
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left cursor-pointer ${
              activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-4 h-4 text-slate-500" />
            My Profile & Stats
          </button>

          {isAdmin && (
            <button
              id="mobile-nav-admin"
              onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold text-left border cursor-pointer ${
                activeTab === 'admin' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'text-rose-600 border-rose-200/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Admin Panel
            </button>
          )}

          {currentUser && (
            <button
              id="mobile-nav-logout"
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 text-left pt-2 border-t border-slate-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
