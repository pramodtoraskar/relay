#!/usr/bin/env node
/**
 * Run database migrations (currently applies schema.sql if needed).
 * Usage: node scripts/migrate-db.js [--db-path path/to/relay.db]
 */
const path = require("path");
const fs = require("fs");
const os = require("os");

const dbPath =
  process.argv.includes("--db-path")
    ? process.argv[process.argv.indexOf("--db-path") + 1]
    : process.env.RELAY_DB_PATH || path.join(os.homedir(), ".relay", "relay.db");

const migrationsDir = path.join(__dirname, "..", "packages", "core", "database", "migrations");

function run() {
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  // Actual migration runs on first DB open in DatabaseManager (schema.sql).
  // Here we just ensure the DB directory exists.
  console.log("Migrations: DB path is", dbPath);
  console.log("Schema is applied automatically on first run.");
}

run();
