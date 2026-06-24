function serializeCard(card, options = {}) {
  const { includeAccessCode = true } = options;
  const doc = typeof card.toObject === "function" ? card.toObject() : card;

  const serialized = {
    id: doc._id,
    title: doc.title,
    description: doc.description,
    slug: doc.slug,
    creator_reference: doc.creator_reference,
    links: doc.links || [],
    service_rates: doc.service_rates,
    status: doc.status,
    access_type: doc.access_type,
    created: doc.created,
    updated: doc.updated,
    deleted: doc.deleted,
  };

  if (includeAccessCode) {
    serialized.access_code = doc.access_code;
  }

  return serialized;
}

module.exports = {
  serializeCard,
};
