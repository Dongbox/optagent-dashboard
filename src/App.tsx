import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ExternalLink,
  FileJson,
  GitCommit,
  ListTree,
  Search,
  XCircle,
} from 'lucide-react';
import { EChart, type ChartOption } from './charts/EChart';
import {
  artifactPath,
  loadCommitHistory,
  loadIndex,
  loadLeaderboard,
  loadLocalDataNotice,
  loadJsonArtifact,
  loadRun,
  loadRuntimeQuality,
  loadStrategyComparison,
  loadTraceArtifact,
} from './data/client';
import {
  comparisonLabel,
  firstComparison,
  firstSeries,
  formatNumber,
  formatPercent,
  seriesLabel,
  shortCommit,
  summarizeGroups,
} from './data/transforms';
import type {
  BenchmarkRun,
  CommitHistoryData,
  CommitHistorySeries,
  ResultsIndex,
  RuntimeQualityData,
  StrategyComparison,
  StrategyComparisonData,
  LeaderboardData,
  TraceArtifact,
  TraceEvent,
} from './data/types';

type View = 'benchmarks' | 'strategies' | 'commits' | 'runs';

interface DashboardData {
  index: ResultsIndex;
  leaderboard: LeaderboardData;
  commitHistory: CommitHistoryData;
  strategyComparison: StrategyComparisonData;
  runtimeQuality: RuntimeQualityData;
  localDataNotice: string | null;
}

