import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Updater, pack7, unpack7, type Identity } from '../src/vendor/fm1ota.js';
import { logicalImage } from '../src/vendor/fm1pkg.js';
import { assertBaudgirlRoute, BAUDGIRL_PACKAGE, baudgirlLoaderFor, transferBaudgirl, validateBaudgirlPackage } from '../src/install/baudgirl';
import { MockMidiDevice, type Fault } from './mock-midi';

// Private test input: not bundled or redistributed. No physical MIDI API is used.
const bytes = new Uint8Array(readFileSync('.local/integration/va.fwsc'));
const image = logicalImage(bytes);
const identity = (text: string): Identity => ({text, model: text.slice(0,text.lastIndexOf('_')), version: Number(text.slice(text.lastIndexOf('_')+1))});
const timing = {settle:0,reboot:0,firstReq:150,idle:150,resend:[]};
const limits = {settle:0,verifyIdle:150,verifyTotal:1000,loader:2000,back:2000};
class VaMock extends MockMidiDevice {
  nextLoader?: string;
  constructor(initial: string, fault: Fault = 'none', sample = true) { super(image, BAUDGIRL_PACKAGE.identity, initial, fault, sample); }
  loaderIdentity() { return this.nextLoader ?? baudgirlLoaderFor(this.initial); }
}
class ChecksumVaMock extends VaMock {
  checksumDelta=1;
  tx(message:number[]) {
    const data=unpack7(message.slice(1,-1));
    if(data[1]===0x59 && data[2]===0x30){data[14]=(data[14]+this.checksumDelta)&255;message=[240,...pack7(data),247];}
    super.tx(message);
  }
}
it('accepts two-complement VA requests only within pinned transfer and restores updater flag',async()=>{
  for(const existing of [undefined,false,true]){
    const mock=new ChecksumVaMock('SMK-37 Pro_016'),up=new Updater(mock.access,()=>{},{timing}) as Updater & {allowTwosChecksum?:boolean};
    if(existing!==undefined)up.allowTwosChecksum=existing;
    expect(await transferBaudgirl(up,image,identity(mock.initial),{physical:'SMK-37 Pro',timing:limits})).toBe(BAUDGIRL_PACKAGE.identity);
    expect(mock.upgrades).toBe(2);expect(mock.received.length).toBe(1536);expect(mock.mismatches).toBe(0);
    expect(up.allowTwosChecksum).toBe(existing);expect(Object.hasOwn(up,'allowTwosChecksum')).toBe(existing!==undefined);
  }
});
it('invalid VA request checksum does not finish verification or enter writing and restores flag',async()=>{
  const mock=new ChecksumVaMock('SMK-37 Pro_016');mock.checksumDelta=2;
  const up=new Updater(mock.access,()=>{},{timing}) as Updater & {allowTwosChecksum?:boolean},steps:string[]=[];
  await expect(transferBaudgirl(up,image,identity(mock.initial),{physical:'SMK-37 Pro',timing:limits},s=>steps.push(s))).rejects.toThrow();
  expect(mock.upgrades).toBe(1);expect(mock.received).toHaveLength(0);expect(steps).not.toContain('done');expect(steps).not.toContain('write');
  expect(Object.hasOwn(up,'allowTwosChecksum')).toBe(false);
});
it('pins the private VA bytes, identity, CRC and protected head separately from Felucca', async () => {
  const result = await validateBaudgirlPackage(bytes);
  expect(result.identity).toBe(BAUDGIRL_PACKAGE.identity);
  expect(result.sha256).toBe(BAUDGIRL_PACKAGE.sha256);
  const changed = bytes.slice(); changed[0x5000] ^= 1;
  await expect(validateBaudgirlPackage(changed)).rejects.toThrow('SHA-256');
  await expect(validateBaudgirlPackage(bytes.subarray(1))).rejects.toThrow('크기');
});
for (const model of ['SMK-37 Pro','SMK-37 Elite','MKE-P37']) {
  it(`${model} V016 uses the starting firmware's loader and verifies the returned VA identity`, async () => {
    const start = `${model}_016`, mock = new VaMock(start, 'none', model !== 'SMK-37 Pro');
    assertBaudgirlRoute(identity(start), model, 'stock');
    expect(await transferBaudgirl(new Updater(mock.access,()=>{},{timing}), image, identity(start), {physical:model,timing:limits})).toBe(BAUDGIRL_PACKAGE.identity);
    expect(mock.upgrades).toBe(2); expect(mock.mismatches).toBe(0);
    expect(Uint8Array.from(mock.received)).toEqual(model === 'SMK-37 Pro' ? image : image.subarray(0,1536));
  }, 30000);
}
it('refuses same version, FM-1, old VA/stock, unknown and all Felucca apps/loaders before update commands', async () => {
  for (const start of ['SMK-37+VA_102','SMK-37+VA_098','SMK-37 Pro_015','FM-1_102','ota-FM-1_102','SMK-37 Pro_900','SMK-37 Pro_470','ota-SMK-37 Pro_900','SMK-37 Pro_999']) {
    const mock = new VaMock(start);
    await expect(transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{physical:'SMK-37 Pro',timing:limits})).rejects.toThrow();
    expect(mock.upgrades).toBe(0);
  }
});
it('rejects a different physical model and malformed identity', () => {
  expect(()=>assertBaudgirlRoute(identity('SMK-37 Pro_016'),'MKE-P37','stock')).toThrow();
  expect(()=>assertBaudgirlRoute({...identity('SMK-37 Pro_016'),version:17},'SMK-37 Pro','stock')).toThrow();
  expect(()=>assertBaudgirlRoute(identity('SMK-37 Pro_016'),'FM-1','stock')).toThrow();
});
it('refuses FM-1 and Felucca loaders after step one without sending a write command', async () => {
  for (const loader of ['ota-FM-1_102','ota-SMK-37 Pro_900','ota-SMK-37+VA_102']) {
    const mock = new VaMock('SMK-37 Pro_016'); mock.nextLoader = loader;
    await expect(transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(mock.initial),{physical:'SMK-37 Pro',timing:limits})).rejects.toThrow('loader');
    expect(mock.upgrades).toBe(1); expect(mock.received.length).toBe(0);
  }
});
it('resumes only the loader of the journal-bound previous identity', async () => {
  for (const previousIdentity of ['SMK-37 Pro_016','SMK-37+VA_102']) {
    const start = baudgirlLoaderFor(previousIdentity), mock = new VaMock(start);
    expect(await transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{physical:'SMK-37 Pro',resume:true,previousIdentity,timing:limits})).toBe(BAUDGIRL_PACKAGE.identity);
    expect(mock.upgrades).toBe(1);
  }
  for (const previousIdentity of [undefined,'SMK-37+VA_098','SMK-37 Pro_016']) {
    expect(()=>assertBaudgirlRoute(identity('ota-SMK-37+VA_102'),'SMK-37 Pro','stock',true,previousIdentity)).toThrow();
  }
});
for (const fault of ['disconnect','timeout','bad-request','wrong-return'] as const) {
  it(`does not report success for ${fault}`, async () => {
    const start = 'ota-SMK-37 Pro_016', mock = new VaMock(start,fault);
    await expect(transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{physical:'SMK-37 Pro',resume:true,previousIdentity:'SMK-37 Pro_016',timing:limits})).rejects.toThrow();
  },6000);
}
it('does not emit done when post-firmware initialization fails', async () => {
  const start='ota-SMK-37 Pro_016',mock=new VaMock(start),steps:string[]=[];
  await expect(transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{
    physical:'SMK-37 Pro',resume:true,previousIdentity:'SMK-37 Pro_016',timing:limits,
    afterFirmware:async device=>{expect(device.id.text).toBe(BAUDGIRL_PACKAGE.identity);throw new Error('initialization interrupted');},
  },s=>steps.push(s))).rejects.toThrow('initialization interrupted');
  expect(steps).not.toContain('done');
});
it('journal-bound VA102 data-only retry sends no firmware update command',async()=>{
  const start=BAUDGIRL_PACKAGE.identity,mock=new VaMock(start);let called=0;
  expect(await transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{
    physical:'SMK-37 Pro',resume:true,previousIdentity:'SMK-37 Pro_016',timing:limits,
    afterFirmware:async()=>{called++;},
  })).toBe(start);
  expect(called).toBe(1);expect(mock.upgrades).toBe(0);
  await expect(transferBaudgirl(new Updater(mock.access,()=>{},{timing}),image,identity(start),{
    physical:'SMK-37 Pro',resume:true,previousIdentity:'SMK-37 Pro_016',timing:limits,
  })).rejects.toThrow('초기화');
  expect(mock.upgrades).toBe(0);
  expect(()=>assertBaudgirlRoute(identity(start),'SMK-37 Pro','stock')).toThrow('같은');
});
