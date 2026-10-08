# Tests de la météo : conditions actuelles, prévisions détaillées, animation nuages et radar,
# routes lues dans le cache. Aucun appel réseau : les réponses externes sont simulées.
import io
import shutil
from datetime import datetime, timezone

import pytest
from PIL import Image

from app.services import cache_service, meteo_animation_service, meteo_service


@pytest.fixture(autouse=True)
def cache_vide():
    """Chaque test part d'un cache vide et d'une mémoire vide."""
    dossier = cache_service.cache_path()
    shutil.rmtree(dossier, ignore_errors=True)
    meteo_service._memory.clear()
    yield
    shutil.rmtree(dossier, ignore_errors=True)
    meteo_service._memory.clear()


def _png(couleur: tuple[int, int, int]) -> bytes:
    image = Image.new("RGB", (4, 4), couleur)
    buffer = io.BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def _alpha(png: bytes) -> int:
    return Image.open(io.BytesIO(png)).getpixel((0, 0))[1]


# --- Nuages : seuls les pixels clairs et peu saturés restent visibles ---

def test_nuages_gardes_mer_et_lumieres_effacees():
    """Un nuage blanc reste opaque, la mer sombre et les lumières des villes disparaissent."""
    assert _alpha(meteo_animation_service.extract_clouds(_png((235, 235, 240)), 40)) > 200
    assert _alpha(meteo_animation_service.extract_clouds(_png((15, 35, 60)), 40)) == 0
    assert _alpha(meteo_animation_service.extract_clouds(_png((240, 150, 40)), -30)) == 0


def test_nuages_de_nuit_restent_visibles():
    """La nuit, un nuage gris plus sombre est encore affiché grâce au seuil abaissé."""
    gris = _png((120, 120, 125))
    assert _alpha(meteo_animation_service.extract_clouds(gris, -30)) > \
        _alpha(meteo_animation_service.extract_clouds(gris, 40))


def test_hauteur_du_soleil():
    """Midi solaire en Martinique (16 h UTC) : soleil haut. Minuit : sous l'horizon."""
    midi = datetime(2026, 10, 8, 16, 0, tzinfo=timezone.utc)
    minuit = datetime(2026, 10, 8, 4, 0, tzinfo=timezone.utc)
    assert meteo_animation_service.sun_elevation(midi) > 60
    assert meteo_animation_service.sun_elevation(minuit) < -30


# --- Index de l'animation ---

def _image_en_cache(couche: str, horodatage: int):
    for x in meteo_animation_service.TILES_X:
        for y in meteo_animation_service.TILES_Y:
            chemin = meteo_animation_service._frame_dir(couche, horodatage) / f"{x}_{y}.png"
            cache_service.write_bytes(chemin, _png((255, 255, 255)))


def test_index_associe_chaque_radar_aux_nuages_les_plus_recents():
    """Les nuages arrivent en retard : les images radar récentes gardent les derniers nuages."""
    maintenant = datetime(2026, 10, 8, 13, 30, tzinfo=timezone.utc)
    base = int(maintenant.timestamp())
    for minutes in (60, 50, 40, 0):
        _image_en_cache("radar", base - minutes * 60)
    for minutes in (60, 50):
        _image_en_cache("nuages", base - minutes * 60)

    images = meteo_animation_service.build_index(maintenant)["frames"]
    assert [i["clouds"] for i in images] == [base - 3600, base - 3000, base - 3000, base - 3000]


def test_index_ecarte_des_nuages_trop_anciens():
    """Des nuages de plus de 90 minutes ne sont pas montrés avec une image radar récente."""
    maintenant = datetime(2026, 10, 8, 13, 30, tzinfo=timezone.utc)
    base = int(maintenant.timestamp())
    _image_en_cache("radar", base)
    _image_en_cache("nuages", base - 115 * 60)
    images = meteo_animation_service.build_index(maintenant)["frames"]
    assert images[0]["clouds"] is None


def test_index_sans_radar_se_rabat_sur_les_nuages():
    """Radar en panne : l'animation montre les nuages seuls plutôt qu'une carte vide."""
    maintenant = datetime(2026, 10, 8, 13, 30, tzinfo=timezone.utc)
    _image_en_cache("nuages", int(maintenant.timestamp()) - 1200)
    images = meteo_animation_service.build_index(maintenant)["frames"]
    assert len(images) == 1 and images[0]["radar"] is False


