import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { SimulationOutput } from '../simulation/types';
import {
  ProfitHistogramChart,
  UnitDispositionChart,
  WeekdaySeasonalityChart,
} from './Charts';

interface OverviewLabProps {
  output: SimulationOutput;
}

export const OverviewLab: React.FC<OverviewLabProps> = ({ output }) => {
  const [imgError, setImgError] = useState(false);
  const {
    product,
    params,
    markdownPrice,
    simpleNewsvendor: nv,
    ageAwareOrderUpTo: aa,
    learnedSeasonality,
  } = output;

  const profitDelta = aa.meanWeeklyProfit - nv.meanWeeklyProfit;
  const profitPctDelta =
    Math.abs(nv.meanWeeklyProfit) > 1
      ? (profitDelta / Math.abs(nv.meanWeeklyProfit)) * 100
      : 0;
  const wasteRateDeltaPp = (aa.meanWasteRate - nv.meanWasteRate) * 100;
  const stockoutDelta = aa.meanWeeklyStockouts - nv.meanWeeklyStockouts;
  const fillRateDeltaPp = (aa.meanFillRate - nv.meanFillRate) * 100;

  const isSingleDay = params.shelfLifeDays === 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Product & Economic Context Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
            {!imgError ? (
              <img
                src={product.imagePath}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-slate-500">{product.name}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500">
              {product.category} <span aria-hidden="true">·</span> {params.monteCarloTrials} Monte Carlo trials{' '}
              <span aria-hidden="true">·</span> {params.weeks}-week horizon
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900 mt-0.5">
              {product.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">{product.notes}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5">
          <div>
            <div className="text-[11px] text-slate-500">Fresh Margin</div>
            <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
              +${(product.unitPrice - product.unitCost).toFixed(2)}
            </div>
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500 tabular-nums">
              p=${product.unitPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Day-Old Margin</div>
            <div
              className={`font-[family-name:var(--font-mono)] text-sm font-semibold tabular-nums mt-0.5 ${
                markdownPrice >= product.unitCost ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {markdownPrice - product.unitCost >= 0 ? '+' : '-'}$
              {Math.abs(markdownPrice - product.unitCost).toFixed(2)}
            </div>
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500 tabular-nums">
              pₘ=${markdownPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Expiration Cost</div>
            <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-rose-700 tabular-nums mt-0.5">
              -${(product.unitCost + params.wasteDisposalCost).toFixed(2)}
            </div>
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500 tabular-nums">
              c+w (${params.wasteDisposalCost.toFixed(2)} w)
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Fresh-Only Share</div>
            <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
              {Math.round(params.freshOnlyShare * 100)}%
            </div>
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500 tabular-nums">
              θ={params.freshOnlyShare.toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      {isSingleDay && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-xl px-5 py-3 text-xs text-slate-700">
          <span className="font-semibold text-sky-900">Single-Period Collapse (M = 1 day):</span>{' '}
          With a 1-day shelf life, zero inventory carries overnight. Both policies reduce to the
          classical Newsvendor order quantity, producing identical profit, waste, and fill rate.
          Slide Shelf Life to 2 or 3 days to observe multi-period FIFO dynamics.
        </div>
      )}

      {/* 4-Column KPI Comparison Strip */}
      <section aria-label="Policy Comparison Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Weekly Profit */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Mean Weekly Profit</span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold font-[family-name:var(--font-mono)] tabular-nums ${
                profitDelta > 0.5
                  ? 'text-emerald-700'
                  : profitDelta < -0.5
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {profitDelta > 0.5 ? (
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : profitDelta < -0.5 ? (
                <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {profitDelta >= 0 ? '+' : '-'}${Math.abs(profitDelta).toFixed(2)}/wk
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] text-sky-700 font-medium">Age-Aware</div>
              <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-slate-900 tabular-nums">
                ${aa.meanWeeklyProfit.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-amber-700 font-medium">Simple NV</div>
              <div className="font-[family-name:var(--font-mono)] text-base font-medium text-slate-600 tabular-nums">
                ${nv.meanWeeklyProfit.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">
            {profitPctDelta >= 0 ? '+' : ''}
            {profitPctDelta.toFixed(1)}% profit lift · σ=${aa.stdWeeklyProfit.toFixed(0)}
          </div>
        </div>

        {/* KPI 2: Expiration Waste */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Expiration Waste Rate</span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold font-[family-name:var(--font-mono)] tabular-nums ${
                wasteRateDeltaPp < -0.1
                  ? 'text-emerald-700'
                  : wasteRateDeltaPp > 0.1
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {wasteRateDeltaPp <= 0 ? '' : '+'}
              {wasteRateDeltaPp.toFixed(1)} pp
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] text-sky-700 font-medium">Age-Aware</div>
              <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-slate-900 tabular-nums">
                {(aa.meanWasteRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-amber-700 font-medium">Simple NV</div>
              <div className="font-[family-name:var(--font-mono)] text-base font-medium text-slate-600 tabular-nums">
                {(nv.meanWasteRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">
            {aa.meanWeeklyWaste.toFixed(1)} vs {nv.meanWeeklyWaste.toFixed(1)} expired/wk
          </div>
        </div>

        {/* KPI 3: Weekly Stockouts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Unmet Demand (Stockouts)</span>
            <span
              className={`text-xs font-semibold font-[family-name:var(--font-mono)] tabular-nums ${
                stockoutDelta <= 0.5 ? 'text-slate-700' : 'text-amber-700'
              }`}
            >
              {stockoutDelta >= 0 ? '+' : ''}
              {stockoutDelta.toFixed(1)} units/wk
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] text-sky-700 font-medium">Age-Aware</div>
              <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-slate-900 tabular-nums">
                {aa.meanWeeklyStockouts.toFixed(1)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-amber-700 font-medium">Simple NV</div>
              <div className="font-[family-name:var(--font-mono)] text-base font-medium text-slate-600 tabular-nums">
                {nv.meanWeeklyStockouts.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">
            CSL: {(aa.meanCycleServiceLevel * 100).toFixed(1)}% vs{' '}
            {(nv.meanCycleServiceLevel * 100).toFixed(1)}%
          </div>
        </div>

        {/* KPI 4: Volume Fill Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Volume Fill Rate (Type-2)</span>
            <span
              className={`text-xs font-semibold font-[family-name:var(--font-mono)] tabular-nums ${
                fillRateDeltaPp >= -0.3 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {fillRateDeltaPp >= 0 ? '+' : ''}
              {fillRateDeltaPp.toFixed(2)} pp
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-[11px] text-sky-700 font-medium">Age-Aware</div>
              <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-slate-900 tabular-nums">
                {(aa.meanFillRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-amber-700 font-medium">Simple NV</div>
              <div className="font-[family-name:var(--font-mono)] text-base font-medium text-slate-600 tabular-nums">
                {(nv.meanFillRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">
            Markdown share: {(aa.meanMarkdownShare * 100).toFixed(1)}% of sales
          </div>
        </div>
      </section>

      {/* Primary Chart: Monte Carlo Profit Distribution */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Monte Carlo Weekly Profit Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Empirical distribution across {params.monteCarloTrials} paired simulations using Common
            Random Numbers (CRN) and Holt-Winters weekday demand forecasting.
          </p>
        </div>
        <ProfitHistogramChart nv={nv} aa={aa} />
      </section>

      {/* Secondary Row: Unit Disposition & Financial Ledger + Weekday Seasonality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Weekly Unit Disposition &amp; P&amp;L Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              How morning production converts into full-price sales, FIFO markdown clearance, or
              disposal waste.
            </p>
          </div>

          <UnitDispositionChart nv={nv} aa={aa} unitLabel={product.unitLabel} />

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-t border-slate-100">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 font-medium">Weekly Line Item</th>
                  <th className="py-2 text-right font-medium text-amber-700">Simple NV</th>
                  <th className="py-2 text-right font-medium text-sky-700">Age-Aware</th>
                  <th className="py-2 text-right font-medium">Difference</th>
                </tr>
              </thead>
              <tbody className="font-[family-name:var(--font-mono)] tabular-nums divide-y divide-slate-100">
                <tr>
                  <td className="py-2 font-[family-name:var(--font-sans)] text-slate-700">
                    Full-Price Revenue
                  </td>
                  <td className="py-2 text-right text-slate-700">
                    ${nv.meanWeeklyRevenueFull.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-slate-900">
                    ${aa.meanWeeklyRevenueFull.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {aa.meanWeeklyRevenueFull - nv.meanWeeklyRevenueFull >= 0 ? '+' : '-'}$
                    {Math.abs(aa.meanWeeklyRevenueFull - nv.meanWeeklyRevenueFull).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-[family-name:var(--font-sans)] text-slate-700">
                    Day-Old Markdown Revenue
                  </td>
                  <td className="py-2 text-right text-slate-700">
                    ${nv.meanWeeklyRevenueMarkdown.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-slate-900">
                    ${aa.meanWeeklyRevenueMarkdown.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {aa.meanWeeklyRevenueMarkdown - nv.meanWeeklyRevenueMarkdown >= 0 ? '+' : '-'}$
                    {Math.abs(aa.meanWeeklyRevenueMarkdown - nv.meanWeeklyRevenueMarkdown).toFixed(
                      2
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-[family-name:var(--font-sans)] text-slate-700">
                    Baking Production Cost
                  </td>
                  <td className="py-2 text-right text-slate-700">
                    -${nv.meanWeeklyProductionCost.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-slate-900">
                    -${aa.meanWeeklyProductionCost.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-emerald-700">
                    {nv.meanWeeklyProductionCost - aa.meanWeeklyProductionCost >= 0 ? 'Saves ' : '+'}
                    ${Math.abs(nv.meanWeeklyProductionCost - aa.meanWeeklyProductionCost).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-[family-name:var(--font-sans)] text-slate-700">
                    Waste Disposal Cost
                  </td>
                  <td className="py-2 text-right text-rose-700">
                    -${nv.meanWeeklyDisposalCost.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-rose-700">
                    -${aa.meanWeeklyDisposalCost.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-emerald-700">
                    {nv.meanWeeklyDisposalCost - aa.meanWeeklyDisposalCost >= 0 ? 'Saves ' : '+'}
                    ${Math.abs(nv.meanWeeklyDisposalCost - aa.meanWeeklyDisposalCost).toFixed(2)}
                  </td>
                </tr>
                <tr className="font-semibold bg-slate-50/70">
                  <td className="py-2 font-[family-name:var(--font-sans)] text-slate-900">
                    Net Weekly Profit
                  </td>
                  <td className="py-2 text-right text-amber-800">
                    ${nv.meanWeeklyProfit.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-sky-800">
                    ${aa.meanWeeklyProfit.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 text-right ${
                      profitDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {profitDelta >= 0 ? '+' : '-'}${Math.abs(profitDelta).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Weekday Seasonality &amp; Holt-Winters Forecast
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multiplicative exponential smoothing learns the Mon–Sun bakery traffic rhythm from
              noisy daily demand realizations without oracle knowledge.
            </p>
          </div>
          <WeekdaySeasonalityChart
            trueWeights={product.weekdayWeights}
            learnedWeights={learnedSeasonality}
            baseMean={product.baseDailyMean}
          />
          <div className="border-t border-slate-100 pt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-[family-name:var(--font-mono)] tabular-nums">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, idx) => (
              <div key={d} className="py-1">
                <div className="text-slate-500">{d}</div>
                <div className="font-semibold text-slate-900">
                  {Math.round(product.baseDailyMean * (learnedSeasonality[idx] ?? 1))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
