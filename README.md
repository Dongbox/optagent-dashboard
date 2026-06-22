# OptAgent Dashboard

`optagent-dashboard` is the presentation repository for OptAgent benchmark results.

It is intentionally separate from:

- `optagent`: Python package and public solver APIs.
- `optagent-benchmarks`: benchmark definitions, runners, raw JSON results, generated indexes, and artifacts.

## Current Scope

This repository contains the Phase 3 dashboard MVP.

Current responsibilities:

- own the future dashboard UI code;
- read benchmark data exported from `optagent-benchmarks`;
- deploy as a static site, initially through Cloudflare Pages.

Current non-goals:

- do not run benchmarks;
- do not store benchmark facts;
- do not mutate benchmark result JSON;
- do not provide an API server.

## Stack

- Vite
- React
- TypeScript
- ECharts
- Cloudflare Pages

The dashboard should load static JSON data from `public/data/`, copied or generated from `optagent-benchmarks/results` and `optagent-benchmarks/aggregates`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build the static site:

```bash
npm run build
```

## Data Sync

The MVP includes sample data under:

```text
public/data/results/
public/data/aggregates/
```

To refresh it from a sibling `opt-agent` checkout after regenerating benchmark dashboard data:

```bash
rm -rf public/data/results public/data/aggregates
cp -R ../opt-agent/benchmarks/results public/data/results
cp -R ../opt-agent/benchmarks/aggregates public/data/aggregates
```

Dashboard pages must read generated JSON first:

- `public/data/results/index.json`
- `public/data/aggregates/leaderboard.json`
- `public/data/aggregates/commit-history.json`
- `public/data/aggregates/strategy-comparison.json`
- `public/data/aggregates/runtime-quality.json`

Run detail pages then load a single run summary and optional artifacts by path.

## MVP Pages

- Benchmarks: group coverage, latest runs, best strategy and runtime-quality scatter.
- Strategy Comparison: same-case strategy quality/runtime comparison.
- Commit History: trend points by OptAgent commit with commit links.
- Run Detail: run provenance, strategy config, metrics, artifact downloads, artifact load checks, and objective-over-step trace chart.

## Repository Relationship

Expected local workspace layout:

```text
work/
  opt-agent/
  optagent-benckmarks/
  optagent-dashboard/
```

Long-term data flow:

```text
optagent commit
  -> GitHub Actions benchmark run
  -> optagent-benchmarks/results/*.json
  -> generated indexes and aggregates
  -> optagent-dashboard/public/data
  -> static Cloudflare Pages deploy
```

## GitHub Actions Deploy

The Phase 4 deployment workflow is:

```text
.github/workflows/deploy-dashboard.yml
```

It can be started manually with `workflow_dispatch` or from the benchmark repository after generated data changes. The workflow:

- checks out this dashboard repository;
- checks out `Dongbox/optagent-benckmarks`;
- copies `results/` and `aggregates/` into `public/data`;
- runs `npm ci` and `npm run build`;
- uploads `dist/` to Cloudflare Pages.

Required GitHub configuration:

- Variable `CLOUDFLARE_PAGES_PROJECT`
- Secret `CLOUDFLARE_ACCOUNT_ID`
- Secret `CLOUDFLARE_API_TOKEN`
- Optional secret `OPTAGENT_BENCHMARKS_READ_TOKEN` when benchmark checkout needs a token beyond `GITHUB_TOKEN`

## Cloudflare Pages First-Time Setup

Use a Cloudflare Pages **Direct Upload** project. Do not connect this repository through the Cloudflare Git integration if GitHub Actions should control the deploy.

Cloudflare setup:

1. Open Cloudflare dashboard.
2. Go to `Workers & Pages`.
3. Create an application.
4. Choose `Pages`.
5. Choose `Direct Upload`.
6. Create a project, for example `optagent-dashboard`.
7. Copy the Cloudflare `Account ID`.
8. Create an API token with `Cloudflare Pages: Edit` permission for the account.

GitHub setup for `optagent-dashboard`:

- Action variable `CLOUDFLARE_PAGES_PROJECT`: the Pages project name, for example `optagent-dashboard`.
- Action secret `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID.
- Action secret `CLOUDFLARE_API_TOKEN`: API token with Pages edit permission.
- Optional action secret `OPTAGENT_BENCHMARKS_READ_TOKEN`: only needed when benchmark data checkout cannot use the default token.

Manual deploy:

```bash
gh workflow run deploy-dashboard.yml \
  --repo Dongbox/optagent-dashboard \
  --ref main \
  -f benchmark_ref=main
```

Expected automated flow:

```text
optagent workflow_dispatch or benchmark-dashboard-ci push
  -> dispatch optagent-benchmarks/.github/workflows/run-benchmarks.yml
  -> benchmark rows are published into optagent-benchmarks/results and aggregates
  -> optagent-benchmarks dispatches optagent-dashboard deploy-dashboard.yml
  -> dashboard copies benchmark JSON, builds Vite, and uploads dist/ to Cloudflare Pages
```

Until Cloudflare Pages is configured, the deploy workflow will fail at the configuration validation step. Local development still works with `npm run dev`.
