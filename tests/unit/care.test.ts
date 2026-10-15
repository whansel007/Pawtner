import { describe, expect, it } from "vitest";
import { DEMO_RULES } from "../../shared/config.js";
import {
  canDecreaseThreshold,
  checkInLock,
  initialOf,
  progressPercent,
  recentDays,
  stepThreshold,
  streakHearts,
  todayProgress,
  todayState,
  visibleMoments,
} from "../../mobile/src/care/lib/rules.js";
import { buildCaretakers, buildPersonas, findCaretaker, isCaretakerSlot } from "../../mobile/src/care/data/personas.js";
import { buildMockCareData, MOCK_UPDATES_ONLY_CARETAKER } from "../../mobile/src/care/data/mock.js";
import { CARE_PATHS, guardRoute, isCarePath, routeFromPath } from "../../mobile/src/care/routing.js";

describe("care streak hearts", () => {
  it("fills the last min(streak, 7) days, oldest first", () => {
    expect(streakHearts(0)).toEqual([false, false, false, false, false, false, false]);
    expect(streakHearts(3)).toEqual([false, false, false, false, true, true, true]);
    expect(streakHearts(7).every(Boolean)).toBe(true);
    expect(streakHearts(30).every(Boolean)).toBe(true);
  });

  it("treats odd input as no streak", () => {
    expect(streakHearts(-2).some(Boolean)).toBe(false);
    expect(streakHearts(Number.NaN).some(Boolean)).toBe(false);
  });

  it("lists the seven days before today (the streak never counts today), so filled hearts = streak", () => {
    const now = new Date(2026, 9, 14, 9, 30);
    const days = recentDays(now);
    expect(days).toHaveLength(7);
    expect(days[6].getDate()).toBe(13);
    expect(days[0].getDate()).toBe(7);
    expect(streakHearts(3).filter(Boolean)).toHaveLength(3);
  });
});

describe("care today progress", () => {
  it("counts taken doses only and picks a calm state", () => {
    const progress = todayProgress([{ status: "taken" }, { status: "taken" }, { status: "upcoming" }, { status: "due" }]);
    expect(progress).toEqual({ done: 2, total: 4, missed: 0 });
    expect(progressPercent(progress)).toBe(50);
    expect(todayState(progress)).toBe("onTrack");
    expect(todayState(todayProgress([{ status: "taken" }, { status: "missed" }]))).toBe("missed");
    expect(todayState(todayProgress([{ status: "taken" }]))).toBe("allDone");
    expect(todayState(todayProgress([]))).toBe("none");
    expect(progressPercent(todayProgress([]))).toBe(0);
  });
});

describe("care visibility by persona", () => {
  const moments = buildMockCareData(new Date(2026, 9, 14, 9)).summary.caringMoments;

  it("updates-only caretakers never see check-in moments", () => {
    const visible = visibleMoments(moments, { receivesCheckIns: false });
    expect(visible.some((moment) => moment.kind === "check_in")).toBe(false);
    expect(visible.length).toBe(moments.filter((moment) => moment.kind !== "check_in").length);
  });

  it("check-ins caretakers see everything", () => {
    expect(visibleMoments(moments, { receivesCheckIns: true })).toEqual(moments);
  });

  it("only an opted-in, online check-ins caretaker can change the threshold", () => {
    expect(checkInLock({ receivesCheckIns: true, optedIn: true, offline: false })).toBeNull();
    expect(checkInLock({ receivesCheckIns: false, optedIn: true, offline: false })).toBe("updatesOnly");
    expect(checkInLock({ receivesCheckIns: true, optedIn: false, offline: false })).toBe("noConsent");
    expect(checkInLock({ receivesCheckIns: true, optedIn: true, offline: true })).toBe("offline");
  });

  it("the threshold never goes below the configured minimum", () => {
    const min = DEMO_RULES.caretakerMinimumThreshold;
    expect(stepThreshold(min, -1)).toBe(min);
    expect(stepThreshold(min, 1)).toBe(min + 1);
    expect(canDecreaseThreshold(min)).toBe(false);
    expect(canDecreaseThreshold(min + 1)).toBe(true);
  });
});

describe("care demo personas", () => {
  const summary = buildMockCareData().summary;

  it("senior first, then a check-ins caretaker and the updates-only mock slot", () => {
    const personas = buildPersonas({ ...summary, senior: { id: "s1", name: "Mum" }, caregiver: { id: "c1", name: "Robin" } });
    expect(personas.map((persona) => persona.slot)).toEqual(["senior", "checkIns", "updatesOnly"]);
    expect(personas[0].name).toBe("Mum");
    expect(personas[1]).toMatchObject({ name: "Robin", receivesCheckIns: true, isMockSlot: false });
    expect(personas[2]).toMatchObject({ name: MOCK_UPDATES_ONLY_CARETAKER.name, receivesCheckIns: false, isMockSlot: true });
  });

  it("falls back to the mock check-ins caretaker when the API has none", () => {
    const [checkIns] = buildCaretakers({ caregiver: null });
    expect(checkIns.isMockSlot).toBe(true);
    expect(checkIns.receivesCheckIns).toBe(true);
  });

  it("only caretaker slots can be stored as a session persona", () => {
    expect(isCaretakerSlot("checkIns")).toBe(true);
    expect(isCaretakerSlot("updatesOnly")).toBe(true);
    expect(isCaretakerSlot("senior")).toBe(false);
    expect(isCaretakerSlot(null)).toBe(false);
    expect(findCaretaker(buildCaretakers(summary), null)).toBeNull();
  });

  it("initials work for any name", () => {
    expect(initialOf("jamie")).toBe("J");
    expect(initialOf("  ")).toBe("?");
    expect(initialOf("秀兰")).toBe("秀");
  });
});

describe("care routes", () => {
  it("separates the phone app from /care", () => {
    expect(isCarePath("/")).toBe(false);
    expect(isCarePath("/careful")).toBe(false);
    expect(isCarePath("/care")).toBe(true);
    expect(isCarePath("/care/week/")).toBe(true);
  });

  it("maps paths to routes and sends signed-out visitors to the picker", () => {
    expect(routeFromPath("/care/alerts")).toBe("alerts");
    expect(routeFromPath("/care/unknown")).toBe("landing");
    expect(guardRoute("week", false)).toBe("signIn");
    expect(guardRoute("week", true)).toBe("week");
    expect(guardRoute("landing", false)).toBe("landing");
    expect(CARE_PATHS.signIn).toBe("/care/sign-in");
  });
});
