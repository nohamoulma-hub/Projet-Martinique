# Utilitaires de sécurité : hachage des mots de passe et gestion des tokens JWT.
# On utilise bcrypt directement (passlib 1.7.4 n'est pas compatible avec bcrypt 5.x).
import re
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# Algorithme de signature du token JWT (HS256 = HMAC + SHA-256, standard pour les APIs)
ALGORITHM = "HS256"


# bcrypt refuse tout mot de passe au-dela de 72 octets. Depuis la version 5, il leve
# ValueError au lieu de tronquer : non interceptee, l'erreur remontait en HTTP 500, y
# compris sur la route publique de connexion.
BCRYPT_MAX_OCTETS = 72
MOT_DE_PASSE_MIN_CARACTERES = 8


def erreur_longueur_bcrypt(password: str) -> str | None:
    """Retourne un message si le mot de passe depasse la limite de bcrypt, sinon None.

    Mesure en octets et non en caracteres : une lettre accentuee en occupe deux, un emoji
    quatre. Une contrainte max_length de Pydantic compterait des caracteres et laisserait
    passer des mots de passe trop longs pour bcrypt.
    """
    if len(password.encode("utf-8")) > BCRYPT_MAX_OCTETS:
        return (
            f"Le mot de passe ne doit pas dépasser {BCRYPT_MAX_OCTETS} octets "
            "(environ 70 caractères)."
        )
    return None


def erreur_mot_de_passe(password: str) -> str | None:
    """Retourne le premier manquement aux regles d'un nouveau mot de passe, sinon None.

    Source unique des regles, utilisee par le schema d'inscription et par
    scripts/reset_password.py. Elles doivent rester alignees sur validatePassword()
    dans frontend/js/auth.js, qui ne sert qu'au confort de saisie : seule cette
    verification-ci protege reellement, le navigateur se contournant sans effort.
    """
    if len(password) < MOT_DE_PASSE_MIN_CARACTERES:
        return (
            f"Le mot de passe doit contenir au moins "
            f"{MOT_DE_PASSE_MIN_CARACTERES} caractères."
        )
    trop_long = erreur_longueur_bcrypt(password)
    if trop_long:
        return trop_long
    # Memes classes que les regex du formulaire (/[A-Z]/ et /[0-9]/), volontairement :
    # str.isupper() accepterait "É" et str.isdigit() accepterait "²", et l'API validerait
    # alors des mots de passe que le formulaire refuse.
    if not re.search(r"[A-Z]", password):
        return "Le mot de passe doit contenir au moins une majuscule."
    if not re.search(r"[0-9]", password):
        return "Le mot de passe doit contenir au moins un chiffre."
    return None


def hash_password(plain_password: str) -> str:
    """Retourne le hash bcrypt d'un mot de passe en clair."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hash stocké."""
    # Filet de securite en plus de la validation des schemas : un mot de passe trop long
    # ne peut correspondre a aucun hash, puisque bcrypt a refuse de le hacher. On repond
    # donc "incorrect" plutot que de laisser bcrypt lever une erreur 500.
    if erreur_longueur_bcrypt(plain_password):
        return False
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