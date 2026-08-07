/** Ranch catalog - prices match current signage (amounts in USD cents). */
const catalog = {
  admission: { name: "General admission", amountCents: 1500 },
  wagon: { name: "Wagon ride", amountCents: 1000 },
  pony: { name: "Pony ride", amountCents: 1000 },
  lettuce: { name: "Lettuce (animal feed)", amountCents: 500 },
  grain: { name: "Grain / corn (animal feed)", amountCents: 1000 },

  // The Village puppy room - summer rates
  "puppies-weekday-20": {
    name: "The Village Puppy Room - Mon-Thu, 20 minutes",
    amountCents: 1500,
  },
  "puppies-weekday-30": {
    name: "The Village Puppy Room - Mon-Thu, 30 minutes",
    amountCents: 2500,
  },
  "puppies-weekend-20": {
    name: "The Village Puppy Room - Fri & Sun, 20 minutes",
    amountCents: 2000,
  },
  "puppies-weekend-30": {
    name: "The Village Puppy Room - Fri & Sun, 30 minutes",
    amountCents: 3000,
  },

  // Traveling Ranch 2026
  "traveling-deposit": {
    name: "Traveling Ranch - booking deposit",
    amountCents: 10000,
  },
  "traveling-standard": {
    name: "Traveling Ranch - standard package (2 hours)",
    amountCents: 100000,
  },
  "traveling-mini": {
    name: "Mini Traveling Ranch experience (2 hours)",
    amountCents: 60000,
  },

  // Village membership - monthly (first month via Quick Pay)
  "membership-weekly": {
    name: "Village Membership - Weekly (30 min x 4)",
    amountCents: 6000,
  },
  "membership-family": {
    name: "Village Membership - Family (up to 4)",
    amountCents: 15000,
  },
  "membership-family-extra": {
    name: "Village Membership - Extra family member",
    amountCents: 4500,
  },
};

function getCatalogItem(id) {
  return catalog[id] || null;
}

module.exports = { catalog, getCatalogItem };
