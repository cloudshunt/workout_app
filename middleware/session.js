const session = require("express-session");
const store = require("connect-loki"); //needs to be replaced if looking to scale

const LokiStore = store(session); //replace name if looking to scale

// secure will need to be set to true for production
const sessionConfig = session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000,
    path: "/",
    secure: false,
  },
  name: "workout-app-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "Not secure at all",
  store: new LokiStore({}),
});

module.exports = sessionConfig;