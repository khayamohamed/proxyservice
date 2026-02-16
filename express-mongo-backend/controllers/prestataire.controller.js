const crypto = require("crypto");
const Prestataire = require("../models/Prestataire");
const { writeRecordToChain } = require("../config/blockchain");
const { toPublicPath } = require("../config/multer");
const { calculateAge } = require("../utils/calculateAge");
const { submitFingerprint } = require("./fingerprint.controller");

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
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

function buildCoveragePayload(prestataire) {
  const coordinates =
    prestataire && prestataire.location && Array.isArray(prestataire.location.coordinates)
      ? prestataire.location.coordinates
      : null;
  const longitude = coordinates && coordinates.length === 2 ? Number(coordinates[0]) : null;
  const latitude = coordinates && coordinates.length === 2 ? Number(coordinates[1]) : null;
  const hasCoverage = isValidCoordinate(latitude, longitude);
  const locationAccuracy = Number.isFinite(Number(prestataire && prestataire.locationAccuracy))
    ? Number(prestataire.locationAccuracy)
    : null;
  const locationLabel = String((prestataire && prestataire.locationLabel) || "").trim() || null;

  return {
    coverageGeoEnabled: hasCoverage,
    coverageLatitude: hasCoverage ? latitude : null,
    coverageLongitude: hasCoverage ? longitude : null,
    coverageAccuracy: locationAccuracy,
    coverageLocationLabel: locationLabel,
    coverageCapturedAt: hasCoverage ? prestataire.locationCapturedAt || null : null,
    latitude: hasCoverage ? latitude : null,
    longitude: hasCoverage ? longitude : null,
    locationAccuracy,
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

function generatePrestataireBlockchainHash({ nom, prenom, email, telephone, domaine, cinImage, casierImage }) {
  const raw = `${nom}|${prenom}|${email}|${telephone}|${domaine}|${cinImage}|${casierImage}|${Date.now()}|${Math.random()}`;
  return makeSha256Hex(raw);
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function registerPrestataire(req, res, next) {
  try {
    const {
      nom,
      prenom,
      email,
      telephone,
      categorie,
      domaine,
      experience,
      dateDeNaissance,
      deviceFingerprintHash
    } = req.body;
    const password = String(req.body.password ?? req.body.mdp ?? req.body.motDePasse ?? "").trim();

    const normalizedCategory = String(categorie || domaine || "").trim();

    if (!nom || !prenom || !email || !telephone || !password || !normalizedCategory || !experience) {
      return res.status(400).json({
        message: "Required fields: nom, prenom, email, telephone, password/mdp, domaine/categorie, experience"
      });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await Prestataire.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "A provider already exists with this email." });
    }

    const cinFile = req.files && req.files.cinImage ? req.files.cinImage[0] : null;
    const casierFile = req.files && req.files.casierImage ? req.files.casierImage[0] : null;
    const profileFile = req.files && req.files.photoProfil ? req.files.photoProfil[0] : null;

    if (!cinFile || !casierFile) {
      return res.status(400).json({
        message: "Both cinImage and casierImage are required."
      });
    }

    let parsedBirthDate = null;
    let computedAge = null;

    if (dateDeNaissance) {
      const age = calculateAge(dateDeNaissance);

      if (Number.isNaN(age)) {
        return res.status(400).json({ message: "dateDeNaissance is invalid." });
      }

      if (age < 18) {
        return res.status(400).json({ message: "Provider must be at least 18 years old." });
      }

      parsedBirthDate = dateDeNaissance;
      computedAge = age;
    }

    const cinImage = toPublicPath(cinFile.path);
    const casierImage = toPublicPath(casierFile.path);
    const geoFields = parseGeoFields(req.body);
    const deviceHash = buildDeviceFingerprintHash(req, deviceFingerprintHash, [normalizedEmail, telephone, normalizedCategory]);

    const blockchainHash = generatePrestataireBlockchainHash({
      nom,
      prenom,
      email: normalizedEmail,
      telephone,
      domaine: normalizedCategory,
      cinImage,
      casierImage
    });

    const chainRecord = await writeRecordToChain({
      entityType: "prestataire",
      entityId: normalizedEmail,
      action: "inscription",
      hash: blockchainHash,
      metadata: {
        nom,
        prenom,
        domaine: normalizedCategory,
        telephone,
        location: geoFields.location ? geoFields.location.coordinates : null,
        deviceFingerprintHash: deviceHash
      }
    });

    const prestataire = await Prestataire.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      categorie: normalizedCategory,
      domaine: normalizedCategory,
      experience,
      photoProfil: profileFile ? toPublicPath(profileFile.path) : null,
      dateDeNaissance: parsedBirthDate,
      age: computedAge,
      cinImage,
      casierImage,
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
      message: "Provider registered. Verification status is en_attente.",
      blockchain: chainRecord,
      prestataire
    });
  } catch (error) {
    return next(error);
  }
}

