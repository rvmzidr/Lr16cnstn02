# LR16CNSTN02 Back

API Express/Prisma pour la plateforme de gestion du laboratoire LR16CNSTN02.

## Stack

- Node.js
- Express.js 5
- MySQL 8
- Prisma ORM
- JWT (jsonwebtoken)
- bcryptjs
- Zod
- Helmet
- express-rate-limit
- Multer
- PDFKit

## Lancement

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run seed:demo
npm run dev
```

Le script `npm run dev` regenere automatiquement Prisma Client avant demarrage.

## Variables d'environnement

```env
DATABASE_URL=
PORT=
JWT_SECRET=
JWT_EXPIRES_IN=
FRONTEND_URL=
APP_NAME=
NODE_ENV=
```

`FRONTEND_URL` peut contenir plusieurs origines separees par des virgules (ex: `http://localhost:5173,http://localhost:4200`).

`JWT_SECRET` doit faire au moins 32 caracteres. Genere un secret fort avec :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Securite

- Helmet active sur toutes les reponses (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting sur les endpoints sensibles :
  - `/api/auth/connexion`, `/api/auth/inscription` : 10 req / 15 min
  - `/api/auth/mot-de-passe-oublie`, `/api/auth/reinitialiser-mot-de-passe` : 3 req / heure
  - `/api/public/contact` : 5 req / heure
- Validation Zod systematique sur params, body et query
- JWT 8h, secret fort obligatoire, validation au demarrage
- bcrypt rounds = 10
- CORS restreint aux origines listees dans `FRONTEND_URL`
- Fichiers uploades stockes hors du depot Git (`storage/`)

## Scripts utiles

```bash
npm run dev
npm run start
npm run prisma:pull
npm run prisma:generate
npm run seed:demo
npm test
```

## Comptes de demonstration

| Role | Email | Mot de passe |
|---|---|---|
| Membre en attente | `pending.researcher@lr16cnstn02.tn` | `Lab2026!` |
| Membre actif | `member@lr16cnstn02.tn` | `Lab2026!` |
| Administrateur | `admin@lr16cnstn02.tn` | `Lab2026!` |
| Chef de laboratoire | `labhead@lr16cnstn02.tn` | `Lab2026!` |
| Membre support | `support.member@lr16cnstn02.tn` | `Lab2026!` |

> A ne JAMAIS conserver tels quels en production.
