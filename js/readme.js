// ── Foreman · the walkable README ────────────────────────────────────────
// Press E on an estate → tour it. A short, guided walk through what it is:
//   gatehouse (crest + honest one-line) → a room per feature → the live demo
//   (a real screenshot the owner drops in) → the guest book (★ star / share).
window.F = window.F || {};
(function () {
  let track, dots, crumb, walker, root;
  let idx = 0, count = 0, project = null;

  function fmtStars(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "" + n; }
  function hex(c) { return "#" + c.toString(16).padStart(6, "0"); }
  function tierWord(t) { return t === "estate" ? "grand estate" : t === "cottage" ? "cottage" : "little hut"; }

  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }

  F.Readme = {
    init() {
      root = document.getElementById("readme");
      track = document.getElementById("rmTrack");
      dots = document.getElementById("rmDots");
      crumb = document.getElementById("rmCrumb");
      walker = document.getElementById("rmWalker");
      document.getElementById("rmPrev").onclick = () => go(idx - 1);
      document.getElementById("rmNext").onclick = () => go(idx + 1);
      document.getElementById("rmExit").onclick = () => F.exitEstate && F.exitEstate();
      // scroll / swipe between stations
      let wlock = 0;
      root.addEventListener("wheel", (e) => {
        if (!root.classList.contains("open")) return;
        const now = performance.now(); if (now - wlock < 520) return;
        if (Math.abs(e.deltaX) > 24 || Math.abs(e.deltaY) > 24) { wlock = now; go(idx + ((e.deltaX || e.deltaY) > 0 ? 1 : -1)); }
      }, { passive: true });
      let sx = null;
      root.addEventListener("touchstart", (e) => sx = e.touches[0].clientX, { passive: true });
      root.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1)); sx = null; });
    },

    open(p, kindMeta, tier) {
      project = p; const k = kindMeta; const acc = hex(k.accent);
      const total = 3 + p.features.length; // gatehouse + features + demo + guestbook
      const stations = [];

      // 0 — gatehouse
      stations.push(`
        <section class="rmStation gate">
          <div class="rmInner">
            <div class="crestBig" style="--acc:${acc}">${k.glyph}</div>
            <div class="estType">${k.word} · <span class="tierw">${tierWord(tier)}</span></div>
            <h1 class="estName">${p.name}</h1>
            <p class="estTag">${p.tagline}</p>
            <div class="techRow">${p.tech.map((t) => `<span class="tech">${t}</span>`).join("")}</div>
            <div class="gateStars"><span class="stk">★</span> ${fmtStars(p.stars)} stars · updated ${p.updated}</div>
            <div class="walkHint">walk through ›</div>
          </div>
        </section>`);

      // feature rooms
      p.features.forEach((f, i) => {
        stations.push(`
          <section class="rmStation room">
            <div class="rmInner">
              <div class="roomNo">Room ${i + 1} of ${p.features.length}</div>
              <h2 class="roomT">${f.t}</h2>
              <p class="roomB">${f.b}</p>
              <div class="roomMark" style="--acc:${acc}">${k.glyph}</div>
            </div>
          </section>`);
      });

      // demo — real screenshot slot
      const portLine = p.deployPort
        ? `<a class="visit" href="http://localhost:${p.deployPort}" target="_blank" rel="noopener">Visit live · localhost:${p.deployPort} ↗</a>`
        : `<span class="visit off">No live server — docs only</span>`;
      stations.push(`
        <section class="rmStation demo">
          <div class="rmInner wide">
            <div class="roomNo">The demo</div>
            <h2 class="roomT">See it running</h2>
            <div class="shotWrap">
              <div class="shotBar"><span></span><span></span><span></span><em>${p.deployPort ? "localhost:" + p.deployPort : p.name}</em></div>
              <image-slot id="shot_${p.id}" class="shot" shape="rect" placeholder="Drop a screenshot of ${p.name}"></image-slot>
            </div>
            <p class="demoCap">${p.demo}</p>
            ${portLine}
          </div>
        </section>`);

      // guestbook — star + share
      stations.push(`
        <section class="rmStation book">
          <div class="rmInner">
            <div class="crestBig small" style="--acc:${acc}">${k.glyph}</div>
            <h2 class="roomT">Like what ${p.name} does?</h2>
            <p class="roomB center">Leave a star, or share this estate so others can walk through it too.</p>
            <div class="bookActions">
              <button class="starBtn" id="starBtn"><span class="s">★</span> Star <span class="cnt" id="starCnt">${fmtStars(p.stars)}</span></button>
              <button class="shareBtn" id="shareBtn">⇪ Share kingdom link</button>
            </div>
            <button class="backBtn" id="backBtn">‹ Back to the kingdom</button>
          </div>
        </section>`);

      track.innerHTML = stations.join("");
      track.style.width = (total * 100) + "vw";
      track.querySelectorAll(".rmStation").forEach((s) => s.style.width = "100vw");
      // dots
      dots.innerHTML = "";
      for (let i = 0; i < total; i++) { const b = document.createElement("button"); b.className = "rmDot"; b.onclick = () => go(i); dots.appendChild(b); }
      crumb.innerHTML = `<span class="cCrest" style="color:${acc}">${k.glyph}</span> ${p.name} <span class="cType">· ${k.word}</span>`;

      // wire station 0-only buttons after injection
      count = p.stars;
      const star = document.getElementById("starBtn");
      if (star) star.onclick = () => {
        if (star.classList.contains("on")) { star.classList.remove("on"); count = p.stars; }
        else { star.classList.add("on"); count = p.stars + 1; burst(star); }
        document.getElementById("starCnt").textContent = fmtStars(count);
      };
      const share = document.getElementById("shareBtn");
      if (share) share.onclick = () => { toast("Kingdom link copied ✓"); };
      const back = document.getElementById("backBtn");
      if (back) back.onclick = () => F.exitEstate && F.exitEstate();

      idx = 0; layout(false);
      requestAnimationFrame(() => { root.classList.add("open"); root.setAttribute("aria-hidden", "false"); });
    },

    close() { root.classList.remove("open"); root.setAttribute("aria-hidden", "true"); },
    next() { go(idx + 1); }, prev() { go(idx - 1); },
    isOpen() { return root && root.classList.contains("open"); },
    count() { return idx; },
  };

  function go(i) {
    const n = track.children.length; idx = Math.max(0, Math.min(n - 1, i)); layout(true);
  }
  function layout(animate) {
    const n = track.children.length;
    track.style.transition = animate ? "transform .55s cubic-bezier(.7,0,.2,1)" : "none";
    track.style.transform = `translateX(${-idx * 100}vw)`;
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i === idx));
    [...track.children].forEach((s, i) => s.classList.toggle("active", i === idx));
    // walker position along the floor maps to progress
    const prog = n > 1 ? idx / (n - 1) : 0;
    walker.style.left = (12 + prog * 76) + "%";
    walker.classList.add("walking");
    clearTimeout(walker._t); walker._t = setTimeout(() => walker.classList.remove("walking"), 560);
    walker.classList.toggle("flip", false);
  }

  function burst(node) {
    const r = node.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("div"); s.className = "spark"; s.textContent = "★";
      s.style.left = (r.left + r.width / 2) + "px"; s.style.top = (r.top + r.height / 2) + "px";
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d - 20 + "px");
      document.body.appendChild(s); setTimeout(() => s.remove(), 800);
    }
  }
  function toast(msg) {
    let t = document.getElementById("rmToast");
    if (!t) { t = document.createElement("div"); t.id = "rmToast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 1600);
  }
})();
