# AI·디지털 학습 자료실

패들렛 JSON에서 추출한 섹션 10개, 게시물 46개를 활용하는 React + Vite 정적 웹사이트입니다.

## 실행 (Windows)
1. Node.js LTS 설치: https://nodejs.org/
2. 프로젝트 폴더에서 `npm install`
3. `npm run dev`
4. 터미널에 표시되는 로컬 주소로 접속

## GitHub Pages 배포
1. GitHub 저장소에 프로젝트 파일 업로드
2. `npm install` → `npm run build`
3. `dist/` 폴더 내용을 GitHub Pages 게시 위치에 배포
4. GitHub Actions로 배포하는 경우 Pages 설정에서 Source를 GitHub Actions로 선택하고 `npm run build` 산출물 `dist/`를 배포

`vite.config.js`의 `base: './'`는 프로젝트 저장소 하위 경로에서도 상대 경로로 동작하도록 설정했습니다.

## 자료 업데이트
`public/padlet-data.json` 파일의 `sections`와 `posts`를 수정한 뒤 재배포하세요. API 키는 필요하지 않습니다.
최초 자료는 2026-10-12에 저장된 Padlet API 응답(`padlet.json`)에서 추출했습니다. 웹페이지에서 자동으로 Padlet API를 호출하지 않습니다.

## 데이터 필드
- `sections`: `id`, `title`, `order`
- `posts`: `id`, `sectionId`, `title`, `description`, `url`, `padletUrl`, `sortIndex`

## 주의
- 게시물의 첨부 링크가 없으면 패들렛 원본 게시물로 연결됩니다.
- 제목이 없는 게시물은 첨부 URL의 도메인을 제목으로 표시합니다.
- API 원본에 일부 한글이 깨져 있어 UTF-8로 복구했습니다.
- 원본 자료 중 게시물 자체가 없는 섹션도 필터에 표시됩니다.

## 관리자 화면 (추가 기능)

사이트를 실행한 뒤 페이지 하단의 **관리자 관리**를 누르거나 주소 끝에 `#admin`을 붙여 접속합니다.

### 자료 편집
- **게시물 추가**: 제목, 섹션, 설명, 첨부 URL, 패들렛 원본 URL을 입력합니다.
- **게시물 수정/삭제**: 표의 연필/휴지통 아이콘을 사용합니다.
- **섹션 추가/수정/삭제**: 왼쪽 섹션 관리에서 작업합니다. 게시물이 남아 있는 섹션은 삭제할 수 없습니다.
- **JSON 가져오기**: 같은 구조(`boardTitle`, `sections`, `posts`)의 JSON 파일을 불러옵니다.
- **JSON 다운로드**: 편집한 데이터를 `padlet-data.json`으로 저장합니다. 프로젝트의 `public/padlet-data.json`과 교체한 뒤 다시 빌드/배포할 수 있습니다.

편집 중 데이터는 현재 브라우저의 `localStorage`에 **임시 저장**됩니다. 다른 PC/브라우저와 자동 동기화되지 않습니다. 공용 PC에서는 관리 기능을 사용하지 않는 것이 좋습니다.

### GitHub에 직접 게시
1. GitHub에서 **Fine-grained personal access token**을 생성합니다. **본인이 관리하는 해당 저장소만** 대상으로 지정하고, Repository permissions > Contents > **Read and write**를 부여합니다.
2. 관리자 화면 하단에 사용자/조직, 저장소 이름, 브랜치(보통 `main`), 파일 경로(보통 `public/padlet-data.json`), 토큰을 입력합니다.
3. **GitHub에 게시** 버튼을 누르면 GitHub Contents API로 JSON 파일에 커밋을 생성합니다.
4. GitHub Pages를 GitHub Actions 빌드로 배포하도록 설정했다면 해당 워크플로가 실행된 후 공개 사이트에 반영됩니다. GitHub Pages가 `dist`를 별도로 배포하는 구조라면 커밋만으로는 반영되지 않을 수 있습니다.

토큰은 저장하지 않고 입력된 화면에서만 사용합니다. 토큰을 코드/JSON/저장소에 포함하지 마세요. GitHub 사용자/저장소/브랜치/경로 설정만 브라우저에 저장됩니다.

### 관리자 보안 한계 (필독)
이 기능은 **진짜 관리자 인증/접근 통제 시스템이 아닙니다**. 누구나 `#admin` 화면을 열어 자기 브라우저의 로컬 초안을 편집하거나 JSON을 다운로드할 수 있습니다. 그러나 GitHub 저장소에 실제로 쓰려면 저장소에 대한 권한이 있는 토큰이 필요합니다. 관리 화면 자체를 비공개로 만들려면 Cloudflare Access와 별도 인증된 API, 또는 관리 화면을 별도 도메인/배포로 분리하는 구성이 필요합니다. 비밀번호를 프런트엔드 코드에 하드코딩하는 방식은 사용하지 마세요.

### 검증 상태
정적 파일과 데이터 구조를 확인했습니다. 이 환경에서 npm 의존성 설치가 시간 초과되어 React/Vite 빌드 및 GitHub 게시 동작은 실제 실행 검증을 완료하지 못했습니다.
