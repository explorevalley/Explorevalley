/* Minimal static server for Expo web export (apps/app/web-dist) on App Engine.
   - Serves `/_expo/*` assets directly
   - Serves `index.html` for all other routes (SPA fallback)
*/

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const DIST = path.join(ROOT, "web-dist");
const INDEX = path.join(DIST, "index.html");

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".wasm") return "application/wasm";
  return "application/octet-stream";
}

function safeJoin(base, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const rel = decoded.replace(/^\/*/, ""); // strip leading slashes
  const full = path.normalize(path.join(base, rel));
  if (!full.startsWith(base)) return null;
  return full;
}

function sendFile(res, filePath) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return false;
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypeFor(filePath));
    res.setHeader("Cache-Control", filePath.includes(`${path.sep}_expo${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache");
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0] || "/";

  // Direct asset serving (Expo export puts bundles under /_expo/*)
  if (urlPath.startsWith("/_expo/")) {
    const fp = safeJoin(DIST, urlPath);
    if (fp && sendFile(res, fp)) return;
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  // Health check convenience
  if (urlPath === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // SPA fallback
  if (sendFile(res, INDEX)) return;

  res.statusCode = 500;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Missing web-dist. Ensure `expo export --platform web --output-dir web-dist` ran.");
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ExploreValley web serving ${DIST} on :${PORT}`);
});

