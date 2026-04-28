const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const {
  ARTICLE_ATTACHMENT_ENTITY,
  ARTICLE_COVER_MIME_TYPES,
  ARTICLE_COVER_STORAGE_DIR,
  ARTICLE_PDF_MIME_TYPES,
  ARTICLE_PDF_STORAGE_DIR,
} = require("../config/article-files");
const { toBigInt, toNumber } = require("../utils/bigint");
const AppError = require("../utils/app-error");
const { cleanupStoredFile } = require("./member-profile.service");

function buildStoredFileName(file, fallbackExtension) {
  const extension =
    path.extname(file.originalname).toLowerCase() || fallbackExtension;
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function serializeArticlePdfAttachment(pieceJointe) {
  if (!pieceJointe) {
    return null;
  }

  return {
    id: toNumber(pieceJointe.id),
    nomFichier: pieceJointe.nom_fichier,
    typeMime: pieceJointe.type_mime,
    tailleOctets:
      pieceJointe.taille_octets === null || pieceJointe.taille_octets === undefined
        ? null
        : Number(pieceJointe.taille_octets),
  };
}

function serializeArticleCoverAttachment(pieceJointe) {
  if (!pieceJointe) {
    return null;
  }

  return {
    id: toNumber(pieceJointe.id),
    nomFichier: pieceJointe.nom_fichier,
    typeMime: pieceJointe.type_mime,
    tailleOctets:
      pieceJointe.taille_octets === null || pieceJointe.taille_octets === undefined
        ? null
        : Number(pieceJointe.taille_octets),
  };
}

async function stageArticlePdf(file) {
  if (!file) {
    throw new AppError("Le fichier PDF est obligatoire.", 400);
  }

  if (!ARTICLE_PDF_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError("Le fichier de l'article doit etre un PDF.", 400);
  }

  await fs.mkdir(ARTICLE_PDF_STORAGE_DIR, { recursive: true });

  const nomStocke = buildStoredFileName(file, ".pdf");
  const chemin = path.join(ARTICLE_PDF_STORAGE_DIR, nomStocke);
  await fs.writeFile(chemin, file.buffer);

  return {
    nomFichier: file.originalname,
    nomStocke,
    chemin,
    typeMime: file.mimetype,
    tailleOctets: BigInt(file.size),
  };
}

async function stageArticleCover(file) {
  if (!file) {
    throw new AppError("Le fichier de couverture est obligatoire.", 400);
  }

  if (!ARTICLE_COVER_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      "La couverture de l'article doit etre au format JPG, PNG ou WEBP.",
      400,
    );
  }

  await fs.mkdir(ARTICLE_COVER_STORAGE_DIR, { recursive: true });

  const nomStocke = buildStoredFileName(file, ".jpg");
  const chemin = path.join(ARTICLE_COVER_STORAGE_DIR, nomStocke);
  await fs.writeFile(chemin, file.buffer);

  return {
    nomFichier: file.originalname,
    nomStocke,
    chemin,
    typeMime: file.mimetype,
    tailleOctets: BigInt(file.size),
  };
}

async function getLatestArticlePdfAttachment(articleId, client = prisma) {
  return client.pieces_jointes.findFirst({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      type_mime: {
        in: ARTICLE_PDF_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });
}

async function getLatestArticleCoverAttachment(articleId, client = prisma) {
  return client.pieces_jointes.findFirst({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      type_mime: {
        in: ARTICLE_COVER_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });
}

async function getArticlePdfAttachmentMap(articleIds, client = prisma) {
  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(articleIds.map((id) => String(id)))].map((id) =>
    toBigInt(id),
  );

  const piecesJointes = await client.pieces_jointes.findMany({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: { in: uniqueIds },
      type_mime: {
        in: ARTICLE_PDF_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  const map = new Map();
  for (const item of piecesJointes) {
    const key = String(item.entite_id);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return map;
}

async function getArticleCoverAttachmentMap(articleIds, client = prisma) {
  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(articleIds.map((id) => String(id)))].map((id) =>
    toBigInt(id),
  );

  const piecesJointes = await client.pieces_jointes.findMany({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: { in: uniqueIds },
      type_mime: {
        in: ARTICLE_COVER_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  const map = new Map();
  for (const item of piecesJointes) {
    const key = String(item.entite_id);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return map;
}

async function replaceArticlePdfAttachment(tx, articleId, stagedPdf, userId) {
  const existing = await tx.pieces_jointes.findFirst({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      type_mime: {
        in: ARTICLE_PDF_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  let oldPathToDelete = null;

  if (existing) {
    oldPathToDelete = existing.chemin_fichier;

    await tx.pieces_jointes.update({
      where: { id: existing.id },
      data: {
        nom_fichier: stagedPdf.nomFichier,
        chemin_fichier: stagedPdf.chemin,
        type_mime: stagedPdf.typeMime,
        taille_octets: stagedPdf.tailleOctets,
        ajoute_par: userId,
        cree_le: new Date(),
      },
    });

    return { oldPathToDelete };
  }

  await tx.pieces_jointes.create({
    data: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      nom_fichier: stagedPdf.nomFichier,
      chemin_fichier: stagedPdf.chemin,
      type_mime: stagedPdf.typeMime,
      taille_octets: stagedPdf.tailleOctets,
      ajoute_par: userId,
    },
  });

  return { oldPathToDelete };
}

async function replaceArticleCoverAttachment(tx, articleId, stagedCover, userId) {
  const existing = await tx.pieces_jointes.findFirst({
    where: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      type_mime: {
        in: ARTICLE_COVER_MIME_TYPES,
      },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  let oldPathToDelete = null;

  if (existing) {
    oldPathToDelete = existing.chemin_fichier;

    await tx.pieces_jointes.update({
      where: { id: existing.id },
      data: {
        nom_fichier: stagedCover.nomFichier,
        chemin_fichier: stagedCover.chemin,
        type_mime: stagedCover.typeMime,
        taille_octets: stagedCover.tailleOctets,
        ajoute_par: userId,
        cree_le: new Date(),
      },
    });

    return { oldPathToDelete };
  }

  await tx.pieces_jointes.create({
    data: {
      type_entite: ARTICLE_ATTACHMENT_ENTITY,
      entite_id: toBigInt(articleId),
      nom_fichier: stagedCover.nomFichier,
      chemin_fichier: stagedCover.chemin,
      type_mime: stagedCover.typeMime,
      taille_octets: stagedCover.tailleOctets,
      ajoute_par: userId,
    },
  });

  return { oldPathToDelete };
}

async function resolveArticlePdfDownload(attachment, fallbackName) {
  if (!attachment?.chemin_fichier) {
    throw new AppError("Aucun PDF n'est disponible pour cet article.", 404);
  }

  try {
    await fs.access(attachment.chemin_fichier);
  } catch (_error) {
    throw new AppError("Le fichier PDF est introuvable sur le serveur.", 404);
  }

  return {
    path: attachment.chemin_fichier,
    mimeType: attachment.type_mime || "application/pdf",
    downloadName: attachment.nom_fichier || `${fallbackName || "article"}.pdf`,
  };
}

module.exports = {
  serializeArticlePdfAttachment,
  serializeArticleCoverAttachment,
  stageArticlePdf,
  stageArticleCover,
  getLatestArticlePdfAttachment,
  getLatestArticleCoverAttachment,
  getArticlePdfAttachmentMap,
  getArticleCoverAttachmentMap,
  replaceArticlePdfAttachment,
  replaceArticleCoverAttachment,
  resolveArticlePdfDownload,
  cleanupStoredFile,
};
