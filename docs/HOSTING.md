# Hosting Winterward for free

Winterward is a single Node.js process: it serves the built web page **and** the WebSocket game
server on one port (`PORT`, default `8787`). Anything that can run a Node 20+ web service with
WebSockets can host it. There is no database and no login; rooms live in memory.

```bash
npm ci
npm run build        # client → dist/client, server → dist/server/main.js
PORT=8787 npm start  # node dist/server/main.js
```

A `Dockerfile` is included for platforms that deploy containers.

> Free tiers change often. The notes below were checked in September 2026 — verify the current
> limits on each provider's pricing page before relying on them.

## Option 1 — Play over your LAN (zero setup)

Run `npm run play` on one machine. Everyone on the same network opens
`http://<that-machine's-IP>:8787` (the host can find the IP with `ipconfig` / `ip addr`).

## Option 2 — Share your own machine with a tunnel (free, no server needed)

Good for a gaming night with friends: your PC runs the server, a tunnel gives it a public HTTPS URL.

- **Cloudflare Tunnel** (`cloudflared`): free, no open ports.
  Quick throwaway URL: `cloudflared tunnel --url http://localhost:8787`.
  With a named tunnel on your own domain, make sure *WebSockets* are enabled for the zone.
- **Tailscale Funnel** or **ngrok** work the same way (ngrok's free plan has request limits).

## Option 3 — A free always-on-ish web service

| Provider | Free offer (Sept 2026) | Notes |
|---|---|---|
| **Render** — Web Service | Free instance, 750 h/month | Sleeps after ~15 min without traffic; the first visitor waits ~1 min for it to wake. Build: `npm ci && npm run build`, start: `npm start`. |
| **Koyeb** | 1 free service (0.1 vCPU, 512 MB), scale-to-zero | Deploy from GitHub or the `Dockerfile`; set the port to `8787`. Sleeps when idle, wakes on demand. |
| **Railway** | Trial credit, then paid | Easiest GitHub deploy; not free long-term. |
| **Fly.io** | No free tier any more | Excellent WebSocket support if you're fine paying a few dollars. |

A game room keeps running only while the server process lives: when a free instance goes to sleep,
games in progress are lost (they only sleep when nobody is connected, so this rarely matters).

## Option 4 — A free VM

- **Oracle Cloud Always Free**: an Arm (Ampere A1) VM — the free limit was reduced to 2 OCPUs /
  12 GB RAM in June 2026, still far more than Winterward needs. Install Node 22, clone the repo,
  `npm ci && npm run build`, run it with `pm2` or a systemd unit, and put it behind Cloudflare Tunnel
  or open port 8787.
- **Google Cloud** `e2-micro` always-free VM (in eligible US regions) also runs it comfortably for
  a handful of rooms.

## Resource usage

One room with 8 players uses roughly 5–15% of one CPU core (the simulation runs at 20 ticks/s)
and sends ~5–40 KB/s to each player. A 0.1 vCPU free instance is fine for a couple of rooms.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | HTTP + WebSocket port |
| `HOST` | `0.0.0.0` | Bind address |
| `WINTERWARD_DEV` | unset | `1` enables testing chat commands (`-gold`, `-wave`, `-speed`, `-lumber`, `-autopilot`). Never enable on a public server. |
