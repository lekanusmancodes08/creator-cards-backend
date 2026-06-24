const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const serviceRateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const creatorCardSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    slug: { type: String, required: true },
    creator_reference: { type: String, required: true },
    links: { type: [linkSchema], default: [] },
    service_rates: {
      type: {
        currency: { type: String, enum: ["NGN", "USD", "GBP", "GHS"] },
        rates: { type: [serviceRateSchema] },
      },
      default: null,
    },
    status: { type: String, enum: ["draft", "published"], required: true },
    access_type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      required: true,
    },
    access_code: { type: String, default: null },
    created: { type: Number, required: true },
    updated: { type: Number, required: true },
    deleted: { type: Number, default: null },
  },
  {
    versionKey: false,
    strict: true,
  }
);

creatorCardSchema.index({ slug: 1 }, { unique: true });

const CreatorCard = mongoose.model("CreatorCard", creatorCardSchema);

module.exports = {
  CreatorCard,
};
