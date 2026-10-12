# Tests des activités à proximité et de la matrice des temps de trajet (sans appel réseau).
import shutil
import time

import pytest

from app.models.point_of_interest import Category, PointOfInterest
from app.services import cache_service, trajets_service


@pytest.fixture(autouse=True)
def cache_vide():
    """Chaque test part d'un cache vide."""
    dossier = cache_service.cache_path()
    shutil.rmtree(dossier, ignore_errors=True)
    yield
    shutil.rmtree(dossier, ignore_errors=True)


def _poi(db, name, latitude, longitude, category=Category.BEACH):
    """Insère un point d'intérêt à des coordonnées précises."""
    poi = PointOfInterest(name=name, category=category, description="Test",
                          latitude=latitude, longitude=longitude, address="Test, Martinique")
    db.add(poi)
    db.commit()
    return poi


def _points(*pois):
    return [{"id": p.id, "latitude": p.latitude, "longitude": p.longitude} for p in pois]


def _ecrire_matrice(pois, durees, distances):
    """Matrice en cache, comme l'écrirait la collecte, pour ces points dans cet ordre."""
    points = _points(*pois)
    cache_service.write_json(trajets_service.CACHE_FILE, {
        "ids": [p["id"] for p in points],
        "durations_min": durees,
        "distances_km": distances,
        "signature": trajets_service.signature(points),
        "generated_at": time.time(),
        "positions": {str(p["id"]): [p["latitude"], p["longitude"]] for p in points},
    })


def _trois_points(db):
    """Origine à Saint-Pierre, un voisin à 3 km et un autre à 8 km à vol d'oiseau."""
    origine = _poi(db, "Origine", 14.7405, -61.1768)
    pres = _poi(db, "Pres", 14.7121, -61.1832)
    moyen = _poi(db, "Moyen", 14.8012, -61.2246, category=Category.HIKE)
    return origine, pres, moyen


def test_proximite_activite_inconnue(client):
    response = client.get("/api/activites/99999/proximite")
    assert response.status_code == 404
    assert response.json()["detail"] == "Activité introuvable"


def test_proximite_sans_matrice_vol_oiseau(client, db_session):
    """Avant la première collecte : distance à vol d'oiseau, sans durée, l'activité exclue."""
    origine, pres, moyen = _trois_points(db_session)
    data = client.get(f"/api/activites/{origine.id}/proximite").json()
    assert [d["name"] for d in data] == ["Pres", "Moyen"]
    assert all(d["duree_min"] is None and d["par_la_route"] is False for d in data)
    assert data[0]["distance_km"] == pytest.approx(3.2, abs=0.2)


def test_proximite_limite(client, db_session):
    origine, _, _ = _trois_points(db_session)
    data = client.get(f"/api/activites/{origine.id}/proximite?limite=1").json()
    assert len(data) == 1
    assert client.get(f"/api/activites/{origine.id}/proximite?limite=0").status_code == 422


def test_proximite_filtre_categorie(client, db_session):
    """Seules les activités de la catégorie demandée sont renvoyées."""
    origine, _, _ = _trois_points(db_session)
    data = client.get(f"/api/activites/{origine.id}/proximite?categorie=hike").json()
    assert [d["name"] for d in data] == ["Moyen"]
    assert client.get(f"/api/activites/{origine.id}/proximite?categorie=volcan").status_code == 422


def test_proximite_trie_par_temps_de_route(client, db_session):
    """Le plus proche à vol d'oiseau passe après s'il est plus long à rejoindre en voiture."""
    origine, pres, moyen = _trois_points(db_session)
    _ecrire_matrice(
        [origine, pres, moyen],
        durees=[[0, 25, 12], [25, 0, 30], [12, 30, 0]],
        distances=[[0, 14.2, 9.8], [14.2, 0, 20.0], [9.8, 20.0, 0]],
    )
    data = client.get(f"/api/activites/{origine.id}/proximite").json()
    assert [d["name"] for d in data] == ["Moyen", "Pres"]
    assert data[0] | {"id": None} == {
        "id": None, "name": "Moyen", "category": "hike", "address": "Test, Martinique",
        "image_url": None, "distance_km": 9.8, "duree_min": 12, "par_la_route": True,
    }


