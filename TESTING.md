# Running Tests for Solar Energy Controller

This guide explains how to set up and run the test suite for the Solar Energy Controller integration.

> **Important:** These are **unit tests** that run in a **development environment** (not inside your running Home Assistant instance). They use mocked Home Assistant components to test the code logic.

## Prerequisites

1. **Python 3.12 or later** (matches Home Assistant 2024.7+)
2. **pip** (Python package manager)
3. **A separate development environment** (not your running Home Assistant)

## Setup

### Install test dependencies

Create a virtual environment and install the required test dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install pytest pytest-asyncio pytest-homeassistant-custom-component "homeassistant>=2024.7.0"
```

## Running Tests

From the project root directory:

```bash
pytest -v
```

Run a specific file:

```bash
pytest tests/test_init.py -v
```

Run with coverage:

```bash
pip install pytest-cov
pytest --cov=custom_components.solar_energy_controller --cov-report=html
```

## Test Structure

- `tests/conftest.py` - Shared pytest fixtures and configuration
- `tests/test_init.py` - Module initialization
- `tests/test_config_flow.py` - Configuration flow
- `tests/test_coordinator.py` - Coordinator logic
- `tests/test_pid.py` - PID controller
- `tests/test_number.py` - Number entities
- `tests/test_select.py` - Select entities
- `tests/test_sensor.py` - Sensor entities
- `tests/test_switch.py` - Switch entities
- `tests/test_frontend_registration.py` - Lovelace resource registration

## Manual Testing in Home Assistant

1. Install the integration via HACS or manual copy
2. Add it through **Settings → Devices & Services**
3. Configure with real entities
4. Test all features manually through the UI and the PID dashboard card

## Continuous Integration

Pull requests and pushes to `main` run `.github/workflows/validate.yml`:

- HACS validation (`hacs/action`)
- Hassfest validation (`home-assistant/actions/hassfest`)

Release tags additionally run the manifest/tag version check in `.github/workflows/release.yml`.
