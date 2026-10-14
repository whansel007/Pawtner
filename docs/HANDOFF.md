# Handoff

Updated 2026-10-14. Source of truth for scope: `PRD.md` (repo root), tiers in §9. Status board: `docs/KANBAN.md`. Decisions: `docs/DECISIONS.md`.

## What exists

| Part | Where | State |
|---|---|---|
| Senior phone app (Vite + React + TS) | `mobile/` | Core Home, dose proof, BP log, Care, Weekly Summary and Walk calls are wired to `/api`; other screens remain prototype data. |
| Shared contract, rules, selectors, wording | `shared/` | Owned by P1. Contract remains PROVISIONAL. `mobile/` imports types and mood rules from here. |
| Database schema + fictional seed | `migrations/` | Owned by P1. README names hosted Supabase Postgres (plain `pg`, no Supabase client). |
| API | `api/` | Seven routes and PostgreSQL repository. Root `npm run dev` starts the local API on port 3001. |

## Data flow on the phone (today)

1. On launch, `App.tsx` requests `/api/today`; the server assembles scheduled occurrences and ledger events into `DerivedDose[]`.
2. Heart and streak values come from shared selectors/rules; persisted decisions update the cached dog mood.
3. Dose confirmation, BP entry, and walk completion write events through the API. Care and Weekly Summary use `/api/caretaker/summary`.
4. `SceneBackdrop` draws the garden; `lib/useSceneGround.ts` measures where the dog stands (Home: top of the chips; other screens: top of the content card) and publishes CSS variables so the art's lawn line and the dog's feet meet.
5. Home shows `NextDoseCard` (next due/missed dose, then upcoming). "Taken" → prototype proof screen → API event; status is re-derived from the ledger. The proof screen does not upload an image.
6. Intro: cover → dedication (auto-advances after `DEDICATION_HOLD_MS`, `config/intro.ts`) → Home.

Config lives in `mobile/src/config/` (`scene.ts`: images, ground line, dog size limits, screens without the dog; `intro.ts`: dedication timing). Text lives in `mobile/src/locales/en.json`.

## Commands

| Where | Command | What it does |
|---|---|---|
| `mobile/` | `npm run dev` | Dev server (Vite). Add `-- --host` to open it on a phone on the same Wi-Fi. |
| `mobile/` | `npx tsc --noEmit`, `npm run build` | Typecheck and production build (no `typecheck` script in `mobile/`). |
| root | `npm run typecheck`, `npm run test:unit` | Typecheck and unit tests for `shared/`. |
| root + mobile terminals | `npm run dev`, `npm run dev:mobile` | Local API and Vite UI. Vite proxies `/api` to port 3001. |
| root | `npm run db:migrate`, `npm run db:seed` | Need `DATABASE_URL_DIRECT` in `.env`. |

## Deployment

- Vercel project `pawtner-mobile` (account `fresfrida`), **Root Directory `mobile`**, not linked to GitHub, so pushing or merging deploys nothing. Deploys run from the **repo root** with the Vercel CLI (`vercel deploy` for previews, `--prod` for production).
- Production URL: `pawtner-mobile-three.vercel.app`. The final T1-17 host is undecided (EdgeOne Pages vs Vercel, P1).
- `vercel link` writes `.env.local` with a `VERCEL_OIDC_TOKEN`; delete it and never commit it.
- `mobile/.vercel` is an old link from `mobile/`; don't deploy from there.

## Git and roles

- Team mode: every push needs the user's yes, typed in the session that pushes. Only the user merges PRs. Never commit to `main`, never force-push.
- Claude Code: `claude/*` branches, structural fixes. CodeBuddy: `cb/*` branches, features (its chats are the judging proof; screenshots go in `proof/`).
- Several tools share one checkout. Use `git worktree` for parallel work instead of switching branches in the main folder.

## Known risks

1. The shared Supabase database currently has no Pawtner schema; local `/api/today` reports this until migrations and fictional seed are run with `DATABASE_URL_DIRECT`.
2. No authentication or roles exist; this API is for the fictional single-user demo only.
3. Dog size limits and mood looks are TENTATIVE guesses.
4. `README.md` is stale (says the Vite app doesn't exist); `CLAUDE.md` points to `docs/PRD.md` and a missing `docs/ARCHITECTURE.md`.
