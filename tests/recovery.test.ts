import { describe,it,expect } from 'vitest';
import { validateDumpPair,FULL_FLASH_SIZE,TRIMDAT_OFFSET } from '../src/recovery/dumps';
import { createRecoveryReport } from '../src/recovery/report';
import { catalog } from '../src/catalog';
import type { InstallRecord } from '../src/install/types';

const dump=()=>{const bytes=new Uint8Array(FULL_FLASH_SIZE).fill(0x55);bytes.set(new TextEncoder().encode('trimdat'),TRIMDAT_OFFSET);return bytes;};
describe('local full-flash validation',()=>{
  it('accepts independently supplied identical bytes and checks the documented seven-character marker',async()=>{
    const result=await validateDumpPair(dump(),dump());expect(result).toMatchObject({size:1048576,identical:true,marker:'trimdat'});expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects wrong size, blank reads, absent marker and differing bytes',async()=>{
    await expect(validateDumpPair(new Uint8Array(20),dump())).rejects.toThrow('1 MiB');
    for(const value of [0,255])await expect(validateDumpPair(new Uint8Array(FULL_FLASH_SIZE).fill(value),dump())).rejects.toThrow('00 또는 FF');
    const missing=dump();missing[TRIMDAT_OFFSET]=0;await expect(validateDumpPair(dump(),missing)).rejects.toThrow('trimdat');
    const changed=dump();changed[FULL_FLASH_SIZE-1]^=1;await expect(validateDumpPair(dump(),changed)).rejects.toThrow('내용이 다릅니다');
  });
});
describe('privacy-limited recovery report',()=>{
  const record=(overrides:Partial<InstallRecord>={}):InstallRecord=>({id:'id',startedAt:'2026-01-01T00:00:00Z',artifactId:'artifact',productId:'product',sha256:'a'.repeat(64),targetModel:'SMK-37 Pro',previousIdentity:'SMK-37 Pro_016',status:'interrupted',simulated:false,browser:'private browser',note:'private note',...overrides});
  it('includes only matching actual history, newest first, without private free text or backup paths',()=>{
    const report=createRecoveryReport('SMK-37 Pro','interrupted',catalog.artifacts,[record(),record({simulated:true}),record({targetModel:'FM-1'}),record({startedAt:'2026-02-01T00:00:00Z'})],{model:'SMK-37 Pro',sha256:'b'.repeat(64),date:'2026-01-01T00:00:00Z',reference:'private path',verifiedByOwner:true});
    expect(report.history).toHaveLength(2);expect(report.history[0].startedAt).toContain('2026-02');
    expect(report.packages.length).toBeGreaterThan(0);expect(report.packages[0]).toHaveProperty('loaderFamily');
    expect(JSON.stringify(report)).not.toMatch(/private (browser|note|path)/);expect(report.fullBackup).not.toHaveProperty('reference');
  });
  it('caps history and rejects another model backup metadata',()=>{
    const report=createRecoveryReport('SMK-37 Pro','stock',[],Array.from({length:15},()=>record()),{model:'FM-1',sha256:'b'.repeat(64),date:'2026-01-01T00:00:00Z',reference:'private path',verifiedByOwner:true});
    expect(report.history).toHaveLength(10);expect(report.fullBackup).toBeNull();
  });
});
