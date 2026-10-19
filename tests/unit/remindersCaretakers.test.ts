import { describe, expect, it } from "vitest";
import { remindersParts } from "../../mobile/src/lib/reminders.js";
import { openedFrom, pushHistory } from "../../mobile/src/lib/navigation.js";
import { caretakerNames } from "../../mobile/src/lib/caretakers.js";

describe("Gentle reminders by the way in", () => {
  it("shows the next dose from Home, not from Settings (Buddy's nudges)", () => {
    expect(remindersParts(openedFrom(pushHistory([], "home", "reminders")))).toEqual({ nextDose: true });
    expect(remindersParts(openedFrom(pushHistory([], "settings", "reminders")))).toEqual({ nextDose: false });
    expect(remindersParts(null)).toEqual({ nextDose: true });
  });

  it("knows the screen it was opened from", () => {
    expect(openedFrom([])).toBeNull();
    expect(openedFrom(["settings", "medicines"])).toBe("medicines");
  });
});

describe("caretaker names for Settings", () => {
  const fallback = [{ id: "f1", name: "Fallback", receivesCheckIns: true }];
  it("come from the summary, in its order", () => {
    const summary = { caregivers: [{ id: "a", name: "Jamie", receivesCheckIns: true }, { id: "b", name: "Alex", receivesCheckIns: false }] };
    expect(caretakerNames(summary, fallback)).toEqual(["Jamie", "Alex"]);
  });
  it("fall back when there is no summary, no list (older API) or nobody listed", () => {
    expect(caretakerNames(null, fallback)).toEqual(["Fallback"]);
    expect(caretakerNames({}, fallback)).toEqual(["Fallback"]);
    expect(caretakerNames({ caregivers: [] }, fallback)).toEqual(["Fallback"]);
  });
});
