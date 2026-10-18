/**
 * Restock help. Logic in lib/restockHelp.ts (pure) and lib/useRestockHelp.ts (API); text in en.json under "restock".
 */
import { DEMO_RULES } from "../../../shared/config.js";

/** The restock card shows when a medicine has this many days of supply left, or fewer (same threshold as the agent's restock rule). */
export const RESTOCK_SOON_DAYS = DEMO_RULES.restockDaysOfSupply;

/**
 * localStorage keys. Refill requests live on the server since migration 008; only "I'll get it myself" stays here.
 */
export const RESTOCK_STORAGE_KEYS = {
  /** Written by builds before migration 008 (the one same-browser request); kept so "Reset to morning" clears it. */
  request: "pawtner.restockHelp",
  /** medications.id list the senior chose "I'll get it myself" for; each card stays, with a status line instead of the buttons. */
  self: "pawtner.restockSelf",
} as const;
