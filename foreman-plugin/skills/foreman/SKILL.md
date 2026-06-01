---
name: foreman
description: Use when the user wants to SEE, VISUALIZE, or SHOW OFF their projects as a walkable 3D "kingdom" or "village" — turns the repos they've built with Claude into a voxel world where each project is an estate with an honest plaque and a walkable README. Triggers on "build my kingdom", "show my projects as a world/village", "visualize my repos", "foreman".
---

# Foreman — your projects as a walkable kingdom

Foreman turns the projects a user has worked on with Claude into a calm, sandy 3D voxel **kingdom**: each project becomes an **estate** whose size reflects how much it's been built, with an honest one-line **plaque** of what it does, and a **walkable README** inside. It's a showcase you can walk and share — not a coding tool.

## How to run it

It runs entirely on the user's machine and uses **their own Claude Code subscription** (via `claude -p`) — no API key, and their source never leaves the machine.

```bash
npx foreman-kingdom        # regenerate estates from Claude memory first, then serve
npx foreman-kingdom serve  # serve the already-generated kingdom immediately — fast, for iterating
```

Prefer **`npx foreman-kingdom serve`** when you just want to open the existing kingdom quickly. Use **`npx foreman-kingdom`** (no arg) when you want to pull in new projects or refresh the plaques.

After it serves, tell the user to open **http://localhost:5173** and explore:
- **WASD / arrows** roam · **drag** look · **scroll** zoom
- **E** to tour an estate (its walkable README) · **V** first-person · **M** map

## Notes
- Requires **Claude Code** installed (`claude` on PATH — https://claude.com/code). Foreman uses `claude -p` to describe each project; if `claude` isn't found it prints an install hint and stops.
- The kingdom is sourced from the projects Claude remembers (local Claude memory); only project paths and safe activity fields are read, never auth tokens.
- It's honest: every plaque/feature is derived from the real repo.
