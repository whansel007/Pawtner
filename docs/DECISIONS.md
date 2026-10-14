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
| Mood comes from one call, `selectDogMood(heartCount, null)` in `App.tsx`, imported from `shared/rules`. `latestDecision` is `null` until the API is wired. | One source of truth for mood. | Mood ignores agent decisions (e.g. emergency → attentive) until data wiring. | Tentative |
| Home uses a compact next-dose card (`NextDoseCard`), with helpers in `mobile/src/lib/doses.ts` and contract types (`DerivedDose`). The card's label comes from `dose.status`, never from its position in the list. | The old card took ~40% of a short screen and showed labels by row position. | Only the next dose is visible on Home; the full list is behind "See all". | Final |
| The dedication screen ("For Mom", text from `intro.dedicationText` in `en.json`) auto-advances after `DEDICATION_HOLD_MS = 1100` (`mobile/src/config/intro.ts`), in Pinyon Script; tapping skips. | User: "just a glance". | A hard cut to Home, no fade. | Final; cross-fade kept in view (KIV) |
| The Vite dev server may read `../shared` (`server.fs.allow: ['..']`), and Vercel builds from the repo root with Root Directory `mobile`. | The app imports `shared/` (contract, rules), which sits outside `mobile/`. | Deploys must run from the repo root, not from `mobile/`. | Final for previews |

## 2026-10-13 — Ways of working

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Collaboration mode is **team**: every push needs the user's yes, typed in the session that pushes. | Two people + CodeBuddy share the repo. | Slower pushes. | Final |
| CodeBuddy builds features (proof for judging); Claude Code does structural fixes on `claude/*` branches; CodeBuddy uses `cb/*`. Only the user merges PRs. | Organiser rule: CodeBuddy must be the visible build tool. | CodeBuddy once merged its own PR (PR 2) before PR 1; it was recovered with a merge, no history rewritten. | Final |
| Vercel is used for preview links only. Production host for T1-17 is still to be confirmed (EdgeOne Pages vs Vercel). | Hosting decision belongs to Person 1. | `pawtner-mobile-three.vercel.app` still serves an older build. | Open |

## 2026-10-14 — Emergency beat, decision log, tap-the-dog (handed to CodeBuddy on `cb/emergency-beat`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Until T1-07 exists, the phone runs `decide()` from `shared/rules` locally behind one async function, `requestDecision()` in `mobile/src/lib/agent.ts`; no component calls `decide()` directly. | Tier 1 is due tonight and the API doesn't exist; rules still decide (PRD §7.1). | Decisions live in page state and reset on reload; swapping to the API is a one-file change. | Tentative until T1-07 |
| The 995 message shows "995" in large text but is **not** a `tel:` link. | Demo safety: no accidental real emergency calls on stage. | A real user would want tap-to-call; revisit before any real use. | Tentative |
| The 995 and GP wording comes from `decision.wording` (`shared/templates.ts`), never from components or `en.json`. | One source of truth; the emergency path never calls the model. | That wording isn't translated through i18n yet. | Final |
| Tapping the dog plays reactions in turn: hop → hearts → speech bubble → bark. No playful reaction when mood is attentive; with reduced motion, only the bubble and bark. Order, timings and sound path in `mobile/src/config/pet.ts`. | User request: "alternation of all the above"; PRD §7.6 keeps attentive moments calm. | Hearts are decoration only and don't change the heart score. | Tentative until built |
| The bark plays only if a licence-free `mobile/public/assets/bark.mp3` exists; CodeBuddy must not download audio. | Unknown licences on downloaded sound files. | No bark until the user supplies a file. | Final |
| Tap-the-dog is bundled with T1-10/12 in one branch. | User's choice: both touch `DogStage` and mood. | A bigger PR to review. | Final |

## 2026-10-14 — Caretakers on `/care`

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `/care` shows a list of caretakers (the database already allows many per senior via `user_caregivers`). Each person shows "Gets check-ins" or "Updates only", mapped to the existing per-row `opted_in`. | User: multiple caretakers is worth keeping; the schema already supports it. | The API contract (`shared/contract.ts`) and the seed still have one caretaker; P1 to add a list. `relationship` isn't in the schema and is dropped (see below). | Final (front end); contract change pending P1 |
| **One shared check-in threshold** for all caretakers ("send a check-in after N missed doses in a row", minimum 2). **No database change:** the schema keeps `threshold` per `user_caregivers` row, and saving writes the same value to every row. The existing `EscalationSettingsRequest { optedIn, threshold }` already carries one value. | User: the web page has one setting; time is short, so P2's changes stay front-end only. | Per-person thresholds are not offered; rows could drift if something writes one row directly. | Final |
| `relationship` ("Neighbor", "Friend") is **dropped** from `/care`: each caretaker shows name, initial and "Gets check-ins" / "Updates only". | No database changes this week; the page then looks the same on mock data and on the API. | Less context per person (e.g. why a neighbour gets updates only). | Final for the hackathon |

