const crypto = require("crypto");
const Client = require("../models/Client");
const { writeRecordToChain } = require("../config/blockchain");
const { toPublicPath } = require("../config/multer");
const { calculateAge } = require("../utils/calculateAge");

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseGeoFields(body) {
  const latitude = Number(body.latitude ?? body.lat ?? NaN);
  const longitude = Number(body.longitude ?? body.lng ?? body.lon ?? NaN);
  const accuracyRaw = Number(body.locationAccuracy ?? body.accuracy ?? NaN);
  const locationLabel = String(body.locationLabel || "").trim() || null;

  if (!isValidCoordinate(latitude, longitude)) {
    return {
      location: undefined,
      locationAccuracy: Number.isFinite(accuracyRaw) ? accuracyRaw : null,
      locationCapturedAt: null,
      locationLabel
    };
  }

  return {
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    locationAccuracy: Number.isFinite(accuracyRaw) ? accuracyRaw : null,
    locationCapturedAt: new Date(),
    locationLabel
  };
}

function makeSha256Hex(raw) {
  return crypto.createHash("sha256").update(String(raw || "")).digest("hex");
}

function buildDeviceFingerprintHash(req, providedHash, fallbackParts = []) {
  const normalizedProvided = String(providedHash || "").trim().toLowerCase();

  if (/^[a-f0-9]{64}$/.test(normalizedProvided)) {
    return normalizedProvided;
  }

  const ua = req.get("user-agent") || "";
  const ip = req.ip || req.connection?.remoteAddress || "";
  const raw = [normalizedProvided, ua, ip, ...fallbackParts].join("|");
  return makeSha256Hex(raw);
}

function generateClientBlockchainHash({ nom, prenom, email, telephone, cinImage }) {
  const raw = `${nom}|${prenom}|${email}|${telephone}|${cinImage}|${Date.now()}|${Math.random()}`;
  return makeSha256Hex(raw);
}

async function registerClient(req, res, next) {
  try {
    const { nom, prenom, email, telephone, dateDeNaissance, deviceFingerprintHash } = req.body;
    const password = String(req.body.password ?? req.body.mdp ?? req.body.motDePasse ?? "").trim();

    if (!nom || !prenom || !email || !telephone || !dateDeNaissance || !password) {
      return res.status(400).json({
        message: "Required fields: nom, prenom, email, telephone, dateDeNaissance, password/mdp"
      });
    }

    const age = calculateAge(dateDeNaissance);
    if (Number.isNaN(age)) {
      return res.status(400).json({ message: "dateDeNaissance is invalid." });
    }

    if (age < 18) {
      return res.status(400).json({ message: "Client must be at least 18 years old." });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "cinImage is required."
      });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await Client.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "A client already exists with this email." });
    }

    const cinImage = toPublicPath(req.file.path);
    const geoFields = parseGeoFields(req.body);
    const deviceHash = buildDeviceFingerprintHash(req, deviceFingerprintHash, [normalizedEmail, telephone]);

    const blockchainHash = generateClientBlockchainHash({
      nom,
      prenom,
      email: normalizedEmail,
      telephone,
      cinImage
    });

    const chainRecord = await writeRecordToChain({
      entityType: "client",
      entityId: normalizedEmail,
      action: "inscription",
      hash: blockchainHash,
      metadata: {
        nom,
        prenom,
        telephone,
        location: geoFields.location ? geoFields.location.coordinates : null,
        deviceFingerprintHash: deviceHash
      }
    });

    const client = await Client.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      dateDeNaissance,
      age,
      cinImage,
      deviceFingerprintHash: deviceHash,
      location: geoFields.location,
      locationAccuracy: geoFields.locationAccuracy,
      locationCapturedAt: geoFields.locationCapturedAt,
      locationLabel: geoFields.locationLabel,
      statutVerification: "en_attente",
      blockchainHash,
      blockchainTxHash: chainRecord.txHash,
      blockchainNetwork: chainRecord.network,
      blockchainExplorerUrl: chainRecord.explorerUrl,
      blockchainRecordedAt: chainRecord.recordedAt,
      blockchainMode: chainRecord.mode
    });

    return res.status(201).json({
      message: "Client registered successfully.",
      blockchain: chainRecord,
      client
    });
  } catch (error) {
    return next(error);
  }
}

async function getClientStatus(req, res, next) {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "email query param is required." });
    }

    const client = await Client.findOne({ email }).select(
      "email nom prenom telephone dateDeNaissance age cinImage statutVerification updatedAt createdAt"
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    return res.json({
      email: client.email,
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      dateDeNaissance: client.dateDeNaissance || null,
      age: client.age || null,
      cinImage: client.cinImage || null,
      statutVerification: client.statutVerification || "en_attente",
      updatedAt: client.updatedAt,
      createdAt: client.createdAt
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerClient,
  getClientStatus
};
