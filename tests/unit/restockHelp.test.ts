import { describe, expect, it } from "vitest";
import { RESTOCK_STORAGE_KEYS } from "../../mobile/src/config/restock.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";
import {
  chooseRestockSelf,
  readRestockSelf,
  pickRestockAlerts,
  restockCardState,
  shouldShowRestock,
} from "../../mobile/src/lib/restockHelp.js";
import type { RestockRequest } from "../../shared/contract.js";
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

const serverRequest = (medicationId: string, status: RestockRequest["status"], requestedAt: string): RestockRequest => ({
  id: `${medicationId}-${requestedAt}`, medicationId, medicationName: `Med ${medicationId}`, daysLeft: 4, requestedAt, status,
  handledAt: status === "handled" ? requestedAt : null,
});

describe("restock card state (requests from the server, one card per medicine)", () => {
  it("offers help until she asks; then asked; then handled once a caretaker taps", () => {
    expect(restockCardState("a", [], [])).toBe("offer");
    expect(restockCardState("a", [serverRequest("a", "pending", "2026-10-18T01:00:00.000Z")], [])).toBe("asked");
    expect(restockCardState("a", [serverRequest("a", "handled", "2026-10-18T01:00:00.000Z")], [])).toBe("handled");
  });

  it("each medicine has its own state; the latest request for it decides", () => {
    const requests = [
      serverRequest("a", "handled", "2026-10-17T01:00:00.000Z"),
      serverRequest("a", "pending", "2026-10-18T01:00:00.000Z"),
      serverRequest("b", "handled", "2026-10-18T02:00:00.000Z"),
    ];
    expect(restockCardState("a", requests, [])).toBe("asked");
    expect(restockCardState("b", requests, [])).toBe("handled");
    expect(restockCardState("c", requests, ["c"])).toBe("self");
  });
});

describe("restock card visibility", () => {
  it("remembers 'I'll get it myself' per medicine, on this phone only", () => {
    const store = memoryStore();
    expect(readRestockSelf(store)).toEqual([]);
    expect(chooseRestockSelf("med-1", store)).toEqual(["med-1"]);
    expect(chooseRestockSelf("med-2", store)).toEqual(["med-1", "med-2"]);
    expect(readRestockSelf(store)).toEqual(["med-1", "med-2"]);
    // An older build stored a single id.
    store.setItem(RESTOCK_STORAGE_KEYS.self, "med-old");
    expect(readRestockSelf(store)).toEqual(["med-old"]);
  });

  it("keeps the choice in memory when storage is blocked", () => {
    expect(chooseRestockSelf("med-1", blockedStore)).toEqual(["med-1"]);
    expect(readRestockSelf(blockedStore)).toEqual([]);
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

describe("pickRestockAlerts", () => {
  const med = (id: string, daysOfSupply: number | null, active = true) => ({ id, name: `Med ${id}`, daysOfSupply, active });

  it("lists every active medicine at or under the threshold, fewest days first (one card each)", () => {
    expect(pickRestockAlerts([med("a", 14), med("b", 4), med("c", 2), med("d", 1, false), med("e", 5)], 5)).toEqual([
      { medicationId: "c", name: "Med c", daysRemaining: 2 },
      { medicationId: "b", name: "Med b", daysRemaining: 4 },
      { medicationId: "e", name: "Med e", daysRemaining: 5 },
    ]);
  });

  it("is empty when nothing is low or supply is unknown", () => {
    expect(pickRestockAlerts([med("a", 14), med("b", null)], 5)).toEqual([]);
    expect(pickRestockAlerts([], 5)).toEqual([]);
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
