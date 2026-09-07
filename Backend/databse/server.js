const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("./db");
const authRoutes = require("./routes/auth");
const cowRoutes = require("./routes/cow");
const scanRoutes = require("./routes/scan");
const userRoutes = require("./routes/user");

const app = express();

/* CONNECT DATABASE */
connectDB();

/* MIDDLEWARE */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());

/* STATIC FOLDER FOR IMAGES */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/cow", cowRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/user", userRoutes);

app.use((err, _req, res, _next) => {
  if (!err) {
    res.status(500).json({ message: "Something went wrong" });
    return;
  }

  if (
    err.message &&
    err.message.includes("Only PNG, JPG, JPEG, and PDF files are allowed.")
  ) {
    res.status(400).json({
      message: "Please upload a file with one of these extensions: PNG, JPG, JPEG, or PDF.",
    });
    return;
  }

  console.error("SERVER ERROR:", err);
  res.status(500).json({ message: err.message || "Something went wrong" });
});

/* ROOT ROUTE */
app.get("/", (req, res) => {
  res.send("API is running...");
});

/* START SERVER - port 5000 matches the frontend fetch calls */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} (all interfaces)`);
});
