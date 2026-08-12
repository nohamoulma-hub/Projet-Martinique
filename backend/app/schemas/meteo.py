# Schéma Pydantic pour les données météo retournées par l'API.
from pydantic import BaseModel


class MeteoActuelle(BaseModel):
    """Données météo actuelles pour la Martinique."""
    temperature: float
    temperature_unit: str
    wind_speed: float
    wind_speed_unit: str
    humidity: int
    weather_code: int
    weather_description: str
    latitude: float
    longitude: float
    source: str = "Open-Meteo (open-meteo.com)"