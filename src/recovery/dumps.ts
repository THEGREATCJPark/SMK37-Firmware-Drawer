import { sha256hex } from '../vendor/fm1pkg.js';

export const FULL_FLASH_SIZE = 0x100000;
export const TRIMDAT_OFFSET = 0xc1224;
export interface DumpValidation { sha256:string; size:number; marker:'trimdat'; identical:true }

/** File-level checks only: cannot establish device provenance or calibration accuracy. */
export async function validateDumpPair(first:Uint8Array,second:Uint8Array):Promise<DumpValidation> {
  for (const [index,bytes] of [first,second].entries()) {
    if(bytes.length!==FULL_FLASH_SIZE)throw new Error(`${index+1}번 덤프는 정확히 1 MiB (1,048,576 bytes)여야 합니다.`);
    if(bytes.every(value=>value===0)||bytes.every(value=>value===255))throw new Error(`${index+1}번 덤프가 모두 00 또는 FF입니다. 다시 읽어야 합니다.`);
    // Pinned recovery guide §3.1 requires the seven ASCII characters, not a terminator.
    if(![...new TextEncoder().encode('trimdat')].every((value,i)=>bytes[TRIMDAT_OFFSET+i]===value))throw new Error(`${index+1}번 덤프의 0xC1224에 trimdat 표식이 없습니다.`);
  }
  const [firstHash,secondHash]=await Promise.all([sha256hex(first),sha256hex(second)]);
  if(firstHash!==secondHash||!first.every((value,i)=>value===second[i]))throw new Error('두 덤프의 내용이 다릅니다. 기기에서 다시 읽고 확인하세요.');
  return {sha256:firstHash,size:FULL_FLASH_SIZE,marker:'trimdat',identical:true};
}
