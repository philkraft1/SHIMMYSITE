require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { SquareClient, SquareEnvironment, SquareError } = require("square");
const { catalog, getCatalogItem } = require("./catalog");
const {
  initDb,
  upsertNewsletterSignup,
  listCustomers,
  getDbInfo,
  createBooking,
  listBookings,
  listBookedDates,
  listBlogPosts,
  createBlogPost,
  deleteBlogPost,
  listExperiences,
  createExperience,
  getExperiencePhoto,
} = require("./db");
const { assertCleanText } = require("./moderation");
const { MAX_PHOTOS, MAX_BYTES } = require("./photos");

const port = Number(process.env.PORT) || 3001;
const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
const locationId = process.env.SQUARE_LOCATION_ID || "";
const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
const redirectUrl =
  process.env.CHECKOUT_REDIRECT_URL || "https://rosenfeldranch.com/ranch.html";
const newsletterInbox =
  process.env.NEWSLETTER_INBOX || "therosenfeldranch@gmail.com";
const adminKey = process.env.ADMIN_KEY || "";
const sitePublicUrl = (
  process.env.SITE_PUBLIC_URL || "https://rosenfeldranch.com"
).replace(/\/$/, "");

const PRODUCTION_ORIGINS = new Set([
  "https://rosenfeldranch.com",
  "https://www.rosenfeldranch.com",
]);

function isLocalDevOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl / health checks
  return PRODUCTION_ORIGINS.has(origin) || isLocalDevOrigin(origin);
}

const app = express();
// Trust Render / reverse-proxy so rate limits key on real client IP.
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    // Frontend fetch calls do not send cookies; keep credentials off.
    credentials: false,
  })
);
app.use((req, res, next) => {
  const largePhotoPost =
    req.method === "POST" &&
    (req.path === "/api/experiences" ||
      String(req.url || "").split("?")[0] === "/api/experiences");
  return express.json({ limit: largePhotoPost ? "22mb" : "64kb" })(req, res, next);
});

function rateLimitHandler(_req, res) {
  res.status(429).json({
    error: "Too many requests from this connection. Please try again later.",
  });
}

const newsletterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const bookingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const experiencesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** Silent honeypot: bots that fill hidden fields get a fake success. */
function isHoneypotTripped(body) {
  const honey = body && (body._honey ?? body.honey ?? body.website);
  return typeof honey === "string" && honey.trim().length > 0;
}

function requireAdmin(req, res) {
  if (!adminKey) {
    res.status(503).json({
      error: "Admin access is not configured. Set ADMIN_KEY on the API host.",
    });
    return false;
  }
  const provided = String(req.get("x-admin-key") || "");
  const expected = Buffer.from(adminKey);
  const got = Buffer.from(provided);
  const ok =
    expected.length > 0 &&
    expected.length === got.length &&
    crypto.timingSafeEqual(expected, got);
  if (!ok) {
    res.status(401).json({
      error: "Unauthorized. Send a valid x-admin-key header.",
    });
    return false;
  }
  return true;
}

const squareConfigured = Boolean(accessToken && locationId);
const client = squareConfigured
  ? new SquareClient({ token: accessToken, environment })
  : null;

/**
 * FormSubmit rejects bare server posts unless Origin/Referer look like a real site.
 * First use also requires the inbox owner to click "Activate Form" in email (check spam).
 */
