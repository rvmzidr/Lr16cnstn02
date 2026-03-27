const prisma = require("../config/prisma");
const { ACCOUNT_STATUS } = require("../config/constants");
const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async-handler");
const { verifyAccessToken } = require("../utils/jwt");

const requireAuth = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    throw new AppError("Authentification requise.", 401);
  }

  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    throw new AppError("Token d'authentification manquant.", 401);
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (_error) {
    throw new AppError("Token d'authentification invalide ou expire.", 401);
  }

  const utilisateur = await prisma.utilisateurs.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
      statut: true,
      actif: true,
    },
  });

  if (!utilisateur) {
    throw new AppError("Utilisateur introuvable.", 401);
  }

  if (
    utilisateur.statut !== ACCOUNT_STATUS.ACTIF ||
    !utilisateur.role ||
    !utilisateur.actif
  ) {
    throw new AppError(
      "Votre compte n'est pas autorise a acceder a cet espace.",
      403,
    );
  }

  req.auth = {
    userId: utilisateur.id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    email: utilisateur.email_institutionnel,
    role: utilisateur.role,
  };

  next();
});

module.exports = requireAuth;
