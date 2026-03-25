const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const path = require("path");
const prisma = require("../config/prisma");
const {
  ACCOUNT_STATUS,
  ARTICLE_STATUS,
  NEWS_STATUS,
  ROLES,
} = require("../config/constants");
const { DOCTORANT_ATTESTATION_STORAGE_DIR } = require("../config/member-profile");

const DEMO_PASSWORD = "Lab2026!";
const DEMO_EMAILS = [
  "pending.researcher@lr16cnstn02.tn",
  "member@lr16cnstn02.tn",
  "admin@lr16cnstn02.tn",
  "labhead@lr16cnstn02.tn",
  "support.member@lr16cnstn02.tn",
  "chef@lr16cnstn02.tn",
  "membre@lr16cnstn02.tn",
  "coauteur@lr16cnstn02.tn",
  "pending@lr16cnstn02.tn",
  "rejected.researcher@lr16cnstn02.tn",
  "inactive.member@lr16cnstn02.tn",
];

const DEMO_ARTICLE_TITLES = [
  "Materiaux irradiables et surveillance environnementale",
  "Prototype de chaine de mesure pour la dosimetrie mobile",
  "Brouillon de protocole pour spectrometrie haute resolution",
  "Article valide avant publication sur la plateforme LR16CNSTN02",
  "Article refuse pour reprise par le membre deposant",
  "Etude collaborative sur la radioanalyse des echantillons complexes",
  "Plan de qualification pour instrumentation neutronique portable",
  "Synthese technique sur la metrologie appliquee aux campagnes terrain",
  "Evaluation multi-sites de la stabilite des capteurs en environnement industriel",
  "Cadre methodologique pour la tracabilite numerique des essais radiochimiques",
];

