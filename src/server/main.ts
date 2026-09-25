import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import type { ClientMsg } from '../shared/protocol';
import { Lobby } from './rooms';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const here = fileURLToPath(new URL('.', import.meta.url));
// Both dist/server/main.js and src/server/main.ts (tsx) resolve to <root>/dist/client.
const STATIC_DIR = resolve(here, '../../dist/client');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const lobby = new Lobby();

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: lobby.rooms.size, sessions: lobby.sessions.size }));
    return;
  }
  if (url.pathname === '/api/rooms') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(lobby.listRooms()));
    return;
  }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (path.includes('..')) {
    res.writeHead(400);
    res.end();
    return;
  }
  let file = join(STATIC_DIR, path || 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(STATIC_DIR, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Client not built yet. Run "npm run build" (or use "npm run dev" and open http://localhost:5173).');
    return;
  }
  const ext = extname(file);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': file.includes(`${join('assets', '')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

wss.on('connection', (ws) => {
  let session = lobby.newSession(ws);
  let greeted = false;
  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof (msg as { type?: unknown }).type !== 'string') return;
    try {
      if (msg.type === 'hello' && !greeted) {
        greeted = true;
        session = lobby.resume(session, typeof msg.token === 'string' ? msg.token : undefined, ws);
      }
      lobby.handle(session, msg);
    } catch (err) {
      console.error('message error', err);
    }
  });
  ws.on('close', () => lobby.disconnect(session));
  ws.on('error', () => {});
});

// Simulation loop: rooms keep their own fixed-step accumulators.
setInterval(() => lobby.update(), 20);
setInterval(() => lobby.cleanup(), 5000);

server.listen(PORT, HOST, () => {
  console.log(`\n  ❄  Winterward server running on http://localhost:${PORT}`);
  console.log(`     serving client from ${STATIC_DIR}\n`);
});
