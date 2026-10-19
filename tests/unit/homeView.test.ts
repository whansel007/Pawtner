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

describe("measuring Buddy's ground again", () => {
  it("changes with the dragged card's view and equals the screen where nothing drags", async () => {
    const { sceneGroundKey } = await import("../../mobile/src/lib/homeView.js");
    const homeKeys = new Set((["buddy", "both", "medicines"] as const).map((view) => sceneGroundKey("home", view)));
    expect(homeKeys.size).toBe(3);
    const healthKeys = new Set((["buddy", "both", "medicines"] as const).map((view) => sceneGroundKey("health", view)));
    expect(healthKeys.size).toBe(3);
    expect(sceneGroundKey("home", "both")).not.toBe(sceneGroundKey("health", "both"));
    expect(sceneGroundKey("bpLog", null)).toBe("bpLog");
  });
});

describe("card screens that drag like Home", () => {
  it("are Health, Milestones and Settings, from config", async () => {
    const { CARD_SHEET } = await import("../../mobile/src/config/homeView.js");
    const { isCardSheetScreen } = await import("../../mobile/src/lib/homeView.js");
    expect([...CARD_SHEET.screens]).toEqual(["health", "milestones", "settings"]);
    for (const screen of CARD_SHEET.screens) expect(isCardSheetScreen(screen)).toBe(true);
    for (const screen of ["home", "bpLog", "medicines", "reminders", "walk"] as const) expect(isCardSheetScreen(screen)).toBe(false);
  });

  it("open in both on every visit; Home keeps its own view", async () => {
    const { cardViewOn, sheetViewFor } = await import("../../mobile/src/lib/homeView.js");
    expect(cardViewOn(null, "health")).toBe("both");
    expect(cardViewOn({ screen: "health", view: "medicines" }, "health")).toBe("medicines");
    expect(cardViewOn({ screen: "health", view: "medicines" }, "settings")).toBe("both");
    expect(sheetViewFor("home", "medicines", "buddy")).toBe("medicines");
    expect(sheetViewFor("milestones", "medicines", "buddy")).toBe("buddy");
    expect(sheetViewFor("bpLog", "medicines", "buddy")).toBeNull();
  });

  it("put Buddy on the card edge, the strip, or nowhere", async () => {
    const { dogPlacementFor } = await import("../../mobile/src/config/scene.js");
    expect(dogPlacementFor("health", "portrait", "both")).toBe("ledge");
    expect(dogPlacementFor("health", "portrait", "buddy")).toBe("strip");
    expect(dogPlacementFor("health", "portrait", "medicines")).toBeNull();
    expect(dogPlacementFor("settings", "landscape", "buddy")).toBe("lawn");
    expect(dogPlacementFor("settings", "landscape", "medicines")).toBeNull();
    // Home and screens that don't drag are as before.
    expect(dogPlacementFor("home", "portrait", "medicines")).toBe("home");
    expect(dogPlacementFor("home", "landscape", "buddy")).toBe("homeWide");
    expect(dogPlacementFor("bpLog", "portrait", null)).toBe("ledge");
    expect(dogPlacementFor("bpLog", "landscape")).toBe("lawn");
  });
});

describe("the grab bar's dashes", () => {
  it("show 1 in full Buddy, 2 in both, 3 in the full card", async () => {
    const { SHEET_DASHES } = await import("../../mobile/src/config/homeView.js");
    expect(SHEET_DASHES).toEqual({ buddy: 1, both: 2, medicines: 3 });
  });
});
