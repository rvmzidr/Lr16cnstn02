const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const {
  ACCOUNT_STATUS,
  ADMIN_ROLES,
  ARTICLE_STATUS,
  NEWS_STATUS,
  ROLES,
} = require("../config/constants");
const { toBigInt } = require("../utils/bigint");
const { buildMeta, getPagination } = require("../utils/pagination");
const {
  actualiteInclude,
  articleInclude,
  utilisateurCompletInclude,
} = require("../utils/prisma-selects");
const AppError = require("../utils/app-error");
const {
  serializeActualite,
  serializeArticle,
  serializeUtilisateur,
} = require("../utils/serializers");
const {
  recupererAttestationDoctorantOuErreur,
} = require("./member-profile.service");
const {
  createNotifications,
  getNotificationPreferences: collaborationGetNotificationPreferences,
  updateNotificationPreferences: collaborationUpdateNotificationPreferences,
} = require("./collaboration.service");
const {
  getArticlePdfAttachmentMap,
  getLatestArticlePdfAttachment,
  serializeArticlePdfAttachment,
} = require("./article-pdf.service");

const ADMIN_NOTIFICATION_TYPES_BY_CATEGORY = Object.freeze({
  registration: ["NOUVELLE_INSCRIPTION"],
  account: ["COMPTE_VALIDE", "COMPTE_REJETE", "COMPTE_DESACTIVE"],
  message: ["NOUVEAU_MESSAGE"],
  role: ["SYSTEME"],
});

const ADMIN_NOTIFICATION_TYPES = Object.freeze(
  [...new Set(Object.values(ADMIN_NOTIFICATION_TYPES_BY_CATEGORY).flat())],
);

function getAdminNotificationTypes(filterType = "all") {
  if (!filterType || filterType === "all") {
    return ADMIN_NOTIFICATION_TYPES;
  }

  return ADMIN_NOTIFICATION_TYPES_BY_CATEGORY[filterType] || [];
}

function mapAdminNotificationCategory(typeNotification) {
  if (ADMIN_NOTIFICATION_TYPES_BY_CATEGORY.registration.includes(typeNotification)) {
    return "registration";
  }

  if (ADMIN_NOTIFICATION_TYPES_BY_CATEGORY.account.includes(typeNotification)) {
    return "account";
  }

  if (ADMIN_NOTIFICATION_TYPES_BY_CATEGORY.message.includes(typeNotification)) {
    return "message";
  }

  if (ADMIN_NOTIFICATION_TYPES_BY_CATEGORY.role.includes(typeNotification)) {
    return "role";
  }

  return null;
}

function normalizeNotificationReadFilter(readFilter, nonLues) {
  if (readFilter === "read") {
    return true;
  }

  if (readFilter === "unread" || nonLues === true) {
    return false;
  }

  return undefined;
}

function splitNomComplet(nomComplet, utilisateurActuel) {
  const cleaned = String(nomComplet || "")
    .trim()
    .replace(/\s+/g, " ");

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return {
      prenom: utilisateurActuel.prenom,
      nom: utilisateurActuel.nom,
    };
  }

  if (parts.length === 1) {
    return {
      prenom: parts[0],
      nom: utilisateurActuel.nom,
    };
  }

  return {
    prenom: parts.slice(0, -1).join(" "),
    nom: parts[parts.length - 1],
  };
}

async function enrichSerializedArticlesWithPdf(articles) {
  const attachmentsByArticleId = await getArticlePdfAttachmentMap(
    articles.map((article) => article.id),
  );

  return articles.map((article) =>
    serializeArticle(
      article,
      serializeArticlePdfAttachment(attachmentsByArticleId.get(String(article.id))),
    ),
  );
}

function buildCountMap(rows, keyField, fallbackKey = "INCONNU") {
  return new Map(
    (rows || []).map((row) => [
      row?.[keyField] ?? fallbackKey,
      Number(row?._count?._all || row?._count || 0),
    ]),
  );
}

function buildMonthlyBuckets(monthCount = 6) {
  const today = new Date();
  const buckets = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const bucketDate = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const year = bucketDate.getFullYear();
    const month = bucketDate.getMonth();
    const monthNumber = String(month + 1).padStart(2, "0");

    buckets.push({
      key: `${year}-${monthNumber}`,
      label: `${monthNumber}/${year}`,
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    });
  }

  return buckets;
}

function buildMonthlySeries(rows, monthCount = 6) {
  const buckets = buildMonthlyBuckets(monthCount);
  const valuesByBucket = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const row of rows || []) {
    if (!row?.cree_le) {
      continue;
    }

    const createdAt = new Date(row.cree_le);
    const key = `${createdAt.getFullYear()}-${String(
      createdAt.getMonth() + 1,
    ).padStart(2, "0")}`;

    if (valuesByBucket.has(key)) {
      valuesByBucket.set(key, (valuesByBucket.get(key) || 0) + 1);
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: valuesByBucket.get(bucket.key) || 0,
  }));
}

