const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const {
  ACCOUNT_STATUS,
  ROLES,
  SUPPORT_TICKET_STATUS,
} = require("../config/constants");
const {
  MAX_SUPPORT_ATTACHMENT_BYTES,
  SUPPORT_ATTACHMENT_MIME_TYPES,
  SUPPORT_ATTACHMENT_STORAGE_DIR,
} = require("../config/support-files");
const { toBigInt, toNumber } = require("../utils/bigint");
const { buildMeta, getPagination } = require("../utils/pagination");
const AppError = require("../utils/app-error");
const { createNotifications } = require("./collaboration.service");
const { cleanupStoredFile } = require("./member-profile.service");

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

function buildAttachmentDownloadName(attachment) {
  return attachment.nom_fichier || `support-attachment-${toNumber(attachment.id)}`;
}

function serializeSupportAttachment(attachment) {
  if (!attachment) {
    return null;
  }

  return {
    id: toNumber(attachment.id),
    ticketId: toNumber(attachment.ticket_id),
    replyId: toNumber(attachment.reponse_id),
    fileName: attachment.nom_fichier,
    mimeType: attachment.type_mime,
    size: attachment.taille_octets === null || attachment.taille_octets === undefined
      ? null
      : Number(attachment.taille_octets),
    uploadedAt: attachment.cree_le,
    uploadedBy: serializeUserSummary(attachment.uploader),
  };
}

function serializeSupportReply(reply) {
  if (!reply) {
    return null;
  }

  return {
    id: toNumber(reply.id),
    ticketId: toNumber(reply.ticket_id),
    authorId: reply.auteur_id,
    message: reply.message,
    isInternalNote: Boolean(reply.est_note_interne),
    createdAt: reply.cree_le,
    updatedAt: reply.modifie_le,
    author: serializeUserSummary(reply.auteur),
    attachments: Array.isArray(reply.support_pieces_jointes)
      ? reply.support_pieces_jointes.map(serializeSupportAttachment)
      : [],
  };
}

function serializeSupportTicketSummary(ticket) {
  const lastReplyAt = Array.isArray(ticket.support_reponses) && ticket.support_reponses.length
    ? ticket.support_reponses[0].cree_le
    : null;

  return {
    id: toNumber(ticket.id),
    subject: ticket.sujet,
    description: ticket.description,
    category: ticket.categorie,
    priority: ticket.priorite,
    status: ticket.statut,
    requesterId: ticket.demandeur_id,
    assignedAdminId: ticket.admin_assigne_id,
    createdAt: ticket.cree_le,
    updatedAt: ticket.modifie_le,
    resolvedAt: ticket.resolu_le,
    closedAt: ticket.ferme_le,
    requester: serializeUserSummary(ticket.demandeur),
    assignedAdmin: serializeUserSummary(ticket.admin_assigne),
    replyCount: ticket._count?.support_reponses || 0,
    attachmentCount: ticket._count?.support_pieces_jointes || 0,
    lastReplyAt,
  };
}

function serializeSupportTicketDetail(ticket, options = {}) {
  const includeInternalNotes = Boolean(options.includeInternalNotes);

  const replies = Array.isArray(ticket.support_reponses)
    ? ticket.support_reponses
      .filter((reply) => includeInternalNotes || !reply.est_note_interne)
      .map(serializeSupportReply)
    : [];

  const attachments = Array.isArray(ticket.support_pieces_jointes)
    ? ticket.support_pieces_jointes
      .filter((attachment) => !attachment.reponse_id)
      .map(serializeSupportAttachment)
    : [];

  return {
    id: toNumber(ticket.id),
    subject: ticket.sujet,
    description: ticket.description,
    category: ticket.categorie,
    priority: ticket.priorite,
    status: ticket.statut,
    requesterId: ticket.demandeur_id,
    assignedAdminId: ticket.admin_assigne_id,
    createdAt: ticket.cree_le,
    updatedAt: ticket.modifie_le,
    resolvedAt: ticket.resolu_le,
    closedAt: ticket.ferme_le,
    requester: serializeUserSummary(ticket.demandeur),
    assignedAdmin: serializeUserSummary(ticket.admin_assigne),
    attachments,
    replies,
  };
}