async function submitPrestataireFingerprint(req, res, next) {
  return submitFingerprint(req, res, next);
}

async function updatePrestataireCoverage(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }

    const geoFields = parseGeoFields(req.body);
    if (!geoFields.location) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required."
      });
    }

    const prestataire = await Prestataire.findOne({ email });
    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const currentStatus = normalizeStatus(prestataire.statutVerification);
    if (currentStatus !== "entretien_valide" && currentStatus !== "valide") {
      return res.status(400).json({
        message: "Provider must be approved before location update."
      });
    }

    prestataire.location = geoFields.location;
    prestataire.locationAccuracy = geoFields.locationAccuracy;
    prestataire.locationCapturedAt = geoFields.locationCapturedAt || new Date();
    prestataire.locationLabel = geoFields.locationLabel || prestataire.locationLabel || "gps_device";
    await prestataire.save();

    return res.json({
      message: "Provider coverage location saved.",
      prestataire: {
        email: prestataire.email,
        statutVerification: prestataire.statutVerification,
        ...buildCoveragePayload(prestataire)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getPrestatairesByCategorie(req, res, next) {
  try {
    const { categorie } = req.query;

    const filter = { statutVerification: "valide" };

    if (categorie) {
      filter.categorie = new RegExp(`^${escapeRegex(categorie)}$`, "i");
    }

    const queryLat = Number(req.query.latitude ?? req.query.lat ?? NaN);
    const queryLng = Number(req.query.longitude ?? req.query.lng ?? req.query.lon ?? NaN);
    const withDistance = isValidCoordinate(queryLat, queryLng);

    const docs = await Prestataire.find(filter)
      .select("email nom prenom telephone categorie domaine experience photoProfil age statutVerification location locationAccuracy locationCapturedAt locationLabel blockchainHash blockchainTxHash blockchainNetwork blockchainExplorerUrl blockchainMode fingerprintHash fingerprintTxHash fingerprintNetwork fingerprintExplorerUrl fingerprintMode fingerprintCaptureMode fingerprintCredentialId createdAt")
      .sort({ createdAt: -1 });

    let prestataires = docs.map((doc) => doc.toObject());

    if (withDistance) {
      prestataires = prestataires
        .map((item) => {
          const coords = item.location && Array.isArray(item.location.coordinates) ? item.location.coordinates : null;
          if (!coords || coords.length !== 2) {
            return { ...item, distanceKm: null };
          }

          const distanceKm = haversineDistanceKm(queryLat, queryLng, Number(coords[1]), Number(coords[0]));
          return { ...item, distanceKm: Number(distanceKm.toFixed(2)) };
        })
        .sort((a, b) => {
          if (a.distanceKm == null && b.distanceKm == null) return 0;
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    return res.json({
      count: prestataires.length,
      prestataires
    });
  } catch (error) {
    return next(error);
  }
}

async function getPrestataireStatus(req, res, next) {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "email query param is required." });
    }

    const prestataire = await Prestataire.findOne({ email }).select(
      "email nom prenom telephone categorie domaine experience photoProfil statutVerification fingerprintHash fingerprintRecordedAt fingerprintCaptureMode location locationAccuracy locationCapturedAt locationLabel updatedAt createdAt"
    );

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    return res.json({
      email: prestataire.email,
      nom: prestataire.nom,
      prenom: prestataire.prenom,
      telephone: prestataire.telephone,
      categorie: prestataire.categorie || "",
      domaine: prestataire.domaine || "",
      experience: prestataire.experience || "",
      photoProfil: prestataire.photoProfil || "",
      statutVerification: prestataire.statutVerification || "en_attente",
      fingerprintCaptured: Boolean(prestataire.fingerprintHash),
      fingerprintRecordedAt: prestataire.fingerprintRecordedAt || null,
      fingerprintCaptureMode: prestataire.fingerprintCaptureMode || "fallback",
      ...buildCoveragePayload(prestataire),
      updatedAt: prestataire.updatedAt,
      createdAt: prestataire.createdAt
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerPrestataire,
  submitPrestataireFingerprint,
  updatePrestataireCoverage,
  getPrestatairesByCategorie,
  getPrestataireStatus
};
