--  query to check setup series
SELECT
  u.preferred_name AS user,
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
  u.preferred_name AS user,
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