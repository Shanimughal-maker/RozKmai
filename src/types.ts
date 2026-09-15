export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  balance: number; // Float PKR
  createdAt: string;
  streakCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  referralCode: string;
  referredBy?: string | null;
  referralCount: number;
  referralEarnings: number;
  totalAdsWatched: number;
  todayAdsWatched: number;
  todayDate: string; // YYYY-MM-DD
  todayEarned: number;
  lastClaimTimestamp?: number | null;
}

export interface AdLink {
  id: string;
  url: string;
  timerSeconds: number;
  active: boolean;
  createdAt: string;
}

export type PaymentMethod = 'Easypaisa' | 'JazzCash' | 'Bank Transfer';

export interface WithdrawalRequest {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  amount: number;
  method: PaymentMethod;
  accountDetails: string; // e.g. "03001234567 - Ali Khan"
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  note?: string;
}

export interface ClaimSession {
  id: string;
  uid: string;
  adLinkId: string;
  timerSeconds: number;
  startTime: number;
  completed: boolean;
  accumulatedHiddenMs?: number;
  lastHiddenStart?: number | null;
}

export interface SimulatedWithdrawal {
  id: string;
  username: string;
  method: PaymentMethod;
  amount: number;
  timeAgo: string;
}
