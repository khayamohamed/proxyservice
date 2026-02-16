const crypto = require("crypto");
const Prestataire = require("../models/Prestataire");
const Client = require("../models/Client");
const Commande = require("../models/Commande");
const { writeRecordToChain } = require("../config/blockchain");

function toAbsoluteFileUrl(req, filePath) {
  if (!filePath) {
    return null;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}${filePath}`;
}

function normalizePasswordValue(value) {
  const text = String(value || "").trim();
  return text || "";
}

function resolveAccountPassword(source) {
  if (!source || typeof source !== "object") {
    return "";
  }

  const candidates = [source.password, source.mdp, source.motDePasse, source.motdepasse];
  for (const candidate of candidates) {
    const value = normalizePasswordValue(candidate);
    if (value) {
      return value;
    }
  }

  return "";
}

function mapPrestataireForAdmin(req, prestataire) {
  const item =
    prestataire && typeof prestataire.toObject === "function"
      ? prestataire.toObject()
      : { ...(prestataire || {}) };
  const rawSource = prestataire && prestataire._doc ? prestataire._doc : prestataire;
  const locationCoordinates =
    item.location && Array.isArray(item.location.coordinates) ? item.location.coordinates : null;
  const longitude =
    locationCoordinates && locationCoordinates.length >= 2 && Number.isFinite(Number(locationCoordinates[0]))
      ? Number(locationCoordinates[0])
      : null;
  const latitude =
    locationCoordinates && locationCoordinates.length >= 2 && Number.isFinite(Number(locationCoordinates[1]))
      ? Number(locationCoordinates[1])
      : null;
  const locationAccuracy = Number.isFinite(Number(item.locationAccuracy)) ? Number(item.locationAccuracy) : null;

  item.password = resolveAccountPassword(item) || resolveAccountPassword(rawSource);
  item.cinImageUrl = toAbsoluteFileUrl(req, item.cinImage);
  item.casierImageUrl = toAbsoluteFileUrl(req, item.casierImage);
  item.photoProfilUrl = toAbsoluteFileUrl(req, item.photoProfil);
  item.coverageGeoEnabled = latitude != null && longitude != null;
  item.coverageLatitude = latitude;
  item.coverageLongitude = longitude;
  item.coverageAccuracy = locationAccuracy;
  item.coverageLocationLabel = String(item.locationLabel || "").trim() || null;
  item.coverageCapturedAt = item.locationCapturedAt || null;
  return item;
}

function mapClientForAdmin(req, clientDoc) {
  const client =
    clientDoc && typeof clientDoc.toObject === "function"
      ? clientDoc.toObject()
      : { ...(clientDoc || {}) };
  const rawSource = clientDoc && clientDoc._doc ? clientDoc._doc : clientDoc;
  client.password = resolveAccountPassword(client) || resolveAccountPassword(rawSource);
  client.cinImageUrl = toAbsoluteFileUrl(req, client.cinImage);
  return client;
}

function generateFingerprintHash(prestataire) {
  const raw = `${prestataire._id}-${prestataire.email}-fingerprint-${Date.now()}-${Math.random()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function getPrestatairesEnAttente(req, res, next) {
  try {
    const prestataires = await Prestataire.find({
      statutVerification: { $in: ["en_attente", "entretien_valide"] }
    }).sort({ createdAt: -1 });

    return res.json({
      count: prestataires.length,
      prestataires: prestataires.map((p) => mapPrestataireForAdmin(req, p))
    });
  } catch (error) {
    return next(error);
  }
}

async function getPrestataires(req, res, next) {
  try {
    const prestataires = await Prestataire.find().sort({ createdAt: -1 });

    return res.json({
      count: prestataires.length,
      prestataires: prestataires.map((p) => mapPrestataireForAdmin(req, p))
    });
  } catch (error) {
    return next(error);
  }
}

async function validerEntretien(req, res, next) {
  try {
    const { id } = req.params;

    const prestataire = await Prestataire.findByIdAndUpdate(
      id,
      { statutVerification: "entretien_valide" },
      { new: true }
    );

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    return res.json({
      message: "Interview validated.",
      prestataire: mapPrestataireForAdmin(req, prestataire)
    });
  } catch (error) {
    return next(error);
  }
}

async function refuserPrestataire(req, res, next) {
  try {
    const { id } = req.params;

    const prestataire = await Prestataire.findByIdAndUpdate(
      id,
      { statutVerification: "refuse" },
      { new: true }
    );

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    return res.json({
      message: "Provider refused.",
      prestataire: mapPrestataireForAdmin(req, prestataire)
    });
  } catch (error) {
    return next(error);
  }
}

async function validerFingerprint(req, res, next) {
  try {
    const { id } = req.params;

    const prestataire = await Prestataire.findById(id);

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    if (prestataire.statutVerification !== "entretien_valide" && prestataire.statutVerification !== "valide") {
      return res.status(400).json({
        message: "Provider interview must be validated before final fingerprint validation."
      });
    }

    if (!prestataire.fingerprintHash) {
      prestataire.fingerprintHash = prestataire.deviceFingerprintHash || generateFingerprintHash(prestataire);
    }

    prestataire.statutVerification = "valide";
    const chainRecord = await writeRecordToChain({
      entityType: "prestataire",
      entityId: String(prestataire._id),
      action: "fingerprint_validation",
      hash: prestataire.fingerprintHash,
      metadata: {
        email: prestataire.email,
        statutVerification: "valide"
      }
    });
    prestataire.fingerprintTxHash = chainRecord.txHash;
    prestataire.fingerprintNetwork = chainRecord.network;
    prestataire.fingerprintExplorerUrl = chainRecord.explorerUrl;
    prestataire.fingerprintRecordedAt = chainRecord.recordedAt;
    prestataire.fingerprintMode = chainRecord.mode;

    await prestataire.save();

    return res.json({
      message: "Fingerprint validated and blockchain fingerprint hash generated.",
      blockchain: chainRecord,
      prestataire: mapPrestataireForAdmin(req, prestataire)
    });
  } catch (error) {
    return next(error);
  }
}

async function supprimerPrestataire(req, res, next) {
  try {
    const { id } = req.params;
    const prestataire = await Prestataire.findById(id);

    if (!prestataire) {
      return res.status(404).json({ message: "Provider not found." });
    }

    const deletedCommandes = await Commande.deleteMany({ prestataireId: prestataire._id });
    await prestataire.deleteOne();

    return res.json({
      message: "Provider deleted.",
      deletedProviderId: id,
      deletedCommandes: deletedCommandes.deletedCount || 0
    });
  } catch (error) {
    return next(error);
  }
}

async function getClients(req, res, next) {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });

    return res.json({
      count: clients.length,
      clients: clients.map((clientDoc) => mapClientForAdmin(req, clientDoc))
    });
  } catch (error) {
    return next(error);
  }
}

