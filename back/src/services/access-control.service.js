const prisma = require("../config/prisma");
const { ROLES, SUPPORT_TICKET_STATUS } = require("../config/constants");
const {
  ACCESS_MODULE_KEYS,
  ACCESS_PERMISSION_KEYS,
  ACCESS_WIDGET_KEYS,
  ROLE_ALLOWED_MODULES,
  ROLE_ALLOWED_PERMISSIONS,
  ROLE_ALLOWED_WIDGETS,
  ACCESS_RELATED_SUPPORT_CATEGORIES,
  DEFAULT_ACCESS_PRESETS,
} = require("../config/access-control");
const { toBigInt, toNumber } = require("../utils/bigint");
const { buildMeta, getPagination } = require("../utils/pagination");
const AppError = require("../utils/app-error");
const { createNotifications } = require("./collaboration.service");

const LANGUAGE_CODES = Object.freeze(["fr", "en", "ar"]);

const LANDING_PAGE_TO_MODULE = Object.freeze([
  ["/dashboard/user-access", "access_control"],
  ["/dashboard/access-control", "access_control"],
  ["/dashboard/registrations", "admin_registrations"],
  ["/dashboard/roles", "admin_roles"],
  ["/dashboard/users", "admin_users"],
  ["/dashboard/messages", "messaging"],
  ["/dashboard/notifications", "notifications"],
  ["/dashboard/support", "support"],
  ["/dashboard/articles", "articles"],
  ["/dashboard/purchases", "purchases"],
  ["/dashboard/projects", "projects"],
  ["/dashboard/profil", "profile_settings"],
  ["/dashboard/settings", "profile_settings"],
  ["/dashboard", "dashboard_home"],
]);

const IMPORTANT_PERMISSION_KEYS = Object.freeze([
  "canManageUsers",
  "canChangeRole",
  "canManageAccessProfiles",
  "canManageSupport",
  "canValidateArticle",
  "canCreatePurchaseRequest",
  "canCreateArticle",
  "canSendMessages",
]);

function isMissingUserAccessPreferencesError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = String(error.code || "");
  const maybeMessage = String(error.message || "").toLowerCase();

  if (
    (maybeCode === "P2021" || maybeCode === "P2022") &&
    maybeMessage.includes("user_access_preferences")
  ) {
    return true;
  }

  return maybeMessage.includes("user_access_preferences");
}

async function findUserAccessPreference(tx, userId) {
  const model = tx.user_access_preferences;

  if (!model || typeof model.findUnique !== "function") {
    return null;
  }

  try {
    return await model.findUnique({
      where: { utilisateur_id: userId },
      include: {
        createur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email_institutionnel: true,
            role: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingUserAccessPreferencesError(error)) {
      return null;
    }

    throw error;
  }
}

async function clearUserAccessPreference(tx, userId) {
  const model = tx.user_access_preferences;

  if (!model || typeof model.deleteMany !== "function") {
    return;
  }

  try {
    await model.deleteMany({ where: { utilisateur_id: userId } });
  } catch (error) {
    if (isMissingUserAccessPreferencesError(error)) {
      return;
    }

    throw error;
  }
}

async function upsertUserAccessPreference(tx, userId, adminUserId, landingPath) {
  const model = tx.user_access_preferences;

  if (!model || typeof model.upsert !== "function") {
    return;
  }

  try {
    await model.upsert({
      where: { utilisateur_id: userId },
      update: {
        page_accueil_override: landingPath,
        cree_par: adminUserId,
        modifie_le: new Date(),
      },
      create: {
        utilisateur_id: userId,
        page_accueil_override: landingPath,
        cree_par: adminUserId,
      },
    });
  } catch (error) {
    if (isMissingUserAccessPreferencesError(error)) {
      return;
    }

    throw error;
  }
}

function serializeUserSummary(utilisateur) {
  if (!utilisateur) {
    return null;
  }

  return {
    id: utilisateur.id,
    fullName: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
    email: utilisateur.email_institutionnel,
    role: utilisateur.role,
  };
}

function toGlobalRole(role) {
  if (role === ROLES.ADMINISTRATEUR) {
    return "ADMIN";
  }

  if (role === ROLES.CHEF_LABO) {
    return "LAB_HEAD";
  }

  return "MEMBER";
}

function sanitizeLandingPath(pathValue) {
  if (typeof pathValue !== "string") {
    return "/dashboard";
  }

  const cleaned = pathValue.trim();

  if (!cleaned.startsWith("/dashboard")) {
    return "/dashboard";
  }

  return cleaned;
}

function routeAllowedByModules(routePath, modulesMap) {
  if (!routePath || typeof routePath !== "string") {
    return false;
  }

  const normalizedPath = sanitizeLandingPath(routePath);

  if (normalizedPath.startsWith("/dashboard/settings")) {
    return Boolean(modulesMap.profile_settings || modulesMap.admin_settings);
  }

  if (normalizedPath.startsWith("/dashboard/profil")) {
    return Boolean(modulesMap.profile_settings);
  }

  for (const [prefix, moduleKey] of LANDING_PAGE_TO_MODULE) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return Boolean(modulesMap[moduleKey]);
    }
  }

  return false;
}

