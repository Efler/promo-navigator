from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bundle import Bundle
    from app.models.promocode import Promocode
    from app.models.product import Product
    from app.models.refresh_session import RefreshSession


class Seller(TimestampMixin, Base):
    __tablename__ = "sellers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    seller_sid: Mapped[UUID | None] = mapped_column(
        Uuid(),
        unique=True,
        default=uuid4,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    products: Mapped[list["Product"]] = relationship(
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    promocodes: Mapped[list["Promocode"]] = relationship(
        back_populates="seller",
        cascade="all, delete-orphan",
    )
    bundles: Mapped[list["Bundle"]] = relationship(
        back_populates="seller",
        cascade="all, delete-orphan",
    )
