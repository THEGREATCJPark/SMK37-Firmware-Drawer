# 포팅 작업과 결과 가져오기

## 앱의 판단 순서

기존 SMK 패키지 확인 → 지원 소스의 고정 recipe → 검토된 별도 포팅 recipe → 새 작업 명세. 신규 포팅 코드를 브라우저가 실행하거나 빌드 결과를 바로 설치하지 않는다.

‘포팅 작업실’은 `.smk37-port-job.json`을 만든다. `format`, `schemaVersion`, 원본 URL/commit/license, 정확한 target, 기존 아티팩트, FM-1 기준, 입력 매핑 결정 항목, 보호 영역, 변경 목록, 시험과 남은 실기 항목이 들어 있다. 기존 매핑은 보존한다. 신규 sloopDX 등의 키/패드/휠 배치는 사용자가 실제 포팅 전에 결정해야 한다. 아직 검토되지 않은 recipe를 만들어 실행하지 않았다.

## 실제 검증한 재현 빌드

프로젝트 루트에서 WSL Ubuntu-24.04를 이용한다. Windows 브라우저가 USB를 담당하므로 WSL USB passthrough는 필요 없다.

```powershell
powershell -NoProfile -File scripts/firmware/build.ps1 -Action all
powershell -NoProfile -File scripts/firmware/build.ps1 -Action bundle
```

고정 toolchain·SDK·source와 각 checksum은 `recipe.lock.json`에 있으며 [빌드 보고서](build-report.md)에 명령과 결과가 있다. `all`은 전체 host 시험의 실패를 기록하고 나머지 빌드·비교·웹 시험도 수행한 후 nonzero로 끝날 수 있다. host 실패 때문에 마지막 `bundle` 단계를 생략하지 않되, 실패한 검사를 통과로 바꾸지 않는다. 의존성 오류로 조기에 중단됐다면 보고서의 개별 action으로 남은 작업을 수행한다. 임의 URL·셸 명령 입력이나 쓰기 action은 없다.

이번 결과:

- 대상: SLOOP Pro 2.8.4, `BOARD=smk37 MODEL=pro`, source `701844ba0103c434b4fe4467373857b794487b51`.
- 실제 package: 651224 bytes, SHA-256 `76d4f4f6b98052165c01900ac6124b6e5e4651f9102e832badc0e963ad32906b`.
- 번들: `.build/firmware/sloop-pro-2.8.4/output/sloop-pro-2.8.4-local.drawer-bundle.json`.
- FM-1 전후 app/package/loader byte-identical. 공개 릴리스 파일의 SHA와 로컬 재빌드 SHA는 다르므로 공개 설치 대상으로 대체하지 않는다.

자동화 recipe는 **Pro만** 대상으로 한다. Elite/MKE 선택 시 Pro 빌드 작업 내보내기는 비활성화된다. 모든 도구와 결과는 `.build` 안에 남고 공개 앱 자산에 포함되지 않는다.

## 번들 계약

정확한 런타임 계약은 [`BundleSchema`](../src/porting/bundle.ts), 실제 생성기는 `scripts/firmware/bundle.py`다.

```json
{
  "format": "smk37-build-bundle",
  "schemaVersion": 1,
  "status": "build-only",
  "productId": "sloop-pro",
  "name": "SLOOP Pro local build",
  "source": {"url": "https://github.com/isod89/sloop-pro", "commit": "40자리 commit", "license": "GPL-3.0-only"},
  "targetModel": "SMK-37 Pro",
  "version": "2.8.4-local",
  "package": {"filename": "sloop-pro.fwsc", "size": 651224, "sha256": "64자리 SHA-256", "identity": "SMK-37 Pro_900", "base64": "실제 파일 bytes"},
  "recipe": {"id": "sloop-pro-2.8.4-pro", "toolchain": "고정 toolchain", "sdkCommit": "SDK commit"},
  "checks": [{"name": "예시 검사", "status": "not-run", "detail": "실제 실행 결과만 기록"}],
  "mapping": {"status": "existing-upstream", "reference": "https://github.com/isod89/sloop-pro"},
  "storageReview": "검토한 실제 주소와 보호장치 기록",
  "remainingHardwareTests": ["키·패드·오디오·저장·재연결"]
}
```

위는 필드 설명 예시이며 실제 hash/commit/base64로 채워야 통과한다. 4 MiB 한도, schema, base64, 크기, SHA, 실제 패키지 CRC·보드 영역·identity를 검사한다. 실패한 host 검사를 임의로 `passed`로 바꾸지 않는다. 가져온 결과는 개발 보관함에 남으며 일반 카탈로그의 `published/direct` 아티팩트로 자동 승격하는 API는 없다.

새 포트의 승격은 별도의 개발 작업이다. 매핑 확정, 보드 분기, 저장 객체/드라이버 보호, 원본 FM-1 보존, 패키지·정상/재개 시험, 사용자 실기 기록과 라이선스 검토를 거쳐 검토된 manifest를 갱신해야 한다.
