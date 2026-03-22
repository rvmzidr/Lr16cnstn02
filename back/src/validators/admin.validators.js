const {
  z,
  cleanString,
  optionalPositiveInt,
  optionalString,
  paginationSchema,
} = require("./common");

const inscriptionIdParamSchema = z.object({
  id: z.string().uuid(),
});

const compteIdParamSchema = z.object({
  id: z.string().uuid(),
});

const articleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const actualiteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const validerInscriptionBodySchema = z.object({
  role: z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]).optional(),
  commentaire: optionalString(500),
});

const refuserInscriptionBodySchema = z.object({
  motifRejet: cleanString(1000),
});

const changerRoleBodySchema = z.object({
  role: z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]),
  commentaire: optionalString(500),
});

const refuserArticleBodySchema = z.object({
  motifRejet: cleanString(1500),
});

const actualiteBodySchema = z.object({
  titre: cleanString(300),
  resume: optionalString(1000),
  contenu: cleanString(12000),
  equipeRechercheId: optionalPositiveInt(),
  statut: z.enum(["BROUILLON", "PUBLIEE"]).optional(),
});

const actualiteUpdateBodySchema = z.object({
  titre: cleanString(300).optional(),
  resume: optionalString(1000),
  contenu: cleanString(12000).optional(),
  equipeRechercheId: optionalPositiveInt(),
  statut: z.enum(["BROUILLON", "PUBLIEE", "ARCHIVEE"]).optional(),
});

const comptesQuerySchema = z.object({
  q: optionalString(120),
  statut: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["EN_ATTENTE", "ACTIF", "REJETE", "DESACTIVE"]).optional()
    ),
  role: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]).optional()
    ),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const inscriptionsQuerySchema = z.object({
  statut: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["EN_ATTENTE", "REJETE", "ACTIF", "DESACTIVE"]).optional()
    ),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const actualitesQuerySchema = z.object({
  q: optionalString(200),
  statut: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["BROUILLON", "PUBLIEE", "ARCHIVEE"]).optional()
    ),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

module.exports = {
  inscriptionIdParamSchema,
  compteIdParamSchema,
  articleIdParamSchema,
  actualiteIdParamSchema,
  validerInscriptionBodySchema,
  refuserInscriptionBodySchema,
  changerRoleBodySchema,
  refuserArticleBodySchema,
  actualiteBodySchema,
  actualiteUpdateBodySchema,
  comptesQuerySchema,
  inscriptionsQuerySchema,
  actualitesQuerySchema,
};
