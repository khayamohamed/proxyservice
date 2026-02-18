const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.FRONTEND_HTTPS_PORT || 4173);
const PFX_PATH = path.resolve(process.env.SSL_PFX_PATH || path.join(ROOT_DIR, "certs", "localhost-dev.pfx"));
const PFX_PASSPHRASE = String(process.env.SSL_PFX_PASSPHRASE || "localdev123");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function getFilePathFromRequestUrl(requestUrl) {
  const url = new URL(requestUrl, "https://localhost");
  const requestedPath = decodeURIComponent(url.pathname || "/");
  const normalizedPath = requestedPath === "/" ? "/index.html" : requestedPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.resolve(ROOT_DIR, `.${safePath}`);
  if (!absolutePath.startsWith(ROOT_DIR)) {
    return null;
  }
  return absolutePath;
}

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function serveFile(res, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats) {
      sendError(res, 404, "Not found");
      return;
    }

    const resolvedFilePath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.stat(resolvedFilePath, (indexStatError, indexStats) => {
      if (indexStatError || !indexStats || !indexStats.isFile()) {
        sendError(res, 404, "Not found");
        return;
      }

      const extension = path.extname(resolvedFilePath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      const stream = fs.createReadStream(resolvedFilePath);
      stream.on("error", () => {
        sendError(res, 500, "Server error");
      });
      stream.pipe(res);
    });
  });
}

function startHttpsServer() {
  if (!fs.existsSync(PFX_PATH)) {
    console.error(`HTTPS certificate not found at: ${PFX_PATH}`);
    console.error("Generate it first (see scripts/generate-dev-cert.ps1).");
    process.exit(1);
  }

  const pfx = fs.readFileSync(PFX_PATH);
  const server = https.createServer({ pfx, passphrase: PFX_PASSPHRASE }, (req, res) => {
    const filePath = getFilePathFromRequestUrl(req.url || "/");
    if (!filePath) {
      sendError(res, 403, "Forbidden");
      return;
    }
    serveFile(res, filePath);
  });

  server.listen(PORT, () => {
    console.log(`HTTPS frontend running on https://localhost:${PORT}`);
  });
}

startHttpsServer();
