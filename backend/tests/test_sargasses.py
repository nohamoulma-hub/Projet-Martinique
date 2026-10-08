# Tests des sargasses : façades de côte, risque NOAA, nappes AFAI, dérive estimée,
# odeurs H2S (Madininair), routes et assistant de planning. Aucun appel réseau.
import shutil

import pytest

from app.models.point_of_interest import Category, PointOfInterest
from app.services import cache_service, coastline, h2s_service, planning_service, sargasses_service


@pytest.fixture(autouse=True)
def cache_vide():
    """Chaque test part d'un cache vide."""
    dossier = cache_service.cache_path()
    shutil.rmtree(dossier, ignore_errors=True)
    yield
    shutil.rmtree(dossier, ignore_errors=True)


# --- Façades de côte ---

@pytest.mark.parametrize("lat, lon, facade", [
    (14.8465, -61.2283, "nord-caraibe"),       # Anse Couleuvre
    (14.5397, -61.0705, "centre-caraibe"),     # Anse Dufour
    (14.3969, -60.8726, "sud-caraibe"),        # Grande Anse des Salines
    (14.5426, -60.8302, "sud-atlantique"),     # Pointe Faula, Le Vauclin
    (14.7622, -60.8821, "centre-atlantique"),  # Anse Tartane
    (14.8237, -61.0324, "nord-atlantique"),    # Le Marigot
])
def test_chaque_plage_tombe_dans_sa_facade(lat, lon, facade):
    assert coastline.ZONES[coastline.nearest_zone(lat, lon)]["id"] == facade


def test_terre_et_mer():
    assert coastline.is_on_land(14.64, -61.05)       # entre Fort-de-France et Le Lamentin
    assert not coastline.is_on_land(14.60, -60.70)   # au large du François


# --- Risque NOAA ---

KML = """<kml><Document>
<Placemark><ExtendedData><SimpleData name="risk">3</SimpleData></ExtendedData>
<LineString><coordinates>-60.835,14.55 -60.832,14.545</coordinates></LineString></Placemark>
<Placemark><ExtendedData><SimpleData name="risk">1</SimpleData></ExtendedData>
<LineString><coordinates>-61.07,14.538 -61.071,14.540</coordinates></LineString></Placemark>
<Placemark><ExtendedData><SimpleData name="risk">3</SimpleData></ExtendedData>
<LineString><coordinates>-89.32,30.06 -89.31,30.06</coordinates></LineString></Placemark>
</Document></kml>"""


def test_lecture_du_kml_garde_la_martinique():
    """Seuls les segments de côte de la Martinique sont gardés, avec leur risque."""
    segments = sargasses_service.parse_sir_kml(KML)
    assert [risque for risque, _ in segments] == [3, 1]


def test_niveaux_par_facade_et_par_plage():
    """Chaque façade prend son niveau dominant ; une plage, celui du segment le plus proche."""
    segments = sargasses_service.parse_sir_kml(KML)
    plages = [{"id": 1, "latitude": 14.5397, "longitude": -61.0705},   # Anse Dufour
              {"id": 2, "latitude": 14.8465, "longitude": -61.2283}]   # Anse Couleuvre, sans segment proche
    zones, niveaux = sargasses_service.sir_levels(segments, plages)
    par_id = {z["id"]: zones[i] for i, z in enumerate(coastline.ZONES)}
    assert par_id["sud-atlantique"]["level"] == "fort"
    assert par_id["centre-caraibe"]["level"] == "vigilance"
    assert par_id["nord-caraibe"]["level"] is None
    assert niveaux["1"] == {"zone": "centre-caraibe", "level": "vigilance"}
    assert niveaux["2"]["level"] is None


# --- Nappes au large ---

def test_lecture_afai_ecarte_le_bruit_et_les_cotes():
    """Gardé : un pixel d'algues au large. Écartés : trop faible, à terre, collé à la côte, valeur absente."""
    csv = "\n".join([
        "time,latitude,longitude,AFAI",
        "UTC,degrees_north,degrees_east,",
        "2026-10-07T12:00:00Z,14.60,-60.40,0.0021",   # au large : gardé
        "2026-10-07T12:00:00Z,14.60,-60.30,0.0001",   # sous le seuil
        "2026-10-07T12:00:00Z,14.64,-61.05,0.0030",   # sur l'île
        "2026-10-07T12:00:00Z,14.55,-60.82,0.0030",   # à moins de 3 km de la côte
        "2026-10-07T12:00:00Z,14.90,-60.20,NaN",
    ])
    date, pixels = sargasses_service.parse_afai_csv(csv)
    assert date == "2026-10-07"
    assert pixels == [(14.6, -60.4, 0.0021)]


class ChampUniforme:
    """Courant constant, pour des dérives faciles à prévoir."""

    def __init__(self, est, nord):
        self.est, self.nord = est, nord

    def at(self, heure, lat, lon):
        return self.est, self.nord


def test_derive_vers_l_ouest_echoue_sur_la_cote_atlantique():
    """Des algues à 20 km à l'est du Vauclin, poussées vers l'ouest, s'échouent le premier jour."""
    resultat = sargasses_service.simulate_drift([(14.55, -60.62, 0.002)], ChampUniforme(-2.0, 0.0), 0)
    rang = [z["id"] for z in coastline.ZONES].index("sud-atlantique")
    assert resultat["stranded"][0][rang] == 1
    assert resultat["positions"][0] == []


