// 모든 페이지 공통: 헤더/푸터, 테마 전환, 아이콘, 유틸
window.Site = (function () {
  const P = window.PROFILE || {};

  // ---------- 아이콘 (24x24 stroke) ----------
  const ICONS = {
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    blog: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    location: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'
  };

  // 관리자 비밀번호 — ⚠ 페이지 소스에서 누구나 볼 수 있으므로 진짜 보안 장치는 아닙니다.
  const ADMIN_PASSWORD = "1234";
  const ADMIN_KEY = "admin-auth";

  function icon(name, size) {
    const s = size || 18;
    return '<svg class="icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.link) + "</svg>";
  }

  // ---------- 유틸 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // "2026-01-02" → "2026.01.02"
  function fmtDate(s) {
    return s ? String(s).replace(/-/g, ".") : "";
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // 프로젝트별 고정 그라디언트 (썸네일 없을 때)
  function gradient(seed) {
    let h = 0;
    String(seed).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; });
    return "linear-gradient(135deg, hsl(" + h + " 70% 62%), hsl(" + ((h + 45) % 360) + " 72% 48%))";
  }

  function copyText(text, btn) {
    const done = function () {
      if (!btn) return;
      const old = btn.innerHTML;
      btn.classList.add("copied");
      btn.innerHTML = "복사됨";
      setTimeout(function () { btn.innerHTML = old; btn.classList.remove("copied"); }, 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
    else done();
  }

  // 유튜브 주소 → 영상 ID (이미 ID면 그대로)
  function youtubeId(s) {
    s = String(s || "").trim();
    const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : s;
  }

  // ---------- HTML 데모 (웹 생성기 결과물) ----------
  // demo: { title, mode: "paste" | "file", html, src, height }
  function demoSource(d, resolve) {
    if (!d) return {};
    const useHtml = d.mode ? d.mode === "paste" : !!d.html;
    if (useHtml) return d.html && d.html.trim() ? { html: d.html } : {};
    return d.src ? { src: resolve ? resolve(d.src) : d.src } : {};
  }
  function hasDemo(d) {
    const s = demoSource(d);
    return !!(s.html || s.src);
  }

  // 컨테이너 안에 iframe 으로 실행. 높이를 비우면 내용에 맞춰 자동 조절
  function mountDemo(box, d, resolve) {
    box.innerHTML = "";
    const s = demoSource(d, resolve);
    if (!s.html && !s.src) {
      box.innerHTML = '<p class="demo-empty">표시할 HTML이 없습니다.</p>';
      return null;
    }
    const f = document.createElement("iframe");
    f.title = d.title || "실행 화면";
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock");
    f.setAttribute("allow", "fullscreen; clipboard-write; autoplay");
    const fixed = parseInt(d.height, 10);
    f.style.height = (fixed > 0 ? fixed : 480) + "px";
    if (!(fixed > 0)) f.addEventListener("load", function () { autoHeight(f); });
    if (s.html) f.srcdoc = s.html;
    else f.src = s.src;
    box.appendChild(f);
    return f;
  }

  function autoHeight(f) {
    let doc;
    try { doc = f.contentDocument; } catch (e) { return; }
    if (!doc || !doc.body) return;
    const fit = function () {
      const b = doc.body;
      const cs = doc.defaultView.getComputedStyle(b);
      const hgt = b.scrollHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      const next = Math.min(Math.max(Math.ceil(hgt), 160), 1600);
      if (Math.abs((parseFloat(f.style.height) || 0) - next) > 2) f.style.height = next + "px";
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(doc.body);
  }

  function openDemo(d, resolve) {
    const s = demoSource(d, resolve);
    if (s.src) window.open(s.src, "_blank", "noopener");
    else if (s.html) window.open(URL.createObjectURL(new Blob([s.html], { type: "text/html" })), "_blank");
  }

  // ---------- 이미지 크게 보기 ----------
  function lightbox(items, start) {
    if (!items || !items.length) return;
    let i = start || 0;
    const many = items.length > 1;
    const el = document.createElement("div");
    el.className = "lightbox";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML =
      '<button class="lb-btn lb-close" type="button" aria-label="닫기">✕</button>' +
      (many ? '<button class="lb-btn lb-prev" type="button" aria-label="이전 이미지">‹</button>' +
              '<button class="lb-btn lb-next" type="button" aria-label="다음 이미지">›</button>' : "") +
      '<figure class="lb-figure"><img alt=""><figcaption></figcaption></figure>' +
      (many ? '<span class="lb-count"></span>' : "");

    const img = el.querySelector("img");
    const cap = el.querySelector("figcaption");
    const count = el.querySelector(".lb-count");

    function show() {
      const it = items[i];
      img.src = it.src;
      img.alt = it.caption || "";
      cap.textContent = it.caption || "";
      cap.hidden = !it.caption;
      if (count) count.textContent = (i + 1) + " / " + items.length;
    }
    function go(d) { i = (i + d + items.length) % items.length; show(); }
    function close() {
      el.remove();
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (many && e.key === "ArrowLeft") go(-1);
      else if (many && e.key === "ArrowRight") go(1);
    }

    el.addEventListener("click", function (e) {
      if (e.target === el || e.target.classList.contains("lb-figure")) close();
    });
    el.querySelector(".lb-close").addEventListener("click", close);
    if (many) {
      el.querySelector(".lb-prev").addEventListener("click", function () { go(-1); });
      el.querySelector(".lb-next").addEventListener("click", function () { go(1); });
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.appendChild(el);
    show();
    el.querySelector(".lb-close").focus();
  }

  // ---------- 관리자 로그인 ----------
  function isAdmin() {
    try { return sessionStorage.getItem(ADMIN_KEY) === "1"; } catch (e) { return false; }
  }
  function setAdminAuth(on) {
    try {
      if (on) sessionStorage.setItem(ADMIN_KEY, "1");
      else sessionStorage.removeItem(ADMIN_KEY);
    } catch (e) { /* 저장 불가 시 무시 */ }
  }

  // opts: { onSuccess, onCancel }
  function openAdminLogin(opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML =
      '<form class="modal-card" autocomplete="off" novalidate>' +
        '<span class="modal-icon">' + icon("lock", 22) + "</span>" +
        "<h2>관리자 로그인</h2>" +
        "<p>비밀번호를 입력하세요.</p>" +
        '<input class="input" type="password" placeholder="비밀번호" aria-label="비밀번호">' +
        '<p class="modal-error" hidden>비밀번호가 올바르지 않습니다.</p>' +
        '<div class="btn-row">' +
          '<button type="button" class="btn" data-cancel>취소</button>' +
          '<button type="submit" class="btn btn-primary">들어가기</button>' +
        "</div>" +
      "</form>";

    const form = wrap.querySelector("form");
    const input = form.querySelector("input");
    const err = form.querySelector(".modal-error");

    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function cancel() { close(); if (opts.onCancel) opts.onCancel(); }
    function onKey(e) { if (e.key === "Escape") cancel(); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (input.value === ADMIN_PASSWORD) {
        setAdminAuth(true);
        close();
        if (opts.onSuccess) opts.onSuccess();
      } else {
        err.hidden = false;
        input.value = "";
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
        input.focus();
      }
    });
    form.querySelector("[data-cancel]").addEventListener("click", cancel);
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) cancel(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    input.focus();
  }

  // 사이트 하단 "관리자" 링크
  function initAdminLink() {
    document.querySelectorAll("[data-admin-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        const go = function () { location.href = "Managers/Managers.html"; };
        if (isAdmin()) go();
        else openAdminLogin({ onSuccess: go });
      });
    });
  }

  // ---------- 테마 ----------
  function currentTheme() {
    const set = document.documentElement.dataset.theme;
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function initTheme() {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    const paint = function () { btn.innerHTML = icon(currentTheme() === "dark" ? "sun" : "moon", 18); };
    paint();
    btn.addEventListener("click", function () {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* 저장 불가 시 무시 */ }
      paint();
    });
  }

  // ---------- 헤더 / 푸터 ----------
  function setActiveTab(tab) {
    document.querySelectorAll(".tab").forEach(function (t) {
      const on = t.dataset.tab === tab;
      t.classList.toggle("active", on);
      if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
  }

  function initPage(activeTab) {
    if (P.name) {
      document.querySelectorAll("[data-logo-text]").forEach(function (el) { el.textContent = P.name; });
      document.querySelectorAll("[data-logo-mark]").forEach(function (el) { el.textContent = P.name.charAt(0); });
    }
    document.querySelectorAll("[data-footer]").forEach(function (el) {
      el.textContent = P.footer || "";
    });
    document.querySelectorAll(".to-top").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    });
    initTheme();
    initAdminLink();
    if (activeTab) setActiveTab(activeTab);
  }

  function tagsHtml(tags) {
    return '<div class="tags">' + (tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("") + "</div>";
  }

  return {
    icon: icon, esc: esc, fmtDate: fmtDate, param: param, gradient: gradient,
    copyText: copyText, initPage: initPage, initTheme: initTheme, setActiveTab: setActiveTab, tagsHtml: tagsHtml,
    youtubeId: youtubeId, lightbox: lightbox,
    hasDemo: hasDemo, mountDemo: mountDemo, openDemo: openDemo,
    isAdmin: isAdmin, setAdminAuth: setAdminAuth, openAdminLogin: openAdminLogin
  };
})();
