# Kanban

Updated 2026-10-14. Tier 1 is due **Wednesday night**; submission **Fri 16 Oct**. IDs refer to `PRD.md` §9.
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
| T1-12 | Decision log card | P2 | Home shows latest wording, observations, rule, reasoning, and wording source. |
| T1-13 | Dog mood on Home | P2 | Shared dog mood fed from API state; visual moods remain motion/glow. |
| T1-17 | Public HTTPS URL | P2 (+ P1 API) | Vercel previews work. Production host not decided; production URL serves an older build. |
| T1-18 | Dog assets | Design | Base dog + garden day/night done. 4-mood sheet not started. |

## Backlog (Tier 1)

| ID | Item | Owner | Note |
|---|---|---|---|
| T1-07 | APIs (today, dose event, health metric, agent decide, caretaker summary, escalation, walk) | P1 | Implemented in `api/`; integration test covers today, BP emergency rule and dose event. |
| T1-10 | BP log + 185/120 "bad headache" → calm 995 message, attentive dog | P2 | BP entry posts to API; fixed emergency wording and attentive mood appear in the Home decision log. |
| T1-15 | `/care` weekly summary + escalation settings | P2 | Care and weekly summary use backend aggregates; consent and threshold save through the API (minimum two). |
| T1-16 | "Simulate walk" (dizzy on the fast stretch) | P2 | Walk completion posts a simulated session; no GPS or distance capture. |

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
| T1-08 (part) | Names from data: dog and caretaker names via i18n interpolation; `en.json` has no hardcoded "Max", "Jamie" or "Siew" | [#4](https://github.com/whansel007/Pawtner/pull/4) |

## Blocked

| Item | Blocked on |
|---|---|
| T1-17 production URL | Hosting choice: EdgeOne Pages vs Vercel (P1) |

## Kept in view (KIV) / follow-ups

| Item | Note |
|---|---|
| Fixed names left in mock data | `mobile/src/mock/care.ts` has `names: "Mum + Jamie"`; `mobile/src/mock/milestones.ts` has `note: "From Jamie"`. Renaming the caretaker won't change these; derive them from the name fields. |
| Heart score computed inline | `App.tsx` computes `heartCount` itself instead of `computeHeart` from `shared/selectors`; two sources of truth. |
| Stale checkouts mislead tools | On 14 Oct the main folder was still on the merged `cb/names-from-data` (no KANBAN/HANDOFF) and CodeBuddy tried to restart T1-08. Main folder switched to `main` the same morning. Start new work from `origin/main` in a worktree. |
| Dedication cross-fade into Home | Deferred by the user; needs Home rendered under the dedication overlay. |
| `CLAUDE.md` paths | Points to `docs/PRD.md` and `docs/ARCHITECTURE.md`; the PRD is at the repo root and ARCHITECTURE.md doesn't exist. |
| `docs/ARCHITECTURE.md`, `docs/BRIEF.md`, `docs/DOG_BIBLE.md` missing | Referenced by the PRD. |
| `mobile/.vercel` | Old, untracked link in the main folder's `mobile/`; deploys must run from the repo root. Remove later. |
| `mobile/public/assets/max-garden.jpg` | No longer referenced; can be deleted. |
| `playwright` in `mobile` `dependencies` | Should be a devDependency. |
| Proof screenshots | 13 in `proof/`; add the 1.1 s round, the names round, the 14 Oct context reset and Miora chats. |
