param([Parameter(Mandatory=$true)][string]$ApiBaseUrl)
$ErrorActionPreference = 'Stop'
if ($ApiBaseUrl -cne 'https://br-api-916064977717.asia-southeast1.run.app') {
    throw 'API origin must match the approved production Cloud Run service exactly.'
}
$previousUrl = $env:VITE_API_BASE_URL
Push-Location (Join-Path $PSScriptRoot '../frontend')
try {
    $env:VITE_API_BASE_URL = $ApiBaseUrl
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed. Do not deploy.' }
} finally {
    $env:VITE_API_BASE_URL = $previousUrl
    Pop-Location
}
