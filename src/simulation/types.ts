export type ProductId =
  | 'sourdough'
  | 'baguette'
  | 'croissant'
  | 'muffin'
  | 'cinnamon_roll'
  | 'bagel';

export interface BakeryProduct {
  id: ProductId;
  name: string;
  category: string;
  unitLabel: string;
  imagePath: string;
  unitCost: number;
  unitPrice: number;
  baseDailyMean: number;
  demandCV: number;
  freshOnlyShare: number;
  defaultShelfLife: number;
  weekdayWeights: [number, number, number, number, number, number, number]; // Mon..Sun, mean = 1.0
  notes: string;
}

export interface SimulationParams {
  productId: ProductId;
  shelfLifeDays: number; // M in {1, 2, 3, 4}
  markdownPercent: number; // delta in [0.10, 0.75]
  wasteDisposalCost: number; // w in [0, 2.50]
  targetServiceLevel: number; // alpha_SL in [0.50, 0.99]
  freshOnlyShare: number; // theta in [0, 1]
  weeks: number; // horizon in weeks
  monteCarloTrials: number; // number of simulated paths
  seed: number;
}

export type PolicyKey = 'simpleNewsvendor' | 'ageAwareOrderUpTo';

export interface DailyRecord {
  dayIndex: number; // 0..totalDays-1
  weekIndex: number; // 0..weeks-1
  weekdayIndex: number; // 0=Mon .. 6=Sun
  weekdayName: string;
  trueDemand: number;
  forecastDemand: number;
  forecastStd: number;
  freshOnlyDemand: number;
  flexibleDemand: number;
  startingAgedByAge: number[]; // index 0 = age 1, index 1 = age 2, ...
  startingAgedTotal: number;
  orderQuantity: number;
  freshSold: number;
  agedSold: number;
  expiredWaste: number;
  stockouts: number;
  freshStockouts: number;
  endingCarryover: number;
  revenueFull: number;
  revenueMarkdown: number;
  productionCost: number;
  disposalCost: number;
  profit: number;
}

export interface TrialSummary {
  trialIndex: number;
  weeklyProfit: number;
  totalProfit: number;
  weeklyRevenueFull: number;
  weeklyRevenueMarkdown: number;
  weeklyProductionCost: number;
  weeklyDisposalCost: number;
  weeklyProducedUnits: number;
  weeklyDemandUnits: number;
  weeklySoldFresh: number;
  weeklySoldAged: number;
  weeklyWasteUnits: number;
  weeklyStockoutUnits: number;
  wasteRate: number; // expired / produced
  fillRate: number; // sold / demand (Type-2)
  cycleServiceLevel: number; // fraction of days with zero stockout (Type-1)
  markdownShareOfSales: number; // agedSold / totalSold
}

export interface PolicyAggregateStats {
  policy: PolicyKey;
  label: string;
  meanWeeklyProfit: number;
  stdWeeklyProfit: number;
  p5WeeklyProfit: number;
  p50WeeklyProfit: number;
  p95WeeklyProfit: number;
  meanWeeklyRevenueFull: number;
  meanWeeklyRevenueMarkdown: number;
  meanWeeklyProductionCost: number;
  meanWeeklyDisposalCost: number;
  meanWeeklyProduced: number;
  meanWeeklyDemand: number;
  meanWeeklySoldFresh: number;
  meanWeeklySoldAged: number;
  meanWeeklyWaste: number;
  meanWeeklyStockouts: number;
  meanWasteRate: number;
  meanFillRate: number;
  meanCycleServiceLevel: number;
  meanMarkdownShare: number;
  trialProfits: number[];
  trialWasteRates: number[];
  trialFillRates: number[];
}

export interface SimulationOutput {
  params: SimulationParams;
  product: BakeryProduct;
  markdownPrice: number;
  criticalFractileClassic: number;
  criticalFractileMarkdown: number;
  simpleNewsvendor: PolicyAggregateStats;
  ageAwareOrderUpTo: PolicyAggregateStats;
  representativeDaysNV: DailyRecord[];
  representativeDaysAA: DailyRecord[];
  learnedSeasonality: number[]; // final smoothed weekday indices
}

export interface FrontierPoint {
  serviceLevel: number;
  nvProfit: number;
  aaProfit: number;
  nvWasteRate: number;
  aaWasteRate: number;
  nvFillRate: number;
  aaFillRate: number;
  nvStockouts: number;
  aaStockouts: number;
}
