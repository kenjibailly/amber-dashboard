require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const authRoutes = require("./routes/auth");
const guildRoutes = require("./routes/guilds");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.DASHBOARD_PORT || 8080;

// Utilities
const Logger = require("./utilities/logger.js");
global.logger = new Logger("Bot");

// CORS - must come before routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

// Function to extract domain from URL
function getDomainFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    // Extract base domain (e.g., "mindglowing.art" from "amber-dashboard.mindglowing.art")
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return `.${parts.slice(-2).join(".")}`; // Returns ".mindglowing.art"
    }
    return hostname;
  } catch (err) {
    console.error("Error parsing domain:", err);
    return undefined;
  }
}

const sessionDomain = getDomainFromUrl(
  process.env.DOMAIN || process.env.FRONTEND_URL,
);

console.log("Session cookie domain:", sessionDomain);

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "supersecret",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === "production",
//       httpOnly: true,
//       maxAge: 24 * 60 * 60 * 1000,
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       domain: sessionDomain // Dynamically set domain
//     }
//   })
// );

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Must be false for development (true only for HTTPS in production)
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      domain: sessionDomain, // Share cookie across subdomains
    },
  }),
);

// MongoDB connection
const mongodb_URI = require("./mongodb/URI");

// MongoDB
mongoose
  .connect(mongodb_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

// API Routes - these must come BEFORE static file serving
app.use("/auth", authRoutes);
app.use("/guilds", guildRoutes);
app.use("/api/admin", adminRoutes);

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Catch-all route to serve index.html for React Router
// This must be LAST so it doesn't catch API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

app.listen(PORT, () =>
  console.log(`Dashboard backend running on port ${PORT}`),
);
