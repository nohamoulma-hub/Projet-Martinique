# Schémas Pydantic pour l'authentification : token JWT retourné après connexion/inscription.
from pydantic import BaseModel


class Token(BaseModel):
    """Réponse retournée après une inscription ou connexion réussie."""
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Corps attendu pour la connexion."""
    email: str
    password: str