import { Flame, Trophy } from 'lucide-react';
import { STREAK_MULTIPLIERS } from '../lib/constants';

interface StreakCardProps {
  streakCount: number;
}

export function StreakCard({ streakCount }: StreakCardProps) {
  // 7-day looping cycle
  const currentDayInCycle = ((streakCount - 1) % 7) + 1; // 1 to 7 when streakCount >= 1
  const effectiveDay = streakCount > 0 ? currentDayInCycle : 0;
  const currentMultiplier = streakCount > 0 ? STREAK_MULTIPLIERS[Math.min(effectiveDay - 1, 6)] : 1.0;

  return (
    <div id="streak-card" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
              <span>{streakCount} Day Streak</span>
              {streakCount >= 7 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  MAX BONUS
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Watch ads daily to unlock up to 3x multiplier
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Current Boost</span>
          <span className="text-lg font-black text-amber-600 font-['Outfit']">
            {currentMultiplier}x Reward
          </span>
        </div>
      </div>

      {/* 7-day progress indicator */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isDone = effectiveDay >= day;
          const isCurrent = effectiveDay === day;
          const multiplier = STREAK_MULTIPLIERS[day - 1];

          return (
            <div
              key={day}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${
                isDone
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              } ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
            >
              <span className={`text-[10px] font-bold ${isDone ? 'text-amber-100' : 'text-slate-400'}`}>
                Day {day}
              </span>
              <div className="my-1">
                {day === 7 ? (
                  <Trophy className={`w-4 h-4 ${isDone ? 'text-amber-100 fill-amber-100' : 'text-slate-400'}`} />
                ) : (
                  <Flame className={`w-3.5 h-3.5 ${isDone ? 'text-amber-200 fill-amber-200' : 'text-slate-300'}`} />
                )}
              </div>
              <span className={`text-[11px] font-extrabold ${isDone ? 'text-white' : 'text-slate-700'}`}>
                {multiplier}x
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
