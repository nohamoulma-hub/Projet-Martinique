# Tests des endpoints /activites (catalogue public, pas d'auth requise).
from app.models.beach_details import BeachDetails
from app.models.hike_details import HikeDetails
from app.models.point_of_interest import Category, PointOfInterest
from app.models.restaurant_details import RestaurantDetails
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
    """GET /activites retourne maximum 18 résultats par page."""
    for i in range(19):
        _create_beach(db_session, f"Plage {i:02d}")

    response = client.get("/api/activites?page=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 19
    assert len(data["items"]) == 18
    assert data["has_more"] is True

    # La page 2 contient le reste et signale la fin
    data = client.get("/api/activites?page=2").json()
    assert len(data["items"]) == 1
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


def _create_poi_at(db, name, latitude, longitude, category=Category.BEACH):
    """Insère un point d'intérêt à des coordonnées précises, pour les tests de distance."""
    poi = PointOfInterest(
        name=name, category=category, description="Test",
        latitude=latitude, longitude=longitude, address="Test, Martinique",
    )
    db.add(poi)
    db.commit()
    return poi


def _peupler_autour_de_saint_pierre(db):
    """Trois points à environ 3, 8 et 38 km de la mairie de Saint-Pierre."""
    _create_poi_at(db, "Pres Carbet", 14.7121, -61.1832)
    _create_poi_at(db, "Moyen Precheur", 14.8012, -61.2246, category=Category.HIKE)
    _create_poi_at(db, "Loin Sainte-Anne", 14.4350, -60.8812)


def test_distance_km_connue():
    """La distance entre les mairies de Fort-de-France et Saint-Pierre est d'environ 18 km."""
    from app.services.communes_service import COMMUNES, distance_km
    d = distance_km(*COMMUNES["Fort-de-France"], *COMMUNES["Saint-Pierre"])
    assert 17 < d < 19


def test_list_communes(client):
    """GET /activites/communes renvoie les 34 communes et n'est pas lu comme un id."""
    response = client.get("/api/activites/communes")
    assert response.status_code == 200
    communes = response.json()
    assert len(communes) == 34
    assert "Saint-Pierre" in communes


def test_filtre_commune_rayon(client, db_session):
    """Seules les activités dans le rayon sont renvoyées, de la plus proche à la plus loin."""
    _peupler_autour_de_saint_pierre(db_session)

    data = client.get("/api/activites?commune=Saint-Pierre&rayon=5").json()
    assert [i["name"] for i in data["items"]] == ["Pres Carbet"]
    assert data["total"] == 1

    data = client.get("/api/activites?commune=Saint-Pierre&rayon=15").json()
    assert [i["name"] for i in data["items"]] == ["Pres Carbet", "Moyen Precheur"]
    assert data["items"][0]["distance_km"] < data["items"][1]["distance_km"]

    data = client.get("/api/activites?commune=Saint-Pierre&rayon=50").json()
    assert data["total"] == 3


def test_filtre_commune_combine_categorie(client, db_session):
    """Le filtre de proximité se combine avec la catégorie."""
    _peupler_autour_de_saint_pierre(db_session)

    data = client.get("/api/activites?commune=Saint-Pierre&rayon=15&categorie=hike").json()
    assert [i["name"] for i in data["items"]] == ["Moyen Precheur"]


def test_filtre_commune_pagination(client, db_session):
    """La pagination s'applique aussi aux résultats filtrés par distance."""
    for i in range(19):
        _create_poi_at(db_session, f"Point {i:02d}", 14.7431, -61.1751)

    data = client.get("/api/activites?commune=Saint-Pierre&rayon=5").json()
    assert len(data["items"]) == 18
    assert data["has_more"] is True
    data = client.get("/api/activites?commune=Saint-Pierre&rayon=5&page=2").json()
    assert len(data["items"]) == 1
    assert data["has_more"] is False


def test_filtre_commune_inconnue(client):
    """Une commune inconnue est refusée avec un message en français."""
    response = client.get("/api/activites?commune=Paris")
    assert response.status_code == 422
    assert response.json()["detail"] == "La commune « Paris » est inconnue."


def test_filtre_rayon_hors_bornes(client):
    """Un rayon nul ou démesuré est refusé avec un message en français."""
    for rayon in (0, 101):
        response = client.get(f"/api/activites?commune=Saint-Pierre&rayon={rayon}")
        assert response.status_code == 422
        assert "rayon de recherche" in response.json()["detail"]


def test_sans_commune_pas_de_distance(client, db_session):
    """Sans commune, la liste reste inchangée et ne contient pas de distance."""
    _create_beach(db_session, "Plage Sans Distance")
    item = client.get("/api/activites").json()["items"][0]
    assert "distance_km" not in item


def _create_restaurant(db, name="Restaurant Test", **details):
    """Insère un restaurant de test avec sa ligne de details."""
    poi = PointOfInterest(
        name=name, category=Category.RESTAURANT, description="Test",
        latitude=14.6, longitude=-61.0, address="Test, Martinique",
    )
    db.add(poi)
    db.flush()
    db.add(RestaurantDetails(point_of_interest_id=poi.id, **details))
    db.commit()
    return poi


def test_get_activite_detail_restaurant(client, db_session):
    """GET /activites/{id} pour un restaurant inclut restaurant_details."""
    poi = _create_restaurant(
        db_session, name="Table Test", cuisine="Créole", phone="+596 596 00 00 00",
        opening_hours="Mo-Su 12:00-14:15,19:00-22:00", hotel_name="Hôtel Test",
    )

    response = client.get(f"/api/activites/{poi.id}")
    assert response.status_code == 200
    details = response.json()["restaurant_details"]
    assert details["cuisine"] == "Créole"
    assert details["hotel_name"] == "Hôtel Test"
    # Aucune distinction : le guide Michelin n'etoile pas la Martinique
    assert details["michelin_distinction"] is None


def test_get_activite_detail_restaurant_sans_details(client, db_session):
    """Un restaurant sans ligne de details renvoie null plutot qu'une erreur."""
    poi = PointOfInterest(
        name="Table Sans Details", category=Category.RESTAURANT, description="Test",
        latitude=14.6, longitude=-61.0, address="Test, Martinique",
    )
    db_session.add(poi)
    db_session.commit()

    response = client.get(f"/api/activites/{poi.id}")
    assert response.status_code == 200
    assert response.json()["restaurant_details"] is None


def test_filtre_categorie_restaurant(client, db_session):
    """Le filtre de catégorie renvoie les restaurants."""
    _create_restaurant(db_session, name="Table Filtrée")
    _create_beach(db_session, name="Plage Non Filtrée")

    data = client.get("/api/activites?categorie=restaurant").json()
    assert [i["name"] for i in data["items"]] == ["Table Filtrée"]


def test_restaurant_details_absent_des_autres_categories(client, db_session):
    """Une plage ne renvoie pas de details de restaurant."""
    poi = _create_beach(db_session, name="Plage Sans Table")
    assert client.get(f"/api/activites/{poi.id}").json()["restaurant_details"] is None
