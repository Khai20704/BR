"""Small public-demo guard; global per process, never a distributed quota."""
from collections import deque
from time import monotonic

from starlette.responses import JSONResponse


class PublicDemoLimits:
    def __init__(self, app, requests_per_minute: int = 30, max_body_bytes: int = 262144):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.max_body_bytes = max_body_bytes
        self.arrivals = deque()

    async def __call__(self, scope, receive, send):
        if (scope['type'] != 'http' or scope['method'] == 'OPTIONS'
                or scope['path'] in ('/health', '/api/v1/health')):
            await self.app(scope, receive, send)
            return
        now = monotonic()
        while self.arrivals and self.arrivals[0] <= now - 60:
            self.arrivals.popleft()
        if len(self.arrivals) >= self.requests_per_minute:
            await JSONResponse({'detail': 'Demo request limit reached. Retry shortly.'},
                               status_code=429, headers={'Retry-After': '60'})(scope, receive, send)
            return
        self.arrivals.append(now)
        # Bound streamed bodies as well as requests carrying Content-Length.
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > self.max_body_bytes:
                await JSONResponse({'detail': 'Request body too large.'}, status_code=413)(scope, receive, send)
                return
            if not message.get('more_body', False):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {'type': 'http.request', 'body': bytes(body), 'more_body': False}

        await self.app(scope, replay, send)
