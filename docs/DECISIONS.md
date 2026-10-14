# Decisions

## 2026-10-13 — Provisional shared contract draft

- Added `shared/contract.ts`, `shared/config.ts`, and four PRD-based fixtures before design exports were available.
- The contract is explicitly provisional; check screen fields against `docs/design/` and get confirmation before finalizing it or adding API handlers.
- Thresholds and symptom terms are centralized as demo values. Names in fixtures are fictional data.

## 2026-10-13 — Tie ledger events and nudge history to a dose occurrence

- Added `scheduledFor` to the provisional dose-event and request contract. A recurring schedule ID alone cannot distinguish today's dose from a prior day's occurrence.
- Added `scheduled_for` to dose events and agent decisions, with an occurrence-aware index and a paired-null check for decision targets.
- Selectors now match a ledger event to the exact scheduled occurrence. This prevents yesterday's event or nudge from changing today's dose status/count.
- This is a provisional contract update from backend correctness review; confirm it against the screen exports before the contract is finalized.