function resolveLandingPage(preferredPath, modulesMap) {
  const sanitizedPreferred = sanitizeLandingPath(preferredPath || "/dashboard");

  if (routeAllowedByModules(sanitizedPreferred, modulesMap)) {
    return sanitizedPreferred;
  }

  const candidates = [
    "/dashboard",
    "/dashboard/support",
    "/dashboard/messages",
    "/dashboard/articles",
    "/dashboard/projects",
    "/dashboard/purchases",
    "/dashboard/profil",
    "/dashboard/notifications",
    "/dashboard/users",
    "/dashboard/registrations",
    "/dashboard/roles",
    "/dashboard/user-access",
    "/dashboard/access-control",
    "/dashboard/settings",
  ];

  const match = candidates.find((item) => routeAllowedByModules(item, modulesMap));
  return match || "/dashboard";
}

function buildFeatureMap(allKeys, allowedKeys, enabledKeys) {
  const allowedSet = new Set(allowedKeys || []);
  const enabledSet = new Set(enabledKeys || []);
  const map = {};

  for (const key of allKeys) {
    map[key] = allowedSet.has(key) && enabledSet.has(key);
  }

  return map;
}

function mapToArray(map, valueKeyName) {
  return Object.entries(map).map(([key, value]) => ({
    key,
    [valueKeyName]: Boolean(value),
  }));
}

function getMajorPermissions(permissionsMap) {
  return IMPORTANT_PERMISSION_KEYS
    .filter((key) => Boolean(permissionsMap[key]))
    .map((key) => ({ key, isAllowed: true }));
}

function assertKnownModuleKey(moduleKey) {
  if (!ACCESS_MODULE_KEYS.includes(moduleKey)) {
    throw new AppError(`Module inconnu: ${moduleKey}.`, 400);
  }
}

function assertKnownPermissionKey(permissionKey) {
  if (!ACCESS_PERMISSION_KEYS.includes(permissionKey)) {
    throw new AppError(`Permission inconnue: ${permissionKey}.`, 400);
  }
}

function assertKnownWidgetKey(widgetKey) {
  if (!ACCESS_WIDGET_KEYS.includes(widgetKey)) {
    throw new AppError(`Widget inconnu: ${widgetKey}.`, 400);
  }
}

function assertRoleAllowsModule(role, moduleKey) {
  if (!ROLE_ALLOWED_MODULES[role]?.includes(moduleKey)) {
    throw new AppError(`Le role ${role} ne peut pas acceder au module ${moduleKey}.`, 400);
  }
}

