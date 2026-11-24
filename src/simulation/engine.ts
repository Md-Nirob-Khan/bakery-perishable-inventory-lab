import {
  createRng,
  inverseNormalCDF,
  mean,
  quantile,
  sampleBinomial,
  sampleStandardNormal,
  stdDev,
} from './math';
import { PRODUCT_MAP, WEEKDAY_NAMES } from './products';
import {
  BakeryProduct,
  DailyRecord,
  FrontierPoint,
  PolicyAggregateStats,
  PolicyKey,
  SimulationOutput,
  SimulationParams,
  TrialSummary,
} from './types';

interface HoltWintersState {
  level: number;
  seasonal: number[]; // length 7, normalized to mean 1.0
  baseStd: number;
}

const ALPHA_LEVEL = 0.14;
const GAMMA_SEASONAL = 0.18;
const BETA_STD = 0.14;
const BURN_IN_WEEKS = 4;

function normalizeSeasonality(seasonal: number[]): void {
  const sum = seasonal.reduce((a, b) => a + b, 0);
  if (sum <= 0) return;
  const scale = 7 / sum;
  for (let i = 0; i < 7; i++) {
    seasonal[i] = Math.max(0.25, seasonal[i] * scale);
  }
}

function initHoltWinters(burnInDemands: number[], product: BakeryProduct): HoltWintersState {
  // First 14 days (2 full weeks) establish initial level and weekday seasonal indices
  const initDays = Math.min(14, burnInDemands.length);
  let total = 0;
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < initDays; i++) {
    const w = i % 7;
    total += burnInDemands[i];
    weekdayTotals[w] += burnInDemands[i];
    weekdayCounts[w] += 1;
  }

  let level = Math.max(1, total / Math.max(1, initDays));
  const seasonal = weekdayTotals.map((wt, idx) => {
    const avgW = wt / Math.max(1, weekdayCounts[idx]);
    return Math.max(0.3, avgW / level);
  });
  normalizeSeasonality(seasonal);

  let baseStd = Math.max(1, product.baseDailyMean * product.demandCV);

  // Smooth remaining burn-in days (days 14..27) so forecasts enter Day 1 well calibrated
  for (let t = initDays; t < burnInDemands.length; t++) {
    const w = t % 7;
    const d = burnInDemands[t];
    const forecast = level * seasonal[w];
    const err = Math.abs(d - forecast) / Math.max(0.25, seasonal[w]);
    const madToStd = err * Math.sqrt(Math.PI / 2);

    const prevSeasonal = seasonal[w];
    level = ALPHA_LEVEL * (Math.max(1, d) / prevSeasonal) + (1 - ALPHA_LEVEL) * level;
    seasonal[w] = GAMMA_SEASONAL * (Math.max(1, d) / Math.max(1, level)) + (1 - GAMMA_SEASONAL) * prevSeasonal;
    normalizeSeasonality(seasonal);
    baseStd = BETA_STD * madToStd + (1 - BETA_STD) * baseStd;
  }

  return { level, seasonal, baseStd };
}

function updateHoltWinters(state: HoltWintersState, weekday: number, observedDemand: number): void {
  const prevSeasonal = state.seasonal[weekday];
  const forecast = state.level * prevSeasonal;
  const err = Math.abs(observedDemand - forecast) / Math.max(0.25, prevSeasonal);
  const madToStd = err * Math.sqrt(Math.PI / 2);

  const newLevel =
    ALPHA_LEVEL * (Math.max(1, observedDemand) / Math.max(0.25, prevSeasonal)) +
    (1 - ALPHA_LEVEL) * state.level;
  const newSeasonal =
    GAMMA_SEASONAL * (Math.max(1, observedDemand) / Math.max(1, newLevel)) +
    (1 - GAMMA_SEASONAL) * prevSeasonal;

  state.level = newLevel;
  state.seasonal[weekday] = newSeasonal;
  normalizeSeasonality(state.seasonal);
  state.baseStd = Math.max(1, BETA_STD * madToStd + (1 - BETA_STD) * state.baseStd);
}