const DEMO_NEWS_ITEMS = [
  {
    titre: "Lancement officiel de la campagne scientifique Release 1",
    resume:
      "Le laboratoire publie la premiere actualite officielle servant de reference pour la Release 1.",
    contenu:
      "Cette actualite publiee permet de verifier la diffusion publique et membre des nouvelles du laboratoire.",
    equipeCode: "EQ1",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-03-18T09:30:00.000Z",
  },
  {
    titre: "Mise en service du banc pilote de dosimetrie environnementale",
    resume:
      "Une nouvelle infrastructure de mesure renforce le suivi radiologique des environnements sensibles.",
    contenu:
      "Le laboratoire met en service un banc pilote permettant de consolider les campagnes de dosimetrie environnementale et de fiabiliser les protocoles de qualification.",
    equipeCode: "EQ2",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-03-12T10:00:00.000Z",
  },
  {
    titre: "Atelier methodologique sur la spectrometrie gamma a haute resolution",
    resume:
      "Les equipes ont partage leurs retours d'experience pour harmoniser les procedures de mesure.",
    contenu:
      "Cet atelier interne a permis d'aligner les methodes de preparation, d'acquisition et d'interpretation autour des instruments de spectrometrie gamma a haute resolution.",
    equipeCode: "EQ4",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-03-03T08:45:00.000Z",
  },
  {
    titre: "Nouvelle serie d'analyses radiochimiques pour la securite alimentaire",
    resume:
      "Une campagne ciblee renforce la surveillance de plusieurs matrices alimentaires et environnementales.",
    contenu:
      "Les developpements radiochimiques du laboratoire soutiennent une nouvelle serie d'analyses sur des echantillons de reference afin d'ameliorer la tracabilite et la robustesse des resultats.",
    equipeCode: "EQ1",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-02-20T11:15:00.000Z",
  },
  {
    titre: "Cooperation renforcee avec les equipes de modelisation nucleaire appliquee",
    resume:
      "Un cycle de travail transversal accelere le rapprochement entre simulation et experimentation.",
    contenu:
      "Les equipes de modelisation et d'essais experimentaux ont defini un calendrier commun pour partager les jeux de donnees, affiner les hypotheses physiques et mieux prioriser les campagnes a venir.",
    equipeCode: "EQ3",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-02-12T09:10:00.000Z",
  },
  {
    titre: "Publication des premiers indicateurs trimestriels du laboratoire",
    resume:
      "Le laboratoire diffuse un premier tableau de bord de production scientifique et technique.",
    contenu:
      "Cette publication met en avant les tendances de production scientifique, l'avancement des equipes et les chantiers prioritaires de structuration pour le trimestre en cours.",
    equipeCode: "EQ3",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-01-29T07:50:00.000Z",
  },
  {
    titre: "Campagne de maintenance previsionnelle des instruments critiques",
    resume:
      "Une intervention planifiee vise a securiser la disponibilite des equipements de mesure les plus sensibles.",
    contenu:
      "La campagne de maintenance previsionnelle s'appuie sur un inventaire technique actualise pour limiter les interruptions et renforcer la stabilite des mesures sur le moyen terme.",
    equipeCode: "EQ4",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-01-17T13:20:00.000Z",
  },
  {
    titre: "Renforcement du protocole de suivi des echantillons environnementaux",
    resume:
      "De nouvelles etapes de controle qualite sont integrees au circuit de suivi des echantillons.",
    contenu:
      "Les equipes ont affine le protocole de suivi des echantillons environnementaux afin d'ameliorer la tracabilite documentaire, la repetabilite analytique et la coordination entre laboratoires.",
    equipeCode: "EQ1",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2025-12-11T10:40:00.000Z",
  },
  {
    titre: "Validation interne d'un nouveau flux de mesures pour la dosimetrie mobile",
    resume:
      "Le laboratoire a termine une phase de validation interne sur un flux de mesures mobile.",
    contenu:
      "Le nouveau flux de mesures pour la dosimetrie mobile a ete valide apres une serie de tests croises, facilitant les futures campagnes de terrain et la consolidation des rapports.",
    equipeCode: "EQ2",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2025-11-21T08:30:00.000Z",
  },
  {
    titre: "Session scientifique consacree aux applications energetiques des materiaux irradies",
    resume:
      "Une session thematique a permis de recadrer plusieurs pistes de travail sur les usages energetiques.",
    contenu:
      "Cette session scientifique a reuni plusieurs membres autour des applications energetiques des materiaux irradies, avec un focus sur la stabilite des dispositifs et l'interpretation des essais.",
    equipeCode: "EQ2",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2025-10-09T09:00:00.000Z",
  },
  {
    titre: "Preparation du seminaire interne des equipes de recherche",
    resume:
      "Brouillon d'actualite conserve dans l'espace du chef du laboratoire pour verifier le workflow de publication.",
    contenu:
      "Cette actualite reste en brouillon afin de permettre la verification des fonctions de modification et suppression.",
    equipeCode: "EQ3",
    statut: NEWS_STATUS.BROUILLON,
    publieeLe: null,
  },
  {
    titre: "Demarrage du chantier de modernisation du portail membre",
    resume:
      "Une nouvelle phase d'amelioration cible la lisibilite, les tableaux de bord et les flux de validation.",
    contenu:
      "Le laboratoire lance un chantier de modernisation du portail membre afin de consolider les indicateurs, les espaces de suivi et la qualite generale des parcours utilisateur.",
    equipeCode: "EQ4",
    statut: NEWS_STATUS.PUBLIEE,
    publieeLe: "2026-03-20T14:15:00.000Z",
  },
  {
    titre: "Archive technique des actions de maintenance du semestre precedent",
    resume:
      "Une actualite archivee est conservee pour verifier la gestion des historiques et des etats de publication.",
    contenu:
      "Cette entree archivee permet de tester l'affichage des actualites non actives tout en gardant une trace documentaire realiste dans la base de demonstration.",
    equipeCode: "EQ2",
    statut: NEWS_STATUS.ARCHIVEE,
    publieeLe: "2025-09-18T08:10:00.000Z",
  },
];

const DEMO_NEWS_TITLES = DEMO_NEWS_ITEMS.map((item) => item.titre);

