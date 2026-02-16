const express = require("express");
const { providerUpload } = require("../config/multer");
const {
  registerPrestataire,
  submitPrestataireFingerprint,
  updatePrestataireCoverage,
  getPrestatairesByCategorie,
  getPrestataireStatus
} = require("../controllers/prestataire.controller");

const router = express.Router();

router.post("/inscription", providerUpload, registerPrestataire);
router.post("/fingerprint", submitPrestataireFingerprint);
router.post("/coverage", updatePrestataireCoverage);
router.get("/statut", getPrestataireStatus);
router.get("/", getPrestatairesByCategorie);

module.exports = router;
