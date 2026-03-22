const authService = require("../services/auth.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const getInscriptionReferences = asyncHandler(async (_req, res) => {
  const donnees = await authService.recupererReferencesInscription();
  successResponse(res, "References d'inscription recuperees.", donnees);
});

const inscription = asyncHandler(async (req, res) => {
  const donnees = await authService.inscrireUtilisateur(req.body, req.file);
  successResponse(
    res,
    "Demande d'inscription enregistree avec succes.",
    donnees,
    201
  );
});

const connexion = asyncHandler(async (req, res) => {
  const donnees = await authService.connecterUtilisateur(req.body);
  successResponse(res, "Connexion effectuee avec succes.", donnees);
});

const motDePasseOublie = asyncHandler(async (req, res) => {
  const donnees = await authService.demanderReinitialisationMotDePasse(req.body);
  successResponse(
    res,
    "Si un compte valide correspond a cette adresse, un lien de reinitialisation est genere.",
    donnees
  );
});

const reinitialiserMotDePasse = asyncHandler(async (req, res) => {
  await authService.reinitialiserMotDePasse(req.body);
  successResponse(res, "Mot de passe reinitialise avec succes.", null);
});

module.exports = {
  getInscriptionReferences,
  inscription,
  connexion,
  motDePasseOublie,
  reinitialiserMotDePasse,
};
