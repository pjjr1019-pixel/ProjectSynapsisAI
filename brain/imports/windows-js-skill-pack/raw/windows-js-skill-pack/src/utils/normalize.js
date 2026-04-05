function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

module.exports = {
  normalizeText,
  tokenize,
};
