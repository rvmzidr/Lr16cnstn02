const {
  z,
  cleanString,
  optionalPositiveInt,
  optionalString,
  paginationSchema,
} = require("./common");

const articleListQuerySchema = z.object({
  q: optionalString(200),
  categorieId: optionalPositiveInt(),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const actualiteListQuerySchema = z.object({
  q: optionalString(200),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const bigIntIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const contactMessageBodySchema = z.object({
  nomComplet: cleanString(200),
  email: z.string().trim().email(),
  sujet: cleanString(255),
  message: cleanString(4000),
});

module.exports = {
  articleListQuerySchema,
  actualiteListQuerySchema,
  bigIntIdParamSchema,
  contactMessageBodySchema,
};
