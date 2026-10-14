import type { AgentDecision } from "../../../shared/contract";

export function DecisionLogCard({ decision }: { decision: AgentDecision | null }) {
  if (!decision) return <article className="activity-card decision-log-card"><strong>Agent decision</strong><p>No rule has triggered yet.</p></article>;
  return (
    <article className="activity-card decision-log-card">
      <p><strong>Agent decision · {decision.decision.replaceAll("_", " ")}</strong><time>{new Date(decision.createdAt).toLocaleString()}</time></p>
      <p>{decision.wording}</p>
      <details>
        <summary>Why the agent chose this</summary>
        <dl>
          <dt>Rule</dt><dd>{decision.ruleId}</dd>
          <dt>Reasoning</dt><dd>{decision.reasoning}</dd>
          <dt>Wording</dt><dd>{decision.wordingSource}</dd>
          {Object.entries(decision.observations).map(([key, value]) => (
            <div className="decision-observation" key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>
          ))}
        </dl>
      </details>
    </article>
  );
}
