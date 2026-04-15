const adminService = require("./admin.service");
const prisma = require("../config/prisma");
const {
  ACCOUNT_STATUS,
  ARTICLE_STATUS,
  NEWS_STATUS,
  ROLES,
} = require("../config/constants");
const { toNumber } = require("../utils/bigint");

function buildProjectProgress(project) {
  if (project.statut === "TERMINE" || project.statut === "ARCHIVE") {
    return 100;
  }

  if (!project.date_debut || !project.date_fin) {
    return project.statut === "EN_COURS" ? 35 : 0;
  }

  const start = new Date(project.date_debut).getTime();
  const end = new Date(project.date_fin).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return project.statut === "EN_COURS" ? 35 : 0;
  }

  const ratio = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

function formatFullName(utilisateur) {
  if (!utilisateur) {
    return "Membre inconnu";
  }

  return `${utilisateur.prenom} ${utilisateur.nom}`.trim();
}

function normalizeDecision(statut) {
  switch (statut) {
    case ARTICLE_STATUS.REJETE:
      return "REFUSE";
    case ARTICLE_STATUS.PUBLIE:
      return "VALIDE";
    default:
      return statut;
  }
}

async function recupererKPIChefLabo(userId) {
  const [
    articlesEnAttente,
    articlesPublies,
    actualitesPubliees,
    projetsActifs,
    demandesAchatEnAttente,
    pendingArticles,
    pendingPurchaseRequests,
    managedProjects,
    teamMembers,
    recentArticleDecisions,
  ] = await prisma.$transaction([
    prisma.articles.count({
      where: {
        statut: ARTICLE_STATUS.SOUMIS,
      },
    }),
    prisma.articles.count({
      where: {
        statut: ARTICLE_STATUS.PUBLIE,
      },
    }),
    prisma.actualites.count({
      where: {
        statut: NEWS_STATUS.PUBLIEE,
      },
    }),
    prisma.projets.count({
      where: {
        cree_par: userId,
        archive: false,
        statut: "EN_COURS",
      },
    }),
    prisma.demandes_achat.count({
      where: {
        statut: "EN_ATTENTE",
        projets: {
          cree_par: userId,
          archive: false,
        },
      },
    }),
    prisma.articles.findMany({
      where: {
        statut: ARTICLE_STATUS.SOUMIS,
      },
      orderBy: [{ date_soumission: "asc" }, { cree_le: "asc" }],
      take: 5,
      select: {
        id: true,
        titre: true,
        date_soumission: true,
        deposant: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    }),
    prisma.demandes_achat.findMany({
      where: {
        statut: "EN_ATTENTE",
        projets: {
          cree_par: userId,
          archive: false,
        },
      },
      orderBy: [{ cree_le: "asc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        objet: true,
        estimation_cout: true,
        cree_le: true,
        projets: {
          select: {
            titre: true,
          },
        },
        utilisateurs_demandes_achat_cree_parToutilisateurs: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    }),
    prisma.projets.findMany({
      where: {
        cree_par: userId,
        archive: false,
      },
      orderBy: [{ modifie_le: "desc" }, { cree_le: "desc" }],
      take: 8,
      select: {
        id: true,
        titre: true,
        statut: true,
        date_debut: true,
        date_fin: true,
        membres_projet: {
          select: {
            utilisateur_id: true,
          },
        },
      },
    }),
    prisma.membres_projet.findMany({
      where: {
        projets: {
          cree_par: userId,
          archive: false,
        },
        utilisateurs_membres_projet_utilisateur_idToutilisateurs: {
          statut: ACCOUNT_STATUS.ACTIF,
          role: {
            in: [ROLES.MEMBRE, ROLES.CHEF_LABO],
          },
        },
      },
      distinct: ["utilisateur_id"],
      select: {
        utilisateur_id: true,
      },
    }),
    prisma.articles.findMany({
      where: {
        valide_par: userId,
        date_validation: {
          not: null,
        },
      },
      orderBy: [{ date_validation: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        titre: true,
        statut: true,
        date_validation: true,
      },
    }),
  ]);

  const projectStatusOverview = managedProjects.map((project) => ({
    id: toNumber(project.id),
    name: project.titre,
    status: project.statut,
    membersCount: project.membres_projet.length,
    endDate: project.date_fin,
    progress: buildProjectProgress(project),
  }));

  return {
    articlesEnAttente,
    articlesPublies,
    actualitesPubliees,
    projetsActifs,
    demandesAchatEnAttente,
    kpis: {
      articlesPendingReview: articlesEnAttente,
      activeManagedProjects: projetsActifs,
      purchaseRequestsAwaitingDecision: demandesAchatEnAttente,
      teamMembers: teamMembers.length,
    },
    priorityQueue: {
      articles: pendingArticles.map((article) => ({
        id: toNumber(article.id),
        title: article.titre,
        author: formatFullName(article.deposant),
        submittedDate: article.date_soumission,
        link: "/lab/articles/pending",
      })),
      purchaseRequests: pendingPurchaseRequests.map((request) => ({
        id: toNumber(request.id),
        title: request.objet,
        projectName: request.projets?.titre || null,
        requester: formatFullName(
          request.utilisateurs_demandes_achat_cree_parToutilisateurs,
        ),
        amount:
          request.estimation_cout === null || request.estimation_cout === undefined
            ? null
            : Number(request.estimation_cout),
        createdAt: request.cree_le,
        link: "/dashboard/purchases",
      })),
    },
    projectStatusOverview,
    recentArticleDecisions: recentArticleDecisions.map((article) => ({
      id: toNumber(article.id),
      title: article.titre,
      decision: normalizeDecision(article.statut),
      date: article.date_validation,
    })),
  };
}

module.exports = {
  recupererKPIChefLabo,
  listerArticlesModeration: adminService.listerArticlesEnAttente,
  validerArticle: adminService.validerArticle,
  refuserArticle: adminService.refuserArticle,
  publierArticle: adminService.publierArticle,
  listerActualites: adminService.listerActualitesAdmin,
  creerActualite: adminService.creerActualite,
  modifierActualite: adminService.modifierActualite,
  supprimerActualite: adminService.supprimerActualite,
};
