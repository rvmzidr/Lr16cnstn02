const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const { ACCOUNT_STATUS, ROLES } = require("../config/constants");
const {
  PURCHASE_ATTACHMENT_ENTITY,
  PURCHASE_ATTACHMENT_MIME_TYPES,
  PURCHASE_ATTACHMENT_STORAGE_DIR,
} = require("../config/purchase-files");
const {
  MESSAGE_ATTACHMENT_ENTITY,
  MESSAGE_ATTACHMENT_FIELD,
  MESSAGE_ATTACHMENT_MIME_TYPES,
  MESSAGE_ATTACHMENT_STORAGE_DIR,
} = require("../config/message-files");
const { toBigInt, toNumber } = require("../utils/bigint");
const { buildMeta, getPagination } = require("../utils/pagination");
const AppError = require("../utils/app-error");
const { cleanupStoredFile } = require("./member-profile.service");

const NOTIFICATION_PREFERENCE_BY_CATEGORY = {
  messages: "notif_messages",
  projets: "notif_projets",
  demandes: "notif_demandes_achat",
  articles: "notif_articles",
  comptes: "notif_comptes",
  livraisons: "notif_livraisons",
};

const GROUP_CREATOR_ROLES = new Set([
  ROLES.CHEF_LABO,
  ROLES.ADMINISTRATEUR,
]);

function serializeUtilisateurResume(utilisateur) {
  if (!utilisateur) {
    return null;
  }

  return {
    id: utilisateur.id,
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    emailInstitutionnel: utilisateur.email_institutionnel,
    role: utilisateur.role,
    statut: utilisateur.statut,
    actif: utilisateur.actif,
  };
}

async function fetchUsersMapByIds(userIds, client = prisma) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const utilisateurs = await client.utilisateurs.findMany({
    where: {
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
      statut: true,
      actif: true,
    },
  });

  const map = new Map();
  for (const utilisateur of utilisateurs) {
    map.set(utilisateur.id, serializeUtilisateurResume(utilisateur));
  }

  return map;
}

async function createNotifications(
  tx,
  recipients,
  payload,
  category = "messages",
) {
  const ids = [...new Set((recipients || []).filter(Boolean))];

  if (!ids.length) {
    return;
  }

  const preferences = await tx.preferences_notification.findMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  const prefsByUserId = new Map(
    preferences.map((item) => [item.utilisateur_id, item]),
  );
  const preferenceKey = NOTIFICATION_PREFERENCE_BY_CATEGORY[category];

  const data = ids
    .filter((userId) => {
      const preference = prefsByUserId.get(userId);
      if (!preference) {
        return true;
      }

      if (preference.canal_application === false) {
        return false;
      }

      if (preferenceKey && preference[preferenceKey] === false) {
        return false;
      }

      return true;
    })
    .map((userId) => ({
      utilisateur_id: userId,
      type_notification: payload.typeNotification,
      titre: payload.titre,
      message: payload.message,
      projet_id: payload.projetId ? toBigInt(payload.projetId) : null,
      demande_achat_id: payload.demandeAchatId
        ? toBigInt(payload.demandeAchatId)
        : null,
      article_id: payload.articleId ? toBigInt(payload.articleId) : null,
      conversation_id: payload.conversationId
        ? toBigInt(payload.conversationId)
        : null,
      message_id: payload.messageId ? toBigInt(payload.messageId) : null,
      lien_direct: payload.lienDirect || null,
    }));

  if (data.length === 0) {
    return;
  }

  await tx.notifications.createMany({ data });
}

