# Handoff

Updated 2026-10-14. Source of truth for scope: `PRD.md` (repo root), tiers in §9. Status board: `docs/KANBAN.md`. Decisions: `docs/DECISIONS.md`.

## What exists

| Part | Where | State |
|---|---|---|
| Senior phone app (Vite + React + TS) | `mobile/` | Core Home, dose proof, BP log, Care, Weekly Summary and Walk calls are wired to `/api`; other screens remain prototype data. |
| Caretaker web app (`/care`, T1-15) | `mobile/src/care/` | Same Vite app, separate route and lazy-loaded chunk. Demo sign-in picker, This week, Alerts & caregivers, Settings (read-only). Reads `/api/today`, `/api/caretaker/summary`, `/api/escalation-settings`; saves the threshold with `PUT /api/escalation-settings`. Offline → typed mock data + one friendly notice. Branch `claude/care-web`. |
| Shared contract, rules, selectors, wording | `shared/` | Owned by P1. Contract remains PROVISIONAL. `mobile/` imports types and mood rules from here. |
| Database schema + fictional seed | `migrations/` | Owned by P1. README names hosted Supabase Postgres (plain `pg`, no Supabase client). |
| API | `api/` | Seven routes and PostgreSQL repository. Root `npm run dev` starts the local API on port 3001. |

## Data flow on the phone (today)

1. On launch, `App.tsx` requests `/api/today`; the server assembles scheduled occurrences and ledger events into `DerivedDose[]`.
2. Heart and streak values come from shared selectors/rules; persisted decisions update the cached dog mood.
3. Dose confirmation, BP entry, and walk completion write events through the API. Care and Weekly Summary use `/api/caretaker/summary`; caretaker consent and threshold save through `/api/escalation-settings`.
4. Settings has a demo clock. It calls `/api/agent/decide` at the selected local time; Home shows the saved decision with its rule, observations, reasoning, and wording source.
5. `SceneBackdrop` draws the garden; `lib/useSceneGround.ts` measures where the dog stands (portrait Home: top of the chips; other portrait screens: top of the content card; landscape: on the lawn in the left column, see `DOG_PLACEMENTS` and `LANDSCAPE_MEDIA_QUERY` in `config/scene.ts`) and publishes CSS variables so the art's lawn line and the dog's feet meet. It also publishes the dog's box (`--dog-top`, `--dog-height`) so the tap bubble (`PetBubble`, in the toast slot under the hearts) never covers the head.
6. Home shows `NextDoseCard` (next due/missed dose, then upcoming). "Taken" → prototype proof screen → API event; status is re-derived from the ledger. If the API call fails, `handleDoseVerified` marks the dose taken locally (not saved; the next successful `/api/today` replaces it) and gets a `celebrate` decision from local `decide()` via `lib/agent.ts`. The proof screen does not upload an image.
7. Intro: cover → dedication (auto-advances after `DEDICATION_HOLD_MS`, `config/intro.ts`) → Home.
8. Navigation: `lib/useNavigation.ts` keeps the screen and a short history (`lib/navigation.ts`). Top-level screens (home, health, milestones, walk, settings) show "Home"; drilled-down screens show "Back" and return to where they were opened from. Every non-Home screen uses `components/FullCard.tsx` (fixed frame, back button, inner scroll).

## Caretaker web (`/care`)

