const { dbQuery } = require("./db-query");


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

  async getDayNumsAndItsSessions(routineId) {
    const GET_DAY_NUMS_AND_SESSION_NAMES = `
    SELECT sd.day_number, ss.name "session_name" 
    FROM setup_days sd 
    LEFT JOIN setup_days_sessions sds ON sd.id = sds.day_id
    LEFT JOIN setup_sessions ss ON sds.session_id = ss.id
    WHERE sd.setup_routine_id = $1
    ORDER BY sd.day_number ASC, sds.session_order ASC
    `

    let result = await dbQuery(GET_DAY_NUMS_AND_SESSION_NAMES, routineId);
    // console.log("CHECK POINT");
    // console.log(result.rows);

    // let dayAndSessionsArr = [];
    // for (let row of result.rows) {
    //   // console.log(row.day_number, row.session_name);

    //   let dayAndSessionObj = {};
    //   dayAndSessionObj.dayNumber = row.day_number;
    //   dayAndSessionObj.sessionName = row.session_name;
    //   dayAndSessionsArr.push(dayAndSessionObj);
    // }

    // The following organize objects in an array that helps with
    // displaying days and sessions on template
    let dayAndSessionsArr = [];
    let curDayNum = null;
    let dayAndSessionObj = {};
    for (let row of result.rows) {
      if (row.day_number === curDayNum) {
        (dayAndSessionObj.sessionName).push(row.session_name);
      } else {
        dayAndSessionObj = {};
        curDayNum = row.day_number;

        dayAndSessionObj.dayNumber = row.day_number;
        dayAndSessionObj.sessionName = [row.session_name];
        dayAndSessionsArr.push(dayAndSessionObj);
      }  
    }

    // console.log("CHECK POINT 1");
    // console.log(dayAndSessionsArr);

    // instead of above, i'm trying to establish
    // dayAndSessionsArr = 
    // [{dayNumber: 1, sessionName : ["full body 1", "neck"]}, 
    //  {dayNumber: 2, sessionName : ["Rest 1"]}]
    //

    // how to add things in a way where i can pass it to render,
    // and it gets rendered
    return dayAndSessionsArr;
  }

  // comment this out when done, meant for testing purpose
  async tempAddDaysAndSession(routineId) {
    // adding 1 day and 1 session which is associated with it.
    const QUERY = `
    WITH schedules AS (
      INSERT INTO setup_schedules (day_number,setup_routine_id)
      VALUES (1,$1)
      RETURNING id
      )
    INSERT INTO setup_workout_sessions (setup_schedule_id, name)
    VALUES ( (SELECT id FROM schedules), 'Full Body1')
    `

    await dbQuery(QUERY, routineId);

    const QUERY2 = `
      INSERT INTO setup_schedules (day_number,setup_routine_id)
      VALUES (2,$1)
    `
    await dbQuery(QUERY2, routineId);

  }

  async addDay(routineId,existDaysAmt) {
    const ADD_A_DAY = `
      INSERT INTO setup_days (day_number,setup_routine_id)
      VALUES ($1,$2)
    `
    existDaysAmt += 1;

    // console.log("CHECK POINT x");
    // console.log(existDaysAmt);

    await dbQuery(ADD_A_DAY, existDaysAmt, routineId);
  }

  async getSessionId(dayId, sessionNum) {
    const SESSION_EXISTS = `
      -- Check if the session already exists
      SELECT session_id
      FROM setup_days_sessions
      WHERE day_id =  $1 AND session_order = $2;
    `;
  
    let result = await dbQuery(SESSION_EXISTS, dayId, sessionNum);
    let sessionId = result.rows[0] ? result.rows[0]["session_id"] : null;
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

  async updateSessionName(sessionId, sessionName) {
    const UPDATE_SESSION_NAME = `
      UPDATE setup_sessions
      SET name = $2
      WHERE id = $1
    `;

    await dbQuery(UPDATE_SESSION_NAME, sessionId, sessionName);
  }

  async insertOrUpdateSessionName(routineId, dayNum, sessionNum, sessionName) {
    // STEP 1 (check if session exist, if so return session_id, else returns null)

    // (get setup_day_id for given routine's specific day number)
    let dayId = await this.getDayId(routineId, dayNum);
    // use juntion table between days and sessions to figure if session exist for a specific day
    let sessionId = await this.getSessionId(dayId, sessionNum); 

    
    // Step 2 if sessionId doesn't exist)
    if (!sessionId) {
      console.log("sessionId doesn't exist");
      // Step 2-1 (Insert new session, and get its id)
      let sessionId = await this.insertAndGetSessionId(routineId,sessionName);

      // Step 2-2 (determine session_order for the new session)
      let sessionOrder = sessionNum;

      // Step 2-3 (insert new relationship into junction table `setup_days_sessions`)
      await this.junctionInsertionNewSessionWithDay(dayId, sessionId, sessionOrder);
    } else {
      
      // Step 3
      await this.updateSessionName(sessionId, sessionName);

    }
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
}