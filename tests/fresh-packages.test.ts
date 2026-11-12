import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog';
import { validatePackage } from '../src/install/package';
import { SelectedUpdater } from '../src/install/transport';
import { packageFiles, type MidiSession } from '../src/vendor/fm1ota.js';
import { logicalImage } from '../src/vendor/fm1pkg.js';
import { MockMidiDevice } from './mock-midi';

const cases = [
  ['pro', 'SMK-37 Pro', 'c0016b057034a68aad0dd20a320bf5e89b63efb8c40e0c7961260de0a395fdd6'],
  ['elite', 'SMK-37 Elite', 'fbdc0eae5ab11dd59d3d7d63df58c282c560266d3fa74294973c5a8700585346'],
  ['mke', 'MKE-P37', '457ec89fcbc45d855f27550153f8f2a5774f2477f1c21111f24d47f5cdd4507d'],
] as const;
for (const [suffix, model, sha256] of cases) describe(`Frodhes 0.9.10 ${model}`, () => {
  const artifact = catalog.artifacts.find(a => a.id === `frodhes-0.9.10-${suffix}`)!;
  const prior = catalog.artifacts.find(a => a.id === `frodhes-0.9.9-${suffix}`)!;
  const bytes = new Uint8Array(readFileSync(`.local/packages/${artifact.filename}`));
  it('validates official pinned bytes and rejects old, damaged and cross-model packages', async () => {
    expect(artifact.sourceCommit).toBe('b51b37bc8c69f76958c026877286491ab8550630');
    expect(artifact.sha256).toBe(sha256);
    const pkg = await validatePackage(bytes, artifact);
    expect(pkg.identity).toBe(`${model}_470`);
    const oldBytes = new Uint8Array(readFileSync(`.local/packages/${prior.filename}`));
    expect(createHash('sha256').update(oldBytes).digest('hex')).not.toBe(sha256);
    await expect(validatePackage(oldBytes, artifact)).rejects.toThrow('SHA-256');
    const damaged = bytes.slice(); damaged[0x5000] ^= 1;
    await expect(validatePackage(damaged, artifact)).rejects.toThrow('SHA-256');
    await expect(validatePackage(bytes, { ...artifact, packageIdentity: 'FM-1_470' })).rejects.toThrow();
    await expect(validatePackage(bytes, { ...artifact, loaderIdentity: 'ota-FM-1_900' })).rejects.toThrow();
    const loader = packageFiles(pkg.image).find(f => f.type === 100)!;
    const oldImage = logicalImage(oldBytes), oldLoader = packageFiles(oldImage).find(f => f.type === 100)!;
    // The reviewed 0.9.10 loaders are byte-identical to the respective 0.9.9 loaders.
    expect(pkg.image.subarray(loader.off, loader.off + loader.size)).toEqual(oldImage.subarray(oldLoader.off, oldLoader.off + oldLoader.size));
  });
  it(suffix === 'pro' ? 'transfers every real image byte through in-memory wire protocol' : 'transfers sampled image bytes through model-specific in-memory wire protocol', async () => {
    const pkg = await validatePackage(bytes, artifact);
    const mock = new MockMidiDevice(pkg.image, artifact.packageIdentity!, `${model}_016`, 'none', suffix !== 'pro');
    const request = { artifact, physical: model, family: 'stock' as const, resume: false };
    const updater = new SelectedUpdater(mock.access as unknown as MIDIAccess, { inputId: mock.input.id, outputId: mock.output.id }, async () => ({ inputId: mock.input.id, outputId: mock.output.id }), request, { text: `${model}_016`, model, version: 16 }, null as unknown as MidiSession, () => {}, new AbortController().signal);
    Object.assign(updater, { t: { open: 100, settle: 0, reboot: 0, step1Total: 1000, step1Idle: 200, loader: 2000, back: 2000, firstReq: 150, idle: 150, resend: [] } });
    expect(await updater.install(pkg.image, artifact.packageIdentity!, () => {}, false, { refuseOldStock: true })).toBe(`${model}_470`);
    expect(mock.loaderIdentity()).toBe(`ota-${model}_900`);
    expect(mock.mismatches).toBe(0);
    expect(mock.generation).toBe(3);
    expect(mock.received.length).toBe(suffix === 'pro' ? pkg.image.length : 1536);
    expect(new Uint8Array(mock.received)).toEqual(pkg.image.subarray(0, mock.received.length));
  }, 30000);
});
