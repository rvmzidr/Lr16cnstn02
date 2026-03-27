const memberService = require("../services/member.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const getProfil = asyncHandler(async (req, res) => {
  const donnees = await memberService.recupererProfilMembre(req.auth.userId);
  successResponse(res, "Profil membre recupere.", donnees);
});

const updateProfil = asyncHandler(async (req, res) => {
  const donnees = await memberService.mettreAJourProfilMembre(
    req.auth.userId,
    req.body,
    req.file,
  );
  successResponse(res, "Profil membre mis a jour.", donnees);
});

const downloadDoctorantAttestation = asyncHandler(async (req, res) => {
  const file = await memberService.telechargerAttestationProfilMembre(
    req.auth.userId,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

const listMembres = asyncHandler(async (req, res) => {
  const donnees = await memberService.listerMembresActifs(req.query);
  successResponse(res, "Membres actifs recuperes.", donnees);
});

const listActualites = asyncHandler(async (req, res) => {
  const donnees = await memberService.listerActualitesMembre(req.query);
  successResponse(res, "Actualites de l'espace membre recuperees.", donnees);
});

const listMesArticles = asyncHandler(async (req, res) => {
  const donnees = await memberService.listerMesArticles(req.auth.userId);
  successResponse(res, "Articles du membre recuperes.", donnees);
});

const rechercherArticles = asyncHandler(async (req, res) => {
  const donnees = await memberService.rechercherArticlesMembre(
    req.auth.userId,
    req.query,
  );
  successResponse(res, "Resultats de recherche recuperes.", donnees);
});

const createArticle = asyncHandler(async (req, res) => {
  const donnees = await memberService.creerArticleMembre(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Article cree avec succes.", donnees, 201);
});

const updateArticle = asyncHandler(async (req, res) => {
  const donnees = await memberService.modifierArticleMembre(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Article mis a jour avec succes.", donnees);
});

const addCoAuteur = asyncHandler(async (req, res) => {
  const donnees = await memberService.ajouterCoAuteur(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Co-auteur ajoute avec succes.", donnees, 201);
});

const deleteCoAuteur = asyncHandler(async (req, res) => {
  const donnees = await memberService.supprimerCoAuteur(
    req.auth.userId,
    req.params.id,
    req.params.userId,
  );
  successResponse(res, "Co-auteur supprime avec succes.", donnees);
});

module.exports = {
  getProfil,
  updateProfil,
  downloadDoctorantAttestation,
  listMembres,
  listActualites,
  listMesArticles,
  rechercherArticles,
  createArticle,
  updateArticle,
  addCoAuteur,
  deleteCoAuteur,
};
