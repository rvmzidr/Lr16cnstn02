const prisma = require("../config/prisma");
const { ACCOUNT_STATUS, ROLES } = require("../config/constants");
const { buildMeta, getPagination } = require("../utils/pagination");
const { toBigInt, toNumber } = require("../utils/bigint");
const AppError = require("../utils/app-error");
const { createNotifications } = require("./collaboration.service");

const ALLOWED_ROLES = new Set([
  ROLES.MEMBRE,
  ROLES.ADMINISTRATEUR,
  ROLES.CHEF_LABO,
]);

function serializeUserSummary(utilisateur) {
  if (!utilisateur) {
    return null;
  }

  return {
    id: utilisateur.id,
    fullName: `${utilisateur.prenom} ${utilisateur.nom}`,
    email: utilisateur.email_institutionnel,
    role: utilisateur.role,
  };
}

async function getActiveUserById(userId, client = prisma) {
  return client.utilisateurs.findUnique({
    where: { id: userId },
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
}

async function fetchUsersMapByIds(userIds, client = prisma) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueIds.length) {
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
  utilisateurs.forEach((utilisateur) => {
    map.set(utilisateur.id, serializeUserSummary(utilisateur));
  });

  return map;
}

function canMessageRole(senderRole, receiverRole) {
  if (!ALLOWED_ROLES.has(senderRole) || !ALLOWED_ROLES.has(receiverRole)) {
    return false;
  }

  if (senderRole === ROLES.MEMBRE) {
    return [ROLES.MEMBRE, ROLES.ADMINISTRATEUR, ROLES.CHEF_LABO].includes(
      receiverRole,
    );
  }

  if (senderRole === ROLES.ADMINISTRATEUR) {
    return [ROLES.MEMBRE, ROLES.CHEF_LABO, ROLES.ADMINISTRATEUR].includes(
      receiverRole,
    );
  }

  return [ROLES.MEMBRE, ROLES.ADMINISTRATEUR, ROLES.CHEF_LABO].includes(
    receiverRole,
  );
}

async function ensureConversationAccess(userId, conversationId, client = prisma) {
  const participant = await client.participants_conversation.findFirst({
    where: {
      conversation_id: toBigInt(conversationId),
      utilisateur_id: userId,
      quitte_le: null,
    },
    select: {
      conversation_id: true,
    },
  });

  if (!participant) {
    throw new AppError("Conversation inaccessible.", 403);
  }
}

async function findDirectConversation(client, userAId, userBId) {
  const candidates = await client.conversations.findMany({
    where: {
      est_groupe: false,
      participants_conversation: {
        some: {
          utilisateur_id: userAId,
          quitte_le: null,
        },
      },
      AND: [
        {
          participants_conversation: {
            some: {
              utilisateur_id: userBId,
              quitte_le: null,
            },
          },
        },
      ],
    },
    include: {
      participants_conversation: {
        where: {
          quitte_le: null,
        },
        select: {
          utilisateur_id: true,
        },
      },
    },
    orderBy: [{ modifie_le: "desc" }, { id: "desc" }],
  });

  return (
    candidates.find((conversation) => {
      const ids = [
        ...new Set(
          conversation.participants_conversation.map(
            (participant) => participant.utilisateur_id,
          ),
        ),
      ];

      return (
        ids.length === 2 && ids.includes(userAId) && ids.includes(userBId)
      );
    }) || null
  );
}

async function ensureDirectConversation(client, userAId, userBId) {
  const existing = await findDirectConversation(client, userAId, userBId);

  if (existing) {
    return existing;
  }

  const created = await client.conversations.create({
    data: {
      sujet: null,
      est_groupe: false,
      cree_par: userAId,
    },
  });

  await client.participants_conversation.createMany({
    data: [
      {
        conversation_id: created.id,
        utilisateur_id: userAId,
      },
      {
        conversation_id: created.id,
        utilisateur_id: userBId,
      },
    ],
    skipDuplicates: true,
  });

  return created;
}

function serializeMessage(message, usersMap, currentUserId, participantId) {
  const lecture = message.lectures_message?.[0];
  const isSentByCurrentUser = message.expediteur_id === currentUserId;

  return {
    id: toNumber(message.id),
    conversationId: toNumber(message.conversation_id),
    senderId: message.expediteur_id,
    receiverId: isSentByCurrentUser ? participantId : currentUserId,
    content: message.contenu,
    isRead: isSentByCurrentUser ? true : Boolean(lecture?.lu),
    createdAt: message.cree_le,
    updatedAt: message.modifie_le,
    sender: usersMap.get(message.expediteur_id) || null,
    receiver: usersMap.get(isSentByCurrentUser ? participantId : currentUserId) || null,
  };
}

async function sendMessage(userId, payload) {
  const sender = await getActiveUserById(userId);
  if (!sender || sender.statut !== ACCOUNT_STATUS.ACTIF || !sender.actif) {
    throw new AppError("Utilisateur expediteur introuvable.", 401);
  }

  if (payload.receiverId === userId) {
    throw new AppError("Vous ne pouvez pas vous envoyer un message.", 400);
  }

  const receiver = await getActiveUserById(payload.receiverId);
  if (
    !receiver ||
    receiver.statut !== ACCOUNT_STATUS.ACTIF ||
    !receiver.actif ||
    !receiver.role
  ) {
    throw new AppError("Destinataire introuvable ou inactif.", 404);
  }

  if (!canMessageRole(sender.role, receiver.role)) {
    throw new AppError("Ce destinataire n'est pas autorise pour votre role.", 403);
  }

  const content = payload.content.trim();
  if (!content) {
    throw new AppError("Le contenu du message est obligatoire.", 400);
  }

  const createdMessage = await prisma.$transaction(async (tx) => {
    const conversation = await ensureDirectConversation(tx, userId, receiver.id);

    const message = await tx.messages.create({
      data: {
        conversation_id: conversation.id,
        expediteur_id: userId,
        contenu: content,
      },
    });

    await tx.lectures_message.createMany({
      data: [
        {
          message_id: message.id,
          utilisateur_id: userId,
          lu: true,
          lu_le: new Date(),
        },
        {
          message_id: message.id,
          utilisateur_id: receiver.id,
          lu: false,
          lu_le: null,
        },
      ],
      skipDuplicates: true,
    });

    await tx.conversations.update({
      where: { id: conversation.id },
      data: { modifie_le: new Date() },
    });

    await createNotifications(
      tx,
      [receiver.id],
      {
        typeNotification: "NOUVEAU_MESSAGE",
        titre: "Nouveau message",
        message: `Vous avez recu un nouveau message de ${sender.prenom} ${sender.nom}.`,
        conversationId: conversation.id,
        messageId: message.id,
        lienDirect: `/dashboard/messages?user=${userId}`,
      },
      "messages",
    );

    return {
      conversationId: conversation.id,
      message,
    };
  });

  const usersMap = await fetchUsersMapByIds([userId, receiver.id]);

  return {
    conversationId: toNumber(createdMessage.conversationId),
    message: serializeMessage(
      { ...createdMessage.message, lectures_message: [{ lu: true, lu_le: new Date() }] },
      usersMap,
      userId,
      receiver.id,
    ),
  };
}

async function getInbox(userId, query) {
  const { page, limit, skip, take } = getPagination(query.page, query.limit);

  const conversations = await prisma.conversations.findMany({
    where: {
      est_groupe: false,
      participants_conversation: {
        some: {
          utilisateur_id: userId,
          quitte_le: null,
        },
      },
    },
    include: {
      participants_conversation: {
        where: { quitte_le: null },
        select: {
          utilisateur_id: true,
        },
      },
    },
    orderBy: [{ modifie_le: "desc" }, { id: "desc" }],
  });

  const directConversations = conversations
    .map((conversation) => {
      const participantIds = [
        ...new Set(
          conversation.participants_conversation.map(
            (participant) => participant.utilisateur_id,
          ),
        ),
      ];

      if (participantIds.length !== 2 || !participantIds.includes(userId)) {
        return null;
      }

      const otherUserId = participantIds.find((id) => id !== userId);
      if (!otherUserId) {
        return null;
      }

      return {
        id: conversation.id,
        otherUserId,
      };
    })
    .filter(Boolean);

  if (!directConversations.length) {
    return {
      elements: [],
      meta: buildMeta(0, page, limit),
    };
  }

  const total = directConversations.length;
  const paged = directConversations.slice(skip, skip + take);
  const conversationIds = paged.map((item) => item.id);

  const [messages, unreadLectures, usersMap] = await Promise.all([
    prisma.messages.findMany({
      where: {
        conversation_id: {
          in: conversationIds,
        },
      },
      select: {
        id: true,
        conversation_id: true,
        contenu: true,
        cree_le: true,
        expediteur_id: true,
      },
      orderBy: [
        { conversation_id: "asc" },
        { cree_le: "desc" },
        { id: "desc" },
      ],
    }),
    prisma.lectures_message.findMany({
      where: {
        utilisateur_id: userId,
        lu: false,
        messages: {
          conversation_id: {
            in: conversationIds,
          },
          expediteur_id: {
            not: userId,
          },
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
    fetchUsersMapByIds(paged.map((item) => item.otherUserId)),
  ]);

  const latestMessageByConversation = new Map();
  messages.forEach((message) => {
    const key = String(message.conversation_id);
    if (!latestMessageByConversation.has(key)) {
      latestMessageByConversation.set(key, message);
    }
  });

  const unreadByConversation = new Map();
  unreadLectures.forEach((lecture) => {
    const key = String(lecture.messages.conversation_id);
    unreadByConversation.set(key, (unreadByConversation.get(key) || 0) + 1);
  });

  return {
    elements: paged.map((conversation) => {
      const key = String(conversation.id);
      const latest = latestMessageByConversation.get(key) || null;

      return {
        conversationId: toNumber(conversation.id),
        participant: usersMap.get(conversation.otherUserId) || null,
        lastMessage: latest?.contenu || null,
        lastMessageAt: latest?.cree_le || null,
        unreadCount: unreadByConversation.get(key) || 0,
        lastMessageSenderId: latest?.expediteur_id || null,
        lastMessageSentByCurrentUser:
          latest?.expediteur_id ? latest.expediteur_id === userId : false,
      };
    }),
    meta: buildMeta(total, page, limit),
  };
}

async function getConversation(userId, otherUserId, query) {
  if (otherUserId === userId) {
    throw new AppError("Conversation invalide.", 400);
  }

  const participant = await getActiveUserById(otherUserId);
  if (!participant || !participant.role) {
    throw new AppError("Participant introuvable.", 404);
  }

  const conversation = await findDirectConversation(prisma, userId, otherUserId);
  const { page, limit, skip, take } = getPagination(query.page, query.limit);

  if (!conversation) {
    return {
      conversationId: null,
      participant: serializeUserSummary(participant),
      messages: [],
      meta: buildMeta(0, page, limit),
    };
  }

  const [total, messages] = await Promise.all([
    prisma.messages.count({
      where: {
        conversation_id: conversation.id,
      },
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
      orderBy: [{ cree_le: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
  ]);

  const usersMap = await fetchUsersMapByIds([userId, otherUserId]);

  const ordered = [...messages]
    .reverse()
    .map((message) =>
      serializeMessage(message, usersMap, userId, otherUserId),
    );

  return {
    conversationId: toNumber(conversation.id),
    participant: usersMap.get(otherUserId) || null,
    messages: ordered,
    meta: buildMeta(total, page, limit),
  };
}

async function markMessageRead(userId, messageId) {
  const message = await prisma.messages.findUnique({
    where: {
      id: toBigInt(messageId),
    },
    select: {
      id: true,
      conversation_id: true,
      expediteur_id: true,
    },
  });

  if (!message) {
    throw new AppError("Message introuvable.", 404);
  }

  await ensureConversationAccess(userId, message.conversation_id);

  if (message.expediteur_id === userId) {
    throw new AppError("Seul le destinataire peut marquer ce message comme lu.", 403);
  }

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
    isRead: true,
  };
}

async function markConversationRead(userId, otherUserId) {
  const conversation = await findDirectConversation(prisma, userId, otherUserId);

  if (!conversation) {
    return {
      updatedCount: 0,
    };
  }

  const result = await prisma.lectures_message.updateMany({
    where: {
      utilisateur_id: userId,
      lu: false,
      messages: {
        conversation_id: conversation.id,
        expediteur_id: otherUserId,
      },
    },
    data: {
      lu: true,
      lu_le: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
}

async function getUnreadCount(userId) {
  const count = await prisma.lectures_message.count({
    where: {
      utilisateur_id: userId,
      lu: false,
      messages: {
        expediteur_id: {
          not: userId,
        },
      },
    },
  });

  return { count };
}

async function searchRecipients(userId, query) {
  const currentUser = await getActiveUserById(userId);

  if (!currentUser || !currentUser.role) {
    throw new AppError("Utilisateur introuvable.", 401);
  }

  const parsedLimit = Number.isFinite(Number(query.limit))
    ? Number(query.limit)
    : 20;
  const limit = Math.min(Math.max(1, parsedLimit), 50);
  const where = {
    id: { not: userId },
    actif: true,
    statut: ACCOUNT_STATUS.ACTIF,
    role: {
      in: [ROLES.MEMBRE, ROLES.ADMINISTRATEUR, ROLES.CHEF_LABO],
    },
  };

  if (query.search) {
    where.OR = [
      {
        nom: {
          contains: query.search,
        },
      },
      {
        prenom: {
          contains: query.search,
        },
      },
      {
        email_institutionnel: {
          contains: query.search,
        },
      },
    ];
  }

  const users = await prisma.utilisateurs.findMany({
    where,
    select: {
      id: true,
      nom: true,
      prenom: true,
      email_institutionnel: true,
      role: true,
      statut: true,
      actif: true,
    },
    orderBy: [{ prenom: "asc" }, { nom: "asc" }],
    take: limit,
  });

  const elements = users
    .filter((utilisateur) => canMessageRole(currentUser.role, utilisateur.role))
    .map((utilisateur) => serializeUserSummary(utilisateur));

  return {
    elements,
  };
}

module.exports = {
  sendMessage,
  getInbox,
  getConversation,
  markMessageRead,
  markConversationRead,
  getUnreadCount,
  searchRecipients,
};