async function ensureNotificationPreferences(userId) {
  const existing = await prisma.preferences_notification.findUnique({
    where: { utilisateur_id: userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.preferences_notification.create({
    data: {
      utilisateur_id: userId,
    },
  });
}

async function getConversationForUserOrThrow(
  userId,
  conversationId,
  options = {},
  client = prisma,
) {
  const { includeLeft = false } = options;

  const participant = await client.participants_conversation.findFirst({
    where: {
      conversation_id: toBigInt(conversationId),
      utilisateur_id: userId,
      ...(includeLeft ? {} : { quitte_le: null }),
    },
  });

  if (!participant) {
    throw new AppError("Conversation introuvable pour cet utilisateur.", 404);
  }

  const conversation = await client.conversations.findUnique({
    where: { id: toBigInt(conversationId) },
  });

  if (!conversation) {
    throw new AppError("Conversation introuvable.", 404);
  }

  return conversation;
}

async function getDirectConversationByUsers(client, userAId, userBId) {
  const candidates = await client.conversations.findMany({
    where: {
      est_groupe: false,
      participants_conversation: {
        some: {
          utilisateur_id: userAId,
        },
      },
      AND: [
        {
          participants_conversation: {
            some: {
              utilisateur_id: userBId,
            },
          },
        },
      ],
    },
    include: {
      participants_conversation: {
        select: {
          utilisateur_id: true,
          quitte_le: true,
        },
      },
    },
    orderBy: [{ modifie_le: "desc" }, { id: "desc" }],
  });

  return (
    candidates.find((conversation) => {
      const participantIds = [
        ...new Set(
          conversation.participants_conversation.map(
            (participant) => participant.utilisateur_id,
          ),
        ),
      ];

      return (
        participantIds.length === 2 &&
        participantIds.includes(userAId) &&
        participantIds.includes(userBId)
      );
    }) || null
  );
}

function serializeMessageAttachment(attachment) {
  if (!attachment) {
    return null;
  }

  return {
    id: toNumber(attachment.id),
    nomFichier: attachment.nom_fichier,
    typeMime: attachment.type_mime,
    tailleOctets:
      attachment.taille_octets === null || attachment.taille_octets === undefined
        ? null
        : Number(attachment.taille_octets),
  };
}

function serializeMessage(message, sender, lecture, attachment = null) {
  return {
    id: toNumber(message.id),
    conversationId: toNumber(message.conversation_id),
    contenu: message.contenu,
    creeLe: message.cree_le,
    expediteur: sender || null,
    lu: lecture?.lu || false,
    luLe: lecture?.lu_le || null,
    pieceJointe: attachment,
  };
}

function buildMessageAttachmentFileName(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${extension || ".bin"}`;
}

async function stageMessageAttachment(file) {
  if (!file) {
    return null;
  }

  if (!MESSAGE_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      "La piece jointe de message doit etre au format PDF, JPG, PNG, DOC, DOCX ou XLSX.",
      400,
    );
  }

  await fs.mkdir(MESSAGE_ATTACHMENT_STORAGE_DIR, { recursive: true });
  const nomStocke = buildMessageAttachmentFileName(file);
  const chemin = path.join(MESSAGE_ATTACHMENT_STORAGE_DIR, nomStocke);
  await fs.writeFile(chemin, file.buffer);

  return {
    nomFichier: file.originalname,
    chemin,
    typeMime: file.mimetype,
    tailleOctets: BigInt(file.size),
  };
}

async function resolveMessageAttachmentsByMessageIds(messageIds, client = prisma) {
  const uniqueIds = [...new Set((messageIds || []).filter(Boolean))].map((id) =>
    toBigInt(id),
  );

  if (!uniqueIds.length) {
    return new Map();
  }

  const attachments = await client.pieces_jointes.findMany({
    where: {
      type_entite: MESSAGE_ATTACHMENT_ENTITY,
      entite_id: { in: uniqueIds },
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  const map = new Map();
  for (const attachment of attachments) {
    const key = String(attachment.entite_id);
    if (!map.has(key)) {
      map.set(key, attachment);
    }
  }

  return map;
}

function ensureMessageHasPayload(payload, stagedAttachment) {
  const content = payload?.contenu?.trim() || "";
  if (!content && !stagedAttachment) {
    throw new AppError(
      "Le message doit contenir un texte ou une piece jointe.",
      400,
    );
  }

  return content;
}

function canManageGroupMembership(conversation, actorUserId, actorRole) {
  if (!conversation.est_groupe) {
    return false;
  }

  if (GROUP_CREATOR_ROLES.has(actorRole)) {
    return true;
  }

  return conversation.cree_par === actorUserId;
}

async function createMessageRecord(tx, options) {
  const {
    conversation,
    senderId,
    participantIds,
    payload,
    stagedAttachment,
  } = options;

  const contenu = ensureMessageHasPayload(payload, stagedAttachment);

  const message = await tx.messages.create({
    data: {
      conversation_id: conversation.id,
      expediteur_id: senderId,
      contenu,
    },
  });

  await tx.lectures_message.createMany({
    data: participantIds.map((participantId) => ({
      message_id: message.id,
      utilisateur_id: participantId,
      lu: participantId === senderId,
      lu_le: participantId === senderId ? new Date() : null,
    })),
    skipDuplicates: true,
  });

  let attachment = null;
  if (stagedAttachment) {
    attachment = await tx.pieces_jointes.create({
      data: {
        type_entite: MESSAGE_ATTACHMENT_ENTITY,
        entite_id: message.id,
        nom_fichier: stagedAttachment.nomFichier,
        chemin_fichier: stagedAttachment.chemin,
        type_mime: stagedAttachment.typeMime,
        taille_octets: stagedAttachment.tailleOctets,
        ajoute_par: senderId,
      },
    });
  }

  await tx.conversations.update({
    where: { id: conversation.id },
    data: {
      modifie_le: new Date(),
    },
  });

  await createNotifications(
    tx,
    participantIds.filter((participantId) => participantId !== senderId),
    {
      typeNotification: "NOUVEAU_MESSAGE",
      titre: "Nouveau message",
      message: conversation.est_groupe
        ? `Nouveau message dans le groupe \"${conversation.sujet || "Groupe"}\".`
        : "Vous avez recu un nouveau message.",
      conversationId: conversation.id,
      messageId: message.id,
      lienDirect: `/dashboard/messages?conversationId=${toNumber(conversation.id)}`,
    },
    "messages",
  );

  return {
    message,
    attachment,
  };
}

async function listConversations(userId) {
  const participations = await prisma.participants_conversation.findMany({
    where: {
      utilisateur_id: userId,
      quitte_le: null,
    },
    select: {
      conversation_id: true,
    },
  });

  const conversationIds = participations.map((item) => item.conversation_id);

  if (!conversationIds.length) {
    return {
      elements: [],
    };
  }

  const [conversations, participants, unreadLectures] = await Promise.all([
    prisma.conversations.findMany({
      where: {
        id: { in: conversationIds },
      },
      orderBy: [{ modifie_le: "desc" }, { id: "desc" }],
    }),
    prisma.participants_conversation.findMany({
      where: {
        conversation_id: { in: conversationIds },
        quitte_le: null,
      },
      select: {
        conversation_id: true,
        utilisateur_id: true,
      },
    }),
    prisma.lectures_message.findMany({
      where: {
        utilisateur_id: userId,
        lu: false,
        messages: {
          conversation_id: { in: conversationIds },
        },
      },
      select: {
        messages: {
          select: {
            conversation_id: true,
          },
        },
      },
    }),
  ]);

  const usersMap = await fetchUsersMapByIds(
    participants.map((item) => item.utilisateur_id),
  );

  const participantsByConversation = new Map();
  for (const participant of participants) {
    const key = String(participant.conversation_id);
    if (!participantsByConversation.has(key)) {
      participantsByConversation.set(key, []);
    }

    participantsByConversation
      .get(key)
      .push(usersMap.get(participant.utilisateur_id) || null);
  }

  const unreadCountByConversation = new Map();
  for (const lecture of unreadLectures) {
    const key = String(lecture.messages.conversation_id);
    unreadCountByConversation.set(key, (unreadCountByConversation.get(key) || 0) + 1);
  }

  const latestMessages = await Promise.all(
    conversations.map((conversation) =>
      prisma.messages.findFirst({
        where: { conversation_id: conversation.id },
        orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      }),
    ),
  );

  const sendersMap = await fetchUsersMapByIds(
    latestMessages.filter(Boolean).map((message) => message.expediteur_id),
  );
  const attachmentsByMessage = await resolveMessageAttachmentsByMessageIds(
    latestMessages.filter(Boolean).map((message) => message.id),
  );

  return {
    elements: conversations.map((conversation, index) => {
      const key = String(conversation.id);
      const latest = latestMessages[index];
      return {
        id: toNumber(conversation.id),
        sujet: conversation.sujet,
        estGroupe: conversation.est_groupe,
        creePar: conversation.cree_par,
        creeLe: conversation.cree_le,
        modifieLe: conversation.modifie_le,
        participants: participantsByConversation.get(key) || [],
        unreadCount: unreadCountByConversation.get(key) || 0,
        dernierMessage: latest
          ? {
              id: toNumber(latest.id),
              contenu: latest.contenu,
              creeLe: latest.cree_le,
              expediteur: sendersMap.get(latest.expediteur_id) || null,
              pieceJointe: serializeMessageAttachment(
                attachmentsByMessage.get(String(latest.id)),
              ),
            }
          : null,
      };
    }),
  };
}

async function getConversationDetail(userId, conversationId) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  await prisma.lectures_message.updateMany({
    where: {
      utilisateur_id: userId,
      lu: false,
      messages: {
        conversation_id: conversation.id,
      },
    },
    data: {
      lu: true,
      lu_le: new Date(),
    },
  });

  const [participants, messages] = await Promise.all([
    prisma.participants_conversation.findMany({
      where: {
        conversation_id: conversation.id,
        quitte_le: null,
      },
      select: {
        utilisateur_id: true,
        rejoint_le: true,
      },
      orderBy: [{ rejoint_le: "asc" }],
    }),
    prisma.messages.findMany({
      where: {
        conversation_id: conversation.id,
      },
      include: {
        lectures_message: {
          where: {
            utilisateur_id: userId,
          },
          select: {
            lu: true,
            lu_le: true,
          },
        },
      },
      orderBy: [{ cree_le: "asc" }, { id: "asc" }],
    }),
  ]);

  const usersMap = await fetchUsersMapByIds([
    ...participants.map((item) => item.utilisateur_id),
    ...messages.map((item) => item.expediteur_id),
  ]);
  const attachmentsByMessage = await resolveMessageAttachmentsByMessageIds(
    messages.map((message) => message.id),
  );

  return {
    conversation: {
      id: toNumber(conversation.id),
      sujet: conversation.sujet,
      estGroupe: conversation.est_groupe,
      creePar: conversation.cree_par,
      creeLe: conversation.cree_le,
      modifieLe: conversation.modifie_le,
    },
    participants: participants.map((participant) => ({
      utilisateur: usersMap.get(participant.utilisateur_id) || null,
      rejointLe: participant.rejoint_le,
    })),
    messages: messages.map((message) =>
      serializeMessage(
        message,
        usersMap.get(message.expediteur_id) || null,
        message.lectures_message[0],
        serializeMessageAttachment(attachmentsByMessage.get(String(message.id))),
      ),
    ),
  };
}

