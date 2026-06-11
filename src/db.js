const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI. Create a .env file (see .env.example).");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

module.exports = { connectDb };

