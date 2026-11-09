# Experimental sloopDX SMK-37 port

This is a locally prepared, hardware-unverified port of sloopDX 4.0.1 for SMK-37 Pro, SMK-37 Elite and MKE-P37. It is not an upstream release or a claim of hardware support. No device was connected, read or written by the build or tests.

## Provenance and reproduction

- Upstream: https://github.com/zvenson/dxsloop at `8c1035b79d860edcb6f23556910206332669dac8`.
- Board layer: https://github.com/genkigenki/sloop-fm1 commit `60d51dc`, adapted to the DX fork; model naming from `a0599e6`, stock-mapping marker protection from `bccbf1e`, and wrong-board update refusal from `6360829`.
- Guide: https://github.com/genkigenki/fm1-to-smk37 at `54252ffa2219e3c9cd7eb70f4e99b361eaa048e1`.
- Consolidated changes: `scripts/firmware/sloopdx-smk37.patch` (SHA-256 `48d597fe29fc03115e81965c1d8e3162bf49a47cbc6da08ecc9a6c72fccc198f`).

In Ubuntu-24.04 WSL, after preparing the existing shared pinned dependencies (`scripts/firmware/build.py prepare`), run:

```sh
python3 scripts/firmware/sloopdx-build.py
```

The recipe clones the exact upstream commit, applies and verifies the patch, builds all three models, runs the focused simulated-flash tests, builds FM-1 before/after, requires identical FM-1 hashes, and produces a corresponding-source archive. It never calls a device installer. Output: `.build/sloopdx/output/manifest.json`, model subdirectories and `sloopdx-smk37-source.tar.gz`. Logs are in `.build/sloopdx/`.

The source archive contains firmware, host tools/tests, font sources/licences, build recipes, and the three SDK package dependencies with the SDK licence. Its `sloopdx-smk37` directory can build directly with `BOARD=smk37 MODEL=pro|elite|mke`, `JIELI_TOOLCHAIN` pointing to the pinned compiler, and `AC79_SDK` pointing to the archive's `sdk` directory. It deliberately omits the all-rights-reserved icon atlas and unrelated existing binary releases.

## Port changes

The board switch defaults to FM-1. SMK builds use the SMK input matrix, LCD/pad LED wiring, velocity keys, wheels, four faders, SMK flash layout, loader staging, identity and model-specific update records. The DX7 engine, factory voices and FM drums are retained. The existing remote-button API is also provided by the SMK HAL. Fader bank B controls PAN, because sloopDX does not contain SLOOP's track-filter parameter. The port does not add the later SLOOP Pro DAW mode or wheel-calibration menu.

All 26 persistent objects have disjoint A/B sector pairs:

| Objects | Range |
|---|---|
| Settings, four projects, two preset banks, autosave | `0x9D000–0xACFFF` |
| Shared SLOOP owner marker, family `SLOOPDX` | `0xAF000` |
| Sixteen DX bank half-objects, selected-bank metadata, MY KIT | `0xC2000–0xE5FFF` |
| OTA staging | `0xBB000–0xBFFFF` |

The existing guarded USRFLASH window is reused; calibration, Bluetooth data, stock USR resources, flash head and key MAC remain prohibited to app storage. The stock mapping marker sector (`0xEA000`) receives only the reference port's exact-sector erase permission so return-to-stock rebuilds its mapping after USRFLASH is reused. Marker read/erase failures or a marker still present after erase block all dependent USRFLASH erases. Switching firmware families clears this port's objects. Each initialization sector erase feeds the watchdog after XIP/interrupts are restored (53 calls on a full migration), so a slow first boot does not accumulate the entire wipe inside one watchdog window. Each erase is verified over its full sector; the owner marker is committed and read back only after every wipe succeeds. Any initialization failure disables all storage reads/writes for that boot (RAM-only) and is retried at the next boot. Back up projects in the existing firmware before switching; project formats are not cross-firmware compatible.

The unlicensed Felucca icon pixels are never read by the SMK build: only enum names are carried over, the icon generator emits zero pixel bytes, and text labels remain. FM-1 builds retain their original behavior. Generated sloopDX artwork and DX voices are covered by upstream GPL code; Terminus is OFL; SDK and msfa retain their Apache notices. Include the corresponding-source archive with redistributed packages.

## Validation and limits

The clean-clone recipe completed on 2026-11-09. All model builds fit the 619,520-byte SMK app slot and the compiler-enforced RAM budgets. Exact final artifact sizes are in the output manifest and per-model logs.

Passed for all three model packages: identity, 20-block structure and CRCs, stock SMK region table, OTA staging/record/handshake, recovery identity, FM-1-layout rejection, simulated loader retries/recovery and protected-flash checks. Shared tests pass for protected/wrapping ranges, distinct storage addresses, stock rollback marker behavior, every one of the 26 objects' A/B saves, corrupted-copy fallback, family switching and protected sentinel bytes. Failure injection also passes for marker reads/erase/no-op erase/readback, first and last object erases, full-sector readback, owner erase/program/no-op/readback, blocked valid-CRC foreign data, blocked writes, and successful retry after the fault clears. The unchanged FM-1 storage regression also passes.

The full **unmodified** upstream host suite ran separately: 61 golden renders had no changed hashes, health/voice/CPU failures or crashes, and storage/UI/web checks passed. Its overall result is a failure because ThreadSanitizer cannot start in this WSL environment (`FATAL: ThreadSanitizer: unexpected memory mapping`). This is an observed baseline limitation, not a passing concurrency test. Full baseline log: `.build/sloopdx/baseline-tests.log`; focused port checks: `.build/sloopdx/clean-build.log`.

FM-1 before/after SHA-256 values are identical:

- App: `95dce19dc152671d975c5643ba086042a7ef31c39f8d2d2f024740edbc603421`
- Package: `9890838876cca229e62dad59ea2e6efbf89de28bee4435a7b6e952d2ef400d9a`
- Loader: `de76acd6ca6a19ae9090fbeb39e6122220df7ba0ed16d13cfe34b7a95296555c`

These checks do not demonstrate device boot, audio, key/pad velocity, LCD/LED timing, wheel/fader response, USB enumeration, save persistence across real power loss, install/recovery, or return-to-stock on any of the three models. Those remain physical bring-up checks. The web catalog must label these packages experimental and hardware-unverified, separate from upstream published builds.
