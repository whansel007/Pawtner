import { describe, expect, it } from "vitest";
import { RESTOCK_STORAGE_KEYS } from "../../mobile/src/config/restock.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";
import {
  clearRestockHelp,
  dismissRestockForToday,
  isRestockDismissed,
  localDay,
  markRestockHelpHandled,
  readRestockHelp,
  requestRestockHelp,
  shouldShowRestock,
} from "../../mobile/src/lib/restockHelp.js";
import { fitWithin, isImageDataUrl, readClinicMemo, writeClinicMemo } from "../../mobile/src/lib/clinicMemo.js";

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
  it("'I'll get it myself' hides the card for the rest of the local day only", () => {
    const store = memoryStore();
    const morning = new Date(2026, 9, 15, 9, 0);
    const evening = new Date(2026, 9, 15, 23, 59);
    const nextDay = new Date(2026, 9, 16, 0, 1);
    expect(isRestockDismissed(morning, store)).toBe(false);
    expect(dismissRestockForToday(morning, store)).toBe(true);
    expect(isRestockDismissed(evening, store)).toBe(true);
    expect(isRestockDismissed(nextDay, store)).toBe(false);
  });

  it("reports a blocked dismissal so the caller can keep it in memory", () => {
    expect(dismissRestockForToday(new Date(2026, 9, 15), blockedStore)).toBe(false);
    expect(isRestockDismissed(new Date(2026, 9, 15), blockedStore)).toBe(false);
  });

  it("formats the local day with zero padding", () => {
    expect(localDay(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("shows only for a low supply that wasn't dismissed today", () => {
    expect(shouldShowRestock(4, 5, false)).toBe(true);
    expect(shouldShowRestock(5, 5, false)).toBe(true);
    expect(shouldShowRestock(6, 5, false)).toBe(false);
    expect(shouldShowRestock(4, 5, true)).toBe(false);
    expect(shouldShowRestock(null, 5, false)).toBe(false);
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

  it("stores and reads back only image data URLs; blocked storage reports false", () => {
    const store = memoryStore();
    expect(writeClinicMemo("memo", "data:image/jpeg;base64,AAAA", store)).toBe(true);
    expect(readClinicMemo("memo", store)).toBe("data:image/jpeg;base64,AAAA");
    store.setItem("memo", "javascript:alert(1)");
    expect(readClinicMemo("memo", store)).toBeNull();
    expect(isImageDataUrl("data:text/html,hi")).toBe(false);
    expect(writeClinicMemo("memo", "data:image/jpeg;base64,AAAA", blockedStore)).toBe(false);
  });
});
