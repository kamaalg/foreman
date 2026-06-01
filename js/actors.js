// ── Foreman · villagers (player + NPCs) + camera rig ─────────────────────
window.F = window.F || {};
(function () {
  const T = () => window.THREE;

  // low-poly villager; returns {group, limbs} for animation
  F.makeVillager = function (opt = {}) {
    const TH = T(); const g = new TH.Group();
    const skin = opt.skin ?? 0xd2a06a;
    const tunic = opt.tunic ?? 0xb5623a;
    const pants = opt.pants ?? 0x5a4636;
    const sk = F.mat(skin, { flat: true }), tn = F.mat(tunic, { flat: true }), pt = F.mat(pants, { flat: true });
    // torso
    const torso = new TH.Mesh(new TH.BoxGeometry(0.62, 0.78, 0.4), tn); torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
    // head
    const head = new TH.Mesh(new TH.BoxGeometry(0.46, 0.46, 0.44), sk); head.position.y = 1.78; head.castShadow = true; g.add(head);
    // hat (straw) — optional
    if (opt.hat !== false) {
      const brim = new TH.Mesh(new TH.CylinderGeometry(0.42, 0.46, 0.06, 12), F.mat(opt.hatCol ?? 0xd9b878, { flat: true })); brim.position.y = 2.02; g.add(brim);
      const top = new TH.Mesh(new TH.CylinderGeometry(0.26, 0.3, 0.22, 12), F.mat(opt.hatCol ?? 0xc9a85f, { flat: true })); top.position.y = 2.12; g.add(top);
    }
    // arms
    const armGeo = new TH.BoxGeometry(0.17, 0.62, 0.2);
    const armL = new TH.Mesh(armGeo, tn); armL.geometry.translate(0, -0.31, 0); armL.position.set(-0.4, 1.45, 0); armL.castShadow = true; g.add(armL);
    const armR = new TH.Mesh(armGeo, tn); armR.geometry.translate(0, -0.31, 0); armR.position.set(0.4, 1.45, 0); armR.castShadow = true; g.add(armR);
    // legs
    const legGeo = new TH.BoxGeometry(0.22, 0.7, 0.24);
    const legL = new TH.Mesh(legGeo, pt); legL.geometry.translate(0, -0.35, 0); legL.position.set(-0.16, 0.78, 0); legL.castShadow = true; g.add(legL);
    const legR = new TH.Mesh(legGeo, pt); legR.geometry.translate(0, -0.35, 0); legR.position.set(0.16, 0.78, 0); legR.castShadow = true; g.add(legR);
    return { group: g, limbs: { armL, armR, legL, legR, torso, head }, _phase: Math.random() * 6 };
  };

  function animateWalk(v, t, speed) {
    const s = Math.min(1, speed); const sw = Math.sin(t * 9 + v._phase) * 0.8 * s;
    v.limbs.legL.rotation.x = sw; v.limbs.legR.rotation.x = -sw;
    v.limbs.armL.rotation.x = -sw * 0.8; v.limbs.armR.rotation.x = sw * 0.8;
    v.limbs.torso.position.y = 1.15 + Math.abs(Math.sin(t * 9 + v._phase)) * 0.04 * s;
  }

  // ---- player ------------------------------------------------------------
  F.makePlayer = function (scene) {
    const v = F.makeVillager({ skin: 0xc88f5e, tunic: 0xb5623a, pants: 0x4f3a2a, hatCol: 0xd2a85f });
    v.group.position.set(0, 0, 16); scene.add(v.group);
    return {
      v, pos: v.group.position, yaw: Math.PI, speed: 0,
      update(dt, move, camYaw) {
        // move = {x,z} in camera space (-1..1)
        const mag = Math.hypot(move.x, move.z);
        if (mag > 0.01) {
          const ang = camYaw + Math.atan2(move.x, move.z);
          const spd = 7.0;
          let nx = this.pos.x + Math.sin(ang) * spd * dt;
          let nz = this.pos.z + Math.cos(ang) * spd * dt;
          // collide
          for (const c of F.colliders) {
            const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz);
            if (d < c.r + 0.6) { const k = (c.r + 0.6) / (d || 0.001); nx = c.x + dx * k; nz = c.z + dz * k; }
          }
          if (F.state && F.state.mode === "roam") nz = Math.min(nz, 50); // don't walk into the sea (roam only)
          this.pos.x = nx; this.pos.z = nz;
          if (F.state && F.state.mode === "roam") { const R = Math.hypot(this.pos.x, this.pos.z); if (R > 74) { this.pos.x *= 74 / R; this.pos.z *= 74 / R; } }
          this.yaw = ang; this.speed = 1;
        } else this.speed = 0;
        v.group.rotation.y = this.yaw;
        animateWalk(v, performance.now() / 1000, this.speed);
      },
    };
  };

  // ---- NPCs --------------------------------------------------------------
  const TUNICS = [0xb5623a, 0x4f7d72, 0x9c7a4a, 0xc98a55, 0x6f8a6a, 0xb58a5e, 0x8a6f9c];
  F.makeNPCs = function (scene, n) {
    const npcs = []; const r = F.rng(424242);
    for (let i = 0; i < n; i++) {
      const v = F.makeVillager({
        skin: [0xd2a06a, 0xc88f5e, 0xe0b88a, 0xb47a4e][Math.floor(r() * 4)],
        tunic: TUNICS[Math.floor(r() * TUNICS.length)],
        pants: [0x4f3a2a, 0x5a4636, 0x3a4a45][Math.floor(r() * 3)],
        hatCol: r() > 0.5 ? 0xd9b878 : 0xcdb23f,
      });
      v.group.scale.setScalar(0.92 + r() * 0.12);
      const a = r() * Math.PI * 2, rad = 10 + r() * 32;
      v.group.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad * 0.8);
      scene.add(v.group);
      const mode = r() < 0.45 ? "stroll" : r() < 0.75 ? "water" : "sit";
      npcs.push({ v, mode, t: r() * 10, target: pickTarget(r), r, wait: 0, water: null });
    }
    return {
      list: npcs,
      update(dt, time) {
        for (const n of npcs) {
          if (n.mode === "sit") { animateSit(n, time); continue; }
          if (n.mode === "water") { stepWater(n, dt, time); continue; }
          stepStroll(n, dt, time);
        }
      },
    };
  };

  function pickTarget(r) { const a = r() * Math.PI * 2, rad = 8 + r() * 32; return { x: Math.cos(a) * rad, z: Math.sin(a) * rad * 0.8 }; }

  function stepStroll(n, dt, time) {
    const p = n.v.group.position; const dx = n.target.x - p.x, dz = n.target.z - p.z; const d = Math.hypot(dx, dz);
    if (d < 0.5) { n.wait -= dt; if (n.wait <= 0) { n.target = pickTarget(n.r); n.wait = 1 + n.r() * 3; } animateWalk(n.v, time, 0); return; }
    const ang = Math.atan2(dx, dz); const spd = 1.7;
    let nx = p.x + Math.sin(ang) * spd * dt, nz = p.z + Math.cos(ang) * spd * dt;
    for (const c of F.colliders) { const ex = nx - c.x, ez = nz - c.z, ed = Math.hypot(ex, ez); if (ed < c.r + 0.5) { n.target = pickTarget(n.r); return; } }
    p.x = nx; p.z = Math.min(nz, 48); n.v.group.rotation.y = ang; animateWalk(n.v, time, 0.6);
  }

  function stepWater(n, dt, time) {
    // stand near a pot and bob arm as if watering
    if (!n.water) { n.water = pickTarget(n.r); }
    const p = n.v.group.position; const dx = n.water.x - p.x, dz = n.water.z - p.z; const d = Math.hypot(dx, dz);
    if (d > 0.6) { const ang = Math.atan2(dx, dz); p.x += Math.sin(ang) * 1.6 * dt; p.z += Math.cos(ang) * 1.6 * dt; n.v.group.rotation.y = ang; animateWalk(n.v, time, 0.6); }
    else { n.v.limbs.armR.rotation.x = -1.0 + Math.sin(time * 2) * 0.2; n.t -= dt; if (n.t < 0) { n.water = pickTarget(n.r); n.t = 4 + n.r() * 4; } }
  }

  function animateSit(n, time) {
    // crouch the legs, hands on knees, slight breathing
    n.v.limbs.legL.rotation.x = -1.4; n.v.limbs.legR.rotation.x = -1.4;
    n.v.group.position.y = -0.35; n.v.limbs.torso.position.y = 1.15 + Math.sin(time * 1.5 + n.t) * 0.02;
  }

  // ---- camera rig --------------------------------------------------------
  F.makeRig = function (camera) {
    const TH = T();
    const rig = {
      yaw: 0, pitch: 0.5, dist: 14, target: new TH.Vector3(0, 1.4, 16),
      overview: false, _ov: 0, fp: false,
      drag: false, px: 0, py: 0,
      setOverview(on) { this.overview = on; },
      onDown(x, y) { this.drag = true; this.px = x; this.py = y; },
      onUp() { this.drag = false; },
      onMove(x, y) { if (!this.drag) return; this.yaw -= (x - this.px) * 0.006; this.pitch = Math.max(0.12, Math.min(1.25, this.pitch + (y - this.py) * 0.005)); this.px = x; this.py = y; },
      lookDelta(dx, dy) { this.yaw -= dx * 0.0024; this.pitch = Math.max(0.1, Math.min(1.3, this.pitch + dy * 0.0022)); }, // pointer-lock mouse-look (first-person)
      onWheel(dy) { this.dist = Math.max(6, Math.min(34, this.dist + dy * 0.02)); },
      update(dt, playerPos) {
        // ---- first-person: camera at the eyes, look-dir drives movement ----
        if (this.fp) {
          const eyeY = playerPos.y + 1.62;
          camera.position.set(playerPos.x, eyeY, playerPos.z);
          const vp = (this.pitch - 0.62) * 1.5; // drag up/down to look up/down
          const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
          camera.lookAt(playerPos.x + fx * Math.cos(vp) * 5, eyeY - Math.sin(vp) * 5, playerPos.z + fz * Math.cos(vp) * 5);
          return;
        }
        // ease overview
        this._ov += ((this.overview ? 1 : 0) - this._ov) * Math.min(1, dt * 5);
        const tgt = new TH.Vector3(playerPos.x, 1.4, playerPos.z);
        this.target.lerp(tgt, Math.min(1, dt * 6));
        const dist = this.dist + this._ov * 30;
        const pitch = this.pitch + this._ov * 0.55;
        const cx = this.target.x + Math.sin(this.yaw) * Math.cos(pitch) * dist;
        const cz = this.target.z + Math.cos(this.yaw) * Math.cos(pitch) * dist;
        const cy = this.target.y + Math.sin(pitch) * dist;
        camera.position.lerp(new TH.Vector3(cx, cy, cz), Math.min(1, dt * 7));
        camera.lookAt(this.target.x, this.target.y + this._ov * 2, this.target.z);
      },
      // build-mode: frame a specific house
      focus(house, dt) {
        const tgt = new TH.Vector3(house.x, house.labelY * 0.45, house.z);
        this.target.lerp(tgt, Math.min(1, dt * 4));
        const dist = house.r * 2.6 + 6;
        const cx = house.x + Math.sin(this.yaw) * dist;
        const cz = house.z + Math.cos(this.yaw) * dist;
        const cy = house.labelY * 0.9 + 4;
        camera.position.lerp(new TH.Vector3(cx, cy, cz), Math.min(1, dt * 4));
        camera.lookAt(this.target);
      },
    };
    return rig;
  };
})();
