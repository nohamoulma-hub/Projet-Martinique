# Schémas Pydantic pour les projets de voyage et leurs items.
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.point_of_interest import PointOfInterestRead


class TravelProjectItemCreate(BaseModel):
    """Corps attendu pour ajouter une activité à un projet."""
    activity_id: int
    day_number: int | None = None


class TravelProjectItemRead(BaseModel):
    """Item retourné dans le détail d'un projet (activité du catalogue)."""
    id: int
    activity_id: int
    day_number: int | None
    activity: PointOfInterestRead

    model_config = ConfigDict(from_attributes=True)


class TravelProjectCreate(BaseModel):
    """Corps attendu pour créer un projet de voyage."""
    name: str
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None


class TravelProjectUpdate(BaseModel):
    """Corps attendu pour modifier un projet (tous les champs sont optionnels)."""
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None


class TravelProjectRead(BaseModel):
    """Projet de voyage retourné par l'API."""
    id: int
    name: str
    start_date: date | None
    end_date: date | None
    budget: float | None
    created_at: datetime
    items: list[TravelProjectItemRead] = []

    model_config = ConfigDict(from_attributes=True)