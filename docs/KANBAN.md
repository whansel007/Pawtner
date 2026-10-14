# Kanban

Updated 2026-10-14 (Wed). Tier 1 is due **tonight (Wed)**; submission **Fri 16 Oct**. IDs refer to `PRD.md` §9.
"Mock" = works on the phone against mock data in `mobile/src/mock`, not yet wired to the API.

## Doing

| ID | Item | Owner | State |
|---|---|---|---|
| T1-10 + T1-12 | BP log form → `decide()` → calm 995 message, attentive dog; decision log card. Bundled with tap-the-dog reactions (hop → hearts → speech bubble → bark). | P2 / CodeBuddy | Prompt handed to CodeBuddy 14 Oct; branch `cb/emergency-beat` (worktree `../pawtner-emergency`), not pushed yet. Bark needs a licence-free `mobile/public/assets/bark.mp3` from the user; skipped until it exists. |
| T1-15 | `/care` weekly summary + escalation settings | P2 / CodeBuddy | Waiting for the user's Miro frames. Care screen exists with mock data only; no router yet (`care` is screen state, not a `/care` URL). |
| T1-16 | "Simulate walk" (dizzy on the fast stretch) | P2 / CodeBuddy | Prompt being drafted. Walk screen exists with mock data only. |
| T1-09 | "Taken" flow with optional photo | P2 / CodeBuddy | Mock: Taken → proof screen → dose marked taken locally. TODO: post a `DoseEvent` once the API exists. |
| T1-13 | Dog mood on Home | P2 | One dog image; mood via motion/glow from `selectDogMood`. On `main` still not driven by agent decisions (`App.tsx`: `selectDogMood(heartCount, null)`); T1-10 work changes this. |
| T1-17 | Public HTTPS URL | P2 (+ P1 API) | Vercel previews work. Production URL `pawtner-mobile-three.vercel.app` serves a build from before PR #4 (names fix). Production host not decided. |
| T1-18 | Dog assets | Design | Base dog + garden day/night done. 4-mood sheet not started. |

## Backlog (Tier 1)

| ID | Item | Owner | Note |
|---|---|---|---|
| T1-07 | APIs (today, dose event, health metric, agent decide, caretaker summary, escalation, walk) | P1 | No API code in the repo yet; front-end wiring waits on this. |
| T1-08 | Home wired to the API (schedule card, hearts, streak) | P2 | Names-from-data part done (PR #4); API wiring waits on T1-07. |
| T1-11 | In-app nudge + demo clock | P2 | Not started. |

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
| Wiring the phone app to real data (T1-08 to T1-12, T1-15, T1-16) | T1-07 APIs and the hosting decision (P1) |
| T1-17 production URL | Hosting choice: EdgeOne Pages vs Vercel (P1) |

## Kept in view (KIV) / follow-ups

| Item | Note |
|---|---|
| Fixed names left in mock data | `mobile/src/mock/care.ts` has `names: "Mum + Jamie"`; `mobile/src/mock/milestones.ts` has `note: "From Jamie"`. Renaming the caretaker won't change these; derive them from the name fields. |
| Heart score computed inline | `App.tsx` computes `heartCount` itself instead of `computeHeart` from `shared/selectors`; two sources of truth. |
| Main folder on a merged branch | The main checkout sits on `cb/names-from-data` (merged in PR #4), so it has no `docs/KANBAN.md` or `docs/HANDOFF.md`. This misled CodeBuddy on 14 Oct. Start new work from `origin/main` in a worktree. |
| Dedication cross-fade into Home | Deferred by the user; needs Home rendered under the dedication overlay. |
| `README.md` is stale | Says the Vite app is not implemented. |
| `CLAUDE.md` paths | Points to `docs/PRD.md` and `docs/ARCHITECTURE.md`; the PRD is at the repo root and ARCHITECTURE.md doesn't exist. |
| `docs/ARCHITECTURE.md`, `docs/BRIEF.md`, `docs/DOG_BIBLE.md` missing | Referenced by the PRD. |
| `mobile/.vercel` | Old, untracked link in the main folder's `mobile/`; deploys must run from the repo root. Remove later. |
| `mobile/public/assets/max-garden.jpg` | No longer referenced; can be deleted. |
| `playwright` in `mobile` `dependencies` | Should be a devDependency. |
| Proof screenshots | 13 in `proof/`; add the 1.1 s round, the names round, the 14 Oct context reset and Miora chats. |
