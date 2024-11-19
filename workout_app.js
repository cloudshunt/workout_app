// BEGINNING CHECK POINT
const express = require("express");
const morgan = require("morgan");// morgan is a http request logger
const flash = require("express-flash");
const session = require("./middleware/session");
const catchError = require("./lib/catch-error");
const PgPersistence = require("./lib/pg-persistence")

// middleware
const requiresAuthentication = require("./middleware/authentication");

// Import routes
const authRoutes = require("./routes/auth");
const routineRoutes = require("./routes/routine-creation");
const sessionRoutes = require("./routes/session");
const routineOverviewRoutes = require("./routes/routine-overview");
const exerciseRoutes = require("./routes/exercise");
const routineEditRoutes = require("./routes/routine-edit");
const menuRoutes = require("./routes/menu");


const app = express();
const host = "localhost";
const port = 3001;
const DAYS_PER_PAGE = 3;

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
app.use(exerciseRoutes);
app.use(routineEditRoutes);
app.use(menuRoutes);


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