function ensureRoleCanUseSupport(role) {
  if (![ROLES.MEMBRE, ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(role)) {
    throw new AppError("Role non autorise pour le centre de support.", 403);
  }
}

function isAdminRole(role) {
  return role === ROLES.ADMINISTRATEUR;
}

async function listActiveAdminIds(tx = prisma) {
  const admins = await tx.utilisateurs.findMany({
    where: {
      role: ROLES.ADMINISTRATEUR,
      statut: ACCOUNT_STATUS.ACTIF,
      actif: true,
    },
    select: {
      id: true,
    },
  });

  return admins.map((item) => item.id);
}

function buildSupportAttachmentFileName(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${extension || ".bin"}`;
}

async function stageSupportAttachment(file) {
  if (!file) {
    return null;
  }

  if (!SUPPORT_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      "La piece jointe support doit etre au format PDF, JPG, PNG ou WEBP.",
      400,
    );
  }

  if (file.size > MAX_SUPPORT_ATTACHMENT_BYTES) {
    throw new AppError("La piece jointe support depasse la taille maximale de 10 Mo.", 400);
  }

  await fs.mkdir(SUPPORT_ATTACHMENT_STORAGE_DIR, { recursive: true });

  const storedName = buildSupportAttachmentFileName(file);
  const storedPath = path.join(SUPPORT_ATTACHMENT_STORAGE_DIR, storedName);
  await fs.writeFile(storedPath, file.buffer);

  return {
    fileName: file.originalname,
    storedPath,
    mimeType: file.mimetype,
    size: BigInt(file.size),
  };
}

async function ensureTicketExists(ticketId, tx = prisma) {
  const ticket = await tx.support_tickets.findUnique({
    where: { id: toBigInt(ticketId) },
  });

  if (!ticket) {
    throw new AppError("Ticket support introuvable.", 404);
  }

  return ticket;
}

function ensureTicketOwnership(ticket, userId) {
  if (ticket.demandeur_id !== userId) {
    throw new AppError("Acces interdit a ce ticket support.", 403);
  }
}

async function ensureAdminCanBeAssigned(adminId, tx = prisma) {
  const admin = await tx.utilisateurs.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      role: true,
      statut: true,
      actif: true,
    },
  });

  if (!admin || admin.role !== ROLES.ADMINISTRATEUR) {
    throw new AppError("Administrateur cible introuvable.", 404);
  }

  if (admin.statut !== ACCOUNT_STATUS.ACTIF || !admin.actif) {
    throw new AppError("Administrateur cible inactif.", 400);
  }

  return admin;
}

function buildTicketSearchWhere(search) {
  const q = (search || "").trim();
  if (!q) {
    return null;
  }

  return {
    OR: [
      { sujet: { contains: q } },
      { description: { contains: q } },
      { demandeur: { nom: { contains: q } } },
      { demandeur: { prenom: { contains: q } } },
      { demandeur: { email_institutionnel: { contains: q } } },
    ],
  };
}

function applySupportTicketFilters(filters = {}, options = {}) {
  const where = {
    AND: [],
  };

  if (options.onlyRequesterId) {
    where.AND.push({ demandeur_id: options.onlyRequesterId });
  }

  const searchWhere = buildTicketSearchWhere(filters.q);
  if (searchWhere) {
    where.AND.push(searchWhere);
  }

  if (filters.statut) {
    where.AND.push({ statut: filters.statut });
  }

  if (filters.categorie) {
    where.AND.push({ categorie: filters.categorie });
  }

  if (filters.priorite) {
    where.AND.push({ priorite: filters.priorite });
  }

  if (options.assignation === "mine" && options.adminUserId) {
    where.AND.push({ admin_assigne_id: options.adminUserId });
  }

  if (options.assignation === "assigned") {
    where.AND.push({ admin_assigne_id: { not: null } });
  }

  if (options.assignation === "unassigned") {
    where.AND.push({ admin_assigne_id: null });
  }

  if (!where.AND.length) {
    return {};
  }

  return where;
}

function buildSupportTicketInclude() {
  return {
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
    _count: {
      select: {
        support_reponses: true,
        support_pieces_jointes: true,
      },
    },
    support_reponses: {
      select: {
        cree_le: true,
      },
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      take: 1,
    },
  };
}

async function createTicket(requesterId, requesterRole, payload, attachmentFile) {
  ensureRoleCanUseSupport(requesterRole);

  const stagedAttachment = await stageSupportAttachment(attachmentFile);
  const filesToCleanup = [];

  if (stagedAttachment?.storedPath) {
    filesToCleanup.push(stagedAttachment.storedPath);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.support_tickets.create({
        data: {
          demandeur_id: requesterId,
          sujet: payload.sujet,
          description: payload.description,
          categorie: payload.categorie,
          priorite: payload.priorite || "MEDIUM",
          statut: SUPPORT_TICKET_STATUS.OPEN,
        },
      });

      if (stagedAttachment) {
        await tx.support_pieces_jointes.create({
          data: {
            ticket_id: ticket.id,
            nom_fichier: stagedAttachment.fileName,
            chemin_fichier: stagedAttachment.storedPath,
            type_mime: stagedAttachment.mimeType,
            taille_octets: stagedAttachment.size,
            ajoute_par: requesterId,
          },
        });
      }

      const adminIds = await listActiveAdminIds(tx);
      await createNotifications(
        tx,
        adminIds,
        {
          typeNotification: "SUPPORT_TICKET_CREE",
          titre: "Nouveau ticket support",
          message: `Nouveau ticket #${toNumber(ticket.id)}: ${ticket.sujet}`,
          lienDirect: `/dashboard/support?ticketId=${toNumber(ticket.id)}`,
        },
        "support",
      );

      return tx.support_tickets.findUnique({
        where: { id: ticket.id },
        include: {
          ...buildSupportTicketInclude(),
          support_pieces_jointes: {
            include: {
              uploader: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  email_institutionnel: true,
                  role: true,
                },
              },
            },
            orderBy: [{ cree_le: "asc" }, { id: "asc" }],
          },
          support_reponses: {
            include: {
              auteur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  email_institutionnel: true,
                  role: true,
                },
              },
              support_pieces_jointes: {
                include: {
                  uploader: {
                    select: {
                      id: true,
                      nom: true,
                      prenom: true,
                      email_institutionnel: true,
                      role: true,
                    },
                  },
                },
                orderBy: [{ cree_le: "asc" }, { id: "asc" }],
              },
            },
            orderBy: [{ cree_le: "asc" }, { id: "asc" }],
          },
        },
      });
    });

    if (!created) {
      throw new AppError("Creation du ticket support impossible.", 500);
    }

    filesToCleanup.length = 0;
    return serializeSupportTicketDetail(created);
  } catch (error) {
    await Promise.all(filesToCleanup.map((filePath) => cleanupStoredFile(filePath)));
    throw error;
  }
}

