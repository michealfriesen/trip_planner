// Mock of the live data source, for Verification 2 only.
// GET /italy.json serves the snapshot (or the current forced status).
// GET /__status/403 or /__status/200 switches what /italy.json returns.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const PORT = 4010;
const SNAPSHOT = new URL("../src/data/italy.snapshot.json", import.meta.url);

let status = 200;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  const match = url.pathname.match(/^\/__status\/(\d{3})$/);
  if (match) {
    status = Number(match[1]);
    console.log(`[mock] /italy.json now returns ${status}`);
    res.writeHead(200, { "Content-Type": "text/plain" }).end(`status=${status}\n`);
    return;
  }

  if (url.pathname === "/italy.json") {
    console.log(`[mock] GET /italy.json -> ${status}`);
    if (status !== 200) {
      res.writeHead(status, { "Content-Type": "text/plain" }).end("Forbidden\n");
      return;
    }
    const body = await readFile(SNAPSHOT);
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" }).end(body);
    return;
  }

  res.writeHead(404).end();
}).listen(PORT, () => console.log(`[mock] listening on http://localhost:${PORT}/italy.json`));
