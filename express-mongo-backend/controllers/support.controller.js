const SupportMessage = require("../models/SupportMessage");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeType(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "client" || raw === "prestataire" || raw === "moderateur") {
    return raw;
  }
  return "";
}

async function getSupportConversations(req, res, next) {
  try {
    const rows = await SupportMessage.find().sort({ createdAt: -1 }).limit(800);
    const map = new Map();

    rows.forEach((row) => {
      const email = normalizeEmail(row.participantEmail);
      if (!email) {
        return;
      }

      const existing = map.get(email);
      const rowType = normalizeType(row.participantType);
      const rowName = normalizeText(row.participantName);

      if (!existing) {
        map.set(email, {
          participantEmail: email,
          participantName: rowType === "moderateur" ? email : rowName || email,
          updatedAt: row.createdAt,
          _nameNeedsParticipant: rowType === "moderateur"
        });
        return;
      }

      if (existing._nameNeedsParticipant && rowType !== "moderateur" && rowName) {
        existing.participantName = rowName;
        existing._nameNeedsParticipant = false;
      }
    });

    return res.json({
      conversations: Array.from(map.values()).sort(
        (a, b) => Date.parse(String(b.updatedAt || "")) - Date.parse(String(a.updatedAt || ""))
      ).map((entry) => ({
        participantEmail: entry.participantEmail,
        participantName: entry.participantName || entry.participantEmail,
        updatedAt: entry.updatedAt
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function getSupportMessages(req, res, next) {
  try {
    const participantEmail = normalizeEmail(req.query.participantEmail);
    if (!participantEmail) {
      return res.status(400).json({ message: "participantEmail query is required." });
    }

    const messages = await SupportMessage.find({ participantEmail }).sort({ createdAt: 1 });
    return res.json({ participantEmail, messages });
  } catch (error) {
    return next(error);
  }
}

async function postSupportMessage(req, res, next) {
  try {
    const participantEmail = normalizeEmail(req.body.participantEmail);
    const participantType = normalizeType(req.body.participantType);
    const participantName = normalizeText(req.body.participantName);
    const moderatorId = normalizeEmail(req.body.moderatorId);
    const message = normalizeText(req.body.message);

    if (!participantEmail || !participantType || !message) {
      return res.status(400).json({
        message: "Required fields: participantEmail, participantType(client|prestataire|moderateur), message."
      });
    }

    const saved = await SupportMessage.create({
      participantEmail,
      participantType,
      participantName,
      moderatorId,
      message
    });

    return res.status(201).json({ message: "Support message sent.", supportMessage: saved });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSupportConversations,
  getSupportMessages,
  postSupportMessage
};
