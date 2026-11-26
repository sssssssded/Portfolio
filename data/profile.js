// =========================================================
// 내 정보 — 소개 탭 / 연락처 탭 / 헤더 로고 / 푸터에 사용됩니다.
// =========================================================
window.PROFILE = {
  name: "홍길동",
  role: "Game & Software Developer",
  headline: "플레이어의 경험을\n코드로 설계합니다.",   // 소개 탭 큰 문구 (\n = 줄바꿈)
  intro: "게임 플레이 시스템과 툴 개발을 좋아하는 개발자입니다. 직접 만든 프로젝트의 시연 영상과 핵심 코드를 정리해 두었습니다.",
  photo: "",          // 프로필 사진 경로 예: "assets/images/profile.jpg" (비우면 이름 첫 글자)
  resume: "",         // 이력서 PDF 경로 예: "assets/resume.pdf" (비우면 버튼 숨김)

  // 소개 탭 숫자 카드 (프로젝트 수 / 블로그 글 수는 자동 계산되어 앞에 붙음)
  stats: [
    { label: "개발 경력", value: "2년" },
    { label: "사용 언어", value: "4개" }
  ],

  // 소개 탭 "About me" 문단
  about: [
    "문제를 작게 나누고, 동작하는 것을 빠르게 만든 뒤 다듬는 방식으로 일합니다.",
    "최근에는 Unity 기반 게임플레이 프로그래밍과 에디터 툴 제작에 집중하고 있습니다."
  ],

  // 기술 스택
  skills: [
    { group: "Language", items: ["C#", "C++", "JavaScript", "Python"] },
    { group: "Engine / Framework", items: ["Unity", "Unreal Engine", "Node.js"] },
    { group: "Tools", items: ["Git", "Jira", "Notion", "Figma"] }
  ],

  // 이력 (그룹별 타임라인)
  history: [
    {
      title: "경력",
      items: [
        { period: "2025.03 — 현재", title: "클라이언트 개발자", org: "○○ 스튜디오", desc: "게임플레이 시스템, UI 개발" },
        { period: "2024.07 — 2024.12", title: "인턴", org: "△△ 게임즈", desc: "QA 자동화 툴 제작" }
      ]
    },
    {
      title: "학력 · 활동",
      items: [
        { period: "2020.03 — 2025.02", title: "컴퓨터공학과 학사", org: "○○대학교" },
        { period: "2023", title: "게임잼 우수상", org: "○○ 게임잼" }
      ]
    }
  ],

  // 포트폴리오 / 블로그 탭 소개 문구
  portfolioIntro: "직접 만든 프로젝트와 핵심 구현을 영상과 코드로 정리했습니다.",
  blogIntro: "개발하며 배운 것들과 생각을 기록합니다.",

  // 연락처 탭
  contactMessage: "협업, 채용, 프로젝트 관련 문의는 언제든 환영합니다.",
  availability: "현재 새로운 기회에 열려 있습니다.",
  // type: email | phone | github | linkedin | youtube | blog | location | link
  // copy: true 면 복사 버튼 표시, url 이 있으면 열기 버튼 표시
  contacts: [
    { type: "email", label: "이메일", value: "your@email.com", url: "mailto:your@email.com", copy: true },
    { type: "phone", label: "전화", value: "010-0000-0000", url: "tel:01000000000", copy: true },
    { type: "github", label: "GitHub", value: "github.com/your-id", url: "https://github.com/your-id" },
    { type: "linkedin", label: "LinkedIn", value: "linkedin.com/in/your-id", url: "https://www.linkedin.com/in/your-id" },
    { type: "youtube", label: "YouTube", value: "@your-channel", url: "https://www.youtube.com/@your-channel" },
    { type: "location", label: "위치", value: "서울, 대한민국" }
  ],

  footer: "© 2026 홍길동. All rights reserved."
};
