require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const { SquareClient, SquareEnvironment, SquareError } = require("square");
const { catalog, getCatalogItem } = require("./catalog");

const port = Number(process.env.PORT) || 3001;
const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
const locationId = process.env.SQUARE_LOCATION_ID || "";
const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
const redirectUrl = process.env.CHECKOUT_REDIRECT_URL || "";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const squareConfigured = Boolean(accessToken && locationId);
const client = squareConfigured
  ? new SquareClient({ token: accessToken, environment })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    squareConfigured,
    environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
    itemCount: Object.keys(catalog).length,
  });
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

app.listen(port, () => {
  console.log(`Rosenfeld Ranch Square API: http://127.0.0.1:${port}`);
  console.log(
    squareConfigured
      ? "Square credentials loaded."
      : "Square not configured — copy api/.env.example to api/.env and add tokens."
  );
});
