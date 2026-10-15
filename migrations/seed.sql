-- Fictional demo seed. Safe to re-run: every run moves the demo history so it ends yesterday
-- (in Rose's time zone), so the app looks lived-in on whatever day the seed is run.
--
-- Resulting history, relative to the day the seed runs (Rose's local dates):
--   days -10 .. -8 : Tablet A (10:00) taken, Tablet B (20:00) missed  -> 2 hearts a day
--   days  -7 .. -1 : both taken                                       -> 4 hearts a day, streak 7
--   days -6, -4, -2: one normal blood-pressure reading each (no rule fires)
--   today          : no events; the presenter taps "Taken" live
-- Lifetime hearts before today's share: 3 x 2 + 7 x 4 = 34.
BEGIN;

INSERT INTO users (id, name, timezone) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Rose', 'Asia/Singapore')
ON CONFLICT (id) DO NOTHING;

INSERT INTO caregivers (id, name) VALUES
  ('00000000-0000-4000-8000-000000000002', 'Jamie'),
  ('00000000-0000-4000-8000-00000000000a', 'Alex')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_caregivers (user_id, caregiver_id, opted_in, threshold) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', true, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', false, 2)
ON CONFLICT (user_id, caregiver_id) DO NOTHING;

-- heart/streak/mood are recomputed by the API on every dose event; Milestones reads the stored
-- streak, so it is set to the 7 full days of the history below.
INSERT INTO dogs (id, user_id, name, heart, streak, mood) VALUES
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Buddy', 2, 7, 'content')
ON CONFLICT (id) DO UPDATE SET heart = EXCLUDED.heart, streak = EXCLUDED.streak, mood = EXCLUDED.mood;

INSERT INTO medications (id, user_id, name, strength, days_of_supply) VALUES
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Fictional Tablet A', '5 mg', 14),
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Fictional Tablet B', '10 mg', 4)
ON CONFLICT (id) DO NOTHING;

-- Both schedules start 10 days before today in Rose's time zone (re-run moves them).
INSERT INTO med_schedules (id, medication_id, scheduled_time, starts_on)
SELECT v.id::uuid, v.medication_id::uuid, v.scheduled_time::time, (now() AT TIME ZONE u.timezone)::date - 10
FROM (VALUES
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000004', '10:00'),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000005', '20:00')
) AS v(id, medication_id, scheduled_time)
JOIN users u ON u.id = '00000000-0000-4000-8000-000000000001'
ON CONFLICT (id) DO UPDATE SET starts_on = EXCLUDED.starts_on;

-- DATA DELETE, scoped to the fictional demo: removes every dose event of the two seed schedules
-- above (Rose's Fictional Tablet A and B), including any "Taken" taps made in the app, so the
-- history below is the only history. No other schedule's events are touched.
DELETE FROM dose_events
WHERE schedule_id IN ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000007');

-- Clear the demo user's prior agent decisions (e.g. a stale emergency_995 left over from testing)
-- so the dog's mood isn't pinned to an old decision after reseeding. Fictional demo data only;
-- decisions are regenerated as the presenter records new events. No other user's data is touched.
DELETE FROM agent_decisions
WHERE user_id = '00000000-0000-4000-8000-000000000001';

-- One "taken" event per seed schedule per day from starts_on to yesterday, except Tablet B on the
-- first three days (missed: no event). scheduled_for is built exactly like the API's occurrences
-- ((local day + scheduled_time) AT TIME ZONE the user's zone) so the events match them.
INSERT INTO dose_events (id, schedule_id, scheduled_for, event, occurred_at, proof_photo_url)
SELECT gen_random_uuid(),
       o.schedule_id,
       o.scheduled_for,
       'taken',
       o.scheduled_for + make_interval(mins => 2 + (o.day_index * 7) % 11),
       NULL
FROM (
  SELECT ms.id AS schedule_id,
         ms.id = '00000000-0000-4000-8000-000000000007' AS is_tablet_b,
         day.local_day::date - ms.starts_on AS day_index,
         (day.local_day + ms.scheduled_time) AT TIME ZONE u.timezone AS scheduled_for
  FROM med_schedules ms
  JOIN medications m ON m.id = ms.medication_id
  JOIN users u ON u.id = m.user_id
  CROSS JOIN LATERAL generate_series(
    ms.starts_on::timestamp,
    ((now() AT TIME ZONE u.timezone)::date - 1)::timestamp,
    interval '1 day'
  ) AS day(local_day)
  WHERE ms.id IN ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000007')
) AS o
WHERE NOT (o.is_tablet_b AND o.day_index < 3);

-- Three normal fictional readings (well below the 140/90 repeated-high and 180/120 high demo
-- thresholds), no note. Fixed ids make re-runs move them instead of adding more; nothing deleted.
INSERT INTO health_metrics (id, user_id, kind, systolic, diastolic, note, recorded_at)
SELECT v.id::uuid, u.id, 'blood_pressure', v.systolic, v.diastolic, NULL,
       (((now() AT TIME ZONE u.timezone)::date + v.day_offset) + time '08:45') AT TIME ZONE u.timezone
FROM (VALUES
  ('00000000-0000-4000-8000-0000000000b1', -6, 128, 82),
  ('00000000-0000-4000-8000-0000000000b2', -4, 124, 79),
  ('00000000-0000-4000-8000-0000000000b3', -2, 131, 84)
) AS v(id, day_offset, systolic, diastolic)
JOIN users u ON u.id = '00000000-0000-4000-8000-000000000001'
ON CONFLICT (id) DO UPDATE SET systolic = EXCLUDED.systolic, diastolic = EXCLUDED.diastolic,
  note = EXCLUDED.note, recorded_at = EXCLUDED.recorded_at;

COMMIT;
