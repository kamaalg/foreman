// ── Foreman · kingdom data ───────────────────────────────────────────────
// Foreman is a kingdom of your projects. Each project is an ESTATE.
//   form  = honest SCALE (hut / cottage / estate) + a light category flavor
//   plaque= the honest identity: a plain "verb + object" of what it does
//   walk  = a walkable README revealed on entering
// plot = [x, z]; +z is toward the sea (south).
window.F = window.F || {};

// Warm Mediterranean daytime palette (single beautiful default).
F.PAL = {
  sky:      0xc3e2e8, horizon: 0xf4e8d2, sun: 0xfff3da,
  sand:     0xe8d2a1, sandDark: 0xd9bd85,
  sea:      0x2bb6ad, seaDeep: 0x149792, foam: 0xeaf7f3,
  cobble:   0xdac9a7, stone: 0xcdb698,
  stucco: [
    { wall: 0xf3e7d0, trim: 0xe2d0af, name: "cream"      },
    { wall: 0xefcaa8, trim: 0xdcab82, name: "apricot"    },
    { wall: 0xe7b088, trim: 0xcf8b60, name: "terracotta" },
    { wall: 0xf0ddc0, trim: 0xd9c3a0, name: "sand"       },
    { wall: 0xdcc7ad, trim: 0xc3ab86, name: "olive"      },
    { wall: 0xf5efe3, trim: 0xe6dcc8, name: "whitewash"  },
  ],
  roofTile: [0xc4663a, 0xb4572f, 0xcd7a4a, 0xbb6038],
  roofFlat: 0xe7d8be, woodDark: 0x6f4a2f,
  shutter:  [0x4f7d72, 0x3f6f8a, 0x7a8a5a, 0x9c6b4a],
  awning:   [0xc96f54, 0x4f7d72, 0xd6a85f, 0x6f8a9c],
  foliageCypress: 0x3c6b46, foliageOlive: 0x8fa46a, foliageDark: 0x2f5638,
  pot: 0xb56a44,
};

// Category flavor → a crest glyph + a one-word "estate type" shown on the plaque.
// kind drives a light rooftop/signage cue on the building (see buildings.js).
F.KINDS = {
  shop:        { glyph: "⌂", word: "Trading House", accent: 0xc96f54 },
  workshop:    { glyph: "⚒", word: "Workshop",      accent: 0xb4572f },
  library:     { glyph: "❧", word: "Library",       accent: 0xc79a4a },
  lab:         { glyph: "✺", word: "Observatory",   accent: 0x4f7d8a },
  garden:      { glyph: "❀", word: "Garden",        accent: 0x7d9460 },
  hall:        { glyph: "⌖", word: "Town Hall",     accent: 0x9c6b4a },
};

// scale tier from dev weight → hut | cottage | estate (form honesty)
F.tier = function (p) {
  const s = p.files * 0.4 + p.commits * 0.5 + p.lines / 700;
  return s > 95 ? "estate" : s > 45 ? "cottage" : "hut";
};

