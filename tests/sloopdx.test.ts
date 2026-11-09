import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/catalog';
import type { Artifact, Model } from '../src/catalog/schema';
import { InstallController } from '../src/install/controller';
import { validatePackage } from '../src/install/package';
import type { Consent, InstallRecord, InstallRequest, Transport } from '../src/install/types';
import type { Identity } from '../src/vendor/fm1ota.js';

// Real release candidate bytes; all controller I/O below is an in-memory transport.
const cases = [
  ['SMK-37 Pro', 'sloopdx-smk37.fwsc', 'd66714261375f74f2c3e7197706108e21ce63b0dde627b5f6d04981fc245af33'],
  ['SMK-37 Elite', 'sloopdx-smk37-elite.fwsc', '5315364c6782911b1d228dcfb75f09df1cb1250b6b3124ec77ece14e070b45df'],
  ['MKE-P37', 'sloopdx-smk37-mke.fwsc', 'c9ba8efe4338fd27aa2cb026ac5edbae1c056e433f5ae30a091aecc4d993f15f'],
] as const;

function rig(artifact: Artifact, bytes: Uint8Array, model: Model) {
  const records: InstallRecord[] = [];
  let transfers = 0;
  const identity: Identity = { text: `${model}_016`, model, version: 16 };
  const transport: Transport = {
    simulated: true,
    identify: async () => ({ ...identity }),
    close: async () => {},
    transfer: async (_image, request, _start, step) => {
      transfers++;
      step('write', 1);
      step('reboot');
      return request.artifact.packageIdentity!;
    },
  };
  const controller = new InstallController(transport, [artifact], async record => {
    records.push(structuredClone(record));
  });
  const request: InstallRequest = { artifact, bytes, physical: model, family: 'stock', resume: false };
  const consent: Consent = {
    fullBackup: { sha256: 'b'.repeat(64), model, verifiedByOwner: true },
    recoveryReady: true,
    projectsAcknowledged: true,
  };
  return { controller, request, consent, records, transfers: () => transfers };
}

for (const [model, filename, sha256] of cases) {
  describe(`experimental sloopDX ${model}`, () => {
    const artifact = catalog.artifacts.find(a => a.productId === 'sloopdx' && a.targetModel === model)!;
    const bytes = new Uint8Array(readFileSync(`.local/packages/${filename}`));

    it('validates the pinned release bytes, model identity, loader and protected flash layout', async () => {
      expect(artifact).toMatchObject({ experimental: true, method: 'direct', status: 'published', filename, sha256 });
      expect(artifact.packageIdentity).toBe(`${model}_900`);
      expect(artifact.loaderIdentity).toBe(`ota-${model}_900`);
      const validated = await validatePackage(bytes, artifact);
      expect(validated.identity).toBe(`${model}_900`);
      expect(validated.sha256).toBe(sha256);
      const damaged = bytes.slice();
      damaged[0x5000] ^= 1;
      await expect(validatePackage(damaged, artifact)).rejects.toThrow('SHA-256');
    });

    for (const acknowledged of [undefined, false]) {
      it(`sends zero transfers when experimental acknowledgement is ${String(acknowledged)}`, async () => {
        const r = rig(artifact, bytes, model);
        await r.controller.prepare(r.request);
        expect(r.controller.state.phase).toBe('ready');
        expect(r.transfers()).toBe(0);
        await expect(r.controller.start({ ...r.consent, experimentalAcknowledged: acknowledged })).rejects.toThrow();
        expect(r.transfers()).toBe(0);
        expect(r.records).toHaveLength(0);
      });
    }

    it('completes only the simulated transfer after explicit experimental acknowledgement', async () => {
      const r = rig(artifact, bytes, model);
      await r.controller.prepare(r.request);
      await r.controller.start({ ...r.consent, experimentalAcknowledged: true });
      expect(r.transfers()).toBe(1);
      expect(r.controller.state.phase).toBe('completed');
      expect(r.records.at(-1)).toMatchObject({
        status: 'completed', simulated: true, sha256, targetModel: model,
        reportedIdentity: `${model}_900`,
      });
    });
  });
}
