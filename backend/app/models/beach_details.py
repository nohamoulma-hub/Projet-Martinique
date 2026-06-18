# Table des détails de fréquentation et d'équipement des plages

from sqlalchemy import Column, Integer, ForeignKey, Text
from app.core.database import Base

class BeachDetails(Base):
    """nouvelle classe pour donner plus d'information"""
    __tablename__ = "beach_details"
    id = Column(Integer, primary_key=True)

    point_of_interest_id = Column(Integer, ForeignKey("points_of_interest.id"), unique=True, nullable=False)
    # Score pour connaitre le nivea ude fréquentation de 0 à 5
    tourist_score = Column(Integer, nullable=False)
    # aménagement des plages (douches, parking etc)
    amenities = Column(Text, nullable=True) 

