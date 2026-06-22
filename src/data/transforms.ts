import type {
  CommitHistoryData,
  CommitHistorySeries,
  IndexRun,
  LeaderboardData,
  ResultsIndex,
  StrategyComparison,
  StrategyComparisonData,
} from './types';

export interface BenchmarkGroupSummary {
  group: string;
  caseCount: number;
  runCount: number;
  strategyCount: number;
  latestRun?: IndexRun;
  bestStrategy?: string;
  feasibleRate: number;
}

export function summarizeGroups(index: ResultsIndex, leaderboard: LeaderboardData): BenchmarkGroupSummary[] {
  return Object.keys(index.groups)
    .sort()
    .map((group) => {
      const runs = index.runs.filter((run) => run.benchmark_group === group);
      const latestRun = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const cases = new Set(runs.map((run) => run.benchmark_id));
      const strategies = Object.keys(index.groups[group] ?? {});
      const feasibleCount = runs.filter((run) => run.feasible).length;
      return {
        group,
        caseCount: cases.size,
        runCount: runs.length,
        strategyCount: strategies.length,
        latestRun,
        bestStrategy: leaderboard.groups[group]?.entries[0]?.strategy,
        feasibleRate: runs.length ? feasibleCount / runs.length : 0,
      };
    });
}

export function comparisonLabel(item: StrategyComparison): string {
  return `${item.benchmark_group} / ${item.benchmark_id} / ${item.tier}`;
}

export function firstComparison(data: StrategyComparisonData): StrategyComparison | undefined {
  return data.comparisons[0];
}

export function seriesLabel(series: CommitHistorySeries): string {
  return `${series.benchmark_group} / ${series.benchmark_id} / ${series.strategy} / 种子 ${series.seed}`;
}

export function firstSeries(data: CommitHistoryData): CommitHistorySeries | undefined {
  return data.series[0];
}

export function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function shortCommit(value: string | undefined): string {
  return value ? value.slice(0, 7) : 'unknown';
}
