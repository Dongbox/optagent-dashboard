import type {
  BenchmarkRun,
  CommitHistoryData,
  JsonArtifact,
  LeaderboardData,
  ResultsIndex,
  RuntimeQualityData,
  StrategyComparisonData,
  TraceArtifact,
} from './types';

const DATA_ROOT = '/data';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchOptionalJson<T>(path: string): Promise<T | null> {
  const response = await fetch(path);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function dataPath(path: string): string {
  if (path.startsWith('/results/') || path.startsWith('/aggregates/')) {
    return `${DATA_ROOT}${path}`;
  }
  return path;
}

export function artifactPath(path: string): string {
  return dataPath(path.startsWith('/') ? path : `/${path}`);
}

export async function loadIndex(): Promise<ResultsIndex> {
  return fetchJson<ResultsIndex>(`${DATA_ROOT}/results/index.json`);
}

export async function loadLeaderboard(): Promise<LeaderboardData> {
  return fetchJson<LeaderboardData>(`${DATA_ROOT}/aggregates/leaderboard.json`);
}

export async function loadCommitHistory(): Promise<CommitHistoryData> {
  return fetchJson<CommitHistoryData>(`${DATA_ROOT}/aggregates/commit-history.json`);
}

export async function loadStrategyComparison(): Promise<StrategyComparisonData> {
  return fetchJson<StrategyComparisonData>(`${DATA_ROOT}/aggregates/strategy-comparison.json`);
}

export async function loadRuntimeQuality(): Promise<RuntimeQualityData> {
  return fetchJson<RuntimeQualityData>(`${DATA_ROOT}/aggregates/runtime-quality.json`);
}

export async function loadLocalDataNotice(): Promise<string | null> {
  const markerPath = `${DATA_ROOT}/LOCAL_DEV_DATA.md`;
  const response = await fetch(`${markerPath}?t=${Date.now()}`, { cache: 'no-store' });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${markerPath}: ${response.status}`);
  }
  const notice = await response.text();
  return notice.includes('scripts/sync_dashboard_local_data.py') ? notice : null;
}

export async function loadRun(runPath: string): Promise<BenchmarkRun> {
  return fetchJson<BenchmarkRun>(dataPath(runPath));
}

export async function loadTraceArtifact(path: string): Promise<TraceArtifact | null> {
  return fetchOptionalJson<TraceArtifact>(artifactPath(path));
}

export async function loadJsonArtifact(path: string): Promise<JsonArtifact | null> {
  return fetchOptionalJson<JsonArtifact>(artifactPath(path));
}
