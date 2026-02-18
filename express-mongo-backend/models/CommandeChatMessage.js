const mongoose = require("mongoose");

const commandeChatMessageSchema = new mongoose.Schema(
  {
    commandeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commande",
      required: true,
      index: true
    },
    senderType: {
      type: String,
      enum: ["client", "prestataire"],
      required: true
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    senderName: {
      type: String,
      default: "",
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200
    }
  },
  { timestamps: true }
);

commandeChatMessageSchema.index({ commandeId: 1, createdAt: 1 });

module.exports = mongoose.model("CommandeChatMessage", commandeChatMessageSchema);
