import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signup' }: AuthModalProps) {
  const { login, signup, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL query parameters for ?ref=CODE or check sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      const clean = refParam.toUpperCase().trim();
      setReferralCode(clean);
      setMode('signup');
      try {
        sessionStorage.setItem('roz_referral_code', clean);
      } catch (e) {
        // ignore
      }
    } else {
      try {
        const stored = sessionStorage.getItem('roz_referral_code');
        if (stored) {
          setReferralCode(stored);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle(referralCode || undefined);
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily closed or cancelled the popup - no error message or console.error needed
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      if (err?.code === 'auth/network-request-failed') {
        setErrorMessage('Network error during Google sign-in. Please check your internet connection.');
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('This domain is not authorized for Google Sign-In in Firebase. Please check authorized domains in Firebase Console.');
        return;
      }
      console.warn('Google sign-in notice:', err?.message || err);
      setErrorMessage(err?.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        await signup(email, password, name, referralCode);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      console.warn('Auth notice:', err?.message || err);
      let message = err.message || 'Authentication failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please log in.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            {mode === 'signup' ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-['Outfit']">
            {mode === 'signup' ? 'Create RozKamai Account' : 'Welcome Back'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'signup'
              ? 'Sign up to watch ads, maintain your streak & withdraw PKR cash.'
              : 'Log in to access your accumulated balance and daily streak.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Google Sign-in / Sign-up Button */}
        <div className="space-y-3 mb-4">
          <button
            id="google-auth-btn"
            type="button"
            onClick={handleGoogleAuth}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              or continue with email
            </span>
            <div className="grow border-t border-slate-200"></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Your Full Name
              </label>
              <input
                id="auth-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ali Ahmed"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="auth-password-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <input
              id="auth-password-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-referral-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                <span>Referral Code (Optional)</span>
                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Bonus PKR Eligible
                </span>
              </label>
              <input
                id="auth-referral-input"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7XYZ89"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Please wait...</span>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Free Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In & Continue</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