async function sendFormSubmit(fields) {
  if (!newsletterInbox) {
    return { ok: false, error: "NEWSLETTER_INBOX is not set." };
  }
  const url =
    "https://formsubmit.co/ajax/" + encodeURIComponent(newsletterInbox);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: sitePublicUrl,
        Referer: sitePublicUrl + "/",
        "User-Agent":
          "Mozilla/5.0 (compatible; RosenfeldRanchAPI/1.0; +https://rosenfeldranch.com)",
      },
      body: JSON.stringify({
        _template: "table",
        _captcha: "false",
        _honey: "",
        ...fields,
      }),
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const success =
      res.ok &&
      data &&
      String(data.success) !== "false" &&
      !/needs Activation/i.test(String(data.message || ""));
    if (!success) {
      const error =
        (data && data.message) ||
        text.slice(0, 280) ||
        `FormSubmit HTTP ${res.status}`;
      console.error("[email] FormSubmit failed:", error);
      return { ok: false, error, raw: data || text };
    }
    return { ok: true, raw: data };
  } catch (err) {
    console.error("[email] FormSubmit error:", err.message || err);
    return { ok: false, error: err.message || "FormSubmit request failed." };
  }
}

async function notifyNewsletterInbox(email, recurring) {
  return sendFormSubmit({
    email,
    recurring: recurring ? "yes — returning subscriber" : "no — new subscriber",
    _subject: recurring
      ? "Returning ranch newsletter signup"
      : "New ranch newsletter signup",
    _replyto: email,
    source: "Rosenfeld Ranch API",
  });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    squareConfigured,
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
    itemCount: Object.keys(catalog).length,
    newsletterInbox: Boolean(newsletterInbox),
    database: getDbInfo(),
  });
});

/** Cached Instagram feed scraped via Imginn (native IG embeds are unreliable). */
const IG_USERNAME = "the_rosenfeld_ranch";
const IG_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let igCache = { at: 0, payload: null };
const IG_CACHE_MS = 15 * 60 * 1000;

function decodeHtml(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseImginnPosts(html) {
  const decoded = decodeHtml(html);
  const posts = [];
  const seen = new Set();
  const re =
    /href="(\/p\/([A-Za-z0-9_-]+)\/?)"[\s\S]{0,1800}?(https:\/\/scontent[^"\s>]+\.(?:jpg|jpeg|webp)[^"\s>]*)/gi;
  let m;
  while ((m = re.exec(decoded)) && posts.length < 12) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    posts.push({
      id,
      permalink: `https://www.instagram.com/p/${id}/`,
      image: m[3],
      caption: "",
    });
  }

  const fallback =
    /<a[^>]+href="(\/p\/([A-Za-z0-9_-]+)\/?)"[^>]*>[\s\S]*?<img[^>]+src="(https:\/\/s\d+\.imginn\.com\/[^"]+)"/gi;
  while ((m = fallback.exec(decoded)) && posts.length < 12) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    posts.push({
      id,
      permalink: `https://www.instagram.com/p/${id}/`,
      image: m[3],
      caption: "",
    });
  }
  return posts;
}

async function fetchInstagramFeed() {
  const now = Date.now();
  if (igCache.payload && now - igCache.at < IG_CACHE_MS) {
    return igCache.payload;
  }
  const url = `https://www.imginn.com/${IG_USERNAME}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": IG_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Imginn ${res.status}`);
  const html = await res.text();
  const posts = parseImginnPosts(html);
  if (!posts.length) throw new Error("No posts parsed");
  const payload = {
    username: IG_USERNAME,
    profileUrl: `https://www.instagram.com/${IG_USERNAME}/`,
    source: "imginn",
    updatedAt: new Date().toISOString(),
    posts,
  };
  igCache = { at: now, payload };
  return payload;
}

function isAllowedMediaUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith("cdninstagram.com") ||
      host.endsWith("fbcdn.net") ||
      /^s\d+\.imginn\.com$/.test(host)
    );
  } catch {
    return false;
  }
}

app.get("/api/instagram/feed", async (_req, res) => {
  try {
    const payload = await fetchInstagramFeed();
    res.set("Cache-Control", "public, max-age=300");
    return res.json(payload);
  } catch (err) {
    return res.status(502).json({
      error: err.message || "Instagram feed unavailable.",
    });
  }
});

