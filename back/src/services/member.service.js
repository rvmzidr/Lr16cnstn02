const prisma = require("../config/prisma");
const {
  ACCOUNT_STATUS,
  ARTICLE_STATUS,
  EDITABLE_ARTICLE_STATUSES,
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
  buildUtilisateurData,
  cleanupStoredFile,
  enregistrerDossierMembre,
  normalizeMemberDossierPayload,
  recupererAttestationDoctorantOuErreur,
  recupererPhotoProfilOuErreur,
  recupererReferencesMembre,
  resolveProfilePhotoPath,
  stageDoctorantAttestation,
  stageProfilePhoto,
  verifierDisponibiliteIdentifiants,
  verifierReferencesProfil,
} = require("./member-profile.service");
const {
  getArticleCoverAttachmentMap,
  getArticlePdfAttachmentMap,
  getLatestArticleCoverAttachment,
  getLatestArticlePdfAttachment,
  replaceArticleCoverAttachment,
  replaceArticlePdfAttachment,
  serializeArticleCoverAttachment,
  resolveArticlePdfDownload,
  serializeArticlePdfAttachment,
  stageArticleCover,
  stageArticlePdf,
} = require("./article-pdf.service");
const { createNotifications } = require("./collaboration.service");

async function verifierCategorie(categorieId) {
  if (!categorieId) {
    return;
  }

  const categorie = await prisma.categories_article.findUnique({
    where: { id: toBigInt(categorieId) },
  });

  if (!categorie) {
    throw new AppError("Categorie d'article introuvable.", 404);
  }
}

async function recupererProfilMembre(userId) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    include: utilisateurCompletInclude,
  });

  if (!utilisateur) {
    throw new AppError("Profil membre introuvable.", 404);
  }

  return {
    utilisateur: serializeUtilisateur(utilisateur),
    references: await recupererReferencesMembre(),
  };
}

async function mettreAJourProfilMembre(userId, rawPayload, attestationFile) {
  const payload = normalizeMemberDossierPayload(rawPayload);
  await verifierReferencesProfil(payload);
  await verifierDisponibiliteIdentifiants(
    {
      emailInstitutionnel: payload.emailInstitutionnel,
      emailSecondaire: payload.emailSecondaire,
      cin: payload.cin,
      passeport: payload.passeport,
    },
    { excludeUserId: userId },
  );

  const existingUser = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    include: utilisateurCompletInclude,
  });

  if (!existingUser) {
    throw new AppError("Profil membre introuvable.", 404);
  }

  const stagedAttestation = await stageDoctorantAttestation(attestationFile);
  let filesToDeleteAfterCommit = [];

  try {
    const utilisateur = await prisma.$transaction(async (tx) => {
      await tx.utilisateurs.update({
        where: { id: userId },
        data: buildUtilisateurData(payload),
      });

      const dossierResult = await enregistrerDossierMembre(
        tx,
        userId,
        payload,
        existingUser,
        stagedAttestation,
      );
      filesToDeleteAfterCommit = dossierResult.filesToDeleteAfterCommit;

      return tx.utilisateurs.findUnique({
        where: { id: userId },
        include: utilisateurCompletInclude,
      });
    });

    await Promise.all(filesToDeleteAfterCommit.map(cleanupStoredFile));

    return {
      utilisateur: serializeUtilisateur(utilisateur),
      references: await recupererReferencesMembre(),
    };
  } catch (error) {
    await cleanupStoredFile(stagedAttestation?.chemin);
    throw error;
  }
}

async function telechargerAttestationProfilMembre(userId) {
  return recupererAttestationDoctorantOuErreur(userId);
}

async function telechargerPhotoProfilMembre(userId) {
  return recupererPhotoProfilOuErreur(userId);
}

