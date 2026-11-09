// A narrowly pinned SMK-37+VA adapter using the existing GPL protocol primitives.
// Protocol facts reviewed against baudgirl.com's public installer; no upstream code copied.
import { filesOk, logicalImage, productOf, sha256hex } from '../vendor/fm1pkg.js';
import { packageFiles, type Device, type Identity, type StepCallback, type Updater } from '../vendor/fm1ota.js';
import type { ValidatedPackage } from './package';

export const BAUDGIRL_PACKAGE = Object.freeze({
  size: 859716, identity: 'SMK-37+VA_102',
  sha256: '01f7283b951d7a00ad54d00da6099b247085c87668d2be72519dc395ab9f83e4',
  imageSha256: '286e5660eebc43f778b60ebaca5fb51dfafb7f72a6576401576ebd288fed6607',
  headSha256: 'd9f43191777656de01c7bed4f9e9ba2e34e94832c5d2ed02c3fc7ab7a6d9bd67',
});

export async function validateBaudgirlPackage(input: Uint8Array): Promise<ValidatedPackage> {
  const bytes = input.slice(), pin = BAUDGIRL_PACKAGE;
  if (bytes.length !== pin.size) throw new Error('+VA 패키지 크기가 다릅니다.');
  const sha256 = await sha256hex(bytes);
  if (sha256 !== pin.sha256) throw new Error('+VA 패키지 SHA-256이 다릅니다.');
  const identity = productOf(bytes), image = logicalImage(bytes);
  if (identity !== pin.identity) throw new Error('+VA 패키지 식별자가 다릅니다.');
  await validateBaudgirlImage(image);
  return { image, identity, sha256 };
}

async function validateBaudgirlImage(image: Uint8Array) {
  if (await sha256hex(image) !== BAUDGIRL_PACKAGE.imageSha256) throw new Error('+VA logical image SHA-256이 다릅니다.');
  if (!filesOk(image)) throw new Error('+VA 패키지 구조 또는 CRC가 다릅니다.');
  const entries = packageFiles(image);
  if (entries.filter(e => e.type === 0).length !== 1 || entries.filter(e => e.type === 100).length !== 1 ||
      entries.find(e => e.type === 0)?.off !== 0x400) throw new Error('+VA app/loader 구조가 다릅니다.');
  if (await sha256hex(image.subarray(0x400, 0x4400)) !== BAUDGIRL_PACKAGE.headSha256) throw new Error('+VA 보호 head 영역이 다릅니다.');
}

export function baudgirlLoaderFor(previousIdentity: string): string {
  if (!/^(?:SMK-37 Pro_016|SMK-37 Elite_016|MKE-P37_016|SMK-37\+VA_102)$/.test(previousIdentity)) throw new Error('+VA 출발 펌웨어의 loader 경로가 확인되지 않았습니다.');
  return `ota-${previousIdentity}`;
}

export function assertBaudgirlRoute(identity: Identity, physical: string, family: string, resume = false, previousIdentity?: string): void {
  if (!['SMK-37 Pro', 'SMK-37 Elite', 'MKE-P37'].includes(physical)) throw new Error('+VA는 확인된 SMK37 모델 경로만 지원합니다.');
  const match = /^(.*)_(\d+)$/.exec(identity.text);
  if (!match || match[1] !== identity.model || Number(match[2]) !== identity.version) throw new Error('MIDI 식별 응답이 일치하지 않습니다.');
  if (resume) {
    if (!previousIdentity || (identity.text !== baudgirlLoaderFor(previousIdentity) && identity.text !== BAUDGIRL_PACKAGE.identity)) throw new Error('+VA 중단 기록의 출발 loader와 다릅니다.');
    if (identity.text === BAUDGIRL_PACKAGE.identity && previousIdentity !== `${physical}_016`) throw new Error('+VA 초기화 재개는 같은 모델의 순정 V016 출발 기록이 필요합니다.');
    if (previousIdentity !== BAUDGIRL_PACKAGE.identity && previousIdentity !== `${physical}_016`) throw new Error('+VA 출발 모델과 실물 모델이 다릅니다.');
    return;
  }
  if (identity.text === BAUDGIRL_PACKAGE.identity) throw new Error('이미 같은 +VA 버전입니다.');
  if (family !== 'stock' || identity.text !== `${physical}_016`) throw new Error('+VA 설치는 확인된 순정 V016 출발 경로만 지원합니다.');
}

