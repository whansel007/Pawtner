import { describe, expect, it } from "vitest";
import { createApiHandler } from "../../api/handlers.js";
import type { PawtnerRepository } from "../../api/repository.js";

// A stand-in repository: only the method this route uses.
const stored = { medicationId: "med-1", imageDataUrl: "data:image/jpeg;base64,AAAA", setAt: "2026-10-16T02:00:00.000Z" };
const handler = createApiHandler({ getPillReference: async (id: string) => ({ ...stored, medicationId: id }) } as unknown as PawtnerRepository);

describe("GET /api/pill-reference", () => {
  it("returns the saved original photo for a medicine", async () => {
    const response = await handler(new Request("http://x/api/pill-reference?medicationId=med-1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(stored);
  });

  it("asks for the medicine id", async () => {
    const response = await handler(new Request("http://x/api/pill-reference"));
    expect(response.status).toBe(400);
  });
});
