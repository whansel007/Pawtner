import { useId, type ReactNode } from "react";

interface CareCardProps {
  eyebrow?: string;
  title: string;
  badge?: ReactNode;
  stitched?: boolean;
  className?: string;
  children: ReactNode;
}

/** Felt card: eyebrow, heading, optional badge, then content. Labelled by its own heading. */
export function CareCard({ eyebrow, title, badge, stitched = false, className = "", children }: CareCardProps) {
  const headingId = useId();
  return (
    <section className={`care-card ${stitched ? "care-stitched" : ""} ${className}`} aria-labelledby={headingId}>
      <div className="care-card__heading">
        <div>
          {eyebrow && <p className="care-eyebrow">{eyebrow}</p>}
          <h2 id={headingId}>{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

export function CareBadge({ tone = "moss", children }: { tone?: "moss" | "rose"; children: ReactNode }) {
  return <span className={`care-badge care-badge--${tone}`}>{children}</span>;
}

/** Forest banner at the top of each signed-in page, with the dog on the right. */
export function PageWelcome({ eyebrow, title, intro, aside }: { eyebrow: string; title: string; intro: string; aside?: ReactNode }) {
  return (
    <div className="care-welcome">
      <div className="care-welcome__copy">
        <p className="care-eyebrow care-eyebrow--light">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {aside}
    </div>
  );
}
