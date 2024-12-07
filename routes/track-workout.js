const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const router = express.Router();

router.post("/start-workout", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineName = req.body.selectedRoutine;
    const setupRoutineId = await res.locals.store.getSetupRoutineId(routineName);
    const dayNumber = req.body.dayNumber;
    const sessionName = req.body.sessionName;
    
    await res.locals.store.copyFromSetupToTrack(routineName, dayNumber, setupRoutineId, sessionName);
    const trackSessionId = await res.locals.store.getTrackSessionId(dayNumber, sessionName);

    // NOTE: these session objects will be deleted 
    // after workout completion OR if user discards the workout
    req.session.tempTrackRoutineName = routineName;
    req.session.tempTrackDayNumber = dayNumber;
    req.session.tempTrackSessionName = sessionName;
    req.session.tempTrackSessionId = trackSessionId;
    req.session.tempSetupRoutineId = setupRoutineId;

    res.redirect("/track-intra-workout");
  })
);

router.get("/track-intra-workout", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineName = req.session.tempTrackRoutineName;
    const dayNumber = req.session.tempTrackDayNumber;
    const sessionName = req.session.tempTrackSessionName;

    const exercises = await res.locals.store.getIntraWorkoutSessionDetails(sessionName);
    // console.log(JSON.stringify(exercises, null, 2));
    res.render("track-intra-workout-log", {routineName, dayNumber, sessionName, exercises});
  })
);

router.post("/track-update-set",
  requiresAuthentication, 
  [
    body("weight")
      .isFloat({ min: 0 }) // Validate non-negative
      .withMessage("Weight must be a non-negative number.")
      .bail() // Stop further validation if this fails
      .custom((value) => value % 0.5 === 0) // Validate increments of 0.5
      .withMessage("Weight must be in increments of 0.5."),

    body("repsDone")
      .isInt({ min: 0 }) // Validate non-negative integer
      .withMessage("Reps done must be a whole number greater than or equal to 0.")
  ],
  catchError(async (req, res) => {
    const errors = validationResult(req);

    const routineName = req.session.tempTrackRoutineName;
    const dayNumber = req.session.tempTrackDayNumber;
    const sessionName = req.session.tempTrackSessionName;
    const exerciseOrder = req.body.exerciseOrder;
    const setNumber = req.body.setNumber;
    const weight = req.body.weight;
    const repsDone = req.body.repsDone;

    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else if (weight && repsDone) {
      await res.locals.store.updateTrackSetDetails(
        routineName,
        dayNumber,
        sessionName,
        exerciseOrder,
        setNumber,
        weight,
        repsDone
      );  
    } else {
      req.flash("error", "Need to input both weight and reps for a set");
    }

    res.redirect("/track-intra-workout");
  })
);

router.get("/track-add-exercises", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const userCustomExercises = await res.locals.store.getUserCustomExercises();
    res.render("track-add-exercises", {userCustomExercises});
  })
);

router.post("/track-add-exercises", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const exercise = req.body.exercise;
    const customExerciseId = await res.locals.store.getCustomExerciseId(exercise);
    const trackSessionId = req.session.tempTrackSessionId;
    const validExercise = await res.locals.store.getCustomExerciseId(exercise);
    
    if (exercise === "") {
      req.flash('error', 'Need to select an option');
    } else if (!validExercise) {
      req.flash("error", "invalid input");
    } else {
      await res.locals.store.addExerciseToTrackSession(trackSessionId,customExerciseId);
      req.flash("info", `${exercise} added`);
    }
    
    res.redirect(`/track-intra-workout`);
  })
);

router.get("/track-session-exercises-reorder",
  requiresAuthentication, 
  catchError(async (req, res) => {
    const trackSessionName = req.session.tempTrackSessionName;
    const exercises = await res.locals.store.getIntraWorkoutSessionDetails(trackSessionName);

    res.render("track-session-exercises-reorder", {exercises});
  })
);

router.post("/track-session-exercises-reorder", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const sessionId = req.session.tempTrackSessionId;
    const orderData = req.body; // Object with { exerciseId: newOrder }
    const fieldNames = Object.keys(orderData);
    const exerciseAmt = fieldNames.length;

    let seenOrder = new Set();
    let duplicateOrder = false;
    let invalidOrder = false;
    let oldAndNewOrders = fieldNames.map((fieldName) => {
      let newOrder = +(orderData[fieldName]);
      let oldOrder = fieldName.split("-")[1];

      if (seenOrder.has(newOrder)) {
          duplicateOrder = true;
        }
      if (!Number.isInteger(newOrder) || newOrder < 1 || newOrder > exerciseAmt) {
        invalidOrder = true;
      }

      seenOrder.add(newOrder);
      return {oldOrder, newOrder};
    });

    if (duplicateOrder) {
      req.flash("error", "Can not have duplicate order, please provide unique order for each exercise.");
    } else if(invalidOrder) {
      req.flash("error", "Invalid order input");
    } else {
      // future improvements:
      // conduct only 1 db call instead of multiple
      // using dynamically constructed sql parameters
      // and then use CTE to make them all in 1 transaction
      for (let order of oldAndNewOrders) {
        await res.locals.store.trackIntermediateExeOrderUpdate(sessionId, order.oldOrder, order.newOrder )
      }

      await res.locals.store.trackUpdateExerciseOrder(sessionId);
    }

    res.redirect("/track-session-exercises-reorder");
  })
);

router.post("/track-add-exercise-set", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const trackSessionId = req.session.tempTrackSessionId;
    const exerciseOrder = req.body.exerciseOrder;
    await res.locals.store.trackSessionAddExerciseSet(trackSessionId,exerciseOrder);
    res.redirect("/track-intra-workout");
  })
);

router.post("/track-discard-workout", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineName = req.session.tempTrackRoutineName;
    await res.locals.store.discardCurWorkout(routineName);

    // Session clean up
    sessionCleanUp(req);
    res.redirect("/");
  })
);

router.post("/track-complete-workout", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const trackSessionName = req.session.tempTrackSessionName;
    const routineName = req.session.tempTrackRoutineName;
    const setupRoutineId = req.session.tempSetupRoutineId;
    const trackRoutineId = await res.locals.store.timeStampCompleteDate(routineName);

    await res.locals.store.unmarkWorkoutInProgress(trackRoutineId);
    await res.locals.store.shiftUserToNextDaySession(setupRoutineId);

    req.flash("success", `${trackSessionName} complete!!`)

    // Session clean up
    sessionCleanUp(req);
    res.redirect("/");
  })
);

// basic helper
function sessionCleanUp(req) {
  delete req.session.tempTrackRoutineName;
  delete req.session.tempTrackDayNumber;
  delete req.session.tempTrackSessionName;
  delete req.session.tempTrackSessionId;
  delete req.session.tempSetupRoutineId;
}

module.exports = router;