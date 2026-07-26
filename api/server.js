require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
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
} = require("./db");

const port = Number(process.env.PORT) || 3001;
const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
const locationId = process.env.SQUARE_LOCATION_ID || "";
const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
const redirectUrl = process.env.CHECKOUT_REDIRECT_URL || "";
const newsletterInbox =
  process.env.NEWSLETTER_INBOX || "therosenfeldranch@gmail.com";
const adminKey = process.env.ADMIN_KEY || "";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const squareConfigured = Boolean(accessToken && locationId);
const client = squareConfigured
  ? new SquareClient({ token: accessToken, environment })
  : null;

async function notifyNewsletterInbox(email, recurring) {
  if (!newsletterInbox) return;
  try {
    await fetch(
      "https://formsubmit.co/ajax/" + encodeURIComponent(newsletterInbox),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          recurring: recurring ? "yes — returning subscriber" : "no — new subscriber",
          _subject: recurring
            ? "Returning ranch newsletter signup"
            : "New ranch newsletter signup",
          _template: "table",
          _captcha: "false",
          source: "Rosenfeld Ranch API",
        }),
      }
    );
  } catch {
    // Email notify is best-effort; DB save is the source of truth.
  }
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

app.post("/api/newsletter", async (req, res) => {
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

app.get("/api/customers", async (req, res) => {
  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({
      error: "Unauthorized. Set ADMIN_KEY in api/.env and send x-admin-key header.",
    });
  }
  return res.json({ customers: await listCustomers() });
});

async function notifyBooking(booking) {
  if (!newsletterInbox) return;
  try {
    await fetch(
      "https://formsubmit.co/ajax/" + encodeURIComponent(newsletterInbox),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `New booking request — ${booking.booking_date} (${booking.service})`,
          _template: "table",
          _captcha: "false",
          date: booking.booking_date,
          time: booking.booking_time || "flexible",
          service: booking.service,
          name: booking.name,
          email: booking.email,
          phone: booking.phone || "",
          guests: booking.guests || "",
          notes: booking.notes || "",
          status: booking.status,
        }),
      }
    );
  } catch {
    // best-effort email
  }
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

app.post("/api/bookings", async (req, res) => {
  try {
    const booking = await createBooking(req.body || {});
    const dateOnly = asDateOnly(booking.booking_date);
    notifyBooking({ ...booking, booking_date: dateOnly });
    // Also track email as a customer for recurring insight
    try {
      await upsertNewsletterSignup(booking.email, "booking-request");
    } catch {
      // ignore newsletter upsert failures
    }
    return res.status(201).json({
      ok: true,
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

app.get("/api/bookings", async (req, res) => {
  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({
      error: "Unauthorized. Set ADMIN_KEY in api/.env and send x-admin-key header.",
    });
  }
  return res.json({ bookings: await listBookings() });
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

app.post("/api/checkout/:itemId", async (req, res) => {
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