def test_proximite_point_deplace_depuis_la_matrice(client, db_session):
    """Une activité déplacée après le calcul n'utilise pas un temps de route périmé."""
    origine, pres, moyen = _trois_points(db_session)
    _ecrire_matrice(
        [origine, pres, moyen],
        durees=[[0, 25, 12], [25, 0, 30], [12, 30, 0]],
        distances=[[0, 14.2, 9.8], [14.2, 0, 20.0], [9.8, 20.0, 0]],
    )
    moyen.latitude = 14.80
    db_session.commit()
    data = {d["name"]: d for d in client.get(f"/api/activites/{origine.id}/proximite").json()}
    assert data["Pres"]["duree_min"] == 25
    assert data["Moyen"]["duree_min"] is None and data["Moyen"]["par_la_route"] is False


def test_proximite_route_inexistante(client, db_session):
    """Sans route entre deux points (case vide), on retombe sur le vol d'oiseau."""
    origine, pres, moyen = _trois_points(db_session)
    _ecrire_matrice(
        [origine, pres, moyen],
        durees=[[0, None, 12], [None, 0, 30], [12, 30, 0]],
        distances=[[0, None, 9.8], [None, 0, 20.0], [9.8, 20.0, 0]],
    )
    data = {d["name"]: d for d in client.get(f"/api/activites/{origine.id}/proximite").json()}
    assert data["Pres"]["par_la_route"] is False


def test_fetch_matrix_convertit_les_unites(monkeypatch):
    """Secondes en minutes, mètres en kilomètres, cases vides conservées."""
    class Reponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"code": "Ok", "durations": [[0, 754.0], [None, 0]],
                    "distances": [[0, 9849.6], [None, 0]]}

    appels = []
    monkeypatch.setattr(trajets_service.httpx, "get", lambda url, **kw: appels.append(url) or Reponse())
    points = [{"id": 1, "latitude": 14.74, "longitude": -61.17}, {"id": 2, "latitude": 14.80, "longitude": -61.22}]
    matrice = trajets_service.fetch_matrix(points)
    assert appels[0].endswith("-61.17,14.74;-61.22,14.8")
    assert matrice == {"ids": [1, 2], "durations_min": [[0, 13], [None, 0]],
                       "distances_km": [[0, 9.8], [None, 0]]}


def test_fetch_matrix_par_blocs(monkeypatch):
    """Au-delà de MAX_SOURCES points, les lignes arrivent en plusieurs requêtes, dans l'ordre."""
    appels = []

    def faux_get(url, params, **kw):
        sources = [int(i) for i in params["sources"].split(";")]
        appels.append(sources)

        class Reponse:
            def raise_for_status(self):
                pass

            def json(self):
                # Chaque case vaut le numéro de la ligne : on vérifie l'ordre des blocs
                return {"code": "Ok", "durations": [[60.0 * s] * 3 for s in sources],
                        "distances": [[1000.0 * s] * 3 for s in sources]}
        return Reponse()

    monkeypatch.setattr(trajets_service, "MAX_SOURCES", 2)
    monkeypatch.setattr(trajets_service, "PAUSE_SECONDS", 0)
    monkeypatch.setattr(trajets_service.httpx, "get", faux_get)
    points = [{"id": i, "latitude": 14.7, "longitude": -61.1} for i in range(3)]
    matrice = trajets_service.fetch_matrix(points)
    assert appels == [[0, 1], [2]]
    assert matrice["durations_min"] == [[0, 0, 0], [1, 1, 1], [2, 2, 2]]
    assert matrice["distances_km"] == [[0, 0, 0], [1.0, 1.0, 1.0], [2.0, 2.0, 2.0]]


def test_refresh_trajets_appelle_le_serveur_seulement_si_besoin(monkeypatch):
    """Pas de nouvel appel tant que les activités n'ont pas bougé et que la matrice est récente."""
    appels = []

    def faux_calcul(points):
        appels.append(len(points))
        return {"ids": [p["id"] for p in points], "durations_min": [], "distances_km": []}

    monkeypatch.setattr(trajets_service, "fetch_matrix", faux_calcul)
    points = [{"id": 1, "latitude": 14.74, "longitude": -61.17}, {"id": 2, "latitude": 14.80, "longitude": -61.22}]
    trajets_service.refresh_trajets(points)
    trajets_service.refresh_trajets(points)
    assert appels == [2]

    # Une activité déplacée relance le calcul
    points[1]["latitude"] = 14.81
    trajets_service.refresh_trajets(points)
    assert appels == [2, 2]

    # Une matrice de plus d'une semaine aussi
    matrice = cache_service.read_json(trajets_service.CACHE_FILE)
    matrice["generated_at"] -= trajets_service.MAX_AGE_SECONDS + 1
    cache_service.write_json(trajets_service.CACHE_FILE, matrice)
    trajets_service.refresh_trajets(points)
    assert appels == [2, 2, 2]
