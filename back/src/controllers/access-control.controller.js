const accessControlService = require("../services/access-control.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const getMyAccessContext = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getUserAccessContext(req.auth.userId);
  successResponse(res, "Contexte d'acces utilisateur recupere.", donnees);
});

const getUserAccessSummary = asyncHandler(async (_req, res) => {
  const donnees = await accessControlService.getUserAccessSummary();
  successResponse(res, "Resume de gestion des acces utilisateurs recupere.", donnees);
});

const listUserAccessUsers = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.listUserAccessUsers(req.query);
  successResponse(res, "Liste des utilisateurs pour gestion des acces recuperee.", donnees);
});

const listAccessProfiles = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.listAccessProfiles(req.query);
  successResponse(res, "Profils d'acces recuperes.", donnees);
});

const createAccessProfile = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.createAccessProfile(req.auth.userId, req.body);
  successResponse(res, "Profil d'acces cree.", donnees, 201);
});

const getAccessProfileDetail = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getAccessProfileDetail(req.params.id);
  successResponse(res, "Detail du profil d'acces recupere.", donnees);
});

const updateAccessProfile = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.updateAccessProfile(req.params.id, req.body);
  successResponse(res, "Profil d'acces mis a jour.", donnees);
});

const duplicateAccessProfile = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.duplicateAccessProfile(req.auth.userId, req.params.id);
  successResponse(res, "Profil d'acces duplique.", donnees, 201);
});

const updateAccessProfileStatus = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.updateAccessProfileStatus(req.params.id, req.body);
  successResponse(res, "Statut du profil d'acces mis a jour.", donnees);
});

const listAccessProfileUsers = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.listAccessProfileUsers(req.params.id, req.query);
  successResponse(res, "Utilisateurs affectes au profil recuperes.", donnees);
});

const assignAccessProfileToUser = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.assignAccessProfileToUser(
    req.auth.userId,
    req.params.id,
    req.body,
  );

  successResponse(res, "Profil d'acces assigne a l'utilisateur.", donnees);
});

const replaceUserAccessOverrides = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.replaceUserAccessOverrides(
    req.auth.userId,
    req.params.id,
    req.body,
  );

  successResponse(res, "Overrides utilisateur mis a jour.", donnees);
});

const updateUserAccess = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.updateUserAccess(
    req.auth.userId,
    req.params.id,
    req.body,
  );

  successResponse(res, "Acces utilisateur mis a jour.", donnees);
});

const resetUserAccess = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.resetUserAccess(
    req.auth.userId,
    req.params.id,
  );

  successResponse(res, "Acces utilisateur reinitialise sur les regles automatiques.", donnees);
});

const getUserAccessContext = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getUserAccessContext(req.params.id);
  successResponse(res, "Contexte d'acces utilisateur recupere.", donnees);
});

const previewAccessProfile = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getAccessPreviewProfile(req.params.id);
  successResponse(res, "Previsualisation du profil d'acces recuperee.", donnees);
});

const previewAccessUser = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getAccessPreviewUser(req.params.id);
  successResponse(res, "Previsualisation utilisateur recuperee.", donnees);
});

const getSupportTicketAccessContext = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.getSupportTicketAccessContext(req.params.id);
  successResponse(res, "Diagnostic d'acces du ticket support recupere.", donnees);
});

const resolveSupportTicketAccess = asyncHandler(async (req, res) => {
  const donnees = await accessControlService.resolveSupportTicketAccess(
    req.params.id,
    req.auth.userId,
    req.body,
  );

  successResponse(res, "Resolution d'acces du ticket support enregistree.", donnees);
});

module.exports = {
  getMyAccessContext,
  getUserAccessSummary,
  listUserAccessUsers,
  listAccessProfiles,
  createAccessProfile,
  getAccessProfileDetail,
  updateAccessProfile,
  duplicateAccessProfile,
  updateAccessProfileStatus,
  listAccessProfileUsers,
  assignAccessProfileToUser,
  replaceUserAccessOverrides,
  updateUserAccess,
  resetUserAccess,
  getUserAccessContext,
  previewAccessProfile,
  previewAccessUser,
  getSupportTicketAccessContext,
  resolveSupportTicketAccess,
};
