const {
  z,
  cleanString,
  optionalBoolean,
  optionalString,
  paginationSchema,
} = require("./common");
const {
  ACCESS_MODULE_KEYS,
  ACCESS_PERMISSION_KEYS,
  ACCESS_WIDGET_KEYS,
} = require("../config/access-control");

function parseArrayLike(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_error) {
    return value;
  }
}

function safeLimitSchema(max = 50, fallback = 10) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(1, Math.trunc(parsed)), max);
  }, z.number().int().min(1).max(max));
}

const moduleKeySchema = z.enum([...ACCESS_MODULE_KEYS]);
const permissionKeySchema = z.enum([...ACCESS_PERMISSION_KEYS]);
const widgetKeySchema = z.enum([...ACCESS_WIDGET_KEYS]);
const roleSchema = z.enum(["MEMBRE", "ADMINISTRATEUR", "CHEF_LABO"]);
const languageSchema = z.enum(["fr", "en", "ar"]);
const defaultLandingPageSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === "" || value === null) {
      return null;
    }

    return value;
  },
  z.union([cleanString(255), z.null()]).optional(),
);

const accessProfileIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const accessUserIdParamSchema = z.object({
  id: z.string().uuid(),
});

const accessProfilesQuerySchema = z.object({
  q: optionalString(180),
  roleParent: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    roleSchema.optional(),
  ),
  active: optionalBoolean(),
  page: paginationSchema.page,
  limit: safeLimitSchema(50, 10),
});

const userAccessUsersQuerySchema = z.object({
  q: optionalString(180),
  role: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    roleSchema.optional(),
  ),
  isDoctorant: optionalBoolean(),
  hasOverrides: optionalBoolean(),
  page: paginationSchema.page,
  limit: safeLimitSchema(50, 10),
});

const accessProfileModulesSchema = z.preprocess(
  parseArrayLike,
  z.array(
    z.object({
      moduleKey: moduleKeySchema,
      isVisible: z.boolean(),
    }),
  ).max(ACCESS_MODULE_KEYS.length),
).optional();

const accessProfilePermissionsSchema = z.preprocess(
  parseArrayLike,
  z.array(
    z.object({
      permissionKey: permissionKeySchema,
      isAllowed: z.boolean(),
    }),
  ).max(ACCESS_PERMISSION_KEYS.length),
).optional();

const accessProfileWidgetsSchema = z.preprocess(
  parseArrayLike,
  z.array(
    z.object({
      widgetKey: widgetKeySchema,
      isVisible: z.boolean(),
    }),
  ).max(ACCESS_WIDGET_KEYS.length),
).optional();

const accessProfileCreateBodySchema = z.object({
  name: cleanString(120),
  description: optionalString(4000),
  roleParent: roleSchema,
  isActive: optionalBoolean(),
  defaultLandingPage: optionalString(255),
  allowedLanguages: z.preprocess(parseArrayLike, z.array(languageSchema).min(1).max(3)).optional(),
  defaultLanguage: languageSchema.optional(),
  rtlArabic: optionalBoolean(),
  modules: accessProfileModulesSchema,
  permissions: accessProfilePermissionsSchema,
  widgets: accessProfileWidgetsSchema,
});

const accessProfileUpdateBodySchema = z.object({
  name: cleanString(120).optional(),
  description: optionalString(4000),
  roleParent: roleSchema.optional(),
  isActive: optionalBoolean(),
  defaultLandingPage: optionalString(255),
  allowedLanguages: z.preprocess(parseArrayLike, z.array(languageSchema).min(1).max(3)).optional(),
  defaultLanguage: languageSchema.optional(),
  rtlArabic: optionalBoolean(),
  modules: accessProfileModulesSchema,
  permissions: accessProfilePermissionsSchema,
  widgets: accessProfileWidgetsSchema,
});

const accessProfileStatusBodySchema = z.object({
  isActive: z.boolean(),
});

const assignUserAccessProfileBodySchema = z.object({
  profileId: z.coerce.number().int().positive(),
});

const moduleOverrideSchema = z.object({
  moduleKey: moduleKeySchema,
  value: z.boolean(),
  reason: optionalString(1000),
});

const permissionOverrideSchema = z.object({
  permissionKey: permissionKeySchema,
  value: z.boolean(),
  reason: optionalString(1000),
});

const widgetOverrideSchema = z.object({
  widgetKey: widgetKeySchema,
  value: z.boolean(),
  reason: optionalString(1000),
});

const userAccessOverridesBodySchema = z.object({
  replace: optionalBoolean(),
  resetToDefault: optionalBoolean(),
  defaultLandingPage: defaultLandingPageSchema,
  moduleOverrides: z.preprocess(parseArrayLike, z.array(moduleOverrideSchema).max(ACCESS_MODULE_KEYS.length)).optional(),
  permissionOverrides: z.preprocess(parseArrayLike, z.array(permissionOverrideSchema).max(ACCESS_PERMISSION_KEYS.length)).optional(),
  widgetOverrides: z.preprocess(parseArrayLike, z.array(widgetOverrideSchema).max(ACCESS_WIDGET_KEYS.length)).optional(),
});

const userAccessUpdateBodySchema = userAccessOverridesBodySchema;

const supportTicketAccessResolutionBodySchema = userAccessOverridesBodySchema.extend({
  notes: optionalString(4000),
  responseMessage: optionalString(4000),
  closeTicket: optionalBoolean(),
});

module.exports = {
  accessProfileIdParamSchema,
  accessUserIdParamSchema,
  accessProfilesQuerySchema,
  userAccessUsersQuerySchema,
  accessProfileCreateBodySchema,
  accessProfileUpdateBodySchema,
  accessProfileStatusBodySchema,
  assignUserAccessProfileBodySchema,
  userAccessOverridesBodySchema,
  userAccessUpdateBodySchema,
  supportTicketAccessResolutionBodySchema,
};
