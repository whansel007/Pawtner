/**
 * Restock help (demo only, wire-ready). Logic in lib/restockHelp.ts; text in en.json under "restock".
 */
import { DEMO_RULES } from "../../../shared/config.js";

/** The restock card shows when a medicine has this many days of supply left, or fewer (same threshold as the agent's restock rule). */
export const RESTOCK_SOON_DAYS = DEMO_RULES.restockDaysOfSupply;

/**
 * localStorage keys. The phone app and /care share one origin, so /care in the same browser sees the request.
 * Swap for the API when P1 adds a table/endpoint (see requestRestockHelp).
 */
export const RESTOCK_STORAGE_KEYS = {
  /** The senior's latest "Ask my caretaker to help" request (RestockHelpEntry as JSON). */
  request: "pawtner.restockHelp",
  /** Local day (YYYY-MM-DD) the senior chose "I'll get it myself"; the card stays hidden for that day. */
  dismissedOn: "pawtner.restockDismissedOn",
} as const;
