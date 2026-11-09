# 카탈로그 출처·버전·라이선스 조사

확인일: **2026-11-09**. 아래 항목은 공개 소스·문서·패키지의 확인 결과이며, 이 작업에서 기기에 설치하거나 실기 호환성을 검증한 결과가 아니다. 정규화 전 원본 메타데이터와 파일별 크기·SHA-256·모델 identity는 워크스페이스의 `.research/catalog-research.json`에 기록했다. 펌웨어 파일은 이 문서나 앱 공개 디렉터리에 복사하지 않았다.

## 첫 직접 설치 범위

**SLOOP Pro 2.8.4와 genkigenki의 Frodhes 0.9.2 SMK 포트**를 정확한 해시의 로컬 파일로 선택한다. 자동으로 발견한 최신 릴리스를 설치 대상으로 승격하지 않는다.

Erik37 1.2는 공개 패키지와 라이선스가 확인되지만 초기 직접 설치 범위에서 제외한다. 기존 설치기의 `OUR_LOADER`는 `ota-(FM-1|SMK-37 Pro|SMK-37 Elite|MKE-P37)_[3-9]\d\d`만 허용하며, Erik37의 `_480102`는 이 조건 밖이다. 이 조사만으로 로더 보호 조건을 넓히지 않는다. Erik37은 개발자 경로를 제공한다. 이 선택은 Frodhes의 이전 버전이 최신보다 우수하다는 뜻이 아니라, 검토한 설치 경로의 범위를 고정하기 위한 것이다.

SLOOP Pro는 Snoop37 및 ChanceTheMaker의 sloop-smk와 별도 제품이다. `_900` 같은 identity를 공유할 수 있으므로 모델 identity로 제품 이름이나 설치 버전을 확정하지 않는다.

| 직접 후보 | 모델 | 실제 패키지 identity | 바이트 | SHA-256 |
|---|---|---|---:|---|
| SLOOP Pro 2.8.4 | SMK-37 Pro | `SMK-37 Pro_900` | 651224 | `7c18163fd2088663ff057b729419e4ff3b08ceb77ad72072fced3c26a8aeb80a` |
| SLOOP Pro 2.8.4 | SMK-37 Elite | `SMK-37 Elite_900` | 651224 | `c6278514ab3ca7b0bfbe3f976baead02cc2adcd801e39166130cb72a4b42705b` |
| SLOOP Pro 2.8.4 | MKE-P37 | `MKE-P37_900` | 651220 | `be1af47399b351a3c8e1147d9afe091199b5bc9c951db4515a2459f6ff7de61d` |
| Frodhes 0.9.2 포트 | SMK-37 Pro | `SMK-37 Pro_470` | 651270 | `3363807b50524989a3d0bc2a0e03649f8b79a73d6b804359a554e0cbea110463` |
| Frodhes 0.9.2 포트 | SMK-37 Elite | `SMK-37 Elite_470` | 651270 | `0ca594e75e4683cf5f559a169972e064cd894a5b8e074b9a059e8baf57e039bc` |
| Frodhes 0.9.2 포트 | MKE-P37 | `MKE-P37_470` | 651266 | `09974f1fb9470a23b83dc5e524508b83acf2c6057959caada5b125e67ba3e06c` |

