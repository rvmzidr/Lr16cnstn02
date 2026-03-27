const prisma = require("../config/prisma");
const publicContent = require("../config/public-content");
const {
  ACCOUNT_STATUS,
  ARTICLE_STATUS,
  NEWS_STATUS,
} = require("../config/constants");
const { toBigInt } = require("../utils/bigint");
const { buildMeta, getPagination } = require("../utils/pagination");
const { articleInclude, actualiteInclude } = require("../utils/prisma-selects");
const AppError = require("../utils/app-error");
const {
  serializeActualite,
  serializeArticle,
  serializeCategorie,
  serializeEquipe,
  serializeInstitution,
} = require("../utils/serializers");

function buildPublishedArticlesWhere(filters = {}) {
  const conditions = [{ statut: ARTICLE_STATUS.PUBLIE }];

  if (filters.q) {
    conditions.push({
      OR: [
        { titre: { contains: filters.q } },
        { resume: { contains: filters.q } },
        { contenu: { contains: filters.q } },
      ],
    });
  }

  if (filters.categorieId) {
    conditions.push({ categorie_id: toBigInt(filters.categorieId) });
  }

  return { AND: conditions };
}

function buildPublishedActualitesWhere(filters = {}) {
  const conditions = [{ statut: NEWS_STATUS.PUBLIEE }];

  if (filters.q) {
    conditions.push({
      OR: [
        { titre: { contains: filters.q } },
        { resume: { contains: filters.q } },
        { contenu: { contains: filters.q } },
      ],
    });
  }

  return { AND: conditions };
}

async function recupererAccueilPublic() {
  const [
    articlesPublies,
    actualitesPubliees,
    membresActifs,
    articlesRecents,
    actualitesRecentes,
  ] = await prisma.$transaction([
    prisma.articles.count({
      where: { statut: ARTICLE_STATUS.PUBLIE },
    }),
    prisma.actualites.count({
      where: { statut: NEWS_STATUS.PUBLIEE },
    }),
    prisma.utilisateurs.count({
      where: {
        statut: ACCOUNT_STATUS.ACTIF,
        actif: true,
      },
    }),
    prisma.articles.findMany({
      where: { statut: ARTICLE_STATUS.PUBLIE },
      include: articleInclude,
      orderBy: [{ publie_le: "desc" }, { cree_le: "desc" }],
      take: 3,
    }),
    prisma.actualites.findMany({
      where: { statut: NEWS_STATUS.PUBLIEE },
      include: actualiteInclude,
      orderBy: [{ publiee_le: "desc" }, { cree_le: "desc" }],
      take: 3,
    }),
  ]);

  return {
    hero: publicContent.hero,
    piliers: publicContent.piliers,
    chiffres: [
      { libelle: "Articles publies", valeur: articlesPublies },
      { libelle: "Actualites publiees", valeur: actualitesPubliees },
      { libelle: "Comptes actifs", valeur: membresActifs },
    ],
    articlesRecents: articlesRecents.map(serializeArticle),
    actualitesRecentes: actualitesRecentes.map(serializeActualite),
  };
}

async function recupererAPropos() {
  const [institutions, equipes, categories] = await prisma.$transaction([
    prisma.institutions.findMany({
      orderBy: { nom: "asc" },
    }),
    prisma.equipes_recherche.findMany({
      where: { actif: true },
      orderBy: { id: "asc" },
    }),
    prisma.categories_article.findMany({
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    presentation: publicContent.hero.accroche,
    missions: publicContent.missions,
    institutions: institutions.map(serializeInstitution),
    equipesRecherche: equipes.map(serializeEquipe),
    categoriesArticle: categories.map(serializeCategorie),
  };
}

async function recupererContact() {
  const institution = await prisma.institutions.findFirst({
    orderBy: { id: "asc" },
  });

  return {
    ...publicContent.contact,
    institution: serializeInstitution(institution),
  };
}

async function enregistrerMessageContact(payload) {
  const message = await prisma.messages_contact.create({
    data: {
      nom_complet: payload.nomComplet,
      email: payload.email.trim().toLowerCase(),
      sujet: payload.sujet,
      message: payload.message,
    },
    select: {
      id: true,
      cree_le: true,
      traite: true,
    },
  });

  return {
    id: Number(message.id),
    creeLe: message.cree_le,
    traite: message.traite,
  };
}

async function listerArticlesPublics(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const where = buildPublishedArticlesWhere(filters);

  const [total, articles] = await prisma.$transaction([
    prisma.articles.count({ where }),
    prisma.articles.findMany({
      where,
      include: articleInclude,
      orderBy: [{ publie_le: "desc" }, { cree_le: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: articles.map(serializeArticle),
    meta: buildMeta(total, page, limit),
  };
}

async function recupererArticlePublic(articleId) {
  const article = await prisma.articles.findFirst({
    where: {
      id: toBigInt(articleId),
      statut: ARTICLE_STATUS.PUBLIE,
    },
    include: articleInclude,
  });

  if (!article) {
    throw new AppError("Article public introuvable.", 404);
  }

  return serializeArticle(article);
}

async function listerActualitesPubliques(filters) {
  const { page, limit, skip, take } = getPagination(
    filters.page,
    filters.limit,
  );
  const where = buildPublishedActualitesWhere(filters);

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

async function recupererActualitePublique(actualiteId) {
  const actualite = await prisma.actualites.findFirst({
    where: {
      id: toBigInt(actualiteId),
      statut: NEWS_STATUS.PUBLIEE,
    },
    include: actualiteInclude,
  });

  if (!actualite) {
    throw new AppError("Actualite publique introuvable.", 404);
  }

  return serializeActualite(actualite);
}

module.exports = {
  recupererAccueilPublic,
  recupererAPropos,
  recupererContact,
  enregistrerMessageContact,
  listerArticlesPublics,
  recupererArticlePublic,
  listerActualitesPubliques,
  recupererActualitePublique,
};
