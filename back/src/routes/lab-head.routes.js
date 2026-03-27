const express = require("express");
const labHeadController = require("../controllers/lab-head.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const { CHEF_LABO_ROLES } = require("../config/constants");
const {
  actualiteBodySchema,
  actualiteIdParamSchema,
  actualitesQuerySchema,
  actualiteUpdateBodySchema,
  articleIdParamSchema,
  refuserArticleBodySchema,
} = require("../validators/admin.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...CHEF_LABO_ROLES));

router.get("/articles", labHeadController.listArticlesModeration);
router.patch(
  "/articles/:id/valider",
  validate({ params: articleIdParamSchema }),
  labHeadController.validerArticle,
);
router.patch(
  "/articles/:id/refuser",
  validate({ params: articleIdParamSchema, body: refuserArticleBodySchema }),
  labHeadController.refuserArticle,
);
router.patch(
  "/articles/:id/publier",
  validate({ params: articleIdParamSchema }),
  labHeadController.publierArticle,
);

router.get(
  "/actualites",
  validate({ query: actualitesQuerySchema }),
  labHeadController.listActualites,
);
router.post(
  "/actualites",
  validate({ body: actualiteBodySchema }),
  labHeadController.createActualite,
);
router.put(
  "/actualites/:id",
  validate({ params: actualiteIdParamSchema, body: actualiteUpdateBodySchema }),
  labHeadController.updateActualite,
);
router.delete(
  "/actualites/:id",
  validate({ params: actualiteIdParamSchema }),
  labHeadController.deleteActualite,
);

module.exports = router;
