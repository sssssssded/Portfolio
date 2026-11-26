// 블로그 글 상세: ?id=xxx → data/posts.js 의 정보 + posts/xxx.md 본문
(function () {
  const S = window.Site;
  const esc = S.esc;
  const root = document.getElementById("post-root");
  const POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  });

  S.initPage("blog");

  const id = S.param("id");
  const index = POSTS.findIndex(function (p) { return p.id === id; });
  const post = POSTS[index];

  if (!post) {
    root.innerHTML = '<p class="empty">글을 찾을 수 없습니다. <a href="index.html#blog">블로그로 돌아가기</a></p>';
    return;
  }

  document.title = post.title + " | Blog";

  const newer = POSTS[index - 1];
  const older = POSTS[index + 1];

  root.innerHTML =
    '<article class="post">' +
      '<header class="post-head">' +
        '<a class="crumb" href="index.html#blog">← 블로그</a>' +
        '<div class="post-meta">' + (post.category ? '<span class="cat">' + esc(post.category) + "</span>" : "") +
          "<time>" + S.fmtDate(post.date) + '</time><span class="read-time"></span></div>' +
        "<h1>" + esc(post.title) + "</h1>" +
        (post.summary ? '<p class="lead">' + esc(post.summary) + "</p>" : "") +
        S.tagsHtml(post.tags) +
      "</header>" +
      (post.thumbnail ? '<img class="post-cover" src="' + esc(post.thumbnail) + '" alt="">' : "") +
      '<div class="prose" id="post-body"><p class="empty">본문을 불러오는 중…</p></div>' +
    "</article>" +
    '<nav class="pager">' +
      (older ? '<a class="pager-link" href="post.html?id=' + encodeURIComponent(older.id) + '"><span class="caption">이전 글</span><strong>' + esc(older.title) + "</strong></a>" : "<span></span>") +
      (newer ? '<a class="pager-link next" href="post.html?id=' + encodeURIComponent(newer.id) + '"><span class="caption">다음 글</span><strong>' + esc(newer.title) + "</strong></a>" : "<span></span>") +
    "</nav>";

  const body = document.getElementById("post-body");

  const source = post.content
    ? Promise.resolve(post.content)
    : fetch("posts/" + encodeURIComponent(post.id) + ".md").then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      });

  source.then(function (md) {
    body.innerHTML = window.marked ? window.marked.parse(md) : "<pre>" + esc(md) + "</pre>";

    const minutes = Math.max(1, Math.round(md.length / 500));
    root.querySelector(".read-time").textContent = minutes + "분 읽기";

    // 코드 블록: 하이라이트 + 복사 버튼
    body.querySelectorAll("pre > code").forEach(function (code) {
      if (window.hljs) window.hljs.highlightElement(code);
      const pre = code.parentElement;
      const lang = (code.className.match(/language-(\w+)/) || [])[1] || "code";
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      wrap.innerHTML = '<div class="code-head"><span>' + esc(lang) + '</span><button class="copy-btn" type="button">복사</button></div>';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wrap.querySelector(".copy-btn").addEventListener("click", function (e) {
        S.copyText(code.innerText, e.currentTarget);
      });
    });

    // 표는 좁은 화면에서 가로 스크롤
    body.querySelectorAll("table").forEach(function (t) {
      const w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });

    // 외부 링크는 새 탭
    body.querySelectorAll("a[href^='http']").forEach(function (a) {
      a.target = "_blank";
      a.rel = "noopener";
    });

    // 이미지: ![설명](경로 "캡션") 의 캡션 표시 + 클릭하면 크게 보기
    const imgs = Array.prototype.slice.call(body.querySelectorAll("img"));
    const items = imgs.map(function (x) { return { src: x.getAttribute("src"), caption: x.title || "" }; });
    imgs.forEach(function (img, i) {
      img.loading = "lazy";
      img.addEventListener("click", function () { S.lightbox(items, i); });
      const parent = img.parentElement;
      if (parent.tagName === "P" && parent.childNodes.length === 1) {
        const fig = document.createElement("figure");
        parent.replaceWith(fig);
        fig.appendChild(img);
        if (img.title) {
          const cap = document.createElement("figcaption");
          cap.textContent = img.title;
          fig.appendChild(cap);
        }
      }
    });
  }).catch(function () {
    body.innerHTML = '<p class="empty">본문(posts/' + esc(post.id) + '.md)을 불러오지 못했습니다. ' +
      "파일이 있는지 확인하고, 로컬에서는 serve.ps1 로 실행해 주세요.</p>";
  });
})();
