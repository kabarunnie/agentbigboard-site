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
      $(".pill[href='/'], .pill[href='./index.html']")?.classList.toggle("is-on", kind === "all");
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

/* Home/category feed (2026-11-26). Chips and category links keep real hrefs
   and navigate to cat-*.html / index.html so each view is only that category's
   blog posts, shown from the top of the page. In-page filtering was removed
   because it kept the previous scroll position and mixed other categories. */
(() => {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const toTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  const destPath = (href) => {
    try {
      const u = new URL(href, location.href);
      let p = u.pathname || "/";
      if (p.endsWith("/index.html")) p = p.slice(0, -10) || "/";
      if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
      return p || "/";
    } catch (e) {
      return "";
    }
  };

  const isCategoryLink = (a) => {
    if (!a) return false;
    if (a.closest(".feed-nav") || a.hasAttribute("data-cat-filter")) return true;
    if (a.classList.contains("cat") && /cat-[a-z]+\.html/i.test(a.getAttribute("href") || "")) return true;
    const href = a.getAttribute("href") || "";
    return /(?:^|\/)cat-[a-z]+\.html(?:[?#]|$)/i.test(href);
  };

  if (sessionStorage.getItem("abb-cat-top") === "1") {
    sessionStorage.removeItem("abb-cat-top");
    toTop();
    window.addEventListener("load", toTop);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isCategoryLink(a)) return;
    history.scrollRestoration = "manual";
    try { sessionStorage.setItem("abb-cat-top", "1"); } catch (err) {}
    const href = a.getAttribute("href") || "";
    if (destPath(href) === destPath(location.href)) {
      e.preventDefault();
      toTop();
    }
    // Otherwise let the browser navigate to the category (or home) page.
  });
})();

/* Ticker: set duration from actual track width so it moves ~20px/s (slower than the 96s default). */
(() => {
  const PX_PER_SEC = 20;
  const tune = () => {
    const track = document.querySelector(".ticker-track");
    const ticker = track && track.closest(".ticker");
    if (!track || !ticker) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const half = track.scrollWidth / 2;
    if (!half) return;
    const dur = Math.max(half / PX_PER_SEC, 180);
    ticker.style.setProperty("--ticker-duration", `${dur}s`);
    ticker.dataset.tickerHalf = String(Math.round(half));
    ticker.dataset.tickerSeconds = String(Math.round(dur));
    ticker.dataset.tickerPxPerSec = String(PX_PER_SEC);
  };
  if (document.readyState === "complete") tune();
  else window.addEventListener("load", tune);
  window.addEventListener("resize", tune);
})();

