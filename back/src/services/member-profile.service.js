const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const {
  DOCTORANT_ATTESTATION_MIME_TYPES,
  DOCTORANT_ATTESTATION_STORAGE_DIR,
  LABORATOIRE_DEFAULTS,
} = require("../config/member-profile");
const { toBigInt } = require("../utils/bigint");
const AppError = require("../utils/app-error");
const {
  serializeCategorie,
  serializeEquipe,
  serializeInstitution,
  serializeNiveauDiplome,
} = require("../utils/serializers");

function normalizeIdentityCode(value) {
  if (!value) {
    return null;
  }

  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeAcademicYear(value, legacyYear) {
  if (value) {
    const compact = value.replace(/\s+/g, "");

    if (/^\d{4}$/.test(compact)) {
      const start = Number(compact);
      return `${start}/${start + 1}`;
    }

    const match = compact.match(/^(\d{4})\/(\d{4})$/);

    if (!match) {
      throw new AppError(
        "L'annee universitaire est invalide. Format attendu: YYYY/YYYY.",
        400
      );
    }

    const start = Number(match[1]);
    const end = Number(match[2]);

    if (end !== start + 1) {
      throw new AppError(
        "L'annee universitaire doit couvrir deux annees consecutives.",
        400
      );
    }

    return `${start}/${end}`;
  }

  if (legacyYear) {
    return `${legacyYear}/${legacyYear + 1}`;
  }

  return null;
}

function academicYearToLegacyStart(academicYear) {
  if (!academicYear) {
    return null;
  }

  return Number(academicYear.split("/")[0]);
}

function normalizeMemberDossierPayload(payload) {
  const academicYear = normalizeAcademicYear(
    payload.anneeUniversitairePremiereInscription,
    payload.anneePremiereInscription
  );

  return {
    ...payload,
    emailInstitutionnel: payload.emailInstitutionnel
      ? payload.emailInstitutionnel.trim().toLowerCase()
      : undefined,
    emailSecondaire: payload.emailSecondaire
      ? payload.emailSecondaire.trim().toLowerCase()
      : null,
    sexe: payload.sexe || payload.genre || null,
    cin: normalizeIdentityCode(payload.cin),
    passeport: normalizeIdentityCode(payload.passeport),
    estDoctorant: Boolean(payload.estDoctorant),
    anneeUniversitairePremiereInscription: academicYear,
    anneePremiereInscription: academicYearToLegacyStart(academicYear),
  };
}

async function verifierReferencesProfil(payload, client = prisma) {
  const checks = [];

  if (payload.institutionAffectationId) {
    checks.push(
      client.institutions.findUnique({
        where: { id: toBigInt(payload.institutionAffectationId) },
      })
    );
  }

  if (payload.niveauDiplomeId) {
    checks.push(
      client.niveaux_diplome.findUnique({
        where: { id: toBigInt(payload.niveauDiplomeId) },
      })
    );
  }

  if (payload.equipeRechercheId) {
    checks.push(
      client.equipes_recherche.findUnique({
        where: { id: toBigInt(payload.equipeRechercheId) },
      })
    );
  }

  const results = await Promise.all(checks);

  if (results.some((result) => !result)) {
    throw new AppError("Une reference profil est invalide.", 400);
  }
}

async function recupererReferencesMembre(client = prisma) {
  const [
    institutions,
    niveauxDiplome,
    equipesRecherche,
    categoriesArticle,
    institutionPrincipale,
    responsableLaboratoire,
  ] = await client.$transaction([
    client.institutions.findMany({ orderBy: { nom: "asc" } }),
    client.niveaux_diplome.findMany({ orderBy: { id: "asc" } }),
    client.equipes_recherche.findMany({
      where: { actif: true },
      orderBy: { id: "asc" },
    }),
    client.categories_article.findMany({ orderBy: { id: "asc" } }),
    client.institutions.findFirst({ orderBy: { id: "asc" } }),
    client.utilisateurs.findFirst({
      where: {
        role: "CHEF_LABO",
        statut: "ACTIF",
        actif: true,
      },
      select: {
        nom: true,
        prenom: true,
      },
      orderBy: { valide_le: "desc" },
    }),
  ]);

  return {
    institutions: institutions.map(serializeInstitution),
    niveauxDiplome: niveauxDiplome.map(serializeNiveauDiplome),
    equipesRecherche: equipesRecherche.map(serializeEquipe),
    categoriesArticle: categoriesArticle.map(serializeCategorie),
    laboratoireParDefaut: {
      denomination: LABORATOIRE_DEFAULTS.denomination,
      etablissement:
        institutionPrincipale?.nom ?? LABORATOIRE_DEFAULTS.etablissement,
      universite: LABORATOIRE_DEFAULTS.universite,
      responsable: responsableLaboratoire
        ? `Pr. ${responsableLaboratoire.prenom} ${responsableLaboratoire.nom.toUpperCase()}`
        : LABORATOIRE_DEFAULTS.responsable,
    },
  };
}

async function verifierDisponibiliteIdentifiants(
  payload,
  { excludeUserId } = {},
  client = prisma
) {
  if (
    payload.emailInstitutionnel &&
    payload.emailSecondaire &&
    payload.emailInstitutionnel === payload.emailSecondaire
  ) {
    throw new AppError(
      "L'email secondaire doit etre different de l'email principal.",
      400
    );
  }

  const conditions = [];

  if (payload.emailInstitutionnel) {
    conditions.push(
      { email_institutionnel: payload.emailInstitutionnel },
      { email_secondaire: payload.emailInstitutionnel }
    );
  }

  if (payload.emailSecondaire) {
    conditions.push(
      { email_institutionnel: payload.emailSecondaire },
      { email_secondaire: payload.emailSecondaire }
    );
  }

  if (payload.cin) {
    conditions.push({ cin: payload.cin });
  }

  if (payload.passeport) {
    conditions.push({ passeport: payload.passeport });
  }

  if (conditions.length === 0) {
    if (!payload.orcid) {
      return;
    }
  }

  const [existingUser, existingProfile] = await Promise.all([
    conditions.length
      ? client.utilisateurs.findFirst({
          where: {
            ...(excludeUserId
              ? {
                  id: {
                    not: excludeUserId,
                  },
                }
              : {}),
            OR: conditions,
          },
          select: {
            id: true,
            email_institutionnel: true,
            email_secondaire: true,
            cin: true,
            passeport: true,
          },
        })
      : Promise.resolve(null),
    payload.orcid
      ? client.profils_utilisateur.findFirst({
          where: {
            orcid: payload.orcid,
            ...(excludeUserId
              ? {
                  utilisateur_id: {
                    not: excludeUserId,
                  },
                }
              : {}),
          },
          select: {
            utilisateur_id: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (existingUser) {
    if (
      payload.emailInstitutionnel &&
      [existingUser.email_institutionnel, existingUser.email_secondaire].includes(
        payload.emailInstitutionnel
      )
    ) {
      throw new AppError(
        "Une autre fiche utilise deja cette adresse email principale.",
        409
      );
    }

    if (
      payload.emailSecondaire &&
      [existingUser.email_institutionnel, existingUser.email_secondaire].includes(
        payload.emailSecondaire
      )
    ) {
      throw new AppError(
        "Une autre fiche utilise deja cette adresse email secondaire.",
        409
      );
    }

    if (payload.cin && existingUser.cin === payload.cin) {
      throw new AppError("Ce CIN est deja associe a un autre compte.", 409);
    }

    if (payload.passeport && existingUser.passeport === payload.passeport) {
      throw new AppError(
        "Ce numero de passeport est deja associe a un autre compte.",
        409
      );
    }
  }

  if (payload.orcid && existingProfile) {
    throw new AppError(
      "Cet identifiant ORCID est deja associe a un autre compte.",
      409
    );
  }
}

function getDoctorantAttestationDescriptor(doctorat) {
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

function buildStoredFileName(file) {
  const extensionMap = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };

  return `${Date.now()}-${crypto.randomUUID()}${
    extensionMap[file.mimetype] || path.extname(file.originalname).toLowerCase()
  }`;
}

async function stageDoctorantAttestation(file) {
  if (!file) {
    return null;
  }

  if (!DOCTORANT_ATTESTATION_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      "Le format de l'attestation doit etre PDF, JPG ou PNG.",
      400
    );
  }

  await fs.mkdir(DOCTORANT_ATTESTATION_STORAGE_DIR, { recursive: true });

  const nomStocke = buildStoredFileName(file);
  const chemin = path.join(DOCTORANT_ATTESTATION_STORAGE_DIR, nomStocke);

  await fs.writeFile(chemin, file.buffer);

  return {
    nomOriginal: file.originalname,
    nomStocke,
    chemin,
    typeMime: file.mimetype,
    tailleOctets: BigInt(file.size),
  };
}

async function cleanupStoredFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Suppression de fichier impossible:", error);
    }
  }
}

function buildUtilisateurData(payload) {
  return {
    nom: payload.nom,
    prenom: payload.prenom,
    nom_jeune_fille: payload.nomJeuneFille || null,
    date_naissance: payload.dateNaissance ? new Date(payload.dateNaissance) : null,
    lieu_naissance: payload.lieuNaissance || null,
    genre: payload.sexe || null,
    cin: payload.cin || null,
    passeport: payload.passeport || null,
    telephone: payload.telephone || null,
    email_institutionnel: payload.emailInstitutionnel || undefined,
    email_secondaire: payload.emailSecondaire || null,
    adresse: payload.adresse || null,
  };
}

function buildProfilData(payload) {
  return {
    grade: payload.grade || null,
    institution_affectation_id: toBigInt(payload.institutionAffectationId) ?? null,
    est_doctorant: Boolean(payload.estDoctorant),
    dernier_diplome_libre: payload.dernierDiplomeLibre || null,
    niveau_diplome_id: toBigInt(payload.niveauDiplomeId) ?? null,
    date_obtention_diplome: payload.dateObtentionDiplome
      ? new Date(payload.dateObtentionDiplome)
      : null,
    etablissement_diplome: payload.etablissementDiplome || null,
    laboratoire_denomination: payload.laboratoireDenomination || null,
    laboratoire_etablissement: payload.laboratoireEtablissement || null,
    laboratoire_universite: payload.laboratoireUniversite || null,
    laboratoire_responsable: payload.laboratoireResponsable || null,
    orcid: payload.orcid || null,
    equipe_recherche_id: toBigInt(payload.equipeRechercheId) ?? null,
    biographie: payload.biographie || null,
    photo_url: payload.photoUrl || null,
  };
}

function buildDoctoratData(payload, attestationMeta) {
  return {
    sujet_recherche: payload.sujetRecherche,
    pourcentage_avancement: payload.pourcentageAvancement ?? 0,
    annee_premiere_inscription: payload.anneePremiereInscription || null,
    annee_universitaire_premiere_inscription:
      payload.anneeUniversitairePremiereInscription || null,
    universite_inscription: payload.universiteInscription || null,
    directeur_these: payload.directeurThese || null,
    attestation_nom_original: attestationMeta?.nomOriginal || null,
    attestation_nom_stocke: attestationMeta?.nomStocke || null,
    attestation_chemin: attestationMeta?.chemin || null,
    attestation_type_mime: attestationMeta?.typeMime || null,
    attestation_taille_octets: attestationMeta?.tailleOctets ?? null,
    attestation_deposee_le:
      attestationMeta && attestationMeta.chemin ? new Date() : null,
  };
}

async function enregistrerDossierMembre(
  tx,
  userId,
  payload,
  existingUser,
  stagedAttestation
) {
  const filesToDeleteAfterCommit = [];

  await tx.profils_utilisateur.upsert({
    where: { utilisateur_id: userId },
    update: buildProfilData(payload),
    create: {
      utilisateur_id: userId,
      ...buildProfilData(payload),
    },
  });

  const existingDoctorat = existingUser?.informations_doctorales || null;

  if (payload.estDoctorant) {
    const attestationMeta =
      stagedAttestation ||
      (existingDoctorat
        ? {
            nomOriginal: existingDoctorat.attestation_nom_original,
            nomStocke: existingDoctorat.attestation_nom_stocke,
            chemin: existingDoctorat.attestation_chemin,
            typeMime: existingDoctorat.attestation_type_mime,
            tailleOctets: existingDoctorat.attestation_taille_octets,
          }
        : null);

    if (!attestationMeta?.chemin) {
      throw new AppError(
        "L'attestation d'inscription est obligatoire pour un doctorant.",
        400
      );
    }

    if (stagedAttestation && existingDoctorat?.attestation_chemin) {
      filesToDeleteAfterCommit.push(existingDoctorat.attestation_chemin);
    }

    await tx.informations_doctorales.upsert({
      where: { utilisateur_id: userId },
      update: buildDoctoratData(payload, attestationMeta),
      create: {
        utilisateur_id: userId,
        ...buildDoctoratData(payload, attestationMeta),
      },
    });

    return { filesToDeleteAfterCommit };
  }

  if (stagedAttestation) {
    throw new AppError(
      "L'attestation doctorant ne peut etre envoyee que pour une fiche doctorant.",
      400
    );
  }

  if (existingDoctorat) {
    await tx.informations_doctorales.delete({
      where: { utilisateur_id: userId },
    });

    if (existingDoctorat.attestation_chemin) {
      filesToDeleteAfterCommit.push(existingDoctorat.attestation_chemin);
    }
  }

  return { filesToDeleteAfterCommit };
}

async function recupererAttestationDoctorantOuErreur(userId, client = prisma) {
  const utilisateur = await client.utilisateurs.findUnique({
    where: { id: userId },
    select: {
      prenom: true,
      nom: true,
      informations_doctorales: {
        select: {
          attestation_nom_original: true,
          attestation_chemin: true,
          attestation_type_mime: true,
        },
      },
    },
  });

  if (!utilisateur) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  const doctorat = utilisateur.informations_doctorales;

  if (!doctorat?.attestation_chemin) {
    throw new AppError("Aucune attestation doctorant n'est disponible.", 404);
  }

  try {
    await fs.access(doctorat.attestation_chemin);
  } catch (_error) {
    throw new AppError(
      "Le fichier d'attestation est introuvable sur le serveur.",
      404
    );
  }

  return {
    path: doctorat.attestation_chemin,
    mimeType: doctorat.attestation_type_mime || "application/octet-stream",
    downloadName:
      doctorat.attestation_nom_original ||
      `attestation-${utilisateur.prenom}-${utilisateur.nom}.pdf`,
  };
}

module.exports = {
  normalizeMemberDossierPayload,
  verifierReferencesProfil,
  recupererReferencesMembre,
  verifierDisponibiliteIdentifiants,
  getDoctorantAttestationDescriptor,
  stageDoctorantAttestation,
  cleanupStoredFile,
  buildUtilisateurData,
  enregistrerDossierMembre,
  recupererAttestationDoctorantOuErreur,
};
