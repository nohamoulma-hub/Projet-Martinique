# Service météo : appels à Open-Meteo (gratuit, sans clé, usage non commercial) pour la Martinique.
# Open-Meteo : https://open-meteo.com/ - données sous licence CC BY 4.0, à créditer sur le site.
import time
from datetime import datetime

import httpx

from app.services import cache_service

# Coordonnées GPS de Fort-de-France, Martinique
MARTINIQUE_LAT = 14.6037
MARTINIQUE_LON = -61.0686
# Point en mer devant Fort-de-France, pour la température de l'eau
SEA_LAT, SEA_LON = 14.58, -61.12

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
TIMEZONE = "America/Martinique"
SOURCE = "Open-Meteo (open-meteo.com)"

# Grille de la carte des températures : 14 x 12 points, un tous les 0,04 degré (~4 km).
# Assez fine pour suivre le relief, assez petite pour rester loin du quota gratuit.
GRID_SOUTH, GRID_WEST, GRID_STEP = 14.38, -61.24, 0.04
GRID_ROWS, GRID_COLS = 14, 12

# Tranches horaires du détail d'une journée de prévision
PERIODS = [("matin", "Matin", 6, 12), ("apres-midi", "Après-midi", 12, 18), ("soiree", "Soirée", 18, 24)]

# Correspondance codes WMO -> description lisible (sous-ensemble pertinent pour la Martinique)
WMO_DESCRIPTIONS: dict[int, str] = {
    0: "Ciel dégagé",
    1: "Principalement dégagé",
    2: "Partiellement nuageux",
    3: "Couvert",
    45: "Brouillard",
    48: "Brouillard givrant",
    51: "Bruine légère",
    53: "Bruine modérée",
    55: "Bruine dense",
    61: "Pluie légère",
    63: "Pluie modérée",
    65: "Pluie forte",
    80: "Averses légères",
    81: "Averses modérées",
    82: "Averses violentes",
    95: "Orage",
    96: "Orage avec grêle",
    99: "Orage violent avec grêle",
}

# Résultats récents gardés en mémoire : une page vue cent fois ne coûte qu'un appel
_memory: dict[str, tuple[float, dict]] = {}


def _remember(key: str, ttl: int, compute) -> dict:
    """Renvoie la valeur en mémoire si elle a moins de ttl secondes, sinon la recalcule."""
    now = time.monotonic()
    if key in _memory and _memory[key][0] > now:
        return _memory[key][1]
    value = compute()
    _memory[key] = (now + ttl, value)
    return value


def _get(url: str, params: dict) -> dict | list:
    """Appel GET à Open-Meteo ; lève une erreur si le service répond mal."""
    with httpx.Client(timeout=15.0) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        return response.json()


def describe(code: int) -> str:
    """Description française d'un code météo WMO."""
    return WMO_DESCRIPTIONS.get(code, "Conditions inconnues")


def compass(degrees: float) -> str:
    """Point cardinal (8 directions) d'où vient le vent."""
    return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][round(degrees / 45) % 8]


def uv_label(index: float) -> str:
    """Catégorie de l'indice UV selon l'échelle de l'OMS."""
    if index < 3:
        return "faible"
    if index < 6:
        return "modéré"
    if index < 8:
        return "élevé"
    if index < 11:
        return "très élevé"
    return "extrême"


