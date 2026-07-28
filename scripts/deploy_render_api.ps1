# Creates/updates the free Render web service for the ranch API.
# Requires: render login (CLI) OR RENDER_API_KEY env var.
# Usage: powershell -File scripts/deploy_render_api.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "api\.env"
$renderCli = Join-Path $env:LOCALAPPDATA "render-cli\cli_v2.4.1.exe"

function Read-DotEnv($path) {
  $map = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $i = $line.IndexOf("=")
    $map[$line.Substring(0, $i)] = $line.Substring($i + 1)
  }
  return $map
}

if (-not (Test-Path $envFile)) { throw "Missing api/.env" }
$vars = Read-DotEnv $envFile

$required = @(
  "DATABASE_URL",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_LOCATION_ID",
  "ADMIN_KEY"
)
foreach ($k in $required) {
  if (-not $vars[$k]) { throw "api/.env missing $k" }
}

$apiKey = $env:RENDER_API_KEY
if (-not $apiKey -and (Test-Path $renderCli)) {
  Write-Host "Checking Render CLI login..."
  & $renderCli whoami -o json 2>$null | Out-Null
}

if (-not $apiKey) {
  # Prefer API key from env; otherwise instruct user after CLI login.
  Write-Host @"
Render API deploy helper
------------------------
1) Finish: render login  (browser already opened if running)
2) Create an API key: https://dashboard.render.com/u/settings#api-keys
3) Then run:
   `$env:RENDER_API_KEY = 'rnd_...'
   powershell -File scripts/deploy_render_api.ps1

Or use Blueprint (no API key):
https://dashboard.render.com/blueprint/new?repo=https://github.com/philkraft1/SHIMMYSITE

Paste these env values in the Render dashboard (from your local api/.env):
  DATABASE_URL, SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, ADMIN_KEY
  SQUARE_ENVIRONMENT=production
  NEWSLETTER_INBOX=$($vars['NEWSLETTER_INBOX'])
  SITE_PUBLIC_URL=https://rosenfeldranch.com
  CHECKOUT_REDIRECT_URL=https://rosenfeldranch.com/
"@
  exit 2
}

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept        = "application/json"
  "Content-Type" = "application/json"
}

# Owner / repo from git remote
$ownerId = $null
$owners = Invoke-RestMethod -Headers $headers -Uri "https://api.render.com/v1/owners?limit=20"
if ($owners -is [System.Array]) {
  $ownerId = $owners[0].owner.id
} elseif ($owners) {
  $ownerId = $owners[0].owner.id
}
if (-not $ownerId) { throw "Could not resolve Render owner id" }

$body = @{
  type   = "web_service"
  name   = "rosenfeld-ranch-api"
  ownerId = $ownerId
  repo   = "https://github.com/philkraft1/SHIMMYSITE"
  branch = "main"
  rootDir = "api"
  autoDeploy = "yes"
  serviceDetails = @{
    runtime = "node"
    plan    = "free"
    region  = "oregon"
    buildCommand = "npm install"
    startCommand = "npm start"
    healthCheckPath = "/api/health"
    envSpecificDetails = @{
      buildCommand = "npm install"
      startCommand = "npm start"
    }
  }
  envVars = @(
    @{ key = "NODE_VERSION"; value = "22" },
    @{ key = "SQUARE_ACCESS_TOKEN"; value = $vars["SQUARE_ACCESS_TOKEN"] },
    @{ key = "SQUARE_LOCATION_ID"; value = $vars["SQUARE_LOCATION_ID"] },
    @{ key = "SQUARE_ENVIRONMENT"; value = "production" },
    @{ key = "NEWSLETTER_INBOX"; value = $vars["NEWSLETTER_INBOX"] },
    @{ key = "ADMIN_KEY"; value = $vars["ADMIN_KEY"] },
    @{ key = "DATABASE_URL"; value = $vars["DATABASE_URL"] },
    @{ key = "SITE_PUBLIC_URL"; value = "https://rosenfeldranch.com" },
    @{ key = "CHECKOUT_REDIRECT_URL"; value = "https://rosenfeldranch.com/" }
  )
} | ConvertTo-Json -Depth 8

Write-Host "Creating Render web service..."
try {
  $created = Invoke-RestMethod -Method Post -Headers $headers -Uri "https://api.render.com/v1/services" -Body $body
  $svc = $created.service
  if (-not $svc) { $svc = $created }
  $url = $svc.serviceDetails.url
  if (-not $url) { $url = "https://rosenfeld-ranch-api.onrender.com" }
  Write-Host "Created: $($svc.name)  id=$($svc.id)"
  Write-Host "URL: $url"
  Set-Content -Path (Join-Path $root "api\RENDER_URL.txt") -Value $url.Trim()
} catch {
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  throw
}
