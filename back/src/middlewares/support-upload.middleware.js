const multer = require("multer");
const AppError = require("../utils/app-error");
const {
  SUPPORT_ATTACHMENT_FIELD,
  SUPPORT_ATTACHMENT_MIME_TYPES,
} = require("../config/support-files");

const supportAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, callback) => {
    if (!SUPPORT_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new AppError(
          "La piece jointe support doit etre au format PDF, JPG, PNG ou WEBP.",
          400,
        ),
      );
      return;
    }

    callback(null, true);
  },
});

const parseOptionalSupportAttachment = supportAttachmentUpload.single(
  SUPPORT_ATTACHMENT_FIELD,
);

module.exports = {
  parseOptionalSupportAttachment,
};
