import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PolicyKey, SimulationOutput } from '../simulation/types';
import { WeeklyAgeCohortChart } from './Charts';

interface DailyInspectorProps {
  output: SimulationOutput;
}

export const DailyInspector: React.FC<DailyInspectorProps> = ({ output }) => {
  const [policy, setPolicy] = useState<PolicyKey>('ageAwareOrderUpTo');
  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const days =
    policy === 'ageAwareOrderUpTo'
      ? output.representativeDaysAA
      : output.representativeDaysNV;

  const maxWeeks = output.params.weeks;
  const clampedWeek = Math.min(weekIdx, maxWeeks - 1);

  const weekDays = useMemo(() => {
    const start = clampedWeek * 7;
    return days.slice(start, start + 7);
  }, [days, clampedWeek]);

  const activeDay =
    weekDays.find((d) => d.dayIndex === selectedDayIdx) ?? weekDays[0];

  const handleChangeWeek = (nextWeek: number) => {
    const bounded = Math.max(0, Math.min(maxWeeks - 1, nextWeek));
    setWeekIdx(bounded);
    setSelectedDayIdx(bounded * 7);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
            Daily FIFO &amp; Age-Cohort Inspector
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspect Trial #1 day-by-day to trace how carried-over inventory ages, fulfills
            markdown-accepting customers FIFO, and drives daily bake decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Policy Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPolicy('ageAwareOrderUpTo')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                policy === 'ageAwareOrderUpTo'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Age-Aware Order-Up-To
            </button>
            <button
              type="button"
              onClick={() => setPolicy('simpleNewsvendor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                policy === 'simpleNewsvendor'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simple Newsvendor
            </button>
          </div>

          {/* Week Stepper */}
          <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
            <button
              type="button"
              onClick={() => handleChangeWeek(clampedWeek - 1)}
              disabled={clampedWeek === 0}
              aria-label="Previous week"
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-slate-800 px-2 tabular-nums whitespace-nowrap">
              Week {clampedWeek + 1} / {maxWeeks}
            </span>
            <button
              type="button"
              onClick={() => handleChangeWeek(clampedWeek + 1)}
              disabled={clampedWeek >= maxWeeks - 1}
              aria-label="Next week"
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7-Day Age-Cohort Stacked Chart */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Week {clampedWeek + 1} Morning Stock vs. Demand &amp; Forecast
          </h2>
          <span className="text-xs text-slate-500">Click any weekday bar to inspect FIFO steps</span>
        </div>
        <WeeklyAgeCohortChart
          days={weekDays}
          selectedDayIndex={activeDay?.dayIndex ?? 0}
          onSelectDay={setSelectedDayIdx}
        />
      </section>

      {/* Selected Day FIFO Walkthrough + 7-Day Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FIFO Walkthrough */}
        {activeDay && (
          <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
            <div>
              <div className="text-xs text-slate-500 font-[family-name:var(--font-mono)]">
                Day {activeDay.dayIndex + 1} · Week {activeDay.weekIndex + 1}
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900 mt-0.5">
                {activeDay.weekdayName} Operations Trace
              </h2>
            </div>

            <dl className="flex flex-col gap-3 text-xs divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <dt className="text-slate-600">1. Holt-Winters Forecast (D̂ₜ ± σ̂ₜ)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-medium text-slate-900 tabular-nums">
                  {activeDay.forecastDemand.toFixed(1)} ± {activeDay.forecastStd.toFixed(1)}
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">2. Morning Aged Carryover (Iₜ)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-medium text-amber-700 tabular-nums">
                  {activeDay.startingAgedTotal} units
                  {activeDay.startingAgedByAge.length > 0 && (
                    <span className="text-slate-500 ml-1">
                      [{activeDay.startingAgedByAge.map((v, i) => `${i + 1}d:${v}`).join(', ')}]
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">3. Morning Bake Order (Qₜ)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-semibold text-sky-700 tabular-nums">
                  {activeDay.orderQuantity} fresh units
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">4. Realized Demand (Fresh-Only / Flex)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-medium text-slate-900 tabular-nums">
                  {activeDay.trueDemand} ({activeDay.freshOnlyDemand} / {activeDay.flexibleDemand})
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">5. FIFO Aged Sold (Markdown)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-medium text-slate-900 tabular-nums">
                  {activeDay.agedSold} units (${activeDay.revenueMarkdown.toFixed(2)})
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">6. Fresh Sold (Full Price)</dt>
                <dd className="font-[family-name:var(--font-mono)] font-medium text-slate-900 tabular-nums">
                  {activeDay.freshSold} units (${activeDay.revenueFull.toFixed(2)})
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="text-slate-600">7. End-of-Day Waste &amp; Stockouts</dt>
                <dd className="font-[family-name:var(--font-mono)] tabular-nums">
                  <span className={activeDay.expiredWaste > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}>
                    {activeDay.expiredWaste} expired
                  </span>
                  <span className="text-slate-300 mx-1.5">·</span>
                  <span className={activeDay.stockouts > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'}>
                    {activeDay.stockouts} stockout
                  </span>
                </dd>
              </div>
              <div className="flex justify-between pt-3">
                <dt className="font-semibold text-slate-900">Net Day Profit (Πₜ)</dt>
                <dd
                  className={`font-[family-name:var(--font-mono)] font-semibold tabular-nums ${
                    activeDay.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  ${activeDay.profit.toFixed(2)}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {/* 7-Day Ledger Table */}
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            Week {clampedWeek + 1} Daily Inventory Ledger
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-2 font-medium">Day</th>
                <th className="py-2 px-2 text-right font-medium">Forecast</th>
                <th className="py-2 px-2 text-right font-medium">Aged In</th>
                <th className="py-2 px-2 text-right font-medium">Bake Qₜ</th>
                <th className="py-2 px-2 text-right font-medium">Demand</th>
                <th className="py-2 px-2 text-right font-medium">Fresh Sold</th>
                <th className="py-2 px-2 text-right font-medium">Aged Sold</th>
                <th className="py-2 px-2 text-right font-medium">Waste</th>
                <th className="py-2 px-2 text-right font-medium">Stockout</th>
                <th className="py-2 pl-2 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="font-[family-name:var(--font-mono)] tabular-nums divide-y divide-slate-100">
              {weekDays.map((d) => {
                const isSelected = activeDay?.dayIndex === d.dayIndex;
                return (
                  <tr
                    key={d.dayIndex}
                    onClick={() => setSelectedDayIdx(d.dayIndex)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 pr-2 font-[family-name:var(--font-sans)] font-medium text-slate-900">
                      {d.weekdayName}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500">
                      {d.forecastDemand.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2 text-right text-amber-700">
                      {d.startingAgedTotal}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-sky-700">
                      {d.orderQuantity}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-900">{d.trueDemand}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">{d.freshSold}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">{d.agedSold}</td>
                    <td
                      className={`py-2.5 px-2 text-right ${
                        d.expiredWaste > 0 ? 'text-rose-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {d.expiredWaste}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right ${
                        d.stockouts > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {d.stockouts}
                    </td>
                    <td
                      className={`py-2.5 pl-2 text-right font-medium ${
                        d.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ${d.profit.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
