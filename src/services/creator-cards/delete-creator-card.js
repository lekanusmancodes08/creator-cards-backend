const validator = require("../../core/validator");
const { throwAppError } = require("../../core/errors");
const { CreatorCard } = require("../../models/creator-card.model");
const Messages = require("../../messages/creator-cards");

const spec = `root {
  slug string<trim|minLength:5|maxLength:50>
  creator_reference string<trim|length:20>
}`;

const parsedSpec = validator.parse(spec);

async function deleteCreatorCard(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  response = await CreatorCard.findOne({ slug: data.slug, deleted: null });
  if (!response) {
    throwAppError(Messages.NF01, "NF01", 404);
  }

  const now = Date.now();
  response.deleted = now;
  response.updated = now;
  await response.save();

  return response;
}

module.exports = deleteCreatorCard;
