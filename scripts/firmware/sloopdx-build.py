#!/usr/bin/env python3
"""Pinned build-only experimental sloopDX SMK port. No device APIs or installer calls."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,shutil,tarfile
APP=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
WORK=APP/'.build/sloopdx'
SRC=WORK/'source'
PIN='8c1035b79d860edcb6f23556910206332669dac8'
DEPS=APP/'.build/deps'
PATCH=HERE/'sloopdx-smk37.patch'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(args,cwd=SRC,**kwargs):subprocess.run(list(map(str,args)),cwd=cwd,check=True,**kwargs)
def main():
 if sys.platform!='linux':raise SystemExit('Run in Ubuntu-24.04 WSL; prepare shared pinned dependencies with build.py first.')
 WORK.mkdir(parents=True,exist_ok=True)
 lock=json.loads((HERE/'recipe.lock.json').read_text())
 assert sha(DEPS/lock['toolchain']['filename'])==lock['toolchain']['sha256']
 for f,h in lock['sdk']['files'].items():assert sha(DEPS/'ac79-d179b448'/f)==h
 if not SRC.exists():
  run(['git','clone','-c','core.autocrlf=false','https://github.com/zvenson/dxsloop.git',SRC],cwd=WORK)
  run(['git','checkout','--detach',PIN])
  run(['git','apply','--index',PATCH])
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=SRC,text=True).strip()==PIN
 actual=subprocess.check_output(['git','diff','--binary','--cached','HEAD'],cwd=SRC)
 assert hashlib.sha256(actual).digest()==hashlib.sha256(PATCH.read_bytes()).digest(),'Staged source differs from patch'
 assert not subprocess.check_output(['git','diff'],cwd=SRC),'Unstaged source changes'
 # Preserve an unmodified FM-1 baseline and build it on the same UTC day (__DATE__).
 base=WORK/'baseline-source'
 if not base.exists():
  run(['git','clone','-c','core.autocrlf=false','https://github.com/zvenson/dxsloop.git',base],cwd=WORK)
  run(['git','checkout','--detach',PIN],cwd=base)
 assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=base,text=True).strip()==PIN
 env={k:v for k,v in os.environ.items() if not k.startswith(('FELUCCA_','SMK_','SLOOP_','JIELI_'))}
 env.update(JIELI_TOOLCHAIN=str(DEPS/lock['toolchain']['directory']),AC79_SDK=str(DEPS/'ac79-d179b448'),BOARD='fm1',MODEL='pro',TZ='UTC')
 with (WORK/'baseline.log').open('w') as log:run(['sh','build.sh'],cwd=base,env=env,stdout=log,stderr=subprocess.STDOUT)
 for name in ('sloopdx-build-models.py','sloopdx-test.py'):run([sys.executable,HERE/name],cwd=APP)
 with (WORK/'final-fm1-after.log').open('w') as log:run(['sh','build.sh'],env=env,stdout=log,stderr=subprocess.STDOUT)
 baseline={}
 for rel in ('felucca.bin','felucca.fwsc','loader/ota.bin'):
  assert sha(base/'build'/rel)==sha(SRC/'build'/rel),'FM-1 baseline changed: '+rel
  baseline[rel]=sha(base/'build'/rel)
 # No restricted atlas, existing release binaries, screenshots or downloaded device dumps.
 with tarfile.open(WORK/'output/sloopdx-smk37-source.tar.gz','w:gz') as archive:
  paths=['firmware','tools','tests','assets/fonts','assets/icons.json','build.sh','BUILDING.md','LICENSE','LICENSING.md','README.md','CLAUDE.md']
  for rel in paths:
   p=SRC/rel
   if p.is_dir():
    for f in sorted(p.rglob('*')):
     if f.is_file() and '__pycache__' not in f.parts and f.suffix not in ('.pyc','.rej'):
      archive.add(f,arcname='sloopdx-smk37/'+str(f.relative_to(SRC)))
   else:archive.add(p,arcname='sloopdx-smk37/'+rel)
  for f in [PATCH,HERE/'sloopdx-build.py',HERE/'sloopdx-build-models.py',HERE/'sloopdx-test.py',HERE/'recipe.lock.json']:
   archive.add(f,arcname='recipe/'+f.name)
  archive.add(APP/'docs/sloopdx-port.md',arcname='NOTICE-SMK37.md')
  archive.add(DEPS/'ac79-d179b448/LICENSE',arcname='licenses/JieLi-AC79-LICENSE')
  for rel in lock['sdk']['files']:archive.add(DEPS/'ac79-d179b448'/rel,arcname='sdk/'+rel)
 report={'fm1ByteIdentical':baseline,'sourceCommit':PIN,'patchSha256':sha(PATCH),'hardwareTested':False,'status':'experimental-host-checked','icons':'atlas excluded; text labels only','models':{}}
 for model in ('pro','elite','mke'):
  report['models'][model]={p.name:{'sha256':sha(p),'size':p.stat().st_size} for p in (WORK/'output'/model).iterdir() if p.suffix in ('.fwsc','.bin') and p.name!='old.fwsc'}
 archive=WORK/'output/sloopdx-smk37-source.tar.gz'
 report['identities']={model:{'package':name+'_900','application':name+'_900','loader':'ota-'+name+'_900','recovery':name+'_000','updateRecord':'ota-'+name+'_016'} for model,name in [('pro','SMK-37 Pro'),('elite','SMK-37 Elite'),('mke','MKE-P37')]}
 report['sourceArchive']={'filename':archive.name,'sha256':sha(archive),'size':archive.stat().st_size}
 (WORK/'output/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