async function createConversation(userId, role, payload, attachmentFile) {
  const participantIds = [...new Set(payload.participantIds || [])].filter(
    (id) => id !== userId,
  );

  if (!participantIds.length) {
    throw new AppError("Au moins un participant distinct est requis.", 400);
  }

  const participants = await prisma.utilisateurs.findMany({
    where: {
      id: { in: participantIds },
      statut: ACCOUNT_STATUS.ACTIF,
      actif: true,
      role: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (participants.length !== participantIds.length) {
    throw new AppError("Un ou plusieurs participants sont invalides.", 400);
  }

  if (participantIds.length > 1) {
    return createGroupConversation(userId, role, payload, attachmentFile);
  }

  const directRecipientId = participantIds[0];
  const stagedAttachment = await stageMessageAttachment(attachmentFile);

  try {
    const conversationId = await prisma.$transaction(async (tx) => {
      let conversation = await getDirectConversationByUsers(
        tx,
        userId,
        directRecipientId,
      );

      if (!conversation) {
        conversation = await tx.conversations.create({
          data: {
            sujet: payload.sujet || null,
            cree_par: userId,
            est_groupe: false,
          },
        });

        await tx.participants_conversation.createMany({
          data: [
            { conversation_id: conversation.id, utilisateur_id: userId },
            {
              conversation_id: conversation.id,
              utilisateur_id: directRecipientId,
            },
          ],
          skipDuplicates: true,
        });
      } else {
        await tx.participants_conversation.updateMany({
          where: {
            conversation_id: conversation.id,
            utilisateur_id: {
              in: [userId, directRecipientId],
            },
          },
          data: {
            quitte_le: null,
          },
        });
      }

      if ((payload.contenu && payload.contenu.trim()) || stagedAttachment) {
        await createMessageRecord(tx, {
          conversation,
          senderId: userId,
          participantIds: [userId, directRecipientId],
          payload,
          stagedAttachment,
        });
      }

      return conversation.id;
    });

    return getConversationDetail(userId, conversationId);
  } catch (error) {
    if (stagedAttachment?.chemin) {
      await cleanupStoredFile(stagedAttachment.chemin);
    }
    throw error;
  }
}

async function sendMessage(userId, conversationId, payload) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.messages.create({
      data: {
        conversation_id: conversation.id,
        expediteur_id: userId,
        contenu: payload.contenu,
      },
    });

    const participants = await tx.participants_conversation.findMany({
      where: {
        conversation_id: conversation.id,
        quitte_le: null,
      },
      select: {
        utilisateur_id: true,
      },
    });

    const participantIds = participants.map((item) => item.utilisateur_id);

    await tx.lectures_message.createMany({
      data: participantIds.map((participantId) => ({
        message_id: created.id,
        utilisateur_id: participantId,
        lu: participantId === userId,
        lu_le: participantId === userId ? new Date() : null,
      })),
      skipDuplicates: true,
    });

    await tx.conversations.update({
      where: { id: conversation.id },
      data: {
        modifie_le: new Date(),
      },
    });

    await createNotifications(
      tx,
      participantIds.filter((participantId) => participantId !== userId),
      {
        typeNotification: "NOUVEAU_MESSAGE",
        titre: "Nouveau message",
        message: "Vous avez recu un nouveau message.",
        conversationId: conversation.id,
        messageId: created.id,
        lienDirect: `/dashboard/messages?conversationId=${toNumber(
          conversation.id,
        )}`,
      },
      "messages",
    );

    return created;
  });

  const senderMap = await fetchUsersMapByIds([userId]);

  return serializeMessage(
    message,
    senderMap.get(userId) || null,
    {
      lu: true,
      lu_le: new Date(),
    },
  );
}

async function markMessageAsRead(userId, messageId) {
  const message = await prisma.messages.findUnique({
    where: {
      id: toBigInt(messageId),
    },
    select: {
      id: true,
      conversation_id: true,
    },
  });

  if (!message) {
    throw new AppError("Message introuvable.", 404);
  }

  await getConversationForUserOrThrow(userId, message.conversation_id);

  await prisma.lectures_message.upsert({
    where: {
      message_id_utilisateur_id: {
        message_id: message.id,
        utilisateur_id: userId,
      },
    },
    update: {
      lu: true,
      lu_le: new Date(),
    },
    create: {
      message_id: message.id,
      utilisateur_id: userId,
      lu: true,
      lu_le: new Date(),
    },
  });

  return {
    messageId: toNumber(message.id),
    lu: true,
  };
}

async function getProjectAccessCondition(userId, role) {
  if ([ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(role)) {
    return {};
  }

  return {
    OR: [
      { cree_par: userId },
      {
        membres_projet: {
          some: {
            utilisateur_id: userId,
          },
        },
      },
    ],
  };
}

function serializeProject(project, members, teams, usersMap) {
  return {
    id: toNumber(project.id),
    titre: project.titre,
    description: project.description,
    objectifs: project.objectifs,
    dateDebut: project.date_debut,
    dateFin: project.date_fin,
    statut: project.statut,
    archive: project.archive,
    creeLe: project.cree_le,
    modifieLe: project.modifie_le,
    createur: usersMap.get(project.cree_par) || null,
    equipes: teams.map((team) => ({
      id: toNumber(team.equipe_recherche_id),
    })),
    membres: members.map((member) => ({
      utilisateur: usersMap.get(member.utilisateur_id) || null,
      roleDansProjet: member.role_dans_projet,
      ajouteLe: member.ajoute_le,
    })),
  };
}

async function listProjects(userId, role, filters) {
  const { page, limit, skip, take } = getPagination(filters.page, filters.limit);
  const accessWhere = await getProjectAccessCondition(userId, role);
  const conditions = [accessWhere];

  if (filters.q) {
    conditions.push({
      OR: [
        { titre: { contains: filters.q } },
        { description: { contains: filters.q } },
        { objectifs: { contains: filters.q } },
      ],
    });
  }

  if (filters.archive !== undefined) {
    conditions.push({ archive: Boolean(filters.archive) });
  }

  if (filters.statut) {
    conditions.push({ statut: filters.statut });
  }

  const where = {
    AND: conditions,
  };

  const [total, projects] = await prisma.$transaction([
    prisma.projets.count({ where }),
    prisma.projets.findMany({
      where,
      orderBy: [{ modifie_le: "desc" }, { cree_le: "desc" }],
      skip,
      take,
    }),
  ]);

  const projectIds = projects.map((project) => project.id);
  const [members, teams] = await Promise.all([
    projectIds.length
      ? prisma.membres_projet.findMany({
          where: {
            projet_id: { in: projectIds },
          },
        })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.equipes_projet.findMany({
          where: {
            projet_id: { in: projectIds },
          },
        })
      : Promise.resolve([]),
  ]);

  const usersMap = await fetchUsersMapByIds([
    ...projects.map((project) => project.cree_par),
    ...members.map((member) => member.utilisateur_id),
  ]);

  const membersByProject = new Map();
  for (const item of members) {
    const key = String(item.projet_id);
    if (!membersByProject.has(key)) {
      membersByProject.set(key, []);
    }
    membersByProject.get(key).push(item);
  }

  const teamsByProject = new Map();
  for (const item of teams) {
    const key = String(item.projet_id);
    if (!teamsByProject.has(key)) {
      teamsByProject.set(key, []);
    }
    teamsByProject.get(key).push(item);
  }

  return {
    elements: projects.map((project) =>
      serializeProject(
        project,
        membersByProject.get(String(project.id)) || [],
        teamsByProject.get(String(project.id)) || [],
        usersMap,
      ),
    ),
    meta: buildMeta(total, page, limit),
  };
}

async function getProjectById(userId, role, projectId) {
  const accessWhere = await getProjectAccessCondition(userId, role);

  const project = await prisma.projets.findFirst({
    where: {
      id: toBigInt(projectId),
      ...accessWhere,
    },
  });

  if (!project) {
    throw new AppError("Projet introuvable.", 404);
  }

  const [members, teams, usersMap] = await Promise.all([
    prisma.membres_projet.findMany({
      where: {
        projet_id: project.id,
      },
    }),
    prisma.equipes_projet.findMany({
      where: {
        projet_id: project.id,
      },
    }),
    fetchUsersMapByIds([project.cree_par]),
  ]);

  const projectUsersMap = await fetchUsersMapByIds([
    project.cree_par,
    ...members.map((member) => member.utilisateur_id),
  ]);

  return serializeProject(project, members, teams, projectUsersMap || usersMap);
}

async function createProject(userId, payload) {
  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.projets.create({
      data: {
        titre: payload.titre,
        description: payload.description,
        objectifs: payload.objectifs || null,
        date_debut: payload.dateDebut ? new Date(payload.dateDebut) : null,
        date_fin: payload.dateFin ? new Date(payload.dateFin) : null,
        statut: payload.statut || "EN_COURS",
        cree_par: userId,
      },
    });

    if (payload.equipeIds?.length) {
      await tx.equipes_projet.createMany({
        data: payload.equipeIds.map((equipeId) => ({
          projet_id: project.id,
          equipe_recherche_id: toBigInt(equipeId),
        })),
        skipDuplicates: true,
      });
    }

    if (payload.membreIds?.length) {
      await tx.membres_projet.createMany({
        data: payload.membreIds.map((memberId) => ({
          projet_id: project.id,
          utilisateur_id: memberId,
          ajoute_par: userId,
        })),
        skipDuplicates: true,
      });

      await createNotifications(
        tx,
        payload.membreIds,
        {
          typeNotification: "NOUVEAU_PROJET",
          titre: "Nouveau projet",
          message: `Vous avez ete affecte au projet \"${project.titre}\".`,
          projetId: project.id,
          lienDirect: `/dashboard/projects?projectId=${toNumber(project.id)}`,
        },
        "projets",
      );
    }

    await tx.historiques_projet.create({
      data: {
        projet_id: project.id,
        action: "CREATION_PROJET",
        description: "Projet cree.",
        effectue_par: userId,
      },
    });

    return project;
  });

  return getProjectById(userId, ROLES.CHEF_LABO, created.id);
}

