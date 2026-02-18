const express = require("express");
const {
  getSupportConversations,
  getSupportMessages,
  postSupportMessage
} = require("../controllers/support.controller");

const router = express.Router();

router.get("/conversations", getSupportConversations);
router.get("/messages", getSupportMessages);
router.post("/messages", postSupportMessage);

module.exports = router;
