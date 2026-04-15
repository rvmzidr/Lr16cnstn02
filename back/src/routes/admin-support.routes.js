const express = require("express");
const supportController = require("../controllers/support.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const { parseOptionalSupportAttachment } = require("../middlewares/support-upload.middleware");
const { ADMIN_ROLES } = require("../config/constants");
const {
  adminSupportTicketListQuerySchema,
  supportTicketAssignBodySchema,
  supportTicketReplyBodySchema,
  supportTicketStatusBodySchema,
  ticketIdParamSchema,
} = require("../validators/support.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...ADMIN_ROLES));

router.get("/stats", supportController.getAdminStats);

router.get(
  "/tickets",
  validate({ query: adminSupportTicketListQuerySchema }),
  supportController.listAdminTickets,
);

router.get(
  "/tickets/:id",
  validate({ params: ticketIdParamSchema }),
  supportController.getAdminTicketDetail,
);

router.patch(
  "/tickets/:id/status",
  validate({ params: ticketIdParamSchema, body: supportTicketStatusBodySchema }),
  supportController.changeTicketStatus,
);

router.patch(
  "/tickets/:id/assign",
  validate({ params: ticketIdParamSchema, body: supportTicketAssignBodySchema }),
  supportController.assignTicket,
);

router.post(
  "/tickets/:id/replies",
  parseOptionalSupportAttachment,
  validate({ params: ticketIdParamSchema, body: supportTicketReplyBodySchema }),
  supportController.addReplyToAdminTicket,
);

module.exports = router;
