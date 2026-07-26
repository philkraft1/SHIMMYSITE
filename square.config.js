/**
 * Square checkout configuration for Rosenfeld Ranch.
 *
 * checkoutMode:
 *   "static" — use paymentLinkUrl on each item (paste from Square Dashboard)
 *   "api"    — create a fresh link via the local api/ server on each click
 *
 * Fill in credentials after linking the ranch's Square account.
 */
window.SQUARE_CONFIG = {
  environment: "production",
  applicationId: "",
  locationId: "LQESF525RARVA",
  apiBaseUrl: "http://127.0.0.1:3001",
  checkoutMode: "static",
  redirectUrl: "",
  items: {
    admission: {
      name: "General admission",
      amountCents: 1500,
      paymentLinkUrl: "https://square.link/u/JwOFoo3M",
    },
    wagon: {
      name: "Wagon ride",
      amountCents: 1000,
      paymentLinkUrl: "https://square.link/u/ZnFuMmDv",
    },
    pony: {
      name: "Pony ride",
      amountCents: 1000,
      paymentLinkUrl: "https://square.link/u/yRBBL3E6",
    },
    puppies: {
      name: "The Village — puppies (20 min)",
      amountCents: 2000,
      paymentLinkUrl: "https://square.link/u/UCep9rs7",
    },
    lettuce: {
      name: "Lettuce (animal feed)",
      amountCents: 500,
      paymentLinkUrl: "https://square.link/u/DyzA3wsu",
    },
    grain: {
      name: "Grain / corn (animal feed)",
      amountCents: 1000,
      paymentLinkUrl: "https://square.link/u/6Ch7JwJY",
    },
  },
};