async function televerserPhotoProfilMembre(userId, photoFile) {
  if (!photoFile) {
    throw new AppError("Aucune photo de profil n'a ete fournie.", 400);
  }

  const existingUser = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    include: utilisateurCompletInclude,
  });

  if (!existingUser) {
    throw new AppError("Profil membre introuvable.", 404);
  }

  const stagedPhoto = await stageProfilePhoto(photoFile);
  const previousPhotoPath = resolveProfilePhotoPath(
    existingUser.profil?.photo_url || null,
  );

  try {
    const utilisateur = await prisma.$transaction(async (tx) => {
      await tx.profils_utilisateur.upsert({
        where: { utilisateur_id: userId },
        update: {
          photo_url: stagedPhoto.nomStocke,
        },
        create: {
          utilisateur_id: userId,
          photo_url: stagedPhoto.nomStocke,
        },
      });

      return tx.utilisateurs.findUnique({
        where: { id: userId },
        include: utilisateurCompletInclude,
      });
    });

    if (previousPhotoPath) {
      await cleanupStoredFile(previousPhotoPath);
    }

    return {
      utilisateur: serializeUtilisateur(utilisateur),
      references: await recupererReferencesMembre(),
    };
  } catch (error) {
    await cleanupStoredFile(stagedPhoto.chemin);
    throw error;
  }
}

async function supprimerPhotoProfilMembre(userId) {
  const existingUser = await prisma.utilisateurs.findUnique({
    where: { id: userId },
    include: utilisateurCompletInclude,
  });

  if (!existingUser) {
    throw new AppError("Profil membre introuvable.", 404);
  }

  const previousPhotoPath = resolveProfilePhotoPath(
    existingUser.profil?.photo_url || null,
  );

  const utilisateur = await prisma.$transaction(async (tx) => {
    if (existingUser.profil) {
      await tx.profils_utilisateur.update({
        where: { utilisateur_id: userId },
        data: { photo_url: null },
      });
    }

    return tx.utilisateurs.findUnique({
      where: { id: userId },
      include: utilisateurCompletInclude,
    });
  });

  if (previousPhotoPath) {
    await cleanupStoredFile(previousPhotoPath);
  }

  return {
    utilisateur: serializeUtilisateur(utilisateur),
    references: await recupererReferencesMembre(),
  };
}

async function listerMembresActifs(filters = {}) {
  const where = {
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    role: {
      in: [ROLES.MEMBRE, ROLES.CHEF_LABO],
    },
    ...(filters.q
      ? {
          OR: [
            { nom: { contains: filters.q } },
            { prenom: { contains: filters.q } },
            {
              email_institutionnel: {
                contains: filters.q,
              },
            },
          ],
        }
      : {}),
  };

  const membres = await prisma.utilisateurs.findMany({
    where,
    include: utilisateurCompletInclude,
    orderBy: [{ prenom: "asc" }, { nom: "asc" }],
    take: filters.limit || 20,
  });

  return {
    elements: membres.map(serializeUtilisateur),
  };
}

async function listerActualitesMembre(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const where = {
    AND: [
      { statut: NEWS_STATUS.PUBLIEE },
      ...(filters.q
        ? [
            {
              OR: [
                { titre: { contains: filters.q } },
                { resume: { contains: filters.q } },
                { contenu: { contains: filters.q } },
              ],
            },
          ]
        : []),
    ],
  };

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
    elements: actualites.map(serializeActualite),
    meta: buildMeta(total, page, limit),
  };
}

async function recupererArticleDuDeposantOuErreur(userId, articleId) {
  const article = await prisma.articles.findFirst({
    where: {
      id: toBigInt(articleId),
      deposant_id: userId,
    },
    include: articleInclude,
  });

  if (!article) {
    throw new AppError("Article introuvable pour ce membre.", 404);
  }

  return article;
}

function verifierArticleEditable(article) {
  if (!EDITABLE_ARTICLE_STATUSES.includes(article.statut)) {
    throw new AppError(
      "Cet article n'est plus modifiable a ce stade du workflow.",
      409,
    );
  }
}

