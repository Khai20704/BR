"""Shared pytest fixtures: a valid scenario payload and an API client."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope='session')
def client() -> TestClient:
    """A client over an app instance with a fixed CORS allow-list."""
    return TestClient(create_app(origins=['http://localhost:5173']))


@pytest.fixture()
def scenario_payload() -> dict[str, object]:
    """A small, physically consistent drying scenario."""
    return {
        'batch': {
            'batch_id': 'test-batch',
            'material': {
                'material_id': 'spent-coffee-grounds',
                'name': 'Spent coffee grounds',
                'reference_rate_per_hour': 0.60,
                'activation_energy_j_per_mol': 35000.0,
                'equilibrium_moisture_percent_wb': 6.0,
                'max_safe_temperature_c': 70.0,
                'specific_heat_j_per_kgk': 1600.0,
            },
            'mass_kg': 12.0,
            'initial_moisture_percent_wb': 62.0,
            'target_moisture_percent_wb': 25.0,
        },
        'profile': {
            'source_id': 'ac-condenser-1',
            'name': 'AC condenser waste heat',
            'samples': [
                {
                    'minute': 0,
                    'temperature_c': 34.0,
                    'available_heat_kw': 1.2,
                    'relative_humidity': 0.58,
                },
                {
                    'minute': 120,
                    'temperature_c': 43.0,
                    'available_heat_kw': 2.4,
                    'relative_humidity': 0.53,
                },
                {
                    'minute': 240,
                    'temperature_c': 48.0,
                    'available_heat_kw': 3.1,
                    'relative_humidity': 0.48,
                },
                {
                    'minute': 480,
                    'temperature_c': 39.0,
                    'available_heat_kw': 1.7,
                    'relative_humidity': 0.52,
                },
            ],
        },
        'constraints': {
            'max_duration_minutes': 480,
            'min_temperature_c': 30.0,
            'max_temperature_c': 60.0,
            'max_relative_humidity': 0.85,
        },
    }
