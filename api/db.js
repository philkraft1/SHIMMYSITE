const fs = require("fs");
const path = require("path");

const databaseUrl = process.env.DATABASE_URL || "";
const usePostgres = Boolean(databaseUrl);

let sqlite = null;
let pgPool = null;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

async function initDb() {
  if (usePostgres) {
    const { Pool } = require("pg");
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        signup_count INTEGER NOT NULL DEFAULT 1,
        last_signup_at TIMESTAMPTZ NOT NULL,
        source TEXT
      );

      CREATE TABLE IF NOT EXISTS newsletter_signups (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        email TEXT NOT NULL,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
    `);
    return { driver: "postgres" };
  }

  const { DatabaseSync } = require("node:sqlite");
  const dataDir = path.join(__dirname, "data");
  const dbPath = path.join(dataDir, "customers.db");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  sqlite = new DatabaseSync(dbPath);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      signup_count INTEGER NOT NULL DEFAULT 1,
      last_signup_at TEXT NOT NULL,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS newsletter_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      source TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
  `);
  return { driver: "sqlite", dbPath };
}

async function upsertNewsletterSignup(email, source) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Valid email is required.");
  }

  const now = new Date().toISOString();
  const src = source || "homepage-newsletter";

  if (usePostgres) {
    const existing = await pgPool.query(
      "SELECT * FROM customers WHERE lower(email) = lower($1)",
      [normalized]
    );

    let customer;
    let recurring = false;

    if (existing.rows[0]) {
      recurring = true;
      const updated = await pgPool.query(
        `UPDATE customers
         SET signup_count = signup_count + 1,
             last_signup_at = $1,
             updated_at = $1,
             source = COALESCE($2, source)
         WHERE id = $3
         RETURNING *`,
        [now, src, existing.rows[0].id]
      );
      customer = updated.rows[0];
    } else {
      const inserted = await pgPool.query(
        `INSERT INTO customers (email, created_at, updated_at, signup_count, last_signup_at, source)
         VALUES ($1, $2, $2, 1, $2, $3)
         RETURNING *`,
        [normalized, now, src]
      );
      customer = inserted.rows[0];
    }

    await pgPool.query(
      `INSERT INTO newsletter_signups (customer_id, email, source, created_at)
       VALUES ($1, $2, $3, $4)`,
      [customer.id, normalized, src, now]
    );

    return { customer, recurring };
  }

  const existing = sqlite
    .prepare("SELECT * FROM customers WHERE email = ?")
    .get(normalized);

  let customerId;
  let recurring = false;

  if (existing) {
    recurring = true;
    customerId = existing.id;
    sqlite
      .prepare(
        `UPDATE customers
         SET signup_count = signup_count + 1,
             last_signup_at = ?,
             updated_at = ?,
             source = COALESCE(?, source)
         WHERE id = ?`
      )
      .run(now, now, src, customerId);
  } else {
    const result = sqlite
      .prepare(
        `INSERT INTO customers (email, created_at, updated_at, signup_count, last_signup_at, source)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(normalized, now, now, now, src);
    customerId = Number(result.lastInsertRowid);
  }

  sqlite
    .prepare(
      `INSERT INTO newsletter_signups (customer_id, email, source, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(customerId, normalized, src, now);

  const customer = sqlite
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId);

  return { customer, recurring };
}

async function listCustomers() {
  if (usePostgres) {
    const result = await pgPool.query(
      `SELECT id, email, created_at, updated_at, signup_count, last_signup_at, source
       FROM customers
       ORDER BY last_signup_at DESC`
    );
    return result.rows;
  }

  return sqlite
    .prepare(
      `SELECT id, email, created_at, updated_at, signup_count, last_signup_at, source
       FROM customers
       ORDER BY last_signup_at DESC`
    )
    .all();
}

function getDbInfo() {
  return {
    driver: usePostgres ? "postgres" : "sqlite",
    databaseUrlSet: usePostgres,
  };
}

module.exports = {
  initDb,
  upsertNewsletterSignup,
  listCustomers,
  normalizeEmail,
  getDbInfo,
};
