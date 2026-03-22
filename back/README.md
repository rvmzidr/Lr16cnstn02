# LR16CNSTN02 Back

API Express/Prisma pour la Release 1 de la plateforme de gestion du laboratoire LR16CNSTN02.

## Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT
- bcryptjs
- Zod

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
```

`FRONTEND_URL` peut contenir plusieurs origines separees par des virgules (ex: `http://localhost:5173,http://localhost:4200`).

## Scripts utiles

```bash
npm run dev
npm run start
npm run prisma:pull
npm run prisma:generate
npm run seed:demo
```

## Comptes de demonstration

- `pending.researcher@lr16cnstn02.tn` / `Lab2026!`
- `member@lr16cnstn02.tn` / `Lab2026!`
- `admin@lr16cnstn02.tn` / `Lab2026!`
- `labhead@lr16cnstn02.tn` / `Lab2026!`
- `support.member@lr16cnstn02.tn` / `Lab2026!`
