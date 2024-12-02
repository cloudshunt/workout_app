const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const router = express.Router();

router.get("/routine-edit",
  requiresAuthentication,
  catchError( async (req, res) => {
    const userRoutines = await res.locals.store.getUserRoutines();
    res.render("routine-edit-selection", {userRoutines});
  })
);

router.post("/routine-edit",
  requiresAuthentication,
  [
    body("routineName")
    .notEmpty()
    .withMessage("Please select an option")
  ],
  catchError( async (req, res) => {
    const errors = validationResult(req);
    const routineName = req.body.routineName;
  
    const validRoutineName = await res.locals.store.existRoutineName(routineName);

    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.redirect("/routine-edit");
    } else if (!validRoutineName) {
      req.flash('error', 'invalid input');
      res.redirect("/routine-edit");
    } else {
      const routineId = await res.locals.store.getSetupRoutineId(routineName);
      
      await res.locals.store.markRoutineEditInProgress(routineId);
  
      // set up some session's info
      req.session.passed_routine_id = routineId;
      req.session.routineEditInProgress = true;
      res.redirect("/routine-overview");
    }
  })
)

module.exports = router;