from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.bundles.router import router as bundles_router
from app.modules.products.router import router as products_router
from app.modules.promocodes.router import router as promocodes_router
from app.modules.promotions.router import router as promotions_router
from app.modules.recommendations.router import router as recommendations_router
from app.modules.sellers.router import router as sellers_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(sellers_router)
api_router.include_router(products_router)
api_router.include_router(promocodes_router)
api_router.include_router(bundles_router)
api_router.include_router(promotions_router)
api_router.include_router(recommendations_router)