SLOOP Pro는 [원저자 v2.8.4 릴리스](https://github.com/isod89/sloop-pro/releases/tag/v2.8.4)의 바이트를 메모리에서 읽고 해시와 interleaved identity를 확인했다. Frodhes 0.9.2는 [통합 사이트 고정 커밋](https://github.com/genkigenki/smk37/tree/f41582ee99fad7f9eb32c3f6401548ac5fc9aec3/firmware)의 로컬 조사본과 manifest를 대조했다. 모든 숫자는 모델별이며, 파일명이나 헤더를 바꿔 다른 모델에 쓰는 용도가 아니다.

## 제품과 모델별 버전

| 제품·저자 | 한국어 용도 | 검토된 SMK 버전 | 원본·새 배포 정보 | 초기 경로 |
|---|---|---|---|---|
| SLOOP Pro · isod89 | 신스 세 트랙과 드럼 한 트랙으로 루프를 쌓는 그루브박스. 샘플·피아노롤·파라미터 잠금·즉석 효과를 사용한다. | 2.8.4 | SLOOP 2.8.4에 SMK 보드 계층을 적용. Snoop37 2.7.2와 별도 제품. | 정확한 로컬 파일 + 개발자 설치기 |
| SMK-37+VA · Madeline / Baud Girl | FM·가상 아날로그·8비트 음원과 패턴을 패널에서 편집하는 악기. | 102 | FM-1+VA 102와 모델별 빌드를 구분. | 개발자 설치 페이지 |
| Erik37 · M. Geisler / genkigenki | 그랜드 피아노 샘플의 강약·댐퍼·현 공명·공간 잔향. 네 기본 음색과 12 사용자 프리셋. | 1.2, experimental | FM-1 1.2도 공개되지만 원저자는 FM-1 실기 미시험으로 표시. SMK Pro에서 연주했다는 원저자 기록은 본 앱 실기 기록과 별개. | 개발자 경로 |
| Frodhes · Leonardo Mirabal | 해머·발음체·픽업의 물리 모델로 만드는 EP. 0.9.2에는 네 악기 유형과 여러 효과. | 직접 대상 0.9.2 포트, experimental | 원저자 0.9.9에는 Pro/Elite/MKE/FM-1 파일이 따로 공개됨. 최신 기능을 0.9.2 설명에 섞지 않는다. | 0.9.2 로컬 파일 / 0.9.9 외부 |
| OberVave · Sven Trogus / zvenson | 아날로그 계열 패드·브라스·스트링용 8보이스 신스. 원저자 3.3.2는 네 트랙과 믹서·시퀀서. | 원저자 3.3.2 | 통합 사이트의 SMK 1.5-beta와 FM-1 3.3.2는 별도 아티팩트. | 원저자 릴리스·SMK 매뉴얼 |
| ChoralRoot · Quixotic7 | 건반으로 근음, 패드로 코드 종류를 정하는 악기. 스트럼·하프·아르페지오·패턴. | 원저자 0.29-smk37 커뮤니티 시험판 | FM-1 최신 0.32 및 통합 사이트 SMK 0.24-beta3와 분리. | 원저자 시험 릴리스·SMK 매뉴얼 |
| sloopDX · Sven Trogus / zvenson | 6오퍼레이터 FM과 FM 드럼을 SLOOP의 라이브 흐름으로 연주. | 확인된 SMK 패키지 없음 | FM-1 4.0.1 공개. README는 4.0을 beta·실기 미시험으로 설명. | SMK 설치 불가, 포팅 작업 생성 |

원저자 확인 링크: [SLOOP Pro](https://github.com/isod89/sloop-pro), [+VA 설치](https://baudgirl.com/work/SMK-37%2BVA/install), [Erik37](https://github.com/genkigenki/erik37), [Frodhes 0.9.9](https://github.com/leonardoMirabal/frodhes/releases/tag/v0.9.9), [OberVave 3.3.2](https://github.com/zvenson/obervave/releases/tag/v3.3.2), [ChoralRoot SMK 시험판](https://github.com/Quixotic7/ChoralRootFM1/releases/tag/v0.29-smk37), [sloopDX](https://github.com/zvenson/dxsloop).

ChoralRoot 0.29-smk37은 Pro/Elite/MKE 각각의 기본판과 `-1core`판, 총 여섯 `.fwsc`가 확인됐다. 모두 별도 해시를 기록했다. 원저자 [SMK37.md](https://github.com/Quixotic7/ChoralRootFM1/blob/904f275e897948cc2ef364714f4b6982a29c7754/SMK37.md)는 관리자가 SMK-37을 가지고 있지 않고 프로젝트 측 실기 시험을 하지 않았다고 명시한다. 일반 카탈로그의 ‘내 기기에서 확인됨’으로 승격하지 않는다.

## 라이선스·재배포 판단

- **설치기:** 통합 사이트 README는 Felucca/SLOOP에서 온 설치기를 GPL-3.0으로 설명한다. 원본 고지와 수정 출처를 유지해야 한다. 사이트 전체·펌웨어 전체를 하나의 MIT 라이선스로 바꾸지 않는다.
- **SLOOP Pro:** 코드 GPL-3.0-only. [고정 LICENSING.md](https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/LICENSING.md)는 `assets/icons.png`, `docs/panel.jpg`와 일부 Hügelton 자산을 별도 권리 대상으로 적는다. 빌드에 사용되는 아이콘 생성 경로도 확인됐다. CC0 악기·드럼 샘플과 이 제한 자산을 혼동하지 않는다. 최초 앱에는 바이너리를 넣지 않고 정확한 로컬 파일 및 원저자 링크를 사용한다.
- **Erik37:** [MPL-2.0 코드](https://github.com/genkigenki/erik37/blob/c06c1f7f9e7864e7ad2552be540280d344676326/LICENSING.md), Alexander Holm의 Salamander Grand Piano V3 샘플은 CC BY 3.0. 모노 변환·리샘플링·트리밍·루핑·ADPCM 압축을 한 파생 샘플이며 저자·출처·변경 고지를 유지한다. Cinzel·Libre Caslon Text·Barlow Semi Condensed는 OFL, SDK 구성요소는 Apache-2.0이다.
- **Frodhes 0.9.2:** [포트 LICENSING.md](https://github.com/genkigenki/frodhes/blob/9f83c0c84bd2659ebe0e435bb98c0b46e2af967a/LICENSING.md)는 GPL-3.0-only 코드, Terminus OFL, JieLi SDK Apache-2.0을 구분한다. 악기는 물리 모델이며 Rhodes 샘플 팩을 번들한 것으로 소개하지 않는다. 원저자 0.9.9에는 Inter Tight OFL도 기록돼 있다.
- **OberVave:** [GPL-3.0-only 코드](https://github.com/zvenson/obervave/blob/099ccd6f30a83591cea3521efaec6d3546004036/LICENSING.md), Terminus OFL, 화면 미러 MIT, SDK Apache-2.0. 로고의 URW 글꼴은 AGPL 및 폰트 임베딩 예외가 따로 있다. 앱에 로고·화면 이미지를 복제하지 않는다.
- **ChoralRoot:** [0.29-smk37 라이선스](https://github.com/Quixotic7/ChoralRootFM1/blob/904f275e897948cc2ef364714f4b6982a29c7754/LICENSING.md)는 코드와 여러 구성요소를 구분하며 Casio CZ-1 및 Sequential 공장 프리셋 데이터에 재배포 라이선스가 부여되지 않았음을 적는다. 최신 0.32에는 M-VAVE V15 유래 무선 테이블의 별도 출처 문제도 기록돼 있다. 이 조사에서는 바이너리를 복제하지 않는다.
- **+VA:** 검토한 개발자 페이지에서 공개 소스 저장소나 바이너리 재배포 허가를 확인하지 못했다. `sourceAvailable=false`는 이 조사 범위를 뜻하며 임의 라이선스를 부여하지 않는다. 외부 설치만 제공한다.
- **sloopDX:** [코드 GPL-3.0-only](https://github.com/zvenson/dxsloop/blob/8c1035b79d860edcb6f23556910206332669dac8/LICENSING.md), msfa Apache-2.0, 글꼴 OFL/MIT, SDK Apache-2.0. 상속된 아이콘 atlas는 별도 권리 제한이 명시돼 있다. 라이선스를 검토한 뒤 포팅할 수 있어도 지금 SMK 설치 파일이 생기는 것은 아니다.
- **포팅 키트:** 가이드 문서 CC BY-NC 4.0과 실제 코드 파일의 라이선스는 별개다. 가이드의 하드웨어 사실을 참고하고 출처를 적되 문서 전체를 앱에 복제하지 않는다.

## 패널·백업·복구 근거

| 제품 | 패널·매뉴얼 | 백업과 자료 보존 경계 |
|---|---|---|
| SLOOP Pro | [SLOOP-PRO.md](https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/SLOOP-PRO.md) | [원저자 에디터](https://isod89.github.io/sloop-pro/webapp/editor/)의 곡·프리셋·샘플·설정 백업. 다른 펌웨어의 저장소는 첫 시작에서 초기화될 수 있다. 2.8.1에서 샘플 슬롯 구성이 바뀐 경우 원본 WAV를 다시 보내는 조건이 있다. |
| +VA | [매뉴얼](https://baudgirl.com/work/SMK-37%2BVA/manual) | [Device Manager](https://baudgirl.com/work/SMK-37%2BVA/device-manager)에서 128 프리셋과 16 패턴을 두 `.syx`로 보관. 전체 덤프 아님. 저장하지 않은 편집은 사라지며 순정 첫 설치 시 설정은 +VA 기본값이 된다. |
| Erik37 | [CONTROLS.md](https://github.com/genkigenki/erik37/blob/c06c1f7f9e7864e7ad2552be540280d344676326/CONTROLS.md) | 자체 저장소에 사용자 음색·설정을 저장한다. 본 앱용 읽기/덤프 프로토콜은 확인·구현하지 않았다. |
| Frodhes 0.9.2 | [포트 SMK37.md](https://github.com/genkigenki/frodhes/blob/9f83c0c84bd2659ebe0e435bb98c0b46e2af967a/SMK37.md) | 본 앱은 기기 프리셋을 읽지 않는다. 외부 파일 보관과 재설치 패키지 보관을 분리한다. |
| OberVave 3.3.2 | [SMK37.md](https://github.com/zvenson/obervave/blob/099ccd6f30a83591cea3521efaec6d3546004036/SMK37.md) | 첫 설치 전에 전체 플래시 덤프와 모델별 순정 복귀 파일 준비를 명시. 본 앱의 파일 가져오기를 기기 백업 완료로 표시하지 않는다. |
| ChoralRoot 0.29 SMK | [SMK37.md](https://github.com/Quixotic7/ChoralRootFM1/blob/904f275e897948cc2ef364714f4b6982a29c7754/SMK37.md) | 원저자 시험 설치기는 현재 ChoralRoot인 기기의 파일 백업을 문서화. 본 앱이 그 백업을 수행했다고 표시하지 않는다. |

+VA는 **설치 페이지의 Android Chrome 지원**을 원저자가 명시했다. 이를 Device Manager, 다른 설치기, 또는 실제 Galaxy USB 검증 결과로 확대하지 않는다. 같은 문서에서 데스크톱 설치는 Chrome/Edge, Device Manager는 Firefox도 가능하다고 구분한다. 설치 중 재시작으로 연결이 끊기는 Firefox는 펌웨어 설치에 사용할 수 없다고 설명한다.

기기 전체 플래시·보정값은 [포팅 키트의 백업 절차](https://github.com/genkigenki/fm1-to-smk37/blob/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1/docs/02-update-and-recovery.md#3-full-flash-backup-do-this-first)를 따른다. PC의 `jl-uboot-tool`로 자기 기기의 1 MiB 덤프 두 개를 읽고 일치 여부·길이·보정 표식을 확인하는 별도 준비 작업이다. `0xC0000–0xC1FFF`와 `0xFF000–0xFFFFF`에는 기기 고유 데이터가 있다. 일반 웹 MIDI가 언제나 이 덤프를 읽는다고 가정하지 않는다. 실제 복구·erase·write 명령은 본 개발 작업에서 실행하지 않았다.

## FM-1 전용 포팅 예제의 선택

Clipper는 제외했다. 현재 [통합 카탈로그](https://genkigenki.github.io/smk37/#fw-fm1-clipper)가 원저자의 Clipper Pro SMK 빌드를 연결하기 때문이다.

선택한 **sloopDX 4.0.1**은 고정 소스 `8c1035b79d860edcb6f23556910206332669dac8`의 [README](https://github.com/zvenson/dxsloop/blob/8c1035b79d860edcb6f23556910206332669dac8/README.md)가 FM-1을 대상으로 설명하고, [tools/build.py](https://github.com/zvenson/dxsloop/blob/8c1035b79d860edcb6f23556910206332669dac8/tools/build.py)는 `FM-1_900` 및 FM-1 release identity만 생성한다. 이 파일에서 SMK/BOARD 분기는 발견되지 않았고 최신 릴리스는 FM-1용 `felucca-4.0.1.fwsc`만 제공한다. 통합 사이트 역시 SMK 포트 요청 상태다. 이것은 검토한 원본 저장소·릴리스에서 SMK 빌드를 찾지 못했다는 뜻이며, 인터넷의 모든 제3자 포크가 없음을 증명하는 것은 아니다.

## 참고 프로젝트의 범위

- [aroum/fm1-custom-fw](https://github.com/aroum/fm1-custom-fw/tree/6c0d6bf2b1dabf1c7e5ca2662ce330df94f7309a)는 README에서 FM-1 전용 디렉터리임을 명시하고 별도 SMK 자료로 연결한다. 후보 발굴용이며 각 제품의 기능·모델·라이선스는 원저자 자료로 재확인했다. 전체 저장소에 대한 라이선스는 확정하지 않았다.
- [FM-1 Swap 0.6.2](https://github.com/HyruleanHero1988/FM-1-Swap/tree/98a2519a4c8e9153849434f5e8cc94f08b435cf9)는 Android Kotlin/Compose USB MIDI FM-1 앱이다. 즐겨찾기, 오프라인 패키지 해시, 펌웨어별 백업, 전송 재개 UX를 참고할 수 있지만 SMK 지원 근거는 아니다. 앱과 fm1kit은 MIT이며 번들 순정 파일·폰트·에뮬레이터·음색 데이터는 별도 조건이다. 코드나 자산은 복제하지 않았다. README는 `WL80UBOOT` 상태에 PC 도구가 필요하며 앱이 처리하지 못한다고 적는다. 이 앱의 고의 연결 끊기 예제는 정상 설치를 먼저 확인하라는 본 작업의 사용자 조건보다 우선하지 않는다.

## 고정 소스

| 저장소 | 검토 커밋 또는 태그 |
|---|---|
| genkigenki/smk37 | `f41582ee99fad7f9eb32c3f6401548ac5fc9aec3` |
| genkigenki/fm1-to-smk37 | `54252ffa2219e3c9cd7eb70f4e99b361eaa048e1` |
| isod89/sloop-pro | `701844ba0103c434b4fe4467373857b794487b51`, release `v2.8.4` |
| genkigenki/erik37 | `c06c1f7f9e7864e7ad2552be540280d344676326`, release `v1.2` |
| genkigenki/frodhes smk37 | `9f83c0c84bd2659ebe0e435bb98c0b46e2af967a` |
| leonardoMirabal/frodhes | `456b5da4e933b01e6babeb8b2e3d211cb3896ff7`, release `v0.9.9` |
| zvenson/obervave | `099ccd6f30a83591cea3521efaec6d3546004036`, release `v3.3.2` |
| Quixotic7/ChoralRootFM1 main | `5e08da8797019b17b390954ad834cd5aa679e037`, FM-1 release `v0.32` |
| Quixotic7/ChoralRootFM1 SMK | `904f275e897948cc2ef364714f4b6982a29c7754`, tag `v0.29-smk37` |
| zvenson/dxsloop | `8c1035b79d860edcb6f23556910206332669dac8`, release `v4.0.1` |

태그/파일 해시는 배포 아티팩트를 고정한다. 별도로 조회한 브랜치 HEAD가 공개 바이너리의 정확한 빌드 입력이라는 증거는 아니므로 둘을 구분했다. GitHub API 속도 제한에 도달한 뒤 남은 검증은 고정 raw 문서, 공개 릴리스 자산 목록, `git ls-remote`로 수행했다.
