const request = require("supertest");
const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../src/app");
const { CreatorCard } = require("../src/models/creator-card.model");

const store = [];

function makeDoc(payload) {
  return {
    ...payload,
    async save() {
      const index = store.findIndex((item) => item.slug === this.slug);
      if (index >= 0) {
        store[index] = this;
      }
      return this;
    },
    toObject() {
      const { save, toObject, ...plain } = this;
      return plain;
    },
  };
}

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

    const doc = makeDoc(payload);
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

test("Case 1: full creation returns 200 and id", async () => {
  const response = await request(app).post("/creator-cards").send({
    title: "George Cooks",
    description: "Weekly cooking podcast",
    slug: "george-cooks",
    creator_reference: "crt_8f2k1m9x4p7w3q5z",
    links: [{ title: "YouTube", url: "https://youtube.com/@georgecooks" }],
    service_rates: {
      currency: "NGN",
      rates: [{ name: "IG Story Post", description: "One story mention", amount: 5000000 }],
    },
    status: "published",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data._id, undefined);
  assert.ok(response.body.data.id);
  assert.equal(response.body.data.access_type, "public");
});

test("Case 2: slug auto-generation", async () => {
  const response = await request(app).post("/creator-cards").send({
    title: "Ada Designs Things",
    creator_reference: "crt_a1b2c3d4e5f6g7h8",
    status: "published",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.slug, "ada-designs-things");
});

test("Case 3: private card creation", async () => {
  const response = await request(app).post("/creator-cards").send({
    title: "VIP Rate Card",
    creator_reference: "crt_x9y8z7w6v5u4t3s2",
    status: "published",
    access_type: "private",
    access_code: "A1B2C3",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.access_code, "A1B2C3");
});

test("Case 4: retrieve public published card", async () => {
  await request(app).post("/creator-cards").send({
    title: "George Cooks",
    slug: "george-cooks",
    creator_reference: "crt_8f2k1m9x4p7w3q5z",
    status: "published",
  });

  const response = await request(app).get("/creator-cards/george-cooks");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.access_code, undefined);
  assert.ok(response.body.data.id);
});

test("Case 5: retrieve private card with correct pin", async () => {
  await request(app).post("/creator-cards").send({
    title: "VIP Rate Card",
    slug: "vip-rate-card",
    creator_reference: "crt_x9y8z7w6v5u4t3s2",
    status: "published",
    access_type: "private",
    access_code: "A1B2C3",
  });

  const response = await request(app).get("/creator-cards/vip-rate-card?access_code=A1B2C3");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.access_code, undefined);
});

test("Case 6: delete existing card", async () => {
  await request(app).post("/creator-cards").send({
    title: "Ada Designs Things",
    slug: "ada-designs-things",
    creator_reference: "crt_a1b2c3d4e5f6g7h8",
    status: "published",
  });

  const response = await request(app)
    .delete("/creator-cards/ada-designs-things")
    .send({ creator_reference: "crt_a1b2c3d4e5f6g7h8" });

  assert.equal(response.status, 200);
  assert.ok(response.body.data.deleted);
});

test("Case 7: duplicate slug returns SL02", async () => {
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

test("Case 8: private without access_code returns AC01", async () => {
  const response = await request(app).post("/creator-cards").send({
    title: "Secret Card",
    creator_reference: "crt_q1w2e3r4t5y6u7i8",
    status: "published",
    access_type: "private",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AC01");
});

test("Case 9: public with access_code returns AC05", async () => {
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

test("Case 10: validator failure returns 400", async () => {
  const response = await request(app).post("/creator-cards").send({
    title: "Bad Status Card",
    creator_reference: "crt_q1w2e3r4t5y6u7i8",
    status: "archived",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.status, "error");
});

test("Case 11: retrieve non-existent card returns NF01", async () => {
  const response = await request(app).get("/creator-cards/does-not-exist-123");

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "NF01");
});

test("Case 12: retrieve draft card returns NF02", async () => {
  await request(app).post("/creator-cards").send({
    title: "My Draft",
    slug: "my-draft-card",
    creator_reference: "crt_q1w2e3r4t5y6u7i8",
    status: "draft",
  });

  const response = await request(app).get("/creator-cards/my-draft-card");

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "NF02");
});

test("Case 13: retrieve private without pin returns AC03", async () => {
  await request(app).post("/creator-cards").send({
    title: "VIP",
    slug: "vip-rate-card",
    creator_reference: "crt_x9y8z7w6v5u4t3s2",
    status: "published",
    access_type: "private",
    access_code: "A1B2C3",
  });

  const response = await request(app).get("/creator-cards/vip-rate-card");

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "AC03");
});

test("Case 14: retrieve private with wrong pin returns AC04", async () => {
  await request(app).post("/creator-cards").send({
    title: "VIP",
    slug: "vip-rate-card",
    creator_reference: "crt_x9y8z7w6v5u4t3s2",
    status: "published",
    access_type: "private",
    access_code: "A1B2C3",
  });

  const response = await request(app).get("/creator-cards/vip-rate-card?access_code=WRONG1");

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "AC04");
});

test("Case 15: delete non-existent returns NF01", async () => {
  const response = await request(app)
    .delete("/creator-cards/does-not-exist-123")
    .send({ creator_reference: "crt_q1w2e3r4t5y6u7i8" });

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "NF01");
});

test("Case 16: retrieve deleted card returns NF01", async () => {
  await request(app).post("/creator-cards").send({
    title: "Ada Designs Things",
    slug: "ada-designs-things",
    creator_reference: "crt_a1b2c3d4e5f6g7h8",
    status: "published",
  });

  await request(app)
    .delete("/creator-cards/ada-designs-things")
    .send({ creator_reference: "crt_a1b2c3d4e5f6g7h8" });

  const response = await request(app).get("/creator-cards/ada-designs-things");

  assert.equal(response.status, 404);
  assert.equal(response.body.code, "NF01");
});
