(() => {
  const FAV_KEY = "abb:favs";
  const READ_KEY = "abb:read";
  const THEME_KEY = "abb:theme";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const readList = (key, fallback) => {
    try {
      const cur = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(cur)) return cur;
    } catch {}
    if (fallback) {
      try {
        const old = JSON.parse(localStorage.getItem(fallback) || "[]");
        if (Array.isArray(old) && old.length) {
          localStorage.setItem(key, JSON.stringify(old));
          return old;
        }
      } catch {}
    }
    return [];
  };
  const favs = new Set(readList(FAV_KEY, "gorneun:favs"));
  const reads = new Set(readList(READ_KEY, "gorneun:read"));
  const save = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme || "";
    const btn = $("#themeBtn");
    if (btn) btn.textContent = theme === "dark" ? "밝게" : "어둡게";
  };
  applyTheme(localStorage.getItem(THEME_KEY) || "");

  const relTimeKo = (iso) => {
    if (!iso) return "날짜 미확인";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso).slice(0, 16);
    const sec = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (sec < 60) return "방금";
    if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
    const days = Math.floor(sec / 86400);
    if (days < 7) return `${days}일 전`;
    const kst = new Date(dt.getTime() + 9 * 3600 * 1000);
    return kst.toISOString().slice(0, 10);
  };
  const paintTimes = () => {
    $$("time[datetime]").forEach((el) => {
      el.textContent = relTimeKo(el.getAttribute("datetime"));
    });
  };
  paintTimes();
  setInterval(paintTimes, 60000);

  $("#themeBtn")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "" : "dark";
    if (next) localStorage.setItem(THEME_KEY, next);
    else localStorage.removeItem(THEME_KEY);
    applyTheme(next);
  });

  const panel = $("#searchPanel");
  $("#searchBtn")?.addEventListener("click", () => {
    const on = panel.hasAttribute("hidden");
    if (on) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
    if (on) $("#q")?.focus();
  });
  const params = new URLSearchParams(location.search);
  const input = $("#q");
  if (input && params.get("q")) {
    input.value = params.get("q");
    panel?.removeAttribute("hidden");
  }

  const filter = () => {
    const q = (input?.value || "").trim().toLowerCase();
    const origin = document.body.dataset.originFilter || "";
    const light = document.body.dataset.lightFilter === "1";
    const hot = document.body.dataset.hotFilter === "1";
    const favOnly = document.body.dataset.favOnly === "1";
    $$(".card[data-channel]").forEach((card) => {
      const text = card.textContent.toLowerCase();
      const okQ = !q || text.includes(q);
      const okO = !origin || card.dataset.origin === origin;
      const okL = !light || card.dataset.cat === "life";
      const okH = !hot || card.dataset.hot === "1";
      const okF = !favOnly || favs.has(card.dataset.channel);
      const isMore = card.classList.contains("is-more");
      card.style.display = okQ && okO && okL && okF && okH && !isMore ? "" : "none";
    });
    const empty = $("[data-empty]");
    if (empty) {
      const vis = $$(".card[data-channel]").filter((c) => c.style.display !== "none");
      empty.hidden = vis.length > 0;
    }
  };

  $("#searchForm")?.addEventListener("submit", (e) => {
    if (location.pathname.endsWith("index.html") || /\/$/.test(location.pathname)) {
      e.preventDefault();
      const q = input?.value.trim() || "";
      history.replaceState(null, "", q ? `?q=${encodeURIComponent(q)}` : location.pathname);
      filter();
    }
  });
  input?.addEventListener("input", filter);

  $$("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (btn.tagName === "A" && btn.getAttribute("href") && btn.getAttribute("href") !== "#") return;
      e.preventDefault();
      const kind = btn.dataset.filter;
      $$("[data-filter]").forEach((b) => b.classList.remove("is-on", "is-soft"));
      if (kind === "all") {
        document.body.dataset.originFilter = "";
        document.body.dataset.lightFilter = "0";
        document.body.dataset.hotFilter = "0";
        btn.classList.add("is-on");
      } else if (kind === "overseas") {
        document.body.dataset.originFilter = "해외";
        document.body.dataset.lightFilter = "0";
        document.body.dataset.hotFilter = "0";
        btn.classList.add("is-soft");
      } else if (kind === "light") {
        document.body.dataset.originFilter = "";
        document.body.dataset.lightFilter = "1";
        document.body.dataset.hotFilter = "0";
        btn.classList.add("is-soft");
      } else if (kind === "hot") {
        document.body.dataset.originFilter = "";
        document.body.dataset.lightFilter = "0";
        document.body.dataset.hotFilter = "1";
        btn.classList.add("is-soft");
      }
      $(".pill[href='./index.html']")?.classList.toggle("is-on", kind === "all");
      filter();
    });
  });

  $("#catMenuBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.currentTarget.parentElement.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".pill-menu")) $$(".pill-menu").forEach((m) => m.classList.remove("open"));
  });

  const paintFav = () => {
    $$("[data-fav]").forEach((btn) => {
      const on = favs.has(btn.dataset.fav);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (!btn.dataset.labelLocked) btn.textContent = on ? "담음" : "담기";
    });
    $$("[data-read]").forEach((btn) => {
      const on = reads.has(btn.dataset.read);
      btn.textContent = on ? "읽음 표시됨" : "읽음";
    });
    const saved = $("[data-saved-count]");
    const unread = $("[data-unread-count]");
    if (saved) saved.textContent = String(favs.size);
    if (unread) {
      const ids = $$(".card[data-id], [data-post-id]").map((n) => n.dataset.id || n.dataset.postId).filter(Boolean);
      const uniq = new Set(ids);
      unread.textContent = String([...uniq].filter((id) => !reads.has(id)).length);
    }
  };
  document.addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      const id = favBtn.dataset.fav;
      if (favs.has(id)) favs.delete(id);
      else favs.add(id);
      save(FAV_KEY, favs);
      paintFav();
    }
    const readBtn = e.target.closest("[data-read]");
    if (readBtn) {
      const id = readBtn.dataset.read;
      if (reads.has(id)) reads.delete(id);
      else reads.add(id);
      save(READ_KEY, reads);
      paintFav();
    }
  });

  if (location.hash === "#drawer" || params.get("my") === "1") {
    $("[data-drawer]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  paintFav();
  filter();
})();



/* engagement: reveal more cards, infinite on scroll; respect reduced motion */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const moreBtn = document.querySelector("[data-more-feed]");
  const box = document.querySelector("#feed");
  const reveal = (n = 24) => {
    if (!box) return 0;
    const hidden = [...box.querySelectorAll(".card.is-more")];
    hidden.slice(0, n).forEach((c) => {
      c.classList.remove("is-more");
      if (c.style.display === "none") c.style.display = "";
    });
    const left = box.querySelectorAll(".card.is-more").length;
    if (moreBtn && left === 0) moreBtn.hidden = true;
    return hidden.length;
  };
  moreBtn?.addEventListener("click", () => reveal(24));
  if (box && !reduce) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) reveal(16);
    }, { rootMargin: "400px 0px" });
    if (moreBtn) io.observe(moreBtn);
  }
  // post page: reveal extra read-next
  const nxt = document.querySelector("[data-more-next]");
  if (nxt) {
    nxt.addEventListener("click", () => {
      const hidden = [...document.querySelectorAll(".read-next .is-more")].slice(0, 8);
      hidden.forEach((c) => c.classList.remove("is-more"));
      if (!document.querySelector(".read-next .is-more")) nxt.hidden = true;
    });
  }
})();
