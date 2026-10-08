# Sargasses : niveau de risque d'échouement observé (NOAA, Sargassum Inundation Risk),
# nappes repérées au large par satellite (indice AFAI de l'université de Floride du Sud,
# diffusé par la NOAA) et estimation maison de leur dérive sur 4 jours (courants et vent
# prévus par Open-Meteo). Toutes ces sources sont gratuites, sans clé, et librement
# réutilisables en citant leur auteur.
import io
import logging
import math
import re
import zipfile
from datetime import date, datetime, timedelta, timezone

import httpx

from app.services import cache_service, coastline

logger = logging.getLogger(__name__)

# Échelle de la NOAA (0 à 3), avec les libellés affichés sur le site
LEVELS = ["faible", "vigilance", "modere", "fort"]
LEVEL_LABELS = {"faible": "Faible", "vigilance": "Vigilance", "modere": "Modéré", "fort": "Fort"}

SIR_KMZ = "https://cwcgom.aoml.noaa.gov/SIR/KMZ/sargassum_risk_{day}.kmz"
SIR_PAGE = "https://cwcgom.aoml.noaa.gov/SIR/"
# Indice cumulé sur 7 jours : celui sur 3 jours est trop souvent masqué par les nuages
# (6 % de pixels lisibles le 8 octobre 2026, contre 77 % sur 7 jours)
AFAI_CSV = ("https://cwcgom.aoml.noaa.gov/erddap/griddap/noaa_aoml_atlantic_oceanwatch_AFAI_7D.csv"
            "?AFAI%5B(last)%5D%5B({south}):({north})%5D%5B({west}):({east})%5D")
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

# Emprise autour de l'île (côtes) et zone de mer surveillée (nappes à l'est)
ISLAND_BBOX = (14.35, 14.92, -61.30, -60.75)
SEA_BBOX = (13.8, 15.6, -61.7, -59.0)
# Au-dessus de ce seuil, un pixel de 1,5 km contient des algues flottantes
AFAI_THRESHOLD = 0.0005
# Près des côtes, le signal est faussé par les fonds clairs et les bords de terre
COAST_MARGIN_KM = 3
NEIGHBOUR_ISLANDS = [  # Dominique et Sainte-Lucie, mêmes faux signaux côtiers
    (15.16, 15.68, -61.56, -61.21),
    (13.67, 14.15, -61.11, -60.83),
]

# Grille des courants et du vent pour la dérive : 7 x 10 points, un tous les 0,3 degré
DRIFT_LATS = [round(13.8 + 0.3 * i, 1) for i in range(7)]
DRIFT_LONS = [round(-61.7 + 0.3 * j, 1) for j in range(10)]
DRIFT_DAYS = 4
# Part du vent qui pousse les radeaux en plus du courant (1 à 3 % selon les études)
WINDAGE = 0.015
# Algues échouées par façade et par jour : seuils de l'estimation maison
STRANDING_THRESHOLDS = [(12, "fort"), (4, "modere"), (1, "vigilance")]

USER_AGENT = {"User-Agent": "ProjetMartinique/1.0 (site touristique, projet etudiant)"}
# Heure de la Martinique : UTC-4 toute l'année, sans heure d'été. Les dates des prévisions
# doivent être celles du voyageur, sinon elles glissent d'un jour après 20 h.
MARTINIQUE_TZ = timezone(timedelta(hours=-4))


def _inside(lat: float, lon: float, box: tuple) -> bool:
    """Vrai si le point est dans le rectangle (sud, nord, ouest, est)."""
    south, north, west, east = box
    return south <= lat <= north and west <= lon <= east


def raise_level(level: str, steps: int) -> str:
    """Monte ou baisse un niveau sur l'échelle, sans en sortir."""
    rank = max(0, min(len(LEVELS) - 1, LEVELS.index(level) + steps))
    return LEVELS[rank]


# ---------- Risque observé (NOAA SIR) ----------

def parse_sir_kml(kml: str) -> list[tuple[int, list[tuple[float, float]]]]:
    """Segments de côte de la Martinique avec leur risque (0 à 3), lus dans le KML de la NOAA."""
    segments = []
    for chunk in kml.split("<Placemark")[1:]:
        risk = re.search(r'<SimpleData name="risk">(\d+)</SimpleData>', chunk)
        coords = re.search(r"<coordinates>([^<]+)</coordinates>", chunk)
        if not risk or not coords:
            continue
        points = []
        for pair in coords.group(1).split():
            lon, lat = (float(v) for v in pair.split(",")[:2])
            if _inside(lat, lon, ISLAND_BBOX):
                points.append((lat, lon))
        if points:
            segments.append((min(int(risk.group(1)), 3), points))
    return segments


