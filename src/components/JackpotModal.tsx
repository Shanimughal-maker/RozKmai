import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, X } from 'lucide-react';
import { formatPKR } from '../lib/constants';

interface JackpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'jackpot' | 'streak';
  amount?: number;
  streakDays?: number;
}

export function JackpotModal({ isOpen, onClose, type, amount, streakDays }: JackpotModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire vibrant confetti bursts
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 250);
      } catch (e) {
        console.error('Confetti error:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 text-center shadow-2xl border-2 border-amber-300 transform scale-100 transition-transform">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 animate-bounce">
          {type === 'jackpot' ? (
            <Sparkles className="w-10 h-10" />
          ) : (
            <Trophy className="w-10 h-10" />
          )}
        </div>

        {type === 'jackpot' ? (
          <>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              Lucky Jackpot Hit!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-['Outfit']">
              🎉 Jackpot Reward!
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              You triggered a rare high-multiplier jackpot bonus!
            </p>

            <div className="my-6 py-4 px-6 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Credited To Wallet
              </span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-['Outfit']">
                +{formatPKR(amount, 4)}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              {streakDays || 7} Days Complete!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-['Outfit']">
              🔥 7-Day Streak Complete!
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Congratulations! You completed the 7-day streak cycle with the maximum 3.0x multiplier.
            </p>

            <div className="my-6 py-4 px-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Special Streak Completion Bonus
              </span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-['Outfit']">
                +{formatPKR(amount || 1.5, 2)}
              </span>
            </div>
          </>
        )}

        <button
          id="jackpot-continue-btn"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-xl font-extrabold text-base text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        >
          Collect & Continue
        </button>
      </div>
    </div>
  );
}
