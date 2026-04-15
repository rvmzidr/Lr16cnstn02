const messagesService = require("../services/messages.service");
const { successResponse } = require("../utils/api-response");
const asyncHandler = require("../utils/async-handler");

const sendMessage = asyncHandler(async (req, res) => {
  const donnees = await messagesService.sendMessage(req.auth.userId, req.body);
  successResponse(res, "Message envoye.", donnees, 201);
});

const getInbox = asyncHandler(async (req, res) => {
  const donnees = await messagesService.getInbox(req.auth.userId, req.query);
  successResponse(res, "Boite de reception recuperee.", donnees);
});

const getConversation = asyncHandler(async (req, res) => {
  const donnees = await messagesService.getConversation(
    req.auth.userId,
    req.params.userId,
    req.query,
  );
  successResponse(res, "Conversation recuperee.", donnees);
});

const markMessageRead = asyncHandler(async (req, res) => {
  const donnees = await messagesService.markMessageRead(
    req.auth.userId,
    req.params.id,
  );
  successResponse(res, "Message marque comme lu.", donnees);
});

const markConversationRead = asyncHandler(async (req, res) => {
  const donnees = await messagesService.markConversationRead(
    req.auth.userId,
    req.params.userId,
  );
  successResponse(res, "Conversation marquee comme lue.", donnees);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const donnees = await messagesService.getUnreadCount(req.auth.userId);
  successResponse(res, "Compteur des messages non lus recupere.", donnees);
});

const searchRecipients = asyncHandler(async (req, res) => {
  const donnees = await messagesService.searchRecipients(req.auth.userId, req.query);
  successResponse(res, "Destinataires eligibles recuperes.", donnees);
});

module.exports = {
  sendMessage,
  getInbox,
  getConversation,
  markMessageRead,
  markConversationRead,
  getUnreadCount,
  searchRecipients,
};
