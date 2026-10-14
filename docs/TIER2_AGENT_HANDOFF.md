# Tier 2 Agent Handoff

Updated 2026-10-14. This is a working brief for the next agent continuing Tier 2 in Pawtner. Treat the root [`PRD.md`](../PRD.md), especially sections 7–10, as the product authority. [`docs/KANBAN.md`](KANBAN.md) and [`docs/HANDOFF.md`](HANDOFF.md) are status/context, but may lag the code. Confirm the actual working tree before editing.

## Mission

Continue the medicine and care-management work in Tier 2 while preserving the already-working Tier 1 demo. The highest-value path is a trustworthy medication setup loop:

1. Enter or photograph a medicine label.
2. Extract candidate fields and find possible matches in the official Singapore HSA register.
3. Let the user inspect and confirm every field; never save OCR output automatically.
4. Offer trusted, attributed medicine information and read-aloud, with safe fallback behavior.
5. Save the confirmed medicine and schedule so they appear in the senior app.

Tier 2 is broader than medication scanning. Its PRD items are T2-01 through T2-13; after the medication path, use the remaining time on the smallest complete vertical slices (photo storage, caretaker editing, GPS/walk rewards, treats and derived milestones). Preserve demo reliability over breadth.

## Start here: protect the existing checkout

- This repository has pre-existing and in-progress user changes. Inspect `git status --short` and `git diff` before modifying anything. Do not reset, clean, switch branches, or discard files.
- Work in the current checkout unless the user explicitly asks for an isolated worktree. Several agents/tools may share the same files.
- Do not commit, push, merge, or deploy without the user's explicit authorization in the session. The project handoff says only the user merges PRs.
- Do not print, paste, or log `.env` values. Never expose connection strings or API keys.
- The configured database may be shared. Do not run a destructive import, migration, seed, or object-storage upload against it without checking the exact target and whether the operation is expected. The HSA importer described below replaces the product table in one transaction; it has not been run as part of this handoff preparation.

## Current project shape

- `api/`: Node/TypeScript HTTP handlers and PostgreSQL repository (`pg`).
- `shared/`: provisional app contracts, deterministic decision rules, selectors and fixtures. Rules decide; a model may only word/rephrase trusted text.
- `migrations/`: SQL schema and fictional seed. `001_init.sql` creates the core schema; later numbered migrations are applied by `scripts/migrate.ts`.
- `mobile/`: Vite + React + TypeScript mobile-first app. Several core Tier 1 flows are API-backed, while medicine setup, proof photos, explanation, schedule, and some other screens are still prototype/mock interactions.
- `tests/unit/`, `tests/integration/`: unit and database-backed API tests. Integration tests use temporary schemas when `DATABASE_URL` is configured and skip when absent.
- `scripts/`: migration, seed, demo, and now HSA import utilities.
- API local port is 3001; Vite proxies `/api` requests to it. Root commands are in `package.json`; mobile has its own scripts/lockfile context.

Useful existing files to read:

- `PRD.md` §7 (safety/refusals), §8 (trusted medicine sources), §9.2 (Tier 2), §10 (experience), §12–16 (architecture, demo, risks).
- `api/handlers.ts`, `api/repository.ts`, `shared/contract.ts`.
- `migrations/001_init.sql`, `migrations/002_hsa_registered_products.sql`, `migrations/seed.sql`.
- `mobile/src/App.tsx`, `mobile/src/screens/PrescriptionScreen.tsx`, `ProofScreen.tsx`, `ExplanationScreen.tsx`, `ScheduleScreen.tsx`, `CareScreen.tsx`.
- `mobile/src/mock/home.ts`, `mobile/src/types/index.ts`, `mobile/src/lib/api.ts`, `mobile/src/locales/en.json`.

## Tier 2 requirements and acceptance criteria

Use these as the checklist; details in the PRD take precedence if this summary conflicts.

| ID | Requirement | Acceptance criteria / key constraint |
|---|---|---|
| T2-01 | HSA register import and product search API | Search by brand or ingredient returns registered products; source is credited. |
| T2-02 | Label photo reading, fields, HSA match, confirmation | User confirms before any medication is saved. Manual entry remains available. |
| T2-03 | MedlinePlus explanation and rephrase/code check | If the rephrase adds a number or medicine name absent from source, reject it and show source text. |
| T2-04 | Explanation screen, read-aloud, credits, local links | Read-aloud works; NDF and HealthHub links open in a new tab. NDF content is link-only. |
| T2-05 | “What did your doctor say it’s for?” | Persist and show this user-entered field first; never infer or fill it with a model. |
| T2-06 | Medication and schedule editing on `/care` | Changes show on the senior phone after refresh. |
| T2-07 | Photo proof and label upload to object storage | Database stores URLs only; keep object-storage credentials server-side. |
| T2-08 | Foreground GPS walk | Filter accuracy worse than ~30 m; pause distance after speed above 12 km/h for 30 seconds; never store route. |
| T2-09 | Souvenirs from cumulative distance | Thresholds live in `shared/souvenirs.ts`, not UI components. Singapore landmarks. |
| T2-10 | Sun/moon by local time | One shared helper chooses it. |
| T2-11 | Caretaker treats | Caretaker-issued treat appears on senior Home. |
| T2-12 | Milestones/worlds derived from data | No hardcoded progress numbers. |
| T2-13 | Cover image with title | Design/submission deliverable; coordinate rather than building a backend feature. |

