-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
CREATE UNIQUE INDEX unique_exercise_name ON exercises (LOWER(name));

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- SETUP TABLES (Initial Routine Setup)
CREATE TABLE setup_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  routine_created BOOLEAN DEFAULT FALSE,
  routine_edit_in_progress BOOLEAN DEFAULT FALSE,
  user_cur_routine BOOLEAN DEFAULT FALSE -- Indicates if this is the current routine for the user
);

CREATE UNIQUE INDEX unique_user_setup_routine_name ON setup_routines (user_id, LOWER(name));

CREATE TABLE setup_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  setup_routine_id UUID NOT NULL REFERENCES setup_routines (id) ON DELETE CASCADE,
  CONSTRAINT unique_setup_day_routine UNIQUE (day_number, setup_routine_id)
);

CREATE TABLE setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_routine_id UUID NOT NULL REFERENCES setup_routines (id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
-- name cannot be unique, b/c there will be lots of users setting the same session name
-- instead of some sort of combo (name, id)?


-- name cannot be unique globally, but it can be unique within a routine (setup_routine_id, name)
CREATE UNIQUE INDEX unique_setup_session_name ON setup_sessions (setup_routine_id, LOWER(name));

-- Define setup_days_sessions as a junction table between setup_days and setup_sessions
CREATE TABLE setup_days_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id uuid NOT NULL REFERENCES setup_days (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES setup_sessions (id) ON DELETE CASCADE,
  session_order INTEGER NOT NULL CHECK (session_order > 0),
  CONSTRAINT unique_setup_day_session_order UNIQUE (day_id, session_order)
);



CREATE TABLE setup_session_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
  setup_session_id UUID NOT NULL REFERENCES setup_sessions (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_order INTEGER NOT NULL CHECK (exercise_order > 0),
  exercise_comment TEXT,

  CONSTRAINT unique_setup_session_id_and_exercise_order UNIQUE (setup_session_id, exercise_order)
);

CREATE TABLE setup_exercise_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_session_exercise_id UUID NOT NULL REFERENCES setup_session_exercises (id) ON DELETE CASCADE,
  weight NUMERIC(6, 2),
  cur_set INTEGER NOT NULL CHECK(cur_set > 0),
  reps_goal INTEGER CHECK(reps_goal >= 0),
  myo_order INTEGER CHECK (myo_order > 0),

  CONSTRAINT unique_setup_session_exe_id_and_cur_set_and_myo_order UNIQUE(setup_session_exercise_id, cur_set, myo_order)
);


SELECT 'SETUP tables DONE';



