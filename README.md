[README_배포가이드.md](https://github.com/user-attachments/files/26622608/README_.md)
# 더샵플러스 대시보드 배포 가이드

이 구성은 **Google Apps Script + GitHub Pages** 조합만 사용합니다.

## 구조
- **Google Sheets**: 회원 데이터, 클릭 로그 저장
- **Google Apps Script 웹앱**: 시트 데이터를 JSONP로 반환하고 클릭 로그를 적재
- **GitHub Pages**: 회원이 접속하는 실제 대시보드 화면

## 1) 구글 시트 준비
새 구글 스프레드시트를 만들고 Apps Script를 연결합니다.

### Members 시트 헤더
`userKey | name | daysUsed | urgentLimit | gownLimit | urgent | waste | gown | pack | antiSubscribed | accessMethod | accessUpdatedAt`

### Logs 시트 헤더
`createdAt | userKey | serviceKey | eventType`

### 예시 데이터
Members
- `10000000 | 더샵약국 | 128 | 5 | 2 | 1 | 1 | 4 | 3 | N | 비밀번호 출입 | 2026-04-10 10:00:00`
- `10000710 | 테스트약국A | 80 | 5 | 2 | 2 | 3 | 2 | 0 | Y | 비밀번호 출입 | 2026-04-10 10:00:00`

Logs
- `2026-04-10 10:01:00 | 10000000 | urgent | detail_click`
- `2026-04-10 10:02:00 | 10000000 | gown | detail_click`

원하면 `Code.gs` 안의 `setupSampleSheets()`를 1회 실행해서 샘플 시트를 자동 생성해도 됩니다.

## 2) Apps Script 배포
1. 구글 시트에서 **확장 프로그램 > Apps Script** 이동
2. `/mnt/data/Code.gs` 내용을 붙여넣기
3. 저장
4. `setupSampleSheets()`를 한 번 실행해서 시트 생성 여부 확인
5. 우측 상단 **배포 > 새 배포**
6. 유형: **웹 앱**
7. 실행 사용자: **나**
8. 액세스 권한: **모든 사용자**
9. 배포 후 **웹 앱 URL** 복사

## 3) GitHub Pages 파일 수정
1. `/mnt/data/theshopplus_dashboard_github_pages.html` 파일 열기
2. `CONFIG.GAS_URL` 값을 방금 복사한 웹 앱 URL로 교체

예시
```js
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec',
  DEFAULT_USER_KEY: '10000000',
  SOON_MESSAGE: '추후 반영 예정이니 조금만 기다려주세요.'
};
```

## 4) GitHub Pages 배포
GitHub Pages는 정적 HTML/CSS/JS 파일을 바로 배포할 수 있습니다. citeturn528210search2turn528210search0

1. 새 GitHub 저장소 생성
2. `index.html` 이름으로 HTML 파일 업로드
   - 업로드할 파일: `theshopplus_dashboard_github_pages.html`
   - GitHub에는 파일명을 **index.html** 로 올리기
3. 빈 파일 `.nojekyll` 추가
4. 저장소 **Settings > Pages** 이동
5. Source를 **Deploy from a branch** 로 선택
6. Branch는 `main`, Folder는 `/root` 선택
7. 저장 후 배포 URL 확인

GitHub Pages는 `github.io` 도메인에서 HTTPS를 기본 지원합니다. citeturn528210search8

## 5) 회원별 URL 사용 방식
이 페이지는 쿼리스트링으로 회원을 구분합니다.

예시
- `https://계정명.github.io/저장소명/?userKey=10000000`
- `https://계정명.github.io/저장소명/?userKey=10000710`

즉, 회원별로 다른 URL을 전달하면 각자 자기 데이터만 보이게 만들 수 있습니다.

## 6) 이 구조에서 실제로 되는 것
- 구글 시트에 회원 데이터 저장
- 버튼 클릭 시 Logs 시트에 누적 저장
- 새로고침 없이 다시 읽어서 누적 클릭 수 즉시 반영
- GitHub Pages URL로 누구나 접속 가능

## 7) 반드시 알아야 하는 제한
이 방식은 **로그인 기능이 없는 공개 URL** 구조입니다.
즉, `userKey`를 바꾸면 다른 회원 데이터를 볼 수 있습니다.
그래서 아래 중 하나로 운영하는 게 맞습니다.

- 민감정보 없는 데모/운영관리용으로만 사용
- 회원명 대신 익명 ID만 사용
- URL을 회원별로 개별 발송하고 외부 공유 금지 안내

정말 회원 인증까지 하려면 GitHub Pages 단독으로는 부족하고, 로그인 서버나 Firebase/Auth 같은 별도 인증 계층이 필요합니다.

## 8) 왜 이 구조가 맞는지
- GitHub Pages는 HTML/JS 배포에 적합한 정적 호스팅입니다. citeturn528210search2turn528210search1
- Apps Script 웹앱은 구글 시트와 바로 연결되어 데이터 읽기/쓰기 구현이 빠릅니다.
- 그래서 **관리자는 시트에 입력하고**, **회원은 URL로 접속해서 보고**, **버튼 클릭 데이터는 시트에 계속 쌓이는** 구조를 가장 빠르게 만들 수 있습니다.
