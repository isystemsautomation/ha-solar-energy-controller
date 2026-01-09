# Running Unit Tests in Home Assistant Docker Container

## Quick Start

### 1. Find your HA container name
```bash
docker ps | grep homeassistant
```

### 2. Install pytest in the container (one-time setup)
```bash
# Replace 'homeassistant' with your actual container name
docker exec homeassistant pip install pytest pytest-asyncio pytest-mock pytest-cov
```

### 3. Run tests
```bash
# Run all tests
docker exec -w /config/custom_components/solar_energy_flow homeassistant pytest tests/ -v

# Run specific test file
docker exec -w /config/custom_components/solar_energy_flow homeassistant pytest tests/test_pid.py -v

# Run with coverage
docker exec -w /config/custom_components/solar_energy_flow homeassistant pytest tests/ --cov=. --cov-report=term-missing
```

## Alternative: Run from PowerShell

Since you're on Windows, you can create a PowerShell script:

### Create `run_tests.ps1`:
```powershell
# run_tests.ps1
$containerName = "homeassistant"  # Change to your container name

# Install pytest (only needed once)
docker exec $containerName pip install pytest pytest-asyncio pytest-mock pytest-cov

# Run tests
docker exec -w /config/custom_components/solar_energy_flow $containerName pytest tests/ -v
```

Run with:
```powershell
.\run_tests.ps1
```

## Important Notes

1. **Your code is already mounted**: Since HA runs in Docker, your `custom_components` folder is mounted at `/config/custom_components/` inside the container

2. **Python path**: The container has Home Assistant installed, so imports like `from homeassistant.core import HomeAssistant` will work

3. **Persistent installation**: Pytest installation survives container restarts (if you use volumes properly)

4. **Test isolation**: Tests run independently - they won't affect your running HA instance


