-- -- Create user
-- INSERT INTO users (username, password)
-- VALUES
-- ('admin', 'secret');

-- Create exercises
INSERT INTO exercises (name)
VALUES
('Push-ups'),
('Bench press'),
('Single Arm Curls(L)'),
('Single Arm Curls(R)'),
('Squat');

-- Insert data into setup_routines
INSERT INTO setup_routines (name, user_id, routine_created)
VALUES ('Push-Pull-Legs', 1, TRUE),
       ('Starting Strength', 1, DEFAULT);


-- Retrieve id of routine with specific user_id
--  (should only retrun 1 row) 
CREATE TEMP TABLE routine_id AS
SELECT id 
FROM setup_routines 
WHERE name = 'Push-Pull-Legs' AND user_id = 1;


-- Establish the amount of days there is to the specific user's routine
-- In this case, 7 days for the Push-Pull-Legs routine
INSERT INTO setup_schedules (day_number, setup_routine_id)
VALUES (1, (SELECT id FROM routine_id)),
       (2, (SELECT id FROM routine_id)),
       (3, (SELECT id FROM routine_id)),
       (4, (SELECT id FROM routine_id)),
       (5, (SELECT id FROM routine_id)),
       (6, (SELECT id FROM routine_id)),
       (7, (SELECT id FROM routine_id));


-- Retrieve day_number and its assocated id 
CREATE TEMP TABLE schedule_ids AS
SELECT id, day_number
FROM setup_schedules ss
WHERE ss.setup_routine_id = (SELECT id FROM routine_id)
ORDER BY day_number ASC;


-- Now I have an list of schedule_id, I want to
-- Insert data into setup_workout_sessions for each day in the schedule
INSERT INTO setup_workout_sessions (setup_schedule_id, name)
SELECT id, 'Push' FROM schedule_ids WHERE day_number = 1
UNION ALL
SELECT id, 'Rest1' FROM schedule_ids WHERE day_number = 2
UNION ALL
SELECT id, 'Pull' FROM schedule_ids WHERE day_number = 3
UNION ALL
SELECT id, 'Rest2' FROM schedule_ids WHERE day_number = 4
UNION ALL
SELECT id, 'Legs' FROM schedule_ids WHERE day_number = 5
UNION ALL
SELECT id, 'Rest3' FROM schedule_ids WHERE day_number = 6
UNION ALL
SELECT id, 'Rest4' FROM schedule_ids WHERE day_number = 7;

-- retrieve ids from setup_workout_sessions
-- where the schedule_ids are associated with
-- specific routine_id
-- NOTE: schedule_ids from TEMP table that is derived
-- from push-pull-legs routine
CREATE TEMP TABLE workout_session_ids AS
SELECT id, name
FROM setup_workout_sessions sws
WHERE sws.setup_schedule_id IN (SELECT id FROM schedule_ids);


CREATE TEMP TABLE session_exercises_ids (
    id UUID,
    exercise_id integer
);


-- Insert data into setup_session_exercises
-- then utilize CTE to help put setup_session_exrcises into
-- session_exercises_ids
WITH inserted_ids AS (
  INSERT INTO setup_session_exercises (setup_workout_session_id, exercise_id, exercise_order)
  SELECT id, 1, 1 FROM workout_session_ids WHERE name = 'Push'
  UNION ALL
  SELECT id, 2, 2 FROM workout_session_ids WHERE name = 'Push'
  UNION ALL
  SELECT id, 3, 1 FROM workout_session_ids WHERE name = 'Pull'
  UNION ALL
  SELECT id, 4, 2 FROM workout_session_ids WHERE name = 'Pull'
  RETURNING id, exercise_id
)
INSERT INTO session_exercises_ids (id, exercise_id)
SELECT id, exercise_id FROM inserted_ids;


-- Insert data into setup_exercise_details for specific workout session
INSERT INTO setup_exercise_details (setup_session_exercise_id, cur_set)
SELECT id, 1 FROM session_exercises_ids WHERE exercise_id = 1
UNION ALL
SELECT id, 2 FROM session_exercises_ids WHERE exercise_id = 1
UNION ALL
SELECT id, 1 FROM session_exercises_ids WHERE exercise_id = 3
UNION ALL
SELECT id, 2 FROM session_exercises_ids WHERE exercise_id = 3
UNION ALL
SELECT id, 1 FROM session_exercises_ids WHERE exercise_id = 2
UNION ALL
SELECT id, 2 FROM session_exercises_ids WHERE exercise_id = 2;


SELECT 'INSERT seed DONE';