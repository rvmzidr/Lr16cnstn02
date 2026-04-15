const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const app = require("../app");
const prisma = require("../config/prisma");

function buildUrl(baseUrl, path) {
  return `${baseUrl}${path}`;
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(buildUrl(baseUrl, path), options);
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function login(baseUrl, emailInstitutionnel, motDePasse) {
  const { response, body } = await requestJson(baseUrl, "/api/auth/connexion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailInstitutionnel,
      motDePasse,
    }),
  });

  assert.equal(response.status, 200, `Login failed for ${emailInstitutionnel}`);
  return body.donnees.accessToken;
}

test("Messaging module endpoints", async () => {
  await prisma.$connect();

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const memberToken = await login(baseUrl, "member@lr16cnstn02.tn", "Lab2026!");
    const supportToken = await login(
      baseUrl,
      "support.member@lr16cnstn02.tn",
      "Lab2026!",
    );
    const adminToken = await login(baseUrl, "admin@lr16cnstn02.tn", "Lab2026!");
    const labHeadToken = await login(
      baseUrl,
      "labhead@lr16cnstn02.tn",
      "Lab2026!",
    );

    const [memberProfile, supportProfile, adminProfile] = await Promise.all([
      requestJson(baseUrl, "/api/membre/profil", {
        headers: { Authorization: `Bearer ${memberToken}` },
      }),
      requestJson(baseUrl, "/api/membre/profil", {
        headers: { Authorization: `Bearer ${supportToken}` },
      }),
      requestJson(baseUrl, "/api/membre/profil", {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ]);

    assert.equal(memberProfile.response.status, 200);
    assert.equal(supportProfile.response.status, 200);
    assert.equal(adminProfile.response.status, 200);

    const memberUserId = memberProfile.body.donnees.utilisateur.id;
    const supportUserId = supportProfile.body.donnees.utilisateur.id;
    const adminUserId = adminProfile.body.donnees.utilisateur.id;

    const sendMessage = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: supportUserId,
        content: `Message integration test ${Date.now()}`,
      }),
    });

    assert.equal(sendMessage.response.status, 201);
    assert.ok(sendMessage.body.donnees.conversationId);
    assert.ok(sendMessage.body.donnees.message.id);
    const sentMessageId = sendMessage.body.donnees.message.id;

    const invalidReceiver = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiverId: crypto.randomUUID(),
        content: "Should fail",
      }),
    });
    assert.equal(invalidReceiver.response.status, 404);

    const memberInbox = await requestJson(baseUrl, "/api/messages/inbox", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberInbox.response.status, 200);
    assert.ok(
      memberInbox.body.donnees.elements.some(
        (item) => item.participant?.id === supportUserId,
      ),
    );

    const supportInbox = await requestJson(baseUrl, "/api/messages/inbox", {
      headers: {
        Authorization: `Bearer ${supportToken}`,
      },
    });
    assert.equal(supportInbox.response.status, 200);
    assert.ok(
      supportInbox.body.donnees.elements.some(
        (item) => item.participant?.id === memberUserId,
      ),
    );

    const adminInbox = await requestJson(baseUrl, "/api/messages/inbox", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(adminInbox.response.status, 200);

    const conversationDetail = await requestJson(
      baseUrl,
      `/api/messages/conversation/${supportUserId}`,
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );

    assert.equal(conversationDetail.response.status, 200);
    assert.ok(conversationDetail.body.donnees.messages.length >= 1);

    const senderReadAttempt = await requestJson(
      baseUrl,
      `/api/messages/${sentMessageId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(senderReadAttempt.response.status, 403);

    const receiverRead = await requestJson(
      baseUrl,
      `/api/messages/${sentMessageId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );
    assert.equal(receiverRead.response.status, 200);

    const markConversationRead = await requestJson(
      baseUrl,
      `/api/messages/conversation/${memberUserId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );
    assert.equal(markConversationRead.response.status, 200);

    const supportUnreadCount = await requestJson(
      baseUrl,
      "/api/messages/unread-count",
      {
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );
    assert.equal(supportUnreadCount.response.status, 200);
    assert.equal(typeof supportUnreadCount.body.donnees.count, "number");

    const recipientsSearch = await requestJson(
      baseUrl,
      "/api/messages/recipients?search=admin",
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(recipientsSearch.response.status, 200);
    assert.ok(
      recipientsSearch.body.donnees.elements.some(
        (item) => item.email === "admin@lr16cnstn02.tn",
      ),
    );

    const receiverNotifications = await requestJson(
      baseUrl,
      "/api/membre/notifications?limit=20",
      {
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );

    assert.equal(receiverNotifications.response.status, 200);
    assert.ok(
      receiverNotifications.body.donnees.elements.some(
        (item) => item.typeNotification === "NOUVEAU_MESSAGE",
      ),
    );

    const memberGroupDenied = await requestJson(baseUrl, "/api/membre/messages/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sujet: `Groupe interdit ${Date.now()}`,
        participantIds: [supportUserId, adminUserId],
        contenu: "Tentative refusee",
      }),
    });
    assert.equal(memberGroupDenied.response.status, 403);

    const createGroup = await requestJson(baseUrl, "/api/membre/messages/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${labHeadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sujet: `Groupe integration ${Date.now()}`,
        participantIds: [memberUserId, supportUserId],
        contenu: "Message initial groupe",
      }),
    });
    assert.equal(createGroup.response.status, 201);
    assert.equal(createGroup.body.donnees.conversation.estGroupe, true);
    const groupConversationId = createGroup.body.donnees.conversation.id;

    const addAdminToGroup = await requestJson(
      baseUrl,
      `/api/membre/messages/groups/${groupConversationId}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantIds: [adminUserId],
        }),
      },
    );
    assert.equal(addAdminToGroup.response.status, 200);
    assert.ok(
      addAdminToGroup.body.donnees.participants.some(
        (item) => item.utilisateur?.id === adminUserId,
      ),
    );

    const removeAdminFromGroup = await requestJson(
      baseUrl,
      `/api/membre/messages/groups/${groupConversationId}/members/${adminUserId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
        },
      },
    );
    assert.equal(removeAdminFromGroup.response.status, 200);

    const groupMessageForm = new FormData();
    groupMessageForm.set("contenu", "Message avec piece jointe");
    groupMessageForm.set(
      "pieceJointe",
      new Blob(["fake-pdf-content"], { type: "application/pdf" }),
      "integration-message.pdf",
    );

    const sendGroupAttachment = await fetch(
      buildUrl(
        baseUrl,
        `/api/membre/messages/conversations/${groupConversationId}/messages`,
      ),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
        body: groupMessageForm,
      },
    );
    assert.equal(sendGroupAttachment.status, 201);
    const sendGroupAttachmentBody = await sendGroupAttachment.json();
    const groupAttachment = sendGroupAttachmentBody.donnees.pieceJointe;
    assert.ok(groupAttachment?.id);
    const groupMessageId = sendGroupAttachmentBody.donnees.id;

    const markGroupMessageRead = await requestJson(
      baseUrl,
      `/api/membre/messages/messages/${groupMessageId}/lire`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(markGroupMessageRead.response.status, 200);

    const downloadAttachment = await fetch(
      buildUrl(baseUrl, `/api/membre/messages/attachments/${groupAttachment.id}`),
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(downloadAttachment.status, 200);
    const downloadedBytes = await downloadAttachment.arrayBuffer();
    assert.ok(downloadedBytes.byteLength > 0);

    const createDirect = await requestJson(baseUrl, "/api/membre/messages/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantIds: [supportUserId],
        contenu: `Direct archive test ${Date.now()}`,
      }),
    });
    assert.equal(createDirect.response.status, 201);
    const directConversationId = createDirect.body.donnees.conversation.id;

    const archiveDirect = await requestJson(
      baseUrl,
      `/api/membre/messages/conversations/${directConversationId}/archive`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(archiveDirect.response.status, 200);

    const listAfterArchive = await requestJson(
      baseUrl,
      "/api/membre/messages/conversations",
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(listAfterArchive.response.status, 200);
    assert.equal(
      listAfterArchive.body.donnees.elements.some(
        (item) => (item.conversation?.id ?? item.id) === directConversationId,
      ),
      false,
    );

    const unarchiveDirect = await requestJson(
      baseUrl,
      `/api/membre/messages/conversations/${directConversationId}/unarchive`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(unarchiveDirect.response.status, 200);

    const listAfterUnarchive = await requestJson(
      baseUrl,
      "/api/membre/messages/conversations",
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(listAfterUnarchive.response.status, 200);
    assert.ok(
      listAfterUnarchive.body.donnees.elements.some(
        (item) => (item.conversation?.id ?? item.id) === directConversationId,
      ),
    );

    const leaveGroup = await requestJson(
      baseUrl,
      `/api/membre/messages/groups/${groupConversationId}/leave`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );
    assert.equal(leaveGroup.response.status, 200);

    const sendAfterLeave = await requestJson(
      baseUrl,
      `/api/membre/messages/conversations/${groupConversationId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supportToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contenu: "Ne devrait pas passer",
        }),
      },
    );
    assert.equal(sendAfterLeave.response.status, 404);

    const refreshedMemberToken = await login(
      baseUrl,
      "member@lr16cnstn02.tn",
      "Lab2026!",
    );
    const persistedGroupConversation = await requestJson(
      baseUrl,
      `/api/membre/messages/conversations/${groupConversationId}`,
      {
        headers: {
          Authorization: `Bearer ${refreshedMemberToken}`,
        },
      },
    );
    assert.equal(persistedGroupConversation.response.status, 200);
    assert.ok(
      persistedGroupConversation.body.donnees.messages.some(
        (item) => item.id === groupMessageId,
      ),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
