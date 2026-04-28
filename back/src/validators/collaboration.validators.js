const {
  z,
  cleanString,
  optionalBoolean,
  optionalDate,
  optionalPositiveInt,
  optionalString,
  paginationSchema,
} = require("./common");

function parseUuidArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch (_error) {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  return value;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_error) {
    return [trimmed];
  }
}

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

function participantIdsArraySchema(min = 1) {
  return z.preprocess(
    parseUuidArray,
    z.array(z.string().uuid()).min(min).max(25),
  );
}

const conversationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const messageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const attachmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const conversationCreateBodySchema = z.object({
  sujet: optionalString(255),
  description: optionalString(2000),
  participantIds: participantIdsArraySchema(1),
  contenu: optionalString(4000),
});

const sendMessageBodySchema = z.object({
  contenu: optionalString(4000),
});

const groupConversationCreateBodySchema = z.object({
  sujet: cleanString(255),
  description: optionalString(2000),
  participantIds: participantIdsArraySchema(2),
  contenu: optionalString(4000),
});

const groupConversationMembersBodySchema = z.object({
  participantIds: participantIdsArraySchema(1),
});

const groupConversationMemberParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.string().uuid(),
});

const projectIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const projectMemberParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.string().uuid(),
});

const projectBodySchema = z
  .object({
    titre: cleanString(300),
    description: cleanString(6000),
    objectifs: optionalString(6000),
    dateDebut: optionalDate(),
    dateFin: optionalDate(),
    statut: z.enum(["EN_COURS", "TERMINE", "ARCHIVE"]).optional(),
    equipeIds: z.array(z.coerce.number().int().positive()).optional(),
    membreIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateDebut && value.dateFin && value.dateDebut > value.dateFin) {
      ctx.addIssue({
        path: ["dateFin"],
        code: z.ZodIssueCode.custom,
        message: "La date de fin doit etre posterieure a la date de debut.",
      });
    }
  });

const projectUpdateBodySchema = z
  .object({
    titre: cleanString(300).optional(),
    description: cleanString(6000).optional(),
    objectifs: optionalString(6000),
    dateDebut: optionalDate(),
    dateFin: optionalDate(),
    statut: z.enum(["EN_COURS", "TERMINE", "ARCHIVE"]).optional(),
    equipeIds: z.array(z.coerce.number().int().positive()).optional(),
    membreIds: z.array(z.string().uuid()).optional(),
    archive: optionalBoolean(),
  })
  .superRefine((value, ctx) => {
    if (value.dateDebut && value.dateFin && value.dateDebut > value.dateFin) {
      ctx.addIssue({
        path: ["dateFin"],
        code: z.ZodIssueCode.custom,
        message: "La date de fin doit etre posterieure a la date de debut.",
      });
    }
  });

const projectMemberBodySchema = z.object({
  utilisateurId: z.string().uuid(),
  roleDansProjet: optionalString(120),
});

const projectsQuerySchema = z.object({
  q: optionalString(200),
  archive: optionalBoolean(),
  statut: z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(["EN_COURS", "TERMINE", "ARCHIVE"]).optional(),
    )
    .optional(),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const purchaseIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const purchaseAttachmentParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  attachmentId: z.coerce.number().int().positive(),
});

const PURCHASE_RUBRIQUES = [
  "EQUIPEMENT",
  "SOUS_TRAITANCE",
  "CONSOMMABLES_ET_PETITS_MATERIELS",
  "MISSIONS",
  "STAGES",
  "DEPLACEMENTS_ET_HEBERGEMENT",
  "MANIFESTATIONS_SCIENTIFIQUES",
  "VACATIONS",
  "DOCUMENTATION_ET_RESEAUX",
  "MAINTENANCE_ET_DIVERS",
];

const PURCHASE_ATTACHMENT_TYPES = [
  "DEVIS",
  "SPECIFICATIONS_TECHNIQUES",
  "AUTRES",
];

const PURCHASE_STATUS_VALUES = [
  "BROUILLON",
  "PDF_GENERE",
  "TELECHARGEE",
  "EN_ATTENTE_SIGNATURE_CHEF",
  "SIGNEE",
  "TRANSMISE_ADMINISTRATION",
  "EN_ATTENTE",
  "ACCEPTEE",
  "REJETEE",
  "EN_COURS_TRAITEMENT",
  "COMMANDEE",
  "LIVREE",
  "ANNULEE",
];

