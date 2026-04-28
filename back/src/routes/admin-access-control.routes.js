const express = require("express");
const accessControlController = require("../controllers/access-control.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const { ADMIN_ROLES } = require("../config/constants");
const { requireModuleAccess, requirePermission } = require("../middlewares/access-control.middleware");
const {
  accessProfileIdParamSchema,
  accessUserIdParamSchema,
  accessProfilesQuerySchema,
  userAccessUsersQuerySchema,
  accessProfileCreateBodySchema,
  accessProfileUpdateBodySchema,
  accessProfileStatusBodySchema,
  assignUserAccessProfileBodySchema,
  userAccessOverridesBodySchema,
  userAccessUpdateBodySchema,
} = require("../validators/access-control.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...ADMIN_ROLES));
router.use(requireModuleAccess("access_control"));
router.use(requirePermission("canManageAccessProfiles"));

router.get(
  "/user-access/summary",
  accessControlController.getUserAccessSummary,
);

router.get(
  "/user-access/users",
  validate({ query: userAccessUsersQuerySchema }),
  accessControlController.listUserAccessUsers,
);

router.get(
  "/user-access/users/:id",
  validate({ params: accessUserIdParamSchema }),
  accessControlController.getUserAccessContext,
);

router.patch(
  "/user-access/users/:id",
  validate({ params: accessUserIdParamSchema, body: userAccessUpdateBodySchema }),
  accessControlController.updateUserAccess,
);

router.post(
  "/user-access/users/:id/reset",
  validate({ params: accessUserIdParamSchema }),
  accessControlController.resetUserAccess,
);

router.get(
  "/access-profiles",
  validate({ query: accessProfilesQuerySchema }),
  accessControlController.listAccessProfiles,
);

router.post(
  "/access-profiles",
  validate({ body: accessProfileCreateBodySchema }),
  accessControlController.createAccessProfile,
);

router.get(
  "/access-profiles/:id",
  validate({ params: accessProfileIdParamSchema }),
  accessControlController.getAccessProfileDetail,
);

router.patch(
  "/access-profiles/:id",
  validate({ params: accessProfileIdParamSchema, body: accessProfileUpdateBodySchema }),
  accessControlController.updateAccessProfile,
);

router.post(
  "/access-profiles/:id/duplicate",
  validate({ params: accessProfileIdParamSchema }),
  accessControlController.duplicateAccessProfile,
);

router.patch(
  "/access-profiles/:id/status",
  validate({ params: accessProfileIdParamSchema, body: accessProfileStatusBodySchema }),
  accessControlController.updateAccessProfileStatus,
);

router.get(
  "/access-profiles/:id/users",
  validate({ params: accessProfileIdParamSchema, query: accessProfilesQuerySchema }),
  accessControlController.listAccessProfileUsers,
);

router.post(
  "/users/:id/access-profile",
  validate({ params: accessUserIdParamSchema, body: assignUserAccessProfileBodySchema }),
  accessControlController.assignAccessProfileToUser,
);

router.get(
  "/users/:id/access-context",
  validate({ params: accessUserIdParamSchema }),
  accessControlController.getUserAccessContext,
);

router.patch(
  "/users/:id/access-overrides",
  validate({ params: accessUserIdParamSchema, body: userAccessOverridesBodySchema }),
  accessControlController.replaceUserAccessOverrides,
);

router.get(
  "/access-preview/profile/:id",
  validate({ params: accessProfileIdParamSchema }),
  accessControlController.previewAccessProfile,
);

router.get(
  "/access-preview/user/:id",
  validate({ params: accessUserIdParamSchema }),
  accessControlController.previewAccessUser,
);

module.exports = router;
