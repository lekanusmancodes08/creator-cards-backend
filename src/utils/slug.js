function randomAlphanumeric(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeTitleToSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function buildSlug({ title, providedSlug, isSlugTaken }) {
  if (providedSlug) {
    return providedSlug;
  }

  const base = normalizeTitleToSlug(title);
  let candidate = base;

  const needsSuffix = base.length < 5 || (await isSlugTaken(base));
  if (needsSuffix) {
    candidate = `${base || "card"}-${randomAlphanumeric(6)}`;
  }

  while (await isSlugTaken(candidate)) {
    candidate = `${base || "card"}-${randomAlphanumeric(6)}`;
  }

  return candidate;
}

module.exports = {
  buildSlug,
};
