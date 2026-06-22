# OptAgent Dashboard

`optagent-dashboard` is the presentation repository for OptAgent benchmark results.

It is intentionally separate from:

- `optagent`: Python package and public solver APIs.
- `optagent-benchmarks`: benchmark definitions, runners, raw JSON results, generated indexes, and artifacts.

## Current Scope

This repository is initialized for Phase 0 of the benchmark dashboard plan.

Current responsibilities:

- own the future dashboard UI code;
- read benchmark data exported from `optagent-benchmarks`;
- deploy as a static site, initially through Cloudflare Pages.

Current non-goals:

- do not run benchmarks;
- do not store benchmark facts;
- do not mutate benchmark result JSON;
- do not provide an API server.

## Planned Stack

- Vite
- React
- TypeScript
- ECharts
- Cloudflare Pages

The dashboard should load static JSON data from `public/data/`, copied or generated from `optagent-benchmarks/results` and `optagent-benchmarks/aggregates`.

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