function isArticlePdfAccessibleByUser(userId, role, article) {
  if (!article) {
    return false;
  }

  if ([ROLES.ADMINISTRATEUR, ROLES.CHEF_LABO].includes(role)) {
    return true;
  }

  if (article.statut === ARTICLE_STATUS.PUBLIE) {
    return true;
  }

  if (article.deposant_id === userId) {
    return true;
  }

  return article.auteurs_article.some((item) => item.utilisateur_id === userId);
}

async function enrichSerializedArticlesWithPdf(articles) {
  const [pdfAttachmentsByArticleId, coverAttachmentsByArticleId] =
    await Promise.all([
      getArticlePdfAttachmentMap(articles.map((article) => article.id)),
      getArticleCoverAttachmentMap(articles.map((article) => article.id)),
    ]);

  return articles.map((article) =>
    serializeArticle(
      article,
      serializeArticlePdfAttachment(pdfAttachmentsByArticleId.get(String(article.id))),
      serializeArticleCoverAttachment(
        coverAttachmentsByArticleId.get(String(article.id)),
      ),
    ),
  );
}

async function serializeArticleWithAttachments(article) {
  const [pdfAttachment, coverAttachment] = await Promise.all([
    getLatestArticlePdfAttachment(article.id),
    getLatestArticleCoverAttachment(article.id),
  ]);

  return serializeArticle(
    article,
    serializeArticlePdfAttachment(pdfAttachment),
    serializeArticleCoverAttachment(coverAttachment),
  );
}

async function listerMesArticles(userId) {
  const [articles, references] = await Promise.all([
    prisma.articles.findMany({
      where: { deposant_id: userId },
      include: articleInclude,
      orderBy: [{ modifie_le: "desc" }, { cree_le: "desc" }],
    }),
    recupererReferencesMembre(),
  ]);

  const statistiques = articles.reduce(
    (accumulator, article) => {
      accumulator.total += 1;
      accumulator.parStatut[article.statut] =
        (accumulator.parStatut[article.statut] || 0) + 1;
      return accumulator;
    },
    { total: 0, parStatut: {} },
  );

  return {
    articles: await enrichSerializedArticlesWithPdf(articles),
    statistiques,
    references,
  };
}

function buildArticleDateConditions(filters) {
  const conditions = [];

  if (filters.dateDebut) {
    const dateDebut = new Date(filters.dateDebut);

    conditions.push({
      OR: [
        { publie_le: { gte: dateDebut } },
        { date_soumission: { gte: dateDebut } },
        { cree_le: { gte: dateDebut } },
      ],
    });
  }

  if (filters.dateFin) {
    const dateFin = new Date(`${filters.dateFin}T23:59:59.999Z`);

    conditions.push({
      OR: [
        { publie_le: { lte: dateFin } },
        { date_soumission: { lte: dateFin } },
        { cree_le: { lte: dateFin } },
      ],
    });
  }

  return conditions;
}

