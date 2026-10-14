# Data Contract

Generated from `src/types/index.ts` and `src/types/common.ts`.

## Shared Types

### `Screen`

Union of all 14 screen identifiers:

```
"home" | "care" | "reminders" | "prescription" | "explanation"
| "schedule" | "proof" | "walk" | "milestones" | "health"
| "screening" | "summary" | "settings" | "customize"
```

### `World`

```
"flat" | "garden" | "kampung"
```

### `Accessory`

```
"none" | "glasses" | "hat" | "bandana"
```

---

## Interfaces

### `Pet`

| Field        | Type     | Description                                           |
| ------------ | -------- | ----------------------------------------------------- |
| `name`       | string   | Display name shown in the top zone, lowercased         |
| `heartCount` | number   | Current heart count (0–4) derived from doses + BP     |
| `maxHearts`  | number   | Max hearts the bar can show                           |
| `careScore`  | number   | Care-progress score shown on the care screen          |
| `streak`     | number   | Streak count shown as the flame chip on home          |
| `caringDays` | number   | Total caring days together, shown on milestones        |

### `Dose`

| Field    | Type   | Description                                        |
| -------- | ------ | -------------------------------------------------- |
| `time`   | string | Clock-face time string, e.g. `"9:00 AM"`           |
| `name`   | string | Medicine name                                       |
| `dose`   | string | Dose description, e.g. `"50 mg · 1 capsule"`       |
| `status` | string | Status label, e.g. `"Taken"`, `"Take now"`        |

### `Medication`

| Field           | Type    | Description                                     |
| --------------- | ------- | ----------------------------------------------- |
| `name`          | string  | Scanned medication name                         |
| `dosage`        | string  | Dosage amount string                            |
| `frequency`     | string  | Dosing frequency description                    |
| `daysRemaining` | number  | Days of supply remaining before restock         |
| `scanned`       | boolean | Whether this was scanned from a label           |

### `ExplanationPoint`

| Field  | Type   | Description                              |
| ------ | ------ | ---------------------------------------- |
| `label`| string | Section heading, e.g. `"When?"`          |
| `text` | string | Plain-language body text                 |

### `MedicationExplanation`

| Field        | Type               | Description                                        |
| ------------ | ------------------ | -------------------------------------------------- |
| `name`       | string             | Medicine name uppercased                           |
| `dosage`     | string             | Dosage uppercased                                  |
| `summary`    | string             | One-line summary                                   |
| `spokenText` | string             | Full sentence spoken by speech synthesis           |
| `points`     | ExplanationPoint[] | Structured Q&A points                              |

### `NudgeSlot`

| Field  | Type   | Description                              |
| ------ | ------ | ---------------------------------------- |
| `label`| string | Period label, e.g. `"Morning"`           |
| `time` | string | Clock-face time string                   |
| `note` | string | Context note, e.g. `"After breakfast"`  |

### `NudgeSettings`

| Field    | Type       | Description                              |
| -------- | ---------- | ---------------------------------------- |
| `slots`  | NudgeSlot[]| Suggested nudge slots from the label     |
| `tone`   | string     | Tone of the nudge message                |
| `message`| string     | Full nudge message text                  |

### `WeekSummary`

| Field        | Type                                   | Description                                   |
| ------------ | -------------------------------------- | --------------------------------------------- |
| `rating`     | string                                 | Overall rating label, e.g. `"Good week"`      |
| `caringDays` | number                                 | Caring days out of the week total             |
| `totalDays`  | number                                 | Total days in the period                       |
| `metrics`    | `{ value: string; label: string }[]`  | Aggregate metrics                             |
| `doctorQuestion` | string                             | Suggested question to ask the doctor          |

### `ClinicTask`

| Field      | Type   | Description                              |
| ---------- | ------ | ---------------------------------------- |
| `title`    | string | Task title                               |
| `subtitle` | string | Short description                        |
| `done`     | number | Completed count                          |
| `total`    | number | Total count                              |

### `BloodPressureReading`

| Field        | Type    | Description                                    |
| ------------ | ------- | ---------------------------------------------- |
| `systolic`   | number  | Systolic value                                  |
| `diastolic`  | number  | Diastolic value                                 |
| `logged`     | boolean | Whether a reading was logged today              |
| `note`       | string  | Context note when logged                        |
| `pendingNote`| string  | Context note when not yet logged               |

### `ScreeningInfo`

| Field             | Type    | Description                                       |
| ----------------- | ------- | ------------------------------------------------- |
| `title`           | string  | Screening programme name                          |
| `description`     | string  | Description                                       |
| `url`             | string  | External URL to book/check eligibility            |
| `unlocksFestival` | boolean | Whether completing it unlocks a festival         |

### `ActivityLink`

| Field      | Type   | Description          |
| ---------- | ------ | -------------------- |
| `title`    | string | Link title           |
| `subtitle` | string | Short subtitle       |
| `url`      | string | External URL         |

