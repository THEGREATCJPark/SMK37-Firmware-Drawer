# 구현 판단 · 2026-11-09

## 선택

독립적인 Vite + React + TypeScript 개인용 UI와 검토된 JSON 카탈로그를 만든다. 기존 사이트 전체를 개조하면 개인 파일·이력·포팅 대기와 사이트 배포 코드가 얽히므로, 설치 프로토콜 모듈만 재사용한다. 서버·로그인·원격 업로드는 없다.

설치 모듈: `isod89/sloop-pro/web/fm1ota.js`, `web/fm1pkg.js`, 커밋 `701844ba0103c434b4fe4467373857b794487b51`. GPL-3.0-only, 원저자와 genkigenki/isod89 고지 보존. 통합 사이트 `genkigenki/smk37` 커밋 `f41582ee99fad7f9eb32c3f6401548ac5fc9aec3`의 실제 inline 설치 코드와 비교했다. SLOOP Pro 버전에는 패키지의 실제 flash region table을 읽는 board 검사와 재연결 검증을 포함한 resume API가 추가돼 있다.

기존 보호: `OTHER_SMK`의 독자 업데이트 형식 차단, 순정 V016 이전 차단, `OUR_LOADER` 제한, 정상·재개 모델 검사, 요청 주소/크기 제한, 모든 대기 deadline, 기록 후 재연결 identity 검사. 앱은 선택한 MIDI 포트만 탐색하고, 정확한 모델·출발 identity·파일 SHA-256을 추가로 대조한다. 일반 설치에서 모델 우회·force·순정 자동 복구는 제공하지 않는다.

직접 어댑터는 SLOOP Pro 2.8.4와 Frodhes SMK 포트 0.9.2의 실제 공개 파일을 SHA-256으로 고정했다. 두 Pro 패키지를 전체 이미지 wire mock으로 검사했다. Elite/MKE는 모델별 공개 아티팩트·해시와 소스 근거로 분리했다. 라이선스 조건에 따라 바이너리는 앱에 동봉하지 않는다. 나머지는 개발자 설치기를 제공한다. +VA는 Baud Girl의 설치기·Device Manager로 연결하고 앱 MIDI 세션을 먼저 해제한다. 외부 페이지 열기는 성공으로 기록하지 않는다.

## 기기 없는 검증

가능: 실제 fwsc의 identity/CRC/region table/hash 검사, 잘못된 모델·손상 파일·알 수 없는 loader·오래된 순정 차단, Mock MIDI 정상 전송·재개·끊김·무응답·재열거, 이중 실행 제한, 파일 보관/import, PWA 오프라인, 데스크톱/모바일 UI, 기존 BOARD=smk37 소스 빌드.

미확인: 실제 SMK37 Pro 쓰기·재연결, 음색·패널·저장·오디오, Windows Chrome/Edge USB 조합, Galaxy Chrome USB와 화면 잠금. 화면 에뮬레이션은 Android USB 검증이 아니다. 모든 실제 쓰기는 사용자가 최종 설치 버튼으로만 시작한다.

포팅 가이드 `genkigenki/fm1-to-smk37` `54252ffa2219e3c9cd7eb70f4e99b361eaa048e1`의 AGENTS와 docs/01,02,03,08을 참조한다. 새 매핑이나 신규 포트는 생성하지 않는다. 지원 대상 재빌드는 기존 매핑을 유지하며 결과를 개발 전용으로 격리한다.
