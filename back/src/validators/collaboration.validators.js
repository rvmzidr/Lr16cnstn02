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

const purchaseCreateBodySchema = z.object({
  projetId: z.coerce.number().int().positive(),
  objet: cleanString(255),
  description: cleanString(4000),
  quantite: z.coerce.number().int().positive().default(1),
  estimationCout: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive().optional(),
  ),
  justificationScientifique: cleanString(8000),
  urgente: optionalBoolean(),
});

const purchasesQuerySchema = z.object({
  q: optionalString(200),
  statut: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .enum([
        "EN_ATTENTE",
        "ACCEPTEE",
        "REJETEE",
        "EN_COURS_TRAITEMENT",
        "COMMANDEE",
        "LIVREE",
      ])
      .optional(),
  ),
  projetId: optionalPositiveInt(),
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
    statut: z.enum([
      "ACCEPTEE",
      "REJETEE",
      "EN_COURS_TRAITEMENT",
      "COMMANDEE",
      "LIVREE",
    ]),
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
  purchaseCreateBodySchema,
  purchasesQuerySchema,
  purchaseDecisionBodySchema,
  purchaseStatusBodySchema,
  notificationIdParamSchema,
  notificationsQuerySchema,
  notificationPreferencesBodySchema,
};
