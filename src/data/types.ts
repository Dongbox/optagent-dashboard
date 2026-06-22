export type RunStatus = 'success' | 'error' | string;

export interface IndexRun {
  run_id: string;
  benchmark_group: string;
  benchmark_id: string;
  family: string;
  tier: string;
  strategy: string;
  strategy_profile: string;
  seed: number;
  optagent_commit: string;
  benchmark_commit: string;
  created_at: string;
  status: RunStatus;
  feasible: boolean;
  summary_path: string;
}

export interface ResultsIndex {
  schema_version: number;
  generated_at: string;
  runs: IndexRun[];
  groups: Record<string, Record<string, string[]>>;
}

export interface LeaderboardEntry {
  rank: number;
  benchmark_group: string;
  strategy: string;
  run_count: number;
  success_rate: number;
  feasible_rate: number;
  best_run_id: string;
  best_summary_path: string;
  best_objective: number | null;
  best_cost: number | null;
  best_gap_rel: number | null;
  best_runtime_ms: number | null;
  latest_created_at: string;
  optagent_commit: string;
  optagent_commit_url: string;
}

export interface LeaderboardGroup {
  benchmark_count: number;
  strategy_count: number;
  run_count: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardData {
  schema_version: number;
  generated_at: string;
  groups: Record<string, LeaderboardGroup>;
}

export interface CommitHistoryPoint {
  commit: string;
  commit_url: string;
  created_at: string;
  run_id: string;
  summary_path: string;
  status: RunStatus;
  feasible: boolean;
  objective: number | null;
  best_cost: number | null;
  gap_rel: number | null;
  runtime_ms: number | null;
}

export interface CommitHistorySeries {
  key: string;
  benchmark_group: string;
  benchmark_id: string;
  strategy: string;
  seed: number;
  metric: string;
  points: CommitHistoryPoint[];
}

export interface CommitHistoryData {
  schema_version: number;
  generated_at: string;
  series: CommitHistorySeries[];
}

export interface StrategySummary {
  strategy: string;
  run_count: number;
  success_rate: number;
  feasible_rate: number;
  best_run_id: string;
  best_summary_path: string;
  best_objective: number | null;
  best_cost: number | null;
  best_gap_rel: number | null;
  avg_runtime_ms: number | null;
  latest_run_id: string;
  latest_summary_path: string;
  latest_status: RunStatus;
  latest_feasible: boolean;
  latest_created_at: string;
}

export interface StrategyComparison {
  benchmark_group: string;
  benchmark_id: string;
  tier: string;
  strategies: StrategySummary[];
}

export interface StrategyComparisonData {
  schema_version: number;
  generated_at: string;
  comparisons: StrategyComparison[];
}

export interface RuntimeQualityPoint {
  run_id: string;
  summary_path: string;
  benchmark_group: string;
  benchmark_id: string;
  family: string;
  tier: string;
  strategy: string;
  strategy_profile: string;
  seed: number;
  created_at: string;
  optagent_commit: string;
  optagent_commit_url: string;
  status: RunStatus;
  feasible: boolean;
  runtime_ms: number | null;
  objective: number | null;
  best_cost: number | null;
  gap_rel: number | null;
  time_to_first_feasible_ms: number | null;
  time_to_best_ms: number | null;
  evaluations_per_s: number | null;
  improvement_per_second: number | null;
}

export interface RuntimeQualityData {
  schema_version: number;
  generated_at: string;
  points: RuntimeQualityPoint[];
}

export interface BenchmarkRun {
  schema_version: number;
  run_id: string;
  benchmark_group: string;
  benchmark_id: string;
  family: string;
  tier: string;
  strategy: string;
  strategy_profile: string;
  strategy_config: Record<string, unknown>;
  seed: number;
  optagent: {
    version: string;
    commit: string;
    commit_url: string;
    wheel_sha256: string;
  };
  benchmarks: {
    commit: string;
    commit_url: string;
  };
  environment: Record<string, string>;
  metrics: Record<string, number | string | boolean | null>;
  artifacts: Record<string, string>;
  created_at: string;
}

export interface TraceEvent {
  step?: number;
  iteration?: number;
  elapsed_ms?: number;
  elapsed_s?: number;
  best_cost?: number | null;
  objective?: number | null;
  cost?: number | null;
  event_type?: string;
  phase?: string;
}

export interface TraceArtifact {
  events?: TraceEvent[];
  points?: TraceEvent[];
  trace?: TraceEvent[];
}

export type JsonArtifact = Record<string, unknown> | unknown[];
