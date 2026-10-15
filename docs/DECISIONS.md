# Decisions

## 2026-10-15 — Fictional seed history

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `migrations/seed.sql` builds a history relative to the day it runs (Rose's zone): schedules start today − 10; days −10..−8 Tablet A taken, Tablet B missed (2 hearts); days −7..−1 both taken (4 hearts); three normal BP readings (128/82, 124/79, 131/84, no note) on days −6, −4, −2; today empty. Expected: streak 7, `heartsTotal` 34 + today's share, Milestones caring days 10 (9 before 10:0x), caretaker summary caring days 6. | Live demo showed 0 hearts, 0-day streak, everything locked; judging happens on later days, so dates can't be fixed. | Re-running deletes **every** dose event of the two seed schedules (incl. "Taken" taps) and sets `dogs.streak = 7`; history goes stale if the seed isn't re-run on the demo day. The API integration test pins its own schema back to 13 Oct. | Tentative (target numbers) |

## 2026-10-15 — Wardrobe, pill check, accessories

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| World & wardrobe rewards unlock when Buddy's lifetime hearts reach a threshold (`config/rewards.ts`); hearts are never spent. A Settings switch "Unlock all rewards (demo)" sits under "Caretaker check-ins". | User: one currency is easy to explain; spending hearts would feel like losing something. | Needs `dog.heartsTotal` from P1; mock value until then. The seed history (below) gives 34 before today, so the hat is unlocked and glasses/Kampung stay locked. | Tentative (thresholds) |
| The AI pill check stays, reworded as a comparison with her own first photo ("Looks like your usual pill"), no similarity %, raw errors never shown. | User: it's for verification, not identification; PRD §7.4 forbids identifying a pill. | Still an AI judgement; the disclosure says it can't tell what a pill is. | Final (PR #28) |
| Hibiscus drawn as an inline SVG; hat at top 3% of the dog image (size superseded by the next row); compact dock below 430px landscape height. | `box-shadow` with % offsets was invalid CSS (petals never drew); hat brim sat on the eyes; card was 225px tall at 915×355. | The "woof!" bubble has ~1px slack in short landscape; "Show me at home" still needs a scroll there. | Final |
| Sun hat worn over the head: box top 3%, width 82%, height 23%, rotate 2deg (`config/accessories.ts`); crown 60% of the box (~49% of the dog's width, top ~4%), elliptical dome; brim full box width, 30% tall, ~18–25% of the image height. | User (Android): the old crown was ~30% of the dog's width and perched on the head with the brim across the ears, so it looked like a small hat floating on top. Values picked from rendered candidates on all three dog arts. | The brim covers the ears' bases (the ear tips show above it); one size for every mood art. | Tentative (visual) |
| Landscape Home: the cards column rests just above the dock (first card `margin-top: auto`), the spare height sits at the top of the right pane where the blurred garden shows. Card–dock gap stays `--nav-space` (16px in short landscape, 10px portrait), FullCard screens unchanged. | User: a 60–130px empty band between the card and the dock read as a big vertical gap; bottom alignment matches portrait (card above the nav). An auto margin, not `justify-content: flex-end`, keeps an overflowing column scrollable from its top. | 6px more gap than portrait in short landscape, kept so the "woof!" bubble does not overlap the card. | Final |
| Buddy sits on the lawn: the dog art's outline is feathered 1–2 px (sleepy's dark paw fringe reduced), and the ground shadows moved into `.dog-stage__ground`, a layer with the art's 1000×1300 shape, so positions are art-canvas percentages even when `max-width` narrows the image. Layers: soft cast shadow to the left, a darker footprint (x 9–91%, 0.5–11.5% up), tight paw creases at the front (x 27–73%, ~2.6%) and back (two at ~8.4%) feet lines, all behind the dog so they touch each paw's edge. Joyful and tap hops shrink and fade the ground layer and lift the creases (transform/opacity only). | User: with the sharper art the dog looked like it floated; the old shadows sat mostly below the paws and none reached the back paws. Values picked from rendered day/night, portrait/landscape, all moods. | One dark-green shadow ink for day and night (weaker on the night teal); the feet lines are measured from today's art, so new mood art must keep them. | Tentative (visual) |

## 2026-10-15 — Lifetime hearts total (`dog.heartsTotal`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `dog.heartsTotal` on `TodayResponse` and `CaretakerSummaryResponse` (shared `DogView` type) = sum of each day's `computeHeart` from the first day with a scheduled dose through today. Computed on read in `computeHeartsTotal` / `selectHeartsTotal` (`shared/selectors.ts`), never stored (no column, no write to `dogs`). | Same pattern as `streak`: one source of truth, the dose ledger. | Recomputed on every `/api/today`; days are grouped by the UTC date of `scheduledAt`/`recordedAt`, the same way `heart` and `streak` already are. | Final |
| Nothing-due rule: a day inside the range with no scheduled doses (or only upcoming ones later today) adds `DEMO_RULES.heartWhenNothingDue` (+ BP bonus if logged); days before the first scheduled dose, future days, and an empty history add 0. | A past day adds the heart the dog showed that day; today's share always equals `dog.heart`. | A gap between schedules still earns 2 hearts a day. | Tentative |
| `loadSource` in `api/repository.ts` reads occurrences from each schedule's `starts_on` (365-day cap removed). | A lifetime total needs the full history. | Data grows with days × schedules; fine for the single-user demo. Inactive medications drop out of the history, as they already did for the streak. | Final |

## 2026-10-15 — EdgeOne API as a Node cloud function

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Serve the API on EdgeOne from `cloud-functions/api/[[default]].js` (Node runtime), a committed esbuild bundle of `cloud-functions-src/api-entry.mjs` + `api/` + `shared/` + `pg`, with a root `edgeone.json` (repo root as project root, Vite build only, SPA fallback, maxDuration 30). Missing `DATABASE_URL` returns a JSON 503 instead of a load-time crash. | EdgeOne ignores `functions/`/`.mjs` for Node functions; `pg` needs TCP, so not edge functions; bundling `pg` avoids depending on a runtime `node_modules` install; a prebuilt bundle keeps the EdgeOne build to the front end only. | The 245 KB bundle must be rebuilt and committed after any `api/`/`shared/` change; not yet verified on EdgeOne itself (local CLI needs a login); old `functions/` folder still in the repo. | Tentative until `/api/today` returns JSON on `pawtner.edgeone.dev` |

## 2026-10-15 — P1 hosting review

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Vercel project `pawtner-mobile` stays on Root Directory `mobile` (front end only) after P1's root `vercel.json` landed on `main`. Switching to the repo root, to serve `api/[...path].ts` from the same origin, waits for the hosted database to be migrated and `DATABASE_URL` to be set. | The root config is ignored today, so production and `/care` deep links keep working (preview from `1fc0b53` checked); switching early would only turn offline mode into failing function calls. | No hosted API until someone switches the setting; two `vercel.json` files to keep in sync meanwhile. | Tentative, user's call |

## 2026-10-15 — Demo time shortcuts and day/night fade (branch `claude/demo-time`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `?time=HH:MM` (24-hour) or `?time=morning` or `?time=evening` (presets in `config/demo.ts`: 09:00, 21:00) sets the demo clock on load to today's date at that time in `SENIOR_TIMEZONE`; Settings > Demo gets "Morning (9:00)", "Evening (21:00)" and "Real time" buttons. They only refresh `/api/today` (GET) and go Home; they never run the agent. The parameter is read once on load and kept in the URL. | Filming needs an instant switch of time of day without writing decisions to the database. | "Real time" doesn't remove `?time=` from the URL, so a reload re-applies it. The datetime input shows the instant in the device's time zone (as before). | Tentative |
| Day ↔ night cross-fade: the day garden is the opaque base, the night garden (with `NightStars`) sits on top and fades its opacity over `PHASE_FADE_MS` (2 s). Instant under reduced motion; no fade on first load. Each garden has its own art box (aspect, ground line). The inactive garden mounts once the active one has loaded. | A hard cut looked abrupt on video; fading only the top layer never dips to the shell colour. | Both garden images load (~315 KB together), the second after the first has loaded. The blurred desktop backdrop (≥ 500 px wide) still switches instantly. | Tentative |

## 2026-10-15 — Day/night by the real clock, twinkling knitted stars (T2-10)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| The garden follows the real clock: `lib/useDayPhase.ts` re-checks every `PHASE_RECHECK_MS` (60 s, `config/scene.ts`) and when the app returns to the foreground; the Settings demo clock still overrides. Rule in one pure helper, `lib/dayPhase.ts` (`resolveDayPhase`, unit-tested), on top of `shared/day-phase.ts` (day 07:00–18:59). | Without the demo clock the garden was always day. | Timezone is the constant `SENIOR_TIMEZONE = "Asia/Singapore"` in `config/scene.ts`: `users.timezone` exists in the database but the API doesn't expose it yet. | Final (timezone tentative until the API sends it) |
| Night adds a separate `NightStars` layer (`components/NightStars.tsx`): six knitted stars (two `star-knit.webp`, two `star-knit-2.webp`, two peach `star-knit-warm.webp`) twinkling 3.9–5.6 s with staggered offsets, opacity + scale only, still at full opacity under reduced motion. Positions are % of the art box (`config/stars.ts`), placed between the painted stars. | Adds life to the night sky without new art; art coordinates keep the stars in the sky at every crop. | The sky band is small: on portrait phones it sits behind the name/hearts and settings button; in short landscape (915×355) it is almost entirely cropped, so at most one star shows. | Tentative (positions, sizes, timing) |

## 2026-10-13 — Provisional shared contract draft

- Added `shared/contract.ts`, `shared/config.ts`, and four PRD-based fixtures before design exports were available.
- The contract is explicitly provisional; check screen fields against `docs/design/` and get confirmation before finalizing it or adding API handlers.
- Thresholds and symptom terms are centralized as demo values. Names in fixtures are fictional data.

## 2026-10-13 — Front-end scene and Home layout (PR 1, PR 2)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Sun and stars are drawn into the garden backgrounds (`garden-day.webp`, `garden-night.webp`); no separate sky layer. Day/night = swap one image via `BACKDROP_BY_PHASE` in `mobile/src/config/scene.ts`. (15 Oct: a twinkling `NightStars` layer now sits on the night art, see T2-10 above.) | The art arrived with the sky baked in; one fewer layer to align. | The sun can't be repositioned in code; it may sit near the settings button on narrow phones. | Final for the hackathon |
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

## 2026-10-14 — Afternoon: P1's API wiring, merges, CodeBuddy credits

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| PR #6 merged with **squash**. | Its history contained 18 MB of UI screenshots that were later deleted; squash keeps them out of `main`. | The six CodeBuddy commits show as one on `main` (they remain visible in PR #6). | Final |
| When PR #6 conflicted with P1's front-end wiring: keep P1's API calls (`lib/api.ts`, `refreshToday`, demo clock, escalation settings); keep P2's BP form with note, result card, `DecisionLogCard` and tap reactions. William's `DecisionLogCard` and the dog-name `.toLowerCase()` were removed. | P1's form had no note, so the "bad headache" 995 path could not fire; names come from data unchanged. | — | Final |
| The BP form falls back to local `decide()` when `/api/health-metric` fails. | No hosted API yet; the emergency beat must still work on the deployed URL. | Offline readings aren't saved. | Tentative until the API is hosted |
| Raw API errors are never shown to the senior: console detail, one friendly notice per outage for background loads, a notice on every failed user action; toasts don't block taps. | A stuck technical toast covered the dog and blocked taps on 360×640. | Background failures after the first notice are silent until the API recovers. | Final (PR #7) |
| Home shows the decision log only once a decision exists, as one compact row. | The empty card took the dog's space on short phones. | Slight crop of the dog's head at 360×640 when a decision exists. | Final (PR #7) |
| Ownership split with P1: P1 owns `api/`, `shared/`, `migrations/`, `mobile/src/lib/api.ts`; P2 owns screens and components. | Both built the same front-end features on 14 Oct. | Screen changes P1 needs go through P2. | Final (user told P1) |
| With CodeBuddy credits below 5%, CodeBuddy builds only judged features (T1-16, then T1-15); Claude Code does merges, structural fixes and screenshots. | Credits ran low after screenshot-script loops. | Fewer CodeBuddy commits; proof already exceeds the PRD target (13 chat screenshots, target 10+). | Final |

## 2026-10-14 — UI tweaks batch (`claude/ui-tweaks`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Landscape = two columns, only for touch devices held sideways and short landscape windows (`LANDSCAPE_MEDIA_QUERY` in `config/scene.ts`, repeated once in `index.css`). Left: garden, top bar, dog, Home's chips. Right pane (`clamp(360px, 48vw, 480px)`): the card, scrolling inside, with the nav and paw button; the blurred garden shows behind it. | At 844×390 the nav covered the card and one line of content was visible. A mouse desktop must keep the centred 430 px column. | A desktop window shorter than 520 px in landscape also gets two columns. The card is ~230 px tall at 740×360. | Final |
| In landscape the dog stands on the lawn in the left column on every screen: Home on the chips (`homeWide`), other screens on a `.scene-ground` marker at the chips' height (`lawn`). Sizes `clamp(110px, 30dvh, 300px)`–`46dvh`. Placement chosen by `dogPlacementFor(screen, layout)`; `useSceneLayout` follows the media query. | Keep the logic in config + `useSceneGround`; the dog must not jump between screens. | Two more placements to tune. | Sizes TENTATIVE |
| Top bar: name and settings 12 px higher (`--top-pad: max(30px, safe-area-top)`); `--top-bar-space` = top-pad + 112 px (net +4 px); one slot under the hearts (`--toast-top`) for toasts and the tap bubble. | Move the name up; give toasts/bubble a place that clears both the hearts and a dog standing on a card. | Cards on ledge screens start 4 px lower. | Final |
| The tap bubble is a `PetBubble` in the toast slot, not on the dog. `useSceneGround` publishes `--dog-top`/`--dog-height`; CSS lifts the bubble if its bottom would reach the head (9% allowance for the joyful bounce). The live region is always mounted. | The bubble covered the ears. | On cramped Home (360×640) the lifted bubble briefly covers the name. | Final |
| One `FullCard` (fixed white frame + back button, inner `.full-card__scroll`) and one `BackButton`. Top-level screens (home, health, milestones, walk, settings) say "Home"; drilled-down screens say "Back" and pop a small history (`lib/navigation.ts`, `useNavigation`, max 10). | Scrolling cards lost their frame; back labels were per screen and always went to a fixed screen. | The back button no longer scrolls away (always visible). | Final |
| Streak chip is a button ("🔥 N days", plural) to Milestones, which opens with "N days in a row with every dose taken."; both use the live streak (`livePet`). | The flame number had no meaning or action. | Emoji rendering varies by platform. | Final |

## 2026-10-14 — Sleepy art and offline "Taken" (branch `claude/sleepy-taken-fallback`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `sleepy` and `joyful` use their own art (`dog-sleepy.webp`, `dog-joyful.webp`; 1000×1300, same canvas and feet line as `dog-base.webp`); content and attentive stay on the base art. If a mood image fails to load, `DogStage` shows `DOG_BASE_IMAGE` (`useImageWithFallback`); the dog hides only if the base art fails too. | First mood art available; same canvas keeps the ground line and accessory positions valid. | No preload: the first switch to a mood art may show the new image a moment late. | Tentative until the full mood sheet exists |
| When `api.doseEvent` fails, `handleDoseVerified` calls `reportApiProblem(error)` (the once-per-outage background notice, not "didn't save", which would contradict a dose shown as taken), then marks the dose taken in local state (`eventAt` = `occurredAt`), sets a local `celebrate` decision from `requestDecision()` (new optional `latestDoseEvent` in `buildAgentInputFromState`), goes Home and shows the heart toast. The local heart formula lives once in `localHeartCount()` in `App.tsx`. | Demo beat 1 must work without a hosted API. | The local "taken" is not saved; the next successful `/api/today` drops it. The heart toast replaces the notice at once in the single toast slot. With a stale `today`, heart and mood don't move. | Tentative |

## 2026-10-14 — Caretaker web `/care` (T1-15, branch `claude/care-web`)

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| `/care` lives in the same Vite app: a path switch in `main.tsx` (`lib/pathname.ts`, `history.pushState`/`popstate`), the care app lazy-loaded, all styles under `.care-root` with `care-` classes; `mobile/vercel.json` rewrites `/care/*` to `index.html`. | No router dependency; the phone app's bundle and CSS stay as they were (phone CSS build verified byte-identical). | Hosts need an SPA rewrite for deep links (EdgeOne still to add). | Final |
| Demo sign-in is a **front-end-only** persona picker (JagaOS-style): no passwords, no accounts, no database change. The chosen caretaker slot is kept in `sessionStorage`; Log out clears it. Signed-in pages without a persona redirect to the picker. | User decision: a demo needs roles to show, not real auth. | Anyone can pick any persona; not a security boundary (PRD: fictional single-user demo). | Final for the hackathon |
| **Three personas**: the senior (opens the phone app at `/`), the caretaker who gets check-ins (API `summary.caregiver`), the caretaker with updates only (typed mock slot "Alex" until P1's caregivers list exists). | User decision; the API has one caregiver today. | One mock person on a live page; marked `isMockSlot` in data. | Final; mock slot tentative until P1 |
| **Updates-only visibility**: no check-in moments (`kind: "check_in"`), Alerts page read-only with a calm note that check-ins go to the people the senior chose. The check-ins caretaker sees everything and can change the shared threshold (only with consent on and the API reachable). | User decision; PRD §7.5/§11 (check-ins only with consent, only to chosen people). | The threshold stays locked while the senior hasn't opted in. | Final |
| `/care` Settings is **read-only**: dog and senior names from data, weekly-summary preview, no toggle; "Medication editing: coming soon" kept (no web medication editing exists). Consent is shown, never changed, on the web. | User decision; consent belongs to the senior (phone). | Caretakers can't rename anything from the web. | Final |
| The design's cartoon dog is replaced by our crochet dog (`DOG_IMAGE_BY_MOOD`, by `dog.mood`); the felt garden is reused as `care-garden.webp` (1920×800, 121 KB, from a 2.8 MB PNG). | One dog everywhere; page weight. | The garden is a second art style next to the phone's garden. | Final |
| When an API call fails, `/care` shows typed mock data and one friendly notice (`care.web.notice.offline`); details go to the console. Saving is disabled offline. | Same rule as the phone (`reportApiProblem`); no hosted API yet. | Mixed live/mock data if only one call fails. | Final |

## 2026-10-14 — Demo names and wording

| Decision | Reason | Tradeoff | Status |
|---|---|---|---|
| Demo senior is **Rose** (was Siew Lan); demo dog is **Buddy** (was Max). Changed in `migrations/seed.sql`, `shared/fixtures.ts`, mock data and tests (PR #19); no hardcoded names in components ("Just {{name}}"). | User's choice; Buddy was picked by CodeBuddy when the prompt kept a `<NAME>` placeholder, then accepted by the user. | P1 must seed the hosted DB from main after #19. | Final |
| User-facing wording says **knitted**, not crochet. | User: "knitted sounds better". | — | Final |