app.get("/api/instagram/media", async (req, res) => {
  const raw = String(req.query.url || "").trim();
  if (!isAllowedMediaUrl(raw)) {
    return res.status(400).json({ error: "Invalid media URL." });
  }
  try {
    const host = new URL(raw).hostname.toLowerCase();
    const referer = host.includes("imginn.com")
      ? "https://www.imginn.com/"
      : "https://www.instagram.com/";
    const upstream = await fetch(raw, {
      headers: {
        "User-Agent": IG_UA,
        Referer: referer,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }
    const type = upstream.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", type);
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(buf);
  } catch (err) {
    return res.status(502).json({ error: err.message || "Media proxy failed." });
  }
});

app.post("/api/newsletter", newsletterLimiter, async (req, res) => {
  if (isHoneypotTripped(req.body)) {
    return res.json({ ok: true, recurring: false });
  }
  const email = req.body?.email;
  const source = req.body?.source || "homepage-newsletter";

  try {
    const { customer, recurring } = await upsertNewsletterSignup(email, source);
    notifyNewsletterInbox(customer.email, recurring);
    return res.json({
      ok: true,
      recurring,
      customer: {
        email: customer.email,
        signupCount: customer.signup_count,
        firstSeen: customer.created_at,
        lastSignup: customer.last_signup_at,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Signup failed." });
  }
});

app.get("/api/admin/verify", (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json({ ok: true });
});

app.get("/api/customers", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json({ customers: await listCustomers() });
});

async function notifyBooking(booking) {
  return sendFormSubmit({
    _subject: `New booking request — ${booking.booking_date} (${booking.service})`,
    _replyto: booking.email,
    date: booking.booking_date,
    time: booking.booking_time || "flexible",
    service: booking.service,
    name: booking.name,
    email: booking.email,
    phone: booking.phone || "",
    guests: booking.guests || "",
    notes: booking.notes || "",
    status: booking.status,
    source: "Rosenfeld Ranch bookings",
  });
}

app.get("/api/bookings/dates", async (req, res) => {
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Provide from and to as YYYY-MM-DD." });
  }
  try {
    const dates = await listBookedDates(from, to);
    return res.json({ dates });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Could not load dates." });
  }
});

function asDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

app.post("/api/bookings", bookingsLimiter, async (req, res) => {
  if (isHoneypotTripped(req.body)) {
    return res.status(201).json({
      ok: true,
      emailSent: false,
      booking: { id: null, status: "received" },
    });
  }
  try {
    const booking = await createBooking(req.body || {});
    const dateOnly = asDateOnly(booking.booking_date);
    const emailNotify = await notifyBooking({
      ...booking,
      booking_date: dateOnly,
    });
    // Also track email as a customer for recurring insight
    try {
      await upsertNewsletterSignup(booking.email, "booking-request");
    } catch {
      // ignore newsletter upsert failures
    }
    return res.status(201).json({
      ok: true,
      emailSent: Boolean(emailNotify && emailNotify.ok),
      emailError: emailNotify && !emailNotify.ok ? emailNotify.error : null,
      booking: {
        id: booking.id,
        date: dateOnly,
        time: booking.booking_time,
        service: booking.service,
        status: booking.status,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Booking failed." });
  }
});

/** Manual email delivery check — useful during GoDaddy launch / client QA. */
app.post("/api/bookings/test-email", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await sendFormSubmit({
    _subject: "Rosenfeld Ranch — booking email test",
    _replyto: newsletterInbox,
    name: "Email test",
    email: newsletterInbox,
    date: new Date().toISOString().slice(0, 10),
    time: "flexible",
    service: "email-test",
    phone: "",
    guests: "1",
    notes:
      "If you received this, booking notifications are working. If you got an Activate Form link instead, click it once, then test again.",
    status: "test",
    source: "Rosenfeld Ranch email test",
  });
  return res.status(result.ok ? 200 : 502).json({
    ok: result.ok,
    inbox: newsletterInbox,
    error: result.error || null,
  });
});

app.get("/api/bookings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  return res.json({ bookings: await listBookings() });
});

app.get("/api/blog", async (_req, res) => {
  try {
    return res.json({ posts: await listBlogPosts() });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Could not load blog posts." });
  }
});

app.post("/api/blog", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const post = await createBlogPost(req.body || {});
    return res.status(201).json({ ok: true, post });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not publish post." });
  }
});

app.delete("/api/blog/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    return res.json({ ok: true, ...(await deleteBlogPost(req.params.id)) });
  } catch (err) {
    return res.status(404).json({ error: err.message || "Could not delete post." });
  }
});

