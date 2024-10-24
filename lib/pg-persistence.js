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
      SELECT ss.day_number, sws.name "session_name" FROM 
      setup_schedules ss LEFT JOIN setup_workout_sessions sws ON
      ss.id = sws.setup_schedule_id
      WHERE ss.setup_routine_id = $1
      ORDER BY ss.day_number ASC
    `;

    let result = await dbQuery(GET_DAY_NUMS_AND_SESSION_NAMES, routineId);
    // console.log("CHECK POINT");
    // console.log(result.rows);

    let dayAndSessionsArr = [];

    for (let row of result.rows) {
      // console.log(row.day_number, row.session_name);

      let dayAndSessionObj = {};
      dayAndSessionObj.dayNumber = row.day_number;
      dayAndSessionObj.sessionName = row.session_name;
      dayAndSessionsArr.push(dayAndSessionObj);
    }

    // console.log("CHECK POINT1");
    // console.log(dayAndSessionsArr)
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

    console.log("CHECKPOINT3");

  }

  async addDay(routineId,existDaysAmt) {
    const ADD_A_DAY = `
      INSERT INTO setup_schedules (day_number,setup_routine_id)
      VALUES ($1,$2)
    `
    existDaysAmt += 1;

    // console.log("CHECK POINT x");
    // console.log(existDaysAmt);

    await dbQuery(ADD_A_DAY, existDaysAmt, routineId);
  }

  async insertOrUpdateSessionName(routineId, day, sessionName) {
    const QUERY = `
    WITH schedule AS (
      SELECT id 
      FROM setup_schedules
      WHERE routine_id = $1
      AND day = $2
    )
    UPDATE setup_workout_sessions
    SET name = $3
    WHERE setup_schedule_id = (SELECT id FROM schedule)
  `;
  
    
  }
}