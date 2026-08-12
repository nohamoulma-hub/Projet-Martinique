# Endpoint météo : retourne les conditions actuelles à Fort-de-France via Open-Meteo.
from fastapi import APIRouter, HTTPException, status

from app.schemas.meteo import MeteoActuelle
from app.services.meteo_service import get_meteo_martinique

router = APIRouter(prefix="/meteo", tags=["meteo"])


@router.get("", response_model=MeteoActuelle, summary="Météo actuelle en Martinique")
def get_meteo():
    """Retourne les données météo en temps réel pour Fort-de-France (Open-Meteo)."""
    try:
        return get_meteo_martinique()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service météo temporairement indisponible",
        )