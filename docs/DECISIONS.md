# Decisions

## 2026-10-13 — Provisional shared contract draft

- Added `shared/contract.ts`, `shared/config.ts`, and four PRD-based fixtures before design exports were available.
- The contract is explicitly provisional; check screen fields against `docs/design/` and get confirmation before finalizing it or adding API handlers.
- Thresholds and symptom terms are centralized as demo values. Names in fixtures are fictional data.

## 2026-10-13 — Front-end scene and Home layout (PR 1, PR 2)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Sun and stars are drawn into the garden backgrounds (`garden-day.webp`, `garden-night.webp`); no separate sky layer. Day/night = swap one image via `BACKDROP_BY_PHASE` in `mobile/src/config/scene.ts`. | The art arrived with the sky baked in; one fewer layer to align. | The sun can't be repositioned in code; it may sit near the settings button on narrow phones. | Final for the hackathon |
| Backgrounds are portrait (923×2000) and positioned so the art's lawn line (`groundLine: 0.36`) lands at the dog's feet, clamped so the sky never shows a gap (`lib/useSceneGround.ts`). | Bottom-anchored square art cut off the sky and trees on short phones (real-phone test, Brave on Android). | On short screens a little sky at the top is cropped. | Final |
| One dog image (`dog-base.webp`, 1000×1300) for all four moods; mood shown only through motion and glow. `DOG_IMAGE_BY_MOOD` keeps a path per mood so mood images can be dropped in later. | No 4-mood sheet yet (T1-18); PRD §15 fallback. | The face never changes; moods are subtler. | Tentative until a mood sheet exists |
| The dog renders in a shared `DogLayer` in the app shell, on every senior screen except `care`, `cover` and `dedication` (`SCREENS_WITHOUT_DOG`). On Home it stands above the chips; elsewhere it sits on the content card's top edge. | The old photo had the dog baked into the background, so moving it to a separate layer made it disappear from other screens. | The secondary-screen card starts a little lower to make room. | Final |
| Dog size limits: Home min `clamp(120px, 26dvh, 320px)`, other screens min `clamp(80px, 14dvh, 140px)`, max `34dvh` (`DOG_PLACEMENTS`). | Dog was 45 px on a short phone and 390 px (pixelated) on a tall one. | Values are guesses, not design specs. | TENTATIVE |
| Mood comes from API dog state (updated when deterministic decisions are persisted) and is rendered through the shared dog layer. | One source of truth for mood. | The single base image still relies on motion/glow. | Tentative until a mood sheet exists |
| Home uses a compact next-dose card (`NextDoseCard`), with helpers in `mobile/src/lib/doses.ts` and contract types (`DerivedDose`). The card's label comes from `dose.status`, never from its position in the list. | The old card took ~40% of a short screen and showed labels by row position. | Only the next dose is visible on Home; the full list is behind "See all". | Final |
| The dedication screen ("For Mom", text from `intro.dedicationText` in `en.json`) auto-advances after `DEDICATION_HOLD_MS = 1100` (`mobile/src/config/intro.ts`), in Pinyon Script; tapping skips. | User: "just a glance". | A hard cut to Home, no fade. | Final; cross-fade kept in view (KIV) |
| The Vite dev server may read `../shared` (`server.fs.allow: ['..']`), and Vercel builds from the repo root with Root Directory `mobile`. | The app imports `shared/` (contract, rules), which sits outside `mobile/`. | Deploys must run from the repo root, not from `mobile/`. | Final for previews |

## 2026-10-14 — Integrate the pushed mobile screens

- Reviewed `docs/DATA_CONTRACT.md` and the Home, Care, Health, Weekly Summary, and Walk screen props against the provisional shared API contract.
- Added today health/BP fields and caretaker summary identity and ledger aggregates so the core screens can use backend data.
- The user's integration request authorizes implementing the seven Tier 1 API operations. Non-Tier-1 screens remain on their existing mocks; label OCR and other Tier 2 work are excluded.
- Verified the API on configured Supabase data and the mobile production build; the shared contract remains provisional pending product/design sign-off.

## 2026-10-14 — Demo clock and decision visibility

- Settings can evaluate the deterministic agent at a selected local time; Home shows each saved decision with its rule, observations, reasoning, and wording source.
- Latest-decision reads are bounded by the requested clock time so a past demo run does not display a decision from the future.
- Integration coverage confirms first and second dose nudges, then no third nudge for that occurrence.
- Caretaker consent and the threshold are editable in Settings and persist through the API; the database and API both enforce a minimum threshold of two.

## 2026-10-13 — Ways of working

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Collaboration mode is **team**: every push needs the user's yes, typed in the session that pushes. | Two people + CodeBuddy share the repo. | Slower pushes. | Final |
| CodeBuddy builds features (proof for judging); Claude Code does structural fixes on `claude/*` branches; CodeBuddy uses `cb/*`. Only the user merges PRs. | Organiser rule: CodeBuddy must be the visible build tool. | CodeBuddy once merged its own PR (PR 2) before PR 1; it was recovered with a merge, no history rewritten. | Final |
| Vercel is used for preview links only. Production host for T1-17 is still to be confirmed (EdgeOne Pages vs Vercel). | Hosting decision belongs to Person 1. | `pawtner-mobile-three.vercel.app` still serves an older build. | Open |
