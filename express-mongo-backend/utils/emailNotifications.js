let nodemailer = null;
try {
  // Optional dependency: backend keeps running if not installed.
  nodemailer = require("nodemailer");
} catch (error) {
  nodemailer = null;
}

let cachedTransport = null;
let cachedTransportKey = "";

function parseBoolean(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function resolveSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const secure =
    parseBoolean(process.env.SMTP_SECURE) || (Number.isInteger(port) && port === 465);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || user || "").trim();

  return {
    host,
    port,
    secure,
    user,
    pass,
    from
  };
}

function buildTransportKey(config) {
  return [config.host, config.port, config.secure ? "1" : "0", config.user].join("|");
}

function getTransport(config) {
  const transportKey = buildTransportKey(config);
  if (cachedTransport && cachedTransportKey === transportKey) {
    return cachedTransport;
  }

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure
  };

  if (config.user && config.pass) {
    transportOptions.auth = {
      user: config.user,
      pass: config.pass
    };
  }

  cachedTransport = nodemailer.createTransport(transportOptions);
  cachedTransportKey = transportKey;
  return cachedTransport;
}

function formatDh(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return `${Math.round(Number(value))}DH`;
}

function formatDistanceKm(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(2)} km`;
}

async function sendProviderOrderNotification(payload = {}) {
  if (!nodemailer) {
    return { sent: false, reason: "nodemailer_missing" };
  }

  const config = resolveSmtpConfig();
  if (!config.host || !Number.isInteger(config.port) || config.port <= 0 || !config.from) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const providerEmail = String(payload.providerEmail || "").trim().toLowerCase();
  if (!providerEmail) {
    return { sent: false, reason: "provider_email_missing" };
  }

  const providerName = String(payload.providerName || "Prestataire").trim();
  const clientName = String(payload.clientName || "Client").trim();
  const service = String(payload.service || "service").trim();
  const paymentMethod = String(payload.paymentMethod || "").trim().toLowerCase();
  const paymentLabel = paymentMethod === "cash" ? "cash" : "carte bancaire";
  const distanceLabel = formatDistanceKm(payload.distanceKm);
  const distancePriceLabel = formatDh(payload.distancePricingDh);
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : new Date();
  const createdAtLabel = Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleString("fr-FR");
  const orderId = String(payload.orderId || "").trim() || "-";

  const subject = "Nouvelle demande client confirmee";
  const text = [
    `Bonjour ${providerName},`,
    "",
    "Une nouvelle demande client vient d'etre confirmee sur ProxyServices.",
    `Commande: ${orderId}`,
    `Client: ${clientName}`,
    `Service: ${service}`,
    `Paiement: ${paymentLabel}`,
    `Distance: ${distanceLabel}`,
    `Supplement distance: ${distancePriceLabel}`,
    `Date: ${createdAtLabel}`,
    "",
    "Connectez-vous a votre espace prestataire pour voir les details."
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.45">
      <p>Bonjour <strong>${providerName}</strong>,</p>
      <p>Une nouvelle demande client vient d'etre confirmee sur ProxyServices.</p>
      <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse">
        <tr><td><strong>Commande</strong></td><td>${orderId}</td></tr>
        <tr><td><strong>Client</strong></td><td>${clientName}</td></tr>
        <tr><td><strong>Service</strong></td><td>${service}</td></tr>
        <tr><td><strong>Paiement</strong></td><td>${paymentLabel}</td></tr>
        <tr><td><strong>Distance</strong></td><td>${distanceLabel}</td></tr>
        <tr><td><strong>Supplement distance</strong></td><td>${distancePriceLabel}</td></tr>
        <tr><td><strong>Date</strong></td><td>${createdAtLabel}</td></tr>
      </table>
      <p>Connectez-vous a votre espace prestataire pour voir les details.</p>
    </div>
  `;

  try {
    const transport = getTransport(config);
    const info = await transport.sendMail({
      from: config.from,
      to: providerEmail,
      subject,
      text,
      html
    });

    return {
      sent: true,
      reason: "",
      messageId: info && info.messageId ? String(info.messageId) : ""
    };
  } catch (error) {
    return {
      sent: false,
      reason: "smtp_send_failed",
      error: error && error.message ? String(error.message) : "send_failed"
    };
  }
}

module.exports = {
  sendProviderOrderNotification
};

