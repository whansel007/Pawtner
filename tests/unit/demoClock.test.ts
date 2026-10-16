import { describe, expect, it } from "vitest";
import { readDemoClock, saveDemoClock } from "../../mobile/src/lib/demoClock.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
}

describe("shared agent clock for /care", () => {
  it("saves an instant, clears it for real time, and ignores junk", () => {
    const store = memoryStore();
    expect(readDemoClock(store)).toBeNull();
    saveDemoClock("2026-10-16T01:00:00.000Z", store);
    expect(readDemoClock(store)).toBe("2026-10-16T01:00:00.000Z");
    saveDemoClock(null, store);
    expect(readDemoClock(store)).toBeNull();
    store.setItem("pawtner.demoClock", "soon");
    expect(readDemoClock(store)).toBeNull();
  });
});
