# One-time setup for a local, no-admin PostgreSQL (alternative to Docker).
# Downloads the portable PostgreSQL 16 binaries and extracts them into .pgsql.
# After this, use scripts\start-db.ps1 / scripts\stop-db.ps1.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root ".pgsql"
$zip = Join-Path $env:TEMP "postgresql-16-portable.zip"
$url = "https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64-binaries.zip"

if (Test-Path (Join-Path $target "pgsql\bin\postgres.exe")) {
  Write-Host "Portable Postgres already present at $target"
  exit 0
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Write-Host "Downloading PostgreSQL 16 binaries (~323 MB)…"
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

Write-Host "Extracting…"
New-Item -ItemType Directory -Force $target | Out-Null
Expand-Archive -Path $zip -DestinationPath $target -Force
Remove-Item $zip -ErrorAction SilentlyContinue

Write-Host "Done. Now run: powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1"
