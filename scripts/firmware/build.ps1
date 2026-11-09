param(
    [ValidateSet('prepare', 'fm1-before', 'smk37-pro', 'fm1-after', 'compare', 'compare-tests', 'check-smk', 'tests-before', 'tests-after', 'web-tests', 'pwa-test', 'all', 'bundle')]
    [string]$Action = 'all'
)

# Fixed recipe, fixed installed distribution, argument arrays only. No flash/USB action.
$ErrorActionPreference = 'Stop'
$wslExecutable = Join-Path $env:SystemRoot 'System32/wsl.exe'
$recipeName = if ($Action -eq 'bundle') { 'bundle.py' } else { 'build.py' }
$recipePath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot $recipeName)).Path
$linuxRecipePath = & $wslExecutable -d Ubuntu-24.04 -- wslpath -a -u $recipePath.Replace('\', '/')
if ($LASTEXITCODE -ne 0) { throw 'Unable to translate the recipe path in Ubuntu-24.04.' }
$linuxRecipePath = ($linuxRecipePath | Select-Object -Last 1).Trim()
if ($Action -eq 'bundle') {
    & $wslExecutable -d Ubuntu-24.04 -- python3 $linuxRecipePath
} else {
    & $wslExecutable -d Ubuntu-24.04 -- python3 $linuxRecipePath $Action
}
exit $LASTEXITCODE
