import { describe, expect, it } from "vitest";
import { RESTOCK_STORAGE_KEYS } from "../../mobile/src/config/restock.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";
import {
  chooseRestockSelf,
  clearRestockHelp,
  markRestockHelpHandled,
  readRestockHelp,
  readRestockSelf,
  requestRestockHelp,
  pickRestockAlert,
  shouldShowRestock,
} from "../../mobile/src/lib/restockHelp.js";
import { addClinicMemo, fitWithin, isImageDataUrl, readClinicMemos, removeClinicMemo, writeClinicMemos } from "../../mobile/src/lib/clinicMemo.js";
import { DEMO_STORAGE_KEYS, resetDemoStorage } from "../../mobile/src/lib/demoReset.js";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}

/** Storage that throws on every call (blocked / private mode / full). */
const blockedStore: KeyValueStore = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
};

const request = { medicationId: "med-gaba", daysLeft: 4, requestedAt: "2026-10-15T04:00:00.000Z" };

describe("restock help request (demo storage)", () => {
  it("stores a pending request and reads it back", async () => {
    const store = memoryStore();
    const entry = await requestRestockHelp(request, store);
    expect(entry).toEqual({ ...request, status: "pending", handledAt: null });
    expect(readRestockHelp(store)).toEqual(entry);
  });

  it("never stores a medicine name, only the id", async () => {
    const store = memoryStore();
    await requestRestockHelp(request, store);
    const raw = store.data.get(RESTOCK_STORAGE_KEYS.request) ?? "";
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["daysLeft", "handledAt", "medicationId", "requestedAt", "status"]);
  });

  it("marks a request handled, then clears it", async () => {
    const store = memoryStore();
    await requestRestockHelp(request, store);
    const handled = markRestockHelpHandled("2026-10-15T05:00:00.000Z", store);
    expect(handled).toMatchObject({ status: "handled", handledAt: "2026-10-15T05:00:00.000Z", daysLeft: 4 });
    expect(readRestockHelp(store)?.status).toBe("handled");
    clearRestockHelp(store);
    expect(readRestockHelp(store)).toBeNull();
    expect(markRestockHelpHandled("2026-10-15T06:00:00.000Z", store)).toBeNull();
  });

  it("ignores unreadable or wrongly shaped data", () => {
    const store = memoryStore();
    store.setItem(RESTOCK_STORAGE_KEYS.request, "{not json");
    expect(readRestockHelp(store)).toBeNull();
    store.setItem(RESTOCK_STORAGE_KEYS.request, JSON.stringify({ medicationId: "x", daysLeft: "4" }));
    expect(readRestockHelp(store)).toBeNull();
  });

  it("still returns the request when storage is blocked or missing", async () => {
    await expect(requestRestockHelp(request, blockedStore)).resolves.toMatchObject({ status: "pending" });
    expect(readRestockHelp(blockedStore)).toBeNull();
    expect(readRestockHelp(null)).toBeNull();
    expect(() => clearRestockHelp(blockedStore)).not.toThrow();
  });
});

describe("restock card visibility", () => {
  it("remembers 'I'll get it myself' for that medicine", () => {
    const store = memoryStore();
    expect(readRestockSelf(store)).toBeNull();
    expect(chooseRestockSelf("med-1", store)).toBe(true);
    expect(readRestockSelf(store)).toBe("med-1");
  });

  it("reports a blocked choice so the caller can keep it in memory", () => {
    expect(chooseRestockSelf("med-1", blockedStore)).toBe(false);
    expect(readRestockSelf(blockedStore)).toBeNull();
  });

  it("shows while the supply is low, whatever the senior chose", () => {
    expect(shouldShowRestock(4, 5)).toBe(true);
    expect(shouldShowRestock(5, 5)).toBe(true);
    expect(shouldShowRestock(6, 5)).toBe(false);
    expect(shouldShowRestock(null, 5)).toBe(false);
  });
});

describe("clinic memo photo helpers", () => {
  it("fits the longest edge inside the limit and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 });
  });

  it("never upscales and handles empty images", () => {
    expect(fitWithin(640, 480, 1000)).toEqual({ width: 640, height: 480 });
    expect(fitWithin(0, 480, 1000)).toEqual({ width: 0, height: 0 });
  });

  it("adds new photos on top, keeps earlier ones, removes one at a time", () => {
    const first = { id: "1", dataUrl: "data:image/jpeg;base64,AAAA", addedAt: "2026-10-14T10:00:00.000Z" };
    const second = { id: "2", dataUrl: "data:image/jpeg;base64,BBBB", addedAt: "2026-10-15T10:00:00.000Z" };
    const both = addClinicMemo([first], second);
    expect(both).toEqual([second, first]);
    expect(removeClinicMemo(both, "2")).toEqual([first]);
  });

  it("stores and reads back only image photos; keeps a photo saved by earlier builds; blocked storage reports false", () => {
    const store = memoryStore();
    const photo = { id: "1", dataUrl: "data:image/jpeg;base64,AAAA", addedAt: "2026-10-14T10:00:00.000Z" };
    expect(writeClinicMemos("memo", [photo], store)).toBe(true);
    expect(readClinicMemos("memo", store)).toEqual([photo]);
    store.setItem("memo", JSON.stringify([{ id: "x", dataUrl: "javascript:alert(1)" }, photo]));
    expect(readClinicMemos("memo", store)).toEqual([photo]);
    store.setItem("memo", "data:image/jpeg;base64,OLD");
    expect(readClinicMemos("memo", store)).toEqual([{ id: "memo-earlier", dataUrl: "data:image/jpeg;base64,OLD", addedAt: "" }]);
    expect(isImageDataUrl("data:text/html,hi")).toBe(false);
    expect(writeClinicMemos("memo", [photo], blockedStore)).toBe(false);
  });
});

describe("pickRestockAlert", () => {
  const med = (id: string, daysOfSupply: number | null, active = true) => ({ id, name: `Med ${id}`, daysOfSupply, active });

  it("picks the active medicine with the fewest days at or under the threshold", () => {
    expect(pickRestockAlert([med("a", 14), med("b", 4), med("c", 2), med("d", 1, false)], 5))
      .toEqual({ medicationId: "c", name: "Med c", daysRemaining: 2 });
    expect(pickRestockAlert([med("a", 5)], 5)?.medicationId).toBe("a");
  });

  it("returns null when nothing is low or supply is unknown", () => {
    expect(pickRestockAlert([med("a", 14), med("b", null)], 5)).toBeNull();
    expect(pickRestockAlert([], 5)).toBeNull();
  });
});

describe("reset demo", () => {
  it("clears every demo key and leaves other keys alone", () => {
    const store = memoryStore();
    DEMO_STORAGE_KEYS.forEach((key) => store.setItem(key, "x"));
    store.setItem("unrelated", "keep");
    resetDemoStorage(store);
    expect([...store.data.keys()]).toEqual(["unrelated"]);
  });

  it("does nothing when storage is blocked", () => {
    expect(() => resetDemoStorage(blockedStore)).not.toThrow();
  });
});
