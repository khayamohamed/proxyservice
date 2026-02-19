require("dotenv").config();

const express = require("express");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const connectDB = require("./config/db");

const Prestataire = require("./models/Prestataire");
const Client = require("./models/Client");

const prestataireRoutes = require("./routes/prestataire.routes");
const clientRoutes = require("./routes/client.routes");
const commandeRoutes = require("./routes/commande.routes");
const adminRoutes = require("./routes/admin.routes");
const fingerprintRoutes = require("./routes/fingerprint.routes");
const supportRoutes = require("./routes/support.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const requestPath = String(req.path || "").toLowerCase();
  const shouldDisableCache =
    requestPath.endsWith(".html") || requestPath.endsWith("/admin-dashboard.js");

  if (shouldDisableCache) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "..")));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "provider-client-platform-api" });
});

app.use("/prestataires", prestataireRoutes);
app.use("/clients", clientRoutes);
app.use("/commandes", commandeRoutes);
app.use("/admin", adminRoutes);
app.use("/fingerprint", fingerprintRoutes);
app.use("/support", supportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Upload error: image too large (max 15MB)." });
    }
    return res.status(400).json({ message: `Upload error: ${error.message}` });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "Duplicate unique field value." });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid id format." });
  }

  return res.status(500).json({ message: error.message || "Internal server error." });
});

const PORT = process.env.PORT || 5000;
const USE_HTTPS = String(process.env.USE_HTTPS || "").trim().toLowerCase() === "true";
const SSL_PFX_PATH = path.resolve(
  process.env.SSL_PFX_PATH || path.join(__dirname, "..", "certs", "localhost-dev.pfx")
);
const SSL_PFX_PASSPHRASE = String(process.env.SSL_PFX_PASSPHRASE || "localdev123");

function normalizePort(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }
  return 5000;
}

function createServerFactory(appInstance) {
  if (!USE_HTTPS) {
    return {
      protocol: "http",
      create: () => http.createServer(appInstance)
    };
  }

  if (!fs.existsSync(SSL_PFX_PATH)) {
    throw new Error(`HTTPS cert not found at ${SSL_PFX_PATH}. Generate it before starting with USE_HTTPS=true.`);
  }

  const pfx = fs.readFileSync(SSL_PFX_PATH);
  return {
    protocol: "https",
    create: () => https.createServer({ pfx, passphrase: SSL_PFX_PASSPHRASE }, appInstance)
  };
}

function listenWithPortFallback(appInstance, preferredPort, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    const startPort = normalizePort(preferredPort);
    let serverFactory;

    try {
      serverFactory = createServerFactory(appInstance);
    } catch (error) {
      reject(error);
      return;
    }

    const tryListen = (port, attempt) => {
      const server = serverFactory.create();
      server.listen(port, () => {
        resolve({ server, port, protocol: serverFactory.protocol });
      });

      server.once("error", (error) => {
        if (error && error.code === "EADDRINUSE" && attempt < maxAttempts) {
          const nextPort = port + 1;
          console.warn(`Port ${port} already in use. Retrying on ${nextPort}...`);
          setTimeout(() => tryListen(nextPort, attempt + 1), 50);
          return;
        }

        reject(error);
      });
    };

    tryListen(startPort, 0);
  });
}

const invalidGeoFilter = {
  "location.type": "Point",
  $or: [
    { "location.coordinates": { $exists: false } },
    { "location.coordinates.0": { $exists: false } },
    { "location.coordinates.1": { $exists: false } }
  ]
};

const LEGACY_PROFILE_PHOTO_URLS = [
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/svps67bm_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/mdpghlrl_expires_30_days.png"
];

async function sanitizeLegacyGeoDocuments() {
  const [clientResult, providerResult] = await Promise.all([
    Client.updateMany(invalidGeoFilter, {
      $unset: { location: "" },
      $set: { locationAccuracy: null, locationCapturedAt: null }
    }),
    Prestataire.updateMany(invalidGeoFilter, {
      $unset: { location: "" },
      $set: { locationAccuracy: null, locationCapturedAt: null }
    })
  ]);

  const updatedCount =
    (clientResult.modifiedCount || 0) +
    (providerResult.modifiedCount || 0);

  if (updatedCount > 0) {
    console.warn(`Sanitized ${updatedCount} legacy document(s) with invalid GeoJSON location.`);
  }
}

async function sanitizeLegacyProfilePhotoDocuments() {
  const result = await Prestataire.updateMany(
    { photoProfil: { $in: LEGACY_PROFILE_PHOTO_URLS } },
    { $set: { photoProfil: null } }
  );
  if ((result.modifiedCount || 0) > 0) {
    console.warn(`Sanitized ${result.modifiedCount} legacy prestataire profile photo(s).`);
  }
}

async function startServer() {
  try {
    await connectDB();
    await sanitizeLegacyGeoDocuments();
    await sanitizeLegacyProfilePhotoDocuments();
    const { port, protocol } = await listenWithPortFallback(app, PORT);
    console.log(`Server started on ${protocol}://localhost:${port}`);
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