function computeOrderQuantity(
  policy: PolicyKey,
  forecastToday: number,
  forecastTomorrow: number,
  forecastStd: number,
  agedBuckets: number[], // [age1, age2, ..., age_{M-1}]
  params: SimulationParams
): number {
  const z = inverseNormalCDF(params.targetServiceLevel);
  const baseTarget = forecastToday + z * forecastStd;

  if (policy === 'simpleNewsvendor' || params.shelfLifeDays <= 1) {
    return Math.max(0, Math.round(baseTarget));
  }

  // Age-Aware Order-Up-To Policy:
  // 1. Fresh-only segment floor ensures fresh-seeking customers hit target service level.
  const theta = params.freshOnlyShare;
  const freshMean = theta * forecastToday;
  const freshVar = Math.pow(theta * forecastStd, 2) + theta * (1 - theta) * Math.max(1, forecastToday);
  const freshFloor = Math.max(0, Math.round(freshMean + z * Math.sqrt(freshVar)));

  // 2. Compute usable aged inventory credit against today's flexible demand capacity.
  const totalAged = agedBuckets.reduce((s, v) => s + v, 0);
  if (totalAged <= 0) {
    return Math.max(freshFloor, Math.round(baseTarget));
  }

  const flexShare = 1 - theta;
  const flexStd = flexShare * forecastStd;
  const todayFlexCap = Math.max(0, flexShare * forecastToday + 0.5 * z * flexStd);

  // Oldest stock (index M-2, i.e., age M-1) expires tonight if not absorbed by today's flexible customers.
  // Younger aged stock (age < M-1) survives into tomorrow if unsold today, so we also credit
  // a modest lookahead buffer when tomorrow's weekday demand is strong.
  const oldestIdx = agedBuckets.length - 1;
  const oldestStock = agedBuckets[oldestIdx] ?? 0;
  const youngerAged = totalAged - oldestStock;

  const usableOldest = Math.min(oldestStock, todayFlexCap);
  const remainingTodayCap = Math.max(0, todayFlexCap - usableOldest);
  const tomorrowFlexLookahead =
    params.shelfLifeDays >= 3 ? 0.35 * flexShare * forecastTomorrow : 0;
  const usableYounger = Math.min(youngerAged, remainingTodayCap + tomorrowFlexLookahead);

  const usableAgedCredit = usableOldest + usableYounger;
  const orderUpToQty = Math.round(baseTarget - usableAgedCredit);

  return Math.max(freshFloor, orderUpToQty);
}

interface DayDemandOutcome {
  totalDemand: number;
  freshOnlyDemand: number;
  flexibleDemand: number;
}

