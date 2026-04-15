const path = require("path");

const ARTICLE_PDF_MIME_TYPES = Object.freeze(["application/pdf"]);
const MAX_ARTICLE_PDF_BYTES = 10 * 1024 * 1024;
const ARTICLE_PDF_FIELD = "articlePdf";
const ARTICLE_PDF_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "article-pdfs",
);
const ARTICLE_ATTACHMENT_ENTITY = "ARTICLE";

module.exports = {
  ARTICLE_PDF_MIME_TYPES,
  MAX_ARTICLE_PDF_BYTES,
  ARTICLE_PDF_FIELD,
  ARTICLE_PDF_STORAGE_DIR,
  ARTICLE_ATTACHMENT_ENTITY,
};