def test_derive_qui_passe_au_nord_ne_s_echoue_pas():
    resultat = sargasses_service.simulate_drift([(15.2, -60.4, 0.002)], ChampUniforme(-2.0, 0.0), 0)
    assert sum(sum(jour) for jour in resultat["stranded"]) == 0
    assert len(resultat["positions"][0]) == 1


def test_previsions_gardent_les_algues_deja_echouees():
    """Sans nouvelle arrivée, un niveau fort ne baisse que d'un cran tous les deux jours."""
    assert sargasses_service.forecast_levels("fort", [0, 0, 0, 0]) == ["fort", "modere", "modere", "vigilance"]
    assert sargasses_service.forecast_levels("faible", [0, 20, 0, 0])[1] == "fort"
    assert sargasses_service.forecast_levels(None, [0, 0, 0, 0]) == ["faible"] * 4


# --- Odeurs (H2S) ---

def test_valeurs_madininair():
    """« <0.03 » signifie sous le seuil de détection ; les seuils officiels sont respectés."""
    assert h2s_service.to_ppm("<0.03") == (0.0, True)
    assert h2s_service.to_ppm(1.8) == (1.8, False)
    assert h2s_service.to_ppm("") is None
    assert [h2s_service.threshold_for(v)["id"] for v in (0, 0.05, 0.4, 1.8, 6)] == \
        ["tres-faible", "faible", "moyen", "eleve", "tres-eleve"]


def test_bulletin_trie_et_localise():
    lignes = [
        {"id_site": 31, "site": "Anse aux Bois - Sainte-Anne", "nom_com": "Sainte-Anne", "reseau": "fixe",
         "date": "2026-10-07", "valeur": 0.32},
        {"id_site": 9, "site": "Frégate EST 2 - Le François", "nom_com": "Le François", "reseau": "fixe",
         "date": "2026-10-07", "valeur": 1.8},
        {"id_site": 12, "site": "Château Paille - Le Vauclin", "nom_com": "Le Vauclin", "reseau": "fixe",
         "date": "2026-10-07", "valeur": None},
    ]
    bulletin = h2s_service.parse_bulletin(lignes)
    assert bulletin["date"] == "2026-10-07"
    assert [c["name"] for c in bulletin["sensors"]] == ["Frégate EST 2", "Anse aux Bois"]
    assert bulletin["sensors"][0]["level"] == "eleve"
    assert bulletin["sensors"][0]["zone"] == "sud-atlantique"


# --- Routes et assistant ---

def _etat(plage_id: int) -> dict:
    zones = [{**z, "level": "fort" if z["id"] == "sud-caraibe" else "faible", "shares": {},
              "forecast": [{"date": "2026-10-09", "level": "modere"}]} for z in coastline.ZONES]
    return {
        "updated_at": "2026-10-08T13:00", "risk_date": "2026-10-07",
        "risk_source": "NOAA AOML, Sargassum Inundation Risk", "risk_url": "https://cwcgom.aoml.noaa.gov/SIR/",
        "forecast_source": "Estimation du site", "global_level": "fort",
        "levels": [{"id": lv, "label": sargasses_service.LEVEL_LABELS[lv]} for lv in sargasses_service.LEVELS],
        "zones": zones,
        "beaches": {str(plage_id): {"zone": "sud-caraibe", "level": "fort"}},
    }


def test_estimation_propre_a_la_plage():
    """Une plage qui a sa propre estimation l'utilise ; sinon elle prend celle de sa façade."""
    etat = _etat(7)
    assert sargasses_service.beach_level(etat, 7)["forecast"] == [{"date": "2026-10-09", "level": "modere"}]
    etat["beaches"]["7"]["forecast"] = [{"date": "2026-10-09", "level": "vigilance"}]
    assert sargasses_service.beach_level(etat, 7)["forecast"][0]["level"] == "vigilance"
    assert sargasses_service.beach_level(etat, 99) is None


def test_route_sargasses(client):
    assert client.get("/api/sargasses").status_code == 503
    cache_service.write_json("sargasses/etat.json", _etat(7))
    data = client.get("/api/sargasses").json()
    assert data["global_level"] == "fort" and data["beaches"]["7"]["level"] == "fort"


def test_assistant_connait_le_risque_des_plages(db_session):
    """L'outil de recherche donne le niveau du jour et l'estimation des jours suivants."""
    plage = PointOfInterest(name="Plage Test", category=Category.BEACH, description="",
                            latitude=14.40, longitude=-60.87, address="Sainte-Anne, Martinique")
    db_session.add(plage)
    db_session.flush()

    sortie = planning_service.outil_rechercher(db_session, {"categorie": "beach"})
    assert sortie["activites"][0]["sargasses"] == "inconnu"

    cache_service.write_json("sargasses/etat.json", _etat(plage.id))
    sortie = planning_service.outil_rechercher(db_session, {"categorie": "beach"})
    risque = sortie["activites"][0]["sargasses"]
    assert risque["aujourd_hui"] == "Fort"
    assert risque["estimation_jours_suivants"] == [{"date": "2026-10-09", "niveau": "Modéré"}]
