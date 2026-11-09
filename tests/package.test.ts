import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validatePackage } from '../src/install/package';
import { ArtifactSchema, type Artifact } from '../src/catalog/schema';

import { fixtureArtifact as artifact, fixtureBytes as bytes } from './fixtures';

describe('실제 공개 fwsc 검사', () => {
  it('Frodhes 실제 패키지의 모델과 region table을 읽는다', async () => {
    const result = await validatePackage(bytes, artifact);
    expect(result.identity).toBe(artifact.packageIdentity);
    expect(result.image.length).toBe(bytes.length - 20);
  });
  it('hash가 다르면 거절한다', async () => {
    await expect(validatePackage(bytes, {...artifact,sha256:'a'.repeat(64)})).rejects.toThrow(/해시/);
  });
  it('잘못된 크기를 거절한다', async () => {
    await expect(validatePackage(bytes.subarray(1),artifact)).rejects.toThrow(/크기/);
  });
  it('manifest와 실제 identity 불일치를 거절한다', async () => {
    await expect(validatePackage(bytes,{...artifact,packageIdentity:'SMK-37 Pro_900'})).rejects.toThrow(/식별자/);
  });
  it('해시만 맞춘 손상 container를 거절한다', async () => {
    const bad=bytes.slice(); bad[10000]^=32;
    await expect(validatePackage(bad,{...artifact,sha256:createHash('sha256').update(bad).digest('hex')})).rejects.toThrow(/CRC|구조/);
  });
  it('실제 FM-1 파일을 SMK 파일이라고 이름만 바꾸어도 거절한다', async () => {
    const fm=new Uint8Array(readFileSync('.local/packages/fm1-frodhes-0.9.7.fwsc'));
    for(let i=0;i<20;i++) fm[i*48+47]=i<artifact.packageIdentity!.length ? artifact.packageIdentity!.charCodeAt(i)+i+1 : 0x7d;
    await expect(validatePackage(fm,{...artifact,size:fm.length,sha256:createHash('sha256').update(fm).digest('hex')})).rejects.toThrow(/보드|영역/);
  });
  it('SLOOP Pro 공개 릴리스도 같은 구조 검사로 읽는다', async () => {
    const sloop = new Uint8Array(readFileSync('.local/packages/sloop-pro-2.8.4.fwsc'));
    const result = await validatePackage(sloop, {...artifact, packageIdentity:'SMK-37 Pro_900',size:651224,sha256:'7c18163fd2088663ff057b729419e4ff3b08ceb77ad72072fced3c26a8aeb80a'});
    expect(result.identity).toBe('SMK-37 Pro_900');
  });
  it('build-only와 FM-1은 직접 설치 schema로 승격되지 않는다', () => {
    expect(ArtifactSchema.safeParse({...artifact,status:'build-only'}).success).toBe(false);
    expect(ArtifactSchema.safeParse({...artifact,targetModel:'FM-1'}).success).toBe(false);
  });
});
