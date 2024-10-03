
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



--  query to check created series
SELECT
  u.username AS user,
  cr.name AS routine_name,
  cs.day_number,
  cws.name AS session_name,
  e.name,
  cse.exercise_order,
  ced.cur_set
FROM users u
INNER JOIN created_routines cr ON u.id = cr.user_id
INNER JOIN created_schedules cs ON cr.id = cs.created_routine_id
INNER JOIN created_workout_sessions cws ON  cs.id = cws.created_schedule_id
INNER JOIN created_session_exercises cse ON cws.id = cse.created_workout_session_id
INNER JOIN exercises e ON e.id = cse.exercise_id
INNER JOIN created_exercise_details ced ON cse.id = ced.created_session_exercise_id
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
-- Retrieve the current workout session for 'Push' day from created_workout_sessions
SELECT id
FROM created_workout_sessions
WHERE created_schedule_id = (SELECT cs.id 
                             FROM created_schedules cs
                             JOIN created_routines cr ON cs.created_routine_id = cr.id
                             WHERE cr.name = 'Push-Pull-Legs' 
                             AND cr.user_id = 1
                             AND cs.day_number = 1);  -- Assuming day 1 is 'Push'


-- Insert the New Exercise into the created_session_exercises Table:
-- Insert 'Overhead Press' into created_session_exercises for the current session
WITH session AS (
  SELECT id
  FROM created_workout_sessions
  WHERE created_schedule_id = (SELECT cs.id 
                               FROM created_schedules cs
                               JOIN created_routines cr ON cs.created_routine_id = cr.id
                               WHERE cr.name = 'Push-Pull-Legs' 
                               AND cr.user_id = 1
                               AND cs.day_number = 1)  -- Assuming day 1 is 'Push'
)
INSERT INTO created_session_exercises (id, created_workout_session_id, exercise_id, exercise_order, exercise_comment)
VALUES (uuid_generate_v4(), (SELECT id FROM session), (SELECT id FROM exercises WHERE LOWER(name) = 'overhead press'), 3, 'Added dynamically');


-- Add the Set for "Overhead Press" in the created_exercise_details Table:
-- Add 1 set for 'Overhead Press' in the created_exercise_details table
WITH session_exercise AS (
  SELECT id
  FROM created_session_exercises
  WHERE created_workout_session_id = (SELECT id FROM created_workout_sessions
                                      WHERE created_schedule_id = (SELECT cs.id 
                                                                    FROM created_schedules cs
                                                                    JOIN created_routines cr 
                                                                    ON cs.created_routine_id = cr.id
                                                                    WHERE cr.name = 'Push-Pull-Legs' 
                                                                    AND cr.user_id = 1
                                                                    AND cs.day_number = 1)  -- Assuming day 1 is 'Push'
                                     )
  AND exercise_id = (SELECT id FROM exercises WHERE LOWER(name) = 'overhead press')
)
INSERT INTO created_exercise_details (id, created_session_exercise_id, cur_set, reps_goal)
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


SELECT 'created series';
--  query to check created series
SELECT
  u.username AS user,
  cr.name AS routine_name,
  cs.day_number,
  cws.name AS session_name,
  e.name,
  cse.exercise_order,
  ced.cur_set
FROM users u
INNER JOIN created_routines cr ON u.id = cr.user_id
INNER JOIN created_schedules cs ON cr.id = cs.created_routine_id
INNER JOIN created_workout_sessions cws ON  cs.id = cws.created_schedule_id
INNER JOIN created_session_exercises cse ON cws.id = cse.created_workout_session_id
INNER JOIN exercises e ON e.id = cse.exercise_id
INNER JOIN created_exercise_details ced ON cse.id = ced.created_session_exercise_id
ORDER BY day_number, exercise_order, cur_set;
