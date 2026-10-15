// Development-only loopback wrapper. Never imported by the application.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
if (process.env.NODE_ENV === 'production') throw new Error('This preview server is development-only.');
const html = new URL('../dev-preview/index.html', import.meta.url);
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end(); return; }
  try {
    const body = await readFile(html);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-src http://localhost:5183; style-src 'unsafe-inline'; script-src 'unsafe-inline'" });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Preview unavailable'); }
});
server.listen(5184, 'localhost', () => console.log('Development preview: http://localhost:5184/ (Expo app: http://localhost:5183/)'));
