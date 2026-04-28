const express = require("express");
const memberController = require("../controllers/member.controller");
const memberCollaborationController = require("../controllers/member-collaboration.controller");
const requireAuth = require("../middlewares/auth.middleware");
const {
  requireModuleAccess,
  requirePermission,
} = require("../middlewares/access-control.middleware");
const {
  parseOptionalArticleCover,
  parseOptionalArticlePdf,
  parseOptionalDoctorantAttestation,
  parseOptionalMessageAttachment,
  parseOptionalProfilePhoto,
  parseOptionalPurchaseAttachment,
} = require("../middlewares/member-upload.middleware");
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
const {
  attachmentIdParamSchema,
  conversationCreateBodySchema,
  conversationIdParamSchema,
  groupConversationCreateBodySchema,
  groupConversationMemberParamSchema,
  groupConversationMembersBodySchema,
  messageIdParamSchema,
  notificationIdParamSchema,
  notificationPreferencesBodySchema,
  notificationsQuerySchema,
  purchaseAttachmentParamSchema,
  projectIdParamSchema,
  projectsQuerySchema,
  purchaseCreateBodySchema,
  purchaseIdParamSchema,
  purchaseUpdateBodySchema,
  purchasesQuerySchema,
  sendMessageBodySchema,
} = require("../validators/collaboration.validators");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/profil",
  requireModuleAccess("profile_settings"),
  memberController.getProfil,
);
router.get(
  "/profil/attestation-doctorant",
  requireModuleAccess("profile_settings"),
  memberController.downloadDoctorantAttestation,
);
router.get(
  "/profil/photo",
  requireModuleAccess("profile_settings"),
  memberController.getProfilePhoto,
);
router.put(
  "/profil",
  requireModuleAccess("profile_settings"),
  parseOptionalDoctorantAttestation,
  validate({ body: profileUpdateBodySchema }),
  memberController.updateProfil,
);
router.put(
  "/profil/photo",
  requireModuleAccess("profile_settings"),
  parseOptionalProfilePhoto,
  memberController.uploadProfilePhoto,
);
router.delete(
  "/profil/photo",
  requireModuleAccess("profile_settings"),
  memberController.deleteProfilePhoto,
);
router.get(
  "/membres",
  validate({ query: membresLookupQuerySchema }),
  memberController.listMembres,
);
router.get(
  "/actualites",
  requireModuleAccess("dashboard_home"),
  validate({ query: actualitesMembreQuerySchema }),
  memberController.listActualites,
);
router.get(
  "/articles/mes-articles",
  requireModuleAccess("articles"),
  memberController.listMesArticles,
);
router.get(
  "/articles/recherche",
  requireModuleAccess("articles"),
  validate({ query: rechercheArticleQuerySchema }),
  memberController.rechercherArticles,
);
router.post(
  "/articles",
  requireModuleAccess("articles"),
  requirePermission("canCreateArticle"),
  validate({ body: articleBodySchema }),
  memberController.createArticle,
);
router.put(
  "/articles/:id",
  requireModuleAccess("articles"),
  requirePermission("canEditOwnDraft"),
  validate({ params: articleIdParamSchema, body: articleBodySchema }),
  memberController.updateArticle,
);
router.post(
  "/articles/:id/pdf",
  requireModuleAccess("articles"),
  requirePermission("canEditOwnDraft"),
  validate({ params: articleIdParamSchema }),
  parseOptionalArticlePdf,
  memberController.uploadArticlePdf,
);
router.post(
  "/articles/:id/couverture",
  requireModuleAccess("articles"),
  requirePermission("canEditOwnDraft"),
  validate({ params: articleIdParamSchema }),
  parseOptionalArticleCover,
  memberController.uploadArticleCover,
);
router.get(
  "/articles/:id/pdf",
  requireModuleAccess("articles"),
  validate({ params: articleIdParamSchema }),
  memberController.downloadArticlePdf,
);
router.post(
  "/articles/:id/co-auteurs",
  requireModuleAccess("articles"),
  requirePermission("canEditOwnDraft"),
  validate({ params: articleIdParamSchema, body: addCoAuteurBodySchema }),
  memberController.addCoAuteur,
);
router.delete(
  "/articles/:id/co-auteurs/:userId",
  requireModuleAccess("articles"),
  requirePermission("canEditOwnDraft"),
  validate({ params: deleteCoAuteurParamSchema }),
  memberController.deleteCoAuteur,
);

