import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { handle } from "./api.mjs";
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".py": "text/plain; charset=utf-8",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const apiUrl = new URL(
        url.pathname,
        process.env.APP_ORIGIN || "http://" + (req.headers.host || "localhost"),
      );
      const options = { method: req.method, headers: req.headers };
      if (!["GET", "HEAD"].includes(req.method)) {
        options.body = Readable.toWeb(req);
        options.duplex = "half";
      }
      const response = await handle(new Request(apiUrl, options), {
        ip: req.socket.remoteAddress,
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    let route = decodeURIComponent(url.pathname);
    if (route === "/" || /^\/v\/[\w-]+\/?$/.test(route)) route = "/index.html";
    const file = resolve(publicDirectory, "." + route);
    if (!file.startsWith(resolve(publicDirectory) + sep)) {
      res.writeHead(404).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "content-type": contentTypes[extname(file)] || "application/octet-stream",
      "content-length": info.size,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    if (req.method === "HEAD") res.end();
    else
      createReadStream(file)
        .on("error", () => res.destroy())
        .pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end();
  }
});
server.listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || "127.0.0.1",
  () => console.log("Vouch listening on port " + server.address().port),
);
