/**
 * Server-side content filter for guest experiences.
 * Kept in the API so the blocklist is not trivial to bypass from the client.
 */

const BLOCKED_TERMS = [
  // Racial / ethnic / religious slurs
  "nigger",
  "nigga",
  "negro",
  "coon",
  "spic",
  "wetback",
  "chink",
  "gook",
  "kike",
  "heeb",
  "raghead",
  "towelhead",
  "sandnigger",
  "beaner",
  "paki",
  "gypsy",
  "tranny",
  "shemale",
  // Homophobic / ableist / sexist insults
  "faggot",
  "fag",
  "dyke",
  "retard",
  "retarded",
  "cripple",
  "whore",
  "slut",
  "bitch",
  "cunt",
  // General strong profanity / insults
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "asshole",
  "bastard",
  "dickhead",
  "piss",
  "cock",
  "pussy",
  "twat",
  "wanker",
  "douche",
  "douchebag",
  "jackass",
  "dumbass",
  "shithead",
  "shitface",
  "scumbag",
  "piece of shit",
  "son of a bitch",
];

function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBlockedTerm(text) {
  const normalized = normalizeForMatch(text);
  if (!normalized) return null;

  for (const term of BLOCKED_TERMS) {
    const needle = normalizeForMatch(term);
    if (!needle) continue;
    if (needle.includes(" ")) {
      if (normalized.includes(needle)) return term;
      continue;
    }
    const re = new RegExp(`(?:^|\\s)${needle}(?:s|es|ed|ing)?(?:$|\\s)`, "i");
    if (re.test(normalized)) return term;
  }
  return null;
}

function assertCleanText(fields) {
  const combined = Object.values(fields || {})
    .map((v) => String(v || ""))
    .join("\n");
  const hit = findBlockedTerm(combined);
  if (hit) {
    const err = new Error(
      "Please revise your message — it contains language we can’t publish."
    );
    err.code = "BLOCKED_LANGUAGE";
    throw err;
  }
}

module.exports = {
  assertCleanText,
  findBlockedTerm,
};
