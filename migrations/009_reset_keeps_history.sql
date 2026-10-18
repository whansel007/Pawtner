BEGIN;

-- Demo "Reset to morning" no longer deletes the day's taps, readings, decisions and walks. It stamps each of the
-- reset day's rows with the moment of the reset; every read skips stamped rows (api/repository.ts `notReset`), so the
-- morning state comes back while the rows stay. A stamp, not a cut-off time: rows carry demo-clock times, and after a
-- reset new taps land in the same time range as the hidden ones. Null = counts (every row before this migration).
-- Additive only: four nullable columns, no default, no rows rewritten, no constraint changes. Old code keeps working.
ALTER TABLE dose_events ADD COLUMN IF NOT EXISTS reset_at timestamptz;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS reset_at timestamptz;
ALTER TABLE agent_decisions ADD COLUMN IF NOT EXISTS reset_at timestamptz;
ALTER TABLE walk_sessions ADD COLUMN IF NOT EXISTS reset_at timestamptz;

COMMIT;
