const express = require("express");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const {RECORDS_PER_PAGE, TIME_ZONE} = require("../lib/config");
const router = express.Router();


router.get("/records-menu", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    // Future: changed to calendar grid view
    // Now: list all historical workout records with pagination
    /*
      A list of past records with date, routine name, day num,
    session name with pagination of x. User can click on
      them to for view only. 
    */

    const workouts = await res.locals.store.getTrackRecords();

    // Pagination settings
    const page = (typeof req.query.page) === "undefined" ? 1: +(req.query.page);

    // Page validation
    if (!Number.isInteger(page) || page <= 0) {
      req.flash("error", "Invalid page input");
      return res.redirect("/records-menu");
    }

    const totalWorkouts = workouts.length;
    const totalPages = Math.max(Math.ceil(totalWorkouts / RECORDS_PER_PAGE), 1);

    if (page > totalPages) {
      req.flash("error", "Invalid page input");
      res.redirect("/records-menu");
    } else {
      // // Extract days for the current page
      const offset = (page - 1) * RECORDS_PER_PAGE;  
      const paginatedRecords = workouts.slice(offset, offset + RECORDS_PER_PAGE);
      paginatedRecords.forEach(workout => {
        workout.display_date = extractDate(workout.completion_date);
      })

      // console.log(JSON.stringify(paginatedRecords, null, 2));

      res.render("track-workout-records", {
        workouts: paginatedRecords,
        currentPage: page,
        totalPages,
      });
    }
  })
);

router.get("/workout-details", 
  requiresAuthentication, 
  catchError(async (req, res) => {
    const completionDate = req.query.completionDate;
    const displayDate = req.query.displayDate;
    const routineName = req.query.routineName;
    const dayNumber = req.query.dayNumber;
    const sessionName = req.query.sessionName;
    
    const exercises = await res.locals.store.getRecordSessionDetails(
      routineName,
      completionDate,
      dayNumber,
      sessionName
    );
    
    res.render("track-workout-record", {routineName, dayNumber, sessionName, displayDate, exercises});
  })
);


function extractDate(utcDateTime) {
  // Input example: "2024-11-29T18:10:04.743Z"
  // Convert to PST and format as date-only
  const displayDate = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcDateTime));
  
  // Return example: "11/29/2024"
  return displayDate;
}



module.exports = router;