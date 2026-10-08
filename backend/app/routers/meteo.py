# Endpoints météo : conditions actuelles et prévisions (Open-Meteo), carte animée
# (nuages GOES-East et radar RainViewer), grille des températures et météo des plages.
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.schemas.meteo import (Animation, ConditionsPlages, GrilleTemperatures, MeteoActuelle,
                               Previsions, TraitDeCote)
from app.services import cache_service, coastline, meteo_animation_service
from app.services.meteo_service import get_forecast, get_meteo_martinique

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


@router.get("/previsions", response_model=Previsions, summary="Prévisions sur 7 jours")
def get_previsions():
    """Prévisions à Fort-de-France sur 7 jours, détaillées en matin, après-midi et soirée."""
    try:
        return get_forecast()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prévisions météo temporairement indisponibles",
        )


@router.get("/animation", response_model=Animation, summary="Images de la carte Pluie et nuages")
def get_animation():
    """Liste des images des 2 dernières heures : radar et nuages associés."""
    return cache_service.read_for_api("meteo/animation.json", "Les images satellite et radar")


@router.get("/tuiles/{couche}/{horodatage}/{z}/{x}/{y}.png", summary="Tuile de nuages ou de radar")
def get_tuile(couche: str, horodatage: int, z: int, x: int, y: int):
    """Tuile en cache d'une image de l'animation (nuages ou radar, zoom 7 uniquement)."""
    chemin = meteo_animation_service.tile_file(couche, horodatage, x, y) if z == 7 else None
    if chemin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tuile introuvable")
    # Une tuile horodatée ne change jamais : le navigateur peut la garder
    return FileResponse(chemin, media_type="image/png",
                        headers={"Cache-Control": "public, max-age=86400, immutable"})


@router.get("/temperatures", response_model=GrilleTemperatures, summary="Grille des températures")
def get_temperatures():
    """Température et vent sur une grille couvrant l'île, relevés toutes les heures."""
    return cache_service.read_for_api("meteo/temperatures.json", "Les températures")


@router.get("/plages", response_model=ConditionsPlages, summary="Météo et mer devant les plages")
def get_conditions_plages():
    """Température, vent, UV, houle et température de l'eau devant chaque plage du catalogue."""
    return cache_service.read_for_api("meteo/plages.json", "Les conditions des plages")


@router.get("/cote", response_model=TraitDeCote, summary="Contour de l'île et façades")
def get_cote():
    """Trait de côte (OpenStreetMap) et découpage en 6 façades, pour dessiner les cartes."""
    zones = [{**zone, "start": start} for zone, start in zip(coastline.ZONES, coastline.ZONE_STARTS)]
    return {"ring": coastline.COAST_RING, "zones": zones}
