import { DEMO_RULES } from "../../../../shared/config.js";
import type { DerivedDose } from "../../../../shared/contract.js";
import type { CareData } from "./types.js";
import { DEMO_NAMES } from "../../lib/demoNames.js";

/**
 * Offline fallback for /care, shaped exactly like the API responses (fictional people, PRD §3 and migrations/seed.sql).
 * Used only when a call fails; the page then shows the friendly offline notice.
 * Times are built around `now` so the week view always looks current.
 */

// Names: the demo names from en.json "demoNames" (lib/demoNames.ts), never written here.
const SENIOR = { id: "mock-senior", name: DEMO_NAMES.senior };
const DOG = { id: "mock-dog", name: DEMO_NAMES.dog };

/** The check-ins caretaker when the API is offline or has no caregiver yet. */
export const MOCK_CHECK_INS_CARETAKER = { id: "mock-caretaker-check-ins", name: DEMO_NAMES.caretaker } as const;

/**
 * MOCK SLOT, replace with P1's caregivers list (`caregivers: { id, name, receivesCheckIns }[]` in CaretakerSummaryResponse,
 * docs/KANBAN.md "Blocked"). The API has one caregiver today, so the updates-only caretaker exists only here.
 */
export const MOCK_UPDATES_ONLY_CARETAKER = { id: "mock-caretaker-updates-only", name: DEMO_NAMES.updatesOnlyCaretaker, receivesCheckIns: false } as const;

function at(now: Date, dayOffset: number, hours: number, minutes: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function mockDose(id: string, scheduledAt: string, status: DerivedDose["status"], eventAt: string | null): DerivedDose {
  // Medicine names never reach the caretaker pages; these placeholders only satisfy the type.
  return { id, medicationId: `med-${id}`, medicationName: "Medicine", strength: null, scheduledAt, status, eventAt, nudgeCount: 0, lastNudgeAt: null };
}

export function buildMockCareData(now: Date = new Date()): CareData {
  const dog = { ...DOG, mood: "content" as const, heart: 3, streak: 5, heartsTotal: 30 };
  return {
    today: {
      user: SENIOR,
      dog,
      doses: [
        mockDose("dose-morning", at(now, 0, 8, 0), "taken", at(now, 0, 8, 15)),
        mockDose("dose-lunch", at(now, 0, 13, 0), "taken", at(now, 0, 13, 5)),
        mockDose("dose-night", at(now, 0, 21, 0), "upcoming", null),
      ],
      healthMetrics: [],
      bloodPressureLoggedToday: false,
      activities: { medicines: false, bloodPressure: false, walk: false },
      latestDecision: null,
      firstBloodPressure: null,
    },
    summary: {
      period: { start: at(now, -6, 0, 0).slice(0, 10), end: at(now, 0, 0, 0).slice(0, 10) },
      senior: SENIOR,
      caregiver: { ...MOCK_CHECK_INS_CARETAKER },
      dog,
      careScore: 86,
      caringDays: 5,
      dosesTaken: 18,
      dosesDue: 21,
      walkCount: 3,
      walkDistanceMeters: 3600,
      latestActivityAt: at(now, 0, 13, 5),
      latestBloodPressure: null,
      caringMoments: [
        { id: "moment-1", kind: "celebration", message: "A caring moment from the routine.", occurredAt: at(now, 0, 13, 5) },
        { id: "moment-2", kind: "celebration", message: "A caring moment from the routine.", occurredAt: at(now, 0, 8, 15) },
        { id: "moment-3", kind: "check_in", message: "A gentle check-in may help today.", occurredAt: at(now, -2, 19, 30) },
        { id: "moment-4", kind: "celebration", message: "A caring moment from the routine.", occurredAt: at(now, -3, 11, 40) },
      ],
      doctorQuestions: [
        { note: "Ask a healthcare professional about: feeling sleepy at night", occurredAt: at(now, -1, 20, 10) },
      ],
      checkIn: null,
      stoppedMedicine: null,
      dayHearts: [3, 2, 4, 1, 3, 2, 3].map((hearts, index) => ({ date: at(now, index - 7, 12, 0).slice(0, 10), hearts })),
    },
    escalation: { optedIn: true, threshold: DEMO_RULES.defaultCaretakerThreshold },
  };
}
