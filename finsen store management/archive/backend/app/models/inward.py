import uuid
from datetime import datetime, date, time
from sqlalchemy import String, DateTime, Float, ForeignKey, func, Date, Time, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Inward(Base):
    __tablename__ = "inwards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    supplier_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purchase_order_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    entry_time: Mapped[time] = mapped_column(Time, nullable=False)
    added_by: Mapped[str] = mapped_column(String(50), nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    material: Mapped["Material"] = relationship("Material", back_populates="inwards", lazy="joined")
    location: Mapped["Location"] = relationship("Location", back_populates="inwards", lazy="joined")
