CREATE TABLE routines (
  id serial PRIMARY KEY,
  name text NOT NULL
);

-- Create a unique index on the lowercase version of the "name" column
CREATE UNIQUE INDEX unique_routine_name ON routines (LOWER(name));


CREATE TABLE schedules (
  id serial PRIMARY KEY,
  day_number integer NOT NULL CHECK (day_number > 0),
  routine_id integer
    NOT NULL
    REFERENCES routines (id)
    ON DELETE CASCADE,
  CONSTRAINT unique_day_routine UNIQUE (day_number, routine_id)
);

CREATE TABLE workout_sessions (
  id serial PRIMARY KEY,
  schedule_id integer
    NOT NULL
    REFERENCES schedules(id)
    ON DELETE CASCADE,
  name text NOT NULL
);

CREATE UNIQUE INDEX unique_workout_session_name ON workout_sessions (LOWER(name));


CREATE TABLE exercises (
  id serial PRIMARY KEY,
  name text UNIQUE
);

CREATE UNIQUE INDEX unique_exercise_name ON exercises (LOWER(name));


CREATE TABLE session_exercises (
  id serial PRIMARY KEY, 
  workout_session_id integer
    NOT NULL
    REFERENCES workout_sessions(id)
    ON DELETE CASCADE,
  exercise_id integer
    NOT NULL
    REFERENCES exercises(id)
    ON DELETE CASCADE,
  exercise_order integer NOT NULL CHECK (exercise_order > 0),
  exercise_comment text,

  CONSTRAINT unique_workout_session_id_and_exercise_order UNIQUE (workout_session_id, exercise_order)
);


CREATE TABLE exercise_details (
  id serial PRIMARY KEY,
  session_exercise_id integer
    NOT NULL
    REFERENCES session_exercises(id)
    ON DELETE CASCADE,
  weight NUMERIC(6, 2) NOT NULL,
  cur_set integer NOT NULL CHECK(cur_set > 0),
  reps integer CHECK(reps >= 0),
  myo_order integer CHECK (myo_order > 0),
  cur_set_comment text,

  CONSTRAINT unique_session_exe_id_and_cur_set_and_myo_order
  UNIQUE(session_exercise_id, cur_set, myo_order)
);
