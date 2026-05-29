# Plateforme LR16CNSTN02

Plateforme de gestion du laboratoire **LR16CNSTN02** (Centre National des Sciences et Technologies Nucleaires, Universite de Tunis).

Application web full-stack : portail public, espace membre, espace chef de laboratoire, espace administrateur technique.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Angular 21 (standalone components, signals, lazy loading) + Tailwind CSS v4 + Lucide Icons + Chart.js |
| Backend | Node.js + Express 5 + Prisma ORM |
| Base de donnees | MySQL 8 |
| Authentification | JWT (bcrypt) + RBAC a 3 niveaux (role + module + permission) |
| Validation | Zod (backend) |
| Generation PDF | PDFKit |
| Securite | Helmet + express-rate-limit + CORS configure |

## Structure du depot

```
.
├── back/          # API Express + Prisma
├── front/         # Application Angular
└── docs/          # Rapport academique + diagrammes UML + product backlog
```

## Demarrage rapide

### Pre-requis

- Node.js 20+
- MySQL 8+ local ou distant
- npm 10+

### Backend

```bash
cd back
npm install
cp .env.example .env          # puis remplir JWT_SECRET, DATABASE_URL...
npm run prisma:generate
npm run seed:demo
npm run dev                   # http://localhost:4000/api
```

> Genere un secret JWT fort avec :
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Frontend

```bash
cd front
npm install
npm start                     # http://localhost:4200 (proxy vers le back)
```

## Comptes de demonstration

| Role | Email | Mot de passe |
|---|---|---|
| Membre actif | `member@lr16cnstn02.tn` | `Lab2026!` |
| Chef de laboratoire | `labhead@lr16cnstn02.tn` | `Lab2026!` |
| Administrateur technique | `admin@lr16cnstn02.tn` | `Lab2026!` |
| Membre en attente de validation | `pending.researcher@lr16cnstn02.tn` | `Lab2026!` |
| Membre support | `support.member@lr16cnstn02.tn` | `Lab2026!` |

> Comptes de demonstration uniquement. A desactiver et a regenerer avant tout deploiement.

## Releases

- **Release 1** — portail public, authentification, inscription, workflow articles scientifiques (PBI 1-13)
- **Release 2** — dashboards par role, projets, demandes d'achat, messagerie, support, controle d'acces granulaire (PBI 14-31)
- **Release 3** — statistiques avancees, journal d'audit, recherche transverse, notifications email *(en cours)* (PBI 32-36)

Detail du product backlog et planification : [docs/product-backlog-releases.md](docs/product-backlog-releases.md).

## Securite

- Authentification JWT (expiration 8h, secret fort obligatoire >= 32 caracteres)
- Hashage bcrypt des mots de passe (rounds = 10)
- RBAC a trois niveaux : role applicatif -> visibilite modules -> permissions granulaires + overrides utilisateur
- Validation Zod systematique sur tous les inputs (body, query, params)
- Headers de securite via Helmet (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting sur les routes sensibles :
  - `/api/auth/connexion`, `/api/auth/inscription` : 10 requetes / 15 min
  - `/api/auth/mot-de-passe-oublie`, `/api/auth/reinitialiser-mot-de-passe` : 3 requetes / heure
  - `/api/public/contact` : 5 requetes / heure
- Uploads en memoire avec validation MIME et limites de taille
- CORS restreint aux origines autorisees via `FRONTEND_URL`
- Fichiers stockes hors du depot Git (dossier `back/storage/` ignore)

## Scripts utiles (backend)

```bash
npm run dev            # demarre en mode developpement (nodemon)
npm run start          # demarre en mode production
npm run prisma:pull    # synchronise le schema Prisma depuis la base
npm run prisma:generate
npm run seed:demo      # initialise les donnees de demonstration
npm test               # lance la suite de tests fumee
```

## Scripts utiles (frontend)

```bash
npm start              # serve (proxy /api -> http://localhost:4000)
npm run build          # build production dans front/dist/
npm test               # tests Karma + Jasmine
```

## Documentation

- [Product backlog et releases](docs/product-backlog-releases.md)
- [Diagrammes Release 2 - Chapitre 4](docs/release-2-diagrammes-chapitre-4.md)
- Rapport academique : `docs/Rapport_Chapitres_3_4_Releases_LR16CNSTN02.docx`

## Licence

Projet academique - usage interne LR16CNSTN02.
