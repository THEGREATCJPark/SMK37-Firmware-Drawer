# 기존 SLOOP Pro SMK37 target 재현 빌드

확인일: 2026-11-09. 이 작업은 이미 있는 `BOARD=smk37 MODEL=pro` target을 빌드한다. 신규 FM-1 포팅, 패널 매핑 변경, 장치 설치 작업은 포함하지 않는다. 펌웨어 소스는 수정하지 않았다. 결과물은 개인 로컬 파일이며 앱의 일반 설치 카탈로그로 자동 승격되지 않는다.

## 고정한 출처

| 구성요소 | 고정 값 |
| --- | --- |
| SLOOP Pro | [isod89/sloop-pro v2.8.4](https://github.com/isod89/sloop-pro/releases/tag/v2.8.4), `701844ba0103c434b4fe4467373857b794487b51` |
| 포팅 가이드 | [genkigenki/fm1-to-smk37](https://github.com/genkigenki/fm1-to-smk37/tree/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1), `54252ffa2219e3c9cd7eb70f4e99b361eaa048e1` |
| JieLi toolchain | `jieli-linux-toolchains-20260730.1.tar.xz`, clang `4.0.1`, Linux x86-64 |
| toolchain 다운로드 | [고정 archive URL](https://jl-update.oss-cn-shenzhen.aliyuncs.com/jieli-linux-toolchains-20260730.1.tar.xz), 26,027,508 bytes |
| toolchain SHA-256 | `a1545cddbc451a06bac43eb5cd96d831470c42a97c5c0b1f98879a20fc7647bd` |
| AC79 SDK | [JieLi AC79 SDK](https://gitee.com/Jieli-Tech/fw-AC79_AIoT_SDK), tag `AC79NN_SDK_V1.2.1_2023-12-13`, commit `d179b4484759423312073f5fbb232501aa491047` |
| SDK annotated tag object | `b02c8c9354c077238ccbf764e36eff53782e1c16` |
| 빌드 host | Ubuntu 24.04 / WSL2, kernel `6.18.33.2-microsoft-standard-WSL2`, Python `3.12.3`, Pillow `10.2.0` + raqm |
| host 시험 도구 | GCC `13.3.0`, Git `2.43.0`, `/usr/bin/node` `18.19.1` |
| 추가 웹 시험 | Node `24.20.0`, Playwright `1.65.0`, Chromium `158.0.8127.18` (revision `1254`) |

가이드 `AGENTS.md`, `docs/01-hardware.md`, `02-update-and-recovery.md`, `03-porting-steps.md`, `08-pitfalls.md`와 실제 `build.sh`, `tools/build.py`, `tools/build_pro.sh`, 패키지 생성 코드, host test runner를 읽었다. 고정 recipe는 설치 BAT, USB/COM/MIDI backend, UBOOT 또는 flash CLI entry point를 호출하지 않는다. upstream installer 시험은 가짜 장치를 사용하는 host test다.

SDK 전체의 도구를 실행하지 않고 필요한 세 파일만 고정 commit에서 내려받았다. 다음 해시는 upstream `tools/build.py`가 명시한 값과 일치한다. recipe는 경고만 출력하는 upstream 동작보다 앞서 불일치를 오류로 처리한다.

| SDK 파일 | SHA-256 |
| --- | --- |
| `cpu/wl82/tools/uboot.boot` | `4e3b4c220dc96641cb5a723f41e68ce41d5261ae9434bb33fbd7f2c59976ded4` |
| `cpu/wl82/tools/cfg_tool.bin` | `276579954f076886a6a7694f65dc71c034a63a2c204b76749065c0ac7b010d1b` |
| `cpu/wl82/tools/cfg/eq_cfg_hw.bin` | `41167491bffed4651750719c973d2758adeb9021a5670d02d6a53c85ed80ea7d` |

## 공개 배포본과 로컬 빌드 구분

[공개 Pro 2.8.4 패키지](https://github.com/isod89/sloop-pro/releases/download/v2.8.4/sloop-pro-2.8.4.fwsc)는 2026-10-30 배포본이다. 651,224 bytes이며 직접 내려받은 파일의 SHA-256은 GitHub release metadata의 `7c18163fd2088663ff057b729419e4ff3b08ceb77ad72072fced3c26a8aeb80a`와 일치했다. 파일에 들어 있는 모델 identity는 `SMK-37 Pro_900`이다. `2.8.4`라는 제품 버전과 `900`이라는 프로토콜 identity는 별개의 정보다.

공개 원본은 `.build/published/sloop-pro-2.8.4.fwsc`, release metadata는 같은 디렉터리의 `release-v2.8.4.json`에만 보관한다. 로컬 재빌드 파일은 그 원본을 덮어쓰지 않는다. upstream 화면에는 `__DATE__`가 들어가므로 다른 날짜의 배포본과 byte identity를 주장하지 않는다. 이번 비교는 같은 날 같은 commit과 도구로 만든 FM-1 app/package/loader의 전후 비교다. `SOURCE_DATE_EPOCH`나 새 compiler flag로 날짜를 강제로 바꾸지 않았다.

## 다시 실행하기

Windows PowerShell에서 앱 디렉터리를 현재 폴더로 연 경우:

```powershell
pwsh -File scripts/firmware/build.ps1 -Action all
pwsh -File scripts/firmware/build.ps1 -Action bundle
```

이 wrapper는 현재 설치된 `Ubuntu-24.04`에 고정되어 있고 실행 정책이나 WSL 구성을 변경하지 않는다. 다른 배포판에서는 아래 Linux 명령을 그 배포판 안에서 직접 실행한다.

Windows에서 WSL 터미널을 열고 이 앱 디렉터리로 이동한 다음 실행한다. WSL 설정, USB passthrough, 시스템 패키지, 다른 저장소는 변경할 필요가 없다. Python 3.12.3, Pillow 10.2.0+raqm, GCC, Git, Node가 있는 Linux x86-64 환경이 필요하다. recipe가 버전 조건을 만족하지 않으면 중단하며 시스템 환경을 자동 변경하지 않는다.

```sh
python3 scripts/firmware/build.py all
python3 scripts/firmware/bundle.py
```

`all`은 준비 → FM-1 기준 빌드 → 기준 host suite → SMK37 Pro 빌드 → 실제 SMK 패키지 검사 → FM-1 재빌드 → 해시 비교 → host suite → Node 24 웹/PWA 시험 순서다. host suite가 실패하면 로그를 남기고 `all` 마지막에 실패 exit code를 반환한다. 빌드나 패키지 검사는 실패 즉시 멈춘다. 실패한 시험을 통과로 바꾸거나 test golden 값을 갱신하지 않는다.

개별 단계도 고정 목록으로만 실행할 수 있다.

```sh
python3 scripts/firmware/build.py prepare
python3 scripts/firmware/build.py fm1-before
python3 scripts/firmware/build.py tests-before
python3 scripts/firmware/build.py smk37-pro
python3 scripts/firmware/build.py check-smk
python3 scripts/firmware/build.py fm1-after
python3 scripts/firmware/build.py compare
python3 scripts/firmware/build.py tests-after
python3 scripts/firmware/build.py compare-tests
python3 scripts/firmware/build.py web-tests
python3 scripts/firmware/build.py pwa-test
python3 scripts/firmware/bundle.py
```

임의 저장소 URL, 추가 shell command, flash command를 받는 CLI 옵션이나 서버는 없다. source clone은 `core.autocrlf=false`로 고정하고 빌드 전후 commit/변경 여부를 검사한다. `BOARD`, `MODEL`, compiler feature/test override 환경변수는 외부에서 주입되지 않도록 정리한다. upstream Pro와 동일하게 `FELUCCA_SLICE=0`을 사용한다. `--release 2.8.4`는 upstream parser가 지원하지 않으므로 사용하지 않는다. 소스 자체의 `SLOOP PRO 2.8.4` 표시와 기본 `SMK-37 Pro_900` identity를 유지한다.

고정 파일은 `scripts/firmware/recipe.lock.json`, 실행 코드와 bundle 생성 코드는 같은 디렉터리에 있다. 의존성은 `.build/deps`, clean source/전체 명령 로그/환경/전후 해시는 `.build/firmware/sloop-pro-2.8.4-smk37-pro/`에 있다. WSL `/tmp`는 이 환경에서 재시작 후 사라질 수 있어 영구 결과 경로로 쓰지 않는다.

upstream의 두 board는 같은 중간 파일명을 쓰므로 recipe는 같은 commit의 `source`(FM-1 기준)와 `source-smk37`(SMK37 → FM-1 재빌드)를 분리한다. 긴 기준 host suite가 SMK 중간 파일을 잘못 읽는 일을 막고, 최종 시험은 두 번째 tree의 FM-1 재빌드 후 실행한다.

## 저장 영역과 기존 입력 매핑

기존 [SLOOP-PRO.md](https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/SLOOP-PRO.md)의 패널 매핑을 그대로 쓴다. 새로운 키/패드/휠 역할을 정하거나 신규 포팅의 승인 절차를 대신하지 않는다. 소스의 `fm1_flash_map.h` allow-list, `_Static_assert`, RAM driver의 두 번째 보호 조건을 유지한다.

| 저장 객체 | SMK37 주소 |
| --- | --- |
| `OBJ_PROJECT0 + 0..3` | A/B 4쌍, `0x9D000–0xA4FFF` |
| `OBJ_UPRESET0 + 0..1` | A/B 2쌍, `0xA5000–0xA8FFF` |
| `OBJ_AUTOSAVE` | `0xA9000` / `0xAA000` |
| `OBJ_FM6BANK` | `0xAB000` / `0xAC000` |
| `OBJ_SETTINGS` | `0xAD000` / `0xAE000` |
| owner tag `SMK37DATA` + `SLOOP` | `0xAF000` |
| `OBJ_WCAL` | `0xB1000` / `0xB2000` |
| `OBJ_DAW` | `0xB3000` / `0xB4000` |
| `OBJ_SMKSET` | `0xB5000` / `0xB6000` |
| 업데이트 staging/record | `0xBB000–0xBFFFF` |
| 사용자 sample USR1..4 | 각 40 KiB: `0xC2000`, `0xCC000`, `0xD6000`, `0xE0000`; 끝 `0xE9FFF` |
| 기존 stock mapping 종료 marker | upstream에서 `0xEA000–0xEAFFF` 한 sector만 허용; 첫 sample 쓰기 전 marker 제거 |

보호 범위는 `0x00000–0x03FFF`, `0xC0000–0xC1FFF`, `0xF4000–0xFDFFF`, `0xFF000–0xFFFFF`다. 기존 loader의 app 쓰기 범위는 `0x04000–0x9CFFF`이며 record 정리는 VM 아래로 제한된다. 이 소스 검토와 host 검사는 실기 플래시 무결성이나 모든 사용자 작업물 보존을 보증하지 않는다. 다른 데이터 family의 store는 첫 부팅에 초기화될 수 있고 sample 영역은 순정 MIDI mapping과 겹친다.

## 검증 결과

SMK37 Pro 빌드는 8.0초에 완료됐다. app 크기는 601,512 bytes로 `0x97400`(619,520 bytes) slot 안에 들어가고, RAM `.data+.bss`는 63,948 / 98,304 bytes, pool은 335,756 / 344,064 bytes다. upstream 검사는 RAM flash 코드의 외부 호출, ROM reference, 영역 초과, pool headroom, HAL 외부 register 접근을 검사해 통과했다. 이것은 모든 위험한 실행 경로가 없다는 증명이 아니다.

실제로 만든 SMK 패키지 검사에서 identity `SMK-37 Pro_900`, interleave 20 blocks, CRC, PRCT `0x9D000`, stock v016 region table 일치를 확인했다. FM-1 기준과 후속 app/package/loader 세 파일은 모두 byte-identical이다.

| 결과 | 크기(bytes) | SHA-256 |
| --- | ---: | --- |
| SMK37 Pro `felucca.bin` | 601512 | `e3e73c7662a31a4b8da0a7c82511cac041ebb0272337db0b7309bd3306faa772` |
| SMK37 Pro `sloop-pro.fwsc` | 651224 | `76d4f4f6b98052165c01900ac6124b6e5e4651f9102e832badc0e963ad32906b` |
| SMK37 Pro `ota.bin` | 7108 | `fec87d4495dd32ef0fbe0b4904d71a81479981ef1f4c43db632196eca63b36e4` |
| FM-1 전/후 `felucca.bin` | 571776 | `ce153257ee32ff6de8f2bb5676bc93dc07d47eacc1b7f89070431ed2ab2913d2` |
| FM-1 전/후 `felucca.fwsc` | 610052 | `7b12e928ea33d16b8233ef4c3afcbe754aed1b1e7ce2bb4d1a4d33d9c36fea04` |
| FM-1 전/후 `ota.bin` | 6896 | `f5fc1c436655d2f1234ee096d333f17907b2ad38bb3ad20d526e5a4d71ebc197` |

원시 기록은 `.build/firmware/sloop-pro-2.8.4-smk37-pro/logs/*.log`, 각 명령의 종료 코드와 소요 시간은 같은 이름의 `.json`에 있다. `output/environment.json`, `output/fm1-comparison.json`, 각 build 디렉터리의 `hashes.json`도 남겼다. bundle은 `.build/firmware/sloop-pro-2.8.4/output/sloop-pro-2.8.4-local.drawer-bundle.json`이며 실제 패키지와 해시, 검사 결과, 기존 매핑 출처, 저장 영역 검토, 남은 실기 시험을 담는다.

전체 기준 host suite는 **exit 1**, 728.5초다. 다음 실패를 그대로 보존했다.

- ThreadSanitizer runtime의 `unexpected memory mapping`(core host double와 render-split TSan). 이 환경의 실행 실패이며 해당 검사 통과를 주장하지 않는다.
- static target-budget: `sample_render` 593/126(+371%), `grain_render` 2387/1734(+38%), `drums_mix` 6811/6153(+11%), `fm1_alnk0_irq` 268/174(+54%). 모두 upstream 기준의 허용치 +10%를 넘는다. 원인이나 실기 성능을 임의로 단정하지 않았다.
- 시스템 Node 18.19.1의 `CompressionStream('deflate-raw')` 미지원, Playwright의 Node >=20 요구 조건.

기준 suite의 182 golden renders는 0 changed/0 gone, health/voice-routing/crash failure 0이었다. SMK flash allow-list와 wrap/보호 경계/저장 객체 검사, OTA/loader host simulator, ASan+UBSan input fuzz, 10분 가상 soak, Python installer mock 검사는 통과했다. 시간으로 추정한 CPU budget 출력 중 upstream가 `a note, not a failure`라고 분류한 줄은 실패와 구분했다. golden이나 budget baseline은 수정하지 않았다.

Node 의존성 차이를 해결해 별도로 실행한 **원본 upstream 웹 시험**은 통과했다. 앱 자체의 Windows/Android 검증과는 별개의 증거다.

| 추가 검사 | 결과 |
| --- | --- |
| `web/test_web.mjs` | exit 0, 209.4초; editor/backup/package/설치·재개 protocol mock |
| `web/test_pro.mjs` | exit 0, 84.5초; 모델별 패키지, 재개, 잘못된 모델/family 거절, MIDI 포트 해제 mock |
| `tests/pwa_test.mjs` | exit 0, 5.9초; 실제 headless Chromium에서 offline installer/editor, manifest 설치 가능성, 캐시 및 새 버전 확인 |

추가 시험의 Node는 [공식 24.20.0 archive](https://nodejs.org/dist/v24.20.0/node-v24.20.0-linux-x64.tar.xz)를 [공식 checksum 목록](https://nodejs.org/dist/v24.20.0/SHASUMS256.txt)의 SHA-256 `2f2c0da162318f0de47665410c7c8c2ed3d36c8f3105de4bbc61176c70a7cbf2`로 검사했다. app의 lockfile에 설치된 Playwright 1.65.0을 사용하며, Chromium은 `.build/deps/playwright-browsers`에만 내려받았다. 부족했던 `libasound.so.2`는 Ubuntu `libasound2t64_1.2.11-1ubuntu0.3_amd64.deb`(SHA-256 `5d17bfb5683eb99f1be951fe48e1be5bf3c52391913b6b74a8aecf9b4f5e779f`)를 `.build/deps/pwa-linux-libs`에 풀어 해당 test process의 `LD_LIBRARY_PATH`로만 제공했다. `apt install`, WSL 설정 변경, 시스템 라이브러리 설치는 하지 않았다. 필요한 app 의존성은 먼저 앱에서 `npm ci`로 준비한다.

후속 전체 host suite도 **exit 1**, 736.0초다. static target-budget 네 항목의 수치가 기준과 같고, render-split TSan mapping 오류와 Node 18 제약도 그대로였다. 독립 core-host TSan은 후속 실행에서 통과했지만 기준에서는 runtime 오류였으므로 환경 안정성을 검증했다고 보지 않는다. 비교한 실패 diagnostic에는 새 항목이 없었다. 두 실행의 실패 집합은 이 한 항목이 사라져 완전히 같지는 않다. `output/host-comparison.json`은 주소가 매번 달라지는 TSan mapping을 정규화하고 upstream가 명시적으로 비실패라고 한 timing note를 분리한 결과다. 실패한 전체 suite를 통과로 간주하지 않는다.

Browser audio WASM preview는 이 빌드 대상에 포함하지 않았고 Emscripten/clang+wasm-ld가 없어 실행하지 않았다. 공식 stock 파일 fixture 시험은 `SMK_STOCK_DIR`을 제공하지 않았으므로 upstream가 건너뛴 항목을 실물 stock 바이너리 검증으로 계산하지 않는다. Elite/MKE firmware의 새 바이너리는 만들지 않았으며 모델별 mock test가 이들 모델의 실기 검증을 대신하지 않는다.

## 라이선스와 실기 남은 작업

[upstream LICENSING.md](https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/LICENSING.md)는 코드 GPL-3.0-only와 별도 자산을 구분한다. icon atlas/panel image/일부 Hügelton sample은 권리 유보다. `FELUCCA_SLICE=0`은 upstream Pro처럼 Hügelton demo loop를 빼지만 모든 자산 재배포 권한을 뜻하지 않는다. SDK 세 파일은 Apache-2.0, Terminus font는 OFL-1.1, 명시된 sample은 CC0이며 기존 고지를 보존한다. `.build`의 도구·바이너리·bundle은 공개 앱의 배포 자산에 포함하지 않는다.

장치 포트나 실제 firmware update entry/erase/write/restore는 실행하지 않았다. 사용자가 보관한 전체 백업과 돌아갈 경로, 정확한 실물 identity/현재 family, 설치 후 재연결, 키·패드·휠·노브·페이더·페달, 오디오, 저장/재부팅, 공장 보정값 보존, 중단 재개와 복귀는 실기 미확인이다. bundle의 `status`는 항상 `build-only`이며 앱은 검토 대기 결과로만 가져온다.
