$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:4173/'

try {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -eq 200) { exit 0 }
} catch {
  # The preview is not running yet.
}

$root = Split-Path -Parent $PSScriptRoot
$npm = (Get-Command npm.cmd).Source
Start-Process -FilePath $npm `
  -ArgumentList @('run', 'preview') `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root 'preview.log') `
  -RedirectStandardError (Join-Path $root 'preview-error.log')

for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
  Start-Sleep -Milliseconds 250
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { exit 0 }
  } catch {
    # Keep waiting for Vite to bind the port.
  }
}

throw 'The game preview did not start on port 4173.'