function runSingleTrial(
  trialIndex: number,
  product: BakeryProduct,
  params: SimulationParams,
  recordDaily: boolean
): {
  summaryNV: TrialSummary;
  summaryAA: TrialSummary;
  daysNV: DailyRecord[];
  daysAA: DailyRecord[];
  finalSeasonality: number[];
} {
  const rng = createRng(params.seed + trialIndex * 7919 + 104729);
  const burnInDays = BURN_IN_WEEKS * 7;
  const evalDays = params.weeks * 7;

  // Generate shared demand stream (Common Random Numbers for fair policy comparison)
  const burnInDemands: number[] = new Array(burnInDays);
  for (let t = 0; t < burnInDays; t++) {
    const w = t % 7;
    const mu = product.baseDailyMean * product.weekdayWeights[w];
    const sigma = mu * product.demandCV;
    burnInDemands[t] = Math.max(0, Math.round(mu + sigma * sampleStandardNormal(rng)));
  }

  const evalDemands: DayDemandOutcome[] = new Array(evalDays);
  for (let t = 0; t < evalDays; t++) {
    const w = t % 7;
    const mu = product.baseDailyMean * product.weekdayWeights[w];
    const sigma = mu * product.demandCV;
    const totalDemand = Math.max(0, Math.round(mu + sigma * sampleStandardNormal(rng)));
    const freshOnlyDemand = sampleBinomial(totalDemand, params.freshOnlyShare, rng);
    evalDemands[t] = {
      totalDemand,
      freshOnlyDemand,
      flexibleDemand: totalDemand - freshOnlyDemand,
    };
  }

  const initialHW = initHoltWinters(burnInDemands, product);

  const simulatePolicy = (
    policy: PolicyKey
  ): { summary: TrialSummary; days: DailyRecord[]; hw: HoltWintersState } => {
    const hw: HoltWintersState = {
      level: initialHW.level,
      seasonal: [...initialHW.seasonal],
      baseStd: initialHW.baseStd,
    };

    const M = params.shelfLifeDays;
    // agedBuckets[0] = age 1 day, ..., agedBuckets[M-2] = age M-1 days
    let agedBuckets: number[] = M > 1 ? new Array(M - 1).fill(0) : [];

    const markdownPrice = product.unitPrice * (1 - params.markdownPercent);
    const days: DailyRecord[] = [];

    let totalProfit = 0;
    let totalRevFull = 0;
    let totalRevMd = 0;
    let totalProdCost = 0;
    let totalDispCost = 0;
    let totalProduced = 0;
    let totalDemand = 0;
    let totalSoldFresh = 0;
    let totalSoldAged = 0;
    let totalWaste = 0;
    let totalStockouts = 0;
    let stockoutDays = 0;

    for (let t = 0; t < evalDays; t++) {
      const weekday = t % 7;
      const nextWeekday = (t + 1) % 7;
      const forecastToday = hw.level * hw.seasonal[weekday];
      const forecastTomorrow = hw.level * hw.seasonal[nextWeekday];
      const forecastStd = hw.baseStd * hw.seasonal[weekday];

      const startingAgedSnapshot = [...agedBuckets];
      const startingAgedTotal = agedBuckets.reduce((s, v) => s + v, 0);

      const orderQty = computeOrderQuantity(
        policy,
        forecastToday,
        forecastTomorrow,
        forecastStd,
        agedBuckets,
        params
      );

      const { totalDemand: dTotal, freshOnlyDemand: dFresh, flexibleDemand: dFlex } = evalDemands[t];

      // Step 1: FIFO issuing of aged stock to flexible customers (oldest age M-1 down to age 1)
      let remFlex = dFlex;
      let agedSold = 0;
      const remainingAged = [...agedBuckets];

      for (let idx = remainingAged.length - 1; idx >= 0; idx--) {
        if (remFlex <= 0) break;
        const take = Math.min(remainingAged[idx], remFlex);
        remainingAged[idx] -= take;
        remFlex -= take;
        agedSold += take;
      }

      // Step 2: Fresh production (age 0) serves fresh-only demand + any unsatisfied flexible demand
      const totalFreshDemand = dFresh + remFlex;
      const freshSold = Math.min(orderQty, totalFreshDemand);
      const unsoldFresh = orderQty - freshSold;
      const stockouts = totalFreshDemand - freshSold;

      // Attribute stockouts proportionally if fresh ran out
      const freshStockouts =
        totalFreshDemand > 0 ? Math.round(stockouts * (dFresh / totalFreshDemand)) : 0;

      // Step 3: End-of-day expiration and aging
      let expiredWaste = 0;
      let nextAgedBuckets: number[] = [];

      if (M <= 1) {
        expiredWaste = unsoldFresh;
      } else {
        expiredWaste = remainingAged[M - 2]; // oldest cohort expires at end of day
        nextAgedBuckets = new Array(M - 1).fill(0);
        nextAgedBuckets[0] = unsoldFresh;
        for (let idx = 1; idx < M - 1; idx++) {
          nextAgedBuckets[idx] = remainingAged[idx - 1];
        }
      }

      agedBuckets = nextAgedBuckets;

      const revenueFull = freshSold * product.unitPrice;
      const revenueMarkdown = agedSold * markdownPrice;
      const productionCost = orderQty * product.unitCost;
      const disposalCost = expiredWaste * params.wasteDisposalCost;
      const profit = revenueFull + revenueMarkdown - productionCost - disposalCost;

      totalProfit += profit;
      totalRevFull += revenueFull;
      totalRevMd += revenueMarkdown;
      totalProdCost += productionCost;
      totalDispCost += disposalCost;
      totalProduced += orderQty;
      totalDemand += dTotal;
      totalSoldFresh += freshSold;
      totalSoldAged += agedSold;
      totalWaste += expiredWaste;
      totalStockouts += stockouts;
      if (stockouts > 0) stockoutDays++;

      if (recordDaily) {
        days.push({
          dayIndex: t,
          weekIndex: Math.floor(t / 7),
          weekdayIndex: weekday,
          weekdayName: WEEKDAY_NAMES[weekday],
          trueDemand: dTotal,
          forecastDemand: forecastToday,
          forecastStd,
          freshOnlyDemand: dFresh,
          flexibleDemand: dFlex,
          startingAgedByAge: startingAgedSnapshot,
          startingAgedTotal,
          orderQuantity: orderQty,
          freshSold,
          agedSold,
          expiredWaste,
          stockouts,
          freshStockouts,
          endingCarryover: nextAgedBuckets.reduce((s, v) => s + v, 0),
          revenueFull,
          revenueMarkdown,
          productionCost,
          disposalCost,
          profit,
        });
      }

      // Step 4: Update Holt-Winters forecast with observed demand
      updateHoltWinters(hw, weekday, dTotal);
    }

    const totalSold = totalSoldFresh + totalSoldAged;
    const summary: TrialSummary = {
      trialIndex,
      weeklyProfit: totalProfit / params.weeks,
      totalProfit,
      weeklyRevenueFull: totalRevFull / params.weeks,
      weeklyRevenueMarkdown: totalRevMd / params.weeks,
      weeklyProductionCost: totalProdCost / params.weeks,
      weeklyDisposalCost: totalDispCost / params.weeks,
      weeklyProducedUnits: totalProduced / params.weeks,
      weeklyDemandUnits: totalDemand / params.weeks,
      weeklySoldFresh: totalSoldFresh / params.weeks,
      weeklySoldAged: totalSoldAged / params.weeks,
      weeklyWasteUnits: totalWaste / params.weeks,
      weeklyStockoutUnits: totalStockouts / params.weeks,
      wasteRate: totalProduced > 0 ? totalWaste / totalProduced : 0,
      fillRate: totalDemand > 0 ? totalSold / totalDemand : 1,
      cycleServiceLevel: 1 - stockoutDays / evalDays,
      markdownShareOfSales: totalSold > 0 ? totalSoldAged / totalSold : 0,
    };

    return { summary, days, hw };
  };

  const resNV = simulatePolicy('simpleNewsvendor');
  const resAA = simulatePolicy('ageAwareOrderUpTo');

  return {
    summaryNV: resNV.summary,
    summaryAA: resAA.summary,
    daysNV: resNV.days,
    daysAA: resAA.days,
    finalSeasonality: resAA.hw.seasonal,
  };
}

