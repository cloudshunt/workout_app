-- This copy over is meant for one specific routine for a specific user

-- Step 1: Copy from setup_routines to created_routines (for specific user and routine)
WITH routines AS (
  INSERT INTO created_routines (id, name, user_id, setup_id)
  SELECT uuid_generate_v4(), name, user_id, id
  FROM setup_routines
  WHERE user_id = 1 AND name = 'Push-Pull-Legs'
  RETURNING id, setup_id
),


-- Step 2: Copy from setup_schedules to created_schedules
schedules AS (
  INSERT INTO created_schedules (id, day_number, created_routine_id, setup_id)
  SELECT uuid_generate_v4(), day_number, routines.id, setup_schedules.id
  FROM setup_schedules
  JOIN routines ON setup_schedules.setup_routine_id = routines.setup_id
  RETURNING id, setup_id
),


-- Step 3: Copy from setup_workout_sessions to created_workout_sessions
workout_sessions AS (
  INSERT INTO created_workout_sessions (id, created_schedule_id, name, setup_id)
  SELECT uuid_generate_v4(), schedules.id, setup_workout_sessions.name, setup_workout_sessions.id
  FROM setup_workout_sessions
  JOIN schedules ON setup_workout_sessions.setup_schedule_id = schedules.setup_id
  RETURNING id, setup_id
),


-- Step 4: Copy from setup_session_exercises to created_session_exercises
session_exercises AS (
  INSERT INTO created_session_exercises (id, created_workout_session_id, exercise_id, exercise_order, exercise_comment, setup_id)
  SELECT uuid_generate_v4(), workout_sessions.id, setup_session_exercises.exercise_id, setup_session_exercises.exercise_order, setup_session_exercises.exercise_comment, setup_session_exercises.id
  FROM setup_session_exercises
  JOIN workout_sessions ON setup_session_exercises.setup_workout_session_id = workout_sessions.setup_id
  RETURNING id, setup_id
)



-- Step 5: Copy from setup_exercise_details to created_exercise_details
INSERT INTO created_exercise_details (id, created_session_exercise_id, weight, cur_set, reps_goal, reps_done, myo_order, cur_set_comment, setup_id)
SELECT uuid_generate_v4(), session_exercises.id, setup_exercise_details.weight, setup_exercise_details.cur_set, setup_exercise_details.reps, setup_exercise_details.reps, setup_exercise_details.myo_order, setup_exercise_details.cur_set_comment, setup_exercise_details.id
FROM setup_exercise_details
JOIN session_exercises ON setup_exercise_details.setup_session_exercise_id = session_exercises.setup_id;

