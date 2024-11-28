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
  catchError( async (req, res) => {
      const username =res.locals.username.trim();
      const selectedRoutine = await res.locals.store.getUserCurrentRoutineName();
  
      
      if (selectedRoutine) {
        const routineId = await res.locals.store.getSetupRoutineId(selectedRoutine);
        let [dayNumber, sessionNumber] = await res.locals.store.getCurDayNumSessionNum();

        // rest day check
        let isRestDay = await res.locals.store.isRestDay(routineId, dayNumber, sessionNumber);
        console.log("CHECKPOINT zelda");
        console.log(isRestDay);

        while(isRestDay) {
          await res.locals.store.shiftUserToNextDaySession(routineId);
          [dayNumber, sessionNumber] = await res.locals.store.getCurDayNumSessionNum();
          isRestDay = await res.locals.store.isRestDay(routineId, dayNumber, sessionNumber);
        }
        
  
        const sessionName = await res.locals.store.getSessionName(routineId, dayNumber, sessionNumber);
  
        res.render("main", {
          username,
          selectedRoutine,
          dayNumber,
          sessionName
        });
      } else {
        res.render("main", {
          username,
        });    
      } 
    })
);

router.get("/routines-menu", requiresAuthentication,
  catchError( async (req, res) => {
    const userCurrentRoutine = await res.locals.store.getUserCurrentRoutineName();
      res.render("routines-menu", {userCurrentRoutine});
    })
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
      await res.locals.store.markInitialDaySession(selectedRoutineName);
    }

    res.redirect("/routine-selection");
  })
);


module.exports = router;