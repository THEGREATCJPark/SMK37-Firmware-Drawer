#!/usr/bin/env python3
"""Create the drawer's local-only build-result JSON from the fixed SLOOP Pro recipe.

No package promotion, device access, server, publication or arbitrary input is supported.
"""
import argparse
import base64
import json
from pathlib import Path

import build


def result(name, label):
    metadata = build.LOGS / f"{name}.json"
    if not metadata.exists():
        detail = ("진행 로그는 있으나 아직 종료 결과가 없습니다. 최종 검증으로 취급하지 않습니다."
                  if (build.LOGS / f"{name}.log").exists()
                  else "이 빌드 작업에서 실행 기록이 없습니다.")
        return {"name": label, "status": "not-run", "detail": detail}
    data = json.loads(metadata.read_text(encoding="utf-8"))
    log = (build.LOGS / f"{name}.log").read_text(encoding="utf-8", errors="replace")
    if name == "pwa-node24" and "pwa: Playwright not installed: skipped" in log:
        return {"name": label, "status": "not-run", "detail": "Playwright unavailable; upstream explicitly skipped this check."}
    failures = [line.strip() for line in log.splitlines()
                if "timed: a note, not a failure" not in line
                and any(word in line for word in ("FATAL:", "FAIL", "OVER BUDGET", "CHANGED", "ERROR:",
                                                  "TypeError [", "ReferenceError:", "Playwright requires Node.js"))]
    detail = f"exit={data['exitCode']}; {data['seconds']} s; {data['log']}"
    if failures:
        detail += "; " + " | ".join(failures[:10])
    return {"name": label, "status": "passed" if data["exitCode"] == 0 else "failed", "detail": detail}


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    build.source_check()
    build.source_check(build.SMK_SRC)
    package = build.OUT / "smk37-pro" / "sloop-pro.fwsc"
    hashes = json.loads((package.parent / "hashes.json").read_text(encoding="utf-8"))
    expected = hashes[package.name]
    if build.sha(package) != expected["sha256"] or package.stat().st_size != expected["size"]:
        raise RuntimeError("Local package changed after build; refusing to bundle")
    env = json.loads((build.OUT / "environment.json").read_text(encoding="utf-8"))
    comparison = json.loads((build.OUT / "fm1-comparison.json").read_text(encoding="utf-8"))
    checks = [
        {"name": "Reviewed source unchanged", "status": "passed",
         "detail": "git HEAD=" + build.LOCK["source"]["commit"] + "; clean tracked/untracked source; core.autocrlf=false"},
        result("smk37-pro", "SMK37 Pro native build"),
        result("smk-package", "SMK37 package identity, CRC and region table"),
        {"name": "FM-1 before/after byte identity", "status": "passed" if comparison["byteIdentical"] else "failed",
         "detail": json.dumps(comparison, ensure_ascii=False, separators=(",", ":"))},
        result("tests-before", "Upstream host suite before SMK37 build"),
        result("tests-after", "Upstream host suite after SMK37 build"),
        result("web-node24", "Upstream browser protocols with pinned Node 24.20.0"),
        result("pro-node24", "Upstream SLOOP Pro installer simulation with pinned Node 24.20.0"),
        result("pwa-node24", "Upstream offline installer/editor in Chromium"),
        {"name": "Physical SMK-37 Pro", "status": "not-run", "detail": "No MIDI/USB/COM device was opened or flashed."}
    ]
    comparison_path = build.OUT / "host-comparison.json"
    if comparison_path.exists():
        host_comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
        checks.insert(-1, {"name": "Before/after host failure diagnostics",
                          "status": "passed" if not host_comparison["newFailureDiagnostics"] else "failed",
                          "detail": "Same failure diagnostics=" + str(host_comparison["sameFailureDiagnostics"])
                                    + "; failures remain failed. New diagnostics="
                                    + json.dumps(host_comparison["newFailureDiagnostics"], ensure_ascii=False)})
    data = {
        "format": "smk37-build-bundle", "schemaVersion": 1, "status": "build-only",
        "productId": "sloop-pro", "name": "SLOOP Pro local build",
        "source": {"url": "https://github.com/isod89/sloop-pro", "commit": build.LOCK["source"]["commit"],
                   "license": "GPL-3.0-only code; mixed assets, personal local use only"},
        "targetModel": "SMK-37 Pro", "version": "2.8.4-local",
        "package": {"filename": "sloop-pro-2.8.4-local.fwsc", "size": package.stat().st_size,
                    "sha256": build.sha(package), "identity": "SMK-37 Pro_900",
                    "base64": base64.b64encode(package.read_bytes()).decode("ascii")},
        "recipe": {"id": build.LOCK["bundleRecipeId"],
                   "toolchain": "JieLi jieli-linux-toolchains-20260730.1; " + env["clang"].splitlines()[0],
                   "sdkCommit": build.LOCK["sdk"]["commit"]},
        "checks": checks,
        "mapping": {"status": "existing-upstream", "reference":
                    "https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/SLOOP-PRO.md"},
        "storageReview": (
            "Unchanged upstream flash allow-list, static asserts and RAM-driver second guard reviewed. "
            "Store 0x9D000-0xBAFFF; OTA staging 0xBB000-0xBFFFF; four sample banks "
            "0xC2000-0xE9FFF; upstream stock mapping marker sector 0xEA000-0xEAFFF. "
            "Protected ranges 0x00000-0x03FFF, 0xC0000-0xC1FFF, 0xF4000-0xFDFFF, "
            "0xFF000-0xFFFFF remain excluded. No firmware source changes. Host checks are "
            "not a guarantee about hardware behavior or preservation of user projects."
        ),
        "remainingHardwareTests": [
            "사용자가 보관한 전체 플래시 백업 2개와 SHA-256 일치, 복구 경로 준비 확인",
            "실제 기기 identity 및 현재 firmware/loader family와 전환 경로 확인",
            "사용자가 준비된 설치기에서 명시적으로 설치한 뒤 재연결 identity 확인",
            "37건반 velocity, 16패드와 RGB 순서, 18버튼, 8노브, 4페이더, 휠과 페달 확인",
            "오디오, USB MIDI/오디오, TRS MIDI OUT과 장시간 연주 확인",
            "프로젝트·프리셋·샘플 저장 및 전원 재기동 후 불러오기 확인",
            "사용자가 허용된 읽기 절차로 공장 보정 marker 0xC1224의 trimdat 보존 확인",
            "중단 뒤 재개와 원래 펌웨어로의 복귀는 별도 사용자 실기 검증"
        ]
    }
    destination = build.APP / ".build/firmware/sloop-pro-2.8.4/output"
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / "sloop-pro-2.8.4-local.drawer-bundle.json"
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Build-only bundle: {target.relative_to(build.APP)}")
    print(f"Package SHA-256: {data['package']['sha256']}; {data['package']['size']} bytes")
    print("Status remains build-only. Import never authorizes or performs a hardware write.")


if __name__ == "__main__":
    main()