const navItems: Array<{ view: View; label: string; icon: typeof Boxes }> = [
  { view: 'benchmarks', label: '问题集', icon: Boxes },
  { view: 'strategies', label: '策略对比', icon: BarChart3 },
  { view: 'commits', label: '提交趋势', icon: GitCommit },
  { view: 'runs', label: '运行详情', icon: FileJson },
];

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => initialView());
  const [selectedRunPath, setSelectedRunPath] = useState<string | null>(null);

  useEffect(() => {
    const syncViewFromHash = () => setView(initialView());
    window.addEventListener('hashchange', syncViewFromHash);
    return () => window.removeEventListener('hashchange', syncViewFromHash);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    }
  }, [view]);

  useEffect(() => {
    Promise.all([
      loadIndex(),
      loadLeaderboard(),
      loadCommitHistory(),
      loadStrategyComparison(),
      loadRuntimeQuality(),
      loadLocalDataNotice(),
    ])
      .then(([index, leaderboard, commitHistory, strategyComparison, runtimeQuality, localDataNotice]) => {
        setData({ index, leaderboard, commitHistory, strategyComparison, runtimeQuality, localDataNotice });
        setSelectedRunPath(index.runs[0]?.summary_path ?? null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, []);

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="看板导航">
        <div className="brand">
          <span className="brand-mark">OA</span>
          <div>
            <strong>OptAgent</strong>
            <span>基准评测看板</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                className={view === item.view ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => setView(item.view)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="build-note">
          <span>静态数据</span>
          <strong>{data ? `${data.index.runs.length} 次运行` : '加载中'}</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">求解器持续评测</p>
            <h1>{navItems.find((item) => item.view === view)?.label}</h1>
          </div>
          {data ? <DataStamp generatedAt={data.index.generated_at} /> : null}
        </header>

        {error ? <ErrorState message={error} /> : null}
        {!error && !data ? <LoadingState /> : null}
        {data?.localDataNotice ? <LocalDataBanner notice={data.localDataNotice} /> : null}
        {data && view === 'benchmarks' ? <BenchmarksPage data={data} onOpenRun={setSelectedRunPath} setView={setView} /> : null}
        {data && view === 'strategies' ? <StrategyPage data={data} onOpenRun={setSelectedRunPath} setView={setView} /> : null}
        {data && view === 'commits' ? <CommitPage data={data} onOpenRun={setSelectedRunPath} setView={setView} /> : null}
        {data && view === 'runs' ? (
          <RunDetailPage
            index={data.index}
            selectedRunPath={selectedRunPath}
            onSelectRun={setSelectedRunPath}
          />
        ) : null}
      </section>
    </main>
  );
}

function initialView(): View {
  const raw = window.location.hash.replace('#', '');
  return navItems.some((item) => item.view === raw) ? (raw as View) : 'benchmarks';
}

function DataStamp({ generatedAt }: { generatedAt: string }) {
  return (
    <div className="data-stamp">
      <span>生成时间</span>
      <strong>{generatedAt}</strong>
    </div>
  );
}

function LoadingState() {
  return <div className="state">正在从 public/data 加载评测数据...</div>;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="state error">
      <XCircle size={18} />
      <span>{message}</span>
    </div>
  );
}

function LocalDataBanner({ notice }: { notice: string }) {
  const source = notice.match(/source run: `([^`]+)`/)?.[1] ?? '本地 suite run';
  return (
    <div className="local-data-banner">
      <strong>本地联调数据</strong>
      <span>当前页面读取的是本地同步数据，不是 CI 可比历史。</span>
      <code>{source}</code>
    </div>
  );
}

function BenchmarksPage({
  data,
  onOpenRun,
  setView,
}: {
  data: DashboardData;
  onOpenRun: (path: string) => void;
  setView: (view: View) => void;
}) {
  const summaries = useMemo(() => summarizeGroups(data.index, data.leaderboard), [data]);
  const runtimeChart = runtimeQualityOption(data.runtimeQuality);

  return (
    <div className="page-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">问题集</p>
            <h2>覆盖范围</h2>
          </div>
          <span className="pill">{summaries.length} 个分组</span>
        </div>
        <div className="benchmark-list">
          {summaries.map((summary) => (
            <article className="benchmark-row" key={summary.group}>
              <div>
                <strong>{summary.group}</strong>
                <span>{summary.caseCount} 个 case · {summary.strategyCount} 个策略</span>
                {summary.latestRun ? (
                  <button
                    className="link-button inline-action"
                    type="button"
                    onClick={() => {
                      onOpenRun(summary.latestRun?.summary_path ?? '');
                      setView('runs');
                    }}
                  >
                    打开最近运行
                  </button>
                ) : null}
              </div>
              <Metric label="运行数" value={String(summary.runCount)} />
              <Metric label="可行率" value={formatPercent(summary.feasibleRate)} />
              <Metric label="当前最佳策略" value={summary.bestStrategy ?? 'n/a'} />
              <Metric label="最近提交" value={summary.latestRun ? shortCommit(summary.latestRun.optagent_commit) : 'n/a'} />
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">耗时 / 质量</p>
            <h2>最近样本点</h2>
          </div>
        </div>
        <EChart option={runtimeChart} label="耗时与质量散点图" />
      </section>

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">排行榜</p>
            <h2>各分组当前最佳</h2>
          </div>
        </div>
        <DenseTable
          columns={['分组', '排名', '策略', '最佳成本', '可行率']}
          rows={Object.entries(data.leaderboard.groups).flatMap(([group, value]) =>
            value.entries.map((entry) => [
              group,
              String(entry.rank),
              entry.strategy,
              formatNumber(entry.best_cost),
              formatPercent(entry.feasible_rate),
            ]),
          )}
        />
      </section>
    </div>
  );
}

function StrategyPage({
  data,
  onOpenRun,
  setView,
}: {
  data: DashboardData;
  onOpenRun: (path: string) => void;
  setView: (view: View) => void;
}) {
  const [key, setKey] = useState(() => firstComparison(data.strategyComparison) ? comparisonLabel(firstComparison(data.strategyComparison)!) : '');
  const selected = data.strategyComparison.comparisons.find((item) => comparisonLabel(item) === key) ?? firstComparison(data.strategyComparison);

  if (!selected) {
    return <div className="state">暂无策略对比数据。</div>;
  }

  return (
    <div className="page-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">同一 case 的策略比较</p>
            <h2>{selected.benchmark_id}</h2>
          </div>
          <select value={comparisonLabel(selected)} onChange={(event) => setKey(event.target.value)}>
            {data.strategyComparison.comparisons.map((item) => (
              <option key={comparisonLabel(item)} value={comparisonLabel(item)}>
                {comparisonLabel(item)}
              </option>
            ))}
          </select>
        </div>
        <EChart option={strategyComparisonOption(selected)} label="策略最佳成本与运行时间对比" />
      </section>

      <section className="panel wide">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">策略明细</p>
            <h2>质量、可行性、运行时间</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>策略</th>
              <th>最佳成本</th>
              <th>差距</th>
              <th>耗时</th>
              <th>可行率</th>
              <th>最近运行</th>
            </tr>
          </thead>
          <tbody>
            {selected.strategies.map((strategy) => (
              <tr key={strategy.strategy}>
                <td><strong>{strategy.strategy}</strong></td>
                <td>{formatNumber(strategy.best_cost)}</td>
                <td>{formatPercent(strategy.best_gap_rel)}</td>
                <td>{formatNumber(strategy.avg_runtime_ms, 1)} ms</td>
                <td><Status ok={strategy.feasible_rate > 0} label={formatPercent(strategy.feasible_rate)} /></td>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => {
                      onOpenRun(strategy.latest_summary_path);
                      setView('runs');
                    }}
                  >
                    {strategy.latest_run_id}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function CommitPage({
  data,
  onOpenRun,
  setView,
}: {
  data: DashboardData;
  onOpenRun: (path: string) => void;
  setView: (view: View) => void;
}) {
  const [key, setKey] = useState(() => firstSeries(data.commitHistory) ? seriesLabel(firstSeries(data.commitHistory)!) : '');
  const selected = data.commitHistory.series.find((item) => seriesLabel(item) === key) ?? firstSeries(data.commitHistory);

  if (!selected) {
    return <div className="state">暂无提交趋势数据。</div>;
  }

  return (
    <div className="page-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">按 OptAgent commit 追踪</p>
            <h2>{selected.strategy} / {selected.benchmark_id}</h2>
          </div>
          <select value={seriesLabel(selected)} onChange={(event) => setKey(event.target.value)}>
            {data.commitHistory.series.map((series) => (
              <option key={series.key} value={seriesLabel(series)}>
                {seriesLabel(series)}
              </option>
            ))}
          </select>
        </div>
        <EChart option={commitHistoryOption(selected)} label="按提交查看评测质量趋势" />
      </section>

      <section className="panel wide">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">提交点</p>
            <h2>打开运行记录或源码提交</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>提交</th>
              <th>状态</th>
              <th>最佳成本</th>
              <th>耗时</th>
              <th>创建时间</th>
              <th>运行记录</th>
            </tr>
          </thead>
          <tbody>
            {selected.points.map((point) => (
              <tr key={point.run_id}>
                <td>
                  <a href={point.commit_url} target="_blank" rel="noreferrer">
                    {shortCommit(point.commit)} <ExternalLink size={13} />
                  </a>
                </td>
                <td><Status ok={point.feasible} label={statusLabel(point.status)} /></td>
                <td>{formatNumber(point.best_cost)}</td>
                <td>{formatNumber(point.runtime_ms, 1)} ms</td>
                <td>{point.created_at}</td>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => {
                      onOpenRun(point.summary_path);
                      setView('runs');
                    }}
                  >
                    {point.run_id}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RunDetailPage({
  index,
  selectedRunPath,
  onSelectRun,
}: {
  index: ResultsIndex;
  selectedRunPath: string | null;
  onSelectRun: (path: string) => void;
}) {
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'error' | 'success'>('all');
  const [groupFilter, setGroupFilter] = useState('all');

  const groups = useMemo(() => {
    return Array.from(new Set(index.runs.map((item) => item.benchmark_group))).sort();
  }, [index.runs]);

  const filteredRuns = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return index.runs.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesGroup = groupFilter === 'all' || item.benchmark_group === groupFilter;
      const matchesQuery = !needle || [
        item.run_id,
        item.benchmark_group,
        item.benchmark_id,
        item.family,
        item.strategy,
        item.strategy_profile,
        item.optagent_commit,
        item.benchmark_commit,
      ].some((value) => value.toLowerCase().includes(needle));
      return matchesStatus && matchesGroup && matchesQuery;
    });
  }, [groupFilter, index.runs, query, statusFilter]);

  const latestError = useMemo(() => index.runs.find((item) => item.status === 'error'), [index.runs]);
  const latestSuccess = useMemo(() => index.runs.find((item) => item.status === 'success'), [index.runs]);

  useEffect(() => {
    if (!selectedRunPath) {
      return;
    }
    setError(null);
    loadRun(selectedRunPath)
      .then(setRun)
      .catch((reason: unknown) => {
        setRun(null);
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, [selectedRunPath]);

  useEffect(() => {
    if (filteredRuns.length === 0) {
      return;
    }
    if (selectedRunPath && filteredRuns.some((item) => item.summary_path === selectedRunPath)) {
      return;
    }
    onSelectRun(filteredRuns[0].summary_path);
  }, [filteredRuns, onSelectRun, selectedRunPath]);

  return (
    <div className="page-grid">
      <section className="panel wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">运行上下文</p>
            <h2>{run?.run_id ?? '选择一次运行'}</h2>
          </div>
          <div className="run-actions" aria-label="运行快捷入口">
            <button
              className="secondary-button"
              type="button"
              disabled={!latestError}
              onClick={() => latestError ? onSelectRun(latestError.summary_path) : undefined}
            >
              最新失败
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!latestSuccess}
              onClick={() => latestSuccess ? onSelectRun(latestSuccess.summary_path) : undefined}
            >
              最新成功
            </button>
          </div>
        </div>
        <div className="run-filter-bar">
          <label className="search-box">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 run、case、策略或 commit"
            />
          </label>
          <select
            aria-label="按状态筛选运行"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'error' | 'success')}
          >
            <option value="all">全部状态</option>
            <option value="error">只看失败</option>
            <option value="success">只看成功</option>
          </select>
          <select
            aria-label="按问题集筛选运行"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="all">全部问题集</option>
            {groups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
          <select
            aria-label="选择运行记录"
            value={selectedRunPath ?? ''}
            onChange={(event) => onSelectRun(event.target.value)}
          >
            {filteredRuns.map((item) => (
              <option key={item.summary_path} value={item.summary_path}>
                {statusLabel(item.status)} · {item.run_id}
              </option>
            ))}
          </select>
          <span className="filter-count">{filteredRuns.length} / {index.runs.length} 次运行</span>
        </div>
        {filteredRuns.length === 0 ? <div className="state muted-state">没有匹配的运行记录。</div> : null}
        {error ? <ErrorState message={error} /> : null}
        {run ? <RunSummary run={run} /> : <div className="state">正在加载运行摘要...</div>}
      </section>
    </div>
  );
}

function RunSummary({ run }: { run: BenchmarkRun }) {
  const metricRows = Object.entries(run.metrics).map(([key, value]) => [key, String(value ?? 'n/a')]);
  const environmentRows = Object.entries(run.environment).map(([key, value]) => [key, value]);
  const isError = run.metrics.status === 'error';

  return (
    <div className="run-layout">
      <div className="identity-grid">
        <Metric label="状态" value={statusLabel(run.metrics.status)} />
        <Metric label="可行" value={booleanLabel(run.metrics.feasible)} />
        <Metric label="目标值" value={formatNumber(asNumber(run.metrics.objective))} />
        <Metric label="耗时" value={`${formatNumber(asNumber(run.metrics.runtime_ms), 1)} ms`} />
        <Metric label="策略" value={run.strategy} />
        <Metric label="种子" value={String(run.seed)} />
      </div>

      {isError ? <RunErrorSummary run={run} /> : null}

      <section className="subpanel">
        <h3>来源</h3>
        <dl className="detail-list">
          <dt>OptAgent</dt>
          <dd><a href={run.optagent.commit_url} target="_blank" rel="noreferrer">{shortCommit(run.optagent.commit)}</a></dd>
          <dt>Wheel 哈希</dt>
          <dd>{run.optagent.wheel_sha256}</dd>
          <dt>Benchmark 仓库</dt>
          <dd><a href={run.benchmarks.commit_url} target="_blank" rel="noreferrer">{shortCommit(run.benchmarks.commit)}</a></dd>
          <dt>评测 case</dt>
          <dd>{run.benchmark_group} / {run.benchmark_id}</dd>
          <dt>策略配置档</dt>
          <dd>{run.strategy_profile}</dd>
        </dl>
      </section>

      <section className="subpanel">
        <h3>运行环境</h3>
        {environmentRows.length ? (
          <DenseTable columns={['字段', '值']} rows={environmentRows} />
        ) : (
          <div className="state muted-state">这次运行没有记录环境字段。</div>
        )}
      </section>

      <section className="subpanel">
        <h3>策略参数</h3>
        <pre>{JSON.stringify(run.strategy_config, null, 2)}</pre>
      </section>

      <section className="subpanel">
        <h3>指标</h3>
        <DenseTable columns={['指标', '值']} rows={metricRows} />
      </section>

      <section className="subpanel">
        <h3>产物</h3>
        <ArtifactsPanel run={run} />
      </section>
    </div>
  );
}

function RunErrorSummary({ run }: { run: BenchmarkRun }) {
  const errorType = run.metrics.error_type ?? 'unknown';
  const errorMessage = run.metrics.error_message ?? '未记录错误信息';

  return (
    <section className="error-summary" aria-label="失败摘要">
      <div>
        <span>失败类型</span>
        <strong>{String(errorType)}</strong>
      </div>
      <p>{String(errorMessage)}</p>
    </section>
  );
}

function ArtifactsPanel({ run }: { run: BenchmarkRun }) {
  const [trace, setTrace] = useState<TraceArtifact | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [loadedArtifacts, setLoadedArtifacts] = useState<Record<string, string>>({});
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const tracePath = run.artifacts.trace;

  useEffect(() => {
    setTrace(null);
    setTraceError(null);
    setLoadedArtifacts({});
    setArtifactError(null);
    if (!tracePath) {
      return;
    }
    loadTraceArtifact(tracePath)
      .then((payload) => setTrace(payload))
      .catch((reason: unknown) => {
        setTraceError(reason instanceof Error ? reason.message : String(reason));
      });
  }, [run.run_id, tracePath]);

  const artifactEntries = Object.entries(run.artifacts);
  const artifactRows = artifactEntries.map(([name, path]) => [
    name,
    <a href={artifactPath(path)} target="_blank" rel="noreferrer" key={`${name}-download`}>
      下载 <ExternalLink size={13} />
    </a>,
    <button
      className="link-button"
      type="button"
      key={`${name}-load`}
      onClick={() => {
        setArtifactError(null);
        loadJsonArtifact(path)
          .then((payload) => {
            setLoadedArtifacts((current) => ({
              ...current,
              [name]: payload === null ? '缺失' : '已读取',
            }));
          })
          .catch((reason: unknown) => {
            setArtifactError(reason instanceof Error ? reason.message : String(reason));
          });
      }}
    >
      {loadedArtifacts[name] ?? '检查'}
    </button>,
    path,
  ]);

  const tracePoints = trace ? traceObjectivePoints(trace) : [];

  return (
    <div className="artifact-layout">
      {artifactRows.length ? (
        <DenseTable columns={['产物', '下载', '读取状态', '路径']} rows={artifactRows} />
      ) : (
        <div className="state muted-state">这次运行没有登记额外产物。</div>
      )}
      {artifactError ? <ErrorState message={artifactError} /> : null}

      <div className="trace-block">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">轨迹</p>
            <h3>目标值随步骤变化</h3>
          </div>
          <span className="pill">{tracePath ? 'trace.json' : '缺失'}</span>
        </div>
        {!tracePath ? <MissingTraceState /> : null}
        {tracePath && traceError ? <ErrorState message={traceError} /> : null}
        {tracePath && !traceError && trace === null ? <div className="state">正在加载 trace 产物...</div> : null}
        {tracePath && trace && tracePoints.length === 0 ? <MissingTraceState /> : null}
        {tracePath && trace && tracePoints.length > 0 ? (
          <EChart option={traceObjectiveOption(tracePoints)} label="目标值随步骤变化" />
        ) : null}
      </div>
    </div>
  );
}

function MissingTraceState() {
  return (
    <div className="state muted-state">
      <ListTree size={18} />
      <span>这次运行没有可用的 trace 产物。</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? 'status ok' : 'status bad'}>
      {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}
    </span>
  );
}

function statusLabel(value: unknown): string {
  if (value === 'success') {
    return '成功';
  }
  if (value === 'error') {
    return '错误';
  }
  if (value === true) {
    return '成功';
  }
  if (value === false || value === null || value === undefined) {
    return '未知';
  }
  return String(value);
}

function booleanLabel(value: unknown): string {
  if (value === true) {
    return '是';
  }
  if (value === false) {
    return '否';
  }
  return '未知';
}

function DenseTable({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function runtimeQualityOption(data: RuntimeQualityData): ChartOption {
  return {
    color: ['#2f7d68', '#b95b2f', '#4d65a8'],
    tooltip: { trigger: 'item' },
    grid: { left: 48, right: 22, top: 24, bottom: 44 },
    xAxis: { type: 'value', name: '耗时 ms' },
    yAxis: { type: 'value', name: '最佳成本' },
    series: [
      {
        type: 'scatter',
        symbolSize: 11,
        data: data.points.map((point) => [point.runtime_ms ?? 0, point.best_cost ?? point.objective ?? 0, point.strategy]),
      },
    ],
  };
}

function strategyComparisonOption(comparison: StrategyComparison): ChartOption {
  return {
    color: ['#2f7d68', '#4d65a8'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 52, right: 48, top: 42, bottom: 44 },
    xAxis: { type: 'category', data: comparison.strategies.map((item) => item.strategy) },
    yAxis: [
      { type: 'value', name: '最佳成本' },
      { type: 'value', name: '耗时 ms' },
    ],
    series: [
      {
        name: '最佳成本',
        type: 'bar',
        data: comparison.strategies.map((item) => item.best_cost ?? item.best_objective ?? 0),
      },
      {
        name: '耗时',
        type: 'line',
        yAxisIndex: 1,
        data: comparison.strategies.map((item) => item.avg_runtime_ms ?? 0),
      },
    ],
  };
}

function commitHistoryOption(series: CommitHistorySeries): ChartOption {
  return {
    color: ['#8b5d2a'],
    tooltip: { trigger: 'axis' },
    grid: { left: 52, right: 28, top: 24, bottom: 54 },
    xAxis: {
      type: 'category',
      data: series.points.map((point) => shortCommit(point.commit)),
    },
    yAxis: { type: 'value', name: '最佳成本' },
    series: [
      {
        name: series.metric,
        type: 'line',
        symbolSize: 10,
        data: series.points.map((point) => point.best_cost ?? point.objective ?? null),
      },
    ],
  };
}

interface TracePoint {
  x: number;
  y: number;
  label: string;
}

function traceObjectivePoints(trace: TraceArtifact): TracePoint[] {
  const events = trace.events ?? trace.points ?? trace.trace ?? [];
  return events
    .map((event, index) => tracePoint(event, index))
    .filter((point): point is TracePoint => point !== null);
}

function tracePoint(event: TraceEvent, index: number): TracePoint | null {
  const y = firstNumber(event.best_cost, event.objective, event.cost);
  if (y === null) {
    return null;
  }
  const x = firstNumber(event.step, event.iteration, event.elapsed_ms, event.elapsed_s);
  return {
    x: x ?? index + 1,
    y,
    label: event.event_type ?? event.phase ?? `step ${index + 1}`,
  };
}

function traceObjectiveOption(points: TracePoint[]): ChartOption {
  return {
    color: ['#2f7d68'],
    tooltip: {
      trigger: 'axis',
      formatter: (items: unknown) => {
        const item = Array.isArray(items) ? items[0] : items;
        const data = item && typeof item === 'object' && 'data' in item ? (item as { data?: unknown }).data : undefined;
        if (Array.isArray(data)) {
          return `步骤 ${data[0]}<br/>目标值 ${formatNumber(asNumber(data[1]))}<br/>${String(data[2] ?? '')}`;
        }
        return '';
      },
    },
    grid: { left: 56, right: 28, top: 24, bottom: 48 },
    xAxis: { type: 'value', name: '步骤' },
    yAxis: { type: 'value', name: '目标值' },
    series: [
      {
        name: '目标值',
        type: 'line',
        symbolSize: 9,
        data: points.map((point) => [point.x, point.y, point.label]),
      },
    ],
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
}
