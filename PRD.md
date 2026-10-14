# Pawtner: Product Requirements Document

| | |
|---|---|
| **Product** | Pawtner, an agentic medication-adherence companion for seniors |
| **Event** | Tencent Cloud AI CAN DO IT Hackathon Singapore 2026, healthcare track |
| **Deadline** | Friday 16 October 2026, 23:59 (GMT+8) |
| **Status** | Draft v1, 13 October 2026 |
| **Owners** | Person 1 (back end, "the brain"), Person 2 (front end, "the body"), Design track |
| **Related docs** | `docs/BRIEF.md` (product brief), `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/KANBAN.md`, `docs/DOG_BIBLE.md` |

---

## 1. Summary

Pawtner is a phone app in which a senior looks after a virtual dog, and the dog's wellbeing depends on the senior's medication routine. The usual direction of care is reversed: **the dog depends on her**. A family caretaker manages the routine from a web dashboard and is only alerted when misses repeat.

Behind the dog is an agent that checks the routine, decides when to nudge, refuses unsafe requests, and knows when to say "please ask a professional". Every decision it makes is visible, with the reason.

## 2. Problem

- Older adults on long-term medicines often miss or double doses, and find medicine labels and leaflets hard to understand.
- Reminder apps feel clinical and nagging, and are easy to ignore.
- Family caretakers want reassurance without turning care into surveillance.

## 3. Users

| User | Device | Needs | Design implications |
|---|---|---|---|
| **Senior** (primary) | Phone only | Remember doses, understand medicines, feel encouraged, never scolded | Big type, touch targets of at least 48 px, minimal words, read-aloud, warm tone |
| **Caretaker** (secondary) | Web | Know things are OK, edit the routine, be told only when it matters | Weekly summaries, escalation settings, no medicine details in alerts |

Names are always data, never code: the senior may be "Mum" or "Dad", the dog and caretaker can have any name. The demo uses fictional people: senior "Rose" ("Mum"), caretaker "Jamie", dog "Max".

## 4. Goals and non-goals

### Goals (for this hackathon)
1. A working **core loop** on a deployed URL: medicine → schedule → nudge → taken → dog reacts.
2. **Visible agency**: judges can see what the agent noticed, what it decided, and why.
3. **Responsible healthcare behaviour**: fixed safety rules, clear refusals, escalation to professionals.
4. **Local relevance**: Singapore medicine registration data, local links, local places.

### Non-goals
- Clinical diagnosis or dosing advice of any kind.
- Hardware, wearables or device integrations.
- Real accounts, authentication or production-grade security (demo uses fictional data only).
- HealthHub / Healthy365 integration, insurer or HPB partnerships (roadmap only).

## 5. Success criteria

| Criterion | Measure |
|---|---|
| Core loop works end to end | All three demo beats (section 13) run on the deployed URL without manual fixes |
| Agent is visible | Every dog reaction has a decision log entry: rule, observations, reasoning, wording source |
| Safety holds | All 4 shared fixtures pass; every refusal case in section 7.4 returns the expected refusal |
| Failure is safe | With the model switched off, every decision still works using template messages |
| Proof of tool usage | At least 3 chat screenshots required by the rules; target 10+ across CodeBuddy and Miora |

---

## 6. Core loop

```
Snap or enter a medicine
  → check it is a registered product (HSA) and confirm the details
  → plain-language explanation, read aloud
  → set the schedule
  → dog nudges at dose time
  → senior taps "Taken" or snaps a photo
  → dog stays happy, streak grows
  → caretaker sees caring moments and a weekly summary
```

---

## 7. The agent

### 7.1 Design principle
**Rules decide; the model only words things.** Every safety and escalation decision is made by deterministic rules with fixed thresholds. A language model is used only to write the dog's wording, write weekly summary prose, read a medicine label into fields the user must confirm, and rephrase trusted medicine text. If the model fails, times out or runs out of quota, the rule's decision stands and a pre-written template is used. The emergency path never calls the model.

### 7.2 What the agent checks

| Signal | Source |
|---|---|
| Dose status: upcoming, due, taken, skipped, missed | Derived from `med_schedules` + `dose_events` (missed is never stored) |
| Consecutive missed doses | Derived from the ledger |
| Blood pressure readings and free-text notes | `health_metrics` |
| Days of supply left | `medications` |
| Nudges already sent per dose | `agent_decisions` |
| Caretaker consent and threshold | `user_caregivers` |

### 7.3 What the agent decides on its own

