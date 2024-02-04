import * as fs from "fs";
import * as http from "http";

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { path, json } = JSON.parse(body);
        if (!fs.existsSync(path)) {
          res.statusCode = 404;
          res.end(`File ${path} does not exist`);
        } else {
          fs.writeFileSync(path, JSON.stringify(json));
          res.statusCode = 200;
          res.end(`Data written to ${path}`);
        }
      } catch (error) {
        res.statusCode = 400;
        res.end("Invalid JSON data");
      }
    });
  } else {
    res.statusCode = 405;
    res.end("Method Not Allowed");
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
