# ❄ Winterward

**A co-op maze tower defense for the browser, in the spirit of the Warcraft III map *Wintermaul*.**
Up to 8 players, no login, 12 races and 96 towers, 40 waves and a final boss. Build a maze on an open
snowfield — whatever slips through your maze runs straight into your neighbour's.

![Gameplay](docs/images/gameplay.png)

## Play it locally

Requirements: **Node.js 20+** (22 recommended).

```bash
git clone https://github.com/StefanJonsson96/wintermaul.git
cd wintermaul
npm install
npm run play          # builds everything and starts the server
```

Open **http://localhost:8787**. Press **Quick play** (or create a private room) and add a few bots
if you are alone. To play with friends on the same network, they open `http://<your-ip>:8787`
and join with your 4-letter room code (or the invite link from the lobby).

Development mode with hot reload (client on port 5173, proxied to the server on 8787):

```bash
npm run dev           # then open http://localhost:5173
```

## How to play

1. **Pick the rules.** When the game starts, the first player (Red, like in the classic) has
   30 seconds to choose the difficulty, race mode and whether the game is endless.
2. **Pick a race** with your lumber (or go *Random* for bonus gold — `-random` works in chat too).
3. **Maze.** Creeps walk from the portal on the left to the gate on the right using the shortest
   path. Every tower is also a wall. Plug the gaps between the ancient pillars to bend the path
   cheaply, then build full walls to make a long serpentine. You can never fully block the path.
4. **Keep building** with every bounty during the first waves, then **upgrade in place** (two
   branches per tower, tier 1 → 4) and save for big towers.
5. **Leaks are shared.** A creep that reaches your gate costs the team lives and runs into the next
   player's lane with the health it has left. Kill your neighbour's leaks for their bounty — or help
   them with a gold gift (right-click them in the scoreboard).
6. You get more lumber after waves 10 and 25: a second race, a third, or a **Legend** tower.
   Survive 40 waves and the Winter Tyrant.

| Control | Action |
|---|---|
| Left click | Select a tower / place a tower (hold **Shift** to keep placing) |
| Drag / double-click | Box-select / select all towers of that type on screen |
| Q W E R T Y | Build buttons — or upgrade branches when towers are selected |
| X / Delete | Sell selected towers |
| Right click / Esc | Cancel placement / deselect |
| Wheel, arrows, right- or middle-drag | Zoom and move the camera |
| Space | Jump back to your lane |
| G | Ready / call the next wave early |
| Alt + click | Ping the map for your team |
| Enter | Chat (`-random`, `-ready`, `-help`) |

![Races](docs/images/races.png)

## What's inside

- **Research-based design.** The rules come from the original map's own script and data (lives,
  level bonus, lumber, leak flow, anti-block, the difficulty dialog…) plus Wintermaul One's lane
  rotation. See [docs/RESEARCH.md](docs/RESEARCH.md) and [docs/DESIGN.md](docs/DESIGN.md).
- **Authoritative multiplayer**: Node + WebSocket server simulating at 20 Hz, 10 Hz snapshots,
  client-side interpolation, reconnect-by-token, spectators, lobby with public/private rooms.
- **All art is procedural** (canvas drawing code — towers, creatures, terrain, emblems) and all sound
  is synthesized with WebAudio. No third-party assets.
- TypeScript everywhere; the simulation is shared by the server, the client (placement preview),
  the bots and the headless balance runner.

```
src/shared/   rules, data (races, towers, waves), pathfinding grid, simulation, bots, protocol
src/server/   HTTP + WebSocket server, rooms and lobby
src/client/   UI (menu, lobby, HUD), renderer, procedural art, effects, audio
scripts/      balance runner and Playwright test/screenshot scripts
tests/        unit tests (vitest)
docs/         research notes, design, hosting guide
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run play` | Build and start (production) on port 8787 |
| `npm run dev` | Server + Vite dev server with hot reload |
| `npm test` | Unit tests for the rules and simulation |
| `npm run typecheck` | TypeScript check |
| `npm run balance -- --players 2 --games 6` | Headless bot games for balancing |
| `WINTERWARD_DEV=1 npm start` | Enables testing chat commands: `-gold 5000`, `-wave 20`, `-speed 4`, `-lumber 1` |

## Hosting

See **[docs/HOSTING.md](docs/HOSTING.md)** for free options (LAN, Cloudflare Tunnel, Render,
Koyeb, Oracle Cloud free VM) and a Dockerfile.

## Credits

Inspired by *Wintermaul* by dukewintermaul and the many Wintermaul versions that followed
(Wintermaul One, Revamped, Revolution). Winterward is an independent fan project with original
names, art and code; it contains no Warcraft III assets.
