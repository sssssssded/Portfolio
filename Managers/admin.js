// =========================================================
// 관리자 페이지
//   소개 / 포트폴리오 / 블로그 / 연락처 데이터를 입력 · 수정 · 삭제하고
//   serve.ps1 의 /api 로 data/*.js, posts/*.md 파일에 저장합니다.
// =========================================================
(function () {
  "use strict";

  const S = window.Site;
  const $ = function (sel) { return document.querySelector(sel); };

  // ---------------------------------------------------------
  // 상태
  // ---------------------------------------------------------
  const clone = function (o) { return o == null ? null : JSON.parse(JSON.stringify(o)); };
  const state = {
    profile: clone(window.PROFILE) || {},
    projects: clone(window.PROJECTS) || [],
    posts: clone(window.POSTS) || []
  };
  const bodies = new Map();          // 글 객체 → { text, dirty }  (본문 = posts/글id.md)
  const dirty = new Set();           // "profile" | "projects" | "posts" | "bodies"
  const pendingDeletes = new Set();  // 저장할 때 지울 파일
  let serverOk = null;               // null = 확인 중
  let ctx = "profile";               // 지금 화면이 수정하는 데이터 파일
  let saving = false;

  normalize();

  function normalize() {
    const p = state.profile;
    ["stats", "about", "skills", "history", "contacts"].forEach(function (k) { if (!Array.isArray(p[k])) p[k] = []; });
    p.skills.forEach(function (g) { if (!Array.isArray(g.items)) g.items = []; });
    p.history.forEach(function (g) { if (!Array.isArray(g.items)) g.items = []; });
    state.projects.forEach(normalizeProject);
    state.posts.forEach(function (post) {
      post._origId = post.id;
      if (!Array.isArray(post.tags)) post.tags = [];
    });
  }

  function normalizeProject(pr) {
    // 예전 형식(video 하나) → videos 배열
    if (!Array.isArray(pr.videos)) {
      pr.videos = pr.video && pr.video.src ? [Object.assign({ title: "" }, pr.video)] : [];
    }
    delete pr.video;
    ["images", "tags", "stack", "links", "schedule", "sections"].forEach(function (k) {
      if (!Array.isArray(pr[k])) pr[k] = [];
    });
    pr.sections.forEach(function (s) {
      if (s.code) s.code = dedent(s.code);
      if (!Array.isArray(s.points)) s.points = [];
    });
    pr.schedule.forEach(function (r) {
      if (typeof r.tasks === "string") r.tasks = r.tasks ? [r.tasks] : [];
      if (!Array.isArray(r.tasks)) r.tasks = [];
    });
  }

  // ---------------------------------------------------------
  // 시작 (로그인)
  // ---------------------------------------------------------
  // (실제 호출은 파일 맨 아래 — 모든 상수가 정의된 뒤에 시작)
  function boot() {
    if (S.isAdmin()) start();
    else S.openAdminLogin({ onSuccess: start, onCancel: function () { location.href = "../index.html"; } });
  }

  function start() {
    $("#app").hidden = false;
    S.initTheme();
    $("#save").addEventListener("click", saveAll);
    $("#logout").addEventListener("click", function () {
      if (dirty.size && !confirm("저장하지 않은 변경이 있습니다. 그래도 로그아웃할까요?")) return;
      dirty.clear();
      S.setAdminAuth(false);
      location.href = "../index.html";
    });
    window.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveAll(); }
    });
    window.addEventListener("beforeunload", function (e) {
      if (dirty.size) { e.preventDefault(); e.returnValue = ""; }
    });
    window.addEventListener("hashchange", route);
    ping();
    route();
    updateStatus();
  }

  // ---------------------------------------------------------
  // 서버 API (serve.ps1)
  // ---------------------------------------------------------
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      body: opts.body,
      cache: "no-store",
      headers: Object.assign({ "X-Admin": "1" }, opts.headers || {})
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || "HTTP " + res.status);
        return data;
      });
    });
  }
  function writeFile(path, content) {
    return api("/api/write?path=" + encodeURIComponent(path), {
      method: "POST", body: content, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
  function deleteFile(path) {
    return api("/api/delete?path=" + encodeURIComponent(path), { method: "POST" });
  }
  function uploadFile(file) {
    if (!serverOk) return Promise.reject(new Error("저장 서버에 연결되어 있지 않습니다."));
    let name = file.name || "image.png";
    if (!/\.[a-z0-9]+$/i.test(name)) name += "." + ((file.type.split("/")[1] || "png").replace("jpeg", "jpg"));
    return api("/api/upload?name=" + encodeURIComponent(name), { method: "POST", body: file })
      .then(function (d) { return d.path; });
  }

  function ping() {
    api("/api/ping")
      .then(function () { serverOk = true; })
      .catch(function () { serverOk = false; showBanner(); })
      .then(updateStatus);
  }

  function showBanner() {
    const b = $("#banner");
    b.hidden = false;
    b.innerHTML = S.icon("alert", 20) +
      "<div><strong>저장 서버에 연결되지 않았습니다.</strong>" +
      "보기와 편집은 되지만 저장과 업로드는 할 수 없습니다. 프로젝트 폴더에서 " +
      "<code>powershell -ExecutionPolicy Bypass -File serve.ps1</code> 로 서버를 켠 뒤 " +
      "<code>http://localhost:8000/Managers/Managers.html</code> 로 접속하세요. " +
      "(GitHub Pages 에서는 저장할 수 없습니다)</div>";
  }

  // ---------------------------------------------------------
  // 저장
  // ---------------------------------------------------------
  function touch(file) {
    dirty.add(file || ctx);
    updateStatus();
  }

  function updateStatus() {
    const el = $("#status");
    if (serverOk === null) { el.className = "status"; el.textContent = "서버 확인 중…"; }
    else if (!serverOk) { el.className = "status warn"; el.textContent = "저장 서버 연결 안 됨"; }
    else if (dirty.size) { el.className = "status dirty"; el.textContent = "저장하지 않은 변경 있음"; }
    else { el.className = "status ok"; el.textContent = "모두 저장됨"; }
    $("#save").disabled = saving || !serverOk || !dirty.size;
    updateNavCounts();
  }

  function validate() {
    const slug = /^[A-Za-z0-9_-]+$/;
    function check(list, label) {
      const seen = {};
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (!String(it.title || "").trim()) return label + ": 제목이 비어 있는 항목이 있습니다.";
        if (!slug.test(it.id || "")) return label + " '" + it.title + "': ID는 영문, 숫자, -, _ 만 쓸 수 있습니다.";
        if (seen[it.id]) return label + ": ID '" + it.id + "' 가 중복됩니다.";
        seen[it.id] = true;
      }
      return "";
    }
    return check(state.projects, "포트폴리오") || check(state.posts, "블로그");
  }

  function jsFile(name, data, desc) {
    const json = JSON.stringify(data, function (k, v) { return k.charAt(0) === "_" ? undefined : v; }, 2);
    return "// " + desc + "\n" +
      "// 관리자 페이지(Managers/Managers.html)에서 저장한 파일입니다. 직접 수정해도 되지만 관리자에서 저장하면 덮어써집니다.\n" +
      "window." + name + " = " + json + ";\n";
  }

  async function saveAll() {
    if (saving || !dirty.size) return;
    if (!serverOk) { toast("저장 서버에 연결되어 있지 않습니다.", "error"); return; }
    const err = validate();
    if (err) { toast(err, "error"); return; }

    saving = true;
    $("#save").textContent = "저장 중…";
    updateStatus();
    try {
      if (dirty.has("profile")) {
        await writeFile("data/profile.js", jsFile("PROFILE", state.profile, "내 정보 (소개 탭 / 연락처 탭 / 헤더 / 푸터)"));
      }
      if (dirty.has("projects")) {
        await writeFile("data/projects.js", jsFile("PROJECTS", state.projects, "포트폴리오 프로젝트 목록"));
      }
      if (dirty.has("posts") || dirty.has("bodies")) {
        for (const post of state.posts) {
          const renamed = post._origId && post._origId !== post.id;
          let b = bodies.get(post);
          if (renamed && !b) b = await loadBody(post);
          if ((b && (b.dirty || renamed)) || !post._origId) {
            await writeFile("posts/" + post.id + ".md", b ? b.text : "");
            if (b) b.dirty = false;
          }
          if (renamed) pendingDeletes.add("posts/" + post._origId + ".md");
          post._origId = post.id;
        }
        await writeFile("data/posts.js", jsFile("POSTS", state.posts, "블로그 글 목록 (본문은 posts/글id.md)"));
      }
      for (const path of pendingDeletes) {
        const id = path.replace(/^posts\/|\.md$/g, "");
        if (state.posts.some(function (p) { return p.id === id; })) continue;  // 같은 ID를 다시 쓰는 글이 있으면 지우지 않음
        await deleteFile(path);
      }
      pendingDeletes.clear();
      dirty.clear();
      toast("저장했습니다. 사이트를 새로고침하면 반영됩니다.");
    } catch (e) {
      toast("저장 실패: " + e.message, "error");
    } finally {
      saving = false;
      $("#save").textContent = "저장";
      updateStatus();
    }
  }

  // ---------------------------------------------------------
  // 화면 이동
  // ---------------------------------------------------------
  const NAV = [
    { key: "profile", label: "소개", icon: "user" },
    { key: "projects", label: "포트폴리오", icon: "grid", count: function () { return state.projects.length; } },
    { key: "posts", label: "블로그", icon: "blog", count: function () { return state.posts.length; } },
    { key: "contact", label: "연락처", icon: "email", count: function () { return state.profile.contacts.length; } }
  ];

  function renderNav(active) {
    const nav = $("#nav");
    nav.innerHTML = "";
    NAV.forEach(function (n) {
      nav.append(h("a", {
        class: "nav-item" + (n.key === active ? " active" : ""),
        href: "#" + n.key,
        html: S.icon(n.icon, 18) + "<span>" + n.label + "</span>" +
          (n.count ? '<small data-count="' + n.key + '">' + n.count() + "</small>" : "")
      }));
    });
  }

  function updateNavCounts() {
    NAV.forEach(function (n) {
      const el = document.querySelector('[data-count="' + n.key + '"]');
      if (el && n.count) el.textContent = n.count();
    });
  }

  function route() {
    const parts = location.hash.replace(/^#/, "").split("/");
    const key = NAV.some(function (n) { return n.key === parts[0]; }) ? parts[0] : "profile";
    const idx = parts[1] ? parseInt(parts[1], 10) : null;
    renderNav(key);
    const view = $("#view");
    view.innerHTML = "";

    if (key === "profile") viewProfile(view);
    else if (key === "contact") viewContact(view);
    else if (key === "projects") {
      if (idx != null && state.projects[idx]) viewProjectEdit(view, state.projects[idx]);
      else viewProjects(view);
    } else if (key === "posts") {
      if (idx != null && state.posts[idx]) viewPostEdit(view, state.posts[idx]);
      else viewPosts(view);
    }
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------
  // 화면: 소개
  // ---------------------------------------------------------
  function viewProfile(v) {
    ctx = "profile";
    const p = state.profile;
    v.append(
      head("소개", "소개 탭, 헤더 로고, 푸터에 표시되는 정보입니다.", [siteLink("../index.html#about")]),
      card("기본 정보",
        grid(2, field("이름", text(p, "name")), field("직함", text(p, "role", { placeholder: "Game & Software Developer" }))),
        field("메인 문구", area(p, "headline", { rows: 2 }), "소개 탭에서 가장 크게 보이는 문구입니다. 줄바꿈이 그대로 보입니다."),
        field("한 줄 소개", area(p, "intro", { rows: 3 })),
        grid(2,
          field("프로필 사진", upload(p, "photo", { accept: "image/*" }), "비우면 이름 첫 글자가 표시됩니다."),
          field("이력서 PDF", upload(p, "resume", { accept: "application/pdf,.pdf" }), "비우면 이력서 버튼이 숨겨집니다."))
      ),
      card("About me",
        field("문단", area(p, "about", {
          rows: 6,
          format: function (val) { return (val || []).join("\n\n"); },
          parse: function (val) { return val.split(/\n\s*\n/).map(trim).filter(Boolean); }
        }), "빈 줄로 문단을 나눕니다.")
      ),
      card("숫자 카드",
        hintP("프로젝트 수와 블로그 글 수는 자동으로 앞에 붙습니다."),
        list(p.stats,
          function (s) { return grid(2, field("라벨", text(s, "label", { placeholder: "개발 경력" })), field("값", text(s, "value", { placeholder: "2년" }))); },
          function () { return { label: "", value: "" }; },
          { title: function (s) { return s.label || "새 항목"; }, addLabel: "숫자 카드 추가" })
      ),
      card("기술 스택",
        list(p.skills,
          function (g) { return [field("그룹 이름", text(g, "group", { placeholder: "Language" })), field("항목", csv(g, "items", "C#, C++, Python"), "쉼표로 구분합니다.")]; },
          function () { return { group: "", items: [] }; },
          { title: function (g) { return g.group || "새 그룹"; }, addLabel: "그룹 추가" })
      ),
      card("이력",
        list(p.history,
          function (g) {
            return [
              field("그룹 제목", text(g, "title", { placeholder: "경력, 학력 · 활동 등" })),
              list(g.items,
                function (it) {
                  return [
                    grid(2, field("기간", text(it, "period", { placeholder: "2025.03 — 현재" })), field("제목", text(it, "title"))),
                    grid(2, field("기관", text(it, "org")), field("설명", text(it, "desc")))
                  ];
                },
                function () { return { period: "", title: "", org: "", desc: "" }; },
                { title: function (it) { return it.title || "새 이력"; }, addLabel: "이력 추가" })
            ];
          },
          function () { return { title: "", items: [] }; },
          { title: function (g) { return g.title || "새 그룹"; }, addLabel: "이력 그룹 추가", confirm: "이 그룹과 안의 이력을 모두 삭제할까요?" })
      ),
      card("탭 소개 문구 · 푸터",
        field("포트폴리오 탭 문구", text(p, "portfolioIntro")),
        field("블로그 탭 문구", text(p, "blogIntro")),
        field("푸터 문구", text(p, "footer")))
    );
  }

  // ---------------------------------------------------------
  // 화면: 연락처
  // ---------------------------------------------------------
  const CONTACT_TYPES = [
    ["email", "이메일"], ["phone", "전화"], ["github", "GitHub"], ["linkedin", "LinkedIn"],
    ["youtube", "YouTube"], ["blog", "블로그"], ["location", "위치"], ["link", "기타 링크"]
  ];

  function viewContact(v) {
    ctx = "profile";
    const p = state.profile;
    v.append(
      head("연락처", "연락처 탭에 표시되는 정보입니다.", [siteLink("../index.html#contact")]),
      card("안내 문구",
        field("소개 문구", text(p, "contactMessage")),
        field("상태 표시", text(p, "availability", { placeholder: "현재 새로운 기회에 열려 있습니다." }), "비우면 숨겨집니다.")),
      card("연락처 목록",
        list(p.contacts,
          function (c) {
            return [
              grid(3,
                field("종류 (아이콘)", select(c, "type", CONTACT_TYPES)),
                field("이름", text(c, "label", { placeholder: "이메일" })),
                field("표시 값", text(c, "value", { placeholder: "your@email.com" }))),
              field("링크", text(c, "url", { placeholder: "mailto:주소 / tel:번호 / https://..." }), "비우면 열기 버튼이 숨겨집니다."),
              check(c, "copy", "복사 버튼 표시")
            ];
          },
          function () { return { type: "email", label: "", value: "", url: "", copy: false }; },
          { title: function (c) { return (c.label || "새 연락처") + (c.value ? "  ·  " + c.value : ""); }, addLabel: "연락처 추가" }))
    );
  }

  // ---------------------------------------------------------
  // 화면: 포트폴리오 목록
  // ---------------------------------------------------------
  function viewProjects(v) {
    ctx = "projects";
    const add = h("button", {
      type: "button", class: "btn btn-primary btn-sm", html: S.icon("plus", 16) + "새 프로젝트",
      onclick: function () { state.projects.unshift(newProject()); touch("projects"); location.hash = "#projects/0"; }
    });
    v.append(head("포트폴리오", "여기 순서가 사이트에 보이는 순서입니다.", [siteLink("../index.html#portfolio"), add]));

    const rows = h("div", { class: "panel-card flush" });
    if (!state.projects.length) rows.append(h("p", { class: "row-empty", text: "아직 프로젝트가 없습니다. ‘새 프로젝트’를 눌러 추가하세요." }));

    state.projects.forEach(function (pr, i) {
      const thumbSrc = pr.thumbnail || (pr.images[0] && pr.images[0].src);
      rows.append(h("div", { class: "row" },
        thumbSrc
          ? h("img", { class: "row-thumb", src: url(thumbSrc), alt: "" })
          : h("span", { class: "row-thumb", style: "background:" + S.gradient(pr.id), text: (pr.title || "?").charAt(0) }),
        h("a", { class: "row-main", href: "#projects/" + i },
          h("strong", { text: pr.title || "(제목 없음)" }),
          h("small", { text: [pr.period, pr.tags.join(", "), "영상 " + pr.videos.length + " · 이미지 " + pr.images.length + " · 파트 " + pr.sections.length].filter(Boolean).join("   ·   ") })),
        h("div", { class: "row-actions" },
          miniBtn("up", "위로", i === 0, function () { swap(state.projects, i, i - 1); touch("projects"); route(); }),
          miniBtn("down", "아래로", i === state.projects.length - 1, function () { swap(state.projects, i, i + 1); touch("projects"); route(); }),
          h("a", { class: "btn btn-sm", href: "#projects/" + i, text: "편집" }),
          miniBtn("trash", "삭제", false, function () {
            if (!confirm("'" + (pr.title || "제목 없음") + "' 프로젝트를 삭제할까요?")) return;
            state.projects.splice(i, 1); touch("projects"); route();
          }, "danger"))
      ));
    });
    v.append(rows);
  }

  function newProject() {
    return {
      id: "project-" + Date.now().toString(36), title: "새 프로젝트", summary: "", thumbnail: "",
      tags: [], period: "", role: "", team: "", stack: [], links: [],
      videos: [], images: [], overview: "", schedule: [], sections: []
    };
  }

  // ---------------------------------------------------------
  // 화면: 프로젝트 편집
  // ---------------------------------------------------------
  const LANGS = [
    ["csharp", "C#"], ["cpp", "C++"], ["c", "C"], ["javascript", "JavaScript"], ["typescript", "TypeScript"],
    ["python", "Python"], ["java", "Java"], ["kotlin", "Kotlin"], ["swift", "Swift"], ["go", "Go"], ["rust", "Rust"],
    ["xml", "HTML / XML"], ["css", "CSS"], ["json", "JSON"], ["sql", "SQL"], ["bash", "Shell"], ["plaintext", "일반 텍스트"]
  ];
  const STATUS = [["done", "완료"], ["progress", "진행 중"], ["todo", "예정"]];

  function viewProjectEdit(v, pr) {
    ctx = "projects";
    v.append(
      h("a", { class: "crumb", href: "#projects", text: "← 포트폴리오 목록" }),
      head(pr.title || "새 프로젝트", "수정한 뒤 오른쪽 위 ‘저장’(Ctrl+S)을 눌러야 사이트에 반영됩니다.", [
        siteLink("../project.html?id=" + encodeURIComponent(pr.id)),
        dangerBtn("삭제", "이 프로젝트를 삭제할까요?", function () {
          state.projects.splice(state.projects.indexOf(pr), 1); touch("projects"); location.hash = "#projects";
        })
      ]),

      card("기본 정보",
        grid(2, field("제목", text(pr, "title")), field("ID (주소에 쓰임)", text(pr, "id"), "영문, 숫자, -, _ 만 사용")),
        field("한 줄 요약", text(pr, "summary")),
        grid(2,
          field("기간", text(pr, "period", { placeholder: "2026.01 ~ 2026.03" })),
          field("인원", text(pr, "team", { placeholder: "3명" }))),
        field("역할", text(pr, "role", { placeholder: "클라이언트 프로그래밍" })),
        grid(2,
          field("태그", csv(pr, "tags", "Unity, C#"), "포트폴리오 탭 필터에 쓰입니다. 쉼표로 구분"),
          field("사용 기술", csv(pr, "stack", "Unity 6, C#"), "쉼표로 구분")),
        field("썸네일", upload(pr, "thumbnail"), "비우면 첫 번째 이미지가, 그것도 없으면 색 배경이 쓰입니다.")),

      card("링크",
        list(pr.links,
          function (l) { return grid(2, field("이름", text(l, "label", { placeholder: "GitHub" })), field("주소", text(l, "url", { placeholder: "https://" }))); },
          function () { return { label: "", url: "" }; },
          { title: function (l) { return l.label || "새 링크"; }, addLabel: "링크 추가" })),

      card("영상",
        hintP("여러 개를 넣으면 상세 페이지에서 목록으로 골라 볼 수 있습니다. 첫 번째 영상이 먼저 보입니다."),
        videosEditor(pr)),

      card("이미지",
        hintP("상세 페이지에 갤러리로 표시되고, 클릭하면 크게 볼 수 있습니다."),
        imagesEditor(pr)),

      card("개요", field("프로젝트 개요", area(pr, "overview", { rows: 5 }))),

      card("개발 일정",
        list(pr.schedule,
          function (r) {
            return [
              grid(4,
                field("단계", text(r, "phase", { placeholder: "기획" })),
                field("시작", text(r, "start", { type: "date" })),
                field("종료", text(r, "end", { type: "date" })),
                field("상태", select(r, "status", STATUS))),
              field("주요 작업", lines(r, "tasks", { rows: 3 }), "한 줄에 하나씩")
            ];
          },
          function () { return { phase: "", start: "", end: "", status: "todo", tasks: [] }; },
          {
            title: function (r) { return (r.phase || "새 단계") + (r.start ? "   ·   " + S.fmtDate(r.start) + " – " + S.fmtDate(r.end) : ""); },
            addLabel: "일정 추가"
          })),

      card("코드 설명 (파트)",
        list(pr.sections,
          function (s) {
            return [
              field("파트 제목", text(s, "title", { placeholder: "플레이어 이동" })),
              field("설명", area(s, "description", { rows: 3 })),
              demoEditor(s),
              grid(2,
                field("파일 이름", text(s, "file", { placeholder: "PlayerController.cs" })),
                field("언어", select(s, "language", LANGS))),
              field("코드", area(s, "code", { rows: 14, mono: true, placeholder: "핵심 코드 일부를 붙여넣으세요." }), "Tab 키로 들여쓸 수 있습니다."),
              field("핵심 포인트", lines(s, "points", { rows: 3 }), "한 줄에 하나씩 (선택)")
            ];
          },
          function () { return { title: "", description: "", file: "", language: "csharp", code: "", points: [] }; },
          {
            title: function (s, i) { return "PART " + (i + 1) + "   ·   " + (s.title || "새 파트"); },
            addLabel: "파트 추가", confirm: "이 파트를 삭제할까요?"
          }))
    );
  }

  // 파트 안의 HTML 데모 (Claude 웹 생성기로 만든 HTML → 코드 위에 실행 화면으로 표시)
  function demoEditor(s) {
    const holder = h("div", { class: "demo-edit" });

    function draw() {
      const prev = ctx;
      ctx = "projects";
      holder.innerHTML = "";

      if (!s.demo) {
        holder.append(h("button", {
          type: "button", class: "btn-add", html: S.icon("plus", 16) + "HTML 데모 넣기 (웹 생성기 결과물 · 코드 위에 실행 화면으로 표시)",
          onclick: function () {
            s.demo = { title: "", mode: "paste", html: "", src: "", height: "" };
            touch("projects");
            draw();
          }
        }));
        ctx = prev;
        return;
      }

      const d = s.demo;
      if (!d.mode) d.mode = d.src && !d.html ? "file" : "paste";
      const srcBox = h("div");
      const previewBox = h("div", { class: "demo-preview" });

      function drawSrc() {
        const p2 = ctx;
        ctx = "projects";
        srcBox.innerHTML = "";
        previewBox.innerHTML = "";
        if (d.mode === "file") {
          srcBox.append(field("HTML 파일", upload(d, "src", { accept: ".html,.htm,text/html" }),
            "웹 생성기에서 받은 .html 파일을 올립니다. 용량이 큰 HTML은 이 방법을 권장합니다."));
        } else {
          const codeArea = area(d, "html", {
            rows: 12, mono: true,
            placeholder: "<!doctype html>\n<html>\n  ...\n</html>\n\nClaude 에서 만든 HTML 전체를 그대로 붙여넣으세요."
          });
          const filePick = h("input", { type: "file", accept: ".html,.htm,text/html", hidden: true });
          filePick.addEventListener("change", function () {
            const f = filePick.files[0];
            filePick.value = "";
            if (!f) return;
            f.text().then(function (txt) {
              d.html = txt;
              codeArea.value = txt;
              touch("projects");
              toast("'" + f.name + "' 내용을 불러왔습니다.");
            });
          });
          srcBox.append(field("HTML 코드", codeArea, "HTML 파일 전체를 붙여넣거나, 아래 버튼으로 파일 내용을 불러옵니다."),
            h("div", { class: "demo-edit-actions" },
              h("button", { type: "button", class: "btn btn-sm", text: "HTML 파일에서 불러오기", onclick: function () { filePick.click(); } }),
              filePick));
        }
        ctx = p2;
      }
      drawSrc();

      holder.append(h("div", { class: "demo-edit-box" },
        h("div", { class: "demo-edit-head" },
          h("span", { class: "live" }),
          h("strong", { text: "HTML 데모" }),
          h("span", { class: "hint", text: "사이트에서 이 파트의 코드 위에 실제 동작 화면으로 보입니다." }),
          miniBtn("trash", "HTML 데모 삭제", false, function () {
            if (!confirm("이 파트의 HTML 데모를 삭제할까요?")) return;
            delete s.demo;
            touch("projects");
            draw();
          }, "danger")),
        grid(3,
          field("제목", text(d, "title", { placeholder: "실행 화면" })),
          field("넣는 방법", select(d, "mode", [["paste", "HTML 코드 붙여넣기"], ["file", "HTML 파일 업로드"]], { onChange: drawSrc })),
          field("높이 (px)", text(d, "height", { type: "number", placeholder: "자동" }), "비우면 내용에 맞춰 자동")),
        srcBox,
        h("div", { class: "demo-edit-actions" },
          h("button", {
            type: "button", class: "btn btn-sm btn-primary", text: "미리보기 실행",
            onclick: function () {
              previewBox.innerHTML = "";
              const frameBox = h("div", { class: "demo-frame" });
              previewBox.append(h("div", { class: "demo-block" }, frameBox));
              S.mountDemo(frameBox, d, url);
            }
          }),
          h("button", { type: "button", class: "btn btn-sm", text: "새 창에서 열기 ↗", onclick: function () { S.openDemo(d, url); } })),
        previewBox));
      ctx = prev;
    }

    draw();
    return holder;
  }

  function videosEditor(pr) {
    return list(pr.videos,
      function (vd) {
        const srcBox = h("div");
        function drawSrc() {
          const prev = ctx;
          ctx = "projects";
          srcBox.innerHTML = "";
          if (vd.type === "file") {
            srcBox.append(field("영상 파일", upload(vd, "src", { accept: "video/mp4,video/webm" }),
              "mp4 권장. GitHub 는 파일 하나당 100MB 까지만 올릴 수 있습니다."));
          } else {
            srcBox.append(field("유튜브 주소 또는 ID", text(vd, "src", {
              placeholder: "https://youtu.be/...",
              onChange: function (el) { vd.src = S.youtubeId(el.value); el.value = vd.src; touch("projects"); }
            }), "주소를 붙여넣으면 영상 ID만 자동으로 남깁니다."));
          }
          ctx = prev;
        }
        drawSrc();
        return [
          grid(2,
            field("영상 제목", text(vd, "title", { placeholder: "플레이 영상" })),
            field("종류", select(vd, "type", [["youtube", "YouTube"], ["file", "영상 파일 업로드"]], {
              onChange: function () { vd.src = ""; drawSrc(); }
            }))),
          srcBox
        ];
      },
      function () { return { title: "", type: "youtube", src: "" }; },
      { title: function (vd, i) { return vd.title || "영상 " + (i + 1); }, addLabel: "영상 추가", empty: "아직 영상이 없습니다." });
  }

  function imagesEditor(pr) {
    const file = ctx;
    const picker = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true });
    const status = h("span", { class: "hint" });
    const box = list(pr.images,
      function (img) {
        return [
          field("이미지", upload(img, "src")),
          field("설명 (선택)", text(img, "caption", { placeholder: "이미지 아래에 보일 설명" }))
        ];
      },
      function () { return { src: "", caption: "" }; },
      { title: function (img, i) { return img.caption || "이미지 " + (i + 1); }, addLabel: "빈 항목 추가", empty: "아직 이미지가 없습니다." });

    async function addFiles(files) {
      files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
      for (let k = 0; k < files.length; k++) {
        status.textContent = "업로드 중… (" + (k + 1) + " / " + files.length + ")";
        try {
          pr.images.push({ src: await uploadFile(files[k]), caption: "" });
          touch(file);
          box.redraw();
        } catch (e) {
          toast("업로드 실패: " + e.message, "error");
          break;
        }
      }
      status.textContent = "";
    }

    picker.addEventListener("change", function () { addFiles(picker.files); picker.value = ""; });
    const drop = h("div", { class: "dropzone", onclick: function () { picker.click(); } },
      h("span", { html: S.icon("image", 24) }),
      h("strong", { text: "이미지 여러 장 올리기" }),
      h("span", { class: "hint", text: "클릭해서 고르거나, 파일을 여기로 끌어다 놓으세요" }),
      status);
    drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", function () { drop.classList.remove("over"); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); });

    return [picker, drop, box];
  }

  // ---------------------------------------------------------
  // 화면: 블로그 목록
  // ---------------------------------------------------------
  function viewPosts(v) {
    ctx = "posts";
    const add = h("button", {
      type: "button", class: "btn btn-primary btn-sm", html: S.icon("plus", 16) + "새 글",
      onclick: function () {
        const post = newPost();
        state.posts.push(post);
        bodies.set(post, { text: "", dirty: true });
        touch("posts");
        location.hash = "#posts/" + (state.posts.length - 1);
      }
    });
    v.append(head("블로그", "글은 작성일 기준 최신순으로 사이트에 표시됩니다.", [siteLink("../index.html#blog"), add]));

    const rows = h("div", { class: "panel-card flush" });
    const sorted = state.posts.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    if (!sorted.length) rows.append(h("p", { class: "row-empty", text: "아직 글이 없습니다. ‘새 글’을 눌러 작성하세요." }));

    sorted.forEach(function (post) {
      const i = state.posts.indexOf(post);
      rows.append(h("div", { class: "row" },
        h("span", { class: "row-date", text: S.fmtDate(post.date) }),
        h("a", { class: "row-main", href: "#posts/" + i },
          h("strong", { text: post.title || "(제목 없음)" }),
          h("small", { text: [post.category, post.tags.map(function (t) { return "#" + t; }).join(" ")].filter(Boolean).join("   ·   ") || post.id })),
        h("div", { class: "row-actions" },
          h("a", { class: "btn btn-sm", href: "#posts/" + i, text: "편집" }),
          miniBtn("trash", "삭제", false, function () {
            if (!confirm("'" + (post.title || "제목 없음") + "' 글을 삭제할까요? 저장하면 본문 파일도 지워집니다.")) return;
            deletePost(post); route();
          }, "danger"))
      ));
    });
    v.append(rows);
  }

  function newPost() {
    const today = ymd(new Date());
    return {
      id: "post-" + today.replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6),
      title: "", date: today, category: "", tags: [], summary: "", thumbnail: ""
    };
  }

  function deletePost(post) {
    const i = state.posts.indexOf(post);
    if (i < 0) return;
    state.posts.splice(i, 1);
    if (post._origId) pendingDeletes.add("posts/" + post._origId + ".md");
    bodies.delete(post);
    touch("posts");
  }

  function loadBody(post) {
    if (bodies.has(post)) return Promise.resolve(bodies.get(post));
    if (!post._origId) {
      const empty = { text: "", dirty: true };
      bodies.set(post, empty);
      return Promise.resolve(empty);
    }
    return fetch("../posts/" + encodeURIComponent(post._origId) + ".md", { cache: "no-store" })
      .then(function (r) {
        if (r.ok) return r.text();
        if (r.status === 404) return "";
        throw new Error("HTTP " + r.status);
      })
      .then(function (txt) {
        const b = { text: txt, dirty: false };
        bodies.set(post, b);
        return b;
      });
  }

  // ---------------------------------------------------------
  // 화면: 글 편집
  // ---------------------------------------------------------
  function viewPostEdit(v, post) {
    ctx = "posts";
    const cats = [];
    state.posts.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
    const catInput = text(post, "category", { placeholder: "개발" });
    catInput.setAttribute("list", "cat-list");

    const bodyCard = h("section", { class: "panel-card" }, h("h2", { text: "본문" }), hintP("본문을 불러오는 중…"));

    v.append(
      h("a", { class: "crumb", href: "#posts", text: "← 블로그 목록" }),
      head(post.title || "새 글", "이미지는 툴바의 ‘이미지’ 버튼, 붙여넣기(Ctrl+V), 끌어다 놓기로 넣을 수 있습니다.", [
        siteLink("../post.html?id=" + encodeURIComponent(post._origId || post.id)),
        dangerBtn("삭제", "이 글을 삭제할까요? 저장하면 본문 파일도 지워집니다.", function () { deletePost(post); location.hash = "#posts"; })
      ]),
      card("글 정보",
        field("제목", text(post, "title", { placeholder: "제목을 입력하세요" })),
        grid(3,
          field("작성일", text(post, "date", { type: "date" })),
          field("카테고리", catInput),
          field("ID (주소에 쓰임)", text(post, "id"), "영문, 숫자, -, _ 만 사용")),
        h("datalist", { id: "cat-list" }, cats.map(function (c) { return h("option", { value: c }); })),
        field("태그", csv(post, "tags", "Unity, C#"), "쉼표로 구분"),
        field("요약", area(post, "summary", { rows: 2 }), "블로그 목록에 보이는 짧은 설명"),
        field("대표 이미지 (선택)", upload(post, "thumbnail"), "블로그 목록 오른쪽과 글 위쪽에 보입니다.")),
      bodyCard
    );

    loadBody(post).then(function (b) {
      bodyCard.innerHTML = "";
      bodyCard.append(h("h2", { text: "본문" }), markdownEditor(b));
    }).catch(function (e) {
      bodyCard.innerHTML = "";
      bodyCard.append(h("h2", { text: "본문" }), hintP("본문 파일을 불러오지 못했습니다: " + e.message));
    });
  }

  // ---------------------------------------------------------
  // 마크다운 에디터 (툴바 + 작성 + 미리보기 + 이미지 업로드)
  // ---------------------------------------------------------
  function markdownEditor(b) {
    const ta = h("textarea", {
      class: "md-input",
      spellcheck: "false",
      placeholder: "여기에 글을 쓰세요. 마크다운을 지원합니다.\n\n## 소제목\n**굵게**, *기울임*, `코드`\n\n이미지는 위의 ‘이미지’ 버튼, 붙여넣기(Ctrl+V), 끌어다 놓기로 넣을 수 있어요.\n이미지를 넣으면 커서가 바로 아래 줄로 이동하니 이어서 쓰면 됩니다."
    });
    ta.value = b.text;
    const preview = h("div", { class: "md-preview prose" });
    const foot = h("div", { class: "md-foot" });
    const picker = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true });
    let timer = 0;

    function changed() {
      b.text = ta.value;
      b.dirty = true;
      touch("bodies");
      clearTimeout(timer);
      timer = setTimeout(render, 150);
    }

    function render() {
      const src = ta.value;
      preview.innerHTML = src.trim()
        ? (window.marked ? window.marked.parse(src) : "<pre>" + S.esc(src) + "</pre>")
        : '<p class="hint">미리보기가 여기에 표시됩니다.</p>';
      preview.querySelectorAll("img").forEach(function (img) {
        const s = img.getAttribute("src");
        if (s) img.src = url(s);
      });
      const imgCount = (src.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
      foot.textContent = "";
      foot.append(h("span", { text: src.replace(/\s/g, "").length.toLocaleString() + "자" }), h("span", { text: "이미지 " + imgCount + "개" }));
    }

    // 텍스트 바꾸기 (가능하면 실행 취소(Ctrl+Z)가 되도록 execCommand 사용)
    function replaceRange(start, end, str) {
      ta.focus();
      ta.setSelectionRange(start, end);
      let ok = false;
      try { ok = document.execCommand("insertText", false, str); } catch (e) { ok = false; }
      if (!ok || ta.value.slice(start, start + str.length) !== str) {
        ta.setRangeText(str, start, end, "end");
      }
      changed();
    }

    function wrap(before, after, placeholder) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e) || placeholder;
      replaceRange(s, e, before + sel + after);
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    }

    function linePrefix(prefix) {
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const block = v.slice(ls, e);
      const lns = block.split("\n");
      const allHave = lns.every(function (l) { return l.indexOf(prefix) === 0; });
      const out = lns.map(function (l) { return allHave ? l.slice(prefix.length) : prefix + l; }).join("\n");
      replaceRange(ls, e, out);
    }

    // 블록(이미지, 코드 등)을 앞뒤 빈 줄과 함께 넣고, 커서는 블록 바로 아래 새 줄로
    function insertBlock(block) {
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const before = v.slice(0, s), after = v.slice(e);
      const pre = !before || /\n\n$/.test(before) ? "" : /\n$/.test(before) ? "\n" : "\n\n";
      const post = /^\n\n/.test(after) ? "" : /^\n/.test(after) ? "\n" : "\n\n";
      replaceRange(s, e, pre + block + post);
      const caret = s + pre.length + block.length + post.length;
      ta.setSelectionRange(caret, caret);
    }

    // 업로드 중 표시 → 업로드 끝나면 이미지 문법으로 교체
    function replaceToken(token, rep) {
      const v = ta.value, i = v.indexOf(token);
      if (i < 0) return;
      const s = ta.selectionStart, e = ta.selectionEnd, d = rep.length - token.length;
      const fix = function (p) { return p >= i + token.length ? p + d : (p > i ? i + rep.length : p); };
      ta.value = v.slice(0, i) + rep + v.slice(i + token.length);
      ta.setSelectionRange(fix(s), fix(e));
      changed();
    }

    async function addImages(files) {
      files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      for (const f of files) {
        const token = "⏳ 이미지 업로드 중… (" + Math.random().toString(36).slice(2, 7) + ")";
        insertBlock(token);
        let rep = "";
        try {
          const path = await uploadFile(f);
          rep = "![" + altText(f.name) + "](" + path + ")";
        } catch (e) {
          toast("이미지 업로드 실패: " + e.message, "error");
        }
        replaceToken(token, rep);
      }
      ta.focus();
    }

    function altText(name) {
      const base = String(name || "").replace(/\.[^.]+$/, "").replace(/[[\]()]/g, "").trim();
      return !base || base === "image" ? "이미지" : base;
    }

    const tools = [
      ["H2", "소제목", function () { linePrefix("## "); }],
      ["H3", "작은 제목", function () { linePrefix("### "); }],
      "|",
      ["<b>B</b>", "굵게", function () { wrap("**", "**", "굵은 글씨"); }],
      ["<i>I</i>", "기울임", function () { wrap("*", "*", "기울임"); }],
      ["<s>S</s>", "취소선", function () { wrap("~~", "~~", "취소선"); }],
      "|",
      ["“ 인용", "인용", function () { linePrefix("> "); }],
      ["• 목록", "글머리 목록", function () { linePrefix("- "); }],
      ["1. 목록", "번호 목록", function () { linePrefix("1. "); }],
      "|",
      ["`코드`", "인라인 코드", function () { wrap("`", "`", "code"); }],
      ["{ } 코드블록", "코드 블록", function () {
        const s = ta.selectionStart, e = ta.selectionEnd;
        const sel = ta.value.slice(s, e) || "// 코드";
        insertBlock("```csharp\n" + sel + "\n```");
      }],
      ["링크", "링크", function () { wrap("[", "](https://)", "링크 텍스트"); }],
      ["― 구분선", "구분선", function () { insertBlock("---"); }]
    ];

    const toolbar = h("div", { class: "md-toolbar", role: "toolbar", "aria-label": "서식" });
    tools.forEach(function (t) {
      if (t === "|") { toolbar.append(h("span", { class: "sep" })); return; }
      toolbar.append(h("button", {
        type: "button", title: t[1], "aria-label": t[1], html: t[0],
        onmousedown: function (e) { e.preventDefault(); },   // 텍스트 선택 유지
        onclick: t[2]
      }));
    });
    toolbar.append(h("button", {
      type: "button", class: "tb-primary", title: "이미지 넣기", html: S.icon("image", 16) + "이미지",
      onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { picker.click(); }
    }));

    picker.addEventListener("change", function () { const fs = Array.prototype.slice.call(picker.files); picker.value = ""; addImages(fs); });

    const editor = h("div", { class: "md-editor" },
      toolbar,
      h("div", { class: "md-panes" },
        h("div", { class: "md-pane" }, h("div", { class: "md-pane-label", text: "작성" }), ta),
        h("div", { class: "md-pane" }, h("div", { class: "md-pane-label", text: "미리보기" }), preview)),
      foot,
      picker);

    ta.addEventListener("input", changed);
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); replaceRange(ta.selectionStart, ta.selectionEnd, "    "); }
    });
    ta.addEventListener("paste", function (e) {
      const files = e.clipboardData && e.clipboardData.files;
      if (files && files.length && Array.prototype.some.call(files, function (f) { return /^image\//.test(f.type); })) {
        e.preventDefault();
        addImages(Array.prototype.slice.call(files));
      }
    });
    editor.addEventListener("dragover", function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") !== -1) {
        e.preventDefault();
        editor.classList.add("over");
      }
    });
    editor.addEventListener("dragleave", function (e) { if (!editor.contains(e.relatedTarget)) editor.classList.remove("over"); });
    editor.addEventListener("drop", function (e) {
      editor.classList.remove("over");
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      addImages(Array.prototype.slice.call(e.dataTransfer.files));
    });

    render();
    return editor;
  }

  // ---------------------------------------------------------
  // 입력 부품
  // ---------------------------------------------------------
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (typeof v === "boolean" || typeof v === "number") el[k] = v;
        else el.setAttribute(k, v);
      });
    }
    for (let i = 2; i < arguments.length; i++) appendKids(el, arguments[i]);
    return el;
  }
  function appendKids(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { appendKids(el, k); }); return; }
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }

  function head(title, desc, actions) {
    return h("div", { class: "admin-head" },
      h("div", null, h("h1", { text: title }), desc ? h("p", { text: desc }) : null),
      actions ? h("div", { class: "head-actions" }, actions) : null);
  }
  function card(title) {
    const kids = Array.prototype.slice.call(arguments, 1);
    return h("section", { class: "panel-card" }, title ? h("h2", { text: title }) : null, kids);
  }
  function field(label, control, hint) {
    if (control && /^(INPUT|TEXTAREA|SELECT)$/.test(control.tagName) && !control.getAttribute("aria-label")) {
      control.setAttribute("aria-label", label);
    }
    return h("div", { class: "field" }, h("label", { text: label }), control, hint ? h("p", { class: "hint", text: hint }) : null);
  }
  function grid(n) {
    return h("div", { class: "grid grid-" + n }, Array.prototype.slice.call(arguments, 1));
  }
  function hintP(t) { return h("p", { class: "hint card-hint", text: t }); }
  function siteLink(href) {
    return h("a", { class: "btn btn-sm", href: href, target: "_blank", rel: "noopener", html: "사이트에서 보기 " + S.icon("arrow", 14) });
  }
  function dangerBtn(label, msg, fn) {
    return h("button", { type: "button", class: "btn btn-sm btn-danger", html: S.icon("trash", 15) + label, onclick: function () { if (confirm(msg)) fn(); } });
  }
  function miniBtn(icon, label, disabled, onclick, cls) {
    return h("button", { type: "button", class: "mini-btn" + (cls ? " " + cls : ""), title: label, "aria-label": label, disabled: disabled, onclick: onclick, html: S.icon(icon, 15) });
  }

  function text(obj, key, o) {
    o = o || {};
    const file = ctx;
    const el = h("input", { class: "input", type: o.type || "text", placeholder: o.placeholder || null });
    el.value = o.format ? o.format(obj[key]) : (obj[key] == null ? "" : obj[key]);
    el.addEventListener("input", function () {
      obj[key] = o.parse ? o.parse(el.value) : el.value;
      touch(file);
      if (o.onInput) o.onInput(el.value);
    });
    if (o.onChange) el.addEventListener("change", function () { o.onChange(el); });
    return el;
  }

  function area(obj, key, o) {
    o = o || {};
    const file = ctx;
    const el = h("textarea", { class: "input textarea" + (o.mono ? " mono" : ""), rows: o.rows || 3, placeholder: o.placeholder || null, spellcheck: o.mono ? "false" : null });
    el.value = o.format ? o.format(obj[key]) : (obj[key] == null ? "" : obj[key]);
    el.addEventListener("input", function () {
      obj[key] = o.parse ? o.parse(el.value) : el.value;
      touch(file);
    });
    if (o.mono) {
      el.addEventListener("keydown", function (e) {
        if (e.key !== "Tab" || e.shiftKey) return;
        e.preventDefault();
        const s = el.selectionStart;
        el.setRangeText("    ", s, el.selectionEnd, "end");
        el.dispatchEvent(new Event("input"));
      });
    }
    return el;
  }

  function csv(obj, key, placeholder) {
    return text(obj, key, {
      placeholder: placeholder,
      format: function (v) { return (v || []).join(", "); },
      parse: function (v) { return v.split(",").map(trim).filter(Boolean); }
    });
  }

  function lines(obj, key, o) {
    return area(obj, key, Object.assign({
      format: function (v) { return (v || []).join("\n"); },
      parse: function (v) { return v.split("\n").map(trim).filter(Boolean); }
    }, o));
  }

  function select(obj, key, options, o) {
    o = o || {};
    const file = ctx;
    let opts = options;
    if (obj[key] && !opts.some(function (x) { return x[0] === obj[key]; })) opts = opts.concat([[obj[key], obj[key]]]);
    if (obj[key] == null || obj[key] === "") obj[key] = opts[0][0];
    const el = h("select", { class: "input select" }, opts.map(function (x) { return h("option", { value: x[0], text: x[1] }); }));
    el.value = obj[key];
    el.addEventListener("change", function () {
      obj[key] = el.value;
      touch(file);
      if (o.onChange) o.onChange(el.value);
    });
    return el;
  }

  function check(obj, key, label) {
    const file = ctx;
    const el = h("input", { type: "checkbox" });
    el.checked = !!obj[key];
    el.addEventListener("change", function () { obj[key] = el.checked; touch(file); });
    return h("label", { class: "check" }, el, h("span", { text: label }));
  }

  // 경로 입력 + 업로드 버튼 + 미리보기
  function upload(obj, key, o) {
    o = o || {};
    const file = ctx;
    const preview = h("div", { class: "upload-preview" });
    const input = text(obj, key, { placeholder: "업로드하거나 경로/URL 입력", onInput: paint });
    const picker = h("input", { type: "file", accept: o.accept || "image/*", hidden: true });
    const btn = h("button", { type: "button", class: "btn btn-sm", text: "업로드", onclick: function () { picker.click(); } });

    picker.addEventListener("change", function () {
      const f = picker.files[0];
      picker.value = "";
      if (!f) return;
      btn.disabled = true;
      btn.textContent = "업로드 중…";
      uploadFile(f).then(function (path) {
        obj[key] = path;
        input.value = path;
        touch(file);
        paint();
      }).catch(function (e) {
        toast("업로드 실패: " + e.message, "error");
      }).then(function () {
        btn.disabled = false;
        btn.textContent = "업로드";
      });
    });

    function paint() {
      const v = obj[key];
      preview.innerHTML = "";
      if (!v) return;
      if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(v) || /^https?:/.test(v) && !/\.(mp4|webm|pdf)$/i.test(v)) {
        const img = h("img", { src: url(v), alt: "" });
        img.addEventListener("error", function () { img.remove(); });
        preview.append(img);
      } else if (/\.(mp4|webm)$/i.test(v)) {
        preview.append(h("video", { src: url(v), controls: true, preload: "metadata" }));
      } else if (/\.pdf$/i.test(v)) {
        preview.append(h("a", { href: url(v), target: "_blank", rel: "noopener", text: "PDF 열어 보기 ↗" }));
      }
    }
    paint();

    return h("div", { class: "upload" }, h("div", { class: "upload-row" }, input, btn), picker, preview);
  }

  // 반복 항목 (추가 / 삭제 / 순서 변경)
  function list(arr, render, make, o) {
    o = o || {};
    const file = ctx;
    const box = h("div", { class: "list" });

    function draw() {
      const prev = ctx;
      ctx = file;
      box.innerHTML = "";
      arr.forEach(function (item, i) {
        const title = h("strong", { class: "list-title", text: o.title ? o.title(item, i) : "" });
        const headRow = h("div", { class: "list-head" },
          h("span", { class: "list-index", text: String(i + 1) }),
          title,
          miniBtn("up", "위로", i === 0, function () { move(i, -1); }),
          miniBtn("down", "아래로", i === arr.length - 1, function () { move(i, 1); }),
          miniBtn("trash", "삭제", false, function () {
            if (o.confirm && !confirm(o.confirm)) return;
            arr.splice(i, 1);
            touch(file);
            draw();
          }, "danger"));
        const el = h("div", { class: "list-item" }, headRow, h("div", { class: "list-body" }, render(item, i)));
        if (o.title) {
          const refresh = function () { title.textContent = o.title(item, i); };
          el.addEventListener("input", refresh);
          el.addEventListener("change", refresh);
        }
        box.append(el);
      });
      if (!arr.length && o.empty) box.append(h("p", { class: "hint list-empty", text: o.empty }));
      if (make) {
        box.append(h("button", {
          type: "button", class: "btn-add", html: S.icon("plus", 16) + (o.addLabel || "추가"),
          onclick: function () {
            arr.push(make());
            touch(file);
            draw();
            const items = box.querySelectorAll(":scope > .list-item");
            const last = items[items.length - 1];
            const f = last && last.querySelector("input:not([type=file]), textarea");
            if (f) f.focus();
          }
        }));
      }
      ctx = prev;
    }

    function move(i, d) {
      swap(arr, i, i + d);
      touch(file);
      draw();
    }

    box.redraw = draw;
    draw();
    return box;
  }

  // ---------------------------------------------------------
  // 유틸
  // ---------------------------------------------------------
  function url(p) {
    if (!p) return "";
    return /^(https?:|data:|blob:|\/)/.test(p) ? p : "../" + p;
  }
  function trim(s) { return s.trim(); }
  function swap(arr, i, j) {
    if (j < 0 || j >= arr.length) return;
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  function ymd(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dedent(code) {
    const lns = String(code).replace(/\t/g, "    ").split("\n");
    while (lns.length && !lns[0].trim()) lns.shift();
    while (lns.length && !lns[lns.length - 1].trim()) lns.pop();
    const ind = lns.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^ */)[0].length; });
    const n = ind.length ? Math.min.apply(null, ind) : 0;
    return lns.map(function (l) { return l.slice(n); }).join("\n");
  }

  let toastTimer = 0;
  function toast(msg, type) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast show" + (type ? " " + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = "toast" + (type ? " " + type : ""); }, type === "error" ? 5000 : 2800);
  }

  boot();
})();
