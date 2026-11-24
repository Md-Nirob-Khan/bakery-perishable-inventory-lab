import React, { useMemo, useState } from 'react';
import { WEEKDAY_NAMES } from '../simulation/products';
import {
  DailyRecord,
  FrontierPoint,
  PolicyAggregateStats,
} from '../simulation/types';

/* -------------------------------------------------------------------------- */
/* 1. Monte Carlo Weekly Profit Distribution Histogram                        */
/* -------------------------------------------------------------------------- */

interface ProfitHistogramProps {
  nv: PolicyAggregateStats;
  aa: PolicyAggregateStats;
}

export const ProfitHistogramChart: React.FC<ProfitHistogramProps> = ({ nv, aa }) => {
  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const { bins, maxCount, minVal, binWidth } = useMemo(() => {
    const all = [...nv.trialProfits, ...aa.trialProfits];
    const minP = Math.min(...all);
    const maxP = Math.max(...all);
    const pad = Math.max(10, (maxP - minP) * 0.08);
    const lo = Math.floor((minP - pad) / 10) * 10;
    const hi = Math.ceil((maxP + pad) / 10) * 10;
    const numBins = 18;
    const width = Math.max(1, (hi - lo) / numBins);

    const binData = Array.from({ length: numBins }, (_, i) => ({
      index: i,
      x0: lo + i * width,
      x1: lo + (i + 1) * width,
      nvCount: 0,
      aaCount: 0,
    }));

    for (const v of nv.trialProfits) {
      const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - lo) / width)));
      binData[idx].nvCount += 1;
    }
    for (const v of aa.trialProfits) {
      const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - lo) / width)));
      binData[idx].aaCount += 1;
    }

    const peak = Math.max(
      1,
      ...binData.map((b) => Math.max(b.nvCount, b.aaCount))
    );

    return { bins: binData, maxCount: peak, minVal: lo, maxVal: hi, binWidth: width };
  }, [nv.trialProfits, aa.trialProfits]);

  const W = 640;
  const H = 260;
  const padL = 46;
  const padR = 16;
  const padT = 26;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const totalRange = bins.length * binWidth;

  const xPos = (val: number) => padL + ((val - minVal) / totalRange) * plotW;
  const yPos = (count: number) => padT + plotH - (count / maxCount) * plotH;

  const nvMeanX = xPos(nv.meanWeeklyProfit);
  const aaMeanX = xPos(aa.meanWeeklyProfit);

  const activeBin = hoverBin !== null ? bins[hoverBin] : null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-xs bg-amber-500/55 border border-amber-600" />
            <span className="font-medium text-slate-700">Simple Newsvendor</span>
            <span className="font-[family-name:var(--font-mono)] text-slate-500 tabular-nums">
              μ=${nv.meanWeeklyProfit.toFixed(0)}/wk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-xs bg-sky-600/55 border border-sky-700" />
            <span className="font-medium text-slate-700">Age-Aware Order-Up-To</span>
            <span className="font-[family-name:var(--font-mono)] text-sky-700 font-semibold tabular-nums">
              μ=${aa.meanWeeklyProfit.toFixed(0)}/wk
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-[family-name:var(--font-mono)] tabular-nums">
          {activeBin
            ? `Bin $${activeBin.x0.toFixed(0)}–$${activeBin.x1.toFixed(0)}: NV ${activeBin.nvCount} · AA ${activeBin.aaCount} trials`
            : `P5–P95: NV [$${nv.p5WeeklyProfit.toFixed(0)}, $${nv.p95WeeklyProfit.toFixed(0)}] · AA [$${aa.p5WeeklyProfit.toFixed(0)}, $${aa.p95WeeklyProfit.toFixed(0)}]`}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Monte Carlo Weekly Profit Histogram comparing Simple Newsvendor and Age-Aware Order-Up-To"
      >
        {/* Horizontal Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          const countLabel = Math.round(maxCount * t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray={t === 0 ? undefined : '3 3'}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-[family-name:var(--font-mono)]"
              >
                {countLabel}
              </text>
            </g>
          );
        })}

        {/* Histogram Bars */}
        {bins.map((b, idx) => {
          const bw = plotW / bins.length;
          const bx = padL + idx * bw;
          const nvH = (b.nvCount / maxCount) * plotH;
          const aaH = (b.aaCount / maxCount) * plotH;
          const isHover = hoverBin === idx;

          return (
            <g
              key={b.index}
              onMouseEnter={() => setHoverBin(idx)}
              onMouseLeave={() => setHoverBin(null)}
              className="cursor-crosshair"
            >
              {isHover && (
                <rect
                  x={bx}
                  y={padT}
                  width={bw}
                  height={plotH}
                  fill="#F1F5F9"
                />
              )}
              <rect
                x={bx + 1.5}
                y={yPos(b.nvCount)}
                width={Math.max(2, bw * 0.46)}
                height={nvH}
                rx={2}
                fill={isHover ? 'rgba(217, 119, 6, 0.85)' : 'rgba(245, 158, 11, 0.58)'}
                stroke="#D97706"
                strokeWidth={0.75}
              />
              <rect
                x={bx + bw * 0.48}
                y={yPos(b.aaCount)}
                width={Math.max(2, bw * 0.46)}
                height={aaH}
                rx={2}
                fill={isHover ? 'rgba(2, 132, 199, 0.85)' : 'rgba(2, 132, 199, 0.58)'}
                stroke="#0369A1"
                strokeWidth={0.75}
              />
            </g>
          );
        })}

        {/* Mean Vertical Markers */}
        <line
          x1={nvMeanX}
          x2={nvMeanX}
          y1={padT - 4}
          y2={padT + plotH}
          stroke="#B45309"
          strokeWidth={1.75}
          strokeDasharray="4 3"
        />
        <text
          x={nvMeanX}
          y={padT - 9}
          textAnchor="middle"
          className="fill-amber-700 text-[10px] font-semibold font-[family-name:var(--font-mono)]"
        >
          NV Mean
        </text>

        <line
          x1={aaMeanX}
          x2={aaMeanX}
          y1={padT - 4}
          y2={padT + plotH}
          stroke="#0369A1"
          strokeWidth={1.75}
          strokeDasharray="4 3"
        />
        <text
          x={aaMeanX}
          y={padT - 9}
          textAnchor="middle"
          className="fill-sky-700 text-[10px] font-semibold font-[family-name:var(--font-mono)]"
        >
          AA Mean
        </text>

        {/* X Axis Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = minVal + t * totalRange;
          const x = padL + t * plotW;
          return (
            <text
              key={t}
              x={x}
              y={H - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-[family-name:var(--font-mono)]"
            >
              ${val.toFixed(0)}
            </text>
          );
        })}
        <text
          x={padL + plotW / 2}
          y={H - 0}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          Weekly Net Profit ($/week)
        </text>
      </svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Weekly Unit Flow & Financial Breakdown                                  */
/* -------------------------------------------------------------------------- */

interface UnitDispositionProps {
  nv: PolicyAggregateStats;
  aa: PolicyAggregateStats;
  unitLabel: string;
}

export const UnitDispositionChart: React.FC<UnitDispositionProps> = ({
  nv,
  aa,
  unitLabel,
}) => {
  const rows = [
    {
      label: 'Simple Newsvendor',
      stats: nv,
      accent: 'text-amber-700',
    },
    {
      label: 'Age-Aware Order-Up-To',
      stats: aa,
      accent: 'text-sky-700',
    },
  ];

  const maxTotal = Math.max(
    1,
    nv.meanWeeklySoldFresh + nv.meanWeeklySoldAged + nv.meanWeeklyWaste + nv.meanWeeklyStockouts,
    aa.meanWeeklySoldFresh + aa.meanWeeklySoldAged + aa.meanWeeklyWaste + aa.meanWeeklyStockouts
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-sky-600" />
          Fresh Sold (Full Price)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-sky-300" />
          Day-Old Sold (Markdown)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
          Expired Waste
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
          Unmet Stockouts
        </span>
      </div>

      {rows.map(({ label, stats, accent }) => {
        const freshW = (stats.meanWeeklySoldFresh / maxTotal) * 100;
        const agedW = (stats.meanWeeklySoldAged / maxTotal) * 100;
        const wasteW = (stats.meanWeeklyWaste / maxTotal) * 100;
        const stockoutW = (stats.meanWeeklyStockouts / maxTotal) * 100;

        return (
          <div key={label} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className={`text-xs font-semibold ${accent}`}>{label}</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500 tabular-nums">
                Baked {stats.meanWeeklyProduced.toFixed(1)} {unitLabel}/wk · Demand{' '}
                {stats.meanWeeklyDemand.toFixed(1)}/wk
              </span>
            </div>

            <div className="w-full h-7 rounded-md bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${freshW}%` }}
                className="bg-sky-600 h-full transition-all duration-200"
                title={`Fresh Sold: ${stats.meanWeeklySoldFresh.toFixed(1)}/wk`}
              />
              <div
                style={{ width: `${agedW}%` }}
                className="bg-sky-300 h-full transition-all duration-200"
                title={`Day-Old Sold: ${stats.meanWeeklySoldAged.toFixed(1)}/wk`}
              />
              <div
                style={{ width: `${wasteW}%` }}
                className="bg-rose-500 h-full transition-all duration-200"
                title={`Expired Waste: ${stats.meanWeeklyWaste.toFixed(1)}/wk`}
              />
              <div
                style={{ width: `${stockoutW}%` }}
                className="bg-amber-400 h-full transition-all duration-200"
                title={`Unmet Stockouts: ${stats.meanWeeklyStockouts.toFixed(1)}/wk`}
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-[11px] font-[family-name:var(--font-mono)] tabular-nums text-slate-600">
              <span>Fresh: {stats.meanWeeklySoldFresh.toFixed(1)}</span>
              <span>Aged: {stats.meanWeeklySoldAged.toFixed(1)}</span>
              <span className="text-rose-700 font-medium">
                Waste: {stats.meanWeeklyWaste.toFixed(1)}
              </span>
              <span className="text-amber-700 font-medium">
                Stockout: {stats.meanWeeklyStockouts.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Weekday Seasonality & Holt-Winters Forecast Calibration                 */
/* -------------------------------------------------------------------------- */

interface WeekdayChartProps {
  trueWeights: number[];
  learnedWeights: number[];
  baseMean: number;
}

export const WeekdaySeasonalityChart: React.FC<WeekdayChartProps> = ({
  trueWeights,
  learnedWeights,
  baseMean,
}) => {
  const W = 540;
  const H = 200;
  const padL = 42;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxMult = Math.max(1.6, ...trueWeights, ...learnedWeights);
  const yPos = (m: number) => padT + plotH - (m / maxMult) * plotH;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-slate-300 border border-slate-400" />
            True Weekday Index
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-700 font-medium">
            <span className="w-3 h-0.5 bg-sky-600 inline-block" />
            Holt-Winters Smoothed Index (Ŝ)
          </span>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-slate-500 tabular-nums">
          Baseline μ = {baseMean}/day
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Weekday seasonality multipliers: true profile vs Holt-Winters learned indices"
      >
        {[0, 0.5, 1.0, 1.5].map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={tick === 1 ? '#CBD5E1' : '#E2E8F0'}
                strokeDasharray={tick === 1 ? '4 3' : '2 3'}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-[family-name:var(--font-mono)]"
              >
                {tick.toFixed(1)}×
              </text>
            </g>
          );
        })}

        {WEEKDAY_NAMES.map((day, idx) => {
          const colW = plotW / 7;
          const cx = padL + idx * colW + colW / 2;
          const barW = Math.min(28, colW * 0.44);
          const barY = yPos(trueWeights[idx]);
          const barH = padT + plotH - barY;
          return (
            <g key={day}>
              <rect
                x={cx - barW / 2}
                y={barY}
                width={barW}
                height={barH}
                rx={3}
                fill="#E2E8F0"
                stroke="#94A3B8"
                strokeWidth={0.75}
              />
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-600 text-[11px] font-medium"
              >
                {day}
              </text>
            </g>
          );
        })}

        {/* Learned Holt-Winters Polyline */}
        <polyline
          fill="none"
          stroke="#0284C7"
          strokeWidth={2.25}
          points={WEEKDAY_NAMES.map((_, idx) => {
            const colW = plotW / 7;
            const cx = padL + idx * colW + colW / 2;
            return `${cx},${yPos(learnedWeights[idx] ?? trueWeights[idx])}`;
          }).join(' ')}
        />
        {WEEKDAY_NAMES.map((day, idx) => {
          const colW = plotW / 7;
          const cx = padL + idx * colW + colW / 2;
          const cy = yPos(learnedWeights[idx] ?? trueWeights[idx]);
          return (
            <g key={`dot-${day}`}>
              <circle cx={cx} cy={cy} r={4} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1.5} />
              <text
                x={cx}
                y={cy - 9}
                textAnchor="middle"
                className="fill-sky-700 text-[10px] font-semibold font-[family-name:var(--font-mono)]"
              >
                {(learnedWeights[idx] ?? 1).toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Daily Inspector 7-Day Age-Cohort Stacked Bar Chart                      */
/* -------------------------------------------------------------------------- */

interface WeeklyTraceChartProps {
  days: DailyRecord[];
  selectedDayIndex: number;
  onSelectDay: (dayIdx: number) => void;
}

export const WeeklyAgeCohortChart: React.FC<WeeklyTraceChartProps> = ({
  days,
  selectedDayIndex,
  onSelectDay,
}) => {
  const W = 720;
  const H = 260;
  const padL = 46;
  const padR = 20;
  const padT = 22;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxY = Math.max(
    10,
    ...days.map((d) =>
      Math.max(
        d.startingAgedTotal + d.orderQuantity,
        d.trueDemand,
        d.forecastDemand
      )
    )
  );

  const yPos = (v: number) => padT + plotH - (v / maxY) * plotH;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-sky-600" />
          Fresh Bake (Age 0)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-amber-400" />
          Carried-Over Aged (Age 1+)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-900 inline-block" />
          Realized Demand
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-600 inline-block" />
          Holt-Winters Forecast
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Daily morning stock by age cohort vs realized demand and forecast"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + plotH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray={t === 0 ? undefined : '3 3'}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-[family-name:var(--font-mono)]"
              >
                {Math.round(maxY * t)}
              </text>
            </g>
          );
        })}

        {days.map((d, i) => {
          const colW = plotW / days.length;
          const cx = padL + i * colW + colW / 2;
          const barW = Math.min(44, colW * 0.48);
          const isSelected = d.dayIndex === selectedDayIndex;

          const agedH = (d.startingAgedTotal / maxY) * plotH;
          const freshH = (d.orderQuantity / maxY) * plotH;
          const agedY = padT + plotH - agedH;
          const freshY = agedY - freshH;

          return (
            <g
              key={d.dayIndex}
              onClick={() => onSelectDay(d.dayIndex)}
              className="cursor-pointer"
            >
              {isSelected && (
                <rect
                  x={padL + i * colW + 4}
                  y={padT - 4}
                  width={colW - 8}
                  height={plotH + 8}
                  rx={6}
                  fill="#F0F9FF"
                  stroke="#BAE6FD"
                />
              )}

              {/* Aged stock on bottom (FIFO issued first) */}
              {d.startingAgedTotal > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={agedY}
                  width={barW}
                  height={agedH}
                  fill="#FBBF24"
                  stroke="#D97706"
                  strokeWidth={0.75}
                />
              )}

              {/* Fresh bake stacked on top */}
              {d.orderQuantity > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={freshY}
                  width={barW}
                  height={freshH}
                  rx={2}
                  fill="#0284C7"
                  stroke="#0369A1"
                  strokeWidth={0.75}
                />
              )}

              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                className={`text-[11px] font-medium ${
                  isSelected ? 'fill-sky-700 font-semibold' : 'fill-slate-600'
                }`}
              >
                {d.weekdayName}
              </text>
            </g>
          );
        })}

        {/* Forecast dashed line */}
        <polyline
          fill="none"
          stroke="#059669"
          strokeWidth={2}
          strokeDasharray="5 4"
          points={days
            .map((d, i) => {
              const colW = plotW / days.length;
              const cx = padL + i * colW + colW / 2;
              return `${cx},${yPos(d.forecastDemand)}`;
            })
            .join(' ')}
        />

        {/* Realized demand solid line */}
        <polyline
          fill="none"
          stroke="#0F172A"
          strokeWidth={2.25}
          points={days
            .map((d, i) => {
              const colW = plotW / days.length;
              const cx = padL + i * colW + colW / 2;
              return `${cx},${yPos(d.trueDemand)}`;
            })
            .join(' ')}
        />

        {days.map((d, i) => {
          const colW = plotW / days.length;
          const cx = padL + i * colW + colW / 2;
          return (
            <circle
              key={`demand-${d.dayIndex}`}
              cx={cx}
              cy={yPos(d.trueDemand)}
              r={4}
              fill="#0F172A"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              onClick={() => onSelectDay(d.dayIndex)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Service Level Trade-Off Frontier Charts                                 */
/* -------------------------------------------------------------------------- */

interface FrontierChartProps {
  points: FrontierPoint[];
  currentServiceLevel: number;
  criticalFractileClassic: number;
}

export const FrontierCharts: React.FC<FrontierChartProps> = ({
  points,
  currentServiceLevel,
  criticalFractileClassic,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 580;
  const H = 250;
  const padL = 54;
  const padR = 18;
  const padT = 22;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const minSL = 0.5;
  const maxSL = 0.99;
  const xSL = (sl: number) => padL + ((sl - minSL) / (maxSL - minSL)) * plotW;

  const allProfits = points.flatMap((p) => [p.nvProfit, p.aaProfit]);
  const minP = Math.min(...allProfits);
  const maxP = Math.max(...allProfits);
  const pPad = Math.max(15, (maxP - minP) * 0.12);
  const yPMin = minP - pPad;
  const yPMax = maxP + pPad;
  const yProfit = (v: number) => padT + plotH - ((v - yPMin) / Math.max(1, yPMax - yPMin)) * plotH;

  const maxWastePct = Math.max(
    0.2,
    ...points.flatMap((p) => [p.nvWasteRate, p.aaWasteRate])
  );
  const yWaste = (v: number) => padT + plotH - (v / maxWastePct) * plotH;

  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Chart A: Profit vs Target Service Level */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Expected Weekly Profit vs. Target Service Level
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activePoint
                ? `SL ${(activePoint.serviceLevel * 100).toFixed(0)}%: Age-Aware $${activePoint.aaProfit.toFixed(0)} vs Newsvendor $${activePoint.nvProfit.toFixed(0)}`
                : 'Dashed vertical line marks your current service level slider'}
            </p>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const val = yPMin + t * (yPMax - yPMin);
            const y = padT + plotH * (1 - t);
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-[family-name:var(--font-mono)]"
                >
                  ${val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Critical Fractile Reference */}
          {criticalFractileClassic >= minSL && criticalFractileClassic <= maxSL && (
            <g>
              <line
                x1={xSL(criticalFractileClassic)}
                x2={xSL(criticalFractileClassic)}
                y1={padT}
                y2={padT + plotH}
                stroke="#94A3B8"
                strokeWidth={1.25}
                strokeDasharray="2 3"
              />
              <text
                x={xSL(criticalFractileClassic)}
                y={padT - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-[family-name:var(--font-mono)]"
              >
                CF*
              </text>
            </g>
          )}

          {/* Current SL vertical marker */}
          <line
            x1={xSL(currentServiceLevel)}
            x2={xSL(currentServiceLevel)}
            y1={padT}
            y2={padT + plotH}
            stroke="#0F172A"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#D97706"
            strokeWidth={2.25}
            points={points.map((p) => `${xSL(p.serviceLevel)},${yProfit(p.nvProfit)}`).join(' ')}
          />
          <polyline
            fill="none"
            stroke="#0284C7"
            strokeWidth={2.5}
            points={points.map((p) => `${xSL(p.serviceLevel)},${yProfit(p.aaProfit)}`).join(' ')}
          />

          {points.map((p, idx) => (
            <g
              key={p.serviceLevel}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={xSL(p.serviceLevel)}
                cy={yProfit(p.nvProfit)}
                r={hoverIdx === idx ? 5 : 3}
                fill="#D97706"
              />
              <circle
                cx={xSL(p.serviceLevel)}
                cy={yProfit(p.aaProfit)}
                r={hoverIdx === idx ? 5 : 3.5}
                fill="#0284C7"
              />
            </g>
          ))}

          {[0.5, 0.6, 0.7, 0.8, 0.9, 0.99].map((sl) => (
            <text
              key={sl}
              x={xSL(sl)}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-[family-name:var(--font-mono)]"
            >
              {Math.round(sl * 100)}%
            </text>
          ))}
        </svg>
      </div>

      {/* Chart B: Waste Rate vs Target Service Level */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Expiration Waste Rate vs. Target Service Level
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activePoint
                ? `SL ${(activePoint.serviceLevel * 100).toFixed(0)}%: Age-Aware ${(activePoint.aaWasteRate * 100).toFixed(1)}% vs Newsvendor ${(activePoint.nvWasteRate * 100).toFixed(1)}%`
                : 'Share of produced units expiring unsold across service level targets'}
            </p>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const val = t * maxWastePct * 100;
            const y = padT + plotH * (1 - t);
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-[family-name:var(--font-mono)]"
                >
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}

          <line
            x1={xSL(currentServiceLevel)}
            x2={xSL(currentServiceLevel)}
            y1={padT}
            y2={padT + plotH}
            stroke="#0F172A"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          <polyline
            fill="none"
            stroke="#D97706"
            strokeWidth={2.25}
            points={points.map((p) => `${xSL(p.serviceLevel)},${yWaste(p.nvWasteRate)}`).join(' ')}
          />
          <polyline
            fill="none"
            stroke="#0284C7"
            strokeWidth={2.5}
            points={points.map((p) => `${xSL(p.serviceLevel)},${yWaste(p.aaWasteRate)}`).join(' ')}
          />

          {points.map((p, idx) => (
            <g
              key={p.serviceLevel}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={xSL(p.serviceLevel)}
                cy={yWaste(p.nvWasteRate)}
                r={hoverIdx === idx ? 5 : 3}
                fill="#D97706"
              />
              <circle
                cx={xSL(p.serviceLevel)}
                cy={yWaste(p.aaWasteRate)}
                r={hoverIdx === idx ? 5 : 3.5}
                fill="#0284C7"
              />
            </g>
          ))}

          {[0.5, 0.6, 0.7, 0.8, 0.9, 0.99].map((sl) => (
            <text
              key={sl}
              x={xSL(sl)}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-[family-name:var(--font-mono)]"
            >
              {Math.round(sl * 100)}%
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
