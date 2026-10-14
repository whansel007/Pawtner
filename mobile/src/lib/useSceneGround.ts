import { useLayoutEffect, type RefObject } from "react";
import { DOG_PLACEMENTS, type DogPlacement } from "../config/scene";

const DOG_FIGURE_SELECTOR = ".dog-stage__figure";

/**
 * Publishes the scene geometry as CSS custom properties on the app shell, so CSS does the placing:
 *   --dog-min, --dog-max: dog size limits for this placement (config).
 *   --ledge-space: on ledge placements, room the content card leaves above itself for the dog.
 *   --ground-y:    the dog's feet line in px from the shell top (top edge of the placement's ground element).
 *   --dog-top, --dog-height: the dog's layout box (before mood/tap motion), so overlays such as the
 *                  tap bubble can keep clear of its head.
 * The dog layer and the backdrop's lawn line both read --ground-y, so they always agree.
 * `screenKey` re-runs the measurement when the screen changes.
 */
export function useSceneGround(anchor: RefObject<HTMLElement | null>, placement: DogPlacement | null, screenKey: string) {
  useLayoutEffect(() => {
    const layer = anchor.current;
    const shell = layer?.closest<HTMLElement>(".app-shell");
    if (!layer || !shell) return;
    const vars = ["--dog-min", "--dog-max", "--ledge-space", "--ground-y", "--dog-top", "--dog-height"];
    const clear = () => vars.forEach((name) => shell.style.removeProperty(name));
    if (!placement) {
      clear();
      return;
    }

    const { ground: groundSelector, minHeight, maxHeight, ledge } = DOG_PLACEMENTS[placement];
    shell.style.setProperty("--dog-min", minHeight);
    shell.style.setProperty("--dog-max", maxHeight);
    if (ledge) shell.style.setProperty("--ledge-space", "var(--dog-min)");
    else shell.style.removeProperty("--ledge-space");

    const ground = shell.querySelector<HTMLElement>(groundSelector);
    if (!ground) {
      shell.style.removeProperty("--ground-y");
      return clear;
    }
    const measure = () => {
      const shellTop = shell.getBoundingClientRect().top;
      const y = ground.getBoundingClientRect().top - shellTop;
      shell.style.setProperty("--ground-y", `${Math.round(y)}px`);
      // Reading the figure after setting --ground-y forces layout, so this is the dog's new box.
      const figure = layer.querySelector<HTMLElement>(DOG_FIGURE_SELECTOR);
      if (figure) {
        const box = figure.getBoundingClientRect();
        shell.style.setProperty("--dog-top", `${Math.round(box.top - shellTop)}px`);
        shell.style.setProperty("--dog-height", `${Math.round(box.height)}px`);
      } else {
        shell.style.removeProperty("--dog-top");
        shell.style.removeProperty("--dog-height");
      }
    };
    measure();
    // The ground moves when the shell resizes or when anything stacked with it (e.g. the card below the chips) changes size.
    // The layer itself is observed too: the dog can move without changing size (it is bottom-anchored and size-clamped).
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(layer);
    Array.from(ground.parentElement?.children ?? [ground]).forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      clear();
    };
  }, [anchor, placement, screenKey]);
}
