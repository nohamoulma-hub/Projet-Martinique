# Table des points d'intérêts
import enum
from sqlalchemy import Column, DateTime, Enum, Integer, String, Text, Float
from app.core.database import Base
from sqlalchemy.sql import func



class Category(str, enum.Enum):
    """Catégories d'activitée"""
    BEACH = "beach"
    HIKE = "hike"
    RUM_DISTILLERY = "rum_distillery"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    EVENT = "event"
    ACCOMMODATION = "accommodation" # équipement


class PointOfInterest(Base):
    __tablename__ = "points_of_interest"

    id = Column(Integer, primary_key=True)

    name = Column(String(200), nullable=False)
    category = Column(Enum(Category), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(150), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

