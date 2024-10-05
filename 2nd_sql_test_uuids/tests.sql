
SELECT "BEFORE adding Over Head Press";

--  query to check setup series
SELECT
  u.username AS user,
  sr.name AS routine_name,
  ss.day_number,
  sws.name AS session_name,
  e.name,
  sse.exercise_order,
  sed.cur_set
FROM users u
INNER JOIN setup_routines sr ON u.id = sr.user_id
INNER JOIN setup_schedules ss ON sr.id = ss.setup_routine_id
INNER JOIN setup_workout_sessions sws ON  ss.id = sws.setup_schedule_id
INNER JOIN setup_session_exercises sse ON sws.id = sse.setup_workout_session_id
INNER JOIN exercises e ON e.id = sse.exercise_id
INNER JOIN setup_exercise_details sed ON sse.id = sed.setup_session_exercise_id
ORDER BY day_number, exercise_order, cur_set;



--  query to check track series
SELECT
  u.username AS user,
  tr.name AS routine_name,
  ts.day_number,
  tws.name AS session_name,
  e.name,
  tse.exercise_order,
  ted.cur_set
FROM users u
INNER JOIN track_routines tr ON u.id = tr.user_id
INNER JOIN track_schedules ts ON tr.id = ts.track_routine_id
INNER JOIN track_workout_sessions tws ON  ts.id = tws.track_schedule_id
INNER JOIN track_session_exercises tse ON tws.id = tse.track_workout_session_id
INNER JOIN exercises e ON e.id = tse.exercise_id
INNER JOIN track_exercise_details ted ON tse.id = ted.track_session_exercise_id
ORDER BY day_number, exercise_order, cur_set;


SELECT 'Adding 1 sets of Over Head Press during workout session';


-- Check if 'Overhead Press' already exists
SELECT id FROM exercises WHERE LOWER(name) = 'overhead press';

-- Insert 'Overhead Press' into exercises if it doesn't exist
INSERT INTO exercises (name)
VALUES ('Overhead Press')
ON CONFLICT (LOWER(name)) DO NOTHING;

-- Retrieve the id of the new or existing exercise
SELECT id FROM exercises WHERE LOWER(name) = 'overhead press';

-- Find the Current Workout Session (Push):
-- Retrieve the current workout session for 'Push' day from track_workout_sessions
SELECT id
FROM track_workout_sessions
WHERE track_schedule_id = (SELECT ts.id 
                             FROM track_schedules ts
                             JOIN track_routines tr ON ts.track_routine_id = tr.id
                             WHERE tr.name = 'Push-Pull-Legs' 
                             AND tr.user_id = 1
                             AND ts.day_number = 1);  -- Assuming day 1 is 'Push'


-- Insert the New Exercise into the track_session_exercises Table:
-- Insert 'Overhead Press' into track_session_exercises for the current session
WITH session AS (
  SELECT id
  FROM track_workout_sessions
  WHERE track_schedule_id = (SELECT ts.id 
                               FROM track_schedules ts
                               JOIN track_routines tr ON ts.track_routine_id = tr.id
                               WHERE tr.name = 'Push-Pull-Legs' 
                               AND tr.user_id = 1
                               AND ts.day_number = 1)  -- Assuming day 1 is 'Push'
)
INSERT INTO track_session_exercises (id, track_workout_session_id, exercise_id, exercise_order, exercise_comment)
VALUES (uuid_generate_v4(), (SELECT id FROM session), (SELECT id FROM exercises WHERE LOWER(name) = 'overhead press'), 3, 'Added dynamically');


-- Add the Set for "Overhead Press" in the track_exercise_details Table:
-- Add 1 set for 'Overhead Press' in the track_exercise_details table
WITH session_exercise AS (
  SELECT id
  FROM track_session_exercises
  WHERE track_workout_session_id = (SELECT id FROM track_workout_sessions
                                      WHERE track_schedule_id = (SELECT ts.id 
                                                                    FROM track_schedules ts
                                                                    JOIN track_routines tr 
                                                                    ON ts.track_routine_id = tr.id
                                                                    WHERE tr.name = 'Push-Pull-Legs' 
                                                                    AND tr.user_id = 1
                                                                    AND ts.day_number = 1)  -- Assuming day 1 is 'Push'
                                     )
  AND exercise_id = (SELECT id FROM exercises WHERE LOWER(name) = 'overhead press')
)
INSERT INTO track_exercise_details (id, track_session_exercise_id, cur_set, reps_goal)
VALUES (uuid_generate_v4(), (SELECT id FROM session_exercise), 1, 10);


SELECT 'NOW CHECK for changes';

SELECT 'setup series';
--  query to check setup series
SELECT
  u.username AS user,
  sr.name AS routine_name,
  ss.day_number,
  sws.name AS session_name,
  e.name,
  sse.exercise_order,
  sed.cur_set
FROM users u
INNER JOIN setup_routines sr ON u.id = sr.user_id
INNER JOIN setup_schedules ss ON sr.id = ss.setup_routine_id
INNER JOIN setup_workout_sessions sws ON  ss.id = sws.setup_schedule_id
INNER JOIN setup_session_exercises sse ON sws.id = sse.setup_workout_session_id
INNER JOIN exercises e ON e.id = sse.exercise_id
INNER JOIN setup_exercise_details sed ON sse.id = sed.setup_session_exercise_id
ORDER BY day_number, exercise_order, cur_set;


SELECT 'track series';
--  query to check track series
SELECT
  u.username AS user,
  tr.name AS routine_name,
  ts.day_number,
  tws.name AS session_name,
  e.name,
  tse.exercise_order,
  ted.cur_set
FROM users u
INNER JOIN track_routines tr ON u.id = tr.user_id
INNER JOIN track_schedules ts ON tr.id = ts.track_routine_id
INNER JOIN track_workout_sessions tws ON  ts.id = tws.track_schedule_id
INNER JOIN track_session_exercises tse ON tws.id = tse.track_workout_session_id
INNER JOIN exercises e ON e.id = tse.exercise_id
INNER JOIN track_exercise_details ted ON tse.id = ted.track_session_exercise_id
ORDER BY day_number, exercise_order, cur_set;
