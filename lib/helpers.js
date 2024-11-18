// Helper function to process session names and validate them
async function processSessionNames(fieldNames, req, store, routineId) {
  // note: if this happens before any days exist, nothing occurs
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
      break;
    } else {
      // If valid, insert or update the session name
      await store.updateDaysSessionName(routineId, +dayNum, +sessionNum, sessionName);
    }

  }

  return validationErrors;
}


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