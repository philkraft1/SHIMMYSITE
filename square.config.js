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
  checkoutMode: "api",
  redirectUrl: "",
  items: {
    admission: {
      name: "General admission",
      amountCents: 1500,
      paymentLinkUrl: "",
    },
    wagon: {
      name: "Wagon ride",
      amountCents: 1000,
      paymentLinkUrl: "",
    },
    pony: {
      name: "Pony ride",
      amountCents: 1000,
      paymentLinkUrl: "",
    },
    puppies: {
      name: "The Village — puppies (20 min)",
      amountCents: 2000,
      paymentLinkUrl: "",
    },
    lettuce: {
      name: "Lettuce (animal feed)",
      amountCents: 500,
      paymentLinkUrl: "",
    },
    grain: {
      name: "Grain / corn (animal feed)",
      amountCents: 1000,
      paymentLinkUrl: "",
    },
  },
};