function aggregateTrials(
  policy: PolicyKey,
  label: string,
  trials: TrialSummary[]
): PolicyAggregateStats {
  const profits = trials.map((t) => t.weeklyProfit);
  const sortedProfits = [...profits].sort((a, b) => a - b);
  const avgProfit = mean(profits);

  return {
    policy,
    label,
    meanWeeklyProfit: avgProfit,
    stdWeeklyProfit: stdDev(profits, avgProfit),
    p5WeeklyProfit: quantile(sortedProfits, 0.05),
    p50WeeklyProfit: quantile(sortedProfits, 0.50),
    p95WeeklyProfit: quantile(sortedProfits, 0.95),
    meanWeeklyRevenueFull: mean(trials.map((t) => t.weeklyRevenueFull)),
    meanWeeklyRevenueMarkdown: mean(trials.map((t) => t.weeklyRevenueMarkdown)),
    meanWeeklyProductionCost: mean(trials.map((t) => t.weeklyProductionCost)),
    meanWeeklyDisposalCost: mean(trials.map((t) => t.weeklyDisposalCost)),
    meanWeeklyProduced: mean(trials.map((t) => t.weeklyProducedUnits)),
    meanWeeklyDemand: mean(trials.map((t) => t.weeklyDemandUnits)),
    meanWeeklySoldFresh: mean(trials.map((t) => t.weeklySoldFresh)),
    meanWeeklySoldAged: mean(trials.map((t) => t.weeklySoldAged)),
    meanWeeklyWaste: mean(trials.map((t) => t.weeklyWasteUnits)),
    meanWeeklyStockouts: mean(trials.map((t) => t.weeklyStockoutUnits)),
    meanWasteRate: mean(trials.map((t) => t.wasteRate)),
    meanFillRate: mean(trials.map((t) => t.fillRate)),
    meanCycleServiceLevel: mean(trials.map((t) => t.cycleServiceLevel)),
    meanMarkdownShare: mean(trials.map((t) => t.markdownShareOfSales)),
    trialProfits: profits,
    trialWasteRates: trials.map((t) => t.wasteRate),
    trialFillRates: trials.map((t) => t.fillRate),
  };
}

