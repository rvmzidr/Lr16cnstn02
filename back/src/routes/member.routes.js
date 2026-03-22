const express = require("express");
const memberController = require("../controllers/member.controller");
const requireAuth = require("../middlewares/auth.middleware");
const { parseOptionalDoctorantAttestation } = require("../middlewares/member-upload.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  actualitesMembreQuerySchema,
  addCoAuteurBodySchema,
  articleBodySchema,
  articleIdParamSchema,
  deleteCoAuteurParamSchema,
  membresLookupQuerySchema,
  profileUpdateBodySchema,
  rechercheArticleQuerySchema,
} = require("../validators/member.validators");

const router = express.Router();

router.use(requireAuth);

router.get("/profil", memberController.getProfil);
router.get(
  "/profil/attestation-doctorant",
  memberController.downloadDoctorantAttestation
);
router.put(
  "/profil",
  parseOptionalDoctorantAttestation,
  validate({ body: profileUpdateBodySchema }),
  memberController.updateProfil
);
router.get(
  "/membres",
  validate({ query: membresLookupQuerySchema }),
  memberController.listMembres
);
router.get(
  "/actualites",
  validate({ query: actualitesMembreQuerySchema }),
  memberController.listActualites
);
router.get("/articles/mes-articles", memberController.listMesArticles);
router.get(
  "/articles/recherche",
  validate({ query: rechercheArticleQuerySchema }),
  memberController.rechercherArticles
);
router.post(
  "/articles",
  validate({ body: articleBodySchema }),
  memberController.createArticle
);
router.put(
  "/articles/:id",
  validate({ params: articleIdParamSchema, body: articleBodySchema }),
  memberController.updateArticle
);
router.post(
  "/articles/:id/co-auteurs",
  validate({ params: articleIdParamSchema, body: addCoAuteurBodySchema }),
  memberController.addCoAuteur
);
router.delete(
  "/articles/:id/co-auteurs/:userId",
  validate({ params: deleteCoAuteurParamSchema }),
  memberController.deleteCoAuteur
);

module.exports = router;
