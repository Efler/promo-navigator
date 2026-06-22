from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RecommendationResultType = Literal["recommendation", "clarification_required"]
RecommendationMechanicCode = Literal[
    "promotions",
    "promocodes",
    "bundles",
    "none",
]


class MechanicRecommendationRequest(BaseModel):
    seller_need: str = Field(min_length=10, max_length=1000)

    @field_validator("seller_need")
    @classmethod
    def normalize_seller_need(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 10:
            raise ValueError("Seller need must contain at least 10 characters.")
        return normalized


class MechanicRecommendationResponse(BaseModel):
    result_type: RecommendationResultType
    mechanic_code: RecommendationMechanicCode
    message: str


class OllamaRecommendationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    result_type: RecommendationResultType
    mechanic_code: RecommendationMechanicCode
    message: str = Field(max_length=240)
