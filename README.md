# Creator Card Microservice

This service implements three public endpoints at the root base URL:

- `POST /creator-cards`
- `GET /creator-cards/:slug`
- `DELETE /creator-cards/:slug`

No auth and no URL versioning are used.

## Stack

- Node.js (CommonJS)
- Express
- MongoDB (Mongoose)
- ULID for `_id`
- Built-in test runner (`node:test`) + Supertest

## Project Structure

```text
src/
   app.js
   server.js
   core/
      errors.js
      server.js
      validator.js
   config/
      database.js
      env.js
   endpoints/
      creator-cards/
         create.js
         get.js
         delete.js
   messages/
      creator-cards.js
   middleware/
      error.middleware.js
   models/
      creator-card.model.js
   services/
      creator-cards/
         create-creator-card.js
         get-creator-card.js
         delete-creator-card.js
   utils/
      serializer.js
      slug.js
tests/
   creator-card.test.js
```

## Environment Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Add your MongoDB URI

Open `.env` and set:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
```

## How to Get a Working MongoDB URI (Atlas)

1. Create a free Atlas cluster.
2. Create a DB user with username/password.
3. Add network access (your IP or `0.0.0.0/0` for deployment).
4. Click Connect -> Drivers and copy the URI.
5. Replace placeholders:
    - `<username>`
    - `<password>`
    - `<cluster>`
    - `<database>` (for example `creator-cards`)
6. Paste into `.env` as `MONGODB_URI`.

## Run Locally

```bash
npm run dev
```

Default local base URL:

`http://localhost:3000`

## Tests

```bash
npm test
```

Current automated tests cover core business flows and error codes.

## API Behavior Summary

- Mongo stores `_id`; API always returns `id`.
- `GET /creator-cards/:slug` never returns `access_code`.
- Deletion is soft delete (`deleted` timestamp set).
- Retrieval checks order is strict: `NF01 -> NF02 -> AC03 -> AC04`.

## cURL Matrix (16 Assessment Cases)

Set your base URL first:

```bash
BASE_URL=http://localhost:3000
```

### Valid Cases

1. Full creation

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "George Cooks",
      "description": "Weekly cooking podcast",
      "slug": "george-cooks",
      "creator_reference": "crt_8f2k1m9x4p7w3q5z",
      "links": [{"title": "YouTube", "url": "https://youtube.com/@georgecooks"}],
      "service_rates": {
         "currency": "NGN",
         "rates": [{"name": "IG Story Post", "description": "One story mention", "amount": 5000000}]
      },
      "status": "published"
   }'
```

2. Slug auto-generation

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Ada Designs Things",
      "creator_reference": "crt_a1b2c3d4e5f6g7h8",
      "status": "published"
   }'
```

3. Private card creation

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "VIP Rate Card",
      "creator_reference": "crt_x9y8z7w6v5u4t3s2",
      "status": "published",
      "access_type": "private",
      "access_code": "A1B2C3"
   }'
```

4. Retrieve public published card

```bash
curl "$BASE_URL/creator-cards/george-cooks"
```

5. Retrieve private card with correct pin

```bash
curl "$BASE_URL/creator-cards/vip-rate-card?access_code=A1B2C3"
```

6. Delete existing card

```bash
curl -X DELETE "$BASE_URL/creator-cards/ada-designs-things" \
   -H "Content-Type: application/json" \
   -d '{"creator_reference": "crt_a1b2c3d4e5f6g7h8"}'
```

### Invalid Cases

7. Duplicate slug -> `SL02`

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Another George",
      "slug": "george-cooks",
      "creator_reference": "crt_m1n2b3v4c5x6z7l8",
      "status": "published"
   }'
```

8. Missing access_code on private -> `AC01`

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Secret Card",
      "creator_reference": "crt_q1w2e3r4t5y6u7i8",
      "status": "published",
      "access_type": "private"
   }'
```

9. access_code on public -> `AC05`

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Public Card",
      "creator_reference": "crt_q1w2e3r4t5y6u7i8",
      "status": "published",
      "access_type": "public",
      "access_code": "A1B2C3"
   }'
```

10. Validation failure (bad status) -> HTTP 400

```bash
curl -X POST "$BASE_URL/creator-cards" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Bad Status Card",
      "creator_reference": "crt_q1w2e3r4t5y6u7i8",
      "status": "archived"
   }'
```

11. Retrieve non-existent -> `NF01`

```bash
curl "$BASE_URL/creator-cards/does-not-exist-123"
```

12. Retrieve draft -> `NF02`

```bash
curl "$BASE_URL/creator-cards/my-draft-card"
```

13. Retrieve private without pin -> `AC03`

```bash
curl "$BASE_URL/creator-cards/vip-rate-card"
```

14. Retrieve private with wrong pin -> `AC04`

```bash
curl "$BASE_URL/creator-cards/vip-rate-card?access_code=WRONG1"
```

15. Delete non-existent -> `NF01`

```bash
curl -X DELETE "$BASE_URL/creator-cards/does-not-exist-123" \
   -H "Content-Type: application/json" \
   -d '{"creator_reference": "crt_q1w2e3r4t5y6u7i8"}'
```

16. Retrieve deleted card -> `NF01`

```bash
curl "$BASE_URL/creator-cards/ada-designs-things"
```

## Deploy Readiness (Render)

1. Push repository to GitHub.
2. Create Render Web Service from the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
    - `MONGODB_URI=<your atlas uri>`
    - `PORT=10000` (optional on Render, usually auto-set)
6. Deploy and copy base URL only.
7. Smoke test all three required endpoints at root path.

## Submission Notes

- Base URL: https://creator-cards-backend.onrender.com