async function listMyTickets(requesterId, requesterRole, query = {}) {
  ensureRoleCanUseSupport(requesterRole);

  const { page, limit, skip, take } = getPagination(query.page, query.limit);
  const where = applySupportTicketFilters(query, { onlyRequesterId: requesterId });

  const [total, tickets] = await prisma.$transaction([
    prisma.support_tickets.count({ where }),
    prisma.support_tickets.findMany({
      where,
      include: buildSupportTicketInclude(),
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: tickets.map(serializeSupportTicketSummary),
    meta: buildMeta(total, page, limit),
  };
}

async function listAdminTickets(adminUserId, query = {}) {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);
  const where = applySupportTicketFilters(query, {
    assignation: query.assignation || "all",
    adminUserId,
  });

  const [total, tickets] = await prisma.$transaction([
    prisma.support_tickets.count({ where }),
    prisma.support_tickets.findMany({
      where,
      include: buildSupportTicketInclude(),
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: tickets.map(serializeSupportTicketSummary),
    meta: buildMeta(total, page, limit),
  };
}

function buildSupportTicketDetailInclude() {
  return {
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
    support_pieces_jointes: {
      include: {
        uploader: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email_institutionnel: true,
            role: true,
          },
        },
      },
      orderBy: [{ cree_le: "asc" }, { id: "asc" }],
    },
    support_reponses: {
      include: {
        auteur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email_institutionnel: true,
            role: true,
          },
        },
        support_pieces_jointes: {
          include: {
            uploader: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                email_institutionnel: true,
                role: true,
              },
            },
          },
          orderBy: [{ cree_le: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ cree_le: "asc" }, { id: "asc" }],
    },
  };
}

async function getMyTicketDetail(requesterId, requesterRole, ticketId) {
  ensureRoleCanUseSupport(requesterRole);

  const ticket = await prisma.support_tickets.findUnique({
    where: { id: toBigInt(ticketId) },
    include: buildSupportTicketDetailInclude(),
  });

  if (!ticket) {
    throw new AppError("Ticket support introuvable.", 404);
  }

  if (ticket.demandeur_id !== requesterId && !isAdminRole(requesterRole)) {
    throw new AppError("Acces interdit a ce ticket support.", 403);
  }

  return serializeSupportTicketDetail(ticket, {
    includeInternalNotes: isAdminRole(requesterRole),
  });
}

async function getAdminTicketDetail(ticketId) {
  const ticket = await prisma.support_tickets.findUnique({
    where: { id: toBigInt(ticketId) },
    include: buildSupportTicketDetailInclude(),
  });

  if (!ticket) {
    throw new AppError("Ticket support introuvable.", 404);
  }

  return serializeSupportTicketDetail(ticket, { includeInternalNotes: true });
}

async function assignTicket(adminUserId, ticketId, payload = {}) {
  const current = await ensureTicketExists(ticketId);

  const targetAdminId = payload.adminId || adminUserId;
  await ensureAdminCanBeAssigned(targetAdminId);

  const now = new Date();
  const nextStatus = current.statut === SUPPORT_TICKET_STATUS.OPEN
    ? SUPPORT_TICKET_STATUS.IN_PROGRESS
    : current.statut;

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.support_tickets.update({
      where: { id: toBigInt(ticketId) },
      data: {
        admin_assigne_id: targetAdminId,
        statut: nextStatus,
        modifie_le: now,
      },
      include: buildSupportTicketDetailInclude(),
    });

    await createNotifications(
      tx,
      [ticket.demandeur_id],
      {
        typeNotification: "SUPPORT_TICKET_ASSIGNE",
        titre: "Ticket support pris en charge",
          message: `Le ticket #${toNumber(ticket.id)} a ete pris en charge par l'administration technique.`,
        lienDirect: `/dashboard/support?ticketId=${toNumber(ticket.id)}`,
      },
      "support",
    );

    return ticket;
  });

  return serializeSupportTicketDetail(updated, { includeInternalNotes: true });
}

