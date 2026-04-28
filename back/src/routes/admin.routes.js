const express = require("express");
const adminController = require("../controllers/admin.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const {
  requireModuleAccess,
  requirePermission,
} = require("../middlewares/access-control.middleware");
const validate = require("../middlewares/validate.middleware");
const { ADMIN_ROLES } = require("../config/constants");
const {
  adminNotificationsQuerySchema,
  adminPasswordUpdateBodySchema,
  adminPreferencesBodySchema,
  adminProfileUpdateBodySchema,
  changerRoleBodySchema,
  compteIdParamSchema,
  comptesQuerySchema,
  inscriptionIdParamSchema,
  inscriptionsQuerySchema,
  refuserInscriptionBodySchema,
  validerInscriptionBodySchema,
} = require("../validators/admin.validators");
const {
  notificationIdParamSchema,
} = require("../validators/collaboration.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...ADMIN_ROLES));

router.get(
  "/dashboard",
  requireModuleAccess("dashboard_home"),
  adminController.getDashboardKPIs,
);

router.get(
  "/inscriptions",
  requireModuleAccess("admin_registrations"),
  validate({ query: inscriptionsQuerySchema }),
  adminController.listInscriptions,
);
router.get(
  "/inscriptions/:id",
  requireModuleAccess("admin_registrations"),
  validate({ params: inscriptionIdParamSchema }),
  adminController.getInscriptionDetail,
);
router.patch(
  "/inscriptions/:id/valider",
  requireModuleAccess("admin_registrations"),
  validate({
    params: inscriptionIdParamSchema,
    body: validerInscriptionBodySchema,
  }),
  adminController.validerInscription,
);
router.patch(
  "/inscriptions/:id/refuser",
  requireModuleAccess("admin_registrations"),
  validate({
    params: inscriptionIdParamSchema,
    body: refuserInscriptionBodySchema,
  }),
  adminController.refuserInscription,
);

router.get(
  "/comptes",
  requireModuleAccess("admin_users"),
  validate({ query: comptesQuerySchema }),
  adminController.listComptes,
);
router.patch(
  "/comptes/:id/activer",
  requireModuleAccess("admin_users"),
  requirePermission("canManageUsers"),
  validate({ params: compteIdParamSchema }),
  adminController.activerCompte,
);
router.patch(
  "/comptes/:id/desactiver",
  requireModuleAccess("admin_users"),
  requirePermission("canManageUsers"),
  validate({ params: compteIdParamSchema }),
  adminController.desactiverCompte,
);
router.patch(
  "/comptes/:id/role",
  requireModuleAccess("admin_roles"),
  requirePermission("canChangeRole"),
  validate({ params: compteIdParamSchema, body: changerRoleBodySchema }),
  adminController.changerRole,
);
router.get(
  "/comptes/:id/attestation-doctorant",
  requireModuleAccess("admin_users"),
  validate({ params: compteIdParamSchema }),
  adminController.downloadDoctorantAttestation,
);

router.get(
  "/notifications",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ query: adminNotificationsQuerySchema }),
  adminController.listNotifications,
);
router.get(
  "/notifications/unread-count",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  adminController.getUnreadNotificationsCount,
);
router.patch(
  "/notifications/:id/read",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ params: notificationIdParamSchema }),
  adminController.markNotificationAsRead,
);
router.patch(
  "/notifications/read-all",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  adminController.markAllNotificationsAsRead,
);
router.patch(
  "/notifications/:id/lire",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ params: notificationIdParamSchema }),
  adminController.markNotificationAsRead,
);
router.patch(
  "/notifications/lire-toutes",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  adminController.markAllNotificationsAsRead,
);
router.get(
  "/profile",
  requireModuleAccess("admin_settings"),
  adminController.getAdminProfile,
);
router.patch(
  "/profile",
  requireModuleAccess("admin_settings"),
  validate({ body: adminProfileUpdateBodySchema }),
  adminController.updateAdminProfile,
);
router.patch(
  "/password",
  requireModuleAccess("admin_settings"),
  validate({ body: adminPasswordUpdateBodySchema }),
  adminController.updateAdminPassword,
);
router.get(
  "/preferences",
  requireModuleAccess("admin_settings"),
  adminController.getAdminPreferences,
);
router.patch(
  "/preferences",
  requireModuleAccess("admin_settings"),
  validate({ body: adminPreferencesBodySchema }),
  adminController.updateAdminPreferences,
);

router.get(
  "/notifications/preferences",
  requireModuleAccess("admin_settings"),
  adminController.getAdminPreferences,
);
router.put(
  "/notifications/preferences",
  requireModuleAccess("admin_settings"),
  validate({ body: adminPreferencesBodySchema }),
  adminController.updateAdminPreferences,
);

module.exports = router;
