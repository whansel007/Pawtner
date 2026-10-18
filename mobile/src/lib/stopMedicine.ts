import { STOP_CONFIRM_GUARD_MS } from "../config/medicines.js";

/**
 * "Stop this medicine" on My medicines (pure, no React): which state each medicine row is in.
 * A row without an entry shows normally. Stopping is soft on the server (`active: false`); Undo starts it again.
 *
 * - confirm:  the confirm panel is open (two separate taps are needed to stop)
 * - stopping: "Yes, stop it" was tapped, waiting for the API
 * - stopped:  "{{medicine}} is stopped." with Undo, until the senior leaves the screen
 * - undoing:  Undo was tapped, waiting for the API
 * - gone:     stopped earlier, and a newer stop has succeeded since: only the latest stop keeps its Undo
 *             (owner, 18 Oct), so this medicine leaves the list shown on this screen (it's inactive on the server)
 * `failed` = the last request failed; the row shows a friendly error and stays where it was.
 * `openedAt` = when the confirm panel opened (ms, from the caller's clock); "Yes, stop it" is ignored for
 * STOP_CONFIRM_GUARD_MS after it, so a double tap can never stop a medicine, whatever the layout.
 */
export type StopStatus = "confirm" | "stopping" | "stopped" | "undoing" | "gone";
export interface StopRow { status: StopStatus; failed: boolean; openedAt: number }
export type StopRows = Readonly<Record<string, StopRow>>;
export type StopEvent = "open" | "cancel" | "confirm" | "stopped" | "stopFailed" | "undo" | "undone" | "undoFailed";

function without(rows: StopRows, keep: (id: string, row: StopRow) => boolean): Record<string, StopRow> {
  return Object.fromEntries(Object.entries(rows).filter(([id, row]) => keep(id, row)));
}

/** True when a tap on "Yes, stop it" at `now` counts: the panel is open and the double-tap guard has passed. */
export function canConfirmStop(row: StopRow | undefined, now: number): boolean {
  return row?.status === "confirm" && now >= row.openedAt + STOP_CONFIRM_GUARD_MS;
}

/** The rows after `event` on row `id` at `now`. An ignored event returns `rows` itself (same object). */
export function stopRowsAfter(rows: StopRows, id: string, event: StopEvent, now: number): StopRows {
  const current = rows[id];
  const openedAt = current?.openedAt ?? now;
  switch (event) {
    // One confirm panel open at a time: opening one closes any other row's (not a row that is stopping or stopped).
    case "open": return { ...without(rows, (otherId, row) => otherId !== id && row.status !== "confirm"), [id]: { status: "confirm", failed: false, openedAt: now } };
    case "cancel": return current?.status === "confirm" ? without(rows, (otherId) => otherId !== id) : rows;
    case "confirm": return canConfirmStop(current, now) ? { ...rows, [id]: { status: "stopping", failed: false, openedAt } } : rows;
    // Only the latest stop keeps its Undo: every other stopped row goes (an Undo still in flight is not interrupted).
    case "stopped": return {
      ...Object.fromEntries(Object.entries(rows).map(([otherId, row]) => [otherId, otherId !== id && row.status === "stopped" ? { ...row, status: "gone", failed: false } : row])),
      [id]: { status: "stopped", failed: false, openedAt },
    };
    // Not stopped: back to the confirm panel with the error, so she can try again at once (the guard is not restarted).
    case "stopFailed": return { ...rows, [id]: { status: "confirm", failed: true, openedAt } };
    case "undo": return current?.status === "stopped" ? { ...rows, [id]: { status: "undoing", failed: false, openedAt } } : rows;
    // Started again: the row shows normally.
    case "undone": return without(rows, (otherId) => otherId !== id);
    case "undoFailed": return { ...rows, [id]: { status: "stopped", failed: true, openedAt } };
  }
}

/** True when a medicine is left out of the list on this screen (an older stop whose Undo has ended). */
export function isStopGone(row: StopRow | undefined): boolean {
  return row?.status === "gone";
}

/** True while a row's request is in flight (its buttons are disabled). */
export function isStopBusy(row: StopRow | undefined): boolean {
  return row?.status === "stopping" || row?.status === "undoing";
}
