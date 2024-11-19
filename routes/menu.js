const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../config");
const processSessionNames = require("../lib/helpers");
const router = express.Router();

router.get("/", 
  requiresAuthentication,
  async (req, res) => {
    const username =res.locals.username.trim();
    const selectedRoutine = await res.locals.store.getUserCurrentRoutine();

    // console.log("CHECKPOINT alpha");
    // console.log(selectedRoutine);
    res.render("main", {
      username,
      selectedRoutine
    });
  }
);

router.get("/routines-menu", 
  requiresAuthentication,
  async (req, res) => {
    res.render("routines-menu");
  }
);


router.get("/routine-selection",
  requiresAuthentication,
  catchError( async (req, res) => {
    const userRoutines = await res.locals.store.getUserRoutines();
    const userCurrentRoutine = await res.locals.store.getUserCurrentRoutineName();
    res.render("routine-selection", {userRoutines, userCurrentRoutine});
  })
);

router.post("/routine-selection",
  requiresAuthentication,
  catchError( async (req, res) => {
    const selectedRoutineName = req.body.routineName;
    const userCurrentRoutine = await res.locals.store.getUserCurrentRoutineName();

    if (selectedRoutineName !== userCurrentRoutine) {
      await res.locals.store.markCurrentRoutine(selectedRoutineName);
    }

    res.redirect("/routine-selection");
  })
);


module.exports = router;