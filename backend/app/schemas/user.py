# Schémas Pydantic pour les utilisateurs : inscription, connexion, profil.
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import AgeRange


class UserCreate(BaseModel):
    """Corps attendu pour l'inscription d'un nouvel utilisateur."""
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    # Champs optionnels : valeurs par défaut si non fournis à l'inscription
    nationality: str = "Non renseignée"
    age_range: AgeRange = AgeRange.R26_35


class UserUpdate(BaseModel):
    """Corps attendu pour la modification du profil (tous les champs sont optionnels)."""
    first_name: str | None = None
    last_name: str | None = None
    nationality: str | None = None
    age_range: AgeRange | None = None


class UserRead(BaseModel):
    """Profil utilisateur retourné par l'API (sans mot de passe)."""
    id: int
    first_name: str
    last_name: str
    email: str
    nationality: str
    age_range: AgeRange
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)