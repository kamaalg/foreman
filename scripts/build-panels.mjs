// Generate js/panels.js — per-project Canvas2D animation functions authored by Claude.
// Usage: node scripts/build-panels.mjs
// Output: js/panels.js  +  js/panels/manifest.json (cache)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';

const HOME = homedir();
const CWD = process.cwd();
const PANELS_DIR = join(CWD, 'js', 'panels');
const MANIFEST_PATH = join(PANELS_DIR, 'manifest.json');
const OUT_PATH = join(CWD, 'js', 'panels.js');

// Bump this whenever the authoring prompt changes so all projects regenerate.
const PROMPT_VERSION = 2;

// Resolve local claude binary (same as build-kingdom.mjs)
const CLAUDE = existsSync(join(HOME, '.local/bin/claude')) ? join(HOME, '.local/bin/claude') : 'claude';

// ── Load F.PROJECTS from js/data.js ──────────────────────────────────────────
function loadProjects() {
  const dataPath = join(CWD, 'js', 'data.js');
  if (!existsSync(dataPath)) { console.error('js/data.js not found — run `node scripts/build-kingdom.mjs` first'); process.exit(1); }
  const src = readFileSync(dataPath, 'utf8');
  const F = {};
  try {
    // Stub the global so data.js's `window.F = window.F || {}` works
    const g = { F };
    new Function('window', 'F', src + '\nwindow.F = F;')(g, F);
  } catch (e) {
    console.error('Failed to eval js/data.js:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(F.PROJECTS) || F.PROJECTS.length === 0) {
    console.error('F.PROJECTS is empty or not an array after eval');
    process.exit(1);
  }
  return F.PROJECTS;
}

// ── Project content hash (cache key) ─────────────────────────────────────────
function projectHash(p) {
  const feats = (p.features || []).map(f => (f.t || '') + '|' + (f.b || '')).join(';;');
  const tech = (p.tech || []).join(',');
  // Include PROMPT_VERSION so any prompt change forces a full regeneration.
  const raw = [String(PROMPT_VERSION), p.name, p.tagline, feats, tech, String(p.commits), String(p.files)].join('\n');
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

// ── Claude prompt ─────────────────────────────────────────────────────────────
function buildPrompt(p) {
  const feats = (p.features || []).slice(0, 3);
  while (feats.length < 3) feats.push({ t: 'Project', b: 'A real project in your kingdom.' });
  const techList = (p.tech || []).join(', ') || 'code';
  const isThin = feats.every(f => !f.b || f.b.includes('real project') || f.b.includes('Open the repo'));

  // anim0: the all-important "what this does" overview — derive the right metaphor from project kind/tagline
  const kindLower = (p.kind || '').toLowerCase();
  let overviewHint;
  if (kindLower.includes('hr') || kindLower.includes('approval') || kindLower.includes('workflow')) {
    overviewHint = 'Show a request card moving left→right through approver stages and arriving stamped "Approved ✓".';
  } else if (kindLower.includes('chat') || kindLower.includes('ai') || kindLower.includes('assistant') || p.tagline.toLowerCase().includes('ai') || p.tagline.toLowerCase().includes('chat')) {
    overviewHint = 'Show a question bubble appearing on the left, a thinking indicator (dots), then a helpful answer forming on the right.';
  } else if (kindLower.includes('store') || kindLower.includes('shop') || kindLower.includes('commerce') || p.tagline.toLowerCase().includes('store') || p.tagline.toLowerCase().includes('shop')) {
    overviewHint = 'Show a product being picked, moving into a cart, then a "Sold ✓" badge appearing.';
  } else if (kindLower.includes('analytics') || kindLower.includes('dashboard') || p.tagline.toLowerCase().includes('analytics') || p.tagline.toLowerCase().includes('dashboard')) {
    overviewHint = 'Show raw data points on the left flowing/transforming into clean bar charts or a KPI number on the right.';
  } else if (kindLower.includes('tool') || kindLower.includes('cli') || kindLower.includes('dev') || p.tagline.toLowerCase().includes('tool')) {
    overviewHint = 'Show input text/code entering on the left, a processing step (gears or progress bar), and transformed output emerging on the right.';
  } else {
    overviewHint = `Show the end-to-end value: the problem or input on the left, some visible transformation in the middle, and the solved/delivered outcome on the right. Use the project name "${p.name}" and tagline "${p.tagline}" to decide what the input and outcome look like.`;
  }

  const f1desc = isThin
    ? 'Depict a developer terminal: lines of code scrolling, a blinking cursor, a file tree appearing on the left.'
    : `Depict the BEHAVIOR of: "${feats[0].t}" — ${feats[0].b}. Render a tiny moving UI (not particles): show the actual interaction — e.g. items appearing, approvals ticking, a list updating.`;
  const f2desc = isThin
    ? 'Depict a file tree expanding: folder nodes opening, files appearing one by one with indentation levels.'
    : `Depict the BEHAVIOR of: "${feats[1].t}" — ${feats[1].b}. Render a tiny moving UI showing the actual operation.`;

  return `You author Canvas 2D animation function BODIES for a Three.js estate interior wall display.
Project: "${p.name}" — ${p.tagline}
Kind: ${p.kind || 'software'}
Tech stack: ${techList}
Stats: ${p.commits} commits, ${p.files} files

Return ONLY a JSON object — no prose, no markdown fences, no explanation. Exactly this shape:
{"anim0":"<body>","anim1":"<body>","anim2":"<body>","anim3":"<body>","anim4":"<body>","anim5":"<body>"}

Each value is the JS BODY of a function with params (ctx, W, H, t, accent).
Rules for every body:
- Canvas2D only. No DOM, no window, no document, no fetch, no require, no import, no eval.
- Must fill/clear its own background on every call (start with ctx.fillRect or ctx.clearRect).
- Must visibly animate using t (seconds, float). Use Math.sin/cos/floor for motion.
- Use accent (a hex integer like 0x4f8a9c) for theme color. Convert with: "#"+accent.toString(16).padStart(6,"0")
- No allocation-heavy per-frame work (no large array creation per frame).
- Each body must be > 150 characters.
- NO arrow functions at the top level — write as regular function body statements only.
- Depict honestly from real project data — never invent a fake product screen unrelated to the project.
- For thin/missing features, depict the developer experience instead: a terminal, a file-tree, or a commit graph.

The 6 panels:

anim0 — *** THIS IS THE MOST IMPORTANT PANEL. *** It is the FIRST thing a visitor sees and must communicate the project's CORE PURPOSE at a glance, in ~2 seconds, WITHOUT text labels explaining it — SHOW the goal through motion. ${overviewHint} The animation must be clear and readable: use large, bold shapes; left-to-right flow; avoid clutter. The visitor must understand "oh, THIS is what this project does" without reading anything.

anim1 — PRIMARY CAPABILITY in action: ${f1desc}

anim2 — SECOND FEATURE in action: ${f2desc}

anim3 — Tech-stack panel: animate the tech array [${techList}] as labeled rectangular chips that appear one by one (staggered by t) and fill with the accent color. Show each tech name as text inside its chip. Chips should gently pulse.

anim4 — Activity panel: show ${p.commits} commits and ${p.files} files as growing bar graphs or animated counters that sweep up from zero and hold, then reset. Label each bar. Use the accent color.

anim5 — Mood / signature loop for "${p.kind}" kind: a calm, looping abstract that evokes the project's mood using the accent color — gentle orbiting dots, slow waveforms, or a grid of pulses. This panel is intentionally abstract.`;
}

// ── Validate a generated body ─────────────────────────────────────────────────
function validateBody(body) {
  if (typeof body !== 'string') return false;
  if (body.length < 150) return false;
  // Must contain a ctx. call or a 2d-context method
  if (!/ctx\./.test(body)) return false;
  // Must not contain forbidden APIs
  if (/\bimport\b|\brequire\b|\bfetch\b|\bdocument\b|\bwindow\b|\beval\b/.test(body)) return false;
  // Must parse without error
  try { new Function('ctx', 'W', 'H', 't', 'accent', body); } catch (e) { return false; }
  return true;
}

// ── Call claude -p ────────────────────────────────────────────────────────────
function callClaude(prompt, cwd) {
  return new Promise((resolve) => {
    execFile(CLAUDE, ['-p', prompt], {
      cwd,
      timeout: 180000,
      maxBuffer: 16 * 1024 * 1024,
    }, (err, out) => {
      if (err && !out) { console.error('  claude error:', err.message); return resolve(null); }
      resolve(out || null);
    });
  });
}

// ── Parse JSON from Claude output (extract first {...} block) ─────────────────
function parseOutput(raw) {
  if (!raw) return null;
  // Find the first { and last } to extract JSON block
  const start = raw.indexOf('{');
  if (start === -1) return null;
  // Walk to find the matching closing brace
  let depth = 0, end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const projects = loadProjects();
  console.log(`build-panels: ${projects.length} projects loaded from js/data.js`);

  // Load manifest (cache)
  if (!existsSync(PANELS_DIR)) mkdirSync(PANELS_DIR, { recursive: true });
  let manifest = {};
  if (existsSync(MANIFEST_PATH)) {
    try { manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')); } catch {}
  }

  // Load existing panels.js to check which projects already have valid entries
  let existingPanels = {};
  if (existsSync(OUT_PATH)) {
    // Parse out existing __panels entries from the JS (simple regex approach)
    const existing = readFileSync(OUT_PATH, 'utf8');
    const idMatches = existing.matchAll(/window\.__panels\["([^"]+)"\]/g);
    for (const m of idMatches) existingPanels[m[1]] = true;
  }

  const CONCURRENCY = 3;
  const results = {}; // id -> { anim0..anim5: validatedBody or null }
  const summaries = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < projects.length; i += CONCURRENCY) {
    const batch = projects.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (p) => {
      const hash = projectHash(p);
      const cacheEntry = manifest[p.id];

      // Cache hit: skip if hash matches and project already in panels.js
      if (cacheEntry && cacheEntry.hash === hash && existingPanels[p.id]) {
        console.log(`  ✓ ${p.id}: cached (${cacheEntry.valid || 0}/6 valid)`);
        // Mark as needing re-read from existing file — we'll preserve entries
        results[p.id] = { _cached: true, _hash: hash, _valid: cacheEntry.valid || 0 };
        return;
      }

      console.log(`  → ${p.id}: calling claude…`);
      const prompt = buildPrompt(p);
      const raw = await callClaude(prompt, CWD);
      if (!raw) {
        console.log(`  ✗ ${p.id}: no output from claude (all 6 fall back to VIS)`);
        results[p.id] = {};
        summaries.push({ id: p.id, valid: 0, total: 6 });
        manifest[p.id] = { hash, valid: 0 };
        return;
      }

      const parsed = parseOutput(raw);
      if (!parsed) {
        console.log(`  ✗ ${p.id}: failed to parse JSON from claude output`);
        results[p.id] = {};
        summaries.push({ id: p.id, valid: 0, total: 6 });
        manifest[p.id] = { hash, valid: 0 };
        return;
      }

      // Validate each of the 6 bodies
      const validated = {};
      let validCount = 0;
      for (let slot = 0; slot < 6; slot++) {
        const key = 'anim' + slot;
        const body = parsed[key];
        if (validateBody(body)) {
          validated[key] = body;
          validCount++;
        } else {
          console.log(`    slot ${slot} invalid for ${p.id}${body ? ': ' + (body.length < 150 ? 'too short' : !/ctx\./.test(body) ? 'no ctx.' : 'failed validation') : ': missing'}`);
        }
      }

      console.log(`  ✓ ${p.id}: ${validCount}/6 valid panels`);
      results[p.id] = validated;
      summaries.push({ id: p.id, valid: validCount, total: 6 });
      manifest[p.id] = { hash, valid: validCount };
    }));
  }

  // Build panels.js — if cached, re-use its existing bodies from the old file
  // Strategy: collect all bodies we want to write, then write the full file

  // For cached projects, extract their existing function bodies from the old panels.js
  let oldPanelsJs = '';
  if (existsSync(OUT_PATH)) oldPanelsJs = readFileSync(OUT_PATH, 'utf8');

  let output = 'window.__panels = window.__panels || {};\n';

  for (const p of projects) {
    const r = results[p.id];
    if (!r) continue; // shouldn't happen

    if (r._cached) {
      // Re-emit the cached project's block from the old file
      // Find its block: window.__panels["<id>"] = { ... };
      const blockStart = oldPanelsJs.indexOf(`window.__panels["${p.id}"]`);
      if (blockStart !== -1) {
        // Find the end of this block (next window.__panels or end of file)
        let blockEnd = oldPanelsJs.indexOf('\nwindow.__panels["', blockStart + 1);
        if (blockEnd === -1) blockEnd = oldPanelsJs.length;
        output += oldPanelsJs.slice(blockStart, blockEnd).trimEnd() + '\n';
        continue;
      }
      // Fallback: no cached block found, skip (VIS fallback covers it)
      continue;
    }

    const slots = Object.keys(r).filter(k => k.startsWith('anim'));
    if (slots.length === 0) continue;

    output += `window.__panels["${p.id}"] = {\n`;
    for (const key of slots) {
      // Escape the body for embedding: wrap as function expression
      // Replace any backtick/backslash issues — embed as regular function string
      const body = r[key];
      output += `  ${key}: function(ctx,W,H,t,accent){\n${body}\n  },\n`;
    }
    output += '};\n';
  }

  writeFileSync(OUT_PATH, output);
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Summary
  console.log('\n── Panel generation summary ──────────────────────────────');
  for (const s of summaries) {
    console.log(`  ${s.id}: ${s.valid}/${s.total} valid${s.valid === 0 ? ' (all fall back to VIS)' : ''}`);
  }
  const cached = projects.filter(p => results[p.id] && results[p.id]._cached);
  if (cached.length) {
    console.log(`  (${cached.length} project(s) used cache: ${cached.map(p => p.id).join(', ')})`);
  }
  console.log(`\nWrote js/panels.js (${output.length} bytes) + js/panels/manifest.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