def _fetch_current() -> dict:
    """Interroge Open-Meteo pour la météo actuelle, les cumuls du jour et la mer."""
    data = _get(FORECAST_URL, {
        "latitude": MARTINIQUE_LAT,
        "longitude": MARTINIQUE_LON,
        "current": ("temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,"
                    "wind_direction_10m,weather_code,surface_pressure,visibility,uv_index,is_day"),
        "daily": "uv_index_max,sunshine_duration,precipitation_sum",
        "past_days": 6,
        "forecast_days": 1,
        "timezone": TIMEZONE,
    })
    current = data["current"]
    units = data["current_units"]
    daily = data["daily"]
    weather_code = int(current["weather_code"])

    sea_temperature = None
    try:
        marine = _get(MARINE_URL, {"latitude": SEA_LAT, "longitude": SEA_LON,
                                   "current": "sea_surface_temperature", "timezone": TIMEZONE})
        sea_temperature = marine["current"]["sea_surface_temperature"]
    except (httpx.HTTPError, KeyError, ValueError):
        # La température de l'eau est un complément : son absence ne bloque pas la météo
        pass

    uv_max = daily["uv_index_max"][-1]
    return {
        "temperature": current["temperature_2m"],
        "temperature_unit": units["temperature_2m"],
        "feels_like": current["apparent_temperature"],
        "wind_speed": current["wind_speed_10m"],
        "wind_speed_unit": units["wind_speed_10m"],
        "wind_direction": current["wind_direction_10m"],
        "wind_direction_label": compass(current["wind_direction_10m"]),
        "humidity": current["relative_humidity_2m"],
        "pressure": current["surface_pressure"],
        "visibility_km": round(current["visibility"] / 1000, 1),
        "uv_index": current["uv_index"],
        "uv_index_max": uv_max,
        "uv_label": uv_label(uv_max or 0),
        "is_day": bool(current["is_day"]),
        "sunshine_hours": round((daily["sunshine_duration"][-1] or 0) / 3600, 1),
        # Pluie des 7 derniers jours, aujourd'hui compris
        "rain_7d_mm": round(sum(v or 0 for v in daily["precipitation_sum"]), 1),
        "sea_temperature": sea_temperature,
        "weather_code": weather_code,
        "weather_description": describe(weather_code),
        "observed_at": current["time"],
        "latitude": MARTINIQUE_LAT,
        "longitude": MARTINIQUE_LON,
        "source": SOURCE,
    }


def get_meteo_martinique() -> dict:
    """Météo actuelle à Fort-de-France, avec température de la mer, UV et cumuls du jour."""
    return _remember("current", 600, _fetch_current)


def _period_summary(hours: list[dict]) -> dict:
    """Résumé d'une tranche horaire : temps le plus marquant, températures, pluie, vent."""
    code = max(h["weather_code"] for h in hours)
    temperatures = [h["temperature"] for h in hours]
    return {
        "weather_code": code,
        "weather_description": describe(code),
        "temperature": round(sum(temperatures) / len(temperatures)),
        "temperature_min": round(min(temperatures)),
        "temperature_max": round(max(temperatures)),
        "precipitation_probability": max(h["precipitation_probability"] or 0 for h in hours),
        "precipitation_mm": round(sum(h["precipitation"] or 0 for h in hours), 1),
        "wind_speed": round(sum(h["wind_speed"] for h in hours) / len(hours)),
    }


def _fetch_forecast() -> dict:
    """Interroge Open-Meteo pour 7 jours et regroupe les heures par tranche."""
    data = _get(FORECAST_URL, {
        "latitude": MARTINIQUE_LAT,
        "longitude": MARTINIQUE_LON,
        "daily": ("weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
                  "precipitation_sum,uv_index_max,sunshine_duration,wind_speed_10m_max"),
        "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
        "forecast_days": 7,
        "timezone": TIMEZONE,
    })
    hourly = data["hourly"]
    by_day: dict[str, list[dict]] = {}
    for i, moment in enumerate(hourly["time"]):
        by_day.setdefault(moment[:10], []).append({
            "hour": int(moment[11:13]),
            "temperature": hourly["temperature_2m"][i],
            "precipitation_probability": hourly["precipitation_probability"][i],
            "precipitation": hourly["precipitation"][i],
            "weather_code": int(hourly["weather_code"][i]),
            "wind_speed": hourly["wind_speed_10m"][i],
        })

    daily = data["daily"]
    days = []
    for i, date in enumerate(daily["time"]):
        code = int(daily["weather_code"][i])
        periods = []
        for key, label, start, end in PERIODS:
            hours = [h for h in by_day.get(date, []) if start <= h["hour"] < end]
            if hours:
                periods.append({"key": key, "label": label, **_period_summary(hours)})
        days.append({
            "date": date,
            "weather_code": code,
            "weather_description": describe(code),
            "temperature_max": daily["temperature_2m_max"][i],
            "temperature_min": daily["temperature_2m_min"][i],
            "precipitation_probability": daily["precipitation_probability_max"][i],
            "precipitation_mm": daily["precipitation_sum"][i],
            "uv_index_max": daily["uv_index_max"][i],
            "sunshine_hours": round((daily["sunshine_duration"][i] or 0) / 3600, 1),
            "wind_speed_max": daily["wind_speed_10m_max"][i],
            "periods": periods,
        })
    return {"days": days, "source": SOURCE}


