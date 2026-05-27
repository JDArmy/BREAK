const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const projectRoot = path.resolve(__dirname, "../..");
const allowedRoots = [
  path.join(projectRoot, "src/BREAK"),
  path.join(projectRoot, "src/i18n/en/BREAK"),
];
const backupRoot = path.join(projectRoot, "research/editor-backups");

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === "http://127.0.0.1:5173" || origin === "http://localhost:5173") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

function jsonError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function resolveAllowedPath(filePath) {
  if (typeof filePath !== "string" || filePath.includes("\0")) {
    return null;
  }

  const resolved = path.resolve(projectRoot, filePath);
  const allowed = allowedRoots.some((root) => {
    const relative = path.relative(root, resolved);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });

  return allowed ? resolved : null;
}

function backupFile(filePath) {
  const relative = path.relative(projectRoot, filePath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupRoot, `${relative}.${stamp}.bak`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

app.post("/", (req, res) => {
  const { path: filePath, json } = req.body;

  if (!filePath || typeof json !== "string") {
    return jsonError(res, 400, "BAD_REQUEST", "Missing path or json field");
  }

  const resolvedPath = resolveAllowedPath(filePath);
  if (!resolvedPath) {
    return jsonError(res, 403, "PATH_DENIED", "Path must stay under src/BREAK or src/i18n/en/BREAK");
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return jsonError(res, 400, "INVALID_JSON", "Invalid JSON");
  }

  if (!fs.existsSync(resolvedPath)) {
    return jsonError(res, 404, "NOT_FOUND", "File not found");
  }

  try {
    backupFile(resolvedPath);
    fs.writeFileSync(resolvedPath, `${JSON.stringify(parsed, null, 2)}\n`);
    return res.status(200).json({
      message: "Data written to file successfully",
      path: path.relative(projectRoot, resolvedPath),
    });
  } catch (error) {
    return jsonError(res, 500, "WRITE_FAILED", error.message);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