router.get(
  "/messages/conversations",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  memberCollaborationController.listConversations,
);
router.post(
  "/messages/conversations",
  requireModuleAccess("messaging"),
  requirePermission("canSendMessages"),
  parseOptionalMessageAttachment,
  validate({ body: conversationCreateBodySchema }),
  memberCollaborationController.createConversation,
);
router.get(
  "/messages/conversations/:id",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.getConversation,
);
router.patch(
  "/messages/conversations/:id/archive",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.archiveConversation,
);
router.patch(
  "/messages/conversations/:id/unarchive",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.unarchiveConversation,
);
router.post(
  "/messages/conversations/:id/messages",
  requireModuleAccess("messaging"),
  requirePermission("canSendMessages"),
  parseOptionalMessageAttachment,
  validate({ params: conversationIdParamSchema, body: sendMessageBodySchema }),
  memberCollaborationController.sendMessage,
);
router.patch(
  "/messages/messages/:id/lire",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: messageIdParamSchema }),
  memberCollaborationController.markMessageAsRead,
);
router.get(
  "/messages/attachments/:id",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: attachmentIdParamSchema }),
  memberCollaborationController.downloadMessageAttachment,
);
router.post(
  "/messages/groups",
  requireModuleAccess("messaging"),
  requirePermission("canSendMessages"),
  parseOptionalMessageAttachment,
  validate({ body: groupConversationCreateBodySchema }),
  memberCollaborationController.createGroupConversation,
);
router.post(
  "/messages/groups/:id/members",
  requireModuleAccess("messaging"),
  requirePermission("canSendMessages"),
  validate({
    params: conversationIdParamSchema,
    body: groupConversationMembersBodySchema,
  }),
  memberCollaborationController.addGroupMembers,
);
router.delete(
  "/messages/groups/:id/members/:userId",
  requireModuleAccess("messaging"),
  requirePermission("canSendMessages"),
  validate({ params: groupConversationMemberParamSchema }),
  memberCollaborationController.removeGroupMember,
);
router.post(
  "/messages/groups/:id/leave",
  requireModuleAccess("messaging"),
  requirePermission("canViewMessaging"),
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.leaveGroupConversation,
);

router.get(
  "/projets",
  requireModuleAccess("projects"),
  validate({ query: projectsQuerySchema }),
  memberCollaborationController.listProjects,
);
router.get(
  "/projets/:id",
  requireModuleAccess("projects"),
  validate({ params: projectIdParamSchema }),
  memberCollaborationController.getProject,
);

router.get(
  "/demandes-achat",
  requireModuleAccess("purchases"),
  validate({ query: purchasesQuerySchema }),
  memberCollaborationController.listPurchaseRequests,
);
router.post(
  "/demandes-achat",
  requireModuleAccess("purchases"),
  requirePermission("canCreatePurchaseRequest"),
  parseOptionalPurchaseAttachment,
  validate({ body: purchaseCreateBodySchema }),
  memberCollaborationController.createPurchaseRequest,
);
router.put(
  "/demandes-achat/:id",
  requireModuleAccess("purchases"),
  requirePermission("canCreatePurchaseRequest"),
  parseOptionalPurchaseAttachment,
  validate({ params: purchaseIdParamSchema, body: purchaseUpdateBodySchema }),
  memberCollaborationController.updatePurchaseRequest,
);
router.post(
  "/demandes-achat/:id/generer-pdf",
  requireModuleAccess("purchases"),
  requirePermission("canCreatePurchaseRequest"),
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.generatePurchaseRequestPdf,
);
router.get(
  "/demandes-achat/:id",
  requireModuleAccess("purchases"),
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.getPurchaseRequest,
);
router.get(
  "/demandes-achat/:id/pdf",
  requireModuleAccess("purchases"),
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.downloadPurchaseRequestPdf,
);
router.get(
  "/demandes-achat/:id/piece-jointe",
  requireModuleAccess("purchases"),
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.downloadPurchaseAttachment,
);
router.get(
  "/demandes-achat/:id/pieces-jointes/:attachmentId",
  requireModuleAccess("purchases"),
  validate({ params: purchaseAttachmentParamSchema }),
  memberCollaborationController.downloadPurchaseAttachmentById,
);

router.get(
  "/notifications",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ query: notificationsQuerySchema }),
  memberCollaborationController.listNotifications,
);
router.patch(
  "/notifications/:id/lire",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ params: notificationIdParamSchema }),
  memberCollaborationController.markNotificationAsRead,
);
router.patch(
  "/notifications/lire-toutes",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  memberCollaborationController.markAllNotificationsAsRead,
);
router.get(
  "/notifications/preferences",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  memberCollaborationController.getNotificationPreferences,
);
router.put(
  "/notifications/preferences",
  requireModuleAccess("notifications"),
  requirePermission("canViewNotifications"),
  validate({ body: notificationPreferencesBodySchema }),
  memberCollaborationController.updateNotificationPreferences,
);

module.exports = router;
