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
  (req, res) => {
    let username =res.locals.username.trim();
    res.render("main", {
      username
    });
  }
);


module.exports = router;