async function updateProject(userId, projectId, payload) {
  const existing = await prisma.projets.findUnique({
    where: {
      id: toBigInt(projectId),
    },
  });

  if (!existing) {
    throw new AppError("Projet introuvable.", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.projets.update({
      where: {
        id: existing.id,
      },
      data: {
        titre: payload.titre ?? existing.titre,
        description: payload.description ?? existing.description,
        objectifs:
          payload.objectifs !== undefined ? payload.objectifs : existing.objectifs,
        date_debut:
          payload.dateDebut !== undefined
            ? payload.dateDebut
              ? new Date(payload.dateDebut)
              : null
            : existing.date_debut,
        date_fin:
          payload.dateFin !== undefined
            ? payload.dateFin
              ? new Date(payload.dateFin)
              : null
            : existing.date_fin,
        statut: payload.statut || existing.statut,
        archive:
          payload.archive !== undefined ? Boolean(payload.archive) : existing.archive,
        modifie_le: new Date(),
      },
    });

    if (payload.equipeIds) {
      await tx.equipes_projet.deleteMany({
        where: { projet_id: existing.id },
      });

      if (payload.equipeIds.length) {
        await tx.equipes_projet.createMany({
          data: payload.equipeIds.map((equipeId) => ({
            projet_id: existing.id,
            equipe_recherche_id: toBigInt(equipeId),
          })),
          skipDuplicates: true,
        });
      }
    }

    if (payload.membreIds) {
      await tx.membres_projet.deleteMany({
        where: { projet_id: existing.id },
      });

      if (payload.membreIds.length) {
        await tx.membres_projet.createMany({
          data: payload.membreIds.map((memberId) => ({
            projet_id: existing.id,
            utilisateur_id: memberId,
            ajoute_par: userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await tx.historiques_projet.create({
      data: {
        projet_id: existing.id,
        action: "MISE_A_JOUR_PROJET",
        description: "Projet mis a jour.",
        effectue_par: userId,
      },
    });

    const currentMembers = await tx.membres_projet.findMany({
      where: { projet_id: existing.id },
      select: {
        utilisateur_id: true,
      },
    });

    await createNotifications(
      tx,
      currentMembers.map((item) => item.utilisateur_id),
      {
        typeNotification: "PROJET_MODIFIE",
        titre: "Projet mis a jour",
        message: `Le projet \"${payload.titre || existing.titre}\" a ete mis a jour.`,
        projetId: existing.id,
        lienDirect: `/dashboard/projects?projectId=${toNumber(existing.id)}`,
      },
      "projets",
    );
  });

  return getProjectById(userId, ROLES.CHEF_LABO, existing.id);
}

async function archiveProject(userId, projectId) {
  const project = await prisma.projets.findUnique({
    where: {
      id: toBigInt(projectId),
    },
  });

  if (!project) {
    throw new AppError("Projet introuvable.", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.projets.update({
      where: { id: project.id },
      data: {
        archive: true,
        statut: "ARCHIVE",
        modifie_le: new Date(),
      },
    });

    await tx.historiques_projet.create({
      data: {
        projet_id: project.id,
        action: "ARCHIVAGE_PROJET",
        description: "Projet archive.",
        effectue_par: userId,
      },
    });
  });

  return getProjectById(userId, ROLES.CHEF_LABO, project.id);
}

async function assignProjectMember(userId, projectId, payload) {
  const project = await prisma.projets.findUnique({
    where: {
      id: toBigInt(projectId),
    },
  });

  if (!project) {
    throw new AppError("Projet introuvable.", 404);
  }

  const member = await prisma.utilisateurs.findUnique({
    where: { id: payload.utilisateurId },
    select: {
      id: true,
      statut: true,
      actif: true,
    },
  });

  if (!member || member.statut !== ACCOUNT_STATUS.ACTIF || !member.actif) {
    throw new AppError("Le membre a affecter est invalide.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.membres_projet.upsert({
      where: {
        projet_id_utilisateur_id: {
          projet_id: project.id,
          utilisateur_id: payload.utilisateurId,
        },
      },
      update: {
        role_dans_projet: payload.roleDansProjet || null,
      },
      create: {
        projet_id: project.id,
        utilisateur_id: payload.utilisateurId,
        role_dans_projet: payload.roleDansProjet || null,
        ajoute_par: userId,
      },
    });

    await tx.historiques_projet.create({
      data: {
        projet_id: project.id,
        action: "AFFECTATION_MEMBRE",
        description: `Membre ${payload.utilisateurId} affecte au projet.`,
        effectue_par: userId,
      },
    });

    await createNotifications(
      tx,
      [payload.utilisateurId],
      {
        typeNotification: "NOUVEAU_PROJET",
        titre: "Affectation projet",
        message: `Vous avez ete affecte au projet \"${project.titre}\".`,
        projetId: project.id,
        lienDirect: `/dashboard/projects?projectId=${toNumber(project.id)}`,
      },
      "projets",
    );
  });

  return getProjectById(userId, ROLES.CHEF_LABO, project.id);
}

async function removeProjectMember(userId, projectId, targetUserId) {
  const project = await prisma.projets.findUnique({
    where: {
      id: toBigInt(projectId),
    },
  });

  if (!project) {
    throw new AppError("Projet introuvable.", 404);
  }

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.membres_projet.deleteMany({
      where: {
        projet_id: project.id,
        utilisateur_id: targetUserId,
      },
    });

    if (!deleted.count) {
      throw new AppError("Membre non associe a ce projet.", 404);
    }

    await tx.historiques_projet.create({
      data: {
        projet_id: project.id,
        action: "SUPPRESSION_MEMBRE",
        description: `Membre ${targetUserId} retire du projet.`,
        effectue_par: userId,
      },
    });
  });

  return getProjectById(userId, ROLES.CHEF_LABO, project.id);
}

function buildPurchaseAttachmentFileName(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${extension || ".bin"}`;
}

async function stagePurchaseAttachment(file) {
  if (!file) {
    return null;
  }

  if (!PURCHASE_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      "La piece jointe doit etre au format PDF, JPG, PNG, DOC, DOCX ou XLSX.",
      400,
    );
  }

  await fs.mkdir(PURCHASE_ATTACHMENT_STORAGE_DIR, { recursive: true });
  const nomStocke = buildPurchaseAttachmentFileName(file);
  const chemin = path.join(PURCHASE_ATTACHMENT_STORAGE_DIR, nomStocke);
  await fs.writeFile(chemin, file.buffer);

  return {
    nomFichier: file.originalname,
    chemin,
    typeMime: file.mimetype,
    tailleOctets: BigInt(file.size),
  };
}

function serializePurchaseRequest(
  demande,
  creatorsMap,
  decidersMap,
  attachmentsByDemande,
) {
  const attachment = attachmentsByDemande.get(String(demande.id));

  return {
    id: toNumber(demande.id),
    projetId: toNumber(demande.projet_id),
    projetTitre: demande.projets?.titre || null,
    creePar: creatorsMap.get(demande.cree_par) || null,
    decideePar: demande.decidee_par
      ? decidersMap.get(demande.decidee_par) || null
      : null,
    objet: demande.objet,
    description: demande.description,
    quantite: demande.quantite,
    estimationCout:
      demande.estimation_cout === null || demande.estimation_cout === undefined
        ? null
        : Number(demande.estimation_cout),
    justificationScientifique: demande.justification_scientifique,
    statut: demande.statut,
    urgente: Boolean(demande.urgente),
    dateDecision: demande.date_decision,
    motifRejet: demande.motif_rejet,
    dateLivraison: demande.date_livraison,
    creeLe: demande.cree_le,
    modifieLe: demande.modifie_le,
    pieceJointe: attachment
      ? {
          id: toNumber(attachment.id),
          nomFichier: attachment.nom_fichier,
          typeMime: attachment.type_mime,
          tailleOctets:
            attachment.taille_octets === null ||
            attachment.taille_octets === undefined
              ? null
              : Number(attachment.taille_octets),
        }
      : null,
  };
}

function getPurchaseAccessCondition(userId, role) {
  if ([ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(role)) {
    return {};
  }

  return {
    OR: [
      { cree_par: userId },
      {
        projets: {
          is: {
            membres_projet: {
              some: {
                utilisateur_id: userId,
              },
            },
          },
        },
      },
    ],
  };
}

async function createGroupConversation(userId, role, payload, attachmentFile) {
  if (!GROUP_CREATOR_ROLES.has(role)) {
    throw new AppError(
      "Seul le Chef de laboratoire ou l'administrateur peut creer un groupe.",
      403,
    );
  }

  const participantIds = [...new Set(payload.participantIds || [])].filter(
    (id) => id !== userId,
  );

  if (participantIds.length < 2) {
    throw new AppError(
      "Un groupe doit contenir au moins deux participants en plus du createur.",
      400,
    );
  }

  const participants = await prisma.utilisateurs.findMany({
    where: {
      id: { in: participantIds },
      statut: ACCOUNT_STATUS.ACTIF,
      actif: true,
      role: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (participants.length !== participantIds.length) {
    throw new AppError("Un ou plusieurs participants sont invalides.", 400);
  }

  const stagedAttachment = await stageMessageAttachment(attachmentFile);

  try {
    const conversationId = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversations.create({
        data: {
          sujet: payload.sujet,
          cree_par: userId,
          est_groupe: true,
        },
      });

      await tx.participants_conversation.createMany({
        data: [
          { conversation_id: conversation.id, utilisateur_id: userId },
          ...participantIds.map((participantId) => ({
            conversation_id: conversation.id,
            utilisateur_id: participantId,
          })),
        ],
        skipDuplicates: true,
      });

      await createNotifications(
        tx,
        participantIds,
        {
          typeNotification: "NOUVEAU_MESSAGE",
          titre: "Invitation a un groupe",
          message: `Vous avez ete ajoute au groupe \"${payload.sujet}\".`,
          conversationId: conversation.id,
          lienDirect: `/dashboard/messages?conversationId=${toNumber(
            conversation.id,
          )}`,
        },
        "messages",
      );

      if ((payload.contenu && payload.contenu.trim()) || stagedAttachment) {
        await createMessageRecord(tx, {
          conversation,
          senderId: userId,
          participantIds: [userId, ...participantIds],
          payload,
          stagedAttachment,
        });
      }

      return conversation.id;
    });

    return getConversationDetail(userId, conversationId);
  } catch (error) {
    if (stagedAttachment?.chemin) {
      await cleanupStoredFile(stagedAttachment.chemin);
    }
    throw error;
  }
}

