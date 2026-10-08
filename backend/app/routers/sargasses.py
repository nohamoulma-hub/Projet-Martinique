# Endpoints sargasses : risque d'échouement par façade et par plage, nappes au large
# et odeurs (H2S). Les données sont collectées en arrière-plan et lues dans le cache.
from fastapi import APIRouter

from app.schemas.sargasses import BulletinH2S, EtatSargasses, Nappes
from app.services import cache_service

router = APIRouter(prefix="/sargasses", tags=["sargasses"])


@router.get("", response_model=EtatSargasses, summary="Risque d'échouement des sargasses")
def get_etat():
    """Niveau du jour par façade et par plage (NOAA), et niveaux estimés à 4 jours."""
    return cache_service.read_for_api("sargasses/etat.json", "Les données sargasses")


@router.get("/nappes", response_model=Nappes, summary="Nappes de sargasses au large")
def get_nappes():
    """Algues repérées par satellite sur 7 jours, et leur dérive estimée jour par jour."""
    return cache_service.read_for_api("sargasses/nappes.json", "Les nappes de sargasses")


@router.get("/h2s", response_model=BulletinH2S, summary="Odeurs des sargasses (H2S)")
def get_h2s():
    """Dernier bulletin quotidien des capteurs d'hydrogène sulfuré (Madininair)."""
    return cache_service.read_for_api("sargasses/h2s.json", "Les mesures d'odeurs")
