from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_seller
from app.db.session import get_db
from app.models.seller import Seller
from app.schemas.recommendation import (
    MechanicRecommendationRequest,
    MechanicRecommendationResponse,
)
from app.services.recommendation import recommend_mechanic

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/mechanic", response_model=MechanicRecommendationResponse)
def create_mechanic_recommendation(
    payload: MechanicRecommendationRequest,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> MechanicRecommendationResponse:
    return recommend_mechanic(
        db,
        seller=current_seller,
        seller_need=payload.seller_need,
    )
