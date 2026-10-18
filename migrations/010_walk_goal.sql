BEGIN;

-- Walk goal (owner, 18 Oct): the senior picks in Settings how long a walk must last to earn the walk heart
-- (3k steps = 30 min, 5k = 50 min, 10k = 100 min; the phone has no step counter, so a walk is measured by time).
-- Each walk stores the goal it was walked under, so changing the goal never rewrites earlier walks or past hearts.
-- Null = a walk saved before goals existed (or by an older phone): it counts as it did, any length earns the heart.
-- Additive only: one nullable column, no default, no rows rewritten, no constraint changes.
ALTER TABLE walk_sessions ADD COLUMN IF NOT EXISTS goal_minutes int;

COMMIT;
