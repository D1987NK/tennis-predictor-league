# Stop the local portable PostgreSQL server.
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path $PSScriptRoot -Parent
$bin = Join-Path $root ".pgsql\pgsql\bin"
$data = Join-Path $root ".pgdata"
& "$bin\pg_ctl.exe" -D $data stop -m fast
Write-Host "PostgreSQL stopped."
