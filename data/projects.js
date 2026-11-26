// 포트폴리오 프로젝트 목록
// 관리자 페이지(Managers/Managers.html)에서 저장한 파일입니다. 직접 수정해도 되지만 관리자에서 저장하면 덮어써집니다.
window.PROJECTS = [
  {
    "id": "sample-game",
    "title": "Dash & Slash — 2D 액션 게임",
    "summary": "플레이어 이동, 적 AI, 오브젝트 풀링을 구현한 2D 액션 게임",
    "thumbnail": "",
    "tags": [
      "Unity",
      "C#"
    ],
    "period": "2026.01 ~ 2026.03",
    "role": "1인 개발 (기획 · 프로그래밍)",
    "team": "1명",
    "stack": [
      "Unity 6",
      "C#"
    ],
    "links": [
      {
        "label": "GitHub",
        "url": "https://github.com/your-id/sample-game"
      }
    ],
    "videos": [],
    "images": [],
    "overview": "샘플 프로젝트입니다. data/projects.js 에서 내용을 바꿔 사용하세요.\n빠른 대시와 근접 공격을 중심으로 한 2D 액션 게임으로, 아래에서 개발 일정과 핵심 구현을 파트별로 설명합니다.",
    "schedule": [
      {
        "phase": "기획",
        "start": "2026-01-05",
        "end": "2026-01-16",
        "tasks": [
          "게임 컨셉 정리",
          "핵심 루프 설계"
        ],
        "status": "done"
      },
      {
        "phase": "프로토타입",
        "start": "2026-01-17",
        "end": "2026-02-06",
        "tasks": [
          "플레이어 이동/공격",
          "카메라"
        ],
        "status": "done"
      },
      {
        "phase": "핵심 시스템",
        "start": "2026-02-07",
        "end": "2026-03-06",
        "tasks": [
          "적 AI",
          "오브젝트 풀링",
          "UI"
        ],
        "status": "done"
      },
      {
        "phase": "폴리싱",
        "start": "2026-03-07",
        "end": "2026-03-24",
        "tasks": [
          "이펙트·사운드",
          "밸런싱"
        ],
        "status": "progress"
      },
      {
        "phase": "출시 준비",
        "start": "2026-03-25",
        "end": "2026-03-31",
        "tasks": [
          "빌드, 시연 영상 제작"
        ],
        "status": "todo"
      }
    ],
    "sections": [
      {
        "title": "플레이어 이동",
        "description": "입력값을 받아 Rigidbody2D로 이동을 처리합니다.\n물리 연산은 FixedUpdate에서 수행해 프레임과 무관하게 일정한 속도를 유지합니다.",
        "demo": {
          "title": "플레이어 이동 데모 (방향키 / WASD)",
          "mode": "paste",
          "height": "",
          "html": "<!doctype html>d\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n<style>\n  html, body { margin: 0; background: #0f1117; color: #e6edf3; font-family: system-ui, sans-serif; }\n  .wrap { padding: 16px; }\n  canvas { display: block; width: 100%; height: auto; border-radius: 10px; background: #161b22; outline: none; }\n  p { margin: 10px 0 0; font-size: 13px; color: #8b93a7; }\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n  <canvas id=\"c\" width=\"640\" height=\"280\" tabindex=\"0\"></canvas>\n  <p>화면을 클릭한 뒤 방향키 또는 WASD 로 움직여 보세요. 대각선으로 움직여도 속도가 같습니다.</p>\n</div>\n<script>\n  const c = document.getElementById(\"c\"), g = c.getContext(\"2d\");\n  const keys = {}, p = { x: 320, y: 140, speed: 220 };\n  addEventListener(\"keydown\", function (e) { keys[e.key.toLowerCase()] = true; if (e.key.indexOf(\"Arrow\") === 0) e.preventDefault(); });\n  addEventListener(\"keyup\", function (e) { keys[e.key.toLowerCase()] = false; });\n  c.addEventListener(\"click\", function () { c.focus(); });\n  let last = performance.now();\n  function loop(now) {\n    const dt = Math.min((now - last) / 1000, 0.05); last = now;\n    const x = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);\n    const y = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);\n    const len = Math.hypot(x, y) || 1;\n    p.x = Math.max(16, Math.min(c.width - 16, p.x + x / len * p.speed * dt));\n    p.y = Math.max(16, Math.min(c.height - 16, p.y + y / len * p.speed * dt));\n    g.clearRect(0, 0, c.width, c.height);\n    g.fillStyle = \"#3451e0\";\n    g.beginPath(); g.arc(p.x, p.y, 16, 0, Math.PI * 2); g.fill();\n    requestAnimationFrame(loop);\n  }\n  requestAnimationFrame(loop);\n</script>\n</body>\n</html>"
        },
        "file": "PlayerController.cs",
        "language": "csharp",
        "code": "public class PlayerController : MonoBehaviour\n{\n    [SerializeField] private float moveSpeed = 5f;\n    private Rigidbody2D rb;\n    private Vector2 input;\n\n    void Awake() => rb = GetComponent<Rigidbody2D>();\n\n    void Update()\n    {\n        input.x = Input.GetAxisRaw(\"Horizontal\");\n        input.y = Input.GetAxisRaw(\"Vertical\");\n    }\n\n    void FixedUpdate()\n    {\n        rb.velocity = input.normalized * moveSpeed;\n    }\n}",
        "points": [
          "입력은 Update, 물리는 FixedUpdate로 분리",
          "normalized로 대각선 이동 속도 보정"
        ]
      },
      {
        "title": "오브젝트 풀링",
        "description": "총알처럼 자주 생성/삭제되는 오브젝트를 미리 만들어 재사용해 GC 부하를 줄였습니다.",
        "file": "ObjectPool.cs",
        "language": "csharp",
        "code": "public class ObjectPool : MonoBehaviour\n{\n    [SerializeField] private GameObject prefab;\n    private readonly Queue<GameObject> pool = new();\n\n    public GameObject Get()\n    {\n        var obj = pool.Count > 0 ? pool.Dequeue() : Instantiate(prefab);\n        obj.SetActive(true);\n        return obj;\n    }\n\n    public void Release(GameObject obj)\n    {\n        obj.SetActive(false);\n        pool.Enqueue(obj);\n    }\n}",
        "points": []
      }
    ]
  },
  {
    "id": "sample-web",
    "title": "Taskboard — 웹 일정 관리 서비스",
    "summary": "로컬 mp4 영상을 사용하는 예시 프로젝트",
    "thumbnail": "",
    "tags": [
      "JavaScript",
      "Web"
    ],
    "period": "2026.04 ~ 2026.05",
    "role": "프론트엔드",
    "team": "3명",
    "stack": [
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "videos": [],
    "images": [],
    "overview": "영상 파일을 assets/videos 폴더에 넣고 video.src 에 경로를 적으면 재생됩니다.",
    "schedule": [
      {
        "phase": "요구사항 정의",
        "start": "2026-04-01",
        "end": "2026-04-07",
        "tasks": [
          "기능 목록, 화면 설계"
        ],
        "status": "done"
      },
      {
        "phase": "개발",
        "start": "2026-04-08",
        "end": "2026-05-10",
        "tasks": [
          "목록/상세 화면",
          "API 연동"
        ],
        "status": "done"
      },
      {
        "phase": "테스트 · 배포",
        "start": "2026-05-11",
        "end": "2026-05-20",
        "tasks": [
          "QA, 배포"
        ],
        "status": "done"
      }
    ],
    "sections": [
      {
        "title": "데이터 불러오기",
        "description": "fetch로 API 데이터를 받아 화면에 렌더링합니다.",
        "file": "app.js",
        "language": "javascript",
        "code": "async function loadItems() {\n  const res = await fetch(\"/api/items\");\n  if (!res.ok) throw new Error(\"불러오기 실패\");\n  const items = await res.json();\n  render(items);\n}",
        "points": []
      }
    ],
    "links": []
  }
];