function buildStatusUpdateData(currentStatus, nextStatus) {
  const now = new Date();

  if (nextStatus === SUPPORT_TICKET_STATUS.RESOLVED) {
    return {
      statut: nextStatus,
      resolu_le: now,
      ferme_le: null,
      modifie_le: now,
    };
  }

  if (nextStatus === SUPPORT_TICKET_STATUS.CLOSED) {
    return {
      statut: nextStatus,
      ferme_le: now,
      resolu_le: currentStatus === SUPPORT_TICKET_STATUS.RESOLVED ? now : null,
      modifie_le: now,
    };
  }

  if (nextStatus === SUPPORT_TICKET_STATUS.OPEN) {
    return {
      statut: nextStatus,
      resolu_le: null,
      ferme_le: null,
      modifie_le: now,
    };
  }

  return {
    statut: nextStatus,
    modifie_le: now,
  };
}

function notificationTypeForStatus(status) {
  if (status === SUPPORT_TICKET_STATUS.RESOLVED) {
    return "SUPPORT_TICKET_RESOLU";
  }

  if (status === SUPPORT_TICKET_STATUS.CLOSED) {
    return "SUPPORT_TICKET_FERME";
  }

  if (status === SUPPORT_TICKET_STATUS.OPEN) {
    return "SUPPORT_TICKET_REOUVERT";
  }

  return "SUPPORT_TICKET_STATUT_MODIFIE";
}

