# Temps de trajet en voiture entre les activités du catalogue. La matrice complète est
# calculée en une seule requête par le serveur d'itinéraires OSRM de la FOSSGIS (routes
# OpenStreetMap, gratuit et sans clé), puis gardée dans le cache : la page d'une activité
# ne déclenche aucun appel externe.
import hashlib
import json
import time

import httpx

from app.services import cache_service
from app.services.communes_service import distance_km

CACHE_FILE = "trajets/matrice.json"
ROUTING_URL = "https://routing.openstreetmap.de/routed-car/table/v1/driving/"
# Conditions d'usage de la FOSSGIS : agent utilisateur explicite, pas d'usage intensif
USER_AGENT = "Projet-Martinique (site touristique, usage non commercial)"
# Les routes changent peu : une matrice de moins d'une semaine reste valable
MAX_AGE_SECONDS = 7 * 24 * 3600


def signature(points: list[dict]) -> str:
    """Empreinte des activités et de leurs positions, pour savoir si la matrice est à refaire."""
    data = sorted((p["id"], round(p["latitude"], 5), round(p["longitude"], 5)) for p in points)
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def fetch_matrix(points: list[dict]) -> dict:
    """Durées (min) et distances (km) par la route entre toutes les activités."""
    coords = ";".join(f"{p['longitude']},{p['latitude']}" for p in points)
    response = httpx.get(ROUTING_URL + coords, params={"annotations": "duration,distance"},
                         headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    data = response.json()
    if data.get("code") != "Ok":
        raise RuntimeError(f"Calcul d'itinéraires refusé : {data.get('code')}")
    # Une case vide (null) signifie qu'aucune route ne relie les deux points
    return {
        "ids": [p["id"] for p in points],
        "durations_min": [[None if v is None else round(v / 60) for v in row] for row in data["durations"]],
        "distances_km": [[None if v is None else round(v / 1000, 1) for v in row] for row in data["distances"]],
    }


def refresh_trajets(points: list[dict]) -> None:
    """Recalcule la matrice si les activités ont bougé ou si elle a plus d'une semaine."""
    current = cache_service.read_json(CACHE_FILE)
    sig = signature(points)
    if current and current.get("signature") == sig and time.time() - current.get("generated_at", 0) < MAX_AGE_SECONDS:
        return
    matrix = fetch_matrix(points)
    matrix.update(signature=sig, generated_at=time.time(),
                  positions={str(p["id"]): [p["latitude"], p["longitude"]] for p in points})
    cache_service.write_json(CACHE_FILE, matrix)


def _road_trip(matrix: dict | None, origin: dict, target: dict) -> tuple[float, int] | None:
    """Distance et durée par la route, si la matrice connaît les deux points à leur position actuelle."""
    if not matrix:
        return None
    positions = matrix.get("positions", {})
    for p in (origin, target):
        if positions.get(str(p["id"])) != [p["latitude"], p["longitude"]]:
            return None
    ids = matrix["ids"]
    i, j = ids.index(origin["id"]), ids.index(target["id"])
    duration, distance = matrix["durations_min"][i][j], matrix["distances_km"][i][j]
    if duration is None or distance is None:
        return None
    return distance, duration


def nearby(origin: dict, points: list[dict], limit: int) -> list[dict]:
    """Activités les plus proches de l'origine, en temps de route quand il est connu.

    Sans matrice à jour (première collecte pas encore faite, activité déplacée), on se
    rabat sur la distance à vol d'oiseau, sans temps de trajet.
    """
    matrix = cache_service.read_json(CACHE_FILE)
    results = []
    for target in points:
        if target["id"] == origin["id"]:
            continue
        trip = _road_trip(matrix, origin, target)
        if trip:
            results.append({**target, "distance_km": trip[0], "duree_min": trip[1], "par_la_route": True})
        else:
            straight = distance_km(origin["latitude"], origin["longitude"], target["latitude"], target["longitude"])
            results.append({**target, "distance_km": round(straight, 1), "duree_min": None, "par_la_route": False})
    # Le temps de route ordonne mieux qu'une distance à vol d'oiseau (une baie à traverser,
    # une route de montagne). Les points sans durée passent après, par distance.
    results.sort(key=lambda r: (r["duree_min"] is None, r["duree_min"] or 0, r["distance_km"]))
    return results[:limit]