async function sendMessage(userId, _role, conversationId, payload, attachmentFile) {
  const conversation = await getConversationForUserOrThrow(
    userId,
    conversationId,
    { includeLeft: true },
  );
  const stagedAttachment = await stageMessageAttachment(attachmentFile);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const participants = await tx.participants_conversation.findMany({
        where: {
          conversation_id: conversation.id,
          ...(conversation.est_groupe ? { quitte_le: null } : {}),
        },
        select: {
          utilisateur_id: true,
          quitte_le: true,
        },
      });

      const participantIds = [...new Set(participants.map((item) => item.utilisateur_id))];

      if (!participantIds.includes(userId)) {
        throw new AppError("Conversation introuvable pour cet utilisateur.", 404);
      }

      if (!conversation.est_groupe) {
        await tx.participants_conversation.updateMany({
          where: {
            conversation_id: conversation.id,
            quitte_le: {
              not: null,
            },
          },
          data: {
            quitte_le: null,
          },
        });
      }

      return createMessageRecord(tx, {
        conversation,
        senderId: userId,
        participantIds,
        payload,
        stagedAttachment,
      });
    });

    const senderMap = await fetchUsersMapByIds([userId]);

    return serializeMessage(
      result.message,
      senderMap.get(userId) || null,
      {
        lu: true,
        lu_le: new Date(),
      },
      serializeMessageAttachment(result.attachment),
    );
  } catch (error) {
    if (stagedAttachment?.chemin) {
      await cleanupStoredFile(stagedAttachment.chemin);
    }
    throw error;
  }
}

