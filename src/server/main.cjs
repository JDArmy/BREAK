 
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const ALLOWED_BASE = path.resolve(__dirname, "../../BREAK");

app.post("/", (req, res) => {
  const { path: filePath, json } = req.body;

  if (!filePath || !json) {
    return res.status(400).json({ error: "Missing path or json field" });
  }

  const resolvedPath = path.resolve(__dirname, "../..", filePath);

  if (!resolvedPath.startsWith(ALLOWED_BASE)) {
    return res.status(403).json({ error: "Access denied: path outside allowed directory" });
  }

  try {
    JSON.parse(json);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  fs.access(resolvedPath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.writeFile(resolvedPath, json, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write to file" });
      }

      res.status(200).json({ message: "Data written to file successfully" });
    });
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
