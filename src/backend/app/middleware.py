"""Access-log middleware (RF10 base) and the `X-Request-Id` response header."""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.db import record_access

LOGGED_PREFIX = "/api/v1"


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Persist one `access_log` row per `/api/v1/*` call, login included.

    `username` comes from `request.state.username`, set either by the auth
    dependency (Bearer token) or by the login route on success.
    `request_id` is the deterministic prediction id when the route produced
    one, otherwise NULL.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.username = None
        request.state.request_id = None
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started) * 1000

        request_id = getattr(request.state, "request_id", None)
        response.headers["X-Request-Id"] = request_id or f"req-{uuid.uuid4().hex[:12]}"

        if request.url.path.startswith(LOGGED_PREFIX):
            # The route publishes the typed context in `request.state` (same
            # path `request_id` and `username` already take); the middleware
            # never reads the request body.
            record_access(
                username=getattr(request.state, "username", None),
                method=request.method,
                path=request.url.path,
                request_id=request_id,
                status_code=response.status_code,
                duration_ms=round(duration_ms, 3),
                prediction=getattr(request.state, "prediction_context", None),
            )
        return response
