const express = require("express");
const {
  createCommande,
  getCommandesByParticipant,
  getCommandeChatMessages,
  postCommandeChatMessage,
  updateCommandeStatus
} = require("../controllers/commande.controller");

const router = express.Router();

router.get("/", getCommandesByParticipant);
router.post("/", createCommande);
router.get("/:commandeId/chat/messages", getCommandeChatMessages);
router.post("/:commandeId/chat/messages", postCommandeChatMessage);
router.patch("/:commandeId/statut", updateCommandeStatus);

module.exports = router;
