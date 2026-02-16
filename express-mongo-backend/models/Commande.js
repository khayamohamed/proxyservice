const mongoose = require("mongoose");

const commandeSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    prestataireId: { type: mongoose.Schema.Types.ObjectId, ref: "Prestataire", required: true },
    service: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "carte_bancaire"],
      default: "carte_bancaire"
    },
    clientLocation: {
      type: {
        type: String,
        enum: ["Point"]
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator: (value) => value == null || (Array.isArray(value) && value.length === 2),
          message: "clientLocation.coordinates must contain [longitude, latitude]."
        }
      }
    },
    clientLocationAccuracy: { type: Number, default: null },
    clientLocationCapturedAt: { type: Date, default: null },
    clientLocationLabel: { type: String, default: null, trim: true },
    distanceKm: { type: Number, default: null, min: 0 },
    distancePricingDh: { type: Number, enum: [10, 15], default: 15 },
    distancePricingRule: {
      type: String,
      enum: ["within_4km", "over_4km", "fallback_no_geolocation"],
      default: "fallback_no_geolocation"
    },
    statut: {
      type: String,
      enum: ["en_attente", "acceptee", "en_cours", "terminee", "annulee"],
      default: "en_attente"
    }
  },
  { timestamps: true }
);

commandeSchema.index({ clientLocation: "2dsphere" });

module.exports = mongoose.model("Commande", commandeSchema);
