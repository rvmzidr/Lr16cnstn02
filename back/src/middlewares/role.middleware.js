const AppError = require("../utils/app-error");

function requireRole(...rolesAutorises) {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(new AppError("Authentification requise.", 401));
    }

    if (!rolesAutorises.includes(req.auth.role)) {
      return next(new AppError("Vous n'avez pas les droits necessaires.", 403));
    }

    return next();
  };
}

module.exports = requireRole;