function mapAccountStatusCounts(rows) {
  const counts = buildCountMap(rows, "statut");
  const orderedStatuses = [
    ACCOUNT_STATUS.EN_ATTENTE,
    ACCOUNT_STATUS.ACTIF,
    ACCOUNT_STATUS.REJETE,
    ACCOUNT_STATUS.DESACTIVE,
  ];

  return orderedStatuses.map((status) => ({
    status,
    label: status,
    value: counts.get(status) || 0,
  }));
}

function mapRoleDistribution(rows) {
  const counts = buildCountMap(rows, "role", "SANS_ROLE");
  const orderedRoles = [ROLES.MEMBRE, ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR, null];

  return orderedRoles.map((role) => {
    const key = role || "SANS_ROLE";
    return {
      role: role || "SANS_ROLE",
      label: role || "SANS_ROLE",
      value: counts.get(key) || 0,
    };
  });
}

function buildActivityLabel(item) {
  return item.label.length > 120
    ? `${item.label.slice(0, 117).trimEnd()}...`
    : item.label;
}

function formatDashboardActivity(items) {
  return items
    .filter(Boolean)
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .slice(0, 10)
    .map((item) => ({
      ...item,
      label: buildActivityLabel(item),
    }));
}

async function recupererKPITechnique(userId) {
  const recentRegistrationLimit = 5;
  const sixMonthsAgo = buildMonthlyBuckets(6)[0]?.start || new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    inscriptionsEnAttente,
    comptesActifs,
    comptesDesactives,
    totalUtilisateurs,
    notificationsNonLues,
    messagesNonLus,
    derniersComptes,
    comptesParStatut,
    comptesParRole,
    nouveauxComptesParMois,
    recentRoleChanges,
    recentAccountHistory,
    recentUnreadMessages,
  ] = await prisma.$transaction([
    prisma.utilisateurs.count({ where: { statut: ACCOUNT_STATUS.EN_ATTENTE } }),
    prisma.utilisateurs.count({ where: { statut: ACCOUNT_STATUS.ACTIF } }),
    prisma.utilisateurs.count({ where: { statut: ACCOUNT_STATUS.DESACTIVE } }),
    prisma.utilisateurs.count(),
    prisma.notifications.count({
      where: {
        utilisateur_id: userId,
        est_lue: false,
      },
    }),
    prisma.lectures_message.count({
      where: {
        utilisateur_id: userId,
        lu: false,
        messages: {
          expediteur_id: {
            not: userId,
          },
        },
      },
    }),
    prisma.utilisateurs.findMany({
      where: {
        statut: ACCOUNT_STATUS.EN_ATTENTE,
      },
      include: utilisateurCompletInclude,
      orderBy: { cree_le: "desc" },
      take: recentRegistrationLimit,
    }),
    prisma.utilisateurs.groupBy({
      by: ["statut"],
      _count: {
        _all: true,
      },
    }),
    prisma.utilisateurs.groupBy({
      by: ["role"],
      _count: {
        _all: true,
      },
    }),
    prisma.utilisateurs.findMany({
      where: {
        cree_le: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        cree_le: true,
      },
    }),
    prisma.historiques_compte.findMany({
      where: {
        cree_le: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        ancien_role: true,
        nouveau_role: true,
      },
    }),
    prisma.historiques_compte.findMany({
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        cree_le: true,
        utilisateur_id: true,
        ancien_statut: true,
        nouveau_statut: true,
        ancien_role: true,
        nouveau_role: true,
        utilisateur: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    }),
    prisma.messages.findMany({
      where: {
        expediteur_id: {
          not: userId,
        },
        lectures_message: {
          some: {
            utilisateur_id: userId,
            lu: false,
          },
        },
      },
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      take: 6,
      select: {
        id: true,
        conversation_id: true,
        contenu: true,
        cree_le: true,
        utilisateurs: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    }),
  ]);

  const roleChangesLast30Days = recentRoleChanges.filter(
    (history) => history.ancien_role !== history.nouveau_role,
  ).length;

  const recentActivity = formatDashboardActivity([
    ...derniersComptes.map((compte) => ({
      id: `registration-${compte.id}`,
      type: "INSCRIPTION",
      label: `Nouvelle inscription en attente : ${compte.prenom} ${compte.nom}`,
      timestamp: compte.cree_le,
      link: "/dashboard/registrations",
    })),
    ...recentUnreadMessages.map((message) => ({
      id: `message-${message.id}`,
      type: "MESSAGE",
      label: `Message non lu de ${message.utilisateurs?.prenom || "Utilisateur"} ${message.utilisateurs?.nom || ""} : ${message.contenu}`,
      timestamp: message.cree_le,
      link: "/dashboard/messages",
    })),
    ...recentAccountHistory.map((history) => ({
      id: `account-${history.id}`,
      type:
        history.ancien_role !== history.nouveau_role ? "ROLE" : "COMPTE",
      label:
        history.ancien_role !== history.nouveau_role
          ? `Role modifie pour ${history.utilisateur?.prenom || "Utilisateur"} ${history.utilisateur?.nom || ""} : ${
              history.ancien_role || "AUCUN"
            } -> ${history.nouveau_role || "AUCUN"}`
          : `Statut compte ${history.utilisateur?.prenom || "Utilisateur"} ${history.utilisateur?.nom || ""} : ${
              history.ancien_statut || "INCONNU"
            } -> ${history.nouveau_statut || "INCONNU"}`,
      timestamp: history.cree_le,
      link:
        history.ancien_role !== history.nouveau_role
          ? "/dashboard/roles"
          : "/dashboard/users",
    })),
  ]);

  return {
    inscriptionsEnAttente,
    comptesActifs,
    comptesDesactives,
    totalUtilisateurs,
    alertesSysteme: 0,
    dernieresInscriptions: {
      elements: derniersComptes.map(serializeUtilisateur),
    },
    kpis: {
      pendingRegistrations: inscriptionsEnAttente,
      activeAccounts: comptesActifs,
      roleChangesLast30Days,
      unreadNotifications: notificationsNonLues,
      unreadMessages: messagesNonLus,
    },
    charts: {
      accountsByStatus: mapAccountStatusCounts(comptesParStatut),
      rolesDistribution: mapRoleDistribution(comptesParRole),
      newAccountsPerMonth: buildMonthlySeries(nouveauxComptesParMois),
    },
    recentActivity,
  };
}

