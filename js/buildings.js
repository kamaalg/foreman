// ── Foreman · procedural Mediterranean houses ────────────────────────────
window.F = window.F || {};
(function () {
  const T = () => window.THREE;

  // text sign as a canvas texture (for deploy lantern + plot signs)
  function signTexture(lines, opts = {}) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = opts.bg || "#2e2418"; x.fillRect(0, 0, 256, 128);
    x.fillStyle = opts.fg || "#ffd9a0"; x.textAlign = "center"; x.textBaseline = "middle";
    lines.forEach((ln, i) => {
      x.font = (i === 0 ? "700 " : "500 ") + (ln.s || 30) + "px 'Spline Sans Mono', monospace";
      x.fillStyle = ln.c || opts.fg || "#ffd9a0";
      x.fillText(ln.t, 128, 64 + (i - (lines.length - 1) / 2) * 36);
    });
    const tex = new (T().CanvasTexture)(c); tex.colorSpace = T().SRGBColorSpace; return tex;
  }

  // weather a base color toward muted ash by factor w (0..1)
  function weather(hex, w) {
    const c = new (T().Color)(hex); const ash = new (T().Color)(0x9c8d76);
    return c.lerp(ash, w * 0.55).getHex();
  }

  // arched door / window opening: dark panel + half-round top
  function arch(w, h, depth, color) {
    const TH = T(); const g = new TH.Group(); const m = F.mat(color, { flat: true });
    const body = new TH.Mesh(new TH.BoxGeometry(w, h, depth), m); body.position.y = h / 2; g.add(body);
    const top = new TH.Mesh(new TH.CylinderGeometry(w / 2, w / 2, depth, 14, 1, false, 0, Math.PI), m);
    top.rotation.z = -Math.PI / 2; top.rotation.y = Math.PI / 2; top.position.y = h; g.add(top);
    return g;
  }

  // window with shutters + sill, optionally shuttered-closed (weathered)
  function windowUnit(shutCol, closed) {
    const TH = T(); const g = new TH.Group();
    const opening = new TH.Mesh(new TH.BoxGeometry(0.9, 1.15, 0.12), F.mat(closed ? 0x6f5b44 : 0x2c3338, { flat: true }));
    g.add(opening);
    if (!closed) { // glint
      const glass = new TH.Mesh(new TH.BoxGeometry(0.78, 1.02, 0.05), F.mat(0x9fc2c4, { roughness: .2, emissive: 0x7fa6a8, emissiveIntensity: .15 }));
      glass.position.z = 0.04; g.add(glass);
    }
    const sm = F.mat(shutCol, { flat: true });
    [-0.56, 0.56].forEach((dx, i) => {
      const s = new TH.Mesh(new TH.BoxGeometry(0.42, 1.2, 0.08), sm);
      s.position.set(dx, 0, 0.09); if (closed) s.position.x = dx * 0.42; g.add(s);
    });
    const sill = new TH.Mesh(new TH.BoxGeometry(1.25, 0.12, 0.28), F.mat(0xe9dcc2, { flat: true }));
    sill.position.set(0, -0.66, 0.06); g.add(sill);
    return g;
  }

  function stripeTexture(a, b) {
    const c = document.createElement("canvas"); c.width = 64; c.height = 16; const x = c.getContext("2d");
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 8, 0, 8, 16); }
    const tex = new (T().CanvasTexture)(c); tex.colorSpace = T().SRGBColorSpace; return tex;
  }

  F.buildVillage = function (scene) {
    const TH = T(); const houses = [];
    F.PROJECTS.forEach((p) => houses.push(buildHouse(scene, p)));
    F.EMPTY_PLOTS.forEach((e) => houses.push(buildSite(scene, e)));
    F.houses = houses; return houses;
  };

  function buildHouse(scene, p) {
    const TH = T(); const P = F.PAL;
    const g = new TH.Group();
    const [px, pz] = p.plot; g.position.set(px, 0, pz);
    // face the plaza (center)
    g.rotation.y = Math.atan2(-px, -pz);

    // ---- derive form from size + age ----
    const score = p.files * 0.4 + p.commits * 0.5 + p.lines / 650;
    const floors = Math.max(1, Math.min(4, Math.round(score / 24)));
    const w = 4.2 + Math.min(3.4, Math.sqrt(p.files) * 0.32);
    const dep = 4.0 + Math.min(2.8, Math.sqrt(p.files) * 0.26);
    const fh = 2.5; // floor height
    const wf = Math.max(0, Math.min(1, (p.daysIdle - 6) / 70)); // weather factor
    const stuc = P.stucco[p.stucco % P.stucco.length];
    const wallCol = weather(stuc.wall, wf), trimCol = weather(stuc.trim, wf);
    const shutCol = weather(P.shutter[p.id.length % P.shutter.length], wf * 0.6);
    const wallMat = F.mat(wallCol, { flat: true });
    const trimMat = F.mat(trimCol, { flat: true });

    // ---- floors ----
    let topY = 0;
    for (let f = 0; f < floors; f++) {
      const fw = w * (1 - f * 0.06), fd = dep * (1 - f * 0.06);
      const body = new TH.Mesh(new TH.BoxGeometry(fw, fh, fd), wallMat);
      body.position.y = fh / 2 + f * fh; body.castShadow = body.receiveShadow = true; g.add(body);
      // corner quoins / trim band at floor base
      const band = new TH.Mesh(new TH.BoxGeometry(fw + 0.06, 0.16, fd + 0.06), trimMat);
      band.position.y = f * fh + 0.08; g.add(band);
      // windows on front (+z) and sides
      const wins = f === 0 ? 1 : 2; // ground floor has door + maybe 1 window
      const y = f * fh + fh * 0.55;
      const closed = wf > 0.55 && (f + p.commits) % 2 === 0;
      if (f === 0) {
        // arched door centered front
        const door = arch(1.3, 2.0, 0.2, weather(P.woodDark, wf * 0.4));
        door.position.set(0, 0.02, fd / 2 + 0.02); g.add(door);
        const frame = new TH.Mesh(new TH.BoxGeometry(1.7, 2.4, 0.12), trimMat);
        frame.position.set(0, 1.15, fd / 2 - 0.02); g.add(frame);
        // a side window
        const wd = windowUnit(shutCol, closed); wd.position.set(fw * 0.3, y, fd / 2 + 0.07); g.add(wd);
      } else {
        for (let i = 0; i < wins; i++) {
          const wd = windowUnit(shutCol, closed);
          wd.position.set((i - (wins - 1) / 2) * 1.7, y, fd / 2 + 0.07); g.add(wd);
        }
      }
      // side windows
      [[-1, fw], [1, fw]].forEach(([sx]) => {
        const wd = windowUnit(shutCol, closed); wd.rotation.y = sx * Math.PI / 2;
        wd.position.set(sx * (fw / 2 + 0.07), y, 0); g.add(wd);
      });
      topY = (f + 1) * fh;
    }

    // ---- roof ----
    const sockets = [];
    if (p.roof === "gable") {
      const roof = gableRoof(w * 1.04, dep * 1.04, weather(P.roofTile[p.commits % 4], wf * 0.5));
      roof.position.y = topY; g.add(roof);
      // chimney for bigger / older
      if (floors >= 2) { const ch = chimney(weather(stuc.trim, wf)); ch.position.set(w * 0.28, topY + 0.4, -dep * 0.2); g.add(ch); }
      sockets.push(socket(0, topY + 1.0, 0, "roof"));
    } else {
      // flat roof: parapet + rooftop life
      const par = parapet(w * 1.04, dep * 1.04, trimMat); par.position.y = topY; g.add(par);
      const rg = new TH.Group(); rg.position.y = topY + 0.1;
      // rooftop pots + garden + water tank scale with development
      const r = F.rng(p.id.length * 97 + p.files);
      const tank = new TH.Mesh(new TH.CylinderGeometry(0.5, 0.5, 0.9, 10), F.mat(0xb9c6c0, { flat: true }));
      tank.position.set(-w * 0.28, 0.55, -dep * 0.25); tank.castShadow = true; rg.add(tank);
      for (let i = 0; i < 4; i++) { const pot = potMesh(); pot.position.set((r() - .5) * w * 0.7, 0, (r() - .5) * dep * 0.6); rg.add(pot); }
      g.add(rg);
      sockets.push(socket(0, topY + 0.5, 0, "roof"));
    }

    // ---- detail tier (more developed → more) ----
    if (floors >= 2) { // balcony on a front upper window
      const bal = balcony(weather(stuc.trim, wf), shutCol);
      bal.position.set(-w * 0.28, fh * 1.05, dep / 2 + 0.1); g.add(bal);
      sockets.push(socket(w * 0.28, fh * 1.55, dep / 2 + 0.3, "front"));
    }
    if (score > 40) { // awning over the door
      const aw = awning(P.awning[p.id.length % P.awning.length]); aw.position.set(0, 2.25, dep / 2 + 0.45); g.add(aw);
    }
    if (score > 70) { // string lights across the front
      g.add(stringLights(-w / 2, w / 2, 2.7, dep / 2 + 0.2));
    }
    sockets.push(socket(-w / 2 - 0.1, fh * 0.5, 0, "side"));

    // ---- age: ivy on very idle houses ----
    if (wf > 0.45) addIvy(g, w, dep, topY, wf, F.rng(p.files + 3));

    // ---- category flavor: a crest pennant on the roof ----
    const kind = F.KINDS[p.kind] || F.KINDS.workshop;
    const flag = crestFlag(kind.accent); flag.position.set(w * 0.34, topY + 0.6, dep * 0.2); g.add(flag);

    // ---- the estate signpost (physical plaque anchor) ----
    const signX = -w * 0.5 - 0.4, signZ = dep / 2 + 2.0;
    const sg = new TH.Group(); sg.position.set(signX, 0, signZ);
    const postH = 2.5;
    const post = new TH.Mesh(new TH.CylinderGeometry(0.09, 0.11, postH, 7), F.mat(0x7a5536, { flat: true }));
    post.position.y = postH / 2; post.castShadow = true; sg.add(post);
    const arm = new TH.Mesh(new TH.BoxGeometry(0.9, 0.1, 0.1), F.mat(0x6f4a2f, { flat: true }));
    arm.position.set(0.35, postH - 0.18, 0); sg.add(arm);
    // hanging board with the crest + name
    const board = new TH.Group(); board.position.set(0.7, postH - 0.95, 0);
    const accHex = "#" + kind.accent.toString(16).padStart(6, "0");
    const plank = new TH.Mesh(new TH.BoxGeometry(1.9, 1.0, 0.08),
      new TH.MeshStandardMaterial({ map: signTexture([
        { t: kind.glyph, s: 40, c: accHex }, { t: shortName(p.name), s: 22, c: "#3a2a18" },
      ], { bg: "#ead7b0" }), roughness: .85, flatShading: true }));
    plank.castShadow = true; board.add(plank);
    const frameB = new TH.Mesh(new TH.BoxGeometry(2.04, 1.14, 0.05), F.mat(0x6f4a2f, { flat: true }));
    frameB.position.z = -0.03; board.add(frameB);
    [-0.78, 0.78].forEach((dx) => { const ch = new TH.Mesh(new TH.BoxGeometry(0.04, 0.22, 0.04), F.mat(0x3a2e22, { flat: true })); ch.position.set(dx, 0.6, 0); board.add(ch); });
    sg.add(board); sg.userData.board = board;
    g.add(sg);

    scene.add(g);
    const r = Math.max(w, dep) * 0.62 + 1.4;
    F.colliders.push({ x: px, z: pz, r: r * 0.8 });
    g.updateMatrixWorld(true);
    const signWorld = new TH.Vector3(signX, postH + 0.15, signZ); g.localToWorld(signWorld);
    F.colliders.push({ x: signWorld.x, z: signWorld.z, r: 0.5 });
    return {
      project: p, group: g, x: px, z: pz, r, kind,
      tier: F.tier(p), board, signWorld,
      labelY: topY + 1.7, isSite: false,
    };
  }

  function shortName(n) { return n.length > 15 ? n.slice(0, 14) + "…" : n; }
  function crestFlag(accent) {
    const TH = T(); const g = new TH.Group();
    const pole = new TH.Mesh(new TH.CylinderGeometry(0.04, 0.04, 1.5, 6), F.mat(0x6f4a2f, { flat: true })); pole.position.y = 0.75; pole.castShadow = true; g.add(pole);
    const sh = new TH.Shape(); sh.moveTo(0, 0); sh.lineTo(0.62, -0.16); sh.lineTo(0.46, -0.34); sh.lineTo(0.62, -0.52); sh.lineTo(0, -0.42);
    const flag = new TH.Mesh(new TH.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), F.mat(accent, { flat: true }));
    flag.position.set(0, 1.42, 0); flag.castShadow = true; g.add(flag);
    const knob = new TH.Mesh(new TH.SphereGeometry(0.07, 8, 6), F.mat(0xe6c34a, { flat: true })); knob.position.y = 1.55; g.add(knob);
    return g;
  }

  // ---- piece factories ----------------------------------------------------
  function gableRoof(w, d, color) {
    const TH = T(); const g = new TH.Group();
    const shape = new TH.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, w * 0.42); shape.lineTo(-w / 2, 0);
    const geo = new TH.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    const roof = new TH.Mesh(geo, F.mat(color, { flat: true })); roof.castShadow = true; g.add(roof);
    const ridge = new TH.Mesh(new TH.BoxGeometry(0.18, 0.18, d + 0.1), F.mat(weather2(color), { flat: true }));
    ridge.position.y = w * 0.42; g.add(ridge);
    return g;
  }
  function weather2(c) { return new (T().Color)(c).offsetHSL(0, 0, -0.08).getHex(); }
  function parapet(w, d, mat) {
    const TH = T(); const g = new TH.Group(); const t = 0.22, h = 0.5;
    const segs = [[0, d / 2 - t / 2, w, t], [0, -d / 2 + t / 2, w, t], [w / 2 - t / 2, 0, t, d], [-w / 2 + t / 2, 0, t, d]];
    segs.forEach(([x, z, sw, sd]) => { const m = new TH.Mesh(new TH.BoxGeometry(sw, h, sd), mat); m.position.set(x, h / 2, z); m.castShadow = true; g.add(m); });
    return g;
  }
  function chimney(col) {
    const TH = T(); const g = new TH.Group();
    const b = new TH.Mesh(new TH.BoxGeometry(0.6, 1.2, 0.6), F.mat(col, { flat: true })); b.position.y = 0.6; b.castShadow = true; g.add(b);
    const cap = new TH.Mesh(new TH.BoxGeometry(0.8, 0.2, 0.8), F.mat(0x8a7a60, { flat: true })); cap.position.y = 1.25; g.add(cap);
    return g;
  }
  function balcony(railCol, plantCol) {
    const TH = T(); const g = new TH.Group();
    const slab = new TH.Mesh(new TH.BoxGeometry(1.8, 0.14, 0.9), F.mat(0xe6d8bd, { flat: true })); slab.castShadow = true; g.add(slab);
    const rail = F.mat(railCol, { flat: true });
    for (let i = -3; i <= 3; i++) { const bar = new TH.Mesh(new TH.BoxGeometry(0.06, 0.55, 0.06), rail); bar.position.set(i * 0.28, 0.3, 0.42); g.add(bar); }
    const top = new TH.Mesh(new TH.BoxGeometry(1.85, 0.07, 0.1), rail); top.position.set(0, 0.57, 0.42); g.add(top);
    const pl = new TH.Mesh(new TH.IcosahedronGeometry(0.26, 0), F.mat(0x7fa05f, { flat: true })); pl.position.set(0.6, 0.35, 0.3); g.add(pl);
    return g;
  }
  function awning(col) {
    const TH = T();
    const geo = new TH.BoxGeometry(1.9, 0.1, 0.95);
    const mat = new TH.MeshStandardMaterial({ map: stripeTexture("#f3e7d0", new TH.Color(col).getStyle()), roughness: .9, flatShading: true });
    const m = new TH.Mesh(geo, mat); m.rotation.x = 0.5; m.castShadow = true; return m;
  }
  function stringLights(x1, x2, y, z) {
    const TH = T(); const g = new TH.Group(); const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n; const x = x1 + (x2 - x1) * t; const sag = Math.sin(t * Math.PI) * 0.25;
      const b = new TH.Mesh(new TH.SphereGeometry(0.07, 6, 6), F.mat(0xffe0a0, { emissive: 0xffce80, emissiveIntensity: 1.2 }));
      b.position.set(x, y - sag, z); g.add(b);
    }
    return g;
  }
  function potMesh() {
    const TH = T(); const g = new TH.Group();
    const pot = new TH.Mesh(new TH.CylinderGeometry(0.22, 0.16, 0.34, 8), F.mat(F.PAL.pot, { flat: true })); pot.position.y = 0.17; g.add(pot);
    const b = new TH.Mesh(new TH.IcosahedronGeometry(0.28, 0), F.mat(0x82a262, { flat: true })); b.position.y = 0.48; g.add(b);
    return g;
  }
  function addIvy(g, w, d, topY, wf, r) {
    const TH = T(); const mat = F.mat(0x5c7a45, { flat: true });
    const n = Math.floor(8 + wf * 20);
    for (let i = 0; i < n; i++) {
      const leaf = new TH.Mesh(new TH.IcosahedronGeometry(0.18 + r() * 0.22, 0), mat);
      const face = Math.floor(r() * 4); const yy = r() * topY;
      if (face === 0) leaf.position.set((r() - .5) * w, yy, d / 2 + 0.05);
      else if (face === 1) leaf.position.set((r() - .5) * w, yy, -d / 2 - 0.05);
      else if (face === 2) leaf.position.set(w / 2 + 0.05, yy, (r() - .5) * d);
      else leaf.position.set(-w / 2 - 0.05, yy, (r() - .5) * d);
      g.add(leaf);
    }
  }
  function socket(x, y, z, type) { return { x, y, z, type }; }

  // ---- empty plot → construction site ------------------------------------
  function buildSite(scene, e) {
    const TH = T(); const g = new TH.Group(); const [px, pz] = e.plot; g.position.set(px, 0, pz);
    g.rotation.y = Math.atan2(-px, -pz);
    // foundation slab
    const slab = new TH.Mesh(new TH.BoxGeometry(5, 0.3, 5), F.mat(0xcdb89a, { flat: true })); slab.position.y = 0.15; slab.receiveShadow = true; g.add(slab);
    // scaffolding poles
    const pole = F.mat(0xa9844f, { flat: true });
    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([x, z]) => {
      const pl = new TH.Mesh(new TH.CylinderGeometry(0.08, 0.08, 3.4, 6), pole); pl.position.set(x, 1.7, z); pl.castShadow = true; g.add(pl);
    });
    [1.2, 2.4].forEach((y) => { const r = new TH.Mesh(new TH.BoxGeometry(4.2, 0.08, 0.08), pole); r.position.set(0, y, -2); g.add(r); const r2 = r.clone(); r2.position.z = 2; g.add(r2); });
    // tarp
    const tarp = new TH.Mesh(new TH.BoxGeometry(3, 1.4, 0.1), F.mat(0xdcae6a, { flat: true })); tarp.position.set(0, 1.7, -2); tarp.rotation.x = 0.05; g.add(tarp);
    // sign
    const sign = new TH.Mesh(new TH.BoxGeometry(2.4, 1.0, 0.1),
      new TH.MeshStandardMaterial({ map: signTexture([{ t: "EMPTY PLOT", s: 26, c: "#ffe6b8" }, { t: "press E to claim", s: 18, c: "#cdbfa3" }], { bg: "#3a2e1c" }), roughness: .9 }));
    sign.position.set(0, 1.3, 2.6); g.add(sign);
    const postL = new TH.Mesh(new TH.CylinderGeometry(0.06, 0.06, 1.6, 6), F.mat(0x6f4a2f, { flat: true })); postL.position.set(-1, 0.8, 2.6); g.add(postL);
    const postR = postL.clone(); postR.position.x = 1; g.add(postR);
    scene.add(g);
    F.colliders.push({ x: px, z: pz, r: 3.2 });
    return { project: null, site: e, group: g, x: px, z: pz, r: 4, labelY: 4, sockets: [], isSite: true, built: [] };
  }
})();
