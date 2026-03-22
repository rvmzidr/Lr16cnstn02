const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Commande en echec: ${command} ${args.join(" ")}`);
  }
}

function ensurePrismaClientGenerated() {
  const prismaClientEntry = path.resolve(
    __dirname,
    "../../node_modules/.prisma/client/index.js"
  );

  if (fsSync.existsSync(prismaClientEntry)) {
    return;
  }

  runCommand("npx", ["prisma", "generate"]);
}

async function importSqlDumpIfPresent(config) {
  const importFile = process.env.MYSQL_IMPORT_SQL_FILE?.trim();

  if (!importFile) {
    return false;
  }

  const resolvedPath = path.resolve(path.join(__dirname, "../.."), importFile);
  const sql = await fs.readFile(resolvedPath, "utf8");
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    console.log(`Import SQL termine depuis ${resolvedPath}`);
    return true;
  } finally {
    await connection.end();
  }
}

async function main() {
  const config = parseMysqlUrl(env.databaseUrl);

  runCommand("node", ["src/scripts/createMysqlDatabase.js"]);
  await importSqlDumpIfPresent(config);
  ensurePrismaClientGenerated();
  runCommand("npx", ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"]);
  runCommand("node", ["src/scripts/seedDemo.js"]);
}

main().catch((error) => {
  console.error("Bootstrap MySQL impossible:", error);
  process.exit(1);
});
