# Table pour les projets de voyage pour chaque utilisateur

from sqlalchemy import ForeignKey, Column, Integer, String, Date, Float, DateTime
from app.core.database import Base
from sqlalchemy.sql import func


class TravelProject(Base):
    """ Nouvelle classe pour rassembler les informations du voyage"""
    __tablename__ = "travel_projects"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget = Column(Float, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
