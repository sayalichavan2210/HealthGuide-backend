const express      = require("express");
const mongoose     = require("mongoose");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");
const passport     = require("passport");
require("dotenv").config();

const connectDB    = require("./config/db");
require("./config/passport");

const authRoutes   = require("./routes/authRoutes");
const userRoutes   = require("./routes/userRoutes");
const healthRoutes = require("./routes/healthRoutes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const contactRoutes = require("./routes/contactRoutes");

const app     = express();
const session = require("express-session");

// ── Connect Database ─────────────────────────────────────
connectDB();

// ── Security Middlewares ─────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Logger (dev only) ────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Health Check ─────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "OK",
    server:    "VitaRisk API",
    timestamp: new Date().toISOString(),
    db:        mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// ── Routes ───────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/user",   userRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/contact", contactRoutes);
// ── Gemini Proxy — Vitals Analysis (text) ────────────────
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ text });
  } catch (err) {
    console.error("Gemini proxy error:", err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});

// ── Gemini Proxy — Report Analyzer (image + PDF) ─────────
app.post("/api/gemini-report", async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    const prompt = `You are a medical report analyzer. Analyze the uploaded report and return ONLY a JSON object (no markdown, no extra text):
{
  "reportType": "string",
  "conditions": [{"name":"string","severity":"high|medium|normal","detail":"string"}],
  "keyFindings": ["string"],
  "recommendation": "string"
}
If not a medical report, set reportType to "Not a medical report" and conditions to [].`;

    const response = await fetch(
   `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const raw   = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try   { parsed = JSON.parse(clean); }
    catch { return res.status(500).json({ error: "Could not parse Gemini response" }); }

    res.json(parsed);
  } catch (err) {
    console.error("Gemini report proxy error:", err);
    res.status(500).json({ error: "Gemini report request failed" });
  }
});

// ── Error Handlers ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 VitaRisk Server running on http://localhost:${PORT}`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});