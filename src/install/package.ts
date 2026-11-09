import { validateBaudgirlPackage } from './baudgirl';
import { ArtifactSchema, type Artifact } from '../catalog/schema';
import { filesOk, logicalImage, productOf, sha256hex } from '../vendor/fm1pkg.js';
import { isStockPackage, packageBoard, packageFiles, regionTable } from '../vendor/fm1ota.js';

export interface ValidatedPackage { image: Uint8Array; identity: string; sha256: string }

// Integrity proves these are the reviewed bytes; it does not prove authorship or hardware compatibility.
export async function inspectPackage(input: Uint8Array): Promise<ValidatedPackage> {
  if (input.length < 960 || input.length > 2 * 1024 * 1024) throw new Error('패키지 크기가 허용 범위 밖입니다.');
  const bytes = input.slice();
  const identity = productOf(bytes);
  if (!/^(SMK-37 Pro|SMK-37 Elite|MKE-P37)_(?:[3-9]\d{2}|480102|9533)$/.test(identity)) throw new Error('지원하는 SMK37 패키지 식별자가 아닙니다.');
  const image = logicalImage(bytes);
  if (!filesOk(image)) throw new Error('패키지 구조 또는 CRC가 올바르지 않습니다.');
  const entries = packageFiles(image);
  if (entries.filter(e => e.type === 0).length !== 1 || entries.filter(e => e.type === 100).length !== 1 ||
      entries.some(e => e.size === 0 || e.off < 0x40 + entries.length * 0x50 || e.off + e.size > image.length)) {
    throw new Error('필수 app/loader 파일 구조가 올바르지 않습니다.');
  }
  const ranges = entries.map(e => [e.off, e.off + e.size]).sort((a,b) => a[0]-b[0]);
  if (ranges.some((r,i) => i > 0 && r[0] < ranges[i-1][1])) throw new Error('패키지 구조에 겹친 파일이 있습니다.');
  if (packageBoard(image) !== 'smk') throw new Error('SMK37 보드의 플래시 영역 배치가 아닙니다.');
  const flash = entries.find(e => e.type === 0)!;
  const table = regionTable(image.subarray(flash.off, flash.off + flash.size));
  if (table.PRCT?.[1] !== 0x9d000 || table.USRTRIM?.[0] !== 0xc1000 || table.USRTRIM?.[1] !== 0x1000 ||
      table.VM?.[0] !== 0x9d000 || table.VM?.[1] !== 0x23000 || table.USRFLASH?.[0] !== 0xc2000) {
    throw new Error('SMK37 보호 영역 표와 일치하지 않습니다.');
  }
  if (isStockPackage(image)) throw new Error('지원하는 Felucca 계열 loader가 없는 패키지입니다.');
  return { image, identity, sha256: await sha256hex(bytes) };
}

export async function validatePackage(input: Uint8Array, artifact: Artifact): Promise<ValidatedPackage> {
  const a = ArtifactSchema.parse(artifact);
  if (a.method !== 'direct' || a.status !== 'published') throw new Error('검토된 직접 설치 대상이 아닙니다.');
  const bytes = input.slice();
  if (bytes.length !== a.size) throw new Error(`패키지 크기 불일치: ${a.size} bytes 파일이 필요합니다.`);
  if (await sha256hex(bytes) !== a.sha256) throw new Error('SHA-256 해시가 검토된 패키지와 다릅니다.');
  if(a.loaderFamily==='baudgirl')return validateBaudgirlPackage(bytes);
  const result = await inspectPackage(bytes);
  if (result.identity !== a.packageIdentity) throw new Error('실제 패키지 식별자가 manifest와 다릅니다.');
  const loader=packageFiles(result.image).find(f=>f.type===100)!;
  const names=new TextDecoder().decode(result.image.subarray(loader.off,loader.off+loader.size)).match(/ota-(?:SMK-37 Pro|SMK-37 Elite|MKE-P37)_\d+/g);
  if(!names?.length||names.some(name=>name!==a.loaderIdentity))throw new Error('실제 업데이트 loader 식별자가 manifest와 다릅니다.');
  return result;
}
