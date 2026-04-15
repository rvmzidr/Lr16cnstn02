const express = require("express");
const adminController = require("../controllers/admin.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
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

router.get("/dashboard", adminController.getDashboardKPIs);

router.get(
  "/inscriptions",
  validate({ query: inscriptionsQuerySchema }),
  adminController.listInscriptions,
);
router.get(
  "/inscriptions/:id",
  validate({ params: inscriptionIdParamSchema }),
  adminController.getInscriptionDetail,
);
router.patch(
  "/inscriptions/:id/valider",
  validate({
    params: inscriptionIdParamSchema,
    body: validerInscriptionBodySchema,
  }),
  adminController.validerInscription,
);
router.patch(
  "/inscriptions/:id/refuser",
  validate({
    params: inscriptionIdParamSchema,
    body: refuserInscriptionBodySchema,
  }),
  adminController.refuserInscription,
);

router.get(
  "/comptes",
  validate({ query: comptesQuerySchema }),
  adminController.listComptes,
);
router.patch(
  "/comptes/:id/activer",
  validate({ params: compteIdParamSchema }),
  adminController.activerCompte,
);
router.patch(
  "/comptes/:id/desactiver",
  validate({ params: compteIdParamSchema }),
  adminController.desactiverCompte,
);
router.patch(
  "/comptes/:id/role",
  validate({ params: compteIdParamSchema, body: changerRoleBodySchema }),
  adminController.changerRole,
);
router.get(
  "/comptes/:id/attestation-doctorant",
  validate({ params: compteIdParamSchema }),
  adminController.downloadDoctorantAttestation,
);

router.get(
  "/notifications",
  validate({ query: adminNotificationsQuerySchema }),
  adminController.listNotifications,
);
router.get(
  "/notifications/unread-count",
  adminController.getUnreadNotificationsCount,
);
router.patch(
  "/notifications/:id/read",
  validate({ params: notificationIdParamSchema }),
  adminController.markNotificationAsRead,
);
router.patch(
  "/notifications/read-all",
  adminController.markAllNotificationsAsRead,
);
router.patch(
  "/notifications/:id/lire",
  validate({ params: notificationIdParamSchema }),
  adminController.markNotificationAsRead,
);
router.patch(
  "/notifications/lire-toutes",
  adminController.markAllNotificationsAsRead,
);
router.get(
  "/profile",
  adminController.getAdminProfile,
);
router.patch(
  "/profile",
  validate({ body: adminProfileUpdateBodySchema }),
  adminController.updateAdminProfile,
);
router.patch(
  "/password",
  validate({ body: adminPasswordUpdateBodySchema }),
  adminController.updateAdminPassword,
);
router.get(
  "/preferences",
  adminController.getAdminPreferences,
);
router.patch(
  "/preferences",
  validate({ body: adminPreferencesBodySchema }),
  adminController.updateAdminPreferences,
);

router.get(
  "/notifications/preferences",
  adminController.getAdminPreferences,
);
router.put(
  "/notifications/preferences",
  validate({ body: adminPreferencesBodySchema }),
  adminController.updateAdminPreferences,
);

module.exports = router;
