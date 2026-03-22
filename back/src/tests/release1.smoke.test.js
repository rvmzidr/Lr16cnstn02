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

test("Release 1 smoke suite", async () => {
  await prisma.$connect();

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const uniqueStamp = Date.now();
  const registrationEmail = `smoke.${uniqueStamp}@lr16cnstn02.tn`;
  const registrationCin = String(uniqueStamp).slice(-8);

  try {
    const health = await requestJson(baseUrl, "/api/health");
    assert.equal(health.response.status, 200);

    const publicHome = await requestJson(baseUrl, "/api/public/accueil");
    assert.equal(publicHome.response.status, 200);
    assert.equal(publicHome.body.donnees.actualitesRecentes.length, 3);

    const publicNews = await requestJson(baseUrl, "/api/public/actualites?limit=24");
    assert.equal(publicNews.response.status, 200);
    assert.ok(publicNews.body.donnees.elements.length >= 10);

    const publicContact = await requestJson(baseUrl, "/api/public/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nomComplet: "Smoke Contact",
        email: "smoke.contact@lr16cnstn02.tn",
        sujet: "Verification Release 1",
        message: "Message de test pour le formulaire public de contact.",
      }),
    });
    assert.equal(publicContact.response.status, 201);

    const registrationRefs = await requestJson(baseUrl, "/api/auth/inscription/references");
    assert.equal(registrationRefs.response.status, 200);

    const registrationForm = new FormData();
    registrationForm.set("nom", "Smoke");
    registrationForm.set("prenom", "Researcher");
    registrationForm.set("nomJeuneFille", "");
    registrationForm.set("dateNaissance", "1998-05-12");
    registrationForm.set("lieuNaissance", "Tunis");
    registrationForm.set("sexe", "FEMME");
    registrationForm.set("cin", registrationCin);
    registrationForm.set("passeport", "");
    registrationForm.set("emailInstitutionnel", registrationEmail);
    registrationForm.set("telephone", "+21671000099");
    registrationForm.set("adresse", "Tunis");
    registrationForm.set("grade", "Chercheur");
    registrationForm.set(
      "institutionAffectationId",
      String(registrationRefs.body.donnees.references.institutions[0].id)
    );
    registrationForm.set("dernierDiplomeLibre", "Master en physique");
    registrationForm.set("dateObtentionDiplome", "2024-06-30");
    registrationForm.set("etablissementDiplome", "Faculte des Sciences de Tunis");
    registrationForm.set("orcid", "");
    registrationForm.set(
      "equipeRechercheId",
      String(registrationRefs.body.donnees.references.equipesRecherche[0].id)
    );
    registrationForm.set(
      "laboratoireDenomination",
      registrationRefs.body.donnees.references.laboratoireParDefaut.denomination || "LR16CNSTN02"
    );
    registrationForm.set(
      "laboratoireEtablissement",
      registrationRefs.body.donnees.references.laboratoireParDefaut.etablissement || ""
    );
    registrationForm.set(
      "laboratoireUniversite",
      registrationRefs.body.donnees.references.laboratoireParDefaut.universite || ""
    );
    registrationForm.set(
      "laboratoireResponsable",
      registrationRefs.body.donnees.references.laboratoireParDefaut.responsable || ""
    );
    registrationForm.set("estDoctorant", "false");
    registrationForm.set("sujetRecherche", "");
    registrationForm.set("pourcentageAvancement", "");
    registrationForm.set("anneeUniversitairePremiereInscription", "");
    registrationForm.set("universiteInscription", "");
    registrationForm.set("directeurThese", "");
    registrationForm.set("motDePasse", "Lab2026!");
    registrationForm.set("confirmationMotDePasse", "Lab2026!");
    registrationForm.set("conditionsAcceptees", "true");

    const registrationResponse = await fetch(buildUrl(baseUrl, "/api/auth/inscription"), {
      method: "POST",
      body: registrationForm,
    });
    assert.equal(registrationResponse.status, 201);

    const pendingLogin = await requestJson(baseUrl, "/api/auth/connexion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailInstitutionnel: registrationEmail,
        motDePasse: "Lab2026!",
      }),
    });
    assert.equal(pendingLogin.response.status, 403);

    const forgotPassword = await requestJson(baseUrl, "/api/auth/mot-de-passe-oublie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailInstitutionnel: "member@lr16cnstn02.tn",
      }),
    });
    assert.equal(forgotPassword.response.status, 200);
    assert.ok(forgotPassword.body.donnees.resetUrl);

    const memberToken = await login(baseUrl, "member@lr16cnstn02.tn", "Lab2026!");
    const adminToken = await login(baseUrl, "admin@lr16cnstn02.tn", "Lab2026!");
    const labHeadToken = await login(baseUrl, "labhead@lr16cnstn02.tn", "Lab2026!");

    const unauthorizedMemberProfile = await requestJson(baseUrl, "/api/membre/profil");
    assert.equal(unauthorizedMemberProfile.response.status, 401);

    const forbiddenAdmin = await requestJson(baseUrl, "/api/admin/comptes", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(forbiddenAdmin.response.status, 403);

    const forbiddenChefRoute = await requestJson(baseUrl, "/api/chef-labo/articles", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(forbiddenChefRoute.response.status, 403);

    const memberProfile = await requestJson(baseUrl, "/api/membre/profil", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberProfile.response.status, 200);

    const memberArticles = await requestJson(baseUrl, "/api/membre/articles/mes-articles", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberArticles.response.status, 200);
    assert.ok(memberArticles.body.donnees.articles.length >= 4);

    const memberLookup = await requestJson(baseUrl, "/api/membre/membres", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(memberLookup.response.status, 200);
    assert.ok(memberLookup.body.donnees.elements.length >= 2);

    const articleSearch = await requestJson(baseUrl, "/api/membre/articles/recherche?q=Release%201", {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(articleSearch.response.status, 200);

    const adminRegistrations = await requestJson(baseUrl, "/api/admin/inscriptions", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(adminRegistrations.response.status, 200);
    const pendingRegistration = adminRegistrations.body.donnees.inscriptions.find(
      (item) => item.emailInstitutionnel === registrationEmail
    );
    assert.ok(pendingRegistration);

    const validateRegistration = await requestJson(
      baseUrl,
      `/api/admin/inscriptions/${pendingRegistration.id}/valider`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "MEMBRE",
        }),
      }
    );
    assert.equal(validateRegistration.response.status, 200);

    const validatedLogin = await requestJson(baseUrl, "/api/auth/connexion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailInstitutionnel: registrationEmail,
        motDePasse: "Lab2026!",
      }),
    });
    assert.equal(validatedLogin.response.status, 200);

    const adminAccounts = await requestJson(baseUrl, "/api/admin/comptes", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.equal(adminAccounts.response.status, 200);

    const labHeadArticles = await requestJson(baseUrl, "/api/chef-labo/articles", {
      headers: {
        Authorization: `Bearer ${labHeadToken}`,
      },
    });
    assert.equal(labHeadArticles.response.status, 200);
    assert.ok(labHeadArticles.body.donnees.articles.length >= 1);
    assert.ok(labHeadArticles.body.donnees.articlesValides.length >= 1);

    const articleToValidate = labHeadArticles.body.donnees.articles[0];
    const articleValidation = await requestJson(
      baseUrl,
      `/api/chef-labo/articles/${articleToValidate.id}/valider`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
        },
      }
    );
    assert.equal(articleValidation.response.status, 200);

    const articleToPublish = labHeadArticles.body.donnees.articlesValides[0];
    const articlePublication = await requestJson(
      baseUrl,
      `/api/chef-labo/articles/${articleToPublish.id}/publier`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${labHeadToken}`,
        },
      }
    );
    assert.equal(articlePublication.response.status, 200);

    const createNews = await requestJson(baseUrl, "/api/chef-labo/actualites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${labHeadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        titre: `Actualite smoke ${Date.now()}`,
        resume: "Actualite de test",
        contenu: "Contenu de test pour la gestion des actualites.",
        statut: "BROUILLON",
      }),
    });
    assert.equal(createNews.response.status, 201);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
