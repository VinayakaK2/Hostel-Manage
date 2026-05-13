#Requires -Version 5.1
<#
  Copy local PostgreSQL -> Render (or any remote) using pg_dump / pg_restore.

  Render "Internal" hostnames (dpg-...@no-dot) do not work from your PC.
  Either set RENDER_EXTERNAL_DATABASE_URL in .env (copy from Render dashboard),
  or this script will try appending .singapore-postgres.render.com to the host.

  Usage (from repo root or backend folder):
    cd backend
    .\scripts\sync-local-to-remote-db.ps1

  Optional env vars in .env:
    LOCAL_DATABASE_URL   - source (default: postgresql://postgres@localhost:5432/hostel_manage — set PGPASSWORD or embed password in URL)
    RENDER_EXTERNAL_DATABASE_URL - explicit external URL (recommended)
#>

$ErrorActionPreference = "Stop"
$PgBin = "${env:ProgramFiles}\PostgreSQL\16\bin"
if (-not (Test-Path "$PgBin\pg_dump.exe")) {
  throw "PostgreSQL 16 client tools not found at $PgBin. Install PostgreSQL or adjust PgBin in this script."
}

$BackendRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $BackendRoot ".env"
if (-not (Test-Path $EnvPath)) { throw "Missing .env at $EnvPath" }

function Read-DotEnv($path) {
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"(.*)"\s*$') {
      Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
    }
    elseif ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
    }
  }
}

Read-DotEnv $EnvPath

$localUrl = $env:LOCAL_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($localUrl)) {
  $localUrl = "postgresql://postgres@localhost:5432/hostel_manage"
}

$remoteUrl = $env:RENDER_EXTERNAL_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
  $db = $env:DATABASE_URL
  if ([string]::IsNullOrWhiteSpace($db)) { throw "Set RENDER_EXTERNAL_DATABASE_URL in .env or DATABASE_URL for fallback transform." }
  if ($db -match '@([^/@]+)/') {
    $h = $matches[1]
    if ($h -notmatch '\.') {
      $remoteUrl = $db -replace [regex]::Escape("@$h/"), "@$h.singapore-postgres.render.com/"
      if ($remoteUrl -notmatch 'sslmode=') {
        $remoteUrl += $(if ($remoteUrl -match '\?') { '&' } else { '?' }) + 'sslmode=require'
      }
      Write-Host "Using derived external URL (Singapore). If restore fails, set RENDER_EXTERNAL_DATABASE_URL explicitly in .env."
    }
    else {
      $remoteUrl = $db
    }
  }
  else {
    throw "Could not parse DATABASE_URL for remote."
  }
}

$dumpFile = Join-Path $env:TEMP "hostel_manage_sync_$(Get-Date -Format 'yyyyMMddHHmmss').dump"
Write-Host "Dumping local database..."
& "$PgBin\pg_dump.exe" --no-owner --no-acl -Fc -f $dumpFile $localUrl
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }

Write-Host "Restoring to remote (this may take a minute)..."
& "$PgBin\pg_restore.exe" --no-owner --no-acl --clean --if-exists -d $remoteUrl $dumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }

Remove-Item $dumpFile -Force -ErrorAction SilentlyContinue
Write-Host "Done."
