const multer = require("multer");
const AppError = require("../utils/app-error");
const {
  DOCTORANT_ATTESTATION_FIELD,
  DOCTORANT_ATTESTATION_MIME_TYPES,
  MAX_DOCTORANT_ATTESTATION_BYTES,
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

module.exports = {
  parseOptionalDoctorantAttestation,
};
