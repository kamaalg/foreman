// Generate js/data.js (F.PROJECTS) from the user's REAL repos.
// Stats come from a file/git scan; the honest plaque + walkable-README content
// (kind, tagline, features, demo, tech) is written by Claude Code reading the
// repo's evidence. Maps each repo onto the designer's tuned plot layout.
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import { execFile, execFileSync } from 'node:child_process';

const HOME = homedir();
const ROOTS = [join(HOME, 'PFH'), join(HOME, 'Documents')].filter(existsSync);
const CLAUDE = existsSync(join(HOME, '.local/bin/claude')) ? join(HOME, '.local/bin/claude') : 'claude';
const IGNORE = new Set(['.git', 'node_modules', 'dist', '.next', 'build', '.turbo', 'venv', '.venv', '__pycache__', 'coverage', '.cache', 'vendor', 'site-packages']);
const KINDS = ['shop', 'workshop', 'library', 'lab', 'garden', 'hall'];
const LCOLOR = { TypeScript: '#3178c6', JavaScript: '#e6c34a', Python: '#4b8bbe', Go: '#00add8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516', Swift: '#f05138', 'C#': '#178600', PHP: '#4f5d95', CSS: '#563d7c', HTML: '#e34c26', Docs: '#8a7d6b', Shell: '#89e051', Other: '#9a8c98' };
const EXT = { '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.rb': 'Ruby', '.swift': 'Swift', '.cs': 'C#', '.php': 'PHP', '.css': 'CSS', '.html': 'HTML', '.md': 'Docs', '.sh': 'Shell' };
// designer-tuned slots: [plot, stucco, roof]
const SLOTS = [[[2,-15],1,'gable'],[[-15,-3],2,'gable'],[[16,-4],3,'flat'],[[-23,11],5,'gable'],[[23,12],0,'flat'],[[-3,9],4,'flat'],[[9,8],4,'gable'],[[-27,-7],1,'gable'],[[27,17],3,'flat']];

