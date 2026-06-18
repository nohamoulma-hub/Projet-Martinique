# Table des informations sur les randonnées

from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base

class HikeDetails(Base):
    """ Nouvelle table pour les détails des randonnées """

    __tablename__ = "hike_details"
    id = Column(Integer, primary_key=True)

    point_of_interest_id = Column(Integer, ForeignKey("points_of_interest.id"), unique=True, nullable=False)
    
    difficulty = Column(String(50), nullable=True)
    # dénivelé positif
    elevation_gain = Column(Integer, nullable=True)
    # dénivelé négatif
    elevation_loss = Column(Integer, nullable=True)
    # durée en minute
    duration = Column(Integer, nullable=True)
