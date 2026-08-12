# Service météo : appel à l'API Open-Meteo (gratuite, sans clé) pour la Martinique.
# Open-Meteo : https://open-meteo.com/ - données basées sur ECMWF, couverture mondiale.
import httpx

# Coordonnées GPS de Fort-de-France, Martinique
MARTINIQUE_LAT = 14.6037
MARTINIQUE_LON = -61.0686

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


def get_meteo_martinique() -> dict:
    """Appelle Open-Meteo et retourne les données météo actuelles pour Fort-de-France."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": MARTINIQUE_LAT,
        "longitude": MARTINIQUE_LON,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "timezone": "America/Martinique",
    }
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    current = data["current"]
    units = data["current_units"]
    weather_code = int(current["weather_code"])

    return {
        "temperature": current["temperature_2m"],
        "temperature_unit": units["temperature_2m"],
        "wind_speed": current["wind_speed_10m"],
        "wind_speed_unit": units["wind_speed_10m"],
        "humidity": current["relative_humidity_2m"],
        "weather_code": weather_code,
        "weather_description": WMO_DESCRIPTIONS.get(weather_code, "Conditions inconnues"),
        "latitude": MARTINIQUE_LAT,
        "longitude": MARTINIQUE_LON,
        "source": "Open-Meteo (open-meteo.com)",
    }