### `MilestoneWorld`

| Field         | Type    | Description                                       |
| ------------- | ------- | ------------------------------------------------- |
| `id`          | World   | World id                                           |
| `label`       | string  | Display label                                      |
| `note`        | string  | Short note                                         |
| `current`     | boolean | Whether it is the current world                    |
| `unlocked`    | boolean | Whether it is unlocked                            |
| `levelText`   | string  | Level-up banner text                               |
| `description` | string  | Description shown on the world card                |
| `progress`    | number  | Progress 0–1                                       |

### `Trick`

| Field   | Type    | Description                                              |
| ------- | ------- | -------------------------------------------------------- |
| `name`  | string  | Trick name                                                |
| `note`  | string  | Status note, e.g. `"7 day streak"` or `"18 days to go"` |
| `earned`| boolean| Whether it has been earned                               |

### `Souvenir`

| Field      | Type   | Description          |
| ---------- | ------ | -------------------- |
| `distance` | string | Distance label       |
| `name`     | string | Souvenir name        |
| `note`     | string | Short note           |

### `Caregiver`

| Field         | Type   | Description                              |
| ------------- | ------ | ---------------------------------------- |
| `names`       | string | Combined names, e.g. `"Mum + Jamie"`    |
| `relationship`| string | Relationship note                        |
| `status`      | string | Connection status                        |

### `CareActivity`

| Field            | Type   | Description                                   |
| ---------------- | ------ | --------------------------------------------- |
| `dosesTaken`     | string | Doses taken summary, e.g. `"2 of 3"`          |
| `dosesTakenCount`| number | Doses taken count                             |
| `dosesTotal`     | number | Doses total                                   |
| `walkDistance`   | string | Walk distance today                           |
| `timestamp`      | string | Timestamp of latest activity                  |
| `description`    | string | Activity description                          |

### `RestockAlert`

| Field           | Type   | Description                              |
| --------------- | ------ | ---------------------------------------- |
| `name`          | string | Medicine name                            |
| `daysRemaining` | number | Days remaining                           |
| `label`         | string | Label, e.g. `"RESTOCK SOON"`             |

### `AccessoryOption`

| Field  | Type      | Description          |
| ------ | --------- | -------------------- |
| `id`   | Accessory | Accessory id         |
| `label`| string    | Display label        |
| `note` | string    | Short note           |

### `WorldOption`

| Field  | Type   | Description      |
| ------ | ------ | ---------------- |
| `id`   | World  | World id         |
| `label`| string | Display label    |
| `note` | string | Short note       |

### `WalkStats`

| Field        | Type   | Description                                       |
| ------------ | ------ | ------------------------------------------------- |
| `duration`   | string | Duration string, e.g. `"18:24"`                  |
| `distance`   | string | Distance string, e.g. `"0.92 km"`                |
| `steps`      | string | Step count                                        |
| `calories`   | string | Calories burned                                   |
| `speed`      | string | Speed string                                      |
| `goal`       | string | Today's goal text                                 |
| `gentleNote` | string | Gentle-note explanation                           |

---

## Architecture

```
src/
├── types/
│   ├── common.ts          Screen, World, Accessory
│   └── index.ts           All data interfaces
├── mock/
│   ├── home.ts            Pet, Dose[], Medication, Explanation, Nudge, Week, BP, Screening, Activity, Clinic
│   ├── care.ts            Caregiver, CareActivity, RestockAlert
│   ├── milestones.ts      MilestoneWorld, Trick[], Souvenir[], WorldOption[], AccessoryOption[], WalkStats
│   ├── health.ts          Re-exports from home
│   ├── settings.ts        Re-exports from home
│   └── index.ts           Barrel
├── components/
│   ├── Icon.tsx           Shared SVG icon set
│   └── AccessoryMark.tsx  Accessory visual marker
├── screens/
│   ├── TopZone.tsx
│   ├── HomeScreen.tsx
│   ├── CareScreen.tsx
│   ├── RemindersScreen.tsx
│   ├── PrescriptionScreen.tsx
│   ├── ExplanationScreen.tsx
│   ├── ScheduleScreen.tsx
│   ├── ProofScreen.tsx
│   ├── WalkScreen.tsx
│   ├── MilestonesScreen.tsx
│   ├── CustomizeScreen.tsx
│   ├── HealthScreen.tsx
│   ├── WeeklySummaryScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── ScreeningScreen.tsx
│   └── BottomNav.tsx
├── App.tsx                Orchestrator: imports mock, passes as props
├── main.tsx
└── index.css
```

### Data flow

1. **`src/mock/*`** holds all hardcoded fake data, typed by `src/types`.
2. **`App.tsx`** is the only file that imports from `mock/`. It passes data as props to each screen.
3. **Screen components** import only types (never mock). Swapping in a real API later means changing only `App.tsx`.
