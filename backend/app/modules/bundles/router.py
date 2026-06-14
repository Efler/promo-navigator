from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_seller
from app.db.session import get_db
from app.models.seller import Seller
from app.schemas.bundle import BundleCreate, BundleCreateResponse, BundleListItem
from app.services.bundle import create_bundle, list_seller_bundles

router = APIRouter(prefix="/bundles", tags=["bundles"])


@router.get("", response_model=list[BundleListItem])
def list_bundles(
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> list[BundleListItem]:
    return list_seller_bundles(db, seller=current_seller)


@router.post("", response_model=BundleCreateResponse, status_code=status.HTTP_201_CREATED)
def create_bundle_route(
    payload: BundleCreate,
    current_seller: Seller = Depends(get_current_seller),
    db: Session = Depends(get_db),
) -> BundleCreateResponse:
    bundle = create_bundle(db, seller=current_seller, payload=payload)
    return BundleCreateResponse(
        message="Bundle created.",
        bundle=bundle,
    )
