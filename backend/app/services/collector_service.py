# Collecte automatique en arrière-plan : chaque source est relevée à son rythme et le
# résultat est écrit dans le cache, où l'API le lit. Une page vue ne déclenche donc aucun
# appel externe, et le quota gratuit de chaque service est respecté.
import asyncio
import logging
import time

from app.core.database import SessionLocal
from app.models.point_of_interest import Category, PointOfInterest
from app.services import (cache_service, h2s_service, meteo_animation_service, meteo_service,
                          sargasses_service, trajets_service)

logger = logging.getLogger(__name__)

# Nouvel essai après un échec, plutôt que d'attendre l'intervalle complet
RETRY_SECONDS = 300


def _beaches() -> list[dict]:
    """Plages du catalogue, avec leur position."""
    db = SessionLocal()
    try:
        rows = db.query(PointOfInterest).filter(PointOfInterest.category == Category.BEACH).all()
        return [{"id": p.id, "name": p.name, "latitude": p.latitude, "longitude": p.longitude}
                for p in rows]
    finally:
        db.close()


def _activities() -> list[dict]:
    """Toutes les activités du catalogue, avec leur position."""
    db = SessionLocal()
    try:
        return [{"id": p.id, "latitude": p.latitude, "longitude": p.longitude}
                for p in db.query(PointOfInterest).order_by(PointOfInterest.id).all()]
    finally:
        db.close()


# (nom, fichier produit, intervalle en secondes, tâche)
JOBS = [
    ("animation", "meteo/animation.json", 600, meteo_animation_service.refresh_animation),
    ("temperatures", "meteo/temperatures.json", 3600, meteo_service.refresh_temperature_grid),
    ("plages", "meteo/plages.json", 3600, lambda: meteo_service.refresh_beach_conditions(_beaches())),
    ("h2s", "sargasses/h2s.json", 3600, h2s_service.refresh_h2s),
    ("sargasses", "sargasses/etat.json", 6 * 3600, lambda: sargasses_service.refresh_sargasses(_beaches())),
    # Vérifiée chaque heure, mais le serveur d'itinéraires n'est appelé que si une activité
    # a été ajoutée ou déplacée, ou si la matrice a plus d'une semaine
    ("trajets", trajets_service.CACHE_FILE, 3600, lambda: trajets_service.refresh_trajets(_activities())),
]


def _age_seconds(name: str) -> float | None:
    """Âge du fichier produit par une tâche, ou None s'il n'existe pas encore."""
    path = cache_service.cache_path(name)
    return time.time() - path.stat().st_mtime if path.exists() else None


async def _run_job(name: str, output: str, interval: int, task) -> None:
    """Boucle d'une tâche : la lance, puis attend son prochain passage."""
    # Après un simple redémarrage du serveur, un cache encore frais n'est pas recollecté
    age = _age_seconds(output)
    if age is not None and age < interval:
        await asyncio.sleep(interval - age)
    while True:
        try:
            await asyncio.to_thread(task)
            logger.info("Collecte %s terminée", name)
            delay = interval
        except Exception as error:  # une source en panne ne doit jamais arrêter les autres
            logger.warning("Collecte %s en échec, nouvel essai dans %s s : %s", name, RETRY_SECONDS, error)
            delay = RETRY_SECONDS
        await asyncio.sleep(delay)


def start() -> list[asyncio.Task]:
    """Démarre une boucle par source. Appelé au lancement de l'API."""
    return [asyncio.create_task(_run_job(*job), name=f"collecte-{job[0]}") for job in JOBS]


async def stop(tasks: list[asyncio.Task]) -> None:
    """Arrête proprement les boucles à l'arrêt de l'API."""
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
