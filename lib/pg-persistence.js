const session = require("express-session");
const { dbQuery } = require("./db-query");
const { Query } = require("pg");


module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
    this.userId = session.userId;
  }

  async authenticate(username, password) {
    const FIND_PLAIN_PASSWORD = "SELECT password FROM users" +
                                " WHERE username = $1";
  
    let result = await dbQuery(FIND_PLAIN_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return true;
  }

  async getUserId(username) {
    const FIND_USER_ID = `
      SELECT id FROM users
      WHERE username = $1
    `
    let result = await dbQuery(FIND_USER_ID, username);
    return result.rows[0].id;
  }

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

  async createInitialSetupRoutine() {
    const ROUTINE_INITIAL_CREATION = `
          INSERT INTO setup_routines (user_id)
          VALUES ($1)
          `;

    await dbQuery(ROUTINE_INITIAL_CREATION,  this.userId);

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
  `
    await dbQuery(SET_ROUTINE_NAME, userInputName, this.userId, routineId);  
  }

  async otherExistsRouteName(routineId, userInputName, routineName) {
    const FIND_ROUTINE_NAME = `
      SELECT 1 FROM setup_routines
        WHERE user_id = $1 
        AND name ILIKE $2 
        AND name NOT ILIKE $3
    `;

    let result = await dbQuery(FIND_ROUTINE_NAME, this.userId, userInputName, routineName);

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
  console.log("CHECKPOINT zebra");
  console.log(daySessionsMap);
  
  console.log("CHECPOINT jun");
  console.log(Object.values(daySessionsMap));
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
  return parseInt(result.rows[0].total_days, 10);
}


  // // comment this out when done, meant for testing purpose
  // async tempAddDaysAndSession(routineId) {
  //   // adding 1 day and 1 session which is associated with it.
  //   const QUERY = `
  //   WITH schedules AS (
  //     INSERT INTO setup_schedules (day_number,setup_routine_id)
  //     VALUES (1,$1)
  //     RETURNING id
  //     )
  //   INSERT INTO setup_workout_sessions (setup_schedule_id, name)
  //   VALUES ( (SELECT id FROM schedules), 'Full Body1')
  //   `

  //   await dbQuery(QUERY, routineId);

  //   const QUERY2 = `
  //     INSERT INTO setup_schedules (day_number,setup_routine_id)
  //     VALUES (2,$1)
  //   `
  //   await dbQuery(QUERY2, routineId);

  // }

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
    let sessionId = result.rows[0]["id"];
    return sessionId;
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
      WHERE setup_routine_id = $1 AND day_number = $2
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

  // async updateSessionName(sessionId, sessionName) {
  //   const UPDATE_SESSION_NAME = `
  //     UPDATE setup_sessions
  //     SET name = $2
  //     WHERE id = $1
  //   `;

  //   await dbQuery(UPDATE_SESSION_NAME, sessionId, sessionName);
  // }

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

    // STEP 1, get setup_days_sessions' id 
    //(it's a junction table for setup_days, setup_sessions for m to m relationship)
    // see if a relationship already exist or not between a day and a session
    let daySessionJunctionId =  await this.getDaySessionJunctionId(dayId, sessionNum);

    // STEP 2. check if setup_days_sessions' id exist
    // for given dayId and sessionId,
    if (!daySessionJunctionId) {
       // STEP 2-1. IF doesn't exist create and return days_sessions id
       // then assign day day_session_id
       await this.createReturnDaySesJunctionId(dayId, sessionId);
    } else {
       // STEP 2-2. IF exist junction exist already, just update a different session for a row
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

  // IMPORTANT: will need to adjust that if one of the query fails then it rolls back
  // 2 options: 
  //1st: adjust so that I can use CTE,  (my current thing cannot be cte, b/c of constraints i have 
  // and CTE won't let go of the constraint until transaction is finished)
  //2nd: database transaction support
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

  // will need to be replace with more optimized query instead of 1 by 1 checking
  async existSessionName(routineId, sessionName) {
    const FIND_SESSION_NAME = `
      SELECT 1 FROM setup_sessions
      WHERE setup_routine_id = $1 AND name = $2
    `
    let result = await dbQuery(FIND_SESSION_NAME, routineId, sessionName);
    return result.rowCount > 0;
  }


  async getAllSessionName(routineId, curPageSessionArr) {
    // Start the SQL query
    let GET_ALL_SESSION_NAME = `
      SELECT name
      FROM setup_sessions
      WHERE setup_routine_id = $1
    `;

    // Add conditions to exclude the names in `curPageSessionArr`
    if (curPageSessionArr.length > 0) {
      GET_ALL_SESSION_NAME += " AND (";
      GET_ALL_SESSION_NAME += curPageSessionArr.map((_, index) => `name <> $${index + 2}`).join(" AND ");
      GET_ALL_SESSION_NAME += ")";
    }

    // Combine routineId with the current page session array for parameter substitution
    const parameters = [routineId, ...curPageSessionArr];

    // Execute the query
    const result = await dbQuery(GET_ALL_SESSION_NAME, ...parameters);
    return result.rows.map(row => row.name.toLowerCase());
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

// PgPersistence.js
async existSessionName(routineId, sessionName) {
  const CHECK_SESSION_NAME_QUERY = `
    SELECT 1
    FROM setup_sessions
    WHERE setup_routine_id = $1 AND LOWER(name) = LOWER($2)
  `;

  const result = await dbQuery(CHECK_SESSION_NAME_QUERY, routineId, sessionName);
  
  return result.rowCount > 0;
}


  async tempAddSession(routineId) {
    // temp insert session for day 1

    const TEMP_INSERT_FULL_BODY_SESSION = `
      -- Step 1: Insert two new sessions into setup_sessions
      WITH new_sessions AS (
        INSERT INTO setup_sessions (id, setup_routine_id, name)
        VALUES
          (uuid_generate_v4(), $1, 'Full Body 1'),       -- First session
          (uuid_generate_v4(), $1, 'Neck and Cardio')    -- Second session
        RETURNING id, name
      ),

      -- Step 2: Retrieve the setup_day_id for day 1
      day_id AS (
        SELECT id AS setup_day_id
        FROM setup_days
        WHERE setup_routine_id = $1 AND day_number = 1  -- Specify routine ID and day number (1 in this case)
      ),

      -- Step 3: Determine the next session_order for day 1, starting from the current max order
      next_order AS (
        SELECT COALESCE(MAX(session_order), 0) AS max_order
        FROM setup_days_sessions
        WHERE day_id = (SELECT setup_day_id FROM day_id)
      )

      -- Step 4: Insert both sessions into setup_days_sessions with incremented session_order
      INSERT INTO setup_days_sessions (id, day_id, session_id, session_order)
      SELECT
        uuid_generate_v4(),
        day_id.setup_day_id,
        new_sessions.id,
        next_order.max_order + ROW_NUMBER() OVER (ORDER BY new_sessions.name)  -- Assigns sequential session_order
      FROM new_sessions, day_id, next_order;
    `;

    await dbQuery(TEMP_INSERT_FULL_BODY_SESSION, routineId);    
  }

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

    const exerciseResult = await dbQuery(GET_CUSTOM_EXERCISE_ID_QUERY, exerciseName, this.userId);
    if (exerciseResult.rowCount === 0) throw new Error("Exercise not found");
    return exerciseResult.rows[0].id;
  }

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


  async getSessionExercisesAndDetails(routineId, sessionName) {
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
      ORDER BY exercise_order
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
    `;

    let result = await dbQuery(QUERY, sessionExerciseId);

    console.log("CHECKPOINT: alpha");
    console.log(result);
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

    // console.log("CHECKPOINT delta");
    // // console.log(JSON.stringify(daySessionsMap, null, 2));

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
            name: "Morning Yoga",
            exercises: [
              { name: "Downward Dog" },
              { name: "Sun Salutation" },
            ],
          },
          {
            name: "Evening Cardio",
            exercises: [
              { name: "Running" },
              { name: "Cycling" },
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

  
}