function assertRoleAllowsPermission(role, permissionKey) {
  if (!ROLE_ALLOWED_PERMISSIONS[role]?.includes(permissionKey)) {
    throw new AppError(`Le role ${role} ne peut pas avoir la permission ${permissionKey}.`, 400);
  }
}

function assertRoleAllowsWidget(role, widgetKey) {
  if (!ROLE_ALLOWED_WIDGETS[role]?.includes(widgetKey)) {
    throw new AppError(`Le role ${role} ne peut pas afficher le widget ${widgetKey}.`, 400);
  }
}

function resolveDefaultPreset(role, isDoctorant) {
  if (role === ROLES.ADMINISTRATEUR) {
    return DEFAULT_ACCESS_PRESETS.ADMINISTRATEUR;
  }

  if (role === ROLES.CHEF_LABO) {
    return DEFAULT_ACCESS_PRESETS.CHEF_LABO;
  }

  if (role === ROLES.MEMBRE && isDoctorant) {
    return DEFAULT_ACCESS_PRESETS.MEMBRE_DOCTORANT;
  }

  return DEFAULT_ACCESS_PRESETS.MEMBRE_STANDARD;
}

function buildDefaultAccess(role, isDoctorant) {
  const preset = resolveDefaultPreset(role, isDoctorant);

  return {
    source: preset.sourceKey,
    defaultLandingPage: preset.defaultLandingPage,
    modulesMap: buildFeatureMap(
      ACCESS_MODULE_KEYS,
      ROLE_ALLOWED_MODULES[role],
      preset.enabledModules,
    ),
    permissionsMap: buildFeatureMap(
      ACCESS_PERMISSION_KEYS,
      ROLE_ALLOWED_PERMISSIONS[role],
      preset.enabledPermissions,
    ),
    widgetsMap: buildFeatureMap(
      ACCESS_WIDGET_KEYS,
      ROLE_ALLOWED_WIDGETS[role],
      preset.enabledWidgets,
    ),
  };
}

function applyOverridesToEffectiveMaps(role, effective, overrides) {
  for (const override of overrides || []) {
    if (override.module_key && ACCESS_MODULE_KEYS.includes(override.module_key)) {
      if (ROLE_ALLOWED_MODULES[role]?.includes(override.module_key)) {
        effective.modulesMap[override.module_key] = Boolean(override.valeur_bool);
      }
      continue;
    }

    if (override.permission_key && ACCESS_PERMISSION_KEYS.includes(override.permission_key)) {
      if (ROLE_ALLOWED_PERMISSIONS[role]?.includes(override.permission_key)) {
        effective.permissionsMap[override.permission_key] = Boolean(override.valeur_bool);
      }
      continue;
    }

    if (override.widget_key && ACCESS_WIDGET_KEYS.includes(override.widget_key)) {
      if (ROLE_ALLOWED_WIDGETS[role]?.includes(override.widget_key)) {
        effective.widgetsMap[override.widget_key] = Boolean(override.valeur_bool);
      }
    }
  }
}

function serializeOverride(override) {
  const moduleKey = override.module_key || null;
  const permissionKey = override.permission_key || null;
  const widgetKey = override.widget_key || null;

  let overrideType = "permission";
  let key = permissionKey;

  if (moduleKey) {
    overrideType = "module";
    key = moduleKey;
  } else if (widgetKey) {
    overrideType = "widget";
    key = widgetKey;
  }

  return {
    id: toNumber(override.id),
    overrideType,
    key,
    value: Boolean(override.valeur_bool),
    reason: override.raison || null,
    createdAt: override.cree_le,
    createdBy: serializeUserSummary(override.createur),
  };
}

async function getUserWithProfile(userId, tx = prisma) {
  return tx.utilisateurs.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
      statut: true,
      actif: true,
      profil: {
        select: {
          est_doctorant: true,
        },
      },
    },
  });
}

async function ensureSystemProfiles(_tx = prisma) {
  // Deprecated: access is now automatic from role + estDoctorant.
}

