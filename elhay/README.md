# El-Hay | الحي

A browser-based, Algerian-themed 3D life-sim / open-world game built with Three.js, plain JS (no build step), and an optional Supabase backend for save data.

## Project Overview

Single-player offline mode is fully implemented: open-world driving/walking, a life-sim loop (vitals, economy, relationships, vehicle ownership, licensing/police), a 40-mission story arc, an infinite-pooled NPC crowd, a smartphone UI, and a fictional GTA-style combat/pursuit system.

Multiplayer is **architecture only** — a `NetworkManager` stub in `js/systems.js` (connect/send/onMessage) with no server behind it yet. Selecting "Multiplayer" on the main menu attempts a stub connection and falls back to offline play.

## Directory Structure

```
index.html          Entry point, all DOM overlays (menu, HUD, panels), script includes
css/style.css        All styling: HUD, menus, cutscene overlay, mobile touch UI, phone, weapons
js/ui.js              i18n, settings state, menu/settings/legal, shop & relationship panels
js/world.js           Textures, chunk streaming, landmarks, interiors, vehicles, billboards
js/player.js          Unified PC + mobile input, walk/drive physics, interact logic
js/cutscenes.js       Intro cutscene beats, camera keyframes, subtitles
js/systems.js         Vitals, economy/inventory, relationships, vehicle ownership, police/license,
                      NetworkManager stub
js/missions.js        40-mission story engine, objective tracker, minimap rendering
js/npc.js             Infinite proximity-based NPC object pool + basic interactivity
js/weapons.js         Arsenal, aiming/firing, ammo, police pursuit AI
js/phone.js           Smartphone UI: contacts/chat, camera, video stub, delivery, market, weapon shop
js/persistence.js     Supabase REST client with automatic localStorage fallback
js/main.js            Renderer/scene/camera bootstrap, module wiring, main loop
public/audio/         Drop radio/car music tracks here (.mp3/.ogg)
public/textures/billboards/   Drop billboard ad images here (see Billboards below)
public/models/        Reserved for future GLTF model swaps (not yet wired to a loader)
```

## Running Locally

This is a static site — no build step, no npm install required. Serve the folder over HTTP (opening `index.html` directly as a `file://` URL will break the module/texture loads):

```bash
npx serve .
# or
python3 -m http.server
```

Then open the printed `http://localhost:...` URL in your browser.

## Supabase Configuration (Save/Load)

Save data works out of the box via `localStorage` with **no configuration needed**. To sync saves to a real Supabase project instead:

1. Create a Supabase project.
2. Create a table called `saves`:
   ```sql
   create table saves (
     user_id text primary key,
     data jsonb
   );
   ```
   Enable Row Level Security policies appropriate for your use case (a public demo can allow anon insert/select on this table; a production app should scope rows to an authenticated user).
3. Open `js/ui.js` and fill in:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
   ```
   These mirror the standard `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` naming — note that since this project has **no build tool**, the browser cannot read an actual `.env` file directly; a `.env.example` is included at the project root for reference/documentation, but the real values need to be pasted into `js/ui.js` (or wired through a build step of your own, e.g. Vite, if you add one later).
4. Reload. `js/persistence.js` will automatically start writing to Supabase (`Persistence.save`, called every 20s during gameplay, plus on Continue) while still keeping the `localStorage` copy in sync as an offline fallback.

What's saved: cash, inventory, purchased vehicles, mission progress (1–40), relationship affinities, marital status, driver's license status, vitals, owned weapons/ammo, properties, and last player position.

## Controls

### PC (Keyboard & Mouse)
| Action | Key |
|---|---|
| Move | WASD (or arrow keys, switchable in Settings) |
| Look | Mouse (click to lock pointer) |
| Interact / Enter-Exit car / Enter-Exit building | `E` |
| Sleep / Use bathroom (inside home) | `E` near the bed/toilet |
| Fire weapon | Left click (once pointer is locked) |
| Switch weapon | `1` `2` `3`, or `V` to cycle |
| Reload | `R` |
| Open phone | `P` |
| Open inventory | `I` |
| Toggle minimap | `M` |
| Drive: throttle/brake/steer | `W` `S` `A` `D` (same movement keys, context-sensitive) |

### Mobile (Touch)
Auto-detected via `'ontouchstart' in window`.
- **Bottom-left joystick** — move
- **Right-side drag area** — look
- **E button** — interact
- **🔥 button** — fire (appears only when armed)
- **🔄 button** — cycle weapon
- **Gas / Brake / Steer buttons** — fade in automatically when you enter a vehicle
- **📱 icon** — open phone
- **🎒 icon** — open inventory

## Assets to Place in `public/`

Nothing here is required to run the game — every asset has a generated placeholder (canvas textures, primitive geometry) — but drop in real files to replace them:

- `public/audio/` — radio/car music tracks (not yet wired to an in-car audio player in this build; reserved for a future pass).
- `public/textures/billboards/` — billboard ad images. The billboard system (`js/world.js`) looks for `ad1.jpg`, `ad2.jpg`, `ad3.jpg` (fixed landmark billboards) and `ad_generic.jpg` (per-chunk sidewalk billboards). If a file is missing, a generated placeholder ad texture is shown instead and the load isn't retried.
- `public/models/` — reserved for future GLTF asset swaps; the current build uses primitive/procedural geometry everywhere and has no model loader wired in yet.

## Known Simplifications (read before reporting a "bug")

- Multiplayer is a stub only — no real server, no other players.
- Police pursuit AI uses simple seek-steering, not real pathfinding around buildings.
- Combat has no aim-down-sights zoom, no ragdoll, no gore — numeric health + a short reaction line.
- The smartphone's Video tab and Real Estate perks are visual/data stubs (no gameplay bonus from owning property yet).
- NPC "infinite" spawning is a fixed 22-slot object pool recycled by distance, not unbounded — chosen deliberately for 2GB-RAM safety.
