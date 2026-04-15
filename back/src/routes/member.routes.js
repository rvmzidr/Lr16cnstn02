const express = require("express");
const memberController = require("../controllers/member.controller");
const memberCollaborationController = require("../controllers/member-collaboration.controller");
const requireAuth = require("../middlewares/auth.middleware");
const {
  parseOptionalArticlePdf,
  parseOptionalDoctorantAttestation,
  parseOptionalMessageAttachment,
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
  projectIdParamSchema,
  projectsQuerySchema,
  purchaseCreateBodySchema,
  purchaseIdParamSchema,
  purchasesQuerySchema,
  sendMessageBodySchema,
} = require("../validators/collaboration.validators");

const router = express.Router();

router.use(requireAuth);

router.get("/profil", memberController.getProfil);
router.get(
  "/profil/attestation-doctorant",
  memberController.downloadDoctorantAttestation,
);
router.put(
  "/profil",
  parseOptionalDoctorantAttestation,
  validate({ body: profileUpdateBodySchema }),
  memberController.updateProfil,
);
router.get(
  "/membres",
  validate({ query: membresLookupQuerySchema }),
  memberController.listMembres,
);
router.get(
  "/actualites",
  validate({ query: actualitesMembreQuerySchema }),
  memberController.listActualites,
);
router.get("/articles/mes-articles", memberController.listMesArticles);
router.get(
  "/articles/recherche",
  validate({ query: rechercheArticleQuerySchema }),
  memberController.rechercherArticles,
);
router.post(
  "/articles",
  validate({ body: articleBodySchema }),
  memberController.createArticle,
);
router.put(
  "/articles/:id",
  validate({ params: articleIdParamSchema, body: articleBodySchema }),
  memberController.updateArticle,
);
router.post(
  "/articles/:id/pdf",
  validate({ params: articleIdParamSchema }),
  parseOptionalArticlePdf,
  memberController.uploadArticlePdf,
);
router.get(
  "/articles/:id/pdf",
  validate({ params: articleIdParamSchema }),
  memberController.downloadArticlePdf,
);
router.post(
  "/articles/:id/co-auteurs",
  validate({ params: articleIdParamSchema, body: addCoAuteurBodySchema }),
  memberController.addCoAuteur,
);
router.delete(
  "/articles/:id/co-auteurs/:userId",
  validate({ params: deleteCoAuteurParamSchema }),
  memberController.deleteCoAuteur,
);

router.get("/messages/conversations", memberCollaborationController.listConversations);
router.post(
  "/messages/conversations",
  parseOptionalMessageAttachment,
  validate({ body: conversationCreateBodySchema }),
  memberCollaborationController.createConversation,
);
router.get(
  "/messages/conversations/:id",
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.getConversation,
);
router.patch(
  "/messages/conversations/:id/archive",
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.archiveConversation,
);
router.patch(
  "/messages/conversations/:id/unarchive",
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.unarchiveConversation,
);
router.post(
  "/messages/conversations/:id/messages",
  parseOptionalMessageAttachment,
  validate({ params: conversationIdParamSchema, body: sendMessageBodySchema }),
  memberCollaborationController.sendMessage,
);
router.patch(
  "/messages/messages/:id/lire",
  validate({ params: messageIdParamSchema }),
  memberCollaborationController.markMessageAsRead,
);
router.get(
  "/messages/attachments/:id",
  validate({ params: attachmentIdParamSchema }),
  memberCollaborationController.downloadMessageAttachment,
);
router.post(
  "/messages/groups",
  parseOptionalMessageAttachment,
  validate({ body: groupConversationCreateBodySchema }),
  memberCollaborationController.createGroupConversation,
);
router.post(
  "/messages/groups/:id/members",
  validate({
    params: conversationIdParamSchema,
    body: groupConversationMembersBodySchema,
  }),
  memberCollaborationController.addGroupMembers,
);
router.delete(
  "/messages/groups/:id/members/:userId",
  validate({ params: groupConversationMemberParamSchema }),
  memberCollaborationController.removeGroupMember,
);
router.post(
  "/messages/groups/:id/leave",
  validate({ params: conversationIdParamSchema }),
  memberCollaborationController.leaveGroupConversation,
);

router.get(
  "/projets",
  validate({ query: projectsQuerySchema }),
  memberCollaborationController.listProjects,
);
router.get(
  "/projets/:id",
  validate({ params: projectIdParamSchema }),
  memberCollaborationController.getProject,
);

router.get(
  "/demandes-achat",
  validate({ query: purchasesQuerySchema }),
  memberCollaborationController.listPurchaseRequests,
);
router.post(
  "/demandes-achat",
  parseOptionalPurchaseAttachment,
  validate({ body: purchaseCreateBodySchema }),
  memberCollaborationController.createPurchaseRequest,
);
router.get(
  "/demandes-achat/:id",
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.getPurchaseRequest,
);
router.get(
  "/demandes-achat/:id/piece-jointe",
  validate({ params: purchaseIdParamSchema }),
  memberCollaborationController.downloadPurchaseAttachment,
);

router.get(
  "/notifications",
  validate({ query: notificationsQuerySchema }),
  memberCollaborationController.listNotifications,
);
router.patch(
  "/notifications/:id/lire",
  validate({ params: notificationIdParamSchema }),
  memberCollaborationController.markNotificationAsRead,
);
router.patch(
  "/notifications/lire-toutes",
  memberCollaborationController.markAllNotificationsAsRead,
);
router.get(
  "/notifications/preferences",
  memberCollaborationController.getNotificationPreferences,
);
router.put(
  "/notifications/preferences",
  validate({ body: notificationPreferencesBodySchema }),
  memberCollaborationController.updateNotificationPreferences,
);

module.exports = router;
