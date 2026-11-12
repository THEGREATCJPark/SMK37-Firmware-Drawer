# OberVave 3.3.2 source provenance correction

Reviewed 2026-11-12. Recommended correction: change the four OberVave 3.3.2 catalog `sourceCommit` fields from `099ccd6f30a83591cea3521efaec6d3546004036` to `792535d23ef4265475b1c2f9895ca30e857fe596`. Keep all filenames, versions and binary SHA-256 values unchanged. Use `https://github.com/zvenson/obervave/archive/792535d23ef4265475b1c2f9895ca30e857fe596.zip` for the matching repository source archive. This investigation did not edit the catalog.

## What the signed evidence says

`gh attestation verify .local/packages/obervave-3.3.2-smk37.fwsc --repo zvenson/obervave --format json` succeeded. The verified in-toto statement contains the exact three versioned SMK file hashes already pinned in the catalog, plus the FM-1 3.3.2 hash. The main task's upstream check separately verified all three SMK local files. Its SLSA v1 `buildDefinition.resolvedDependencies` identifies `git+https://github.com/zvenson/obervave@refs/tags/v3.3.2` with `gitCommit: 792535d23ef4265475b1c2f9895ca30e857fe596`. The verified certificate's source repository, source digest, build configuration digest and workflow digest agree. The signing workflow is `.github/workflows/release.yml@refs/tags/v3.3.2`; invocation is [run 41432012522, attempt 1](https://github.com/zvenson/obervave/actions/runs/41432012522/attempts/1). Transparency timestamp is 2026-11-02 10:52:31 UTC.

This is more than a certificate naming a workflow revision: the verified statement explicitly identifies that repository commit as a resolved build dependency. The pinned [release workflow](https://github.com/zvenson/obervave/blob/792535d23ef4265475b1c2f9895ca30e857fe596/.github/workflows/release.yml) uses `actions/checkout@v4` without an alternate repository or ref, builds Pro/Elite/MKE locally with `build.sh --release`, then attests and uploads `build/obervave-*.fwsc` in the same job. Its `build.sh` invokes the checked-out `tools/build.py`. No alternate firmware source checkout appears in this path. The SDK is separately cloned from JieLi's named release branch; this evidence does not claim all external build dependencies are immutable or independently reproduced.

The release run API reports `head_sha: 792535d23ef4265475b1c2f9895ca30e857fe596`, `head_branch: v3.3.2`, `event: push`, and successful conclusion. The live tag API also resolves v3.3.2 directly to that commit. [Release asset metadata](https://github.com/zvenson/obervave/releases/tag/v3.3.2) retains the existing pinned hashes; its versioned assets were created at 10:52:36 UTC and release publication was 10:52:37 UTC on November 2.

## Why the old field is wrong

The [old catalog commit](https://github.com/zvenson/obervave/commit/099ccd6f30a83591cea3521efaec6d3546004036) is dated 2026-11-02 10:52:58 UTC, after attestation and release. It is exactly one commit ahead of the attested source and changes only `CLAUDE.md`, `README.md`, and `docs/firmware/obervave-3.3.2.fwsc`. Its commit message describes publishing the CI's attested package into docs/firmware. Thus the old field names a later documentation/package-publication snapshot, not the firmware build source. The evidence supports correcting a catalog attribution error; it does not establish a moved release tag.

## Limits and integration

The three SMK binaries have not changed. Updating source links and notices does not require replacing the firmware files. The FM-1 artifact is outside direct SMK installation scope, but its hash is also a subject in this verified statement and its source attribution should be corrected consistently. A source-attestation label should apply to the specific matching file hash and source commit, not every artifact by this author. The release workflow allows host tests to fail (`continue-on-error: true`); attestation verifies provenance, not test success or device safety. No hardware connection or installation occurred.

Local evidence is saved in `.local/obervave-attestation-review.json`, `.local/obervave-release-workflow.txt`, `.local/obervave-build-reviewed.sh`, and `.local/obervave-build-reviewed.py`.
