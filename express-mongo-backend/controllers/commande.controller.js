const mongoose = require("mongoose");
const Commande = require("../models/Commande");
const CommandeChatMessage = require("../models/CommandeChatMessage");
const Client = require("../models/Client");
const Prestataire = require("../models/Prestataire");
const { sendProviderOrderNotification } = require("../utils/emailNotifications");

const DISTANCE_RADIUS_KM = 4;
const DISTANCE_TARIF_WITHIN_RADIUS_DH = 10;
const DISTANCE_TARIF_OUTSIDE_RADIUS_DH = 15;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
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

function splitFullName(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) {
    return { prenom: "Client", nom: "Local" };
  }
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { prenom: parts[0], nom: "Client" };
  }
  return {
    prenom: parts.slice(0, -1).join(" "),
    nom: parts.slice(-1).join(" ")
  };
}

async function ensureClientExistsFromPayload(payload = {}) {
  const email = normalizeEmail(payload.clientEmail);
  if (!email) {
    return null;
  }

  const existing = await Client.findOne({ email });
  if (existing) {
    return existing;
  }

  const fullName = String(payload.clientName || "").trim();
  const fromFullName = splitFullName(fullName);
  const prenom = String(payload.clientPrenom || fromFullName.prenom || "Client").trim() || "Client";
  const nom = String(payload.clientNom || fromFullName.nom || "Local").trim() || "Local";
  const telephone = String(payload.clientTelephone || payload.telephone || "0000000000").trim() || "0000000000";
  const password = String(payload.clientPassword || "").trim();
  const fallbackCinImage = "/uploads/clients/cin/.gitkeep";

  try {
    return await Client.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      cinImage: fallbackCinImage,
      statutVerification: "valide"
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return Client.findOne({ email });
    }
    throw error;
  }
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

    let [client, prestataire] = await Promise.all([
      resolveClient({ clientId, clientEmail }),
      resolvePrestataire({ prestataireId, prestataireEmail, prestataireNom, domaine })
    ]);

    if (!client) {
      client = await ensureClientExistsFromPayload(req.body || {});
    }

    if (!client) {
      return res.status(404).json({
        message: "Client not found. Provide a valid client account or include client payload fields."
      });
    }

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const providerStatus = String(prestataire.statutVerification || "").trim().toLowerCase();
    if (providerStatus === "refuse" || providerStatus === "banni") {
      return res.status(400).json({
        message: "Cannot assign order to this provider account."
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

function getParticipantFromCommande(commande, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !commande) {
    return null;
  }

  const clientEmail = normalizeEmail(commande.clientId && commande.clientId.email);
  if (clientEmail && clientEmail === normalizedEmail) {
    return {
      type: "client",
      email: clientEmail,
      name: `${normalizeName(commande.clientId.prenom)} ${normalizeName(commande.clientId.nom)}`.trim() || clientEmail
    };
  }

  const providerEmail = normalizeEmail(commande.prestataireId && commande.prestataireId.email);
  if (providerEmail && providerEmail === normalizedEmail) {
    return {
      type: "prestataire",
      email: providerEmail,
      name:
        `${normalizeName(commande.prestataireId.prenom)} ${normalizeName(commande.prestataireId.nom)}`.trim() ||
        providerEmail
    };
  }

  return null;
}

async function getCommandesByParticipant(req, res, next) {
  try {
    const clientEmail = normalizeEmail(req.query.clientEmail);
    const prestataireEmail = normalizeEmail(req.query.prestataireEmail);
    const participantEmail = clientEmail || prestataireEmail;

    if (!participantEmail) {
      return res.status(400).json({ message: "Required query: clientEmail or prestataireEmail." });
    }

    const commandes = await Commande.find()
      .populate({ path: "clientId", select: "nom prenom email photoProfil" })
      .populate({
        path: "prestataireId",
        select: "nom prenom email categorie domaine photoProfil location locationAccuracy locationLabel"
      })
      .sort({ createdAt: -1 });

    const filtered = commandes.filter((item) => {
      const client = normalizeEmail(item && item.clientId && item.clientId.email);
      const provider = normalizeEmail(item && item.prestataireId && item.prestataireId.email);
      return clientEmail ? client === clientEmail : provider === prestataireEmail;
    });

    return res.json({ commandes: filtered });
  } catch (error) {
    return next(error);
  }
}

async function getCommandeChatMessages(req, res, next) {
  try {
    const commandeId = String(req.params.commandeId || "").trim();
    const participantEmail = normalizeEmail(req.query.participantEmail);

    if (!mongoose.isValidObjectId(commandeId)) {
      return res.status(400).json({ message: "Invalid commande id." });
    }

    if (!participantEmail) {
      return res.status(400).json({ message: "Required query: participantEmail." });
    }

    const commande = await Commande.findById(commandeId)
      .populate({ path: "clientId", select: "nom prenom email" })
      .populate({ path: "prestataireId", select: "nom prenom email" });

    if (!commande) {
      return res.status(404).json({ message: "Commande not found." });
    }

    const participant = getParticipantFromCommande(commande, participantEmail);
    if (!participant) {
      return res.status(403).json({ message: "Access denied for this commande chat." });
    }

    const commandeStatus = String((commande && commande.statut) || "").trim().toLowerCase();
    if (commandeStatus === "terminee" || commandeStatus === "annulee") {
      return res.status(410).json({ message: "Chat closed for this commande." });
    }

    const messages = await CommandeChatMessage.find({ commandeId: commande._id }).sort({ createdAt: 1 });

    return res.json({
      commandeId: String(commande._id),
      participant,
      messages
    });
  } catch (error) {
    return next(error);
  }
}

async function postCommandeChatMessage(req, res, next) {
  try {
    const commandeId = String(req.params.commandeId || "").trim();
    const participantEmail = normalizeEmail(req.body.participantEmail);
    const senderTypeRaw = String(req.body.senderType || "").trim().toLowerCase();
    const senderName = normalizeName(req.body.senderName);
    const message = String(req.body.message || "").trim();

    if (!mongoose.isValidObjectId(commandeId)) {
      return res.status(400).json({ message: "Invalid commande id." });
    }

    if (!participantEmail || !message) {
      return res.status(400).json({ message: "Required fields: participantEmail, message." });
    }

    if (message.length > 1200) {
      return res.status(400).json({ message: "Message too long (max 1200 chars)." });
    }

    const commande = await Commande.findById(commandeId)
      .populate({ path: "clientId", select: "nom prenom email" })
      .populate({ path: "prestataireId", select: "nom prenom email" });

    if (!commande) {
      return res.status(404).json({ message: "Commande not found." });
    }

    const participant = getParticipantFromCommande(commande, participantEmail);
    if (!participant) {
      return res.status(403).json({ message: "Access denied for this commande chat." });
    }

    const commandeStatus = String((commande && commande.statut) || "").trim().toLowerCase();
    if (commandeStatus === "terminee" || commandeStatus === "annulee") {
      return res.status(410).json({ message: "Chat closed for this commande." });
    }

    const senderType =
      senderTypeRaw === "prestataire" || senderTypeRaw === "client" ? senderTypeRaw : participant.type;

    if (senderType !== participant.type) {
      return res.status(403).json({ message: "senderType does not match participant role." });
    }

    const saved = await CommandeChatMessage.create({
      commandeId: commande._id,
      senderType,
      senderEmail: participant.email,
      senderName: senderName || participant.name,
      message
    });

    return res.status(201).json({ message: "Message sent.", chatMessage: saved });
  } catch (error) {
    return next(error);
  }
}

async function updateCommandeStatus(req, res, next) {
  try {
    const commandeId = String(req.params.commandeId || "").trim();
    const participantEmail = normalizeEmail(req.body.participantEmail);
    const nextStatus = String(req.body.statut || "").trim().toLowerCase();
    const allowedStatuses = ["en_cours", "terminee", "annulee"];

    if (!mongoose.isValidObjectId(commandeId)) {
      return res.status(400).json({ message: "Invalid commande id." });
    }

    if (!participantEmail || !allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: "Required fields: participantEmail + valid statut." });
    }

    const commande = await Commande.findById(commandeId)
      .populate({ path: "clientId", select: "nom prenom email" })
      .populate({ path: "prestataireId", select: "nom prenom email" });

    if (!commande) {
      return res.status(404).json({ message: "Commande not found." });
    }

    const participant = getParticipantFromCommande(commande, participantEmail);
    if (!participant) {
      return res.status(403).json({ message: "Access denied for this commande." });
    }

    commande.statut = nextStatus;
    await commande.save();

    return res.json({
      message: "Commande status updated.",
      commandeId: String(commande._id),
      statut: commande.statut
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCommande,
  getCommandesByParticipant,
  getCommandeChatMessages,
  postCommandeChatMessage,
  updateCommandeStatus
};
