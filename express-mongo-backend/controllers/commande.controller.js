const mongoose = require("mongoose");
const Commande = require("../models/Commande");
const Client = require("../models/Client");
const Prestataire = require("../models/Prestataire");
const { sendProviderOrderNotification } = require("../utils/emailNotifications");

const DISTANCE_RADIUS_KM = 4;
const DISTANCE_TARIF_WITHIN_RADIUS_DH = 10;
const DISTANCE_TARIF_OUTSIDE_RADIUS_DH = 15;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeRegex(input) {
  return String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toGeoPoint(entity) {
  const coordinates = entity && entity.location && Array.isArray(entity.location.coordinates)
    ? entity.location.coordinates
    : null;

  if (!coordinates || coordinates.length !== 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function parseClientGeoFields(body) {
  const latitude = Number(body.clientLatitude ?? body.latitude ?? NaN);
  const longitude = Number(body.clientLongitude ?? body.longitude ?? body.lng ?? body.lon ?? NaN);
  const accuracyRaw = Number(body.clientLocationAccuracy ?? body.locationAccuracy ?? body.accuracy ?? NaN);
  const locationLabel = String(body.clientLocationLabel ?? body.locationLabel ?? "").trim() || null;

  if (!isValidCoordinate(latitude, longitude)) {
    return {
      point: null,
      location: undefined,
      locationAccuracy: Number.isFinite(accuracyRaw) ? accuracyRaw : null,
      locationCapturedAt: null,
      locationLabel
    };
  }

  return {
    point: { latitude, longitude },
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    locationAccuracy: Number.isFinite(accuracyRaw) ? accuracyRaw : null,
    locationCapturedAt: new Date(),
    locationLabel
  };
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function computeDistancePricing(client, prestataire, clientPointOverride = null) {
  const clientPoint = clientPointOverride || toGeoPoint(client);
  const providerPoint = toGeoPoint(prestataire);

  if (!clientPoint || !providerPoint) {
    return {
      distanceKm: null,
      distancePricingDh: DISTANCE_TARIF_OUTSIDE_RADIUS_DH,
      distancePricingRule: "fallback_no_geolocation"
    };
  }

  const distanceKmRaw = haversineDistanceKm(
    clientPoint.latitude,
    clientPoint.longitude,
    providerPoint.latitude,
    providerPoint.longitude
  );
  const distanceKm = Number(distanceKmRaw.toFixed(2));
  const withinRadius = distanceKmRaw <= DISTANCE_RADIUS_KM;

  return {
    distanceKm,
    distancePricingDh: withinRadius ? DISTANCE_TARIF_WITHIN_RADIUS_DH : DISTANCE_TARIF_OUTSIDE_RADIUS_DH,
    distancePricingRule: withinRadius ? "within_4km" : "over_4km"
  };
}

async function resolveClient({ clientId, clientEmail }) {
  const normalizedId = String(clientId || "").trim();
  if (normalizedId) {
    if (!mongoose.isValidObjectId(normalizedId)) {
      return null;
    }

    return Client.findById(normalizedId);
  }

  const normalizedEmail = normalizeEmail(clientEmail);
  if (!normalizedEmail) {
    return null;
  }

  return Client.findOne({ email: normalizedEmail });
}

async function resolvePrestataire({ prestataireId, prestataireEmail, prestataireNom, domaine }) {
  const normalizedId = String(prestataireId || "").trim();
  if (normalizedId) {
    if (!mongoose.isValidObjectId(normalizedId)) {
      return null;
    }

    return Prestataire.findById(normalizedId);
  }

  const normalizedEmail = normalizeEmail(prestataireEmail);
  if (normalizedEmail) {
    return Prestataire.findOne({ email: normalizedEmail });
  }

  const rawName = String(prestataireNom || "").trim();
  if (!rawName) {
    return null;
  }

  const nameTokens = rawName.split(/\s+/).filter(Boolean);
  const nameFilters = nameTokens.flatMap((token) => {
    const regex = new RegExp(`^${escapeRegex(token)}$`, "i");
    return [{ prenom: regex }, { nom: regex }];
  });
  const queryFilters = [];

  if (nameFilters.length) {
    queryFilters.push({ $or: nameFilters });
  } else {
    const looseRegex = new RegExp(escapeRegex(rawName), "i");
    queryFilters.push({ $or: [{ prenom: looseRegex }, { nom: looseRegex }] });
  }

  const rawDomaine = String(domaine || "").trim();
  if (rawDomaine) {
    const domainRegex = new RegExp(`^${escapeRegex(rawDomaine)}$`, "i");
    queryFilters.push({
      $or: [{ categorie: domainRegex }, { domaine: domainRegex }]
    });
  }

  const query = queryFilters.length > 1 ? { $and: queryFilters } : queryFilters[0];
  return Prestataire.findOne(query).sort({ updatedAt: -1, createdAt: -1 });
}

async function createCommande(req, res, next) {
  try {
    const {
      clientId,
      prestataireId,
      clientEmail,
      prestataireEmail,
      prestataireNom,
      domaine,
      service,
      statut,
      paymentMethod
    } =
      req.body;

    if (
      !service ||
      (!clientId && !clientEmail) ||
      (!prestataireId && !prestataireEmail && !prestataireNom)
    ) {
      return res.status(400).json({
        message:
          "Required fields: service + (clientId or clientEmail) + (prestataireId or prestataireEmail or prestataireNom)"
      });
    }

    const [client, prestataire] = await Promise.all([
      resolveClient({ clientId, clientEmail }),
      resolvePrestataire({ prestataireId, prestataireEmail, prestataireNom, domaine })
    ]);

    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    if (prestataire.statutVerification !== "valide") {
      return res.status(400).json({
        message: "Cannot assign order to a provider not fully verified (statutVerification must be valide)."
      });
    }

    const normalizedPaymentMethod = String(paymentMethod || "").trim().toLowerCase() === "cash"
      ? "cash"
      : "carte_bancaire";
    const clientGeoFields = parseClientGeoFields(req.body || {});
    const distancePricing = computeDistancePricing(client, prestataire, clientGeoFields.point);

    const commande = await Commande.create({
      clientId: client._id,
      prestataireId: prestataire._id,
      service: String(service || "").trim(),
      paymentMethod: normalizedPaymentMethod,
      clientLocation: clientGeoFields.location,
      clientLocationAccuracy: clientGeoFields.locationAccuracy,
      clientLocationCapturedAt: clientGeoFields.locationCapturedAt,
      clientLocationLabel: clientGeoFields.locationLabel,
      distanceKm: distancePricing.distanceKm,
      distancePricingDh: distancePricing.distancePricingDh,
      distancePricingRule: distancePricing.distancePricingRule,
      statut: statut || "en_attente"
    });

    const populated = await Commande.findById(commande._id).populate("clientId").populate("prestataireId");
    const clientName = `${client.prenom || ""} ${client.nom || ""}`.trim() || client.email || "Client";
    const providerName =
      `${prestataire.prenom || ""} ${prestataire.nom || ""}`.trim() || prestataire.email || "Prestataire";
    const emailResult = await sendProviderOrderNotification({
      providerEmail: prestataire.email,
      providerName,
      clientName,
      service: String(service || "").trim(),
      paymentMethod: normalizedPaymentMethod,
      distanceKm: distancePricing.distanceKm,
      distancePricingDh: distancePricing.distancePricingDh,
      createdAt: commande.createdAt,
      orderId: commande._id ? String(commande._id) : ""
    });
    if (!emailResult.sent) {
      const failureReason =
        emailResult.reason === "smtp_send_failed" && emailResult.error
          ? `${emailResult.reason}: ${emailResult.error}`
          : emailResult.reason;
      console.warn(
        `[email-notification] provider=${prestataire.email} order=${String(
          commande._id || ""
        )} reason=${failureReason || "unknown"}`
      );
    }

    return res.status(201).json({
      message: "Commande created successfully.",
      pricing: distancePricing,
      commande: populated,
      emailNotification: {
        sent: Boolean(emailResult.sent),
        reason: emailResult.reason || ""
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCommande
};
