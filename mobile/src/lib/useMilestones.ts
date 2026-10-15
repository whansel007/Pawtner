import { useEffect, useSyncExternalStore } from "react";
import type { MilestonesResponse } from "../../../shared/contract";
import { api } from "./api";
import { tricks as mockTricks } from "../mock";

/**
 * GET /api/milestones, shared by MilestonesScreen (the whole response) and DogLayer (which tricks Buddy has
 * earned, for the tap rotation), so both read one source.
 * - "loading" before the first answer: tricks are null (no earned tricks yet, so no wave on an early tap).
 * - "offline" when the request fails: tricks fall back to mock/milestones.ts (offline fallback, PR #29).
 * - refresh: MilestonesScreen re-fetches on every visit (the streak can change); DogLayer only loads once.
 */
type Status = "idle" | "loading" | "ready" | "offline";

let data: MilestonesResponse | null = null;
let status: Status = "idle";
let snapshot: { data: MilestonesResponse | null; status: Status } = { data, status };
const listeners = new Set<() => void>();

function set(next: Partial<{ data: MilestonesResponse | null; status: Status }>) {
  if (next.data !== undefined) data = next.data;
  if (next.status !== undefined) status = next.status;
  snapshot = { data, status };
  listeners.forEach((listener) => listener());
}

let inFlight: Promise<void> | null = null;

function load() {
  if (inFlight) return;
  set({ status: data ? status : "loading" });
  inFlight = api.milestones()
    .then((response) => set({ data: response, status: "ready" }))
    .catch(() => set({ status: data ? status : "offline" }))
    .finally(() => {
      inFlight = null;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface Milestones {
  /** The API response, or null (loading or offline). */
  data: MilestonesResponse | null;
  /** true until the first answer (or failure). */
  loading: boolean;
  /** Tricks from the API, the offline mock when the API failed, or null while loading. */
  tricks: MilestonesResponse["tricks"] | null;
}

export function useMilestones({ refresh = false }: { refresh?: boolean } = {}): Milestones {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);

  useEffect(() => {
    if (refresh || status === "idle") load();
  }, [refresh]);

  const tricks = current.data?.tricks ?? (current.status === "offline" ? mockTricks : null);
  return { data: current.data, loading: current.status === "idle" || current.status === "loading", tricks };
}
