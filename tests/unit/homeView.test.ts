import { describe, expect, it } from "vitest";
import { readHomeView, writeHomeView } from "../../mobile/src/lib/homeView.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
}

describe("What Home shows (saved choice)", () => {
  it("defaults to both, remembers a choice, and ignores anything unknown", () => {
    const store = memoryStore();
    expect(readHomeView(store)).toBe("both");
    writeHomeView("medicines", store);
    expect(readHomeView(store)).toBe("medicines");
    store.setItem("pawtner.homeView", "everything");
    expect(readHomeView(store)).toBe("both");
    expect(readHomeView(null)).toBe("both");
  });
});

describe("dragging the Home card", () => {
  it("moves one step per snap distance toward the form or Buddy, clamped at the ends", async () => {
    const { homeViewAfterDrag, stepHomeView } = await import("../../mobile/src/lib/homeView.js");
    expect(homeViewAfterDrag("both", 30, 56)).toBe("both");
    expect(homeViewAfterDrag("both", 60, 56)).toBe("medicines");
    expect(homeViewAfterDrag("both", -60, 56)).toBe("buddy");
    expect(homeViewAfterDrag("buddy", 120, 56)).toBe("medicines");
    expect(homeViewAfterDrag("medicines", 200, 56)).toBe("medicines");
    expect(stepHomeView("buddy", -1)).toBe("buddy");
    expect(stepHomeView("medicines", -1)).toBe("both");
  });
});
