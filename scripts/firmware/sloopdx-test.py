import os,subprocess,json,hashlib
from pathlib import Path
app=Path(__file__).resolve().parents[2];r=app/'.build/sloopdx/source';out=app/'.build/sloopdx/output';deps=app/'.build/deps'
env=dict(os.environ,AC79_SDK=str(deps/'ac79-d179b448'))
def run(args):
 print(' '.join(map(str,args)),flush=True);subprocess.run(list(map(str,args)),cwd=r,env=env,check=True)
for test in ('smk_flash_test','smk_stock_test','sloopdx_smk_storage_test','sloopdx_smk_failure_test'):
 run(['gcc','-O1','-DBOARD_SMK37=1','-Ifirmware/hal',f'tests/{test}.c','-o',out/test]);run([out/test])
run(['gcc','-O1','tests/storage_test.c','-o',out/'storage_test']);run([out/'storage_test'])
for i,(model,name) in enumerate([('pro','SMK-37 Pro'),('elite','SMK-37 Elite'),('mke','MKE-P37')]):
 folder=out/model;stem='sloopdx-smk37'+('' if model=='pro' else '-'+model);pkg=folder/(stem+'.fwsc')
 run(['python3','tests/smk_pkg_test.py',pkg,name+'_900'])
 run(['gcc','-O1','-DBOARD_SMK37=1',f'-DT_MODEL={i}','tests/ota_test.c','-o',folder/'ota_test']);run([folder/'ota_test',pkg])
 run(['gcc','-O1','-DBOARD_SMK37=1',f'-DSMK_MODEL="{name}"','tests/ldr_test.c','-o',folder/'ldr_test'])
 run(['python3','tools/fm1pkg_make.py','--board','smk37',app/'.build/sloopdx/baseline-source/build/felucca.bin',folder/'ota.bin',folder/'old.fwsc'])
 run([folder/'ldr_test',folder/'old.fwsc',pkg])
print('ALL TARGETED HOST CHECKS PASSED')
