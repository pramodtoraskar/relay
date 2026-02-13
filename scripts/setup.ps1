# One-command install (Windows)
Set-Location $PSScriptRoot\..
npm install
npm run build
node scripts/setup.js
Write-Host "Run: npx relay checkin"
