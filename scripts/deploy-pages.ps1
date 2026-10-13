$ErrorActionPreference = "Stop"

Write-Host "1. Building project..." -ForegroundColor Cyan
& "C:\Program Files\nodejs\npm.cmd" run build

# Load token from environment or .env.local if present
$token = $env:GITHUB_TOKEN
if (-not $token -and (Test-Path ".env.local")) {
  Get-Content ".env.local" | ForEach-Object {
    if ($_ -match "^\s*GITHUB_TOKEN\s*=\s*(.+)$") {
      $token = $matches[1].Trim().Trim('"').Trim("'")
    }
  }
}

if (-not $token) {
  $token = Read-Host "Enter GitHub Personal Access Token (PAT)"
}

if (-not $token) {
  Write-Error "GitHub token is required."
  exit 1
}

Write-Host "2. Preparing gh-pages bundle..." -ForegroundColor Cyan
$tempDir = Join-Path $env:TEMP "gh-pages-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Copy-Item -Recurse "dist\*" $tempDir
New-Item -ItemType File -Path (Join-Path $tempDir ".nojekyll") -Force | Out-Null

Write-Host "3. Pushing to GitHub Pages (gh-pages branch)..." -ForegroundColor Cyan
Push-Location $tempDir
try {
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" init
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" config user.name "invinciblebearme-ctrl"
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" config user.email "invinciblebearme-ctrl@users.noreply.github.com"
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" checkout -b gh-pages
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" add -A
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" commit -m "Deploy to GitHub Pages"
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" remote add origin "https://${token}@github.com/invinciblebearme-ctrl/create-resources.git"
  & "C:\Users\user\AppData\Local\Programs\Git\cmd\git.exe" push -f origin gh-pages
  Write-Host "GitHub Pages deployment completed successfully!" -ForegroundColor Green
} finally {
  Pop-Location
  Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}
