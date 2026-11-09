# 최종 소프트웨어 검증 · 2026-11-09

`npm run check` 최종 실행은 **exit 0**이다. 실제 기기의 update entry, flash write, erase, restore는 실행하지 않았다.

| 검사 | 결과 |
| --- | --- |
| Vitest 7개 파일 | **42개 통과**, 41.64초 |
| TypeScript strict + Vite production + PWA 생성 | 통과 |
| Playwright / Windows Edge 157.0.4341.42 | 13개 통과 |
| Playwright / Windows Chrome 157.0.8103.38 | 13개 통과 |
| 브라우저 합계 | **26개 통과**, 15.7초 |
| Python 고정 recipe / bundle syntax | `py_compile` 통과 |
| SLOOP Pro 고정 소스 SMK37 Pro 빌드 | 실제 빌드·CRC·모델·영역 검사 통과 |
| 원본 FM-1 전후 app / package / loader | 세 파일 모두 byte-identical |
| 원본 전체 host suite | 전후 모두 **실패(exit 1)**, 아래 참조 |

## 실제로 시험한 경계

- 공개 Frodhes SMK 0.9.2와 SLOOP Pro 2.8.4의 **전체 logical image**를 mock 기기가 요청한 주소/크기대로 보내고 모든 바이트를 비교. 두 번의 재열거와 최종 identity까지 확인했다.
- 같은 wire mock에서 loader 재개, 끊김, timeout, 잘못된 주소, 다른 반환 identity가 완료로 기록되지 않음을 확인했다. 모의 기기는 메모리에만 존재하며 실제 MIDI 포트를 열지 않는다.
- 실제 패키지 hash/크기/identity/CRC, FM-1 파일의 SMK 헤더 위장과 실제 region table mismatch를 거절했다.
- 알려지지 않은 family, 구형 순정, 독자 형식, 지원하지 않는 loader, 모델 불일치와 누락 identity를 거절했다.
- 준비 중에는 전송을 시작하지 않고 최종 클릭에서 다시 식별. 파일 snapshot, 이중 클릭/준비/닫기 경쟁 차단, journal 저장 실패 시 쓰기 진입 차단을 확인했다.
- 재개는 같은 SHA·artifact·모델의 최근 중단 이력이 필요하며, 이후 외부 설치기 열기는 재개 근거를 무효화한다.
- 선택한 MIDI 쌍 이외에는 probe하지 않으며, 재연결 선택이 timeout 후 늦게 끝나도 세션을 다시 열지 않는다. 다른 모델 선택 시 쓰기 전에 차단한다.
- 실제 브라우저에서 모의 MIDIAccess로 지연된 포트 목록 갱신과 두 탭의 Web Lock 배제를 확인했다. 브라우저의 실제 장치 권한은 요청하지 않았다.
- 카탈로그 schema/원본·포트 버전 분리, 즐겨찾기 재시작, 백업 family/version/schema/해시, 외부 이동의 미완료 이력, 실제 재현 빌드 번들의 build-only 유지, Pro recipe의 target 제한을 확인했다.
- 360px/390px 모바일 폭의 가로 넘침과 설치 대화상자, offline app shell/명시적 패키지 보관, IndexedDB bytes 손상 후 재검증 거절을 확인했다.

Service worker는 build별 shell을 사용하며 `skipWaiting`, 강제 새로고침, 자동 firmware 다운로드를 제공하지 않는다. 기존 탭이 닫히기 전 새 worker로 강제 전환하는 경로가 없는 것을 코드 검토했다. 실제 USB 전송 중 worker 업데이트 상황은 실기 미검증이다.

## 빌드 증거와 기존 실패

[빌드 보고서](build-report.md)에 toolchain/SDK/source pin, 파일 SHA, 원시 로그 경로와 전후 host 비교를 남겼다. 로컬 package는 651224 bytes / `76d4f4f6b98052165c01900ac6124b6e5e4651f9102e832badc0e963ad32906b`다. 공개 release package와 같은 SHA라고 주장하지 않는다.

원본 전체 host suite는 baseline 728.5초, after 736.0초로 모두 exit 1이다. static target budget 초과, TSan runtime mapping 오류, 시스템 Node18 제약을 보존했다. 전후 비교에서 새 실패 diagnostic은 없지만 전체 suite를 통과로 계산하지 않는다. Node24로 별도 실행한 upstream protocol/Pro installer/PWA 시험 세 개는 통과했다. WASM audio preview와 공식 stock fixture가 없어 skip된 시험도 통과 수에 넣지 않았다.

앱 빌드에는 Lucide의 `use client` 지시문 관련 경고 2개가 남는다. 이 앱은 전체 client SPA이며 production UI 시험을 통과했다. 경고를 숨기는 설정은 추가하지 않았다. Playwright의 NO_COLOR/FORCE_COLOR 경고는 로그 색상 설정이며 시험 실패가 아니다.

## 검토와 남은 범위

독립 설치 경로 검토에서 발견한 탭 간 동시 연결, 동일 loader의 파일 구분, 늦은 포트 선택, Pro recipe target 오류를 수정하고 회귀시험을 추가했다. 최종 재검토에 남은 critical/important 코드 지적은 없었다. 이것은 하드웨어 안전 인증이 아니다.

아직 하지 않은 작업: 실제 Pro/Elite/MKE 쓰기·왕복 전환·복구, 음색/패널/휠/페달/오디오/저장, 공장 보정값 보존, Galaxy USB 권한·재열거·화면 잠금. 신규 FM-1 포트와 새 입력 매핑도 구현하지 않았다. 해당 작업은 [사용자 실기 체크리스트](hardware-checklist.md)와 별도 포팅 명세로 이어진다.

## UI 개선 후 최종 재검증

Stageshow·unslop 참고 개선 후 위 표의 42개 단위 시험·26개 브라우저 시험과 production 빌드를 모두 다시 통과했다. 추가한 10개 브라우저 시험은 검색·필터 초기화, 모델 변경 시 백업 확인값 초기화, 키보드 초점 복귀, 320–1280px 화면, 설치 첫 작업 및 미검증 표시, 좁은 오프라인 헤더를 검증한다. 이번 UI 작업에서 펌웨어를 다시 빌드하거나 실제 기기에 기록하지 않았다. 기존 펌웨어 빌드 증거와 원본 host 실패는 그대로다.

변경 근거와 전후 비교는 [UI 개선 기록](ui-redesign.md)에 있다. 최종 화면 증거는 로컬 `output/playwright/redesign/final/`, 전후 비교 HTML은 `output/playwright/redesign/report.html`, Playwright 보고서는 `playwright-report/index.html`에 있다. 임시 화면과 바이너리·개인 데이터 경로는 Git에서 제외된다.
