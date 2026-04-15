const collaborationService = require("../services/collaboration.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const createProject = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.createProject(req.auth.userId, req.body);
  successResponse(res, "Projet cree.", donnees, 201);
});

const updateProject = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.updateProject(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Projet mis a jour.", donnees);
});

const archiveProject = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.archiveProject(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Projet archive.", donnees);
});

const assignProjectMember = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.assignProjectMember(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Membre affecte au projet.", donnees);
});

const removeProjectMember = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.removeProjectMember(
    req.auth.userId,
    req.params.id,
    req.params.userId,
  );
  successResponse(res, "Membre retire du projet.", donnees);
});

const decidePurchaseRequest = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.decidePurchaseRequest(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Decision de demande d'achat enregistree.", donnees);
});

const updatePurchaseStatus = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.updatePurchaseStatus(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Statut de demande d'achat mis a jour.", donnees);
});

module.exports = {
  createProject,
  updateProject,
  archiveProject,
  assignProjectMember,
  removeProjectMember,
  decidePurchaseRequest,
  updatePurchaseStatus,
};
