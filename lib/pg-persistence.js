const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
    this.userId = session.userId;
  }

  // -----------------------------
  // User Authentication & Details
  // -----------------------------

  async authenticate(username, password) {
    const FIND_HASHED_PASSWORD = "SELECT password FROM users" +
                                 "  WHERE username = $1";

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return bcrypt.compare(password, result.rows[0].password);
  }

  async getUserId(username) {
    const FIND_USER_ID = `
      SELECT id FROM users
      WHERE username = $1
    `
    let result = await dbQuery(FIND_USER_ID, username);
    return result.rows[0].id;
  }

  async getUserCurrentRoutineName() {
    const FIND_ROUTINE_NAME = `
      SELECT sr.name 
      FROM users u
      INNER JOIN users_current_details ucd ON u.id = ucd.user_id
      INNER JOIN setup_routines sr ON ucd.current_routine_id = sr.id
      WHERE u.id = $1
    `;
  
    let result = await dbQuery(FIND_ROUTINE_NAME, this.userId);
    return result.rowCount > 0 ? result.rows[0].name : null;
  }

  async markCurrentRoutine(selectedRoutineName) {
    const routineId = await this.getSetupRoutineId(selectedRoutineName);
    const SET_USER_CUR_ROUTINE = `
      UPDATE users_current_details
      SET current_routine_id = $1
      WHERE user_id = $2
    `;

    await dbQuery(SET_USER_CUR_ROUTINE, routineId, this.userId);
  }

  async markInitialDaySession(selectedRoutineName) {
    const routineId = await this.getSetupRoutineId(selectedRoutineName);

    const SET_USER_INITIAL_DAY_SESSION = `
      UPDATE users_current_details
      SET current_session_number = 1,
          current_day_number = 1
      WHERE current_routine_id = $1
    `;

    await dbQuery(SET_USER_INITIAL_DAY_SESSION, routineId);
  }

  // ------------------
  // Routine Management
  // ------------------
  
  async createInitialSetupRoutine() {
    const ROUTINE_INITIAL_CREATION = `
        INSERT INTO setup_routines (user_id)
        VALUES ($1)
      `;

    await dbQuery(ROUTINE_INITIAL_CREATION,  this.userId);
  }

  // Possible future improvements 
  async getIncompleteRoutineId() {
    const FIND_INCOMPLETE_ROUTINE_ID = `
      SELECT id FROM setup_routines
      WHERE user_id = $1 AND routine_created = false
    `;
  
    let result =  await dbQuery(FIND_INCOMPLETE_ROUTINE_ID, this.userId);
    let rowCount = result.rowCount;
    // Note, if things aren't working correctly, then rowCount will > 1,
    // how do i address that scenario which i think will unlikely happen?
    if (rowCount === 1) return result.rows[0].id;
    if (rowCount === 0) return null;
  }

  async getInitialRoutineId() {
    const GET_ROUTINE_ID = `
          SELECT id FROM setup_routines
          WHERE user_id = $1 AND 
                name IS NULL
    `;

    let result = await dbQuery(GET_ROUTINE_ID, this.userId)
    return result.rows[0].id;
  }

  async getSetupRoutineId(routineName) {
    const GET_ROUTINE_ID = `
          SELECT id FROM setup_routines
          WHERE user_id = $1 AND 
                name = $2
    `;

    let result = await dbQuery(GET_ROUTINE_ID, this.userId, routineName);
    return result.rows[0].id;
  }

  async getRoutineName(routineId) {
    const GET_ROUTINE_NAME = `
      SELECT name FROM setup_routines
      WHERE user_id = $1 AND id = $2
    `
    let result = await dbQuery(GET_ROUTINE_NAME, this.userId, routineId);
    return result.rows[0].name;
  }

  async setRoutineName(userInputName, routineId) {
    const SET_ROUTINE_NAME = `
    UPDATE setup_routines
    SET name = $1
    WHERE user_id = $2 AND id = $3
  `;
    await dbQuery(SET_ROUTINE_NAME, userInputName, this.userId, routineId);  
  }

  async getCurDayNumSessionNum() {
    const QUERY = `
      SELECT ucd.current_day_number AS day_number,
            ucd.current_session_number AS session_number
      FROM users_current_details ucd
      WHERE user_id = $1   
    `;

    
    const result = await dbQuery(QUERY, this.userId);

    return [result.rows[0].day_number, result.rows[0].session_number];
  }

  async otherExistsRouteName(userInputName) {
    const FIND_ROUTINE_NAME = `
      SELECT 1 FROM setup_routines
        WHERE user_id = $1 
        AND name ILIKE $2
        AND routine_created = true 
    `;

    let result = await dbQuery(FIND_ROUTINE_NAME, this.userId, userInputName);

    return result.rowCount > 0;
  }

  async dropRoutine(routineId) {
    const DELETE_ROUTINE = `
      DELETE FROM setup_routines
      WHERE user_id = $1 AND id = $2
    `;

    await dbQuery(DELETE_ROUTINE, this.userId, routineId);
  }

  // Fetch the days and their associated sessions for the specified page
  async getDaysAndSessionsForPage(routineId, offset, limit) {
    const GET_DAYS_AND_SESSIONS_QUERY = `
      SELECT sd.day_number, ss.name AS session_name
      FROM setup_days sd
      LEFT JOIN setup_days_sessions sds ON sd.id = sds.day_id
      LEFT JOIN setup_sessions ss ON sds.session_id = ss.id
      WHERE sd.setup_routine_id = $1
      ORDER BY sd.day_number
      LIMIT $2 OFFSET $3;
    `;
    
    // The following organize objects in an way that helps with template display
    const result = await dbQuery(GET_DAYS_AND_SESSIONS_QUERY, routineId, limit, offset);
    const daySessionsMap = result.rows.reduce((acc, row) => {
      if (!acc[row.day_number]) {
        acc[row.day_number] = { dayNumber: row.day_number, sessionNames: [] };
      }
      acc[row.day_number].sessionNames.push(row.session_name);
      return acc;
    }, {});


    // the function returns something like the following:
    // [{dayNumber: 1, sessionName : ["full body 1", "neck"]}, 
    //  {dayNumber: 2, sessionName : ["Rest 1"]}]
    return Object.values(daySessionsMap);
  }

  // Count the total number of days in the routine
  async countDays(routineId) {
    const COUNT_DAYS_QUERY = `
      SELECT COUNT(*) AS total_days
      FROM setup_days
      WHERE setup_routine_id = $1;
    `;
    
    const result = await dbQuery(COUNT_DAYS_QUERY, routineId);
    return +(result.rows[0].total_days);
  }

  async addDay(routineId,existDaysAmt) {
    const ADD_A_DAY = `
      INSERT INTO setup_days (day_number,setup_routine_id)
      VALUES ($1,$2)
    `
    existDaysAmt += 1;

    await dbQuery(ADD_A_DAY, existDaysAmt, routineId);
  }

  async getSessionId(routineId, sessionName) {
    const SESSION_EXISTS = `
      -- get session id
      SELECT id
      FROM setup_sessions
      WHERE setup_routine_id = $1 And name = $2
    `;
  
    let result = await dbQuery(SESSION_EXISTS, routineId, sessionName);
    console.log(result);
    if (result.rowCount === 0) {
      return null;
    } else {
      return result.rows[0]["id"];
    }
  }

  async getSessionName(routineId, dayNum, sessionNum) {
    const QUERY = `
      SELECT ss.name
      FROM setup_days_sessions sds
      JOIN setup_days sd
        ON sds.day_id = sd.id
      JOIN setup_sessions ss
        ON sds.session_id = ss.id
      WHERE sd.setup_routine_id = $1
        AND sd.day_number = $2
        AND sds.session_order = $3   
    `;

    const result = await dbQuery(QUERY,routineId, dayNum, sessionNum);
    return result.rows[0].name;
  }

  async insertAndGetSessionId(routineId, sessionName) {
    const INSERT_NEW_SESSION_AND_RETURN_ID = `
      INSERT INTO setup_sessions (id, setup_routine_id, name)
      VALUES (uuid_generate_v4(), $1, $2)
      RETURNING id
    `;

    let result = await dbQuery(INSERT_NEW_SESSION_AND_RETURN_ID, routineId,sessionName);
    let sessionId = result.rows[0].id;
    return sessionId;
  }

  async getDayId(routineId, dayNum) {
    const GET_DAY_ID = `
      SELECT id
      FROM setup_days
      WHERE setup_routine_id = $1
        AND day_number = $2
    `;

    let result = await dbQuery(GET_DAY_ID, routineId, dayNum);
    let dayId = result.rows[0].id;
    return dayId;    
  }

  async junctionInsertionNewSessionWithDay(dayId, sessionId, sessionOrder) {
    const JUNCTION_INSERTION = `
      -- Insert the new association into setup_days_sessions
      INSERT INTO setup_days_sessions (id, day_id, session_id, session_order)
      VALUES (uuid_generate_v4(), $1, $2, $3);    
    `;

    await dbQuery(JUNCTION_INSERTION, dayId, sessionId, sessionOrder);
  }

  async getDaySessionJunctionId(dayId, sessionNum) {
    const GET_DAY_SESSION_ID = `
    SELECT id FROM setup_days_sessions
    WHERE day_id = $1 AND 
    session_order = $2
    `;

    let result =  await dbQuery(GET_DAY_SESSION_ID, dayId, sessionNum);

    let daySessionJunctionId = result.rows[0] ? result.rows[0]["id"] : null;
    return daySessionJunctionId
  }

  async createReturnDaySesJunctionId(dayId, sessionId) {
    // First, find the next session order
    const GET_MAX_SESSION_ORDER = `
      SELECT COALESCE(MAX(session_order), 0) + 1 AS next_order
      FROM setup_days_sessions
      WHERE day_id = $1;
    `;

    // Execute query to get the next session order for the specified day_id
    let maxOrderResult = await dbQuery(GET_MAX_SESSION_ORDER, dayId);
    let sessionOrder = maxOrderResult.rows[0]["next_order"];

    // Insert into setup_days_sessions with the calculated session_order
    const CREATE_NEW_JUNCTION_ROW = `
      INSERT INTO setup_days_sessions (day_id, session_id, session_order)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;

    let result = await dbQuery(CREATE_NEW_JUNCTION_ROW, dayId, sessionId, sessionOrder);
    let id = result.rows[0]["id"];

    return id;
  }

  async updateDaysSessionName(routineId, dayNum, sessionNum, sessionName) {
    // NOTE: if its an update to existing relationship, make changes to the junction table

    // (get setup_day_id for given routine's specific day number)
    let dayId = await this.getDayId(routineId, dayNum);
    let sessionId = await this.getSessionId(routineId, sessionName); 

    // (it's a junction table for setup_days & setup_sessions M:M relationship)
    let daySessionJunctionId =  await this.getDaySessionJunctionId(dayId, sessionNum);

    // See if a relationship already exist or not between a day and a session
    // for given dayId and sessionId,
    if (!daySessionJunctionId) {
       // IF doesn't exist create a new junction row
       await this.createReturnDaySesJunctionId(dayId, sessionId);
    } else {
       //IF junction row exist already, just update it.
       await this.assignDayOtherSession(daySessionJunctionId, sessionId);
    }
  }

  async assignDayOtherSession(daySessionJunctionId, sessionId) {
    const UPDATE_SESSION_NAME = `
      UPDATE setup_days_sessions
      SET session_id = $1
      WHERE id = $2
    `;

    await dbQuery(UPDATE_SESSION_NAME, sessionId, daySessionJunctionId);
  }

  // Future update: will need to adjust that if one of the query fails then it rolls back
  // 2 options: 
  // 1st: Adjust so that I can use CTE,  (my current thing cannot be cte, b/c of constraints i have 
  //    and CTE won't let go of the constraint until transaction is finished)
  // 2nd: Database transaction support
  async deleteDayAndSessionShiftDays(routineId, dayNumber) {

    // Step 1: Delete the specified day from `setup_days`
    const DELETE_DAY_QUERY = `
      DELETE FROM setup_days
      WHERE setup_routine_id = $1 AND day_number = $2;
    `;
    await dbQuery(DELETE_DAY_QUERY, routineId, dayNumber);

    // Step 2: Shift subsequent days by decrementing their day_number by 1
    const SHIFT_DAYS_QUERY = `
      UPDATE setup_days
      SET day_number = day_number - 1
      WHERE setup_routine_id = $1 AND day_number > $2;
    `;
    await dbQuery(SHIFT_DAYS_QUERY, routineId, dayNumber);
  }

  async existSessionName(routineId, sessionName) {
    // Future optimization, utilize dynamic query to do 1 db call
    // to add filter conditions instead of 1 by 1 checking
    // which conducts multiple db calls 
    const FIND_SESSION_NAME = `
      SELECT 1 FROM setup_sessions
      WHERE setup_routine_id = $1 AND name = $2
    `
    let result = await dbQuery(FIND_SESSION_NAME, routineId, sessionName);
    return result.rowCount > 0;
  }
  
  async getSessionsForRoutine(routineId) {
    const GET_SESSIONS_QUERY = `
      SELECT name, id
      FROM setup_sessions
      WHERE setup_routine_id = $1
      ORDER BY name ASC;
    `;
  
    const result = await dbQuery(GET_SESSIONS_QUERY, routineId);
    return result.rows;
  }

  async deleteSession(routineId, sessionName) {
    const DELETE_SESSION = `
      DELETE FROM setup_sessions
      WHERE setup_routine_id = $1 AND name = $2;
    `;
  
    await dbQuery(DELETE_SESSION, routineId, sessionName);
  }
  

  async updateSessionName(routineId, oldSessionName, newSessionName) {
    const UPDATE_SESSION_NAME = `
      UPDATE setup_sessions
      SET name = $1
      WHERE setup_routine_id = $2 AND name = $3
    `;
  
    await dbQuery(UPDATE_SESSION_NAME, newSessionName, routineId, oldSessionName);
  }
    

  async addSession(routineId, sessionName) {
    const ADD_SESSION_QUERY = `
      INSERT INTO setup_sessions (id, setup_routine_id, name)
      VALUES (uuid_generate_v4(), $1, $2)
    `;
  
    await dbQuery(ADD_SESSION_QUERY, routineId, sessionName);
  }

  async existSessionName(routineId, sessionName) {
    const CHECK_SESSION_NAME_QUERY = `
      SELECT 1
      FROM setup_sessions
      WHERE setup_routine_id = $1 AND LOWER(name) = LOWER($2)
    `;

    const result = await dbQuery(CHECK_SESSION_NAME_QUERY, routineId, sessionName);
    
    return result.rowCount > 0;
  }

  // -----------------------------
  // CustomExercises related
  // -----------------------------

  async existCustomExercise(exerciseName) {
    const EXIST_EXERCISE_CHECK = `
      SELECT 1 FROM custom_exercises
      WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `;
  
    let result = await dbQuery(EXIST_EXERCISE_CHECK, this.userId, exerciseName);
    return result.rowCount > 0;
  }
  

  async createNewCustomExercise(exerciseName) {
    const CREATE_CUSTOM_EXE = `
      INSERT INTO custom_exercises (user_id, name)
      VALUES 
      ($1,$2)
    `;
    await dbQuery(CREATE_CUSTOM_EXE, this.userId, exerciseName);
  }

  async getUserCustomExercises() {
    const QUERY = `
      SELECT name FROM custom_exercises
      WHERE user_id = $1
      ORDER BY name ASC
    `;

    let result = await dbQuery(QUERY, this.userId);
    return result.rows;
  }

  async getCustomExerciseId(exerciseName) {
    const GET_CUSTOM_EXERCISE_ID_QUERY = `
      SELECT id FROM custom_exercises
      WHERE name = $1 AND user_id = $2
    `;

    const result = await dbQuery(GET_CUSTOM_EXERCISE_ID_QUERY, exerciseName, this.userId);
    if (result.rowCount === 0) {
      return null
    } else {
      return result.rows[0].id;
    }
  }

  // ------------------
  // Routine Management
  // ------------------

  async addExerciseToSession(routineId, sessionName, exerciseName) {
    // Step 1: Get the session ID based on sessionName
    const sessionId = await this.getSessionId(routineId, sessionName);
  
    // Step 2: Get the custom exercise ID based on exerciseName
    const customExerciseId = await this.getCustomExerciseId(exerciseName);
  
    // Step 3: Determine the next exercise order for the session
    const GET_MAX_ORDER_QUERY = `
      SELECT COALESCE(MAX(exercise_order), 0) + 1 AS next_order
      FROM setup_session_exercises
      WHERE setup_session_id = $1
    `;
    const orderResult = await dbQuery(GET_MAX_ORDER_QUERY, sessionId);
    const exerciseOrder = orderResult.rows[0].next_order;
  
    // Step 4: Insert the new exercise into setup_session_exercises
    const INSERT_EXERCISE_QUERY = `
      INSERT INTO setup_session_exercises (setup_session_id, custom_exercise_id, exercise_order)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await dbQuery(INSERT_EXERCISE_QUERY, sessionId, customExerciseId, exerciseOrder);

    return result.rows[0].id;
  }


  async getSetupSessionExercisesAndDetails(routineId, sessionName) {
    // NOTE the final return value will be some something like:
    /*
      [
        { name: 'bench press', order_number: 1, set: 1, reps: 1 },
        { name: 'bench press', order_number: 1, set: 2, reps: 2 },
        { name: 'bench press', order_number: 1, set: 3, reps: 3 },
        { name: 'bench press', order_number: 1, set: 4, reps: 4 },
        { name: 'push ups', order_number: 2, set: 1, reps: 10 },
        { name: 'push ups', order_number: 2, set: 2, reps: 15 },
        { name: 'pull downs', order_number: 3, set: 1, reps: null }
      ]    
    */
    // the above return value will require some template logic to display correctly  
    
    const sessionId = await this.getSessionId(routineId, sessionName);
    
    const GET_EXERCISES = `
      SELECT ce.name, sse.exercise_order AS order_number, sed.cur_set AS set, sed.reps_goal AS reps
      FROM setup_session_exercises sse
          INNER JOIN custom_exercises ce
          ON sse.custom_exercise_id = ce.id
          INNER JOIN setup_exercise_details sed
          ON sse.id = sed.setup_session_exercise_id
      WHERE
          sse.setup_session_id = $1
      ORDER BY exercise_order ASC, cur_set ASC
    `;

    let result = await dbQuery(GET_EXERCISES, sessionId);
    return result.rows;
  }
  
  async createFirstSetExerciseDetails(sessionExerciseId) {
    const QUERY = `
      INSERT INTO setup_exercise_details 
        (setup_session_exercise_id, cur_set)
      VALUES
      ($1, 1)
    `

    await dbQuery(QUERY, sessionExerciseId);
  }

  async intermediateExeOrderUpdate(routineId, sessionName, oldOrder, newOrder) {
    const sessionId = await this.getSessionId(routineId, sessionName);

    const UPDATE_BYPASS_UNIQUE_CONSTRAINT = `
      -- Intermediate Exercise Order Update:
      UPDATE setup_session_exercises
      SET exercise_order = $1 + 1000
      WHERE exercise_order = $2 AND setup_session_id = $3
    `

    await dbQuery(UPDATE_BYPASS_UNIQUE_CONSTRAINT, newOrder, oldOrder, sessionId);
  }

  async updateExerciseOrder(routineId, sessionName) {
    const sessionId = await this.getSessionId(routineId, sessionName);

    const UPDATE_TO_NEW_ORDER = `
      -- Finalized Exercise Order Update:
      UPDATE setup_session_exercises
      SET exercise_order = exercise_order - 1000
      WHERE setup_session_id = $1   
    `
    
    await dbQuery(UPDATE_TO_NEW_ORDER, sessionId);
  }
  
  async getSessionExerciseId(routineId,sessionName, exerciseOrder) {
    const sessionId = await this.getSessionId(routineId, sessionName);

    const QUERY = `
      --getSessionExerciseId
      SELECT sse.id
      FROM setup_session_exercises sse
      INNER JOIN custom_exercises ce
        ON sse.custom_exercise_id = ce.id
      WHERE sse.setup_session_id = $1 AND sse.exercise_order = $2
    `;

    let result = await dbQuery(QUERY, sessionId, exerciseOrder);
    return result.rows[0].id;

  }

  async getExerciseDetails(sessionExerciseId) {
    const QUERY = `
      -- getExerciseDetails
      SELECT cur_set AS set, reps_goal AS reps
      FROM setup_exercise_details sed
      WHERE setup_session_exercise_id = $1
      ORDER BY sed.cur_set
    `;

    let result = await dbQuery(QUERY, sessionExerciseId);
    return result.rows;
  }

  async addSet(sessionExerciseId) {
    const QUERY = `
      INSERT INTO setup_exercise_details
      (setup_session_exercise_id, cur_set)
      VALUES
      (
        $1,
        (SELECT COALESCE(MAX(cur_set), 0) + 1 
        FROM setup_exercise_details WHERE setup_session_exercise_id = $1)
      )
    `;
    await dbQuery(QUERY, sessionExerciseId);
  }
  
  async updateReps(sessionExerciseId, set, reps) {
    const QUERY = `
      UPDATE setup_exercise_details
      SET reps_goal = $1
      WHERE setup_session_exercise_id = $2 AND cur_set = $3
    `

    await dbQuery(QUERY, reps, sessionExerciseId, set);
  }

  async deleteSessionExerciseShiftOrder(routineId, sessionName, orderNumber) {
    const sessionId = await this.getSessionId(routineId, sessionName);
    // Step 1: Delete the specified day from `setup_days`
    const DELETE_SESSION_EXERCISE_QUERY = `
      DELETE FROM setup_session_exercises
      WHERE setup_session_id = $1 AND exercise_order = $2;
    `;
    await dbQuery(DELETE_SESSION_EXERCISE_QUERY, sessionId, orderNumber);

    // Step 2: Shift subsequent days by decrementing their day_number by 1
    const SHIFT_ORDERS_QUERY = `
      UPDATE setup_session_exercises
      SET exercise_order = exercise_order - 1
      WHERE setup_session_id = $1 AND exercise_order > $2;
    `;
    await dbQuery(SHIFT_ORDERS_QUERY, sessionId, orderNumber);    
  }


  async getDaysSessionsDetails(routineId) {
    const GET_DAYS_AND_SESSIONS_QUERY = `
      SELECT sd.day_number, ss.name AS session_name, ce.name AS exercise_name
      FROM setup_days sd
      LEFT JOIN setup_days_sessions sds ON sd.id = sds.day_id
      LEFT JOIN setup_sessions ss ON sds.session_id = ss.id
      LEFT JOIN setup_session_exercises sse ON ss.id = sse.setup_session_id
      LEFT JOIN custom_exercises ce ON sse.custom_exercise_id = ce.id
      WHERE sd.setup_routine_id = $1
      ORDER BY sd.day_number, sds.session_order, sse.exercise_order
    `;
  
    const result = await dbQuery(GET_DAYS_AND_SESSIONS_QUERY, routineId);
  
    const daysDetailsSessionsMap = result.rows.reduce((acc, row) => {
      if (!acc[row.day_number]) {
        acc[row.day_number] = { dayNumber: row.day_number, sessions: [] };
      }
  
      const day = acc[row.day_number];
      let session = day.sessions.find(session => session.name === row.session_name);
      if (!session) {
        session = { name: row.session_name, exercises: [] };
        day.sessions.push(session);
      }
  
      if (row.exercise_name) {
        session.exercises.push({ name: row.exercise_name });
      }
  
      return acc;
    }, {});

    // let tempResult =  Object.values(daysDetailsSessionsMap)
    // console.log(JSON.stringify(tempResult, null, 2));

    // Convert the map to an array
    return Object.values(daysDetailsSessionsMap);
    /* return value should look like the following example (NOTE, my app is built for multiple sessions per day,
    but for simplicity purpose only deals with one session a day)
    const days = [
      {
        dayNumber: 1,
        sessions: [
          {
            name: "Upper Body",
            exercises: [
              { name: "Push ups" },
              { name: "Pull ups" },
            ],
          },
          {
            name: "Lower Body",
            exercises: [
              { name: "Squat" },
              { name: "Leg Press" },
            ],
          },
        ],
      },
      {
        dayNumber: 2,
        sessions: [
          {
            name: "Strength Training",
            exercises: [
              { name: "Deadlift" },
              { name: "Bench Press" },
            ],
          },
        ],
      },
    ];

    */
  }

  async markRoutineCreationStatusComplete(routineId) {
    const MARK_ROUTINE_CREATION_COMPLETE = `
      UPDATE setup_routines
      SET routine_created = True
      WHERE id = $1
    `;

    await dbQuery(MARK_ROUTINE_CREATION_COMPLETE, routineId);
  }

  async turnOffEditInProgress(routineId) {
    const SET_EDIT_IN_PROGERSS_FALSE = `
      UPDATE setup_routines
      SET routine_edit_in_progress = False
      WHERE id = $1
    `;

    await dbQuery(SET_EDIT_IN_PROGERSS_FALSE, routineId);   
  }

  async markRoutineEditInProgress(routineId) {
    const SET_EDIT_IN_PROGERSS_FALSE = `
      UPDATE setup_routines
      SET routine_edit_in_progress = True
      WHERE id = $1
    `;

    await dbQuery(SET_EDIT_IN_PROGERSS_FALSE, routineId);    
  }

  async getUserRoutines() {
    const GET_USER_ROUTINES = `
      SELECT name FROM setup_routines
      WHERE user_id = $1
    `;

    const result = await dbQuery(GET_USER_ROUTINES, this.userId);
    return result.rows
  }

  async existRoutineName(routineName) {
    const ROUTINE_NAME_CHECK = `
      SELECT 1 FROM setup_routines
      WHERE user_id = $1 
        AND name = $2
    `;

    const result = await dbQuery(ROUTINE_NAME_CHECK, this.userId, routineName);

    return result.rowCount === 1 ? true: false;
  }
  
  // -----------------------------
  // Workout Tracking and history
  // -----------------------------

  // -----------------------------
  // Copy Values From setup Tables to track Tables
  // -----------------------------

  async copyFromSetupToTrack(routineName, dayNum, routineId, sessionName) {
    const QUERY = `
      -- Step 1: Copy from setup_routines to track_routines (for a specific user and routine)
      WITH routines AS (
        INSERT INTO track_routines (id, name, user_id, setup_id)
        SELECT uuid_generate_v4(), name, user_id, id
        FROM setup_routines
        WHERE user_id = $1 AND name = $2
        RETURNING id, setup_id
      ),
      
      -- Step 2: Copy from setup_days to track_days
      days AS (
        INSERT INTO track_days (id, day_number, track_routine_id, setup_id)
        SELECT uuid_generate_v4(), day_number, routines.id, setup_days.id
        FROM setup_days
        JOIN routines ON setup_days.setup_routine_id = routines.setup_id
        WHERE day_number = $3 AND setup_routine_id = $4
        RETURNING id, setup_id
      ),
      
      -- Step 3: Copy from setup_sessions to track_sessions
      sessions AS (
        INSERT INTO track_sessions (id, track_routine_id, name, setup_id)
        SELECT uuid_generate_v4(), routines.id, setup_sessions.name, setup_sessions.id
        FROM setup_sessions
        JOIN routines ON setup_sessions.setup_routine_id = routines.setup_id
        WHERE setup_sessions.name = $5
        RETURNING id, setup_id
      ),
      
      -- Step 4: Copy from setup_days_sessions to track_days_sessions, including session_order
      days_sessions AS (
        INSERT INTO track_days_sessions (id, day_id, session_id, session_order)
        SELECT uuid_generate_v4(), days.id, sessions.id, setup_days_sessions.session_order
        FROM setup_days_sessions
        JOIN days ON setup_days_sessions.day_id = days.setup_id
        JOIN sessions ON setup_days_sessions.session_id = sessions.setup_id
        RETURNING id
      ),

    -- Step 5: Copy from setup_session_exercises to track_session_exercises
    session_exercises AS (
      INSERT INTO track_session_exercises (id, track_session_id, exercise_id, custom_exercise_id, exercise_order, exercise_comment, setup_id)
      SELECT uuid_generate_v4(), sessions.id, setup_session_exercises.exercise_id, custom_exercise_id, setup_session_exercises.exercise_order, setup_session_exercises.exercise_comment, setup_session_exercises.id
      FROM setup_session_exercises
      JOIN sessions ON setup_session_exercises.setup_session_id = sessions.setup_id
      RETURNING id, setup_id
    )
      
    -- Step 6: Copy from setup_exercise_details to track_exercise_details
    INSERT INTO track_exercise_details (id, track_session_exercise_id, weight, cur_set, reps_goal, myo_order, setup_id)
    SELECT uuid_generate_v4(), session_exercises.id, setup_exercise_details.weight, setup_exercise_details.cur_set, setup_exercise_details.reps_goal, setup_exercise_details.myo_order, setup_exercise_details.id
    FROM setup_exercise_details
    JOIN session_exercises ON setup_exercise_details.setup_session_exercise_id = session_exercises.setup_id;
      `;
    

    await dbQuery(QUERY, this.userId, routineName, dayNum, routineId, sessionName);
  }


  async getIntraWorkoutSessionDetails(sessionName) {
    const QUERY = `
      SELECT 
          ce.name AS exercise_name,
          tse.exercise_order,
          ted.cur_set,
          ted.reps_goal,
          ted.weight,
          ted.reps_done,
          tse.exercise_comment
      FROM 
          track_routines tr
      JOIN 
          track_sessions ts
          ON tr.id = ts.track_routine_id
      JOIN 
          track_session_exercises tse
          ON ts.id = tse.track_session_id
      JOIN 
          track_exercise_details ted
          ON tse.id = ted.track_session_exercise_id
      JOIN 
          custom_exercises ce
          ON ce.id = tse.custom_exercise_id
      WHERE 
          tr.user_id = $1
          AND tr.in_progress = TRUE
          AND ts.name = $2
      ORDER BY tse.exercise_order ASC, ted.cur_set ASC
    `;

    const result = await dbQuery(QUERY, this.userId, sessionName);

    // Call the helper function to format the result
    const exercisesArr = this.formatSessionDetails(result.rows);

    // console.log(JSON.stringify(exercisesArr));

    return exercisesArr;
  }

  // Helper function to format result.rows into the desired structure
  formatSessionDetails(rows) {
    let exercisesArr = [];
    let curExe = null;
    let curExerciseOrder = null;
  
    for (let row of rows) {
      // Create a new exercise if name or exerciseOrder changes
      if (row.exercise_name !== curExe || row.exercise_order !== curExerciseOrder) {
        exercisesArr.push({
          name: row.exercise_name,
          exerciseOrder: row.exercise_order,
          comment: row.exercise_comment,
          sets: [
            {
              setNumber: row.cur_set,
              repGoal: row.reps_goal,
              weight: row.weight,
              repsDone: row.reps_done,
            },
          ],
        });
        // Update current exercise tracking
        curExe = row.exercise_name;
        curExerciseOrder = row.exercise_order;
      } else {
        // Append set to the existing exercise
        let lastEleIndex = exercisesArr.length - 1;
        exercisesArr[lastEleIndex]['sets'].push({
          setNumber: row.cur_set,
          repGoal: row.reps_goal,
          weight: row.weight,
          repsDone: row.reps_done,
        });
      }
    }
  
    return exercisesArr;
  }

  async updateTrackSetDetails(
    routineName,
    dayNumber,
    sessionName,
    exerciseOrder,
    setNumber,
    weight,
    repsDone
  ) {
      const QUERY_UPDATE = `
      UPDATE track_exercise_details ted
      SET weight = $7, reps_done = $8
      FROM track_session_exercises tse
      JOIN track_sessions ts ON tse.track_session_id = ts.id
      JOIN track_days_sessions tds ON tds.session_id = ts.id
      JOIN track_days td ON tds.day_id = td.id
      JOIN track_routines tr ON td.track_routine_id = tr.id
      WHERE tr.name = $1
        AND tr.user_id = $2
        AND tr.in_progress = true
        AND td.day_number = $3
        AND ts.name = $4
        AND tds.session_order = 1
        AND tse.exercise_order = $5
        AND ted.cur_set = $6
        AND ted.track_session_exercise_id = tse.id
    `

    await dbQuery(
      QUERY_UPDATE,
      routineName,
      this.userId,
      dayNumber,
      sessionName,
      exerciseOrder,
      setNumber,
      weight,
      repsDone
    );
  }

  async getTrackSessionId(dayNumber, sessionName) {
    const QUERY = `
      SELECT ts.id
      FROM track_routines tr
      JOIN track_days td ON tr.id = td.track_routine_id
      JOIN track_days_sessions tds ON td.id = tds.day_id
      JOIN track_sessions ts ON tds.session_id = ts.id 
      WHERE tr.in_progress = true
          AND tr.user_id = $1
          AND td.day_number = $2
          AND ts.name = $3
    `;

    const result = await dbQuery(QUERY, this.userId, dayNumber, sessionName);
    return result.rows[0].id;
  }

  async addExerciseToTrackSession(trackSessionId,customExerciseId) {
    const INSERT_EXERCISE_TO_SESSION = `
      INSERT INTO track_session_exercises
          (track_session_id,custom_exercise_id,exercise_order)
      VALUES
          ($1,$2, (SELECT COUNT(*) FROM track_session_exercises WHERE track_session_id = $1) + 1)
      RETURNING id
    `;

    const result = await dbQuery(INSERT_EXERCISE_TO_SESSION, trackSessionId, customExerciseId);
    const trackSessionExerciseId = result.rows[0].id;

    // Default begining set is "1"
    const CREATE_EXERCISE_DETAILS = `
      INSERT INTO track_exercise_details
          (track_session_exercise_id, cur_set)
      VALUES
          ($1, $2)
    `;

    await dbQuery(CREATE_EXERCISE_DETAILS, trackSessionExerciseId, 1);
  }


  async trackIntermediateExeOrderUpdate(sessionId, oldOrder, newOrder) {
    const UPDATE_BYPASS_UNIQUE_CONSTRAINT = `
      -- Intermediate Exercise Order Update:
      UPDATE track_session_exercises
      SET exercise_order = $1 + 1000
      WHERE exercise_order = $2 AND track_session_id = $3
    `

    await dbQuery(UPDATE_BYPASS_UNIQUE_CONSTRAINT, newOrder, oldOrder, sessionId);
  }

  async trackUpdateExerciseOrder(sessionId) {
    const UPDATE_TO_NEW_ORDER = `
      -- Finalized Exercise Order Update:
      UPDATE track_session_exercises
      SET exercise_order = exercise_order - 1000
      WHERE track_session_id = $1   
    `
    
    await dbQuery(UPDATE_TO_NEW_ORDER, sessionId);
  }

  async trackSessionAddExerciseSet(trackSessionId,exerciseOrder) {
    const QUERY = `
      WITH session_exercise_id AS (
          SELECT id 
          FROM track_session_exercises
          WHERE track_session_id = $1
            AND exercise_order = $2
      ),
      next_set_number AS (
          SELECT COUNT(cur_set) + 1 AS next_set
          FROM track_exercise_details
          WHERE track_session_exercise_id = (SELECT id FROM session_exercise_id)
      )
      INSERT INTO track_exercise_details (track_session_exercise_id, cur_set)
      VALUES (
          (SELECT id FROM session_exercise_id),
          (SELECT next_set FROM next_set_number)
      )
    `;

    await dbQuery(QUERY, trackSessionId,exerciseOrder);
  }

  async discardCurWorkout(routineName) {
    const QUERY = `
      DELETE FROM track_routines
      WHERE name = $1
        AND in_progress = true
    `;

    await dbQuery(QUERY, routineName);

  }

  async timeStampCompleteDate(routineName) {
    const QUERY = `
      UPDATE track_routines
      SET completion_date = NOW()
      WHERE name = $1
        AND user_id = $2
        AND in_progress = $3
      RETURNING id;
    `;
  
    const result = await dbQuery(QUERY, routineName, this.userId, true);
    if (result.rowCount === 0) {
      throw new Error("No matching routine found or routine already completed.");
    }
  
    return result.rows[0].id;
  }

  async unmarkWorkoutInProgress(routineId) {
    const QUERY = `
      UPDATE track_routines
      SET in_progress = $1
      WHERE id = $2
    `;

    const result = await dbQuery(QUERY, false, routineId);
    if (result.rowCount === 0) {
      throw new Error("Update Error, current in_progress for this track_routine id is 'false'");
    }
  }


  // -----------------------------
  // MENU, user details
  // -----------------------------

  async shiftUserToNextDaySession(setupRoutineId) {
    // Future: currently my app is set up so that a day
    // only has one session(via user interface), 
    // However my SQL design is that a day can have multiple
    // sessions and that will be implemented in the future
    // (This entire function will need to be updated)

    // NOTE: current_session from TABLE `users_current_details` always remain 1
    // due to my app set up.

    const ROUTINE_TOTAL_DAYS = `
      SELECT COUNT(day_number)
      FROM setup_days
      WHERE setup_routine_id = $1
    `;

    let result = await dbQuery(ROUTINE_TOTAL_DAYS, setupRoutineId);
    const totalDaysInRoutine = result.rows[0]["count"];

    const CURRENT_DAY = `
      SELECT current_day_number 
      FROM users_current_details
      WHERE user_id = $1
        AND current_routine_id = $2
    `;

    result = await dbQuery(CURRENT_DAY, this.userId, setupRoutineId);
    const userCurrentDay = result.rows[0]["current_day_number"];
    
    // if userCurrentDay is the last day, then set the next day num as 1
    const nextDayNum = +userCurrentDay < +totalDaysInRoutine ? (userCurrentDay + 1) : 1;

    const UPDATE_USER_CURRENT_DAY = `
      UPDATE users_current_details
      SET current_day_number = $1
      WHERE user_id = $2
        AND current_routine_id = $3
    `;

    result = await dbQuery(UPDATE_USER_CURRENT_DAY, nextDayNum, this.userId, setupRoutineId);
    if (result.rowCount === 0) {
      throw new Error("Shift user to next day/session Error");
    }
  }

  async isRestDay(routineId, dayNumber, sessionNumber) {
    // See if the current session is a rest day by checking 
    // for the existance of via exercise_order = 1
    // For a day to be considered as rest day, it shouldn't
    // have any exercises.

    const QUERY = `
      SELECT 1
      FROM setup_routines sr
      JOIN setup_days sd ON sr.id = sd.setup_routine_id
      JOIN setup_days_sessions sds ON sd.id = sds.day_id
      JOIN setup_sessions ss ON sds.session_id = ss.id
      JOIN setup_session_exercises sse ON ss.id = sse.setup_session_id
      WHERE sr.id = $1
        AND sd.day_number = $2
        AND sds.session_order = $3
        AND sse.exercise_order = $4
      LIMIT 1
    `;

    let result = await dbQuery(QUERY, routineId, dayNumber, sessionNumber, 1);
    return result.rowCount === 0;
  }


  // -----------------------------
  // Look up Records
  // -----------------------------

  async getTrackRecords() {
    const QUERY = `
      SELECT 
          tr.completion_date,
          tr.name AS routine_name, 
          td.day_number,
          ts.name AS session_name
      FROM track_routines tr
      JOIN track_days td ON tr.id = td.track_routine_id
      JOIN track_days_sessions tds ON td.id = tds.day_id
      JOIN track_sessions ts ON tds.session_id = ts.id
      WHERE tr.user_id = $1
        AND tr.in_progress = false
      ORDER BY tr.completion_date DESC
    `;

    const result = await dbQuery(QUERY, this.userId);
    return result.rows;
  }

  async getRecordSessionDetails(routineName,completionDate,dayNumber, sessionName) {
    const QUERY = `
      SELECT 
          ce.name AS exercise_name,
          tse.exercise_order,
          ted.cur_set,
          ted.reps_goal,
          ted.weight,
          ted.reps_done,
          tse.exercise_comment
      FROM track_routines tr
      JOIN track_days td ON tr.id = td.track_routine_id
      JOIN track_days_sessions tds ON td.id = tds.day_id
      JOIN track_sessions ts ON tds.session_id = ts.id
      JOIN track_session_exercises tse ON ts.id = tse.track_session_id
      JOIN track_exercise_details ted ON tse.id = ted.track_session_exercise_id
      JOIN custom_exercises ce ON ce.id = tse.custom_exercise_id
      WHERE tr.user_id = $1
        AND tr.name = $2
        AND date_trunc('seconds', tr.completion_date) = date_trunc('seconds', $3::timestamptz)
        AND td.day_number = $4
        AND ts.name = $5
      ORDER BY tse.exercise_order, ted.cur_set
    `;

    const result = await dbQuery(QUERY, this.userId, routineName, completionDate, dayNumber, sessionName);

    // Call the helper function to format the result
    const exercisesArr = this.formatSessionDetails(result.rows);
  
    // console.log(JSON.stringify(exercisesArr, null, 2));
    return exercisesArr;
  }
}



