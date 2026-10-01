/* DropZone 3D — Three.js game engine.
   Helix-style tower drop: drag to rotate the tower, let the ball fall through
   gaps. Hold to smash. 3 consecutive passes = fireball. Land on red = death. */
(function () {
  const T = THREE;
  const TAU = Math.PI * 2;

  const CFG = {
    R: 2.2,          // tower radius
    BALL_R: 0.34,
    PLAT_H: 0.55,    // platform thickness
    SPACING: 2.15,   // top-to-top distance between levels
    G: 34,
    BOUNCE: 11.8,
    SMASH: -27
  };
  const BALL_Z = CFG.R - 0.18; // ball sits near the outer edge of platforms

  /* ---------------- catalog: skins & themes ---------------- */
  DZ.Skins = [
    { id: "cyan",   name: "Volt Cyan",  color: 0x22d3ee, emissive: 0x0e7490, rough: 0.25, metal: 0.10, trail: 0x22d3ee, pro: false },
    { id: "magma",  name: "Magma",      color: 0xff5a3c, emissive: 0x7c1d12, rough: 0.40, metal: 0.00, trail: 0xff8a5c, pro: false },
    { id: "mint",   name: "Mint Pop",   color: 0x4ade80, emissive: 0x14532d, rough: 0.35, metal: 0.10, trail: 0x4ade80, pro: false },
    { id: "gold",   name: "24K Gold",   color: 0xf6c453, emissive: 0x8a5a00, rough: 0.16, metal: 0.90, trail: 0xffd97a, pro: true },
    { id: "rose",   name: "Neon Rose",  color: 0xf471b5, emissive: 0x831843, rough: 0.25, metal: 0.20, trail: 0xf9a8d4, pro: true },
    { id: "frost",  name: "Frost",      color: 0xbfe9ff, emissive: 0x3b82a6, rough: 0.06, metal: 0.10, trail: 0xdff4ff, pro: true },
    { id: "violet", name: "Ultraviolet", color: 0xa78bfa, emissive: 0x4c1d95, rough: 0.30, metal: 0.30, trail: 0xc4b5fd, pro: true },
    { id: "onyx",   name: "Onyx",       color: 0x232936, emissive: 0x05070c, rough: 0.15, metal: 0.85, trail: 0x8b93a7, pro: true },
    { id: "lime",   name: "Toxic Lime", color: 0xa3e635, emissive: 0x3f6212, rough: 0.35, metal: 0.00, trail: 0xbef264, pro: true },
    { id: "pearl",  name: "Pearl",      color: 0xf8fafc, emissive: 0x94a3b8, rough: 0.20, metal: 0.40, trail: 0xffffff, pro: true }
  ];

  DZ.Themes = [
    { id: "midnight", name: "Midnight",   platform: 0x2b3a67, top: 0x4d6db3, danger: 0xff2d55, pole: 0x10162a, pro: false },
    { id: "sunset",   name: "Sunset",     platform: 0x7c3f2c, top: 0xc46a45, danger: 0xff2d55, pole: 0x241109, pro: false },
    { id: "neon",     name: "Neon City",  platform: 0x101c33, top: 0x1de9b6, danger: 0xff2d55, pole: 0x080d1a, pro: true },
    { id: "royal",    name: "Royal Gold", platform: 0x4a3517, top: 0xe0aa2e, danger: 0xff2d55, pole: 0x201605, pro: true },
    { id: "ocean",    name: "Deep Ocean", platform: 0x123a5c, top: 0x35a3d4, danger: 0xff2d55, pole: 0x071423, pro: true },
    { id: "candy",    name: "Candy",      platform: 0x6d2a52, top: 0xf471b5, danger: 0xff2d55, pole: 0x260d1c, pro: true },
    { id: "matrix",   name: "Matrix",     platform: 0x0e2a12, top: 0x2bd465, danger: 0xff2d55, pole: 0x060f07, pro: true }
  ];

  DZ.getSkin = id => DZ.Skins.find(s => s.id === id) || DZ.Skins[0];
  DZ.getTheme = id => DZ.Themes.find(t => t.id === id) || DZ.Themes[0];

  DZ.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    int(k, d) { const v = parseInt(DZ.store.get(k, ""), 10); return isNaN(v) ? d : v; }
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const angNorm = a => { a %= TAU; return a < 0 ? a + TAU : a; };

  /* ---------------- game ---------------- */
  class Game {
    constructor(container) {
      this.container = container;
      this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(60, 1, 0.1, 120);

      const hemi = new T.HemisphereLight(0x9fc0ff, 0x1a1030, 0.85);
      this.scene.add(hemi);
      const dir = new T.DirectionalLight(0xffffff, 0.85);
      dir.position.set(5, 12, 8);
      this.scene.add(dir);
      this.ballLight = new T.PointLight(0x22d3ee, 1.0, 14);
      this.scene.add(this.ballLight);

      // tower group (rotates with drag)
      this.tower = new T.Group();
      this.scene.add(this.tower);

      // center pole
      this.poleMat = new T.MeshStandardMaterial({ color: 0x10162a, roughness: 0.4, metalness: 0.7 });
      const pole = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 420, 20), this.poleMat);
      pole.position.y = -200;
      this.tower.add(pole);

      // ball
      this.ballMat = new T.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1 });
      this.ball = new T.Mesh(new T.SphereGeometry(CFG.BALL_R, 36, 36), this.ballMat);
      this.ball.position.set(0, 2, BALL_Z);
      this.scene.add(this.ball);

      // trail (ring buffer of points)
      this.TRAIL_N = 70;
      this.trailPos = new Float32Array(this.TRAIL_N * 3);
      this.trailHead = 0;
      const tg = new T.BufferGeometry();
      tg.setAttribute("position", new T.BufferAttribute(this.trailPos, 3));
      this.trailMat = new T.PointsMaterial({ size: 0.16, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false });
      this.trail = new T.Points(tg, this.trailMat);
      this.trail.frustumCulled = false;
      this.scene.add(this.trail);
      for (let i = 0; i < this.TRAIL_N; i++) this.pushTrail(0, 9999, 0);

      // shard pool
      this.shards = [];
      const shardGeo = new T.BoxGeometry(0.17, 0.17, 0.17);
      for (let i = 0; i < 90; i++) {
        const m = new T.Mesh(shardGeo, new T.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }));
        m.visible = false;
        this.scene.add(m);
        this.shards.push({ mesh: m, vel: new T.Vector3(), rot: new T.Vector3(), life: 0 });
      }

      this.dangerMats = [];
      this.levels = new Map();
      this.maxGen = -1;

      this.skinId = DZ.store.get("dz_skin", "cyan");
      this.themeId = DZ.store.get("dz_theme", "midnight");
      this.applySkin();
      this.applyTheme();

      // run state
      this.state = "menu"; // menu | playing | over
      this.paused = false;
      this.y = 2; this.vy = 0; this.levelIndex = 0;
      this.score = 0; this.streak = 0;
      this.best = DZ.store.int("dz_best", 0);
      this.fireT = 0; this.ghostT = 0; this.squashT = 0;
      this.smashing = false;
      this.revivesLeft = 1;
      this.camY = 6;
      this.time = 0;

      this.onScore = null; this.onGameOver = null; this.onFire = null; this.onEvent = null;

      this.bindInput();
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.resetWorld();
      this.lastT = performance.now();
      requestAnimationFrame(t => this.loop(t));
    }

    /* ----- appearance ----- */
    applySkin() {
      const s = DZ.getSkin(this.skinId);
      this.ballMat.color.setHex(s.color);
      this.ballMat.emissive.setHex(s.emissive);
      this.ballMat.emissiveIntensity = 0.35;
      this.ballMat.roughness = s.rough;
      this.ballMat.metalness = s.metal;
      this.trailMat.color.setHex(s.trail);
      this.ballLight.color.setHex(s.trail);
      DZ.store.set("dz_skin", this.skinId);
    }
    setSkin(id) { this.skinId = id; this.applySkin(); }

    applyTheme() {
      const th = DZ.getTheme(this.themeId);
      this.poleMat.color.setHex(th.pole);
      this.theme = th;
      // rebuild existing level materials
      this.levels.forEach(lvl => {
        lvl.arcs.forEach(a => {
          if (a.danger) { a.mesh.material.color.setHex(th.danger); a.mesh.material.emissive.setHex(th.danger); }
          else a.mesh.material.color.setHex(th.platform);
          if (a.topMesh) a.topMesh.material.color.setHex(th.top);
        });
      });
      DZ.store.set("dz_theme", this.themeId);
    }
    setTheme(id) { this.themeId = id; this.applyTheme(); }

    /* ----- world ----- */
    resetWorld() {
      this.levels.forEach(lvl => { this.tower.remove(lvl.group); this.disposeLevel(lvl); });
      this.levels.clear();
      this.maxGen = -1;
      this.tower.rotation.y = 0;
      this.ensureLevels(0, 22);
    }

    disposeLevel(lvl) {
      lvl.group.traverse(o => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (o.material && o.material._owned) o.material.dispose();
        }
      });
    }

    makeLevel(i) {
      const th = this.theme;
      const d = Math.min(i / 90, 1);
      const gapLen = lerp(1.7, 0.92, d);
      const gapStart = Math.random() * TAU;
      const dangerProb = Math.min(0.10 + i * 0.006, 0.52);

      // danger arc inside the solid region
      let dangerStart = -1, dangerLen = 0.55;
      const solidLen = TAU - gapLen;
      if (Math.random() < dangerProb && solidLen > dangerLen + 0.5) {
        dangerStart = gapStart + gapLen + 0.25 + Math.random() * (solidLen - dangerLen - 0.5);
      }

      const group = new T.Group();
      const topY = -i * CFG.SPACING;
      group.position.y = topY - CFG.PLAT_H / 2;

      const arcs = [];
      const addArc = (start, len, danger) => {
        if (len <= 0.02) return;
        const mat = new T.MeshStandardMaterial({
          color: danger ? th.danger : th.platform,
          roughness: 0.55, metalness: 0.25,
          emissive: danger ? th.danger : 0x000000,
          emissiveIntensity: danger ? 0.55 : 0
        });
        mat._owned = true;
        const geo = new T.CylinderGeometry(CFG.R, CFG.R, CFG.PLAT_H, 30, 1, false, start, len);
        const mesh = new T.Mesh(geo, mat);
        group.add(mesh);
        // bright top skin
        const tmat = new T.MeshStandardMaterial({ color: danger ? th.danger : th.top, roughness: 0.4, metalness: 0.3, emissive: danger ? th.danger : 0x000000, emissiveIntensity: danger ? 0.35 : 0 });
        tmat._owned = true;
        const tgeo = new T.CylinderGeometry(CFG.R * 0.995, CFG.R * 0.995, 0.07, 30, 1, false, start, len);
        const topMesh = new T.Mesh(tgeo, tmat);
        topMesh.position.y = CFG.PLAT_H / 2; // top sits 0.035 proud of the platform — no z-fighting
        group.add(topMesh);
        const arc = { start, len, danger: !!danger, mesh, topMesh, destroyed: false };
        arcs.push(arc);
        if (danger) this.dangerMats.push(mat, tmat);
      };

      if (dangerStart >= 0) {
        addArc(gapStart + gapLen, dangerStart - (gapStart + gapLen), false);
        addArc(dangerStart, dangerLen, true);
        addArc(dangerStart + dangerLen, (gapStart + TAU) - (dangerStart + dangerLen), false);
      } else {
        addArc(gapStart + gapLen, TAU - gapLen, false);
      }

      this.tower.add(group);
      const lvl = { i, group, topY, gapStart, gapLen, arcs };
      this.levels.set(i, lvl);
      return lvl;
    }

    ensureLevels(from, count) {
      for (let i = Math.max(0, from); i < from + count; i++) {
        if (!this.levels.has(i)) this.makeLevel(i);
      }
      this.maxGen = Math.max(this.maxGen, from + count - 1);
    }

    pruneLevels() {
      const killAbove = this.y + 16;
      this.levels.forEach((lvl, i) => {
        if (lvl.topY > killAbove && i < this.levelIndex - 2) {
          this.tower.remove(lvl.group);
          this.disposeLevel(lvl);
          this.levels.delete(i);
        }
      });
    }

    /* ----- run control ----- */
    startRun() {
      this.resetWorld();
      this.levelIndex = 0;
      this.y = CFG.BALL_R + 1.4;
      this.vy = 0;
      this.score = 0; this.streak = 0;
      this.fireT = 0; this.ghostT = 0; this.squashT = 0;
      this.smashing = false;
      this.revivesLeft = DZ.upi.isPro() ? 999 : 1;
      this.state = "playing";
      this.paused = false;
      this.camY = this.y + 4.6;
      this.emit("start");
    }

    toMenu() {
      this.state = "menu";
      this.resetWorld();
      this.levelIndex = 0;
      this.y = CFG.BALL_R + 1.2;
      this.vy = 0;
      this.fireT = 0; this.ghostT = 0;
    }

    pause() { if (this.state === "playing") this.paused = true; }
    resume() { this.paused = false; this.lastT = performance.now(); }

    revive() {
      if (this.revivesLeft <= 0 || this.state !== "over") return false;
      this.revivesLeft--;
      const target = Math.max(0, this.deathLevel - 2);
      this.ensureLevels(target, 22);
      this.levelIndex = target;
      const lvl = this.levels.get(target);
      this.y = lvl.topY + 2.4;
      this.vy = 0;
      this.streak = 0; this.fireT = 0;
      this.ghostT = 2.2;
      this.state = "playing";
      this.paused = false;
      this.camY = this.y + 4.6;
      DZ.audio.sfx.revive();
      this.emit("revive", this.revivesLeft);
      return true;
    }

    emit(ev, data) { if (this.onEvent) this.onEvent(ev, data); }

    die() {
      if (this.state !== "playing") return;
      this.state = "over";
      this.deathLevel = this.levelIndex;
      DZ.audio.sfx.death();
      // burst of shards at ball
      const s = DZ.getSkin(this.skinId);
      this.burst(this.ball.position, s.color, 16, 7);
      const isBest = this.score > this.best;
      if (isBest) {
        this.best = this.score;
        DZ.store.set("dz_best", String(this.best));
        DZ.audio.sfx.best();
      }
      const games = DZ.store.int("dz_games", 0) + 1;
      DZ.store.set("dz_games", String(games));
      if (this.onGameOver) this.onGameOver(this.score, isBest, this.revivesLeft);
    }

    /* ----- contact ----- */
    localAngle() { return angNorm(-this.tower.rotation.y); }

    contactAt(lvl, ang) {
      const d = angNorm(ang - lvl.gapStart);
      if (d <= lvl.gapLen) return "gap";
      for (const a of lvl.arcs) {
        if (a.destroyed) continue;
        if (angNorm(ang - a.start) <= a.len) return a.danger ? "danger" : "solid";
      }
      return "gap";
    }

    shatter(lvl, ang, colorHex) {
      for (const a of lvl.arcs) {
        if (a.destroyed || angNorm(ang - a.start) > a.len) continue;
        a.destroyed = true;
        a.mesh.visible = false;
        a.topMesh.visible = false;
        const mid = a.start + a.len / 2;
        // world position of arc mid at ball radius
        const wx = Math.sin(mid + this.tower.rotation.y) * (CFG.R - 0.3);
        const wz = Math.cos(mid + this.tower.rotation.y) * (CFG.R - 0.3);
        this.burst(new T.Vector3(wx, lvl.topY + 0.2, wz), colorHex, 10, 5);
        break;
      }
    }

    burst(pos, colorHex, n, speed) {
      let c = 0;
      for (const s of this.shards) {
        if (s.life > 0) continue;
        s.life = 0.55 + Math.random() * 0.35;
        s.mesh.visible = true;
        s.mesh.material.color.setHex(colorHex);
        s.mesh.material.emissive.setHex(colorHex);
        s.mesh.material.emissiveIntensity = 0.4;
        s.mesh.position.copy(pos);
        s.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.9 + 1, (Math.random() - 0.5) * speed);
        s.rot.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        if (++c >= n) break;
      }
    }

    pushTrail(x, y, z) {
      this.trailPos[this.trailHead * 3] = x;
      this.trailPos[this.trailHead * 3 + 1] = y;
      this.trailPos[this.trailHead * 3 + 2] = z;
      this.trailHead = (this.trailHead + 1) % this.TRAIL_N;
      this.trail.geometry.attributes.position.needsUpdate = true;
    }

    /* ----- input ----- */
    bindInput() {
      const el = this.renderer.domElement;
      let pdown = false, sx = 0, lastX = 0, moved = false, holdTimer = 0, mode = null;

      const down = x => {
        if (this.state !== "playing" || this.paused) return;
        DZ.audio.unlock();
        pdown = true; sx = x; lastX = x; moved = false; mode = null;
        holdTimer = setTimeout(() => {
          if (pdown && !moved) { mode = "smash"; this.smashing = true; }
        }, 170);
      };
      const move = x => {
        if (!pdown || this.state !== "playing" || this.paused) return;
        const dx = x - lastX;
        if (Math.abs(x - sx) > 12) { moved = true; mode = "drag"; }
        if (mode === "drag" || moved) {
          this.tower.rotation.y += dx * 0.011;
          lastX = x;
        }
      };
      const up = () => {
        pdown = false;
        clearTimeout(holdTimer);
        this.smashing = false;
        mode = null;
      };

      el.addEventListener("pointerdown", e => { e.preventDefault(); down(e.clientX); }, { passive: false });
      window.addEventListener("pointermove", e => move(e.clientX));
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      el.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

      // keyboard (desktop)
      const keys = {};
      window.addEventListener("keydown", e => {
        if (e.code === "Space") { if (this.state === "playing" && !this.paused) this.smashing = true; e.preventDefault(); }
        keys[e.code] = true;
      });
      window.addEventListener("keyup", e => {
        if (e.code === "Space") this.smashing = false;
        keys[e.code] = false;
      });
      this.keys = keys;
    }

    resize() {
      const w = this.container.clientWidth || 400;
      const h = this.container.clientHeight || 700;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    /* ----- main loop ----- */
    loop(t) {
      requestAnimationFrame(tt => this.loop(tt));
      let dt = Math.min((t - this.lastT) / 1000, 0.033);
      this.lastT = t;
      this.time += dt;

      // danger pulse
      const pulse = 0.45 + 0.25 * Math.sin(this.time * 6);
      for (const m of this.dangerMats) m.emissiveIntensity = pulse;

      if (!this.paused) {
        if (this.state === "menu") this.updateMenu(dt);
        else if (this.state === "playing") this.updatePlaying(dt);
        this.updateFx(dt);
      }
      this.renderer.render(this.scene, this.camera);
    }

    updateMenu(dt) {
      this.tower.rotation.y += dt * 0.45;
      // gentle bounce on level 0
      const topY = 0;
      this.vy -= CFG.G * dt;
      this.y += this.vy * dt;
      if (this.vy < 0 && this.y - CFG.BALL_R <= topY) {
        this.y = topY + CFG.BALL_R;
        this.vy = CFG.BOUNCE * 0.85;
      }
      this.pushTrail(0, this.y, BALL_Z);
      this.ball.position.set(0, this.y, BALL_Z);
      this.ball.rotation.y += dt * 1.5;
      this.camY += ((this.y + 4.4) - this.camY) * Math.min(1, dt * 5);
      this.camera.position.set(0, this.camY, 10.8);
      this.camera.lookAt(0, this.y - 1.1, 0);
      this.ballLight.position.set(0, this.y + 1, BALL_Z + 1.5);
    }

    updatePlaying(dt) {
      // keyboard rotate
      if (this.keys["ArrowLeft"]) this.tower.rotation.y -= dt * 3.2;
      if (this.keys["ArrowRight"]) this.tower.rotation.y += dt * 3.2;

      const pro = DZ.upi.isPro();
      if (this.fireT > 0) this.fireT -= dt;
      if (this.ghostT > 0) this.ghostT -= dt;
      if (this.squashT > 0) this.squashT -= dt;

      const yPrev = this.y;
      this.vy -= CFG.G * dt;
      if (this.smashing) this.vy = Math.min(this.vy, CFG.SMASH);
      this.y += this.vy * dt;

      const lvl = this.levels.get(this.levelIndex);
      if (lvl) {
        const topY = lvl.topY;
        const bPrev = yPrev - CFG.BALL_R, bNew = this.y - CFG.BALL_R;
        if (this.vy < 0 && bPrev > topY && bNew <= topY) {
          const ang = this.localAngle();
          const hit = this.contactAt(lvl, ang);
          const fire = this.fireT > 0;
          if (hit === "gap") {
            this.passLevel();
          } else if (hit === "danger") {
            if (fire || this.smashing) {
              this.shatter(lvl, ang, this.theme.danger);
              DZ.audio.sfx.shatter();
              this.passLevel(true);
            } else if (this.ghostT > 0) {
              this.bounce(topY);
            } else {
              this.die();
              return;
            }
          } else { // solid
            if (fire || this.smashing) {
              this.shatter(lvl, ang, this.theme.platform);
              DZ.audio.sfx.shatter();
              this.passLevel(true);
            } else {
              this.bounce(topY);
            }
          }
        }
      }

      // safety: fell past generated world
      if (this.y < -(this.maxGen * CFG.SPACING) - 8) { this.die(); return; }

      this.ensureLevels(this.levelIndex, 20);
      this.pruneLevels();

      // trail + ball visuals
      this.pushTrail(0, this.y, BALL_Z);
      const fire = this.fireT > 0;
      this.ball.position.set(0, this.y, BALL_Z);
      this.ball.rotation.y += dt * (this.smashing || fire ? 9 : 2.5);
      const sq = this.squashT > 0 ? 0.8 : 1;
      this.ball.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
      const skin = DZ.getSkin(this.skinId);
      if (fire) {
        this.ballMat.emissive.setHex(0xff6a00);
        this.ballMat.emissiveIntensity = 0.9;
        this.trailMat.color.setHex(0xff8a00);
        this.ballLight.color.setHex(0xff8a00);
        this.ballLight.intensity = 1.6;
      } else {
        this.ballMat.emissive.setHex(skin.emissive);
        this.ballMat.emissiveIntensity = 0.35;
        this.trailMat.color.setHex(skin.trail);
        this.ballLight.color.setHex(skin.trail);
        this.ballLight.intensity = 1.0;
      }
      // ghost blink
      this.ballMat.transparent = this.ghostT > 0;
      this.ballMat.opacity = this.ghostT > 0 ? (Math.sin(this.time * 18) > 0 ? 0.45 : 1) : 1;
      this.ballLight.position.set(0, this.y + 1, BALL_Z + 1.5);

      // camera follows
      const targetCam = this.y + 4.6;
      this.camY += (targetCam - this.camY) * Math.min(1, dt * (this.smashing ? 10 : 5.5));
      this.camera.position.set(0, this.camY, 10.8);
      this.camera.lookAt(0, this.y - 1.1, 0);
    }

    bounce(topY) {
      this.y = topY + CFG.BALL_R;
      this.vy = CFG.BOUNCE;
      this.squashT = 0.09;
      const hadStreak = this.streak >= 3;
      this.streak = 0;
      this.fireT = 0;
      DZ.audio.sfx.bounce(0);
      if (hadStreak && this.onFire) this.onFire(false);
      if (this.onScore) this.onScore(this.score, 0);
    }

    passLevel(smashed) {
      this.levelIndex++;
      this.streak++;
      const pro = DZ.upi.isPro();
      let pts = pro ? 2 : 1;
      if (!smashed && this.streak > 0 && this.streak % 5 === 0) pts += pro ? 10 : 5;
      this.score += pts;
      if (!smashed) DZ.audio.sfx.pass(this.streak);
      if (this.streak >= 3) {
        const was = this.fireT > 0;
        this.fireT = Math.min(this.fireT + 0.9, 4.2);
        if (!was) { DZ.audio.sfx.fire(); if (this.onFire) this.onFire(true); }
      }
      if (this.onScore) this.onScore(this.score, this.streak);
    }

    updateFx(dt) {
      for (const s of this.shards) {
        if (s.life <= 0) continue;
        s.life -= dt;
        if (s.life <= 0) { s.mesh.visible = false; continue; }
        s.vel.y -= 22 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += s.rot.x * dt;
        s.mesh.rotation.y += s.rot.y * dt;
        s.mesh.rotation.z += s.rot.z * dt;
      }
    }
  }

  DZ.Game = Game;
})();