function git(cwd, args) { try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', timeout: 4000 }).trim(); } catch { return ''; } }

function findRepos() {
  const repos = new Set();
  const scan = (dir, d) => {
    if (d > 3) return;
    if (existsSync(join(dir, '.git'))) repos.add(dir);
    let e = []; try { e = readdirSync(dir); } catch { return; }
    for (const n of e) { if (IGNORE.has(n) || n.startsWith('.')) continue; const f = join(dir, n); try { if (statSync(f).isDirectory()) scan(f, d + 1); } catch {} }
  };
  for (const r of ROOTS) scan(r, 0);
  const list = [...repos];
  return list.filter((r) => !list.some((o) => o !== r && o.startsWith(r + '/')));
}

// "Connect your Claude": source the kingdom from the projects Claude REMEMBERS
// you working on (~/.claude.json → projects). We read only the project paths +
// a few safe activity fields (last session time, lines, your last prompt) and
// never touch the oauthAccount/token fields. Most-recent first, deduped, capped.
function memProjects() {
  let out = [];
  try {
    const j = JSON.parse(readFileSync(join(HOME, '.claude.json'), 'utf8'));
    const projs = j.projects || {};
    for (const [p, e] of Object.entries(projs)) {
      if (p === HOME || !existsSync(p)) continue;
      try { if (!statSync(p).isDirectory()) continue; } catch { continue; }
      out.push({
        path: p,
        mod: e && e.lastSessionModified ? e.lastSessionModified : null,
        firstPrompt: e && e.lastSessionFirstPrompt ? String(e.lastSessionFirstPrompt).slice(0, 220) : '',
      });
    }
  } catch { return []; }
  out.sort((a, b) => new Date(b.mod || 0) - new Date(a.mod || 0));
  // dedupe near-duplicate basenames ("x", "x 2", "x 3") keeping the most recent
  const seen = new Map();
  for (const r of out) { const k = basename(r.path).replace(/\s+\d+$/, '').toLowerCase(); if (!seen.has(k)) seen.set(k, r); }
  return [...seen.values()].slice(0, SLOTS.length);
}

function scanRepo(dir) {
  const st = { files: 0, bytes: 0, lines: 0, langs: {}, routes: [], topDirs: [] };
  try { st.topDirs = readdirSync(dir).filter((n) => { try { return statSync(join(dir, n)).isDirectory() && !IGNORE.has(n) && !n.startsWith('.'); } catch { return false; } }); } catch {}
  const walk = (d, depth) => {
    if (depth > 6 || st.files > 4000) return;
    let e = []; try { e = readdirSync(d); } catch { return; }
    for (const n of e) {
      if (IGNORE.has(n)) continue;
      const f = join(d, n); let s; try { s = statSync(f); } catch { continue; }
      if (s.isDirectory()) walk(f, depth + 1);
      else if (s.isFile()) {
        st.files++; st.bytes += s.size;
        const lang = EXT[extname(n).toLowerCase()];
        if (lang) { st.langs[lang] = (st.langs[lang] || 0) + 1; if (st.lines < 9e9 && st.files < 1800) { try { st.lines += readFileSync(f, 'utf8').split('\n').length; } catch {} } }
        if (/route|api|view|endpoint|handler|controller/i.test(n)) st.routes.push(n);
      }
    }
  };
  walk(dir, 0);
  return st;
}

function readSnippet(dir) {
  for (const f of ['README.md', 'readme.md', 'CLAUDE.md']) { const p = join(dir, f); if (existsSync(p)) { try { return readFileSync(p, 'utf8').slice(0, 2500); } catch {} } }
  return '';
}
function pkgDesc(dir) {
  try { const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')); return { desc: p.description || '', deps: Object.keys({ ...p.dependencies, ...p.devDependencies }).slice(0, 30) }; } catch {}
  for (const f of ['pyproject.toml', 'requirements.txt']) { const p = join(dir, f); if (existsSync(p)) { try { const t = readFileSync(p, 'utf8'); return { desc: (t.match(/description\s*=\s*["']([^"']+)/) || [])[1] || '', deps: (t.match(/^[a-zA-Z0-9_.-]+/gm) || []).slice(0, 25) }; } catch {} } }
  return { desc: '', deps: [] };
}

function updatedLabel(days) {
  if (days >= 9990) return 'no commits';
  if (days <= 0) return 'today'; if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`; if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

const PROMPT = (ev) => `You write the visitor-facing description of a software project for a charming "village of projects" showcase. Output ONLY a JSON object, no prose, no code fences, matching exactly:
{"kind":"shop|workshop|library|lab|garden|hall","name":"Short display name","tagline":"honest 4-8 word verb+object of what it does for a user","tech":["up to 4 core technologies"],"features":[{"t":"Feature title","b":"one calm sentence"},{"t":"...","b":"..."},{"t":"...","b":"..."}],"demo":"one sentence describing what the running product looks like"}
Rules: derive everything from the EVIDENCE only — never invent facts or marketing fluff. tagline is plain present-tense ("Approves and schedules time-off requests."). kind: shop=sells/storefront/payments, workshop=dev tool/CLI/automation, library=package/docs/SDK, lab=AI/ML/experiment/agent, garden=notes/personal/content, hall=internal/admin/HR/ops. Pick the best single fit. Exactly 3 features. If evidence is thin, stay generic but honest.
EVIDENCE:
${ev}`;

function callClaude(dir, ev) {
  return new Promise((resolve) => {
    execFile(CLAUDE, ['-p', PROMPT(ev)], { cwd: dir, timeout: 120000, maxBuffer: 12 * 1024 * 1024 }, (err, out) => {
      if (err && !out) return resolve(null);
      try { const m = out.match(/\{[\s\S]*\}/); resolve(m ? JSON.parse(m[0]) : null); } catch { resolve(null); }
    });
  });
}

function fallback(name, st) {
  const d = st.langs.Python ? 'lab' : st.routes.length ? 'workshop' : 'library';
  return { kind: d, name, tagline: name.replace(/[-_]/g, ' '), tech: [Object.entries(st.langs).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Code'], features: [{ t: 'Source', b: 'A real project in your kingdom.' }, { t: 'Activity', b: `${st.files} files of work.` }, { t: 'Explore', b: 'Walk in to see more.' }], demo: 'A working project — open the repo to see it.' };
}

async function main() {
  const mem = memProjects();
  const memMap = new Map(mem.map((m) => [m.path, m]));
  const repos = mem.length ? mem.map((m) => m.path) : findRepos();
  console.log(`${mem.length ? 'From your Claude memory' : 'Scanning ~/PFH'}: ${repos.length} projects. Asking Claude Code to describe each…`);
  const projects = [];
  let slot = 0;
  const results = await Promise.all(repos.map(async (dir) => {
    const st = scanRepo(dir);
    if (st.files === 0) return null;
    const m = memMap.get(dir);
    const name = basename(dir);
    const snip = readSnippet(dir);
    const pk = pkgDesc(dir);
    const primaryLang = Object.entries(st.langs).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
    const lastCommit = git(dir, ['log', '-1', '--format=%cs']);
    const commits = Number(git(dir, ['rev-list', '--count', 'HEAD']) || '0');
    const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
    let days;
    if (m && m.mod) days = Math.max(0, Math.round((Date.now() - new Date(m.mod).getTime()) / 864e5));
    else days = lastCommit ? Math.max(0, Math.round((Date.now() - new Date(lastCommit + 'T00:00:00').getTime()) / 864e5)) : 9999;
    const ev = `name: ${name}\nprimary language: ${primaryLang}\ntop dirs: ${st.topDirs.join(', ')}\ndeps: ${pk.deps.join(', ')}\npackage description: ${pk.desc}\nroute/api files: ${[...new Set(st.routes)].slice(0, 12).join(', ')}${m && m.firstPrompt ? `\nwhat you last asked Claude here: ${m.firstPrompt}` : ''}\nREADME:\n${snip || '(none)'}`;
    let desc = await callClaude(dir, ev);
    if (!desc || !KINDS.includes(desc.kind)) { console.log(`  · ${name}: fallback`); desc = { ...fallback(name, st), ...(desc || {}) }; if (!KINDS.includes(desc.kind)) desc.kind = fallback(name, st).kind; }
    else console.log(`  ✓ ${name}: ${desc.kind} — "${desc.tagline}"`);
    return { dir, name, st, primaryLang, commits, branch, days, lastCommit, desc };
  }));

  for (const r of results.filter(Boolean)) {
    if (slot >= SLOTS.length) break; // most-recent projects fill the tuned plots
    const s = SLOTS[slot]; slot++;
    const f = (r.desc.features || []).slice(0, 3);
    while (f.length < 3) f.push({ t: 'More', b: 'Open the repo to explore.' });
    projects.push({
      id: r.name.replace(/[^a-zA-Z0-9_]/g, '_'), name: r.desc.name || r.name,
      lang: r.primaryLang, langColor: LCOLOR[r.primaryLang] || LCOLOR.Other,
      kind: r.desc.kind, files: r.st.files, commits: r.commits, lines: r.st.lines || Math.round(r.st.bytes / 40),
      sizeMB: Number((r.st.bytes / 1e6).toFixed(1)), branch: r.branch, daysIdle: r.days, updated: updatedLabel(r.days),
      stars: 0, deployPort: null, plot: s[0], stucco: s[1], roof: s[2],
      tagline: r.desc.tagline, tech: (r.desc.tech || [r.primaryLang]).slice(0, 4),
      features: f, demo: r.desc.demo || 'A working project in your kingdom.', repoPath: r.dir,
    });
  }

  // The kingdom's owner name (for the central flag). Prefer git (no secrets).
  // ~/.claude.json holds LIVE OAuth credentials — only read it as a last resort,
  // extract only a name/email local-part, and never log or transmit it.
  let owner = '';
  try { owner = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim().split(' ')[0]; } catch {}
  if (!owner) {
    try {
      const j = JSON.parse(readFileSync(join(HOME, '.claude.json'), 'utf8'));
      const email = (j.oauthAccount && j.oauthAccount.emailAddress) || '';
      owner = String(j.displayName || (email ? email.split('@')[0] : '')).trim();
    } catch {}
  }
  if (!owner) owner = 'you';

  // leftover plots become vacant lots a visitor can "claim"
  const empty = [];
  for (let i = slot; i < SLOTS.length; i++) empty.push({ id: `plot_${i}`, plot: SLOTS[i][0] });

  const header = readFileSync(join(process.cwd(), 'js', 'data.sample.js'), 'utf8').split('F.PROJECTS')[0];
  const out = `${header}F.PROJECTS = ${JSON.stringify(projects, null, 2)};\n\nF.EMPTY_PLOTS = ${JSON.stringify(empty)};\n\nF.OWNER = ${JSON.stringify(owner)};\n`;
  writeFileSync(join(process.cwd(), 'js', 'data.js'), out);
  console.log(`\nWrote js/data.js with ${projects.length} estates from ${mem.length ? 'your Claude memory' : '~/PFH'}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
