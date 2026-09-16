# Tests des endpoints /activites (catalogue public, pas d'auth requise).
from app.models.beach_details import BeachDetails
from app.models.hike_details import HikeDetails
from app.models.point_of_interest import Category, PointOfInterest
from app.models.rum_distillery_details import RumDistilleryDetails


def _create_beach(db, name="Plage Test", tourist_score=3):
    """Insère une plage de test et retourne l'objet POI."""
    poi = PointOfInterest(
        name=name,
        category=Category.BEACH,
        description="Plage de test",
        latitude=14.6,
        longitude=-61.0,
        address="Test, Martinique",
    )
    db.add(poi)
    db.flush()
    db.add(BeachDetails(point_of_interest_id=poi.id, tourist_score=tourist_score, amenities="Parking"))
    db.commit()
    return poi


def _create_hike(db, name="Randonnée Test"):
    """Insère une randonnée de test et retourne l'objet POI."""
    poi = PointOfInterest(
        name=name,
        category=Category.HIKE,
        description="Randonnée de test",
        latitude=14.8,
        longitude=-61.2,
    )
    db.add(poi)
    db.flush()
    db.add(HikeDetails(
        point_of_interest_id=poi.id,
        difficulty="Facile",
        elevation_gain=100,
        elevation_loss=100,
        duration=60,
    ))
    db.commit()
    return poi


def _create_rhumerie(db, name="Rhumerie Test", **details):
    """Insère une rhumerie de test. Sans details, aucune ligne de details n'est creee."""
    poi = PointOfInterest(
        name=name,
        category=Category.RUM_DISTILLERY,
        description="Rhumerie de test",
        latitude=14.7,
        longitude=-61.1,
        address="Test, Martinique",
    )
    db.add(poi)
    db.flush()
    if details:
        db.add(RumDistilleryDetails(point_of_interest_id=poi.id, **details))
    db.commit()
    return poi


def test_list_activites_empty(client):
    """GET /activites retourne une liste vide quand la base est vide."""
    response = client.get("/api/activites")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["has_more"] is False


def test_list_activites_returns_items(client, db_session):
    """GET /activites retourne les activités inserées en base."""
    _create_beach(db_session, "Grande Anse des Salines")
    _create_hike(db_session, "Montagne Pelée")

    response = client.get("/api/activites")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_list_activites_filter_by_category(client, db_session):
    """GET /activites?categorie=beach retourne uniquement les plages."""
    _create_beach(db_session, "Plage A")
    _create_hike(db_session, "Rando A")

    response = client.get("/api/activites?categorie=beach")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["category"] == "beach"


def test_list_activites_filter_by_hike(client, db_session):
    """GET /activites?categorie=hike retourne uniquement les randonnées."""
    _create_beach(db_session)
    _create_hike(db_session)

    response = client.get("/api/activites?categorie=hike")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["category"] == "hike"


def test_list_activites_search(client, db_session):
    """GET /activites?search= filtre les activités par nom."""
    _create_beach(db_session, "Anse Céron")
    _create_beach(db_session, "Plage des Salines")

    response = client.get("/api/activites?search=céron")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert "Céron" in data["items"][0]["name"]


def test_list_activites_pagination(client, db_session):
    """GET /activites retourne maximum 20 résultats par page."""
    for i in range(5):
        _create_beach(db_session, f"Plage {i}")

    response = client.get("/api/activites?page=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert data["has_more"] is False


def test_get_activite_detail(client, db_session):
    """GET /activites/{id} retourne le détail complet d'une activité."""
    beach = _create_beach(db_session, "Anse Noire", tourist_score=4)

    response = client.get(f"/api/activites/{beach.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == beach.id
    assert data["name"] == "Anse Noire"
    assert data["category"] == "beach"
    assert data["beach_details"]["tourist_score"] == 4


def test_get_activite_detail_hike(client, db_session):
    """GET /activites/{id} pour une randonnée inclut hike_details."""
    hike = _create_hike(db_session, "Montagne Pelée")

    response = client.get(f"/api/activites/{hike.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["hike_details"]["difficulty"] == "Facile"
    assert data["beach_details"] is None


def test_get_activite_not_found(client):
    """GET /activites/999 retourne 404 avec un message en français."""
    response = client.get("/api/activites/999")
    assert response.status_code == 404
    assert "introuvable" in response.json()["detail"].lower()


def test_list_activites_filter_by_rum_distillery(client, db_session):
    """Le filtre categorie=rum_distillery ne renvoie que les rhumeries."""
    _create_beach(db_session, name="Plage Filtre")
    _create_rhumerie(db_session, name="Rhumerie Filtre")

    response = client.get("/api/activites?categorie=rum_distillery")
    assert response.status_code == 200
    noms = [i["name"] for i in response.json()["items"]]
    assert noms == ["Rhumerie Filtre"]


def test_get_activite_detail_rum_distillery(client, db_session):
    """Le detail d'une rhumerie expose ses informations pratiques."""
    poi = _create_rhumerie(
        db_session,
        opening_hours="Mo-Su 09:00-17:00",
        phone="+596 596 00 00 00",
        website="https://exemple.fr",
        pets_allowed=False,
    )

    response = client.get(f"/api/activites/{poi.id}")
    assert response.status_code == 200
    data = response.json()
    details = data["rum_distillery_details"]
    assert details["opening_hours"] == "Mo-Su 09:00-17:00"
    assert details["phone"] == "+596 596 00 00 00"
    # False doit rester False et ne pas etre confondu avec une absence d'information
    assert details["pets_allowed"] is False
    assert details["tourist_score"] is None
    # Les details des autres categories restent vides
    assert data["beach_details"] is None
    assert data["hike_details"] is None


def test_get_activite_detail_rum_distillery_without_details(client, db_session):
    """Une rhumerie sans ligne de details renvoie null plutot qu'une erreur."""
    poi = _create_rhumerie(db_session, name="Rhumerie Sans Details")

    response = client.get(f"/api/activites/{poi.id}")
    assert response.status_code == 200
    assert response.json()["rum_distillery_details"] is None


def test_get_activite_detail_beach_has_no_rum_details(client, db_session):
    """Une plage ne renvoie pas de details de rhumerie."""
    poi = _create_beach(db_session, name="Plage Sans Rhum")

    response = client.get(f"/api/activites/{poi.id}")
    assert response.status_code == 200
    assert response.json()["rum_distillery_details"] is None
