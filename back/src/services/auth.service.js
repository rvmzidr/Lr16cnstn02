const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const env = require("../config/env");
const { ACCOUNT_STATUS, ROLES } = require("../config/constants");
const {
  DOCTORANT_ATTESTATION_MIME_TYPES,
  MAX_DOCTORANT_ATTESTATION_BYTES,
} = require("../config/member-profile");
const AppError = require("../utils/app-error");
const {
  passwordFingerprint,
  signAccessToken,
  signResetToken,
  verifyResetToken,
} = require("../utils/jwt");
const { utilisateurCompletInclude } = require("../utils/prisma-selects");
const { serializeUtilisateur } = require("../utils/serializers");
const {
  buildUtilisateurData,
  cleanupStoredFile,
  enregistrerDossierMembre,
  normalizeMemberDossierPayload,
  recupererReferencesMembre,
  stageDoctorantAttestation,
  verifierDisponibiliteIdentifiants,
  verifierReferencesProfil,
} = require("./member-profile.service");
const { createNotifications } = require("./collaboration.service");

async function recupererReferencesInscription() {
  return {
    references: await recupererReferencesMembre(),
    televersementAttestation: {
      formats: DOCTORANT_ATTESTATION_MIME_TYPES,
      tailleMaxOctets: MAX_DOCTORANT_ATTESTATION_BYTES,
    },
  };
}

async function inscrireUtilisateur(rawPayload, attestationFile) {
  const payload = normalizeMemberDossierPayload(rawPayload);
  await verifierReferencesProfil(payload);
  await verifierDisponibiliteIdentifiants(payload);

  const motDePasseHash = await bcrypt.hash(payload.motDePasse, 10);
  const stagedAttestation = await stageDoctorantAttestation(attestationFile);
  let filesToDeleteAfterCommit = [];

  try {
    const utilisateur = await prisma.$transaction(async (tx) => {
      const created = await tx.utilisateurs.create({
        data: {
          ...buildUtilisateurData(payload),
          email_institutionnel: payload.emailInstitutionnel,
          mot_de_passe_hash: motDePasseHash,
          role_demande: ROLES.MEMBRE,
          conditions_acceptees: true,
          actif: false,
        },
      });

      const dossierResult = await enregistrerDossierMembre(
        tx,
        created.id,
        payload,
        null,
        stagedAttestation,
      );
      filesToDeleteAfterCommit = dossierResult.filesToDeleteAfterCommit;

      const adminRecipients = await tx.utilisateurs.findMany({
        where: {
          role: ROLES.ADMINISTRATEUR,
          statut: ACCOUNT_STATUS.ACTIF,
          actif: true,
        },
        select: {
          id: true,
        },
      });

      await createNotifications(
        tx,
        adminRecipients.map((item) => item.id),
        {
          typeNotification: "NOUVELLE_INSCRIPTION",
          titre: "Nouvelle inscription",
          message: `Nouvelle demande d'inscription de ${created.prenom} ${created.nom}.`,
          lienDirect: "/dashboard/registrations",
        },
        "comptes",
      );

      return tx.utilisateurs.findUnique({
        where: { id: created.id },
        include: utilisateurCompletInclude,
      });
    });

    await Promise.all(filesToDeleteAfterCommit.map(cleanupStoredFile));

    return serializeUtilisateur(utilisateur);
  } catch (error) {
    await cleanupStoredFile(stagedAttestation?.chemin);
    throw error;
  }
}

async function connecterUtilisateur(payload) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: {
      email_institutionnel: payload.emailInstitutionnel.trim().toLowerCase(),
    },
    include: utilisateurCompletInclude,
  });

  if (!utilisateur) {
    throw new AppError("Identifiants invalides.", 401);
  }

  const motDePasseValide = await bcrypt.compare(
    payload.motDePasse,
    utilisateur.mot_de_passe_hash,
  );

  if (!motDePasseValide) {
    throw new AppError("Identifiants invalides.", 401);
  }

  if (utilisateur.statut === ACCOUNT_STATUS.EN_ATTENTE) {
    throw new AppError(
      "Votre compte est en attente de validation par l'administration.",
      403,
    );
  }

  if (utilisateur.statut === ACCOUNT_STATUS.REJETE) {
    throw new AppError(
      "Votre demande d'inscription a ete refusee. Contactez l'administration du laboratoire.",
      403,
    );
  }

  if (
    utilisateur.statut === ACCOUNT_STATUS.DESACTIVE ||
    !utilisateur.actif ||
    !utilisateur.role
  ) {
    throw new AppError(
      "Votre compte est desactive ou non autorise a se connecter.",
      403,
    );
  }

  const derniereConnexionLe = new Date();

  await prisma.utilisateurs.update({
    where: { id: utilisateur.id },
    data: { derniere_connexion_le: derniereConnexionLe },
  });

  const accessToken = signAccessToken(utilisateur);

  return {
    accessToken,
    utilisateur: serializeUtilisateur({
      ...utilisateur,
      derniere_connexion_le: derniereConnexionLe,
    }),
  };
}

async function demanderReinitialisationMotDePasse(payload) {
  const utilisateur = await prisma.utilisateurs.findUnique({
    where: {
      email_institutionnel: payload.emailInstitutionnel.trim().toLowerCase(),
    },
  });

  if (
    !utilisateur ||
    !utilisateur.role ||
    [ACCOUNT_STATUS.EN_ATTENTE, ACCOUNT_STATUS.REJETE].includes(
      utilisateur.statut,
    )
  ) {
    return {
      expireDansMinutes: 30,
    };
  }

  const resetToken = signResetToken(utilisateur);
  const resetUrl = `${env.frontendUrl}/reinitialiser-mot-de-passe?token=${encodeURIComponent(
    resetToken,
  )}`;

  // TODO Release 3 : envoyer resetUrl par email (Resend / SMTP).
  // En production, le token ne doit jamais transiter dans la reponse API.
  if (env.nodeEnv !== "production") {
    return {
      resetToken,
      resetUrl,
      expireDansMinutes: 30,
    };
  }

  return {
    expireDansMinutes: 30,
  };
}

async function reinitialiserMotDePasse(payload) {
  let tokenPayload;

  try {
    tokenPayload = verifyResetToken(payload.token);
  } catch (_error) {
    throw new AppError(
      "Le token de reinitialisation est invalide ou a expire.",
      400,
    );
  }

  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: tokenPayload.sub },
  });

  if (!utilisateur) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  if (passwordFingerprint(utilisateur.mot_de_passe_hash) !== tokenPayload.version) {
    throw new AppError(
      "Le token de reinitialisation n'est plus valide. Veuillez recommencer la procedure.",
      400,
    );
  }

  const motDePasseHash = await bcrypt.hash(payload.nouveauMotDePasse, 10);

  await prisma.utilisateurs.update({
    where: { id: utilisateur.id },
    data: {
      mot_de_passe_hash: motDePasseHash,
      modifie_le: new Date(),
    },
  });
}

module.exports = {
  recupererReferencesInscription,
  inscrireUtilisateur,
  connecterUtilisateur,
  demanderReinitialisationMotDePasse,
  reinitialiserMotDePasse,
};
