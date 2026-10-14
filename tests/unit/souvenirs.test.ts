import { describe, it, expect } from "vitest";
import { SOUVENIR_TIERS, unlockedSouvenirs, nextSouvenir } from "../../shared/souvenirs.js";

describe("souvenirs", () => {
  it("unlocks nothing at zero distance", () => {
    expect(unlockedSouvenirs(0)).toEqual([]);
  });

  it("unlocks Marina Bay at 1 km", () => {
    expect(unlockedSouvenirs(1_000)).toEqual(["marina_bay"]);
  });

  it("unlocks multiple tiers cumulatively", () => {
    expect(unlockedSouvenirs(5_000)).toEqual(["marina_bay", "botanic_gardens", "east_coast"]);
  });

  it("unlocks all tiers at 21 km", () => {
    expect(unlockedSouvenirs(21_000).length).toBe(SOUVENIR_TIERS.length);
  });

  it("returns the next locked souvenir", () => {
    expect(nextSouvenir(0)?.key).toBe("marina_bay");
    expect(nextSouvenir(1_000)?.key).toBe("botanic_gardens");
  });

  it("returns null when all are unlocked", () => {
    expect(nextSouvenir(21_000)).toBeNull();
  });
});
