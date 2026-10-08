# Stockage sur disque des données collectées en arrière-plan (images et JSON).
# Les écritures passent par un fichier temporaire renommé : un lecteur ne voit jamais
# un fichier à moitié écrit, même si la collecte tourne pendant une requête.
import json
import os
import tempfile
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import settings


def cache_path(*parts: str) -> Path:
    """Chemin d'un fichier ou dossier du cache, sans le créer."""
    return Path(settings.cache_dir).joinpath(*parts)


def write_bytes(path: Path, data: bytes) -> None:
    """Écrit un fichier binaire de façon atomique, en créant les dossiers manquants."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    with os.fdopen(descriptor, "wb") as handle:
        handle.write(data)
    os.replace(temporary, path)


def write_json(name: str, data: dict) -> None:
    """Enregistre un document JSON du cache (ex. « sargasses/etat.json »)."""
    write_bytes(cache_path(name), json.dumps(data, ensure_ascii=False).encode("utf-8"))


def read_json(name: str) -> dict | None:
    """Lit un document JSON du cache, ou None s'il n'a pas encore été collecté."""
    path = cache_path(name)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def read_for_api(name: str, label: str) -> dict:
    """Document collecté pour une route, ou erreur 503 tant que la première collecte manque.

    label : sujet au pluriel affiché dans le message (ex. « Les températures »).
    """
    data = read_json(name)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{label} ne sont pas encore disponibles. Réessayez dans quelques minutes.",
        )
    return data
