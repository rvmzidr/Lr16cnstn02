const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const requiredVariables = ["DATABASE_URL", "JWT_SECRET"];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`La variable d'environnement ${variable} est obligatoire.`);
  }
}

const LOCAL_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4200",
  "http://127.0.0.1:4200",
];

const configuredFrontendOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendOrigins = Array.from(
  new Set([...configuredFrontendOrigins, ...LOCAL_FRONTEND_ORIGINS]),
);

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  frontendUrl: configuredFrontendOrigins[0] || "http://localhost:5173",
  frontendOrigins,
  appName: process.env.APP_NAME || "Plateforme LR16CNSTN02",
});

module.exports = env;