async function changeTicketStatus(adminUserId, ticketId, payload) {
  const current = await ensureTicketExists(ticketId);
  const nextStatus = payload.statut;

  const data = buildStatusUpdateData(current.statut, nextStatus);
  if (nextStatus === SUPPORT_TICKET_STATUS.IN_PROGRESS && !current.admin_assigne_id) {
    data.admin_assigne_id = adminUserId;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.support_tickets.update({
      where: { id: toBigInt(ticketId) },
      data,
      include: buildSupportTicketDetailInclude(),
    });

    await createNotifications(
      tx,
      [ticket.demandeur_id],
      {
        typeNotification: notificationTypeForStatus(nextStatus),
        titre: "Mise a jour ticket support",
        message: `Le ticket #${toNumber(ticket.id)} est maintenant ${nextStatus}.`,
        lienDirect: `/dashboard/support?ticketId=${toNumber(ticket.id)}`,
      },
      "support",
    );

    return ticket;
  });

  return serializeSupportTicketDetail(updated, { includeInternalNotes: true });
}

async function addReplyToMyTicket(requesterId, requesterRole, ticketId, payload, attachmentFile) {
  ensureRoleCanUseSupport(requesterRole);

  const stagedAttachment = await stageSupportAttachment(attachmentFile);
  const filesToCleanup = [];
  if (stagedAttachment?.storedPath) {
    filesToCleanup.push(stagedAttachment.storedPath);
  }

  try {
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const current = await tx.support_tickets.findUnique({
        where: { id: toBigInt(ticketId) },
      });

      if (!current) {
        throw new AppError("Ticket support introuvable.", 404);
      }

      ensureTicketOwnership(current, requesterId);

      const message = (payload.message || "").trim();
      if (!message && !stagedAttachment) {
        throw new AppError("La reponse doit contenir un message ou une piece jointe.", 400);
      }

      const shouldReopen =
        Boolean(payload.rouvrirTicket) &&
        [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED].includes(current.statut);

      if (shouldReopen) {
        await tx.support_tickets.update({
          where: { id: current.id },
          data: {
            statut: SUPPORT_TICKET_STATUS.OPEN,
            resolu_le: null,
            ferme_le: null,
            modifie_le: new Date(),
          },
        });
      }

      const reply = await tx.support_reponses.create({
        data: {
          ticket_id: current.id,
          auteur_id: requesterId,
          message,
          est_note_interne: false,
        },
      });

      if (stagedAttachment) {
        await tx.support_pieces_jointes.create({
          data: {
            ticket_id: current.id,
            reponse_id: reply.id,
            nom_fichier: stagedAttachment.fileName,
            chemin_fichier: stagedAttachment.storedPath,
            type_mime: stagedAttachment.mimeType,
            taille_octets: stagedAttachment.size,
            ajoute_par: requesterId,
          },
        });
      }

      const adminRecipients = current.admin_assigne_id
        ? [current.admin_assigne_id]
        : await listActiveAdminIds(tx);

      await createNotifications(
        tx,
        adminRecipients,
        {
          typeNotification: "SUPPORT_TICKET_REPONSE",
          titre: "Nouvelle reponse ticket support",
          message: `Le ticket #${toNumber(current.id)} contient une nouvelle reponse demandeur.`,
          lienDirect: `/dashboard/support?ticketId=${toNumber(current.id)}`,
        },
        "support",
      );

      if (shouldReopen) {
        await createNotifications(
          tx,
          adminRecipients,
          {
            typeNotification: "SUPPORT_TICKET_REOUVERT",
            titre: "Ticket support rouvert",
            message: `Le ticket #${toNumber(current.id)} a ete rouvert par le demandeur.`,
            lienDirect: `/dashboard/support?ticketId=${toNumber(current.id)}`,
          },
          "support",
        );
      }

      return tx.support_tickets.findUnique({
        where: { id: current.id },
        include: buildSupportTicketDetailInclude(),
      });
    });

    filesToCleanup.length = 0;

    if (!updatedTicket) {
      throw new AppError("Mise a jour ticket support impossible.", 500);
    }

    return serializeSupportTicketDetail(updatedTicket, {
      includeInternalNotes: isAdminRole(requesterRole),
    });
  } catch (error) {
    await Promise.all(filesToCleanup.map((filePath) => cleanupStoredFile(filePath)));
    throw error;
  }
}

