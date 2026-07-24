/** Ranch catalog — prices match on-site signage (amounts in USD cents). */
const catalog = {
  admission: { name: "General admission", amountCents: 1500 },
  wagon: { name: "Wagon ride", amountCents: 1000 },
  pony: { name: "Pony ride", amountCents: 1000 },
  puppies: { name: "The Village — puppies (20 min)", amountCents: 2000 },
  lettuce: { name: "Lettuce (animal feed)", amountCents: 500 },
  grain: { name: "Grain / corn (animal feed)", amountCents: 1000 },
};

function getCatalogItem(id) {
  return catalog[id] || null;
}

module.exports = { catalog, getCatalogItem };