const purchaseLineSchema = z.object({
  articleService: cleanString(255),
  quantite: z.coerce.number().int().positive(),
  prixUnitaireTtc: z.coerce.number().nonnegative(),
  totalLigne: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
});

const purchaseDraftLineSchema = z.object({
  articleService: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return "";
      }
      return String(value).trim();
    },
    z.string().max(255),
  ),
  quantite: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  prixUnitaireTtc: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  totalLigne: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
});

const purchaseCreateBodySchema = z.object({
  objet: optionalString(255),
  description: optionalString(4000),
  quantite: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  estimationCout: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive().optional(),
  ),
  justificationScientifique: optionalString(8000),
  urgente: optionalBoolean(),
  modeSoumission: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return String(value).trim().toUpperCase();
    },
    z.enum(["BROUILLON", "FINALISATION"]).optional(),
  ),
  dateDemande: optionalDate(),
  demandeurNom: optionalString(120),
  demandeurPrenom: optionalString(120),
  justificationBesoin: optionalString(8000),
  rubriqueBudgetaire: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return String(value).trim().toUpperCase();
    },
    z.enum(PURCHASE_RUBRIQUES).optional(),
  ),
  directionServiceLabo: optionalString(255),
  langueDocument: z
    .preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return undefined;
        }
        return String(value).trim().toLowerCase();
      },
      z.enum(["fr", "en", "ar"]).optional(),
    ),
  lignes: z.preprocess(
    parseJsonArray,
    z.array(purchaseDraftLineSchema).max(50).optional(),
  ),
  typesPiecesJointes: z.preprocess(
    parseJsonArray,
    z.array(z.enum(PURCHASE_ATTACHMENT_TYPES)).max(3).optional(),
  ),
  autrePieceJointe: optionalString(255),
})
  .superRefine((value, ctx) => {
    const isDraftMode = value.modeSoumission === "BROUILLON";
    const hasExpressionFields =
      Boolean(value.justificationBesoin) ||
      Boolean(value.rubriqueBudgetaire) ||
      (Array.isArray(value.lignes) && value.lignes.length > 0) ||
      Boolean(value.dateDemande);

    if (hasExpressionFields && !isDraftMode) {
      if (!value.justificationBesoin?.trim()) {
        ctx.addIssue({
          path: ["justificationBesoin"],
          code: z.ZodIssueCode.custom,
          message: "La justification du besoin est obligatoire.",
        });
      }

      if (!value.rubriqueBudgetaire) {
        ctx.addIssue({
          path: ["rubriqueBudgetaire"],
          code: z.ZodIssueCode.custom,
          message: "La rubrique budgetaire est obligatoire.",
        });
      }

      if (!Array.isArray(value.lignes) || value.lignes.length === 0) {
        ctx.addIssue({
          path: ["lignes"],
          code: z.ZodIssueCode.custom,
          message: "Au moins un article ou service est requis.",
        });
      } else {
        value.lignes.forEach((line, index) => {
          if (!String(line.articleService || "").trim()) {
            ctx.addIssue({
              path: ["lignes", index, "articleService"],
              code: z.ZodIssueCode.custom,
              message: "Chaque ligne doit contenir un article ou un service.",
            });
          }

          if (!Number.isFinite(line.quantite) || line.quantite <= 0) {
            ctx.addIssue({
              path: ["lignes", index, "quantite"],
              code: z.ZodIssueCode.custom,
              message: "La quantite doit etre superieure a 0.",
            });
          }

          if (
            !Number.isFinite(line.prixUnitaireTtc) ||
            line.prixUnitaireTtc < 0
          ) {
            ctx.addIssue({
              path: ["lignes", index, "prixUnitaireTtc"],
              code: z.ZodIssueCode.custom,
              message: "Le prix unitaire TTC est invalide.",
            });
          }

          if (line.totalLigne !== undefined) {
            const expected = line.quantite * line.prixUnitaireTtc;
            if (Math.abs(line.totalLigne - expected) > 0.01) {
              ctx.addIssue({
                path: ["lignes", index, "totalLigne"],
                code: z.ZodIssueCode.custom,
                message:
                  "Le total de ligne doit correspondre a quantite x prix unitaire.",
              });
            }
          }
        });
      }

      if (Array.isArray(value.typesPiecesJointes)) {
        const unique = new Set(value.typesPiecesJointes);
        if (unique.size !== value.typesPiecesJointes.length) {
          ctx.addIssue({
            path: ["typesPiecesJointes"],
            code: z.ZodIssueCode.custom,
            message: "Chaque type de piece jointe doit etre selectionne une seule fois.",
          });
        }
      }

      if (
        Array.isArray(value.typesPiecesJointes) &&
        value.typesPiecesJointes.includes("AUTRES") &&
        !value.autrePieceJointe?.trim()
      ) {
        ctx.addIssue({
          path: ["autrePieceJointe"],
          code: z.ZodIssueCode.custom,
          message: "Precisez le type 'Autres'.",
        });
      }

      return;
    }

    if (hasExpressionFields) {
      if (Array.isArray(value.typesPiecesJointes)) {
        const unique = new Set(value.typesPiecesJointes);
        if (unique.size !== value.typesPiecesJointes.length) {
          ctx.addIssue({
            path: ["typesPiecesJointes"],
            code: z.ZodIssueCode.custom,
            message: "Chaque type de piece jointe doit etre selectionne une seule fois.",
          });
        }
      }

      if (
        Array.isArray(value.typesPiecesJointes) &&
        value.typesPiecesJointes.includes("AUTRES") &&
        !value.autrePieceJointe?.trim()
      ) {
        ctx.addIssue({
          path: ["autrePieceJointe"],
          code: z.ZodIssueCode.custom,
          message: "Precisez le type 'Autres'.",
        });
      }

      return;
    }

    if (!value.objet?.trim()) {
      ctx.addIssue({
        path: ["objet"],
        code: z.ZodIssueCode.custom,
        message: "L'objet est obligatoire.",
      });
    }

    if (!value.description?.trim()) {
      ctx.addIssue({
        path: ["description"],
        code: z.ZodIssueCode.custom,
        message: "La description est obligatoire.",
      });
    }

    if (!value.justificationScientifique?.trim()) {
      ctx.addIssue({
        path: ["justificationScientifique"],
        code: z.ZodIssueCode.custom,
        message: "La justification scientifique est obligatoire.",
      });
    }

    if (!value.quantite || value.quantite < 1) {
      ctx.addIssue({
        path: ["quantite"],
        code: z.ZodIssueCode.custom,
        message: "La quantite doit etre superieure ou egale a 1.",
      });
    }
  });

