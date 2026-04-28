const collaborationService = require("../services/collaboration.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const listConversations = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.listConversations(req.auth.userId);
  successResponse(res, "Conversations recuperees.", donnees);
});

const getConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.getConversationDetail(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Conversation recuperee.", donnees);
});

const createConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.createConversation(
    req.auth.userId,
    req.auth.role,
    req.body,
    req.file,
  );
  successResponse(res, "Conversation creee.", donnees, 201);
});

const sendMessage = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.sendMessage(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.body,
    req.file,
  );
  successResponse(res, "Message envoye.", donnees, 201);
});

const createGroupConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.createGroupConversation(
    req.auth.userId,
    req.auth.role,
    req.body,
    req.file,
  );
  successResponse(res, "Groupe de discussion cree.", donnees, 201);
});

const addGroupMembers = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.addGroupMembers(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.body,
  );
  successResponse(res, "Membres ajoutes au groupe.", donnees);
});

const removeGroupMember = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.removeGroupMember(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.params.userId,
  );
  successResponse(res, "Membre retire du groupe.", donnees);
});

const leaveGroupConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.leaveGroupConversation(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Vous avez quitte le groupe.", donnees);
});

const archiveConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.archiveConversation(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Conversation archivee.", donnees);
});

const unarchiveConversation = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.unarchiveConversation(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Conversation restauree.", donnees);
});

const downloadMessageAttachment = asyncHandler(async (req, res) => {
  const file = await collaborationService.downloadMessageAttachment(
    req.auth.userId,
    req.params.id,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

const markMessageAsRead = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.markMessageAsRead(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Message marque comme lu.", donnees);
});

const listProjects = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.listProjects(
    req.auth.userId,
    req.auth.role,
    req.query,
  );
  successResponse(res, "Projets recuperes.", donnees);
});

const getProject = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.getProjectById(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );
  successResponse(res, "Projet recupere.", donnees);
});

const listPurchaseRequests = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.listPurchaseRequests(
    req.auth.userId,
    req.auth.role,
    req.query,
  );
  successResponse(res, "Demandes d'achat recuperees.", donnees);
});

const createPurchaseRequest = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.createPurchaseRequest(
    req.auth.userId,
    req.auth.role,
    req.body,
    req.files,
  );
  successResponse(res, "Demande d'achat creee.", donnees, 201);
});

const updatePurchaseRequest = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.updatePurchaseRequest(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.body,
    req.files,
  );
  successResponse(res, "Demande d'achat mise a jour.", donnees);
});

const generatePurchaseRequestPdf = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.generatePurchaseRequestPdf(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );
  successResponse(res, "PDF de la demande genere.", donnees);
});

const getPurchaseRequest = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.getPurchaseRequestById(req.params.id, {
    userId: req.auth.userId,
    role: req.auth.role,
  });
  successResponse(res, "Demande d'achat recuperee.", donnees);
});

const downloadPurchaseRequestPdf = asyncHandler(async (req, res) => {
  const file = await collaborationService.downloadPurchaseRequestPdf(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );

  res.type(file.mimeType);
  if (req.query.action === "view") {
    res.setHeader(
      "Content-Disposition",
      `inline; filename=\"${file.downloadName}\"`,
    );
    res.sendFile(file.path);
    return;
  }

  res.download(file.path, file.downloadName);
});

const downloadPurchaseAttachment = asyncHandler(async (req, res) => {
  const file = await collaborationService.downloadPurchaseAttachment(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

const downloadPurchaseAttachmentById = asyncHandler(async (req, res) => {
  const file = await collaborationService.downloadPurchaseAttachmentById(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.params.attachmentId,
  );
  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

const listNotifications = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.listNotifications(
    req.auth.userId,
    req.query,
  );
  successResponse(res, "Notifications recuperees.", donnees);
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.markNotificationAsRead(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Notification marquee comme lue.", donnees);
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.markAllNotificationsAsRead(
    req.auth.userId,
  );
  successResponse(res, "Notifications marquees comme lues.", donnees);
});

const getNotificationPreferences = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.getNotificationPreferences(
    req.auth.userId,
  );
  successResponse(res, "Preferences de notification recuperees.", donnees);
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const donnees = await collaborationService.updateNotificationPreferences(
    req.auth.userId,
    req.body,
  );
  successResponse(res, "Preferences de notification mises a jour.", donnees);
});

module.exports = {
  listConversations,
  getConversation,
  createConversation,
  sendMessage,
  markMessageAsRead,
  createGroupConversation,
  addGroupMembers,
  removeGroupMember,
  leaveGroupConversation,
  archiveConversation,
  unarchiveConversation,
  downloadMessageAttachment,
  listProjects,
  getProject,
  listPurchaseRequests,
  createPurchaseRequest,
  updatePurchaseRequest,
  generatePurchaseRequestPdf,
  getPurchaseRequest,
  downloadPurchaseRequestPdf,
  downloadPurchaseAttachment,
  downloadPurchaseAttachmentById,
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};
