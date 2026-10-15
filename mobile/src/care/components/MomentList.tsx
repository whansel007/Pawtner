import { Icon } from "../../components/Icon";
import type { CaringMoment } from "../data/types";

export interface MomentRow {
  moment: CaringMoment;
  kindLabel: string;
  time: string;
}

const ICON_BY_KIND: Record<CaringMoment["kind"], string> = { celebration: "heart", check_in: "bell" };

export function MomentList({ rows, emptyText }: { rows: readonly MomentRow[]; emptyText: string }) {
  if (rows.length === 0) return <p className="care-empty">{emptyText}</p>;
  return (
    <ul className="care-moments">
      {rows.map(({ moment, kindLabel, time }) => (
        <li className="care-moment" key={moment.id}>
          <span className={`care-moment__icon care-moment__icon--${moment.kind}`} aria-hidden="true">
            <Icon name={ICON_BY_KIND[moment.kind]} size={20} />
          </span>
          <div>
            <p>
              <span className="care-sr-only">{kindLabel}: </span>
              {moment.message}
            </p>
            <time dateTime={moment.occurredAt}>{time}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}
