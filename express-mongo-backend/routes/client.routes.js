const express = require("express");
const { clientUpload } = require("../config/multer");
const { registerClient, getClientStatus } = require("../controllers/client.controller");

const router = express.Router();

router.post("/inscription", clientUpload, registerClient);
router.get("/statut", getClientStatus);

module.exports = router;
