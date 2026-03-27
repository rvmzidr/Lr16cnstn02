const adminService = require("../services/admin.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const listInscriptions = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerInscriptions(req.query);
  successResponse(res, "Demandes d'inscription recuperees.", donnees);
});

const validerInscription = asyncHandler(async (req, res) => {
  const donnees = await adminService.validerInscription(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Inscription validee avec succes.", donnees);
});

const refuserInscription = asyncHandler(async (req, res) => {
  const donnees = await adminService.refuserInscription(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Inscription refusee avec succes.", donnees);
});

const listComptes = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerComptes(req.query);
  successResponse(res, "Comptes recuperes.", donnees);
});

const activerCompte = asyncHandler(async (req, res) => {
  const donnees = await adminService.activerCompte(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Compte active avec succes.", donnees);
});

const desactiverCompte = asyncHandler(async (req, res) => {
  const donnees = await adminService.desactiverCompte(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Compte desactive avec succes.", donnees);
});

const changerRole = asyncHandler(async (req, res) => {
  const donnees = await adminService.changerRoleCompte(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Role du compte mis a jour.", donnees);
});

const listArticlesEnAttente = asyncHandler(async (_req, res) => {
  const donnees = await adminService.listerArticlesEnAttente();
  successResponse(res, "Articles en attente recuperes.", donnees);
});

const validerArticle = asyncHandler(async (req, res) => {
  const donnees = await adminService.validerArticle(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Article valide avec succes.", donnees);
});

const refuserArticle = asyncHandler(async (req, res) => {
  const donnees = await adminService.refuserArticle(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Article refuse avec succes.", donnees);
});

const publierArticle = asyncHandler(async (req, res) => {
  const donnees = await adminService.publierArticle(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Article publie avec succes.", donnees);
});

const listActualites = asyncHandler(async (req, res) => {
  const donnees = await adminService.listerActualitesAdmin(req.query);
  successResponse(res, "Actualites admin recuperees.", donnees);
});

const createActualite = asyncHandler(async (req, res) => {
  const donnees = await adminService.creerActualite(req.auth.userId, req.body);
  successResponse(res, "Actualite creee avec succes.", donnees, 201);
});

const updateActualite = asyncHandler(async (req, res) => {
  const donnees = await adminService.modifierActualite(req.params.id, req.body);
  successResponse(res, "Actualite mise a jour avec succes.", donnees);
});

const deleteActualite = asyncHandler(async (req, res) => {
  await adminService.supprimerActualite(req.params.id);
  successResponse(res, "Actualite supprimee avec succes.", null);
});

const downloadDoctorantAttestation = asyncHandler(async (req, res) => {
  const file = await adminService.telechargerAttestationDoctorantAdmin(
    req.params.id,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

module.exports = {
  listInscriptions,
  validerInscription,
  refuserInscription,
  listComptes,
  activerCompte,
  desactiverCompte,
  changerRole,
  listArticlesEnAttente,
  validerArticle,
  refuserArticle,
  publierArticle,
  listActualites,
  createActualite,
  updateActualite,
  deleteActualite,
  downloadDoctorantAttestation,
};