- **Routing.** `mobile/src/main.tsx` switches on the path: `/` renders the phone `App` (unchanged), `/care` and `/care/*` render `care/CareApp.tsx`, lazy-loaded so the phone bundle and CSS stay as they were (phone CSS build output verified byte-identical to `main`). `lib/pathname.ts` (`usePathname`, `navigateTo` = `history.pushState`, `replacePath`) keeps browser back/forward working; no router dependency. Routes and the redirect rule live in `care/routing.ts`: `/care` landing, `/care/sign-in`, `/care/week`, `/care/alerts`, `/care/settings`; signed-in pages without a persona `replaceState` to the picker; unknown `/care/*` paths show the landing.
- **Deep links on Vercel.** `mobile/vercel.json` rewrites `/care` and `/care/:path*` to `/index.html` (Root Directory is `mobile`). P1's EdgeOne copy needs the same SPA rewrite for `/care/*`.
- **Demo sign-in (front end only).** `/care/sign-in` lists three personas from `care/data/personas.ts`: the senior (name from `summary.senior.name`; choosing her opens `/`), the caretaker who **gets check-ins** (`summary.caregiver.name`, mock "Jamie" if the API has none) and the caretaker with **updates only** (mock slot `MOCK_UPDATES_ONLY_CARETAKER`, "Alex", in `care/data/mock.ts`). The chosen caretaker slot (`checkIns` / `updatesOnly`, not a name) is kept in `sessionStorage` key `pawtner.care.persona` (wrapped in try/catch); Log out clears it and returns to `/care`. No passwords, accounts or database changes.
- **Visibility.** Rules in `care/lib/rules.ts`: updates-only caretakers don't see caring moments of kind `check_in` (`visibleMoments`), and see Alerts read-only with a calm note; `checkInLock()` allows editing the threshold only for the check-ins caretaker, with consent on (`escalation.optedIn`) and the API reachable.
- **Data mapping.** Today ring = `today.doses` taken / total (counts only, never medicine names). Streak = `dog.streak`; seven weekday hearts, the last `min(streak, 7)` filled (`streakHearts`, `recentDays`). Caring moments = `summary.caringMoments` (time via `Intl` in the viewer's local zone; the API has no senior time zone yet). Questions for the doctor = `summary.doctorQuestions`. Consent = `escalation.optedIn`; one shared threshold stepper, minimum `DEMO_RULES.caretakerMinimumThreshold`, saved with the existing `api.updateEscalationSettings({ optedIn, threshold })`. Message preview = `care.web.alerts.preview` in `en.json` with the senior's name and the threshold, no medicine name. Settings shows dog and senior names from data, a weekly-summary preview (visible moments, streak, walks, doctor-question count) and "Medication editing: coming soon".
- **Offline.** `care/hooks/useCareData.ts` calls the three endpoints once; any failure is logged to the console and replaced by `buildMockCareData()` (typed like the API responses), and the page shows `care.web.notice.offline`. Saving is disabled offline.
- **Look.** `care/care.css` holds one token block scoped to `.care-root` (cream/forest palette, Inter, radii, spacing); every class starts with `care-`. The dog is ours (`DOG_IMAGE_BY_MOOD` from `config/scene.ts`, by `dog.mood`); the design's cartoon dog is not used. Garden art: `public/assets/care-garden.webp` (1920×800, 121 KB, from the design's 2.8 MB PNG), path in `care/config.ts`.
- **Mocks to replace** when P1 adds them: the updates-only caretaker (needs `caregivers: { id, name, receivesCheckIns }[]` in `CaretakerSummaryResponse`), the check-ins caretaker fallback when `summary.caregiver` is null, and the senior's time zone for moment times.

