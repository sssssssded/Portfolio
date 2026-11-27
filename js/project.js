// 프로젝트 상세: ?id=xxx → 정보 / 영상 / 개요 / 개발 일정 표 / 파트별 코드 설명
(function () {
  const S = window.Site;
  const esc = S.esc;
  const PROJECTS = window.PROJECTS || [];
  const root = document.getElementById("project-root");

  S.initPage("portfolio");

  const id = S.param("id");
  const index = PROJECTS.findIndex(function (p) { return p.id === id; });
  const p = PROJECTS[index];

  if (!p) {
    root.innerHTML = '<p class="empty">프로젝트를 찾을 수 없습니다. <a href="index.html#portfolio">포트폴리오로 돌아가기</a></p>';
    return;
  }

  document.title = p.title + " | Portfolio";

  const sections = p.sections || [];
  const schedule = p.schedule || [];
  const toc = [];
  let html = "";

  // ---------- 상단 ----------
  html += '<header class="detail-head">';
  html += '<a class="crumb" href="index.html#portfolio">← 포트폴리오</a>';
  html += S.tagsHtml(p.tags);
  html += "<h1>" + esc(p.title) + "</h1>";
  if (p.summary) html += '<p class="lead">' + esc(p.summary) + "</p>";

  const meta = [
    ["기간", p.period], ["역할", p.role], ["인원", p.team], ["사용 기술", (p.stack || []).join(", ")]
  ].filter(function (m) { return m[1]; });

  if (meta.length || (p.links && p.links.length)) {
    html += '<dl class="meta-grid">';
    meta.forEach(function (m) {
      html += '<div><dt class="caption">' + m[0] + "</dt><dd>" + esc(m[1]) + "</dd></div>";
    });
    (p.links || []).forEach(function (l) {
      html += '<div><dt class="caption">' + esc(l.label) + '</dt><dd><a href="' + esc(l.url) +
        '" target="_blank" rel="noopener">바로가기 ' + S.icon("arrow", 14) + "</a></dd></div>";
    });
    html += "</dl>";
  }
  html += "</header>";

  // ---------- 영상 (n개) ----------
  const videos = (Array.isArray(p.videos) ? p.videos : (p.video ? [p.video] : []))
    .filter(function (v) { return v && v.src; });
  const images = (p.images || []).filter(function (im) { return im && im.src; });

  if (videos.length || !images.length) {
    html += '<section class="media">';
    html += '<div class="video-wrap" id="player">' + renderVideo(videos[0]) + "</div>";
    if (videos.length > 1 || (videos[0] && videos[0].title)) {
      html += '<div class="video-list">' + videos.map(function (v, i) {
        return '<button type="button" class="video-chip' + (i === 0 ? " active" : "") + '" data-video="' + i + '">' +
          '<span class="num">' + (i + 1) + "</span>" + esc(v.title || "영상 " + (i + 1)) + "</button>";
      }).join("") + "</div>";
    }
    html += "</section>";
  }

  // ---------- 본문 ----------
  let main = "";

  if (p.overview) {
    toc.push(["overview", "개요"]);
    main += '<section class="doc-section" id="overview"><h2>개요</h2><p class="overview">' + esc(p.overview) + "</p></section>";
  }

  // ---------- 이미지 (n개) ----------
  if (images.length) {
    toc.push(["gallery", "이미지"]);
    main += '<section class="doc-section" id="gallery"><h2>이미지</h2><div class="gallery">' +
      images.map(function (im, i) {
        return '<button type="button" class="gallery-item" data-image="' + i + '" aria-label="이미지 크게 보기">' +
          '<img src="' + esc(im.src) + '" alt="' + esc(im.caption || "") + '" loading="lazy">' +
          (im.caption ? '<span class="gallery-cap">' + esc(im.caption) + "</span>" : "") +
          "</button>";
      }).join("") + "</div></section>";
  }

  if (schedule.length) {
    toc.push(["schedule", "개발 일정"]);
    main += '<section class="doc-section" id="schedule"><h2>개발 일정</h2>' + renderSchedule(schedule) + "</section>";
  }

  sections.forEach(function (s, i) {
    const pid = "part-" + (i + 1);
    toc.push([pid, s.title, "PART " + (i + 1)]);
    main += '<section class="doc-section part" id="' + pid + '">';
    main += '<span class="caption accent">PART ' + (i + 1) + "</span>";
    main += "<h2>" + esc(s.title) + "</h2>";
    if (s.description) main += '<p class="part-desc">' + esc(s.description) + "</p>";
    // 웹 생성기로 만든 HTML 데모 → 코드 위에 실제 동작 화면으로
    if (S.hasDemo(s.demo)) {
      main += '<div class="demo-block" data-demo="' + i + '">' +
        '<div class="demo-head">' +
          '<span class="demo-title"><span class="live"></span>' + esc(s.demo.title || "실행 화면") + "</span>" +
          '<div class="demo-actions">' +
            '<button type="button" class="demo-btn" data-act="reload">다시 실행</button>' +
            '<button type="button" class="demo-btn" data-act="full">전체 화면</button>' +
            '<button type="button" class="demo-btn" data-act="open">새 창 ↗</button>' +
          "</div>" +
        "</div>" +
        '<div class="demo-frame"></div>' +
      "</div>";
    }
    if (s.code) {
      const lang = s.language || "plaintext";
      main += '<div class="code-block"><div class="code-head"><span>' + esc(s.file || lang) + "</span>" +
        '<button class="copy-btn" type="button">복사</button></div>' +
        '<pre><code class="language-' + esc(lang) + '">' + esc(trimCode(s.code)) + "</code></pre></div>";
    }
    if (s.points && s.points.length) {
      main += '<ul class="points">' + s.points.map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("") + "</ul>";
    }
    main += "</section>";
  });

  html += '<div class="detail-layout">';
  if (toc.length) {
    html += '<aside class="detail-toc"><p class="caption">목차</p><ol>' + toc.map(function (t) {
      return '<li><a href="#' + t[0] + '" data-toc="' + t[0] + '">' +
        (t[2] ? '<small>' + t[2] + "</small>" : "") + esc(t[1]) + "</a></li>";
    }).join("") + "</ol></aside>";
  }
  html += '<div class="detail-main">' + main + "</div></div>";

  // ---------- 이전 / 다음 ----------
  const prev = PROJECTS[index - 1];
  const next = PROJECTS[index + 1];
  html += '<nav class="pager">' +
    (prev ? '<a class="pager-link" href="project.html?id=' + encodeURIComponent(prev.id) + '"><span class="caption">이전 프로젝트</span><strong>' + esc(prev.title) + "</strong></a>" : "<span></span>") +
    (next ? '<a class="pager-link next" href="project.html?id=' + encodeURIComponent(next.id) + '"><span class="caption">다음 프로젝트</span><strong>' + esc(next.title) + "</strong></a>" : "<span></span>") +
    "</nav>";

  root.innerHTML = html;

  // 영상 목록에서 고르면 플레이어 교체
  root.querySelectorAll("[data-video]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.getElementById("player").innerHTML = renderVideo(videos[+b.dataset.video]);
      root.querySelectorAll("[data-video]").forEach(function (x) { x.classList.toggle("active", x === b); });
    });
  });

  // HTML 데모 실행 + 버튼
  root.querySelectorAll("[data-demo]").forEach(function (box) {
    const d = sections[+box.dataset.demo].demo;
    const frameBox = box.querySelector(".demo-frame");
    let frame = S.mountDemo(frameBox, d);
    box.querySelector('[data-act="reload"]').addEventListener("click", function () { frame = S.mountDemo(frameBox, d); });
    box.querySelector('[data-act="open"]').addEventListener("click", function () { S.openDemo(d); });
    box.querySelector('[data-act="full"]').addEventListener("click", function () {
      if (frame && frame.requestFullscreen) frame.requestFullscreen();
    });
  });

  // 이미지 클릭 → 크게 보기
  root.querySelectorAll("[data-image]").forEach(function (b) {
    b.addEventListener("click", function () { S.lightbox(images, +b.dataset.image); });
  });

  // 코드 하이라이트 + 복사
  root.querySelectorAll("pre code").forEach(function (el) { if (window.hljs) window.hljs.highlightElement(el); });
  root.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      S.copyText(btn.closest(".code-block").querySelector("code").innerText, btn);
    });
  });

  // 목차 현재 위치 표시
  const links = root.querySelectorAll("[data-toc]");
  if (links.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("active", a.dataset.toc === e.target.id); });
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    root.querySelectorAll(".doc-section").forEach(function (s) { io.observe(s); });
  }

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }

  // =========================================================
  // 개발 일정 표 (+ 간트 막대)
  // =========================================================
  function renderSchedule(rows) {
    const DAY = 864e5;
    const t = function (s) { return new Date(s + "T00:00:00").getTime(); };
    const dated = rows.filter(function (r) { return r.start && r.end; });
    const min = Math.min.apply(null, dated.map(function (r) { return t(r.start); }));
    const max = Math.max.apply(null, dated.map(function (r) { return t(r.end); }));
    const span = Math.max(max - min, DAY);
    const totalDays = Math.round((max - min) / DAY) + 1;
    const doneCount = rows.filter(function (r) { return r.status === "done"; }).length;
    const ymd = function (ms) {
      const d = new Date(ms);
      return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
    };

    const STATUS = {
      done: ["완료", "done"],
      progress: ["진행 중", "progress"],
      todo: ["예정", "todo"]
    };

    // 월 눈금
    let ticks = "";
    if (dated.length) {
      const d = new Date(min);
      d.setDate(1);
      if (d.getTime() < min) d.setMonth(d.getMonth() + 1);
      while (d.getTime() <= max) {
        const left = (d.getTime() - min) / span * 100;
        ticks += '<span style="left:' + left.toFixed(2) + '%">' + (d.getMonth() + 1) + "월</span>";
        d.setMonth(d.getMonth() + 1);
      }
    }

    let h = "";
    if (dated.length) {
      h += '<div class="schedule-summary">' +
        '<span>' + S.icon("calendar", 16) + ymd(min) + " — " + ymd(max) + "</span>" +
        "<span>총 " + totalDays + "일 · 약 " + Math.max(1, Math.round(totalDays / 7)) + "주</span>" +
        "<span>완료 " + doneCount + " / " + rows.length + "</span>" +
        "</div>";
    }

    h += '<div class="table-wrap"><table class="schedule"><thead><tr>' +
      "<th>단계</th><th>기간</th><th>주요 작업</th><th>상태</th>" +
      '<th class="col-gantt"><div class="gantt-scale">' + ticks + "</div></th>" +
      "</tr></thead><tbody>";

    rows.forEach(function (r) {
      const st = STATUS[r.status] || STATUS.todo;
      const tasks = Array.isArray(r.tasks)
        ? "<ul>" + r.tasks.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"
        : esc(r.tasks || "");
      let bar = "";
      if (r.start && r.end) {
        const left = (t(r.start) - min) / span * 100;
        const width = Math.max((t(r.end) - t(r.start) + DAY) / (span + DAY) * 100, 2);
        const days = Math.round((t(r.end) - t(r.start)) / DAY) + 1;
        bar = '<span class="gantt-bar ' + st[1] + '" style="left:' + left.toFixed(2) + "%;width:" + width.toFixed(2) + '%" title="' + days + '일"></span>';
      }
      h += "<tr>" +
        '<td class="phase">' + esc(r.phase) + "</td>" +
        '<td class="date">' + (r.start ? S.fmtDate(r.start).slice(5) + " – " + S.fmtDate(r.end).slice(5) : "-") +
          (r.start && r.end ? "<small>" + (Math.round((t(r.end) - t(r.start)) / DAY) + 1) + "일</small>" : "") + "</td>" +
        '<td class="tasks">' + tasks + "</td>" +
        '<td><span class="badge ' + st[1] + '">' + st[0] + "</span></td>" +
        '<td class="col-gantt"><div class="gantt">' + bar + "</div></td>" +
        "</tr>";
    });

    h += "</tbody></table></div>";
    return h;
  }

  // =========================================================
  // 유틸
  // =========================================================
  function renderVideo(v) {
    if (!v || !v.src) return '<div class="video-placeholder"><span>▶</span>영상 준비 중</div>';
    if (!S.isVideoFile(v.src)) {
      return '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(S.youtubeId(v.src)) + '" title="' + esc(v.title || p.title) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    }
    return '<video controls playsinline preload="metadata" src="' + esc(v.src) + '"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : "") + "></video>";
  }

  // 템플릿 문자열의 앞뒤 빈 줄과 공통 들여쓰기 제거
  function trimCode(code) {
    const lines = code.replace(/\t/g, "    ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const indent = Math.min.apply(null, lines.filter(function (l) { return l.trim(); })
      .map(function (l) { return l.match(/^ */)[0].length; }));
    return lines.map(function (l) { return l.slice(indent); }).join("\n");
  }
})();
