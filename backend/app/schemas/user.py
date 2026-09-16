# Schémas Pydantic pour les utilisateurs : inscription, connexion, profil.
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.security import erreur_mot_de_passe
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

    # Les regles n'existaient que dans le formulaire : un appel direct a l'API creait un
    # compte avec un mot de passe vide ou d'un caractere, qui permettait ensuite de se
    # connecter. La validation cote serveur est la seule qui protege reellement.
    @field_validator("password")
    @classmethod
    def verifier_mot_de_passe(cls, value: str) -> str:
        erreur = erreur_mot_de_passe(value)
        if erreur:
            raise ValueError(erreur)
        return value


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