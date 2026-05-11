from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.map.router import router as map_router
from app.guide.router import router as guide_router
from app.comment.router import router as comment_router
from app.weapon.router import router as weapon_router
from app.user.router import router as user_router
from app.admin.router import router as admin_router
from app.tag.router import router as tag_router

app = FastAPI(title="Delta Force Map Guide API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(map_router)
app.include_router(guide_router)
app.include_router(comment_router)
app.include_router(weapon_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(tag_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
