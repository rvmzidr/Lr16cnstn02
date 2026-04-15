const express = require("express");
const requireAuth = require("../middlewares/auth.middleware");
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

router.post(
  "/",
  validate({ body: receiverMessageBodySchema }),
  messagesController.sendMessage,
);
router.get("/inbox", validate({ query: inboxQuerySchema }), messagesController.getInbox);
router.get(
  "/conversation/:userId",
  validate({ params: conversationUserParamSchema, query: conversationQuerySchema }),
  messagesController.getConversation,
);
router.patch(
  "/:id/read",
  validate({ params: messageIdParamSchema }),
  messagesController.markMessageRead,
);
router.patch(
  "/conversation/:userId/read",
  validate({ params: conversationUserParamSchema }),
  messagesController.markConversationRead,
);
router.get("/unread-count", messagesController.getUnreadCount);
router.get(
  "/recipients",
  validate({ query: recipientsQuerySchema }),
  messagesController.searchRecipients,
);

module.exports = router;
