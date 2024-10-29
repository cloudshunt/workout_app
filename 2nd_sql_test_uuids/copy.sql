-- This copy over is meant for one specific routine for a specific user

-- Step 1: Copy from setup_routines to track_routines (for a specific user and routine)
WITH routines AS (
  INSERT INTO track_routines (id, name, user_id, setup_id)
  SELECT uuid_generate_v4(), name, user_id, id
  FROM setup_routines
  WHERE user_id = 1 AND name = 'Push-Pull-Legs'
  RETURNING id, setup_id
),

-- Step 2: Copy from setup_days to track_days
days AS (
  INSERT INTO track_days (id, day_number, track_routine_id, setup_id)
  SELECT uuid_generate_v4(), day_number, routines.id, setup_days.id
  FROM setup_days
  JOIN routines ON setup_days.setup_routine_id = routines.setup_id
  RETURNING id, setup_id
),

-- Step 3: Copy from setup_sessions to track_sessions
sessions AS (
  INSERT INTO track_sessions (id, track_routine_id, name, setup_id)
  SELECT uuid_generate_v4(), routines.id, setup_sessions.name, setup_sessions.id
  FROM setup_sessions
  JOIN routines ON setup_sessions.setup_routine_id = routines.setup_id
  RETURNING id, setup_id
),

-- Step 4: Copy from setup_days_sessions to track_days_sessions
days_sessions AS (
  INSERT INTO track_days_sessions (id, day_id, session_id)
  SELECT uuid_generate_v4(), days.id, sessions.id
  FROM setup_days_sessions
  JOIN days ON setup_days_sessions.day_id = days.setup_id
  JOIN sessions ON setup_days_sessions.session_id = sessions.setup_id
  RETURNING id
),

-- Step 5: Copy from setup_session_exercises to track_session_exercises
session_exercises AS (
  INSERT INTO track_session_exercises (id, track_session_id, exercise_id, exercise_order, exercise_comment, setup_id)
  SELECT uuid_generate_v4(), sessions.id, setup_session_exercises.exercise_id, setup_session_exercises.exercise_order, setup_session_exercises.exercise_comment, setup_session_exercises.id
  FROM setup_session_exercises
  JOIN sessions ON setup_session_exercises.setup_session_id = sessions.setup_id
  RETURNING id, setup_id
)

-- Step 6: Copy from setup_exercise_details to track_exercise_details
INSERT INTO track_exercise_details (id, track_session_exercise_id, weight, cur_set, reps_goal, myo_order, setup_id)
SELECT uuid_generate_v4(), session_exercises.id, setup_exercise_details.weight, setup_exercise_details.cur_set, setup_exercise_details.reps_goal, setup_exercise_details.myo_order, setup_exercise_details.id
FROM setup_exercise_details
JOIN session_exercises ON setup_exercise_details.setup_session_exercise_id = session_exercises.setup_id;
