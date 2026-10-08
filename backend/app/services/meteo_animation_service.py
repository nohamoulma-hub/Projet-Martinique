# Animation « Pluie et nuages » des 2 dernières heures : nuages du satellite GOES-East
# (NASA GIBS) et pluie du radar RainViewer, mis en cache sur disque puis servis par l'API.
# Les deux sources sont gratuites et sans clé ; les tuiles ne vont pas au-delà du zoom 7.
import io
import logging
import math
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from PIL import Image

from app.services import cache_service

logger = logging.getLogger(__name__)

ZOOM = 7
# Tuiles qui couvrent l'arc antillais, de la Guadeloupe à Saint-Vincent
TILES_X = range(41, 44)
TILES_Y = range(57, 60)
LAYERS = ("nuages", "radar")

GIBS_TILE = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_GeoColor/default/"
    "{time}/GoogleMapsCompatible_Level7/7/{y}/{x}.png"
)
RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json"
# Palette « Universal Blue », la seule encore proposée par l'offre gratuite
RAINVIEWER_TILE = "{host}{path}/256/7/{x}/{y}/2/1_1.png"

STEP = timedelta(minutes=10)
WINDOW = timedelta(hours=2)
# Les nuages arrivent avec environ 45 min de retard : on garde plus large que le radar
RADAR_KEEP = timedelta(hours=2, minutes=30)
CLOUDS_KEEP = timedelta(hours=3, minutes=30)
# Au-delà, une image de nuages est trop ancienne pour accompagner une image radar
CLOUDS_MAX_LAG = timedelta(minutes=90)

# En-tête en ASCII : les en-têtes HTTP n'acceptent pas les accents
USER_AGENT = {"User-Agent": "ProjetMartinique/1.0 (site touristique, projet etudiant)"}


def sun_elevation(when: datetime, lat: float = 14.64, lon: float = -61.02) -> float:
    """Hauteur approchée du soleil en degrés au-dessus de l'horizon, pour un instant UTC."""
    day = when.timetuple().tm_yday
    angle = math.radians(360 / 365 * (day - 81))
    declination = math.radians(23.44 * math.sin(angle))
    # Équation du temps, en minutes : écart entre l'heure solaire et l'heure moyenne
    equation = 9.87 * math.sin(2 * angle) - 7.53 * math.cos(angle) - 1.5 * math.sin(angle)
    minutes = when.hour * 60 + when.minute + lon * 4 + equation
    hour_angle = math.radians(minutes / 4 - 180)
    lat_r = math.radians(lat)
    sin_elev = (math.sin(lat_r) * math.sin(declination)
                + math.cos(lat_r) * math.cos(declination) * math.cos(hour_angle))
    return math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))


