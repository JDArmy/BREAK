 
const express = require("express");
 
const fs = require("fs");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/", (req, res) => {
  const { path, json } = req.body;

  if (!path || !json) {
    return res.status(400).json({ error: "Missing path or json field" });
  }

  try {
    JSON.parse(json);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  fs.access(path, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.writeFile(path, json, (err) => {
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
