# Définit la forme des données que l'API reçoit et renvoie pour un point d'intérêt.
from datetime import datetime

from pydantic import BaseModel, ConfigDict

# On réutilise l'Enum du modèle pour ne pas redéfinir les catégories ailleurs.
from app.models.point_of_interest import Category


class BeachDetailsRead(BaseModel):
    """Informations spécifiques à une plage."""
    tourist_score: int
    amenities: str | None

    model_config = ConfigDict(from_attributes=True)


class HikeDetailsRead(BaseModel):
    """Informations spécifiques à une randonnée."""
    difficulty: str | None
    elevation_gain: int | None
    elevation_loss: int | None
    duration: int | None

    model_config = ConfigDict(from_attributes=True)


# Champs communs à la création et à la lecture, pour éviter de les répéter.
class PointOfInterestBase(BaseModel):
    name: str
    category: Category
    description: str | None = None
    latitude: float
    longitude: float
    address: str | None = None


# Ce qu'un client doit envoyer pour créer un point d'intérêt (POST).
# Pas d'id ni de date : c'est la base qui les génère.
class PointOfInterestCreate(PointOfInterestBase):
    pass


# Ce que l'API renvoie : les mêmes champs + id et date de création.
class PointOfInterestRead(PointOfInterestBase):
    id: int
    created_at: datetime

    # Permet de créer ce schéma directement depuis un objet SQLAlchemy.
    model_config = ConfigDict(from_attributes=True)


class PointOfInterestDetail(PointOfInterestRead):
    """Détail complet : inclut les informations spécifiques à la catégorie."""
    beach_details: BeachDetailsRead | None = None
    hike_details: HikeDetailsRead | None = None