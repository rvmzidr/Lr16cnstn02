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

const getProfilePhoto = asyncHandler(async (req, res) => {
  const file = await memberService.telechargerPhotoProfilMembre(req.auth.userId);
  res.type(file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${file.downloadName}"`,
  );
  res.sendFile(file.path);
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const donnees = await memberService.televerserPhotoProfilMembre(
    req.auth.userId,
    req.file,
  );
  successResponse(res, "Photo de profil mise a jour.", donnees);
});

const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const donnees = await memberService.supprimerPhotoProfilMembre(
    req.auth.userId,
  );
  successResponse(res, "Photo de profil supprimee.", donnees);
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

const uploadArticlePdf = asyncHandler(async (req, res) => {
  const donnees = await memberService.televerserPdfArticleMembre(
    req.auth.userId,
    req.params.id,
    req.file,
  );
  successResponse(res, "PDF de l'article televerse avec succes.", donnees);
});

const uploadArticleCover = asyncHandler(async (req, res) => {
  const donnees = await memberService.televerserCouvertureArticleMembre(
    req.auth.userId,
    req.params.id,
    req.file,
  );
  successResponse(
    res,
    "Couverture de l'article televersee avec succes.",
    donnees,
  );
});

const downloadArticlePdf = asyncHandler(async (req, res) => {
  const file = await memberService.telechargerPdfArticleMembre(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );
  res.type(file.mimeType);
  if (req.query.action === 'view') {
    res.setHeader("Content-Disposition", "inline; filename=\"" + file.downloadName + "\"");
    res.sendFile(file.path);
  } else {
    res.download(file.path, file.downloadName);
  }
});

module.exports = {
  getProfil,
  updateProfil,
  downloadDoctorantAttestation,
  getProfilePhoto,
  uploadProfilePhoto,
  deleteProfilePhoto,
  listMembres,
  listActualites,
  listMesArticles,
  rechercherArticles,
  createArticle,
  updateArticle,
  addCoAuteur,
  deleteCoAuteur,
  uploadArticlePdf,
  uploadArticleCover,
  downloadArticlePdf,
};
