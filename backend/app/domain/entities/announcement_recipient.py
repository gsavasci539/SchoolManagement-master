from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AnnouncementRecipient(Base):
    __tablename__ = "announcement_recipients"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    announcement_id: Mapped[UUID] = mapped_column(ForeignKey("announcements.id"), nullable=False)
    recipient_type: Mapped[str] = mapped_column(String(50), nullable=False)
    recipient_id: Mapped[UUID] = mapped_column(nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
