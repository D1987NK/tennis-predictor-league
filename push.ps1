# Stage, commit, and push changes to the current branch's remote.
# Usage: .\push.ps1 "Your commit message"

param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

git add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed" }

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "Nothing to commit — working tree matches HEAD." -ForegroundColor Yellow
    exit 0
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "git commit failed" }

$branch = git rev-parse --abbrev-ref HEAD
git push origin $branch
if ($LASTEXITCODE -ne 0) { throw "git push failed" }

Write-Host "Pushed to origin/$branch" -ForegroundColor Green
