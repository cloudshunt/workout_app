const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../config");
const router = express.Router();

router.post("/setup-routine",
  requiresAuthentication,
  catchError( async (req, res) => {
    // the following could be utilize to check every page to make sure
    // there isn't incomplete routine creation hanging out there, and
    // will ask user to either go and complete it or discard it
    let routineId = await res.locals.store.getIncompleteRoutineId();

    if (!routineId) {
      // Establish new routine actions:
      // create new row
      await res.locals.store.createInitialSetupRoutine();
      let initialRoutineId = await res.locals.store.getInitialRoutineId();

      // This allows us to utilize routineId in /routine-naming
      req.session.passed_routine_id = initialRoutineId;
      res.redirect("/routine-naming");
    } else {
      // under CONSTURCTION
      // This is meant for edit routine
      // This allows us to utilize routineId in /routine-naming
      req.session.passed_routine_id = routineId;
      res.redirect("/routine-naming");
    }
  }) 
)


// What happens if user/non-user copy and paste link
// for setup-routine
// This an invalid link, therefore reroute
router.get("/setup-routine", (req, res) => {
  res.redirect("/");
});



router.get("/routine-naming",
  requiresAuthentication,
  catchError(
    async (req,res) => {
      // extract passed routine_id
      let routineId = req.session.passed_routine_id;
      let routineName = await res.locals.store.getRoutineName(routineId);
      
      res.render("routine-naming", {
        routineName
      });

    }
  ) 
);

// POST request to handle routine naming
router.post(
  "/routine-naming",
  requiresAuthentication, // Ensure user is authenticated
  [
    // Validation rules for routineName
    body("routineName")
      .trim() // Remove leading/trailing whitespace
      .isLength({ min: 1, max: 100 }) // Ensure length constraints
      .withMessage("Routine name must be between 1 and 255 characters long"),
  ],
  catchError(async (req, res) => {
    // Extract data from request
    const errors = validationResult(req);
    const routineId = req.session.passed_routine_id;
    const action = req.body.action; // "Save", "Discard", or "Next"
    const inputRoutineName = req.body.routineName.trim();
    const routineName = await res.locals.store.getRoutineName(routineId);

    // Helper function to re-render the page with flash messages
    const rerenderNamingPage = () => {
      res.render("routine-naming", {
        routineName: inputRoutineName,
        flash: req.flash(),
      });
    };

    // Handle "Discard" action
    if (action === "Discard") {
      await discardRoutineCreation(req, res, routineId);
      return res.redirect("/");
    }

    // Handle "Save" and "Save & Next" actions
    if (!errors.isEmpty()) {
      errors.array().forEach((message) => req.flash("error", message.msg));
      return rerenderNamingPage();
    }

    if (await res.locals.store.otherExistsRouteName(inputRoutineName)) {
      req.flash("error", "The routine name must be unique.");
      return rerenderNamingPage();
    }

    await res.locals.store.setRoutineName(inputRoutineName, routineId);

    // Redirect or re-render based on the action
    if (action === "Save") {
      return rerenderNamingPage();
    } else {
      return res.redirect("/days-sessions-setup"); // "Save & Next"
    }
  })
);


router.get("/days-sessions-setup", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * DAYS_PER_PAGE;

    // Fetch the days and sessions for the current page
    const daysAndSessions = await res.locals.store.getDaysAndSessionsForPage(routineId, offset, DAYS_PER_PAGE);
    const availableSessions = await res.locals.store.getSessionsForRoutine(routineId); // Get all sessions

    // Calculate total number of pages
    const totalDays = await res.locals.store.countDays(routineId);
    const totalPages = Math.max(Math.ceil(totalDays / DAYS_PER_PAGE), 1);

    // to display routeName on tempalte
    const routineName = await res.locals.store.getRoutineName(routineId);

    res.render("days-sessions-setup", {
      routineName,
      days: daysAndSessions,
      availableSessions,
      currentPage: page,
      totalPages,
    });
  })
);




module.exports = router;