const purchaseUpdateBodySchema = purchaseCreateBodySchema;

const purchasesQuerySchema = z.object({
  q: optionalString(200),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(PURCHASE_STATUS_VALUES).optional(),
  ),
  page: paginationSchema.page,
  limit: paginationSchema.limit,
});

const purchaseDecisionBodySchema = z
  .object({
    decision: z.enum(["ACCEPTER", "REJETER"]),
    commentaire: optionalString(2000),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJETER" && !value.commentaire?.trim()) {
      ctx.addIssue({
        path: ["commentaire"],
        code: z.ZodIssueCode.custom,
        message: "Le commentaire est obligatoire pour un rejet.",
      });
    }
  });

const purchaseStatusBodySchema = z
  .object({
    statut: z.enum(PURCHASE_STATUS_VALUES),
    commentaire: optionalString(2000),
    dateLivraison: optionalDate(),
  })
  .superRefine((value, ctx) => {
    if (value.statut === "REJETEE" && !value.commentaire?.trim()) {
      ctx.addIssue({
        path: ["commentaire"],
        code: z.ZodIssueCode.custom,
        message: "Le commentaire est obligatoire pour un rejet.",
      });
    }
  });

const notificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const notificationsQuerySchema = z.object({
  nonLues: optionalBoolean(),
  page: paginationSchema.page,
  limit: safeLimitSchema,
});

const notificationPreferencesBodySchema = z.object({
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
  conversationIdParamSchema,
  messageIdParamSchema,
  attachmentIdParamSchema,
  conversationCreateBodySchema,
  sendMessageBodySchema,
  groupConversationCreateBodySchema,
  groupConversationMembersBodySchema,
  groupConversationMemberParamSchema,
  projectIdParamSchema,
  projectMemberParamSchema,
  projectBodySchema,
  projectUpdateBodySchema,
  projectMemberBodySchema,
  projectsQuerySchema,
  purchaseIdParamSchema,
  purchaseAttachmentParamSchema,
  purchaseCreateBodySchema,
  purchaseUpdateBodySchema,
  purchasesQuerySchema,
  purchaseDecisionBodySchema,
  purchaseStatusBodySchema,
  notificationIdParamSchema,
  notificationsQuerySchema,
  notificationPreferencesBodySchema,
  PURCHASE_RUBRIQUES,
  PURCHASE_ATTACHMENT_TYPES,
  PURCHASE_STATUS_VALUES,
};
