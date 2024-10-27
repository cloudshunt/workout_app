-- new query for setup series
SELECT
  u.username AS user,
  sr.name AS routine_name,
  sd.day_number,
  ss.name AS session_name,
  e.name AS exercise_name,
  sse.exercise_order,
  sed.cur_set
FROM users u
INNER JOIN setup_routines sr ON u.id = sr.user_id
INNER JOIN setup_days sd ON sr.id = sd.setup_routine_id
INNER JOIN setup_days_sessions sds ON sd.id = sds.day_id
INNER JOIN setup_sessions ss ON sds.session_id = ss.id
INNER JOIN setup_session_exercises sse ON ss.id = sse.setup_session_id
INNER JOIN exercises e ON e.id = sse.exercise_id
INNER JOIN setup_exercise_details sed ON sse.id = sed.setup_session_exercise_id
ORDER BY sd.day_number, sse.exercise_order, sed.cur_set;


-- --  query to check track series
-- SELECT
--   u.username AS user,
--   cr.name AS routine_name,
--   cs.day_number,
--   cws.name AS session_name,
--   e.name,
--   cse.exercise_order,
--   ced.cur_set
-- FROM users u
-- INNER JOIN track_routines cr ON u.id = cr.user_id
-- INNER JOIN track_schedules cs ON cr.id = cs.track_routine_id
-- INNER JOIN track_workout_sessions cws ON  cs.id = cws.track_schedule_id
-- INNER JOIN track_session_exercises cse ON cws.id = cse.track_workout_session_id
-- INNER JOIN exercises e ON e.id = cse.exercise_id
-- INNER JOIN track_exercise_details ced ON cse.id = ced.track_session_exercise_id
-- ORDER BY day_number, exercise_order, cur_set;