app.get("/api/experiences", async (req, res) => {
  try {
    const kind = String(req.query.kind || "").trim().toLowerCase();
    const items = await listExperiences(kind);
    res.set("Cache-Control", "public, max-age=30");
    return res.json({ items });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not load posts." });
  }
});

app.get("/api/experiences/:id/photos/:index", async (req, res) => {
  try {
    const photo = await getExperiencePhoto(req.params.id, req.params.index);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }
    res.set("Content-Type", photo.mime);
    res.set("Cache-Control", "public, max-age=86400, immutable");
    return res.send(photo.data);
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not load photo." });
  }
});

app.post("/api/experiences", experiencesLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    if (isHoneypotTripped(body)) {
      return res.status(201).json({
        ok: true,
        item: null,
        limits: { maxPhotos: MAX_PHOTOS, maxBytesPerPhoto: MAX_BYTES },
      });
    }
    assertCleanText({
      name: body.name,
      title: body.title,
      body: body.body,
    });
    const item = await createExperience(body);
    return res.status(201).json({
      ok: true,
      item,
      limits: { maxPhotos: MAX_PHOTOS, maxBytesPerPhoto: MAX_BYTES },
    });
  } catch (err) {
    const status = err.code === "BLOCKED_LANGUAGE" ? 400 : 400;
    return res.status(status).json({
      error: err.message || "Could not save your post.",
      code: err.code || null,
    });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
    locationId: locationId || null,
    squareConfigured,
    items: Object.entries(catalog).map(([id, item]) => ({
      id,
      name: item.name,
      amountCents: item.amountCents,
    })),
  });
});

app.post("/api/checkout/:itemId", checkoutLimiter, async (req, res) => {
  const item = getCatalogItem(req.params.itemId);
  if (!item) {
    return res.status(404).json({ error: "Unknown item." });
  }

  if (!client || !locationId) {
    return res.status(503).json({
      error:
        "Square is not configured. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to api/.env.",
    });
  }

  const checkoutOptions = redirectUrl
    ? { redirectUrl, askForShippingAddress: false }
    : { askForShippingAddress: false };

  try {
    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: crypto.randomUUID(),
      description: item.name,
      quickPay: {
        name: item.name,
        priceMoney: {
          amount: BigInt(item.amountCents),
          currency: "USD",
        },
        locationId,
      },
      checkoutOptions,
    });

    const url = response.paymentLink?.url;
    if (!url) {
      return res.status(502).json({ error: "Square did not return a checkout URL." });
    }

    return res.json({
      url,
      paymentLinkId: response.paymentLink?.id || null,
      orderId: response.paymentLink?.orderId || null,
    });
  } catch (err) {
    const message =
      (err instanceof SquareError &&
        err.errors?.map((e) => e.detail || e.code).join("; ")) ||
      err.message ||
      "Square checkout failed.";
    return res.status(502).json({ error: message });
  }
});

initDb()
  .then((info) => {
    app.listen(port, () => {
      console.log(`Rosenfeld Ranch API: http://127.0.0.1:${port}`);
      console.log(`Database: ${info.driver}${info.dbPath ? ` (${info.dbPath})` : ""}`);
      console.log(
        squareConfigured
          ? "Square credentials loaded."
          : "Square not configured — copy api/.env.example to api/.env and add tokens."
      );
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
