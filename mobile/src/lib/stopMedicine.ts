/**
 * "Stop this medicine" on My medicines (pure, no React): which state each medicine row is in.
 * A row without an entry shows normally. Stopping is soft on the server (`active: false`); Undo starts it again.
 *
 * - confirm:  the confirm panel is open (two separate taps are needed to stop)
 * - stopping: "Yes, stop it" was tapped, waiting for the API
 * - stopped:  "{{medicine}} is stopped." with Undo, until the senior leaves the screen
 * - undoing:  Undo was tapped, waiting for the API
 * `failed` = the last request failed; the row shows a friendly error and stays where it was.
 */
export type StopStatus = "confirm" | "stopping" | "stopped" | "undoing";
export interface StopRow { status: StopStatus; failed: boolean }
export type StopRows = Readonly<Record<string, StopRow>>;
export type StopEvent = "open" | "cancel" | "confirm" | "stopped" | "stopFailed" | "undo" | "undone" | "undoFailed";

function without(rows: StopRows, keep: (id: string, row: StopRow) => boolean): Record<string, StopRow> {
  return Object.fromEntries(Object.entries(rows).filter(([id, row]) => keep(id, row)));
}

export function stopRowsAfter(rows: StopRows, id: string, event: StopEvent): StopRows {
  const current = rows[id];
  switch (event) {
    // One confirm panel open at a time: opening one closes any other row's (not a row that is stopping or stopped).
    case "open": return { ...without(rows, (otherId, row) => otherId !== id && row.status !== "confirm"), [id]: { status: "confirm", failed: false } };
    case "cancel": return current?.status === "confirm" ? without(rows, (otherId) => otherId !== id) : rows;
    case "confirm": return current?.status === "confirm" ? { ...rows, [id]: { status: "stopping", failed: false } } : rows;
    case "stopped": return { ...rows, [id]: { status: "stopped", failed: false } };
    // Not stopped: back to the confirm panel with the error, so she can try again or keep it.
    case "stopFailed": return { ...rows, [id]: { status: "confirm", failed: true } };
    case "undo": return current?.status === "stopped" ? { ...rows, [id]: { status: "undoing", failed: false } } : rows;
    // Started again: the row shows normally.
    case "undone": return without(rows, (otherId) => otherId !== id);
    case "undoFailed": return { ...rows, [id]: { status: "stopped", failed: true } };
  }
}

/** True while a row's request is in flight (its buttons are disabled). */
export function isStopBusy(row: StopRow | undefined): boolean {
  return row?.status === "stopping" || row?.status === "undoing";
}
