const multer = require("multer");
const AppError = require("../utils/app-error");
const {
  ARTICLE_PDF_FIELD,
  ARTICLE_PDF_MIME_TYPES,
  ARTICLE_COVER_FIELD,
  ARTICLE_COVER_MIME_TYPES,
  MAX_ARTICLE_COVER_BYTES,
  MAX_ARTICLE_PDF_BYTES,
} = require("../config/article-files");
const {
  MAX_PURCHASE_ATTACHMENTS_COUNT,
  MAX_PURCHASE_ATTACHMENT_BYTES,
  PURCHASE_ATTACHMENTS_FIELD,
  PURCHASE_ATTACHMENT_FIELD,
  PURCHASE_ATTACHMENT_MIME_TYPES,
} = require("../config/purchase-files");
const {
  MAX_MESSAGE_ATTACHMENT_BYTES,
  MESSAGE_ATTACHMENT_FIELD,
  MESSAGE_ATTACHMENT_MIME_TYPES,
} = require("../config/message-files");
const {
  DOCTORANT_ATTESTATION_FIELD,
  DOCTORANT_ATTESTATION_MIME_TYPES,
  MAX_DOCTORANT_ATTESTATION_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_FIELD,
  PROFILE_PHOTO_MIME_TYPES,
} = require("../config/member-profile");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCTORANT_ATTESTATION_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!DOCTORANT_ATTESTATION_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "Le fichier d'attestation doit etre un PDF, JPG ou PNG.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalDoctorantAttestation = upload.single(
  DOCTORANT_ATTESTATION_FIELD,
);

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_PHOTO_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!PROFILE_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "La photo de profil doit etre au format JPG, PNG ou WEBP.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalProfilePhoto = profilePhotoUpload.single(PROFILE_PHOTO_FIELD);

const articlePdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ARTICLE_PDF_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ARTICLE_PDF_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError("Le fichier de l'article doit etre un PDF.", 400),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalArticlePdf = articlePdfUpload.single(ARTICLE_PDF_FIELD);

const articleCoverUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ARTICLE_COVER_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ARTICLE_COVER_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "La couverture de l'article doit etre au format JPG, PNG ou WEBP.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalArticleCover = articleCoverUpload.single(ARTICLE_COVER_FIELD);

const purchaseAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PURCHASE_ATTACHMENT_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!PURCHASE_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "La piece jointe doit etre au format PDF, JPG, PNG, DOC ou DOCX.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalPurchaseAttachment = purchaseAttachmentUpload.fields([
  { name: PURCHASE_ATTACHMENTS_FIELD, maxCount: MAX_PURCHASE_ATTACHMENTS_COUNT },
  { name: PURCHASE_ATTACHMENT_FIELD, maxCount: 1 },
]);

const messageAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_MESSAGE_ATTACHMENT_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!MESSAGE_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "La piece jointe de message doit etre au format PDF, JPG, PNG, DOC, DOCX ou XLSX.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalMessageAttachment = messageAttachmentUpload.single(
  MESSAGE_ATTACHMENT_FIELD,
);

module.exports = {
  parseOptionalDoctorantAttestation,
  parseOptionalProfilePhoto,
  parseOptionalArticlePdf,
  parseOptionalArticleCover,
  parseOptionalPurchaseAttachment,
  parseOptionalMessageAttachment,
};
