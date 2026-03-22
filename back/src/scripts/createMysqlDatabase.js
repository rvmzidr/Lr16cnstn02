const mysql = require("mysql2/promise");
const env = require("../config/env");

function parseMysqlUrl(databaseUrl) {
  const url = new URL(databaseUrl);

  if (url.protocol !== "mysql:") {
    throw new Error(
      `DATABASE_URL doit utiliser mysql:// pour Laragon/MySQL. Valeur recue: ${url.protocol}`
    );
  }

  const database = url.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL doit contenir un nom de base de donnees MySQL.");
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

async function main() {
  const config = parseMysqlUrl(env.databaseUrl);
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    console.log(`Base MySQL prete: ${config.database}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Creation de la base MySQL impossible:", error);
  process.exit(1);
});