## Work already started for T2-01

The current working tree contains a first, unverified implementation. Inspect it; do not blindly recreate it:

- `migrations/002_hsa_registered_products.sql` adds product-register fields and indexes.
- `scripts/import-hsa-products.ts` downloads the public data.gov.sg datastore in pages, checks for a nonempty result, then replaces the product rows in a transaction.
- `package.json` adds `db:import:hsa-products`.
- `api/repository.ts` adds product search by registered name/ingredient, minimum query length two, prioritization and a 20-result cap.
- `api/handlers.ts` adds `GET /api/products/search?q=...`.
- `README.md` documents the import and endpoint.
- `npm run typecheck` passed after these edits. No integration run or import into the configured database was performed.

Official dataset catalog: [HSA Listing of Registered Therapeutic Products](https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view). The data.gov.sg API resource ID is `d_767279312753558cbf19d48344577084`. The importer currently hardcodes the dataset's 2026-08-07 update date; verify whether the live API exposes a reliable dataset timestamp and avoid silently recording a stale date. Check actual response field names, pagination totals, date formats and maximum page size before trusting an import. HSA's [Infosearch](https://www.hsa.gov.sg/e-services/infosearch/) is the official user-facing lookup reference.

Before marking T2-01 done, review the importer for:

- Correct resource response parsing and complete pagination, including the last partial page and API errors.
- Product rows with missing licence/product names, duplicate licence numbers, null/odd field values, date parsing, and batch parameter limits.
- Atomic replacement only after a complete download and validation; rollback must preserve the previous register on insert failure.
- Repeatability and idempotence; clear source attribution and update date.
- Search query escaping, ranking, case insensitivity, result shape, empty/short query behavior, and the case where migration 002 has not yet run.
- Whether active ingredients should be searchable as text in addition to the existing `generic_name` alias. The HSA data calls this field “Active ingredients”; it is not necessarily one canonical generic name.
- Safe tests using a fixture/mock upstream response and an isolated temporary schema. Avoid making live HSA or shared-database calls just to exercise normal tests.

The current dataset is openly licensed with attribution. Cite the HSA/data.gov.sg source in UI and documentation; do not imply that a catalog match confirms the medicine is correct for this person or safe to take.

## Medication scanning: implementation outline

The existing `PrescriptionScreen` is only a visual prototype. It toggles a local `scanned` boolean; there is no camera, file input, OCR, HSA lookup, confirmation form, persistence, or genuine manual-entry path. `ProofScreen` also simulates capture by tapping. Treat these as UI starting points, not working product functionality.

Build a real staged flow:

1. **Capture/select image:** use browser camera capture on supported mobile devices (`accept="image/*"`, `capture="environment"`) and a normal file chooser for desktop/caretaker use. Keep a clear manual-entry option available at all times.
2. **Validate input:** enforce reasonable file types and size; show preview; handle cancel, permission denial, unreadable file, and upload/OCR errors with retry/manual entry.
3. **Extract candidates:** choose an OCR capability compatible with the deploy target. Keep provider credentials on the server. Return only candidate label fields plus confidence/source metadata; do not treat OCR output as verified product facts. Do not require an LLM key for the basic deterministic app.
4. **Match register:** query the HSA index from extracted brand/ingredient candidates. Display possible matches and source attribution, with “no match” and manual entry states.
5. **Review and confirm:** show editable fields (at minimum name, strength, dosage form, route when available, and active ingredients), make uncertainty visible, and require an explicit confirmation action. No database write or schedule creation before confirmation.
6. **Save:** use a server endpoint with strict validation; associate only the confirmed candidate values with the medication. Keep `prescribed_for` exclusively user/caretaker entered. Add schedule after medication confirmation, and reflect saved results on Home after refresh.
7. **Failure/safety copy:** the app must never identify a loose pill from an image. A label OCR result can be wrong; prompt checking against the package and pharmacist. Preserve the existing refusal for pill identification.

Do not make the client upload secrets or rely on a third-party OCR service from browser code. Define a replaceable OCR provider boundary so a demo/mock provider does not leak into production behavior. If the deployment cannot support OCR credentials or limits, deliver a working manual entry + HSA search flow and make unavailable OCR explicit rather than faking a scan.

## Medicine explanations and source rules

PRD source rules are strict:

- HSA register: product registration/name lookup only.
- MedlinePlus/MedlinePlus Connect: trusted common-use information. Credit “Information from MedlinePlus.gov”. A model can rephrase this text only; if no trusted text exists, show a pharmacist referral and do not call the model.
- NDF: link only (“Check on NDF”). Do not scrape or copy NDF content; PRD says reuse requires written MOH permission.
- HealthHub Medications A–Z: link only to patient leaflets.
- “What did your doctor say it’s for?” is user-authored context, shown first; model must not create or edit it.
- Read-aloud should use the browser speech API where supported and degrade cleanly when unavailable.
- For rephrase validation, reject unsupported medicine names and numbers (including dose/strength/frequency claims). Display the trusted source text when rejection occurs. Do not treat generated prose as dosing guidance.

## Schema/API cautions

The base medication schema in `001_init.sql` is small (`name`, `strength`, `days_of_supply`, `photo_url`, `active`) and does not yet express all Tier 2 needs. Prefer additive numbered migrations. Keep medication/schedule API contracts shared and typed. The project is a fictional single-user demo without authentication; do not represent endpoints as safe for real patient data.

For medication CRUD:

- Validate all user-provided strings, dates, schedule times and identifiers on the server, not only in React.
- Make edits reflect in `/api/today` and caregiver summary without stale mock state.
- Ensure schedules cannot be attached to another user's medication (within the current demo model, still enforce ownership constraints).
- Preserve ledger semantics: do not rewrite dose history when a schedule is edited; define behavior for an existing schedule's effective dates.
- Store photo URLs only in PostgreSQL. Do not store image bytes, OCR raw content, GPS traces or unnecessary sensitive text in logs.
- For object storage, mint short-lived upload URLs server-side, validate content type/size, use random object keys, and persist only the resulting URL/key. Keep a local/mock adapter only if explicit and clearly non-production.

## GPS, rewards, and secondary slices

Treat GPS as foreground-only and privacy-sensitive per PRD. Keep coordinate samples in memory, discard poor-accuracy points, calculate distance with a well-understood geodesic formula, apply the speed rule, and submit aggregate distance only. Never send or persist a route/polyline. Provide a simulated walk fallback for demo/review and clear permission-denied behavior.

Keep cumulative distance and souvenir unlock decisions derived from persisted walk totals; define thresholds centrally in `shared/souvenirs.ts`. Likewise, derive milestone/world progress from real API data instead of sprinkling fixed counts across screens. Caretaker treats should be an API-backed event/state that Home can refresh. Keep sunset/sunrise presentation in a shared local-time helper and avoid timezone assumptions beyond the user's configured timezone.

## Suggested order of execution

1. Inspect status/diffs, read PRD safety requirements, reconcile this note with current code.
2. Finish and safely verify T2-01 importer/search (migration, tests, endpoint contract and attribution).
3. Deliver a complete medication add flow with manual entry + HSA search first; then OCR extraction and explicit confirmation.
4. Add medication/schedule persistence and `/care` editing so the confirmed flow actually affects Home.
5. Add MedlinePlus explanation/rephrase checks, prescribed-for field, read-aloud and source links.
6. Add label/proof image storage only once the server-side storage provider/deployment settings are known.
7. Pick one of foreground GPS, data-derived souvenirs/milestones, or caretaker treats based on remaining time and demo impact; preserve simulated walk fallback.
8. Update PRD/Kanban/Handoff/README to match reality and list incomplete/blocked items honestly.

If scope is constrained, prioritize a user-visible, safe manual medication setup and persisted schedule over a flashy scanner or live GPS. Do not claim unimplemented OCR, upload, OCR confidence, medication knowledge, or production security.

## Verification and completion checklist

For each slice, add/update focused unit or integration coverage as appropriate. The repository has existing scripts; check package scripts before assuming names. Typical checks include:

- `npm run typecheck`
- `npm run test:unit`
- `npm run test:integration` with an explicitly configured isolated test database (tests skip without `DATABASE_URL`)
- `npm --prefix mobile run build` (inspect mobile scripts first)
- Local UI/API walkthrough in browser for success, empty, manual, and error states.

Do not run tests or mutate remote/shared data without considering repository instructions and the user’s current authorization. For importer verification, prefer a mocked fetch and isolated schema; for migrations use temporary schema/database. Never run importer against the user's configured shared database simply as a smoke test.

Before handing back:

- Summarize which T2 IDs are done, partial, or blocked in `docs/KANBAN.md`.
- Record material decisions in `docs/DECISIONS.md`.
- Update `docs/HANDOFF.md` and README setup/environment instructions.
- State which commands were actually run and their outcomes; do not say “tested” for checks not run.
- Identify any required user setup (OCR/storage credentials, provider, deployment variable) precisely, without asking for secrets in chat.

## External references

- [PRD source: data.gov.sg HSA register](https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view)
- [Singapore HSA Infosearch](https://www.hsa.gov.sg/e-services/infosearch/)
- [MedlinePlus Connect](https://medlineplus.gov/connect/)
- [NDF](https://www.ndf.gov.sg/)
- [HealthHub](https://www.healthhub.sg/)

Check current source documentation before implementing an external integration; API formats, availability, licensing terms, and deployment capabilities can change.
