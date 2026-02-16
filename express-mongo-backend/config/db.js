const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let memoryServer = null;

async function connectUsingUri(mongoUri) {
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoUri}`);
}

async function connectInMemoryMongo() {
  memoryServer = await MongoMemoryServer.create();
  const inMemoryUri = memoryServer.getUri("proxyservices_platform");
  await mongoose.connect(inMemoryUri);
  console.log("MongoDB connected with in-memory fallback.");
}

async function connectDB() {
  const mongoUri = String(process.env.MONGO_URI || "").trim();
  const forceInMemory = String(process.env.USE_IN_MEMORY_MONGO || "").toLowerCase() === "true";

  if (forceInMemory) {
    await connectInMemoryMongo();
    return;
  }

  if (!mongoUri) {
    console.warn("MONGO_URI is missing. Switching to in-memory MongoDB.");
    await connectInMemoryMongo();
    return;
  }

  try {
    await connectUsingUri(mongoUri);
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${error.message}). Switching to in-memory MongoDB.`);
    await connectInMemoryMongo();
  }
}

process.on("SIGINT", async () => {
  if (memoryServer) {
    await memoryServer.stop();
  }
});

module.exports = connectDB;
