import { useState, useEffect, FormEvent } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod, WithdrawalRequest } from '../types';
import {
  REWARD_CONFIG,
  safeSub,
  formatPKR,
} from '../lib/constants';
import { sendWithdrawalAdminNotification } from '../lib/emailjs';
import {
  Wallet,
  Building2,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

export function WithdrawTab() {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [method, setMethod] = useState<PaymentMethod>('Easypaisa');
  const [amountInput, setAmountInput] = useState<string>('10');
  const [accountTitle, setAccountTitle] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Fetch past withdrawals
  useEffect(() => {
    async function fetchUserWithdrawals() {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'withdrawals'),
          where('uid', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const list: WithdrawalRequest[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setWithdrawals(list);
      } catch (err) {
        // In case composite index isn't created yet, fallback without orderBy
        try {
          const qFallback = query(
            collection(db, 'withdrawals'),
            where('uid', '==', currentUser.uid)
          );
          const snapFallback = await getDocs(qFallback);
          const listFallback: WithdrawalRequest[] = [];
          snapFallback.forEach((d) => {
            listFallback.push({ id: d.id, ...(d.data() as any) });
          });
          listFallback.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setWithdrawals(listFallback);
        } catch (e2) {
          console.error('Error fetching withdrawals:', e2);
        }
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchUserWithdrawals();
  }, [currentUser]);

  const minWithdrawal = REWARD_CONFIG.MIN_WITHDRAWAL_PKR;
  const currentBalance = userProfile?.balance || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser || !userProfile) {
      setErrorMessage('Please login to request a withdrawal.');
      return;
    }

    const amount = parseFloat(amountInput);

    // Rule 1: Minimum withdrawal validation
    if (isNaN(amount) || amount < minWithdrawal) {
      setErrorMessage(`Minimum withdrawal amount is PKR ${minWithdrawal.toFixed(2)}`);
      return;
    }

    // Rule 2: Balance check
    if (amount > currentBalance) {
      setErrorMessage(
        `Insufficient balance! You have ${formatPKR(currentBalance, 2)}, but requested PKR ${amount.toFixed(2)}.`
      );
      return;
    }

    // Rule 3: Account info check
    if (!accountTitle.trim() || !accountNumber.trim()) {
      setErrorMessage('Please provide your full Account Title and Account/Mobile Number.');
      return;
    }

    if (method === 'Bank Transfer' && !bankName.trim()) {
      setErrorMessage('Please specify the Bank Name for bank transfer.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAccountDetails =
        method === 'Bank Transfer'
          ? `Bank: ${bankName.trim()} | Title: ${accountTitle.trim()} | Acc/IBAN: ${accountNumber.trim()}`
          : `Title: ${accountTitle.trim()} | Number: ${accountNumber.trim()}`;

      // 1. Deduct balance from Firestore user document safely
      const newBalance = safeSub(currentBalance, amount);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: newBalance,
      });

      // 2. Create withdrawal document
      const withdrawalPayload = {
        uid: currentUser.uid,
        userEmail: currentUser.email || userProfile.email,
        userName: userProfile.name || accountTitle.trim(),
        amount: amount,
        method,
        accountDetails: fullAccountDetails,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'withdrawals'), withdrawalPayload);

      const createdWithdrawal: WithdrawalRequest = {
        id: docRef.id,
        ...withdrawalPayload,
      };

      // 3. Send EmailJS admin notification
      await sendWithdrawalAdminNotification(createdWithdrawal);

      // 4. Update local history and balance
      setWithdrawals((prev) => [createdWithdrawal, ...prev]);
      await refreshProfile();

      setSuccessMessage(
        `✅ Withdrawal request of PKR ${amount.toFixed(2)} via ${method} submitted! We review and process payouts within 24 hours.`
      );

      // Reset form
      setAccountTitle('');
      setAccountNumber('');
      setBankName('');
      setAmountInput(minWithdrawal.toString());
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setErrorMessage(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved & Sent
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Rejected (Refunded)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div id="withdraw-tab" className="space-y-6 max-w-4xl mx-auto">
      {/* Wallet Balance Hero */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest block">
              Available For Cashout
            </span>
            <div className="text-3xl sm:text-5xl font-black font-['Outfit'] mt-1 tracking-tight">
              {formatPKR(currentBalance, 4)}
            </div>
            <p className="text-xs text-emerald-200/80 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Direct payout to your Pakistani mobile account or bank
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-1">
            <div className="font-bold text-emerald-200">Payment Rules:</div>
            <div>• Minimum Cashout: PKR {minWithdrawal.toFixed(2)}</div>
            <div>• Processing Time: 1–24 Hours</div>
            <div>• No hidden deduction fees</div>
          </div>
        </div>
      </div>

      {/* Cashout Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 font-['Outfit']">
              Request Payout
            </h3>
            <p className="text-xs text-slate-500">
              Select your local payment method and enter valid account credentials.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Payout Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                id="method-easypaisa-btn"
                onClick={() => setMethod('Easypaisa')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  method === 'Easypaisa'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                  EP
                </div>
                <span>Easypaisa</span>
              </button>

              <button
                type="button"
                id="method-jazzcash-btn"
                onClick={() => setMethod('JazzCash')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  method === 'JazzCash'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
                  JC
                </div>
                <span>JazzCash</span>
              </button>

              <button
                type="button"
                id="method-bank-btn"
                onClick={() => setMethod('Bank Transfer')}
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  method === 'Bank Transfer'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Amount Field with Helper Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="withdraw-amount-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Amount to Withdraw (PKR)
              </label>
              <span className="text-xs font-semibold text-emerald-700">
                Max: {formatPKR(currentBalance, 2)}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                PKR
              </div>
              <input
                id="withdraw-amount-input"
                type="number"
                step="0.01"
                min={minWithdrawal}
                max={currentBalance}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                className="w-full pl-14 pr-24 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 font-extrabold text-base"
                placeholder="10.00"
              />
              <button
                type="button"
                onClick={() => setAmountInput(Math.floor(currentBalance).toString())}
                className="absolute inset-y-1.5 right-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Max
              </button>
            </div>

            {/* Deliberate helper note as required by prompt */}
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Minimum withdrawal amount is PKR {minWithdrawal.toFixed(2)}</span>
            </p>
          </div>

          {/* Account Title Field */}
          <div>
            <label htmlFor="account-title-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Account Title (Full Name on Account)
            </label>
            <input
              id="account-title-input"
              type="text"
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              required
              placeholder="e.g. Muhammad Ali Khan"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm font-medium"
            />
          </div>

          {/* Account Number Field */}
          <div>
            <label htmlFor="account-number-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {method === 'Bank Transfer' ? 'Account Number or IBAN' : `${method} Mobile Number`}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <PhoneCall className="w-4 h-4" />
              </div>
              <input
                id="account-number-input"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder={method === 'Bank Transfer' ? 'PK36MEZN0001234567890123' : '03001234567'}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm font-medium"
              />
            </div>
          </div>

          {/* If Bank Transfer, Bank Name Field */}
          {method === 'Bank Transfer' && (
            <div>
              <label htmlFor="bank-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Bank Name
              </label>
              <input
                id="bank-name-input"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                placeholder="e.g. Meezan Bank / HBL / UBL / Bank Alfalah"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm font-medium"
              />
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="submit-withdrawal-button"
            type="submit"
            disabled={isSubmitting || currentBalance < minWithdrawal}
            className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95 ${
              currentBalance < minWithdrawal || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <span>Submitting Request...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm & Submit Withdrawal</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Payout History Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900 font-['Outfit']">
              Your Withdrawal History
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {withdrawals.length} {withdrawals.length === 1 ? 'request' : 'requests'}
          </span>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading payout records...</div>
        ) : withdrawals.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No withdrawal requests yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Watch ads, accumulate at least PKR {minWithdrawal.toFixed(2)}, and cash out here!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 font-bold">Date</th>
                  <th className="py-3 px-3 font-bold">Method</th>
                  <th className="py-3 px-3 font-bold">Account</th>
                  <th className="py-3 px-3 font-bold text-right">Amount</th>
                  <th className="py-3 px-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {req.method}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={req.accountDetails}>
                      {req.accountDetails}
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900 text-right">
                      {formatPKR(req.amount, 2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
