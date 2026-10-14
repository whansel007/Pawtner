# Handoff

Updated 2026-10-14 (Wed). `main` = `4d269db` (PRs #1–#4 merged). Source of truth for scope: `PRD.md` (repo root), tiers in §9. Status board: `docs/KANBAN.md`. Decisions: `docs/DECISIONS.md`.

## What exists

| Part | Where | State |
|---|---|---|
| Senior phone app (Vite + React + TS) | `mobile/` | Runs against mock data in `mobile/src/mock`. 16 screens incl. cover, dedication, Home, Settings, Care, Health, Walk. |
| Shared contract, rules, selectors, wording | `shared/` | Owned by P1. Contract marked PROVISIONAL. `mobile/` imports types and `selectDogMood` from here. |
| Database schema + fictional seed | `migrations/` | Owned by P1. README names hosted Supabase Postgres (plain `pg`, no Supabase client). |
| API | — | Not started (T1-07). Root `npm run dev` only prints that the API is pending. |

## Data flow on the phone (today)

1. `App.tsx` holds screen state, the dose list (`DerivedDose[]` from `mock/home.ts`) and BP state.
2. Heart count = 1 + doses taken + BP logged, capped at `DEMO_RULES.heartMaximum` (`shared/config`).
3. Mood = `selectDogMood(heartCount, null)` from `shared/rules` (on `main`; `cb/emergency-beat` is changing this to pass the latest decision); passed to `DogLayer` (the dog, on every senior screen except `care`, `cover`, `dedication`).
4. `SceneBackdrop` draws the garden; `lib/useSceneGround.ts` measures where the dog stands (Home: top of the chips; other screens: top of the content card) and publishes CSS variables so the art's lawn line and the dog's feet meet.
5. Home shows `NextDoseCard` (next due/missed dose, then upcoming). "Taken" → proof screen → the dose is marked taken in local state. **TODO(API):** post a `DoseEvent` and refetch; status is derived, never set by the client.
6. Intro: cover → dedication (auto-advances after `DEDICATION_HOLD_MS`, `config/intro.ts`) → Home.

Config lives in `mobile/src/config/` (`scene.ts`: images, ground line, dog size limits, screens without the dog; `intro.ts`: dedication timing). Text lives in `mobile/src/locales/en.json`; dog and caretaker names are interpolated from mock data (`{{name}}`, PR #4).

## Commands

| Where | Command | What it does |
|---|---|---|
| `mobile/` | `npm run dev` | Dev server (Vite). Add `-- --host` to open it on a phone on the same Wi-Fi. |
| `mobile/` | `npx tsc --noEmit`, `npm run build` | Typecheck and production build (no `typecheck` script in `mobile/`). |
| root | `npm run typecheck`, `npm run test:unit` | Typecheck and unit tests for `shared/`. |
| root | `npm run db:migrate`, `npm run db:seed` | Need `DATABASE_URL_DIRECT` in `.env`. |

## Deployment

- Vercel project `pawtner-mobile` (account `fresfrida`), **Root Directory `mobile`**, not linked to GitHub, so pushing or merging deploys nothing. Deploys run from the **repo root** with the Vercel CLI (`vercel deploy` for previews, `--prod` for production).
- Production URL: `pawtner-mobile-three.vercel.app`, serving deploy `pawtner-mobile-a8mx1lyw6` (13 Oct 23:16), from before PR #4 (names fix). Next production deploy: this evening, after the API connection (plan step 5). The Vercel connector returns 403 for this project; `vercel --scope fresfrida list pawtner-mobile` works. The final T1-17 host is undecided (EdgeOne Pages vs Vercel, P1).
- `vercel link` writes `.env.local` with a `VERCEL_OIDC_TOKEN`; delete it and never commit it.
- `mobile/.vercel` is an old link from `mobile/`; don't deploy from there.

## Git and roles

- Team mode: every push needs the user's yes, typed in the session that pushes. Only the user merges PRs. Never commit to `main`, never force-push.
- Standing exception (user, 14 Oct): **docs-only** commits authored by the user (Frescylia Frida) may be pushed without asking, and the docs PR may be merged by Claude Code if GitHub reports no conflicts. Code PRs still need the user's yes and the user's merge.
- Claude Code: `claude/*` branches, structural fixes. CodeBuddy: `cb/*` branches, features (its chats are the judging proof; screenshots go in `proof/`).
- Several tools share one checkout. Use `git worktree` for parallel work instead of switching branches in the main folder. Create each worktree from `origin/main` (`git fetch && git worktree add ../pawtner-<task> -b <branch> origin/main`), then run `npm install` in the root and in `mobile/`.
- Keep the main folder (`Pawtner-repo`) on `main` and pull. On 14 Oct it was still on the merged `cb/names-from-data` (no KANBAN/HANDOFF), and CodeBuddy tried to restart T1-08; a fresh chat with a context-reset message fixed it, and the folder was switched to `main`. Trust `git log origin/main` over a tool's memory.

## Known risks

1. The phone app is mock-only; T1-07 APIs and the hosting decision block every "wired to real data" item before Wednesday night.
2. On `main`, mood still ignores agent decisions (`latestDecision = null`). `cb/emergency-beat` (CodeBuddy, 14 Oct) runs `decide()` from `shared/rules` locally behind `requestDecision()` until T1-07 exists.
3. Dog size limits and mood looks are TENTATIVE guesses.
4. Fixed names remain in mock data (`mock/care.ts` "Mum + Jamie", `mock/milestones.ts` "From Jamie").
5. `README.md` is stale (says the Vite app doesn't exist); `CLAUDE.md` points to `docs/PRD.md` and a missing `docs/ARCHITECTURE.md`.
