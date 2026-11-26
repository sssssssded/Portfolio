// 메인 페이지: 소개 / 포트폴리오 / 블로그 / 연락처 탭
(function () {
  const S = window.Site;
  const esc = S.esc;
  const P = window.PROFILE || {};
  const PROJECTS = window.PROJECTS || [];
  const POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  });

  const TABS = { about: "소개", portfolio: "포트폴리오", blog: "블로그", contact: "연락처" };

  S.initPage();
  renderAbout();
  renderPortfolio();
  renderBlog();
  renderContact();

  window.addEventListener("hashchange", function () { route(false); });
  route(true);

  // ---------- 탭 라우팅 (#about, #portfolio, #blog, #contact) ----------
  function route(initial) {
    let tab = location.hash.replace("#", "");
    if (!TABS[tab]) tab = "about";
    document.querySelectorAll("[data-panel]").forEach(function (p) {
      p.hidden = p.dataset.panel !== tab;
    });
    S.setActiveTab(tab);
    document.title = TABS[tab] + " | " + (P.name || "Portfolio");
    if (!initial) window.scrollTo({ top: 0 });
  }

  // =========================================================
  // 소개
  // =========================================================
  function renderAbout() {
    const el = document.getElementById("panel-about");
    const avatar = P.photo
      ? '<img src="' + esc(P.photo) + '" alt="' + esc(P.name) + '">'
      : "<span>" + esc((P.name || "?").charAt(0)) + "</span>";

    const stats = [
      { label: "프로젝트", value: PROJECTS.length },
      { label: "블로그 글", value: POSTS.length }
    ].concat(P.stats || []);

    let html = "";

    html += '<div class="about-hero">';
    html += '<div class="avatar">' + avatar + "</div>";
    html += '<p class="eyebrow">' + esc(P.name) + (P.role ? " · " + esc(P.role) : "") + "</p>";
    html += '<h1 class="display">' + esc(P.headline || P.name) + "</h1>";
    if (P.intro) html += '<p class="lead">' + esc(P.intro) + "</p>";
    html += '<div class="btn-row">' +
      '<a class="btn btn-primary" href="#portfolio">포트폴리오 보기</a>' +
      '<a class="btn" href="#contact">연락하기</a>' +
      (P.resume ? '<a class="btn" href="' + esc(P.resume) + '" target="_blank" rel="noopener">' + S.icon("download", 16) + "이력서</a>" : "") +
      "</div>";
    html += "</div>";

    html += '<dl class="stats">' + stats.map(function (s) {
      return '<div class="stat"><dt>' + esc(s.label) + "</dt><dd>" + esc(s.value) + "</dd></div>";
    }).join("") + "</dl>";

    if (P.about && P.about.length) {
      html += '<section class="block"><h2 class="block-title">About me</h2><div class="about-text">' +
        P.about.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div></section>";
    }

    if (P.skills && P.skills.length) {
      html += '<section class="block"><h2 class="block-title">기술 스택</h2><div class="skill-grid">';
      P.skills.forEach(function (g) {
        html += '<div class="skill-card"><h3>' + esc(g.group) + '</h3><div class="chips">' +
          (g.items || []).map(function (i) { return '<span class="chip">' + esc(i) + "</span>"; }).join("") +
          "</div></div>";
      });
      html += "</div></section>";
    }

    if (P.history && P.history.length) {
      html += '<section class="block"><h2 class="block-title">이력</h2><div class="history-grid">';
      P.history.forEach(function (h) {
        html += '<div class="history"><h3>' + esc(h.title) + '</h3><ol class="timeline">';
        (h.items || []).forEach(function (it) {
          html += "<li>" +
            '<span class="tl-period">' + esc(it.period) + "</span>" +
            '<strong class="tl-title">' + esc(it.title) + "</strong>" +
            (it.org ? '<span class="tl-org">' + esc(it.org) + "</span>" : "") +
            (it.desc ? '<p class="tl-desc">' + esc(it.desc) + "</p>" : "") +
            "</li>";
        });
        html += "</ol></div>";
      });
      html += "</div></section>";
    }

    // 최근 프로젝트 2개 + 최근 글 3개
    if (PROJECTS.length || POSTS.length) {
      html += '<section class="block"><div class="block-head"><h2 class="block-title">최근 소식</h2></div><div class="recent-grid">';
      if (PROJECTS.length) {
        html += '<div><p class="caption">최근 프로젝트</p><div class="mini-list">' +
          PROJECTS.slice(0, 2).map(function (p) {
            return '<a class="mini-item" href="project.html?id=' + encodeURIComponent(p.id) + '">' +
              '<span class="mini-thumb" style="background:' + S.gradient(p.id) + '">' + esc((p.title || "?").charAt(0)) + "</span>" +
              '<span><strong>' + esc(p.title) + "</strong><small>" + esc(p.period || "") + "</small></span></a>";
          }).join("") +
          '</div><a class="more-link" href="#portfolio">포트폴리오 전체 보기 →</a></div>';
      }
      if (POSTS.length) {
        html += '<div><p class="caption">최근 글</p><div class="mini-list">' +
          POSTS.slice(0, 3).map(function (p) {
            return '<a class="mini-item mini-post" href="post.html?id=' + encodeURIComponent(p.id) + '">' +
              '<span><strong>' + esc(p.title) + "</strong><small>" + S.fmtDate(p.date) + " · " + esc(p.category || "") + "</small></span></a>";
          }).join("") +
          '</div><a class="more-link" href="#blog">블로그 전체 보기 →</a></div>';
      }
      html += "</div></section>";
    }

    el.innerHTML = html;
  }

  // =========================================================
  // 포트폴리오
  // =========================================================
  function renderPortfolio() {
    const el = document.getElementById("panel-portfolio");
    const tags = [];
    PROJECTS.forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
    });

    el.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">Portfolio</p>' +
        "<h1>포트폴리오</h1>" +
        '<p class="lead">' + esc(P.portfolioIntro || "직접 만든 프로젝트와 핵심 구현을 정리했습니다.") + "</p>" +
      "</div>" +
      '<div class="toolbar"><div class="chips" role="group" aria-label="태그 필터"></div>' +
      '<span class="count"></span></div>' +
      '<div class="project-grid"></div>';

    const chipBox = el.querySelector(".chips");
    const grid = el.querySelector(".project-grid");
    const count = el.querySelector(".count");
    let active = "전체";

    ["전체"].concat(tags).forEach(function (t) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip chip-filter" + (t === active ? " active" : "");
      b.textContent = t;
      b.addEventListener("click", function () {
        active = t;
        chipBox.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        draw();
      });
      chipBox.appendChild(b);
    });

    function draw() {
      const list = PROJECTS.filter(function (p) {
        return active === "전체" || (p.tags || []).indexOf(active) !== -1;
      });
      count.textContent = list.length + "개 프로젝트";
      if (!list.length) { grid.innerHTML = '<p class="empty">아직 등록된 프로젝트가 없습니다.</p>'; return; }

      grid.innerHTML = list.map(function (p) {
        const thumbSrc = p.thumbnail || (p.images && p.images[0] && p.images[0].src);
        const thumb = thumbSrc
          ? '<img src="' + esc(thumbSrc) + '" alt="" loading="lazy">'
          : '<span class="thumb-letter" style="background:' + S.gradient(p.id) + '">' + esc((p.title || "?").charAt(0)) + "</span>";
        return '<a class="card" href="project.html?id=' + encodeURIComponent(p.id) + '">' +
          '<div class="card-thumb">' + thumb + "</div>" +
          '<div class="card-body">' +
            (p.period ? '<span class="caption">' + esc(p.period) + "</span>" : "") +
            '<h3 class="card-title">' + esc(p.title) + "</h3>" +
            '<p class="card-summary">' + esc(p.summary || "") + "</p>" +
            S.tagsHtml(p.tags) +
          "</div></a>";
      }).join("");
    }
    draw();
  }

  // =========================================================
  // 블로그
  // =========================================================
  function renderBlog() {
    const el = document.getElementById("panel-blog");
    const cats = [];
    POSTS.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });

    el.innerHTML =
      '<div class="page-head">' +
        '<p class="eyebrow">Blog</p>' +
        "<h1>블로그</h1>" +
        '<p class="lead">' + esc(P.blogIntro || "개발하며 배운 것들과 생각을 기록합니다.") + "</p>" +
      "</div>" +
      '<div class="toolbar">' +
        '<div class="chips" role="group" aria-label="카테고리"></div>' +
        '<label class="search">' + S.icon("search", 16) +
          '<input type="search" placeholder="글 검색" aria-label="글 검색"></label>' +
      "</div>" +
      '<div class="post-list"></div>';

    const chipBox = el.querySelector(".chips");
    const list = el.querySelector(".post-list");
    const input = el.querySelector("input");
    let active = "전체";

    ["전체"].concat(cats).forEach(function (c) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip chip-filter" + (c === active ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () {
        active = c;
        chipBox.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        draw();
      });
      chipBox.appendChild(b);
    });
    input.addEventListener("input", draw);

    function draw() {
      const q = input.value.trim().toLowerCase();
      const items = POSTS.filter(function (p) {
        if (active !== "전체" && p.category !== active) return false;
        if (!q) return true;
        return [p.title, p.summary, (p.tags || []).join(" ")].join(" ").toLowerCase().indexOf(q) !== -1;
      });
      if (!items.length) { list.innerHTML = '<p class="empty">조건에 맞는 글이 없습니다.</p>'; return; }

      list.innerHTML = items.map(function (p) {
        return '<a class="post-item" href="post.html?id=' + encodeURIComponent(p.id) + '">' +
          '<div class="post-item-body">' +
            '<div class="post-meta">' + (p.category ? '<span class="cat">' + esc(p.category) + "</span>" : "") +
              "<time>" + S.fmtDate(p.date) + "</time></div>" +
            "<h3>" + esc(p.title) + "</h3>" +
            (p.summary ? "<p>" + esc(p.summary) + "</p>" : "") +
            S.tagsHtml(p.tags) +
          "</div>" +
          (p.thumbnail ? '<img class="post-thumb" src="' + esc(p.thumbnail) + '" alt="" loading="lazy">' : "") +
        "</a>";
      }).join("");
    }
    draw();
  }

  // =========================================================
  // 연락처
  // =========================================================
  function renderContact() {
    const el = document.getElementById("panel-contact");
    const contacts = P.contacts || [];

    let html =
      '<div class="page-head">' +
        '<p class="eyebrow">Contact</p>' +
        "<h1>연락처</h1>" +
        '<p class="lead">' + esc(P.contactMessage || "편하게 연락 주세요.") + "</p>" +
      "</div>";

    html += '<div class="contact-grid">' + contacts.map(function (c, i) {
      const openLabel = c.type === "email" ? "메일 쓰기" : c.type === "phone" ? "전화 걸기" : "열기";
      return '<div class="contact-card">' +
        '<span class="contact-icon">' + S.icon(c.type, 20) + "</span>" +
        '<div class="contact-info"><span class="caption">' + esc(c.label) + "</span>" +
          '<span class="contact-value">' + esc(c.value) + "</span></div>" +
        '<div class="contact-actions">' +
          (c.copy ? '<button class="icon-btn" type="button" data-copy="' + i + '" aria-label="' + esc(c.label) + ' 복사">' + S.icon("copy", 16) + "</button>" : "") +
          (c.url ? '<a class="icon-btn" href="' + esc(c.url) + '"' + (/^https?:/.test(c.url) ? ' target="_blank" rel="noopener"' : "") +
            ' aria-label="' + esc(c.label) + " " + openLabel + '">' + S.icon("arrow", 16) + "</a>" : "") +
        "</div></div>";
    }).join("") + "</div>";

    if (P.availability) {
      html += '<div class="note-box"><span class="dot"></span>' + esc(P.availability) + "</div>";
    }

    el.innerHTML = html;

    el.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        S.copyText(contacts[+btn.dataset.copy].value, btn);
      });
    });
  }
})();