| Decision | Trigger (demo thresholds, configurable) | Dog mood |
|---|---|---|
| `nudge` (1st) | Dose not taken 60 min after scheduled time | sleepy |
| `nudge` (2nd, last) | Still not taken 60 min after the 1st nudge | sleepy |
| `nudge` + caretaker check-in | Consecutive missed doses ≥ caretaker threshold (minimum 2) **and** senior opted in | sleepy |
| `celebrate` | Dose taken, walk finished, streak milestone | joyful |
| `restock_reminder` | Days of supply ≤ 5 | content |
| `doctor_question` | A note mentions a possible side effect (e.g. "sleepy", "dizzy", "nausea") → added to weekly summary as a question | content |
| `see_gp_soon` | Reading ≥ 180 systolic or ≥ 120 diastolic **without** symptoms; or 3+ readings ≥ 140/90 in 7 days | attentive |
| `emergency_995` | Reading ≥ 180 systolic or ≥ 120 diastolic **with** a symptom; or any note mentioning chest pain, breathlessness, fainting, confusion, one-sided weakness or slurred speech | attentive |
| `stay_quiet` | Nothing needs attention | from heart score |

**All thresholds are demo values, not clinical advice.** They live in one config file, never inside components.

### 7.4 What the agent refuses

| Request | Response |
|---|---|
| "I missed a dose, should I take two?" | Refuses. "Please don't take two. Check your label or ask your pharmacist what to do." |
| Change, skip or stop a medicine | Refuses. Refers to doctor or pharmacist. |
| "Is my reading fine?" | Never reassures. States the reading and what the rules recommend. |
| Diagnosing a symptom | Refuses. Adds a doctor question, or escalates per 7.3. |
| Identifying a pill from a photo | Refuses. A photo is logged as proof, never as verification. |
| Medicine interactions | Refuses. Refers to pharmacist. |

Every refusal is recorded in `agent_decisions.refused`.

### 7.5 Escalation ladder

1. Gentle in-app nudge (max 2 per dose)
2. Doctor question added to weekly summary
3. "Please see your GP soon" (calm, no playful animation)
4. "Call 995 now" (calm, plain, no playful animation, no model call)
5. Caretaker check-in, **only** on repeated misses and **only** with the senior's consent; never contains a medicine name

### 7.6 Dog moods

| Mood | When | Effects |
|---|---|---|
| joyful | heart 4, or right after `celebrate` | Bounce, sparkles |
| content | heart 2–3, nothing due | Gentle breathing sway |
| sleepy | heart 0–1, or a `nudge` | Slow droop, "zzz". Waiting, never sad |
| attentive | `see_gp_soon` or `emergency_995` | Still, upright, no playful effects |

The dog is **never** sad, angry or crying. Mood is decided in one shared function, `selectDogMood(heart, latestDecision)`, and stored with each decision.

### 7.7 Scores (demo formula, configurable)
- **Heart (0–4):** share of today's due doses taken, scaled to 4 and rounded down; +1 if blood pressure was logged today; capped at 4. Starts at 2 when nothing is due yet.
- **Streak:** consecutive days on which every scheduled dose was taken.
- Both are cached on `dogs` and recomputed on every relevant write. No nightly job.

---

## 8. Medicine information

| Need | Source | How it is used | Licence |
|---|---|---|---|
| Is this a registered product? Brand → generic name | HSA "Listing of Registered Therapeutic Products" (data.gov.sg) | Imported once into `sg_registered_products`; label check and autocomplete | Open Data Licence; attribution required |
| What is it commonly used for, in plain words | MedlinePlus (via MedlinePlus Connect) | Fetched by generic name; model may only rephrase this text; code rejects any number or medicine name not in the source | Credit "Information from MedlinePlus.gov"; no logo or endorsement |
| Local professional reference | Singapore National Drug Formulary (ndf.gov.sg) | **Link only** ("Check on NDF") | Reuse needs written MOH permission |
| Local patient leaflets | HealthHub Medications A–Z | **Link only** ("Read the HealthHub leaflet") | Link only |
| Why **this person** takes it | The user or caretaker | `medications.prescribed_for`, shown first ("Your doctor said: …"); never filled by the model | — |

If no trusted text exists: "Please ask your pharmacist", with no model call.

---

## 9. Requirements by tier

**Tier 1, must have:** the demo fails without it. Done by **Wednesday night**.
**Tier 2, should have:** builds on Tier 1. Thursday to Friday 15:00, only if Tier 1 works end to end.
**Tier 3, won't have this week:** roadmap, mentioned in the pitch only.

### 9.1 Tier 1: Must have

