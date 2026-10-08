# Schémas Pydantic des données météo retournées par l'API.
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
    # Champs ajoutés pour la page Météo et l'accueil : facultatifs, pour qu'une source
    # secondaire en panne (température de la mer) n'empêche pas la réponse.
    feels_like: float | None = None
    wind_direction: float | None = None
    wind_direction_label: str | None = None
    pressure: float | None = None
    visibility_km: float | None = None
    uv_index: float | None = None
    uv_index_max: float | None = None
    uv_label: str | None = None
    is_day: bool | None = None
    sunshine_hours: float | None = None
    rain_7d_mm: float | None = None
    sea_temperature: float | None = None
    observed_at: str | None = None


class PeriodeJournee(BaseModel):
    """Résumé d'une tranche horaire (matin, après-midi, soirée)."""
    key: str
    label: str
    weather_code: int
    weather_description: str
    temperature: int
    temperature_min: int
    temperature_max: int
    precipitation_probability: int
    precipitation_mm: float
    wind_speed: int


class PrevisionJour(BaseModel):
    """Prévision d'une journée, avec son détail par tranche horaire."""
    date: str
    weather_code: int
    weather_description: str
    temperature_max: float
    temperature_min: float
    precipitation_probability: int | None
    precipitation_mm: float | None
    uv_index_max: float | None
    sunshine_hours: float
    wind_speed_max: float | None
    periods: list[PeriodeJournee]


class Previsions(BaseModel):
    days: list[PrevisionJour]
    source: str


class ImageAnimation(BaseModel):
    """Une image de l'animation : horodatage radar et nuages associés (secondes UTC)."""
    time: int
    radar: bool
    clouds: int | None


class Animation(BaseModel):
    updated_at: str
    zoom: int
    tiles: dict[str, list[int]]
    frames: list[ImageAnimation]


class GrilleTemperatures(BaseModel):
    """Température et vent relevés sur une grille régulière couvrant l'île."""
    observed_at: str
    south: float
    west: float
    step: float
    rows: int
    cols: int
    temperature: list[float]
    wind_speed: list[float]
    wind_direction: list[float]
    source: str


class ConditionsPlage(BaseModel):
    temperature: float | None
    wind_speed: float | None
    weather_code: int | None
    weather_description: str | None
    uv_index_max: float | None
    wave_height: float | None
    sea_temperature: float | None


class ConditionsPlages(BaseModel):
    """Météo et état de la mer devant chaque plage, par identifiant d'activité."""
    observed_at: str
    beaches: dict[str, ConditionsPlage]
    source: str


class TraitDeCote(BaseModel):
    """Contour de l'île et découpage en façades, pour les cartes."""
    ring: list[tuple[float, float]]
    zones: list[dict]
