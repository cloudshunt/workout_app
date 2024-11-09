const express = require("express");
const morgan = require("morgan");// morgan is a http request logger
const flash = require("express-flash");
const session = require("express-session");
const {body, validationResult} = require("express-validator");
const store = require("connect-loki"); //needs to be replaced if looking to scale
const PgPersistence = require("./lib/pg-persistence")
const catchError = require("./lib/catch-error");

const app = express();
const host = "localhost";
const port = 3001;
const LokiStore = store(session); //replace name if looking to scale
const DAYS_PER_PAGE = 3;

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

const extractDayNumSessionNumFromFieldName = (fieldName) => {
  const extractDayNum = (fieldName) => {
    const regex = /day(\d+)_/;
    return fieldName.match(regex)[1];
  };
  
  const extractSessionNum = (fieldName) => {
    const regex = /session(\d+)/;;
    return fieldName.match(regex)[1];
  }
  return [extractDayNum(fieldName), extractSessionNum(fieldName)];
}

// Detect unauthorized access to routes.
const requiresAuthentication = (req, res, next) => {
  if (!res.locals.signedIn){
    res.redirect(302, "/users/signin");
  } else {
    next();
  }
};

//clear routine_id in session meant for creation
const discardRoutineCreation = async (req, res, routineId) => {
  await res.locals.store.dropRoutine(routineId);
  delete req.session.passed_routine_id; //clear routine_id in session meant for creation
}

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

app.get("/routine-naming",
  requiresAuthentication,
  // in here i will extract info from passed_routine_id.
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
  
)

//now needs a post request for /routine-naming
app.post("/routine-naming",
  requiresAuthentication, //make sure bad actors dont come and make changes 
  [
    body("routineName")
      .trim() // Remove leading/trailing whitespace
      .isLength({min: 1, max: 100}) // Set the length constraints
      .withMessage("Routine name must be between 1 and 255 characters long")
  ],
  catchError( async (req,res) => {
      const errors = validationResult(req);
      const routineId = req.session.passed_routine_id;
      const action = req.body.action; // this will be "Save","Discard" or "Next"
      let inputRoutineName = req.body.routineName.trim();
      let routineName = await res.locals.store.getRoutineName(routineId);

      const rerenderNamingPage = () => {
        res.render("routine-naming", {
          routineName: inputRoutineName,
          flash: req.flash()
        });
      };
      
      if (action === 'Discard') {
        discardRoutineCreation(req, res, routineId);
        res.redirect("/");

      } else { //action === Save OR action === "Save & Next"

        if (!errors.isEmpty()) {
          errors.array().forEach(message => req.flash("error", message.msg));
          rerenderNamingPage();

        } else if (
            await res.locals.store.otherExistsRouteName(
              routineId, 
              inputRoutineName, 
              routineName
            )
          ) {
            req.flash("error", "The routine name must be unique.");
            rerenderNamingPage();

        } else {   
          await res.locals.store.setRoutineName(inputRoutineName, routineId);
          
          if (action === 'Save') {
            rerenderNamingPage();
          } else { // action === 'Save & Next'
            res.redirect('/routine-schedule-setup')
          }

        }
      }
    }
  )
  
)

// will need to address
app.get("/edit-routine",
  (req, res, next) => {
    try {
      print('bro');
    } catch(error) {
      next(error);
    }
  }
)

app.get("/routine-schedule-setup", 
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

    res.render("routine-schedule-setup", {
      days: daysAndSessions,
      availableSessions, // Pass available sessions to the template
      currentPage: page,
      totalPages,
    });
  })
);



// Helper function to process session names and validate them
async function processSessionNames(fieldNames, req, store, routineId) {
  // note: if this happens before any days exist, nothing occurs
  let validationErrors = [];

  let dayNumAndSessionNumArr = fieldNames.filter(fieldName => fieldName.slice(0, 3) === 'day');

  let dayNumSessionNumSessionNameArr = dayNumAndSessionNumArr.map(fieldName => {
    let [dayNum, sessionNum] = extractDayNumSessionNumFromFieldName(fieldName);
    let sessionName = req.body[fieldName].trim();
    return {dayNum, sessionNum, sessionName}
  })

  for (let daySession of dayNumSessionNumSessionNameArr) {
    let sessionName = daySession.sessionName;
    let sessionNum = daySession.sessionNum;
    let dayNum = daySession.dayNum;

    // Validate session name
    if (sessionName === '') {
      validationErrors.push(`Must select a Session Name for day ${dayNum}`);
      break;
    } else {
      // If valid, insert or update the session name
      await store.updateDaysSessionName(routineId, +dayNum, +sessionNum, sessionName);
    }

  }

  return validationErrors;
}

app.post("/routine-schedule-setup/add-day", requiresAuthentication, catchError(async (req, res) => {
  const routineId = req.session.passed_routine_id;
  const store = res.locals.store;
  const currentPage = parseInt(req.body.currentPage, 10) || 1;

  // Process and save session names
  const fieldNames = Object.keys(req.body);
  const validationErrors = await processSessionNames(fieldNames, req, store, routineId);

  if (validationErrors.length > 0) {
    req.flash("error", validationErrors);
    return res.redirect(`/routine-schedule-setup?page=${currentPage}`);
  }

  // Add a new day after saving current data
  const totalDays = await store.countDays(routineId);
  await store.addDay(routineId, totalDays);

  // Calculate the page number for the new day
  const newTotalDays = totalDays + 1;
  const newPage = Math.ceil(newTotalDays / DAYS_PER_PAGE);

  // Redirect to the appropriate page
  res.redirect(`/routine-schedule-setup?page=${newPage}`);
}));


