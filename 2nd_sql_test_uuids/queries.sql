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


--  new query to check track series
SELECT
  u.username AS user,
  tr.name AS routine_name,
  td.day_number,
  ts.name AS session_name,
  e.name AS exercise_name,
  tse.exercise_order,
  ted.cur_set
FROM users u
INNER JOIN track_routines tr ON u.id = tr.user_id
INNER JOIN track_days td ON tr.id = td.track_routine_id
INNER JOIN track_days_sessions tds ON td.id = tds.day_id
INNER JOIN track_sessions ts ON tds.session_id = ts.id
INNER JOIN track_session_exercises tse ON ts.id = tse.track_session_id
INNER JOIN exercises e ON e.id = tse.exercise_id
INNER JOIN track_exercise_details ted ON tse.id = ted.track_session_exercise_id
ORDER BY td.day_number, tse.exercise_order, ted.cur_set;
