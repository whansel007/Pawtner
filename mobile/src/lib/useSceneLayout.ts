import { useEffect, useState } from "react";
import { LANDSCAPE_MEDIA_QUERY, type SceneLayout } from "../config/scene";

function currentLayout(): SceneLayout {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "portrait";
  return window.matchMedia(LANDSCAPE_MEDIA_QUERY).matches ? "landscape" : "portrait";
}

/** Portrait or two-column landscape scene, following the same media query as the CSS (config/scene.ts). */
export function useSceneLayout(): SceneLayout {
  const [layout, setLayout] = useState<SceneLayout>(currentLayout);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(LANDSCAPE_MEDIA_QUERY);
    const update = () => setLayout(query.matches ? "landscape" : "portrait");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return layout;
}
