const express = require("express");
const labHeadController = require("../controllers/lab-head.controller");
const labHeadCollaborationController = require("../controllers/lab-head-collaboration.controller");
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
const {
  projectBodySchema,
  projectIdParamSchema,
  projectMemberBodySchema,
  projectMemberParamSchema,
  projectUpdateBodySchema,
  purchaseDecisionBodySchema,
  purchaseIdParamSchema,
  purchaseStatusBodySchema,
} = require("../validators/collaboration.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...CHEF_LABO_ROLES));

router.get("/dashboard", labHeadController.getDashboardKPIs);

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

router.post(
  "/projets",
  validate({ body: projectBodySchema }),
  labHeadCollaborationController.createProject,
);
router.put(
  "/projets/:id",
  validate({ params: projectIdParamSchema, body: projectUpdateBodySchema }),
  labHeadCollaborationController.updateProject,
);
router.patch(
  "/projets/:id/archiver",
  validate({ params: projectIdParamSchema }),
  labHeadCollaborationController.archiveProject,
);
router.post(
  "/projets/:id/membres",
  validate({ params: projectIdParamSchema, body: projectMemberBodySchema }),
  labHeadCollaborationController.assignProjectMember,
);
router.delete(
  "/projets/:id/membres/:userId",
  validate({ params: projectMemberParamSchema }),
  labHeadCollaborationController.removeProjectMember,
);

router.patch(
  "/demandes-achat/:id/decision",
  validate({ params: purchaseIdParamSchema, body: purchaseDecisionBodySchema }),
  labHeadCollaborationController.decidePurchaseRequest,
);
router.patch(
  "/demandes-achat/:id/statut",
  validate({ params: purchaseIdParamSchema, body: purchaseStatusBodySchema }),
  labHeadCollaborationController.updatePurchaseStatus,
);

module.exports = router;
