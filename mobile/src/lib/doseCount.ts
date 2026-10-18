import type { DerivedDose } from "../../../shared/contract.js";

/** How many of today's listed doses are taken (Home's "x of N done"). */
export function countTaken(doses: readonly Pick<DerivedDose, "status">[]): number {
  return doses.filter((dose) => dose.status === "taken").length;
}

/**
 * The proof button's count (owner, 18 Oct: "1/3 taken"): today's count once this dose is taken. `done` includes it,
 * `total` = today's listed doses, the same count as Home's card. No heart promise: the toast after the tap says that.
 */
export function countAfterTaking(doses: readonly Pick<DerivedDose, "id" | "status">[], doseId: string): { done: number; total: number } {
  const dose = doses.find((item) => item.id === doseId);
  const done = countTaken(doses) + (dose && dose.status !== "taken" ? 1 : 0);
  return { done, total: doses.length };
}
