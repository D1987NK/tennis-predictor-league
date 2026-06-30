# Start the local portable PostgreSQL (no admin / no Docker required).
# Initializes the data directory on first run, then starts the server on :5432.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$bin = Join-Path $root ".pgsql\pgsql\bin"
$data = Join-Path $root ".pgdata"
$log = Join-Path $root ".pglogs\postgres.log"
$pw = Join-Path $root ".pgsql\pwfile.txt"

if (-not (Test-Path $bin)) {
  Write-Error "Portable Postgres not found at $bin. Run scripts\setup-db.ps1 first."
}

New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null

if (-not (Test-Path (Join-Path $data "PG_VERSION"))) {
  Write-Host "Initializing database cluster (superuser: tennis)…"
  "tennis" | Out-File -Encoding ascii $pw
  & "$bin\initdb.exe" -U tennis -A scram-sha-256 --pwfile=$pw -E UTF8 -D $data | Out-Null
  Remove-Item $pw -ErrorAction SilentlyContinue
}

Write-Host "Starting PostgreSQL on localhost:5432…"
& "$bin\pg_ctl.exe" -D $data -l $log -o "-p 5432" start

# Wait until ready, then ensure the database exists.
for ($i = 0; $i -lt 20; $i++) {
  & "$bin\pg_isready.exe" -p 5432 -U tennis 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Milliseconds 500
}

$env:PGPASSWORD = "tennis"
$exists = & "$bin\psql.exe" -U tennis -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tennis_predictor'"
if ($exists -ne "1") {
  Write-Host "Creating database tennis_predictor…"
  & "$bin\createdb.exe" -U tennis -h localhost -p 5432 tennis_predictor
}
Write-Host "PostgreSQL is ready: postgresql://tennis:tennis@localhost:5432/tennis_predictor"
