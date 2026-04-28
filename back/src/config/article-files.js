const path = require("path");

const ARTICLE_PDF_MIME_TYPES = Object.freeze(["application/pdf"]);
const MAX_ARTICLE_PDF_BYTES = 5 * 1024 * 1024;
const ARTICLE_PDF_FIELD = "articlePdf";
const ARTICLE_COVER_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_ARTICLE_COVER_BYTES = 8 * 1024 * 1024;
const ARTICLE_COVER_FIELD = "articleCover";
const ARTICLE_PDF_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "article-pdfs",
);
const ARTICLE_COVER_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "article-covers",
);
const ARTICLE_ATTACHMENT_ENTITY = "ARTICLE";

module.exports = {
  ARTICLE_PDF_MIME_TYPES,
  MAX_ARTICLE_PDF_BYTES,
  ARTICLE_PDF_FIELD,
  ARTICLE_COVER_MIME_TYPES,
  MAX_ARTICLE_COVER_BYTES,
  ARTICLE_COVER_FIELD,
  ARTICLE_PDF_STORAGE_DIR,
  ARTICLE_COVER_STORAGE_DIR,
  ARTICLE_ATTACHMENT_ENTITY,
};
