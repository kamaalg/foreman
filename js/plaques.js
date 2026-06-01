// ── Foreman · plaques (the kingdom nameplate, with proximity reveal) ──────
// Identity lives here. Three levels of reveal:
//   afar       → a hanging crest banner: glyph + estate name
//   walk up    → the plaque unfurls a parchment: estate type + the honest
//                one-line description + ★ stars + "press E to tour"
window.F = window.F || {};
(function () {
  const T = () => window.THREE;
  F.state = F.state || {};
  let host, items = [];

  function fmtStars(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "" + n; }

  F.Plaques = {
    init(houses) {
      host = document.getElementById("plaques"); host.innerHTML = ""; items = [];
      houses.forEach((h) => {
        const el = document.createElement("div"); el.className = "plaque" + (h.isSite ? " site" : "");
        if (h.isSite) {
          el.innerHTML = `
            <div class="banner"><span class="crest">✦</span><span class="pname">Vacant plot</span></div>
            <div class="expand"><div class="ptag">An empty lot, waiting for a new estate.</div>
            <div class="pmeta"><span class="enter">Press <b>E</b> to claim ›</span></div></div>`;
        } else {
          const p = h.project; const k = h.kind;
          el.innerHTML = `
            <div class="banner"><span class="crest" style="color:#${k.accent.toString(16).padStart(6,'0')}">${k.glyph}</span><span class="pname">${p.name}</span></div>
            <div class="expand">
              <div class="ptype"><span class="dotk" style="background:#${k.accent.toString(16).padStart(6,'0')}"></span>${k.word} · ${h.tier}</div>
              <div class="ptag">${p.tagline}</div>
              <div class="pmeta"><span class="stars">★ ${fmtStars(p.stars)}</span><span class="enter">Press <b>E</b> to tour ›</span></div>
            </div>`;
        }
        el.addEventListener("click", () => { if (h.isSite) return; F.enterEstate && F.enterEstate(h); });
        host.appendChild(el);
        items.push({ h, el, banner: el.querySelector(".banner") });
      });
    },

    update(camera, playerPos, overview) {
      const W = innerWidth, H = innerHeight; const v = new (T().Vector3)();
      let near = null, nearD = 1e9;
      items.forEach(({ h, el }) => {
        v.copy(h.signWorld || new (T().Vector3)(h.x, h.labelY, h.z)); v.project(camera);
        if (v.z > 1) { el.style.opacity = "0"; el.style.pointerEvents = "none"; return; }
        const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
        el.style.left = sx + "px"; el.style.top = sy + "px";
        const d = Math.hypot(playerPos.x - h.x, playerPos.z - h.z);
        const isNear = !overview && d < 9.5 && !h.isSite ? true : (!overview && h.isSite && d < 7);
        // depth scale: farther = a touch smaller
        const sc = Math.max(0.62, Math.min(1, 1.15 - v.z * 0.5));
        el.style.setProperty("--sc", sc.toFixed(3));
        el.classList.toggle("near", isNear);
        el.style.pointerEvents = isNear ? "auto" : "none";
        // fade very distant plaques so the scene stays calm
        const far = d > 40;
        el.style.opacity = far ? "0.0" : (overview ? "0.96" : (d > 26 ? "0.5" : "1"));
        if (!overview && d < nearD && d < 9.5) { nearD = d; near = h; }
      });
      // dim non-near when one is near
      const someNear = !!near;
      items.forEach(({ h, el }) => { if (someNear && el.classList.contains("near") === false && !overview) el.classList.add("hushed"); else el.classList.remove("hushed"); });
      F.state.near = near;
      return near;
    },

    hide(yes) { if (host) host.style.display = yes ? "none" : ""; },
  };
})();
