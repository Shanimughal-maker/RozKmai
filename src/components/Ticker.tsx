import { useEffect, useState, useRef } from 'react';
import { PaymentMethod, SimulatedWithdrawal } from '../types';
import { Sparkles, ArrowUpRight } from 'lucide-react';

const PAKISTANI_NAMES = [
  'Hamza K.', 'Zainab M.', 'Bilal A.', 'Usman R.', 'Ayesha S.',
  'Muhammad T.', 'Fatima Z.', 'Ali Hassan', 'Sana W.', 'Fahad N.',
  'Khadija B.', 'Omer Farooq', 'Maryam J.', 'Danish Q.', 'Iqra P.',
  'Shahid M.', 'Hafsa K.', 'Waleed G.', 'Nida E.', 'Zubair H.'
];

const PAYMENT_METHODS: PaymentMethod[] = ['Easypaisa', 'JazzCash', 'Bank Transfer'];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSimulatedEntry(): SimulatedWithdrawal {
  // Genuinely pick payment method randomly - no fixed repeating pattern
  const randomMethodIndex = Math.floor(Math.random() * PAYMENT_METHODS.length);
  const method = PAYMENT_METHODS[randomMethodIndex];

  const nameIndex = Math.floor(Math.random() * PAKISTANI_NAMES.length);
  const name = PAKISTANI_NAMES[nameIndex];
  const phonePrefix = ['0300', '0301', '0312', '0321', '0333', '0345', '0315'][Math.floor(Math.random() * 7)];
  const phoneMask = `${phonePrefix}***${getRandomInt(100, 999)}`;

  // Realistic withdrawal amounts in PKR (e.g., 15.50, 25.00, 50.00, 120.00, 350.00)
  const commonAmounts = [15.5, 20.0, 32.5, 45.0, 50.0, 75.0, 110.0, 150.0, 250.0, 500.0];
  const amount = commonAmounts[Math.floor(Math.random() * commonAmounts.length)];

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: `${name} (${phoneMask})`,
    method,
    amount,
    timeAgo: `${getRandomInt(1, 14)}m ago`,
  };
}

export function Ticker() {
  const [entries, setEntries] = useState<SimulatedWithdrawal[]>(() => [
    generateSimulatedEntry(),
    generateSimulatedEntry(),
    generateSimulatedEntry(),
    generateSimulatedEntry(),
    generateSimulatedEntry(),
  ]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Randomize timing/spacing between additions (3.5s to 7s) so it doesn't feel mechanical
    const scheduleNext = () => {
      const delay = getRandomInt(3500, 7000);
      timerRef.current = setTimeout(() => {
        setEntries((prev) => {
          const next = [generateSimulatedEntry(), ...prev.slice(0, 14)];
          return next;
        });
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'Easypaisa':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'JazzCash':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Bank Transfer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div id="live-withdrawal-ticker" className="w-full bg-slate-900 text-white overflow-hidden py-2.5 px-3 border-y border-slate-800 shadow-inner">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5"></span>
          <span>Live Payouts</span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center gap-6 whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
            {entries.concat(entries).map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 px-3 py-1 rounded-full transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium text-slate-200">{item.username}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(item.method)}`}>
                  {item.method}
                </span>
                <span className="font-bold text-emerald-400">
                  PKR {item.amount.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">{item.timeAgo}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
