# Foreman — Claude Code plugin

Turn the projects you build with Claude into a **walkable voxel kingdom**. Each repo becomes an estate with an honest plaque and a walkable README. Runs locally on your own Claude Code; your source never leaves your machine.

## Install

```
/plugin marketplace add kamaalg/foreman
/plugin install foreman@foreman-kingdom
```

Then use:
- `/foreman:kingdom` — build and open your kingdom
- or just ask Claude: *"build my kingdom"* (the `foreman` skill handles it)

Under the hood it runs `npx foreman`, which reads the projects Claude remembers, asks Claude Code to write each project's plaque, generates a three.js world, and serves it at http://localhost:5173.

## Privacy
Only project paths and a few safe activity fields are read from local Claude memory — never auth tokens. Source code never leaves your machine; only generated plaques/features are written, and only published if you run `foreman publish`.