async function getUserAccessContext(userId, options = {}) {
  const tx = options.tx || prisma;
  const utilisateur = await getUserWithProfile(userId, tx);

  if (!utilisateur) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  if (!utilisateur.role) {
    throw new AppError("Utilisateur sans role applicatif.", 400);
  }

  const isDoctorant = Boolean(utilisateur.profil?.est_doctorant);
  const defaults = buildDefaultAccess(utilisateur.role, isDoctorant);

  const [overrides, preference] = await Promise.all([
    tx.user_access_overrides.findMany({
      where: { utilisateur_id: userId },
      include: {
        createur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email_institutionnel: true,
            role: true,
          },
        },
      },
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    }),
    findUserAccessPreference(tx, userId),
  ]);

  const defaultModulesMap = { ...defaults.modulesMap };
  const defaultPermissionsMap = { ...defaults.permissionsMap };
  const defaultWidgetsMap = { ...defaults.widgetsMap };

  const effective = {
    modulesMap: { ...defaultModulesMap },
    permissionsMap: { ...defaultPermissionsMap },
    widgetsMap: { ...defaultWidgetsMap },
  };

  applyOverridesToEffectiveMaps(utilisateur.role, effective, overrides);

  const defaultLandingPage = resolveLandingPage(defaults.defaultLandingPage, defaultModulesMap);
  const effectiveLandingPage = resolveLandingPage(
    preference?.page_accueil_override || defaultLandingPage,
    effective.modulesMap,
  );

  return {
    user: {
      id: utilisateur.id,
      fullName: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
      email: utilisateur.email_institutionnel,
      role: utilisateur.role,
      globalRole: toGlobalRole(utilisateur.role),
      accountStatus: utilisateur.statut,
      active: Boolean(utilisateur.actif),
      isDoctorant,
    },
    profile: null,
    assignment: null,
    defaultSource: defaults.source,
    defaultAccess: {
      source: defaults.source,
      defaultLandingPage,
      modules: mapToArray(defaultModulesMap, "isVisible"),
      permissions: mapToArray(defaultPermissionsMap, "isAllowed"),
      widgets: mapToArray(defaultWidgetsMap, "isVisible"),
    },
    landingOverride: preference?.page_accueil_override || null,
    effective: {
      modules: mapToArray(effective.modulesMap, "isVisible"),
      permissions: mapToArray(effective.permissionsMap, "isAllowed"),
      widgets: mapToArray(effective.widgetsMap, "isVisible"),
      visibleModules: Object.entries(effective.modulesMap)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key),
      majorPermissions: getMajorPermissions(effective.permissionsMap),
      defaultLandingPage: effectiveLandingPage,
      allowedLanguages: [...LANGUAGE_CODES],
      defaultLanguage: "fr",
      rtlArabic: true,
    },
    overrides: overrides.map(serializeOverride),
  };
}

