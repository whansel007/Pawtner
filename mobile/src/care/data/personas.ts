import type { CaretakerSummaryResponse } from "../../../../shared/contract.js";
import { MOCK_CHECK_INS_CARETAKER, MOCK_UPDATES_ONLY_CARETAKER } from "./mock.js";
import type { Caretaker, CaretakerSlot, Persona } from "./types.js";

/**
 * Demo sign-in personas (front end only: no passwords, no accounts, no database change).
 * Names come from data: the senior and the check-ins caretaker from the caretaker summary;
 * the updates-only caretaker is a mock slot until the API returns a caregivers list.
 */

const CARETAKER_SLOTS: readonly CaretakerSlot[] = ["checkIns", "updatesOnly"];

export function isCaretakerSlot(value: unknown): value is CaretakerSlot {
  return typeof value === "string" && (CARETAKER_SLOTS as readonly string[]).includes(value);
}

export function buildCaretakers(summary: Pick<CaretakerSummaryResponse, "caregiver">): Caretaker[] {
  const checkIns = summary.caregiver ?? MOCK_CHECK_INS_CARETAKER;
  return [
    { slot: "checkIns", id: checkIns.id, name: checkIns.name, receivesCheckIns: true, isMockSlot: summary.caregiver === null },
    { slot: "updatesOnly", ...MOCK_UPDATES_ONLY_CARETAKER, isMockSlot: true },
  ];
}

/** Picker order: the senior first, then the caretakers. */
export function buildPersonas(summary: Pick<CaretakerSummaryResponse, "caregiver" | "senior">): Persona[] {
  return [{ slot: "senior", id: summary.senior.id, name: summary.senior.name }, ...buildCaretakers(summary)];
}

export function findCaretaker(caretakers: readonly Caretaker[], slot: CaretakerSlot | null): Caretaker | null {
  return caretakers.find((caretaker) => caretaker.slot === slot) ?? null;
}
