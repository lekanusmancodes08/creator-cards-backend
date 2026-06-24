const validator = require("../../core/validator");
const { throwAppError } = require("../../core/errors");
const { CreatorCard } = require("../../models/creator-card.model");
const Messages = require("../../messages/creator-cards");

const spec = `root {
  slug string<trim|minLength:5|maxLength:50>
  access_code? string<trim|length:6>
}`;

const parsedSpec = validator.parse(spec);

async function getCreatorCard(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);

  response = await CreatorCard.findOne({ slug: data.slug, deleted: null });
  if (!response) {
    throwAppError(Messages.NF01, "NF01", 404);
  }

  if (response.status === "draft") {
    throwAppError(Messages.NF02, "NF02", 404);
  }

  if (response.access_type === "private" && !data.access_code) {
    throwAppError(Messages.AC03, "AC03", 403);
  }

  if (response.access_type === "private" && data.access_code !== response.access_code) {
    throwAppError(Messages.AC04, "AC04", 403);
  }

  return response;
}

module.exports = getCreatorCard;
