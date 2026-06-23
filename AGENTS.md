# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, and TypeScript dashboard for OptAgent benchmark results. Application code lives in `src/`: `App.tsx` owns the main views, `main.tsx` boots React, `charts/` contains ECharts wrappers, and `data/` contains JSON loading, types, and transforms.

Static benchmark data is served from `public/data/`. Aggregates live in `public/data/aggregates/`; run summaries and metrics live under `public/data/results/`. Build output goes to `dist/` and should not be edited by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on `127.0.0.1`.
- `npm run build`: run TypeScript project checks with `tsc -b`, then create the static Vite build in `dist/`.
- `npm run preview`: serve the built site locally.

Use `npm run build` as the primary verification command.

## Coding Style & Naming Conventions

Write TypeScript with `strict` mode in mind; prefer explicit interfaces for shared JSON shapes in `src/data/types.ts`. Components and exported types use `PascalCase`; functions, variables, and hooks use `camelCase`. Keep view-specific helpers close to `App.tsx` unless they are reusable data logic.

Use two-space indentation, single quotes in TypeScript imports/strings, and existing CSS custom properties before adding new colors. UI labels include Chinese dashboard copy, so preserve that convention for visible navigation or page text.

## Testing Guidelines

No dedicated test runner is configured yet. For now, validate changes with `npm run build` and a manual pass through the affected dashboard views via `npm run dev` or `npm run preview`.

When adding tests later, colocate focused tests near the code they cover or place broader integration tests under `tests/`. Name files after the unit or workflow, for example `transforms.test.ts`.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects such as `Display dashboard timestamps in UTC+8` and `Build static benchmark dashboard`. Follow that style: one clear sentence, capitalized, no trailing period.

Pull requests should describe changed dashboard behavior, list verification commands, and call out updates to `public/data/`. Include screenshots or recordings for visible UI changes, especially chart, layout, or navigation updates. Link related benchmark or deploy issues when applicable.

## Data & Configuration Notes

This repository displays generated benchmark data; it should not run benchmarks or mutate result JSON. To refresh local data, copy generated `results/` and `aggregates/` from the benchmark repository into `public/data/`. Do not commit deployment tokens or local environment files.
