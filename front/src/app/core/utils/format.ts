import type { AccountStatus, ArticleStatus, NewsStatus, Role } from "../models/models";

export function formatDate(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-TN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-TN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function estimateReadTime(content?: string | null) {
  if (!content) {
    return "1 min de lecture";
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  return `${minutes} min de lecture`;
}

export function formatArticleStatus(status: ArticleStatus) {
  switch (status) {
    case "BROUILLON":
      return "Brouillon";
    case "SOUMIS":
      return "Soumis";
    case "VALIDE":
      return "Valide";
    case "REJETE":
      return "Refuse";
    case "PUBLIE":
      return "Publie";
    default:
      return String(status).toLowerCase();
  }
}

export function formatNewsStatus(status: NewsStatus) {
  switch (status) {
    case "BROUILLON":
      return "Brouillon";
    case "PUBLIEE":
      return "Publiee";
    case "ARCHIVEE":
      return "Archivee";
    default:
      return String(status).toLowerCase();
  }
}

export function formatRole(role?: Role | null) {
  switch (role) {
    case "MEMBRE":
      return "Membre";
    case "ADMINISTRATEUR":
      return "Admin";
    case "CHEF_LABO":
      return "Chef du labo";
    default:
      return "Non attribue";
  }
}

export function formatAccountStatus(status?: AccountStatus | null) {
  switch (status) {
    case "EN_ATTENTE":
      return "En attente";
    case "ACTIF":
      return "Actif";
    case "REJETE":
      return "Refuse";
    case "DESACTIVE":
      return "Desactive";
    default:
      return "Inconnu";
  }
}

export function getInitials(fullName?: string | null) {
  if (!fullName) {
    return "NA";
  }

  const parts = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
