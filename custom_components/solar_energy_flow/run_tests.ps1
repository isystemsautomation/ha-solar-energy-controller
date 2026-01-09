# PowerShell script to run tests in HA Docker container
# Usage: .\run_tests.ps1

$containerName = "homeassistant"  # Change this to your actual container name

Write-Host "Finding Home Assistant container..." -ForegroundColor Cyan

# Try to find the container automatically
$containers = docker ps --filter "ancestor=homeassistant/home-assistant" --format "{{.Names}}"
if ($containers -match "homeassistant|home-assistant") {
    $containerName = $containers[0]
    Write-Host "Found container: $containerName" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not auto-detect container name. Using '$containerName'" -ForegroundColor Yellow
    Write-Host "Please update \$containerName in this script if incorrect." -ForegroundColor Yellow
}

$testPath = "/config/custom_components/solar_energy_flow/tests"
$workingDir = "/config/custom_components/solar_energy_flow"

Write-Host "`nInstalling pytest (if not already installed)..." -ForegroundColor Cyan
docker exec $containerName pip install -q pytest pytest-asyncio pytest-mock pytest-cov 2>&1 | Out-Null

Write-Host "Running tests..." -ForegroundColor Cyan
docker exec -w $workingDir $containerName pytest tests/ -v --tb=short

Write-Host "`nDone!" -ForegroundColor Green


