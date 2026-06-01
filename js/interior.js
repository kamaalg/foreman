// ── Foreman · first-person interior tour (the walkable README, in 3D) ─────
// Each estate opens into a grand, colourful hall you walk in first-person.
// Every feature is its own colour-flooded chamber whose wall is an ANIMATED
// panel (drifting motes + a pulsing icon + the real text). Villagers stroll
// the hall and birds wheel under the ceiling, so it feels alive.
window.F = window.F || {};
(function () {
  const T = () => window.THREE;
  const IB = { x: 1000, z: 0 };
  const W = 11, H = 6;
  let scene = null, group = null, bounds = null, anims = [], npcs = [], birds = [], lastDraw = 0;
  // meshes that get slowly spun in update() — used by the star monument
  let spinners = [];

  function hex(n) { return "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6); }
  function shade(n, amt) { const TH = T(); const c = new TH.Color(n); const t = amt < 0 ? 0 : 1; c.lerp(new TH.Color(t, t, t), Math.abs(amt)); return "#" + c.getHexString(); }
  function tint(base, to, k) { const TH = T(); return new TH.Color(base).lerp(new TH.Color(to), k).getHex(); }
  function wrap(x, text, cx, cy, maxW, lh, max) { const ws = String(text || "").split(" "); let line = "", y = cy, n = 0; for (const w of ws) { const t = line + w + " "; if (x.measureText(t).width > maxW && line) { x.fillText(line.trim(), cx, y); line = w + " "; y += lh; if (++n >= (max || 9)) return; } else line = t; } x.fillText(line.trim(), cx, y); }
  function tex2(c) { const TH = T(); const t = new TH.CanvasTexture(c); t.anisotropy = 8; if (TH.SRGBColorSpace) t.colorSpace = TH.SRGBColorSpace; return t; }
  function newCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  function icon(x, cx, cy, s, key, color) {
    const k = (key || "").toLowerCase(); x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = s * 0.07; x.lineCap = "round"; x.lineJoin = "round";
    const box = (w, h) => { x.beginPath(); x.rect(cx - w / 2, cy - h / 2, w, h); x.stroke(); };
    if (/mail|inbox|email|message|reply|send|notif/.test(k)) { box(s, s * 0.7); x.beginPath(); x.moveTo(cx - s / 2, cy - s * 0.35); x.lineTo(cx, cy + s * 0.05); x.lineTo(cx + s / 2, cy - s * 0.35); x.stroke(); }
    else if (/calendar|schedul|time|meet|date|day|week/.test(k)) { box(s, s); x.beginPath(); x.moveTo(cx - s / 2, cy - s * 0.28); x.lineTo(cx + s / 2, cy - s * 0.28); x.stroke(); for (let i = 0; i < 3; i++)for (let j = 0; j < 2; j++) x.fillRect(cx - s * 0.3 + i * s * 0.28, cy + j * s * 0.22, s * 0.12, s * 0.12); }
    else if (/chat|talk|conversation|support|bubble|ask|answer/.test(k)) { x.beginPath(); x.moveTo(cx - s / 2, cy - s * 0.35); x.arcTo(cx + s / 2, cy - s * 0.35, cx + s / 2, cy + s * 0.15, s * 0.2); x.arcTo(cx + s / 2, cy + s * 0.25, cx - s * 0.2, cy + s * 0.25, s * 0.2); x.lineTo(cx - s * 0.25, cy + s * 0.45); x.lineTo(cx - s * 0.18, cy + s * 0.25); x.arcTo(cx - s / 2, cy + s * 0.25, cx - s / 2, cy - s * 0.35, s * 0.2); x.stroke(); }
    else if (/data|pipeline|sync|flow|stream|process|stage|ingest|track|event|ci|cd|build|deploy/.test(k)) { for (let i = -1; i <= 1; i++) { const yy = cy + i * s * 0.3; x.beginPath(); x.moveTo(cx - s / 2, yy); x.lineTo(cx + s * 0.25, yy); x.lineTo(cx + s * 0.1, yy - s * 0.12); x.moveTo(cx + s * 0.25, yy); x.lineTo(cx + s * 0.1, yy + s * 0.12); x.stroke(); } }
    else if (/auth|login|password|secur|token|access|key|guard|permission/.test(k)) { x.beginPath(); x.arc(cx - s * 0.15, cy - s * 0.1, s * 0.22, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - s * 0.02, cy + s * 0.02); x.lineTo(cx + s * 0.4, cy + s * 0.4); x.moveTo(cx + s * 0.28, cy + s * 0.28); x.lineTo(cx + s * 0.42, cy + s * 0.18); x.stroke(); }
    else if (/search|browse|find|query|recon|select|scout|review|diff/.test(k)) { x.beginPath(); x.arc(cx - s * 0.12, cy - s * 0.12, s * 0.28, 0, 7); x.moveTo(cx + s * 0.1, cy + s * 0.1); x.lineTo(cx + s * 0.42, cy + s * 0.42); x.stroke(); }
    else if (/task|todo|list|approv|queue|check|valid|interview|score|test|rubric|brief/.test(k)) { box(s * 0.8, s); for (let i = 0; i < 3; i++) { const y = cy - s * 0.3 + i * s * 0.3; x.beginPath(); x.moveTo(cx - s * 0.28, y); x.lineTo(cx - s * 0.18, y + s * 0.08); x.lineTo(cx, y - s * 0.08); x.moveTo(cx + s * 0.08, y); x.lineTo(cx + s * 0.3, y); x.stroke(); } }
    else if (/pay|checkout|order|cart|price|book|sell|stripe|fund/.test(k)) { x.beginPath(); x.arc(cx, cy, s * 0.4, 0, 7); x.stroke(); x.font = `bold ${s * 0.5}px Georgia`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("$", cx, cy + s * 0.02); }
    else { x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; x[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45); } x.closePath(); x.stroke(); }
    x.restore();
  }

  // animated panel: drifting motes + pulsing icon + text on a vivid accent bg
  function drawPanel(x, Wd, Ht, t, o) {
    const g = x.createLinearGradient(0, 0, 0, Ht); g.addColorStop(0, shade(o.accent, -0.28)); g.addColorStop(1, shade(o.accent, 0.12));
    x.fillStyle = g; x.fillRect(0, 0, Wd, Ht);
    x.globalAlpha = 0.5; x.fillStyle = "#fff6e0";
    for (let i = 0; i < 40; i++) { const px = (i * 89) % Wd, py = Ht - ((t * 34 + i * 47) % (Ht + 30)), r = 1.5 + (i % 3); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    x.globalAlpha = 1;
    x.fillStyle = "rgba(0,0,0,0.30)"; x.fillRect(0, 0, Wd, 74);
    x.fillStyle = "#fff6e6"; x.textAlign = "center"; x.font = "bold 46px Georgia, serif"; x.fillText(String(o.title || "").slice(0, 30), Wd / 2, 50);
    if (o.icon !== null) icon(x, Wd / 2, 178, 108 * (1 + 0.09 * Math.sin(t * 2.6)), o.icon, "rgba(255,246,224,0.95)");
    x.fillStyle = "rgba(255,250,238,0.97)"; x.font = "27px 'Hanken Grotesk', system-ui, sans-serif"; wrap(x, o.body, Wd / 2, o.icon !== null ? 270 : 150, Wd - 90, 36, 5);
  }

  function animSurface(w, h, draw) { const c = newCanvas(w, h); const ctx = c.getContext("2d"); draw(ctx, w, h, 0); const t = tex2(c); anims.push({ ctx, tex: t, w, h, draw }); return t; }
  function animWall(zc, side, o) {
    const TH = T(); const t = animSurface(720, 420, (c, w, h, tt) => drawPanel(c, w, h, tt, o));
    const m = new TH.Mesh(new TH.PlaneGeometry(7, 4.1), new TH.MeshBasicMaterial({ map: t }));
    m.position.set(IB.x + side * (W / 2 - 0.18), 2.8, IB.z + zc); m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; group.add(m);
  }

  // ---- the DEMO: a live animated mock of the product running ----
  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function cursor(x, cx, cy) { x.save(); x.fillStyle = "#111"; x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy + 22); x.lineTo(cx + 6, cy + 16); x.lineTo(cx + 11, cy + 24); x.lineTo(cx + 15, cy + 22); x.lineTo(cx + 9, cy + 14); x.lineTo(cx + 17, cy + 14); x.closePath(); x.fill(); x.stroke(); x.restore(); }
  function drawDemo(x, W, H, t, p, accent) {
    x.fillStyle = "#0c1018"; x.fillRect(0, 0, W, H);
    const ax = W * 0.06, ay = H * 0.06, aw = W * 0.88, ah = H * 0.88;
    x.fillStyle = "#f5f2ec"; rrect(x, ax, ay, aw, ah, 16); x.fill();
    x.fillStyle = "#e4ded1"; rrect(x, ax, ay, aw, 46, 16); x.fill(); x.fillRect(ax, ay + 24, aw, 22);
    ["#e06b5e", "#e8b84b", "#5fbf6b"].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(ax + 24 + i * 22, ay + 23, 7, 0, 7); x.fill(); });
    x.fillStyle = "#fff"; rrect(x, ax + 100, ay + 12, aw - 200, 24, 12); x.fill();
    x.fillStyle = "#8a8170"; x.font = "16px 'Spline Sans Mono', monospace"; x.textAlign = "left"; x.fillText("  " + String(p.name || "app").toLowerCase().replace(/\s+/g, "-") + ".app", ax + 110, ay + 29);
    const bx = ax, by = ay + 46, bw = aw, bh = ah - 46;
    let bodyFn;
    switch (p.kind) {
      case "lab":      bodyFn = drawChat;     break;
      case "shop":     bodyFn = drawShop;     break;
      case "workshop": bodyFn = drawWorkshop; break;
      case "library":  bodyFn = drawLibrary;  break;
      case "garden":   bodyFn = drawGarden;   break;
      default:         bodyFn = drawApp;
    }
    bodyFn(x, bx, by, bw, bh, t, p, accent);
  }
  function drawApp(x, bx, by, bw, bh, t, p, accent) {
    const sw = bw * 0.27, feats = (p.features || []);
    x.fillStyle = "#2a2620"; x.fillRect(bx, by, sw, bh);
    x.fillStyle = "#fff"; x.textAlign = "left"; x.font = "bold 21px 'Hanken Grotesk', sans-serif"; x.fillText(String(p.name || "").slice(0, 16), bx + 18, by + 36);
    const navs = ["Overview"].concat(feats.map((f) => f.t)).slice(0, 5);
    const sel = Math.floor(t * 0.45) % navs.length;
    navs.forEach((n, i) => { const yy = by + 72 + i * 40; if (i === sel) { x.fillStyle = hex(accent); rrect(x, bx + 8, yy - 22, sw - 16, 34, 8); x.fill(); } x.fillStyle = i === sel ? "#1a1510" : "#b8ad9a"; x.font = "17px 'Hanken Grotesk', sans-serif"; x.fillText(String(n || "").slice(0, 18), bx + 22, yy); });
    const mx = bx + sw, mw = bw - sw;
    x.fillStyle = "#fff"; x.fillRect(mx, by, mw, bh);
    x.fillStyle = "#1a1510"; x.font = "bold 28px Georgia, serif"; x.fillText(String(navs[sel] || "").slice(0, 24), mx + 28, by + 48);
    const stats = [["12", "active"], ["87%", "health"], ["" + (p.commits || 0), "commits"]];
    for (let i = 0; i < 3; i++) { const cw = (mw - 80) / 3, cx = mx + 28 + i * (cw + 12); x.fillStyle = "#f1ede3"; rrect(x, cx, by + 70, cw, 76, 10); x.fill(); x.fillStyle = hex(accent); x.font = "bold 30px Georgia, serif"; x.fillText(stats[i][0], cx + 14, by + 116); x.fillStyle = "#8a8170"; x.font = "13px 'Hanken Grotesk', sans-serif"; x.fillText(stats[i][1], cx + 14, by + 136); }
    const rows = feats.length ? feats : [{ t: "Item" }, { t: "Item" }, { t: "Item" }];
    for (let i = 0; i < Math.min(4, rows.length); i++) { const yy = by + 168 + i * 44; const shown = ((t * 0.8) % (rows.length + 2)) > i; x.globalAlpha = shown ? 1 : 0.2; x.fillStyle = i % 2 ? "#f7f4ed" : "#fff"; x.fillRect(mx + 28, yy, mw - 56, 38); x.fillStyle = "#5fbf6b"; x.beginPath(); x.arc(mx + 46, yy + 19, 5, 0, 7); x.fill(); x.fillStyle = "#3a342a"; x.font = "16px 'Hanken Grotesk', sans-serif"; x.fillText(String(rows[i].t || "Item").slice(0, 40), mx + 62, yy + 24); x.globalAlpha = 1; }
    cursor(x, mx + 60 + Math.abs(Math.sin(t * 0.7)) * (mw - 160), by + 120 + Math.abs(Math.cos(t * 0.55)) * (bh - 200));
  }
  function drawChat(x, bx, by, bw, bh, t, p, accent) {
    x.fillStyle = "#fbf9f4"; x.fillRect(bx, by, bw, bh);
    const feats = (p.features || []); const turn = Math.floor(t * 0.25) % Math.max(1, feats.length);
    let yy = by + 30;
    const bubble = (who, text, yfrom) => { const me = who === "you"; const tw = Math.min(bw * 0.66, 40 + text.length * 8.5); const bxp = me ? bx + bw - tw - 30 : bx + 30; x.fillStyle = me ? hex(accent) : "#ece7dc"; rrect(x, bxp, yfrom, tw, 0, 0); /*noop*/ const lines = []; let line = "", words = text.split(" "); x.font = "17px 'Hanken Grotesk', sans-serif"; for (const w of words) { if (x.measureText(line + w).width > tw - 28 && line) { lines.push(line); line = w + " "; } else line += w + " "; } lines.push(line); const bhh = 16 + lines.length * 24; x.fillStyle = me ? hex(accent) : "#ece7dc"; rrect(x, bxp, yfrom, tw, bhh, 14); x.fill(); x.fillStyle = me ? "#fff" : "#2a2620"; x.textAlign = "left"; lines.forEach((l, i) => x.fillText(l.trim(), bxp + 14, yfrom + 26 + i * 24)); return yfrom + bhh + 14; };
    for (let i = 0; i <= turn && i < feats.length; i++) { yy = bubble("you", "How does " + (feats[i].t || "it") + " work?", yy); if (i < turn) yy = bubble("ai", String(feats[i].b || "It just works."), yy); }
    if (turn < feats.length) { const dots = Math.floor(t * 3) % 4; x.fillStyle = "#ece7dc"; rrect(x, bx + 30, yy, 90, 40, 14); x.fill(); x.fillStyle = "#8a8170"; for (let d = 0; d < 3; d++) { x.globalAlpha = d <= dots ? 1 : 0.3; x.beginPath(); x.arc(bx + 50 + d * 18, yy + 20, 5, 0, 7); x.fill(); } x.globalAlpha = 1; }
    x.fillStyle = "#fff"; x.fillRect(bx, by + bh - 50, bw, 50); x.strokeStyle = "#e0dacc"; x.lineWidth = 1; rrect(x, bx + 20, by + bh - 42, bw - 110, 34, 10); x.stroke(); x.fillStyle = hex(accent); rrect(x, bx + bw - 80, by + bh - 42, 60, 34, 10); x.fill();
  }
  // ---- per-kind demo body renderers ----
  function drawShop(x, bx, by, bw, bh, t, p, accent) {
    x.fillStyle = "#f9f6f0"; x.fillRect(bx, by, bw, bh);
    // header bar
    x.fillStyle = hex(accent); x.fillRect(bx, by, bw, 44);
    x.fillStyle = "#fff"; x.font = "bold 20px 'Hanken Grotesk', sans-serif"; x.textAlign = "left";
    x.fillText(String(p.name || "Shop").slice(0, 22), bx + 18, by + 28);
    // cart badge
    const cartCount = (Math.floor(t * 0.3) % 6) + 1;
    x.fillStyle = "#e06b5e"; x.beginPath(); x.arc(bx + bw - 30, by + 14, 14, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.font = "bold 15px 'Hanken Grotesk', sans-serif"; x.textAlign = "center";
    x.fillText(String(cartCount), bx + bw - 30, by + 20);
    // product grid (2 cols x 3 rows)
    const cols = 2, rows = 3, pad = 16, cw = (bw - pad * 3) / cols, rh = (bh - 44 - pad * 4) / rows;
    const names = (p.features || []).map((f) => f.t).concat(["Pro Plan", "Starter", "Bundle", "Basic", "Ultimate", "Plus"]);
    const prices = ["$29", "$49", "$9", "$99", "$19", "$79"];
    const pulse = 0.85 + 0.15 * Math.sin(t * 3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cx2 = bx + pad + c * (cw + pad), cy2 = by + 44 + pad + r * (rh + pad);
      x.fillStyle = "#fff"; rrect(x, cx2, cy2, cw, rh, 10); x.fill();
      x.strokeStyle = rgba2(accent, 0.25); x.lineWidth = 1.5; rrect(x, cx2, cy2, cw, rh, 10); x.stroke();
      // product colour swatch
      x.fillStyle = rgba2(accent, 0.18 + 0.12 * ((idx * 0.37 + 0.1))); x.fillRect(cx2 + 4, cy2 + 4, cw - 8, rh * 0.46);
      x.fillStyle = "#2a2620"; x.font = "13px 'Hanken Grotesk', sans-serif"; x.textAlign = "left";
      x.fillText(String(names[idx] || "Item " + idx).slice(0, 14), cx2 + 8, cy2 + rh * 0.52 + 14);
      x.fillStyle = hex(accent); x.font = "bold 16px Georgia, serif"; x.fillText(prices[idx % prices.length], cx2 + 8, cy2 + rh * 0.52 + 32);
      // "Add to cart" button with pulse on last visible one
      const isActive = idx === (Math.floor(t * 0.3) % (cols * rows));
      x.fillStyle = isActive ? rgba2(accent, pulse) : rgba2(accent, 0.7);
      rrect(x, cx2 + 6, cy2 + rh - 26, cw - 12, 20, 6); x.fill();
      x.fillStyle = "#fff"; x.font = "11px 'Hanken Grotesk', sans-serif"; x.textAlign = "center";
      x.fillText("Add to cart", cx2 + cw / 2, cy2 + rh - 12);
    }
  }
  function drawWorkshop(x, bx, by, bw, bh, t, p, accent) {
    x.fillStyle = "#0d1117"; x.fillRect(bx, by, bw, bh);
    // title bar
    x.fillStyle = rgba2(accent, 0.15); x.fillRect(bx, by, bw, 34);
    x.fillStyle = hex(accent); x.font = "bold 14px 'Spline Sans Mono', monospace"; x.textAlign = "left";
    x.fillText(String(p.name || "workshop").toLowerCase().replace(/\s+/g, "-") + " ~", bx + 14, by + 22);
    // terminal lines
    const cmds = (p.features || []).map((f) => "$ run " + (f.t || "task").toLowerCase().replace(/\s+/g, "_")).concat(["$ build --prod", "$ test --all", "$ deploy --env=live"]);
    const outputs = ["  [ok] done in 342ms", "  [ok] 12 tests passed", "  Deployed to prod!", "  Build success", "  All checks green"];
    const totalLines = cmds.length * 2;
    const visCount = Math.min(totalLines, Math.floor(t * 1.8) + 1);
    let ly = by + 50;
    for (let i = 0; i < Math.min(cmds.length, Math.ceil(visCount / 2)); i++) {
      x.fillStyle = "#7ee787"; x.font = "15px 'Spline Sans Mono', monospace"; x.textAlign = "left";
      const cmdFull = cmds[i] || "";
      const typed = i * 2 < visCount - 1 ? cmdFull : cmdFull.slice(0, Math.floor(((visCount - i * 2) / 1) * cmdFull.length * 0.6));
      x.fillText(typed, bx + 18, ly); ly += 22;
      if (i * 2 + 1 < visCount) {
        x.fillStyle = "#8b949e"; x.fillText(outputs[i % outputs.length], bx + 18, ly); ly += 22;
      }
      if (ly > by + bh - 30) break;
    }
    // blinking caret
    if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = "#7ee787"; x.fillRect(bx + 18, ly, 9, 17); }
  }
  function drawLibrary(x, bx, by, bw, bh, t, p, accent) {
    x.fillStyle = "#ffffff"; x.fillRect(bx, by, bw, bh);
    const sw2 = bw * 0.28;
    // left nav
    x.fillStyle = "#f6f8fa"; x.fillRect(bx, by, sw2, bh);
    x.fillStyle = "#24292f"; x.font = "bold 15px 'Hanken Grotesk', sans-serif"; x.textAlign = "left";
    x.fillText("Contents", bx + 12, by + 26);
    const feats = (p.features || []);
    const selF = Math.floor(t * 0.3) % Math.max(1, feats.length);
    feats.slice(0, 7).forEach((f, i) => {
      if (i === selF) { x.fillStyle = rgba2(accent, 0.18); x.fillRect(bx + 4, by + 38 + i * 26, sw2 - 8, 22); }
      x.fillStyle = i === selF ? hex(accent) : "#57606a";
      x.font = (i === selF ? "bold " : "") + "13px 'Hanken Grotesk', sans-serif";
      x.fillText(String(f.t || "").slice(0, 18), bx + 14, by + 54 + i * 26);
    });
    // article area
    const ax2 = bx + sw2 + 12;
    const feat = feats[selF] || { t: "Overview", b: "" };
    x.fillStyle = "#24292f"; x.font = "bold 22px Georgia, serif"; x.fillText(String(feat.t || "").slice(0, 30), ax2, by + 34);
    x.strokeStyle = rgba2(accent, 0.5); x.lineWidth = 2; x.beginPath(); x.moveTo(ax2, by + 42); x.lineTo(bx + bw - 10, by + 42); x.stroke();
    // paragraph lines fading in
    const body = feat.b || "A powerful feature that enhances your workflow and productivity significantly.";
    x.fillStyle = "#57606a"; x.font = "14px 'Hanken Grotesk', sans-serif";
    const words = body.split(" "); let line2 = "", yy2 = by + 64, linesDone = 0;
    const maxLinesShown = Math.min(5, Math.floor(t * 0.8 - selF * 2) + 1);
    for (const w of words) {
      if (x.measureText(line2 + w).width > bw - sw2 - 24 && line2) {
        if (linesDone < maxLinesShown) { x.fillText(line2.trim(), ax2, yy2); yy2 += 20; } linesDone++; line2 = w + " ";
      } else line2 += w + " ";
    }
    if (linesDone < maxLinesShown) x.fillText(line2.trim(), ax2, yy2); yy2 += 26;
    // code block
    const codeVisible = (t * 0.4 - selF) > 2;
    if (codeVisible) {
      x.fillStyle = "#f6f8fa"; rrect(x, ax2, yy2, bw - sw2 - 20, 52, 6); x.fill();
      x.strokeStyle = "#d0d7de"; x.lineWidth = 1; rrect(x, ax2, yy2, bw - sw2 - 20, 52, 6); x.stroke();
      x.fillStyle = hex(accent); x.font = "13px 'Spline Sans Mono', monospace";
      x.fillText("import { " + String(feat.t || "feature").replace(/\s+/g, "") + " } from '" + String(p.name || "lib").toLowerCase() + "'", ax2 + 10, yy2 + 22);
      x.fillStyle = "#57606a"; x.fillText(String(feat.t || "feature").replace(/\s+/g, "") + "({ auto: true })", ax2 + 10, yy2 + 40);
    }
  }
  function drawGarden(x, bx, by, bw, bh, t, p, accent) {
    x.fillStyle = "#fdfcf8"; x.fillRect(bx, by, bw, bh);
    const sw2 = bw * 0.4, gx = bx + sw2;
    // note list
    x.fillStyle = "#f0ede5"; x.fillRect(bx, by, sw2, bh);
    x.fillStyle = "#2a2620"; x.font = "bold 16px 'Hanken Grotesk', sans-serif"; x.textAlign = "left";
    x.fillText("Notes", bx + 14, by + 26);
    const feats = (p.features || []).concat([{ t: "Index" }, { t: "Inbox" }, { t: "Daily" }]);
    const selN = Math.floor(t * 0.25) % feats.length;
    feats.slice(0, 8).forEach((f, i) => {
      const isS = i === selN;
      if (isS) { x.fillStyle = rgba2(accent, 0.2); x.fillRect(bx + 4, by + 36 + i * 28, sw2 - 8, 24); }
      x.fillStyle = isS ? hex(accent) : "#5a5248";
      x.font = (isS ? "bold " : "") + "13px 'Hanken Grotesk', sans-serif";
      x.fillText(String(f.t || "").slice(0, 20), bx + 16, by + 53 + i * 28);
    });
    // graph area (backlink graph)
    x.fillStyle = "#fff"; x.fillRect(gx, by, bw - sw2, bh / 2);
    x.fillStyle = "#2a2620"; x.font = "bold 13px 'Hanken Grotesk', sans-serif"; x.textAlign = "center";
    x.fillText("Backlinks", gx + (bw - sw2) / 2, by + 18);
    const gw = bw - sw2 - 20, gh = bh / 2 - 30;
    const nodes = feats.slice(0, 6).map((f, i) => ({
      x: gx + 10 + gw * (0.2 + 0.6 * Math.sin(t * 0.18 + i * 1.1 + i * 0.9)),
      y: by + 26 + gh * (0.2 + 0.6 * Math.cos(t * 0.14 + i * 0.8)),
      label: (f.t || "").slice(0, 8)
    }));
    // edges
    x.lineWidth = 1.2;
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
      if ((a + b) % 3 !== 0) continue;
      x.strokeStyle = rgba2(accent, 0.3); x.beginPath(); x.moveTo(nodes[a].x, nodes[a].y); x.lineTo(nodes[b].x, nodes[b].y); x.stroke();
    }
    // nodes
    nodes.forEach((nd, i) => {
      const isH = i === selN % nodes.length;
      x.fillStyle = isH ? hex(accent) : rgba2(accent, 0.55); x.beginPath(); x.arc(nd.x, nd.y, isH ? 9 : 6, 0, 7); x.fill();
      x.fillStyle = "#2a2620"; x.font = "11px 'Hanken Grotesk', sans-serif"; x.textAlign = "center"; x.fillText(nd.label, nd.x, nd.y + 18);
    });
    // selected note content below
    const feat = feats[selN] || { t: "Note", b: "" };
    x.fillStyle = "#f7f5ef"; x.fillRect(gx, by + bh / 2, bw - sw2, bh / 2);
    x.fillStyle = "#2a2620"; x.font = "bold 15px Georgia, serif"; x.textAlign = "left";
    x.fillText(String(feat.t || "").slice(0, 24), gx + 12, by + bh / 2 + 22);
    x.fillStyle = "#7a7060"; x.font = "13px 'Hanken Grotesk', sans-serif";
    wrap(x, feat.b || "Connected ideas grow here.", gx + 12, by + bh / 2 + 42, bw - sw2 - 24, 18, 4);
  }
  // rgba helper (no THREE dependency, used inside draw fns)
  function rgba2(n, a) { const TH = T(); const c = new TH.Color(n); return "rgba(" + ((c.r * 255) | 0) + "," + ((c.g * 255) | 0) + "," + ((c.b * 255) | 0) + "," + a + ")"; }

  function staticWall(zc, side, o) {
    const TH = T(); const c = newCanvas(900, 500); drawPanel(c.getContext("2d"), 900, 500, 0, o);
    const m = new TH.Mesh(new TH.PlaneGeometry(7.4, 4.1), new TH.MeshBasicMaterial({ map: tex2(c) }));
    m.position.set(IB.x + side * (W / 2 - 0.18), 2.8, IB.z + zc); m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; group.add(m);
  }
  function pt(c, i, d, x, y, z) { const TH = T(); const l = new TH.PointLight(c, i, d); l.position.set(IB.x + x, y, IB.z + z); group.add(l); }
  function bird(col) { const TH = T(); const g = new TH.Group(); const m = F.mat(col, { flat: true }); g.add(new TH.Mesh(new TH.BoxGeometry(0.4, 0.13, 0.18), m)); const wl = new TH.Mesh(new TH.BoxGeometry(0.55, 0.05, 0.24), m); wl.geometry.translate(-0.28, 0, 0); wl.position.x = -0.16; g.add(wl); const wr = new TH.Mesh(new TH.BoxGeometry(0.55, 0.05, 0.24), m); wr.geometry.translate(0.28, 0, 0); wr.position.x = 0.16; g.add(wr); g.userData.w = { l: wl, r: wr }; return g; }

  // ---- cool animated motion-graphics for the walls (not text) ----
  function R(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  function rgba(n, a, light) { const TH = T(); const c = new TH.Color(n); if (light) c.lerp(new TH.Color(1, 1, 1), light); return `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a})`; }
  function bgDark(x, W, H, accent) { const TH = T(); x.fillStyle = "#" + new TH.Color(accent).lerp(new TH.Color(0, 0, 0), 0.84).getHexString(); x.fillRect(0, 0, W, H); }
  function visNetwork(x, W, H, t, accent) { bgDark(x, W, H, accent); const N = 34, p = []; for (let k = 0; k < N; k++) p.push([R(k * 1.3) * W + Math.sin(t * 0.5 + k) * 22, R(k * 2.7) * H + Math.cos(t * 0.4 + k * 1.7) * 20]); x.lineWidth = 1.3; for (let a = 0; a < N; a++)for (let b = a + 1; b < N; b++) { const d = Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]); if (d < 120) { x.strokeStyle = rgba(accent, (1 - d / 120) * 0.5, 0.4); x.beginPath(); x.moveTo(p[a][0], p[a][1]); x.lineTo(p[b][0], p[b][1]); x.stroke(); } } for (let k = 0; k < N; k++) { x.fillStyle = rgba(accent, 0.9, 0.55); x.beginPath(); x.arc(p[k][0], p[k][1], 3 + 2 * Math.sin(t * 1.6 + k), 0, 7); x.fill(); } }
  function visBars(x, W, H, t, accent) { bgDark(x, W, H, accent); const n = 24, bw = W / n; for (let i = 0; i < n; i++) { const h = (0.18 + 0.62 * Math.abs(Math.sin(t * 1.4 + i * 0.5) + 0.4 * Math.sin(t * 2.1 + i))) * H * 0.8; const g = x.createLinearGradient(0, H, 0, H - h); g.addColorStop(0, rgba(accent, 0.9, 0.05)); g.addColorStop(1, rgba(accent, 0.95, 0.65)); x.fillStyle = g; x.fillRect(i * bw + bw * 0.18, H - h - 20, bw * 0.64, h); } }
  function visRings(x, W, H, t, accent) { bgDark(x, W, H, accent); const cx = W / 2, cy = H / 2; for (let i = 0; i < 6; i++) { const ph = (t * 0.4 + i / 6) % 1, r = ph * Math.max(W, H) * 0.62; x.strokeStyle = rgba(accent, (1 - ph) * 0.7, 0.4); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke(); } x.save(); x.translate(cx, cy); x.rotate(t * 0.5); for (let s = 0; s < 8; s++) { x.rotate(Math.PI / 4); x.strokeStyle = rgba(accent, 0.35, 0.3); x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -Math.min(W, H) * 0.44); x.stroke(); } x.restore(); x.fillStyle = rgba(accent, 1, 0.6); x.beginPath(); x.arc(cx, cy, 10 + 3 * Math.sin(t * 3), 0, 7); x.fill(); }
  function visOrbit(x, W, H, t, accent) { bgDark(x, W, H, accent); const cx = W / 2, cy = H / 2; const core = x.createRadialGradient(cx, cy, 0, cx, cy, 90); core.addColorStop(0, rgba(accent, 0.85, 0.6)); core.addColorStop(1, rgba(accent, 0, 0)); x.fillStyle = core; x.fillRect(cx - 100, cy - 100, 200, 200); for (let i = 0; i < 5; i++) { const rad = 70 + i * 44; for (let tr = 0; tr < 10; tr++) { const aa = t * (0.6 - i * 0.07) + i - tr * 0.05; x.fillStyle = rgba(accent, (1 - tr / 10) * 0.6, 0.4); x.beginPath(); x.arc(cx + Math.cos(aa) * rad, cy + Math.sin(aa) * rad * 0.62, 4 - tr * 0.25, 0, 7); x.fill(); } } }
  const VIS = [visNetwork, visBars, visRings, visOrbit];
  function visWall(zc, side, title, accent, fn, fallbackFn) {
    const TH = T();
    // Runtime safety: if fn throws, permanently swap to fallbackFn after first error
    let safeFn = fn;
    if (fallbackFn && fn !== fallbackFn) {
      let broken = false;
      safeFn = function(c, w, h, tt, ac) {
        if (broken) { fallbackFn(c, w, h, tt, ac); return; }
        try { fn(c, w, h, tt, ac); } catch(e) { broken = true; console.warn('[panels] draw error, falling back:', e && e.message); fallbackFn(c, w, h, tt, ac); }
      };
    }
    const t = animSurface(720, 420, (c, w, h, tt) => { safeFn(c, w, h, tt, accent); c.textAlign = "left"; c.fillStyle = "rgba(255,250,238,0.92)"; c.font = "bold 30px Georgia, serif"; c.fillText(String(title || "").slice(0, 26), 30, h - 30); });
    const m = new TH.Mesh(new TH.PlaneGeometry(7, 4.1), new TH.MeshBasicMaterial({ map: t }));
    m.position.set(IB.x + side * (W / 2 - 0.18), 2.8, IB.z + zc); m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; group.add(m);
  }

  // ---- wayfinding: ceiling sign ----
  function makeCeilingSign(zPos, label, accent) {
    const TH = T();
    const CW = 480, CH = 128;
    const c = newCanvas(CW, CH); const ctx = c.getContext("2d");
    // dark rounded background
    ctx.fillStyle = "rgba(18,14,10,0.92)"; rrect(ctx, 0, 0, CW, CH, 22); ctx.fill();
    // accent border
    ctx.strokeStyle = hex(accent); ctx.lineWidth = 4; rrect(ctx, 2, 2, CW - 4, CH - 4, 20); ctx.stroke();
    // text
    ctx.fillStyle = "#fff6e0"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 52px 'Hanken Grotesk', Georgia, sans-serif";
    ctx.fillText(label, CW / 2, CH / 2 + 2);
    const mat = new (T()).MeshBasicMaterial({ map: tex2(c), transparent: true });
    const mesh = new (T()).Mesh(new (T()).PlaneGeometry(3, 0.8), mat);
    mesh.position.set(IB.x, H - 1.2, IB.z + zPos);
    mesh.rotation.y = Math.PI; // face approaching player (-z)
    group.add(mesh);
  }

  // ---- wayfinding: floor arrow chevron ----
  function makeFloorArrow(zPos, accent) {
    const TH = T();
    const shape = new TH.Shape();
    // chevron pointing +z (forward)
    shape.moveTo(-0.6, 0); shape.lineTo(0, 0.7); shape.lineTo(0.6, 0);
    shape.lineTo(0.4, 0); shape.lineTo(0, 0.5); shape.lineTo(-0.4, 0);
    shape.closePath();
    const geo = new TH.ShapeGeometry(shape);
    const mat = new TH.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.82, side: TH.DoubleSide });
    const mesh = new TH.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2; // lay flat on floor
    mesh.position.set(IB.x, 0.04, IB.z + zPos);
    mesh.castShadow = false;
    group.add(mesh);
  }

  // ---- guestbook: 5-point star shape ----
  function makeStarMonument(zPos, accent) {
    const TH = T();
    // 5-point star via THREE.Shape
    const starShape = new TH.Shape();
    const pts = 5, outer = 1.1, inner = 0.46;
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / pts - Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const extSettings = { depth: 0.28, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3 };
    const geo = new TH.ExtrudeGeometry(starShape, extSettings);
    geo.center();
    const mat = new TH.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb020, emissiveIntensity: 1.2, metalness: 0.55, roughness: 0.28 });
    const star = new TH.Mesh(geo, mat);
    star.position.set(IB.x, 2.5, IB.z + zPos);
    star.castShadow = false;
    group.add(star);
    spinners.push(star);

    // short pillar below the star
    const pillar = new TH.Mesh(new TH.CylinderGeometry(0.22, 0.28, 1.6, 10), F.mat(0x6f4a2f, { flat: true }));
    pillar.position.set(IB.x, 0.8, IB.z + zPos);
    group.add(pillar);

    // guestbook sign (canvas plane)
    const SW = 740, SH = 160;
    const sc = newCanvas(SW, SH); const sx = sc.getContext("2d");
    sx.fillStyle = "rgba(26,18,8,0.93)"; rrect(sx, 0, 0, SW, SH, 20); sx.fill();
    sx.strokeStyle = hex(0xffd34d); sx.lineWidth = 3; rrect(sx, 2, 2, SW - 4, SH - 4, 18); sx.stroke();
    sx.fillStyle = "#ffd34d"; sx.textAlign = "center"; sx.textBaseline = "middle";
    sx.font = "bold 48px Georgia, serif";
    sx.fillText("★  GUEST BOOK  ★", SW / 2, SH / 2);
    const signMesh = new TH.Mesh(new TH.PlaneGeometry(4.6, 1.0), new TH.MeshBasicMaterial({ map: tex2(sc), transparent: true }));
    signMesh.position.set(IB.x, 4.3, IB.z + zPos);
    signMesh.rotation.y = Math.PI;
    group.add(signMesh);
  }

  // ---- guestbook: CTA wall sign ----
  function makeCtaSign(zPos, side, p, accent) {
    const TH = T();
    const CW = 900, CH = 500;
    const c = newCanvas(CW, CH); const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, shade(0xffd34d, -0.35)); g.addColorStop(1, shade(0xffd34d, 0.08));
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    // big star count
    ctx.fillStyle = "#1a1208"; ctx.textAlign = "center";
    ctx.font = "bold 80px Georgia, serif"; ctx.fillText("★  " + (p.stars || 0), CW / 2, 110);
    ctx.font = "bold 34px 'Hanken Grotesk', sans-serif"; ctx.fillText("Star it on GitHub", CW / 2, 178);
    ctx.font = "26px 'Hanken Grotesk', sans-serif"; ctx.fillStyle = "#3a2a0a";
    ctx.fillText("Share your kingdom", CW / 2, 228);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "22px 'Hanken Grotesk', sans-serif";
    ctx.fillText(String(p.name || ""), CW / 2, 294);
    // warm decorative line
    ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(CW * 0.2, 148); ctx.lineTo(CW * 0.8, 148); ctx.stroke();
    const m = new TH.Mesh(new TH.PlaneGeometry(7.4, 4.1), new TH.MeshBasicMaterial({ map: tex2(c) }));
    m.position.set(IB.x + side * (W / 2 - 0.18), 2.8, IB.z + zPos);
    m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(m);
  }

  F.Interior = {
    init(sc) { scene = sc; },

    enter(p, kindMeta, tier) {
      const TH = T(); group = new TH.Group(); anims = []; spinners = [];
      const accent = (kindMeta && kindMeta.accent) || 0xcda169;
      const hue = [0x4f8a9c, 0xc98a55, 0x7d9460, 0xc25b7a, 0x6f8ad9, 0xd6a85f];
      const floorMat = F.mat(0xcdb89a, { flat: true }), darkFloor = F.mat(0x241c13, { flat: true });
      const feats = (p.features || []).slice(0, 3);

      // Look up per-project generated panel functions (populated by build-panels.mjs)
      const PN = (window.__panels && window.__panels[p.id]) || {};

      // middle content panels — features + guaranteed real-data fillers, so the hall is NEVER empty
      const mids = [];
      feats.forEach((f, i) => mids.push({ title: f.t || "Feature", accent: hue[i % hue.length], vis: VIS[(i + 1) % VIS.length] }));
      mids.push({ title: "Built with " + ((p.tech || []).slice(0, 4).join(" · ") || "code"), accent: hue[3], vis: visBars });
      mids.push({ title: (p.commits || 0) + " commits · " + (p.files || 0) + " files", accent: hue[4], vis: visRings });

      const buildRoom = (z0, z1, wallCol, dark) => {
        const len = z1 - z0, wmat = F.mat(wallCol, { flat: true });
        const fl = new TH.Mesh(new TH.BoxGeometry(W, 0.2, len), dark ? darkFloor : floorMat); fl.position.set(IB.x, 0, IB.z + z0 + len / 2); group.add(fl);
        const ce = new TH.Mesh(new TH.BoxGeometry(W, 0.2, len), wmat); ce.position.set(IB.x, H, IB.z + z0 + len / 2); group.add(ce);
        for (const sx of [-W / 2, W / 2]) { const wl = new TH.Mesh(new TH.BoxGeometry(0.3, H, len), wmat); wl.position.set(IB.x + sx, H / 2, IB.z + z0 + len / 2); group.add(wl); }
        const ru = new TH.Mesh(new TH.BoxGeometry(2.2, 0.05, Math.max(1, len - 0.5)), F.mat(tint(0xcdb89a, dark ? 0x000000 : accent, 0.5), { flat: true })); ru.position.set(IB.x, 0.13, IB.z + z0 + len / 2); group.add(ru);
      };

      let z = 0;
      // ATRIUM — the one short text description wall + a motion-graphic facing it
      const AT = 13; buildRoom(0, AT, tint(0xe0cba8, accent, 0.4), false);
      staticWall(6.5, -1, { title: p.name, body: p.tagline || "", icon: null, accent });
      visWall(6.5, 1, (kindMeta && kindMeta.word) || "Estate", accent, PN.anim5 || visOrbit, visOrbit);
      pt(0xffe7bf, 1.15, 32, 0, H - 0.4, 6.5);
      z = AT;

      // CONTENT CHAMBERS — one per panel, alternating walls, never empty
      const ML = 13;
      mids.forEach((m, i) => {
        buildRoom(z, z + ML, tint(0xe0cba8, m.accent, 0.42), false);
        const zc = z + ML / 2, side = i % 2 ? 1 : -1;
        const genFn = PN["anim" + i];
        visWall(zc, side, m.title, m.accent, genFn || m.vis, m.vis);
        const sconce = new TH.Mesh(new TH.SphereGeometry(0.5, 12, 10), new TH.MeshStandardMaterial({ color: m.accent, emissive: m.accent, emissiveIntensity: 0.9, flatShading: true }));
        sconce.position.set(IB.x - side * (W / 2 - 0.6), 4.3, IB.z + zc); group.add(sconce);
        pt(m.accent, 0.65, 15, -side * 2, 3.2, zc);
        z += ML;
      });

      // floor arrows pointing +z down the corridor, every ~13 units
      for (let az = 8; az < z; az += 13) makeFloorArrow(az, accent);

      // DEMO room — ceiling sign + animated product mock on a big spotlit screen
      makeCeilingSign(z - 1.5, "▶  LIVE DEMO  →", accent);
      const DM = 15; buildRoom(z, z + DM, 0x2a2017, true);
      const sp = new TH.SpotLight(0xfff0d0, 3.0, 26, 0.7, 0.6); sp.position.set(IB.x, 5, IB.z + z + 4); sp.target.position.set(IB.x, 2.6, IB.z + z + DM - 1); group.add(sp); group.add(sp.target);
      const demoT = animSurface(980, 620, (c2, w2, h2, tt) => drawDemo(c2, w2, h2, tt, p, accent));
      const screen = new TH.Mesh(new TH.PlaneGeometry(8.4, 5.3), new TH.MeshBasicMaterial({ map: demoT })); screen.position.set(IB.x, 3, IB.z + z + DM - 0.5); screen.rotation.y = Math.PI; group.add(screen);
      const sb = new TH.Mesh(new TH.BoxGeometry(9, 5.9, 0.25), F.mat(0x4a3a2a, { flat: true })); sb.position.set(IB.x, 3, IB.z + z + DM - 0.35); group.add(sb);
      pt(0xffe9c8, 0.5, 20, 0, H - 0.5, z + 4);
      z += DM;

      // GUESTBOOK — ceiling sign + star monument + CTA wall
      makeCeilingSign(z - 1.5, "★  GUEST BOOK  →", accent);
      const GB = 9; buildRoom(z, z + GB, tint(0xe0cba8, accent, 0.4), false);
      makeStarMonument(z + GB / 2, accent);
      makeCtaSign(z + GB / 2, -1, p, accent);
      // warm golden point light for the star
      pt(0xffd080, 1.1, 18, 0, 3.5, z + GB / 2);
      pt(0xffe9c8, 0.7, 22, 0, H - 0.4, z + GB / 2);
      z += GB;
      const END = z;

      // end caps
      for (const zz of [-0.1, END + 0.1]) { const m2 = new TH.Mesh(new TH.BoxGeometry(W, H, 0.3), F.mat(tint(0xe0cba8, accent, 0.3), { flat: true })); m2.position.set(IB.x, H / 2, IB.z + zz); group.add(m2); }

      bounds = { x0: IB.x - W / 2 + 0.8, x1: IB.x + W / 2 - 0.8, z0: IB.z + 0.8, z1: IB.z + END - 0.8 };
      scene.add(group);
      return new TH.Vector3(IB.x, 0, IB.z + 3);
    },

    clamp(pos) { if (bounds) { pos.x = Math.max(bounds.x0, Math.min(bounds.x1, pos.x)); pos.z = Math.max(bounds.z0, Math.min(bounds.z1, pos.z)); } },

    update(t) {
      // animate feature walls (throttled to ~11fps to keep texture uploads cheap)
      if (t - lastDraw > 0.07) { lastDraw = t; for (const a of anims) { a.draw(a.ctx, a.w, a.h, t); a.tex.needsUpdate = true; } }
      // slowly spin the star monument(s)
      for (const s of spinners) { s.rotation.y = t * 0.55; s.position.y = 2.5 + Math.sin(t * 0.7) * 0.12; }
    },

    leave() { if (group && scene) scene.remove(group); group = null; bounds = null; anims = []; npcs = []; birds = []; spinners = []; },
  };
})();
