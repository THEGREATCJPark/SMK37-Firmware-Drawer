# Third-party notices

This personal application is GPL-3.0-only; full text is in `LICENSE`. Firmware packages, assets and referenced documentation retain their own licenses. No firmware binary, factory dump, calibration data or personal project is part of the tracked distribution.

## Reused installer and package parser

Source: [isod89/sloop-pro](https://github.com/isod89/sloop-pro/tree/701844ba0103c434b4fe4467373857b794487b51), commit `701844ba0103c434b4fe4467373857b794487b51`, `web/fm1ota.js`, `web/fm1pkg.js`. License GPL-3.0-only.

Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hügelton Instruments. SMK-37 installer: Copyright (C) 2026 M. Geisler (genkigenki/makkuro). SLOOP Pro additions: Copyright (C) 2026 isod89. Disposable MIDI session follows ChanceTheMaker's sloop-smk `web/midi-session.js` (GPL-3.0). Original headers remain in `src/vendor/`.

Changes on 2026-11-09: `fm1ota.js` unchanged; `fm1pkg.js` exposes the existing `filesOk` verifier as an export. TypeScript declarations and the selected-port adapter, app validation/state/lock layers are added separately. Protocol framing in `tests/mock-midi.ts` follows upstream `web/test_pro.mjs`; whole-image comparison and fault cases are local additions. No original panel image, icon atlas, sample or font was copied into the UI; cartridge art is local SVG/CSS.

Installer comparison and catalog source: [genkigenki/smk37](https://github.com/genkigenki/smk37/tree/f41582ee99fad7f9eb32c3f6401548ac5fc9aec3). Each catalog entry links its own upstream release, license and evidence. Availability on a public site is not treated as blanket redistribution permission.

## Porting documentation

[FM-1 to SMK-37 Pro](https://github.com/genkigenki/fm1-to-smk37/tree/54252ffa2219e3c9cd7eb70f4e99b361eaa048e1), Copyright (c) 2026 M. Geisler (makkuro). Text, tables and figures: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Backup, memory-map and workflow material informed the Korean summaries in `docs/hardware-checklist.md`, `docs/porting-workflow.md`, `docs/build-report.md`. These summaries are adapted/translated, not endorsed by the original author; those adapted documentation portions remain subject to CC BY-NC 4.0. Tool and firmware code licenses are separate.

## Local firmware build

The pinned SLOOP Pro code is GPL-3.0-only. Its [LICENSING.md](https://github.com/isod89/sloop-pro/blob/701844ba0103c434b4fe4467373857b794487b51/LICENSING.md) distinguishes reserved Hügelton assets, CC0 samples, OFL font, MIT components and Apache-2.0 msfa/SDK material. This app does not relicense them. Downloaded tools, SDK files and private build output remain ignored in `.build/`; full source notices remain in that checkout. See `docs/build-report.md` for exact dependency provenance and hashes.

## Application dependencies

Pinned dependency graph: `package-lock.json`. Runtime dependencies include React/React DOM (MIT), Zod (MIT), idb (ISC) and Lucide (ISC). Tooling includes Vite/Vitest (MIT), TypeScript (Apache-2.0), Playwright (Apache-2.0), fake-indexeddb (Apache-2.0), and DefinitelyTyped declarations (MIT). Installed package license files carry their complete notices. When distributing a built copy, include those dependency notices along with this app's corresponding source and GPL license.

M-VAVE, FM-1, SMK37 and third-party product names identify their respective products. This personal app is not an official manufacturer or firmware-author distribution.

## UI review references (2026-11-09)

The UI revision follows design guidance from [unslop by Damir Sokolovsky (@heydamir)](https://github.com/heydamir/unslop/tree/97daa3eb365670ea3f87ed85356cbfcee18105a5), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The Korean audit and direction in `docs/ui-redesign.md` adapt that guidance, with this attribution. No reference images or scripts were copied into the app.

[Stageshow by Benji Taylor](https://github.com/benjitaylor/skills/tree/299140fafd08df55a9c234e610c3f64af3f45531/stageshow) informed hierarchy, typography, spacing and restrained motion. Its React demo kit, artwork and authored example scenes were not copied or used to simulate real installation. All app interactions remain real local functions.
