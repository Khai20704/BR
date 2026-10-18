"""Contract tests for the HTTP surface."""

from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

PLAN_STATUSES = {'VALIDATED', 'NEED_MORE_DATA', 'NO_FEASIBLE_PLAN', 'NOT_VALIDATED'}


def test_health_reports_model_version(client: TestClient) -> None:
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'ok'
    assert body['model_version']
    assert isinstance(body['gemini_configured'], bool)


def test_root_health_is_available(client: TestClient) -> None:
    assert client.get('/health').status_code == 200


def test_mass_balance_conserves_solids(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    response = client.post('/api/v1/physics/mass-balance', json=scenario_payload)
    assert response.status_code == 200
    body = response.json()
    dry_solids = 12.0 * (1.0 - 0.62)
    assert abs(body['dry_solids_kg'] - dry_solids) < 1e-6
    assert abs(
        body['initial_mass_kg'] - (body['dry_solids_kg'] + body['initial_water_kg'])
    ) < 1e-6
    assert body['water_to_remove_kg'] > 0.0
    assert body['minimum_energy_kwh'] > 0.0


def test_mass_balance_rejects_target_above_initial(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    payload = deepcopy(scenario_payload)
    payload['batch']['target_moisture_percent_wb'] = 70.0
    response = client.post('/api/v1/physics/mass-balance', json=payload)
    assert response.status_code == 422
    assert 'Target moisture must be below' in response.json()['detail']


def test_simulation_returns_monotonic_trajectory(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    response = client.post('/api/v1/simulations', json=scenario_payload)
    assert response.status_code == 200
    body = response.json()
    assert body['points'], 'a simulation must report at least one point'
    minutes = [point['minute'] for point in body['points']]
    moisture = [point['moisture_percent_wb'] for point in body['points']]
    assert minutes == sorted(minutes)
    assert moisture == sorted(moisture, reverse=True)
    assert body['duration_minutes'] <= 480
    assert body['energy_kwh'] >= body['minimum_energy_kwh']


def test_simulation_rejects_too_short_window(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    payload = deepcopy(scenario_payload)
    payload['constraints']['max_duration_minutes'] = 1
    response = client.post('/api/v1/simulations', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['final_moisture_percent_wb'] > 25.0
    assert any('not reached' in note for note in body['notes'])


def test_plan_carries_validation_and_rationale(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    response = client.post('/api/v1/plans', json=scenario_payload)
    assert response.status_code == 200
    body = response.json()
    plan = body['plan']
    assert plan['status'] in PLAN_STATUSES
    assert plan['phases'], 'a plan needs at least one phase'
    assert plan['validation']['checks'], 'validation must report checks'
    assert plan['rationale'], 'a plan must explain itself'
    assert body['candidates'], 'candidate schedules must be reported'
    narrative = body['narrative']
    assert narrative['text']
    assert narrative['provider']
    assert isinstance(narrative['tool_calls'], list)


def test_replan_reports_reason_codes(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    payload = deepcopy(scenario_payload)
    payload['changed_temperature_c'] = 40.0
    payload['elapsed_minutes'] = 60
    response = client.post('/api/v1/plans/replan', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert 'THERMAL_INPUT_CHANGED' in body['reason_codes']
    assert body['remaining_minutes'] == 420
    assert body['changed_temperature_c'] == 40.0


def test_benchmark_compares_three_methods(
    client: TestClient, scenario_payload: dict[str, object]
) -> None:
    response = client.post('/api/v1/benchmark', json=scenario_payload)
    assert response.status_code == 200
    body = response.json()
    methods = [method['method'] for method in body['methods']]
    assert methods == ['Fixed schedule', 'Conventional adaptive', 'Br AI']
    assert body['model_version']


def test_workspace_endpoints_expose_provenance(client: TestClient) -> None:
    window = client.get('/api/v1/workspace/thermal-window')
    assert window.status_code == 200
    window_body = window.json()
    assert len(window_body['points']) == 9
    assert window_body['provenance']['is_measurement'] is False

    for path in (
        '/api/v1/workspace/mass-balance',
        '/api/v1/workspace/simulation',
        '/api/v1/workspace/plan',
        '/api/v1/workspace/replanning',
        '/api/v1/workspace/benchmark',
    ):
        response = client.get(path)
        assert response.status_code == 200, path


def test_replanning_endpoint_validates_temperature(client: TestClient) -> None:
    response = client.get('/api/v1/workspace/replanning', params={'temperature_c': 20.0})
    assert response.status_code == 200
    assert 'THERMAL_INPUT_CHANGED' in response.json()['reason_codes']


def test_cors_allows_only_listed_origin(client: TestClient) -> None:
    allowed = client.get(
        '/api/v1/health', headers={'Origin': 'http://localhost:5173'}
    )
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'

    blocked = client.get('/api/v1/health', headers={'Origin': 'http://evil.example'})
    assert 'access-control-allow-origin' not in blocked.headers
