const { dbQuery } = require("./db-query");


module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }

  async authenticate(username, password) {
    const FIND_PLAIN_PASSWORD = "SELECT password FROM users" +
                                " WHERE username = $1";
  
    let result = await dbQuery(FIND_PLAIN_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return true;
  }
}