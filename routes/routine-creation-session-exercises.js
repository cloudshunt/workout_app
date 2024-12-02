const express = require("express");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const router = express.Router();

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
    let sessionExercisesAndDetails = await res.locals.store.getSetupSessionExercisesAndDetails(routineId, sessionName);
    
    res.render("session-setup", {sessionName, userCustomExercises, sessionExercisesAndDetails});
  })
);

// Add a new exercise for a session
router.post("/session-exercises-setup/session/:sessionName",
  requiresAuthentication,
  catchError(async (req, res) => {
    const {sessionName} = req.params;
    const exercise = req.body.exercise;
    const routineId = req.session.passed_routine_id;
    const validExercise = await res.locals.store.getCustomExerciseId(exercise);
    
    if (exercise === "") {
      req.flash('error', 'Need to select an option');
    } else if (!validExercise) {
      req.flash("error", "invalid input");
    } else {
      const sessionExerciseId = await res.locals.store.addExerciseToSession(routineId, sessionName, exercise);
      await res.locals.store.createFirstSetExerciseDetails(sessionExerciseId);
    }
    
    res.redirect(`/session-exercises-setup/session/${sessionName}`);
  })
);

// Delete an exercise from a session
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
    const sessionExercisesAndDetails = await res.locals.store.getSetupSessionExercisesAndDetails(routineId, sessionName);
  
    res.render("session-exercises-reorder", {sessionName, sessionExercisesAndDetails});
  })
);

router.post("/save-reordered-exercises/:sessionName", 
  requiresAuthentication, 
  catchError(async (req, res) => {
  const sessionName = req.params.sessionName;
  const orderData = req.body; // Object with { exerciseId: newOrder, etc... }
  const routineId = req.session.passed_routine_id;
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

  // Custom validators
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
      await res.locals.store.intermediateExeOrderUpdate(routineId, sessionName, order.oldOrder, order.newOrder )
    }

    await res.locals.store.updateExerciseOrder(routineId, sessionName);
  }
  res.redirect(`/session-exercises-reorder/${sessionName}`);
}));

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