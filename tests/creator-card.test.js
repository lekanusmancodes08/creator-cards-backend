const request = require("supertest");
const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../src/app");
const { CreatorCard } = require("../src/models/creator-card.model");

const store = [];

test.beforeEach(async () => {
  store.length = 0;

  CreatorCard.exists = async (query) => {
    const found = store.find((item) => item.slug === query.slug);
    return found ? { _id: found._id } : null;
  };

  CreatorCard.create = async (payload) => {
    if (store.some((item) => item.slug === payload.slug)) {
      const duplicateError = new Error("Duplicate key");
      duplicateError.code = 11000;
      throw duplicateError;
    }

    const doc = {
      ...payload,
      save: async function save() {
        const index = store.findIndex((item) => item.slug === this.slug);
        if (index >= 0) {
          store[index] = this;
        }
        return this;
      },
      toObject: function toObject() {
        const { save, toObject, ...plain } = this;
        return plain;
      },
    };

    store.push(doc);
    return doc;
  };

  CreatorCard.findOne = async (query) => {
    const found = store.find((item) => {
      if (query.slug && item.slug !== query.slug) {
        return false;
      }
      if (Object.prototype.hasOwnProperty.call(query, "deleted") && item.deleted !== query.deleted) {
        return false;
      }
      return true;
    });
    return found || null;
  };
});

test("creates a public card and returns id, not _id", async () => {
    const response = await request(app).post("/creator-cards").send({
      title: "George Cooks",
      creator_reference: "crt_8f2k1m9x4p7w3q5z",
      status: "published",
    });

  assert.equal(response.status, 200);
  assert.ok(response.body.data.id);
  assert.equal(response.body.data._id, undefined);
  assert.equal(response.body.data.access_type, "public");
});

test("returns AC01 for private card without access_code", async () => {
    const response = await request(app).post("/creator-cards").send({
      title: "VIP Rate Card",
      creator_reference: "crt_x9y8z7w6v5u4t3s2",
      status: "published",
      access_type: "private",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AC01");
});

test("returns AC05 when access_code is set for public card", async () => {
    const response = await request(app).post("/creator-cards").send({
      title: "Public Card",
      creator_reference: "crt_q1w2e3r4t5y6u7i8",
      status: "published",
      access_type: "public",
      access_code: "A1B2C3",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AC05");
});

test("returns SL02 for duplicate provided slug", async () => {
    await request(app).post("/creator-cards").send({
      title: "George Cooks",
      slug: "george-cooks",
      creator_reference: "crt_8f2k1m9x4p7w3q5z",
      status: "published",
    });

    const response = await request(app).post("/creator-cards").send({
      title: "Another George",
      slug: "george-cooks",
      creator_reference: "crt_m1n2b3v4c5x6z7l8",
      status: "published",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "SL02");
});

test("applies retrieval checks in order", async () => {
    const nf01 = await request(app).get("/creator-cards/missing-card");
  assert.equal(nf01.status, 404);
  assert.equal(nf01.body.code, "NF01");

    await request(app).post("/creator-cards").send({
      title: "My Draft",
      slug: "my-draft-card",
      creator_reference: "crt_q1w2e3r4t5y6u7i8",
      status: "draft",
    });
    const nf02 = await request(app).get("/creator-cards/my-draft-card");
  assert.equal(nf02.status, 404);
  assert.equal(nf02.body.code, "NF02");

    await request(app).post("/creator-cards").send({
      title: "VIP",
      slug: "vip-rate-card",
      creator_reference: "crt_x9y8z7w6v5u4t3s2",
      status: "published",
      access_type: "private",
      access_code: "A1B2C3",
    });

    const ac03 = await request(app).get("/creator-cards/vip-rate-card");
  assert.equal(ac03.status, 403);
  assert.equal(ac03.body.code, "AC03");

    const ac04 = await request(app).get("/creator-cards/vip-rate-card?access_code=WRONG1");
  assert.equal(ac04.status, 403);
  assert.equal(ac04.body.code, "AC04");

    const ok = await request(app).get("/creator-cards/vip-rate-card?access_code=A1B2C3");
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.access_code, undefined);
});

test("soft deletes and makes card non-retrievable", async () => {
    await request(app).post("/creator-cards").send({
      title: "Ada Designs Things",
      slug: "ada-designs-things",
      creator_reference: "crt_a1b2c3d4e5f6g7h8",
      status: "published",
    });

    const deleted = await request(app)
      .delete("/creator-cards/ada-designs-things")
      .send({ creator_reference: "crt_a1b2c3d4e5f6g7h8" });

  assert.equal(deleted.status, 200);
  assert.ok(deleted.body.data.deleted);

    const getDeleted = await request(app).get("/creator-cards/ada-designs-things");
  assert.equal(getDeleted.status, 404);
  assert.equal(getDeleted.body.code, "NF01");
});
