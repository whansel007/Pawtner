import { Icon } from "./Icon";
import "./HomeViewButton.css";

/**
 * The one big way back from a single Home view (Settings > What Home shows): a whole-card button with an icon,
 * a plain-words title and one line under it. Large tap target, no hidden gesture.
 */
export function HomeViewButton({ icon, title, detail, onClick }: { icon: string; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" className="home-view-button" onClick={onClick}>
      <span className="home-view-button__icon" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <span className="home-view-button__copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <Icon name="chevron" />
    </button>
  );
}
