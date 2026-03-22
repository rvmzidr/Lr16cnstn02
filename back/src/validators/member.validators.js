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
const { createMemberDossierSchema } = require("./member-record.validators");

const profileUpdateBodySchema = createMemberDossierSchema({
  includeEmailInstitutionnel: true,
});

const articleBodySchema = z.object({
  titre: cleanString(500),
  resume: cleanString(4000),
  contenu: cleanString(20000),
  categorieId: optionalPositiveInt(),
  action: z.enum(["BROUILLON", "SOUMETTRE"]).optional(),
});

const articleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const addCoAuteurBodySchema = z.object({
  utilisateurId: z.string().uuid(),
  ordreAuteur: optionalPositiveInt(),
  auteurCorrespondant: optionalBoolean(),
});

const deleteCoAuteurParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.string().uuid(),
});

const rechercheArticleQuerySchema = z.object({
  q: optionalString(200),
  categorieId: optionalPositiveInt(),
  equipeRechercheId: optionalPositiveInt(),
  statut: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["BROUILLON", "SOUMIS", "VALIDE", "REJETE", "PUBLIE"]).optional()
    ),
  auteurId: optionalUuid(),
  dateDebut: optionalDate(),
  dateFin: optionalDate(),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const actualitesMembreQuerySchema = z.object({
  q: optionalString(200),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const membresLookupQuerySchema = z.object({
  q: optionalString(120),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  profileUpdateBodySchema,
  articleBodySchema,
  articleIdParamSchema,
  addCoAuteurBodySchema,
  deleteCoAuteurParamSchema,
  rechercheArticleQuerySchema,
  actualitesMembreQuerySchema,
  membresLookupQuerySchema,
};
