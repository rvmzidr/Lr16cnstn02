const { z } = require("zod");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const academicYearRegex = /^\d{4}(?:\s*\/\s*\d{4})?$/;

function cleanString(max = 255, min = 1) {
  return z.string().trim().min(min).max(max);
}

function optionalString(max = 255) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    cleanString(max).optional()
  );
}

function optionalEmail() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().email().optional()
  );
}

function optionalDate() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().regex(dateRegex, "Date invalide. Format attendu: YYYY-MM-DD.").optional()
  );
}

function optionalPositiveInt() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().positive().optional()
  );
}

function optionalBoolean() {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();

        if (normalized === "true") {
          return true;
        }

        if (normalized === "false") {
          return false;
        }
      }

      return value;
    },
    z.boolean().optional()
  );
}

function booleanField() {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }
    }

    return value;
  }, z.boolean());
}

function optionalUuid() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional()
  );
}

function optionalAcademicYear() {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .trim()
      .regex(
        academicYearRegex,
        "Annee universitaire invalide. Format attendu: YYYY/YYYY."
      )
      .optional()
  );
}

const paginationSchema = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

module.exports = {
  z,
  cleanString,
  optionalString,
  optionalEmail,
  optionalDate,
  optionalPositiveInt,
  optionalBoolean,
  booleanField,
  optionalUuid,
  optionalAcademicYear,
  paginationSchema,
};
