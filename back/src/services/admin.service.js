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
  const statutCible = filters.statut || ACCOUNT_STATUS.EN_ATTENTE;
  const where = {
    statut: statutCible,
  };

  const [
    total,
    pendingCount,
    doctorantsEnAttente,
    attestationsDisponibles,
    comptes,
  ] = await prisma.$transaction([
    prisma.utilisateurs.count({ where }),
    prisma.utilisateurs.count({
      where: { statut: ACCOUNT_STATUS.EN_ATTENTE },
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
      orderBy: { cree_le: "desc" },
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
      doctorantsEnAttente,
      attestationsDisponibles,
    },
  };
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
    articles: articles.map(serializeArticle),
    articlesValides: articlesValides.map(serializeArticle),
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

  const articleMisAJour = await prisma.articles.update({
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

  return serializeArticle(articleMisAJour);
}

async function refuserArticle(adminId, articleId, payload) {
  const article = await recupererArticleAdminOuErreur(articleId);

  if (article.statut !== ARTICLE_STATUS.SOUMIS) {
    throw new AppError(
      "Seuls les articles en attente peuvent etre refuses.",
      409,
    );
  }

  const articleMisAJour = await prisma.articles.update({
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

  return serializeArticle(articleMisAJour);
}

async function publierArticle(adminId, articleId) {
  const article = await recupererArticleAdminOuErreur(articleId);

  if (article.statut !== ARTICLE_STATUS.VALIDE) {
    throw new AppError("Seuls les articles valides peuvent etre publies.", 409);
  }

  const articleMisAJour = await prisma.articles.update({
    where: { id: toBigInt(articleId) },
    data: {
      statut: ARTICLE_STATUS.PUBLIE,
      publie_le: new Date(),
      modifie_par: adminId,
    },
    include: articleInclude,
  });

  return serializeArticle(articleMisAJour);
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

module.exports = {
  listerInscriptions,
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
  ADMIN_ROLES,
};
