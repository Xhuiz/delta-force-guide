import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> redis.Redis:
    return redis_client


async def cache_get(key: str) -> str | None:
    return await redis_client.get(key)


async def cache_set(key: str, value: str, expire: int = 300) -> None:
    await redis_client.set(key, value, ex=expire)


async def cache_delete(key: str) -> None:
    await redis_client.delete(key)
