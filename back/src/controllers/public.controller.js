const publicService = require("../services/public.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const getAccueil = asyncHandler(async (_req, res) => {
  const donnees = await publicService.recupererAccueilPublic();
  successResponse(res, "Contenu de la page d'accueil recupere.", donnees);
});

const getAPropos = asyncHandler(async (_req, res) => {
  const donnees = await publicService.recupererAPropos();
  successResponse(res, "Contenu de la page a propos recupere.", donnees);
});

const getContact = asyncHandler(async (_req, res) => {
  const donnees = await publicService.recupererContact();
  successResponse(res, "Informations de contact recuperees.", donnees);
});

const postContact = asyncHandler(async (req, res) => {
  const donnees = await publicService.enregistrerMessageContact(req.body);
  successResponse(res, "Message de contact envoye avec succes.", donnees, 201);
});

const listArticles = asyncHandler(async (req, res) => {
  const donnees = await publicService.listerArticlesPublics(req.query);
  successResponse(res, "Articles publics recuperes.", donnees);
});

const getArticle = asyncHandler(async (req, res) => {
  const donnees = await publicService.recupererArticlePublic(req.params.id);
  successResponse(res, "Detail de l'article public recupere.", donnees);
});

const listActualites = asyncHandler(async (req, res) => {
  const donnees = await publicService.listerActualitesPubliques(req.query);
  successResponse(res, "Actualites publiques recuperees.", donnees);
});

const getActualite = asyncHandler(async (req, res) => {
  const donnees = await publicService.recupererActualitePublique(req.params.id);
  successResponse(res, "Detail de l'actualite publique recupere.", donnees);
});

module.exports = {
  getAccueil,
  getAPropos,
  getContact,
  postContact,
  listArticles,
  getArticle,
  listActualites,
  getActualite,
};
