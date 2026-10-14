import { useLayoutEffect, type RefObject } from "react";
import { DOG_PLACEMENTS, type DogPlacement } from "../config/scene";

/**
 * Publishes the scene geometry as CSS custom properties on the app shell, so CSS does the placing:
 *   --dog-min, --dog-max: dog size limits for this placement (config).
 *   --ledge-space: on ledge screens, room the content card leaves above itself for the dog.
 *   --ground-y:    the dog's feet line in px from the shell top (top edge of the placement's ground element).
 * The dog layer and the backdrop's lawn line both read --ground-y, so they always agree.
 * `screenKey` re-runs the measurement when the screen changes.
 */
export function useSceneGround(anchor: RefObject<HTMLElement | null>, placement: DogPlacement | null, screenKey: string) {
  useLayoutEffect(() => {
    const shell = anchor.current?.closest<HTMLElement>(".app-shell");
    if (!shell) return;
    const vars = ["--dog-min", "--dog-max", "--ledge-space", "--ground-y"];
    const clear = () => vars.forEach((name) => shell.style.removeProperty(name));
    if (!placement) {
      clear();
      return;
    }

    const { ground: groundSelector, minHeight, maxHeight } = DOG_PLACEMENTS[placement];
    shell.style.setProperty("--dog-min", minHeight);
    shell.style.setProperty("--dog-max", maxHeight);
    if (placement === "ledge") shell.style.setProperty("--ledge-space", "var(--dog-min)");
    else shell.style.removeProperty("--ledge-space");

    const ground = shell.querySelector<HTMLElement>(groundSelector);
    if (!ground) {
      shell.style.removeProperty("--ground-y");
      return clear;
    }
    const measure = () => {
      const y = ground.getBoundingClientRect().top - shell.getBoundingClientRect().top;
      shell.style.setProperty("--ground-y", `${Math.round(y)}px`);
    };
    measure();
    // The ground moves when the shell resizes or when anything stacked with it (e.g. the card below the chips) changes size.
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    Array.from(ground.parentElement?.children ?? [ground]).forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      clear();
    };
  }, [anchor, placement, screenKey]);
}
