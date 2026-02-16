const express = require("express");
const { createCommande } = require("../controllers/commande.controller");

const router = express.Router();

router.post("/", createCommande);

module.exports = router;
