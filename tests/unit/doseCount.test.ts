import { describe, expect, it } from "vitest";
import { countAfterTaking, countTaken } from "../../mobile/src/lib/doseCount.js";

type Status = "taken" | "due" | "missed" | "upcoming";
const doses = (...statuses: Status[]) => statuses.map((status, index) => ({ id: `d${index + 1}`, status }));

describe("proof button count: '{{done}}/{{total}} taken'", () => {
  it("3 doses, the first → 1/3", () => {
    expect(countAfterTaking(doses("due", "upcoming", "upcoming"), "d1")).toEqual({ done: 1, total: 3 });
  });
  it("4 doses, the first → 1/4", () => {
    expect(countAfterTaking(doses("due", "upcoming", "upcoming", "upcoming"), "d1")).toEqual({ done: 1, total: 4 });
  });
  it("the last of 3 → 3/3", () => {
    expect(countAfterTaking(doses("taken", "taken", "due"), "d3")).toEqual({ done: 3, total: 3 });
  });
  it("a dose already taken is not counted twice; an unknown dose adds nothing", () => {
    expect(countAfterTaking(doses("taken", "due"), "d1")).toEqual({ done: 1, total: 2 });
    expect(countAfterTaking(doses("taken", "due"), "nope")).toEqual({ done: 1, total: 2 });
  });
  it("counts like Home's card", () => {
    expect(countTaken(doses("taken", "missed", "taken"))).toBe(2);
  });
});
