import { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AdLink, ClaimSession } from '../types';
import {
  ENV,
  REWARD_CONFIG,
  STREAK_MULTIPLIERS,
  safeAdd,
  formatPKR,
  getTodayDateString,
  getYesterdayDateString,
} from '../lib/constants';
import {
  PlayCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  PauseCircle,
} from 'lucide-react';

interface AdWatchSectionProps {
  onJackpot: (amount: number) => void;
  onStreakComplete: (streakDays: number, bonus: number) => void;
  onRequireAuth: () => void;
}

export function AdWatchSection({
  onJackpot,
  onStreakComplete,
  onRequireAuth,
}: AdWatchSectionProps) {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [adLinks, setAdLinks] = useState<AdLink[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdLink | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingClaim, setIsProcessingClaim] = useState<boolean>(false);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mutable refs to track visibility and accumulated ad-tab time across events
  const activeSessionIdRef = useRef<string | null>(null);
  const requiredSecondsRef = useRef<number>(0);
  const accumulatedHiddenMsRef = useRef<number>(0);
  const lastHiddenStartRef = useRef<number | null>(null);
  const isTimerActiveRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Load and seed ad links on initial mount
  useEffect(() => {
    async function loadAndSeedAdLinks() {
      try {
        const adLinksRef = collection(db, 'adLinks');
        const snap = await getDocs(adLinksRef);

        if (snap.empty) {
          // Seed the first ad link into Firestore using env variables
          const initialLink: AdLink = {
            id: 'seed-ad-1',
            url: ENV.ADSTERRA_DIRECT_LINK,
            timerSeconds: ENV.DEFAULT_TIMER_SECONDS,
            active: true,
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(doc(db, 'adLinks', initialLink.id), initialLink);
          } catch (seedErr) {
            console.warn('Unable to persist seed ad link to Firestore:', seedErr);
          }
          setAdLinks([initialLink]);
        } else {
          const links: AdLink[] = [];
          snap.forEach((docSnap) => {
            links.push(docSnap.data() as AdLink);
          });
          setAdLinks(links);
        }
      } catch (err) {
        console.warn('Error fetching/seeding ad links, using default link:', err);
        setAdLinks([
          {
            id: 'seed-ad-1',
            url: ENV.ADSTERRA_DIRECT_LINK,
            timerSeconds: ENV.DEFAULT_TIMER_SECONDS,
            active: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    }

    loadAndSeedAdLinks();
  }, []);

  // Check cooldown from lastClaimTimestamp
  useEffect(() => {
    if (userProfile?.lastClaimTimestamp) {
      const elapsedSec = (Date.now() - userProfile.lastClaimTimestamp) / 1000;
      if (elapsedSec < REWARD_CONFIG.COOLDOWN_SECONDS) {
        const remaining = Math.ceil(REWARD_CONFIG.COOLDOWN_SECONDS - elapsedSec);
        setCooldownRemaining(remaining);
      }
    }
  }, [userProfile?.lastClaimTimestamp]);

  // Handle cooldown interval
  useEffect(() => {
    if (cooldownRemaining > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldownRemaining]);

  // Page Visibility API to detect tab switching and enforce ad tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isTimerActiveRef.current) return;

      if (document.visibilityState === 'hidden') {
        // App tab became hidden: user switched to the ad tab
        // RESUME countdown
        lastHiddenStartRef.current = Date.now();
        isPausedRef.current = false;
        setIsPaused(false);
        setStatusMessage('▶️ Ad session active — watching sponsor ad in new tab...');

        if (activeSessionIdRef.current) {
          updateDoc(doc(db, 'claimSessions', activeSessionIdRef.current), {
            lastHiddenStart: Date.now(),
          }).catch((err) => console.warn('Session hidden sync notice:', err));
        }
      } else if (document.visibilityState === 'visible') {
        // App tab became visible: user switched back to our app tab!
        const now = Date.now();
        if (lastHiddenStartRef.current !== null) {
          accumulatedHiddenMsRef.current += (now - lastHiddenStartRef.current);
          lastHiddenStartRef.current = null;
        }

        const totalHidden = accumulatedHiddenMsRef.current;
        const elapsedSec = Math.floor(totalHidden / 1000);
        const remaining = Math.max(0, requiredSecondsRef.current - elapsedSec);
        setCountdown(remaining);

        if (remaining <= 0) {
          // Required wait time completed while ad was open!
          isTimerActiveRef.current = false;
          isPausedRef.current = false;
          setIsPaused(false);
          setTimerRunning(false);
          setCanClaim(true);
          setStatusMessage('🎉 Ad complete! You can now claim your PKR reward.');
        } else {
          // User came back early: PAUSE the countdown immediately!
          isPausedRef.current = true;
          setIsPaused(true);
          setStatusMessage('⏸ Timer paused — switch back to the ad tab to continue');
        }

        if (activeSessionIdRef.current) {
          updateDoc(doc(db, 'claimSessions', activeSessionIdRef.current), {
            accumulatedHiddenMs: totalHidden,
            lastHiddenStart: null,
          }).catch((err) => console.warn('Session visible sync notice:', err));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Active ad countdown ticker (only accumulates time while app tab is hidden/ad tab is open)
  useEffect(() => {
    if (timerRunning) {
      countdownIntervalRef.current = setInterval(() => {
        if (!isTimerActiveRef.current) return;
        if (isPausedRef.current) return; // Frozen while app tab is visible

        const now = Date.now();
        let currentHiddenMs = accumulatedHiddenMsRef.current;
        if (document.visibilityState === 'hidden' && lastHiddenStartRef.current !== null) {
          currentHiddenMs += (now - lastHiddenStartRef.current);
        }

        const elapsedSec = Math.floor(currentHiddenMs / 1000);
        const remaining = Math.max(0, requiredSecondsRef.current - elapsedSec);
        setCountdown(remaining);

        if (remaining <= 0) {
          isTimerActiveRef.current = false;
          isPausedRef.current = false;
          setIsPaused(false);
          setTimerRunning(false);
          setCanClaim(true);
          setStatusMessage('🎉 Ad complete! You can now claim your PKR reward.');

          if (activeSessionIdRef.current) {
            updateDoc(doc(db, 'claimSessions', activeSessionIdRef.current), {
              accumulatedHiddenMs: currentHiddenMs,
              lastHiddenStart: null,
            }).catch(() => {});
          }
        }
      }, 500);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [timerRunning]);

  const todayAds = userProfile?.todayAdsWatched || 0;
  const isDailyCapped = todayAds >= REWARD_CONFIG.DAILY_MAX_CLAIMS;

  // Step 1: Watch Ad Click
  const handleWatchAd = async () => {
    if (!currentUser || !userProfile) {
      onRequireAuth();
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setPopupBlocked(false);

    if (isDailyCapped) {
      setErrorMessage(`Daily limit reached (${REWARD_CONFIG.DAILY_MAX_CLAIMS}/${REWARD_CONFIG.DAILY_MAX_CLAIMS} ads). Come back tomorrow for new rewards!`);
      return;
    }

    if (cooldownRemaining > 0) {
      setErrorMessage(`Please wait ${cooldownRemaining}s cooldown before opening the next ad.`);
      return;
    }

    // Filter active links
    const activeLinks = adLinks.filter((l) => l.active);
    if (activeLinks.length === 0) {
      setErrorMessage('No active ad links available. Please contact the administrator.');
      return;
    }

    // Randomize which link is served to spread load
    const randomIndex = Math.floor(Math.random() * activeLinks.length);
    const chosenLink = activeLinks[randomIndex];
    setSelectedAd(chosenLink);

    // Initialize timing tracking refs
    accumulatedHiddenMsRef.current = 0;
    lastHiddenStartRef.current = Date.now();
    requiredSecondsRef.current = chosenLink.timerSeconds;
    isTimerActiveRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);

    // Server-side Anti-abuse claim session creation:
    // Create session BEFORE opening window so that if popup blocker triggers, session state & countdown are already active
    try {
      const sessionDocRef = await addDoc(collection(db, 'claimSessions'), {
        uid: currentUser.uid,
        adLinkId: chosenLink.id,
        timerSeconds: chosenLink.timerSeconds,
        startTime: Date.now(),
        accumulatedHiddenMs: 0,
        lastHiddenStart: Date.now(),
        completed: false,
      });

      activeSessionIdRef.current = sessionDocRef.id;
      setActiveSessionId(sessionDocRef.id);
      setCountdown(chosenLink.timerSeconds);
      setTimerRunning(true);
      setCanClaim(false);

      // Open link in new tab
      let popupOpened = false;
      try {
        const newWindow = window.open(chosenLink.url, '_blank', 'noopener,noreferrer');
        if (newWindow && !newWindow.closed && typeof newWindow.closed !== 'undefined') {
          popupOpened = true;
        }
      } catch {
        popupOpened = false;
      }

      if (!popupOpened) {
        setPopupBlocked(true);
        lastHiddenStartRef.current = null;
        isPausedRef.current = true;
        setIsPaused(true);
        setStatusMessage('⏸ Timer paused — switch back to the ad tab to continue');
      } else {
        setPopupBlocked(false);
        setStatusMessage(`Ad opened in new tab! Please wait ${chosenLink.timerSeconds} seconds to claim reward.`);

        // In case the tab didn't lose focus immediately, pause after brief delay if still visible
        setTimeout(() => {
          if (document.visibilityState === 'visible' && isTimerActiveRef.current) {
            const now = Date.now();
            if (lastHiddenStartRef.current !== null) {
              accumulatedHiddenMsRef.current += (now - lastHiddenStartRef.current);
              lastHiddenStartRef.current = null;
            }
            isPausedRef.current = true;
            setIsPaused(true);
            setStatusMessage('⏸ Timer paused — switch back to the ad tab to continue');

            if (activeSessionIdRef.current) {
              updateDoc(doc(db, 'claimSessions', activeSessionIdRef.current), {
                accumulatedHiddenMs: accumulatedHiddenMsRef.current,
                lastHiddenStart: null,
              }).catch(() => {});
            }
          }
        }, 350);
      }
    } catch (err: any) {
      console.error('Failed to create claim session:', err);
      setErrorMessage('Failed to start ad session. Please try again.');
      setTimerRunning(false);
      isTimerActiveRef.current = false;
    }
  };

  // Step 2: Claim Reward
  const handleClaimReward = async () => {
    if (!currentUser || !userProfile || !activeSessionId || !selectedAd) {
      return;
    }

    setIsProcessingClaim(true);
    setErrorMessage(null);

    try {
      // 1. Calculate latest accumulated hidden time
      const now = Date.now();
      let totalHidden = accumulatedHiddenMsRef.current;
      if (document.visibilityState === 'hidden' && lastHiddenStartRef.current !== null) {
        totalHidden += (now - lastHiddenStartRef.current);
      }

      const sessionRef = doc(db, 'claimSessions', activeSessionId);

      // Persist final accumulated hidden time to Firestore before retrieving for verification
      await updateDoc(sessionRef, {
        accumulatedHiddenMs: totalHidden,
        lastHiddenStart: null,
      });

      // 2. Anti-abuse verification: retrieve session from Firestore
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Claim session not found or invalid.');
      }

      const sessionData = sessionSnap.data() as ClaimSession;
      if (sessionData.completed) {
        throw new Error('This ad reward has already been claimed.');
      }

      // Check server-side:
      // (a) Wall-clock physical duration check (allowing 2s leeway for network)
      const elapsedWallMs = Date.now() - sessionData.startTime;
      const requiredMs = Math.max(0, (sessionData.timerSeconds - 2) * 1000);

      if (elapsedWallMs < requiredMs) {
        throw new Error(`Timer verification failed! Only ${(elapsedWallMs / 1000).toFixed(1)}s elapsed of required ${sessionData.timerSeconds}s.`);
      }

      // (b) Accumulated ad-tab hidden time check (must have spent required time on ad tab)
      const verifiedHiddenMs = sessionData.accumulatedHiddenMs ?? 0;
      if (verifiedHiddenMs < requiredMs) {
        throw new Error(`Timer verification failed! Ad was only viewed for ${(verifiedHiddenMs / 1000).toFixed(1)}s of required ${sessionData.timerSeconds}s. You must keep the ad tab open to earn PKR.`);
      }

      // Mark session completed
      await updateDoc(sessionRef, { completed: true });

      // 2. Variable Reward Calculation
      // Random reward between 0.05 and 0.30 PKR
      const minReward = REWARD_CONFIG.MIN_PKR;
      const maxReward = REWARD_CONFIG.MAX_PKR;
      const baseReward = minReward + Math.random() * (maxReward - minReward);

      // Streak Multiplier
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      let newStreak = userProfile.streakCount || 0;

      if (userProfile.lastActiveDate === yesterday) {
        newStreak += 1;
      } else if (userProfile.lastActiveDate !== today) {
        // missed days, start new streak
        newStreak = 1;
      }

      const streakDayIndex = Math.min(((newStreak - 1) % 7), 6);
      const streakMultiplier = STREAK_MULTIPLIERS[streakDayIndex];

      // Check for 1 in 20 (5%) jackpot bonus
      const isJackpot = Math.random() < REWARD_CONFIG.JACKPOT_CHANCE;
      let finalReward = baseReward * streakMultiplier;

      if (isJackpot) {
        // High bonus jackpot: 2.00 - 5.00 PKR
        const jackpotAmount = REWARD_CONFIG.JACKPOT_MIN + Math.random() * (REWARD_CONFIG.JACKPOT_MAX - REWARD_CONFIG.JACKPOT_MIN);
        finalReward = safeAdd(finalReward, jackpotAmount);
      }

      // Safe decimal rounding (4 to 6 internal decimals)
      finalReward = Math.round(finalReward * 1e6) / 1e6;

      // 3. Referral Commission & First-Ad bonus logic
      const isFirstEverAd = (userProfile.totalAdsWatched || 0) === 0;
      if (userProfile.referredBy) {
        try {
          const referrerDocRef = doc(db, 'users', userProfile.referredBy);
          const referrerSnap = await getDoc(referrerDocRef);

          if (referrerSnap.exists()) {
            const referrerData = referrerSnap.data();
            let bonusToAdd = 0;

            // First ad bonus of 2 PKR to referrer
            if (isFirstEverAd) {
              bonusToAdd = safeAdd(bonusToAdd, REWARD_CONFIG.REFERRAL_SIGNUP_BONUS_PKR);
            }

            // 5% ongoing commission
            const commission = Math.round(finalReward * REWARD_CONFIG.REFERRAL_COMMISSION_RATE * 1e6) / 1e6;
            bonusToAdd = safeAdd(bonusToAdd, commission);

            const newReferrerBalance = safeAdd(referrerData.balance || 0, bonusToAdd);
            const newReferrerEarnings = safeAdd(referrerData.referralEarnings || 0, bonusToAdd);

            await updateDoc(referrerDocRef, {
              balance: newReferrerBalance,
              referralEarnings: newReferrerEarnings,
            });
          }
        } catch (refErr) {
          console.warn('Could not update referrer bonus:', refErr);
        }
      }

      // 4. Update User Profile in Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const newBalance = safeAdd(userProfile.balance || 0, finalReward);
      const newTotalAds = (userProfile.totalAdsWatched || 0) + 1;
      const newTodayAds = (userProfile.todayAdsWatched || 0) + 1;
      const newTodayEarned = safeAdd(userProfile.todayEarned || 0, finalReward);

      await updateDoc(userDocRef, {
        balance: newBalance,
        streakCount: newStreak,
        lastActiveDate: today,
        totalAdsWatched: newTotalAds,
        todayAdsWatched: newTodayAds,
        todayEarned: newTodayEarned,
        todayDate: today,
        lastClaimTimestamp: Date.now(),
      });

      await refreshProfile();

      // Reset local state & initiate cooldown
      isTimerActiveRef.current = false;
      isPausedRef.current = false;
      setIsPaused(false);
      accumulatedHiddenMsRef.current = 0;
      lastHiddenStartRef.current = null;
      activeSessionIdRef.current = null;
      setCanClaim(false);
      setSelectedAd(null);
      setActiveSessionId(null);
      setCooldownRemaining(REWARD_CONFIG.COOLDOWN_SECONDS);

      if (isJackpot) {
        onJackpot(finalReward);
      } else if (newStreak > 0 && newStreak % 7 === 0 && userProfile.streakCount !== newStreak) {
        onStreakComplete(newStreak, 1.5);
      } else {
        setStatusMessage(`🎉 Reward claimed! Added ${formatPKR(finalReward, 4)} to your wallet.`);
      }
    } catch (err: any) {
      console.error('Claim error:', err);
      setErrorMessage(err.message || 'Failed to claim reward. Please try again.');
    } finally {
      setIsProcessingClaim(false);
    }
  };

  return (
    <div id="ad-watch-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-100/60 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
            <span>Adsterra High CPM Network</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Watch Short Ad & Claim PKR
          </h2>

          <p className="text-sm text-slate-600 max-w-xl">
            Click to open the sponsored sponsor link in a new tab, wait for the link's timer to complete, then instantly claim your PKR cash reward!
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Payouts
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              1-in-20 Jackpot Chance
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-bold">
              Today's Claims: {todayAds}/{REWARD_CONFIG.DAILY_MAX_CLAIMS}
            </span>
          </div>
        </div>

        {/* Action Button Box */}
        <div className="w-full md:w-auto flex flex-col items-center gap-3 shrink-0">
          {!timerRunning && !canClaim && (
            <button
              id="watch-ad-button"
              onClick={handleWatchAd}
              disabled={isDailyCapped || cooldownRemaining > 0}
              className={`w-full md:w-64 py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-95 ${
                isDailyCapped
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : cooldownRemaining > 0
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 cursor-pointer'
              }`}
            >
              {cooldownRemaining > 0 ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  <span>Cooldown ({cooldownRemaining}s)</span>
                </>
              ) : isDailyCapped ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Daily Cap Hit (20/20)</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6 fill-white text-emerald-600" />
                  <span>Watch Ad & Earn</span>
                </>
              )}
            </button>
          )}

          {/* Active Countdown or Paused State */}
          {timerRunning && (
            <div className="w-full md:w-64 space-y-2 text-center">
              {isPaused ? (
                <>
                  <button
                    id="timer-paused-btn"
                    disabled
                    className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-amber-50 text-amber-900 border-2 border-amber-300 flex items-center justify-center gap-2.5 cursor-not-allowed shadow-inner"
                  >
                    <PauseCircle className="w-5 h-5 text-amber-600 animate-pulse shrink-0" />
                    <span>⏸ Paused: {countdown}s Left</span>
                  </button>
                  <p className="text-[11px] font-semibold text-amber-700">
                    Switch back to the ad tab to resume countdown
                  </p>
                </>
              ) : (
                <>
                  <button
                    id="timer-running-disabled-btn"
                    disabled
                    className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center gap-2.5 cursor-not-allowed"
                  >
                    <Clock className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" />
                    <span>Wait {countdown}s to Claim</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Keep the ad tab open while the timer counts down
                  </p>
                </>
              )}
            </div>
          )}

          {/* Claim Reward Button */}
          {canClaim && (
            <div className="w-full md:w-64 space-y-2 text-center animate-in zoom-in-95 duration-200">
              <button
                id="claim-reward-button"
                onClick={handleClaimReward}
                disabled={isProcessingClaim}
                className="w-full py-4 px-6 rounded-2xl font-black text-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 animate-pulse cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-6 h-6 fill-white" />
                <span>{isProcessingClaim ? 'Verifying...' : 'Claim Reward!'}</span>
              </button>
              <p className="text-[11px] font-bold text-amber-700">
                Ad completed! Click now to add PKR to your balance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Paused Alert Banner */}
      {isPaused && timerRunning && (
        <div id="timer-paused-alert" className="mt-4 p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <PauseCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-bold">⏸ Timer paused — switch back to the ad tab to continue</span>
          </div>
          {selectedAd && (
            <a
              href={selectedAd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-extrabold text-amber-900 hover:text-amber-950 underline shrink-0 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <span>Back to Ad</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Popup Blocked Warning Message */}
      {popupBlocked && (
        <div id="popup-blocked-warning" className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-950">
              Browser Blocked Automatic New Tab
            </p>
            <p>
              Your timer is running! Click the direct link below to view the sponsor ad:
            </p>
            {selectedAd && (
              <a
                href={selectedAd.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPopupBlocked(false)}
                className="inline-flex items-center gap-1 mt-1 font-bold text-emerald-700 hover:text-emerald-800 underline"
              >
                <span>Click here to open sponsor ad link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Status or Error Notifications */}
      {statusMessage && !popupBlocked && !isPaused && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