async function ensureReferenceData() {
  const institution = await prisma.institutions.upsert({
    where: {
      nom: "Centre National des Sciences et Technologies Nucleaires",
    },
    update: {
      adresse: "Tunis",
      ville: "Tunis",
      pays: "Tunisie",
    },
    create: {
      nom: "Centre National des Sciences et Technologies Nucleaires",
      adresse: "Tunis",
      ville: "Tunis",
      pays: "Tunisie",
    },
  });

  const teams = await Promise.all([
    {
      code: "EQ1",
      nom: "Developpements des techniques radiochimiques dans la securite alimentaire et environnementale",
      description:
        "Equipe axee sur les approches radiochimiques et radio-analytiques appliquees a la securite alimentaire et environnementale.",
    },
    {
      code: "EQ2",
      nom: "Materiaux irradies pour la dosimetrie, la detection, l'environnement et l'energie",
      description:
        "Equipe dediee aux materiaux irradies, a la dosimetrie et a la detection pour l'energie et l'environnement.",
    },
    {
      code: "EQ3",
      nom: "Modelisation physique, applications et developpement experimental pour les systemes nucleaires et les grands instruments",
      description:
        "Equipe de modelisation physique et de developpement experimental pour les systemes nucleaires.",
    },
    {
      code: "EQ4",
      nom: "Instrumentation et modelisation nucleaire pour la dosimetrie, la metrologie, la spectrometrie et la spectroscopie de haute resolution",
      description:
        "Equipe d'instrumentation et de modelisation nucleaire pour la metrologie et la spectrometrie.",
    },
  ].map((team) =>
    prisma.equipes_recherche.upsert({
      where: { code: team.code },
      update: {
        nom: team.nom,
        description: team.description,
        actif: true,
      },
      create: {
        code: team.code,
        nom: team.nom,
        description: team.description,
        actif: true,
      },
    })
  ));

  const degrees = await Promise.all(
    ["Licence", "Master", "Ingenieur", "Doctorat", "HDR"].map((libelle) =>
      prisma.niveaux_diplome.upsert({
        where: { libelle },
        update: {},
        create: { libelle },
      })
    )
  );

  const categories = await Promise.all(
    [
      "ENERGIE",
      "MATERIAUX",
      "ENVIRONNEMENT",
      "DOSIMETRIE",
      "BIO_DOSIMETRIE",
      "RADIO_ANALYSE",
      "RADIOCHIMIE",
      "PHYSIQUE_ATOMIQUE",
      "METROLOGIE",
      "INSTRUMENTATION_NUCLEAIRE",
      "AUTRE",
    ].map((libelle) =>
      prisma.categories_article.upsert({
        where: { libelle },
        update: {},
        create: { libelle },
      })
    )
  );

  return {
    institution,
    teams,
    degrees,
    categories,
  };
}

async function cleanupDemoData() {
  const demoUsers = await prisma.utilisateurs.findMany({
    where: {
      email_institutionnel: {
        in: DEMO_EMAILS,
      },
    },
    select: { id: true },
  });

  const ids = demoUsers.map((user) => user.id);

  if (ids.length === 0) {
    return;
  }

  await prisma.participants_conversation.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.lectures_message.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.notifications.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.messages.deleteMany({
    where: {
      expediteur_id: {
        in: ids,
      },
    },
  });

  await prisma.conversations.deleteMany({
    where: {
      cree_par: {
        in: ids,
      },
    },
  });

  await prisma.messages_contact.deleteMany({
    where: {
      traite_par: {
        in: ids,
      },
    },
  });

  await prisma.commentaires_demande.deleteMany({
    where: {
      auteur_id: {
        in: ids,
      },
    },
  });

  await prisma.decisions_demande.deleteMany({
    where: {
      decidee_par: {
        in: ids,
      },
    },
  });

  await prisma.historiques_demande.deleteMany({
    where: {
      modifie_par: {
        in: ids,
      },
    },
  });

  await prisma.historiques_projet.deleteMany({
    where: {
      effectue_par: {
        in: ids,
      },
    },
  });

  await prisma.membres_projet.deleteMany({
    where: {
      OR: [
        {
          utilisateur_id: {
            in: ids,
          },
        },
        {
          ajoute_par: {
            in: ids,
          },
        },
      ],
    },
  });

  await prisma.pieces_jointes.deleteMany({
    where: {
      ajoute_par: {
        in: ids,
      },
    },
  });

  await prisma.journaux_audit.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.preferences_notification.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.historiques_compte.deleteMany({
    where: {
      OR: [
        {
          utilisateur_id: {
            in: ids,
          },
        },
        {
          modifie_par: {
            in: ids,
          },
        },
      ],
    },
  });

  await prisma.informations_doctorales.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.profils_utilisateur.deleteMany({
    where: {
      utilisateur_id: {
        in: ids,
      },
    },
  });

  await prisma.actualites.deleteMany({
    where: {
      OR: [
        {
          auteur_id: {
            in: ids,
          },
        },
        {
          titre: {
            in: DEMO_NEWS_TITLES,
          },
        },
      ],
    },
  });

  await prisma.articles.deleteMany({
    where: {
      OR: [
        {
          deposant_id: {
            in: ids,
          },
        },
        {
          titre: {
            in: DEMO_ARTICLE_TITLES,
          },
        },
      ],
    },
  });

  await prisma.utilisateurs.deleteMany({
    where: {
      email_institutionnel: {
        in: DEMO_EMAILS,
      },
    },
  });
}

