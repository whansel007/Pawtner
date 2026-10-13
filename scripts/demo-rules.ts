import { sharedFixtures } from "../shared/fixtures.js";
import { decide } from "../shared/rules.js";
import { applyModelWording } from "../shared/wording.js";

for (const fixture of sharedFixtures) {
  const decision = decide(fixture.input);
  const rendered = await applyModelWording(decision, {
    apiKey: process.env.LLM_API_KEY,
    timeoutMs: 1_500,
  });
  console.log(`\n${fixture.name}`);
  console.log(`Decision: ${rendered.decision} (${rendered.ruleId})`);
  console.log(`Mood: ${rendered.mood} | Caretaker check-in: ${rendered.caretakerPing ? "yes" : "no"}`);
  console.log(`Wording [${rendered.wordingSource}]: ${rendered.wording}`);
}
