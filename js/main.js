// ── Foreman · main (kingdom loop, roam, approach, tour) ──────────────────
(function () {
  const TH = THREE;

  const host = document.getElementById("scene");
  const renderer = new TH.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = TH.PCFShadowMap;
  renderer.outputColorSpace = TH.SRGBColorSpace;
  renderer.toneMapping = TH.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);
  F.renderer = renderer;

  const scene = new TH.Scene();
  const camera = new TH.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 700);
  camera.position.set(0, 8.2, 28.5);

  const world = F.buildWorld(scene);
  const houses = F.buildVillage(scene);
  const player = F.makePlayer(scene); F.player = player;
  const npcs = F.makeNPCs(scene, 6);
  const rig = F.makeRig(camera);
  F.Plaques.init(houses);
  F.Readme.init();
  F.Interior.init(scene);

  // Collect bobbing props ONCE (avoids a full scene-graph traverse every frame).
  const bobbers = [];
  scene.traverse((o) => { if (o.userData && o.userData.bob) bobbers.push(o); });

  // Kingdom score (0-100 + Bronze/Silver/Gold) — honest, from real project data.
  const KS = (function () {
    const P = F.PROJECTS || []; if (!P.length) return { score: 0, tier: "Bronze" };
    const commits = P.reduce((s, p) => s + (p.commits || 0), 0);
    const files = P.reduce((s, p) => s + (p.files || 0), 0);
    const recent = P.filter((p) => (p.daysIdle == null ? 999 : p.daysIdle) < 30).length / P.length;
    const kinds = new Set(P.map((p) => p.kind)).size;
    const breadth = Math.min(P.length / 9, 1);
    const activity = Math.min(Math.log10(commits + 1) / 3, 1);
    const volume = Math.min(Math.log10(files + 1) / 4, 1);
    const diversity = Math.min(kinds / 6, 1);
    const score = Math.round(100 * (0.22 * breadth + 0.28 * activity + 0.22 * recent + 0.16 * volume + 0.12 * diversity));
    const tier = score >= 80 ? "Gold" : score >= 55 ? "Silver" : "Bronze";
    return { score, tier };
  })();
  F.KINGDOM_SCORE = KS;
  const crown = KS.tier === "Gold" ? "👑" : KS.tier === "Silver" ? "🥈" : "🥉";
  document.getElementById("dockTxt").textContent = `${F.PROJECTS.length} estates · ${crown} ${KS.tier} · ${KS.score}/100`;
  const fade = document.getElementById("fade");
  const prompt = document.getElementById("prompt");
  const elHud = document.getElementById("hud"), elDock = document.getElementById("dock");

  F.state = F.state || {}; F.state.mode = "roam";

  // ---- input -------------------------------------------------------------
  const keys = {};
  addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase(); keys[k] = true;
    if (F.state.mode === "tour") {
      if (k === "escape") F.exitEstate(); // WASD falls through to keys[] for the first-person walk
      return;
    }
    if (k === "e") tryEnter();
    if (k === "m") toggleMap();
    if (k === "v") toggleView();
    if (k === "escape" && rig.fp) toggleView();
    if (k === "escape" && rig.overview) toggleMap();
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  let down = null; const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { if (F.state.mode !== "roam" && F.state.mode !== "tour") return; down = { x: e.clientX, y: e.clientY, moved: false }; rig.onDown(e.clientX, e.clientY); });
  addEventListener("pointermove", (e) => { if (down) { if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) down.moved = true; rig.onMove(e.clientX, e.clientY); } });
  addEventListener("pointerup", () => { rig.onUp(); down = null; });
  cv.addEventListener("wheel", (e) => { if (F.state.mode === "roam") { rig.onWheel(e.deltaY); e.preventDefault(); } }, { passive: false });
  // first-person comfort: click to capture the mouse, then move freely to look around
  cv.addEventListener("click", () => { if (rig.fp && document.pointerLockElement !== cv) cv.requestPointerLock(); });
  addEventListener("mousemove", (e) => { if (rig.fp && document.pointerLockElement === cv) rig.lookDelta(e.movementX, e.movementY); });

  document.getElementById("mapBtn").onclick = toggleMap;
  function toggleMap() {
    if (rig.fp) { rig.fp = false; player.v.group.visible = true; } // map and first-person are exclusive
    const on = !rig.overview; rig.setOverview(on); document.getElementById("mapBtn").classList.toggle("on", on);
  }
  function toggleView() {
    rig.fp = !rig.fp;
    if (rig.fp && rig.overview) { rig.setOverview(false); document.getElementById("mapBtn").classList.remove("on"); }
    if (rig.fp) rig.pitch = 0.62; // start looking level
    player.v.group.visible = !rig.fp; // hide your own body in first-person
  }

  // ---- enter / exit estate ----------------------------------------------
  let busy = false;
  function tryEnter() { const h = F.state.near; if (h && !h.isSite) F.enterEstate(h); }
  F.enterEstate = function (h) {
    if (busy || F.state.mode !== "roam") return; busy = true;
    prompt.classList.remove("show");
    fade.classList.add("on");
    setTimeout(() => {
      F.state.mode = "tour";
      F.Plaques.hide(true);
      elHud.classList.add("hidden"); elDock.classList.add("hidden");
      F.state.gate = { x: h.x, z: h.z };
      const spawn = F.Interior.enter(h.project, h.kind, h.tier);
      player.pos.copy(spawn); player.yaw = Math.PI;
      rig.fp = true; rig.yaw = Math.PI; rig.pitch = 0.62;
      player.v.group.visible = false;
      setTimeout(() => { fade.classList.remove("on"); busy = false; }, 120);
    }, 480);
  };
  F.exitEstate = function () {
    if (busy) return; busy = true;
    fade.classList.add("on");
    setTimeout(() => {
      F.Interior.leave();
      rig.fp = false; player.v.group.visible = true;
      const g = F.state.gate || { x: 0, z: 12 };
      player.pos.set(g.x, 0, g.z + 4); player.yaw = 0;
      F.state.mode = "roam";
      F.Plaques.hide(false);
      elHud.classList.remove("hidden"); elDock.classList.remove("hidden");
      rig.dist = 14;
      setTimeout(() => { fade.classList.remove("on"); busy = false; }, 120);
    }, 360);
  };

  // ---- resize ------------------------------------------------------------
  addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

  // ---- loop --------------------------------------------------------------
  const clock = new TH.Clock();
  let craneT = 0; const CRANE_DUR = 3.6;
  const craneFrom = new TH.Vector3(48, 44, 96), craneTo = new TH.Vector3(0, 10, 30);
  const plaquesEl = document.getElementById("plaques");
  function frame() {
    requestAnimationFrame(frame); // schedule first so a single bad frame never kills the loop
    try {
    const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
    world.update(t);
    // opening crane: sweep in over the sea toward the lighthouse, then hand to the rig
    if (craneT < CRANE_DUR) {
      craneT += dt; const k = Math.min(1, craneT / CRANE_DUR), e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(craneFrom, craneTo, e);
      camera.lookAt(-22, 16, -52);
      plaquesEl.style.opacity = "0";
      renderer.render(scene, camera);
      return;
    }
    if (plaquesEl.style.opacity === "0") plaquesEl.style.opacity = "1";
    for (const o of bobbers) { o.position.y = o.userData.bob.base + Math.sin(t * 1.1 + o.userData.bob.t) * 0.12; o.rotation.z = Math.sin(t * 0.9 + o.userData.bob.t) * 0.04; }
    // sway estate signboards
    houses.forEach((h) => { if (h.board) h.board.rotation.z = Math.sin(t * 1.3 + h.x) * 0.05; });
    npcs.update(dt, t);

    if (F.state.mode === "roam") {
      const move = { x: 0, z: 0 };
      if (keys["w"] || keys["arrowup"]) move.z -= 1;
      if (keys["s"] || keys["arrowdown"]) move.z += 1;
      if (keys["a"] || keys["arrowleft"]) move.x -= 1;
      if (keys["d"] || keys["arrowright"]) move.x += 1;
      player.update(dt, move, rig.yaw);
      rig.update(dt, player.pos);
      const near = F.Plaques.update(camera, player.pos, rig.overview);
      if (near && near.project && !rig.overview) { prompt.innerHTML = `Press <b>E</b> to tour <b>${near.project.name}</b>`; prompt.classList.add("show"); }
      else prompt.classList.remove("show");
    } else if (F.state.mode === "tour") {
      const move = { x: 0, z: 0 };
      if (keys["w"] || keys["arrowup"]) move.z -= 1;
      if (keys["s"] || keys["arrowdown"]) move.z += 1;
      if (keys["a"] || keys["arrowleft"]) move.x -= 1;
      if (keys["d"] || keys["arrowright"]) move.x += 1;
      player.update(dt, move, rig.yaw);
      F.Interior.clamp(player.pos);
      rig.update(dt, player.pos);
      F.Interior.update(t, player.pos);
    } else {
      rig.update(dt, player.pos);
    }
    renderer.render(scene, camera);
    } catch (e) { const n = performance.now(); if (n - (frame._lastErr || 0) > 1000) { frame._lastErr = n; console.error("[foreman] frame error (loop kept alive):", e); } }
  }
  frame();
})();
