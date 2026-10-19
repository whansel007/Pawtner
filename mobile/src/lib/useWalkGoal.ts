import { useCallback, useState } from "react";
import { WALK_GOAL_STORAGE_KEY } from "../config/walk";
import { readWalkGoal, walkGoalByKey, writeWalkGoal, type WalkGoal } from "./walkGoals";

/** The walk goal chosen in Settings, kept on this phone (not cleared by Reset to morning). */
export function useWalkGoal(): [WalkGoal, (key: string) => void] {
  const [goal, setGoal] = useState<WalkGoal>(() => readWalkGoal(WALK_GOAL_STORAGE_KEY));
  const choose = useCallback((key: string) => {
    writeWalkGoal(WALK_GOAL_STORAGE_KEY, key);
    setGoal(walkGoalByKey(key));
  }, []);
  return [goal, choose];
}
