# Utilitaires de sécurité : hachage des mots de passe et gestion des tokens JWT.
# On utilise bcrypt directement (passlib 1.7.4 n'est pas compatible avec bcrypt 5.x).
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# Algorithme de signature du token JWT (HS256 = HMAC + SHA-256, standard pour les APIs)
ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    """Retourne le hash bcrypt d'un mot de passe en clair."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hash stocké."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    """Crée un token JWT signé avec une expiration de 24h."""
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Décode un token JWT et retourne le payload, ou None si invalide/expiré."""
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None