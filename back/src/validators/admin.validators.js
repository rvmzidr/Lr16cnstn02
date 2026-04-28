const {
  z,
  cleanString,
  optionalDate,
  optionalBoolean,
  optionalPositiveInt,
  optionalString,
  optionalUuid,
  paginationSchema,
} = require("./common");

function clampQueryLimit(max = 50, fallback = 10) {
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

const safeLimitSchema = clampQueryLimit(50, 10);

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
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["EN_ATTENTE", "ACTIF", "REJETE", "DESACTIVE"]).optional(),
  ),
  role: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]).optional(),
  ),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const inscriptionsQuerySchema = z.object({
  q: optionalString(120),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["EN_ATTENTE", "REJETE", "ACTIF", "DESACTIVE"]).optional(),
  ),
  role: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]).optional(),
  ),
  ordre: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["asc", "desc"]).optional(),
  ),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const actualitesQuerySchema = z.object({
  q: optionalString(200),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["BROUILLON", "PUBLIEE", "ARCHIVEE"]).optional(),
  ),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const articlesModerationQuerySchema = z.object({
  q: optionalString(200),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["BROUILLON", "SOUMIS", "VALIDE", "REJETE", "PUBLIE"]).optional(),
  ),
  categorieId: optionalPositiveInt(),
  equipeRechercheId: optionalPositiveInt(),
  auteurId: optionalUuid(),
  dateDebut: optionalDate(),
  dateFin: optionalDate(),
  tri: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .enum([
        "modification",
        "soumission",
        "validation",
        "publication",
        "creation",
        "titre",
      ])
      .optional(),
  ),
  ordre: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["asc", "desc"]).optional(),
  ),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const adminNotificationsQuerySchema = z.object({
  type: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? "all" : value),
    z.enum(["all", "registration", "account", "message", "role", "support"]),
  ),
  read: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? "all" : value),
    z.enum(["all", "read", "unread"]),
  ),
  nonLues: optionalBoolean(),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const adminProfileUpdateBodySchema = z.object({
  nomComplet: cleanString(180),
  emailInstitutionnel: z.string().trim().email().max(190),
});

const adminPasswordUpdateBodySchema = z
  .object({
    motDePasseActuel: z.string().trim().min(1).max(255),
    nouveauMotDePasse: z.string().trim().min(8).max(255),
    confirmationMotDePasse: z.string().trim().min(8).max(255),
  })
  .superRefine((value, ctx) => {
    if (value.nouveauMotDePasse !== value.confirmationMotDePasse) {
      ctx.addIssue({
        path: ["confirmationMotDePasse"],
        code: z.ZodIssueCode.custom,
        message:
          "La confirmation du nouveau mot de passe doit correspondre.",
      });
    }
  });

const adminPreferencesBodySchema = z.object({
  canalApplication: optionalBoolean(),
  canalEmail: optionalBoolean(),
  notifComptes: optionalBoolean(),
  notifArticles: optionalBoolean(),
  notifMessages: optionalBoolean(),
  notifProjets: optionalBoolean(),
  notifDemandesAchat: optionalBoolean(),
  notifLivraisons: optionalBoolean(),
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
  articlesModerationQuerySchema,
  adminNotificationsQuerySchema,
  adminProfileUpdateBodySchema,
  adminPasswordUpdateBodySchema,
  adminPreferencesBodySchema,
};
