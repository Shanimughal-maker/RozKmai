import { Gift, TrendingUp, CheckCircle2 } from 'lucide-react';
import { formatPKR, REWARD_CONFIG } from '../lib/constants';

interface ProgressCardProps {
  todayAdsWatched: number;
  todayEarned: number;
  totalAdsWatched: number;
}

export function ProgressCard({ todayAdsWatched, todayEarned, totalAdsWatched }: ProgressCardProps) {
  const dailyCap = REWARD_CONFIG.DAILY_MAX_CLAIMS;
  const milestoneInterval = REWARD_CONFIG.BONUS_EVERY_N_ADS;

  // Ads until next milestone bonus (e.g. every 5 ads)
  const remainder = totalAdsWatched % milestoneInterval;
  const adsUntilBonus = remainder === 0 && totalAdsWatched > 0 ? milestoneInterval : milestoneInterval - remainder;
  const milestoneProgress = ((milestoneInterval - adsUntilBonus) / milestoneInterval) * 100;

  const dailyProgressPercent = Math.min(100, Math.round((todayAdsWatched / dailyCap) * 100));

  return (
    <div id="progress-indicators-card" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Today's Earnings & Daily Cap */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Earned Today
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {todayAdsWatched} / {dailyCap} Ads
          </span>
        </div>

        <div className="my-3">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            {formatPKR(todayEarned, 4)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Updated instantly on every ad claim
          </p>
        </div>

        {/* Daily Cap Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
            <span>Daily Ad Limit</span>
            <span className="font-bold text-slate-800">{dailyProgressPercent}% used</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                todayAdsWatched >= dailyCap ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>
          {todayAdsWatched >= dailyCap && (
            <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Daily ad limit reached. Come back tomorrow!
            </p>
          )}
        </div>
      </div>

      {/* Ads Until Next Guaranteed Bonus */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Milestone Reward
            </span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            Every {milestoneInterval} Ads
          </span>
        </div>

        <div className="my-3">
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit']">
            {adsUntilBonus === milestoneInterval ? (
              <span className="text-teal-600">Bonus ready on next ad!</span>
            ) : (
              <span>
                <span className="text-teal-600">{adsUntilBonus} more</span> {adsUntilBonus === 1 ? 'ad' : 'ads'} for bonus
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Guaranteed high-tier multiplier and jackpot probability boost
          </p>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
            <span>Milestone Progress</span>
            <span className="font-bold text-slate-800">{Math.round(milestoneProgress)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