| ID | Requirement | Owner | Acceptance criteria |
|---|---|---|---|
| T1-01 | Database schema + fictional seed data | P1 | `001_init.sql` and `seed.sql` apply to an empty Postgres without errors |
| T1-02 | Shared contract and 4 fixtures | P1 + P2 | Fixtures type-check against `shared/contract.ts` |
| T1-03 | Selectors: ledger → derived dose status, heart, streak, `AgentInput` | P1 | Missed doses derived, never stored; unit tests on the seed data |
| T1-04 | Rules engine + template messages + `selectDogMood` | P1 | All 4 fixtures return expected decision, ruleId, mood and caretaker-ping flag |
| T1-05 | Refusal handling | P1 | Every case in 7.4 returns a refusal |
| T1-06 | Model wording with template fallback | P1 | With the API key removed, all decisions still return template wording |
| T1-07 | APIs: today, dose event, health metric, agent decide, caretaker summary, escalation settings, walk session | P1 | Each returns contract-shaped data; no names or secrets in code |
| T1-08 | Phone Home wired to API: schedule card, hearts, streak, names from data | P2 | Changing a name in the database changes it everywhere |
| T1-09 | "Taken" flow, with optional photo proof (stored as "photo", no upload yet) | P2 | Taking a dose updates hearts, streak, dog mood and caretaker feed |
| T1-10 | Blood pressure log with optional note | P2 | Logging 185/120 + "bad headache" shows the calm 995 message, attentive dog |
| T1-11 | In-app nudge with a demo clock control | P2 | Advancing the clock past a dose shows the nudge; max 2 per dose |
| T1-12 | Decision log card | P2 | Shows observations, rule, reasoning, wording source for the latest decision |
| T1-13 | Dog mood images on Home (4 moods) | P2 + Design | Mood matches the latest decision |
| T1-14 | Desktop layout: centred 430 px column, blurred garden at the sides | P2 | Never stretched; responsive on phone widths, no hardcoded widths |
| T1-15 | Caretaker `/care`: weekly summary + escalation settings | P2 | Summary numbers come from the ledger; threshold can't go below 2 |
| T1-16 | "Simulate walk" demo button (recorded points incl. a fast stretch) | P2 | Distance grows, dog gets dizzy on the fast stretch, walk saved |
| T1-17 | Deployed on a public HTTPS URL | P2 (+ P1 for API) | All 3 demo beats run on the deployed URL |
| T1-18 | Dog assets: base dog + 4-mood sheet + garden background | Design | Same dog in all moods; dog clearly visible in a greyscale check |

### 9.2 Tier 2: Should have

| ID | Requirement | Owner | Acceptance criteria |
|---|---|---|---|
| T2-01 | HSA register import + product search API | P1 | Search by brand or ingredient returns registered products; source credited |
| T2-02 | Label photo reading → fields + HSA match → **user confirms** | P1 + P2 | Nothing is saved before confirmation; manual entry always available |
| T2-03 | Medicine explanation from MedlinePlus, with rephrase + code check | P1 | Rephrase containing a new number or name is rejected and the source text is shown |
| T2-04 | Explanation screen with read-aloud, credits, NDF and HealthHub links | P2 | Read-aloud works; links open in a new tab |
| T2-05 | "What did your doctor say it's for?" field | P2 | Shown first when filled; never filled by the model |
| T2-06 | Medication + schedule editing on `/care` | P1 + P2 | Changes appear on the phone after refresh |
| T2-07 | Photo proof and label photo upload to object storage | P1 + P2 | DB stores URLs only |
| T2-08 | Real GPS walk (foreground only): distance, noise filter, speed check, wake lock | P2 | Points with accuracy worse than ~30 m ignored; >12 km/h for 30 s pauses distance; **no route stored** |
| T2-09 | Souvenirs from cumulative distance (Singapore landmarks) | P1 + P2 | Thresholds in `shared/souvenirs.ts`, not in components |
| T2-10 | Sun / moon by local time of day | P2 + Design | Chosen by one shared helper |
| T2-11 | Caretaker treats | P1 + P2 | Treat appears on the senior's Home |
| T2-12 | Milestones and worlds derived from data | P2 | No hardcoded progress numbers |
| T2-13 | Cover image with title | Design | Submitted in the required size |

### 9.3 Tier 3: Won't have this week (roadmap)

| ID | Item | Reason |
|---|---|---|
| T3-01 | Push notifications | Service worker + push setup is too risky to finish and demo reliably |
| T3-02 | Authentication and roles | Demo uses one fictional senior; needed before any real data |
| T3-03 | Background GPS tracking | Not possible reliably in a web app, especially on iPhone |
| T3-04 | Nightly score recompute | Recompute-on-write is enough for the demo |
| T3-05 | NDF content in-app | Requires written MOH permission (request to be sent) |
| T3-06 | HealthHub / Healthy365 integration | No public API |
| T3-07 | Health screening "festival days" | Static HealthHub link only |
| T3-08 | Insurer / HPB partnerships, premium tier | Business roadmap |
| T3-09 | Multi-language support | HealthHub leaflets already exist in 4 languages; app later |

---

## 10. Experience requirements

