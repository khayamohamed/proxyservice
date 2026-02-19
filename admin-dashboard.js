const DEFAULT_API_BASE = "http://localhost:5000";
const RENDER_FALLBACK_API_BASE = "https://proxyservice-x4n7.onrender.com";
const API_BASE_STORAGE_KEYS = ["proxyservices_admin_api_base"];
const API_REQUEST_TIMEOUT_MS = 70000;
const ADMIN_SESSION_STORAGE_KEY = "proxyservices_admin_session";
const ADMIN_ALLOWED_IDENTIFIERS = new Set(["admin123", "admin1", "admin2", "admin3", "admin4", "admin5"]);
const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const state = {
  apiBase: DEFAULT_API_BASE,
  stats: null,
  pendingProviders: [],
  clients: [],
  commandes: [],
  visibleProviders: [],
  supportConversations: [],
  supportMessages: [],
  selectedSupportParticipantEmail: "",
  selectedSupportParticipantName: ""
};

const elements = {
  statsGrid: document.getElementById("stats-grid"),
  pendingBody: document.getElementById("pending-body"),
  pendingCount: document.getElementById("pending-count"),
  clientsBody: document.getElementById("clients-body"),
  clientsCount: document.getElementById("clients-count"),
  providerFilterForm: document.getElementById("provider-filter-form"),
  providerCategory: document.getElementById("provider-categorie"),
  visibleProviders: document.getElementById("visible-providers"),
  ordersBody: document.getElementById("orders-body"),
  ordersCount: document.getElementById("orders-count"),
  toast: document.getElementById("toast"),
  fingerprintModal: document.getElementById("fingerprint-modal"),
  fingerprintModalBackdrop: document.getElementById("fingerprint-modal-backdrop"),
  fingerprintModalClose: document.getElementById("fingerprint-modal-close"),
  orderChatModal: document.getElementById("order-chat-modal"),
  orderChatModalBackdrop: document.getElementById("order-chat-modal-backdrop"),
  orderChatModalClose: document.getElementById("order-chat-modal-close"),
  orderChatMeta: document.getElementById("order-chat-meta"),
  orderChatAdminMessages: document.getElementById("order-chat-admin-messages"),
  supportCount: document.getElementById("support-count"),
  supportConversations: document.getElementById("support-conversations"),
  supportChatMeta: document.getElementById("support-chat-meta"),
  supportAdminMessages: document.getElementById("support-admin-messages"),
  supportReplyForm: document.getElementById("support-reply-form"),
  supportReplyInput: document.getElementById("support-reply-input"),
  supportReplySendBtn: document.getElementById("support-reply-send-btn"),
  fpProviderName: document.getElementById("fp-provider-name"),
  fpProviderEmail: document.getElementById("fp-provider-email"),
  fpProviderStatus: document.getElementById("fp-provider-status"),
  fpHash: document.getElementById("fp-hash"),
  fpTx: document.getElementById("fp-tx"),
  fpNetwork: document.getElementById("fp-network"),
  fpMode: document.getElementById("fp-mode"),
  fpRecordedAt: document.getElementById("fp-recorded-at"),
  fpLocation: document.getElementById("fp-location")
};

let supportPollTimer = null;

function buildLoginPageUrl() {
  if (!window.location || window.location.protocol === "file:" || !window.location.host) {
    return "./index.html";
  }

  return `${window.location.protocol}//${window.location.host}/index.html`;
}

function getStoredAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function clearStoredAdminSession() {
  try {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch (error) {
    // noop
  }
}

function hasValidAdminSession() {
  const session = getStoredAdminSession();
  if (!session) {
    return false;
  }

  const identifier = String(session.email || "").trim().toLowerCase();
  if (!ADMIN_ALLOWED_IDENTIFIERS.has(identifier)) {
    clearStoredAdminSession();
    return false;
  }

  const expiresAt = Number(session.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
    return true;
  }

  const issuedAt = Number(session.issuedAt);
  if (Number.isFinite(issuedAt) && Date.now() - issuedAt < ADMIN_SESSION_MAX_AGE_MS) {
    return true;
  }

  clearStoredAdminSession();
  return false;
}

function getCurrentAdminIdentifier() {
  const session = getStoredAdminSession();
  return String((session && session.email) || "").trim().toLowerCase();
}

function getCurrentAdminSecret() {
  const session = getStoredAdminSession();
  const explicitSecret = String((session && session.authSecret) || "").trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  // Fallback for legacy sessions created before authSecret was stored.
  return getCurrentAdminIdentifier();
}

function ensureAdminAccessOrRedirect() {
  if (hasValidAdminSession()) {
    return true;
  }

  window.location.replace(buildLoginPageUrl());
  return false;
}

function buildLocalApiBaseCandidates(startPort = 5000, endPort = 5002) {
  const values = [];
  for (let port = startPort; port <= endPort; port += 1) {
    values.push(
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `https://localhost:${port}`,
      `https://127.0.0.1:${port}`
    );
  }
  return values;
}

function normalizeApiBase(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function getCurrentOriginApiBase() {
  if (!window.location || window.location.protocol === "file:" || !window.location.host) {
    return "";
  }

  return normalizeApiBase(`${window.location.protocol}//${window.location.host}`);
}

function isRenderHostedContext() {
  const hostname = String((window.location && window.location.hostname) || "").toLowerCase();
  return hostname.endsWith(".onrender.com");
}

function getBackendUnavailableMessage() {
  if (isRenderHostedContext()) {
    return "Connexion backend en cours (Render peut etre en veille). Patiente 30-60s puis reessaie.";
  }

  return "Backend inaccessible. Demarre express-mongo-backend sur un port local (5000-5002).";
}

function getStoredApiBase() {
  for (const key of API_BASE_STORAGE_KEYS) {
    try {
      const value = normalizeApiBase(localStorage.getItem(key));
      if (value) {
        return value;
      }
    } catch (error) {
      return "";
    }
  }

  return "";
}

function saveApiBase(baseUrl) {
  const normalized = normalizeApiBase(baseUrl);
  if (!normalized) return;

  for (const key of API_BASE_STORAGE_KEYS) {
    try {
      localStorage.setItem(key, normalized);
    } catch (error) {
      return;
    }
  }
}

function getApiCandidates() {
  const localCandidates = buildLocalApiBaseCandidates();
  const currentOriginCandidate = getCurrentOriginApiBase();
  const configuredCandidates = [
    normalizeApiBase(state.apiBase),
    getStoredApiBase(),
    normalizeApiBase(window.PROXY_API_BASE_URL),
    normalizeApiBase(RENDER_FALLBACK_API_BASE),
    currentOriginCandidate
  ];
  const hostname = String((window.location && window.location.hostname) || "").toLowerCase();
  const protocol = String((window.location && window.location.protocol) || "").toLowerCase();
  const isLocalContext =
    protocol === "file:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";
  const candidates = isLocalContext
    ? [...configuredCandidates, ...localCandidates]
    : configuredCandidates;

  return candidates.filter((value, index) => value && candidates.indexOf(value) === index);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  if (typeof AbortController !== "function") {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...(options || {}), signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isNetworkError(error) {
  const message = String((error && error.message) || "");
  const name = String((error && error.name) || "");
  return (
    error instanceof TypeError ||
    name === "AbortError" ||
    /failed to fetch|networkerror|load failed|timeout|timed out|abort/i.test(message)
  );
}

function isWrongApiHostResponse(status, message) {
  const normalizedMessage = String(message || "").toLowerCase();
  const numericStatus = Number(status);
  if (![404, 405, 501].includes(numericStatus)) {
    return false;
  }

  if (numericStatus === 501) {
    return true;
  }

  return (
    normalizedMessage.includes("not implemented") ||
    normalizedMessage.includes("unsupported method") ||
    normalizedMessage.includes("cannot patch") ||
    normalizedMessage.includes("route not found") ||
    normalizedMessage.includes("cannot get") ||
    normalizedMessage.includes("erreur http 501") ||
    normalizedMessage.includes("erreur http 405") ||
    normalizedMessage.includes("erreur http 404")
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function renderPaymentMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "cash") {
    return "Cash";
  }

  if (normalized === "carte_bancaire") {
    return "Carte bancaire";
  }

  return "-";
}

function shortHash(value, size = 16) {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }

  return text.length > size ? `${text.slice(0, size)}...` : text;
}

function renderTxLabel(txHash, explorerUrl) {
  if (!txHash) {
    return "-";
  }

  if (explorerUrl) {
    return `<a href="${explorerUrl}" target="_blank" rel="noreferrer">${shortHash(txHash)}</a>`;
  }

  return shortHash(txHash);
}

function resolveDisplayPassword(record) {
  const source = record || {};
  const candidates = [source.password, source.mdp, source.motDePasse, source.motdepasse];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) {
      return value;
    }
  }

  return "-";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseOptionalNumberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveProviderCoordinates(provider) {
  if (!provider || typeof provider !== "object") {
    return null;
  }

  const locationCoordinates =
    provider.location && Array.isArray(provider.location.coordinates) ? provider.location.coordinates : null;
  if (locationCoordinates && locationCoordinates.length >= 2) {
    const longitude = parseOptionalNumberValue(locationCoordinates[0]);
    const latitude = parseOptionalNumberValue(locationCoordinates[1]);
    if (longitude != null && latitude != null) {
      return { latitude, longitude };
    }
  }

  const fallbackPairs = [
    [provider.coverageLatitude, provider.coverageLongitude],
    [provider.latitude, provider.longitude],
    [provider.lat, provider.lng],
    [provider.lat, provider.lon],
    [provider.locationLatitude, provider.locationLongitude]
  ];

  for (const pair of fallbackPairs) {
    const latitude = parseOptionalNumberValue(pair[0]);
    const longitude = parseOptionalNumberValue(pair[1]);
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }
  }

  return null;
}

function setText(element, value) {
  if (!element) return;
  element.textContent = String(value || "").trim() || "-";
}

function closeFingerprintModal() {
  if (!elements.fingerprintModal) return;
  elements.fingerprintModal.hidden = true;
}

function closeOrderChatModal() {
  if (!elements.orderChatModal) return;
  elements.orderChatModal.hidden = true;
  if (elements.orderChatAdminMessages) {
    elements.orderChatAdminMessages.innerHTML = "";
  }
  if (elements.orderChatMeta) {
    elements.orderChatMeta.textContent = "";
  }
}

function formatOrderChatDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function openOrderChatModal(orderId) {
  if (!orderId || !elements.orderChatModal || !elements.orderChatAdminMessages) {
    return;
  }

  elements.orderChatModal.hidden = false;
  elements.orderChatAdminMessages.innerHTML = '<div class="order-chat-admin-empty">Chargement...</div>';
  if (elements.orderChatMeta) {
    elements.orderChatMeta.textContent = `Commande: ${orderId}`;
  }

  try {
    const payload = await apiFetch(`/admin/commandes/${encodeURIComponent(orderId)}/chat/messages`);
    const messages = Array.isArray(payload && payload.messages) ? payload.messages : [];

    if (!messages.length) {
      elements.orderChatAdminMessages.innerHTML =
        '<div class="order-chat-admin-empty">Aucun message sur cette commande.</div>';
      return;
    }

    elements.orderChatAdminMessages.innerHTML = messages
      .map((entry) => {
        const senderType = String((entry && entry.senderType) || "").trim().toLowerCase();
        const rowClass = senderType === "client" ? "order-chat-admin-item is-client" : "order-chat-admin-item";
        const author = escapeHtml(`${entry.senderName || entry.senderEmail || "Utilisateur"} • ${formatOrderChatDate(entry.createdAt)}`);
        const text = escapeHtml(entry.message || "");
        return `
          <div class="${rowClass}">
            <span class="order-chat-admin-author">${author}</span>
            <div class="order-chat-admin-bubble">${text}</div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    elements.orderChatAdminMessages.innerHTML = `<div class="order-chat-admin-empty">${escapeHtml(
      error.message || "Impossible de charger le chat."
    )}</div>`;
  }
}

function normalizeSupportEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatSupportMessageDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderSupportConversations() {
  if (!elements.supportConversations) {
    return;
  }

  const rows = Array.isArray(state.supportConversations) ? state.supportConversations : [];
  if (elements.supportCount) {
    elements.supportCount.textContent = `${rows.length} conversation${rows.length > 1 ? "s" : ""}`;
  }

  if (!rows.length) {
    elements.supportConversations.innerHTML = '<div class="empty">Aucune conversation support.</div>';
    return;
  }

  elements.supportConversations.innerHTML = rows
    .map((row) => {
      const email = normalizeSupportEmail(row && row.participantEmail);
      const name = String((row && row.participantName) || "").trim() || email;
      const isActive = email && email === state.selectedSupportParticipantEmail;
      return `
        <button class="support-conversation-item ${isActive ? "is-active" : ""}" type="button" data-support-email="${escapeHtml(
          email
        )}" data-support-name="${escapeHtml(name)}">
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(email)}</small>
        </button>
      `;
    })
    .join("");
}

function renderSupportMessages() {
  if (!elements.supportAdminMessages) {
    return;
  }

  const rows = Array.isArray(state.supportMessages) ? state.supportMessages : [];
  if (!rows.length) {
    elements.supportAdminMessages.innerHTML =
      '<div class="order-chat-admin-empty">Aucun message sur cette conversation.</div>';
    return;
  }

  elements.supportAdminMessages.innerHTML = rows
    .map((entry) => {
      const senderType = String((entry && entry.participantType) || "").trim().toLowerCase();
      const isParticipant = senderType !== "moderateur";
      const rowClass = isParticipant ? "order-chat-admin-item is-client" : "order-chat-admin-item";
      const author = escapeHtml(
        `${entry.participantName || entry.moderatorId || "Support"} • ${formatSupportMessageDate(entry.createdAt)}`
      );
      const text = escapeHtml(entry.message || "");
      return `
          <div class="${rowClass}">
            <span class="order-chat-admin-author">${author}</span>
            <div class="order-chat-admin-bubble">${text}</div>
          </div>
        `;
    })
    .join("");

  elements.supportAdminMessages.scrollTop = elements.supportAdminMessages.scrollHeight;
}

async function loadSupportConversations() {
  if (!elements.supportConversations) {
    return;
  }
  const payload = await apiFetch("/support/conversations");
  state.supportConversations = Array.isArray(payload && payload.conversations) ? payload.conversations : [];
}

async function loadSupportMessages(participantEmail) {
  const normalizedEmail = normalizeSupportEmail(participantEmail);
  if (!normalizedEmail || !elements.supportAdminMessages) {
    state.supportMessages = [];
    return;
  }

  const payload = await apiFetch(`/support/messages?participantEmail=${encodeURIComponent(normalizedEmail)}`);
  state.supportMessages = Array.isArray(payload && payload.messages) ? payload.messages : [];
}

async function openSupportConversation(participantEmail, participantName = "") {
  const normalizedEmail = normalizeSupportEmail(participantEmail);
  if (!normalizedEmail) {
    return;
  }

  state.selectedSupportParticipantEmail = normalizedEmail;
  state.selectedSupportParticipantName = String(participantName || "").trim() || normalizedEmail;
  if (elements.supportChatMeta) {
    elements.supportChatMeta.textContent = `Discussion avec ${state.selectedSupportParticipantName} (${normalizedEmail})`;
  }
  await loadSupportMessages(normalizedEmail);
  renderSupportConversations();
  renderSupportMessages();
}

async function sendSupportReply(message) {
  const normalizedMessage = String(message || "").trim();
  const participantEmail = normalizeSupportEmail(state.selectedSupportParticipantEmail);
  if (!participantEmail || !normalizedMessage) {
    throw new Error("Sélectionnez une conversation et écrivez un message.");
  }

  const moderatorId = getCurrentAdminIdentifier();
  await apiFetch("/support/messages", {
    method: "POST",
    body: JSON.stringify({
      participantEmail,
      participantType: "moderateur",
      participantName: moderatorId || "moderateur",
      moderatorId: moderatorId || "",
      message: normalizedMessage
    })
  });
}

async function refreshSupportPanel(options = {}) {
  if (!elements.supportConversations) {
    return;
  }

  await loadSupportConversations();
  renderSupportConversations();

  const selectedEmail = normalizeSupportEmail(state.selectedSupportParticipantEmail);
  const selectedExists = selectedEmail
    ? state.supportConversations.some((row) => normalizeSupportEmail(row && row.participantEmail) === selectedEmail)
    : false;

  if (!selectedExists && state.supportConversations.length) {
    const first = state.supportConversations[0];
    await openSupportConversation(first.participantEmail, first.participantName);
    return;
  }

  if (selectedExists) {
    await loadSupportMessages(selectedEmail);
    renderSupportMessages();
    return;
  }

  state.supportMessages = [];
  if (elements.supportChatMeta) {
    elements.supportChatMeta.textContent = "Sélectionnez une conversation.";
  }
  renderSupportMessages();
  if (options && options.initial && elements.supportAdminMessages) {
    elements.supportAdminMessages.innerHTML =
      '<div class="order-chat-admin-empty">Aucune conversation support.</div>';
  }
}

function stopSupportPolling() {
  if (supportPollTimer) {
    window.clearInterval(supportPollTimer);
    supportPollTimer = null;
  }
}

function startSupportPolling() {
  if (!elements.supportConversations) {
    return;
  }
  stopSupportPolling();
  supportPollTimer = window.setInterval(() => {
    refreshSupportPanel().catch((error) => {
      const message = String((error && error.message) || "").toLowerCase();
      if (message.includes("route not found") || message.includes("404")) {
        stopSupportPolling();
      }
    });
  }, 1800);
}

function openFingerprintInfo(encodedPayload) {
  if (!elements.fingerprintModal) {
    return;
  }

  let payload = null;

  try {
    payload = JSON.parse(decodeURIComponent(String(encodedPayload || "")));
  } catch (error) {
    payload = null;
  }

  if (!payload) {
    showToast("Infos fingerprint introuvables.", "error");
    return;
  }

  setText(elements.fpProviderName, payload.providerName);
  setText(elements.fpProviderEmail, payload.email);
  setText(elements.fpProviderStatus, payload.status);
  setText(elements.fpHash, payload.hash);
  setText(elements.fpNetwork, payload.network);
  setText(elements.fpMode, payload.mode);
  setText(elements.fpRecordedAt, payload.recordedAt ? formatDate(payload.recordedAt) : "-");

  if (elements.fpTx) {
    if (payload.txHash && payload.explorerUrl) {
      elements.fpTx.innerHTML = `<a href="${escapeHtml(payload.explorerUrl)}" target="_blank" rel="noreferrer">${escapeHtml(
        shortHash(payload.txHash, 22)
      )}</a>`;
    } else {
      elements.fpTx.textContent = payload.txHash || "-";
    }
  }

  if (elements.fpLocation) {
    if (payload.locationUrl) {
      elements.fpLocation.innerHTML = `<a href="${escapeHtml(payload.locationUrl)}" target="_blank" rel="noreferrer">Ouvrir position</a>`;
    } else {
      elements.fpLocation.textContent = "Non disponible";
    }
  }

  elements.fingerprintModal.hidden = false;
}

function showToast(message, type = "ok") {
  if (!elements.toast) {
    return;
  }

  elements.toast.hidden = false;
  elements.toast.className = `toast ${type}`;
  elements.toast.textContent = message;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

async function apiFetch(path, options = {}) {
  let lastNetworkError = null;
  const adminIdentifier = getCurrentAdminIdentifier();
  const adminSecret = getCurrentAdminSecret();
  const authHeaders = {};
  if (adminIdentifier) {
    authHeaders["x-admin-identifier"] = adminIdentifier;
  }
  if (adminSecret) {
    authHeaders["x-admin-secret"] = adminSecret;
  }

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...(options.headers || {})
        }
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message = payload && payload.message ? payload.message : `Erreur HTTP ${response.status}`;
        if (isWrongApiHostResponse(response.status, message)) {
          continue;
        }
        throw new Error(message);
      }

      state.apiBase = apiBase;
      saveApiBase(apiBase);
      return payload;
    } catch (error) {
      if (isNetworkError(error)) {
        lastNetworkError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error(getBackendUnavailableMessage());
  }

  throw new Error(getBackendUnavailableMessage());
}

function renderStats() {
  const stats = state.stats || {};

  const cards = [
    { label: "Prestataires total", value: stats.totalPrestataires || 0 },
    { label: "En attente", value: stats.prestatairesEnAttente || 0 },
    { label: "Valides", value: stats.prestatairesValides || 0 },
    { label: "Refuses", value: stats.prestatairesRefuses || 0 },
    { label: "Clients", value: stats.totalClients || 0 },
    { label: "Clients en attente", value: stats.clientsEnAttente || 0 },
    { label: "Commandes", value: stats.totalCommandes || 0 }
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) =>
        `<article class="stat-card"><p class="stat-label">${card.label}</p><p class="stat-value">${card.value}</p></article>`
    )
    .join("");
}

function renderPendingProviders() {
  const rows = state.pendingProviders;
  elements.pendingCount.textContent = `${rows.length} élément${rows.length > 1 ? "s" : ""}`;

  if (!rows.length) {
    elements.pendingBody.innerHTML = '<tr><td colspan="4"><div class="empty">Aucun prestataire inscrit.</div></td></tr>';
    return;
  }

  elements.pendingBody.innerHTML = rows
    .map((provider) => {
      const status = provider.statutVerification || "en_attente";
      const fullName = `${provider.prenom || ""} ${provider.nom || ""}`.trim() || "-";
      const birthDate = formatDateOnly(provider.dateDeNaissance);
      const createdAt = formatDate(provider.createdAt);
      const cinUrl = provider.cinImageUrl || provider.cinImage || "#";
      const casierUrl = provider.casierImageUrl || provider.casierImage || "#";
      const photoUrl = provider.photoProfilUrl || provider.photoProfil || "";
      const blockchainPreview = shortHash(provider.blockchainHash);
      const blockchainTx = renderTxLabel(provider.blockchainTxHash, provider.blockchainExplorerUrl);
      const blockchainMode = provider.blockchainMode || "-";
      const hasFingerprintCapture = Boolean(
        provider.fingerprintHash || provider.fingerprintTxHash || provider.fingerprintRecordedAt
      );
      const fingerprintPreview = hasFingerprintCapture ? shortHash(provider.fingerprintHash) : "-";
      const fingerprintTx = hasFingerprintCapture
        ? renderTxLabel(provider.fingerprintTxHash, provider.fingerprintExplorerUrl)
        : "-";
      const fingerprintCaptureMode = provider.fingerprintCaptureMode || "";
      const fingerprintMode = hasFingerprintCapture
        ? [fingerprintCaptureMode, provider.fingerprintMode || ""].filter(Boolean).join(" / ") || "-"
        : "-";
      const domaine = provider.domaine || provider.categorie || "-";
      const experience = provider.experience || "-";
      const ageText = provider.age ? `${provider.age} ans` : "-";
      const birthText = provider.dateDeNaissance ? birthDate : "-";
      const coordinates = resolveProviderCoordinates(provider);
      const mapsUrl = coordinates
        ? `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
        : "";
      const canValidateInterview = status === "en_attente";
      const canValidateFingerprint = status === "entretien_valide";
      const approveButtonLabel = "Approuver";
      const deleteButtonMarkup = `<button class="btn btn-small btn-danger" data-action="supprimer" data-id="${provider._id}">Supprimer</button>`;
      const fingerprintPayload = hasFingerprintCapture
        ? encodeURIComponent(
            JSON.stringify({
              providerName: fullName,
              email: provider.email || "",
              status,
              hash: provider.fingerprintHash || "",
              txHash: provider.fingerprintTxHash || "",
              explorerUrl: provider.fingerprintExplorerUrl || "",
              network: provider.fingerprintNetwork || "",
              mode: [provider.fingerprintCaptureMode || "", provider.fingerprintMode || ""].filter(Boolean).join(" / "),
              recordedAt: provider.fingerprintRecordedAt || "",
              locationUrl: mapsUrl || ""
            })
          )
        : "";
      const fingerprintInfoButton = hasFingerprintCapture
        ? `<button class="btn btn-small btn-secondary" data-action="fingerprint-info" data-fingerprint="${fingerprintPayload}">Info fingerprint</button>`
        : "";
      let actionsMarkup = "";

      if (status === "en_attente") {
        actionsMarkup = `
          ${fingerprintInfoButton}
          <button class="btn btn-small btn-warning" data-action="entretien" data-id="${provider._id}" ${canValidateInterview ? "" : "disabled"}>Valider entretien</button>
          ${deleteButtonMarkup}
        `;
      } else if (status === "entretien_valide") {
        actionsMarkup = `
          ${fingerprintInfoButton}
          <button class="btn btn-small" data-action="fingerprint" data-id="${provider._id}" ${canValidateFingerprint ? "" : "disabled"}>${approveButtonLabel}</button>
          <button class="btn btn-small btn-danger" data-action="refuser" data-id="${provider._id}">Rejeter</button>
          ${deleteButtonMarkup}
        `;
      } else if (status === "valide") {
        actionsMarkup = `${fingerprintInfoButton}<span class="tag">Profil approuvé</span>${deleteButtonMarkup}`;
      } else if (status === "refuse") {
        actionsMarkup = `${fingerprintInfoButton}<span class="tag">Profil rejeté</span>${deleteButtonMarkup}`;
      } else {
        actionsMarkup = `${fingerprintInfoButton}<span class="tag">Aucune action</span>${deleteButtonMarkup}`;
      }

      return `
        <tr>
          <td>
            <div class="stack info-list">
              ${photoUrl ? `<img class="provider-avatar" src="${photoUrl}" alt="Photo profil ${fullName}" loading="lazy">` : ""}
              <strong>${fullName}</strong>
              <small>Email: ${provider.email || "-"}</small>
              <small>Téléphone: ${provider.telephone || "-"}</small>
              <small>Mot de passe: ${escapeHtml(resolveDisplayPassword(provider))}</small>
              <small>Domaine: ${domaine}</small>
              <small>Expérience: ${experience}</small>
              <small>Date naissance: ${birthText}</small>
              <small>Age: ${ageText}</small>
              <small>Inscription: ${createdAt}</small>
              <small>Geo: ${
                mapsUrl
                  ? `<a href="${mapsUrl}" target="_blank" rel="noreferrer">Ouvrir position</a>`
                  : "Non disponible"
              }</small>
              <small>Blockchain ID: ${blockchainPreview}</small>
              <small>Blockchain TX: ${blockchainTx}</small>
              <small>Mode Blockchain: ${blockchainMode}</small>
              ${
                hasFingerprintCapture
                  ? `<small>Fingerprint: ${fingerprintPreview}</small>
              <small>Fingerprint TX: ${fingerprintTx}</small>
              <small>Mode Fingerprint: ${fingerprintMode}</small>`
                  : "<small>Fingerprint: en attente de capture</small>"
              }
            </div>
          </td>
          <td><span class="badge ${status}">${status}</span></td>
          <td>
            <div class="doc-preview-grid">
              <a class="doc-link-card" href="${cinUrl}" target="_blank" rel="noreferrer">
                <img class="doc-thumb" src="${cinUrl}" alt="CIN prestataire" loading="lazy">
                <span>Carte nationale</span>
              </a>
              <a class="doc-link-card" href="${casierUrl}" target="_blank" rel="noreferrer">
                <img class="doc-thumb" src="${casierUrl}" alt="Casier judiciaire" loading="lazy">
                <span>Casier judiciaire</span>
              </a>
              ${
                photoUrl
                  ? `<a class="doc-link-card" href="${photoUrl}" target="_blank" rel="noreferrer">
                <img class="doc-thumb" src="${photoUrl}" alt="Photo profil" loading="lazy">
                <span>Photo profil</span>
              </a>`
                  : ""
              }
            </div>
          </td>
          <td>
            <div class="actions">
              ${actionsMarkup}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderClients() {
  const rows = state.clients;
  elements.clientsCount.textContent = `${rows.length} client${rows.length > 1 ? "s" : ""}`;

  if (!rows.length) {
    elements.clientsBody.innerHTML = '<tr><td colspan="9"><div class="empty">Aucun client inscrit.</div></td></tr>';
    return;
  }

  elements.clientsBody.innerHTML = rows
    .map((client) => {
      const status = client.statutVerification || "en_attente";
      const birthDate = formatDateOnly(client.dateDeNaissance);
      const ageText = Number.isFinite(Number(client.age)) ? `${client.age} ans` : "-";
      const cinUrl = client.cinImageUrl || client.cinImage || "#";
      const canReview = status === "en_attente";
      return `
      <tr>
        <td>${client.prenom || ""} ${client.nom || ""}</td>
        <td>${client.email || "-"}</td>
        <td>${client.telephone || "-"}</td>
        <td>${client.dateDeNaissance ? birthDate : "-"}</td>
        <td>${ageText}</td>
        <td><span class="badge ${status}">${status}</span></td>
        <td>
          <a class="doc-link-card" href="${cinUrl}" target="_blank" rel="noreferrer">
            <img class="doc-thumb" src="${cinUrl}" alt="CIN client" loading="lazy">
            <span>Carte nationale</span>
          </a>
        </td>
        <td>
          <div class="stack info-list">
            <small>Mot de passe: ${escapeHtml(resolveDisplayPassword(client))}</small>
            <small>ID: ${shortHash(client.blockchainHash)}</small>
            <small>TX: ${renderTxLabel(client.blockchainTxHash, client.blockchainExplorerUrl)}</small>
            <small>Mode: ${client.blockchainMode || "-"}</small>
          </div>
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-small" data-client-action="valider" data-id="${client._id}" ${canReview ? "" : "disabled"}>Approuver</button>
            <button class="btn btn-small btn-danger" data-client-action="refuser" data-id="${client._id}" ${canReview ? "" : "disabled"}>Rejeter</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderVisibleProviders() {
  const items = state.visibleProviders;

  if (!items.length) {
    elements.visibleProviders.innerHTML = '<div class="empty">Aucun prestataire valide à afficher.</div>';
    return;
  }

  elements.visibleProviders.innerHTML = items
    .map(
      (provider) => `
      <article class="provider-card">
        <h3>${provider.prenom || ""} ${provider.nom || ""}</h3>
        <p>Catégorie: ${provider.categorie || "-"}</p>
        <p>Téléphone: ${provider.telephone || "-"}</p>
        <p>Age: ${provider.age || "-"} ans</p>
      </article>
    `
    )
    .join("");
}

function renderCommandes() {
  const rows = state.commandes;
  elements.ordersCount.textContent = `${rows.length} commande${rows.length > 1 ? "s" : ""}`;

  if (!rows.length) {
    elements.ordersBody.innerHTML = '<tr><td colspan="9"><div class="empty">Aucune commande.</div></td></tr>';
    return;
  }

  elements.ordersBody.innerHTML = rows
    .map((commande) => {
      const clientName = commande.clientId ? `${commande.clientId.prenom || ""} ${commande.clientId.nom || ""}` : "-";
      const providerName = commande.prestataireId
        ? `${commande.prestataireId.prenom || ""} ${commande.prestataireId.nom || ""}`
        : "-";
      const distanceText = Number.isFinite(Number(commande.distanceKm))
        ? `${Number(commande.distanceKm).toFixed(2)} km`
        : "-";
      const distancePricingText = Number.isFinite(Number(commande.distancePricingDh))
        ? `${Number(commande.distancePricingDh)} DH`
        : "-";

      return `
        <tr>
          <td>${commande.service || "-"}</td>
          <td>${clientName.trim() || "-"}</td>
          <td>${providerName.trim() || "-"}</td>
          <td>${distanceText}</td>
          <td>${distancePricingText}</td>
          <td>${renderPaymentMethod(commande.paymentMethod)}</td>
          <td><span class="badge">${commande.statut || "-"}</span></td>
          <td>${formatDate(commande.createdAt)}</td>
          <td>
            <button class="btn btn-small btn-secondary" data-order-action="chat" data-id="${commande._id || ""}">
              Voir chat
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadDashboard() {
  const payload = await apiFetch("/admin/dashboard");
  state.stats = payload.stats || {};
  if (Array.isArray(payload.commandes)) {
    state.commandes = payload.commandes;
  }
}

async function loadPendingProviders() {
  const payload = await apiFetch("/admin/prestataires");
  state.pendingProviders = Array.isArray(payload.prestataires) ? payload.prestataires : [];
}

async function loadClients() {
  const payload = await apiFetch("/admin/clients");
  state.clients = Array.isArray(payload.clients) ? payload.clients : [];
}

async function loadCommandes() {
  try {
    const payload = await apiFetch("/admin/commandes");
    state.commandes = Array.isArray(payload.commandes) ? payload.commandes : state.commandes;
  } catch (error) {
    const message = String((error && error.message) || "").toLowerCase();
    const isMissingCommandesRoute =
      message.includes("route not found") ||
      message.includes("cannot get") ||
      message.includes("404");

    if (!isMissingCommandesRoute && !isNetworkError(error)) {
      throw error;
    }
  }
}

async function loadVisibleProviders(category = "") {
  const query = category.trim() ? `?categorie=${encodeURIComponent(category.trim())}` : "";
  const payload = await apiFetch(`/prestataires${query}`);
  state.visibleProviders = Array.isArray(payload.prestataires) ? payload.prestataires : [];
}

async function refreshAll() {
  try {
    const category = elements.providerCategory.value || "";
    await Promise.all([loadDashboard(), loadPendingProviders(), loadClients(), loadVisibleProviders(category)]);
    await loadCommandes();

    renderStats();
    renderPendingProviders();
    renderClients();
    renderVisibleProviders();
    renderCommandes();

    if (elements.supportConversations) {
      try {
        await refreshSupportPanel({ initial: true });
      } catch (supportError) {
        showToast("Support indisponible pour le moment. Les donnees admin restent accessibles.", "error");
      }
    }
  } catch (error) {
    showToast(error && error.message ? error.message : getBackendUnavailableMessage(), "error");
  }
}

async function handlePendingAction(action, id, button) {
  if (action === "fingerprint-info") {
    openFingerprintInfo(button ? button.dataset.fingerprint : "");
    return;
  }

  if (!id || !action) {
    return;
  }

  const routes = {
    entretien: `/admin/prestataires/${id}/valider-entretien`,
    refuser: `/admin/prestataires/${id}/refuser`,
    fingerprint: `/admin/prestataires/${id}/valider-fingerprint`,
    supprimer: `/admin/prestataires/${id}`
  };

  const labels = {
    entretien: "Entretien validé",
    refuser: "Prestataire rejeté",
    fingerprint: "Prestataire approuvé",
    supprimer: "Prestataire supprimé"
  };

  const methods = {
    entretien: "PATCH",
    refuser: "PATCH",
    fingerprint: "PATCH",
    supprimer: "DELETE"
  };

  if (!routes[action]) {
    return;
  }

  if (action === "refuser") {
    const confirmed = window.confirm("Confirmer le refus de ce prestataire ?");
    if (!confirmed) {
      return;
    }
  }

  if (action === "supprimer") {
    const confirmed = window.confirm("Supprimer ce prestataire définitivement ? Son profil ne sera plus visible.");
    if (!confirmed) {
      return;
    }
  }

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Traitement...";

  try {
    await apiFetch(routes[action], { method: methods[action] || "PATCH" });
    showToast(labels[action], "ok");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}

async function handleClientAction(action, id, button) {
  if (!id || !action) {
    return;
  }

  const routes = {
    valider: `/admin/clients/${id}/valider`,
    refuser: `/admin/clients/${id}/refuser`
  };

  const labels = {
    valider: "Client approuvé",
    refuser: "Client rejeté"
  };

  if (!routes[action]) {
    return;
  }

  if (action === "refuser") {
    const confirmed = window.confirm("Confirmer le rejet de ce client ?");
    if (!confirmed) {
      return;
    }
  }

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Traitement...";

  try {
    await apiFetch(routes[action], { method: "PATCH" });
    showToast(labels[action], "ok");
    await refreshAll();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = previousText;
  }
}

function setupEvents() {
  elements.pendingBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    handlePendingAction(button.dataset.action, button.dataset.id, button);
  });

  elements.providerFilterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await loadVisibleProviders(elements.providerCategory.value || "");
      renderVisibleProviders();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  elements.clientsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-client-action]");
    if (!button) {
      return;
    }

    handleClientAction(button.dataset.clientAction, button.dataset.id, button);
  });

  elements.ordersBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order-action]");
    if (!button) {
      return;
    }

    const action = String(button.dataset.orderAction || "").trim().toLowerCase();
    const orderId = String(button.dataset.id || "").trim();
    if (action === "chat" && orderId) {
      openOrderChatModal(orderId);
    }
  });

  if (elements.supportConversations) {
    elements.supportConversations.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-support-email]");
      if (!button) {
        return;
      }
      const participantEmail = normalizeSupportEmail(button.dataset.supportEmail);
      const participantName = String(button.dataset.supportName || "").trim();
      openSupportConversation(participantEmail, participantName).catch((error) => {
        showToast(error.message || "Impossible d'ouvrir la conversation support.", "error");
      });
    });
  }

  if (elements.supportReplyForm) {
    elements.supportReplyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = String((elements.supportReplyInput && elements.supportReplyInput.value) || "").trim();
      if (!message) {
        showToast("Ecrivez un message avant l'envoi.", "error");
        return;
      }

      if (elements.supportReplySendBtn) {
        elements.supportReplySendBtn.disabled = true;
      }
      try {
        await sendSupportReply(message);
        if (elements.supportReplyInput) {
          elements.supportReplyInput.value = "";
        }
        await refreshSupportPanel();
      } catch (error) {
        showToast(error.message || "Réponse support impossible.", "error");
      } finally {
        if (elements.supportReplySendBtn) {
          elements.supportReplySendBtn.disabled = false;
        }
      }
    });
  }

  if (elements.fingerprintModalBackdrop) {
    elements.fingerprintModalBackdrop.addEventListener("click", closeFingerprintModal);
  }

  if (elements.fingerprintModalClose) {
    elements.fingerprintModalClose.addEventListener("click", closeFingerprintModal);
  }

  if (elements.orderChatModalBackdrop) {
    elements.orderChatModalBackdrop.addEventListener("click", closeOrderChatModal);
  }

  if (elements.orderChatModalClose) {
    elements.orderChatModalClose.addEventListener("click", closeOrderChatModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.fingerprintModal && !elements.fingerprintModal.hidden) {
      closeFingerprintModal();
    }
    if (event.key === "Escape" && elements.orderChatModal && !elements.orderChatModal.hidden) {
      closeOrderChatModal();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSupportPolling();
  });
}

async function init() {
  if (!ensureAdminAccessOrRedirect()) {
    return;
  }

  const globalApiBase = typeof window.PROXY_API_BASE_URL === "string" ? window.PROXY_API_BASE_URL : "";
  const localContextFallbackApiBase =
    !window.location || window.location.protocol === "file:" || !window.location.host
      ? normalizeApiBase(RENDER_FALLBACK_API_BASE)
      : "";
  state.apiBase =
    getCurrentOriginApiBase() ||
    normalizeApiBase(globalApiBase) ||
    getStoredApiBase() ||
    localContextFallbackApiBase ||
    DEFAULT_API_BASE;

  setupEvents();
  await refreshAll();
  startSupportPolling();
}

init();

