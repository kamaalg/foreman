#!/usr/bin/env node
// Foreman CLI — turn your git repos into a walkable voxel kingdom.
// Runs entirely on your machine. Inference uses YOUR local Claude Code
// subscription via `claude -p` (no API key, no token paste); your source
// never leaves the machine. See docs/foreman/connector/00-PLAN.md.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cmd = (process.argv[2] || 'up').replace(/^-+/, '');

function run(file, args = []) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, [join(ROOT, file), ...args], { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${file} exited with ${c}`))));
  });
}

function claudeOnPath() {
  for (const bin of ['claude', join(homedir(), '.local/bin/claude')]) {
    try { execFileSync(bin, ['--version'], { stdio: 'ignore' }); return true; } catch { /* try next */ }
  }
  return false;
}

function ensureClaude() {
  if (claudeOnPath()) return true;
  console.error(
    '\n  Foreman needs Claude Code installed (it generates each estate on YOUR subscription).\n' +
    '  Install it:  https://claude.com/code\n' +
    '  Then run `foreman` again.\n',
  );
  process.exit(1);
}

function help() {
  console.log(`
  👑  foreman — your git repos as a walkable voxel kingdom

  Usage:
    foreman              generate your kingdom, then open it (default)
    foreman generate     (re)generate estates from your repos via Claude Code
    foreman serve        serve the existing kingdom at http://localhost:5173
    foreman publish      share it as a public URL (GitHub Pages)  [coming in v1]
    foreman help         show this

  It runs locally on your own Claude Code subscription. Your source never leaves
  your machine — only the generated plaques/features are written.
`);
}

function publishStub() {
  console.log(`
  📡  Publishing is the next milestone (docs/foreman/connector/00-PLAN.md, Step 3).
      It will copy your kingdom to a 'gh-pages' branch via the GitHub 'gh' CLI and
      print a shareable https://<you>.github.io/foreman-kingdom URL.
      For now: 'foreman serve' runs it locally at http://localhost:5173.
`);
}

async function main() {
  if (cmd === 'help' || cmd === 'h') return help();
  if (cmd === 'serve') return run('scripts/serve.mjs');
  if (cmd === 'publish') return publishStub();
  if (cmd === 'generate' || cmd === 'gen') { ensureClaude(); return run('scripts/build-kingdom.mjs'); }
  // default: generate then serve
  ensureClaude();
  await run('scripts/build-kingdom.mjs');
  console.log('\n  👑  Kingdom built. Opening it… (share later with `foreman publish`)\n');
  await run('scripts/serve.mjs');
}

main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });

void existsSync; // reserved for future config checks
