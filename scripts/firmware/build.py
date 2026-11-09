#!/usr/bin/env python3
"""Build-only, pinned SLOOP Pro recipe. No device access, arbitrary repo, or command option.

Run inside Linux/WSL2: python3 scripts/firmware/build.py all
All dependencies, source, logs and results stay under this app's ignored .build/.
The pinned upstream host tests use in-memory devices; no installer entry point is run.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parents[1]
LOCK = json.loads((HERE / "recipe.lock.json").read_text(encoding="utf-8"))
WORK = APP / ".build" / "firmware" / LOCK["id"]
DEPS = APP / ".build" / "deps"
SRC = WORK / "source"
SMK_SRC = WORK / "source-smk37"
OUT = WORK / "output"
LOGS = WORK / "logs"
SDK = DEPS / "ac79-d179b448"
TC = DEPS / LOCK["toolchain"]["directory"]


def stamp():
    return datetime.now(timezone.utc).isoformat()


def sha(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def download(url, dest, digest=None, size=None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        part = dest.with_suffix(dest.suffix + ".part")
        print(f"download {url}", flush=True)
        request = urllib.request.Request(url, headers={"User-Agent": "SMK37-local-build/1"})
        with urllib.request.urlopen(request, timeout=60) as response, part.open("wb") as output:
            shutil.copyfileobj(response, output)
        if digest and sha(part) != digest:
            raise RuntimeError(f"Hash mismatch for download {dest.name}; no execution")
        if size is not None and part.stat().st_size != size:
            raise RuntimeError(f"Size mismatch for download {dest.name}; no execution")
        part.replace(dest)
    if digest and sha(dest) != digest:
        raise RuntimeError(f"Cached dependency hash mismatch: {dest}; no execution")
    if size is not None and dest.stat().st_size != size:
        raise RuntimeError(f"Cached dependency size mismatch: {dest}; no execution")


def environment(board="fm1"):
    # Remove inherited build/test overrides; the recipe supplies its complete flags.
    env = {k: v for k, v in os.environ.items()
           if not k.startswith(("FELUCCA_", "SLOOP_", "SMK_", "JIELI_", "GOLDEN_", "BUDGET_", "CPU1_"))
           and k not in ("BOARD", "MODEL", "CC", "CC_UB", "PYTHON", "AC79_SDK", "CORES", "CHAOS",
                         "SOAK_MIN", "STRESS_FRAMES", "STRESS_ASAN_FRAMES", "EDFZ_N", "SKIP_CPU_VALGRIND",
                         "CPU_VALGRIND", "CPU_JOB", "JOBS", "VERBOSE", "TSAN_OPTIONS", "ASAN_OPTIONS", "UBSAN_OPTIONS",
                         "PYTHONPATH", "PYTHONHOME", "LD_PRELOAD", "LD_LIBRARY_PATH", "NODE_OPTIONS", "MAKEFLAGS")}
    env.update(PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
               PYTHON=sys.executable, JIELI_TOOLCHAIN=str(TC), AC79_SDK=str(SDK),
               JIELI_DOCKER="0", BOARD=board, MODEL="pro", LC_ALL="C.UTF-8", TZ="UTC", **LOCK["build"]["flags"])
    return env


def run(name, command, cwd=None, board="fm1", allow_failure=False, node24=False, pwa=False):
    LOGS.mkdir(parents=True, exist_ok=True)
    logfile = LOGS / f"{name}.log"
    start = time.monotonic()
    print(f"{name}: {command}; log={logfile.relative_to(APP)}", flush=True)
    with logfile.open("w", encoding="utf-8") as output:
        output.write(f"UTC {stamp()}\nargv={json.dumps(command)}\ncwd={cwd or WORK}\n")
        output.flush()
        env = environment(board)
        if node24:
            env["PATH"] = str(DEPS / LOCK["webTestNode"]["directory"] / "bin") + ":" + env["PATH"]
        if pwa:
            env["PLAYWRIGHT_BROWSERS_PATH"] = str(DEPS / "playwright-browsers")
            env["LD_LIBRARY_PATH"] = str(DEPS / "pwa-linux-libs/usr/lib/x86_64-linux-gnu")
        result = subprocess.run(command, cwd=cwd or WORK, env=env,
                                stdout=output, stderr=subprocess.STDOUT, check=False)
        output.write(f"\nexitCode={result.returncode}; elapsedSeconds={time.monotonic()-start:.3f}\n")
    status = {"name": name, "exitCode": result.returncode, "seconds": round(time.monotonic()-start, 3),
              "log": str(logfile.relative_to(APP)), "finishedAt": stamp()}
    (LOGS / f"{name}.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    if result.returncode and not allow_failure:
        raise RuntimeError(f"{name} failed ({result.returncode}); inspect {logfile}")
    print(f"{name}: exit {result.returncode}, {status['seconds']} s", flush=True)
    return status


def capture(command, cwd=None):
    return subprocess.check_output(command, cwd=cwd, env=environment(), text=True).strip()


def source_check(repo=SRC):
    actual = capture(["git", "rev-parse", "HEAD"], repo)
    if actual != LOCK["source"]["commit"]:
        raise RuntimeError("Source commit differs from the reviewed recipe")
    if capture(["git", "config", "--local", "core.autocrlf"], repo) != "false":
        raise RuntimeError("Source core.autocrlf must be false")
    if capture(["git", "status", "--porcelain", "--untracked-files=all"], repo):
        raise RuntimeError("Source files changed; this recipe only builds the reviewed commit")
    if capture(["git", "remote", "get-url", "origin"], repo) != LOCK["source"]["url"]:
        raise RuntimeError("Source origin differs from the reviewed fixed repository")


def prepare():
    if platform.system() != "Linux" or platform.machine() != "x86_64":
        raise RuntimeError("Run inside Linux x86-64 or WSL2; this command does not configure WSL or USB")
    import PIL
    from PIL import features
    if platform.python_version() != LOCK["host"]["python"] or PIL.__version__ != LOCK["host"]["pillow"]:
        raise RuntimeError("This recorded recipe requires Python 3.12.3 and Pillow 10.2.0; use a local environment")
    if not features.check("raqm"):
        raise RuntimeError("Pillow raqm support is required")
    for folder in (WORK, OUT, LOGS, DEPS):
        folder.mkdir(parents=True, exist_ok=True)
    tc = LOCK["toolchain"]
    archive = DEPS / tc["filename"]
    download(tc["url"], archive, tc["sha256"], tc["size"])
    # Re-extract the digest-checked archive: cached executables cannot silently replace it.
    with tarfile.open(archive) as package:
        for member in package.getmembers():
            target = (DEPS / member.name).resolve()
            if not target.is_relative_to(TC.resolve()):
                raise RuntimeError("Unexpected archive path")
        package.extractall(DEPS, filter="data")
    sdk = LOCK["sdk"]
    for rel, digest in sdk["files"].items():
        download(f"{sdk['url']}/raw/{sdk['commit']}/{rel}", SDK / rel, digest)
    download(f"{sdk['url']}/raw/{sdk['commit']}/LICENSE", SDK / "LICENSE", sdk["licenseSha256"])
    if not SRC.exists():
        run("clone", ["git", "clone", "-c", "core.autocrlf=false", "--depth", "1", "--branch",
                      LOCK["source"]["tag"], LOCK["source"]["url"], str(SRC)])
    source_check()
    versions = {"date": stamp(), "sourceCommit": LOCK["source"]["commit"],
                "toolchainArchiveSha256": sha(archive),
                "clang": capture([str(TC / "pi32v2/bin/clang"), "--version"]),
                "hostCompiler": capture(["gcc", "--version"]),
                "node": capture(["node", "--version"]), "git": capture(["git", "--version"]),
                "python": platform.python_version(), "pillow": PIL.__version__, "raqm": features.check("raqm"),
                "kernel": platform.release(), "sdkCommit": sdk["commit"],
                "sdkFiles": {rel: sha(SDK / rel) for rel in sdk["files"]}}
    (OUT / "environment.json").write_text(json.dumps(versions, indent=2) + "\n", encoding="utf-8")
    print("Pinned dependencies and unchanged source ready", flush=True)


def save_build(label, board):
    # The upstream boards share build/ names. An isolated, equally pinned SMK tree keeps
    # a long FM-1 host-test run from accidentally consuming SMK intermediate files.
    repo = SMK_SRC if board == "smk37" or label == "fm1-after" else SRC
    if board == "smk37" and not repo.exists():
        run("clone-smk37", ["git", "clone", "-c", "core.autocrlf=false", "--depth", "1", "--branch",
                            LOCK["source"]["tag"], LOCK["source"]["url"], str(repo)])
    source_check(repo)
    run(label, ["sh", "build.sh"], repo, board)
    dest = OUT / label
    dest.mkdir(parents=True, exist_ok=True)
    package = "sloop-pro.fwsc" if board == "smk37" else "felucca.fwsc"
    artifacts = {}
    for rel in ("felucca.bin", package, "loader/ota.bin"):
        target = dest / Path(rel).name
        shutil.copy2(repo / "build" / rel, target)
        artifacts[target.name] = {"size": target.stat().st_size, "sha256": sha(target)}
    (dest / "hashes.json").write_text(json.dumps(artifacts, indent=2) + "\n", encoding="utf-8")
    source_check(repo)
    return artifacts


def compare():
    before = json.loads((OUT / "fm1-before" / "hashes.json").read_text())
    after = json.loads((OUT / "fm1-after" / "hashes.json").read_text())
    same = before == after
    data = {"byteIdentical": same, "sourceChanges": [], "before": before, "after": after,
            "limitation": "Same-day unchanged-source rebuild comparison; __DATE__ prevents a cross-day identity claim."}
    (OUT / "fm1-comparison.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    if not same:
        raise RuntimeError("FM-1 before/after outputs differ")
    print("FM-1 app, package and loader: byte-identical before/after", flush=True)


def check_smk():
    source_check()
    run("smk-package", [sys.executable, "tests/smk_pkg_test.py", str(OUT / "smk37-pro/sloop-pro.fwsc"),
                        LOCK["build"]["packageIdentity"]], SRC)


def tests(label):
    # All modules called by upstream run_tests.sh are host simulations. No hardware backend is installed/invoked.
    repo = SMK_SRC if label == "tests-after" else SRC
    source_check(repo)
    status = run(label, ["sh", "tests/run_tests.sh"], repo, allow_failure=True)
    source_check(repo)
    summarize_tests()
    return status


def summarize_tests():
    reports = {}
    for name in ("tests-before", "tests-after"):
        if not (LOGS / f"{name}.json").exists():
            return
        metadata = json.loads((LOGS / f"{name}.json").read_text(encoding="utf-8"))
        lines = (LOGS / f"{name}.log").read_text(encoding="utf-8", errors="replace").splitlines()
        failures, suite, notes = [], "startup", []
        for line in lines:
            if line.startswith("== "):
                suite = line[3:]
            if "timed: a note, not a failure" in line:
                notes.append(line.strip())
                continue
            if line == "HOST TESTS FAILED":
                continue
            if any(token in line for token in ("FATAL:", "FAIL", "OVER BUDGET", "ERROR:", "TypeError [", "ReferenceError:",
                                                "Playwright requires Node.js")):
                # TSan's failing runtime mapping address changes between processes.
                normalized = re.sub(r"0x[0-9a-fA-F]+", "<address>", line.strip()) if "ThreadSanitizer" in line else line.strip()
                failures.append({"suite": suite, "diagnostic": normalized})
        reports[name] = {"exitCode": metadata["exitCode"], "failures": failures, "timingNotes": notes}
    before = {(x["suite"], x["diagnostic"]) for x in reports["tests-before"]["failures"]}
    after = {(x["suite"], x["diagnostic"]) for x in reports["tests-after"]["failures"]}
    reports["newFailureDiagnostics"] = [dict(suite=s, diagnostic=d) for s, d in sorted(after - before)]
    reports["sameFailureDiagnostics"] = before == after
    reports["limitation"] = "Diagnostics comparison only. Failed tests remain failed; timed CPU notes are explicitly non-fatal upstream."
    (OUT / "host-comparison.json").write_text(json.dumps(reports, indent=2) + "\n", encoding="utf-8")


def web_tests():
    source_check(SMK_SRC)
    node = LOCK["webTestNode"]
    archive = DEPS / node["filename"]
    download(node["url"], archive, node["sha256"])
    # Only the native runtime and its notice are needed, not npm or global installation.
    with tarfile.open(archive) as package:
        members = [package.getmember(node["directory"] + "/" + suffix) for suffix in ("bin/node", "LICENSE")]
        package.extractall(DEPS, members=members, filter="data")
    executable = DEPS / node["directory"] / "bin/node"
    if capture([str(executable), "--version"]) != "v" + node["version"]:
        raise RuntimeError("Supplemental web-test Node version mismatch")
    outcomes = [run("web-node24", [str(executable), "web/test_web.mjs"], SMK_SRC, allow_failure=True, node24=True),
                run("pro-node24", [str(executable), "web/test_pro.mjs"], SMK_SRC, allow_failure=True, node24=True)]
    source_check(SMK_SRC)
    return max(item["exitCode"] for item in outcomes)


def pwa_test():
    source_check(SMK_SRC)
    executable = DEPS / LOCK["webTestNode"]["directory"] / "bin/node"
    if not executable.exists():
        raise RuntimeError("Run web-tests first to prepare its pinned Node runtime")
    playwright = APP / "node_modules/playwright"
    if json.loads((playwright / "package.json").read_text())["version"] != LOCK["pwaTest"]["playwright"]:
        raise RuntimeError("PWA test needs the app's locked Playwright 1.65.0 (npm ci in the app)")
    browser = (DEPS / "playwright-browsers" / ("chromium_headless_shell-" + LOCK["pwaTest"]["chromiumRevision"])
               / "chrome-headless-shell-linux64/chrome-headless-shell")
    if not browser.exists():
        run("pwa-browser-prepare", [str(executable), str(playwright / "cli.js"), "install", "--only-shell", "chromium"],
            SMK_SRC, node24=True, pwa=True)
    alsa = LOCK["pwaTest"]["localAlsa"]
    deb = DEPS / alsa["filename"]
    download(alsa["url"], deb, alsa["sha256"], alsa["size"])
    run("pwa-local-lib-prepare", ["dpkg-deb", "-x", str(deb), str(DEPS / "pwa-linux-libs")], SMK_SRC)
    (OUT / "web-environment.json").write_text(json.dumps({
        "node": LOCK["webTestNode"]["version"], "nodeArchiveSha256": LOCK["webTestNode"]["sha256"],
        **LOCK["pwaTest"], "browserCache": str((DEPS / "playwright-browsers").relative_to(APP))
    }, indent=2) + "\n", encoding="utf-8")
    site = "build/host/pwa-node24"
    run("pwa-site-node24", [sys.executable, "web/make_site.py", "build/felucca.fwsc", "2.7", site], SMK_SRC)
    result = run("pwa-node24", [str(executable), "tests/pwa_test.mjs", site], SMK_SRC,
                 allow_failure=True, node24=True, pwa=True)
    source_check(SMK_SRC)
    return result["exitCode"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "fm1-before", "smk37-pro", "fm1-after", "compare", "compare-tests",
                                            "check-smk", "tests-before", "tests-after", "web-tests", "pwa-test", "all"))
    action = parser.parse_args().action
    if action == "prepare":
        prepare()
    elif action in ("fm1-before", "fm1-after", "smk37-pro"):
        save_build(action, "smk37" if action == "smk37-pro" else "fm1")
    elif action == "compare":
        compare()
    elif action == "compare-tests":
        summarize_tests()
    elif action == "check-smk":
        check_smk()
    elif action.startswith("tests-"):
        return tests(action)["exitCode"]
    elif action == "web-tests":
        return web_tests()
    elif action == "pwa-test":
        return pwa_test()
    else:
        prepare()
        save_build("fm1-before", "fm1")
        baseline = tests("tests-before")
        save_build("smk37-pro", "smk37")
        check_smk()
        save_build("fm1-after", "fm1")
        compare()
        after = tests("tests-after")
        summarize_tests()
        web_status = web_tests()
        pwa_status = pwa_test()
        print(json.dumps({"baselineTests": baseline, "afterTests": after, "hardwareTested": False}, indent=2))
        return max(after["exitCode"], web_status, pwa_status)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Build-only recipe stopped: {error}", file=sys.stderr)
        sys.exit(1)
