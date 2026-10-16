# Kanban

Updated 2026-10-15. Tier 1 is due **Wednesday night**; submission **Fri 16 Oct**. IDs refer to `PRD.md` §9.
"Mock" = works on the phone against mock data in `mobile/src/mock`, not yet wired to the API.

## Doing

Today's plan (agreed 13 Oct evening), in order:
1. Morning: message P1 for the hosting decision, the first endpoints (`today`, `dose event`) and the contract additions for `/care`.
2. T1-10 + T1-12 emergency beat.
3. T1-15 `/care` from the Figma Make export, wired to the API with a mock fallback (PR from `claude/care-web`).
4. Afternoon: T1-16 simulated walk.
5. Evening: connect to the API if it's ready, then deploy to production.
6. Later, if there's time: T2-10 morning/night from one shared helper (done on `claude/night-stars`, see Done).

| ID | Item | Owner | State |
|---|---|---|---|
| T1-08 | Home schedule card, names from data | P2 / CodeBuddy | Wired to `/api/today`; upcoming reminders remain mock. |
| T1-09 | "Taken" flow with optional photo | P2 / CodeBuddy | Posts dose event and derives status from ledger; offline fallback (local taken + local `celebrate`) on `claude/sleepy-taken-fallback`; scanner/photo is still a prototype. |
| T1-11 | In-app nudge + demo clock | P2 | Settings > For demo only > Current Time of Demo ("Run Buddy's check at this time") runs the deterministic agent; dose nudges are capped at two per occurrence. |
| T1-13 | Dog mood on Home | P2 | Shared dog mood fed from API state; visual moods remain motion/glow. |
| T1-15 | `/care` web page from the Miro frame | P2 / CodeBuddy | Done: landing, demo sign-in picker, This week, Alerts & caregivers, Settings. PR #14, #16, #21. Check-in on/off and the number of missed days are set on /care Alerts (min 1 day, `claude/demo-settings`); the phone no longer has them; the phone's caretaker screen was removed (`claude/health-care`). Web page needs P1's caretaker list (see Blocked). |
| T1-17 | Public HTTPS URL | P2 (+ P1 API) | **15 Oct 22:45:** EdgeOne `/api/today` returns live JSON (hosted DB seeded); no CORS. Supabase migrations 002–005 applied (user, 15 Oct night): `/api/medications`, treats and search return 200; HSA product list imported by CSV (5,511 rows); search works. **Vercel production = `main` @ `2488d28`** (through #63; checks passed first). EdgeOne redeploys itself from main. Earlier: **Front end in production:** `pawtner-care.vercel.app` (and `pawtner-mobile-three.vercel.app`) = `main` @ `2a182f9` incl. `/care` and PRs #28–#31 (deploy `pawtner-mobile-3ppynl9e6`, 15 Oct; typecheck, 78/78 tests, build). No hosted API yet: offline fallback; Taken and the emergency beat and walk work offline, the demo clock and Tier 2 screens need the API. P1's EdgeOne copy **`pawtner.edgeone.dev`** serves `main` @ `1fc0b53` with working `/care/*` deep links, but `/api/*` returns `index.html` (no function live; checked 15 Oct). API hosting code is on `main` (P1 pushed directly, 15 Oct): `api/[...path].ts` + ROOT `vercel.json` for Vercel, `functions/api/[[path]].mjs` for EdgeOne. Our Vercel project ignores the root `vercel.json` (Root Directory `mobile`; preview from `1fc0b53`: `/` and `/care` OK, `/api` 404). Going live needs either Root Directory → repo root + `DATABASE_URL` on Vercel, or a working EdgeOne function (+ CORS if split hosts), and the Supabase schema migrated (P1). Until then the deployed front end still runs on the offline fallback (beats 2 and 3 work; beat 1 needs the API). |
| T1-18 | Dog assets | Design | Base dog + garden day/night done; base dog replaced with a sharper version of the same art (toned and aligned to the old canvas, 15 Oct). Sleepy art (`dog-sleepy.webp`) and joyful art (`dog-joyful.webp`, `claude/joyful-art`) wired, same canvas as the base; content and attentive still use the base art. |

## Backlog (Tier 1)

| ID | Item | Owner | Note |
|---|---|---|---|
| T1-07 | APIs (today, dose event, health metric, agent decide, caretaker summary, escalation, walk) | P1 | Implemented in `api/`; integration test covers today, BP emergency rule and dose event. |

## In repo, owned by P1 (not re-verified by the advisor)

| ID | Item | Where |
|---|---|---|
| T1-01 | Schema + fictional seed | `migrations/001_init.sql`, `migrations/seed.sql` |
| T1-02 | Contract + 4 fixtures | `shared/contract.ts`, `shared/fixtures.ts` (marked PROVISIONAL) |
| T1-03 | Selectors | `shared/selectors.ts`, `tests/unit/selectors.test.ts` |
| T1-04 | Rules + `selectDogMood` | `shared/rules.ts`, `tests/unit/rules.test.ts` |
| T1-05 | Refusals | `shared/refusals.ts`, `tests/unit/refusals.test.ts` |
| T1-06 | Wording with template fallback | `shared/wording.ts`, `shared/templates.ts` |

## Done

| ID | Item | PR |
|---|---|---|
| — | Repo clean-up: unused `max-garden.jpg` removed, `playwright` moved to devDependencies, stale `functions/` ignore line dropped, CLAUDE.md PRD path fixed, favicon linked, `Pawtner.csv` → `docs/user-stories.csv`; old local worktrees and merged local branches removed (CodeBuddy ones kept) | Branch `claude/repo-cleanup` |
| — | /care footer "Watch the demo video" slot (`DEMO_VIDEO_URL`, "#" until the YouTube link exists) | Branch `claude/demo-video-link` |
| — | /care "A lovely rhythm": Sunday to Saturday; a past day filled when Buddy ended it on 2+ hearts (`dayHearts` in the summary) | Branch `claude/care-week-sunday` |
| — | Dose-time reminder: Buddy barks once + toast at each saved dose time if not taken (once per dose, before the nudges); demo clock runs forward from when it is set | Branch `claude/dose-reminder` |
| — | Combination strengths: "&&" shows as " / " on every strength (Home, Reminders, My medicines, product search); Twynsta row → "80 mg / 10 mg" (SQL by the user) | Branch `claude/strength-display` |
| — | Hearts carry over: +1 per activity (max 4), -1 every 12 hours without a new heart (min 1); lifetime = each day's hearts at its end | [#70](https://github.com/whansel007/Pawtner/pull/70) |
| — | Hearts: start 1 + all medicines / measurement / walk (max 4), lifetime hearts the same; /care "x of 3 activities is done today"; demo ticks Today's hearts 1–4, "7-day streak", "20 hearts in total" | [#69](https://github.com/whansel007/Pawtner/pull/69) (heart rule replaced by #70) |
| — | Migration 006 (check-in threshold minimum 1 day) applied on Supabase by the user, 16 Oct | — |
| — | Drag Home's card: full-screen Buddy (next-dose strip) / both / full-screen form, portrait and landscape; tap the bar for both | [#66](https://github.com/whansel007/Pawtner/pull/66) |
| — | Settings "For demo only" closed card; demo ticks drive the one streak/hearts number; "today" after the hearts; Reset to morning (API deletes today's doses, readings, decisions; clock 9:00); roomier short landscape; check-ins by missed days, set by Jamie on /care (switch + days stepper), check-in card on This week; Rose's check-in card removed; landscape Home card centred and scaled to the pane (portrait unchanged; tablets fill the pane); signed-in /care follows the phone's clock and refreshes every 15 s (landing Buddy fixed); two footer lines removed | [#65](https://github.com/whansel007/Pawtner/pull/65) |
| T1-10 | BP judged against the first reading (+5 slack): Warning / Keep at it / Good job; "How do you feel?" tick boxes (I feel fine + 6 emergency signs); first reading on Settings | Branch `claude/bp-first-reading` |
| — | Buddy plays in every mood; only fewer than 2 hearts stop play, with a "needs a heart" bubble (attentive from readings no longer blocks animations); 0–1 hearts always show the sad face (one shared `DEMO_RULES.lowHeartMaximum`; P1 files, user OK'd; EdgeOne bundle rebuilt) | Branch `claude/play-hearts` |
| — | 16 Oct: calm urgent card on Health with a small "Call 995" button (not on Home); Why? without "What it noticed"; no World card on Milestones; clinic memo photos append and remove one at a time; note edits keep earlier versions; notes shared with Jamie or just for me; refill requests name the medicine; "Share my blood pressure" switch (latest reading on /care); one-line privacy note; proof screen: medicine name bold; Health urgent card = Warning + reason (no 995 line, deviates from PRD T1-10); Why? reason only; /care streak hearts match the streak | Branch `claude/visit-notes` |
| — | "For my next visit" notes (add/edit/delete, this phone only) on Health and the Weekly Summary; Reminders next-dose card and date from live data; Add a medication labels one case | Branch `claude/visit-notes` |
| — | "From the Doctor" (was "Doctor's tiny tasks"); Add a medication form fits the card (360–892 px) with a centred eyebrow; restock card stays after either choice; Settings > Demo "Reset demo"; day/night is look only, hearts stay one state | Branch `claude/from-the-doctor` |
| T2-08 | Hotfix: the after-schedule "Show {{name}} the pill" step saves the original pill photo with `api.setPillReference` (main failed `tsc` after #43 used the removed `api.describePill`) | branch `claude/fix-reference-photo` |
| T1-14 | Centred 430 px column on desktop, blurred garden at the sides, responsive 360–430 px including short screens (360×640, 412×730) | [#1](https://github.com/whansel007/Pawtner/pull/1) |
| — | Layered scene: portrait garden, separate dog with shadow, ground-line alignment, dog on every senior screen | [#1](https://github.com/whansel007/Pawtner/pull/1) |
| — | Compact next-dose card (mock), dedication screen auto-advance (1.1 s, Pinyon Script) | [#2](https://github.com/whansel007/Pawtner/pull/2) |
| — | Docs: KANBAN, HANDOFF, decisions for 13 Oct; CodeBuddy proof screenshots | [#3](https://github.com/whansel007/Pawtner/pull/3) |
| T1-10 + T1-12 | BP form with note → `/api/health-metric` (offline fallback: `decide()` via `lib/agent.ts`) → calm 995 card above the form, no playful toast, attentive dog; one `DecisionLogCard` (en.json text, Yes/No, "Why?") on Health and Home; tap-the-dog rotation (hop, hearts, bubble; bark once `bark.mp3` exists). Built by CodeBuddy; merge with P1's API wiring resolved by CodeBuddy. Squash-merged. | [#6](https://github.com/whansel007/Pawtner/pull/6) |
| — | Docs for 14 Oct (plan, caretakers decisions, docs push/merge rule) | [#5](https://github.com/whansel007/Pawtner/pull/5) |
| T1-08 (part) | Names from data: dog and caretaker names via i18n interpolation; `en.json` has no hardcoded "Max", "Jamie" or "Siew" | [#4](https://github.com/whansel007/Pawtner/pull/4) |
| — | Home fix: friendly one-time API notice, tap-through toasts, compact decision row | [#7](https://github.com/whansel007/Pawtner/pull/7) |
| T1-16 | Simulated walk: growing distance, fast (bus) stretch pauses distance, dizzy dog, one walk session posted on finish | [#9](https://github.com/whansel007/Pawtner/pull/9) |
| — | UI tweaks: landscape two-column layout, shared back navigation, streak chip → Milestones, fixed card frames, tap bubble in the toast slot, stronger hearts, dizzy stars, walk end state (merged into `main` @ `d318270`) | [#10](https://github.com/whansel007/Pawtner/pull/10) |
| T1-15 | `/care` caretaker web: landing, demo sign-in picker (senior → phone app, check-ins caretaker, updates-only caretaker; front end only), This week, Alerts & caregivers (shared threshold ≥ 2), read-only Settings; crochet dog; `mobile/vercel.json` rewrites | [#14](https://github.com/whansel007/Pawtner/pull/14) |
| — | `/care` landing not personal (no names, generic dog alt), framed footer (CodeBuddy) | [#16](https://github.com/whansel007/Pawtner/pull/16) |
| — | Accessories sized relative to the dog (both dog sizes), hibiscus at the ear replaces the bandana, chips in landscape on non-Home screens (CodeBuddy) | [#17](https://github.com/whansel007/Pawtner/pull/17) |
| — | Proof screen wording: photo is proof, never verification (PRD §7.4) | [#13](https://github.com/whansel007/Pawtner/pull/13) |
| — | Demo names Rose (senior) and Buddy (dog), knitted wording (CodeBuddy) | [#19](https://github.com/whansel007/Pawtner/pull/19) |
| — | `/care` landing: tighter vertical spacing (CodeBuddy) | [#21](https://github.com/whansel007/Pawtner/pull/21) |
| — | Landscape chips row identical to Home: one shared `SceneChips` component (CodeBuddy) | [#23](https://github.com/whansel007/Pawtner/pull/23) |
| — | Landscape caregiver view: Buddy and chips in the left column; portrait unchanged (CodeBuddy) | [#24](https://github.com/whansel007/Pawtner/pull/24) |
| — | Caregiver view wording: "Shared with your circle", names from data ("Rose + Jamie") (CodeBuddy) | [#25](https://github.com/whansel007/Pawtner/pull/25) |
| — | Pill-check wording: compares with her own first photo, approved `proof.check.*` strings, friendly error, outlined `.secondary-button` (CodeBuddy) | [#28](https://github.com/whansel007/Pawtner/pull/28) |
| — | Hat on the crown, hibiscus as SVG, compact dock in short landscape, "Show me at home" → Home, tricks offline | [#29](https://github.com/whansel007/Pawtner/pull/29) |
| — | `dog.heartsTotal` (lifetime hearts, derived on read) in `/api/today` and `/api/caretaker/summary`; EdgeOne bundle regenerated (Claude Code, P1 files, P1 OK'd) | [#30](https://github.com/whansel007/Pawtner/pull/30) |
| — | Wardrobe & world unlock by lifetime hearts, "N hearts together" on Milestones, demo switch in Settings (CodeBuddy) | [#31](https://github.com/whansel007/Pawtner/pull/31) |
| — | Sun hat worn over the head (wider crown, brim on the forehead); landscape Home cards rest above the dock | Branch `claude/hat-fit-landscape` |
| T2-10 | Day/night follows the real clock (`lib/useDayPhase.ts`, re-checked every minute, demo clock overrides); twinkling knitted stars at night (`NightStars`, `config/stars.ts`, tentative positions) | Branch `claude/night-stars`, PR pending |
| — | Demo time for filming: `?time=HH:MM` / `morning` / `evening` link and Settings > Demo "Morning (9:00)", "Evening (21:00)", "Real time" buttons (no agent run, no writes); 2 s day ↔ night cross-fade of the garden | Branch `claude/demo-time` (on top of `claude/night-stars`), PR pending |
| — | Health rows on one `ActionRow` primitive; HealthHub links fixed (`screen_for_life`, `healthyliving`); "Link to Healthy 365" with logo; clinic memo photo (local only). Caretaker dashboard removed from the phone (Settings row is info only); "Send Buddy a treat" moved to `/care` This week; gift chip shows who sent the latest treat. Restock help (demo only): card on Reminders + dot on "See all", request to `/care` without the medicine name | Branch `claude/health-care` (on top of `claude/buddy-clips`), PR pending |
| T2-08 | "My medicines" (Settings): William's medicine list, Edit and Set / Replace original pill photo moved from the deleted phone `CareScreen` to `MedicinesScreen` | branch `claude/health-care` (PR #44) |
| — | Buddy video in-app: content Buddy waves on tap (`buddy-wave`), joyful Buddy waves once after "Give Buddy a heart" and on tap (`buddy-joyful`); transparent clips over the still (HEVC-alpha `.mov` on Safari, VP9-alpha `.webm` elsewhere), preloaded when Home is idle; no clip when sleepy/attentive or with reduced motion. Paw button barks (`bark.mp3`, user-supplied) and keeps its toast | Branch `claude/buddy-clips` (on top of `claude/hat-fit-landscape`), PR pending |
| — | Tricks and decisions: "High five" renamed "Wave" (API, EdgeOne bundle, mock); tapping Buddy cycles hop → hearts → bubble → bark → wave once Wave is earned (wave skipped when sleepy/attentive/dizzy/reduced motion); earned trick cards on Milestones make Buddy perform (sleepy Wave shows a gentle line); Souvenirs above Tricks. Routine decisions leave Home for the top of Milestones (995 and see-GP stay on Home); "Why?" in plain language, no rule ids | Branch `claude/tricks-decisions` (on top of `claude/buddy-clips`), PR pending |

## Blocked

| Item | Blocked on |
|---|---|
| HSA import script date bug (P1) | `scripts/import-hsa-products.ts` passes day-first HSA dates (`13/10/1992`) to a `date` column; Postgres reads them month-first, so the import fails (rollback) or stores wrong dates. Not urgent: the hosted table was filled by CSV import (5,511 rows, 15 Oct night). Fix: convert to ISO before insert. |
| T1-17 production URL | P1: host the API and run migrations + fictional seed on the hosted database (Supabase has no Pawtner schema yet). Message drafted for the user to send 14 Oct. |
| T1-15 caretaker list on the web (real data) | P1: `caregivers: { id, name, receivesCheckIns }[]` in `CaretakerSummaryResponse`, 3–4 seeded caretakers, check-in template in `shared/templates.ts`. Until then `/care` shows the API caregiver (gets check-ins) plus the mock updates-only slot `MOCK_UPDATES_ONLY_CARETAKER` in `mobile/src/care/data/mock.ts`. Also wanted: the senior's time zone in the summary (moment times use the viewer's zone). |

## Kept in view (KIV) / follow-ups

| Item | Note |
|---|---|
| Restock help: wire to the API | Demo stores the request in localStorage (`lib/restockHelp.ts`), so `/care` sees it only in the same browser. P1: table + `POST /api/restock-requests`, `GET ?status=pending`, `POST /:id/handled` (shapes and TODO in `lib/restockHelp.ts`). Supply data is live from `GET /api/medications` (mock only if that fails). No DB change made. |
| Wording waiting for the user (#65, #66) | Grab bar label and next-dose strip (`home.sheet.*`), Settings demo card (`settings.demo*`), "today" (`topZone.heartsToday`), /care check-in card (`care.web.week.checkIn*`) and Alerts switch/days strings (`care.web.alerts.*`). |
| Health wording waiting for the user | "Snap your clinic memo" / "Your clinic memo" and the restock buttons are tentative; "Ask your doctor" / "Questions for the doctor" unchanged on purpose. |
| Buddy clips: Safari/WebKit check (done 16 Oct by the user, portrait) | The `.mov` (HEVC-alpha) path is untested: Playwright WebKit isn't installed here. Check on an iPhone (Safari) and macOS Safari that the wave plays with no black box and lines up with the still. |
| P1 hosting landed on `main` without a PR (15 Oct) | `cb/api-hosting-edgeone` is fully in `main` (`1fc0b53`); nothing left to merge. Reviewed: checks pass (typecheck, 73/73, build); Vercel preview and `pawtner.edgeone.dev` still front end only. Also touched P2-owned screens (Proof, Reminders, Settings via `App.tsx`) — agreed split says screen changes go through P2. Reminders now lists `DerivedDose[]` (mock offline); Settings caretaker name from the summary. |
| Offline sample text still names people | `mobile/src/mock/care.ts`: "Two people, one Buddy" (no longer shown: the phone's caretaker screen is gone; the "Mum took her lunchtime medicine" activity was removed with it). |
| Seed history (merged #34, 15 Oct) | `migrations/seed.sql` now writes 10 days of fictional history relative to the run day (streak 7, 34 hearts before today). P1 must re-run `npm run db:seed` on the hosted DB **on the demo day** (it deletes and rewrites the two seed schedules' dose events; user told). |
| EdgeOne API fix (merged #33, 15 Oct) | `pawtner.edgeone.dev` served the front end but `/api/*` returned `index.html` (EdgeOne never scanned `functions/`). Fixed by `cloud-functions/api/[[default]].js` + root `edgeone.json`. Still needs: EdgeOne project deployed from the repo root, `DATABASE_URL` set, redeploy; then `/api/today` returns JSON. Old `functions/` folder can be deleted. Verified 15 Oct evening: `/api/today` on pawtner.edgeone.dev returns JSON (streak 7, heartsTotal 34). |
| Fixed names left in mock data | `mobile/src/mock/care.ts` has `names: "Mum + Jamie"`; Renaming the caretaker won't change it; derive it from the name fields. (`mock/milestones.ts` "From Jamie" fixed in #31.) |
| CodeBuddy credits below 5% (14 Oct) | Spend CodeBuddy only on judged features (T1-16, then T1-15). Claude Code does merges, structural fixes and screenshots. Ask organisers about a top-up. |
| First load shows a plain green screen for ~3 s | Seen on the 14 Oct preview: `garden-day.webp` and `dog-base.webp` load after Home appears. Preload them during the cover/dedication. |
| Toast says "heart is full!" at 3 of 4 hearts | `toast.bpLogged` text; pre-existing. |
| Mock dog name `"max"` lowercase; mock medicines are veterinary (Apoquel, Gabapentin) | `mobile/src/mock/home.ts`; a judge may notice. |
| BP inputs have no accessible name | Labels wrap a span and the input; the accessibility tree shows unnamed textboxes. Add `htmlFor`/`id` or `aria-label`. |
| Heart score computed inline | `App.tsx` computes `heartCount` itself instead of `computeHeart` from `shared/selectors`; two sources of truth. |
| Tap bubble on cramped Home (360×640) | When the dog's head already reaches under the name/hearts, the bubble is lifted above the head and briefly covers the name. Alternative: a smaller Home dog on short phones. |
| `viewport-fit=cover` not set | `mobile/index.html` lacks it, so the `env(safe-area-inset-*)` paddings are 0 on iPhones (the browser letterboxes instead). Adding it is a separate, all-screens change. |
| Stale checkouts mislead tools | On 14 Oct the main folder was still on the merged `cb/names-from-data` (no KANBAN/HANDOFF) and CodeBuddy tried to restart T1-08. Main folder switched to `main` the same morning. Start new work from `origin/main` in a worktree. |
| Dedication cross-fade into Home | Deferred by the user; needs Home rendered under the dedication overlay. |
| `docs/ARCHITECTURE.md`, `docs/BRIEF.md`, `docs/DOG_BIBLE.md` missing | Referenced by the PRD. |
| Proof screenshots | 13 in `proof/`; add the 1.1 s round, the names round, the 14 Oct context reset and Miora chats. |
