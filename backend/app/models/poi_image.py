# Modèle pour les photos associées à un point d'intérêt (galerie).
from sqlalchemy import Column, ForeignKey, Integer, String

from app.core.database import Base


class PoiImage(Base):
    __tablename__ = "poi_images"

    id = Column(Integer, primary_key=True, index=True)
    poi_id = Column(
        Integer,
        ForeignKey("points_of_interest.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url = Column(String(500), nullable=False)
    order = Column(Integer, default=0)