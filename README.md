# Pawtner

Pawtner is a phone-first medication-adherence companion where a senior cares for a virtual dog and a caretaker can support the routine. This repository contains a Vite mobile UI, a local PostgreSQL API, deterministic backend rules, and fictional seed data.

Built for the Tencent Cloud AI CAN DO IT Hackathon Singapore 2026, healthcare track. **All sample data is fictional. The thresholds are demo values, not clinical advice.** The project is not ready for a deployed demo: API handlers and UI are pending design review and contract confirmation.

## Safety design

Rules decide; the model only words things. Every current decision has pre-written wording. Model wording is optional, has a timeout, and falls back to the template on missing keys, timeouts, or errors. `emergency_995` never calls the model. No model integration or network call is currently configured.

Thresholds and symptom terms are in [`shared/config.ts`](shared/config.ts). The API contract is in [`shared/contract.ts`](shared/contract.ts) and was reviewed against the exported UI. The mobile UI is now wired to the API for today's doses, dose events, blood pressure entry, walks, caregiver summary, and weekly summary. Other screens still use their existing prototype data.

## Architecture

- `shared/` — provisional types, demo configuration, fixtures, selectors, rules, refusals, and wording fallback.
- `api/` — host-agnostic route handlers, PostgreSQL repository, and local Node server.
- `mobile/` — Vite/React prototype UI; core screens use the local API.
- `migrations/` — plain PostgreSQL schema and fictional seed data.
- `scripts/` — direct-connection migration and seed runners.
- `tests/unit/` — deterministic tests without a database, model, or network.
- `tests/integration/` — PostgreSQL checks; API response tests wait for contract confirmation and handlers.
- `docs/` — decisions and later design/architecture documentation.
- `proof/` — location for the required CodeBuddy and Miora chat screenshots.

Database choice: hosted Supabase Postgres in Singapore, used as plain PostgreSQL with the `pg` driver. There is no Supabase client, Auth, or row-level security. Migrations use `DATABASE_URL_DIRECT`; deployed API connections will use `DATABASE_URL`.

## Prerequisites and setup

Prerequisites: Node.js 24+ and npm. Install dependencies and prepare the environment:

```sh
npm install
cp .env.example .env
```

Set `DATABASE_URL` to the pooled PostgreSQL URL and `DATABASE_URL_DIRECT` for migration/seed commands. Apply the schema and fictional seed with `npm run db:migrate` and `npm run db:seed`. Run `npm run typecheck` and `npm run test:unit` without a database. Set `DATABASE_URL` to run `npm run test:integration`; integration tests skip when it is empty.

Start the API with `npm run dev` and the UI in a second terminal with `npm run dev:mobile`. Vite proxies `/api` requests to `http://localhost:3001`. Seed the configured database before opening the UI. The proof scanner and walk tracking remain prototype interactions; no image is uploaded and no GPS distance is collected.

### Environment variables

All values in `.env.example` are blank. Never commit a real `.env` or a credential.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Supabase Postgres connection for the deployed API and optional integration tests. |
| `DATABASE_URL_DIRECT` | Direct Supabase Postgres connection for migrations and seeding. |
| `LLM_BASE_URL` | OpenAI-compatible TokenHub API base URL. |
| `LLM_MODEL` | Selected TokenHub model identifier. |
| `LLM_API_KEY` | TokenHub credential; optional for deterministic rules and templates. |
| `VITE_API_BASE_URL` | API base URL used by the Vite application. |

## Demo thresholds and decisions

All thresholds below are configurable demo values, not clinical advice. These values are defined in `shared/config.ts`.

| Decision | Trigger | Mood |
|---|---|---|
| `nudge` (first) | Dose remains untaken 60 minutes after schedule time. | sleepy |
| `nudge` (second) | Still untaken 60 minutes after first nudge; maximum two per dose. | sleepy |
| `nudge` + caretaker check-in | Consecutive missed doses meet opted-in caretaker threshold; minimum threshold 2. | sleepy |
| `celebrate` | Dose taken, walk finished, or streak milestone. | joyful |
| `restock_reminder` | Days of supply is 5 or fewer. | content |
| `doctor_question` | Note includes a configured possible-side-effect term. | content |
| `see_gp_soon` | At least 180 systolic or 120 diastolic without a symptom, or 3+ readings at/above 140/90 within 7 days. | attentive |
| `emergency_995` | High reading with a symptom, or a note contains a configured emergency symptom. | attentive |
| `stay_quiet` | No configured rule needs attention. | selected from heart score |

Every decision is designed to include its rule ID, observations, reasoning, wording source, mood, and caretaker-ping flag. “Missed” is derived from schedules and the dose-event ledger; it is never stored as a dose event. Dose events and nudge decisions include the scheduled occurrence timestamp so recurring schedules do not mix events from different days. `selectAgentInput` assembles current scores and history from those occurrences; a celebration requires the just-recorded event to be passed explicitly. Caretaker messages do not include medication names.

### Refusals

The rules refuse double dosing after a miss, changing/skipping/stopping medication, reassurance about a reading, symptom diagnosis, pill identification from a photo, and medication interaction advice. Each refusal is marked `refused` with a category and fixed template.

## Running the fixtures and demo

Run the four shared rule fixtures:

```sh
npm run demo:rules
npm exec vitest run tests/unit/fixtures.test.ts
```

`demo:rules` prints each decision, rule ID, dog mood, caretaker-ping flag, and wording source. It stays on templates when `LLM_API_KEY` is blank.

The local prototype is runnable after database setup. The required demo beats remain: (1) pass 10:00 with a missed dose, show two gentle nudges and an opted-in caretaker check-in without a medicine name; (2) record fictional 185/120 with “bad headache” and show calm “Call 995 now” wording without a model call; (3) draft a weekly doctor question from “feel sleepy at night” and simulate a walk with a fast stretch.

### API surface

The API implements seven operations: `GET /api/today`, `POST /api/dose-event`, `POST /api/health-metric`, `POST /api/agent/decide`, `GET /api/caretaker/summary`, `GET|PUT /api/escalation-settings`, and `POST /api/walk-session`. Model wording remains on templates unless a model client is explicitly configured; decision rules remain deterministic.

## Attributions

- HSA, *Listing of Registered Therapeutic Products* — Open Data Licence (planned Tier 2 import; no HSA product data is included yet).
- “Information from MedlinePlus.gov” (planned Tier 2 source use; no content is included yet).
- Singapore National Drug Formulary (NDF) and HealthHub are link-only references. Their content is not copied into this app.

## Built with

The hackathon team uses CodeBuddy and Miora. Add chat screenshots to [`proof/`](proof/README.md); none have been added yet.

## Roadmap and current limits

The PRD's Tier 3 roadmap includes push notifications, authentication and roles, background GPS, nightly score recomputation, in-app NDF content (requires permission), HealthHub integration, screening festival days, partnerships/premium, and multilingual support.

Current limitations: no authentication/roles, hosting configuration, deployment, real model client, HSA import, or automated proof photo/GPS capture. The contract and API payloads remain subject to design review. Database connection verification is pending because this environment could not resolve the configured Supabase hostname.
