// 1. Validates selected session names.
// 2. Either creates a new session for a day, or updates the session
async function processSessionNames(fieldNames, req, store, routineId) {
  let validationErrors = [];

  let dayNumAndSessionNumArr = fieldNames.filter(fieldName => fieldName.slice(0, 3) === 'day');

  let dayNumSessionNumSessionNameArr = dayNumAndSessionNumArr.map(fieldName => {
    let [dayNum, sessionNum] = extractDayNumSessionNumFromFieldName(fieldName);
    let sessionName = req.body[fieldName].trim();
    return {dayNum, sessionNum, sessionName}
  })

  for (let daySession of dayNumSessionNumSessionNameArr) {
    let sessionName = daySession.sessionName;
    let sessionNum = daySession.sessionNum;
    let dayNum = daySession.dayNum;

    // Validate session name
    if (sessionName === '') {
      validationErrors.push(`Must select a Session Name for day ${dayNum}`);
      // break; //commented out to allow display of all input errors in flash
    } else if (!(await store.getSessionId(routineId, sessionName))) {
      // if the sessionName doesn't exist
      validationErrors.push(`Invalid session name for day ${dayNum}`);
    } else {
      // If valid, insert or update the session name
      await store.updateDaysSessionName(routineId, +dayNum, +sessionNum, sessionName);
    }
  }

  return validationErrors;
}

// Get day number & session number from field name which can be
// used for updates
const extractDayNumSessionNumFromFieldName = (fieldName) => {
  const extractDayNum = (fieldName) => {
    const regex = /day(\d+)_/;
    return fieldName.match(regex)[1];
  };
  
  const extractSessionNum = (fieldName) => {
    const regex = /session(\d+)/;;
    return fieldName.match(regex)[1];
  }
  return [extractDayNum(fieldName), extractSessionNum(fieldName)];
}

module.exports =  {
  processSessionNames,
  extractDayNumSessionNumFromFieldName,
};