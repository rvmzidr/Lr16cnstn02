const path = require("path");

const DOCTORANT_ATTESTATION_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_DOCTORANT_ATTESTATION_BYTES = 5 * 1024 * 1024;
const DOCTORANT_ATTESTATION_FIELD = "attestationDoctorant";
const DOCTORANT_ATTESTATION_STORAGE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "doctorant-attestations",
);

const LABORATOIRE_DEFAULTS = Object.freeze({
  denomination: "LR16CNSTN02",
  etablissement: "Centre National des Sciences et Technologies Nucleaires",
  universite: "Universite de Tunis",
  responsable: "Pr. Haikel JELASSI",
});

module.exports = {
  DOCTORANT_ATTESTATION_MIME_TYPES,
  MAX_DOCTORANT_ATTESTATION_BYTES,
  DOCTORANT_ATTESTATION_FIELD,
  DOCTORANT_ATTESTATION_STORAGE_DIR,
  LABORATOIRE_DEFAULTS,
};