Config lives in `mobile/src/config/` (`scene.ts`: images incl. `DOG_IMAGE_BY_MOOD` (sleepy has its own art; a mood image that fails to load falls back to `DOG_BASE_IMAGE`), ground line, dog size limits, screens without the dog; `intro.ts`: dedication timing). Text lives in `mobile/src/locales/en.json`; dog and caretaker names are interpolated from mock data (`{{name}}`, PR #4).

## Commands

| Where | Command | What it does |
|---|---|---|
| `mobile/` | `npm run dev` | Dev server (Vite). Add `-- --host` to open it on a phone on the same Wi-Fi. |
| `mobile/` | `npx tsc --noEmit`, `npm run build` | Typecheck and production build (no `typecheck` script in `mobile/`). |
| root | `npm run typecheck`, `npm run test:unit` | Typecheck and unit tests for `shared/` and the pure mobile helpers (navigation, walk, `/care` rules in `tests/unit/care.test.ts`). |
| root + mobile terminals | `npm run dev`, `npm run dev:mobile` | Local API and Vite UI. Vite proxies `/api` to port 3001. |
| root | `npm run db:migrate`, `npm run db:seed` | Need `DATABASE_URL_DIRECT` in `.env`. |

## Deployment

- Vercel project `pawtner-mobile` (account `fresfrida`), **Root Directory `mobile`**, not linked to GitHub, so pushing or merging deploys nothing. Deploys run from the **repo root** with the Vercel CLI (`vercel deploy` for previews, `--prod` for production).
- Production URLs: **`pawtner-care.vercel.app`** (project domain added 14 Oct; `pawtner-web.vercel.app` was taken by an unrelated site) and `pawtner-mobile-three.vercel.app`, both serving `main` @ `da8351a` (deploy `pawtner-mobile-7u91g5czf`, 14 Oct night, checks passed first: typecheck, 73/73 tests, build). Phone app at `/`, caretaker web at `/care` (`mobile/vercel.json` rewrites `/care/*`). Front end only: the API is not hosted yet, so both run on the offline fallback. The API is not hosted anywhere yet (it runs only on P1's machine); options weighed 14 Oct: A) API as Vercel Functions in the same project (same origin, recommended for Tier 1), B) EdgeOne Pages Node Functions, C) split hosts with `VITE_API_BASE_URL` + CORS. P1's EdgeOne copy (`pawtner-dpyqrh9kdlee.edgeone.dev`) is static only. The Vercel connector returns 403 for this project; `vercel --scope fresfrida list pawtner-mobile` works.
- Deploy without linking (no `.env.local` written): `VERCEL_ORG_ID=team_AokvQEnWfqJ0MfshVcCOkmCd VERCEL_PROJECT_ID=prj_9glM0SMVxwknF0DY3xsyMgQarwPT vercel deploy --yes` from the repo root (add `--prod` for production). Used for the 14 Oct preview.
- `vercel link` writes `.env.local` with a `VERCEL_OIDC_TOKEN`; delete it and never commit it.
- `mobile/.vercel` is an old link from `mobile/`; don't deploy from there.

## Git and roles

- Team mode: every push needs the user's yes, typed in the session that pushes. Only the user merges PRs. Never commit to `main`, never force-push.
- Standing exception (user, 14 Oct): **docs-only** commits authored by the user (Frescylia Frida) may be pushed without asking, and the docs PR may be merged by Claude Code if GitHub reports no conflicts. Code PRs still need the user's yes and the user's merge.
- Claude Code: `claude/*` branches, structural fixes. CodeBuddy: `cb/*` branches, features (its chats are the judging proof; screenshots go in `proof/`).
- Split agreed 14 Oct: P1 (William) owns `api/`, `shared/`, `migrations/` and `mobile/src/lib/api.ts`; P2 owns `mobile/src/screens` and `mobile/src/components`. Screen changes go through P2.
- CodeBuddy prompts start with "TARGET TOOL: CodeBuddy / You are CodeBuddy…" (it called itself Claude Code after reading this repo's `CLAUDE.md`). Its UI screenshots go to `docs/screenshots/<feature>/`; `proof/` is only for screenshots of its chats, taken by the user.
- Several tools share one checkout. Use `git worktree` for parallel work instead of switching branches in the main folder. Create each worktree from `origin/main` (`git fetch && git worktree add ../pawtner-<task> -b <branch> origin/main`), then run `npm install` in the root and in `mobile/`.
- Keep the main folder (`Pawtner-repo`) on `main` and pull. On 14 Oct it was still on the merged `cb/names-from-data` (no KANBAN/HANDOFF), and CodeBuddy tried to restart T1-08; a fresh chat with a context-reset message fixed it, and the folder was switched to `main`. Trust `git log origin/main` over a tool's memory.

## Known risks

1. The shared Supabase database currently has no Pawtner schema; local `/api/today` reports this until migrations and fictional seed are run with `DATABASE_URL_DIRECT`.
2. API failures: `reportApiProblem()` in `App.tsx` logs the detail to the console; background loads show one `toast.apiOffline` per outage, failed user actions always show `toast.apiActionFailed` (PR #7). The BP form, simulated walk and "Taken" fall back to local `decide()` when the API is unreachable. On "Taken" the failure shows the once-per-outage `toast.apiOffline`, not `toast.apiActionFailed` (the dose is shown as taken locally); the heart-gained toast that follows replaces it at once in the single toast slot, so offline the senior sees only the heart. If `/api/today` loaded earlier and the API drops later, the stale `today` keeps supplying heart and mood, so the offline "Taken" does not change them.
3. At 360×640 the Home decision row (~56 px) crops the top of the dog's head slightly once a decision exists.
4. No authentication or roles exist; this API is for the fictional single-user demo only.
5. Dog size limits and mood looks are TENTATIVE guesses.
6. Fixed names remain in mock data (`mock/care.ts` "Mum + Jamie", `mock/milestones.ts` "From Jamie").
7. `README.md` is stale (says the Vite app doesn't exist); `CLAUDE.md` points to `docs/PRD.md` and a missing `docs/ARCHITECTURE.md`.
8. Landscape two-column layout (phones and tablets held sideways) is checked in headless Chromium at 844×390, 932×430, 740×360, 1024×768 and 1180×820, not yet on a real device. At 740×360 the card is ~230 px tall (scrolls).
