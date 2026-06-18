# Table des comptes utilisateurs.
import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class AgeRange(str, enum.Enum):
    """Tranches d'âge fixes proposées à l'inscription."""
    UNDER_18 = "-18"
    R18_25 = "18-25"
    R26_35 = "26-35"
    R36_50 = "36-50"
    R51_65 = "51-65"
    OVER_65 = "65+"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    last_name = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)

    # Sert à la fois de login et de contact (décision prise avec l'utilisateur).
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    nationality = Column(String(100), nullable=False)
    age_range = Column(Enum(AgeRange), nullable=False)

    # server_default=func.now() : la date est posée par la base elle-même à la création,
    # pas par le code Python (plus fiable, fonctionne même via une requête SQL directe).
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