export function runMonteCarloSimulation(params: SimulationParams): SimulationOutput {
  const product = PRODUCT_MAP[params.productId];
  const nvTrials: TrialSummary[] = [];
  const aaTrials: TrialSummary[] = [];

  let representativeDaysNV: DailyRecord[] = [];
  let representativeDaysAA: DailyRecord[] = [];
  let learnedSeasonality: number[] = [...product.weekdayWeights];

  for (let i = 0; i < params.monteCarloTrials; i++) {
    const isRep = i === 0;
    const outcome = runSingleTrial(i, product, params, isRep);
    nvTrials.push(outcome.summaryNV);
    aaTrials.push(outcome.summaryAA);
    if (isRep) {
      representativeDaysNV = outcome.daysNV;
      representativeDaysAA = outcome.daysAA;
      learnedSeasonality = outcome.finalSeasonality;
    }
  }

  const markdownPrice = product.unitPrice * (1 - params.markdownPercent);
  const cu = product.unitPrice - product.unitCost;
  const coClassic = product.unitCost + params.wasteDisposalCost;
  const coMarkdown = Math.max(0.01, product.unitCost - markdownPrice);

  const criticalFractileClassic = Math.max(0, Math.min(0.999, cu / (cu + coClassic)));
  const criticalFractileMarkdown =
    markdownPrice >= product.unitCost ? 0.99 : Math.max(0, Math.min(0.999, cu / (cu + coMarkdown)));

  return {
    params,
    product,
    markdownPrice,
    criticalFractileClassic,
    criticalFractileMarkdown,
    simpleNewsvendor: aggregateTrials('simpleNewsvendor', 'Simple Newsvendor', nvTrials),
    ageAwareOrderUpTo: aggregateTrials('ageAwareOrderUpTo', 'Age-Aware Order-Up-To', aaTrials),
    representativeDaysNV,
    representativeDaysAA,
    learnedSeasonality,
  };
}

export function runServiceLevelFrontier(params: SimulationParams): FrontierPoint[] {
  const product = PRODUCT_MAP[params.productId];
  const levels = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.88, 0.91, 0.94, 0.96, 0.98, 0.99];
  const sweepTrials = Math.min(params.monteCarloTrials, 45);
  const sweepWeeks = Math.min(params.weeks, 20);

  return levels.map((sl) => {
    const localParams: SimulationParams = {
      ...params,
      targetServiceLevel: sl,
      weeks: sweepWeeks,
      monteCarloTrials: sweepTrials,
    };
    const nvTrials: TrialSummary[] = [];
    const aaTrials: TrialSummary[] = [];

    for (let i = 0; i < sweepTrials; i++) {
      const outcome = runSingleTrial(i, product, localParams, false);
      nvTrials.push(outcome.summaryNV);
      aaTrials.push(outcome.summaryAA);
    }

    return {
      serviceLevel: sl,
      nvProfit: mean(nvTrials.map((t) => t.weeklyProfit)),
      aaProfit: mean(aaTrials.map((t) => t.weeklyProfit)),
      nvWasteRate: mean(nvTrials.map((t) => t.wasteRate)),
      aaWasteRate: mean(aaTrials.map((t) => t.wasteRate)),
      nvFillRate: mean(nvTrials.map((t) => t.fillRate)),
      aaFillRate: mean(aaTrials.map((t) => t.fillRate)),
      nvStockouts: mean(nvTrials.map((t) => t.weeklyStockoutUnits)),
      aaStockouts: mean(aaTrials.map((t) => t.weeklyStockoutUnits)),
    };
  });
}
