const assert = require("node:assert/strict");
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

test("Release 2 smoke suite", async () => {
  await prisma.$connect();

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const memberToken = await login(baseUrl, "member@lr16cnstn02.tn", "Lab2026!");
    const labHeadToken = await login(baseUrl, "labhead@lr16cnstn02.tn", "Lab2026!");
    const supportToken = await login(
      baseUrl,
      "support.member@lr16cnstn02.tn",
      "Lab2026!",
    );

    const createArticle = await requestJson(baseUrl, "/api/membre/articles", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titre: `Article R2 ${Date.now()}`,
        resume: "Resume article release 2.",
        contenu: "Contenu article release 2.",
        action: "SOUMETTRE",
      }),
    });
    assert.equal(createArticle.response.status, 201);
    const articleId = createArticle.body.donnees.id;

    const uploadForm = new FormData();
    uploadForm.set(
      "articlePdf",
      new Blob(["%PDF-1.4\n% collaboration demo"], {
        type: "application/pdf",
      }),
      "collaboration-demo.pdf",
    );

    const uploadPdf = await fetch(buildUrl(baseUrl, `/api/membre/articles/${articleId}/pdf`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
      body: uploadForm,
    });
    assert.equal(uploadPdf.status, 200);

    const memberDownloadPdf = await fetch(
      buildUrl(baseUrl, `/api/membre/articles/${articleId}/pdf`),
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      },
    );
    assert.equal(memberDownloadPdf.status, 200);

    const publicBeforePublication = await fetch(
      buildUrl(baseUrl, `/api/public/articles/${articleId}/pdf`),
    );
    assert.equal(publicBeforePublication.status, 404);

    const validateArticle = await requestJson(
      baseUrl,
      `/api/chef-labo/articles/${articleId}/valider`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
        },
      },
    );
    assert.equal(validateArticle.response.status, 200);

    const publishArticle = await requestJson(
      baseUrl,
      `/api/chef-labo/articles/${articleId}/publier`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
        },
      },
    );
    assert.equal(publishArticle.response.status, 200);

    const publicPdf = await fetch(buildUrl(baseUrl, `/api/public/articles/${articleId}/pdf`));
    assert.equal(publicPdf.status, 200);

    const createProject = await requestJson(baseUrl, "/api/chef-labo/projets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${labHeadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titre: `Projet R2 ${Date.now()}`,
        description: "Projet test release 2.",
        objectifs: "Valider les workflows internes.",
        statut: "EN_COURS",
      }),
    });
    assert.equal(createProject.response.status, 201);
    const projectId = createProject.body.donnees.id;

    const memberProfile = await requestJson(baseUrl, "/api/membre/profil", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberProfile.response.status, 200);
    const memberUserId = memberProfile.body.donnees.utilisateur.id;

    const assignProjectMember = await requestJson(
      baseUrl,
      `/api/chef-labo/projets/${projectId}/membres`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          utilisateurId: memberUserId,
          roleDansProjet: "Chercheur",
        }),
      },
    );
    assert.equal(assignProjectMember.response.status, 200);

    const memberLookup = await requestJson(baseUrl, "/api/membre/membres", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberLookup.response.status, 200);
    const supportMember = memberLookup.body.donnees.elements.find(
      (item) => item.emailInstitutionnel === "support.member@lr16cnstn02.tn",
    );
    assert.ok(supportMember, "Support member must exist for messaging test.");

    const createConversation = await requestJson(
      baseUrl,
      "/api/membre/messages/conversations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${memberToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sujet: "Conversation R2",
          participantIds: [supportMember.id],
          contenu: "Message initial release 2.",
        }),
      },
    );
    assert.equal(createConversation.response.status, 201);
    const conversationId = createConversation.body.donnees.conversation.id;

    const sendMessage = await requestJson(
      baseUrl,
      `/api/membre/messages/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${memberToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contenu: "Deuxieme message pour test notifications.",
        }),
      },
    );
    assert.equal(sendMessage.response.status, 201);

    const supportNotifications = await requestJson(
      baseUrl,
      "/api/membre/notifications?limit=20",
      {
        headers: {
          Authorization: `Bearer ${supportToken}`,
        },
      },
    );
    assert.equal(supportNotifications.response.status, 200);
    assert.ok(
      supportNotifications.body.donnees.elements.some(
        (item) => item.typeNotification === "NOUVEAU_MESSAGE",
      ),
    );

    const purchaseForm = new FormData();
    purchaseForm.set("objet", "Spectrometre portable");
    purchaseForm.set("description", "Acquisition pour campagne de mesures.");
    purchaseForm.set("quantite", "2");
    purchaseForm.set("justificationScientifique", "Support des experiences release 2.");
    purchaseForm.set("urgente", "false");

    const createPurchase = await fetch(buildUrl(baseUrl, "/api/membre/demandes-achat"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
      body: purchaseForm,
    });
    assert.equal(createPurchase.status, 201);
    const purchaseBody = await createPurchase.json();
    const purchaseId = purchaseBody.donnees.id;

    const acceptPurchase = await requestJson(
      baseUrl,
      `/api/chef-labo/demandes-achat/${purchaseId}/decision`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision: "ACCEPTER",
        }),
      },
    );
    assert.equal(acceptPurchase.response.status, 200);

    const movePurchase = await requestJson(
      baseUrl,
      `/api/chef-labo/demandes-achat/${purchaseId}/statut`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statut: "EN_COURS_TRAITEMENT",
        }),
      },
    );
    assert.equal(movePurchase.response.status, 200);

    const myPurchases = await requestJson(baseUrl, "/api/membre/demandes-achat", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(myPurchases.response.status, 200);
    assert.ok(
      myPurchases.body.donnees.elements.some((item) => item.id === purchaseId),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
