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

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_date DATE NOT NULL,
        booking_time TEXT,
        service TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        guests INTEGER,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'requested',
        created_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (booking_date);

      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        published_at TIMESTAMPTZ NOT NULL,
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

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_date TEXT NOT NULL,
      booking_time TEXT,
      service TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      guests INTEGER,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL
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

const ALLOWED_SERVICES = new Set([
  "ranch-visit",
  "village-puppies",
  "birthday-party",
  "traveling-ranch",
  "photo-shoot",
  "other",
]);

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

async function createBooking(input) {
  const bookingDate = String(input.bookingDate || "").trim();
  const service = String(input.service || "").trim();
  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email);
  const phone = String(input.phone || "").trim();
  const notes = String(input.notes || "").trim();
  const bookingTime = String(input.bookingTime || "").trim();
  const guests = Number(input.guests);

  if (!isValidDateString(bookingDate)) {
    throw new Error("Choose a valid date on the calendar.");
  }
  if (!ALLOWED_SERVICES.has(service)) {
    throw new Error("Choose a booking type.");
  }
  if (!name) throw new Error("Name is required.");
  if (!email || !email.includes("@")) throw new Error("Valid email is required.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(bookingDate + "T12:00:00");
  if (Number.isNaN(selected.getTime()) || selected < today) {
    throw new Error("Please choose today or a future date.");
  }

  const now = new Date().toISOString();
  const guestCount =
    Number.isFinite(guests) && guests > 0 ? Math.min(Math.floor(guests), 500) : null;

  if (usePostgres) {
    const result = await pgPool.query(
      `INSERT INTO bookings
        (booking_date, booking_time, service, name, email, phone, guests, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'requested', $9)
       RETURNING *`,
      [
        bookingDate,
        bookingTime || null,
        service,
        name,
        email,
        phone || null,
        guestCount,
        notes || null,
        now,
      ]
    );
    return result.rows[0];
  }

  const result = sqlite
    .prepare(
      `INSERT INTO bookings
        (booking_date, booking_time, service, name, email, phone, guests, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)`
    )
    .run(
      bookingDate,
      bookingTime || null,
      service,
      name,
      email,
      phone || null,
      guestCount,
      notes || null,
      now
    );

  return sqlite
    .prepare("SELECT * FROM bookings WHERE id = ?")
    .get(Number(result.lastInsertRowid));
}

async function listBookings() {
  if (usePostgres) {
    const result = await pgPool.query(
      `SELECT * FROM bookings ORDER BY booking_date ASC, created_at DESC`
    );
    return result.rows;
  }
  return sqlite
    .prepare(`SELECT * FROM bookings ORDER BY booking_date ASC, created_at DESC`)
    .all();
}

async function listBookedDates(fromDate, toDate) {
  if (usePostgres) {
    const result = await pgPool.query(
      `SELECT booking_date::text AS booking_date, COUNT(*)::int AS count
       FROM bookings
       WHERE booking_date >= $1::date AND booking_date <= $2::date
       GROUP BY booking_date
       ORDER BY booking_date`,
      [fromDate, toDate]
    );
    return result.rows;
  }

  return sqlite
    .prepare(
      `SELECT booking_date, COUNT(*) AS count
       FROM bookings
       WHERE booking_date >= ? AND booking_date <= ?
       GROUP BY booking_date
       ORDER BY booking_date`
    )
    .all(fromDate, toDate);
}

async function listBlogPosts() {
  if (usePostgres) {
    const result = await pgPool.query(
      `SELECT id, title, body, published_at, created_at
       FROM blog_posts
       ORDER BY published_at DESC, id DESC`
    );
    return result.rows;
  }
  return sqlite
    .prepare(
      `SELECT id, title, body, published_at, created_at
       FROM blog_posts
       ORDER BY published_at DESC, id DESC`
    )
    .all();
}

async function createBlogPost(input) {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const publishedAt = String(input.publishedAt || "").trim() || new Date().toISOString();

  if (!title) throw new Error("Title is required.");
  if (!body) throw new Error("Post body is required.");
  if (title.length > 160) throw new Error("Title is too long (max 160 characters).");
  if (body.length > 20000) throw new Error("Post is too long.");

  const now = new Date().toISOString();

  if (usePostgres) {
    const result = await pgPool.query(
      `INSERT INTO blog_posts (title, body, published_at, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, body, publishedAt, now]
    );
    return result.rows[0];
  }

  const result = sqlite
    .prepare(
      `INSERT INTO blog_posts (title, body, published_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(title, body, publishedAt, now);

  return sqlite
    .prepare("SELECT * FROM blog_posts WHERE id = ?")
    .get(Number(result.lastInsertRowid));
}

async function deleteBlogPost(id) {
  const postId = Number(id);
  if (!Number.isFinite(postId) || postId < 1) {
    throw new Error("Valid post id is required.");
  }

  if (usePostgres) {
    const result = await pgPool.query(
      "DELETE FROM blog_posts WHERE id = $1 RETURNING id",
      [postId]
    );
    if (!result.rows[0]) throw new Error("Post not found.");
    return { id: postId };
  }

  const existing = sqlite.prepare("SELECT id FROM blog_posts WHERE id = ?").get(postId);
  if (!existing) throw new Error("Post not found.");
  sqlite.prepare("DELETE FROM blog_posts WHERE id = ?").run(postId);
  return { id: postId };
}

module.exports = {
  initDb,
  upsertNewsletterSignup,
  listCustomers,
  normalizeEmail,
  getDbInfo,
  createBooking,
  listBookings,
  listBookedDates,
  ALLOWED_SERVICES,
  listBlogPosts,
  createBlogPost,
  deleteBlogPost,
};
