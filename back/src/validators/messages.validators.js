const { z, cleanString, optionalString, paginationSchema } = require("./common");

const receiverMessageBodySchema = z.object({
  receiverId: z.string().uuid(),
  content: cleanString(5000),
});

const conversationUserParamSchema = z.object({
  userId: z.string().uuid(),
});

const messageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const inboxQuerySchema = z.object({
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const conversationQuerySchema = z.object({
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const recipientsQuerySchema = z.object({
  search: optionalString(120),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  receiverMessageBodySchema,
  conversationUserParamSchema,
  messageIdParamSchema,
  inboxQuerySchema,
  conversationQuerySchema,
  recipientsQuerySchema,
};