def fetch_sir(client: httpx.Client, today: date) -> tuple[str, list]:
    """Dernier fichier de risque publié (la NOAA publie avec un jour ou deux de décalage)."""
    for back in range(0, 6):
        day = today - timedelta(days=back)
        response = client.get(SIR_KMZ.format(day=day.strftime("%Y%m%d")))
        if response.status_code != 200 or not response.content.startswith(b"PK"):
            continue
        archive = zipfile.ZipFile(io.BytesIO(response.content))
        name = next(n for n in archive.namelist() if n.endswith(".kml"))
        return day.isoformat(), parse_sir_kml(archive.read(name).decode("utf-8", "replace"))
    raise ValueError("Aucun bulletin de risque NOAA publié ces 6 derniers jours")


def sir_levels(segments: list, beaches: list[dict]) -> tuple[list[dict], dict]:
    """Niveau dominant de chaque façade et niveau devant chaque plage.

    Le niveau d'une façade est celui qui couvre la plus grande longueur de sa côte.
    Une plage prend le niveau du segment le plus proche, à moins de 3 km.
    """
    counts = [[0, 0, 0, 0] for _ in coastline.ZONES]
    points = []
    for risk, segment in segments:
        for lat, lon in segment:
            counts[coastline.nearest_zone(lat, lon)][risk] += 1
            points.append((lat, lon, risk))

    zones = []
    for rank, zone_counts in enumerate(counts):
        total = sum(zone_counts)
        level = LEVELS[zone_counts.index(max(zone_counts))] if total else None
        zones.append({
            "level": level,
            "shares": {LEVELS[r]: round(c / total, 2) for r, c in enumerate(zone_counts)} if total else {},
        })

    beach_levels = {}
    for beach in beaches:
        best, best_d = None, 3.0
        for lat, lon, risk in points:
            d = coastline._flat_km(beach["latitude"], beach["longitude"], lat, lon)
            if d < best_d:
                best, best_d = risk, d
        rank = coastline.nearest_zone(beach["latitude"], beach["longitude"])
        level = LEVELS[best] if best is not None else zones[rank]["level"]
        beach_levels[str(beach["id"])] = {"zone": coastline.ZONES[rank]["id"], "level": level}
    return zones, beach_levels


# ---------- Nappes au large (AFAI) ----------

def _is_false_signal(lat: float, lon: float) -> bool:
    """Pixel sur une île ou trop près d'une côte, où l'indice n'est pas fiable."""
    if any(_inside(lat, lon, box) for box in NEIGHBOUR_ISLANDS):
        return True
    if _inside(lat, lon, (14.30, 14.97, -61.35, -60.70)):
        return coastline.is_on_land(lat, lon) or coastline.nearest_coast(lat, lon)[1] < COAST_MARGIN_KM
    return False


def parse_afai_csv(text: str) -> tuple[str, list[tuple[float, float, float]]]:
    """Date de l'observation et pixels où des algues flottent, hors faux signaux côtiers."""
    observed, pixels = None, []
    for line in text.splitlines()[2:]:
        parts = line.split(",")
        if len(parts) < 4 or parts[3] in ("", "NaN"):
            continue
        value = float(parts[3])
        if value <= AFAI_THRESHOLD:
            continue
        lat, lon = float(parts[1]), float(parts[2])
        if _is_false_signal(lat, lon):
            continue
        observed = parts[0][:10]
        pixels.append((round(lat, 4), round(lon, 4), value))
    return observed, pixels


def fetch_afai(client: httpx.Client) -> tuple[str | None, list]:
    """Télécharge l'indice AFAI sur la zone surveillée et garde les pixels d'algues."""
    south, north, west, east = SEA_BBOX
    response = client.get(AFAI_CSV.format(south=south, north=north, west=west, east=east))
    response.raise_for_status()
    return parse_afai_csv(response.text)


# ---------- Dérive estimée ----------

class DriftField:
    """Vitesse de dérive (km/h vers l'est et vers le nord) heure par heure sur la grille."""

    def __init__(self, east: list, north: list):
        self.east = east    # [heure][ligne][colonne]
        self.north = north

    def at(self, hour: int, lat: float, lon: float) -> tuple[float, float]:
        """Interpolation bilinéaire dans l'espace, heure la plus proche dans le temps."""
        hour = max(0, min(len(self.east) - 1, hour))
        fi = (lat - DRIFT_LATS[0]) / 0.3
        fj = (lon - DRIFT_LONS[0]) / 0.3
        fi = max(0.0, min(len(DRIFT_LATS) - 1.001, fi))
        fj = max(0.0, min(len(DRIFT_LONS) - 1.001, fj))
        i, j = int(fi), int(fj)
        di, dj = fi - i, fj - j

        def blend(grid):
            g = grid[hour]
            return (g[i][j] * (1 - di) * (1 - dj) + g[i + 1][j] * di * (1 - dj)
                    + g[i][j + 1] * (1 - di) * dj + g[i + 1][j + 1] * di * dj)
        return blend(self.east), blend(self.north)


