/* DropZone 3D — UI: screens, shop, themes, Pro + UPI pay flow */
(function () {
  const $ = id => document.getElementById(id);

  const ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 7l4 4 5-6 5 6 4-4-1.5 11h-15z"/><path d="M4 20h16v1.5H4z"/></svg>',
    palette: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.4-2.2-.7-1.4.1-2.8 1.6-2.8H17a4 4 0 004-4c0-4.9-4-9-9-9z"/><circle cx="7.5" cy="10.5" r="1.4"/><circle cx="12" cy="7.5" r="1.4"/><circle cx="16.5" cy="10.5" r="1.4"/></svg>',
    ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-3 2.5-3 14.5 0 17M3.5 12c2.5-3 14.5-3 17 0" fill="none" stroke-width="1.6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" fill="none" stroke-width="1.8"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke-width="1.8"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 01-10 0zM7 5H4a3 3 0 003 5M17 5h3a3 3 0 01-3 5M12 14v3M8 21h8M10 17h4" fill="none" stroke-width="1.8"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 10-2.5 5.8M20 12V6m0 6h-6" fill="none" stroke-width="1.8"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" fill="none" stroke-width="1.8"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" fill="none" stroke-width="2.4"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke-width="1.8"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke-width="1.8"/><path d="M9 12l2 2 4-4" fill="none" stroke-width="1.8"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke-width="1.8"/><path d="M9.5 9.5A2.5 2.5 0 0112 8c1.4 0 2.5 1 2.5 2.2 0 1.7-2.3 2-2.3 3.6" fill="none" stroke-width="1.8"/><circle cx="12" cy="17" r="1.2"/></svg>'
  };
  const icon = (n, cls) => `<span class="ic ${cls || ""}">${ICONS[n] || ""}</span>`;
  DZ.icon = icon;

  let game = null;
  const overlays = ["pauseMenu", "gameOver", "shop", "themes", "proModal", "paySheet", "howto"];
  let lastFocus = null;

  function show(id) {
    lastFocus = id;
    overlays.forEach(o => $(o).classList.toggle("open", o === id));
    $("hud").classList.toggle("dim", !!id);
  }
  function hideAll() { show(null); }

  let toastTimer = 0;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }
  DZ.toast = toast;

  function fmt(n) { return n.toLocaleString("en-IN"); }

  /* ---------- menu / hud ---------- */
  function refreshMenu() {
    $("bestScore").textContent = fmt(game.best);
    $("gamesPlayed").textContent = fmt(DZ.store.int("dz_games", 0));
    const pro = DZ.upi.isPro();
    $("menuProBadge").style.display = pro ? "inline-flex" : "none";
    $("btnPro").classList.toggle("owned", pro);
    $("btnPro").querySelector(".btn-sub").textContent = pro ? "Active" : "₹99 one-time";
    document.body.classList.toggle("is-pro", pro);
  }

  function startGame() {
    DZ.audio.unlock();
    DZ.audio.sfx.click();
    hideAll();
    $("menu").classList.remove("open");
    $("hud").classList.add("open");
    game.startRun();
  }

  function toMenu() {
    DZ.audio.sfx.click();
    hideAll();
    game.toMenu();
    $("hud").classList.remove("open");
    $("menu").classList.add("open");
    refreshMenu();
  }

  /* ---------- game over ---------- */
  function onGameOver(score, isBest, revivesLeft) {
    $("finalScore").textContent = fmt(score);
    $("overBest").textContent = fmt(game.best);
    $("newBest").style.display = isBest && score > 0 ? "inline-flex" : "none";
    const rb = $("btnRevive");
    if (revivesLeft > 0) {
      rb.style.display = "flex";
      rb.querySelector(".btn-sub").textContent = revivesLeft > 900 ? "Unlimited (Pro)" : revivesLeft + " left this run";
    } else rb.style.display = "none";
    $("hud").classList.remove("open");
    setTimeout(() => show("gameOver"), 450);
  }

  /* ---------- shop (skins) ---------- */
  function renderSkins() {
    const pro = DZ.upi.isPro();
    const cur = game.skinId;
    $("skinGrid").innerHTML = DZ.Skins.map(s => {
      const locked = s.pro && !pro;
      const sel = s.id === cur;
      const c = "#" + s.color.toString(16).padStart(6, "0");
      return `<button class="card ${sel ? "sel" : ""} ${locked ? "locked" : ""}" data-id="${s.id}">
        <span class="swatch" style="background:${c};box-shadow:0 0 18px ${c}66"></span>
        <span class="card-name">${s.name}</span>
        ${locked ? `<span class="tag pro-tag">${icon("lock")} PRO</span>` : sel ? `<span class="tag sel-tag">${icon("check")}</span>` : ""}
      </button>`;
    }).join("");
    $("skinGrid").querySelectorAll(".card").forEach(el => {
      el.addEventListener("click", () => {
        const s = DZ.getSkin(el.dataset.id);
        if (s.pro && !DZ.upi.isPro()) { DZ.audio.sfx.click(); openPro(); return; }
        game.setSkin(s.id);
        DZ.audio.sfx.click();
        renderSkins();
      });
    });
  }

  /* ---------- themes ---------- */
  function renderThemes() {
    const pro = DZ.upi.isPro();
    const cur = game.themeId;
    $("themeGrid").innerHTML = DZ.Themes.map(t => {
      const locked = t.pro && !pro;
      const sel = t.id === cur;
      const c1 = "#" + t.platform.toString(16).padStart(6, "0");
      const c2 = "#" + t.top.toString(16).padStart(6, "0");
      return `<button class="card ${sel ? "sel" : ""} ${locked ? "locked" : ""}" data-id="${t.id}">
        <span class="swatch theme-sw" style="background:linear-gradient(135deg,${c2} 0%,${c2} 45%,${c1} 55%,${c1} 100%)"></span>
        <span class="card-name">${t.name}</span>
        ${locked ? `<span class="tag pro-tag">${icon("lock")} PRO</span>` : sel ? `<span class="tag sel-tag">${icon("check")}</span>` : ""}
      </button>`;
    }).join("");
    $("themeGrid").querySelectorAll(".card").forEach(el => {
      el.addEventListener("click", () => {
        const t = DZ.getTheme(el.dataset.id);
        if (t.pro && !DZ.upi.isPro()) { DZ.audio.sfx.click(); openPro(); return; }
        game.setTheme(t.id);
        DZ.audio.sfx.click();
        renderThemes();
      });
    });
  }

  /* ---------- pro ---------- */
  function openPro() {
    const pro = DZ.upi.isPro();
    $("proOwned").style.display = pro ? "block" : "none";
    $("proPitch").style.display = pro ? "none" : "block";
    show("proModal");
  }

  /* ---------- pay ---------- */
  function openPay() {
    DZ.audio.sfx.click();
    const ok = DZ.upi.isConfigured();
    $("paySetup").style.display = ok ? "block" : "none";
    $("payPending").style.display = ok ? "none" : "block";
    if (ok) {
      const { intent } = DZ.upi.buildIntent();
      $("payLink").href = intent;
      try {
        const qr = qrcode(0, "M");
        qr.addData(intent);
        qr.make();
        $("qrWrap").innerHTML = qr.createImgTag(5, 10);
      } catch (e) {
        $("qrWrap").innerHTML = "";
      }
      $("payUpiId").textContent = DZ.config.UPI_ID;
      $("payAmt").textContent = DZ.config.PRO_PRICE_LABEL;
      $("utrInput").value = "";
      $("payError").textContent = "";
    }
    show("paySheet");
  }

  function verifyUtr() {
    const v = $("utrInput").value;
    if (!DZ.upi.validUtr(v)) {
      $("payError").textContent = "Please enter the 12-digit UTR / transaction reference from your UPI app.";
      return;
    }
    DZ.upi.activatePro();
    DZ.audio.sfx.pro();
    hideAll();
    game.revivesLeft = 999;
    refreshMenu(); renderSkins(); renderThemes();
    toast("Pro unlocked. Welcome to the club.");
  }

  /* ---------- boot ---------- */
  function boot() {
    game = new DZ.Game($("game-holder"));
    DZ.game = game;

    game.onScore = (score, streak) => {
      $("hudScore").textContent = fmt(score);
      $("hudScore").classList.remove("pop");
      void $("hudScore").offsetWidth;
      $("hudScore").classList.add("pop");
      const st = $("streakPill");
      if (streak >= 2) { st.style.display = "inline-flex"; st.querySelector("b").textContent = "x" + streak; }
      else st.style.display = "none";
    };
    game.onGameOver = onGameOver;
    game.onFire = active => { $("firePill").style.display = active ? "inline-flex" : "none"; };

    // menu buttons
    $("btnPlay").addEventListener("click", () => {
      if (DZ.store.get("dz_seen_howto") !== "1") { show("howto"); return; }
      startGame();
    });
    $("btnSkins").addEventListener("click", () => { DZ.audio.sfx.click(); renderSkins(); show("shop"); });
    $("btnThemes").addEventListener("click", () => { DZ.audio.sfx.click(); renderThemes(); show("themes"); });
    $("btnPro").addEventListener("click", () => { DZ.audio.sfx.click(); openPro(); });
    $("btnHowto").addEventListener("click", () => { DZ.audio.sfx.click(); show("howto"); });
    $("btnSound").addEventListener("click", () => {
      const m = !DZ.audio.isMuted();
      DZ.audio.setMuted(m);
      $("btnSound").innerHTML = icon(m ? "mute" : "sound");
      if (!m) DZ.audio.sfx.click();
    });
    $("btnSound").innerHTML = icon(DZ.audio.isMuted() ? "mute" : "sound");

    // hud
    $("btnPause").addEventListener("click", () => { DZ.audio.sfx.click(); game.pause(); show("pauseMenu"); });
    $("btnResume").addEventListener("click", () => { DZ.audio.sfx.click(); hideAll(); game.resume(); });
    $("btnRestart").addEventListener("click", startGame);
    $("btnQuit").addEventListener("click", toMenu);

    // game over
    $("btnRevive").addEventListener("click", () => {
      if (game.revive()) { hideAll(); $("hud").classList.add("open"); }
      else toast("No revives left.");
    });
    $("btnRetry").addEventListener("click", startGame);
    $("btnMenu2").addEventListener("click", toMenu);

    // overlays: close buttons
    document.querySelectorAll("[data-close]").forEach(b =>
      b.addEventListener("click", () => { DZ.audio.sfx.click(); hideAll(); }));

    // pro
    $("btnBuyPro").addEventListener("click", openPay);
    $("btnProSkins").addEventListener("click", () => { renderSkins(); show("shop"); });

    // pay
    $("btnVerify").addEventListener("click", verifyUtr);
    $("utrInput").addEventListener("input", e => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 12);
      $("payError").textContent = "";
    });

    // howto
    $("btnHowtoPlay").addEventListener("click", () => {
      DZ.store.set("dz_seen_howto", "1");
      DZ.audio.sfx.click();
      hideAll();
      if ($("menu").classList.contains("open")) startGame();
    });

    refreshMenu();
    // reveal
    setTimeout(() => {
      $("loading").classList.remove("open");
      $("menu").classList.add("open");
    }, 900);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
