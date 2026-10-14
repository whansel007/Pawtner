import { describe, expect, it } from "vitest";
import { backKindFor, MAX_HISTORY, popHistory, pushHistory } from "../../mobile/src/lib/navigation.js";

describe("screen navigation history", () => {
  it("top-level screens say Home; drilled-down screens say Back", () => {
    for (const screen of ["home", "health", "milestones", "walk", "settings"] as const) expect(backKindFor(screen)).toBe("home");
    for (const screen of ["screening", "summary", "customize", "explanation", "schedule", "care", "prescription", "reminders", "proof"] as const) {
      expect(backKindFor(screen)).toBe("back");
    }
  });

  it("returns to the screen a drilled-down screen was opened from", () => {
    let history = pushHistory([], "home", "settings");
    expect(history).toEqual([]);
    history = pushHistory(history, "settings", "care");
    expect(popHistory(history)).toEqual({ to: "settings", history: [] });
    expect(popHistory(pushHistory([], "home", "reminders")).to).toBe("home");
    expect(popHistory(pushHistory([], "settings", "reminders")).to).toBe("settings");
  });

  it("walks back through a chain, then falls back to Home", () => {
    let history = pushHistory([], "settings", "prescription");
    history = pushHistory(history, "prescription", "explanation");
    let step = popHistory(history);
    expect(step.to).toBe("prescription");
    step = popHistory(step.history);
    expect(step.to).toBe("settings");
    expect(popHistory(step.history).to).toBe("home");
  });

  it("a top-level screen starts a fresh trail, and the trail stays short", () => {
    const deep = pushHistory(["settings", "prescription"], "explanation", "schedule");
    expect(pushHistory(deep, "schedule", "home")).toEqual([]);
    let history: ReturnType<typeof pushHistory> = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) history = pushHistory(history, i % 2 ? "care" : "reminders", i % 2 ? "reminders" : "care");
    expect(history.length).toBe(MAX_HISTORY);
  });
});
