const mongoose = require("mongoose");
const { calculateAge } = require("../utils/calculateAge");

const prestataireSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    telephone: { type: String, required: true, trim: true },
    password: { type: String, default: "", trim: true },
    categorie: { type: String, required: true, trim: true, index: true },
    domaine: { type: String, default: "", trim: true },
    experience: { type: String, default: "", trim: true },
    photoProfil: { type: String, default: null, trim: true },
    dateDeNaissance: { type: Date, default: null },
    age: { type: Number, default: null },
    cinImage: { type: String, required: true, trim: true },
    casierImage: { type: String, required: true, trim: true },
    deviceFingerprintHash: { type: String, default: null, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"]
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator: (value) => value == null || (Array.isArray(value) && value.length === 2),
          message: "location.coordinates must contain [longitude, latitude]."
        }
      }
    },
    locationAccuracy: { type: Number, default: null },
    locationCapturedAt: { type: Date, default: null },
    locationLabel: { type: String, default: null, trim: true },
    statutVerification: {
      type: String,
      enum: ["en_attente", "entretien_valide", "refuse", "valide"],
      default: "en_attente",
      index: true
    },
    blockchainHash: { type: String, default: null },
    blockchainTxHash: { type: String, default: null, trim: true },
    blockchainNetwork: { type: String, default: null, trim: true },
    blockchainExplorerUrl: { type: String, default: null, trim: true },
    blockchainRecordedAt: { type: Date, default: null },
    blockchainMode: { type: String, enum: ["onchain", "simulated", "fallback"], default: "simulated" },
    fingerprintHash: { type: String, default: null },
    fingerprintTxHash: { type: String, default: null, trim: true },
    fingerprintNetwork: { type: String, default: null, trim: true },
    fingerprintExplorerUrl: { type: String, default: null, trim: true },
    fingerprintRecordedAt: { type: Date, default: null },
    fingerprintMode: { type: String, enum: ["onchain", "simulated", "fallback"], default: "simulated" },
    fingerprintCaptureMode: { type: String, enum: ["biometric", "fallback"], default: "fallback" },
    fingerprintCredentialId: { type: String, default: null, trim: true }
  },
  { timestamps: true }
);

prestataireSchema.pre("validate", function sanitizeAndSetAge(next) {
  if (this.dateDeNaissance) {
    const computedAge = calculateAge(this.dateDeNaissance);
    if (!Number.isNaN(computedAge)) {
      this.age = computedAge;
    }
  }

  if (this.location) {
    const coords = this.location.coordinates;
    const hasValidCoords = Array.isArray(coords) && coords.length === 2;

    if (!hasValidCoords) {
      this.location = undefined;
    }
  }

  next();
});

prestataireSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Prestataire", prestataireSchema);
