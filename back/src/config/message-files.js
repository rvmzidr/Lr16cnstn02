const path = require("path");

const MESSAGE_ATTACHMENT_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_MESSAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MESSAGE_ATTACHMENT_FIELD = "pieceJointe";
const MESSAGE_ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "message-attachments",
);
const MESSAGE_ATTACHMENT_ENTITY = "MESSAGE";

module.exports = {
  MESSAGE_ATTACHMENT_MIME_TYPES,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  MESSAGE_ATTACHMENT_FIELD,
  MESSAGE_ATTACHMENT_STORAGE_DIR,
  MESSAGE_ATTACHMENT_ENTITY,
};
