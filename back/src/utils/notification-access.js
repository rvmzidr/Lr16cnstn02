function normalizeLink(linkValue) {
  if (typeof linkValue !== "string") {
    return "";
  }

  const trimmed = linkValue.trim();
  if (!trimmed) {
    return "";
  }

  const noHash = trimmed.split("#")[0] || "";
  const noQuery = noHash.split("?")[0] || "";

  return noQuery.toLowerCase();
}

function resolveModuleFromLink(linkValue) {
  const link = normalizeLink(linkValue);

  if (!link) {
    return null;
  }

  if (link.startsWith("/dashboard/messages")) {
    return "messaging";
  }

  if (link.startsWith("/dashboard/notifications")) {
    return "notifications";
  }

  if (link.startsWith("/dashboard/support")) {
    return "support";
  }

  if (link.startsWith("/dashboard/purchases")) {
    return "purchases";
  }

  if (link.startsWith("/dashboard/articles") || link.includes("/articles")) {
    return "articles";
  }

  if (link.startsWith("/dashboard/projects") || link.includes("/projets")) {
    return "projects";
  }

  if (link.startsWith("/dashboard/users") || link.includes("/comptes")) {
    return "admin_users";
  }

  if (
    link.startsWith("/dashboard/registrations") ||
    link.includes("/inscriptions")
  ) {
    return "admin_registrations";
  }

  if (link.startsWith("/dashboard/roles")) {
    return "admin_roles";
  }

  if (
    link.startsWith("/dashboard/user-access") ||
    link.startsWith("/dashboard/access-control")
  ) {
    return "access_control";
  }

  if (link.startsWith("/dashboard/settings")) {
    return "settings";
  }

  return null;
}

function resolveModuleFromType(typeNotification) {
  const type = String(typeNotification || "").toUpperCase();

  if (!type) {
    return null;
  }

  if (type.startsWith("SUPPORT_")) {
    return "support";
  }

  if (type.includes("MESSAGE")) {
    return "messaging";
  }

  if (type.includes("ARTICLE")) {
    return "articles";
  }

  if (type.includes("DEMANDE_ACHAT") || type.includes("ACHAT")) {
    return "purchases";
  }

  if (type.includes("PROJET")) {
    return "projects";
  }

  if (type.includes("INSCRIPTION")) {
    return "admin_registrations";
  }

  if (type.includes("COMPTE")) {
    return "admin_users";
  }

  if (type.includes("ROLE")) {
    return "admin_roles";
  }

  return null;
}

function resolveNotificationModule(notification) {
  if (!notification || typeof notification !== "object") {
    return null;
  }

  const link = notification.lien_direct || notification.lienDirect || null;
  const type = notification.type_notification || notification.typeNotification || null;

  return resolveModuleFromLink(link) || resolveModuleFromType(type);
}

function isNotificationVisibleForModules(notification, moduleVisibility = null) {
  if (!moduleVisibility || typeof moduleVisibility !== "object") {
    return true;
  }

  const moduleKey = resolveNotificationModule(notification);
  if (!moduleKey) {
    return true;
  }

  if (moduleKey === "settings") {
    return Boolean(
      moduleVisibility.profile_settings || moduleVisibility.admin_settings,
    );
  }

  return Boolean(moduleVisibility[moduleKey]);
}

module.exports = {
  normalizeLink,
  resolveNotificationModule,
  isNotificationVisibleForModules,
};
