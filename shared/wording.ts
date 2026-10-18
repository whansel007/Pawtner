import type { AgentDecision } from "./contract.js";

export type WordingModel = (decision: AgentDecision) => Promise<string>;

export async function applyModelWording(
  decision: AgentDecision,
  options: { apiKey?: string; timeoutMs: number; generate?: WordingModel },
): Promise<AgentDecision> {
  const fallback = { ...decision, wordingSource: "template" as const };
  // A warning's message is fixed text (it names the condition); the model never rewords it.
  if (decision.decision === "emergency_995" || decision.decision === "see_gp_soon" || decision.refused || !options.apiKey || !options.generate) return fallback;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const wording = await Promise.race([
      options.generate(decision),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Model wording timed out")), options.timeoutMs);
      }),
    ]);
    if (!wording.trim()) return fallback;
    return { ...decision, wording: wording.trim(), wordingSource: "model" };
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
