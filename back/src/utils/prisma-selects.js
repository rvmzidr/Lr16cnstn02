const utilisateurResumeSelect = {
  id: true,
  nom: true,
  prenom: true,
  email_institutionnel: true,
  role: true,
  statut: true,
  actif: true,
};

const profilCompletInclude = {
  institutions: true,
  niveaux_diplome: true,
  equipes_recherche: true,
};

const utilisateurCompletInclude = {
  profil: {
    include: profilCompletInclude,
  },
  informations_doctorales: true,
  validateur_compte: {
    select: utilisateurResumeSelect,
  },
};

const articleInclude = {
  categorie: true,
  deposant: {
    select: utilisateurResumeSelect,
  },
  validateur: {
    select: utilisateurResumeSelect,
  },
  auteurs_article: {
    orderBy: {
      ordre_auteur: "asc",
    },
    include: {
      utilisateur: {
        select: utilisateurResumeSelect,
      },
    },
  },
  versions_article: {
    orderBy: {
      numero_version: "desc",
    },
    take: 1,
  },
};

const actualiteInclude = {
  auteur: {
    select: utilisateurResumeSelect,
  },
  equipes_recherche: true,
};

module.exports = {
  utilisateurResumeSelect,
  profilCompletInclude,
  utilisateurCompletInclude,
  articleInclude,
  actualiteInclude,
};