async function addReplyToAdminTicket(adminUserId, ticketId, payload, attachmentFile) {
  const stagedAttachment = await stageSupportAttachment(attachmentFile);
  const filesToCleanup = [];
  if (stagedAttachment?.storedPath) {
    filesToCleanup.push(stagedAttachment.storedPath);
  }

  try {
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const current = await tx.support_tickets.findUnique({
        where: { id: toBigInt(ticketId) },
      });

      if (!current) {
        throw new AppError("Ticket support introuvable.", 404);
      }

      const message = (payload.message || "").trim();
      if (!message && !stagedAttachment) {
        throw new AppError("La reponse doit contenir un message ou une piece jointe.", 400);
      }

      const isInternalNote = Boolean(payload.estNoteInterne);

      const reply = await tx.support_reponses.create({
        data: {
          ticket_id: current.id,
          auteur_id: adminUserId,
          message,
          est_note_interne: isInternalNote,
        },
      });

      if (stagedAttachment) {
        await tx.support_pieces_jointes.create({
          data: {
            ticket_id: current.id,
            reponse_id: reply.id,
            nom_fichier: stagedAttachment.fileName,
            chemin_fichier: stagedAttachment.storedPath,
            type_mime: stagedAttachment.mimeType,
            taille_octets: stagedAttachment.size,
            ajoute_par: adminUserId,
          },
        });
      }

      if (!current.admin_assigne_id) {
        await tx.support_tickets.update({
          where: { id: current.id },
          data: {
            admin_assigne_id: adminUserId,
            statut:
              current.statut === SUPPORT_TICKET_STATUS.OPEN
                ? SUPPORT_TICKET_STATUS.IN_PROGRESS
                : current.statut,
            modifie_le: new Date(),
          },
        });
      }

      if (!isInternalNote) {
        await createNotifications(
          tx,
          [current.demandeur_id],
          {
            typeNotification: "SUPPORT_TICKET_REPONSE",
            titre: "Reponse administrateur sur ticket support",
            message: `Le ticket #${toNumber(current.id)} contient une nouvelle reponse administrateur.`,
            lienDirect: `/dashboard/support?ticketId=${toNumber(current.id)}`,
          },
          "support",
        );
      }

      return tx.support_tickets.findUnique({
        where: { id: current.id },
        include: buildSupportTicketDetailInclude(),
      });
    });

    filesToCleanup.length = 0;

    if (!updatedTicket) {
      throw new AppError("Mise a jour ticket support impossible.", 500);
    }

    return serializeSupportTicketDetail(updatedTicket, { includeInternalNotes: true });
  } catch (error) {
    await Promise.all(filesToCleanup.map((filePath) => cleanupStoredFile(filePath)));
    throw error;
  }
}