async function getUserAccessSummary() {
  const [
    totalUsers,
    adminUsers,
    labHeadUsers,
    memberUsers,
    doctorantMembers,
    overrideGrouped,
    accessRelatedTicketsOpen,
    linkedTickets,
  ] = await prisma.$transaction([
    prisma.utilisateurs.count({ where: { role: { not: null } } }),
    prisma.utilisateurs.count({ where: { role: ROLES.ADMINISTRATEUR } }),
    prisma.utilisateurs.count({ where: { role: ROLES.CHEF_LABO } }),
    prisma.utilisateurs.count({ where: { role: ROLES.MEMBRE } }),
    prisma.utilisateurs.count({
      where: {
        role: ROLES.MEMBRE,
        profil: {
          is: {
            est_doctorant: true,
          },
        },
      },
    }),
    prisma.user_access_overrides.groupBy({ by: ["utilisateur_id"] }),
    prisma.support_tickets.count({
      where: {
        categorie: { in: ACCESS_RELATED_SUPPORT_CATEGORIES },
        statut: { in: [SUPPORT_TICKET_STATUS.OPEN, SUPPORT_TICKET_STATUS.IN_PROGRESS] },
      },
    }),
    prisma.support_tickets.findMany({
      where: {
        categorie: { in: ACCESS_RELATED_SUPPORT_CATEGORIES },
        statut: { in: [SUPPORT_TICKET_STATUS.OPEN, SUPPORT_TICKET_STATUS.IN_PROGRESS] },
      },
      include: {
        demandeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email_institutionnel: true,
            role: true,
          },
        },
      },
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      take: 12,
    }),
  ]);

  return {
    stats: {
      totalUsers,
      adminUsers,
      labHeadUsers,
      memberUsers,
      doctorantMembers,
      usersWithOverrides: overrideGrouped.length,
      accessRelatedTicketsOpen,
    },
    linkedTickets: linkedTickets.map((ticket) => ({
      id: toNumber(ticket.id),
      subject: ticket.sujet,
      category: ticket.categorie,
      status: ticket.statut,
      createdAt: ticket.cree_le,
      requester: serializeUserSummary(ticket.demandeur),
    })),
  };
}

async function listUserAccessUsers(query = {}) {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);

  const where = {
    AND: [{ role: { not: null } }],
  };

  if (query.q) {
    const q = String(query.q).trim();
    if (q) {
      where.AND.push({
        OR: [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { email_institutionnel: { contains: q } },
        ],
      });
    }
  }

  if (query.role) {
    where.AND.push({ role: query.role });
  }

  if (typeof query.isDoctorant === "boolean") {
    if (query.isDoctorant) {
      where.AND.push({
        profil: {
          is: {
            est_doctorant: true,
          },
        },
      });
    } else {
      where.AND.push({
        OR: [
          { profil: { is: null } },
          {
            profil: {
              is: {
                est_doctorant: false,
              },
            },
          },
        ],
      });
    }
  }

  if (typeof query.hasOverrides === "boolean") {
    where.AND.push(
      query.hasOverrides
        ? { user_access_overrides: { some: {} } }
        : { user_access_overrides: { none: {} } },
    );
  }

  const normalizedWhere = where.AND.length ? where : {};

  const [total, users] = await prisma.$transaction([
    prisma.utilisateurs.count({ where: normalizedWhere }),
    prisma.utilisateurs.findMany({
      where: normalizedWhere,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email_institutionnel: true,
        role: true,
        statut: true,
        actif: true,
        profil: {
          select: {
            est_doctorant: true,
          },
        },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      skip,
      take,
    }),
  ]);

  const elements = await Promise.all(
    users.map(async (user) => {
      const context = await getUserAccessContext(user.id);

      return {
        id: user.id,
        fullName: `${user.prenom} ${user.nom}`.trim(),
        email: user.email_institutionnel,
        role: user.role,
        globalRole: toGlobalRole(user.role),
        accountStatus: user.statut,
        active: Boolean(user.actif),
        isDoctorant: Boolean(user.profil?.est_doctorant),
        defaultSource: context.defaultSource,
        defaultLandingPage: context.defaultAccess.defaultLandingPage,
        effectiveLandingPage: context.effective.defaultLandingPage,
        visibleModules: context.effective.visibleModules,
        majorPermissions: context.effective.majorPermissions,
        overridesCount: context.overrides.length,
        hasOverrides: context.overrides.length > 0,
      };
    }),
  );

  return {
    elements,
    meta: buildMeta(total, page, limit),
  };
}

