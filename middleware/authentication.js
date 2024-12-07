// Detect unauthorized access to routes.
const requiresAuthentication = (req, res, next) => {
  if (!res.locals.signedIn){

    // Allows users to get to where they want after signin
    req.session.inputURL = req.originalUrl;

    res.redirect(302, "/users/signin");
  } else {
    next();
  }
};

module.exports = requiresAuthentication;