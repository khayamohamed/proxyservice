const express = require("express");
const { getFingerprintPage, submitFingerprint } = require("../controllers/fingerprint.controller");

const router = express.Router();

router.get("/", getFingerprintPage);
router.post("/submit", submitFingerprint);

module.exports = router;