/* In-page modal for channel and briefing links. Real hrefs stay for no-JS and crawlers. */
(() => {
  const dataUrl = (() => {
    const link = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
    try {
      return new URL("modal-data.json", link ? link.href : new URL("./assets/style.css", location.href)).href;
    } catch (e) {
      return "./assets/modal-data.json";
    }
  })();

  let dataPromise = null;
  const loadData = () => {
    if (!dataPromise) {
      dataPromise = fetch(dataUrl, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("modal data");
        return r.json();
      });
    }
    return dataPromise;
  };

  const esc = (s) => String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const catClass = (slug) => (slug ? `cat cat-${slug}` : "cat");

  const ensureModal = () => {
    let root = document.getElementById("site-modal");
    if (root) return root;
    root = document.createElement("div");
    root.id = "site-modal";
    root.className = "site-modal";
    root.hidden = true;
    root.innerHTML = `
      <div class="site-modal-backdrop" data-close="1"></div>
      <div class="site-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="site-modal-title" tabindex="-1">
        <button type="button" class="site-modal-close" data-close="1" aria-label="닫기">×</button>
        <div class="site-modal-body"></div>
      </div>`;
    document.body.appendChild(root);
    return root;
  };

  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const ap = d.getHours() < 12 ? "오전" : "오후";
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ap} ${h}:${m}`;
  };

  const bloggerBlock = (ch) => {
    if (!ch) return "";
    const av = ch.avatar
      ? `<img class="avatar" src="${esc(ch.avatar)}" alt="${esc(ch.display)}" width="48" height="48">`
      : `<span class="avatar-fallback" aria-hidden="true">${esc((ch.display || "?").slice(0, 1))}</span>`;
    return `<div class="site-modal-blogger">
      ${av}
      <div>
        <div class="nm">${esc(ch.display || "")} <span class="${catClass(ch.slug)}">${esc(ch.category || "")}</span></div>
        <p class="who">${esc(ch.who || "")}</p>
      </div>
    </div>`;
  };

  const recentList = (ids, posts, title) => {
    const rows = (ids || []).map((id) => posts[id]).filter(Boolean);
    if (!rows.length) return "";
    return `<p class="section-label">${esc(title)}</p><ul class="more-list">${rows.map((p) =>
      `<li><a href="./post-${esc(p.id)}.html">${esc(p.title)}</a></li>`
    ).join("")}</ul>`;
  };

  const renderPost = (data, id) => {
    const p = data.posts[id];
    if (!p) return null;
    const ch = data.channels[p.channel_id] || {};
    // *_html fields are escaped server-side; only <strong class="ul-em"> is added.
    const kpsHtml = p.keypoints_html || (p.keypoints || []).map(esc);
    const kps = kpsHtml.map((k) => `<li>${k}</li>`).join("");
    const src = p.url || ch.url || "#";
    return `${bloggerBlock(ch)}
      <h2 id="site-modal-title">${esc(p.title)}</h2>
      <p class="section-label">${esc(fmtTime(p.published))}</p>
      <div class="site-modal-summary">${p.summary_html || esc(p.summary || p.excerpt || "")}</div>
      ${kps ? `<p class="section-label">핵심 포인트</p><ul class="site-modal-kps">${kps}</ul>` : ""}
      <a class="btn-primary" href="${esc(src)}" rel="noopener">원문 보기</a>
      ${recentList(ch.recent, data.posts, "이 블로거의 최근 글")}
      <p><a class="full-ch no-modal" href="./channel-${esc(p.channel_id)}.html">채널 페이지 열기</a></p>`;
  };

  const renderChannel = (data, id) => {
    const ch = data.channels[id];
    if (!ch) return null;
    return `${bloggerBlock(ch)}
      <h2 id="site-modal-title">${esc(ch.display || "")}</h2>
      <div class="site-modal-summary">${esc(ch.reason || ch.who || "")}</div>
      ${recentList(ch.recent, data.posts, "최근 글 5건")}
      <a class="btn-primary" href="${esc(ch.url || "#")}" rel="noopener">원문 보기</a>
      <p><a class="full-ch no-modal" href="./channel-${esc(id)}.html">채널 페이지 열기</a></p>`;
  };

  let lastFocus = null;
  const open = (hash, html) => {
    const root = ensureModal();
    const body = root.querySelector(".site-modal-body");
    const sheet = root.querySelector(".site-modal-sheet");
    body.innerHTML = html;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.style.overflow = "hidden";
    sheet.focus();
    if (location.hash !== hash) history.pushState({ modal: hash }, "", hash);
  };

  const close = ({ fromPop } = {}) => {
    const root = document.getElementById("site-modal");
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (!fromPop && location.hash && (location.hash.startsWith("#brief-") || location.hash.startsWith("#channel-"))) {
      history.pushState({ modal: "" }, "", location.pathname + location.search);
    }
  };

  const openPost = (id) => loadData().then((data) => {
    const html = renderPost(data, id);
    if (html === null) { location.href = `./post-${id}.html`; return; }
    open(`#brief-${id}`, html);
  }).catch(() => {
    location.href = `./post-${id}.html`;
  });
  const openChannel = (id) => loadData().then((data) => {
    const html = renderChannel(data, id);
    if (html === null) { location.href = `./channel-${id}.html`; return; }
    open(`#channel-${id}`, html);
  }).catch(() => {
    location.href = `./channel-${id}.html`;
  });

  const applyHash = () => {
    const h = location.hash || "";
    if (h.startsWith("#brief-")) openPost(h.slice(7));
    else if (h.startsWith("#channel-")) openChannel(h.slice(9));
    else close({ fromPop: true });
  };

  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn && closeBtn.closest("#site-modal")) {
      e.preventDefault();
      close();
      return;
    }
    const a = e.target.closest("a[href]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.classList.contains("no-modal") || a.dataset.fullPage === "1") return;
    if (a.classList.contains("is-src")) return;
    // Only feed surfaces open the popup; everything else navigates normally.
    if (!a.closest(".feed-item, .ticker, .people-strip, #site-modal")) return;
    const href = a.getAttribute("href") || "";
    if (/^https?:/i.test(href) && !href.includes("/post-") && !href.includes("/channel-")) return;
    const post = href.match(/(?:^\.\/|(?:https?:\/\/[^/]+\/))post-([a-f0-9]+)\.html(?:#.*)?$/i);
    const ch = href.match(/(?:^\.\/|(?:https?:\/\/[^/]+\/))channel-([^./]+)\.html(?:#.*)?$/i);
    if (post) {
      e.preventDefault();
      openPost(post[1]);
    } else if (ch) {
      e.preventDefault();
      openChannel(ch[1]);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  window.addEventListener("popstate", applyHash);
  window.addEventListener("hashchange", applyHash);
  if (/^#brief-|^#channel-/.test(location.hash)) applyHash();
})();

/* Home feed: 「더 보기」 — 처음 120건 뒤의 글을 data/home-feed-more.html 에서 한 번만 불러와 붙인다. 실패하면 분류 링크가 대신한다. */
(() => {
  const btn = document.querySelector("[data-feed-more-btn]");
  if (!btn) return;
  const wrap = btn.closest("[data-feed-more]");
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "불러오는 중…";
    try {
      const res = await fetch(btn.dataset.src, { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const html = await res.text();
      const tpl = document.createElement("template");
      tpl.innerHTML = html;
      wrap.parentNode.insertBefore(tpl.content, wrap);
      wrap.querySelector(".feed-more-btn")?.remove();
      const note = wrap.querySelector(".feed-more-note");
      if (note) note.textContent = "최근 글을 모두 불러왔습니다.";
    } catch (e) {
      btn.disabled = false;
      btn.textContent = label;
    }
  });
})();
