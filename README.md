# Portfolio

GitHub Pages로 배포하는 정적 포트폴리오 사이트입니다. 빌드 과정 없이 HTML/CSS/JS만으로 동작합니다.

## 화면 구성

상단 탭 메뉴 4개: **소개 · 포트폴리오 · 블로그 · 연락처** (`index.html#about` / `#portfolio` / `#blog` / `#contact`)

- 프로젝트 상세: `project.html?id=프로젝트id` — 정보, 영상, 개요, **개발 일정 표**, 파트별 코드 설명
- 블로그 글: `post.html?id=글id` — 마크다운 본문
- 디자인 기준은 [DESIGN.md](DESIGN.md) 참고

## 폴더 구조

```
Portfolio/
├─ index.html          # 메인 (탭 4개)
├─ project.html        # 프로젝트 상세
├─ post.html           # 블로그 글
├─ DESIGN.md           # 디자인 가이드 (색, 글꼴, 간격, 컴포넌트)
├─ css/style.css       # 스타일 (DESIGN.md 토큰과 대응)
├─ js/common.js        # 공통: 헤더, 테마 전환, 아이콘
├─ js/main.js          # 탭 4개 렌더링
├─ js/project.js       # 프로젝트 상세 + 일정 표
├─ js/post.js          # 블로그 글
├─ data/profile.js     # ✏️ 내 정보 (소개, 기술, 이력, 연락처)
├─ data/projects.js    # ✏️ 프로젝트 목록 (+ 일정)
├─ data/posts.js       # ✏️ 블로그 글 목록 (제목, 날짜, 카테고리)
├─ posts/              # ✏️ 블로그 본문 (글id.md)
├─ Managers/           # 관리자 페이지 (Managers.html, admin.js, admin.css)
├─ serve.ps1           # 로컬 서버 + 관리자 저장/업로드 API
└─ assets/
   ├─ uploads/         # 관리자 페이지에서 올린 이미지/영상
   ├─ images/          # 직접 넣는 이미지
   └─ videos/          # 직접 넣는 영상 (mp4)
```

## 관리자 페이지 (추천)

사이트의 모든 내용(소개 · 포트폴리오 · 블로그 · 연락처)을 화면에서 입력 · 수정 · 삭제할 수 있습니다.

1. `serve.ps1`로 로컬 서버 실행
2. http://localhost:8000/Managers/Managers.html 접속
   (또는 사이트 맨 아래 **관리자** 클릭 → 비밀번호 `1234`)
3. 수정 후 오른쪽 위 **저장** (또는 `Ctrl+S`) → `data/*.js`, `posts/*.md` 파일에 저장됨
4. 업로드한 이미지/영상은 `assets/uploads/`에 저장됨
5. GitHub에 올리려면 `git add . ; git commit ; git push`

- 블로그 본문: 툴바의 **이미지** 버튼, 붙여넣기(`Ctrl+V`), 끌어다 놓기로 이미지 삽입. 넣은 뒤 커서가 이미지 바로 아래로 이동해 이어 쓸 수 있습니다.
- 프로젝트: 영상 n개(유튜브 주소 또는 mp4 업로드), 이미지 n개(여러 장 한 번에 업로드)
- 코드 설명 파트마다 **HTML 데모**를 넣을 수 있습니다. Claude 웹 생성기로 만든 HTML을 붙여넣거나 .html 파일을 올리면, 사이트에서 그 파트의 코드 위에 실제로 동작하는 화면으로 보입니다. (다시 실행 · 전체 화면 · 새 창 버튼 포함, 높이는 자동 또는 직접 지정)
- 비밀번호는 `js/common.js`의 `ADMIN_PASSWORD`에서 바꿉니다. **페이지 소스에서 보이므로 진짜 보안이 아닙니다.**
- 저장은 로컬 서버(`serve.ps1`)에서만 됩니다. GitHub Pages에서는 관리자 페이지가 열려도 저장되지 않습니다.

## 블로그 글 직접 쓰기 (관리자 페이지 없이)

1. `posts/글id.md` 파일을 만들고 마크다운으로 작성
2. `data/posts.js`에 `{ id: "글id", title, date: "YYYY-MM-DD", category, tags, summary }` 추가

## 프로젝트 추가 방법

1. `data/projects.js`의 `window.PROJECTS` 배열에 항목을 하나 추가합니다. (파일 상단에 필드 설명이 있습니다)
2. 영상
   - **유튜브(권장)**: `video: { type: "youtube", src: "영상ID" }`
     — `https://youtu.be/abc123` 이면 `abc123`
   - **직접 업로드**: `assets/videos/`에 mp4를 넣고 `video: { type: "file", src: "assets/videos/파일.mp4" }`
     — GitHub는 파일당 100MB 제한이 있으니 큰 영상은 유튜브를 쓰세요.
3. 코드 설명은 `sections` 배열에 파트 단위로 추가합니다.

## 로컬에서 미리보기

별도 설치 없이 포함된 PowerShell 서버로 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

그 다음 브라우저에서 http://localhost:8000 접속. (종료: Ctrl+C)

## GitHub Pages 배포

1. GitHub에 저장소를 만듭니다. (`아이디.github.io` 로 만들면 주소가 `https://아이디.github.io`)
2. 이 폴더를 push 합니다.
   ```powershell
   git init
   git add .
   git commit -m "Init portfolio"
   git branch -M main
   git remote add origin https://github.com/아이디/저장소이름.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Source: Deploy from a branch → main / (root)** 선택 후 저장.
