// backend/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbName = process.env.MONGO_DB_NAME || "LSDGuard";

    await mongoose.connect(process.env.MONGO_URI, {
      dbName,
    });

    console.log(`✅ MongoDB Connected to database: ${dbName}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
