INSERT INTO routines (name)
VALUES 
('Push-Pull-Legs'),
('Upper/Lower Split'),
('Starting Strength'),
('Wendler''s 5/3/1');

INSERT INTO schedules (routine_id, day_number)
VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7);

INSERT INTO workout_sessions (schedule_id, name)
VALUES
(1, 'Push'),
(2, 'Rest1'),
(3, 'Pull'),
(4, 'Rest2'),
(5, 'Legs'),
(6, 'Rest3'),
(7, 'Rest4');

INSERT INTO exercises (name)
VALUES
('Push-ups'),
('Bench press'),
('Single Arm Curls(L)'),
('Single Arm Curls(R)'),
('Squat');

INSERT INTO session_exercises
(workout_session_id, exercise_id, exercise_order)
VALUES
(1, 1, 1),
(1, 2 ,2),
(3, 3, 1),
(3, 4, 2),
(5, 5, 1);

INSERT INTO exercise_details
(session_exercise_id, weight, cur_set)
VALUES
(1, 25, 1),
(1, 25, 2),
(2, 135, 1),
(2, 135, 2);