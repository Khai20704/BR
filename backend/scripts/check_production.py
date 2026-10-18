"""Focused Phase 04 configuration check. No cloud or model requests."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app.main import create_app
from app.agents import gemini_planner


def check():
    origin = 'https://br-demo.web.app'
    with patch.dict(os.environ, {'BR_ENV': 'production', 'BR_ALLOWED_ORIGINS': origin}), patch.object(gemini_planner, 'api_key', return_value=None):
        with TestClient(create_app(), raise_server_exceptions=False) as client:
            assert client.get('/health').json()['status'] == 'ok'
            assert client.get('/docs').status_code == 404
            preflight = client.options('/api/v1/plans', headers={
                'Origin': origin, 'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type'})
            assert preflight.status_code == 200
            assert preflight.headers['access-control-allow-origin'] == origin
            denied = client.options('/api/v1/plans', headers={
                'Origin': 'https://untrusted.invalid', 'Access-Control-Request-Method': 'POST'})
            assert denied.status_code == 400
            assert 'access-control-allow-origin' not in denied.headers
            oversized = client.post('/api/v1/plans', content=b'x' * 262145, headers={'Origin': origin})
            assert oversized.status_code == 413
            assert oversized.headers['access-control-allow-origin'] == origin
            assert client.post('/api/v1/plans', json={}).status_code == 422
            statuses = [client.get('/api/v1/workspace/thermal-window').status_code for _ in range(31)]
            assert 200 in statuses and 429 in statuses
            assert client.get('/health').status_code == 200
        for bad in ('', '*', 'http://br-demo.web.app', 'https://br-demo.web.app/path'):
            with patch.dict(os.environ, {'BR_ALLOWED_ORIGINS': bad}):
                try:
                    create_app()
                except ValueError:
                    pass
                else:
                    raise AssertionError('Unsafe production origin accepted')
    with patch.dict(os.environ, {'BR_ENV': 'development', 'BR_ALLOWED_ORIGINS': ''}):
        with TestClient(create_app()) as client:
            result = client.options('/api/v1/plans', headers={
                'Origin': 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'POST'})
            assert result.headers['access-control-allow-origin'] == 'http://127.0.0.1:5173'
    hosting = json.loads((ROOT / 'firebase.json').read_text())['hosting']
    assert hosting['public'] == 'frontend/dist'
    assert {'source': '**', 'destination': '/index.html'} in hosting['rewrites']
    docker = (ROOT / 'backend/Dockerfile').read_text()
    assert 'USER br' in docker and 'COPY . ' not in docker
    assert 'requirements-runtime.txt' in docker
    requirements = (ROOT / 'backend/requirements-runtime.txt').read_text()
    assert not any(line.startswith(('pytest', 'google-adk', 'httpx', 'python-dotenv')) for line in requirements.splitlines())
    for filename in ('.dockerignore', '.gcloudignore'):
        content = (ROOT / 'backend' / filename).read_text()
        assert content.startswith('**') and '!app/**' in content and 'app/**/.env*' in content
    # Report filenames only, never matching text or environment values.
    names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines()
    paths = [ROOT / name for name in names] + list((ROOT / 'frontend/dist').rglob('*'))
    patterns = [re.compile(r'AIza[0-9A-Za-z_-]{35}'), re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
    failures = []
    for path in paths:
        if not path.is_file():
            continue
        text = path.read_bytes().decode('utf-8', errors='ignore')
        if any(pattern.search(text) for pattern in patterns):
            failures.append(str(path.relative_to(ROOT)))
    assert not failures, 'Possible credentials in files: ' + ', '.join(failures)
    index = (ROOT / 'frontend/dist/index.html').read_text()
    assert '<script' in index
    print('PASS: production/local CORS, preflight, body and request limits, Hosting, container configuration, runtime dependency split, current-file/bundle credential-pattern scan')
    print('No Gemini/cloud calls. Credential scan does not inspect Git history or prove absence of every secret type.')


if __name__ == '__main__':
    check()
