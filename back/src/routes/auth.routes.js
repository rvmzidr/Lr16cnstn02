const express = require("express");
const authController = require("../controllers/auth.controller");
const {
  parseOptionalDoctorantAttestation,
} = require("../middlewares/member-upload.middleware");
const {
  authLimiter,
  passwordResetLimiter,
} = require("../middlewares/rate-limit.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  connexionBodySchema,
  inscriptionBodySchema,
  motDePasseOublieBodySchema,
  reinitialisationMotDePasseBodySchema,
} = require("../validators/auth.validators");

const router = express.Router();

router.get("/inscription/references", authController.getInscriptionReferences);
router.post(
  "/inscription",
  authLimiter,
  parseOptionalDoctorantAttestation,
  validate({ body: inscriptionBodySchema }),
  authController.inscription,
);
router.post(
  "/connexion",
  authLimiter,
  validate({ body: connexionBodySchema }),
  authController.connexion,
);
router.post(
  "/mot-de-passe-oublie",
  passwordResetLimiter,
  validate({ body: motDePasseOublieBodySchema }),
  authController.motDePasseOublie,
);
router.post(
  "/reinitialiser-mot-de-passe",
  passwordResetLimiter,
  validate({ body: reinitialisationMotDePasseBodySchema }),
  authController.reinitialiserMotDePasse,
);

module.exports = router;
