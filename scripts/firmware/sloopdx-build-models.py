import os,subprocess,json,hashlib,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2]
r=root/'.build/sloopdx/source';out=root/'.build/sloopdx/output';deps=root/'.build/deps'
e=dict({k:v for k,v in os.environ.items() if not k.startswith(('FELUCCA_','SMK_','SLOOP_','JIELI_'))},JIELI_TOOLCHAIN=str(deps/'jieli-linux-toolchains-20260730.1'),AC79_SDK=str(deps/'ac79-d179b448'),BOARD='smk37')
for model in ('pro','elite','mke'):
 e['MODEL']=model
 with (out.parent/f'{model}.log').open('w') as log:subprocess.run(['sh','build.sh'],cwd=r,env=e,stdout=log,stderr=subprocess.STDOUT,check=True)
 folder=out/model;folder.mkdir(parents=True,exist_ok=True)
 stem='sloopdx-smk37'+('' if model=='pro' else '-'+model)
 for src,dst in [(f'{stem}.fwsc',f'{stem}.fwsc'),('felucca.bin','app.bin'),('loader/ota.bin','ota.bin')]:shutil.copy2(r/'build'/src,folder/dst)
 print(model,'built',flush=True)