async function writeDoctorantAttestation(fileName, researcherName) {
  await fs.mkdir(DOCTORANT_ATTESTATION_STORAGE_DIR, { recursive: true });
  const filePath = path.join(DOCTORANT_ATTESTATION_STORAGE_DIR, fileName);
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 79 >>
stream
BT
/F1 12 Tf
20 100 Td
(Attestation d'inscription - ${researcherName}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000371 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
441
%%EOF`;

  await fs.writeFile(filePath, pdfContent, "utf8");
  const stats = await fs.stat(filePath);

  return {
    nomOriginal: fileName,
    nomStocke: fileName,
    chemin: filePath,
    typeMime: "application/pdf",
    tailleOctets: BigInt(stats.size),
  };
}

async function createUser({
  email,
  nom,
  prenom,
  nomJeuneFille = null,
  dateNaissance,
  lieuNaissance,
  genre,
  cin = null,
  passeport = null,
  telephone,
  adresse = null,
  role,
  roleDemande = ROLES.MEMBRE,
  statut,
  actif,
  validePar = null,
  valideLe = null,
  motifRejet = null,
}) {
  const motDePasseHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  return prisma.utilisateurs.create({
    data: {
      nom,
      prenom,
      nom_jeune_fille: nomJeuneFille,
      date_naissance: dateNaissance,
      lieu_naissance: lieuNaissance,
      genre,
      cin,
      passeport,
      email_institutionnel: email,
      telephone,
      adresse,
      mot_de_passe_hash: motDePasseHash,
      role_demande: roleDemande,
      role,
      statut,
      conditions_acceptees: true,
      actif,
      valide_par: validePar,
      valide_le: valideLe,
      motif_rejet: motifRejet,
    },
  });
}

async function upsertProfile(userId, data) {
  await prisma.profils_utilisateur.create({
    data: {
      utilisateur_id: userId,
      ...data,
    },
  });
}

async function upsertDoctorat(userId, data) {
  await prisma.informations_doctorales.create({
    data: {
      utilisateur_id: userId,
      ...data,
    },
  });
}

async function createArticle({
  title,
  status,
  deposantId,
  validateurId,
  categorieId,
  coAuthorIds = [],
  rejectionReason = null,
}) {
  const now = new Date();
  const article = await prisma.articles.create({
    data: {
      titre: title,
      resume:
        "Article de demonstration pour verifier le workflow Release 1 de LR16CNSTN02.",
      contenu:
        "Ce contenu de demonstration permet de verifier l'ajout, la moderation, la validation et la publication des articles scientifiques dans la Release 1.",
      deposant_id: deposantId,
      categorie_id: categorieId,
      statut: status,
      date_soumission:
        status === ARTICLE_STATUS.BROUILLON ? null : now,
      valide_par:
        status === ARTICLE_STATUS.VALIDE ||
        status === ARTICLE_STATUS.PUBLIE ||
        status === ARTICLE_STATUS.REJETE
          ? validateurId
          : null,
      date_validation:
        status === ARTICLE_STATUS.VALIDE ||
        status === ARTICLE_STATUS.PUBLIE ||
        status === ARTICLE_STATUS.REJETE
          ? now
          : null,
      motif_rejet: rejectionReason,
      publie_le: status === ARTICLE_STATUS.PUBLIE ? now : null,
      modifie_par: deposantId,
    },
  });

  await prisma.auteurs_article.create({
    data: {
      article_id: article.id,
      utilisateur_id: deposantId,
      ordre_auteur: 1,
      auteur_correspondant: true,
    },
  });

  for (const [index, utilisateurId] of coAuthorIds.entries()) {
    await prisma.auteurs_article.create({
      data: {
        article_id: article.id,
        utilisateur_id: utilisateurId,
        ordre_auteur: index + 2,
        auteur_correspondant: false,
      },
    });
  }

  await prisma.versions_article.create({
    data: {
      article_id: article.id,
      numero_version: 1,
      titre: title,
      resume:
        "Article de demonstration pour verifier le workflow Release 1 de LR16CNSTN02.",
      contenu:
        "Ce contenu de demonstration permet de verifier l'ajout, la moderation, la validation et la publication des articles scientifiques dans la Release 1.",
      sauvegarde_par: deposantId,
    },
  });
}

async function createActualite({
  titre,
  resume,
  contenu,
  auteurId,
  equipeRechercheId,
  statut,
  publieeLe = null,
}) {
  await prisma.actualites.create({
    data: {
      titre,
      resume,
      contenu,
      auteur_id: auteurId,
      equipe_recherche_id: equipeRechercheId,
      statut,
      publiee_le: statut === NEWS_STATUS.PUBLIEE ? publieeLe || new Date() : null,
    },
  });
}

async function main() {
  const { institution, teams, degrees, categories } = await ensureReferenceData();
  await cleanupDemoData();

  const degreeByLabel = Object.fromEntries(
    degrees.map((degree) => [degree.libelle, degree.id])
  );
  const categoryByLabel = Object.fromEntries(
    categories.map((category) => [category.libelle, category.id])
  );
  const teamByCode = Object.fromEntries(
    teams.map((team) => [team.code, team])
  );

  const admin = await createUser({
    email: "admin@lr16cnstn02.tn",
    nom: "Admin",
    prenom: "Plateforme",
    dateNaissance: new Date("1985-04-10"),
    lieuNaissance: "Tunis",
    genre: "FEMME",
    cin: "08544120",
    telephone: "+21671000002",
    adresse: "Tunis",
    role: ROLES.ADMINISTRATEUR,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    valideLe: new Date(),
  });

  const labHead = await createUser({
    email: "labhead@lr16cnstn02.tn",
    nom: "Jelassi",
    prenom: "Haikel",
    dateNaissance: new Date("1975-01-12"),
    lieuNaissance: "Tunis",
    genre: "HOMME",
    passeport: "TNCL1975",
    telephone: "+21671000001",
    adresse: "Tunis",
    role: ROLES.CHEF_LABO,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const member = await createUser({
    email: "member@lr16cnstn02.tn",
    nom: "Amina",
    prenom: "Trabelsi",
    nomJeuneFille: "Ben Salah",
    dateNaissance: new Date("1997-05-18"),
    lieuNaissance: "Sfax",
    genre: "FEMME",
    cin: "11988776",
    telephone: "+21671000003",
    adresse: "Sfax",
    role: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const supportMember = await createUser({
    email: "support.member@lr16cnstn02.tn",
    nom: "Youssef",
    prenom: "Ben Amor",
    dateNaissance: new Date("1989-09-08"),
    lieuNaissance: "Bizerte",
    genre: "HOMME",
    passeport: "TNPA1989",
    telephone: "+21671000004",
    adresse: "Bizerte",
    role: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const pendingApplicant = await createUser({
    email: "pending.researcher@lr16cnstn02.tn",
    nom: "Cherif",
    prenom: "Ines",
    dateNaissance: new Date("1999-03-20"),
    lieuNaissance: "Monastir",
    genre: "FEMME",
    cin: "12877654",
    telephone: "+21671000005",
    adresse: "Monastir",
    role: null,
    roleDemande: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.EN_ATTENTE,
    actif: false,
  });

  const secondaryLabHead = await createUser({
    email: "chef@lr16cnstn02.tn",
    nom: "Mansouri",
    prenom: "Riadh",
    dateNaissance: new Date("1978-11-09"),
    lieuNaissance: "Nabeul",
    genre: "HOMME",
    passeport: "TNCL1978B",
    telephone: "+21671000006",
    adresse: "Nabeul",
    role: ROLES.CHEF_LABO,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const secondMember = await createUser({
    email: "membre@lr16cnstn02.tn",
    nom: "Khalfallah",
    prenom: "Salma",
    dateNaissance: new Date("1995-02-14"),
    lieuNaissance: "Sousse",
    genre: "FEMME",
    cin: "12233445",
    telephone: "+21671000007",
    adresse: "Sousse",
    role: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const coAuthorMember = await createUser({
    email: "coauteur@lr16cnstn02.tn",
    nom: "Ben Yedder",
    prenom: "Mahdi",
    dateNaissance: new Date("1992-08-26"),
    lieuNaissance: "Gabes",
    genre: "HOMME",
    cin: "11770066",
    telephone: "+21671000008",
    adresse: "Gabes",
    role: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.ACTIF,
    actif: true,
    validePar: admin.id,
    valideLe: new Date(),
  });

  const pendingSecond = await createUser({
    email: "pending@lr16cnstn02.tn",
    nom: "Bouazizi",
    prenom: "Nour",
    dateNaissance: new Date("2000-07-12"),
    lieuNaissance: "Kairouan",
    genre: "FEMME",
    passeport: "TNPD2000",
    telephone: "+21671000009",
    adresse: "Kairouan",
    role: null,
    roleDemande: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.EN_ATTENTE,
    actif: false,
  });

  const rejectedApplicant = await createUser({
    email: "rejected.researcher@lr16cnstn02.tn",
    nom: "Gharbi",
    prenom: "Sami",
    dateNaissance: new Date("1998-10-03"),
    lieuNaissance: "Tunis",
    genre: "HOMME",
    cin: "13355667",
    telephone: "+21671000010",
    adresse: "Tunis",
    role: null,
    roleDemande: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.REJETE,
    actif: false,
    validePar: admin.id,
    valideLe: new Date(),
    motifRejet:
      "Dossier incomplet: attestation doctorale manquante et informations institutionnelles a mettre a jour.",
  });

  const inactiveMember = await createUser({
    email: "inactive.member@lr16cnstn02.tn",
    nom: "Ayadi",
    prenom: "Karim",
    dateNaissance: new Date("1987-01-28"),
    lieuNaissance: "Tataouine",
    genre: "HOMME",
    passeport: "TNDS1987",
    telephone: "+21671000011",
    adresse: "Tataouine",
    role: ROLES.MEMBRE,
    statut: ACCOUNT_STATUS.DESACTIVE,
    actif: false,
    validePar: admin.id,
    valideLe: new Date("2026-02-10T09:00:00.000Z"),
    motifRejet: "Compte desactive temporairement suite a un changement d'affectation.",
  });

  await upsertProfile(admin.id, {
    grade: "Administrateur technique",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Master en informatique",
    niveau_diplome_id: degreeByLabel.Master,
    date_obtention_diplome: new Date("2010-06-30"),
    etablissement_diplome: "ISI Tunis",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[0].id,
    orcid: "0000-0000-0000-1001",
  });

  await upsertProfile(labHead.id, {
    grade: "Professeur",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Doctorat d'Etat en physique nucleaire",
    niveau_diplome_id: degreeByLabel.HDR,
    date_obtention_diplome: new Date("2003-06-30"),
    etablissement_diplome: "Universite de Tunis El Manar",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[2].id,
    orcid: "0000-0000-0000-1002",
  });

  await upsertProfile(member.id, {
    grade: "Doctorant",
    institution_affectation_id: institution.id,
    est_doctorant: true,
    dernier_diplome_libre: "Master en physique appliquee",
    niveau_diplome_id: degreeByLabel.Doctorat,
    date_obtention_diplome: new Date("2023-06-30"),
    etablissement_diplome: "Faculte des Sciences de Tunis",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[1].id,
    orcid: "0000-0000-0000-1003",
  });

  await upsertProfile(supportMember.id, {
    grade: "Maitre assistant",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "HDR",
    niveau_diplome_id: degreeByLabel.HDR,
    date_obtention_diplome: new Date("2021-07-15"),
    etablissement_diplome: "Ecole nationale d'ingenieurs",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[0].id,
    orcid: "0000-0000-0000-1004",
  });

  await upsertProfile(pendingApplicant.id, {
    grade: "Doctorant",
    institution_affectation_id: institution.id,
    est_doctorant: true,
    dernier_diplome_libre: "Master en energie",
    niveau_diplome_id: degreeByLabel.Doctorat,
    date_obtention_diplome: new Date("2024-06-30"),
    etablissement_diplome: "Faculte des Sciences de Sousse",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[3].id,
    orcid: "0000-0000-0000-1005",
  });

  await upsertProfile(secondaryLabHead.id, {
    grade: "Professeur associe",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Doctorat en instrumentation nucleaire",
    niveau_diplome_id: degreeByLabel.HDR,
    date_obtention_diplome: new Date("2006-06-30"),
    etablissement_diplome: "Universite de Tunis El Manar",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[3].id,
    orcid: "0000-0000-0000-1006",
  });

  await upsertProfile(secondMember.id, {
    grade: "Maitre assistante",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Doctorat en radiochimie",
    niveau_diplome_id: degreeByLabel.Doctorat,
    date_obtention_diplome: new Date("2022-06-30"),
    etablissement_diplome: "Faculte des Sciences de Tunis",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[0].id,
    orcid: "0000-0000-0000-1007",
  });

  await upsertProfile(coAuthorMember.id, {
    grade: "Chercheur associe",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Master en instrumentation",
    niveau_diplome_id: degreeByLabel.Master,
    date_obtention_diplome: new Date("2018-06-30"),
    etablissement_diplome: "ENIT",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[2].id,
    orcid: "0000-0000-0000-1008",
  });

  await upsertProfile(pendingSecond.id, {
    grade: "Doctorant",
    institution_affectation_id: institution.id,
    est_doctorant: true,
    dernier_diplome_libre: "Master en metrologie",
    niveau_diplome_id: degreeByLabel.Doctorat,
    date_obtention_diplome: new Date("2024-06-30"),
    etablissement_diplome: "Faculte des Sciences de Gabes",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[1].id,
    orcid: "0000-0000-0000-1009",
  });

  await upsertProfile(rejectedApplicant.id, {
    grade: "Doctorant",
    institution_affectation_id: institution.id,
    est_doctorant: true,
    dernier_diplome_libre: "Master en physique nucleaire",
    niveau_diplome_id: degreeByLabel.Doctorat,
    date_obtention_diplome: new Date("2024-06-30"),
    etablissement_diplome: "Universite de Carthage",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[2].id,
    orcid: "0000-0000-0000-1010",
  });

  await upsertProfile(inactiveMember.id, {
    grade: "Ingenieur de recherche",
    institution_affectation_id: institution.id,
    est_doctorant: false,
    dernier_diplome_libre: "Ingenieur en genie nucleaire",
    niveau_diplome_id: degreeByLabel.Ingenieur,
    date_obtention_diplome: new Date("2012-06-30"),
    etablissement_diplome: "ENIS",
    laboratoire_denomination: "LR16CNSTN02",
    laboratoire_etablissement: institution.nom,
    laboratoire_universite: "Universite de Tunis",
    laboratoire_responsable: "Pr. Haikel JELASSI",
    equipe_recherche_id: teams[1].id,
    orcid: "0000-0000-0000-1011",
  });

  const memberAttestation = await writeDoctorantAttestation(
    "attestation-member-lr16cnstn02.pdf",
    "Amina Trabelsi"
  );
  const pendingAttestation = await writeDoctorantAttestation(
    "attestation-pending-lr16cnstn02.pdf",
    "Ines Cherif"
  );
  const pendingSecondAttestation = await writeDoctorantAttestation(
    "attestation-pending-second-lr16cnstn02.pdf",
    "Nour Bouazizi"
  );
  const rejectedAttestation = await writeDoctorantAttestation(
    "attestation-rejected-lr16cnstn02.pdf",
    "Sami Gharbi"
  );

  await upsertDoctorat(member.id, {
    sujet_recherche:
      "Capteurs dosimetriques hybrides pour la surveillance radiologique des environnements sensibles",
    pourcentage_avancement: 68,
    annee_premiere_inscription: 2023,
    annee_universitaire_premiere_inscription: "2023/2024",
    universite_inscription: "Universite de Tunis",
    directeur_these: "Pr. Nadia Ben Salem",
    attestation_nom_original: memberAttestation.nomOriginal,
    attestation_nom_stocke: memberAttestation.nomStocke,
    attestation_chemin: memberAttestation.chemin,
    attestation_type_mime: memberAttestation.typeMime,
    attestation_taille_octets: memberAttestation.tailleOctets,
    attestation_deposee_le: new Date(),
  });

  await upsertDoctorat(pendingApplicant.id, {
    sujet_recherche:
      "Optimisation des capteurs neutroniques pour la surveillance environnementale",
    pourcentage_avancement: 35,
    annee_premiere_inscription: 2024,
    annee_universitaire_premiere_inscription: "2024/2025",
    universite_inscription: "Universite de Monastir",
    directeur_these: "Pr. Sami Gharbi",
    attestation_nom_original: pendingAttestation.nomOriginal,
    attestation_nom_stocke: pendingAttestation.nomStocke,
    attestation_chemin: pendingAttestation.chemin,
    attestation_type_mime: pendingAttestation.typeMime,
    attestation_taille_octets: pendingAttestation.tailleOctets,
    attestation_deposee_le: new Date(),
  });

  await upsertDoctorat(pendingSecond.id, {
    sujet_recherche:
      "Metrologie portable pour le suivi radiologique en environnement ouvert",
    pourcentage_avancement: 22,
    annee_premiere_inscription: 2024,
    annee_universitaire_premiere_inscription: "2024/2025",
    universite_inscription: "Universite de Gabes",
    directeur_these: "Pr. Olfa Siala",
    attestation_nom_original: pendingSecondAttestation.nomOriginal,
    attestation_nom_stocke: pendingSecondAttestation.nomStocke,
    attestation_chemin: pendingSecondAttestation.chemin,
    attestation_type_mime: pendingSecondAttestation.typeMime,
    attestation_taille_octets: pendingSecondAttestation.tailleOctets,
    attestation_deposee_le: new Date(),
  });

  await upsertDoctorat(rejectedApplicant.id, {
    sujet_recherche:
      "Caracterisation radiologique de matrices complexes en laboratoire pilote",
    pourcentage_avancement: 14,
    annee_premiere_inscription: 2025,
    annee_universitaire_premiere_inscription: "2025/2026",
    universite_inscription: "Universite de Carthage",
    directeur_these: "Pr. Hichem Karray",
    attestation_nom_original: rejectedAttestation.nomOriginal,
    attestation_nom_stocke: rejectedAttestation.nomStocke,
    attestation_chemin: rejectedAttestation.chemin,
    attestation_type_mime: rejectedAttestation.typeMime,
    attestation_taille_octets: rejectedAttestation.tailleOctets,
    attestation_deposee_le: new Date("2026-01-12T08:30:00.000Z"),
  });

  for (const actualite of DEMO_NEWS_ITEMS) {
    await createActualite({
      titre: actualite.titre,
      resume: actualite.resume,
      contenu: actualite.contenu,
      auteurId: actualite.equipeCode === "EQ4" ? secondaryLabHead.id : labHead.id,
      equipeRechercheId: teamByCode[actualite.equipeCode].id,
      statut: actualite.statut,
      publieeLe: actualite.publieeLe ? new Date(actualite.publieeLe) : null,
    });
  }

  await createArticle({
    title: "Materiaux irradiables et surveillance environnementale",
    status: ARTICLE_STATUS.PUBLIE,
    deposantId: member.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.MATERIAUX,
    coAuthorIds: [supportMember.id],
  });

  await createArticle({
    title: "Prototype de chaine de mesure pour la dosimetrie mobile",
    status: ARTICLE_STATUS.SOUMIS,
    deposantId: member.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.DOSIMETRIE,
    coAuthorIds: [supportMember.id],
  });

  await createArticle({
    title: "Brouillon de protocole pour spectrometrie haute resolution",
    status: ARTICLE_STATUS.BROUILLON,
    deposantId: member.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.INSTRUMENTATION_NUCLEAIRE,
  });

  await createArticle({
    title: "Article valide avant publication sur la plateforme LR16CNSTN02",
    status: ARTICLE_STATUS.VALIDE,
    deposantId: member.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.ENERGIE,
  });

  await createArticle({
    title: "Article refuse pour reprise par le membre deposant",
    status: ARTICLE_STATUS.REJETE,
    deposantId: member.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.ENVIRONNEMENT,
    rejectionReason:
      "Le chef du laboratoire demande des precisions methodologiques avant une nouvelle soumission.",
  });

  await createArticle({
    title: "Etude collaborative sur la radioanalyse des echantillons complexes",
    status: ARTICLE_STATUS.PUBLIE,
    deposantId: secondMember.id,
    validateurId: secondaryLabHead.id,
    categorieId: categoryByLabel.RADIO_ANALYSE,
    coAuthorIds: [coAuthorMember.id, supportMember.id],
  });

  await createArticle({
    title: "Plan de qualification pour instrumentation neutronique portable",
    status: ARTICLE_STATUS.SOUMIS,
    deposantId: coAuthorMember.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.INSTRUMENTATION_NUCLEAIRE,
    coAuthorIds: [member.id],
  });

  await createArticle({
    title: "Synthese technique sur la metrologie appliquee aux campagnes terrain",
    status: ARTICLE_STATUS.VALIDE,
    deposantId: supportMember.id,
    validateurId: secondaryLabHead.id,
    categorieId: categoryByLabel.METROLOGIE,
    coAuthorIds: [secondMember.id],
  });

  await createArticle({
    title:
      "Evaluation multi-sites de la stabilite des capteurs en environnement industriel",
    status: ARTICLE_STATUS.PUBLIE,
    deposantId: secondMember.id,
    validateurId: labHead.id,
    categorieId: categoryByLabel.ENVIRONNEMENT,
    coAuthorIds: [member.id, coAuthorMember.id],
  });

  await createArticle({
    title:
      "Cadre methodologique pour la tracabilite numerique des essais radiochimiques",
    status: ARTICLE_STATUS.SOUMIS,
    deposantId: supportMember.id,
    validateurId: secondaryLabHead.id,
    categorieId: categoryByLabel.RADIO_ANALYSE,
    coAuthorIds: [secondMember.id],
  });

  console.log("Jeu de demonstration Release 1 initialise.");
  console.log("Visiteur : routes publiques uniquement.");
  console.log("Pending applicant : pending.researcher@lr16cnstn02.tn / Lab2026!");
  console.log("Pending applicant 2 : pending@lr16cnstn02.tn / Lab2026!");
  console.log("Member : member@lr16cnstn02.tn / Lab2026!");
  console.log("Member 2 : membre@lr16cnstn02.tn / Lab2026!");
  console.log("Admin : admin@lr16cnstn02.tn / Lab2026!");
  console.log("Lab Head : labhead@lr16cnstn02.tn / Lab2026!");
  console.log("Lab Head 2 : chef@lr16cnstn02.tn / Lab2026!");
  console.log("Support member : support.member@lr16cnstn02.tn / Lab2026!");
  console.log("Co-author member : coauteur@lr16cnstn02.tn / Lab2026!");
  console.log("Rejected applicant : rejected.researcher@lr16cnstn02.tn / Lab2026!");
  console.log("Inactive member : inactive.member@lr16cnstn02.tn / Lab2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
