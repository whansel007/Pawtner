import { describe, expect, it } from "vitest";
import { sharedFixtures } from "../../shared/fixtures.js";
import { decide } from "../../shared/rules.js";

describe("shared PRD fixtures", () => {
  it.each(sharedFixtures)("$name returns expected decision metadata", ({ input, expected }) => {
    expect(decide(input)).toMatchObject(expected);
  });
});
