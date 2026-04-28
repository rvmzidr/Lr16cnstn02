const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async-handler");
const accessControlService = require("../services/access-control.service");

async function hydrateAccessContext(req) {
  if (!req?.auth?.userId) {
    throw new AppError("Authentification requise.", 401);
  }

  if (!req.accessControl) {
    req.accessControl = await accessControlService.getEffectiveAccessForRequest(
      req.auth.userId,
    );
  }

  return req.accessControl;
}

function requireModuleAccess(moduleKey) {
  return asyncHandler(async (req, _res, next) => {
    const access = await hydrateAccessContext(req);

    if (!access.moduleVisibility[moduleKey]) {
      throw new AppError(`Acces refuse au module ${moduleKey}.`, 403);
    }

    next();
  });
}

function requirePermission(permissionKey) {
  return asyncHandler(async (req, _res, next) => {
    const access = await hydrateAccessContext(req);

    if (!access.permissionAccess[permissionKey]) {
      throw new AppError(`Permission refusee: ${permissionKey}.`, 403);
    }

    next();
  });
}

module.exports = {
  requireModuleAccess,
  requirePermission,
};
