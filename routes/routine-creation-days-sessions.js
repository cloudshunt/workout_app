const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../lib/config");
const {processSessionNames} = require("../lib/helpers");
const router = express.Router();

router.get("/days-sessions-setup", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    let page = +(req.query.page) || 1;
    const offset = (page - 1) * DAYS_PER_PAGE;

    // Fetch the days and sessions for the current page
    const daysAndSessions = await res.locals.store.getDaysAndSessionsForPage(routineId, offset, DAYS_PER_PAGE);
    const availableSessions = await res.locals.store.getSessionsForRoutine(routineId); // Get all sessions

    // Calculates for pagination
    const totalDays = await res.locals.store.countDays(routineId);
    const totalPages = Math.max(Math.ceil(totalDays / DAYS_PER_PAGE), 1);

    // To display routeName on template
    const routineName = await res.locals.store.getRoutineName(routineId);

    // Invalid page input
    if (page > totalPages) {
      req.flash("error", "Invalid page input");
      res.redirect("/days-sessions-setup")
    } else {
      res.render("days-sessions-setup", {
        routineName,
        days: daysAndSessions,
        availableSessions,
        currentPage: page,
        totalPages,
      });
    }
  })
);

router.post("/days-sessions-setup/add-day", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const store = res.locals.store;
    const currentPage = +(req.body.currentPage) || 1;

    // Process and save session names
    const fieldNames = Object.keys(req.body);
    // Insert or Updates session Names
    const validationErrors = await processSessionNames(fieldNames, req, store, routineId);

    if (validationErrors.length > 0) {
      req.flash("error", validationErrors);
      return res.redirect(`/days-sessions-setup?page=${currentPage}`);
    }

    // Add a new day after saving current data
    const totalDays = await store.countDays(routineId);
    await store.addDay(routineId, totalDays);

    // Calculate the page number for the new day
    const newTotalDays = totalDays + 1;
    const newPage = Math.ceil(newTotalDays / DAYS_PER_PAGE);

    res.redirect(`/days-sessions-setup?page=${newPage}`);
  })
);

router.post("/days-sessions-setup/remove-day/:dayNumber", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const dayNumber = +(req.params.dayNumber);
    const currentPage = +(req.body.currentPage) || 1;

    // Delete the specified day and shift subsequent days
    await res.locals.store.deleteDayAndSessionShiftDays(routineId, dayNumber);

    // Calculate the new page after deletion
    const totalDays = await res.locals.store.countDays(routineId);
    const newPage = Math.min(Math.ceil(totalDays / DAYS_PER_PAGE), currentPage);
    res.redirect(`/days-sessions-setup?page=${newPage}`);
  })
);

// Save and Save & Next
router.post("/days-sessions-setup/save", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const action = req.body.action;
    const routineId = req.session.passed_routine_id;
    const store = res.locals.store;
    const currentPage = +(req.body.currentPage) || 1;
    const fieldNames =  Object.keys(req.body);

    // Validate session names
    // Creates a new session for a day or updates the session
    const validationErrors = await processSessionNames(fieldNames, req, store, routineId);
    if (validationErrors.length > 0) {
      req.flash("error", validationErrors);
      return res.redirect(`/days-sessions-setup?page=${currentPage}`);
    }

    // Save data, then redirect
    if (action === "Save") {
      res.redirect(`/days-sessions-setup?page=${currentPage}`);
    } else { // Save & Next
      res.redirect("/routine-overview");
    }
  })
);

// Back
router.post("/days-sessions-setup/back", requiresAuthentication, (req, res) => {
  res.redirect("/routine-naming");
});

// Discard
router.post("/days-sessions-setup/discard", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    await discardRoutineCreation(req, res, routineId);
    res.redirect("/");
  })
);

// Route for "routine-sessions" page to list associated sessions
router.get("/routine-sessions", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;

    // Fetch sessions associated with the routine
    const sessions = await res.locals.store.getSessionsForRoutine(routineId);

    const routineName = await res.locals.store.getRoutineName(routineId);
    res.render("routine-sessions", {
      sessions,
      routineName,
    });
  })
);

router.post("/delete-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;

    // delete session from the routine
    await res.locals.store.deleteSession(routineId, req.body.sessionName);

    res.redirect("/routine-sessions");
  })
);

router.get("/edit-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const oldSessionName = req.query.sessionName;

    res.render("edit-session", {
      oldSessionName
    });
  })
);

router.post("/edit-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    // Future Fix:
    // This section current has a bug, where if I try to edit
    // a session name just to capitalize it, it will say that the
    // session exist already.
    const routineId = req.session.passed_routine_id;
    const oldSessionName = req.body.oldSessionName.trim();
    const newSessionName = req.body.sessionName.trim();

    // Check existance of input session name, b/c routine cannot have duplicate session name
    const existSessionName = await res.locals.store.existSessionName(routineId, newSessionName);

    if (existSessionName && (oldSessionName !== newSessionName)) {
      req.flash("error", "Cannot have duplicate session name within a routine");
      res.render("edit-session", {
        flash: req.flash(),
        oldSessionName
      })
    } else {
      if (oldSessionName !== newSessionName) {
        await res.locals.store.updateSessionName(routineId, oldSessionName, newSessionName);
      }

      res.redirect("/routine-sessions");
    }


  })
);

router.post("/create-new-session", 
  requiresAuthentication,
  [
    body("newSessionName")
      .trim() // Remove leading/trailing whitespace
      .isLength({min: 1, max: 255}) // Set the length constraints
      .withMessage("Session name must be between 1 and 255 characters long")
      .matches(/^[a-zA-Z0-9()+\- ]+$/) // Regex for alphanumeric and allowed symbols
      .withMessage("Session name can only contain letters, numbers, spaces, and the following symbols: +, (, ), -")
  ],
  catchError(async (req, res) => {
    const errors = validationResult(req);
    const routineId = req.session.passed_routine_id;
    const sessionName = req.body.newSessionName.trim();

    // Check existance of input session name, b/c cannot have duplicate in a routine
    const existSessionName = await res.locals.store.existSessionName(routineId, sessionName);

    // Fetch sessions associated with the routine
    const sessions = await res.locals.store.getSessionsForRoutine(routineId);
    
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
    } else if (existSessionName) {
      req.flash("error", "Cannot have duplicate session name within a routine");
    } else {
      await res.locals.store.addSession(routineId, sessionName);
    }

    // Redirect back to the session list page
    res.redirect("/routine-sessions");
  })
);

module.exports = router;