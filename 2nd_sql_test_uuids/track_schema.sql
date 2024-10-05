-- TRACK TABLES (During Workout Sessions)
CREATE TABLE track_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  setup_id UUID REFERENCES setup_routines(id), -- Reference to original setup
  in_progress BOOLEAN DEFAULT TRUE,
  completion_date DATE
);

CREATE UNIQUE INDEX unique_track_routine_name ON track_routines (LOWER(name));

CREATE TABLE track_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  track_routine_id UUID NOT NULL REFERENCES track_routines(id) ON DELETE CASCADE,
  setup_id UUID REFERENCES setup_schedules(id) -- Reference to original setup
);

CREATE TABLE track_workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_schedule_id UUID NOT NULL REFERENCES track_schedules(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  setup_id UUID REFERENCES setup_workout_sessions(id) -- Reference to original setup
);

CREATE UNIQUE INDEX unique_track_workout_session_name ON track_workout_sessions (LOWER(name));

CREATE TABLE track_session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
  track_workout_session_id UUID NOT NULL REFERENCES track_workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
  exercise_comment TEXT,
  setup_id UUID REFERENCES setup_session_exercises(id), -- Reference to original setup

  CONSTRAINT unique_track_workout_session_id_and_exercise_order UNIQUE (track_workout_session_id, exercise_order)
);

CREATE TABLE track_exercise_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_session_exercise_id UUID NOT NULL REFERENCES track_session_exercises(id) ON DELETE CASCADE,
  weight NUMERIC(6, 2),
  cur_set INTEGER NOT NULL CHECK(cur_set > 0),
  reps_goal INTEGER CHECK(reps_goal >= 0),
  reps_done INTEGER CHECK(reps_done >= 0),
  myo_order INTEGER CHECK (myo_order > 0),
  setup_id UUID REFERENCES setup_exercise_details(id), -- Reference to original setup

  CONSTRAINT track_session_exe_id_and_cur_set_and_myo_order UNIQUE(track_session_exercise_id, cur_set, myo_order)
);


SELECT 'TRACK tables DONE';