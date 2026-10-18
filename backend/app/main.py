"""FastAPI application factory.

The API exposes a deterministic thermal-drying engine: mass balance, simulation,
planning with independent validation, adaptive replanning and a three-way
benchmark. Gemini contributes narrative only. Cross-origin access is limited to
an explicit allow-list so a browser page cannot silently drive the engine.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from urllib.parse import urlsplit
from .api.public_limits import PublicDemoLimits

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import API_PREFIX, router
from .domain.physics.drying import MODEL_VERSION

DEFAULT_ALLOWED_ORIGINS = ('http://localhost:5173', 'http://127.0.0.1:5173')
ENV_ALLOWED_ORIGINS = 'BR_ALLOWED_ORIGINS'


def allowed_origins(raw: str | None = None) -> list[str]:
    """Parse the CORS allow-list; an empty value falls back to the dev server."""
    value = raw if raw is not None else os.environ.get(ENV_ALLOWED_ORIGINS, '')
    parsed = [item.strip() for item in value.split(',') if item.strip()]
    return parsed or list(DEFAULT_ALLOWED_ORIGINS)


def create_app(origins: Sequence[str] | None = None) -> FastAPI:
    """Build the application with an explicit CORS policy."""
    production = os.environ.get('BR_ENV') == 'production'
    configured_origins = list(origins) if origins is not None else allowed_origins()
    if production:
        if origins is None and not os.environ.get(ENV_ALLOWED_ORIGINS, '').strip():
            raise ValueError('Production requires explicit BR_ALLOWED_ORIGINS.')
        for origin in configured_origins:
            parsed = urlsplit(origin)
            if (parsed.scheme != 'https' or not parsed.hostname or '*' in origin
                    or parsed.username or parsed.password or parsed.path
                    or parsed.query or parsed.fragment):
                raise ValueError('Production CORS requires exact HTTPS origins.')
    app = FastAPI(
        title='Br thermal engineer API',
        docs_url=None if production else '/docs',
        redoc_url=None if production else '/redoc',
        openapi_url=None if production else '/openapi.json',
        version=MODEL_VERSION,
        description=(
            'Predictive drying plans from waste heat. Every plan is a model '
            'prediction, independently re-checked by a separate validator.'
        ),
    )
    if production:
        app.add_middleware(PublicDemoLimits)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configured_origins,
        allow_credentials=False,
        allow_methods=['GET', 'POST'],
        allow_headers=['Content-Type', 'Accept'],
    )
    app.include_router(router)

    @app.get('/health', include_in_schema=False)
    def root_health() -> dict[str, str]:
        """Unprefixed liveness probe for container health checks."""
        return {'status': 'ok', 'model_version': MODEL_VERSION}

    return app


app = create_app()

__all__ = ['API_PREFIX', 'allowed_origins', 'app', 'create_app']
