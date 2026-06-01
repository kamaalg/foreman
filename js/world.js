// ── Foreman · world (environment + decor) ────────────────────────────────
window.F = window.F || {};
(function () {
  const T = () => window.THREE;

  // shared low-poly material
  F.mat = function (color, o = {}) {
    const { flat, ...rest } = o;
    return new (T().MeshStandardMaterial)(Object.assign(
      { color, roughness: 0.95, metalness: 0.0, flatShading: !!flat }, rest));
  };
  F.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  F.colliders = []; // {x,z,r}

  // ---- sky dome with vertical gradient -----------------------------------
  function skyTexture() {
    const c = document.createElement("canvas"); c.width = 8; c.height = 256;
    const g = c.getContext("2d").createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, "#9fd0db");
    g.addColorStop(0.45, "#c3e2e8");
    g.addColorStop(0.78, "#eaddc6");
    g.addColorStop(1.0, "#f4e8d2");
    const ctx = c.getContext("2d"); ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
    const tex = new (T().CanvasTexture)(c); tex.colorSpace = T().SRGBColorSpace; return tex;
  }

  F.buildWorld = function (scene) {
    const TH = T(); const P = F.PAL; const updaters = [];

    scene.background = new TH.Color(P.sky);
    scene.fog = new TH.Fog(P.horizon, 115, 320);

    // sky dome
    const sky = new TH.Mesh(
      new TH.SphereGeometry(400, 24, 16),
      new TH.MeshBasicMaterial({ map: skyTexture(), side: TH.BackSide, fog: false }));
    scene.add(sky);

    // ---- lights ----------------------------------------------------------
    const hemi = new TH.HemisphereLight(0xdfeef0, 0xb59a72, 0.9);
    scene.add(hemi);
    const sun = new TH.DirectionalLight(P.sun, 2.0);
    sun.position.set(-46, 70, 38);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const d = 60; const cam = sun.shadow.camera;
    cam.left = -d; cam.right = d; cam.top = d; cam.bottom = -d; cam.near = 1; cam.far = 220;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    scene.add(sun);
    scene.add(new TH.AmbientLight(0xfff1d8, 0.25));

    // ---- ground (sand) ---------------------------------------------------
    const ground = new TH.Mesh(
      new TH.PlaneGeometry(520, 520, 1, 1),
      F.mat(P.sand, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);

    // gentle darker sand patch under the village to ground it visually
    const patch = new TH.Mesh(new TH.CircleGeometry(70, 40), F.mat(P.sandDark, { roughness: 1 }));
    patch.rotation.x = -Math.PI / 2; patch.position.y = 0.02; patch.receiveShadow = true;
    scene.add(patch);

    // ---- sea (to the south, +z) -----------------------------------------
    const seaZ = 58;
    const seaGeo = new TH.PlaneGeometry(520, 240, 60, 28);
    const sea = new TH.Mesh(seaGeo, F.mat(P.sea, {
      flat: true, roughness: 0.35, metalness: 0.0,
      transparent: true, opacity: 0.96, emissive: new TH.Color(P.seaDeep), emissiveIntensity: 0.18,
    }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.18, seaZ + 120);
    sea.receiveShadow = false; scene.add(sea);
    const base = seaGeo.attributes.position.array.slice();
    let seaTick = 0;
    updaters.push((t) => {
      // throttle to every 3rd frame; flat-shaded water needs no normal recompute
      if (seaTick++ % 3 !== 0) return;
      const a = seaGeo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i], y = base[i + 1];
        a[i + 2] = Math.sin(x * 0.05 + t * 0.9) * 0.5 + Math.cos(y * 0.07 + t * 0.7) * 0.4;
      }
      seaGeo.attributes.position.needsUpdate = true;
    });

    // beach: lighter wet-sand band where land meets water
    const beach = new TH.Mesh(new TH.PlaneGeometry(520, 26), F.mat(0xe8dcc0, { roughness: 1 }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.015, seaZ - 6); scene.add(beach);
    // foam line
    const foam = new TH.Mesh(new TH.PlaneGeometry(520, 3.4), F.mat(P.foam, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.05 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.05, seaZ - 0.5); scene.add(foam);

    // a low harbor wall along the waterline
    const harbor = new TH.Mesh(new TH.BoxGeometry(520, 1.1, 1.6), F.mat(P.stone, { flat: true }));
    harbor.position.set(0, 0.55, seaZ - 2.2); harbor.castShadow = harbor.receiveShadow = true; scene.add(harbor);

    // ---- central plaza + fountain ---------------------------------------
    const plaza = new TH.Mesh(new TH.CircleGeometry(13, 48), cobbleMat());
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.03; plaza.receiveShadow = true; scene.add(plaza);
    scene.add(makeFountain(0, 0)); F.colliders.push({ x: 0, z: 0, r: 3.4 });

    // scatter cobble plaza stones for texture
    scatterStones(scene, 0, 0, 12, 90);

    // ---- decorate around projects ---------------------------------------
    const grp = new TH.Group();
    const proj = F.PROJECTS;
    // paths from plaza to each plot
    proj.forEach((p) => grp.add(makePath(0, 0, p.plot[0], p.plot[1])));

    // trees, pots, lamps, benches scattered with a seeded rng
    const r = F.rng(20260530);
    const spots = [];
    function freeSpot(minD) {
      for (let k = 0; k < 30; k++) {
        const a = r() * Math.PI * 2, rad = 8 + r() * 44;
        const x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.82 - 4;
        if (z > seaZ - 12) continue;
        let ok = true;
        for (const c of F.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + minD) { ok = false; break; }
        for (const s of spots) if (Math.hypot(x - s[0], z - s[1]) < 4) { ok = false; break; }
        if (ok) { spots.push([x, z]); return [x, z]; }
      }
      return null;
    }
    // cypress (tall accents)
    for (let i = 0; i < 14; i++) { const s = freeSpot(2.4); if (s) { grp.add(makeCypress(s[0], s[1], r)); F.colliders.push({ x: s[0], z: s[1], r: 1.0 }); } }
    // olive trees
    for (let i = 0; i < 12; i++) { const s = freeSpot(2.8); if (s) { grp.add(makeOlive(s[0], s[1], r)); F.colliders.push({ x: s[0], z: s[1], r: 1.2 }); } }
    // lamp posts near plaza ring
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const x = Math.cos(a) * 15.5, z = Math.sin(a) * 13; grp.add(makeLamp(x, z)); }
    // benches around plaza
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const x = Math.cos(a) * 10, z = Math.sin(a) * 9; grp.add(makeBench(x, z, a)); }
    // potted plants ring the fountain
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; grp.add(makePot(Math.cos(a) * 4.2, Math.sin(a) * 4.2)); }
    // low stone walls bordering a couple of plots
    grp.add(makeWall(-30, 18, 12, 0)); grp.add(makeWall(30, 20, 10, 0.3));
    // a few boats on the water
    for (let i = 0; i < 4; i++) grp.add(makeBoat(-30 + i * 20 + r() * 6, seaZ + 8 + r() * 14, r));

    // ---- the kingdom's grand banner (centerpiece behind the fountain) ---
    const flag = makeKingdomFlag(0, -7, (window.F.OWNER || "Your").toString());
    grp.add(flag.group); F.colliders.push({ x: 0, z: -7, r: 1.3 });
    updaters.push((t) => { flag.banner.rotation.y = Math.sin(t * 0.6) * 0.07; });

    // ════════ KINGDOM WOW — horizon, landmark, density, life ════════
    // close the empty horizon with the city of your users (solid, grows with reach)
    grp.add(makeHorizon());
    for (let i = 0; i < 16; i++) { const cy = makeCypress(-78 + i * 10 + r() * 4, -72 - (i % 2) * 7, r); cy.traverse((o) => { o.castShadow = false; }); grp.add(cy); }
    // signature landmark: clifftop lighthouse with an emissive rotating beacon (NO spotlight)
    const lh = makeLighthouse(); grp.add(lh.group);
    updaters.push((t) => { lh.beacon.rotation.y = t * 0.55; });
    // density fill so the eye never lands on bare sand
    for (let i = 0; i < 12; i++) { const s = freeSpot(2.0); if (s) grp.add(makeRock(s[0], s[1], r)); }
    for (let i = 0; i < 11; i++) grp.add(makePalm(-58 + i * 11 + r() * 5, 49 + r() * 5, r));
    for (let i = 0; i < 22; i++) { const s = freeSpot(1.5); if (s) grp.add(makeBush(s[0], s[1], r)); }
    // the Chronicle Wall — one slab per real project, newest = tallest (honest momentum)
    grp.add(makeChronicleWall());
    // life on the single shared updaters loop (no per-frame traverse)
    const gulls = [];
    for (let i = 0; i < 6; i++) { const b = makeGull(); grp.add(b); gulls.push({ m: b, ph: r() * 6, rx: 16 + r() * 16, rz: 8 + r() * 8, cx: -14 + r() * 44, cz: 62 + r() * 12, sp: 0.25 + r() * 0.2 }); }
    const smoke = [];
    for (const p of (F.PROJECTS || []).slice(0, 8)) for (let k = 0; k < 2; k++) { const q = new TH.Mesh(new TH.PlaneGeometry(0.55, 0.55), new TH.MeshBasicMaterial({ color: 0xcfc6b8, transparent: true, opacity: 0.3, depthWrite: false })); q.rotation.x = -0.5; q.position.set(p.plot[0] + 0.6, 4, p.plot[1] - 0.6); q.userData.s = { base: 4, ph: r() * 2.2 }; grp.add(q); smoke.push(q); }
    const cart = makeCart(); grp.add(cart.group);
    updaters.push((t) => {
      for (const g of gulls) { const a = t * g.sp + g.ph; g.m.position.set(g.cx + Math.cos(a) * g.rx, 12 + Math.sin(a * 1.3) * 2, g.cz + Math.sin(a) * g.rz); g.m.rotation.y = -a + Math.PI / 2; const f = Math.sin(t * 8 + g.ph) * 0.6; if (g.m.userData.w) { g.m.userData.w.l.rotation.z = f; g.m.userData.w.r.rotation.z = -f; } }
      for (const q of smoke) { const pr = ((t * 0.4 + q.userData.s.ph) % 2.2) / 2.2; q.position.y = q.userData.s.base + pr * 2.4; q.material.opacity = 0.3 * (1 - pr); const sc = 0.5 + pr * 1.3; q.scale.set(sc, sc, sc); }
      const T2 = 20, fr = (t % T2) / T2, wps = [[-20, 26], [20, 26], [0, 40]], seg = Math.floor(fr * 3), sp = (fr * 3) % 1, a0 = wps[seg], a1 = wps[(seg + 1) % 3];
      cart.group.position.set(a0[0] + (a1[0] - a0[0]) * sp, 0, a0[1] + (a1[1] - a0[1]) * sp);
      cart.group.rotation.y = Math.atan2(a1[0] - a0[0], a1[1] - a0[1]); cart.wheels.forEach((w) => { w.rotation.x = t * 4; });
    });

    scene.add(grp);

    return { update(t) { updaters.forEach((u) => u(t)); } };
  };

  // ---- decor factories ---------------------------------------------------
  function cobbleMat() { return F.mat(F.PAL.cobble, { roughness: 1 }); }

  // The kingdom's grand flag: stone plinth + tall pole + gold finial + a
  // heraldic banner whose canvas texture reads "KINGDOM OF <owner>".
  function bannerTexture(owner) {
    const TH = T();
    const c = document.createElement("canvas"); c.width = 320; c.height = 440;
    const x = c.getContext("2d"); const W = c.width, H = c.height, pad = 20;
    x.clearRect(0, 0, W, H);
    // banner silhouette (rounded top, swallowtail bottom)
    x.fillStyle = "#b4572f";
    x.beginPath();
    x.moveTo(pad, pad + 12); x.quadraticCurveTo(pad, pad, pad + 14, pad);
    x.lineTo(W - pad - 14, pad); x.quadraticCurveTo(W - pad, pad, W - pad, pad + 12);
    x.lineTo(W - pad, H - 78); x.lineTo(W / 2, H - 24); x.lineTo(pad, H - 78);
    x.closePath(); x.fill();
    x.strokeStyle = "#efe2c6"; x.lineWidth = 7; x.stroke();
    // crest disc with the owner's initial
    x.fillStyle = "#efe2c6"; x.beginPath(); x.arc(W / 2, 112, 44, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#b4572f"; x.font = "bold 52px Georgia, 'Times New Roman', serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText((owner[0] || "?").toUpperCase(), W / 2, 116);
    // titles
    x.fillStyle = "#f6ecd8";
    x.font = "600 26px Georgia, serif"; x.fillText("KINGDOM OF", W / 2, 214);
    let name = owner.toUpperCase().slice(0, 12);
    x.font = "bold 50px Georgia, serif";
    while (x.measureText(name).width > W - 2 * pad - 16 && name.length > 2) { x.font = `bold ${parseInt(x.font) - 4}px Georgia, serif`; }
    x.fillText(name, W / 2, 262);
    // a couple of small stars
    x.font = "20px Georgia, serif"; x.fillText("✦", W / 2 - 70, 320); x.fillText("✦", W / 2 + 70, 320);
    const tex = new TH.CanvasTexture(c); tex.anisotropy = 4;
    if (TH.SRGBColorSpace) tex.colorSpace = TH.SRGBColorSpace;
    return tex;
  }

  function makeKingdomFlag(x, z, owner) {
    const TH = T(); const P = F.PAL; const g = new TH.Group(); g.position.set(x, 0, z);
    const plinth = new TH.Mesh(new TH.CylinderGeometry(1.6, 1.95, 0.55, 8), F.mat(P.stone, { flat: true }));
    plinth.position.y = 0.28; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
    const plinth2 = new TH.Mesh(new TH.CylinderGeometry(1.15, 1.4, 0.5, 8), F.mat(0xbfa882, { flat: true }));
    plinth2.position.y = 0.72; plinth2.castShadow = true; g.add(plinth2);
    const pole = new TH.Mesh(new TH.CylinderGeometry(0.15, 0.19, 11, 10), F.mat(P.woodDark, { flat: true }));
    pole.position.y = 6.1; pole.castShadow = true; g.add(pole);
    const finial = new TH.Mesh(new TH.SphereGeometry(0.42, 12, 10), F.mat(0xd6a85f, { flat: true, emissive: 0x6f4a2f, emissiveIntensity: 0.18 }));
    finial.position.y = 11.7; g.add(finial);
    const banner = new TH.Mesh(
      new TH.PlaneGeometry(4.5, 6.1),
      new TH.MeshStandardMaterial({ map: bannerTexture(owner), transparent: true, roughness: 0.85, metalness: 0, side: TH.DoubleSide }),
    );
    banner.position.set(0, 7.4, 0.14); banner.castShadow = false; g.add(banner);
    return { group: g, banner };
  }

  function scatterStones(scene, cx, cz, rad, n) {
    const TH = T(); const r = F.rng(7);
    const geo = new TH.BoxGeometry(1, 0.08, 1);
    const m1 = F.mat(0xcdba94, { flat: true }), m2 = F.mat(0xc2ad84, { flat: true });
    const mesh = new TH.InstancedMesh(geo, [m1], 0); // not used; do plain
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = r() * rad;
      const s = new TH.Mesh(geo, r() > 0.5 ? m1 : m2);
      s.scale.set(0.5 + r() * 0.9, 1, 0.5 + r() * 0.9);
      s.position.set(cx + Math.cos(a) * d, 0.04, cz + Math.sin(a) * d);
      s.rotation.y = r() * Math.PI; s.receiveShadow = true; scene.add(s);
    }
  }

  function makeFountain(x, z) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const stone = F.mat(F.PAL.stone, { flat: true });
    const basin = new TH.Mesh(new TH.CylinderGeometry(3.1, 3.4, 0.9, 20), stone);
    basin.position.y = 0.45; basin.castShadow = basin.receiveShadow = true; g.add(basin);
    const lip = new TH.Mesh(new TH.TorusGeometry(3.1, 0.18, 8, 20), F.mat(0xbfa882, { flat: true }));
    lip.rotation.x = Math.PI / 2; lip.position.y = 0.9; g.add(lip);
    const water = new TH.Mesh(new TH.CylinderGeometry(2.85, 2.85, 0.2, 20),
      F.mat(F.PAL.sea, { roughness: .3, transparent: true, opacity: .9, emissive: F.PAL.seaDeep, emissiveIntensity: .2 }));
    water.position.y = 0.82; g.add(water);
    const col = new TH.Mesh(new TH.CylinderGeometry(0.4, 0.55, 1.7, 12), stone);
    col.position.y = 1.4; col.castShadow = true; g.add(col);
    const top = new TH.Mesh(new TH.CylinderGeometry(0.9, 0.55, 0.35, 12), F.mat(0xbfa882, { flat: true }));
    top.position.y = 2.3; g.add(top);
    return g;
  }

  function makeCypress(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const trunk = new TH.Mesh(new TH.CylinderGeometry(0.16, 0.22, 1.2, 6), F.mat(F.PAL.woodDark, { flat: true }));
    trunk.position.y = 0.6; trunk.castShadow = true; g.add(trunk);
    const h = 3.4 + r() * 2.2;
    const body = new TH.Mesh(new TH.ConeGeometry(0.95, h, 7), F.mat(F.PAL.foliageCypress, { flat: true }));
    body.position.y = 1.0 + h / 2; body.castShadow = true; g.add(body);
    const cap = new TH.Mesh(new TH.ConeGeometry(0.55, h * 0.5, 7), F.mat(F.PAL.foliageDark, { flat: true }));
    cap.position.y = 1.0 + h * 0.78; g.add(cap);
    g.scale.setScalar(0.9 + r() * 0.4); return g;
  }

  function makeOlive(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const trunk = new TH.Mesh(new TH.CylinderGeometry(0.18, 0.26, 1.0, 6), F.mat(0x8a6b4a, { flat: true }));
    trunk.position.y = 0.5; trunk.castShadow = true; g.add(trunk);
    const leaf = F.mat(F.PAL.foliageOlive, { flat: true });
    for (let i = 0; i < 4; i++) {
      const b = new TH.Mesh(new TH.IcosahedronGeometry(0.75 + r() * 0.35, 0), leaf);
      b.position.set((r() - .5) * 1.1, 1.3 + r() * 0.7, (r() - .5) * 1.1);
      b.castShadow = true; g.add(b);
    }
    g.scale.setScalar(0.85 + r() * 0.4); return g;
  }

  function makePot(x, z) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const pot = new TH.Mesh(new TH.CylinderGeometry(0.32, 0.24, 0.5, 8), F.mat(F.PAL.pot, { flat: true }));
    pot.position.y = 0.25; pot.castShadow = true; g.add(pot);
    const bush = new TH.Mesh(new TH.IcosahedronGeometry(0.42, 0), F.mat(0x7fa05f, { flat: true }));
    bush.position.y = 0.7; bush.castShadow = true; g.add(bush);
    return g;
  }

  function makeLamp(x, z) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const post = new TH.Mesh(new TH.CylinderGeometry(0.08, 0.11, 3, 8), F.mat(0x4a3a2c, { flat: true }));
    post.position.y = 1.5; post.castShadow = true; g.add(post);
    const head = new TH.Mesh(new TH.BoxGeometry(0.42, 0.5, 0.42), F.mat(0x3a2e22, { flat: true }));
    head.position.y = 3.15; g.add(head);
    const glow = new TH.Mesh(new TH.BoxGeometry(0.26, 0.32, 0.26),
      F.mat(0xffd98a, { emissive: 0xffcf7a, emissiveIntensity: 1.1 }));
    glow.position.y = 3.12; g.add(glow);
    return g;
  }

  function makeBench(x, z, rot) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const wood = F.mat(0x9c6b43, { flat: true });
    const seat = new TH.Mesh(new TH.BoxGeometry(1.8, 0.12, 0.5), wood); seat.position.y = 0.5; seat.castShadow = true; g.add(seat);
    const back = new TH.Mesh(new TH.BoxGeometry(1.8, 0.5, 0.1), wood); back.position.set(0, 0.78, -0.2); g.add(back);
    [-0.75, 0.75].forEach((dx) => { const l = new TH.Mesh(new TH.BoxGeometry(0.12, 0.5, 0.45), F.mat(0x6f4a2f, { flat: true })); l.position.set(dx, 0.25, 0); g.add(l); });
    return g;
  }

  function makePath(x1, z1, x2, z2) {
    const TH = T(); const g = new TH.Group();
    const dx = x2 - x1, dz = z2 - z1; const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const strip = new TH.Mesh(new TH.PlaneGeometry(len, 2.6), F.mat(F.PAL.cobble, { roughness: 1 }));
    strip.rotation.x = -Math.PI / 2; strip.rotation.z = -ang;
    strip.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2); strip.receiveShadow = true; g.add(strip);
    return g;
  }

  function makeWall(x, z, len, rot) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const mat = F.mat(F.PAL.stone, { flat: true });
    const base = new TH.Mesh(new TH.BoxGeometry(len, 0.9, 0.5), mat); base.position.y = 0.45; base.castShadow = base.receiveShadow = true; g.add(base);
    const n = Math.floor(len / 1.2);
    for (let i = 0; i <= n; i++) {
      const cap = new TH.Mesh(new TH.BoxGeometry(0.5, 0.4, 0.7), F.mat(0xbfa882, { flat: true }));
      cap.position.set(-len / 2 + i * (len / n), 1.0, 0); g.add(cap);
    }
    return g;
  }

  function makeBoat(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, -0.05, z); g.rotation.y = r() * Math.PI;
    const hull = new TH.Mesh(new TH.BoxGeometry(2.6, 0.5, 1.0), F.mat(r() > .5 ? 0xc96f54 : 0xeae0cc, { flat: true }));
    hull.position.y = 0.3; hull.castShadow = true; g.add(hull);
    const mast = new TH.Mesh(new TH.CylinderGeometry(0.05, 0.05, 2, 6), F.mat(0x6f4a2f, { flat: true })); mast.position.y = 1.3; g.add(mast);
    g.userData.bob = { base: -0.05, t: r() * 6 };
    return g;
  }

  // ════════ KINGDOM WOW factories ════════
  // The horizon is a CITY OF YOUR USERS — a ring of distant towers whose lit
  // windows are the people your projects reached. It grows with your total
  // commits (your reach), and its towers are solid (colliders) so they bound
  // the kingdom. Far out → outside the shadow frustum → near-zero shadow cost.
  function makeHorizon() {
    const TH = T(); const g = new TH.Group(); const rr = F.rng(7);
    const reach = (F.PROJECTS || []).reduce((s, p) => s + (p.commits || 0), 0);
    const richness = Math.min(1, Math.log10(reach + 1) / 3); // 0..1 by total commits
    const N = Math.round(34 + richness * 30);
    // a vivid, varied skyline — many cultures of users, each its own colour
    const hues = [0xc96f54, 0x4f8a9c, 0xd6a85f, 0x8a6f9c, 0x6f9460, 0xc25b7a, 0x4f6f8a, 0xd98a4a, 0x5a9c8a, 0xb0567a, 0x7a8ad9, 0xd9a83f];
    const winHues = [0xffd98a, 0xff9e6a, 0x9ad8ff, 0xffe9a8, 0xff7aa8, 0xaaffd0];
    const capMat = [F.mat(0x4a3a52, { flat: true }), F.mat(0x6b4a3a, { flat: true }), F.mat(0x3a5a55, { flat: true })];
    const winMats = winHues.map((c) => new TH.MeshStandardMaterial({ color: 0x1a1410, emissive: c, emissiveIntensity: 1.3 }));
    for (let i = 0; i < N; i++) {
      const ang = rr() * Math.PI * 2, rad = 80 + rr() * 30;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad - 6;
      if (z > 44) continue; // leave the southern sea open
      const w = 4 + rr() * 7, d = 4 + rr() * 7, h = 9 + richness * 16 + rr() * 28;
      const baseCol = hues[(rr() * hues.length) | 0];
      const tower = new TH.Mesh(new TH.BoxGeometry(w, h, d), F.mat(baseCol, { flat: true }));
      tower.position.set(x, h / 2 - 2, z); tower.castShadow = tower.receiveShadow = false; g.add(tower);
      const roll = rr();
      if (roll < 0.33) { const cap = new TH.Mesh(new TH.ConeGeometry(Math.max(w, d) * 0.7, 3 + rr() * 5, 4), capMat[(rr() * 3) | 0]); cap.position.set(x, h - 2 + 1.9, z); cap.rotation.y = Math.PI / 4; cap.castShadow = false; g.add(cap); }
      else if (roll < 0.55) { const dome = new TH.Mesh(new TH.SphereGeometry(Math.max(w, d) * 0.5, 8, 6, 0, 6.3, 0, Math.PI / 2), F.mat(0xe7d8be, { flat: true })); dome.position.set(x, h - 2, z); dome.castShadow = false; g.add(dome); }
      const wm = winMats[(rr() * winMats.length) | 0];
      const floors = Math.min(9, Math.floor(h / 2.4));
      for (let f = 1; f < floors; f++) {
        if (rr() < 0.4) continue; // some windows dark
        const win = new TH.Mesh(new TH.BoxGeometry(w * 0.86, 0.42, d * 0.86), wm);
        win.position.set(x, f * 2.4 - 2, z); g.add(win);
      }
      F.colliders.push({ x, z, r: Math.max(w, d) * 0.62 }); // solid — you can't walk through them
    }
    return g;
  }

  function makeLighthouse() {
    const TH = T(); const g = new TH.Group(); g.position.set(-30, 0, -80);
    const cliffMat = F.mat(0x9a8c78, { flat: true });
    for (let i = 0; i < 3; i++) { const s = 16 - i * 3.5; const b = new TH.Mesh(new TH.BoxGeometry(s, 6, s), cliffMat); b.position.y = i * 5; b.castShadow = false; b.receiveShadow = false; g.add(b); }
    let y = 14;
    const cream = F.mat(0xf3e7d0, { flat: true }), stripe = F.mat(0xc4663a, { flat: true });
    for (let i = 0; i < 4; i++) { const rB = 2.3 - i * 0.3, rTp = 2.1 - i * 0.3, h = 4.2; const m = new TH.Mesh(new TH.CylinderGeometry(rTp, rB, h, 12), i % 2 ? stripe : cream); m.position.y = y + h / 2; m.castShadow = false; g.add(m); y += h; }
    const ring = new TH.Mesh(new TH.CylinderGeometry(1.7, 1.7, 0.6, 12), F.mat(0xb4572f, { flat: true })); ring.position.y = y + 0.3; g.add(ring);
    const lantern = new TH.Mesh(new TH.CylinderGeometry(1.2, 1.2, 2.2, 12), F.mat(0xfff3d0, { flat: true, emissive: 0xffdf9e, emissiveIntensity: 0.7 })); lantern.position.y = y + 1.7; g.add(lantern);
    const cap = new TH.Mesh(new TH.ConeGeometry(1.6, 2, 12), F.mat(0x5a4a3a, { flat: true })); cap.position.y = y + 3.8; g.add(cap);
    const glow = new TH.Mesh(new TH.SphereGeometry(0.7, 10, 8), new TH.MeshBasicMaterial({ color: 0xffe9a8 })); glow.position.y = y + 1.7; g.add(glow);
    const beacon = new TH.Group(); beacon.position.y = y + 1.7; g.add(beacon);
    const beam = new TH.Mesh(new TH.ConeGeometry(2.4, 22, 4, 1, true), new TH.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.16, depthWrite: false, side: TH.DoubleSide }));
    beam.rotation.z = Math.PI / 2; beam.position.x = 11; beacon.add(beam);
    return { group: g, beacon };
  }

  function makeRock(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const m = F.mat(0x9a8c78, { flat: true });
    for (let i = 0; i < 3; i++) { const s = 0.6 + r() * 1.1; const b = new TH.Mesh(new TH.BoxGeometry(s, s * 0.8, s), m); b.position.set((r() - .5) * 1.2, s * 0.4, (r() - .5) * 1.2); b.rotation.set(r(), r() * 6, r()); b.castShadow = false; b.receiveShadow = true; g.add(b); }
    return g;
  }

  function makePalm(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const h = 4 + r() * 2;
    const trunk = new TH.Mesh(new TH.CylinderGeometry(0.18, 0.32, h, 7), F.mat(0x8a6a44, { flat: true })); trunk.position.y = h / 2; trunk.castShadow = false; g.add(trunk);
    for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; const fr = new TH.Mesh(new TH.BoxGeometry(2.4, 0.12, 0.5), F.mat(i % 2 ? 0x3c6b46 : 0x4f7d52, { flat: true })); fr.position.set(Math.cos(ang) * 1.1, h, Math.sin(ang) * 1.1); fr.rotation.y = -ang; fr.rotation.z = -0.45; fr.castShadow = false; g.add(fr); }
    return g;
  }

  function makeBush(x, z, r) {
    const TH = T(); const g = new TH.Group(); g.position.set(x, 0, z);
    const cols = [0xd98aa0, 0xc9849c, 0x9c84b0, 0x7d9460];
    const dome = new TH.Mesh(new TH.SphereGeometry(0.5 + r() * 0.3, 5, 4), F.mat(cols[Math.floor(r() * cols.length)], { flat: true }));
    dome.position.y = 0.5; dome.scale.y = 0.78; dome.castShadow = false; g.add(dome);
    return g;
  }

  function makeChronicleWall() {
    const TH = T(); const g = new TH.Group();
    const ps = (F.PROJECTS || []).slice().sort((a, b) => (a.daysIdle || 0) - (b.daysIdle || 0));
    const n = ps.length, sx = -(n - 1) * 2.7 / 2;
    ps.forEach((p, i) => {
      const fresh = Math.max(0, 1 - (p.daysIdle || 0) / 120), h = 2 + fresh * 4.5;
      const col = new TH.Color(0x7d8a6a).lerp(new TH.Color(0x9fb46a), fresh).getHex();
      const slab = new TH.Mesh(new TH.BoxGeometry(2.1, h, 0.6), F.mat(col, { flat: true })); slab.position.set(sx + i * 2.7, h / 2, -46); slab.castShadow = false; slab.receiveShadow = true; g.add(slab);
      const cap = new TH.Mesh(new TH.BoxGeometry(2.3, 0.3, 0.8), F.mat(0xcdb89a, { flat: true })); cap.position.set(sx + i * 2.7, h + 0.15, -46); g.add(cap);
    });
    return g;
  }

  function makeGull() {
    const TH = T(); const g = new TH.Group(); const m = F.mat(0xf3efe6, { flat: true });
    g.add(new TH.Mesh(new TH.BoxGeometry(0.5, 0.16, 0.22), m));
    const wl = new TH.Mesh(new TH.BoxGeometry(0.7, 0.06, 0.3), m); wl.geometry.translate(-0.35, 0, 0); wl.position.x = -0.2; g.add(wl);
    const wr = new TH.Mesh(new TH.BoxGeometry(0.7, 0.06, 0.3), m); wr.geometry.translate(0.35, 0, 0); wr.position.x = 0.2; g.add(wr);
    g.userData.w = { l: wl, r: wr };
    return g;
  }

  function makeCart() {
    const TH = T(); const g = new TH.Group();
    const body = F.mat(0x8a7a66, { flat: true });
    const donkey = new TH.Mesh(new TH.BoxGeometry(1.1, 0.7, 0.5), body); donkey.position.set(0, 0.9, 0.8); donkey.castShadow = false; g.add(donkey);
    const head = new TH.Mesh(new TH.BoxGeometry(0.4, 0.5, 0.4), body); head.position.set(0, 1.2, 1.4); g.add(head);
    const bed = new TH.Mesh(new TH.BoxGeometry(1.4, 0.3, 1.0), F.mat(0x6f4a2f, { flat: true })); bed.position.set(0, 0.8, -0.6); g.add(bed);
    const goods = new TH.Mesh(new TH.BoxGeometry(0.5, 0.5, 0.5), F.mat(0xc96f54, { flat: true })); goods.position.set(0, 1.15, -0.6); g.add(goods);
    const wheels = [];
    for (const wx of [-0.6, 0.6]) { const w = new TH.Mesh(new TH.CylinderGeometry(0.35, 0.35, 0.12, 10), F.mat(0x4a3526, { flat: true })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.35, -0.6); g.add(w); wheels.push(w); }
    return { group: g, wheels };
  }
})();
