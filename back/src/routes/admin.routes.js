const express = require("express");
const adminController = require("../controllers/admin.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const { ADMIN_ROLES } = require("../config/constants");
const {
  changerRoleBodySchema,
  compteIdParamSchema,
  comptesQuerySchema,
  inscriptionIdParamSchema,
  inscriptionsQuerySchema,
  refuserInscriptionBodySchema,
  validerInscriptionBodySchema,
} = require("../validators/admin.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...ADMIN_ROLES));

router.get(
  "/inscriptions",
  validate({ query: inscriptionsQuerySchema }),
  adminController.listInscriptions,
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

module.exports = router;
