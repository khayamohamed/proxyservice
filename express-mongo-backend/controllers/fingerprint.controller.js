const crypto = require("crypto");
const Prestataire = require("../models/Prestataire");
const { writeRecordToChain } = require("../config/blockchain");

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseGeoFields(body) {
  const payload = body && typeof body === "object" ? body : {};
  const latitude = Number(payload.latitude ?? payload.lat ?? NaN);
  const longitude = Number(payload.longitude ?? payload.lng ?? payload.lon ?? NaN);
  const accuracyRaw = Number(payload.locationAccuracy ?? payload.accuracy ?? NaN);
  const locationLabel = String(payload.locationLabel || "").trim() || null;

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

function isFingerprintPageRequired(prestataire) {
  const status = normalizeStatus(prestataire && prestataire.statutVerification);
  if (status === "entretien_valide") {
    return true;
  }

  if (status !== "valide") {
    return false;
  }

  const hasFingerprintHash = Boolean(String((prestataire && prestataire.fingerprintHash) || "").trim());
  const captureMode = String((prestataire && prestataire.fingerprintCaptureMode) || "").trim().toLowerCase();
  return !hasFingerprintHash || !captureMode;
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

function buildFingerprintStatusPayload(prestataire) {
  const shouldOpenFingerprintPage = isFingerprintPageRequired(prestataire);

  return {
    email: prestataire.email,
    nom: prestataire.nom || "",
    prenom: prestataire.prenom || "",
    telephone: prestataire.telephone || "",
    categorie: prestataire.categorie || "",
    domaine: prestataire.domaine || "",
    experience: prestataire.experience || "",
    photoProfil: prestataire.photoProfil || "",
    statutVerification: prestataire.statutVerification || "en_attente",
    fingerprintCaptured: Boolean(prestataire.fingerprintHash),
    fingerprintRecordedAt: prestataire.fingerprintRecordedAt || null,
    fingerprintCaptureMode: prestataire.fingerprintCaptureMode || "",
    ...buildCoveragePayload(prestataire),
    shouldOpenFingerprintPage,
    nextPage: shouldOpenFingerprintPage ? "page7" : "page8",
    redirectPath: "/index.html"
  };
}

async function getFingerprintPage(req, res, next) {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "email query param is required." });
    }

    const prestataire = await Prestataire.findOne({ email }).select(
      "email nom prenom telephone categorie domaine experience photoProfil statutVerification fingerprintHash fingerprintRecordedAt fingerprintCaptureMode location locationAccuracy locationCapturedAt locationLabel"
    );

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const payload = buildFingerprintStatusPayload(prestataire);
    const status = normalizeStatus(prestataire.statutVerification);
    const message =
      status === "entretien_valide" || payload.shouldOpenFingerprintPage
        ? "Entretien approuve. Ouvrez la page fingerprint."
        : "Fingerprint deja complete. Redirection vers l'accueil.";

    return res.json({
      message,
      ...payload
    });
  } catch (error) {
    return next(error);
  }
}

async function submitFingerprint(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const providedHash = String(req.body.deviceFingerprintHash || "").trim();
    const captureModeRaw = String(req.body.captureMode || "").trim().toLowerCase();
    const captureMode = captureModeRaw === "biometric" ? "biometric" : "fallback";
    const fingerprintCredentialId = String(req.body.fingerprintCredentialId || "").trim();

    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }

    const prestataire = await Prestataire.findOne({ email });
    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const currentStatus = normalizeStatus(prestataire.statutVerification);
    if (currentStatus === "refuse") {
      return res.status(400).json({ message: "Provider is refused." });
    }

    if (currentStatus !== "entretien_valide" && currentStatus !== "valide") {
      return res.status(400).json({
        message: "Interview must be validated before fingerprint."
      });
    }

    const geoFields = parseGeoFields(req.body);
    const fingerprintHash = buildDeviceFingerprintHash(req, providedHash, [
      prestataire.email,
      prestataire.telephone,
      prestataire.domaine,
      prestataire._id
    ]);

    const chainRecord = await writeRecordToChain({
      entityType: "prestataire",
      entityId: String(prestataire._id),
      action: "fingerprint_capture",
      hash: fingerprintHash,
      metadata: {
        email: prestataire.email,
        statutVerification: "valide",
        captureMode,
        fingerprintCredentialId: fingerprintCredentialId || null,
        location: geoFields.location ? geoFields.location.coordinates : null
      }
    });

    prestataire.deviceFingerprintHash = fingerprintHash;
    prestataire.fingerprintHash = fingerprintHash;
    prestataire.fingerprintTxHash = chainRecord.txHash;
    prestataire.fingerprintNetwork = chainRecord.network;
    prestataire.fingerprintExplorerUrl = chainRecord.explorerUrl;
    prestataire.fingerprintRecordedAt = chainRecord.recordedAt;
    prestataire.fingerprintMode = chainRecord.mode;
    prestataire.fingerprintCaptureMode = captureMode;
    prestataire.fingerprintCredentialId = fingerprintCredentialId || prestataire.fingerprintCredentialId || null;
    prestataire.statutVerification = "valide";

    if (geoFields.location) {
      prestataire.location = geoFields.location;
      prestataire.locationCapturedAt = geoFields.locationCapturedAt;
    }

    if (geoFields.locationAccuracy !== null) {
      prestataire.locationAccuracy = geoFields.locationAccuracy;
    }

    if (geoFields.locationLabel) {
      prestataire.locationLabel = geoFields.locationLabel;
    }

    await prestataire.save();

    return res.json({
      message: "Fingerprint enregistre. Redirection vers l'accueil de l'application.",
      nextPage: "page8",
      redirectPath: "/index.html",
      shouldOpenFingerprintPage: false,
      blockchain: chainRecord,
      prestataire,
      status: buildFingerprintStatusPayload(prestataire)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getFingerprintPage,
  submitFingerprint,
  isFingerprintPageRequired,
  buildFingerprintStatusPayload
};