def test_route_tuile(client):
    """Une tuile en cache est servie ; une couche, un zoom ou une tuile inconnus renvoient 404."""
    _image_en_cache("radar", 1791460000)
    assert client.get("/api/meteo/tuiles/radar/1791460000/7/42/58.png").status_code == 200
    assert client.get("/api/meteo/tuiles/radar/1791460000/8/42/58.png").status_code == 404
    assert client.get("/api/meteo/tuiles/autre/1791460000/7/42/58.png").status_code == 404
    assert client.get("/api/meteo/tuiles/radar/1791460000/7/99/58.png").status_code == 404


# --- Routes lues dans le cache ---

def test_route_en_attente_de_collecte(client):
    """Avant la première collecte, la route répond 503 avec un message en français."""
    reponse = client.get("/api/meteo/temperatures")
    assert reponse.status_code == 503
    assert "pas encore disponibles" in reponse.json()["detail"]


def test_route_temperatures_lit_le_cache(client):
    grille = {"observed_at": "2026-10-08T09:30", "south": 14.38, "west": -61.24, "step": 0.04,
              "rows": 1, "cols": 2, "temperature": [26.1, 19.4], "wind_speed": [12.0, 5.0],
              "wind_direction": [80.0, 90.0], "source": "Open-Meteo (open-meteo.com)"}
    cache_service.write_json("meteo/temperatures.json", grille)
    reponse = client.get("/api/meteo/temperatures")
    assert reponse.status_code == 200
    assert reponse.json()["temperature"] == [26.1, 19.4]


def test_route_cote(client):
    """Le contour de l'île est fourni avec ses 6 façades."""
    data = client.get("/api/meteo/cote").json()
    assert len(data["zones"]) == 6 and len(data["ring"]) > 500


# --- Conditions actuelles et prévisions (Open-Meteo simulé) ---

def _faux_open_meteo(monkeypatch, reponses: dict):
    """Remplace les appels HTTP : la réponse dépend de l'URL appelée."""
    def faux_get(url, params):
        return reponses["marine"] if "marine" in url else reponses["forecast"]
    monkeypatch.setattr(meteo_service, "_get", faux_get)


def test_meteo_actuelle_complete(monkeypatch, client):
    """Ressenti, UV, pression, visibilité, mer, soleil et pluie sur 7 jours sont renvoyés."""
    _faux_open_meteo(monkeypatch, {
        "forecast": {
            "current": {"time": "2026-10-08T09:30", "temperature_2m": 27.5, "apparent_temperature": 32.8,
                        "relative_humidity_2m": 84, "wind_speed_10m": 12.5, "wind_direction_10m": 82,
                        "weather_code": 51, "surface_pressure": 1014.4, "visibility": 5600,
                        "uv_index": 5.9, "is_day": 1},
            "current_units": {"temperature_2m": "°C", "wind_speed_10m": "km/h"},
            "daily": {"uv_index_max": [8, 8.4], "sunshine_duration": [3600, 42300],
                      "precipitation_sum": [20.6, 6.2]},
        },
        "marine": {"current": {"sea_surface_temperature": 29.3}},
    })
    data = client.get("/api/meteo").json()
    assert data["feels_like"] == 32.8 and data["wind_direction_label"] == "E"
    assert data["visibility_km"] == 5.6 and data["uv_label"] == "très élevé"
    assert data["sea_temperature"] == 29.3 and data["rain_7d_mm"] == 26.8
    assert data["sunshine_hours"] == 11.8


def test_previsions_detaillees_par_tranche(monkeypatch, client):
    """Chaque jour est découpé en matin, après-midi et soirée, avec le temps le plus marquant."""
    heures = [f"2026-10-08T{h:02d}:00" for h in range(24)]
    _faux_open_meteo(monkeypatch, {"forecast": {
        "hourly": {
            "time": heures,
            "temperature_2m": [24 + (h >= 12) * 4 for h in range(24)],
            "precipitation_probability": [80 if h == 14 else 10 for h in range(24)],
            "precipitation": [2.0 if h == 14 else 0 for h in range(24)],
            "weather_code": [95 if h == 14 else 1 for h in range(24)],
            "wind_speed_10m": [15] * 24,
        },
        "daily": {"time": ["2026-10-08"], "weather_code": [95], "temperature_2m_max": [28],
                  "temperature_2m_min": [24], "precipitation_probability_max": [80],
                  "precipitation_sum": [2.0], "uv_index_max": [8], "sunshine_duration": [36000],
                  "wind_speed_10m_max": [20]},
    }})
    jour = client.get("/api/meteo/previsions").json()["days"][0]
    tranches = {p["key"]: p for p in jour["periods"]}
    assert list(tranches) == ["matin", "apres-midi", "soiree"]
    assert tranches["matin"]["temperature"] == 24 and tranches["matin"]["weather_code"] == 1
    assert tranches["apres-midi"]["weather_description"] == "Orage"
    assert tranches["apres-midi"]["precipitation_probability"] == 80
