const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    participantEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    participantType: {
      type: String,
      enum: ["client", "prestataire", "moderateur"],
      required: true
    },
    participantName: { type: String, default: "", trim: true },
    moderatorId: { type: String, default: "", trim: true, lowercase: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 1200 }
  },
  { timestamps: true }
);

supportMessageSchema.index({ participantEmail: 1, createdAt: 1 });

module.exports = mongoose.model("SupportMessage", supportMessageSchema);
