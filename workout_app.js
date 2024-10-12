const express = require("express");
const morgan = require("morgan");// morgan is a http request logger
const flash = require("express-flash");
const session = require("express-session");

const store = require("connect-loki"); //needs to be replaced if looking to scale
const PgPersistence = require("./lib/pg-persistence")
const catchError = require("./lib/catch-error");

const app = express();
const host = "localhost";
const port = 3001;
const LokiStore = store(session); //replace name if looking to scale

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));// extract info from body, POST requests

// secure will need to be set to true for production
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/",
    secure: false,
  },
  name: "workout-app-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "Not secure at all",
  store: new LokiStore({}),
}));

app.use(flash());

// Create a new datastore
app.use((req, res, next) => {
  res.locals.store = new PgPersistence(req.session);
  next();
});

// Extract session info
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;

  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Detect unauthorized access to routes.
const requiresAuthentication = (req, res, next) => {
  if (!res.locals.signedIn){
    res.redirect(302, "/users/signin");
  } else {
    next();
  }
};

app.get("/", 
  requiresAuthentication,
  (req, res) => {
    let username =res.locals.username.trim();
    res.render("main", {
      username
    });
  }
);

app.post("/setup-routine",
  requiresAuthentication,
  catchError( async (req, res) => {
    // the following could be utilize to check every page to make sure
    // there isn't incomplete routine creation hanging out there, and
    // will ask user to either go and complete it or discord it
    let routineId = await res.locals.store.getIncompleteRoutineId();

    // TEMP for testing purpose
    routineId = null;
    // since there isn't an incomplete routine setup in progress
    // We will create new routine
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
      res.render("setup-routine") //say good bye to this
    }
  }) 
)

// What happens if user/non-user copy and paste link
// for setup-routine
// This an invalid link, therefore reroute
app.get("/setup-routine", (req, res) => {
  res.redirect("/");
})

// CURRENTLY here for 10/10/24
app.get("/routine-naming",
  requiresAuthentication,
  // in here i will extract info from passed_routine_id,
  // then delete it from session
  catchError(
    (req,res) => {
      // extract passed routine_id
      let routine_id = req.session.passed_routine_id;
      
      res.render("routine-naming");
      // within the template i will need display, fields and submit
      // reference draw.io for the concept
    }
  )
  
)

app.get("/edit-routine",
  (req, res, next) => {
    try {
      print('bro');
    } catch(error) {
      next(error);
    }
  }
)

// Render the Signin Page
app.get("/users/signin", (req, res) => {
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
app.post("/users/signin",
  catchError(async (req, res) => {
    let username = req.body.username.trim();
    let password = req.body.password;
  
    let authenticated = await res.locals.store.authenticate(username, password);
    if (!authenticated) {
      req.flash("error", "Invalid credentials.");
      res.render("signin", {
        flash: req.flash(),
        username: req.body.username,
      });
    } else {
      req.session.username = username;
      req.session.signedIn = true;
      req.session.userId = await res.locals.store.getUserId(username);
      req.flash("info", "Welcome");
      res.redirect("/");
    }
  })
);


app.post("/users/signout", (req, res) => {
  delete req.session.username;
  delete req.session.signedIn;
  // req.flash("info", "You have signed out")
  res.redirect("/users/signin");
})


// Error handler
app.use((err, req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log

  // err.message should be changed when i'm looking to deploy the app,
  // b/c users shouldn't be able to see any internal error message
  res.status(404).send(err.message); 
  // res.status(404).send("Oh no, an error has occured"); 
});

// Listener
app.listen(port, host, () => {
  console.log(`Workout App is listening on port ${port} of ${host}!`);
});