F.PROJECTS = [
  {
    id: "personal_assistant", name: "personal_assistant", lang: "TypeScript", langColor: "#3178c6",
    kind: "workshop", files: 96, commits: 210, lines: 18400, sizeMB: 1.9, branch: "main",
    daysIdle: 0, updated: "today", stars: 1240, deployPort: 3000, plot: [2, -15], stucco: 1, roof: "gable",
    tagline: "Triages your email, calendar and tasks for you.",
    tech: ["TypeScript", "Node", "React", "MCP"],
    features: [
      { t: "Inbox triage", b: "Sorts every message into act / read / later and drafts the replies it can." },
      { t: "Calendar sense", b: "Two-way Google sync; proposes meeting times that actually fit your week." },
      { t: "Task graph", b: "Tracks what depends on what, and quietly clears the small things first." },
    ],
    demo: "A tidy three-pane workspace: inbox on the left, today's plan in the middle, the task graph on the right.",
  },
  {
    id: "harbor_api", name: "harbor-api", lang: "Go", langColor: "#00add8",
    kind: "lab", files: 52, commits: 168, lines: 14900, sizeMB: 1.1, branch: "main",
    daysIdle: 1, updated: "yesterday", stars: 980, deployPort: 8000, plot: [23, 12], stucco: 0, roof: "flat",
    tagline: "Tracks shipments and manifests for the harbor.",
    tech: ["Go", "gRPC", "Postgres"],
    features: [
      { t: "Live manifests", b: "Create, amend and query shipping manifests over gRPC and a REST gateway." },
      { t: "Container tracking", b: "Every move on the dock streams in over the event bus in real time." },
      { t: "Partner webhooks", b: "Outbound hooks keep partner systems in lock-step automatically." },
    ],
    demo: "A live dock board: containers ticking across berths, manifests updating as ships come in.",
  },
  {
    id: "storefront", name: "olive-storefront", lang: "TypeScript", langColor: "#3178c6",
    kind: "shop", files: 64, commits: 130, lines: 11200, sizeMB: 1.3, branch: "main",
    daysIdle: 2, updated: "2 days ago", stars: 540, deployPort: 4321, plot: [-23, 11], stucco: 5, roof: "gable",
    tagline: "Sells a family's olive oil online.",
    tech: ["Astro", "TypeScript", "Stripe"],
    features: [
      { t: "Tasting catalog", b: "Browse the oils by region and intensity, with proper tasting notes." },
      { t: "Three-tap checkout", b: "A short, calm Stripe flow — no account required to buy." },
      { t: "Little admin", b: "The family updates stock and reads orders from one simple page." },
    ],
    demo: "A warm product grid of oil bottles, a tasting-note detail page, and a three-step checkout.",
  },
  {
    id: "ai_interview", name: "AI_Interview", lang: "Python", langColor: "#4b8bbe",
    kind: "lab", files: 38, commits: 52, lines: 6200, sizeMB: 0.7, branch: "main",
    daysIdle: 5, updated: "5 days ago", stars: 312, deployPort: 5173, plot: [-15, -3], stucco: 2, roof: "gable",
    tagline: "Runs you through a mock interview and scores it.",
    tech: ["Python", "FastAPI"],
    features: [
      { t: "Role setup", b: "Paste a job spec; it builds a plan of questions at the right difficulty." },
      { t: "Live interview", b: "Asks one question at a time, listens, and scores each answer against a rubric." },
      { t: "Honest debrief", b: "A clear per-question breakdown with the two things to work on next." },
    ],
    demo: "A focused interview screen — one question, a recording bar, and a rubric score sliding in after.",
  },
  {
    id: "hr_vacation", name: "hr_vacation", lang: "Python", langColor: "#4b8bbe",
    kind: "hall", files: 24, commits: 74, lines: 3100, sizeMB: 0.4, branch: "main",
    daysIdle: 15, updated: "2 weeks ago", stars: 86, deployPort: 8080, plot: [16, -4], stucco: 3, roof: "flat",
    tagline: "Approves and schedules time-off requests.",
    tech: ["Flask", "Python", "Slack"],
    features: [
      { t: "Submit & check", b: "Requests check your balance and flag overlaps before they're sent." },
      { t: "Manager queue", b: "Approve or decline from a tidy list — or right inside Slack." },
      { t: "Team calendar", b: "Everyone can see who's away, so cover is never a surprise." },
    ],
    demo: "A simple request form, an approvals inbox, and a month view of who's out.",
  },
  {
    id: "pipeline", name: "claude-pipeline-demo", lang: "Docs", langColor: "#8a7d6b",
    kind: "library", files: 135, commits: 3, lines: 9200, sizeMB: 2.1, branch: "main",
    daysIdle: 41, updated: "6 weeks ago", stars: 24, deployPort: null, plot: [-3, 9], stucco: 4, roof: "flat",
    tagline: "Documents a four-stage data pipeline.",
    tech: ["Markdown", "Diagrams"],
    features: [
      { t: "The four stages", b: "Ingest → clean → embed → index, each written up with a diagram." },
      { t: "Copy-paste ready", b: "Every snippet runs; the examples are the tests." },
      { t: "Freshly cloned", b: "Almost no history yet — a library still finding its shelves." },
    ],
    demo: "A calm documentation site: an overview page and four stage chapters with flow diagrams.",
  },
  {
    id: "notes_garden", name: "notes-garden", lang: "JavaScript", langColor: "#e6c34a",
    kind: "garden", files: 18, commits: 22, lines: 2400, sizeMB: 0.3, branch: "main",
    daysIdle: 88, updated: "3 months ago", stars: 47, deployPort: null, plot: [9, 8], stucco: 4, roof: "gable",
    tagline: "Keeps your markdown notes linked together.",
    tech: ["Vanilla JS"],
    features: [
      { t: "Plain-text editor", b: "Write in markdown; everything autosaves to your own machine." },
      { t: "Backlinks", b: "Mention a note and it links back — a quiet little web of ideas." },
      { t: "Gone to seed", b: "Untouched for months. The ivy has reached the windows." },
    ],
    demo: "A two-pane notes app: the editor on the left, the backlink web on the right.",
  },
];

// Empty plots a visitor can claim to raise a NEW estate.
F.EMPTY_PLOTS = [
  { id: "plot_a", plot: [-10, 20] },
  { id: "plot_b", plot: [6, 22] },
];
