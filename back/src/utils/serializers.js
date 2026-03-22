const { toNumber } = require("./bigint");

function serializeUtilisateurResume(utilisateur) {
  if (!utilisateur) {
    return null;
  }

  return {
    id: utilisateur.id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    emailInstitutionnel: utilisateur.email_institutionnel,
    role: utilisateur.role,
    statut: utilisateur.statut,
    actif: utilisateur.actif,
  };
}

function serializeEquipe(equipe) {
  if (!equipe) {
    return null;
  }

  return {
    id: toNumber(equipe.id),
    code: equipe.code,
    nom: equipe.nom,
    description: equipe.description,
    actif: equipe.actif,
  };
}

function serializeInstitution(institution) {
  if (!institution) {
    return null;
  }

  return {
    id: toNumber(institution.id),
    nom: institution.nom,
    adresse: institution.adresse,
    ville: institution.ville,
    pays: institution.pays,
  };
}

function serializeNiveauDiplome(niveau) {
  if (!niveau) {
    return null;
  }

  return {
    id: toNumber(niveau.id),
    libelle: niveau.libelle,
  };
}

function serializeCategorie(categorie) {
  if (!categorie) {
    return null;
  }

  return {
    id: toNumber(categorie.id),
    libelle: categorie.libelle,
  };
}

function serializeProfil(profil) {
  if (!profil) {
    return null;
  }

  return {
    grade: profil.grade,
    institutionAffectationId: toNumber(profil.institution_affectation_id),
    institutionAffectation: serializeInstitution(profil.institutions),
    estDoctorant: profil.est_doctorant,
    dernierDiplomeLibre: profil.dernier_diplome_libre,
    niveauDiplomeId: toNumber(profil.niveau_diplome_id),
    niveauDiplome: serializeNiveauDiplome(profil.niveaux_diplome),
    dateObtentionDiplome: profil.date_obtention_diplome,
    etablissementDiplome: profil.etablissement_diplome,
    laboratoireDenomination: profil.laboratoire_denomination,
    laboratoireEtablissement: profil.laboratoire_etablissement,
    laboratoireUniversite: profil.laboratoire_universite,
    laboratoireResponsable: profil.laboratoire_responsable,
    orcid: profil.orcid,
    equipeRechercheId: toNumber(profil.equipe_recherche_id),
    equipeRecherche: serializeEquipe(profil.equipes_recherche),
    biographie: profil.biographie,
    photoUrl: profil.photo_url,
  };
}

function serializeAttestationDoctorant(doctorat) {
  if (!doctorat || !doctorat.attestation_chemin) {
    return null;
  }

  return {
    disponible: true,
    nomOriginal: doctorat.attestation_nom_original,
    nomStocke: doctorat.attestation_nom_stocke,
    typeMime: doctorat.attestation_type_mime,
    tailleOctets:
      doctorat.attestation_taille_octets === null ||
      doctorat.attestation_taille_octets === undefined
        ? null
        : Number(doctorat.attestation_taille_octets),
    deposeeLe: doctorat.attestation_deposee_le,
  };
}

function serializeDoctorat(doctorat) {
  if (!doctorat) {
    return null;
  }

  return {
    sujetRecherche: doctorat.sujet_recherche,
    pourcentageAvancement:
      doctorat.pourcentage_avancement === null
        ? null
        : Number(doctorat.pourcentage_avancement),
    anneePremiereInscription: doctorat.annee_premiere_inscription,
    anneeUniversitairePremiereInscription:
      doctorat.annee_universitaire_premiere_inscription,
    universiteInscription: doctorat.universite_inscription,
    directeurThese: doctorat.directeur_these,
    attestation: serializeAttestationDoctorant(doctorat),
  };
}

function serializeUtilisateur(utilisateur) {
  if (!utilisateur) {
    return null;
  }

  return {
    id: utilisateur.id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    nomJeuneFille: utilisateur.nom_jeune_fille,
    dateNaissance: utilisateur.date_naissance,
    lieuNaissance: utilisateur.lieu_naissance,
    genre: utilisateur.genre,
    sexe: utilisateur.genre,
    cin: utilisateur.cin,
    passeport: utilisateur.passeport,
    emailInstitutionnel: utilisateur.email_institutionnel,
    emailSecondaire: utilisateur.email_secondaire,
    telephone: utilisateur.telephone,
    adresse: utilisateur.adresse,
    roleDemande: utilisateur.role_demande,
    role: utilisateur.role,
    statut: utilisateur.statut,
    conditionsAcceptees: utilisateur.conditions_acceptees,
    derniereConnexionLe: utilisateur.derniere_connexion_le,
    valideLe: utilisateur.valide_le,
    motifRejet: utilisateur.motif_rejet,
    actif: utilisateur.actif,
    creeLe: utilisateur.cree_le,
    modifieLe: utilisateur.modifie_le,
    validateurCompte: serializeUtilisateurResume(utilisateur.validateur_compte),
    profil: serializeProfil(utilisateur.profil),
    doctorat: serializeDoctorat(utilisateur.informations_doctorales),
  };
}

function serializeAuteurArticle(auteurArticle) {
  return {
    utilisateurId: auteurArticle.utilisateur_id,
    ordreAuteur: auteurArticle.ordre_auteur,
    auteurCorrespondant: auteurArticle.auteur_correspondant,
    utilisateur: serializeUtilisateurResume(auteurArticle.utilisateur),
  };
}

function serializeArticle(article) {
  if (!article) {
    return null;
  }

  return {
    id: toNumber(article.id),
    titre: article.titre,
    resume: article.resume,
    contenu: article.contenu,
    statut: article.statut,
    dateSoumission: article.date_soumission,
    dateValidation: article.date_validation,
    motifRejet: article.motif_rejet,
    publieLe: article.publie_le,
    creeLe: article.cree_le,
    modifieLe: article.modifie_le,
    editableParAuteur:
      article.statut === "BROUILLON" || article.statut === "REJETE",
    categorieId: toNumber(article.categorie_id),
    categorie: serializeCategorie(article.categorie),
    deposant: serializeUtilisateurResume(article.deposant),
    validateur: serializeUtilisateurResume(article.validateur),
    coAuteurs: Array.isArray(article.auteurs_article)
      ? article.auteurs_article.map(serializeAuteurArticle)
      : [],
    derniereVersion:
      Array.isArray(article.versions_article) && article.versions_article.length > 0
        ? {
            numeroVersion: article.versions_article[0].numero_version,
            creeLe: article.versions_article[0].cree_le,
          }
        : null,
  };
}

function serializeActualite(actualite) {
  if (!actualite) {
    return null;
  }

  return {
    id: toNumber(actualite.id),
    titre: actualite.titre,
    resume: actualite.resume,
    contenu: actualite.contenu,
    statut: actualite.statut,
    publieeLe: actualite.publiee_le,
    creeLe: actualite.cree_le,
    modifieLe: actualite.modifie_le,
    auteur: serializeUtilisateurResume(actualite.auteur),
    equipeRecherche: serializeEquipe(actualite.equipes_recherche),
  };
}

module.exports = {
  serializeUtilisateurResume,
  serializeUtilisateur,
  serializeProfil,
  serializeDoctorat,
  serializeAttestationDoctorant,
  serializeCategorie,
  serializeEquipe,
  serializeInstitution,
  serializeNiveauDiplome,
  serializeArticle,
  serializeActualite,
};
