const DEFAULT_ADMIN_CREDENTIALS = {
  admin123: "admin123",
  admin1: "admin1",
  admin2: "admin2",
  admin3: "admin3",
  admin4: "admin4",
  admin5: "admin5"
};

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveAdminCredentials() {
  const envRaw = String(process.env.ADMIN_CREDENTIALS_JSON || "").trim();
  if (!envRaw) {
    return { ...DEFAULT_ADMIN_CREDENTIALS };
  }

  try {
    const parsed = JSON.parse(envRaw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_ADMIN_CREDENTIALS };
    }

    const fromEnv = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const identifier = normalizeIdentifier(key);
      const secret = String(value || "").trim();
      if (identifier && secret) {
        fromEnv[identifier] = secret;
      }
    });

    if (Object.keys(fromEnv).length > 0) {
      return fromEnv;
    }
  } catch (error) {
    return { ...DEFAULT_ADMIN_CREDENTIALS };
  }

  return { ...DEFAULT_ADMIN_CREDENTIALS };
}

function extractAdminCredentials(req) {
  const query = req && req.query ? req.query : {};
  const body = req && req.body && typeof req.body === "object" ? req.body : {};
  const headers = req && req.headers ? req.headers : {};

  const identifier = normalizeIdentifier(
    headers["x-admin-identifier"] || query.adminIdentifier || body.adminIdentifier
  );
  const secret = String(headers["x-admin-secret"] || query.adminSecret || body.adminSecret || "").trim();

  return { identifier, secret };
}

function requireAdminAuth(req, res, next) {
  const { identifier, secret } = extractAdminCredentials(req);
  if (!identifier || !secret) {
    return res.status(401).json({ message: "Admin credentials required." });
  }

  const credentials = resolveAdminCredentials();
  const expectedSecret = String(credentials[identifier] || "").trim();
  if (!expectedSecret || expectedSecret !== secret) {
    return res.status(403).json({ message: "Admin access denied." });
  }

  req.adminIdentity = identifier;
  return next();
}

module.exports = {
  requireAdminAuth
};

