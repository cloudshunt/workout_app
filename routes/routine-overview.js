/*
  NOTE: 
  This section is utilized by:
  - routine creation section
  - routine editing section
 */
const express = require("express");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../lib/config");
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
    const page = +(req.query.page) || 1;

    // Fetch all days and their sessions
    const allDaysSessions = await res.locals.store.getDaysSessionsDetails(routineId);

    // Pagination settings
    const totalDays = allDaysSessions.length;
    const totalPages = Math.max(Math.ceil(totalDays / DAYS_PER_PAGE), 1);

    // Extract days for the current page
    const offset = (page - 1) * DAYS_PER_PAGE;
    const paginatedDays = allDaysSessions.slice(offset, offset + DAYS_PER_PAGE);

    const routineName = await res.locals.store.getRoutineName(routineId);

    // Used in template to check if the current routine being created or is being edited.
    const routineEditInProgress = req.session.routineEditInProgress;

    if (page > totalDays) {
      req.flash("error", "Invalid page input");
      res.redirect("/routine-overview");
    } else {
      res.render("routine-overview", {
        routineName,
        days: paginatedDays,
        currentPage: page,
        totalPages,
        routineEditInProgress,
      });
    }

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

router.post("/routine-overview/complete",
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    
    // delete any sesssion value associated with routine creation
    delete req.session.passed_routine_id;

    // Routine editing uses routineEditInProgress,
    // Set the flag to false in db and then delete the associated session
    if (req.session.routineEditInProgress) {
      await res.locals.store.turnOffEditInProgress(routineId);
      delete req.session.routineEditInProgress;
    } else { //Initial routine creation compelete
      await res.locals.store.markRoutineCreationStatusComplete(routineId);
    }

    res.redirect("/");
  })
);

module.exports = router;