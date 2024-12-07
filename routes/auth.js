const express = require("express");
const catchError = require("../lib/catch-error");
const requiresAuthentication = require("../middleware/authentication");
const router = express.Router();
const createOrEditRoutes = [
  "/routine-naming",
  "/days-sessions-setup",
  "/routine-sessions",
  "/exercise-list",
  "/routine-overview",
  "/session-exercises-setup/session/"
];

const intraWorkoutRoute = ["/track-intra-workout"];

// Render the Signin Page
router.get("/users/signin", (req, res) => {
  if (res.locals.signedIn === true) {
    res.redirect("/");
  } else {
    req.flash("info", "Please sign in.");
    res.render("signin", {
      flash: req.flash(),
    });
  }
});

// Handle Signin form submission
router.post("/users/signin",
  catchError(async (req, res) => {
    let username = req.body.username.trim();
    let password = req.body.password;
  
    let authenticated = await res.locals.store.authenticate(username, password);
    if (!authenticated) {
      req.flash("error", "Invalid credentials.");
      res.render("signin", {
        flash: req.flash()
      });
    } else {
      req.session.username = username;
      req.session.signedIn = true;
      req.session.userId = await res.locals.store.getUserId(username);

      // User input a link without being signed in, redirect to the url that was inputted before
      // signining in.
      const userOriginalUrl = req.session.inputURL;
      delete req.session.inputURL;
      req.flash("info", "Welcome");
      if (userOriginalUrl) {
        if (userOriginalUrl === intraWorkoutRoute[0]) {
          req.flash("info", "Looks like you are trying to start a workout, click start workout to do so");
          return res.redirect("/");
        }

        const isMatch = createOrEditRoutes.some(route => userOriginalUrl.includes(route));

        if (isMatch) {
          return res.redirect("/actions-inquiry");
        }

        res.redirect(userOriginalUrl);
      } else {
        res.redirect("/");
      }
    }
  })
);

router.get("/actions-inquiry", 
  requiresAuthentication,
  catchError( (req, res) => {
    req.flash("info", "Looks like you are trying to either create or edit a routine");
    return res.render("actions-inquiry", {flash: req.flash()});
  })
)


router.post("/users/signout", (req, res) => {
  delete req.session.username;
  delete req.session.signedIn;
  res.redirect("/users/signin");
})

module.exports = router;