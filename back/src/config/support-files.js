const path = require("path");

const SUPPORT_ATTACHMENT_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SUPPORT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const SUPPORT_ATTACHMENT_FIELD = "pieceJointe";
const SUPPORT_ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "support-attachments",
);

module.exports = {
  SUPPORT_ATTACHMENT_MIME_TYPES,
  MAX_SUPPORT_ATTACHMENT_BYTES,
  SUPPORT_ATTACHMENT_FIELD,
  SUPPORT_ATTACHMENT_STORAGE_DIR,
};