app.post("/routine-schedule-setup/remove-day/:dayNumber", requiresAuthentication, catchError(async (req, res) => {
  const routineId = req.session.passed_routine_id;
  const dayNumber = parseInt(req.params.dayNumber, 10);
  const currentPage = parseInt(req.body.currentPage, 10) || 1;

  // Delete the specified day and shift subsequent days
  await res.locals.store.deleteDayAndSessionShiftDays(routineId, dayNumber);

  // Calculate the new page after deletion
  const totalDays = await res.locals.store.countDays(routineId);
  const newPage = Math.min(Math.ceil(totalDays / DAYS_PER_PAGE), currentPage);
  res.redirect(`/routine-schedule-setup?page=${newPage}`);
}));

// Save and Save & Next
app.post("/routine-schedule-setup/save", requiresAuthentication, catchError(async (req, res) => {
  const action = req.body.action;
  const routineId = req.session.passed_routine_id;
  const store = res.locals.store;
  const currentPage = parseInt(req.body.currentPage, 10) || 1;
  const fieldNames =  Object.keys(req.body);

  // Process and validate session names
  const validationErrors = await processSessionNames(fieldNames, req, store, routineId);
  if (validationErrors.length > 0) {
    req.flash("error", validationErrors);
    return res.redirect(`/routine-schedule-setup?page=${currentPage}`);
  }

  // Save data, then redirect
  if (action === "Save") {
    res.redirect(`/routine-schedule-setup?page=${currentPage}`);
  } else { // Save & Next
    res.redirect("/sessions-exercises-setup");
  }
}));

// Back
app.post("/routine-schedule-setup/back", requiresAuthentication, (req, res) => {
  res.redirect("/routine-naming");
});

// Discard
app.post("/routine-schedule-setup/discard", requiresAuthentication, catchError(async (req, res) => {
  const routineId = req.session.passed_routine_id;
  await discardRoutineCreation(req, res, routineId);
  res.redirect("/");
}));



// Route for "routine-sessions" page to list associated sessions
app.get("/routine-sessions", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;

    // Fetch sessions associated with the routine
    const sessions = await res.locals.store.getSessionsForRoutine(routineId);

    res.render("routine-sessions", {
      sessions,
    });
  })
);

app.post("/delete-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;

    // delete session from the routine
    await res.locals.store.deleteSession(routineId, req.body.sessionName);

    res.redirect("/routine-sessions");
  })
);

app.get("/edit-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const oldSessionName = req.query.sessionName; // Use query parameters for GET

    res.render("edit-session", {
      oldSessionName
    });
  })
);

app.post("/edit-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const oldSessionName = req.body.oldSessionName.trim();
    const newSessionName = req.body.sessionName.trim();

    // check existance of input session name, b/c cannot have duplicate in a session
    const existSessionName = await res.locals.store.existSessionName(routineId, newSessionName);

    if (existSessionName && (oldSessionName !== newSessionName)) {
      req.flash("error", "Cannot have duplicate session name within a routine");
      res.render("edit-session", {
        flash: req.flash(),
        oldSessionName
      })
    } else {

      if (oldSessionName !== newSessionName) {
        // Update the session name in the routine
        await res.locals.store.updateSessionName(routineId, oldSessionName, newSessionName);
      }

      // Redirect back to the session list page
      res.redirect("/routine-sessions");
    }


  })
);

// workout_app.js
app.post("/create-new-session", 
  requiresAuthentication,
  catchError(async (req, res) => {
    const routineId = req.session.passed_routine_id;
    const sessionName = req.body.newSessionName.trim();

    // check existance of input session name, b/c cannot have duplicate in a routine
    const existSessionName = await res.locals.store.existSessionName(routineId, sessionName);

    // Fetch sessions associated with the routine
    const sessions = await res.locals.store.getSessionsForRoutine(routineId);
    const rerender = () => {
      res.render("routine-sessions", {
        flash: req.flash(),
        sessions
      })
    };

    // Ensure session name isn't empty
    if (!sessionName) {
      req.flash("error", "Session name cannot be empty.");
      rerender();
    } else if (existSessionName) {
      req.flash("error", "Cannot have duplicate session name within a routine");
      rerender();
    } else {
      // Add the session to the database
      await res.locals.store.addSession(routineId, sessionName);

      // Redirect back to the session list page
      res.redirect("/routine-sessions");
 
    }


  })
);





// IN PROGRESS
app.get("/sessions-exercises-setup",
  requiresAuthentication,
  catchError(async (req, res) => {
    const action = req.body.action;
    const routineId = req.session.passed_routine_id;
    const store = res.locals.store;

    if (action === "Discard") {
      discardRoutineCreation(req, res, routineId);
      return res.redirect("/");
    } else if (action === "Back") {
      return res.redirect("/routine-schedule-setup"); 
    } else { 
      console.log("something")
    }
  })
);


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