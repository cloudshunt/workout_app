const express = require("express");
const { body, validationResult } = require("express-validator");
const requiresAuthentication = require("../middleware/authentication");
const catchError = require("../lib/catch-error");
const { discardRoutineCreation } = require("../lib/routine-utils");
const {DAYS_PER_PAGE} = require("../config");
const processSessionNames = require("../lib/helpers");
const router = express.Router();


router.get("/records-menu", requiresAuthentication, catchError(async (req, res) => {
  // Future: changed to calendar grid view
  // Now: list all historical workout records with pagination
  /*
  a list of past records with date, routine name, day num,
   session name with pagination of 10. User can click on
    them to for view only. 
   */

    
  res.render("track-workout-history")
}));





module.exports = router;