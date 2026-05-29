const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const requiredVariables = ["DATABASE_URL", "JWT_SECRET"];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`La variable d'environnement ${variable} est obligatoire.`);
  }
}

const JWT_SECRET_MIN_LENGTH = 32;
const JWT_SECRET_WEAK_PATTERN = /change-this|secret|password|123|example|default/i;
const isProduction = process.env.NODE_ENV === "production";

if (process.env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH) {
  const message = `JWT_SECRET trop court (${process.env.JWT_SECRET.length} caracteres). Minimum recommande: ${JWT_SECRET_MIN_LENGTH}. Generez un secret avec: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`;

  if (isProduction) {
    throw new Error(message);
  }

  console.warn(`[env] AVERTISSEMENT: ${message}`);
}

if (isProduction && JWT_SECRET_WEAK_PATTERN.test(process.env.JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET semble etre une valeur par defaut. Generez un secret aleatoire fort pour la production.",
  );
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