async function updateClientStatus(req, res, next, nextStatus, message) {
  try {
    const { id } = req.params;
    const client = await Client.findByIdAndUpdate(
      id,
      { statutVerification: nextStatus },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    return res.json({
      message,
      client: mapClientForAdmin(req, client)
    });
  } catch (error) {
    return next(error);
  }
}

async function validerClient(req, res, next) {
  return updateClientStatus(req, res, next, "valide", "Client validated.");
}

async function refuserClient(req, res, next) {
  return updateClientStatus(req, res, next, "refuse", "Client refused.");
}

async function bannirClient(req, res, next) {
  return updateClientStatus(req, res, next, "banni", "Client banned.");
}

async function getCommandes(req, res, next) {
  try {
    const commandes = await Commande.find()
      .populate("clientId", "prenom nom email telephone")
      .populate("prestataireId", "prenom nom email telephone categorie domaine statutVerification")
      .sort({ createdAt: -1 });

    return res.json({
      count: commandes.length,
      commandes
    });
  } catch (error) {
    return next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const [prestataires, clients, commandes] = await Promise.all([
      Prestataire.find().sort({ createdAt: -1 }),
      Client.find().sort({ createdAt: -1 }),
      Commande.find().populate("clientId").populate("prestataireId").sort({ createdAt: -1 })
    ]);

    const pendingPrestataires = prestataires.filter((p) => ["en_attente", "entretien_valide"].includes(p.statutVerification));
    const pendingClients = clients.filter((c) => c.statutVerification === "en_attente");

    const stats = {
      totalPrestataires: prestataires.length,
      prestatairesEnAttente: pendingPrestataires.length,
      prestatairesValides: prestataires.filter((p) => p.statutVerification === "valide").length,
      prestatairesRefuses: prestataires.filter((p) => p.statutVerification === "refuse").length,
      totalClients: clients.length,
      clientsEnAttente: pendingClients.length,
      clientsValides: clients.filter((c) => c.statutVerification === "valide").length,
      clientsRefuses: clients.filter((c) => c.statutVerification === "refuse").length,
      clientsBannis: clients.filter((c) => c.statutVerification === "banni").length,
      totalCommandes: commandes.length
    };

    return res.json({
      stats,
      prestatairesEnAttente: pendingPrestataires.map((p) => mapPrestataireForAdmin(req, p)),
      clients: clients.map((clientDoc) => mapClientForAdmin(req, clientDoc)),
      commandes
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPrestataires,
  getPrestatairesEnAttente,
  validerEntretien,
  refuserPrestataire,
  validerFingerprint,
  supprimerPrestataire,
  getClients,
  validerClient,
  refuserClient,
  bannirClient,
  getCommandes,
  getDashboard
};
