const supportService = require("../services/support.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const createTicket = asyncHandler(async (req, res) => {
  const donnees = await supportService.createTicket(
    req.auth.userId,
    req.auth.role,
    req.body,
    req.file,
  );

  successResponse(res, "Ticket support cree.", donnees, 201);
});

const listMyTickets = asyncHandler(async (req, res) => {
  const donnees = await supportService.listMyTickets(
    req.auth.userId,
    req.auth.role,
    req.query,
  );

  successResponse(res, "Tickets support recuperes.", donnees);
});

const getMyTicketDetail = asyncHandler(async (req, res) => {
  const donnees = await supportService.getMyTicketDetail(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );

  successResponse(res, "Detail du ticket support recupere.", donnees);
});

const addReplyToMyTicket = asyncHandler(async (req, res) => {
  const donnees = await supportService.addReplyToMyTicket(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.body,
    req.file,
  );

  successResponse(res, "Reponse support enregistree.", donnees, 201);
});

const addTicketAttachment = asyncHandler(async (req, res) => {
  const donnees = await supportService.addTicketAttachment(
    req.auth.userId,
    req.auth.role,
    req.params.id,
    req.file,
  );

  successResponse(res, "Piece jointe support ajoutee.", donnees, 201);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const file = await supportService.getSupportAttachmentFile(
    req.auth.userId,
    req.auth.role,
    req.params.id,
  );

  res.type(file.mimeType);
  res.download(file.path, file.downloadName);
});

const listAdminTickets = asyncHandler(async (req, res) => {
  const donnees = await supportService.listAdminTickets(req.auth.userId, req.query);
  successResponse(res, "Tickets support admin recuperes.", donnees);
});

const getAdminTicketDetail = asyncHandler(async (req, res) => {
  const donnees = await supportService.getAdminTicketDetail(req.params.id);
  successResponse(res, "Detail ticket support admin recupere.", donnees);
});

const assignTicket = asyncHandler(async (req, res) => {
  const donnees = await supportService.assignTicket(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Ticket support assigne.", donnees);
});

const changeTicketStatus = asyncHandler(async (req, res) => {
  const donnees = await supportService.changeTicketStatus(
    req.auth.userId,
    req.params.id,
    req.body,
  );
  successResponse(res, "Statut ticket support mis a jour.", donnees);
});

const addReplyToAdminTicket = asyncHandler(async (req, res) => {
  const donnees = await supportService.addReplyToAdminTicket(
    req.auth.userId,
    req.params.id,
    req.body,
    req.file,
  );

  successResponse(res, "Reponse administrateur enregistree.", donnees, 201);
});

const getAdminStats = asyncHandler(async (_req, res) => {
  const donnees = await supportService.getAdminStats();
  successResponse(res, "Statistiques support admin recuperees.", donnees);
});

module.exports = {
  createTicket,
  listMyTickets,
  getMyTicketDetail,
  addReplyToMyTicket,
  addTicketAttachment,
  downloadAttachment,
  listAdminTickets,
  getAdminTicketDetail,
  assignTicket,
  changeTicketStatus,
  addReplyToAdminTicket,
  getAdminStats,
};
