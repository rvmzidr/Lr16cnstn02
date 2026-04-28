const express = require("express");
const requireAuth = require("../middlewares/auth.middleware");
const {
  requireModuleAccess,
  requirePermission,
} = require("../middlewares/access-control.middleware");
const validate = require("../middlewares/validate.middleware");
const messagesController = require("../controllers/messages.controller");
const {
  receiverMessageBodySchema,
  conversationUserParamSchema,
  messageIdParamSchema,
  inboxQuerySchema,
  conversationQuerySchema,
  recipientsQuerySchema,
} = require("../validators/messages.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireModuleAccess("messaging"));

router.post(
  "/",
  requirePermission("canSendMessages"),
  validate({ body: receiverMessageBodySchema }),
  messagesController.sendMessage,
);
router.get(
  "/inbox",
  requirePermission("canViewMessaging"),
  validate({ query: inboxQuerySchema }),
  messagesController.getInbox,
);
router.get(
  "/conversation/:userId",
  requirePermission("canViewMessaging"),
  validate({ params: conversationUserParamSchema, query: conversationQuerySchema }),
  messagesController.getConversation,
);
router.patch(
  "/:id/read",
  requirePermission("canViewMessaging"),
  validate({ params: messageIdParamSchema }),
  messagesController.markMessageRead,
);
router.patch(
  "/conversation/:userId/read",
  requirePermission("canViewMessaging"),
  validate({ params: conversationUserParamSchema }),
  messagesController.markConversationRead,
);
router.get("/unread-count", requirePermission("canViewMessaging"), messagesController.getUnreadCount);
router.get(
  "/recipients",
  requirePermission("canViewMessaging"),
  validate({ query: recipientsQuerySchema }),
  messagesController.searchRecipients,
);

module.exports = router;
