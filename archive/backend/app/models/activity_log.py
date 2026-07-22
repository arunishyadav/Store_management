import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Enum, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ActionType(str, enum.Enum):
    login = "login"
    logout = "logout"
    material_add = "material_add"
    material_update = "material_update"
    material_delete = "material_delete"
    material_inward = "material_inward"
    material_issue = "material_issue"
    stock_transfer = "stock_transfer"
    password_reset = "password_reset"
    user_create = "user_create"
    user_delete = "user_delete"
    user_update = "user_update"
    location_create = "location_create"
    location_update = "location_update"
    location_delete = "location_delete"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)
    location_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    location_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    action: Mapped[ActionType] = mapped_column(Enum(ActionType), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    device_info: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="activity_logs", lazy="noload")