function buildOverrideRows(role, userId, adminUserId, payload) {
  const rows = [];

  for (const item of payload.moduleOverrides || []) {
    assertKnownModuleKey(item.moduleKey);
    assertRoleAllowsModule(role, item.moduleKey);

    rows.push({
      utilisateur_id: userId,
      module_key: item.moduleKey,
      permission_key: null,
      widget_key: null,
      valeur_bool: Boolean(item.value),
      raison: item.reason || null,
      cree_par: adminUserId,
    });
  }

  for (const item of payload.permissionOverrides || []) {
    assertKnownPermissionKey(item.permissionKey);
    assertRoleAllowsPermission(role, item.permissionKey);

    rows.push({
      utilisateur_id: userId,
      module_key: null,
      permission_key: item.permissionKey,
      widget_key: null,
      valeur_bool: Boolean(item.value),
      raison: item.reason || null,
      cree_par: adminUserId,
    });
  }

  for (const item of payload.widgetOverrides || []) {
    assertKnownWidgetKey(item.widgetKey);
    assertRoleAllowsWidget(role, item.widgetKey);

    rows.push({
      utilisateur_id: userId,
      module_key: null,
      permission_key: null,
      widget_key: item.widgetKey,
      valeur_bool: Boolean(item.value),
      raison: item.reason || null,
      cree_par: adminUserId,
    });
  }

  return rows;
}

async function updateUserAccessInternal(tx, adminUserId, userId, payload) {
  const utilisateur = await getUserWithProfile(userId, tx);

  if (!utilisateur) {
    throw new AppError("Utilisateur introuvable.", 404);
  }

  if (!utilisateur.role) {
    throw new AppError("Utilisateur sans role applicatif.", 400);
  }

  if (payload.resetToDefault) {
    await tx.user_access_overrides.deleteMany({ where: { utilisateur_id: userId } });
    await clearUserAccessPreference(tx, userId);
    return;
  }

  const shouldReplace = payload.replace !== false;
  const rows = buildOverrideRows(utilisateur.role, userId, adminUserId, payload);

  if (shouldReplace) {
    await tx.user_access_overrides.deleteMany({ where: { utilisateur_id: userId } });
  }

  if (rows.length) {
    await tx.user_access_overrides.createMany({ data: rows });
  }

  if (payload.defaultLandingPage !== undefined) {
    const normalizedLanding =
      payload.defaultLandingPage === null || String(payload.defaultLandingPage).trim() === ""
        ? null
        : sanitizeLandingPath(String(payload.defaultLandingPage));

    if (!normalizedLanding) {
      await clearUserAccessPreference(tx, userId);
    } else {
      await upsertUserAccessPreference(tx, userId, adminUserId, normalizedLanding);
    }
  }
}

async function updateUserAccess(adminUserId, userId, payload) {
  await prisma.$transaction(async (tx) => {
    await updateUserAccessInternal(tx, adminUserId, userId, payload);
  });

  return getUserAccessContext(userId);
}

async function replaceUserAccessOverrides(adminUserId, userId, payload) {
  return updateUserAccess(adminUserId, userId, payload);
}

async function resetUserAccess(adminUserId, userId) {
  await prisma.$transaction(async (tx) => {
    await updateUserAccessInternal(tx, adminUserId, userId, {
      resetToDefault: true,
    });
  });

  return getUserAccessContext(userId);
}

