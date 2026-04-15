const {
  z,
  cleanString,
  optionalBoolean,
  optionalString,
  optionalUuid,
  paginationSchema,
} = require("./common");

function safeLimitSchema(max = 50, fallback = 10) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(1, Math.trunc(parsed)), max);
  }, z.number().int().min(1).max(max));
}

const ticketIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const supportAttachmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const supportTicketCreateBodySchema = z.object({
  sujet: cleanString(255),
  categorie: z.enum([
    "LOGIN",
    "ACCOUNT",
    "MESSAGING",
    "NOTIFICATIONS",
    "ARTICLES",
    "SYSTEM",
    "OTHER",
  ]),
  priorite: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .default("MEDIUM"),
  description: cleanString(12000),
});

const supportTicketListQuerySchema = z.object({
  q: optionalString(180),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  ),
  categorie: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .enum([
        "LOGIN",
        "ACCOUNT",
        "MESSAGING",
        "NOTIFICATIONS",
        "ARTICLES",
        "SYSTEM",
        "OTHER",
      ])
      .optional(),
  ),
  priorite: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  ),
  page: paginationSchema.page,
  limit: safeLimitSchema(50, 10),
});

const adminSupportTicketListQuerySchema = supportTicketListQuerySchema.extend({
  assignation: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["all", "assigned", "unassigned", "mine"]).default("all"),
  ),
});

const supportTicketStatusBodySchema = z.object({
  statut: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

const supportTicketAssignBodySchema = z.object({
  adminId: optionalUuid(),
});

const supportTicketReplyBodySchema = z.object({
  message: optionalString(12000),
  estNoteInterne: optionalBoolean(),
  rouvrirTicket: optionalBoolean(),
});

module.exports = {
  ticketIdParamSchema,
  supportAttachmentIdParamSchema,
  supportTicketCreateBodySchema,
  supportTicketListQuerySchema,
  adminSupportTicketListQuerySchema,
  supportTicketStatusBodySchema,
  supportTicketAssignBodySchema,
  supportTicketReplyBodySchema,
};
