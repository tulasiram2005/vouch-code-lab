// Mirror the production HTTPS origin so Chromium exercises the Secure session cookie.
import https from "node:https";
import http from "node:http";
import { readFileSync } from "node:fs";
const options = { key: readFileSync(process.argv[2]), cert: readFileSync(process.argv[3]) };
https.createServer(options, (req, res) => {
  const target = http.request({
    hostname: "127.0.0.1", port: 4173, method: req.method, path: req.url, headers: req.headers,
  }, upstream => {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res);
  });
  target.on("error", () => res.writeHead(502).end());
  req.pipe(target);
}).listen(4174, "127.0.0.1");
