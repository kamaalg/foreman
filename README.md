# Foreman

> Turn the projects you build with Claude into a **walkable voxel kingdom** — each repo becomes an estate with an honest plaque and a walkable README.

Foreman runs entirely on your machine. Inference uses your local Claude Code subscription via `claude -p` — no API key needed, your source never leaves your machine.

---

## Quick start

```bash
npx foreman-kingdom
```

Then open **http://localhost:5173** and walk your kingdom.

### Controls

| Key / gesture | Action |
|---|---|
| `W A S D` / arrow keys | Walk |
| Click + drag | Look around |
| Scroll | Zoom |
| `E` (near a building) | Enter — read the estate plaque + README |
| `V` | Toggle first-person view |
| `M` | Toggle minimap |
| `Esc` | Leave the estate |

---

## What it does

Foreman reads the projects Claude remembers working on (from local Claude memory), then:

1. Asks Claude Code to write each project's **honest plaque** (a plain "verb + object" of what it does) and feature list — directly from the repo.
2. Generates a **Mediterranean voxel village** — one building per project, sized and shaped by real git stats (files, commits, lines of code).
3. Serves it locally at `http://localhost:5173`.

Every visual maps to a real signal: a big building = a lot of code/commits, a lit beacon = active work, the plaque = what it honestly does.

---

## Claude Code plugin

Foreman ships a Claude Code plugin that adds a `/foreman:kingdom` command and a `foreman` skill (so you can just ask *"build my kingdom"*).

Install via the Claude Code plugin marketplace (once listed):

```
/plugin install foreman
```

Or manually: clone this repo and run `/plugin install <path-to-foreman-plugin>`.

---

## CLI commands

| Command | What it does |
|---|---|
| `foreman` / `npx foreman-kingdom` | Scan projects, generate plaques, serve the kingdom |
| `foreman serve` | Serve the already-generated kingdom (fast, no re-scan) |
| `foreman build` | Generate `js/data.js` without serving |

---

## First run with sample data

If you haven't generated your own kingdom yet, Foreman ships with `js/data.js` pre-populated with sample projects (`harbor_api`, `olive-storefront`, etc.) so the world loads immediately. Run `foreman` once to replace it with your real projects.

---

## Privacy

- Only project paths and safe activity fields (file count, commit count, language) are read from local Claude memory.
- Auth tokens and source code are never read or transmitted.
- Everything stays on your machine.

---

## License

MIT — see [LICENSE](LICENSE).
