# Fixed setup script for new PC — Toshiba as E:
# If H: Toshiba is plugged back into the old PC, also copy this file to:
#   H:\PC-Migrate\2-SETUP-ON-NEW-PC.ps1

$ErrorActionPreference = 'Stop'

$toshiba = 'E:'
$staging = 'E:\PC-Migrate\Projects'
$destRoot = 'C:\Dev'
$logFile = 'E:\PC-Migrate\setup-log.txt'

if (-not (Test-Path "$toshiba\")) {
  throw 'E: not found. Plug in the Toshiba drive and try again.'
}
if (-not (Test-Path $staging)) {
  throw "Missing $staging. On the OLD PC, run 1-STAGE-ON-OLD-PC.ps1 first."
}

Write-Host ''
Write-Host 'This will:' -ForegroundColor Cyan
Write-Host '  1) Create folders on E: - Downloads, Installers, Backups, etc.'
Write-Host '  2) Copy projects from E:\PC-Migrate\Projects to C:\Dev'
Write-Host '  3) Point npm cache to E:\Caches\npm'
Write-Host ''
Write-Host 'It does NOT move Windows Downloads automatically.' -ForegroundColor Yellow
Write-Host 'Do that later in Explorer: Downloads -> Properties -> Location -> Move' -ForegroundColor Yellow
Write-Host ''
$confirm = Read-Host 'Type YES to continue'
if ($confirm -ne 'YES') {
  Write-Host 'Cancelled.' -ForegroundColor Red
  exit 1
}

$started = Get-Date
"=== Setup started $started ===" | Out-File $logFile

$folders = @(
  'E:\Downloads',
  'E:\Installers',
  'E:\Backups',
  'E:\Media\Videos',
  'E:\Media\Pictures',
  'E:\Caches\npm',
  'E:\Dev-Archives'
)
foreach ($f in $folders) {
  New-Item -ItemType Directory -Force -Path $f | Out-Null
}
Write-Host 'Created E: storage folders.' -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

Get-ChildItem $staging -Directory | ForEach-Object {
  $name = $_.Name
  $src = $_.FullName
  $dest = Join-Path $destRoot $name

  Write-Host ''
  Write-Host "Copying $name -> $dest" -ForegroundColor Green
  & robocopy $src $dest /E /COPY:DAT /R:1 /W:1 /MT:8 /NFL /NDL /NP
  $code = $LASTEXITCODE
  if ($code -ge 8) {
    throw "robocopy failed for $name with exit code $code"
  }
  "OK $name robocopy=$code" | Add-Content $logFile
  Write-Host "Done: $name" -ForegroundColor Green
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm config set cache 'E:\Caches\npm'
  Write-Host 'npm cache set to E:\Caches\npm' -ForegroundColor Green
  'npm cache OK' | Add-Content $logFile
} else {
  Write-Host 'Node/npm not installed yet - skip cache setting for now.' -ForegroundColor Yellow
  'npm cache skipped' | Add-Content $logFile
}

$elapsed = (Get-Date) - $started
Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host "Copy finished in $([int]$elapsed.TotalMinutes) min." -ForegroundColor Green
Write-Host "Projects are in: $destRoot" -ForegroundColor Cyan
Write-Host '========================================'
Write-Host ''
Write-Host 'NEXT STEPS - do these manually once:' -ForegroundColor Yellow
Write-Host 'A) Explorer: Downloads -> Properties -> Location -> Move -> E:\Downloads'
Write-Host 'B) Install Git + Node.js 20 LTS + Cursor. Save installers in E:\Installers'
Write-Host 'C) Then run these commands:'
Write-Host '     cd C:\Dev\video-creation-app'
Write-Host '     npm install'
Write-Host '     npx prisma generate'
Write-Host '     npm run dev'
Write-Host 'D) Open http://127.0.0.1:3002'
Write-Host ''
Write-Host "Log: $logFile"
