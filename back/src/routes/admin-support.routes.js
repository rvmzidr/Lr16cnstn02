const express = require("express");
const supportController = require("../controllers/support.controller");
const requireAuth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const { requireModuleAccess, requirePermission } = require("../middlewares/access-control.middleware");
const validate = require("../middlewares/validate.middleware");
const { parseOptionalSupportAttachment } = require("../middlewares/support-upload.middleware");
const { ADMIN_ROLES } = require("../config/constants");
const accessControlController = require("../controllers/access-control.controller");
const {
  adminSupportTicketListQuerySchema,
  supportTicketAssignBodySchema,
  supportTicketReplyBodySchema,
  supportTicketStatusBodySchema,
  ticketIdParamSchema,
} = require("../validators/support.validators");
const {
  supportTicketAccessResolutionBodySchema,
} = require("../validators/access-control.validators");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(...ADMIN_ROLES));
router.use(requireModuleAccess("support"));
router.use(requirePermission("canManageSupport"));

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

router.get(
  "/tickets/:id/access-context",
  validate({ params: ticketIdParamSchema }),
  accessControlController.getSupportTicketAccessContext,
);

router.patch(
  "/tickets/:id/access-resolution",
  validate({
    params: ticketIdParamSchema,
    body: supportTicketAccessResolutionBodySchema,
  }),
  accessControlController.resolveSupportTicketAccess,
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
