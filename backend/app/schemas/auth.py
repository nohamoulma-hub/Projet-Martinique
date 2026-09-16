# Schémas Pydantic pour l'authentification : token JWT retourné après connexion/inscription.
from pydantic import BaseModel, field_validator

from app.core.security import erreur_longueur_bcrypt


class Token(BaseModel):
    """Réponse retournée après une inscription ou connexion réussie."""
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Corps attendu pour la connexion."""
    email: str
    password: str

    # Seule la longueur est controlee ici, pas la complexite : un compte cree avant
    # l'ajout des regles doit pouvoir continuer a se connecter avec son mot de passe.
    # Sans ce controle, un mot de passe de plus de 72 octets faisait lever ValueError
    # a bcrypt, soit une erreur 500 declenchable par n'importe qui, sans compte.
    @field_validator("password")
    @classmethod
    def verifier_longueur(cls, value: str) -> str:
        erreur = erreur_longueur_bcrypt(value)
        if erreur:
            raise ValueError(erreur)
        return value