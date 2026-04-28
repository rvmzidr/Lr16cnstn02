const express = require("express");
const supportController = require("../controllers/support.controller");
const requireAuth = require("../middlewares/auth.middleware");
const { requireModuleAccess } = require("../middlewares/access-control.middleware");
const validate = require("../middlewares/validate.middleware");
const { parseOptionalSupportAttachment } = require("../middlewares/support-upload.middleware");
const {
  ticketIdParamSchema,
  supportAttachmentIdParamSchema,
  supportTicketCreateBodySchema,
  supportTicketListQuerySchema,
  supportTicketReplyBodySchema,
} = require("../validators/support.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireModuleAccess("support"));

router.post(
  "/tickets",
  parseOptionalSupportAttachment,
  validate({ body: supportTicketCreateBodySchema }),
  supportController.createTicket,
);

router.get(
  "/tickets/my",
  validate({ query: supportTicketListQuerySchema }),
  supportController.listMyTickets,
);

router.get(
  "/tickets/:id",
  validate({ params: ticketIdParamSchema }),
  supportController.getMyTicketDetail,
);

router.post(
  "/tickets/:id/replies",
  parseOptionalSupportAttachment,
  validate({ params: ticketIdParamSchema, body: supportTicketReplyBodySchema }),
  supportController.addReplyToMyTicket,
);

router.post(
  "/tickets/:id/attachments",
  parseOptionalSupportAttachment,
  validate({ params: ticketIdParamSchema }),
  supportController.addTicketAttachment,
);

router.get(
  "/attachments/:id",
  validate({ params: supportAttachmentIdParamSchema }),
  supportController.downloadAttachment,
);

module.exports = router;
