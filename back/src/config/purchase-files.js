const path = require("path");

const PURCHASE_ATTACHMENT_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_PURCHASE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const PURCHASE_ATTACHMENT_FIELD = "pieceJointe";
const PURCHASE_ATTACHMENTS_FIELD = "piecesJointes";
const MAX_PURCHASE_ATTACHMENTS_COUNT = 10;
const PURCHASE_ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "purchase-attachments",
);
const PURCHASE_GENERATED_PDF_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "purchase-generated-pdfs",
);
const PURCHASE_ATTACHMENT_ENTITY = "DEMANDE_ACHAT";

module.exports = {
  PURCHASE_ATTACHMENT_MIME_TYPES,
  MAX_PURCHASE_ATTACHMENT_BYTES,
  PURCHASE_ATTACHMENT_FIELD,
  PURCHASE_ATTACHMENTS_FIELD,
  MAX_PURCHASE_ATTACHMENTS_COUNT,
  PURCHASE_ATTACHMENT_STORAGE_DIR,
  PURCHASE_GENERATED_PDF_STORAGE_DIR,
  PURCHASE_ATTACHMENT_ENTITY,
};
