const labHeadService = require("../services/lab-head.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const listArticlesModeration = asyncHandler(async (_req, res) => {
  const donnees = await labHeadService.listerArticlesModeration();
  successResponse(res, "File de moderation des articles recuperee.", donnees);
});

const validerArticle = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.validerArticle(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Article valide avec succes.", donnees);
});

const refuserArticle = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.refuserArticle(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Article refuse avec succes.", donnees);
});

const publierArticle = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.publierArticle(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Article publie avec succes.", donnees);
});

const listActualites = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.listerActualites(req.query);
  successResponse(
    res,
    "Actualites du chef du laboratoire recuperees.",
    donnees,
  );
});

const createActualite = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.creerActualite(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Actualite creee avec succes.", donnees, 201);
});

const updateActualite = asyncHandler(async (req, res) => {
  const donnees = await labHeadService.modifierActualite(
    req.params.id,
    req.body,
  );
  successResponse(res, "Actualite mise a jour avec succes.", donnees);
});

const deleteActualite = asyncHandler(async (req, res) => {
  await labHeadService.supprimerActualite(req.params.id);
  successResponse(res, "Actualite supprimee avec succes.", null);
});

module.exports = {
  listArticlesModeration,
  validerArticle,
  refuserArticle,
  publierArticle,
  listActualites,
  createActualite,
  updateActualite,
  deleteActualite,
};
