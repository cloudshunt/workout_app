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
VALUES ('Push-Pull-Legs', 1, TRUE);

-- Retrieve id of routine with specific user_id (should only return 1 row)
CREATE TEMP TABLE routine_id AS
SELECT id 
FROM setup_routines 
WHERE name = 'Push-Pull-Legs' AND user_id = 1;

-- Establish the amount of days for the specific user's routine
-- In this case, 7 days for the Push-Pull-Legs routine
INSERT INTO setup_days (day_number, setup_routine_id)
VALUES (1, (SELECT id FROM routine_id)),
       (2, (SELECT id FROM routine_id)),
       (3, (SELECT id FROM routine_id)),
       (4, (SELECT id FROM routine_id)),
       (5, (SELECT id FROM routine_id)),
       (6, (SELECT id FROM routine_id)),
       (7, (SELECT id FROM routine_id));

-- Retrieve day_number and associated id from setup_days
CREATE TEMP TABLE day_ids AS
SELECT id, day_number
FROM setup_days
WHERE setup_routine_id = (SELECT id FROM routine_id)
ORDER BY day_number ASC;

-- Insert workout sessions into setup_sessions (sessions are tied to routines)
-- We will assign workout names like Push, Pull, etc.
INSERT INTO setup_sessions (setup_routine_id, name)
VALUES
((SELECT id FROM routine_id), 'Push'),
((SELECT id FROM routine_id), 'Rest1'),
((SELECT id FROM routine_id), 'Pull'),
((SELECT id FROM routine_id), 'Rest2'),
((SELECT id FROM routine_id), 'Legs'),
((SELECT id FROM routine_id), 'Rest3'),
((SELECT id FROM routine_id), 'Rest4');

-- Insert data into setup_days_sessions to link days to workout sessions
INSERT INTO setup_days_sessions (day_id, session_id)
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Push') FROM day_ids WHERE day_number = 1
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Rest1') FROM day_ids WHERE day_number = 2
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Pull') FROM day_ids WHERE day_number = 3
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Rest2') FROM day_ids WHERE day_number = 4
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Legs') FROM day_ids WHERE day_number = 5
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Rest3') FROM day_ids WHERE day_number = 6
UNION ALL
SELECT day_ids.id, (SELECT id FROM setup_sessions WHERE name = 'Rest4') FROM day_ids WHERE day_number = 7;

-- Retrieve workout session IDs
CREATE TEMP TABLE workout_session_ids AS
SELECT session_id
FROM setup_days_sessions
WHERE day_id IN (SELECT id FROM day_ids);

-- Create a temporary table for session_exercises_ids
CREATE TEMP TABLE session_exercises_ids (
    id UUID,
    exercise_id INTEGER
);

-- Insert data into setup_session_exercises and store generated ids in session_exercises_ids
WITH inserted_ids AS (
  INSERT INTO setup_session_exercises (setup_session_id, exercise_id, exercise_order)
  SELECT session_id, 1, 1 FROM workout_session_ids WHERE session_id = (SELECT id FROM setup_sessions WHERE name = 'Push')
  UNION ALL
  SELECT session_id, 2, 2 FROM workout_session_ids WHERE session_id = (SELECT id FROM setup_sessions WHERE name = 'Push')
  UNION ALL
  SELECT session_id, 3, 1 FROM workout_session_ids WHERE session_id = (SELECT id FROM setup_sessions WHERE name = 'Pull')
  UNION ALL
  SELECT session_id, 4, 2 FROM workout_session_ids WHERE session_id = (SELECT id FROM setup_sessions WHERE name = 'Pull')
  RETURNING id, exercise_id
)
INSERT INTO session_exercises_ids (id, exercise_id)
SELECT id, exercise_id FROM inserted_ids;

-- Insert data into setup_exercise_details
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