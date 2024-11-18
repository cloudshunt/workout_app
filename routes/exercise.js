const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../config");
const processSessionNames = require("../lib/helpers");
const router = express.Router();

router.get("/exercise-list",
  requiresAuthentication,
  catchError(async (req, res) => {
    const store = res.locals.store;
    const curSession = req.session.curSessionSetup;
    const customExercisesArr = await store.getUserCustomExercises();
    res.render("exercise-list", {curSession,customExercisesArr}, );
  })
);

router.post("/exercise-list",
  requiresAuthentication,
  [
    body("exerciseName")
      .trim() // Remove leading/trailing whitespace
      .isLength({min: 1, max: 255}) // Set the length constraints
      .withMessage("Exercise name must be between 1 and 255 characters long")
      .matches(/^[a-zA-Z0-9()+\- ]+$/) // Regex for alphanumeric and allowed symbols
      .withMessage("Exercise name can only contain letters, numbers, spaces, and the following symbols: +, (, ), -")
  ],
  catchError(async (req, res) => {
    const errors = validationResult(req);
    const store = res.locals.store;
    const exerciseName = req.body.exerciseName; 
    const existCustomExercise = await store.existCustomExercise(exerciseName);

    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else if( existCustomExercise ) {
      req.flash("error", `"${exerciseName}" already exist`);
    } else {
      await store.createNewCustomExercise(exerciseName);
      req.flash("info", `"${exerciseName}" created`);
    }

    res.redirect("/exercise-list");
  })
);

router.get("/session-exercise-details/:sessionName/:exerciseName/:exerciseOrder",
  requiresAuthentication,
  catchError(async (req, res) => {
    const store = res.locals.store;
    const sessionName = req.params.sessionName;
    const exerciseOrder = req.params.exerciseOrder;
    const exerciseName = req.params.exerciseName;
    const routineId = req.session.passed_routine_id;

    const sessionExerciseId = await store.getSessionExerciseId(routineId,sessionName, exerciseOrder);
    const exerciseDetails = await store.getExerciseDetails(sessionExerciseId);
    
    res.render("session-exercise-details", {
      exerciseName,
      exerciseDetails,
      exerciseOrder,
      sessionName,
    });

  })
);

router.post("/session-exercise-details/:sessionName/:exerciseName/:exerciseOrder/add-set",
  requiresAuthentication,
  catchError(async (req, res) => {
    const store = res.locals.store;
    const sessionName = req.params.sessionName;
    const exerciseOrder = req.params.exerciseOrder;
    const exerciseName = req.params.exerciseName;
    const routineId = req.session.passed_routine_id;

    const sessionExerciseId = await store.getSessionExerciseId(routineId,sessionName, exerciseOrder);
    await store.addSet(sessionExerciseId);
    res.redirect(`/session-exercise-details/${sessionName}/${exerciseName}/${exerciseOrder}`);
  })
);

router.post("/session-exercise-details/:sessionName/:exerciseName/:exerciseOrder/update-details",
  requiresAuthentication,
  catchError(async (req, res) => {
    const store = res.locals.store;
    const sessionName = req.params.sessionName;
    const exerciseOrder = req.params.exerciseOrder;
    const exerciseName = req.params.exerciseName;
    const routineId = req.session.passed_routine_id;

    const sessionExerciseId = await store.getSessionExerciseId(routineId,sessionName, exerciseOrder);

    const fieldNames = req.body;
    const filedNameReps = Object.keys(fieldNames);

    // validation check for invalid reps
    // 1. rep goal won't be 0 or less 
    // 2. rep goal must be an int
    let validInput = true;

    for (let fieldName of filedNameReps) {
      let reps = +(fieldNames[fieldName]);
      if (!Number.isInteger(reps) || reps < 1) {
        req.flash("error", "Invalid Rep input.");
        validInput = false;
        break;
      }
    }

    if (validInput) {
      for (let fieldName of filedNameReps) {
        let set = fieldName.split('_')[3];
        let reps = fieldNames[fieldName];
        await store.updateReps(sessionExerciseId, set, reps);
      }  
    }


    

    // await store.updateReps(sessionExerciseId, set, reps);
    res.redirect(`/session-exercise-details/${sessionName}/${exerciseName}/${exerciseOrder}`);
    
  })
);

module.exports = router;