async function rechercherArticlesMembre(userId, filters) {
  if (
    filters.dateDebut &&
    filters.dateFin &&
    new Date(filters.dateDebut) > new Date(filters.dateFin)
  ) {
    throw new AppError(
      "La date de debut doit etre anterieure ou egale a la date de fin.",
      400,
    );
  }

  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const conditions = [
    {
      OR: [
        { statut: ARTICLE_STATUS.PUBLIE },
        { deposant_id: userId },
        {
          auteurs_article: {
            some: {
              utilisateur_id: userId,
            },
          },
        },
      ],
    },
  ];

  if (filters.q) {
    conditions.push({
      OR: [
        { titre: { contains: filters.q } },
        { resume: { contains: filters.q } },
        { contenu: { contains: filters.q } },
        { lien_doi: { contains: filters.q } },
      ],
    });
  }

  if (filters.categorieId) {
    conditions.push({ categorie_id: toBigInt(filters.categorieId) });
  }

  if (filters.statut) {
    conditions.push({ statut: filters.statut });
  }

  if (filters.auteurId) {
    conditions.push({
      OR: [
        { deposant_id: filters.auteurId },
        {
          auteurs_article: {
            some: {
              utilisateur_id: filters.auteurId,
            },
          },
        },
      ],
    });
  }

  if (filters.equipeRechercheId) {
    const equipeRechercheId = toBigInt(filters.equipeRechercheId);

    conditions.push({
      OR: [
        {
          deposant: {
            is: {
              profil: {
                is: {
                  equipe_recherche_id: equipeRechercheId,
                },
              },
            },
          },
        },
        {
          auteurs_article: {
            some: {
              utilisateur: {
                is: {
                  profil: {
                    is: {
                      equipe_recherche_id: equipeRechercheId,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    });
  }

  conditions.push(...buildArticleDateConditions(filters));

  const where = { AND: conditions };

  const [total, articles] = await prisma.$transaction([
    prisma.articles.count({ where }),
    prisma.articles.findMany({
      where,
      include: articleInclude,
      orderBy: [{ publie_le: "desc" }, { modifie_le: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: await enrichSerializedArticlesWithPdf(articles),
    meta: buildMeta(total, page, limit),
  };
}

async function creerVersionArticle(
  tx,
  articleId,
  utilisateurId,
  article,
  numeroVersion,
) {
  await tx.versions_article.create({
    data: {
      article_id: articleId,
      numero_version: numeroVersion,
      titre: article.titre,
      resume: article.resume,
      contenu: article.contenu,
      sauvegarde_par: utilisateurId,
    },
  });
}

async function creerArticleMembre(userId, payload) {
  await verifierCategorie(payload.categorieId);

  const statut =
    payload.action === "SOUMETTRE"
      ? ARTICLE_STATUS.SOUMIS
      : ARTICLE_STATUS.BROUILLON;
  const dateSoumission = statut === ARTICLE_STATUS.SOUMIS ? new Date() : null;

  const article = await prisma.$transaction(async (tx) => {
    const created = await tx.articles.create({
      data: {
        titre: payload.titre,
        resume: payload.resume,
        contenu: payload.contenu,
        lien_doi: payload.lienDoi,
        deposant_id: userId,
        categorie_id: toBigInt(payload.categorieId) ?? null,
        statut,
        date_soumission: dateSoumission,
        modifie_par: userId,
      },
    });

    await tx.auteurs_article.create({
      data: {
        article_id: created.id,
        utilisateur_id: userId,
        ordre_auteur: 1,
        auteur_correspondant: true,
      },
    });

    await creerVersionArticle(tx, created.id, userId, payload, 1);

    if (statut === ARTICLE_STATUS.SOUMIS) {
      const reviewers = await tx.utilisateurs.findMany({
        where: {
          role: ROLES.CHEF_LABO,
          statut: ACCOUNT_STATUS.ACTIF,
          actif: true,
        },
        select: { id: true },
      });

      await createNotifications(
        tx,
        reviewers.map((item) => item.id),
        {
          typeNotification: "NOUVEL_ARTICLE",
          titre: "Nouvel article soumis",
          message: `Un nouvel article a ete soumis: \"${payload.titre}\".`,
          articleId: created.id,
          lienDirect: `/dashboard/chef/articles?articleId=${Number(created.id)}`,
        },
        "articles",
      );
    }

    return tx.articles.findUnique({
      where: { id: created.id },
      include: articleInclude,
    });
  });

  return serializeArticleWithAttachments(article);
}

async function modifierArticleMembre(userId, articleId, payload) {
  await verifierCategorie(payload.categorieId);

  const articleExistant = await recupererArticleDuDeposantOuErreur(
    userId,
    articleId,
  );
  verifierArticleEditable(articleExistant);

  let statut = articleExistant.statut;
  let dateSoumission = articleExistant.date_soumission;
  let motifRejet = articleExistant.motif_rejet;

  if (payload.action === "SOUMETTRE") {
    statut = ARTICLE_STATUS.SOUMIS;
    dateSoumission = new Date();
    motifRejet = null;
  } else if (articleExistant.statut === ARTICLE_STATUS.REJETE) {
    statut = ARTICLE_STATUS.BROUILLON;
  }

  const article = await prisma.$transaction(async (tx) => {
    const updated = await tx.articles.update({
      where: { id: toBigInt(articleId) },
      data: {
        titre: payload.titre,
        resume: payload.resume,
        contenu: payload.contenu,
        lien_doi: payload.lienDoi,
        categorie_id:
          payload.categorieId !== undefined
            ? (toBigInt(payload.categorieId) ?? null)
            : articleExistant.categorie_id,
        statut,
        date_soumission: dateSoumission,
        motif_rejet: motifRejet,
        modifie_par: userId,
      },
    });

    const versionMax = await tx.versions_article.aggregate({
      where: { article_id: updated.id },
      _max: { numero_version: true },
    });

    await creerVersionArticle(
      tx,
      updated.id,
      userId,
      payload,
      (versionMax._max.numero_version || 0) + 1,
    );

    if (payload.action === "SOUMETTRE") {
      const reviewers = await tx.utilisateurs.findMany({
        where: {
          role: ROLES.CHEF_LABO,
          statut: ACCOUNT_STATUS.ACTIF,
          actif: true,
        },
        select: { id: true },
      });

      await createNotifications(
        tx,
        reviewers.map((item) => item.id),
        {
          typeNotification: "NOUVEL_ARTICLE",
          titre: "Article soumis pour validation",
          message: `L'article \"${payload.titre}\" a ete soumis pour validation.`,
          articleId: updated.id,
          lienDirect: `/dashboard/chef/articles?articleId=${Number(updated.id)}`,
        },
        "articles",
      );
    }

    return tx.articles.findUnique({
      where: { id: updated.id },
      include: articleInclude,
    });
  });

  return serializeArticleWithAttachments(article);
}

async function ajouterCoAuteur(userId, articleId, payload) {
  const article = await recupererArticleDuDeposantOuErreur(userId, articleId);
  verifierArticleEditable(article);

  if (payload.utilisateurId === userId) {
    throw new AppError(
      "Le deposant principal est deja reference comme auteur principal.",
      400,
    );
  }

  const coAuteur = await prisma.utilisateurs.findUnique({
    where: { id: payload.utilisateurId },
  });

  if (
    !coAuteur ||
    coAuteur.statut !== ACCOUNT_STATUS.ACTIF ||
    !coAuteur.actif
  ) {
    throw new AppError(
      "Le co-auteur doit etre un utilisateur actif existant.",
      400,
    );
  }

  const dejaLie = article.auteurs_article.some(
    (item) => item.utilisateur_id === payload.utilisateurId,
  );

  if (dejaLie) {
    throw new AppError("Ce co-auteur est deja associe a l'article.", 409);
  }

  const ordreAuteur =
    payload.ordreAuteur ||
    Math.max(...article.auteurs_article.map((item) => item.ordre_auteur), 0) +
      1;

  const ordreOccupe = article.auteurs_article.some(
    (item) => item.ordre_auteur === ordreAuteur,
  );

  if (ordreOccupe) {
    throw new AppError("L'ordre d'auteur demande est deja utilise.", 409);
  }

  await prisma.auteurs_article.create({
    data: {
      article_id: toBigInt(articleId),
      utilisateur_id: payload.utilisateurId,
      ordre_auteur: ordreAuteur,
      auteur_correspondant: Boolean(payload.auteurCorrespondant),
    },
  });

  const articleMisAJour = await recupererArticleDuDeposantOuErreur(
    userId,
    articleId,
  );

  return serializeArticleWithAttachments(articleMisAJour);
}

async function supprimerCoAuteur(userId, articleId, targetUserId) {
  const article = await recupererArticleDuDeposantOuErreur(userId, articleId);
  verifierArticleEditable(article);

  if (targetUserId === userId) {
    throw new AppError(
      "Le deposant principal ne peut pas etre retire de la liste des auteurs.",
      400,
    );
  }

  const association = article.auteurs_article.find(
    (item) => item.utilisateur_id === targetUserId,
  );

  if (!association) {
    throw new AppError("Co-auteur introuvable pour cet article.", 404);
  }

  await prisma.auteurs_article.delete({
    where: {
      article_id_utilisateur_id: {
        article_id: toBigInt(articleId),
        utilisateur_id: targetUserId,
      },
    },
  });

  const articleMisAJour = await recupererArticleDuDeposantOuErreur(
    userId,
    articleId,
  );

  return serializeArticleWithAttachments(articleMisAJour);
}

async function televerserPdfArticleMembre(userId, articleId, file) {
  const article = await recupererArticleDuDeposantOuErreur(userId, articleId);
  verifierArticleEditable(article);

  const stagedPdf = await stageArticlePdf(file);
  let oldPathToDelete = null;

  try {
    const articleMisAJour = await prisma.$transaction(async (tx) => {
      const replacementResult = await replaceArticlePdfAttachment(
        tx,
        article.id,
        stagedPdf,
        userId,
      );
      oldPathToDelete = replacementResult.oldPathToDelete;

      await tx.articles.update({
        where: { id: article.id },
        data: {
          modifie_par: userId,
          modifie_le: new Date(),
        },
      });

      return tx.articles.findUnique({
        where: { id: article.id },
        include: articleInclude,
      });
    });

    await cleanupStoredFile(oldPathToDelete);
    return serializeArticleWithAttachments(articleMisAJour);
  } catch (error) {
    await cleanupStoredFile(stagedPdf?.chemin);
    throw error;
  }
}

async function televerserCouvertureArticleMembre(userId, articleId, file) {
  const article = await recupererArticleDuDeposantOuErreur(userId, articleId);
  verifierArticleEditable(article);

  const stagedCover = await stageArticleCover(file);
  let oldPathToDelete = null;

  try {
    const articleMisAJour = await prisma.$transaction(async (tx) => {
      const replacementResult = await replaceArticleCoverAttachment(
        tx,
        article.id,
        stagedCover,
        userId,
      );
      oldPathToDelete = replacementResult.oldPathToDelete;

      await tx.articles.update({
        where: { id: article.id },
        data: {
          modifie_par: userId,
          modifie_le: new Date(),
        },
      });

      return tx.articles.findUnique({
        where: { id: article.id },
        include: articleInclude,
      });
    });

    await cleanupStoredFile(oldPathToDelete);
    return serializeArticleWithAttachments(articleMisAJour);
  } catch (error) {
    await cleanupStoredFile(stagedCover?.chemin);
    throw error;
  }
}

async function telechargerPdfArticleMembre(userId, role, articleId) {
  const article = await prisma.articles.findUnique({
    where: { id: toBigInt(articleId) },
    include: {
      auteurs_article: {
        select: {
          utilisateur_id: true,
        },
      },
    },
  });

  if (!article) {
    throw new AppError("Article introuvable.", 404);
  }

  if (!isArticlePdfAccessibleByUser(userId, role, article)) {
    throw new AppError("Vous n'avez pas les droits pour acceder a ce PDF.", 403);
  }

  const attachment = await getLatestArticlePdfAttachment(article.id);
  return resolveArticlePdfDownload(attachment, `article-${article.id}`);
}

module.exports = {
  recupererProfilMembre,
  mettreAJourProfilMembre,
  telechargerAttestationProfilMembre,
  telechargerPhotoProfilMembre,
  televerserPhotoProfilMembre,
  supprimerPhotoProfilMembre,
  listerMembresActifs,
  listerActualitesMembre,
  listerMesArticles,
  rechercherArticlesMembre,
  creerArticleMembre,
  modifierArticleMembre,
  ajouterCoAuteur,
  supprimerCoAuteur,
  televerserPdfArticleMembre,
  televerserCouvertureArticleMembre,
  telechargerPdfArticleMembre,
};
