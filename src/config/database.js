const mongoose = require("mongoose");

async function connectDatabase(mongoUri) {
  await mongoose.connect(mongoUri);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};
