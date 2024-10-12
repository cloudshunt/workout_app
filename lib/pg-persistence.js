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
          INSERT INTO setup_routines (name, user_id)
          VALUES ('Enter Your Routine Name Here', $1)
          `;

    await dbQuery(ROUTINE_INITIAL_CREATION,  this.userId);

  }

  async getInitialRoutineId() {
    const GET_ROUTINE_ID = `
          SELECT id FROM setup_routines
          WHERE user_id = $1 AND 
                name = 'Enter Your Routine Name Here'
    `;


    let result = await dbQuery(GET_ROUTINE_ID, this.userId)
    return result.rows[0].id;

  }
}