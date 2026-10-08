# Schémas Pydantic des données sargasses : risque d'échouement, nappes au large et H2S.
from pydantic import BaseModel


class PrevisionFacade(BaseModel):
    date: str
    level: str


class Facade(BaseModel):
    """Une façade de côte, son niveau du jour (NOAA) et ses niveaux estimés à 4 jours."""
    id: str
    name: str
    coast: str
    beaches: str
    label: list
    level: str | None
    shares: dict[str, float]
    forecast: list[PrevisionFacade]


class NiveauPlage(BaseModel):
    """Niveau du jour devant une plage, et son estimation à 4 jours."""
    zone: str
    level: str | None
    forecast: list[PrevisionFacade] = []


class Niveau(BaseModel):
    id: str
    label: str


class EtatSargasses(BaseModel):
    updated_at: str
    risk_date: str
    risk_source: str
    risk_url: str
    forecast_source: str
    global_level: str | None
    levels: list[Niveau]
    zones: list[Facade]
    beaches: dict[str, NiveauPlage]


class JourDerive(BaseModel):
    date: str
    positions: list[tuple[float, float]]


class Nappes(BaseModel):
    """Algues repérées au large par satellite, et leur position estimée jour après jour."""
    updated_at: str
    observed_date: str | None
    observed: list[tuple[float, float]]
    days: list[JourDerive]
    source: str


class Seuil(BaseModel):
    id: str
    label: str
    min: float
    max: float | None
    color: str
    message: str


class Capteur(BaseModel):
    id: int
    name: str
    commune: str
    network: str | None
    value_ppm: float
    below_detection: bool
    level: str
    latitude: float | None
    longitude: float | None
    zone: str | None


class BulletinH2S(BaseModel):
    """Dernier bulletin quotidien des capteurs d'hydrogène sulfuré de Madininair."""
    updated_at: str
    date: str | None
    sensors: list[Capteur]
    unit: str
    thresholds: list[Seuil]
    source: str
    source_url: str
