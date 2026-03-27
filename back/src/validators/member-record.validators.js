const {
  z,
  cleanString,
  optionalAcademicYear,
  optionalBoolean,
  optionalEmail,
  optionalPositiveInt,
  optionalString,
} = require("./common");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function getCurrentAcademicYearStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return month >= 8 ? year : year - 1;
}

function requiredDateField() {
  return z
    .string()
    .trim()
    .regex(dateRegex, "Date invalide. Format attendu: YYYY-MM-DD.");
}

function requiredPositiveIntField(message) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .int()
      .positive(message ? { message } : undefined),
  );
}

function createMemberDossierSchema({
  includeEmailInstitutionnel = false,
} = {}) {
  const base = z.object({
    nom: cleanString(120),
    prenom: cleanString(120),
    nomJeuneFille: optionalString(120),
    dateNaissance: requiredDateField(),
    lieuNaissance: cleanString(150),
    sexe: z.enum(["HOMME", "FEMME", "AUTRE"]),
    genre: z.enum(["HOMME", "FEMME", "AUTRE"]).optional(),
    cin: optionalString(60),
    passeport: optionalString(60),
    telephone: cleanString(30),
    emailSecondaire: optionalEmail(),
    adresse: optionalString(500),
    grade: cleanString(150),
    institutionAffectationId: requiredPositiveIntField(
      "L'etablissement est obligatoire.",
    ),
    dernierDiplomeLibre: cleanString(255),
    niveauDiplomeId: optionalPositiveInt(),
    dateObtentionDiplome: requiredDateField(),
    etablissementDiplome: cleanString(255),
    laboratoireDenomination: cleanString(255),
    laboratoireEtablissement: cleanString(255),
    laboratoireUniversite: cleanString(255),
    laboratoireResponsable: cleanString(255),
    estDoctorant: optionalBoolean().default(false),
    sujetRecherche: optionalString(2000),
    pourcentageAvancement: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().min(0).max(100).optional(),
    ),
    anneePremiereInscription: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().int().min(1900).max(2100).optional(),
    ),
    anneeUniversitairePremiereInscription: optionalAcademicYear(),
    universiteInscription: optionalString(255),
    directeurThese: optionalString(255),
    orcid: optionalString(50),
    equipeRechercheId: optionalPositiveInt(),
    biographie: optionalString(3000),
    photoUrl: optionalString(500),
  });

  const schema = includeEmailInstitutionnel
    ? base.extend({
        emailInstitutionnel: z.string().trim().email(),
      })
    : base;

  return schema.superRefine((data, context) => {
    if (!data.cin && !data.passeport) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cin"],
        message: "Le CIN ou le passeport est obligatoire.",
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passeport"],
        message: "Le CIN ou le passeport est obligatoire.",
      });
    }

    if (data.genre && data.sexe && data.genre !== data.sexe) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["genre"],
        message: "Les champs sexe et genre doivent etre coherents.",
      });
    }

    if (data.estDoctorant) {
      if (!data.sujetRecherche) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sujetRecherche"],
          message: "Le sujet de recherche est obligatoire pour un doctorant.",
        });
      }

      if (data.pourcentageAvancement === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pourcentageAvancement"],
          message: "Le taux d'avancement est obligatoire pour un doctorant.",
        });
      }

      if (!data.anneeUniversitairePremiereInscription) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["anneeUniversitairePremiereInscription"],
          message:
            "L'annee universitaire de premiere inscription est obligatoire pour un doctorant.",
        });
      }

      if (!data.universiteInscription) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["universiteInscription"],
          message:
            "L'etablissement universitaire est obligatoire pour un doctorant.",
        });
      }

      if (!data.directeurThese) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["directeurThese"],
          message:
            "Le nom du directeur de these est obligatoire pour un doctorant.",
        });
      }

      if (data.anneePremiereInscription !== undefined) {
        const currentAcademicYearStart = getCurrentAcademicYearStart();
        const registrationCount =
          currentAcademicYearStart - data.anneePremiereInscription + 1;

        if (registrationCount > 5) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["anneeUniversitairePremiereInscription"],
            message:
              "Le doctorant doit avoir cumule au maximum 5 inscriptions a la date de la demande.",
          });
        }
      }
    }
  });
}

module.exports = {
  createMemberDossierSchema,
};
