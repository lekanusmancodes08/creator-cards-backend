const { ulid } = require("ulid");
const validator = require("../../core/validator");
const { throwAppError, ERROR_CODE } = require("../../core/errors");
const { CreatorCard } = require("../../models/creator-card.model");
const { buildSlug } = require("../../utils/slug");
const Messages = require("../../messages/creator-cards");

const spec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedSpec = validator.parse(spec);

function isSlugValid(slug) {
  return /^[A-Za-z0-9_-]+$/.test(slug);
}

function isAlphanumeric(value) {
  return /^[A-Za-z0-9]+$/.test(value);
}

function isValidHttpUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

async function isSlugTaken(slug) {
  return Boolean(await CreatorCard.exists({ slug }));
}

function validateFieldEdgeCases(data) {
  if (data.slug && !isSlugValid(data.slug)) {
    throwAppError("slug can only contain letters, numbers, hyphens and underscores", ERROR_CODE.INVLDDATA, 400);
  }

  if (data.access_code && !isAlphanumeric(data.access_code)) {
    throwAppError("access_code must be alphanumeric", ERROR_CODE.INVLDDATA, 400);
  }

  if (data.links) {
    for (const link of data.links) {
      if (!isValidHttpUrl(link.url)) {
        throwAppError("url must start with http:// or https://", ERROR_CODE.INVLDDATA, 400);
      }
    }
  }

  if (data.service_rates && data.service_rates.rates.length < 1) {
    throwAppError("service_rates.rates must contain at least one rate", ERROR_CODE.INVLDDATA, 400);
  }

  if (data.service_rates) {
    for (const rate of data.service_rates.rates) {
      if (!Number.isInteger(rate.amount)) {
        throwAppError("amount must be an integer", ERROR_CODE.INVLDDATA, 400);
      }
    }
  }
}

function validateAccessCodeRules(data) {
  const accessType = data.access_type || "public";

  if (accessType === "private" && !data.access_code) {
    throwAppError(Messages.AC01, "AC01", 400);
  }

  if (accessType === "public" && data.access_code) {
    throwAppError(Messages.AC05, "AC05", 400);
  }
}

async function createCreatorCard(serviceData, options = {}) {
  let response;

  const data = validator.validate(serviceData, parsedSpec);
  validateFieldEdgeCases(data);
  validateAccessCodeRules(data);

  if (data.slug && (await isSlugTaken(data.slug))) {
    throwAppError(Messages.SL02, "SL02", 400);
  }

  const slug = await buildSlug({
    title: data.title,
    providedSlug: data.slug,
    isSlugTaken,
  });

  const now = Date.now();

  try {
    response = await CreatorCard.create({
      _id: ulid(),
      title: data.title,
      description: data.description || null,
      slug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: data.access_type || "public",
      access_code: (data.access_type || "public") === "private" ? data.access_code : null,
      created: now,
      updated: now,
      deleted: null,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throwAppError(Messages.SL02, "SL02", 400);
    }
    throwAppError(error.message || "Unable to create card", ERROR_CODE.APPERR, 500);
  }

  return response;
}

module.exports = createCreatorCard;