async function creerHistoriqueCompte(
  tx,
  utilisateur,
  adminId,
  { nouveauStatut, nouveauRole, commentaire },
) {
  return tx.historiques_compte.create({
    data: {
      utilisateur_id: utilisateur.id,
      ancien_statut: utilisateur.statut,
      nouveau_statut: nouveauStatut ?? utilisateur.statut,
      ancien_role: utilisateur.role,
      nouveau_role:
        nouveauRole === undefined ? utilisateur.role : (nouveauRole ?? null),
      commentaire: commentaire || null,
      modifie_par: adminId,
    },
  });
}

async function verifierEquipeRecherche(equipeRechercheId) {
  if (!equipeRechercheId) {
    return;
  }

  const equipe = await prisma.equipes_recherche.findUnique({
    where: { id: toBigInt(equipeRechercheId) },
  });

  if (!equipe) {
    throw new AppError("Equipe de recherche introuvable.", 404);
  }
}

async function recupererCompteOuErreur(userId) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    include: utilisateurCompletInclude,
  });

  if (!utilisateur) {
    throw new AppError("Compte introuvable.", 404);
  }

  return utilisateur;
}

async function recupererArticleAdminOuErreur(articleId) {
  const article = await prisma.articles.findUnique({
    where: { id: toBigInt(articleId) },
    include: articleInclude,
  });

  if (!article) {
    throw new AppError("Article introuvable.", 404);
  }

  return article;
}

async function listerInscriptions(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const ordre = filters.ordre === "asc" ? "asc" : "desc";
  const normalizedSearch = (filters.q || "").trim();
  const conditions = [];

  if (normalizedSearch) {
    conditions.push({
      OR: [
        { nom: { contains: normalizedSearch } },
        { prenom: { contains: normalizedSearch } },
        {
          email_institutionnel: {
            contains: normalizedSearch,
          },
        },
        {
          profil: {
            grade: {
              contains: normalizedSearch,
            },
          },
        },
      ],
    });
  }

  if (filters.role) {
    conditions.push({
      OR: [
        { role_demande: filters.role },
        { role: filters.role },
      ],
    });
  }

  const statutCondition = {
    statut: filters.statut || ACCOUNT_STATUS.EN_ATTENTE,
  };

  const where = conditions.length
    ? {
        AND: [statutCondition, ...conditions],
      }
    : statutCondition;

  const [
    total,
    pendingCount,
    activeCount,
    refusedCount,
    doctorantsEnAttente,
    attestationsDisponibles,
    comptes,
  ] = await prisma.$transaction([
    prisma.utilisateurs.count({ where }),
    prisma.utilisateurs.count({
      where: { statut: ACCOUNT_STATUS.EN_ATTENTE },
    }),
    prisma.utilisateurs.count({
      where: { statut: ACCOUNT_STATUS.ACTIF },
    }),
    prisma.utilisateurs.count({
      where: { statut: ACCOUNT_STATUS.REJETE },
    }),
    prisma.profils_utilisateur.count({
      where: {
        est_doctorant: true,
        utilisateur: {
          statut: ACCOUNT_STATUS.EN_ATTENTE,
        },
      },
    }),
    prisma.informations_doctorales.count({
      where: {
        attestation_chemin: {
          not: null,
        },
        utilisateurs: {
          statut: ACCOUNT_STATUS.EN_ATTENTE,
        },
      },
    }),
    prisma.utilisateurs.findMany({
      where,
      include: utilisateurCompletInclude,
      orderBy: { cree_le: ordre },
      skip,
      take,
    }),
  ]);

  return {
    inscriptions: comptes.map(serializeUtilisateur),
    rolesDisponibles: Object.values(ROLES),
    meta: buildMeta(total, page, limit),
    statistiques: {
      enAttente: pendingCount,
      actives: activeCount,
      refusees: refusedCount,
      total,
      doctorantsEnAttente,
      attestationsDisponibles,
    },
  };
}