def extract_clouds(png: bytes, elevation: float) -> bytes:
    """Rend transparents la mer et les terres d'une tuile GeoColor, pour ne garder que les nuages.

    Un nuage est clair et peu saturé ; la mer est sombre, la végétation et les lumières
    des villes sont saturées. La nuit, l'image GeoColor est plus sombre : le seuil de
    luminosité s'abaisse selon la hauteur du soleil pour garder un rendu homogène.
    """
    day = min(1.0, max(0.0, (elevation + 4) / 14))
    lum_min = 28 + 34 * day
    lum_span = 85 + 43 * day

    image = Image.open(io.BytesIO(png)).convert("RGB")
    raw = image.tobytes()
    gray, alpha = [], []
    for k in range(0, len(raw), 3):
        r, g, b = raw[k], raw[k + 1], raw[k + 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        top = max(r, g, b)
        saturation = (top - min(r, g, b)) / top if top else 0
        strength = (min(1.0, max(0.0, (lum - lum_min) / lum_span))
                    * min(1.0, max(0.0, 1 - (saturation - 0.12) / 0.30)))
        gray.append(int(min(255, 205 + 50 * strength)))
        alpha.append(int(255 * (strength ** 0.85) * 0.92))

    out = Image.new("LA", image.size)
    out.putdata(list(zip(gray, alpha)))
    buffer = io.BytesIO()
    out.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


def _frame_dir(layer: str, timestamp: int) -> Path:
    """Dossier des 9 tuiles d'une image (nuages ou radar) dans le cache."""
    return cache_service.cache_path("meteo", layer, str(timestamp))


def _has_frame(layer: str, timestamp: int) -> bool:
    """Vrai si les 9 tuiles d'une image sont en cache."""
    folder = _frame_dir(layer, timestamp)
    return all((folder / f"{x}_{y}.png").exists() for x in TILES_X for y in TILES_Y)


def _cached_times(layer: str) -> list[int]:
    """Horodatages complets en cache pour une couche, du plus ancien au plus récent."""
    folder = cache_service.cache_path("meteo", layer)
    if not folder.exists():
        return []
    return sorted(int(p.name) for p in folder.iterdir()
                  if p.name.isdigit() and _has_frame(layer, int(p.name)))


def collect_radar(client: httpx.Client) -> None:
    """Télécharge les images radar des 2 dernières heures qui manquent au cache."""
    index = client.get(RAINVIEWER_INDEX).json()
    for frame in index.get("radar", {}).get("past", []):
        timestamp = int(frame["time"])
        if _has_frame("radar", timestamp):
            continue
        for x in TILES_X:
            for y in TILES_Y:
                url = RAINVIEWER_TILE.format(host=index["host"], path=frame["path"], x=x, y=y)
                response = client.get(url)
                response.raise_for_status()
                cache_service.write_bytes(_frame_dir("radar", timestamp) / f"{x}_{y}.png",
                                          response.content)


def _gibs_complete(client: httpx.Client, iso: str) -> bool:
    """Vrai si les 9 tuiles d'un horaire sont publiées : GIBS les publie une à une."""
    for x in TILES_X:
        for y in TILES_Y:
            if client.head(GIBS_TILE.format(time=iso, x=x, y=y)).status_code != 200:
                return False
    return True


def collect_clouds(client: httpx.Client, now: datetime) -> None:
    """Télécharge et rend transparents les horaires de nuages manquants dans le cache.

    Chaque passage revérifie tous les horaires absents de la fenêtre : la NASA comble
    parfois un trou après coup. Tant qu'un horaire reste incomplet, l'animation montre
    les nuages précédents plutôt qu'une image inventée.
    """
    known = set(_cached_times("nuages"))
    for moment in _steps(now - CLOUDS_KEEP, now):
        if int(moment.timestamp()) in known:
            continue
        iso = moment.strftime("%Y-%m-%dT%H:%M:%SZ")
        # Une seule requête suffit à écarter un horaire pas encore publié
        if client.head(GIBS_TILE.format(time=iso, x=42, y=58)).status_code != 200:
            continue
        if _gibs_complete(client, iso):
            elevation = sun_elevation(moment)
            for x in TILES_X:
                for y in TILES_Y:
                    response = client.get(GIBS_TILE.format(time=iso, x=x, y=y))
                    response.raise_for_status()
                    path = _frame_dir("nuages", int(moment.timestamp())) / f"{x}_{y}.png"
                    cache_service.write_bytes(path, extract_clouds(response.content, elevation))


def _steps(start: datetime, end: datetime):
    """Horaires ronds à 10 minutes compris entre deux instants."""
    moment = start.replace(minute=start.minute - start.minute % 10, second=0, microsecond=0)
    if moment < start:
        moment += STEP
    while moment <= end:
        yield moment
        moment += STEP


def purge(now: datetime) -> None:
    """Supprime les images trop anciennes pour l'animation."""
    for layer, keep in (("radar", RADAR_KEEP), ("nuages", CLOUDS_KEEP)):
        folder = cache_service.cache_path("meteo", layer)
        if not folder.exists():
            continue
        limit = (now - keep).timestamp()
        for child in folder.iterdir():
            if not child.name.isdigit() or int(child.name) < limit:
                shutil.rmtree(child, ignore_errors=True)


def build_index(now: datetime) -> dict:
    """Liste des images de l'animation : chaque image radar avec les nuages les plus proches."""
    radar = [t for t in _cached_times("radar") if t >= (now - WINDOW).timestamp() - 300]
    clouds = _cached_times("nuages")
    frames = []
    for timestamp in radar:
        previous = [c for c in clouds if c <= timestamp]
        cloud = previous[-1] if previous else None
        if cloud is not None and timestamp - cloud > CLOUDS_MAX_LAG.total_seconds():
            cloud = None
        frames.append({"time": timestamp, "radar": True, "clouds": cloud})
    # Radar indisponible : l'animation se rabat sur les nuages seuls
    if not frames:
        frames = [{"time": c, "radar": False, "clouds": c}
                  for c in clouds if c >= (now - WINDOW).timestamp()]
    return {
        "updated_at": now.isoformat(),
        "zoom": ZOOM,
        "tiles": {"x": [TILES_X.start, TILES_X.stop - 1], "y": [TILES_Y.start, TILES_Y.stop - 1]},
        "frames": frames,
    }


def refresh_animation() -> dict:
    """Met à jour le cache de l'animation et son index. Appelé toutes les 10 minutes."""
    now = datetime.now(timezone.utc)
    with httpx.Client(headers=USER_AGENT, timeout=40, follow_redirects=True) as client:
        # Une panne du radar ne doit pas priver la carte des nuages, et inversement
        for name, step in (("radar", lambda: collect_radar(client)),
                           ("nuages", lambda: collect_clouds(client, now))):
            try:
                step()
            except (httpx.HTTPError, ValueError, OSError) as error:
                logger.warning("Collecte %s interrompue : %s", name, error)
    purge(now)
    index = build_index(now)
    cache_service.write_json("meteo/animation.json", index)
    return index


def tile_file(layer: str, timestamp: int, x: int, y: int) -> Path | None:
    """Fichier d'une tuile en cache, ou None si elle n'existe pas ou sort de l'emprise."""
    if layer not in LAYERS or x not in TILES_X or y not in TILES_Y:
        return None
    path = _frame_dir(layer, timestamp) / f"{x}_{y}.png"
    return path if path.exists() else None