### Phone (senior)
- Storybook look: crocheted garden background, one crocheted dog, sun or moon.
- Layers, back to front: background → sun/moon → soft glow → dog (separate image) with shadow → UI.
- Top: dog name + 4-heart meter (left), settings (right). Below the dog: "Today" (left), streak + treat (right).
- Large white rounded card (24 px radius) over the bottom half: today's schedule. Each row: time, medicine + strength, Taken / photo action. Friendly empty state.
- Floating white pill tab bar (Home, Milestones, Health) and a round black paw "+" button.
- Nunito; touch targets of at least 48 px; read-aloud on explanations.
- Tone: warm and playful, never clinical, never nagging. Serious messages are calm and plain.

### Web (caretaker)
- Phone app on desktop: centred 430 px column, never stretched.
- `/care` uses the full width: weekly summary, medication editing (photo upload instead of camera), nudge and escalation settings, caretaker list.
- "The phone is where care happens; the web is where care is managed."

---

## 11. Privacy and safety

- Caretakers see caring moments only; alerts never contain medicine names.
- Escalation requires the senior's explicit opt-in; minimum threshold of 2 consecutive misses is enforced in the database.
- Walks store distance and time only, never the route.
- Photos stored in object storage; the database keeps URLs only.
- The model never makes safety decisions, never fills `prescribed_for`, and can only rephrase trusted text.
- Demo uses fictional data only; this is stated in the submission.

---

## 12. Technical summary

| Layer | Choice |
|---|---|
| App | Vite + React + TypeScript PWA, mobile-first; routes `/` (senior) and `/care` (caretaker) |
| API | Stateless serverless functions in a Node runtime |
| Database | PostgreSQL, provider-neutral, plain SQL migrations, `pg` driver |
| Photos | S3-compatible object storage (Tier 2) |
| Model | Tencent Cloud TokenHub, OpenAI-compatible, free trial quota, post-paid billing disabled |
| Config | Environment variables only: `DATABASE_URL`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `VITE_API_BASE_URL` |
| Data model | users, caregivers, user_caregivers, dogs, medications, med_schedules, dose_events (ledger), health_metrics, walk_sessions, souvenirs, agent_decisions, sg_registered_products |

Full detail in `docs/ARCHITECTURE.md`.

---

## 13. Demo script (about 90 seconds)

| Beat | What happens | What judges see |
|---|---|---|
| 1. Missed dose | Demo clock passes 10:00; morning dose not taken | Dog turns sleepy; gentle nudge; decision log shows rule + reasoning. Second miss → caretaker check-in on `/care`, no medicine name |
| 2. Emergency | Senior logs 185/120 + "bad headache" | Dog turns attentive; calm "Call 995 now"; no model used; decision log shows the rule |
| 3. Weekly summary + walk | Sunday summary; simulated walk | Doctor question drafted from "feel sleepy at night"; dog dizzy on the bus stretch, souvenir unlocked, joyful dog |

---

## 14. Timeline

| When | Person 1 | Person 2 | Design / together |
|---|---|---|---|
| Tue 13 Oct | Choose Postgres provider + hosting runtime; claim TokenHub trial | Push repo; run CodeBuddy Prompt 1 | Dog bible; Miora base dog + garden |
| Wed 14 Oct | Tier 1 back end vs fixtures | Tier 1 front end vs mock data | Dog mood sheet by lunchtime; evening sync |
| Thu 15 Oct | API deployed; integration fixes | Switch to real API; deploy | Tier 1 end to end by evening; **no new features after 18:00** |
| Fri 16 Oct | Tier 2 until 15:00; write-up | Tier 2 until 15:00; demo video | Cover image; screenshots sorted; **submit by 20:00** |

---

## 15. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hosting runtime can't connect to Postgres | Medium | Decide hosting before writing API code; fallback to any Node serverless host |
| Model quota or outage during demo | Medium | Template fallback for every decision |
| Dog images inconsistent across moods | Medium | Expression sheet in one generation; CSS motion/overlay fallback on a single image |
| GPS unreliable indoors | High | "Simulate walk" is the demo path |
| Two people editing the contract at once | Medium | Announce before editing; log in `DECISIONS.md` |
| Scope creep | High | Tier 2 only after Tier 1 passes on the deployed URL |
| Missing proof screenshots | Low if handled | Each person screenshots their own tool chats into `proof/` as they work |

---

## 16. Open questions

| Question | Owner | Needed by |
|---|---|---|
| Which Postgres provider? | P1 | Tue |
| Which hosting for the Node API (EdgeOne Pages if it supports Node + TCP to Postgres + secret env vars)? | P1 | Tue |
| Which TokenHub model was claimed? | P1 | Wed |
| Which object storage provider? | P1 | Thu (Tier 2) |
| Exact HSA attribution wording | P1 | Thu |
| Required cover image size for submission | Design | Thu |