def fetch_drift_field(client: httpx.Client) -> tuple[DriftField, int]:
    """Courants (Météo-France SMOC via Open-Meteo) et vent prévus sur 5 jours.

    Renvoie le champ et l'index de l'heure actuelle dans les séries horaires.
    """
    points = [(la, lo) for la in DRIFT_LATS for lo in DRIFT_LONS]
    common = {"latitude": ",".join(str(p[0]) for p in points),
              "longitude": ",".join(str(p[1]) for p in points),
              "forecast_days": 5, "timezone": "GMT"}
    currents = client.get(MARINE_URL, params={
        **common, "hourly": "ocean_current_velocity,ocean_current_direction"})
    currents.raise_for_status()
    winds = client.get(FORECAST_URL, params={
        **common, "hourly": "wind_speed_10m,wind_direction_10m"})
    winds.raise_for_status()
    currents, winds = currents.json(), winds.json()

    hours = len(winds[0]["hourly"]["time"])
    east = [[[0.0] * len(DRIFT_LONS) for _ in DRIFT_LATS] for _ in range(hours)]
    north = [[[0.0] * len(DRIFT_LONS) for _ in DRIFT_LATS] for _ in range(hours)]
    for k, (c, w) in enumerate(zip(currents, winds)):
        i, j = divmod(k, len(DRIFT_LONS))
        ch, wh = c.get("hourly", {}), w["hourly"]
        for h in range(hours):
            speed = (ch.get("ocean_current_velocity") or [None] * hours)[h]
            heading = (ch.get("ocean_current_direction") or [None] * hours)[h]
            # Le courant est donné « vers » où il va ; le vent « d'où » il vient
            ce = speed * math.sin(math.radians(heading)) if speed is not None and heading is not None else 0.0
            cn = speed * math.cos(math.radians(heading)) if speed is not None and heading is not None else 0.0
            ws, wd = wh["wind_speed_10m"][h] or 0.0, wh["wind_direction_10m"][h] or 0.0
            east[h][i][j] = ce - WINDAGE * ws * math.sin(math.radians(wd))
            north[h][i][j] = cn - WINDAGE * ws * math.cos(math.radians(wd))

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
    times = winds[0]["hourly"]["time"]
    start = times.index(now) if now in times else 0
    return DriftField(east, north), start


def simulate_drift(pixels: list, field: DriftField, start_hour: int) -> dict:
    """Fait avancer chaque pixel d'algues heure par heure pendant 4 jours.

    Un pixel qui touche l'île s'y échoue : il est compté pour la façade la plus proche,
    le jour de son arrivée. Renvoie les échouages par jour et par façade, et la position
    des algues encore en mer à la fin de chaque jour.
    """
    particles = [[lat, lon] for lat, lon, _ in pixels]
    alive = [True] * len(particles)
    stranded = [[0] * len(coastline.ZONES) for _ in range(DRIFT_DAYS)]
    positions = [[] for _ in range(DRIFT_DAYS)]
    south, north, west, east = SEA_BBOX
    for hour in range(DRIFT_DAYS * 24):
        day = hour // 24
        for k, particle in enumerate(particles):
            if not alive[k]:
                continue
            ve, vn = field.at(start_hour + hour, particle[0], particle[1])
            particle[0] += vn / coastline.KM_PER_DEG
            particle[1] += ve / (coastline.KM_PER_DEG * math.cos(math.radians(particle[0])))
            if not (south - 0.5 <= particle[0] <= north + 0.5 and west - 0.5 <= particle[1] <= east + 0.5):
                alive[k] = False
            elif coastline.is_on_land(particle[0], particle[1]):
                stranded[day][coastline.nearest_zone(particle[0], particle[1])] += 1
                alive[k] = False
        if hour % 24 == 23:
            positions[day] = [(round(p[0], 3), round(p[1], 3)) for k, p in enumerate(particles) if alive[k]]
    return {"stranded": stranded, "positions": positions}


def stranding_level(count: int) -> str:
    """Niveau estimé d'une façade selon le nombre de pixels d'algues qui y arrivent."""
    for minimum, level in STRANDING_THRESHOLDS:
        if count >= minimum:
            return level
    return "faible"


