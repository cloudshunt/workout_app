/*
NOTE: both routine creation and routine post creation editing
utilizes overview and any pages after
 */
const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../config");
const processSessionNames = require("../lib/helpers");
const router = express.Router();

router.get("/routine-overview",
  requiresAuthentication,
  catchError(async (req, res) => {
    // When setting up session in another route, curSessionSetup obj is utlized
    // When we return to /routine-overview page, that obj needs to be cleared (more optimized memory)
    if (req.session.curSessionSetup) {
      delete req.session.curSessionSetup;
    }

    const routineId = req.session.passed_routine_id;
    const page = parseInt(req.query.page, 10) || 1;

    // Fetch all days and their sessions
    const allDaysSessions = await res.locals.store.getDaysSessionsDetails(routineId);

    // Pagination settings
    const totalDays = allDaysSessions.length;
    const totalPages = Math.max(Math.ceil(totalDays / DAYS_PER_PAGE), 1);

    // Extract days for the current page
    const offset = (page - 1) * DAYS_PER_PAGE;
    const paginatedDays = allDaysSessions.slice(offset, offset + DAYS_PER_PAGE);

    // Fetch routine name
    const routineName = await res.locals.store.getRoutineName(routineId);

    const routineEditInProgress = req.session.routineEditInProgress;
    res.render("routine-overview", {
      routineName,
      days: paginatedDays,
      currentPage: page,
      totalPages,
      routineEditInProgress,
    });
  })
);



router.post("/routine-overview/discard", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;

    // Perform the discard operation (e.g., delete routine setup, sessions, etc.)
    await discardRoutineCreation(req, res, routineId);

    // Clear the session variable for the routine
    delete req.session.passed_routine_id;

    // Redirect to the main page or another appropriate location
    // req.flash("info", "Routine setup discarded.");
    res.redirect("/");
  })
);



router.get("/session-exercises-setup/session/:sessionName",
  requiresAuthentication,
  catchError(async (req, res) => {
    const {sessionName} = req.params;

    // When we go to exercise-list, which is not session specific.
    // (instead of passing around sessionName)
    // this allows us to retain what session we were working on and return to it
    req.session.curSessionSetup = sessionName;

    const routineId = req.session.passed_routine_id;
    let userCustomExercises = await res.locals.store.getUserCustomExercises();
    let sessionExercisesAndDetails = await res.locals.store.getSessionExercisesAndDetails(routineId, sessionName);
    
    console.log("CHECK POINT alpha");
    console.log(sessionExercisesAndDetails);
    res.render("session-setup", {sessionName, userCustomExercises, sessionExercisesAndDetails});
  })
);

router.post("/session-exercises-setup/session/:sessionName",
  requiresAuthentication,
  catchError(async (req, res) => {
    const {sessionName} = req.params;
    const exercise = req.body.exercise;
    const routineId = req.session.passed_routine_id;
    if (exercise) {
      // will need to add a validator in case a value wasn't selected
      const sessionExerciseId = await res.locals.store.addExerciseToSession(routineId, sessionName, exercise);

      await res.locals.store.createFirstSetExerciseDetails(sessionExerciseId);
      
    } else {
      req.flash('error', 'Need to select an option');
    }
    
    res.redirect(`/session-exercises-setup/session/${sessionName}`);
  })
);

router.post("/session-exercises-setup/session/:sessionName/delete-session-exercise/:orderNumber", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    console.log("boby");
    const { sessionName, orderNumber } = req.params;
    const routineId = req.session.passed_routine_id;


    await res.locals.store.deleteSessionExerciseShiftOrder(routineId, sessionName, orderNumber);
    // req.flash("info", "Exercise deleted successfully.");
    res.redirect(`/session-exercises-setup/session/${sessionName}`);
  })
);


router.get("/session-exercises-reorder/:sessionName",
  requiresAuthentication,
  catchError(async (req, res) => {
    const {sessionName} = req.params;
    const routineId = req.session.passed_routine_id;
  
    let sessionExercisesAndDetails = await res.locals.store.getSessionExercisesAndDetails(routineId, sessionName);

    res.render("session-exercises-reorder", {sessionName, sessionExercisesAndDetails});
  })
);

router.post("/save-reordered-exercises/:sessionName", 
  requiresAuthentication, 
  catchError(async (req, res) => {
  const sessionName = req.params.sessionName;
  const orderData = req.body; // Object with { exerciseId: newOrder }
  const routineId = req.session.passed_routine_id;


  let fieldNames = Object.keys(orderData);
  let seenOrder = new Set();
  let duplicateOrder = false;
  let oldAndNewOrders = fieldNames.map((fieldName) => {
    let newOrder = orderData[fieldName];
    let oldOrder = fieldName.split("-")[1];

    if (seenOrder.has(newOrder)) {
        duplicateOrder = true;
      }

    seenOrder.add(newOrder);
    return {oldOrder, newOrder};
  });

  if (duplicateOrder) {
    req.flash("error", "Can not have duplicate order, please provide unique order for each exercise.");
    console.log("custom validator at work")
  } else {
    // future improvements:
    // conduct only 1 db call instead of multiple
    // using dynamically constructed sql parameters
    // and then use CTE to make them all in 1 transaction
    for (let order of oldAndNewOrders) {
      await res.locals.store.intermediateExeOrderUpdate(routineId, sessionName, order.oldOrder, order.newOrder )
    }

    await res.locals.store.updateExerciseOrder(routineId, sessionName);

  }

  res.redirect(`/session-exercises-reorder/${sessionName}`);
}));

router.post("/routine-overview/complete",
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    
    // delete any sesssion value associated with routine creation
    delete req.session.passed_routine_id;

    // Routine edit will use routineEditInProgress,
    // set the flag to false in db and then delete the associated session
    if (req.session.routineEditInProgress) {
      await res.locals.store.turnOffEditInProgress(routineId);
      delete req.session.routineEditInProgress;
    } else { //initial routine creation compelete
      await res.locals.store.markRoutineCreationStatusComplete(routineId);
    }

    res.redirect("/");
  })
);

module.exports = router;