async function addGroupMembers(userId, role, conversationId, payload) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  if (!conversation.est_groupe) {
    throw new AppError("Cette operation est reservee aux conversations de groupe.", 400);
  }

  if (!canManageGroupMembership(conversation, userId, role)) {
    throw new AppError("Vous n'avez pas le droit de modifier ce groupe.", 403);
  }

  const candidateIds = [...new Set(payload.participantIds || [])].filter(
    (id) => id !== userId,
  );

  if (!candidateIds.length) {
    throw new AppError("Aucun membre valide a ajouter.", 400);
  }

  const validUsers = await prisma.utilisateurs.findMany({
    where: {
      id: { in: candidateIds },
      statut: ACCOUNT_STATUS.ACTIF,
      actif: true,
      role: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (validUsers.length !== candidateIds.length) {
    throw new AppError("Un ou plusieurs participants sont invalides.", 400);
  }

  const existingRows = await prisma.participants_conversation.findMany({
    where: {
      conversation_id: conversation.id,
      utilisateur_id: { in: candidateIds },
    },
    select: {
      utilisateur_id: true,
      quitte_le: true,
    },
  });

  const existingById = new Map(
    existingRows.map((item) => [item.utilisateur_id, item]),
  );

  const usersToNotify = candidateIds.filter((candidateId) => {
    const row = existingById.get(candidateId);
    return !row || row.quitte_le !== null;
  });

  await prisma.$transaction(async (tx) => {
    for (const participantId of candidateIds) {
      await tx.participants_conversation.upsert({
        where: {
          conversation_id_utilisateur_id: {
            conversation_id: conversation.id,
            utilisateur_id: participantId,
          },
        },
        update: {
          quitte_le: null,
        },
        create: {
          conversation_id: conversation.id,
          utilisateur_id: participantId,
        },
      });
    }

    await tx.conversations.update({
      where: { id: conversation.id },
      data: {
        modifie_le: new Date(),
      },
    });

    await createNotifications(
      tx,
      usersToNotify,
      {
        typeNotification: "NOUVEAU_MESSAGE",
        titre: "Invitation a un groupe",
        message: `Vous avez ete ajoute au groupe \"${conversation.sujet || "Groupe"}\".`,
        conversationId: conversation.id,
        lienDirect: `/dashboard/messages?conversationId=${toNumber(
          conversation.id,
        )}`,
      },
      "messages",
    );
  });

  return getConversationDetail(userId, conversation.id);
}

async function removeGroupMember(userId, role, conversationId, targetUserId) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  if (!conversation.est_groupe) {
    throw new AppError("Cette operation est reservee aux conversations de groupe.", 400);
  }

  if (
    targetUserId !== userId &&
    !canManageGroupMembership(conversation, userId, role)
  ) {
    throw new AppError("Vous n'avez pas le droit de retirer ce membre.", 403);
  }

  if (conversation.cree_par === targetUserId && targetUserId !== userId) {
    throw new AppError("Le createur du groupe ne peut pas etre retire par un tiers.", 400);
  }

  const updated = await prisma.participants_conversation.updateMany({
    where: {
      conversation_id: conversation.id,
      utilisateur_id: targetUserId,
      quitte_le: null,
    },
    data: {
      quitte_le: new Date(),
    },
  });

  if (!updated.count) {
    throw new AppError("Participant non trouve dans ce groupe.", 404);
  }

  await prisma.conversations.update({
    where: { id: conversation.id },
    data: {
      modifie_le: new Date(),
    },
  });

  return {
    conversationId: toNumber(conversation.id),
    removedUserId: targetUserId,
  };
}

async function leaveGroupConversation(userId, conversationId) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  if (!conversation.est_groupe) {
    throw new AppError("Utilisez l'archivage pour les conversations directes.", 400);
  }

  const updated = await prisma.participants_conversation.updateMany({
    where: {
      conversation_id: conversation.id,
      utilisateur_id: userId,
      quitte_le: null,
    },
    data: {
      quitte_le: new Date(),
    },
  });

  if (!updated.count) {
    throw new AppError("Vous ne participez plus a ce groupe.", 400);
  }

  await prisma.conversations.update({
    where: { id: conversation.id },
    data: {
      modifie_le: new Date(),
    },
  });

  return {
    conversationId: toNumber(conversation.id),
    left: true,
  };
}

async function archiveConversation(userId, conversationId) {
  const conversation = await getConversationForUserOrThrow(userId, conversationId);

  if (conversation.est_groupe) {
    throw new AppError("Utilisez l'action quitter pour un groupe.", 400);
  }

  const updated = await prisma.participants_conversation.updateMany({
    where: {
      conversation_id: conversation.id,
      utilisateur_id: userId,
      quitte_le: null,
    },
    data: {
      quitte_le: new Date(),
    },
  });

  if (!updated.count) {
    throw new AppError("Conversation deja archivee.", 400);
  }

  return {
    conversationId: toNumber(conversation.id),
    archived: true,
  };
}

async function unarchiveConversation(userId, conversationId) {
  const conversation = await getConversationForUserOrThrow(
    userId,
    conversationId,
    { includeLeft: true },
  );

  if (conversation.est_groupe) {
    throw new AppError("Cette action ne s'applique qu'aux conversations directes.", 400);
  }

  await prisma.participants_conversation.updateMany({
    where: {
      conversation_id: conversation.id,
      utilisateur_id: userId,
    },
    data: {
      quitte_le: null,
    },
  });

  return {
    conversationId: toNumber(conversation.id),
    archived: false,
  };
}

async function downloadMessageAttachment(userId, attachmentId) {
  const attachment = await prisma.pieces_jointes.findFirst({
    where: {
      id: toBigInt(attachmentId),
      type_entite: MESSAGE_ATTACHMENT_ENTITY,
    },
  });

  if (!attachment?.entite_id || !attachment.chemin_fichier) {
    throw new AppError("Piece jointe introuvable.", 404);
  }

  const message = await prisma.messages.findUnique({
    where: {
      id: attachment.entite_id,
    },
    select: {
      id: true,
      conversation_id: true,
    },
  });

  if (!message?.conversation_id) {
    throw new AppError("Piece jointe introuvable.", 404);
  }

  await getConversationForUserOrThrow(userId, message.conversation_id);

  try {
    await fs.access(attachment.chemin_fichier);
  } catch (_error) {
    throw new AppError("Le fichier de la piece jointe est introuvable.", 404);
  }

  return {
    path: attachment.chemin_fichier,
    mimeType: attachment.type_mime || "application/octet-stream",
    downloadName: attachment.nom_fichier || `message-${message.id}-piece`,
  };
}

async function markMessageAsRead(userId, messageId) {
  const message = await prisma.messages.findUnique({
    where: {
      id: toBigInt(messageId),
    },
    select: {
      id: true,
      conversation_id: true,
    },
  });

  if (!message) {
    throw new AppError("Message introuvable.", 404);
  }

  await getConversationForUserOrThrow(userId, message.conversation_id);

  await prisma.lectures_message.upsert({
    where: {
      message_id_utilisateur_id: {
        message_id: message.id,
        utilisateur_id: userId,
      },
    },
    update: {
      lu: true,
      lu_le: new Date(),
    },
    create: {
      message_id: message.id,
      utilisateur_id: userId,
      lu: true,
      lu_le: new Date(),
    },
  });

  return {
    messageId: toNumber(message.id),
    lu: true,
  };
}