def forecast_levels(today_level: str | None, stranded_by_day: list[int]) -> list[str]:
    """Niveaux estimés des 4 prochains jours pour une façade.

    Les algues déjà échouées restent plusieurs jours sur le sable : le niveau du jour
    ne redescend que d'un cran tous les deux jours, sauf si la dérive annonce pire.
    """
    levels = []
    for d, count in enumerate(stranded_by_day, start=1):
        carried = raise_level(today_level, -(d // 2)) if today_level else "faible"
        drifted = stranding_level(count)
        levels.append(max(carried, drifted, key=LEVELS.index))
    return levels


# ---------- Collecte complète ----------

def refresh_sargasses(beaches: list[dict]) -> dict:
    """Collecte risque, nappes et dérive, puis enregistre l'état. Appelé toutes les 6 heures.

    beaches : liste de {"id", "name", "latitude", "longitude"} des plages du catalogue.
    """
    today = datetime.now(MARTINIQUE_TZ).date()
    with httpx.Client(headers=USER_AGENT, timeout=90, follow_redirects=True) as client:
        sir_date, segments = fetch_sir(client, today)
        zone_levels, beach_levels = sir_levels(segments, beaches)

        afai_date, pixels, drift = None, [], None
        try:
            afai_date, pixels = fetch_afai(client)
            field, start = fetch_drift_field(client)
            drift = simulate_drift(pixels, field, start)
        except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
            # Sans nappes ni courants, le niveau du jour reste affiché, sans prévision
            logger.warning("Dérive des sargasses non calculée : %s", error)

    def estimate(level: str | None, rank: int) -> list[dict]:
        """Niveaux estimés des 4 prochains jours, à partir d'un niveau du jour."""
        if not drift:
            return []
        counts = [drift["stranded"][d][rank] for d in range(DRIFT_DAYS)]
        return [{"date": (today + timedelta(days=d)).isoformat(), "level": estimated}
                for d, estimated in enumerate(forecast_levels(level, counts), start=1)]

    zones = []
    for rank, zone in enumerate(coastline.ZONES):
        level = zone_levels[rank]["level"]
        zones.append({**zone, "level": level, "shares": zone_levels[rank]["shares"],
                      "forecast": estimate(level, rank)})

    # Chaque plage part de son propre niveau du jour : une plage moins touchée que sa
    # façade ne doit pas se voir annoncer le niveau de la façade dès le lendemain
    ranks = {zone["id"]: rank for rank, zone in enumerate(coastline.ZONES)}
    for info in beach_levels.values():
        info["forecast"] = estimate(info["level"], ranks[info["zone"]])

    known = [z["level"] for z in zones if z["level"]]
    state = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "risk_date": sir_date,
        "risk_source": "NOAA AOML, Sargassum Inundation Risk",
        "risk_url": SIR_PAGE,
        "forecast_source": "Estimation du site : nappes AFAI (USF/NOAA), courants et vent Open-Meteo",
        "global_level": max(known, key=LEVELS.index) if known else None,
        "levels": [{"id": lv, "label": LEVEL_LABELS[lv]} for lv in LEVELS],
        "zones": zones,
        "beaches": beach_levels,
    }
    cache_service.write_json("sargasses/etat.json", state)

    mats = {
        "updated_at": state["updated_at"],
        "observed_date": afai_date,
        "observed": [[lat, lon] for lat, lon, _ in pixels],
        "days": [{"date": (today + timedelta(days=d + 1)).isoformat(), "positions": drift["positions"][d]}
                 for d in range(DRIFT_DAYS)] if drift else [],
        "source": "AFAI : University of South Florida, diffusé par la NOAA (ERDDAP AOML)",
    }
    cache_service.write_json("sargasses/nappes.json", mats)
    return state


def beach_level(state: dict | None, poi_id: int) -> dict | None:
    """Niveau du jour et estimation à 4 jours d'une plage, lus dans l'état en cache."""
    if not state:
        return None
    beach = state.get("beaches", {}).get(str(poi_id))
    if not beach:
        return None
    zone = next((z for z in state["zones"] if z["id"] == beach["zone"]), None)
    # Estimation propre à la plage, ou celle de sa façade dans un ancien état en cache
    forecast = beach.get("forecast") or (zone["forecast"] if zone else [])
    return {
        "level": beach["level"],
        "label": LEVEL_LABELS.get(beach["level"], "Inconnu") if beach["level"] else "Inconnu",
        "zone": zone["name"] if zone else None,
        "risk_date": state.get("risk_date"),
        "forecast": forecast,
    }
