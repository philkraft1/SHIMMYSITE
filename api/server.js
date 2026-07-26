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