async function recupererInscriptionDetail(userId) {
  const utilisateur = await recupererCompteOuErreur(userId);
  return serializeUtilisateur(utilisateur);
}

async function validerInscription(adminId, userId, payload) {
  const utilisateur = await recupererCompteOuErreur(userId);

  if (
    ![ACCOUNT_STATUS.EN_ATTENTE, ACCOUNT_STATUS.REJETE].includes(
      utilisateur.statut,
    )
  ) {
    throw new AppError("Ce compte n'est pas dans un etat validable.", 409);
  }

  const role = payload.role || utilisateur.role_demande || ROLES.MEMBRE;

  const compte = await prisma.$transaction(async (tx) => {
    await tx.utilisateurs.update({
      where: { id: userId },
      data: {
        statut: ACCOUNT_STATUS.ACTIF,
        role,
        actif: true,
        valide_par: adminId,
        valide_le: new Date(),
        motif_rejet: null,
      },
    });

    await creerHistoriqueCompte(tx, utilisateur, adminId, {
      nouveauStatut: ACCOUNT_STATUS.ACTIF,
      nouveauRole: role,
      commentaire: payload.commentaire || "Compte valide par l'administration.",
    });

    await createNotifications(
      tx,
      [utilisateur.id],
      {
        typeNotification: "COMPTE_VALIDE",
        titre: "Compte valide",
        message: `Votre compte a ete valide avec le role ${role}.`,
        lienDirect: "/dashboard",
      },
      "comptes",
    );

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  return serializeUtilisateur(compte);
}

async function refuserInscription(adminId, userId, payload) {
  const utilisateur = await recupererCompteOuErreur(userId);

  if (utilisateur.statut !== ACCOUNT_STATUS.EN_ATTENTE) {
    throw new AppError(
      "Seules les inscriptions en attente peuvent etre refusees.",
      409,
    );
  }

  const compte = await prisma.$transaction(async (tx) => {
    await tx.utilisateurs.update({
      where: { id: userId },
      data: {
        statut: ACCOUNT_STATUS.REJETE,
        role: null,
        actif: false,
        valide_par: adminId,
        valide_le: new Date(),
        motif_rejet: payload.motifRejet,
      },
    });

    await creerHistoriqueCompte(tx, utilisateur, adminId, {
      nouveauStatut: ACCOUNT_STATUS.REJETE,
      nouveauRole: null,
      commentaire: payload.motifRejet,
    });

    await createNotifications(
      tx,
      [utilisateur.id],
      {
        typeNotification: "COMPTE_REJETE",
        titre: "Inscription refusee",
        message: payload.motifRejet
          ? `Votre inscription a ete refusee. Motif: ${payload.motifRejet}`
          : "Votre inscription a ete refusee.",
        lienDirect: "/connexion",
      },
      "comptes",
    );

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  return serializeUtilisateur(compte);
}

async function listerComptes(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const conditions = [];

  if (filters.q) {
    conditions.push({
      OR: [
        { nom: { contains: filters.q } },
        { prenom: { contains: filters.q } },
        {
          email_institutionnel: {
            contains: filters.q,
          },
        },
      ],
    });
  }

  if (filters.statut) {
    conditions.push({ statut: filters.statut });
  }

  if (filters.role) {
    conditions.push({ role: filters.role });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [total, actifs, desactives, doctorants, comptes] =
    await prisma.$transaction([
      prisma.utilisateurs.count({ where }),
      prisma.utilisateurs.count({
        where: { statut: ACCOUNT_STATUS.ACTIF },
      }),
      prisma.utilisateurs.count({
        where: { statut: ACCOUNT_STATUS.DESACTIVE },
      }),
      prisma.profils_utilisateur.count({
        where: {
          est_doctorant: true,
          utilisateur: {
            statut: ACCOUNT_STATUS.ACTIF,
          },
        },
      }),
      prisma.utilisateurs.findMany({
        where,
        include: utilisateurCompletInclude,
        orderBy: [{ cree_le: "desc" }],
        skip,
        take,
      }),
    ]);

  return {
    comptes: comptes.map(serializeUtilisateur),
    meta: buildMeta(total, page, limit),
    statistiques: {
      actifs,
      desactives,
      doctorants,
      total,
    },
  };
}

async function activerCompte(adminId, userId) {
  const utilisateur = await recupererCompteOuErreur(userId);

  if (!utilisateur.role) {
    throw new AppError(
      "Un role doit etre attribue avant l'activation du compte.",
      409,
    );
  }

  const compte = await prisma.$transaction(async (tx) => {
    await tx.utilisateurs.update({
      where: { id: userId },
      data: {
        statut: ACCOUNT_STATUS.ACTIF,
        actif: true,
        motif_rejet: null,
      },
    });

    await creerHistoriqueCompte(tx, utilisateur, adminId, {
      nouveauStatut: ACCOUNT_STATUS.ACTIF,
      commentaire: "Compte reactive par l'administration.",
    });

    await createNotifications(
      tx,
      [utilisateur.id],
      {
        typeNotification: "COMPTE_VALIDE",
        titre: "Compte reactive",
        message: "Votre compte a ete reactive par l'administration.",
        lienDirect: "/dashboard",
      },
      "comptes",
    );

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  return serializeUtilisateur(compte);
}

async function desactiverCompte(adminId, userId) {
  const utilisateur = await recupererCompteOuErreur(userId);

  if (!utilisateur.role) {
    throw new AppError("Ce compte n'a pas de role attribue.", 409);
  }

  const compte = await prisma.$transaction(async (tx) => {
    await tx.utilisateurs.update({
      where: { id: userId },
      data: {
        statut: ACCOUNT_STATUS.DESACTIVE,
        actif: false,
      },
    });

    await creerHistoriqueCompte(tx, utilisateur, adminId, {
      nouveauStatut: ACCOUNT_STATUS.DESACTIVE,
      commentaire: "Compte desactive par l'administration.",
    });

    await createNotifications(
      tx,
      [utilisateur.id],
      {
        typeNotification: "COMPTE_DESACTIVE",
        titre: "Compte desactive",
        message: "Votre compte a ete desactive par l'administration.",
        lienDirect: "/connexion",
      },
      "comptes",
    );

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  return serializeUtilisateur(compte);
}

async function changerRoleCompte(adminId, userId, payload) {
  const utilisateur = await recupererCompteOuErreur(userId);

  if (
    ![ACCOUNT_STATUS.ACTIF, ACCOUNT_STATUS.DESACTIVE].includes(
      utilisateur.statut,
    )
  ) {
    throw new AppError(
      "Le role ne peut etre modifie que pour un compte valide.",
      409,
    );
  }

  const compte = await prisma.$transaction(async (tx) => {
    await tx.utilisateurs.update({
      where: { id: userId },
      data: {
        role: payload.role,
      },
    });

    await creerHistoriqueCompte(tx, utilisateur, adminId, {
      nouveauRole: payload.role,
      commentaire:
        payload.commentaire || "Role mis a jour par l'administration.",
    });

    await createNotifications(
      tx,
      [utilisateur.id],
      {
        typeNotification: "SYSTEME",
        titre: "Role mis a jour",
        message: payload.commentaire
          ? `Votre role est maintenant ${payload.role}. ${payload.commentaire}`
          : `Votre role est maintenant ${payload.role}.`,
        lienDirect: "/dashboard",
      },
      "comptes",
    );

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  return serializeUtilisateur(compte);
}

async function listerArticlesEnAttente() {
  const [enAttente, valides, rejetes, publies, articles, articlesValides] =
    await prisma.$transaction([
      prisma.articles.count({
        where: { statut: ARTICLE_STATUS.SOUMIS },
      }),
      prisma.articles.count({
        where: { statut: ARTICLE_STATUS.VALIDE },
      }),
      prisma.articles.count({
        where: { statut: ARTICLE_STATUS.REJETE },
      }),
      prisma.articles.count({
        where: { statut: ARTICLE_STATUS.PUBLIE },
      }),
      prisma.articles.findMany({
        where: { statut: ARTICLE_STATUS.SOUMIS },
        include: articleInclude,
        orderBy: [{ date_soumission: "asc" }, { cree_le: "asc" }],
      }),
      prisma.articles.findMany({
        where: { statut: ARTICLE_STATUS.VALIDE },
        include: articleInclude,
        orderBy: [{ date_validation: "desc" }, { cree_le: "desc" }],
      }),
    ]);

  return {
    articles: await enrichSerializedArticlesWithPdf(articles),
    articlesValides: await enrichSerializedArticlesWithPdf(articlesValides),
    statistiques: {
      enAttente,
      valides,
      rejetes,
      publies,
    },
  };
}

async function validerArticle(adminId, articleId) {
  const article = await recupererArticleAdminOuErreur(articleId);

  if (article.statut !== ARTICLE_STATUS.SOUMIS) {
    throw new AppError(
      "Seuls les articles en attente peuvent etre valides.",
      409,
    );
  }

  const articleMisAJour = await prisma.$transaction(async (tx) => {
    const updated = await tx.articles.update({
      where: { id: toBigInt(articleId) },
      data: {
        statut: ARTICLE_STATUS.VALIDE,
        valide_par: adminId,
        date_validation: new Date(),
        motif_rejet: null,
        modifie_par: adminId,
      },
      include: articleInclude,
    });

    const recipients = [
      updated.deposant_id,
      ...updated.auteurs_article.map((item) => item.utilisateur_id),
    ].filter((value) => value && value !== adminId);

    await createNotifications(
      tx,
      recipients,
      {
        typeNotification: "ARTICLE_VALIDE",
        titre: "Article valide",
        message: `Votre article \"${updated.titre}\" a ete valide.`,
        articleId: updated.id,
        lienDirect: `/dashboard/articles`,
      },
      "articles",
    );

    return updated;
  });

  const attachment = await getLatestArticlePdfAttachment(articleMisAJour.id);
  return serializeArticle(
    articleMisAJour,
    serializeArticlePdfAttachment(attachment),
  );
}

async function refuserArticle(adminId, articleId, payload) {
  const article = await recupererArticleAdminOuErreur(articleId);

  if (article.statut !== ARTICLE_STATUS.SOUMIS) {
    throw new AppError(
      "Seuls les articles en attente peuvent etre refuses.",
      409,
    );
  }

  const articleMisAJour = await prisma.$transaction(async (tx) => {
    const updated = await tx.articles.update({
      where: { id: toBigInt(articleId) },
      data: {
        statut: ARTICLE_STATUS.REJETE,
        valide_par: adminId,
        date_validation: new Date(),
        motif_rejet: payload.motifRejet,
        modifie_par: adminId,
      },
      include: articleInclude,
    });

    const recipients = [
      updated.deposant_id,
      ...updated.auteurs_article.map((item) => item.utilisateur_id),
    ].filter((value) => value && value !== adminId);

    await createNotifications(
      tx,
      recipients,
      {
        typeNotification: "ARTICLE_REJETE",
        titre: "Article rejete",
        message: `Votre article \"${updated.titre}\" a ete rejete. Motif: ${payload.motifRejet}`,
        articleId: updated.id,
        lienDirect: `/dashboard/articles`,
      },
      "articles",
    );

    return updated;
  });

  const attachment = await getLatestArticlePdfAttachment(articleMisAJour.id);
  return serializeArticle(
    articleMisAJour,
    serializeArticlePdfAttachment(attachment),
  );
}

async function publierArticle(adminId, articleId) {
  const article = await recupererArticleAdminOuErreur(articleId);

  if (article.statut !== ARTICLE_STATUS.VALIDE) {
    throw new AppError("Seuls les articles valides peuvent etre publies.", 409);
  }

  const articleMisAJour = await prisma.$transaction(async (tx) => {
    const updated = await tx.articles.update({
      where: { id: toBigInt(articleId) },
      data: {
        statut: ARTICLE_STATUS.PUBLIE,
        publie_le: new Date(),
        modifie_par: adminId,
      },
      include: articleInclude,
    });

    const recipients = [
      updated.deposant_id,
      ...updated.auteurs_article.map((item) => item.utilisateur_id),
    ].filter((value) => value && value !== adminId);

    await createNotifications(
      tx,
      recipients,
      {
        typeNotification: "ARTICLE_PUBLIE",
        titre: "Article publie",
        message: `Votre article \"${updated.titre}\" est maintenant publie.`,
        articleId: updated.id,
        lienDirect: `/articles/${Number(updated.id)}`,
      },
      "articles",
    );

    return updated;
  });

  const attachment = await getLatestArticlePdfAttachment(articleMisAJour.id);
  return serializeArticle(
    articleMisAJour,
    serializeArticlePdfAttachment(attachment),
  );
}

async function listerActualitesAdmin(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const conditions = [];

  if (filters.q) {
    conditions.push({
      OR: [
        { titre: { contains: filters.q } },
        { resume: { contains: filters.q } },
        { contenu: { contains: filters.q } },
      ],
    });
  }

  if (filters.statut) {
    conditions.push({ statut: filters.statut });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [total, actualites] = await prisma.$transaction([
    prisma.actualites.count({ where }),
    prisma.actualites.findMany({
      where,
      include: actualiteInclude,
      orderBy: [{ publiee_le: "desc" }, { cree_le: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    actualites: actualites.map(serializeActualite),
    meta: buildMeta(total, page, limit),
  };
}

async function creerActualite(adminId, payload) {
  await verifierEquipeRecherche(payload.equipeRechercheId);

  const statut = payload.statut || NEWS_STATUS.PUBLIEE;

  const actualite = await prisma.actualites.create({
    data: {
      titre: payload.titre,
      resume: payload.resume || null,
      contenu: payload.contenu,
      auteur_id: adminId,
      equipe_recherche_id: toBigInt(payload.equipeRechercheId) ?? null,
      statut,
      publiee_le: statut === NEWS_STATUS.PUBLIEE ? new Date() : null,
    },
    include: actualiteInclude,
  });

  return serializeActualite(actualite);
}

async function modifierActualite(actualiteId, payload) {
  await verifierEquipeRecherche(payload.equipeRechercheId);

  const actuelle = await prisma.actualites.findUnique({
    where: { id: toBigInt(actualiteId) },
  });

  if (!actuelle) {
    throw new AppError("Actualite introuvable.", 404);
  }

  const statut = payload.statut || actuelle.statut;

  const actualite = await prisma.actualites.update({
    where: { id: toBigInt(actualiteId) },
    data: {
      titre: payload.titre ?? actuelle.titre,
      resume:
        payload.resume !== undefined ? payload.resume || null : actuelle.resume,
      contenu: payload.contenu ?? actuelle.contenu,
      equipe_recherche_id:
        payload.equipeRechercheId !== undefined
          ? (toBigInt(payload.equipeRechercheId) ?? null)
          : actuelle.equipe_recherche_id,
      statut,
      publiee_le:
        statut === NEWS_STATUS.PUBLIEE
          ? actuelle.publiee_le || new Date()
          : actuelle.publiee_le,
    },
    include: actualiteInclude,
  });

  return serializeActualite(actualite);
}

async function supprimerActualite(actualiteId) {
  const actuelle = await prisma.actualites.findUnique({
    where: { id: toBigInt(actualiteId) },
  });

  if (!actuelle) {
    throw new AppError("Actualite introuvable.", 404);
  }

  await prisma.actualites.delete({
    where: { id: toBigInt(actualiteId) },
  });
}

async function telechargerAttestationDoctorantAdmin(userId) {
  return recupererAttestationDoctorantOuErreur(userId);
}

async function listerNotificationsAdmin(userId, filters = {}) {
  const { page, limit, skip, take } = getPagination(filters.page, filters.limit);
  const filteredTypes = getAdminNotificationTypes(filters.type);
  const estLue = normalizeNotificationReadFilter(filters.read, filters.nonLues);

  const where = {
    utilisateur_id: userId,
    type_notification: {
      in: filteredTypes,
    },
    ...(estLue === undefined ? {} : { est_lue: estLue }),
  };

  const [total, unreadCount, notifications] = await prisma.$transaction([
    prisma.notifications.count({ where }),
    prisma.notifications.count({
      where: {
        utilisateur_id: userId,
        type_notification: {
          in: ADMIN_NOTIFICATION_TYPES,
        },
        est_lue: false,
      },
    }),
    prisma.notifications.findMany({
      where,
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: notifications.map((notification) => ({
      id: Number(notification.id),
      typeNotification: notification.type_notification,
      categorie: mapAdminNotificationCategory(notification.type_notification),
      titre: notification.titre,
      message: notification.message,
      projetId: Number(notification.projet_id) || null,
      demandeAchatId: Number(notification.demande_achat_id) || null,
      articleId: Number(notification.article_id) || null,
      conversationId: Number(notification.conversation_id) || null,
      messageId: Number(notification.message_id) || null,
      estLue: notification.est_lue,
      lueLe: notification.lue_le,
      lienDirect: notification.lien_direct,
      creeLe: notification.cree_le,
    })),
    unreadCount,
    meta: buildMeta(total, page, limit),
  };
}

async function marquerNotificationAdminLue(userId, notificationId) {
  const updated = await prisma.notifications.updateMany({
    where: {
      id: toBigInt(notificationId),
      utilisateur_id: userId,
      type_notification: {
        in: ADMIN_NOTIFICATION_TYPES,
      },
    },
    data: {
      est_lue: true,
      lue_le: new Date(),
    },
  });

  if (!updated.count) {
    throw new AppError("Notification admin introuvable.", 404);
  }

  return {
    id: Number(notificationId),
    estLue: true,
  };
}

async function marquerToutesNotificationsAdminLues(userId) {
  const result = await prisma.notifications.updateMany({
    where: {
      utilisateur_id: userId,
      type_notification: {
        in: ADMIN_NOTIFICATION_TYPES,
      },
      est_lue: false,
    },
    data: {
      est_lue: true,
      lue_le: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}

async function recupererCompteurNotificationsAdmin(userId) {
  const unreadCount = await prisma.notifications.count({
    where: {
      utilisateur_id: userId,
      type_notification: {
        in: ADMIN_NOTIFICATION_TYPES,
      },
      est_lue: false,
    },
  });

  return { unreadCount };
}

async function recupererProfilAdmin(userId) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
    },
  });

  if (!utilisateur) {
    throw new AppError("Compte administrateur introuvable.", 404);
  }

  return {
    id: utilisateur.id,
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
    emailInstitutionnel: utilisateur.email_institutionnel,
    role: utilisateur.role,
  };
}

async function mettreAJourProfilAdmin(userId, payload) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
    },
  });

  if (!utilisateur) {
    throw new AppError("Compte administrateur introuvable.", 404);
  }

  const emailInstitutionnel = payload.emailInstitutionnel.trim().toLowerCase();

  if (emailInstitutionnel !== utilisateur.email_institutionnel) {
    const duplicate = await prisma.utilisateurs.findFirst({
      where: {
        email_institutionnel: emailInstitutionnel,
        id: {
          not: userId,
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new AppError("Cet email institutionnel est deja utilise.", 409);
    }
  }

  const { nom, prenom } = splitNomComplet(payload.nomComplet, utilisateur);

  const updated = await prisma.utilisateurs.update({
    where: { id: userId },
    data: {
      nom,
      prenom,
      email_institutionnel: emailInstitutionnel,
      modifie_le: new Date(),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
    },
  });

  return {
    id: updated.id,
    nomComplet: `${updated.prenom} ${updated.nom}`.trim(),
    emailInstitutionnel: updated.email_institutionnel,
    role: updated.role,
  };
}

async function modifierMotDePasseAdmin(userId, payload) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    select: {
      id: true,
      mot_de_passe_hash: true,
    },
  });

  if (!utilisateur) {
    throw new AppError("Compte administrateur introuvable.", 404);
  }

  const motDePasseValide = await bcrypt.compare(
    payload.motDePasseActuel,
    utilisateur.mot_de_passe_hash,
  );

  if (!motDePasseValide) {
    throw new AppError("Le mot de passe actuel est invalide.", 400);
  }

  const motDePasseIdentique = await bcrypt.compare(
    payload.nouveauMotDePasse,
    utilisateur.mot_de_passe_hash,
  );

  if (motDePasseIdentique) {
    throw new AppError(
      "Le nouveau mot de passe doit etre different de l'ancien.",
      409,
    );
  }

  const motDePasseHash = await bcrypt.hash(payload.nouveauMotDePasse, 10);

  await prisma.utilisateurs.update({
    where: { id: userId },
    data: {
      mot_de_passe_hash: motDePasseHash,
      modifie_le: new Date(),
    },
  });

  return {
    updated: true,
  };
}

async function recupererPreferencesNotificationAdmin(userId) {
  return collaborationGetNotificationPreferences(userId);
}

async function mettreAJourPreferencesNotificationAdmin(userId, payload) {
  return collaborationUpdateNotificationPreferences(userId, payload);
}

module.exports = {
  listerInscriptions,
  recupererInscriptionDetail,
  validerInscription,
  refuserInscription,
  listerComptes,
  activerCompte,
  desactiverCompte,
  changerRoleCompte,
  listerArticlesEnAttente,
  validerArticle,
  refuserArticle,
  publierArticle,
  listerActualitesAdmin,
  creerActualite,
  modifierActualite,
  supprimerActualite,
  telechargerAttestationDoctorantAdmin,
  listerNotificationsAdmin,
  recupererCompteurNotificationsAdmin,
  marquerNotificationAdminLue,
  marquerToutesNotificationsAdminLues,
  recupererProfilAdmin,
  mettreAJourProfilAdmin,
  modifierMotDePasseAdmin,
  recupererPreferencesNotificationAdmin,
  mettreAJourPreferencesNotificationAdmin,
  recupererKPITechnique,
  ADMIN_ROLES,
};
