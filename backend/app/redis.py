import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> redis.Redis:
    return redis_client


async def cache_get(key: str) -> str | None:
    try:
        return await redis_client.get(key)
    except Exception:
        return None


async def cache_set(key: str, value: str, expire: int = 300) -> None:
    try:
        await redis_client.set(key, value, ex=expire)
    except Exception:
        pass


async def cache_delete(key: str) -> None:
    try:
        await redis_client.delete(key)
    except Exception:
        pass