async function addTicketAttachment(userId, userRole, ticketId, attachmentFile) {
  ensureRoleCanUseSupport(userRole);

  if (!attachmentFile) {
    throw new AppError("Aucun fichier a televerser.", 400);
  }

  const stagedAttachment = await stageSupportAttachment(attachmentFile);
  const filesToCleanup = [];
  if (stagedAttachment?.storedPath) {
    filesToCleanup.push(stagedAttachment.storedPath);
  }

  try {
    const attachment = await prisma.$transaction(async (tx) => {
      const ticket = await tx.support_tickets.findUnique({
        where: { id: toBigInt(ticketId) },
      });

      if (!ticket) {
        throw new AppError("Ticket support introuvable.", 404);
      }

      if (!isAdminRole(userRole)) {
        ensureTicketOwnership(ticket, userId);
      }

      return tx.support_pieces_jointes.create({
        data: {
          ticket_id: ticket.id,
          nom_fichier: stagedAttachment.fileName,
          chemin_fichier: stagedAttachment.storedPath,
          type_mime: stagedAttachment.mimeType,
          taille_octets: stagedAttachment.size,
          ajoute_par: userId,
        },
        include: {
          uploader: {
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
    });

    filesToCleanup.length = 0;
    return serializeSupportAttachment(attachment);
  } catch (error) {
    await Promise.all(filesToCleanup.map((filePath) => cleanupStoredFile(filePath)));
    throw error;
  }
}

async function getSupportAttachmentFile(userId, userRole, attachmentId) {
  ensureRoleCanUseSupport(userRole);

  const attachment = await prisma.support_pieces_jointes.findUnique({
    where: { id: toBigInt(attachmentId) },
    include: {
      ticket: {
        select: {
          id: true,
          demandeur_id: true,
        },
      },
    },
  });

  if (!attachment || !attachment.ticket) {
    throw new AppError("Piece jointe support introuvable.", 404);
  }

  if (!isAdminRole(userRole) && attachment.ticket.demandeur_id !== userId) {
    throw new AppError("Acces interdit a cette piece jointe support.", 403);
  }

  try {
    await fs.access(attachment.chemin_fichier);
  } catch (_error) {
    throw new AppError("Le fichier support est introuvable sur le serveur.", 404);
  }

  return {
    path: attachment.chemin_fichier,
    mimeType: attachment.type_mime || "application/octet-stream",
    downloadName: buildAttachmentDownloadName(attachment),
  };
}

async function getAdminStats() {
  const grouped = await prisma.support_tickets.groupBy({
    by: ["statut"],
    _count: {
      _all: true,
    },
  });

  const counts = new Map(grouped.map((item) => [item.statut, Number(item._count?._all || 0)]));

  const open = counts.get(SUPPORT_TICKET_STATUS.OPEN) || 0;
  const inProgress = counts.get(SUPPORT_TICKET_STATUS.IN_PROGRESS) || 0;
  const resolved = counts.get(SUPPORT_TICKET_STATUS.RESOLVED) || 0;
  const closed = counts.get(SUPPORT_TICKET_STATUS.CLOSED) || 0;

  return {
    open,
    inProgress,
    resolved,
    closed,
    total: open + inProgress + resolved + closed,
  };
}

module.exports = {
  createTicket,
  listMyTickets,
  getMyTicketDetail,
  addReplyToMyTicket,
  addTicketAttachment,
  getSupportAttachmentFile,
  listAdminTickets,
  getAdminTicketDetail,
  assignTicket,
  changeTicketStatus,
  addReplyToAdminTicket,
  getAdminStats,
};
