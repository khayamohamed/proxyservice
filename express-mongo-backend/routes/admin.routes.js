const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const {
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
  getDashboard,
  getCommandeChatMessagesForAdmin
} = require("../controllers/admin.controller");

const router = express.Router();
router.use(requireAdminAuth);

router.get("/prestataires", getPrestataires);
router.get("/prestataires/en-attente", getPrestatairesEnAttente);
router.patch("/prestataires/:id/valider-entretien", validerEntretien);
router.patch("/prestataires/:id/refuser", refuserPrestataire);
router.patch("/prestataires/:id/valider-fingerprint", validerFingerprint);
router.delete("/prestataires/:id", supprimerPrestataire);

router.get("/clients", getClients);
router.patch("/clients/:id/valider", validerClient);
router.patch("/clients/:id/refuser", refuserClient);
router.patch("/clients/:id/bannir", bannirClient);

router.get("/commandes", getCommandes);
router.get("/commandes/:id/chat/messages", getCommandeChatMessagesForAdmin);
router.get("/dashboard", getDashboard);

module.exports = router;
