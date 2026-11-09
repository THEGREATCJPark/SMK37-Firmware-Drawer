$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$bundleDirectory = Join-Path $appRoot '.build/download-helper'
New-Item -ItemType Directory -Force -Path $bundleDirectory | Out-Null
Copy-Item -LiteralPath (Join-Path $appRoot 'helper/download-helper.mjs') -Destination $bundleDirectory
Copy-Item -LiteralPath (Join-Path $appRoot 'helper/Start-Helper.cmd') -Destination $bundleDirectory
Copy-Item -LiteralPath (Join-Path $appRoot 'helper/README.txt') -Destination $bundleDirectory
Copy-Item -LiteralPath (Join-Path $appRoot 'LICENSE') -Destination (Join-Path $bundleDirectory 'Drawer-LICENSE.txt')
$nodeExecutable = (Get-Command node).Source
$nodeVersion = (& $nodeExecutable --version).Trim()
if ($nodeVersion -ne 'v22.18.0') { throw 'This packaging recipe pins the installed Node runtime to v22.18.0.' }
Copy-Item -LiteralPath $nodeExecutable -Destination (Join-Path $bundleDirectory 'node.exe')
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/nodejs/node/v22.18.0/LICENSE' -OutFile (Join-Path $bundleDirectory 'Node-LICENSE.txt')
$archivePath = Join-Path $appRoot '.build/SMK37-Download-Helper-Windows.zip'
Compress-Archive -Path (Join-Path $bundleDirectory '*') -DestinationPath $archivePath -Force
Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
