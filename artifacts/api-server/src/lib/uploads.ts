import path from "node:path";
import fs from "node:fs";
import multer from "multer";

// Stored outside dist/ so uploaded files survive rebuilds (build.mjs wipes
// dist/ on every build, but not artifactDir/uploads).
export const uploadsDir = path.resolve(
  globalThis.__dirname ?? import.meta.dirname,
  "..",
  "uploads",
);

fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});
