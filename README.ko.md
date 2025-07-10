# MCP Server Configuration App

Claude Code 사용자를 위한 MCP (Model Context Protocol) 서버 설정 관리 데스크톱 애플리케이션입니다.

> 🤖 **Claude Code로 개발됨** - 이 애플리케이션은 Anthropic의 AI 기반 개발 환경인 [Claude Code](https://claude.ai/code)를 사용하여 구축되었습니다.

> 🌍 **Language**: [English](README.md) | [한국어](README.ko.md)

## 📋 주요 기능

### 🎯 핵심 기능
- **MCP 설정 파일 생성**: 선택된 프로젝트 디렉토리에 프로젝트 스코프에 맞는 `.mcp.json` 파일 자동 생성
- **실시간 설정 검증**: MCP 서버 설정의 문법 및 구조 유효성 실시간 체크
- **서버 라이브러리 관리**: 추가한 MCP 서버 목록을 저장하여 다른 프로젝트에서 재활용 가능
- **직관적인 GUI 인터페이스**: 명령줄 없이 직관적인 UI로 MCP 설정 관리

### 🛠️ 기술적 기능
- **디렉토리 선택**: 네이티브 파일 다이얼로그를 통한 프로젝트 폴더 선택
- **실시간 편집**: 모달 기반 서버 설정 추가/편집/삭제 기능
- **영구 저장**: 사용자 설정 및 서버 라이브러리 자동 저장
- **스키마 검증**: JSON 스키마 기반 설정 유효성 검사
- **이중 편집 모드**: 폼 기반 편집과 직접 JSON 편집 인터페이스 모두 제공
- **Toast 알림**: 사용자 행동에 대한 실시간 피드백
- **반응형 디자인**: DaisyUI 컴포넌트를 활용한 모바일 친화적 인터페이스

## 🚀 빠른 시작

### 필요 조건
- Node.js 18+
- Rust 1.60+
- Tauri CLI

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

## 💡 사용 방법

### 1. 프로젝트 디렉토리 선택
1. 앱을 실행하고 **Browse** 버튼을 클릭
2. MCP 설정을 적용할 프로젝트 폴더를 선택
3. 기존 `.mcp.json` 파일이 있으면 자동으로 로드

### 2. MCP 서버 설정
1. **Add Server** 버튼을 클릭하여 새 서버 설정 추가
2. **Form Editor**와 **JSON Editor** 탭 중 선택:
   - **Form Editor**: 사용자 친화적인 폼 인터페이스
   - **JSON Editor**: 고급 사용자를 위한 직접 JSON 편집
3. 서버 정보 입력:
   - **Server Name**: 서버의 고유 식별자
   - **Command**: 실행 명령어 (예: `npx`, `uvx`)
   - **Arguments**: 명령어 인자 (폼 모드에서는 한 줄당 하나씩)
   - **Environment Variables**: JSON 형식의 환경 변수

### 3. 설정 검증 및 저장
1. **Validate Configuration**으로 설정 유효성 확인
2. **Save .mcp.json** 버튼으로 설정 파일 생성
3. 서버가 설정되지 않은 경우 버튼이 **Clear .mcp.json**로 변경됨

### 4. 서버 라이브러리 관리
- 추가한 서버는 **Saved Servers** 목록에 자동 저장
- **Add to Current** 버튼으로 다른 프로젝트에서 서버 재사용 가능
- 전용 버튼으로 저장된 서버 편집 또는 삭제

## 📁 MCP 설정 파일 형식

생성되는 `.mcp.json` 파일의 예시:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🏗️ 기술 스택

- **Frontend**: TypeScript, Vanilla HTML/CSS, DaisyUI v4, Tailwind CSS v3
- **Backend**: Rust, Tauri
- **UI 프레임워크**: 반응형 디자인을 위한 DaisyUI
- **알림 시스템**: 커스텀 Toast 알림 시스템
- **데이터 저장**: JSON 파일 (로컬 앱 데이터)

## 📂 프로젝트 구조

```
mcp-server-config-app/
├── src/                    # Frontend 소스
│   ├── main.ts            # 메인 TypeScript 애플리케이션
│   ├── toast.ts           # Toast 알림 시스템
│   └── styles.css         # Tailwind CSS 및 커스텀 스타일
├── src-tauri/             # Tauri 백엔드
│   ├── src/
│   │   ├── lib.rs         # 메인 Rust 로직
│   │   └── main.rs        # 진입점
│   ├── Cargo.toml         # Rust 의존성
│   └── tauri.conf.json    # Tauri 설정
├── index.html             # 메인 HTML 파일
├── tailwind.config.js     # Tailwind CSS 설정
├── postcss.config.js      # PostCSS 설정
└── package.json           # Node.js 의존성
```

## 🎨 사용자 인터페이스

### 메인 화면
- **Project Directory**: 현재 선택된 프로젝트 경로 표시
- **MCP Servers**: 현재 프로젝트의 서버 목록 (편집/삭제 가능)
- **Saved Servers**: 저장된 서버 라이브러리 (프로젝트 간 재사용 가능)
- **Action Buttons**: 설정 검증 및 저장/비우기 작업

### 서버 추가/편집 모달
- **탭 인터페이스**: Form Editor와 JSON Editor 간 전환
- **Form Editor**: 검증 기능이 있는 사용자 친화적 입력 필드
- **JSON Editor**: 문법 강조 및 검증 기능이 있는 직접 JSON 편집
- **양방향 동기화**: 폼과 JSON 뷰 간 자동 동기화

### 고급 기능
- **테마 전환**: 다양한 DaisyUI 테마 (Light, Dark, Cupcake, Emerald)
- **반응형 디자인**: 데스크톱과 모바일 디바이스에 최적화
- **Toast 알림**: 성공, 오류, 경고, 정보 메시지
- **실시간 검증**: 설정 오류에 대한 즉각적인 피드백

## 🔧 개발 가이드

### 의존성 추가
```bash
# Frontend 의존성
npm install <package-name>

# Tauri 플러그인
cargo add <crate-name> --manifest-path src-tauri/Cargo.toml
```

### 빌드 설정
- **개발**: `npm run tauri dev`
- **프로덕션 빌드**: `npm run tauri build`
- **타입 체킹**: `npm run build` (TypeScript 컴파일)

### CI/CD
이 프로젝트는 자동화된 빌드를 위한 GitHub Actions 워크플로우를 포함합니다:
- **멀티플랫폼 빌드**: Windows, macOS (Universal), Linux 지원
- **자동 릴리스**: 버전 태그에 대한 드래프트 릴리스 생성
- **코드 품질 검사**: TypeScript 컴파일 및 린팅

### UI 개발
- **스타일링**: Tailwind CSS 유틸리티와 함께 DaisyUI 컴포넌트 사용
- **반응형성**: 반응형 브레이크포인트를 활용한 모바일 우선 접근법
- **Toast 시스템**: 앱 전반에 걸친 일관된 알림 패턴

## 📖 참고 자료

- [MCP Protocol 문서](https://modelcontextprotocol.io/docs)
- [Claude Code MCP 설정 가이드](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Tauri 공식 문서](https://tauri.app/v1/guides/)
- [DaisyUI 컴포넌트 라이브러리](https://daisyui.com/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

## 🤝 기여하기

1. 이 저장소를 Fork
2. 기능 브랜치 생성 (`git checkout -b feature/새기능`)
3. 변경사항 커밋 (`git commit -am '새 기능 추가'`)
4. 브랜치에 Push (`git push origin feature/새기능`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🐛 버그 신고

버그나 기능 요청은 [GitHub Issues](https://github.com/your-username/mcp-server-config-app/issues)에 등록해 주세요.