import "./PromptCard.css";

/**
 * A short prompt card (the side-effect question at the top of Health). Text only: the question itself answers "why"
 * (owner, 18 Oct: "the side effect card actually can answer the why. so we don't need two why").
 */
export function PromptCard({ text }: { text: string }) {
  return <p className="prompt-card">{text}</p>;
}