export interface BaudgirlTransferOptions {
  physical: string;
  afterFirmware?: (device: Device) => Promise<void>;
  resume?: boolean;
  /** Controller must bind this to the latest exact model/artifact/hash interruption journal. */
  previousIdentity?: string;
  timing?: { settle?: number; verifyIdle?: number; verifyTotal?: number; loader?: number; back?: number };
}

// The caller supplies an Updater limited to user-selected ports, including re-enumeration.
// No MIDI access is requested by this module. No preset/sequence erase or restore is performed.
export async function transferBaudgirl(up: Updater, input: Uint8Array, start: Identity,
  options: BaudgirlTransferOptions, step: StepCallback = () => {}): Promise<string> {
  const image = input.slice();
  await validateBaudgirlImage(image); // Also prevents substitution between preparation and transfer.
  assertBaudgirlRoute(start, options.physical, 'stock', options.resume, options.previousIdentity);
  const expectedLoader = baudgirlLoaderFor(options.resume ? options.previousIdentity! : start.text);
  const wait = up as Updater & { waitFor(filter: (id: Identity) => boolean, ms: number, tick?: (n: number) => void): Promise<Device | null> };
  const t = options.timing ?? {};
  const checksumScope = up as Updater & { allowTwosChecksum?: boolean };
  const hadChecksumFlag = Object.hasOwn(checksumScope, 'allowTwosChecksum');
  const previousChecksumFlag = checksumScope.allowTwosChecksum;
  let changedChecksumFlag = false;
  let active: Device | null = null;
  try {
    active = await up.find();
    if (!active || active.id.text !== start.text) throw new Error('+VA 설치 직전 기기 식별자가 바뀌었습니다.');
    if(options.resume && start.text === BAUDGIRL_PACKAGE.identity) {
      if(!options.afterFirmware) throw new Error('+VA 초기화 재개 단계가 없습니다.');
      await options.afterFirmware(active);
      step('done',active.id.text);
      return active.id.text;
    }
    // Only this pinned VA transfer uses the stock loader's two accepted checksums.
    checksumScope.allowTwosChecksum = true;
    changedChecksumFlag = true;
    if (!options.resume) {
      step('start', start.text);
      active.link.send([0xf0, 0x22, 0x24, 0x35, 0x7f, 0xf7]);
      await new Promise(resolve => setTimeout(resolve, t.settle ?? 2000));
      const verified = await up.serve(active.link, image, 0xe0000000, t.verifyIdle ?? 15000,
        n => step('verify', n), { totalMs: t.verifyTotal ?? 90000 });
      if (!verified.finished) throw new Error('+VA 패키지 검증 단계가 완료되지 않았습니다.');
      await new Promise(resolve => setTimeout(resolve, 40)); // Allow the final response to leave the port.
      active.link.closeNow();
      step('loader');
      await up.restart(active.link);
      active = await wait.waitFor(() => true, t.loader ?? 90000, n => step('wait', n));
    }
    if (!active || active.id.text !== expectedLoader) throw new Error('+VA 출발 펌웨어의 정확한 loader가 아닙니다. FM-1 및 다른 펌웨어 loader는 지원하지 않습니다.');
    const written = await up.write(active, image, step);
    if (!written.finished) throw new Error('+VA 전송이 중단되었습니다. 자동 재시도하지 않습니다.');
    step('written'); step('reboot');
    await up.restart(active.link);
    active = await wait.waitFor(() => true, t.back ?? 60000, n => step('back', n));
    if (!active || active.id.text !== BAUDGIRL_PACKAGE.identity) throw new Error('+VA 설치 후 기기 식별자가 목표와 다릅니다.');
    await options.afterFirmware?.(active);
    step('done', active.id.text);
    return active.id.text;
  } finally {
    if(changedChecksumFlag) {
      if(hadChecksumFlag) checksumScope.allowTwosChecksum = previousChecksumFlag;
      else delete checksumScope.allowTwosChecksum;
    }
    active?.link.closeNow();
  }
}
