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
  apiBaseUrl: "https://rosenfeld-ranch-api.onrender.com",
  // Quick Pay links from Square are single-use. After one payment they stay on
  // "Transaction complete" forever — always create a fresh link via the API.
  checkoutMode: "api",
  redirectUrl: "https://rosenfeldranch.com/ranch.html",
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
    "puppies-weekday-20": {
      name: "The Village Puppy Room — Mon–Thu, 20 minutes",
      amountCents: 1500,
      paymentLinkUrl: "https://square.link/u/ysJkxobD",
    },
    "puppies-weekday-30": {
      name: "The Village Puppy Room — Mon–Thu, 30 minutes",
      amountCents: 2500,
      paymentLinkUrl: "https://square.link/u/xLkYptm9",
    },
    "puppies-weekend-20": {
      name: "The Village Puppy Room — Fri & Sun, 20 minutes",
      amountCents: 2000,
      paymentLinkUrl: "https://square.link/u/ozeQTnAI",
    },
    "puppies-weekend-30": {
      name: "The Village Puppy Room — Fri & Sun, 30 minutes",
      amountCents: 3000,
      paymentLinkUrl: "https://square.link/u/lgrmN8lA",
    },
    "traveling-deposit": {
      name: "Traveling Ranch — booking deposit",
      amountCents: 10000,
      paymentLinkUrl: "https://square.link/u/CE5OhzY8",
    },
    "traveling-standard": {
      name: "Traveling Ranch — standard package (2 hours)",
      amountCents: 100000,
      paymentLinkUrl: "https://square.link/u/3VD3FW6z",
    },
    "traveling-mini": {
      name: "Mini Traveling Ranch experience (2 hours)",
      amountCents: 60000,
      paymentLinkUrl: "https://square.link/u/a8zspY5M",
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
    "membership-weekly": {
      name: "Village Membership — Weekly (30 min × 4)",
      amountCents: 6000,
    },
    "membership-family": {
      name: "Village Membership — Family (up to 4)",
      amountCents: 15000,
    },
    "membership-family-extra": {
      name: "Village Membership — Extra family member",
      amountCents: 4500,
    },
  },
};
