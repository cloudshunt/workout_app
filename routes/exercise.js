const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const router = express.Router();

router.get("/exercise-list",
  requiresAuthentication,
  catchError(async (req, res) => {
    const store = res.locals.store;
    const curSession = req.session.curSessionSetup;
    const customExercisesArr = await store.getUserCustomExercises();
    const setupOrTrack = req.query.setupOrTrack;
    res.render("exercise-list", {curSession,customExercisesArr,setupOrTrack}, );
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
    const setupOrTrack = req.body.setupOrTrack;

    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else if( existCustomExercise ) {
      req.flash("error", `"${exerciseName}" already exist`);
    } else {
      await store.createNewCustomExercise(exerciseName);
      req.flash("info", `"${exerciseName}" created`);
    }

    res.redirect(`/exercise-list?setupOrTrack=${setupOrTrack}`);
  })
);

module.exports = router;