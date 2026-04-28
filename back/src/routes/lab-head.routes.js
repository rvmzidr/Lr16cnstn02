const express = require("express");
const labHeadController = require("../controllers/lab-head.controller");
const labHeadCollaborationController = require("../controllers/lab-head-collaboration.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const {
  requireModuleAccess,
  requirePermission,
} = require("../middlewares/access-control.middleware");
const validate = require("../middlewares/validate.middleware");
const { CHEF_LABO_ROLES } = require("../config/constants");
const {
  actualiteBodySchema,
  actualiteIdParamSchema,
  actualitesQuerySchema,
  actualiteUpdateBodySchema,
  articleIdParamSchema,
  articlesModerationQuerySchema,
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

router.get(
  "/dashboard",
  requireModuleAccess("dashboard_home"),
  labHeadController.getDashboardKPIs,
);

router.get(
  "/articles",
  requireModuleAccess("articles"),
  requirePermission("canValidateArticle"),
  validate({ query: articlesModerationQuerySchema }),
  labHeadController.listArticlesModeration,
);
router.patch(
  "/articles/:id/valider",
  requireModuleAccess("articles"),
  requirePermission("canValidateArticle"),
  validate({ params: articleIdParamSchema }),
  labHeadController.validerArticle,
);
router.patch(
  "/articles/:id/refuser",
  requireModuleAccess("articles"),
  requirePermission("canValidateArticle"),
  validate({ params: articleIdParamSchema, body: refuserArticleBodySchema }),
  labHeadController.refuserArticle,
);
router.patch(
  "/articles/:id/publier",
  requireModuleAccess("articles"),
  requirePermission("canValidateArticle"),
  validate({ params: articleIdParamSchema }),
  labHeadController.publierArticle,
);

router.get(
  "/actualites",
  requireModuleAccess("dashboard_home"),
  validate({ query: actualitesQuerySchema }),
  labHeadController.listActualites,
);
router.post(
  "/actualites",
  requireModuleAccess("dashboard_home"),
  validate({ body: actualiteBodySchema }),
  labHeadController.createActualite,
);
router.put(
  "/actualites/:id",
  requireModuleAccess("dashboard_home"),
  validate({ params: actualiteIdParamSchema, body: actualiteUpdateBodySchema }),
  labHeadController.updateActualite,
);
router.delete(
  "/actualites/:id",
  requireModuleAccess("dashboard_home"),
  validate({ params: actualiteIdParamSchema }),
  labHeadController.deleteActualite,
);

router.post(
  "/projets",
  requireModuleAccess("projects"),
  requirePermission("canManageProjects"),
  validate({ body: projectBodySchema }),
  labHeadCollaborationController.createProject,
);
router.put(
  "/projets/:id",
  requireModuleAccess("projects"),
  requirePermission("canManageProjects"),
  validate({ params: projectIdParamSchema, body: projectUpdateBodySchema }),
  labHeadCollaborationController.updateProject,
);
router.patch(
  "/projets/:id/archiver",
  requireModuleAccess("projects"),
  requirePermission("canManageProjects"),
  validate({ params: projectIdParamSchema }),
  labHeadCollaborationController.archiveProject,
);
router.post(
  "/projets/:id/membres",
  requireModuleAccess("projects"),
  requirePermission("canManageProjects"),
  validate({ params: projectIdParamSchema, body: projectMemberBodySchema }),
  labHeadCollaborationController.assignProjectMember,
);
router.delete(
  "/projets/:id/membres/:userId",
  requireModuleAccess("projects"),
  requirePermission("canManageProjects"),
  validate({ params: projectMemberParamSchema }),
  labHeadCollaborationController.removeProjectMember,
);

router.patch(
  "/demandes-achat/:id/decision",
  requireModuleAccess("purchases"),
  requirePermission("canManageProjects"),
  validate({ params: purchaseIdParamSchema, body: purchaseDecisionBodySchema }),
  labHeadCollaborationController.decidePurchaseRequest,
);
router.patch(
  "/demandes-achat/:id/statut",
  requireModuleAccess("purchases"),
  requirePermission("canManageProjects"),
  validate({ params: purchaseIdParamSchema, body: purchaseStatusBodySchema }),
  labHeadCollaborationController.updatePurchaseStatus,
);

module.exports = router;