async function listPurchaseRequests(userId, role, filters) {
  const { page, limit, skip, take } = getPagination(filters.page, filters.limit);
  const conditions = [getPurchaseAccessCondition(userId, role)];

  if (filters.q) {
    conditions.push({
      OR: [
        { objet: { contains: filters.q } },
        { description: { contains: filters.q } },
        { justification_scientifique: { contains: filters.q } },
        {
          projets: {
            is: {
              titre: { contains: filters.q },
            },
          },
        },
      ],
    });
  }

  if (filters.statut) {
    conditions.push({ statut: filters.statut });
  }

  if (filters.projetId) {
    conditions.push({ projet_id: toBigInt(filters.projetId) });
  }

  const where = {
    AND: conditions,
  };

  const [total, demandes] = await prisma.$transaction([
    prisma.demandes_achat.count({ where }),
    prisma.demandes_achat.findMany({
      where,
      include: {
        projets: {
          select: {
            id: true,
            titre: true,
          },
        },
      },
      orderBy: [{ modifie_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  const demandeIds = demandes.map((demande) => demande.id);

  const [creatorsMap, decidersMap, attachments] = await Promise.all([
    fetchUsersMapByIds(demandes.map((demande) => demande.cree_par)),
    fetchUsersMapByIds(
      demandes.map((demande) => demande.decidee_par).filter(Boolean),
    ),
    demandeIds.length
      ? prisma.pieces_jointes.findMany({
          where: {
            type_entite: PURCHASE_ATTACHMENT_ENTITY,
            entite_id: { in: demandeIds },
          },
          orderBy: [{ cree_le: "desc" }, { id: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  const attachmentsByDemande = new Map();
  for (const attachment of attachments) {
    const key = String(attachment.entite_id);
    if (!attachmentsByDemande.has(key)) {
      attachmentsByDemande.set(key, attachment);
    }
  }

  return {
    elements: demandes.map((demande) =>
      serializePurchaseRequest(
        demande,
        creatorsMap,
        decidersMap,
        attachmentsByDemande,
      ),
    ),
    meta: buildMeta(total, page, limit),
  };
}

async function createPurchaseRequest(userId, role, payload, file) {
  const projet = await prisma.projets.findUnique({
    where: {
      id: toBigInt(payload.projetId),
    },
    select: {
      id: true,
      titre: true,
      cree_par: true,
    },
  });

  if (!projet) {
    throw new AppError("Projet introuvable.", 404);
  }

  if (
    ![ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(role) &&
    projet.cree_par !== userId
  ) {
    const membership = await prisma.membres_projet.findFirst({
      where: {
        projet_id: projet.id,
        utilisateur_id: userId,
      },
    });

    if (!membership) {
      throw new AppError(
        "Vous devez etre rattache au projet pour creer une demande d'achat.",
        403,
      );
    }
  }

  const stagedAttachment = await stagePurchaseAttachment(file);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const demande = await tx.demandes_achat.create({
        data: {
          projet_id: projet.id,
          cree_par: userId,
          objet: payload.objet,
          description: payload.description,
          quantite: payload.quantite,
          estimation_cout:
            payload.estimationCout === undefined ? null : payload.estimationCout,
          justification_scientifique: payload.justificationScientifique,
          urgente: Boolean(payload.urgente),
          statut: "EN_ATTENTE",
        },
        include: {
          projets: {
            select: {
              id: true,
              titre: true,
            },
          },
        },
      });

      await tx.historiques_demande.create({
        data: {
          demande_achat_id: demande.id,
          ancien_statut: null,
          nouveau_statut: "EN_ATTENTE",
          commentaire: "Demande creee.",
          modifie_par: userId,
        },
      });

      if (stagedAttachment) {
        await tx.pieces_jointes.create({
          data: {
            type_entite: PURCHASE_ATTACHMENT_ENTITY,
            entite_id: demande.id,
            nom_fichier: stagedAttachment.nomFichier,
            chemin_fichier: stagedAttachment.chemin,
            type_mime: stagedAttachment.typeMime,
            taille_octets: stagedAttachment.tailleOctets,
            ajoute_par: userId,
          },
        });
      }

      const reviewers = await tx.utilisateurs.findMany({
        where: {
          statut: ACCOUNT_STATUS.ACTIF,
          actif: true,
          role: {
            in: [ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR],
          },
        },
        select: { id: true },
      });

      await createNotifications(
        tx,
        reviewers.map((item) => item.id),
        {
          typeNotification: "NOUVELLE_DEMANDE_ACHAT",
          titre: "Nouvelle demande d'achat",
          message: `Une nouvelle demande d'achat a ete soumise pour le projet \"${projet.titre}\".`,
          demandeAchatId: demande.id,
          projetId: demande.projet_id,
          lienDirect: `/dashboard/purchases?demandeId=${toNumber(demande.id)}`,
        },
        "demandes",
      );

      return demande;
    });

    const [creatorsMap, attachment] = await Promise.all([
      fetchUsersMapByIds([created.cree_par]),
      stagedAttachment
        ? prisma.pieces_jointes.findFirst({
            where: {
              type_entite: PURCHASE_ATTACHMENT_ENTITY,
              entite_id: created.id,
            },
            orderBy: [{ cree_le: "desc" }, { id: "desc" }],
          })
        : Promise.resolve(null),
    ]);

    const attachmentsByDemande = new Map();
    if (attachment) {
      attachmentsByDemande.set(String(created.id), attachment);
    }

    return serializePurchaseRequest(
      created,
      creatorsMap,
      new Map(),
      attachmentsByDemande,
    );
  } catch (error) {
    await cleanupStoredFile(stagedAttachment?.chemin);
    throw error;
  }
}

async function getPurchaseRequestByIdOrThrow(purchaseId) {
  const demande = await prisma.demandes_achat.findUnique({
    where: {
      id: toBigInt(purchaseId),
    },
    include: {
      projets: {
        select: {
          id: true,
          titre: true,
        },
      },
    },
  });

  if (!demande) {
    throw new AppError("Demande d'achat introuvable.", 404);
  }

  return demande;
}

async function decidePurchaseRequest(userId, purchaseId, payload) {
  const demande = await getPurchaseRequestByIdOrThrow(purchaseId);

  if (!["EN_ATTENTE", "EN_COURS_TRAITEMENT", "ACCEPTEE"].includes(demande.statut)) {
    throw new AppError("Cette demande ne peut plus etre arbitree.", 409);
  }

  const nextStatus = payload.decision === "ACCEPTER" ? "ACCEPTEE" : "REJETEE";

  await prisma.$transaction(async (tx) => {
    await tx.demandes_achat.update({
      where: { id: demande.id },
      data: {
        statut: nextStatus,
        date_decision: new Date(),
        decidee_par: userId,
        motif_rejet: nextStatus === "REJETEE" ? payload.commentaire || null : null,
      },
    });

    await tx.decisions_demande.upsert({
      where: {
        demande_achat_id: demande.id,
      },
      update: {
        decision: nextStatus,
        commentaire: payload.commentaire || null,
        decidee_par: userId,
        cree_le: new Date(),
      },
      create: {
        demande_achat_id: demande.id,
        decision: nextStatus,
        commentaire: payload.commentaire || null,
        decidee_par: userId,
      },
    });

    await tx.historiques_demande.create({
      data: {
        demande_achat_id: demande.id,
        ancien_statut: demande.statut,
        nouveau_statut: nextStatus,
        commentaire: payload.commentaire || null,
        modifie_par: userId,
      },
    });

    await createNotifications(
      tx,
      [demande.cree_par],
      {
        typeNotification:
          nextStatus === "ACCEPTEE"
            ? "DEMANDE_ACHAT_ACCEPTEE"
            : "DEMANDE_ACHAT_REJETEE",
        titre:
          nextStatus === "ACCEPTEE"
            ? "Demande d'achat acceptee"
            : "Demande d'achat rejetee",
        message:
          nextStatus === "ACCEPTEE"
            ? "Votre demande d'achat a ete acceptee."
            : `Votre demande d'achat a ete rejetee.${
                payload.commentaire ? ` Motif: ${payload.commentaire}` : ""
              }`,
        demandeAchatId: demande.id,
        projetId: demande.projet_id,
        lienDirect: `/dashboard/purchases?demandeId=${toNumber(demande.id)}`,
      },
      "demandes",
    );
  });

  return getPurchaseRequestById(purchaseId);
}

async function updatePurchaseStatus(userId, purchaseId, payload) {
  const demande = await getPurchaseRequestByIdOrThrow(purchaseId);

  await prisma.$transaction(async (tx) => {
    await tx.demandes_achat.update({
      where: {
        id: demande.id,
      },
      data: {
        statut: payload.statut,
        decidee_par: userId,
        date_decision: new Date(),
        motif_rejet:
          payload.statut === "REJETEE" ? payload.commentaire || null : null,
        date_livraison:
          payload.statut === "LIVREE"
            ? payload.dateLivraison
              ? new Date(payload.dateLivraison)
              : new Date()
            : demande.date_livraison,
      },
    });

    await tx.historiques_demande.create({
      data: {
        demande_achat_id: demande.id,
        ancien_statut: demande.statut,
        nouveau_statut: payload.statut,
        commentaire: payload.commentaire || null,
        modifie_par: userId,
      },
    });

    await createNotifications(
      tx,
      [demande.cree_par],
      {
        typeNotification:
          payload.statut === "LIVREE"
            ? "DEMANDE_ACHAT_LIVREE"
            : "DEMANDE_ACHAT_STATUT_MODIFIE",
        titre:
          payload.statut === "LIVREE"
            ? "Demande d'achat livree"
            : "Statut de demande d'achat modifie",
        message: `Le statut de votre demande d'achat est maintenant: ${payload.statut}.`,
        demandeAchatId: demande.id,
        projetId: demande.projet_id,
        lienDirect: `/dashboard/purchases?demandeId=${toNumber(demande.id)}`,
      },
      payload.statut === "LIVREE" ? "livraisons" : "demandes",
    );
  });

  return getPurchaseRequestById(purchaseId);
}

async function getPurchaseRequestById(purchaseId) {
  const demande = await getPurchaseRequestByIdOrThrow(purchaseId);

  const [attachment, creatorsMap, decidersMap] = await Promise.all([
    prisma.pieces_jointes.findFirst({
      where: {
        type_entite: PURCHASE_ATTACHMENT_ENTITY,
        entite_id: demande.id,
      },
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
    }),
    fetchUsersMapByIds([demande.cree_par]),
    fetchUsersMapByIds([demande.decidee_par].filter(Boolean)),
  ]);

  const attachmentsByDemande = new Map();
  if (attachment) {
    attachmentsByDemande.set(String(demande.id), attachment);
  }

  return serializePurchaseRequest(
    demande,
    creatorsMap,
    decidersMap,
    attachmentsByDemande,
  );
}

async function downloadPurchaseAttachment(userId, role, purchaseId) {
  const demande = await getPurchaseRequestByIdOrThrow(purchaseId);

  if (
    ![ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(role) &&
    demande.cree_par !== userId
  ) {
    throw new AppError("Vous n'avez pas les droits pour cette piece jointe.", 403);
  }

  const attachment = await prisma.pieces_jointes.findFirst({
    where: {
      type_entite: PURCHASE_ATTACHMENT_ENTITY,
      entite_id: demande.id,
    },
    orderBy: [{ cree_le: "desc" }, { id: "desc" }],
  });

  if (!attachment?.chemin_fichier) {
    throw new AppError("Aucune piece jointe disponible.", 404);
  }

  try {
    await fs.access(attachment.chemin_fichier);
  } catch (_error) {
    throw new AppError("Le fichier de la piece jointe est introuvable.", 404);
  }

  return {
    path: attachment.chemin_fichier,
    mimeType: attachment.type_mime || "application/octet-stream",
    downloadName: attachment.nom_fichier || `demande-${demande.id}-piece`,
  };
}

async function listNotifications(userId, filters) {
  const { page, limit, skip, take } = getPagination(filters.page, filters.limit);
  const where = {
    utilisateur_id: userId,
    ...(filters.nonLues ? { est_lue: false } : {}),
  };

  const [total, unreadCount, notifications] = await prisma.$transaction([
    prisma.notifications.count({ where }),
    prisma.notifications.count({
      where: {
        utilisateur_id: userId,
        est_lue: false,
      },
    }),
    prisma.notifications.findMany({
      where,
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  return {
    elements: notifications.map((notification) => ({
      id: toNumber(notification.id),
      typeNotification: notification.type_notification,
      titre: notification.titre,
      message: notification.message,
      projetId: toNumber(notification.projet_id),
      demandeAchatId: toNumber(notification.demande_achat_id),
      articleId: toNumber(notification.article_id),
      conversationId: toNumber(notification.conversation_id),
      messageId: toNumber(notification.message_id),
      estLue: notification.est_lue,
      lueLe: notification.lue_le,
      lienDirect: notification.lien_direct,
      creeLe: notification.cree_le,
    })),
    unreadCount,
    meta: buildMeta(total, page, limit),
  };
}

async function markNotificationAsRead(userId, notificationId) {
  const updated = await prisma.notifications.updateMany({
    where: {
      id: toBigInt(notificationId),
      utilisateur_id: userId,
    },
    data: {
      est_lue: true,
      lue_le: new Date(),
    },
  });

  if (!updated.count) {
    throw new AppError("Notification introuvable.", 404);
  }

  return {
    id: Number(notificationId),
    estLue: true,
  };
}

async function markAllNotificationsAsRead(userId) {
  const result = await prisma.notifications.updateMany({
    where: {
      utilisateur_id: userId,
      est_lue: false,
    },
    data: {
      est_lue: true,
      lue_le: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}

async function getNotificationPreferences(userId) {
  const preference = await ensureNotificationPreferences(userId);

  return {
    canalApplication: preference.canal_application,
    canalEmail: preference.canal_email,
    notifComptes: preference.notif_comptes,
    notifArticles: preference.notif_articles,
    notifMessages: preference.notif_messages,
    notifProjets: preference.notif_projets,
    notifDemandesAchat: preference.notif_demandes_achat,
    notifLivraisons: preference.notif_livraisons,
    creeLe: preference.cree_le,
    modifieLe: preference.modifie_le,
  };
}

async function updateNotificationPreferences(userId, payload) {
  await ensureNotificationPreferences(userId);

  const updated = await prisma.preferences_notification.update({
    where: {
      utilisateur_id: userId,
    },
    data: {
      canal_application:
        payload.canalApplication === undefined
          ? undefined
          : Boolean(payload.canalApplication),
      canal_email:
        payload.canalEmail === undefined ? undefined : Boolean(payload.canalEmail),
      notif_comptes:
        payload.notifComptes === undefined
          ? undefined
          : Boolean(payload.notifComptes),
      notif_articles:
        payload.notifArticles === undefined
          ? undefined
          : Boolean(payload.notifArticles),
      notif_messages:
        payload.notifMessages === undefined
          ? undefined
          : Boolean(payload.notifMessages),
      notif_projets:
        payload.notifProjets === undefined
          ? undefined
          : Boolean(payload.notifProjets),
      notif_demandes_achat:
        payload.notifDemandesAchat === undefined
          ? undefined
          : Boolean(payload.notifDemandesAchat),
      notif_livraisons:
        payload.notifLivraisons === undefined
          ? undefined
          : Boolean(payload.notifLivraisons),
      modifie_le: new Date(),
    },
  });

  return {
    canalApplication: updated.canal_application,
    canalEmail: updated.canal_email,
    notifComptes: updated.notif_comptes,
    notifArticles: updated.notif_articles,
    notifMessages: updated.notif_messages,
    notifProjets: updated.notif_projets,
    notifDemandesAchat: updated.notif_demandes_achat,
    notifLivraisons: updated.notif_livraisons,
    creeLe: updated.cree_le,
    modifieLe: updated.modifie_le,
  };
}

module.exports = {
  listConversations,
  getConversationDetail,
  createConversation,
  createGroupConversation,
  addGroupMembers,
  removeGroupMember,
  leaveGroupConversation,
  archiveConversation,
  unarchiveConversation,
  sendMessage,
  markMessageAsRead,
  downloadMessageAttachment,
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  assignProjectMember,
  removeProjectMember,
  listPurchaseRequests,
  createPurchaseRequest,
  getPurchaseRequestById,
  decidePurchaseRequest,
  updatePurchaseStatus,
  downloadPurchaseAttachment,
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  createNotifications,
};
