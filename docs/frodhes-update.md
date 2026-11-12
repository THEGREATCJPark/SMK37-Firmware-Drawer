# Frodhes 0.9.10 update review

Reviewed 2026-11-12. The official [v0.9.10 release](https://github.com/leonardoMirabal/frodhes/releases/tag/v0.9.10) was published 2026-11-10 14:29:24 UTC. Three model-specific, versioned SMK packages were downloaded with `gh release download`, without contacting hardware. Existing 0.9.2 and 0.9.9 records remain available.

## Source and distribution evidence

The annotated tag object `a2a30efd467b6c9380c7b827790c7cd2055ee502` resolves to commit `b51b37bc8c69f76958c026877286491ab8550630`. The [release workflow run](https://github.com/leonardoMirabal/frodhes/actions/runs/42833628063) reports success for exactly this commit. The [pinned workflow](https://github.com/leonardoMirabal/frodhes/blob/b51b37bc8c69f76958c026877286491ab8550630/.github/workflows/release.yml) checks out the tag and builds all three SMK variants. This is source attribution evidence, not a locally reproduced binary build.

The [pinned licensing document](https://github.com/leonardoMirabal/frodhes/blob/b51b37bc8c69f76958c026877286491ab8550630/LICENSING.md) identifies GPL-3.0-only firmware, Terminus and Inter Tight OFL fonts, and three Apache-2.0 JieLi SDK files. The release attaches Apache-2.0.txt. New records link the [exact source archive](https://github.com/leonardoMirabal/frodhes/archive/b51b37bc8c69f76958c026877286491ab8550630.zip); licensing and attribution remain available via the package notice.

`gh attestation verify <file> --repo leonardoMirabal/frodhes` was run independently on all three downloaded files. Each returned HTTP 404 for its SHA-256 SLSA provenance endpoint. No artifact attestation was verified. The annotated tag itself reports `verified: false`, `reason: unsigned`; the release page's GitHub-verified commit signature does not establish artifact signing. GitHub release API digests exactly matched the locally downloaded package bytes.

## Pinned files

| Model | Bytes | SHA-256 |
| --- | ---: | --- |
| SMK-37 Pro | 651389 | `c0016b057034a68aad0dd20a320bf5e89b63efb8c40e0c7961260de0a395fdd6` |
| SMK-37 Elite | 651389 | `fbdc0eae5ab11dd59d3d7d63df58c282c560266d3fa74294973c5a8700585346` |
| MKE-P37 | 651385 | `457ec89fcbc45d855f27550153f8f2a5774f2477f1c21111f24d47f5cdd4507d` |

Filenames are `frodhes-0.9.10-smk37-pro.fwsc`, `frodhes-0.9.10-smk37-elite.fwsc`, and `frodhes-0.9.10-mke-p37.fwsc`. These are fixed versioned release URLs; moving latest aliases are not used.

## Scope and model-specific limitations

The [pinned SMK document](https://github.com/leonardoMirabal/frodhes/blob/b51b37bc8c69f76958c026877286491ab8550630/docs/SMK37.md) keeps app identities at `<model>_470` across Frodhes versions. Identity alone cannot establish an installed Frodhes version; the package hash distinguishes these files.

The same document explicitly warns that the MKE-P37 stock settings area starts at `0x9C000`, and writing the program area through `0x9CFFF` overwrites its first sector. The MKE artifact therefore carries this warning and directs users to their own full backup. This is separate from calibration protection at `0xC1000`. The document also says update staging at `0xEF000–0xF3FFF` has not been tested on an SMK-37. The release notes report host SMK tests and explicitly state no SMK hardware test for the change. No Drawer hardware test was performed.

## Validation

`tests/fresh-packages.test.ts` exercises the real pinned bytes through the existing `validatePackage`, including size, SHA-256, package CRC, identity, app/loader entries, non-overlapping bounds, board layout and protected region table. It rejects old-version bytes, corruption and mismatched app/loader identities. Its selected-port mock transfers every logical image byte for Pro, and sampled bytes for Elite and MKE, with model-specific loader and final identity checks. The test opens no real MIDI ports. Results are recorded below after execution.

Verification result: `npx vitest run tests/fresh-packages.test.ts` passed all 6 tests (21.60 seconds); `npx tsc --noEmit` passed. Pro transferred its complete 651369-byte logical image with zero mismatches; the other two model-specific mock transfers covered 1536 bytes each. All model packages passed the production validation guards. All loaders are byte-identical to the same-model 0.9.9 loader, while the overall package hashes differ.

| Model | Loader bytes | Loader SHA-256 (0.9.9 and 0.9.10) |
| --- | ---: | --- |
| Pro | 7273 | `122124619ca8b818db366d5f95e6c7b3af0b6c6e19b2f3a93d90d930e0231cf0` |
| Elite | 7273 | `c27d8da2ab2ace6e03fab0bb3b37ec569dfcdc60c5184f9eeca37408b649f9cd` |
| MKE-P37 | 7269 | `a024e9e432244175d16a9742d14a60a820b406ab43f88987cdb76fc6fde1476a` |

Local reproducibility evidence: `.local/frodhes-release-0.9.10.json`, `.local/fresh-artifacts.json`, `.local/frodhes-loader-review.json`, and the three uniquely versioned files in `.local/packages/`. The committed regression test reads catalog records, not the transient proposed-artifacts JSON.
