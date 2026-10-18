import { describe, expect, it } from "vitest";
import { bpToastKey, doseToastKey, heartChange } from "../../mobile/src/lib/heartToast.js";
import { demoTodayHearts } from "../../mobile/src/lib/demoUnlocks.js";
import { DEMO_RULES } from "../../shared/config.js";
import type { DemoUnlockKey } from "../../mobile/src/config/demo.js";
import { DEMO_UNLOCKS } from "../../mobile/src/config/demo.js";

describe("heart toasts", () => {
  it("max is the shared heart maximum", () => {
    expect(heartChange(3, DEMO_RULES.heartMaximum).full).toBe(true);
  });

  it("3 → 4: full (BP 'heart is full'), gained (dose 'gained a heart')", () => {
    const change = heartChange(3, 4, 4);
    expect(change).toEqual({ gained: true, full: true });
    expect(bpToastKey(change, false)).toBe("toast.bpLogged");
    expect(doseToastKey(change)).toBe("toast.heartGained");
  });

  it("1 → 2: gained, not full", () => {
    const change = heartChange(1, 2, 4);
    expect(change).toEqual({ gained: true, full: false });
    expect(bpToastKey(change, false)).toBe("toast.bpLoggedHeart");
    expect(doseToastKey(change)).toBe("toast.heartGained");
  });

  it("3 → 3: nothing gained (BP 'Thank you!', no dose toast)", () => {
    const change = heartChange(3, 3, 4);
    expect(change).toEqual({ gained: false, full: false });
    expect(bpToastKey(change, false)).toBe("toast.bpLoggedPlain");
    expect(doseToastKey(change)).toBeNull();
  });

  it("4 → 4: full for BP, no dose toast", () => {
    const change = heartChange(4, 4, 4);
    expect(bpToastKey(change, false)).toBe("toast.bpLogged");
    expect(doseToastKey(change)).toBeNull();
  });

  it("a warning reading always gets the warning toast", () => {
    expect(bpToastKey(heartChange(3, 4, 4), true)).toBe("toast.bpWarning");
    expect(bpToastKey(heartChange(1, 1, 4), true)).toBe("toast.bpWarning");
  });

  it("a demo 'Today' hearts tick holds the shown hearts, so a save changes nothing", () => {
    const tick = DEMO_UNLOCKS.find((unlock) => unlock.kind === "todayHearts" && unlock.value < DEMO_RULES.heartMaximum);
    expect(tick).toBeDefined();
    const ticked = new Set<DemoUnlockKey>([tick!.key]);
    const change = heartChange(demoTodayHearts(1, ticked), demoTodayHearts(2, ticked));
    expect(change.gained).toBe(false);
    expect(bpToastKey(change, false)).toBe("toast.bpLoggedPlain");
    expect(doseToastKey(change)).toBeNull();
  });
});
