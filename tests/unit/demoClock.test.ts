import { describe, expect, it } from "vitest";
import { demoClockOnLoad, readDemoClock, searchWithout, runningClock, saveDemoClock } from "../../mobile/src/lib/demoClock.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
}

describe("demo clock", () => {
  it("runs forward from the moment it was set", () => {
    const anchor = { at: "2026-10-16T01:59:00.000Z", setAtMs: 1_000_000 };
    expect(runningClock(anchor, 1_000_000)).toBe("2026-10-16T01:59:00.000Z");
    expect(runningClock(anchor, 1_000_000 + 60_000)).toBe("2026-10-16T02:00:00.000Z");
    expect(runningClock(null)).toBeNull();
  });

  it("is shared with /care: saved, read running, cleared for real time, junk ignored", () => {
    const store = memoryStore();
    expect(readDemoClock(store)).toBeNull();
    saveDemoClock({ at: "2026-10-16T01:00:00.000Z", setAtMs: 5_000 }, store);
    expect(readDemoClock(store, 5_000 + 30_000)).toBe("2026-10-16T01:00:30.000Z");
    saveDemoClock(null, store);
    expect(readDemoClock(store)).toBeNull();
    store.setItem("pawtner.demoClock", "soon");
    expect(readDemoClock(store)).toBeNull();
    store.setItem("pawtner.demoClock", "2026-10-16T01:00:00.000Z");
    expect(readDemoClock(store, 9_000)).toBe("2026-10-16T01:00:00.000Z");
  });
});

describe("demo clock on load (the server keeps the demo's time)", () => {
  it("a ?clock= link wins and is written to the server", () => {
    expect(demoClockOnLoad("2026-10-18T01:00:00.000Z")).toEqual({ action: "write", at: "2026-10-18T01:00:00.000Z" });
  });
  it("without a link the phone adopts the server's clock and writes nothing", () => {
    expect(demoClockOnLoad(null)).toEqual({ action: "adopt" });
  });
});

describe("the ?clock= link is used once", () => {
  it("is removed from the address after it was written, other params kept", () => {
    expect(searchWithout("?clock=morning", "clock")).toBe("");
    expect(searchWithout("?clock=morning&time=evening", "clock")).toBe("?time=evening");
    expect(searchWithout("?time=21:00", "clock")).toBe("?time=21%3A00");
    expect(searchWithout("", "clock")).toBe("");
  });
});
