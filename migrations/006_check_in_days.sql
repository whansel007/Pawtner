BEGIN;

-- Caretaker check-ins count missed DAYS, not missed doses (user, 16 Oct): the caretaker chooses how many days in a row
-- with a missed dose send a check-in, and one missed day is allowed. Only the column's lowest value and default change;
-- no rows are rewritten (an existing threshold of 2 now means 2 days). Schema change only.
ALTER TABLE user_caregivers DROP CONSTRAINT IF EXISTS user_caregivers_threshold_check;
ALTER TABLE user_caregivers ADD CONSTRAINT user_caregivers_threshold_check CHECK (threshold >= 1);
ALTER TABLE user_caregivers ALTER COLUMN threshold SET DEFAULT 1;

COMMIT;
