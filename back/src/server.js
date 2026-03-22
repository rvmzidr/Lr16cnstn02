const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");

async function bootstrap() {
  await prisma.$connect();

  app.listen(env.port, () => {
    console.log(
      `${env.appName} demarree sur http://localhost:${env.port}/api`
    );
  });
}

bootstrap().catch((error) => {
  console.error("Impossible de demarrer le serveur:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
