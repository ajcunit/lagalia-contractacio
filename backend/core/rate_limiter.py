"""
Rate limiting dual:
1. INTERN (SlowAPI): Limita peticions HTTP entrants per IP.
2. EXTERN (token bucket async): Limita crides a APIs externes (Transparència, Ollama, Gemini).
"""
import asyncio
import time

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from core.config import settings


# =============================================
# 1. RATE LIMITER INTERN (peticions entrants)
# =============================================

limiter = Limiter(key_func=get_remote_address)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handler per quan es supera el rate limit intern."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Massa peticions. Torna-ho a intentar més tard.",
            "retry_after": str(exc.detail),
        },
    )


# =============================================
# 2. RATE LIMITER EXTERN (crides a APIs)
# =============================================

class ExternalRateLimiter:
    """Token bucket rate limiter per a crides a APIs externes.

    Ús:
        limiter = ExternalRateLimiter(max_calls=10, period=60)
        async with limiter:
            response = await httpx.get(url)
    """

    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period  # en segons
        self.calls: list[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            # Netejar crides antigues fora de la finestra
            self.calls = [t for t in self.calls if now - t < self.period]

            if len(self.calls) >= self.max_calls:
                oldest = self.calls[0]
                wait_time = self.period - (now - oldest)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)

            self.calls.append(time.monotonic())

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *args):
        pass


def _parse_rate(rate_str: str) -> tuple:
    """Parseja '10/minute' a (max_calls, period_seconds)."""
    parts = rate_str.split("/")
    count = int(parts[0])
    unit = parts[1].lower()
    periods = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}
    return count, periods.get(unit, 60)


# Instàncies per a cada API externa
_sc, _sp = _parse_rate(settings.RATE_LIMIT_EXTERNAL_SYNC)
_ac, _ap = _parse_rate(settings.RATE_LIMIT_EXTERNAL_AI)
_pc, _pp = _parse_rate(settings.RATE_LIMIT_EXTERNAL_PROXY)

sync_api_limiter = ExternalRateLimiter(max_calls=_sc, period=_sp)
ai_api_limiter = ExternalRateLimiter(max_calls=_ac, period=_ap)
proxy_api_limiter = ExternalRateLimiter(max_calls=_pc, period=_pp)
