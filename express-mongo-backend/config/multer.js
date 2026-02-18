const multer = require("multer");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

["prestataires/cin", "prestataires/casier", "prestataires/profile", "clients/cin", "clients/profile", "misc"].forEach((folder) => {
  ensureDir(path.join(UPLOADS_DIR, ...folder.split("/")));
});

function resolveFolderByRequest(req, file) {
  const baseUrl = (req.baseUrl || "").toLowerCase();

  if (baseUrl.includes("prestataire")) {
    if (file.fieldname === "casierImage") {
      return "prestataires/casier";
    }
    if (file.fieldname === "photoProfil") {
      return "prestataires/profile";
    }
    return "prestataires/cin";
  }

  if (baseUrl.includes("client")) {
    if (file.fieldname === "photoProfil") {
      return "clients/profile";
    }
    return "clients/cin";
  }

  return "misc";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = resolveFolderByRequest(req, file);
    const destination = path.join(UPLOADS_DIR, ...folder.split("/"));
    ensureDir(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || ".jpg";
    const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension.toLowerCase()}`;
    cb(null, uniqueName);
  }
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only JPG, PNG and WEBP image uploads are allowed."));
}

const commonMulterOptions = {
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024
  }
};

const providerUpload = multer(commonMulterOptions).fields([
  { name: "cinImage", maxCount: 1 },
  { name: "casierImage", maxCount: 1 },
  { name: "photoProfil", maxCount: 1 }
]);

const clientUpload = multer(commonMulterOptions).fields([
  { name: "cinImage", maxCount: 1 },
  { name: "photoProfil", maxCount: 1 }
]);

function toPublicPath(filePath) {
  const relativePath = path.relative(UPLOADS_DIR, filePath).split(path.sep).join("/");
  return `/uploads/${relativePath}`;
}

module.exports = {
  UPLOADS_DIR,
  providerUpload,
  clientUpload,
  toPublicPath
};
