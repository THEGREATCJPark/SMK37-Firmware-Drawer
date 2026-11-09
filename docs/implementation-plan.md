# SMK37 개인용 펌웨어 서랍 구현 계획

실행 지시서: 사용자가 제공한 SMK37_Desktop_Codex_Prompt.md. 사용자가 합리적 구조 결정을 위임하고 추가 확인 없이 진행하도록 명시했다. 이 문서는 실행 기록이며 별도 승인을 요구하지 않는다.

구조: Vite/React/TypeScript, Zod 런타임 검증, IndexedDB, 로컬 PWA. GPL 설치 라이브러리는 `src/vendor/`, 앱의 검증·정책·상태 머신은 `src/install/`로 분리한다.

## 1. 작동하는 서랍

- [x] `src/catalog/{schema.ts,catalog.json,index.ts}`: 제품·모델별 아티팩트, 출처·버전·근거·제한을 분리. 잘못된 대상과 중복 ID를 테스트.
- [x] `src/App.tsx`, `src/components/`, `src/styles.css`: 한국어 카드, 검색, 즐겨찾기, 상세와 외부 설치.
- [x] build + 데스크톱/모바일 UI 점검 후 첫 체크포인트 저장.

## 2. 고정 패키지 설치

- [x] `src/install/package.ts`: 실제 fixture로 hash/CRC/구조/model/region table 검증. 실패 테스트 먼저.
- [x] `src/install/policy.ts`: exact target, known starting identity, unsupported family/loader, old-stock 차단. 정상·재개 동일 검사.
- [x] `src/install/{transport.ts,controller.ts}`: 재사용 Updater를 선택 포트에 한정. 파일은 복사 후 검증하고 snapshot 고정. 사용자 최종 클릭만 쓰기를 허용.
- [x] MockTransport: 바이트 요청과 응답, 중복 실행, 무응답, 끊김, 재개, 완료 identity 불일치 테스트. 전송 완료만 성공 처리하지 않는다.
- [x] 최종 설치 경로와 회귀시험을 로컬 체크포인트로 저장.

## 3. 보관·포팅·PWA

- [x] `src/storage/`: IndexedDB 파일 보관과 SHA 검증, family/version/schema 일치, 전체 덤프/프로젝트/설치 패키지 분류, 내보내기.
- [x] `src/porting/`: JSON 작업 명세, pinned source recipe, metadata+base64 package bundle. build-only는 일반 설치로 승격 불가.
- [x] `scripts/build-sw.mjs → dist/sw.js`: 버전별 app shell, 설치 중 자동 새로고침 없음. firmware는 명시적 파일 보관으로만 캐시.
- [x] 기존 지원 프로젝트 재현 빌드, 검증 기록·환경·hash 및 가져오기 시험.
- [x] Playwright 데스크톱/모바일/오프라인, 전체 unit tests, production build, 제3자 고지와 사용자 체크리스트.

## 집중 검증

FM-1 헤더 위장, 저장소와 manifest mismatch, 설치 준비 후 장치 교체, 재열거 때 다른 MIDI 기기 선택, 새로고침 후 중단 상태, 외부 설치 가짜 성공, 사용자 backup가 실제 전체 덤프인 것처럼 보이는 경우를 차단한다. 공개/빌드/실기 증거를 독립적으로 기록한다.
