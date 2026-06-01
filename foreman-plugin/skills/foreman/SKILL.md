---
name: foreman
description: Use when the user wants to SEE, VISUALIZE, or SHOW OFF their projects as a walkable 3D "kingdom" or "village" — turns the repos they've built with Claude into a voxel world where each project is an estate with an honest plaque and a walkable README. Triggers on "build my kingdom", "show my projects as a world/village", "visualize my repos", "foreman".
---

# Foreman — your projects as a walkable kingdom

Foreman turns the projects a user has worked on with Claude into a calm, sandy 3D voxel **kingdom**: each project becomes an **estate** whose size reflects how much it's been built, with an honest one-line **plaque** of what it does, and a **walkable README** inside. It's a showcase you can walk and share — not a coding tool.

## How to run it

It runs entirely on the user's machine and uses **their own Claude Code subscription** (via `claude -p`) — no API key, and their source never leaves the machine.

```bash
foreman serve      # serve the already-generated kingdom immediately — fast, for iterating
foreman            # regenerate estates from Claude memory first, then serve
foreman generate   # (re)generate estates only
foreman publish    # share it as a public URL (GitHub Pages)
```

Prefer **`foreman serve`** when you just want to open the existing kingdom quickly. Use **`foreman`** (no arg) when you want to pull in new projects or refresh the plaques.

> **Note:** The published distribution will use `npx foreman` once the package is on npm. For now the global `foreman` command is installed locally via `npm link`.

After it serves, tell the user to open **http://localhost:5173** and explore:
- **WASD / arrows** roam · **drag** look · **scroll** zoom
- **E** to tour an estate (its walkable README) · **V** first-person · **M** map

## Notes
- If `claude` isn't on PATH, Foreman prints an install hint (https://claude.com/code) and stops — it needs Claude Code to describe each project.
- The kingdom is sourced from the projects Claude remembers (local Claude memory); only project paths and safe activity fields are read, never auth tokens.
- It's honest: every plaque/feature is derived from the real repo.
