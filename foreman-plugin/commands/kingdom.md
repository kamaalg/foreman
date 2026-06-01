---
description: Build and open your Foreman kingdom — your projects as a walkable voxel world
allowed-tools: Bash
---
Build and open the user's **Foreman kingdom** — a walkable 3D voxel village where each project they've worked on with Claude becomes an estate (with an honest plaque and a walkable README).

Run it locally — it uses the user's own Claude Code subscription and never sends their source anywhere:

```bash
npx foreman-kingdom
```

This will:
1. Read the projects Claude remembers working on (from local Claude memory), or scan a folder if none.
2. Ask Claude Code to write each project's plaque + features (honest, from the repo).
3. Generate the 3D world and serve it at http://localhost:5173.

To **re-open an already-generated kingdom without re-scanning**, use:

```bash
npx foreman-kingdom serve
```

This serves the already-generated kingdom at http://localhost:5173 immediately (fast, great for iterating on the world).

Then tell the user to open **http://localhost:5173** and walk their kingdom:
- **WASD / arrows** to roam, **drag** to look, **scroll** to zoom
- **E** to tour an estate, **V** for first-person, **M** for the map
