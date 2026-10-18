"""Aggregate router: engineering endpoints and workspace snapshots."""

from __future__ import annotations

from fastapi import APIRouter

from . import routes_engineering, routes_workspace

API_PREFIX = '/api/v1'

router = APIRouter(prefix=API_PREFIX)
router.include_router(routes_engineering.router)
router.include_router(routes_workspace.router, prefix='/workspace', tags=['workspace'])
