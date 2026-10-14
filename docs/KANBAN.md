# Kanban

Updated 2026-10-14 (evening). Tier 1 is due **Wednesday night**; submission **Fri 16 Oct**. IDs refer to `PRD.md` §9.
"Mock" = works on the phone against mock data in `mobile/src/mock`, not yet wired to the API.

## Doing

Today's plan (agreed 13 Oct evening), in order:
1. Morning: message P1 for the hosting decision, the first endpoints (`today`, `dose event`) and the contract additions for `/care`.
2. T1-10 + T1-12 emergency beat.
3. T1-15 `/care` from the Miro frames, on mock data.
4. Afternoon: T1-16 simulated walk.
5. Evening: connect to the API if it's ready, then deploy to production.
6. Later, if there's time: T2-10 morning/night from one shared helper.

| ID | Item | Owner | State |
|---|---|---|---|
| T1-08 | Home schedule card, names from data | P2 / CodeBuddy | Wired to `/api/today`; upcoming reminders remain mock. |
| T1-09 | "Taken" flow with optional photo | P2 / CodeBuddy | Posts dose event and derives status from ledger; scanner/photo is still a prototype. |
| T1-11 | In-app nudge + demo clock | P2 | Settings demo clock runs the deterministic agent; dose nudges are capped at two per occurrence. |
| T1-13 | Dog mood on Home | P2 | Shared dog mood fed from API state; visual moods remain motion/glow. |
| — | UI tweaks: landscape two-column layout, shared back navigation, streak chip → Milestones, fixed card frames, tap bubble in the toast slot, stronger hearts, dizzy stars, walk end state | P2 / Claude Code | Branch `claude/ui-tweaks`, committed locally; push + PR waiting for the user's yes (team mode). |
| T1-15 | `/care` web page from the Miro frame | P2 / CodeBuddy | Frame in progress. The phone's Care/Settings screens already use the API (summary, consent, threshold min 2). Web page needs P1's caretaker list (see Blocked). |
| T1-17 | Public HTTPS URL | P2 (+ P1 API) | Preview of `main` @ `806cc66` (front end only, no API, offline fallback): `pawtner-mobile-3vgi0crkq-fresfrida.vercel.app` (14 Oct 15:02). Production `pawtner-mobile-three.vercel.app` still serves the 13 Oct build. `main` now calls `/api` on load, so a front-end deploy needs a hosted API first (until then the app runs on the offline fallback and shows one notice). |
| T1-18 | Dog assets | Design | Base dog + garden day/night done. Sleepy art (`dog-sleepy.webp`, same canvas) wired on `claude/sleepy-taken-fallback`; joyful, content, attentive still use the base art. |

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
| T1-14 | Centred 430 px column on desktop, blurred garden at the sides, responsive 360–430 px including short screens (360×640, 412×730) | [#1](https://github.com/whansel007/Pawtner/pull/1) |
| — | Layered scene: portrait garden, separate dog with shadow, ground-line alignment, dog on every senior screen | [#1](https://github.com/whansel007/Pawtner/pull/1) |
| — | Compact next-dose card (mock), dedication screen auto-advance (1.1 s, Pinyon Script) | [#2](https://github.com/whansel007/Pawtner/pull/2) |
| — | Docs: KANBAN, HANDOFF, decisions for 13 Oct; CodeBuddy proof screenshots | [#3](https://github.com/whansel007/Pawtner/pull/3) |
| T1-10 + T1-12 | BP form with note → `/api/health-metric` (offline fallback: `decide()` via `lib/agent.ts`) → calm 995 card above the form, no playful toast, attentive dog; one `DecisionLogCard` (en.json text, Yes/No, "Why?") on Health and Home; tap-the-dog rotation (hop, hearts, bubble; bark once `bark.mp3` exists). Built by CodeBuddy; merge with P1's API wiring resolved by CodeBuddy. Squash-merged. | [#6](https://github.com/whansel007/Pawtner/pull/6) |
| — | Docs for 14 Oct (plan, caretakers decisions, docs push/merge rule) | [#5](https://github.com/whansel007/Pawtner/pull/5) |
| T1-08 (part) | Names from data: dog and caretaker names via i18n interpolation; `en.json` has no hardcoded "Max", "Jamie" or "Siew" | [#4](https://github.com/whansel007/Pawtner/pull/4) |
| — | Home fix: friendly one-time API notice, tap-through toasts, compact decision row | [#7](https://github.com/whansel007/Pawtner/pull/7) |
| T1-16 | Simulated walk: growing distance, fast (bus) stretch pauses distance, dizzy dog, one walk session posted on finish | [#9](https://github.com/whansel007/Pawtner/pull/9) |

## Blocked

| Item | Blocked on |
|---|---|
| T1-17 production URL | P1: host the API and run migrations + fictional seed on the hosted database (Supabase has no Pawtner schema yet). Message drafted for the user to send 14 Oct. |
| T1-15 caretaker list on the web | P1: `caregivers: { id, name, receivesCheckIns }[]` in `CaretakerSummaryResponse`, 3–4 seeded caretakers, check-in template in `shared/templates.ts`. |

## Kept in view (KIV) / follow-ups

| Item | Note |
|---|---|
| Fixed names left in mock data | `mobile/src/mock/care.ts` has `names: "Mum + Jamie"`; `mobile/src/mock/milestones.ts` has `note: "From Jamie"`. Renaming the caretaker won't change these; derive them from the name fields. |
| CodeBuddy credits below 5% (14 Oct) | Spend CodeBuddy only on judged features (T1-16, then T1-15). Claude Code does merges, structural fixes and screenshots. Ask organisers about a top-up. |
| First load shows a plain green screen for ~3 s | Seen on the 14 Oct preview: `garden-day.webp` and `dog-base.webp` load after Home appears. Preload them during the cover/dedication. |
| Toast says "heart is full!" at 3 of 4 hearts | `toast.bpLogged` text; pre-existing. |
| Mock dog name `"max"` lowercase; mock medicines are veterinary (Apoquel, Gabapentin) | `mobile/src/mock/home.ts`; a judge may notice. |
| BP inputs have no accessible name | Labels wrap a span and the input; the accessibility tree shows unnamed textboxes. Add `htmlFor`/`id` or `aria-label`. |
| Heart score computed inline | `App.tsx` computes `heartCount` itself instead of `computeHeart` from `shared/selectors`; two sources of truth. |
| Tap bubble on cramped Home (360×640) | When the dog's head already reaches under the name/hearts, the bubble is lifted above the head and briefly covers the name. Alternative: a smaller Home dog on short phones. |
| `viewport-fit=cover` not set | `mobile/index.html` lacks it, so the `env(safe-area-inset-*)` paddings are 0 on iPhones (the browser letterboxes instead). Adding it is a separate, all-screens change. |
| "Show me at home" on World & wardrobe goes to Milestones | `CustomizeScreen` wires it to the back action; the label says Home. Pre-existing. |
| Stale checkouts mislead tools | On 14 Oct the main folder was still on the merged `cb/names-from-data` (no KANBAN/HANDOFF) and CodeBuddy tried to restart T1-08. Main folder switched to `main` the same morning. Start new work from `origin/main` in a worktree. |
| Dedication cross-fade into Home | Deferred by the user; needs Home rendered under the dedication overlay. |
| `CLAUDE.md` paths | Points to `docs/PRD.md` and `docs/ARCHITECTURE.md`; the PRD is at the repo root and ARCHITECTURE.md doesn't exist. |
| `docs/ARCHITECTURE.md`, `docs/BRIEF.md`, `docs/DOG_BIBLE.md` missing | Referenced by the PRD. |
| `mobile/.vercel` | Old, untracked link in the main folder's `mobile/`; deploys must run from the repo root. Remove later. |
| `mobile/public/assets/max-garden.jpg` | No longer referenced; can be deleted. |
| `playwright` in `mobile` `dependencies` | Should be a devDependency. |
| Proof screenshots | 13 in `proof/`; add the 1.1 s round, the names round, the 14 Oct context reset and Miora chats. |
