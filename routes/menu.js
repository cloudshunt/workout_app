const express = require("express");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const router = express.Router();

router.get("/", 
  requiresAuthentication,
  catchError( async (req, res) => {
      const username =res.locals.username.trim();
      const selectedRoutine = await res.locals.store.getUserCurrentRoutineName();
  
      if (selectedRoutine) {
        const routineId = await res.locals.store.getSetupRoutineId(selectedRoutine);
        let [dayNumber, sessionNumber] = await res.locals.store.getCurDayNumSessionNum();

        // Rest day check
        let isRestDay = await res.locals.store.isRestDay(routineId, dayNumber, sessionNumber);

        // If the current day is a rest day, shift to the next day until a workout day
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
    const validRoutineName = await res.locals.store.existRoutineName(selectedRoutineName);

    if (!validRoutineName) {
      req.flash('error', 'invalid input');
    } else {
      const userCurrentRoutine = await res.locals.store.getUserCurrentRoutineName();

      if (selectedRoutineName !== userCurrentRoutine) {
        await res.locals.store.markCurrentRoutine(selectedRoutineName);
        await res.locals.store.markInitialDaySession(selectedRoutineName);
      }
    }

    res.redirect("/routine-selection");
  })
);


module.exports = router;