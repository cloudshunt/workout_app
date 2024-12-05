const config = require("./lib/config");
const express = require("express");
const morgan = require("morgan");// Http request logger
const flash = require("express-flash");
const session = require("./middleware/session"); // Loki Store
const PgPersistence = require("./lib/pg-persistence");

// Import routes
const authRoutes = require("./routes/auth");
const routineRoutes = require("./routes/routine-creation");
const sessionRoutes = require("./routes/routine-creation-days-sessions");
const routineOverviewRoutes = require("./routes/routine-overview");
const setupSessionExercisesRoutes = require("./routes/routine-creation-session-exercises");
const exerciseRoutes = require("./routes/exercise");
const routineEditRoutes = require("./routes/routine-edit");
const menuRoutes = require("./routes/menu");
const trackWorkoutRoutes = require("./routes/track-workout");
const recordRoutes = require("./routes/records");

// Configuration
const app = express();
const host = config.HOST;
const port = config.PORT;

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));// extract info from body, POST requests

app.use(session);
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

// Use routes
app.use(authRoutes);
app.use(routineRoutes);
app.use(sessionRoutes);
app.use(routineOverviewRoutes);
app.use(setupSessionExercisesRoutes);
app.use(exerciseRoutes);
app.use(routineEditRoutes);
app.use(menuRoutes);
app.use(trackWorkoutRoutes);
app.use(recordRoutes);


// catch all route to address invalid routes
app.use((req, res) => {
  req.flash("error","Invalid route");
  res.redirect("/");
});


// Error handler
app.use((err, req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log

  // err.message should be changed when i'm looking to deploy the app,
  // b/c users shouldn't be able to see any internal error message
  res.status(404).send(err.message); 
  // flash("error", "invalid operation");
  // res.redirect("/");
});

// Listener
app.listen(port, host, () => {
  console.log(`Workout App is listening on port ${port} of ${host}!`);
});