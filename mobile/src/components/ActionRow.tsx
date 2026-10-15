import type { ReactNode } from "react";
import { Icon } from "./Icon";
import "./ActionRow.css";

type IconTone = "sage" | "peach" | "white";

interface ActionRowBase {
  /** Icon, logo or thumbnail; fills the same square box on every row. */
  icon: ReactNode;
  iconTone?: IconTone;
  title: string;
  subtitle: string;
  /** "warm" = cream background (e.g. Screen for Life); default white. */
  tone?: "plain" | "warm";
}

type ActionRowProps = ActionRowBase & (
  | { onClick: () => void; href?: never; disabled?: boolean }
  | { href: string; onClick?: never; disabled?: never }
);

/**
 * One tappable row: square icon box, title + subtitle, chevron. Same box size, text edge and chevron
 * wherever it's used. With `href` it opens an external page in a new tab; otherwise it's a button.
 */
export function ActionRow(props: ActionRowProps) {
  const { icon, iconTone = "sage", title, subtitle, tone = "plain" } = props;
  const className = `action-row action-row--${tone}`;
  const content = (
    <>
      <span className={`action-row__icon action-row__icon--${iconTone}`}>{icon}</span>
      <span className="action-row__text">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <Icon name="chevron" className="action-row__chevron" />
    </>
  );
  if (props.href !== undefined) {
    return <a className={className} href={props.href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return <button className={className} type="button" onClick={props.onClick} disabled={props.disabled}>{content}</button>;
}
