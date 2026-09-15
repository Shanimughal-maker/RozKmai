// Read all configuration values from import.meta.env
export const ENV = {
  EMAILJS_SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_yw6b1c2',
  EMAILJS_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  EMAILJS_PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  ADMIN_EMAIL: (import.meta.env.VITE_ADMIN_EMAIL || 'basdonsab@gmail.com').toLowerCase().trim(),
  ADSTERRA_DIRECT_LINK: import.meta.env.VITE_ADSTERRA_DIRECT_LINK || 'https://www.profitableratecpmnetwork.com/z8mrv76cz?key=00391889d3f65fd76c97faae4f45c9dd',
  DEFAULT_TIMER_SECONDS: Number(import.meta.env.VITE_DEFAULT_TIMER_SECONDS) || 30,
};

// Economic & Reward Rules
export const REWARD_CONFIG = {
  MIN_PKR: 0.05,
  MAX_PKR: 0.30,
  JACKPOT_CHANCE: 0.05, // 1 in 20 claims (5%)
  JACKPOT_MIN: 2.00,
  JACKPOT_MAX: 5.00,
  DAILY_MAX_CLAIMS: 20,
  COOLDOWN_SECONDS: 6, // 6s cooldown after claim before next ad
  MIN_WITHDRAWAL_PKR: 10.00,
  REFERRAL_SIGNUP_BONUS_PKR: 2.00, // Referrer gets PKR 2 on referee's first ad
  REFERRAL_COMMISSION_RATE: 0.05, // 5% ongoing commission on referee's earnings
  BONUS_EVERY_N_ADS: 5, // Milestone progress counter
};

// Day multipliers for 7-day streak
export const STREAK_MULTIPLIERS = [1.0, 1.1, 1.25, 1.5, 1.8, 2.2, 3.0];

// Safe decimal arithmetic to avoid IEEE-754 floating point distortion
export function safeAdd(a: number, b: number): number {
  return Math.round(((Number(a) || 0) + (Number(b) || 0)) * 1e6) / 1e6;
}

export function safeSub(a: number, b: number): number {
  return Math.round(((Number(a) || 0) - (Number(b) || 0)) * 1e6) / 1e6;
}

// Cosmetic currency formatter (does not alter underlying float value)
export function formatPKR(amount: number | undefined | null, decimals: number = 4): string {
  const val = Number(amount) || 0;
  return `PKR ${val.toLocaleString('en-PK', {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  })}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
