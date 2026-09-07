# update-monday-token.ps1
# Updates MONDAY_API_TOKEN in index.html for this workspace.
# Usage: .\update-monday-token.ps1 -Token "your-token-here"

param(
  [Parameter(Mandatory=$true)]
  [string]$Token
)

$indexFile = "$PSScriptRoot\index.html"

if (-not (Test-Path $indexFile)) {
  Write-Host "ERROR: $indexFile not found." -ForegroundColor Red
  exit 1
}

$content = Get-Content $indexFile -Raw
if ($content -notmatch "const MONDAY_API_TOKEN\s*=") {
  Write-Host "ERROR: MONDAY_API_TOKEN constant not found in $indexFile." -ForegroundColor Red
  exit 1
}

$newContent = $content -replace "(?m)^(const MONDAY_API_TOKEN\s*=\s*')[^']*(';)", "`${1}$Token`$2"
Set-Content -Path $indexFile -Value $newContent -NoNewline

Write-Host "OK  Updated MONDAY_API_TOKEN in $indexFile" -ForegroundColor Green
