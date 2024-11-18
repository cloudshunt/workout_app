// lib/routine-utils.js

/**
 * Discards an incomplete routine by deleting it from the database and clearing it from the session.
 * 
 * param {object} req - The Express request object.
 * param {object} res - The Express response object.
 * param {number} routineId - The ID of the routine to discard.
 */

//clear routine_id in session meant for creation
const discardRoutineCreation = async (req, res, routineId) => {
  await res.locals.store.dropRoutine(routineId);
  delete req.session.passed_routine_id; // Clear routine ID from session
};

module.exports = {
  discardRoutineCreation,
};