async function getSupportTicketAccessContext(ticketId) {
  const ticket = await prisma.support_tickets.findUnique({
    where: { id: toBigInt(ticketId) },
    include: {
      demandeur: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email_institutionnel: true,
          role: true,
        },
      },
      admin_assigne: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email_institutionnel: true,
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new AppError("Ticket support introuvable.", 404);
  }

  const accessContext = await getUserAccessContext(ticket.demandeur_id);

  const resolutions = await prisma.support_ticket_access_resolutions.findMany({
    where: { ticket_id: toBigInt(ticketId) },
    include: {
      admin: {
        select: {
          id: true,
          nom: true,
          prenom: true,
          email_institutionnel: true,
          role: true,
        },
      },
      profile: {
        select: {
          id: true,
          nom: true,
          role_parent: true,
        },
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  return {
    ticket: {
      id: toNumber(ticket.id),
      subject: ticket.sujet,
      category: ticket.categorie,
      status: ticket.statut,
      createdAt: ticket.cree_le,
      requester: serializeUserSummary(ticket.demandeur),
      assignedAdmin: serializeUserSummary(ticket.admin_assigne),
    },
    isAccessRelated: ACCESS_RELATED_SUPPORT_CATEGORIES.includes(ticket.categorie),
    accessContext,
    resolutions: resolutions.map((item) => ({
      id: toNumber(item.id),
      notes: item.notes,
      createdAt: item.cree_le,
      admin: serializeUserSummary(item.admin),
      profile: item.profile
        ? {
            id: toNumber(item.profile.id),
            name: item.profile.nom,
            parentRole: item.profile.role_parent,
          }
        : null,
    })),
  };
}

async function resolveSupportTicketAccess(ticketId, adminUserId, payload) {
  const normalizedTicketId = toBigInt(ticketId);

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.support_tickets.findUnique({
      where: { id: normalizedTicketId },
      select: {
        id: true,
        demandeur_id: true,
        statut: true,
        admin_assigne_id: true,
      },
    });

    if (!ticket) {
      throw new AppError("Ticket support introuvable.", 404);
    }

    if (payload.resetToDefault) {
      await updateUserAccessInternal(tx, adminUserId, ticket.demandeur_id, {
        resetToDefault: true,
      });
    } else if (
      payload.moduleOverrides ||
      payload.permissionOverrides ||
      payload.widgetOverrides ||
      payload.replace !== undefined ||
      payload.defaultLandingPage !== undefined
    ) {
      await updateUserAccessInternal(tx, adminUserId, ticket.demandeur_id, {
        replace: payload.replace,
        moduleOverrides: payload.moduleOverrides || [],
        permissionOverrides: payload.permissionOverrides || [],
        widgetOverrides: payload.widgetOverrides || [],
        defaultLandingPage: payload.defaultLandingPage,
      });
    }

    await tx.support_ticket_access_resolutions.create({
      data: {
        ticket_id: ticket.id,
        admin_id: adminUserId,
        utilisateur_id: ticket.demandeur_id,
        profile_id: null,
        notes: payload.notes || null,
      },
    });

    if (payload.responseMessage && String(payload.responseMessage).trim()) {
      await tx.support_reponses.create({
        data: {
          ticket_id: ticket.id,
          auteur_id: adminUserId,
          message: String(payload.responseMessage).trim(),
          est_note_interne: false,
        },
      });

      await createNotifications(
        tx,
        [ticket.demandeur_id],
        {
          typeNotification: "SUPPORT_TICKET_REPONSE",
          titre: "Mise a jour support sur vos acces",
          message: `Le ticket #${toNumber(ticket.id)} contient une reponse de resolution d'acces.`,
          lienDirect: `/dashboard/support?ticketId=${toNumber(ticket.id)}`,
        },
        "support",
      );
    }

    if (payload.closeTicket) {
      const now = new Date();
      await tx.support_tickets.update({
        where: { id: ticket.id },
        data: {
          statut: SUPPORT_TICKET_STATUS.RESOLVED,
          resolu_le: now,
          ferme_le: null,
          modifie_le: now,
          admin_assigne_id: ticket.admin_assigne_id || adminUserId,
        },
      });

      await createNotifications(
        tx,
        [ticket.demandeur_id],
        {
          typeNotification: "SUPPORT_TICKET_RESOLU",
          titre: "Ticket support resolu",
          message: `Le ticket #${toNumber(ticket.id)} a ete resolu apres correction des acces.`,
          lienDirect: `/dashboard/support?ticketId=${toNumber(ticket.id)}`,
        },
        "support",
      );
    }
  });

  return getSupportTicketAccessContext(ticketId);
}

async function getEffectiveAccessForRequest(userId) {
  const context = await getUserAccessContext(userId);

  return {
    moduleVisibility: Object.fromEntries(
      context.effective.modules.map((item) => [item.key, Boolean(item.isVisible)]),
    ),
    permissionAccess: Object.fromEntries(
      context.effective.permissions.map((item) => [item.key, Boolean(item.isAllowed)]),
    ),
    defaultLandingPage: context.effective.defaultLandingPage,
  };
}

async function assertModuleAccess(userId, moduleKey) {
  assertKnownModuleKey(moduleKey);
  const effective = await getEffectiveAccessForRequest(userId);

  if (!effective.moduleVisibility[moduleKey]) {
    throw new AppError(`Acces refuse au module ${moduleKey}.`, 403);
  }
}

async function assertPermissionAccess(userId, permissionKey) {
  assertKnownPermissionKey(permissionKey);
  const effective = await getEffectiveAccessForRequest(userId);

  if (!effective.permissionAccess[permissionKey]) {
    throw new AppError(`Permission refusee: ${permissionKey}.`, 403);
  }
}

// Compatibility wrappers for legacy profile-first endpoints.
async function listAccessProfiles(query = {}) {
  const { page, limit } = getPagination(query.page, query.limit);
  const summary = await getUserAccessSummary();

  return {
    elements: [],
    meta: buildMeta(0, page, limit),
    stats: {
      activeProfiles: summary.stats.totalUsers,
      usersWithOverrides: summary.stats.usersWithOverrides,
      accessRelatedTicketsOpen: summary.stats.accessRelatedTicketsOpen,
      restrictedProfilesCount: summary.stats.doctorantMembers,
    },
    linkedTickets: summary.linkedTickets,
  };
}

async function createAccessProfile() {
  throw new AppError(
    "La creation manuelle de profils d'acces est desactivee. Utilisez la gestion des acces utilisateurs.",
    400,
  );
}

async function getAccessProfileDetail() {
  throw new AppError("Les profils d'acces manuels ne sont plus disponibles.", 404);
}

async function updateAccessProfile() {
  throw new AppError("Les profils d'acces manuels ne sont plus disponibles.", 400);
}

async function duplicateAccessProfile() {
  throw new AppError("Les profils d'acces manuels ne sont plus disponibles.", 400);
}

async function updateAccessProfileStatus() {
  throw new AppError("Les profils d'acces manuels ne sont plus disponibles.", 400);
}

async function listAccessProfileUsers(_profileId, query = {}) {
  const { page, limit } = getPagination(query.page, query.limit);
  return {
    elements: [],
    meta: buildMeta(0, page, limit),
  };
}

async function assignAccessProfileToUser() {
  throw new AppError(
    "L'affectation de profils manuels est desactivee. Utilisez les overrides utilisateur.",
    400,
  );
}

async function getAccessPreviewProfile() {
  throw new AppError("La previsualisation de profil manuel est desactivee.", 404);
}

async function getAccessPreviewUser(userId) {
  return getUserAccessContext(userId);
}

module.exports = {
  ACCESS_MODULE_KEYS,
  ACCESS_PERMISSION_KEYS,
  ACCESS_WIDGET_KEYS,
  ACCESS_RELATED_SUPPORT_CATEGORIES,
  ensureSystemProfiles,
  getUserAccessSummary,
  listUserAccessUsers,
  updateUserAccess,
  resetUserAccess,
  listAccessProfiles,
  createAccessProfile,
  getAccessProfileDetail,
  updateAccessProfile,
  updateAccessProfileStatus,
  duplicateAccessProfile,
  listAccessProfileUsers,
  assignAccessProfileToUser,
  replaceUserAccessOverrides,
  getUserAccessContext,
  getAccessPreviewProfile,
  getAccessPreviewUser,
  getSupportTicketAccessContext,
  resolveSupportTicketAccess,
  getEffectiveAccessForRequest,
  assertModuleAccess,
  assertPermissionAccess,
};
