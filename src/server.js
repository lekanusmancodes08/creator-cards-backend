require("dotenv").config();

const { app } = require("./app");
const { validateEnv } = require("./config/env");
const { connectDatabase } = require("./config/database");

const port = process.env.PORT || 3000;

async function bootstrap() {
  validateEnv();
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Creator Card API running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