def get_forecast() -> dict:
    """Prévisions sur 7 jours à Fort-de-France, détaillées en matin, après-midi et soirée."""
    return _remember("forecast", 1800, _fetch_forecast)


def grid_points() -> list[tuple[float, float]]:
    """Points de la grille des températures, ligne par ligne du sud vers le nord."""
    return [(round(GRID_SOUTH + GRID_STEP * i, 3), round(GRID_WEST + GRID_STEP * j, 3))
            for i in range(GRID_ROWS) for j in range(GRID_COLS)]


def refresh_temperature_grid() -> dict:
    """Relève la température et le vent sur toute la grille. Appelé toutes les heures."""
    points = grid_points()
    data = _get(FORECAST_URL, {
        "latitude": ",".join(str(p[0]) for p in points),
        "longitude": ",".join(str(p[1]) for p in points),
        "current": "temperature_2m,wind_speed_10m,wind_direction_10m",
        "timezone": TIMEZONE,
    })
    grid = {
        "observed_at": data[0]["current"]["time"],
        "south": GRID_SOUTH, "west": GRID_WEST, "step": GRID_STEP,
        "rows": GRID_ROWS, "cols": GRID_COLS,
        # Altitude réelle de chaque point : Open-Meteo corrige la température avec le relief
        "temperature": [d["current"]["temperature_2m"] for d in data],
        "wind_speed": [d["current"]["wind_speed_10m"] for d in data],
        "wind_direction": [d["current"]["wind_direction_10m"] for d in data],
        "source": SOURCE,
    }
    cache_service.write_json("meteo/temperatures.json", grid)
    return grid


def refresh_beach_conditions(beaches: list[dict]) -> dict:
    """Relève la météo et l'état de la mer devant chaque plage. Appelé toutes les heures.

    beaches : liste de {"id", "latitude", "longitude"} issue du catalogue.
    """
    if not beaches:
        return {"beaches": {}}
    lats = ",".join(str(b["latitude"]) for b in beaches)
    lons = ",".join(str(b["longitude"]) for b in beaches)
    weather = _get(FORECAST_URL, {
        "latitude": lats, "longitude": lons, "timezone": TIMEZONE,
        "current": "temperature_2m,wind_speed_10m,weather_code,uv_index",
        "daily": "uv_index_max", "forecast_days": 1,
    })
    marine = _get(MARINE_URL, {"latitude": lats, "longitude": lons, "timezone": TIMEZONE,
                               "current": "wave_height,sea_surface_temperature"})
    # Une seule position renvoie un objet et non une liste
    if isinstance(weather, dict):
        weather, marine = [weather], [marine]

    conditions = {}
    for beach, w, m in zip(beaches, weather, marine):
        code = int(w["current"]["weather_code"])
        conditions[str(beach["id"])] = {
            "temperature": w["current"]["temperature_2m"],
            "wind_speed": w["current"]["wind_speed_10m"],
            "weather_code": code,
            "weather_description": describe(code),
            "uv_index_max": w["daily"]["uv_index_max"][0],
            "wave_height": m.get("current", {}).get("wave_height"),
            "sea_temperature": m.get("current", {}).get("sea_surface_temperature"),
        }
    result = {"observed_at": datetime.now().isoformat(timespec="minutes"),
              "beaches": conditions, "source": SOURCE}
    cache_service.write_json("meteo/plages.json", result)
    return result
