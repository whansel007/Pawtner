# Kanban

Updated 2026-10-13 (Tue). Tier 1 is due **Wednesday night**; submission **Fri 16 Oct**. IDs refer to `PRD.md` §9.
"Mock" = works on the phone against mock data in `mobile/src/mock`, not yet wired to the API.

## Doing

| ID | Item | Owner | State |
|---|---|---|---|
| T1-08 | Home schedule card, names from data | P2 / CodeBuddy | Compact next-dose card merged (mock). Names-from-data fixes in progress on `cb/names-from-data` (31 lines of `en.json` on `main` contain "Max" or "Jamie"). |
| T1-09 | "Taken" flow with optional photo | P2 / CodeBuddy | Mock: Taken → proof screen → dose marked taken locally. TODO: post a `DoseEvent` once the API exists. |
| T1-13 | Dog mood on Home | P2 | One dog image; mood via motion/glow from `selectDogMood`. Not driven by agent decisions yet (`latestDecision = null`). |
| T1-17 | Public HTTPS URL | P2 (+ P1 API) | Vercel previews work. Production host not decided; production URL serves an older build. |
| T1-18 | Dog assets | Design | Base dog + garden day/night done. 4-mood sheet not started. |

## Backlog (Tier 1)

| ID | Item | Owner | Note |
|---|---|---|---|
| T1-07 | APIs (today, dose event, health metric, agent decide, caretaker summary, escalation, walk) | P1 | No API code in the repo yet; front-end wiring waits on this. |
| T1-10 | BP log + 185/120 "bad headache" → calm 995 message, attentive dog | P2 | Health screen exists with mock data only. |
| T1-11 | In-app nudge + demo clock | P2 | Not started. |
| T1-12 | Decision log card | P2 | Not started. |
| T1-15 | `/care` weekly summary + escalation settings | P2 | Care screen exists with mock data only. |
| T1-16 | "Simulate walk" (dizzy on the fast stretch) | P2 | Walk screen exists with mock data only. |

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

## Blocked

| Item | Blocked on |
|---|---|
| Wiring the phone app to real data (T1-08 to T1-12, T1-15, T1-16) | T1-07 APIs and the hosting decision (P1) |
| T1-17 production URL | Hosting choice: EdgeOne Pages vs Vercel (P1) |

## Kept in view (KIV) / follow-ups

| Item | Note |
|---|---|
| Dedication cross-fade into Home | Deferred by the user; needs Home rendered under the dedication overlay. |
| `README.md` is stale | Says the Vite app is not implemented. |
| `CLAUDE.md` paths | Points to `docs/PRD.md` and `docs/ARCHITECTURE.md`; the PRD is at the repo root and ARCHITECTURE.md doesn't exist. |
| `docs/ARCHITECTURE.md`, `docs/BRIEF.md`, `docs/DOG_BIBLE.md` missing | Referenced by the PRD. |
| `mobile/.vercel` | Old link from `mobile/`; deploys must run from the repo root. Remove later. |
| `mobile/public/assets/max-garden.jpg` | No longer referenced; can be deleted. |
| `playwright` in `mobile` `dependencies` | Should be a devDependency. |
| Untracked `scripts/measure-dedication.mjs`, `scripts/screenshot-dedication.mjs` | CodeBuddy test helpers; delete. |
| Proof screenshots | 13 in `proof/`; add the 1.1 s round, the names round and Miora chats. |
