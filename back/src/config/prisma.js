const { PrismaClient } = require("@prisma/client");
const env = require("./env");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__lr16cnstn02Prisma ||
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.__lr16cnstn02Prisma = prisma;
}

module.exports = prisma;
